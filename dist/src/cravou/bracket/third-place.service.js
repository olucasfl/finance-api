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
var ThirdPlaceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThirdPlaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ThirdPlaceService = ThirdPlaceService_1 = class ThirdPlaceService {
    prisma;
    logger = new common_1.Logger(ThirdPlaceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async selectBest8() {
        const thirds = await this.prisma.cravouGroupStanding.findMany({
            where: { position: 3 },
            orderBy: [{ points: 'desc' }, { goalDifference: 'desc' }, { goalsFor: 'desc' }],
        });
        if (thirds.length < 12) {
            this.logger.warn(`Apenas ${thirds.length} terceiros disponíveis — aguardando todos os grupos`);
        }
        const qualifiers = thirds.slice(0, 8);
        const eliminated = thirds.slice(8);
        for (const q of qualifiers) {
            await this.prisma.cravouGroupStanding.update({
                where: { group_teamName: { group: q.group, teamName: q.teamName } },
                data: { isQualified: true },
            });
        }
        for (const e of eliminated) {
            await this.prisma.cravouGroupStanding.update({
                where: { group_teamName: { group: e.group, teamName: e.teamName } },
                data: { isQualified: false },
            });
        }
        this.logger.log(`8 melhores terceiros selecionados: ${qualifiers.map((q) => q.teamName).join(', ')}`);
        return {
            qualifiers: qualifiers.map((q) => ({
                teamName: q.teamName,
                group: q.group,
                points: q.points,
                goalDifference: q.goalDifference,
                goalsFor: q.goalsFor,
                isQualified: true,
            })),
            eliminated: eliminated.map((e) => ({
                teamName: e.teamName,
                group: e.group,
                points: e.points,
                goalDifference: e.goalDifference,
                goalsFor: e.goalsFor,
                isQualified: false,
            })),
        };
    }
    async getQualifiedThirds() {
        const thirds = await this.prisma.cravouGroupStanding.findMany({
            where: { position: 3, isQualified: true },
            select: { teamName: true, group: true },
        });
        return thirds;
    }
};
exports.ThirdPlaceService = ThirdPlaceService;
exports.ThirdPlaceService = ThirdPlaceService = ThirdPlaceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ThirdPlaceService);
//# sourceMappingURL=third-place.service.js.map