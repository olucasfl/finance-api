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
exports.RankingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const EXACT_POINTS = [10, 15];
let RankingService = class RankingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getGlobalRanking() {
        const [users, predictions] = await Promise.all([
            this.prisma.user.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            this.prisma.cravouPrediction.findMany({
                where: { points: { not: null } },
                select: { userId: true, points: true },
            }),
        ]);
        const totals = new Map();
        const cravas = new Map();
        for (const p of predictions) {
            totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
            if (EXACT_POINTS.includes(p.points ?? -1)) {
                cravas.set(p.userId, (cravas.get(p.userId) ?? 0) + 1);
            }
        }
        return users
            .map((u) => ({
            userId: u.id,
            name: u.name,
            points: totals.get(u.id) ?? 0,
            cravadas: cravas.get(u.id) ?? 0,
        }))
            .sort((a, b) => b.points - a.points || b.cravadas - a.cravadas)
            .map((entry, index) => ({ ...entry, position: index + 1 }));
    }
    async getGroupRanking(groupId, userId) {
        const group = await this.prisma.cravouGroup.findUnique({
            where: { id: groupId },
            include: { members: true },
        });
        if (!group)
            throw new common_1.NotFoundException('Grupo não encontrado');
        const isMember = group.members.some((m) => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('Você não faz parte deste grupo');
        const memberUserIds = group.members.map((m) => m.userId);
        const [users, predictions] = await Promise.all([
            this.prisma.user.findMany({
                where: { id: { in: memberUserIds } },
                select: { id: true, name: true, email: true },
            }),
            this.prisma.cravouPrediction.findMany({
                where: { userId: { in: memberUserIds }, points: { not: null } },
                select: { userId: true, points: true },
            }),
        ]);
        const totals = new Map();
        const cravas = new Map();
        for (const p of predictions) {
            totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
            if (EXACT_POINTS.includes(p.points ?? -1)) {
                cravas.set(p.userId, (cravas.get(p.userId) ?? 0) + 1);
            }
        }
        const ranking = users
            .map((u) => ({
            userId: u.id,
            name: u.name,
            email: u.email,
            points: totals.get(u.id) ?? 0,
            cravadas: cravas.get(u.id) ?? 0,
        }))
            .sort((a, b) => b.points - a.points || b.cravadas - a.cravadas)
            .map((entry, index) => ({ position: index + 1, ...entry }));
        return { group: { id: group.id, name: group.name }, ranking };
    }
};
exports.RankingService = RankingService;
exports.RankingService = RankingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map