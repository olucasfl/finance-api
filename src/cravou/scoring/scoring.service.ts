import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { calculatePoints } from './scoring.rules';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  async reprocessMatch(matchId: string): Promise<void> {
    const match = await this.prisma.cravouMatch.findUnique({ where: { id: matchId } });
    if (!match) throw new BadRequestException('Jogo não encontrado');
    if (match.status !== 'finished') throw new BadRequestException('Só é possível reprocessar jogos finalizados');
    if (match.homeScore === null || match.awayScore === null) throw new BadRequestException('Placar não definido');

    const predictions = await this.prisma.cravouPrediction.findMany({ where: { matchId } });

    if (predictions.length === 0) {
      this.gateway.emitRankingUpdated();
      return;
    }

    // Calcula todos os pontos em memória (zero queries adicionais)
    const updateOps = predictions.map((pred) =>
      this.prisma.cravouPrediction.update({
        where: { id: pred.id },
        data: {
          points: calculatePoints(
            match.phase,
            match.homeScore!,
            match.awayScore!,
            pred.homeScore,
            pred.awayScore,
            match.penaltyWinner,
            pred.penaltyWinner,
          ),
        },
      }),
    );

    // Batch: zera e reatribui todos os pontos em uma única transaction (sem loop de round-trips)
    await this.prisma.$transaction([
      this.prisma.cravouPrediction.updateMany({ where: { matchId }, data: { points: null } }),
      ...updateOps,
    ]);

    // Uma única query SQL para buscar pontos e cravadas de todos os usuários afetados
    const affectedUserIds = [...new Set(predictions.map((p) => p.userId))];

    const userTotals = await this.prisma.$queryRaw<
      { userId: string; totalPoints: number; cravadas: bigint }[]
    >`
      SELECT
        p."userId",
        COALESCE(SUM(p.points), 0)::int  AS "totalPoints",
        COUNT(CASE
          WHEN m.phase = 'group_stage' AND p.points = 10 THEN 1
          WHEN m.phase != 'group_stage' AND p.points IN (14, 15, 17) THEN 1
          ELSE NULL
        END)::int AS cravadas
      FROM "CravouPrediction" p
      JOIN "CravouMatch" m ON m.id = p."matchId"
      WHERE p."userId" IN (${Prisma.join(affectedUserIds)})
        AND p.points IS NOT NULL
      GROUP BY p."userId"
    `;

    // Batch: atualiza todos os usuários em uma única transaction
    if (userTotals.length > 0) {
      await this.prisma.$transaction(
        userTotals.map((u) =>
          this.prisma.user.update({
            where: { id: u.userId },
            data: {
              bolaoPoints: u.totalPoints,
              cravadas: Number(u.cravadas),
            },
          }),
        ),
      );
    }

    // Usuários afetados que não têm mais nenhum ponto (zeraram tudo) precisam ser zerados
    const usersWithPoints = new Set(userTotals.map((u) => u.userId));
    const usersToZero = affectedUserIds.filter((id) => !usersWithPoints.has(id));
    if (usersToZero.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: usersToZero } },
        data: { bolaoPoints: 0, cravadas: 0 },
      });
    }

    this.gateway.emitRankingUpdated();
  }
}
