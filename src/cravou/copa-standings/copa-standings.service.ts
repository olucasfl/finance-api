import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { TiebreakerService } from './tiebreaker.service';

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const MATCHES_PER_GROUP = 6;
const ROUND_3_MATCHES_PER_GROUP = 2;

@Injectable()
export class CopaStandingsService {
  private readonly logger = new Logger(CopaStandingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tiebreaker: TiebreakerService,
    private readonly gateway: RealtimeGateway,
  ) {}

  // ─── Chamado pelo MatchesService quando um jogo de grupo termina ──────────

  async updateFromMatch(matchId: string): Promise<void> {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id: matchId } });
    if (!match || match.phase !== 'group_stage') return;
    if (match.homeScore === null || match.awayScore === null) return;
    if (!match.groupName) return;

    await this.updateStandingForTeam(
      match.groupName,
      match.homeTeam,
      match.homeScore,
      match.awayScore,
    );
    await this.updateStandingForTeam(
      match.groupName,
      match.awayTeam,
      match.awayScore,
      match.homeScore,
    );

    this.logger.log(`Standings atualizados: Grupo ${match.groupName} — ${match.homeTeam} x ${match.awayTeam}`);

    // Verifica se é a última rodada e se o grupo completou
    if (match.groupRound === 3) {
      await this.checkAndClassifyGroup(match.groupName);
    }
  }

  private async updateStandingForTeam(
    group: string,
    teamName: string,
    goalsFor: number,
    goalsAgainst: number,
  ): Promise<void> {
    const isWin = goalsFor > goalsAgainst;
    const isDraw = goalsFor === goalsAgainst;

    const current = await this.prisma.cravouGroupStanding.findUnique({
      where: { group_teamName: { group, teamName } },
    });

    await this.prisma.cravouGroupStanding.upsert({
      where: { group_teamName: { group, teamName } },
      create: {
        group,
        teamName,
        matchesPlayed: 1,
        wins: isWin ? 1 : 0,
        draws: isDraw ? 1 : 0,
        losses: !isWin && !isDraw ? 1 : 0,
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        points: isWin ? 3 : isDraw ? 1 : 0,
      },
      update: {
        matchesPlayed: (current?.matchesPlayed ?? 0) + 1,
        wins: (current?.wins ?? 0) + (isWin ? 1 : 0),
        draws: (current?.draws ?? 0) + (isDraw ? 1 : 0),
        losses: (current?.losses ?? 0) + (!isWin && !isDraw ? 1 : 0),
        goalsFor: (current?.goalsFor ?? 0) + goalsFor,
        goalsAgainst: (current?.goalsAgainst ?? 0) + goalsAgainst,
        goalDifference: (current?.goalDifference ?? 0) + (goalsFor - goalsAgainst),
        points: (current?.points ?? 0) + (isWin ? 3 : isDraw ? 1 : 0),
      },
    });
  }

  // ─── Classificação do grupo ───────────────────────────────────────────────

  async checkAndClassifyGroup(group: string): Promise<void> {
    const finishedRound3 = await this.prisma.cravouMatch.count({
      where: { groupName: group, groupRound: 3, status: 'finished' },
    });

    if (finishedRound3 < ROUND_3_MATCHES_PER_GROUP) return;

    // Confirma que todas as 6 partidas do grupo terminaram
    const totalFinished = await this.prisma.cravouMatch.count({
      where: { groupName: group, phase: 'group_stage', status: 'finished' },
    });

    if (totalFinished < MATCHES_PER_GROUP) return;

    await this.classifyGroup(group);
  }

  async classifyGroup(group: string): Promise<void> {
    const standings = await this.prisma.cravouGroupStanding.findMany({
      where: { group },
    });

    if (standings.length < 4) {
      this.logger.warn(`Grupo ${group} tem menos de 4 times — classificação ignorada`);
      return;
    }

    const ranked = await this.tiebreaker.sort(standings);

    for (const row of ranked) {
      await this.prisma.cravouGroupStanding.update({
        where: { group_teamName: { group, teamName: row.teamName } },
        data: {
          position: row.position,
          isQualified: row.position !== null && row.position <= 2,
        },
      });
    }

    this.logger.log(`Grupo ${group} classificado`);
    const finalStandings = await this.getGroupStandings(group);
    this.gateway.emitGroupClassified(group, finalStandings);

    // Verifica se todos os 12 grupos terminaram
    await this.checkAllGroupsComplete();
  }

  private async checkAllGroupsComplete(): Promise<void> {
    const classifiedGroups = await this.prisma.cravouGroupStanding.findMany({
      where: { position: { not: null } },
      select: { group: true },
      distinct: ['group'],
    });

    const uniqueGroups = new Set(classifiedGroups.map((g) => g.group));
    if (uniqueGroups.size >= ALL_GROUPS.length) {
      this.logger.log('Todos os 12 grupos classificados — disparando evento');
      this.gateway.emitAllGroupsComplete();
    }
  }

  // ─── Queries públicas ─────────────────────────────────────────────────────

  async getAllGroups() {
    const [allStandings, allMatches] = await Promise.all([
      this.prisma.cravouGroupStanding.findMany({
        orderBy: [{ group: 'asc' }, { position: 'asc' }, { points: 'desc' }],
      }),
      this.prisma.cravouMatch.findMany({
        where: { phase: 'group_stage' },
        select: { groupName: true, homeTeam: true, awayTeam: true },
      }),
    ]);

    // Build team sets from matches (used as fallback when standings not yet created)
    const teamsByGroup: Record<string, Set<string>> = {};
    for (const m of allMatches) {
      if (!m.groupName) continue;
      if (!teamsByGroup[m.groupName]) teamsByGroup[m.groupName] = new Set();
      teamsByGroup[m.groupName].add(m.homeTeam);
      teamsByGroup[m.groupName].add(m.awayTeam);
    }

    const standingsByGroup: Record<string, typeof allStandings> = {};
    for (const row of allStandings) {
      if (!standingsByGroup[row.group]) standingsByGroup[row.group] = [];
      standingsByGroup[row.group].push(row);
    }

    return ALL_GROUPS.map((g) => {
      const fromDB = standingsByGroup[g] ?? [];
      const allTeams = teamsByGroup[g] ?? new Set<string>();
      const dbTeamNames = new Set(fromDB.map((s) => s.teamName));

      // Teams not yet in DB get a placeholder row with zeroed stats
      const placeholders = Array.from(allTeams)
        .filter((t) => !dbTeamNames.has(t))
        .sort()
        .map((teamName) => ({
          id: `ph-${g}-${teamName}`,
          group: g,
          teamName,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          position: null,
          isQualified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      return { group: g, standings: [...fromDB, ...placeholders] };
    });
  }

  async getGroupWithMatches(group: string) {
    const g = group.toUpperCase();
    const [standings, matches] = await Promise.all([
      this.prisma.cravouGroupStanding.findMany({
        where: { group: g },
        orderBy: [{ position: 'asc' }, { points: 'desc' }, { goalDifference: 'desc' }],
      }),
      this.prisma.cravouMatch.findMany({
        where: { groupName: g, phase: 'group_stage' },
        orderBy: { groupRound: 'asc' },
      }),
    ]);

    // Fallback: if standings empty, derive teams from matches
    const resolvedStandings =
      standings.length > 0
        ? standings
        : Array.from(
            new Set([...matches.map((m) => m.homeTeam), ...matches.map((m) => m.awayTeam)]),
          )
            .sort()
            .map((teamName) => ({
              id: `ph-${g}-${teamName}`,
              group: g,
              teamName,
              matchesPlayed: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
              points: 0,
              position: null,
              isQualified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

    return { group: g, standings: resolvedStandings, matches };
  }

  async getGroupStandings(group: string) {
    return this.prisma.cravouGroupStanding.findMany({
      where: { group: group.toUpperCase() },
      orderBy: [{ position: 'asc' }, { points: 'desc' }, { goalDifference: 'desc' }],
    });
  }

  async getThirdsRanking() {
    return this.prisma.cravouGroupStanding.findMany({
      where: { position: 3 },
      orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
    });
  }

  async getQualified() {
    return this.prisma.cravouGroupStanding.findMany({
      where: { isQualified: true },
      orderBy: [{ group: 'asc' }, { position: 'asc' }],
    });
  }

  // ─── Recalcula grupo do zero (chamado após reset de partida) ─────────────

  async recalculateGroup(group: string): Promise<void> {
    await this.prisma.cravouGroupStanding.updateMany({
      where: { group },
      data: {
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        position: null,
        isQualified: false,
      },
    });

    const finishedMatches = await this.prisma.cravouMatch.findMany({
      where: { groupName: group, phase: 'group_stage', status: 'finished' },
    });

    for (const match of finishedMatches) {
      if (match.homeScore === null || match.awayScore === null) continue;
      await this.updateStandingForTeam(group, match.homeTeam, match.homeScore, match.awayScore);
      await this.updateStandingForTeam(group, match.awayTeam, match.awayScore, match.homeScore);
    }

    await this.checkAndClassifyGroup(group);
    this.logger.log(`Grupo ${group} recalculado do zero (${finishedMatches.length} partidas finalizadas)`);
  }

  // ─── Admin: override manual de posição ───────────────────────────────────

  async overridePositions(
    group: string,
    positions: { teamName: string; position: number; isQualified: boolean }[],
  ) {
    for (const entry of positions) {
      await this.prisma.cravouGroupStanding.update({
        where: { group_teamName: { group: group.toUpperCase(), teamName: entry.teamName } },
        data: { position: entry.position, isQualified: entry.isQualified },
      });
    }
    const finalStandings = await this.getGroupStandings(group);
    this.gateway.emitGroupClassified(group.toUpperCase(), finalStandings);
    return finalStandings;
  }
}
