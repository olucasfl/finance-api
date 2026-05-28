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
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let GroupsService = class GroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const group = await this.prisma.cravouGroup.create({
            data: {
                name: dto.name,
                description: dto.description,
                ownerId: userId,
                members: {
                    create: { userId },
                },
            },
            include: { members: true },
        });
        return group;
    }
    async join(userId, dto) {
        const group = await this.prisma.cravouGroup.findUnique({
            where: { inviteCode: dto.inviteCode },
            include: { members: true },
        });
        if (!group)
            throw new common_1.NotFoundException('Grupo não encontrado com este código');
        const alreadyMember = group.members.some((m) => m.userId === userId);
        if (alreadyMember)
            throw new common_1.BadRequestException('Você já é membro deste grupo');
        await this.prisma.cravouGroupMember.create({
            data: { groupId: group.id, userId },
        });
        return { message: 'Entrou no grupo com sucesso', groupId: group.id, groupName: group.name };
    }
    getMyGroups(userId) {
        return this.prisma.cravouGroup.findMany({
            where: { members: { some: { userId } } },
            include: { _count: { select: { members: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getGroup(groupId, userId) {
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
        const predictions = await this.prisma.cravouPrediction.findMany({
            where: { userId: { in: memberUserIds }, points: { not: null } },
            select: { userId: true, points: true },
        });
        const totals = new Map();
        for (const p of predictions) {
            totals.set(p.userId, (totals.get(p.userId) ?? 0) + (p.points ?? 0));
        }
        const users = await this.prisma.user.findMany({
            where: { id: { in: memberUserIds } },
            select: { id: true, name: true, email: true },
        });
        const ranking = users
            .map((u) => ({ userId: u.id, name: u.name, email: u.email, points: totals.get(u.id) ?? 0 }))
            .sort((a, b) => b.points - a.points)
            .map((entry, index) => ({ position: index + 1, ...entry }));
        return {
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
                inviteCode: group.inviteCode,
                ownerId: group.ownerId,
                memberCount: group.members.length,
            },
            ranking,
        };
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map