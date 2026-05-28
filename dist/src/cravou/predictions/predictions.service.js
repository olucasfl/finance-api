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
exports.PredictionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PredictionsService = class PredictionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsert(userId, dto) {
        const match = await this.prisma.cravouMatch.findUnique({
            where: { id: dto.matchId },
        });
        if (!match)
            throw new common_1.NotFoundException('Jogo não encontrado');
        if (match.status !== 'upcoming') {
            throw new common_1.BadRequestException('Palpites só são aceitos em jogos com status "upcoming"');
        }
        if (match.predictionsLocked) {
            throw new common_1.BadRequestException('Os palpites para este jogo estão encerrados');
        }
        const penaltyWinner = match.phase !== 'group_stage' && dto.homeScore === dto.awayScore
            ? (dto.penaltyWinner ?? null)
            : null;
        return this.prisma.cravouPrediction.upsert({
            where: { userId_matchId: { userId, matchId: dto.matchId } },
            create: {
                userId,
                matchId: dto.matchId,
                homeScore: dto.homeScore,
                awayScore: dto.awayScore,
                penaltyWinner,
            },
            update: {
                homeScore: dto.homeScore,
                awayScore: dto.awayScore,
                penaltyWinner,
            },
        });
    }
    findMyPredictions(userId) {
        return this.prisma.cravouPrediction.findMany({
            where: { userId },
            include: { match: true },
            orderBy: { match: { matchDate: 'asc' } },
        });
    }
};
exports.PredictionsService = PredictionsService;
exports.PredictionsService = PredictionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PredictionsService);
//# sourceMappingURL=predictions.service.js.map