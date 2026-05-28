import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { QF_BRACKET, R16_BRACKET, R32_SLOT_DEFINITIONS, SF_BRACKET, FINAL_BRACKET } from './r32-mapping.data';
import { ThirdPlaceService } from './third-place.service';

@Injectable()
export class BracketService {
  private readonly logger = new Logger(BracketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly thirdPlaceService: ThirdPlaceService,
    private readonly gateway: RealtimeGateway,
  ) {}

  // ─── Montagem do Round of 32 ──────────────────────────────────────────────

  async mountR32(): Promise<{ slots: any[]; thirds: any }> {
    const thirds = await this.thirdPlaceService.selectBest8();
    const qualifiedThirds = thirds.qualifiers;

    // Distribui os 8 terceiros pelas vagas de acordo com os grupos de origem
    const thirdsAssignment = this.assignThirdsToSlots(
      qualifiedThirds.map((q) => ({ teamName: q.teamName, group: q.group })),
    );

    const slots: any[] = [];

    for (const def of R32_SLOT_DEFINITIONS) {
      let homeTeam: string | null = null;
      let awayTeam: string | null = null;

      // Resolve time da casa
      if (def.homeSource) {
        const standing = await this.prisma.cravouGroupStanding.findFirst({
          where: { group: def.homeSource.group, position: def.homeSource.pos },
        });
        homeTeam = standing?.teamName ?? null;
      }

      // Resolve time visitante
      if (!def.awayIsThird && def.awaySource) {
        const standing = await this.prisma.cravouGroupStanding.findFirst({
          where: { group: def.awaySource.group, position: def.awaySource.pos },
        });
        awayTeam = standing?.teamName ?? null;
      } else if (def.awayIsThird) {
        awayTeam = thirdsAssignment.get(def.slot) ?? null;
      }

      const slot = await this.prisma.cravouBracketSlot.upsert({
        where: { round_slotNumber: { round: 'round_of_32', slotNumber: def.slot } },
        create: {
          round: 'round_of_32',
          slotNumber: def.slot,
          homeDesc: def.homeDesc,
          awayDesc: def.awayDesc,
          homeTeam,
          awayTeam,
        },
        update: { homeTeam, awayTeam },
      });

      slots.push(slot);
    }

    this.logger.log('Round of 32 montado');
    this.gateway.emitBracketUpdated('round_of_32', slots);
    this.gateway.emitThirdsSelected(thirds.qualifiers);

    return { slots, thirds };
  }

  // Distribui os 8 melhores terceiros entre as 7 vagas definidas
  // Regra: cada vaga tem uma lista de grupos elegíveis; prioriza pelo ranking
  private assignThirdsToSlots(
    thirds: { teamName: string; group: string }[],
  ): Map<number, string> {
    const assignment = new Map<number, string>();
    const used = new Set<string>();

    const thirdsSlots = R32_SLOT_DEFINITIONS.filter((d) => d.awayIsThird);

    for (const slotDef of thirdsSlots) {
      // Terceiro elegível: grupo de origem está na lista de grupos permitidos, ainda não usado
      const eligible = thirds.find(
        (t) => slotDef.thirdGroups.includes(t.group) && !used.has(t.teamName),
      );

      if (eligible) {
        assignment.set(slotDef.slot, eligible.teamName);
        used.add(eligible.teamName);
      }
    }

    return assignment;
  }

  // ─── Registro de resultado do mata-mata ───────────────────────────────────

  async setKnockoutResult(slotId: string, winnerTeam: string): Promise<any> {
    const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Vaga do chaveamento não encontrada');

    if (slot.homeTeam !== winnerTeam && slot.awayTeam !== winnerTeam) {
      throw new BadRequestException(
        `Time "${winnerTeam}" não está nesta vaga (${slot.homeTeam} vs ${slot.awayTeam})`,
      );
    }

    const loserTeam = winnerTeam === slot.homeTeam ? slot.awayTeam : slot.homeTeam;

    const updated = await this.prisma.cravouBracketSlot.update({
      where: { id: slotId },
      data: { winnerTeam, loserTeam },
    });

    // Propaga vencedor para próxima fase
    await this.propagateWinner(slot.round, slot.slotNumber, winnerTeam);

    // Se for semifinal, propaga perdedor para disputa de 3º lugar
    if (slot.round === 'semifinal' && loserTeam) {
      await this.propagateLoserToThirdPlace(loserTeam);
    }

    const allSlots = await this.getBracket();
    this.gateway.emitBracketUpdated(slot.round, allSlots);

    return updated;
  }

  private async propagateWinner(
    currentRound: string,
    slotNumber: number,
    winner: string,
  ): Promise<void> {
    const nextRoundMap: Record<string, { nextRound: string; bracket: any[] }> = {
      round_of_32: { nextRound: 'round_of_16', bracket: R16_BRACKET },
      round_of_16: { nextRound: 'quarterfinal', bracket: QF_BRACKET },
      quarterfinal: { nextRound: 'semifinal',   bracket: SF_BRACKET },
      semifinal:    { nextRound: 'final',        bracket: FINAL_BRACKET },
    };

    const nextConfig = nextRoundMap[currentRound];
    if (!nextConfig) return;

    // Encontra o slot da próxima fase onde este vencedor vai
    const nextSlotDef = nextConfig.bracket.find(
      (b) => b.homeFromR32 === slotNumber ||
              b.homeFromR16 === slotNumber ||
              b.homeFromQF === slotNumber ||
              b.homeFromSF === slotNumber ||
              b.awayFromR32 === slotNumber ||
              b.awayFromR16 === slotNumber ||
              b.awayFromQF === slotNumber ||
              b.awayFromSF === slotNumber,
    );

    if (!nextSlotDef) return;

    const isHome =
      nextSlotDef.homeFromR32 === slotNumber ||
      nextSlotDef.homeFromR16 === slotNumber ||
      nextSlotDef.homeFromQF === slotNumber ||
      nextSlotDef.homeFromSF === slotNumber;

    const nextSlot = await this.prisma.cravouBracketSlot.findUnique({
      where: { round_slotNumber: { round: nextConfig.nextRound, slotNumber: nextSlotDef.slot } },
    });

    if (!nextSlot) {
      // Cria o slot da próxima fase se ainda não existir
      const roundShort: Record<string, string> = {
        round_of_32: 'R32', round_of_16: 'R16', quarterfinal: 'QF', semifinal: 'SF',
      };
      const tag = roundShort[currentRound] ?? currentRound;
      const homeNum = nextSlotDef.homeFromR32 ?? nextSlotDef.homeFromR16 ?? nextSlotDef.homeFromQF ?? nextSlotDef.homeFromSF;
      const awayNum = nextSlotDef.awayFromR32 ?? nextSlotDef.awayFromR16 ?? nextSlotDef.awayFromQF ?? nextSlotDef.awayFromSF;
      await this.prisma.cravouBracketSlot.create({
        data: {
          round: nextConfig.nextRound,
          slotNumber: nextSlotDef.slot,
          homeDesc: `Vencedor ${tag}-${homeNum}`,
          awayDesc: `Vencedor ${tag}-${awayNum}`,
          homeTeam: isHome ? winner : null,
          awayTeam: !isHome ? winner : null,
        },
      });
    } else {
      await this.prisma.cravouBracketSlot.update({
        where: { id: nextSlot.id },
        data: isHome ? { homeTeam: winner } : { awayTeam: winner },
      });
    }
  }

  private async propagateLoserToThirdPlace(loserTeam: string): Promise<void> {
    const thirdSlot = await this.prisma.cravouBracketSlot.findUnique({
      where: { round_slotNumber: { round: 'third_place', slotNumber: 1 } },
    });

    if (!thirdSlot) {
      await this.prisma.cravouBracketSlot.create({
        data: {
          round: 'third_place',
          slotNumber: 1,
          homeDesc: 'Perdedor Semi 1',
          awayDesc: 'Perdedor Semi 2',
          homeTeam: loserTeam,
        },
      });
    } else {
      await this.prisma.cravouBracketSlot.update({
        where: { id: thirdSlot.id },
        data: thirdSlot.homeTeam ? { awayTeam: loserTeam } : { homeTeam: loserTeam },
      });
    }
  }

  // ─── Override admin de times em uma vaga ──────────────────────────────────

  async overrideSlotTeams(
    slotId: string,
    data: { homeTeam?: string | null; awayTeam?: string | null },
  ): Promise<any> {
    const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Vaga não encontrada');

    const updated = await this.prisma.cravouBracketSlot.update({
      where: { id: slotId },
      data: {
        ...(data.homeTeam !== undefined ? { homeTeam: data.homeTeam || null } : {}),
        ...(data.awayTeam !== undefined ? { awayTeam: data.awayTeam || null } : {}),
      },
    });

    // Sync teams to the linked match if one exists
    if (slot.matchId) {
      const matchUpdate: { homeTeam?: string; awayTeam?: string } = {};
      if (data.homeTeam !== undefined && data.homeTeam) matchUpdate.homeTeam = data.homeTeam;
      if (data.awayTeam !== undefined && data.awayTeam) matchUpdate.awayTeam = data.awayTeam;
      if (Object.keys(matchUpdate).length > 0) {
        await this.prisma.cravouMatch.update({ where: { id: slot.matchId }, data: matchUpdate });
      }
    }

    this.gateway.emitBracketUpdated(slot.round, [updated]);
    return updated;
  }

  // ─── Sincroniza times do R32 com as standings atuais ─────────────────────

  async refreshR32TeamsFromStandings(): Promise<void> {
    for (const def of R32_SLOT_DEFINITIONS) {
      const existingSlot = await this.prisma.cravouBracketSlot.findUnique({
        where: { round_slotNumber: { round: 'round_of_32', slotNumber: def.slot } },
      });
      if (!existingSlot) continue;

      const updateData: { homeTeam?: string; awayTeam?: string } = {};

      if (def.homeSource) {
        const standing = await this.prisma.cravouGroupStanding.findFirst({
          where: { group: def.homeSource.group, position: def.homeSource.pos },
        });
        if (standing?.teamName) updateData.homeTeam = standing.teamName;
      }

      if (!def.awayIsThird && def.awaySource) {
        const standing = await this.prisma.cravouGroupStanding.findFirst({
          where: { group: def.awaySource.group, position: def.awaySource.pos },
        });
        if (standing?.teamName) updateData.awayTeam = standing.teamName;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.cravouBracketSlot.update({ where: { id: existingSlot.id }, data: updateData });
      }
    }

    const allSlots = await this.getBracket();
    this.gateway.emitBracketUpdated('round_of_32', allSlots);
    this.logger.log('R32: times sincronizados com as standings');
  }

  // ─── Remove resultado de uma vaga ─────────────────────────────────────────

  async resetKnockoutResult(slotId: string): Promise<any> {
    const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Vaga não encontrada');

    const updated = await this.prisma.cravouBracketSlot.update({
      where: { id: slotId },
      data: { winnerTeam: null, loserTeam: null },
    });

    const allSlots = await this.getBracket();
    this.gateway.emitBracketUpdated(slot.round, allSlots);
    return updated;
  }

  // ─── Cria partida a partir de uma vaga do chaveamento ────────────────────

  async createMatchFromSlot(slotId: string, matchDate: string): Promise<any> {
    const slot = await this.prisma.cravouBracketSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Vaga não encontrada');
    if (!slot.homeTeam || !slot.awayTeam) {
      throw new BadRequestException('Defina os dois times antes de criar o jogo');
    }

    const externalId = `bracket-${slot.round}-slot${slot.slotNumber}`;

    const match = await this.prisma.cravouMatch.upsert({
      where: { externalId },
      create: {
        externalId,
        phase: slot.round,
        homeTeam: slot.homeTeam,
        awayTeam: slot.awayTeam,
        matchDate: new Date(matchDate),
        status: 'upcoming',
      },
      update: {
        homeTeam: slot.homeTeam,
        awayTeam: slot.awayTeam,
        matchDate: new Date(matchDate),
      },
    });

    const updatedSlot = await this.prisma.cravouBracketSlot.update({
      where: { id: slotId },
      data: { matchId: match.id },
    });

    const allSlots = await this.getBracket();
    this.gateway.emitBracketUpdated(slot.round, allSlots);

    return { match, slot: updatedSlot };
  }

  // ─── Inicializa todos os slots de todas as fases ─────────────────────────────

  async initializeAllSlots(): Promise<{ created: number; existing: number }> {
    const ROUNDS: { round: string; count: number }[] = [
      { round: 'round_of_32',  count: 16 },
      { round: 'round_of_16',  count: 8  },
      { round: 'quarterfinal', count: 4  },
      { round: 'semifinal',    count: 2  },
      { round: 'third_place',  count: 1  },
      { round: 'final',        count: 1  },
    ];

    let created = 0;
    let existing = 0;

    for (const { round, count } of ROUNDS) {
      for (let i = 1; i <= count; i++) {
        const exists = await this.prisma.cravouBracketSlot.findUnique({
          where: { round_slotNumber: { round, slotNumber: i } },
        });
        if (!exists) {
          await this.prisma.cravouBracketSlot.create({
            data: { round, slotNumber: i, homeDesc: 'A definir', awayDesc: 'A definir' },
          });
          created++;
        } else {
          existing++;
        }
      }
    }

    const allSlots = await this.getBracket();
    this.gateway.emitBracketUpdated('all', allSlots);
    this.logger.log(`Slots inicializados: ${created} criados, ${existing} já existiam`);
    return { created, existing };
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async getBracket() {
    return this.prisma.cravouBracketSlot.findMany({
      orderBy: [{ round: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async getBracketByRound(round: string) {
    return this.prisma.cravouBracketSlot.findMany({
      where: { round },
      orderBy: { slotNumber: 'asc' },
    });
  }
}
