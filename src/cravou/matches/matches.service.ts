import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
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

    const affected = await this.prisma.cravouPrediction.findMany({
      where: { matchId: id, points: { not: null } },
      select: { userId: true },
    });

    const updated = await this.prisma.cravouMatch.update({
      where: { id },
      data: { homeScore: null, awayScore: null, status: newStatus, predictionsLocked: newLocked },
    });

    await this.prisma.cravouPrediction.updateMany({
      where: { matchId: id },
      data: { points: null, penaltyWinner: null },
    });

    const affectedUserIds = [...new Set(affected.map((p) => p.userId))];
    for (const userId of affectedUserIds) {
      const [pointsAgg, cravasCount] = await Promise.all([
        this.prisma.cravouPrediction.aggregate({
          where: { userId, points: { not: null } },
          _sum: { points: true },
        }),
        this.prisma.cravouPrediction.count({
          where: { userId, points: { in: [10, 15] } },
        }),
      ]);
      await this.prisma.user.update({
        where: { id: userId },
        data: { bolaoPoints: pointsAgg._sum.points ?? 0, cravadas: cravasCount },
      });
    }

    if (match.phase === 'group_stage' && match.groupName) {
      await this.standings.recalculateGroup(match.groupName);
    } else {
      // Mata-mata: limpa o vencedor do slot vinculado
      await this.clearBracketSlotWinner(id);
    }

    this.gateway.emitMatchUpdated(updated);
    this.gateway.emitRankingUpdated();

    return { ...updated, affectedUsers: affectedUserIds.length };
  }

  private async clearBracketSlotWinner(matchId: string): Promise<void> {
    const slot = await this.prisma.cravouBracketSlot.findFirst({ where: { matchId } });
    if (!slot || !slot.winnerTeam) return;
    await this.prisma.cravouBracketSlot.update({
      where: { id: slot.id },
      data: { winnerTeam: null, loserTeam: null },
    });
    this.logger.log(`Bracket slot ${slot.id}: resultado removido após reset da partida`);
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

    // Se a nova data ainda está no futuro (> 30min), volta para upcoming aberto
    if (newDate.getTime() - now.getTime() > 30 * 60 * 1000) {
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
