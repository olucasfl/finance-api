import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ScoringService } from '../scoring/scoring.service';
import { UpdateMatchScoreDto } from './dto/update-match-score.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

function detectPhase(roundName: string): string {
  const n = roundName.toLowerCase();
  if (n.includes('matchday') || n.includes('group stage')) return 'group_stage';
  if (n.includes('round of 16') || n.includes('1/8')) return 'round_of_16';
  if (n.includes('quarter')) return 'quarterfinal';
  if (n.includes('semi')) return 'semifinal';
  if (n.includes('third') || n.includes('3rd')) return 'third_place';
  if (n.includes('final')) return 'final';
  return 'group_stage';
}

function detectGroup(roundName: string, matchGroup?: string): string | null {
  if (matchGroup) return matchGroup.replace(/^Group\s*/i, '').trim();
  const m = roundName.match(/Group\s+([A-Z])/i);
  return m ? m[1].toUpperCase() : null;
}

function parseMatchDate(dateStr: string, timeStr?: string): Date {
  try {
    const time = timeStr ? timeStr.replace(/\s*UTC.*$/, '').trim() : '00:00';
    return new Date(`${dateStr}T${time}:00Z`);
  } catch {
    return new Date(dateStr);
  }
}

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async importMatches(): Promise<{ imported: number; skipped: number }> {
    const { data } = await axios.get(OPENFOOTBALL_URL);
    const rounds: any[] = data.rounds ?? [];

    let imported = 0;
    let skipped = 0;

    for (const round of rounds) {
      const roundName: string = round.name ?? '';
      const phase = detectPhase(roundName);

      const matches: any[] = round.matches ?? [];
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const externalId = String(m.num ?? `${roundName}_${i}`);
        const groupName = detectGroup(roundName, m.group);
        const homeTeam =
          m.team1?.name ?? m.team1 ?? m.home_team ?? 'TBD';
        const awayTeam =
          m.team2?.name ?? m.team2 ?? m.away_team ?? 'TBD';
        const matchDate = parseMatchDate(m.date, m.time);
        const stadium =
          m.stadium?.name ?? m.venue?.name ?? m.stadium ?? null;

        const existing = await this.prisma.cravouMatch.findUnique({
          where: { externalId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await this.prisma.cravouMatch.create({
          data: {
            externalId,
            phase,
            groupName,
            homeTeam,
            awayTeam,
            matchDate,
            stadium,
          },
        });
        imported++;
      }
    }

    return { imported, skipped };
  }

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
    const match = await this.prisma.cravouMatch.findUnique({
      where: { id },
    });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (!userId) return { match };

    const prediction = await this.prisma.cravouPrediction.findUnique({
      where: { userId_matchId: { userId, matchId: id } },
    });

    return { match, prediction: prediction ?? null };
  }

  async updateScore(id: string, dto: UpdateMatchScoreDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { homeScore: dto.homeScore, awayScore: dto.awayScore },
    });

    this.gateway.emitMatchUpdated(updated);
    return updated;
  }

  async updateStatus(id: string, dto: UpdateMatchStatusDto) {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (dto.status === 'finished') {
      if (match.homeScore === null || match.awayScore === null) {
        throw new BadRequestException(
          'Defina o placar antes de finalizar o jogo',
        );
      }
    }

    const data: any = { status: dto.status };
    if (dto.status === 'live' || dto.status === 'locked') {
      data.predictionsLocked = true;
    }

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data,
    });

    if (dto.status === 'live') {
      this.gateway.emitMatchLocked(id);
    }

    this.gateway.emitMatchUpdated(updated);

    if (dto.status === 'finished') {
      await this.scoring.reprocessMatch(id);
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
}
