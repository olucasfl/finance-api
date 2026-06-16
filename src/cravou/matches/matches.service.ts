import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ScoringService } from '../scoring/scoring.service';
import { CopaStandingsService } from '../copa-standings/copa-standings.service';
import { BracketService } from '../bracket/bracket.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { FinalizeMatchDto } from './dto/finalize-match.dto';
import { UpdateMatchDateDto } from './dto/update-match-date.dto';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';

// ─── API Football (api-football.com / api-sports.io) ─────────────────────────
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY ?? '';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const FIFA_WC_LEAGUE_ID = 1;
const FIFA_WC_SEASON = 2026;

// ─── TheSportsDB (backup) ─────────────────────────────────────────────────────
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY ?? '3';
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}`;
const SPORTSDB_LEAGUE_ID = '4429';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NormalizedMatch {
  externalId: string;
  phase: string;
  groupName: string | null;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
  stadium: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function detectPhase(round: string): string {
  const r = (round ?? '').toLowerCase();
  if (r.includes('group') || r.includes('matchday')) return 'group_stage';
  if (r.includes('round of 16') || r.includes('last 16') || r.includes('1/8')) return 'round_of_16';
  if (r.includes('quarter')) return 'quarterfinal';
  if (r.includes('semi')) return 'semifinal';
  if (r.includes('third') || r.includes('3rd') || r.includes('bronze')) return 'third_place';
  if (r.includes('final')) return 'final';
  return 'group_stage';
}

function parseScore(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(String(value), 10);
  return isNaN(n) ? null : n;
}

function parseMatchDate(dateStr: string, timeStr?: string): Date {
  try {
    const cleanTime = (timeStr ?? '00:00:00').replace(/\+.*$/, '').trim().substring(0, 5);
    return new Date(`${dateStr}T${cleanTime}:00Z`);
  } catch {
    return new Date(dateStr);
  }
}

function normalizeTeam(name: string): string {
  return (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function isSameMatch(a: NormalizedMatch, b: NormalizedMatch): boolean {
  const diffMs = Math.abs(a.matchDate.getTime() - b.matchDate.getTime());
  return (
    normalizeTeam(a.homeTeam) === normalizeTeam(b.homeTeam) &&
    normalizeTeam(a.awayTeam) === normalizeTeam(b.awayTeam) &&
    diffMs < 24 * 60 * 60 * 1000
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly gateway: RealtimeGateway,
    private readonly standings: CopaStandingsService,
    private readonly bracketService: BracketService,
  ) {}

  // ─── Import ────────────────────────────────────────────────────────────────

  async importMatches(): Promise<{
    imported: number;
    skipped: number;
    total: number;
    sources: string[];
  }> {
    const sources: string[] = [];

    // 1ª tentativa: API-Football (melhor cobertura)
    let primary: NormalizedMatch[] = [];
    if (API_FOOTBALL_KEY) {
      primary = await this.fetchFromApiFootball();
      if (primary.length > 0) sources.push(`API-Football (${primary.length} jogos)`);
    }

    // 2ª tentativa: TheSportsDB
    let secondary: NormalizedMatch[] = [];
    if (primary.length < 50) {
      secondary = await this.fetchFromSportsDB('2026');
      if (secondary.length === 0) secondary = await this.fetchFromSportsDB('2025-2026');
      if (secondary.length > 0) sources.push(`TheSportsDB (${secondary.length} jogos)`);
    }

    if (sources.length === 0) {
      throw new BadRequestException(
        'Nenhuma fonte retornou jogos da Copa 2026. ' +
          'Verifique se API_FOOTBALL_KEY está correto no .env.',
      );
    }

    // Merge: primary tem prioridade; secondary preenche o que falta
    const merged = this.mergeMatchSources(primary, secondary);
    this.logger.log(`Fontes: ${sources.join(' | ')} → ${merged.length} únicos`);

    let imported = 0;
    let skipped = 0;

    for (const match of merged) {
      // Verifica por externalId
      const byExternal = await this.prisma.cravouMatch.findUnique({
        where: { externalId: match.externalId },
      });
      if (byExternal) { skipped++; continue; }

      // Verifica por times + dia (evita duplicata entre fontes)
      const dayStart = new Date(match.matchDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(match.matchDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const byTeams = await this.prisma.cravouMatch.findFirst({
        where: {
          homeTeam: { equals: match.homeTeam, mode: 'insensitive' },
          awayTeam: { equals: match.awayTeam, mode: 'insensitive' },
          matchDate: { gte: dayStart, lte: dayEnd },
        },
      });
      if (byTeams) { skipped++; continue; }

      await this.prisma.cravouMatch.create({ data: match });
      imported++;
    }

    return { imported, skipped, total: merged.length, sources };
  }

  private mergeMatchSources(
    primary: NormalizedMatch[],
    secondary: NormalizedMatch[],
  ): NormalizedMatch[] {
    const result = [...primary];
    for (const sec of secondary) {
      if (!result.some((p) => isSameMatch(p, sec))) result.push(sec);
    }
    return result;
  }

  // ─── Fetch API-Football ────────────────────────────────────────────────────

  private async fetchFromApiFootball(): Promise<NormalizedMatch[]> {
    try {
      const { data } = await axios.get(`${API_FOOTBALL_BASE}/fixtures`, {
        headers: { 'x-apisports-key': API_FOOTBALL_KEY },
        params: { league: FIFA_WC_LEAGUE_ID, season: FIFA_WC_SEASON },
        timeout: 12_000,
      });

      const fixtures: any[] = data.response ?? [];
      this.logger.log(`API-Football: ${fixtures.length} fixtures retornados`);

      return fixtures.map((f) => {
        const round: string = f.league?.round ?? '';
        const phase = detectPhase(round);
        const groupMatch = round.match(/Group\s+([A-L])/i);
        const groupName = groupMatch ? groupMatch[1].toUpperCase() : null;

        return {
          externalId: `apf_${f.fixture.id}`,
          phase,
          groupName,
          homeTeam: f.teams?.home?.name ?? 'TBD',
          awayTeam: f.teams?.away?.name ?? 'TBD',
          matchDate: new Date(f.fixture.date),
          stadium: f.fixture?.venue?.name ?? null,
          homeScore: parseScore(f.goals?.home),
          awayScore: parseScore(f.goals?.away),
        };
      });
    } catch (err: any) {
      this.logger.warn(`API-Football falhou: ${err.message}`);
      return [];
    }
  }

  // ─── Fetch TheSportsDB ─────────────────────────────────────────────────────

  private async fetchFromSportsDB(season: string): Promise<NormalizedMatch[]> {
    try {
      const url = `${SPORTSDB_BASE}/eventsseason.php?id=${SPORTSDB_LEAGUE_ID}&s=${season}`;
      const { data } = await axios.get(url, { timeout: 8_000 });
      const events: any[] = data.events ?? [];

      return events.map((e) => {
        const groupRaw = String(e.strGroup ?? '').replace(/^Group\s*/i, '').trim();
        const groupFromRound = e.strRound?.match(/Group\s+([A-L])/i)?.[1]?.toUpperCase() ?? null;

        return {
          externalId: `sdb_${e.idEvent}`,
          phase: detectPhase(e.strRound ?? ''),
          groupName: groupRaw || groupFromRound,
          homeTeam: e.strHomeTeam ?? 'TBD',
          awayTeam: e.strAwayTeam ?? 'TBD',
          matchDate: parseMatchDate(e.dateEvent, e.strTime),
          stadium: e.strVenue ?? null,
          homeScore: parseScore(e.intHomeScore),
          awayScore: parseScore(e.intAwayScore),
        };
      });
    } catch (err: any) {
      this.logger.warn(`TheSportsDB (season=${season}): ${err.message}`);
      return [];
    }
  }

  // ─── Criação manual ────────────────────────────────────────────────────────

  async createMatch(dto: CreateMatchDto) {
    return this.prisma.cravouMatch.create({
      data: {
        externalId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phase: dto.phase,
        groupName: dto.groupName ?? null,
        groupRound: dto.groupRound ?? null,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        matchDate: new Date(dto.matchDate),
        stadium: dto.stadium ?? null,
      },
    });
  }

  async createMatchesBulk(dtos: CreateMatchDto[]): Promise<{ created: number; errors: string[] }> {
    let created = 0;
    const errors: string[] = [];

    for (const dto of dtos) {
      try {
        await this.createMatch(dto);
        created++;
      } catch (err: any) {
        errors.push(`${dto.homeTeam} x ${dto.awayTeam}: ${err.message}`);
      }
    }

    return { created, errors };
  }

  async removeMatch(id: string) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    await this.prisma.cravouPrediction.deleteMany({ where: { matchId: id } });
    await this.prisma.cravouMatch.delete({ where: { id } });

    return { deleted: true };
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  findAll(phase?: string, status?: string) {
    return this.prisma.cravouMatch.findMany({
      where: {
        ...(phase ? { phase } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { matchDate: 'asc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (!userId) return { match };

    const prediction = await this.prisma.cravouPrediction.findUnique({
      where: { userId_matchId: { userId, matchId: id } },
    });

    return { match, prediction: prediction ?? null };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async updateScore(id: string, dto: UpdateMatchScoreDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { homeScore: dto.homeScore, awayScore: dto.awayScore },
    });

    this.gateway.emitMatchUpdated(updated);

    // Se a partida já está finalizada, reprocessa pontos automaticamente
    if (match.status === 'finished') {
      await this.scoring.reprocessMatch(id);
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateMatchStatusDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (dto.status === 'finished') {
      if (match.homeScore === null || match.awayScore === null) {
        throw new BadRequestException('Defina o placar antes de finalizar o jogo');
      }
    }

    const data: any = { status: dto.status };
    if (dto.status === 'live' || dto.status === 'locked') {
      data.predictionsLocked = true;
    }

    const updated = await this.prisma.cravouMatch.update({ where: { id }, data });

    if (dto.status === 'live') this.gateway.emitMatchLocked(id);
    this.gateway.emitMatchUpdated(updated);

    if (dto.status === 'finished') {
      await this.scoring.reprocessMatch(id);
      if (match.phase === 'group_stage') {
        await this.standings.updateFromMatch(id);
      } else {
        // Mata-mata: propaga vencedor para a próxima fase (estava faltando aqui)
        await this.propagateBracketWinner(id, match.homeScore!, match.awayScore!, match.penaltyWinner ?? undefined);
      }
    }

    return updated;
  }

  async lockMatch(id: string) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { predictionsLocked: true },
    });

    this.gateway.emitMatchLocked(id);
    this.gateway.emitMatchUpdated(updated);
    return updated;
  }

  // ─── Finalizar com resultado (score + finished + reprocess em um passo) ─────

  async finalizeMatch(id: string, dto: FinalizeMatchDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: {
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        penaltyWinner: dto.penaltyWinner ?? null,
        status: 'finished',
        predictionsLocked: true,
      },
    });

    this.gateway.emitMatchUpdated(updated);
    await this.scoring.reprocessMatch(id);

    if (match.phase === 'group_stage') {
      await this.standings.updateFromMatch(id);
    } else {
      // Mata-mata: propaga vencedor para a próxima fase automaticamente
      await this.propagateBracketWinner(id, dto.homeScore, dto.awayScore, dto.penaltyWinner);
    }

    return updated;
  }

  // ─── Propaga vencedor do mata-mata para a próxima fase ───────────────────────

  private async propagateBracketWinner(
    matchId: string,
    homeScore: number,
    awayScore: number,
    penaltyWinner?: string,
  ): Promise<void> {
    const slot = await this.prisma.cravouBracketSlot.findFirst({ where: { matchId } });
    if (!slot) return;

    let winner: string | null = null;

    if (homeScore > awayScore) {
      winner = slot.homeTeam;
    } else if (awayScore > homeScore) {
      winner = slot.awayTeam;
    } else if (penaltyWinner) {
      // Empate após 90min: usa o vencedor nos pênaltis (case-insensitive)
      if (slot.homeTeam && slot.homeTeam.toLowerCase() === penaltyWinner.toLowerCase()) {
        winner = slot.homeTeam;
      } else if (slot.awayTeam && slot.awayTeam.toLowerCase() === penaltyWinner.toLowerCase()) {
        winner = slot.awayTeam;
      }
    }

    if (!winner) {
      this.logger.warn(
        `Bracket slot ${slot.id}: empate sem penaltyWinner — propague manualmente via Admin`,
      );
      return;
    }

    try {
      await this.bracketService.setKnockoutResult(slot.id, winner);
      this.logger.log(`Bracket: vencedor ${winner} propagado do slot ${slot.id}`);
    } catch (err: any) {
      this.logger.error(`Erro ao propagar vencedor bracket: ${err.message}`);
    }
  }

  // ─── Reset (apaga placar, zera pontos, reverte status) ──────────────────────

  async resetMatch(id: string) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const now = new Date();
    const matchInFuture = new Date(match.matchDate).getTime() > now.getTime();
    const newStatus = matchInFuture ? 'upcoming' : 'awaiting_result';
    const newLocked = !matchInFuture;

    // Busca usuários afetados antes de zerar os pontos
    const affected = await this.prisma.cravouPrediction.findMany({
      where: { matchId: id, points: { not: null } },
      select: { userId: true },
    });
    const affectedUserIds = [...new Set(affected.map((p) => p.userId))];

    // Reseta o jogo e as predictions
    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { homeScore: null, awayScore: null, penaltyWinner: null, status: newStatus, predictionsLocked: newLocked },
    });

    await this.prisma.cravouPrediction.updateMany({
      where: { matchId: id },
      data: { points: null, penaltyWinner: null },
    });

    // Recalcula pontos e cravadas de todos os usuários afetados em uma única query SQL
    if (affectedUserIds.length > 0) {
      const userTotals = await this.prisma.$queryRaw<
        { userId: string; totalPoints: number; cravadas: bigint }[]
      >`
        SELECT
          p."userId",
          COALESCE(SUM(p.points), 0)::int AS "totalPoints",
          COUNT(CASE
            WHEN p.points = 15 THEN 1
            WHEN p.points = 10 AND m.phase = 'group_stage' THEN 1
            ELSE NULL
          END)::int AS cravadas
        FROM "CravouPrediction" p
        JOIN "CravouMatch" m ON m.id = p."matchId"
        WHERE p."userId" IN (${Prisma.join(affectedUserIds)})
          AND p.points IS NOT NULL
        GROUP BY p."userId"
      `;

      const usersWithPoints = new Set(userTotals.map((u) => u.userId));

      // Batch: atualiza usuários que ainda têm pontos
      if (userTotals.length > 0) {
        await this.prisma.$transaction(
          userTotals.map((u) =>
            this.prisma.user.update({
              where: { id: u.userId },
              data: { bolaoPoints: u.totalPoints, cravadas: Number(u.cravadas) },
            }),
          ),
        );
      }

      // Zera em batch quem perdeu todos os pontos
      const usersToZero = affectedUserIds.filter((uid) => !usersWithPoints.has(uid));
      if (usersToZero.length > 0) {
        await this.prisma.user.updateMany({
          where: { id: { in: usersToZero } },
          data: { bolaoPoints: 0, cravadas: 0 },
        });
      }
    }

    if (match.phase === 'group_stage' && match.groupName) {
      await this.standings.recalculateGroup(match.groupName);
    } else {
      await this.clearBracketSlotWinner(id);
    }

    this.gateway.emitMatchUpdated(updated);
    this.gateway.emitRankingUpdated();

    return { ...updated, affectedUsers: affectedUserIds.length };
  }

  private async clearBracketSlotWinner(matchId: string): Promise<void> {
    const slot = await this.prisma.cravouBracketSlot.findFirst({ where: { matchId } });
    if (!slot) return;

    const prevWinner = slot.winnerTeam;
    const prevLoser  = slot.loserTeam;

    await this.prisma.cravouBracketSlot.update({
      where: { id: slot.id },
      data: { winnerTeam: null, loserTeam: null },
    });

    if (prevWinner) {
      await this.cascadeClearBracketTeam(slot.round, prevWinner, prevLoser);
    }

    this.logger.log(`Bracket slot ${slot.id}: resultado removido e cascade recursivo aplicado`);
  }

  // Limpa recursivamente um time propagado por todas as fases seguintes
  private async cascadeClearBracketTeam(
    fromRound: string,
    team: string,
    loserTeam: string | null,
  ): Promise<void> {
    const nextRoundMap: Record<string, string> = {
      round_of_32: 'round_of_16',
      round_of_16: 'quarterfinal',
      quarterfinal: 'semifinal',
      semifinal:    'final',
    };

    const nextRound = nextRoundMap[fromRound];
    if (nextRound) {
      const nextSlot = await this.prisma.cravouBracketSlot.findFirst({
        where: { round: nextRound, OR: [{ homeTeam: team }, { awayTeam: team }] },
      });
      if (nextSlot) {
        const nextWinner = nextSlot.winnerTeam;
        const nextLoser  = nextSlot.loserTeam;

        await this.prisma.cravouBracketSlot.update({
          where: { id: nextSlot.id },
          data: {
            homeTeam:   nextSlot.homeTeam === team ? null : nextSlot.homeTeam,
            awayTeam:   nextSlot.awayTeam === team ? null : nextSlot.awayTeam,
            winnerTeam: null,
            loserTeam:  null,
          },
        });

        // Continua o cascade se este slot também havia propagado um vencedor
        if (nextWinner) {
          await this.cascadeClearBracketTeam(nextRound, nextWinner, nextLoser);
        }
      }
    }

    // Semifinal: o perdedor foi enviado para o 3º lugar
    if (fromRound === 'semifinal' && loserTeam) {
      const thirdSlot = await this.prisma.cravouBracketSlot.findFirst({
        where: { round: 'third_place', OR: [{ homeTeam: loserTeam }, { awayTeam: loserTeam }] },
      });
      if (thirdSlot) {
        await this.prisma.cravouBracketSlot.update({
          where: { id: thirdSlot.id },
          data: {
            homeTeam:   thirdSlot.homeTeam === loserTeam ? null : thirdSlot.homeTeam,
            awayTeam:   thirdSlot.awayTeam === loserTeam ? null : thirdSlot.awayTeam,
            winnerTeam: null,
            loserTeam:  null,
          },
        });
      }
    }
  }

  // ─── Jogos finalizados (global) ──────────────────────────────────────────────

  async getFinishedMatches() {
    const matches = await this.prisma.cravouMatch.findMany({
      where: { status: 'finished', homeScore: { not: null }, awayScore: { not: null } },
      orderBy: { matchDate: 'desc' },
      select: {
        id: true, homeTeam: true, awayTeam: true,
        homeScore: true, awayScore: true,
        matchDate: true, phase: true, penaltyWinner: true,
      },
    })
    return { matches }
  }

  // ─── Palpites de todos os usuários para um jogo (global) ─────────────────────

  async getMatchPalpites(matchId: string) {
    const match = await this.prisma.cravouMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true, homeTeam: true, awayTeam: true,
        homeScore: true, awayScore: true,
        matchDate: true, phase: true, penaltyWinner: true, status: true,
      },
    })
    if (!match) throw new NotFoundException('Jogo não encontrado')
    if (match.status !== 'finished') throw new BadRequestException('Jogo ainda não finalizado')

    const predictions = await this.prisma.cravouPrediction.findMany({
      where: { matchId },
      select: { userId: true, homeScore: true, awayScore: true, penaltyWinner: true, points: true },
    })

    const userIds = predictions.map((p) => p.userId)
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })

    const predMap = new Map(predictions.map((p) => [p.userId, p]))
    const isGroupStage = match.phase === 'group_stage'

    const palpites = users.map((u) => {
      const pred = predMap.get(u.id)!
      const pts = pred.points
      let category: string
      if (pts !== null && (pts >= 15 || (pts === 10 && isGroupStage))) category = 'cravou'
      else if (pts !== null && (pts === 7 || (pts === 10 && !isGroupStage))) category = 'resultado_bonus'
      else if (pts !== null && pts >= 5) category = 'resultado_certo'
      else if (pts !== null && pts >= 2) category = 'parcial'
      else category = 'errou'

      return {
        userId: u.id,
        name: u.name,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        penaltyWinner: pred.penaltyWinner,
        points: pts,
        category,
      }
    })

    const order: Record<string, number> = { cravou: 0, resultado_bonus: 1, resultado_certo: 2, parcial: 3, errou: 4 }
    palpites.sort((a, b) => order[a.category] - order[b.category] || (b.points ?? -1) - (a.points ?? -1))

    return {
      match: {
        id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam,
        homeScore: match.homeScore, awayScore: match.awayScore,
        matchDate: match.matchDate, phase: match.phase, penaltyWinner: match.penaltyWinner,
      },
      palpites,
    }
  }

  // ─── Desbloquear palpites ────────────────────────────────────────────────────

  async unlockMatch(id: string) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { predictionsLocked: false },
    });

    this.gateway.emitMatchUpdated(updated);
    return updated;
  }

  // ─── Alterar data/hora (para testes e correções) ──────────────────────────

  async updateMatchDate(id: string, dto: UpdateMatchDateDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (match.status === 'finished') {
      throw new BadRequestException('Não é possível alterar a data de uma partida já encerrada');
    }

    const newDate = new Date(dto.matchDate);
    const now = new Date();

    // Recalcula o status baseado na nova data
    let newStatus = match.status;
    let newLocked = match.predictionsLocked;

    // Se a nova data ainda está no futuro (> 10min), volta para upcoming aberto
    if (newDate.getTime() - now.getTime() > 10 * 60 * 1000) {
      newStatus = 'upcoming';
      newLocked = false;
    }

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { matchDate: newDate, status: newStatus, predictionsLocked: newLocked },
    });

    this.gateway.emitMatchUpdated(updated);
    return updated;
  }
}
