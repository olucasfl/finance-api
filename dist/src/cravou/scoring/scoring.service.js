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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const scoring_rules_1 = require("./scoring.rules");
const EXACT_SCORE_POINTS = new Set([10, 15]);
let ScoringService = class ScoringService {
    prisma;
    gateway;
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    async reprocessMatch(matchId) {
        const match = await this.prisma.cravouMatch.findUnique({
            where: { id: matchId },
        });
        if (!match)
            throw new common_1.BadRequestException('Jogo não encontrado');
        if (match.status !== 'finished') {
            throw new common_1.BadRequestException('Só é possível reprocessar jogos finalizados');
        }
        if (match.homeScore === null || match.awayScore === null) {
            throw new common_1.BadRequestException('Placar não definido');
        }
        await this.prisma.cravouPrediction.updateMany({
            where: { matchId },
            data: { points: null },
        });
        const predictions = await this.prisma.cravouPrediction.findMany({
            where: { matchId },
        });
        for (const pred of predictions) {
            const points = (0, scoring_rules_1.calculatePoints)(match.phase, match.homeScore, match.awayScore, pred.homeScore, pred.awayScore, match.penaltyWinner, pred.penaltyWinner);
            await this.prisma.cravouPrediction.update({
                where: { id: pred.id },
                data: { points },
            });
        }
        const affectedUserIds = [...new Set(predictions.map((p) => p.userId))];
        for (const userId of affectedUserIds) {
            const [pointsAgg, cravasCount] = await Promise.all([
                this.prisma.cravouPrediction.aggregate({
                    where: { userId, points: { not: null } },
                    _sum: { points: true },
                }),
                this.prisma.cravouPrediction.count({
                    where: { userId, points: { in: [...EXACT_SCORE_POINTS] } },
                }),
            ]);
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    bolaoPoints: pointsAgg._sum.points ?? 0,
                    cravadas: cravasCount,
                },
            });
        }
        this.gateway.emitRankingUpdated();
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        realtime_gateway_1.RealtimeGateway])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map