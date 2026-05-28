import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: CreatePredictionDto) {
    const match = await this.prisma.cravouMatch.findUnique({
      where: { id: dto.matchId },
    });

    if (!match) throw new NotFoundException('Jogo não encontrado');

    if (match.status !== 'upcoming') {
      throw new BadRequestException('Palpites só são aceitos em jogos com status "upcoming"');
    }

    if (match.predictionsLocked) {
      throw new BadRequestException('Os palpites para este jogo estão encerrados');
    }

    // penaltyWinner só é relevante em mata-mata quando há empate previsto
    const penaltyWinner =
      match.phase !== 'group_stage' && dto.homeScore === dto.awayScore
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

  findMyPredictions(userId: string) {
    return this.prisma.cravouPrediction.findMany({
      where: { userId },
      include: { match: true },
      orderBy: { match: { matchDate: 'asc' } },
    });
  }
}
