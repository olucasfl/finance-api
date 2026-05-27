import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { calculatePoints } from './scoring.rules';

// Pontos atribuídos apenas para placar exato (grupo=10, mata-mata=15)
const EXACT_SCORE_POINTS = new Set([10, 15]);

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async reprocessMatch(matchId: string): Promise<void> {
    const match = await this.prisma.cravouMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) throw new BadRequestException('Jogo não encontrado');
    if (match.status !== 'finished') {
      throw new BadRequestException('Só é possível reprocessar jogos finalizados');
    }
    if (match.homeScore === null || match.awayScore === null) {
      throw new BadRequestException('Placar não definido');
    }

    // Apaga pontos anteriores antes de recalcular
    await this.prisma.cravouPrediction.updateMany({
      where: { matchId },
      data: { points: null },
    });

    const predictions = await this.prisma.cravouPrediction.findMany({
      where: { matchId },
    });

    for (const pred of predictions) {
      const points = calculatePoints(
        match.phase,
        match.homeScore,
        match.awayScore,
        pred.homeScore,
        pred.awayScore,
      );
      await this.prisma.cravouPrediction.update({
        where: { id: pred.id },
        data: { points },
      });
    }

    // Recalcula pontos e cravadas de cada usuário afetado
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
}
