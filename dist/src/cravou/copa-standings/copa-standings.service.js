"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CopaStandingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopaStandingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const bracket_service_1 = require("../bracket/bracket.service");
const tiebreaker_service_1 = require("./tiebreaker.service");
const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const MATCHES_PER_GROUP = 6;
const ROUND_3_MATCHES_PER_GROUP = 2;
let CopaStandingsService = CopaStandingsService_1 = class CopaStandingsService {
    prisma;
    tiebreaker;
    gateway;
    bracket;
    logger = new common_1.Logger(CopaStandingsService_1.name);
    constructor(prisma, tiebreaker, gateway, bracket) {
        this.prisma = prisma;
        this.tiebreaker = tiebreaker;
        this.gateway = gateway;
        this.bracket = bracket;
    }
    async updateFromMatch(matchId) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id: matchId } });
        if (!match || match.phase !== 'group_stage')
            return;
        if (match.homeScore === null || match.awayScore === null)
            return;
        if (!match.groupName)
            return;
        await this.updateStandingForTeam(match.groupName, match.homeTeam, match.homeScore, match.awayScore);
        await this.updateStandingForTeam(match.groupName, match.awayTeam, match.awayScore, match.homeScore);
        this.logger.log(`Standings atualizados: Grupo ${match.groupName} — ${match.homeTeam} x ${match.awayTeam}`);
        if (match.groupRound === 3) {
            await this.checkAndClassifyGroup(match.groupName);
        }
    }
    async updateStandingForTeam(group, teamName, goalsFor, goalsAgainst) {
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
    async checkAndClassifyGroup(group) {
        const finishedRound3 = await this.prisma.cravouMatch.count({
            where: { groupName: group, groupRound: 3, status: 'finished' },
        });
        if (finishedRound3 < ROUND_3_MATCHES_PER_GROUP)
            return;
        const totalFinished = await this.prisma.cravouMatch.count({
            where: { groupName: group, phase: 'group_stage', status: 'finished' },
        });
        if (totalFinished < MATCHES_PER_GROUP)
            return;
        await this.classifyGroup(group);
    }
    async classifyGroup(group) {
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
        const r32Count = await this.prisma.cravouBracketSlot.count({ where: { round: 'round_of_32' } });
        if (r32Count > 0) {
            await this.bracket.refreshR32TeamsFromStandings();
        }
        await this.checkAllGroupsComplete();
    }
    async checkAllGroupsComplete() {
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
        const teamsByGroup = {};
        for (const m of allMatches) {
            if (!m.groupName)
                continue;
            if (!teamsByGroup[m.groupName])
                teamsByGroup[m.groupName] = new Set();
            teamsByGroup[m.groupName].add(m.homeTeam);
            teamsByGroup[m.groupName].add(m.awayTeam);
        }
        const standingsByGroup = {};
        for (const row of allStandings) {
            if (!standingsByGroup[row.group])
                standingsByGroup[row.group] = [];
            standingsByGroup[row.group].push(row);
        }
        return ALL_GROUPS.map((g) => {
            const fromDB = standingsByGroup[g] ?? [];
            const allTeams = teamsByGroup[g] ?? new Set();
            const dbTeamNames = new Set(fromDB.map((s) => s.teamName));
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
    async getGroupWithMatches(group) {
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
        const resolvedStandings = standings.length > 0
            ? standings
            : Array.from(new Set([...matches.map((m) => m.homeTeam), ...matches.map((m) => m.awayTeam)]))
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
    async getGroupStandings(group) {
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
    async recalculateGroup(group) {
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
            if (match.homeScore === null || match.awayScore === null)
                continue;
            await this.updateStandingForTeam(group, match.homeTeam, match.homeScore, match.awayScore);
            await this.updateStandingForTeam(group, match.awayTeam, match.awayScore, match.homeScore);
        }
        await this.checkAndClassifyGroup(group);
        this.logger.log(`Grupo ${group} recalculado do zero (${finishedMatches.length} partidas finalizadas)`);
    }
    async overridePositions(group, positions) {
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
};
exports.CopaStandingsService = CopaStandingsService;
exports.CopaStandingsService = CopaStandingsService = CopaStandingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tiebreaker_service_1.TiebreakerService,
        realtime_gateway_1.RealtimeGateway,
        bracket_service_1.BracketService])
], CopaStandingsService);
//# sourceMappingURL=copa-standings.service.js.map