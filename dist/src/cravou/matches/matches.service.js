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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MatchesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../../prisma/prisma.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const scoring_service_1 = require("../scoring/scoring.service");
const copa_standings_service_1 = require("../copa-standings/copa-standings.service");
const bracket_service_1 = require("../bracket/bracket.service");
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY ?? '';
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const FIFA_WC_LEAGUE_ID = 1;
const FIFA_WC_SEASON = 2026;
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY ?? '3';
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}`;
const SPORTSDB_LEAGUE_ID = '4429';
function detectPhase(round) {
    const r = (round ?? '').toLowerCase();
    if (r.includes('group') || r.includes('matchday'))
        return 'group_stage';
    if (r.includes('round of 16') || r.includes('last 16') || r.includes('1/8'))
        return 'round_of_16';
    if (r.includes('quarter'))
        return 'quarterfinal';
    if (r.includes('semi'))
        return 'semifinal';
    if (r.includes('third') || r.includes('3rd') || r.includes('bronze'))
        return 'third_place';
    if (r.includes('final'))
        return 'final';
    return 'group_stage';
}
function parseScore(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = parseInt(String(value), 10);
    return isNaN(n) ? null : n;
}
function parseMatchDate(dateStr, timeStr) {
    try {
        const cleanTime = (timeStr ?? '00:00:00').replace(/\+.*$/, '').trim().substring(0, 5);
        return new Date(`${dateStr}T${cleanTime}:00Z`);
    }
    catch {
        return new Date(dateStr);
    }
}
function normalizeTeam(name) {
    return (name ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}
function isSameMatch(a, b) {
    const diffMs = Math.abs(a.matchDate.getTime() - b.matchDate.getTime());
    return (normalizeTeam(a.homeTeam) === normalizeTeam(b.homeTeam) &&
        normalizeTeam(a.awayTeam) === normalizeTeam(b.awayTeam) &&
        diffMs < 24 * 60 * 60 * 1000);
}
let MatchesService = MatchesService_1 = class MatchesService {
    prisma;
    scoring;
    gateway;
    standings;
    bracketService;
    logger = new common_1.Logger(MatchesService_1.name);
    constructor(prisma, scoring, gateway, standings, bracketService) {
        this.prisma = prisma;
        this.scoring = scoring;
        this.gateway = gateway;
        this.standings = standings;
        this.bracketService = bracketService;
    }
    async importMatches() {
        const sources = [];
        let primary = [];
        if (API_FOOTBALL_KEY) {
            primary = await this.fetchFromApiFootball();
            if (primary.length > 0)
                sources.push(`API-Football (${primary.length} jogos)`);
        }
        let secondary = [];
        if (primary.length < 50) {
            secondary = await this.fetchFromSportsDB('2026');
            if (secondary.length === 0)
                secondary = await this.fetchFromSportsDB('2025-2026');
            if (secondary.length > 0)
                sources.push(`TheSportsDB (${secondary.length} jogos)`);
        }
        if (sources.length === 0) {
            throw new common_1.BadRequestException('Nenhuma fonte retornou jogos da Copa 2026. ' +
                'Verifique se API_FOOTBALL_KEY está correto no .env.');
        }
        const merged = this.mergeMatchSources(primary, secondary);
        this.logger.log(`Fontes: ${sources.join(' | ')} → ${merged.length} únicos`);
        let imported = 0;
        let skipped = 0;
        for (const match of merged) {
            const byExternal = await this.prisma.cravouMatch.findUnique({
                where: { externalId: match.externalId },
            });
            if (byExternal) {
                skipped++;
                continue;
            }
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
            if (byTeams) {
                skipped++;
                continue;
            }
            await this.prisma.cravouMatch.create({ data: match });
            imported++;
        }
        return { imported, skipped, total: merged.length, sources };
    }
    mergeMatchSources(primary, secondary) {
        const result = [...primary];
        for (const sec of secondary) {
            if (!result.some((p) => isSameMatch(p, sec)))
                result.push(sec);
        }
        return result;
    }
    async fetchFromApiFootball() {
        try {
            const { data } = await axios_1.default.get(`${API_FOOTBALL_BASE}/fixtures`, {
                headers: { 'x-apisports-key': API_FOOTBALL_KEY },
                params: { league: FIFA_WC_LEAGUE_ID, season: FIFA_WC_SEASON },
                timeout: 12_000,
            });
            const fixtures = data.response ?? [];
            this.logger.log(`API-Football: ${fixtures.length} fixtures retornados`);
            return fixtures.map((f) => {
                const round = f.league?.round ?? '';
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
        }
        catch (err) {
            this.logger.warn(`API-Football falhou: ${err.message}`);
            return [];
        }
    }
    async fetchFromSportsDB(season) {
        try {
            const url = `${SPORTSDB_BASE}/eventsseason.php?id=${SPORTSDB_LEAGUE_ID}&s=${season}`;
            const { data } = await axios_1.default.get(url, { timeout: 8_000 });
            const events = data.events ?? [];
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
        }
        catch (err) {
            this.logger.warn(`TheSportsDB (season=${season}): ${err.message}`);
            return [];
        }
    }
    async createMatch(dto) {
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
    async createMatchesBulk(dtos) {
        let created = 0;
        const errors = [];
        for (const dto of dtos) {
            try {
                await this.createMatch(dto);
                created++;
            }
            catch (err) {
                errors.push(`${dto.homeTeam} x ${dto.awayTeam}: ${err.message}`);
            }
        }
        return { created, errors };
    }
    async removeMatch(id) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        await this.prisma.cravouPrediction.deleteMany({ where: { matchId: id } });
        await this.prisma.cravouMatch.delete({ where: { id } });
        return { deleted: true };
    }
    findAll(phase, status) {
        return this.prisma.cravouMatch.findMany({
            where: {
                ...(phase ? { phase } : {}),
                ...(status ? { status } : {}),
            },
            orderBy: { matchDate: 'asc' },
        });
    }
    async findOne(id, userId) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        if (!userId)
            return { match };
        const prediction = await this.prisma.cravouPrediction.findUnique({
            where: { userId_matchId: { userId, matchId: id } },
        });
        return { match, prediction: prediction ?? null };
    }
    async updateScore(id, dto) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        const updated = await this.prisma.cravouMatch.update({
            where: { id },
            data: { homeScore: dto.homeScore, awayScore: dto.awayScore },
        });
        this.gateway.emitMatchUpdated(updated);
        if (match.status === 'finished') {
            await this.scoring.reprocessMatch(id);
        }
        return updated;
    }
    async updateStatus(id, dto) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        if (dto.status === 'finished') {
            if (match.homeScore === null || match.awayScore === null) {
                throw new common_1.BadRequestException('Defina o placar antes de finalizar o jogo');
            }
        }
        const data = { status: dto.status };
        if (dto.status === 'live' || dto.status === 'locked') {
            data.predictionsLocked = true;
        }
        const updated = await this.prisma.cravouMatch.update({ where: { id }, data });
        if (dto.status === 'live')
            this.gateway.emitMatchLocked(id);
        this.gateway.emitMatchUpdated(updated);
        if (dto.status === 'finished') {
            await this.scoring.reprocessMatch(id);
            if (match.phase === 'group_stage') {
                await this.standings.updateFromMatch(id);
            }
        }
        return updated;
    }
    async lockMatch(id) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        const updated = await this.prisma.cravouMatch.update({
            where: { id },
            data: { predictionsLocked: true },
        });
        this.gateway.emitMatchLocked(id);
        this.gateway.emitMatchUpdated(updated);
        return updated;
    }
    async finalizeMatch(id, dto) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
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
        }
        else {
            await this.propagateBracketWinner(id, dto.homeScore, dto.awayScore, dto.penaltyWinner);
        }
        return updated;
    }
    async propagateBracketWinner(matchId, homeScore, awayScore, penaltyWinner) {
        const slot = await this.prisma.cravouBracketSlot.findFirst({ where: { matchId } });
        if (!slot)
            return;
        let winner = null;
        if (homeScore > awayScore) {
            winner = slot.homeTeam;
        }
        else if (awayScore > homeScore) {
            winner = slot.awayTeam;
        }
        else if (penaltyWinner) {
            if (slot.homeTeam && slot.homeTeam.toLowerCase() === penaltyWinner.toLowerCase()) {
                winner = slot.homeTeam;
            }
            else if (slot.awayTeam && slot.awayTeam.toLowerCase() === penaltyWinner.toLowerCase()) {
                winner = slot.awayTeam;
            }
        }
        if (!winner) {
            this.logger.warn(`Bracket slot ${slot.id}: empate sem penaltyWinner — propague manualmente via Admin`);
            return;
        }
        try {
            await this.bracketService.setKnockoutResult(slot.id, winner);
            this.logger.log(`Bracket: vencedor ${winner} propagado do slot ${slot.id}`);
        }
        catch (err) {
            this.logger.error(`Erro ao propagar vencedor bracket: ${err.message}`);
        }
    }
    async resetMatch(id) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
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
        }
        else {
            await this.clearBracketSlotWinner(id);
        }
        this.gateway.emitMatchUpdated(updated);
        this.gateway.emitRankingUpdated();
        return { ...updated, affectedUsers: affectedUserIds.length };
    }
    async clearBracketSlotWinner(matchId) {
        const slot = await this.prisma.cravouBracketSlot.findFirst({ where: { matchId } });
        if (!slot || !slot.winnerTeam)
            return;
        await this.prisma.cravouBracketSlot.update({
            where: { id: slot.id },
            data: { winnerTeam: null, loserTeam: null },
        });
        this.logger.log(`Bracket slot ${slot.id}: resultado removido após reset da partida`);
    }
    async unlockMatch(id) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        const updated = await this.prisma.cravouMatch.update({
            where: { id },
            data: { predictionsLocked: false },
        });
        this.gateway.emitMatchUpdated(updated);
        return updated;
    }
    async updateMatchDate(id, dto) {
        const match = await this.prisma.cravouMatch.findUnique({ where: { id } });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        if (match.status === 'finished') {
            throw new common_1.BadRequestException('Não é possível alterar a data de uma partida já encerrada');
        }
        const newDate = new Date(dto.matchDate);
        const now = new Date();
        let newStatus = match.status;
        let newLocked = match.predictionsLocked;
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
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = MatchesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        scoring_service_1.ScoringService,
        realtime_gateway_1.RealtimeGateway,
        copa_standings_service_1.CopaStandingsService,
        bracket_service_1.BracketService])
], MatchesService);
//# sourceMappingURL=matches.service.js.map