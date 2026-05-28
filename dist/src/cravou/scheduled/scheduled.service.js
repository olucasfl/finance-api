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
var ScheduledService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
const LOCK_BEFORE_MS = 30 * 60 * 1000;
let ScheduledService = ScheduledService_1 = class ScheduledService {
    prisma;
    gateway;
    logger = new common_1.Logger(ScheduledService_1.name);
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    async handleMatchLifecycle() {
        const now = new Date();
        await Promise.all([
            this.autoLockPredictions(now),
            this.setMatchesLive(now),
            this.setMatchesAwaitingResult(now),
        ]);
    }
    async autoLockPredictions(now) {
        const lockThreshold = new Date(now.getTime() + LOCK_BEFORE_MS);
        const matches = await this.prisma.cravouMatch.findMany({
            where: {
                status: 'upcoming',
                predictionsLocked: false,
                matchDate: { lte: lockThreshold },
            },
        });
        for (const match of matches) {
            await this.prisma.cravouMatch.update({
                where: { id: match.id },
                data: { predictionsLocked: true },
            });
            this.gateway.emitMatchLocked(match.id);
            this.logger.log(`[AUTO-LOCK] ${match.homeTeam} x ${match.awayTeam} — palpites encerrados (30min antes do início)`);
        }
    }
    async setMatchesLive(now) {
        const matches = await this.prisma.cravouMatch.findMany({
            where: {
                status: 'upcoming',
                matchDate: { lte: now },
            },
        });
        for (const match of matches) {
            const updated = await this.prisma.cravouMatch.update({
                where: { id: match.id },
                data: { status: 'live', predictionsLocked: true },
            });
            this.gateway.emitMatchUpdated(updated);
            this.logger.log(`[LIVE] ${match.homeTeam} x ${match.awayTeam} — partida iniciada`);
        }
    }
    async setMatchesAwaitingResult(now) {
        const awaitingThreshold = new Date(now.getTime() - MATCH_DURATION_MS);
        const matches = await this.prisma.cravouMatch.findMany({
            where: {
                status: 'live',
                matchDate: { lte: awaitingThreshold },
            },
        });
        for (const match of matches) {
            const updated = await this.prisma.cravouMatch.update({
                where: { id: match.id },
                data: { status: 'awaiting_result' },
            });
            this.gateway.emitMatchUpdated(updated);
            this.logger.log(`[AWAITING] ${match.homeTeam} x ${match.awayTeam} — aguardando resultado`);
        }
    }
};
exports.ScheduledService = ScheduledService;
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledService.prototype, "handleMatchLifecycle", null);
exports.ScheduledService = ScheduledService = ScheduledService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        realtime_gateway_1.RealtimeGateway])
], ScheduledService);
//# sourceMappingURL=scheduled.service.js.map