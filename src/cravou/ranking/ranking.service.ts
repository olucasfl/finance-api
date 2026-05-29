import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const EXACT_POINTS = [10, 15];

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

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

    const totals = new Map<string, number>();
    const cravas = new Map<string, number>();
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

  async getGroupRanking(groupId: string, userId: string) {
    const group = await this.prisma.cravouGroup.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Grupo não encontrado');

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Você não faz parte deste grupo');

    const memberUserIds = group.members.map((m) => m.userId);

    const [users, predictions] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.cravouPrediction.findMany({
        where: {
          userId: { in: memberUserIds },
          points: { not: null },
          ...(group.brazilOnly ? { match: { OR: [{ homeTeam: { equals: 'brasil', mode: 'insensitive' as const } }, { awayTeam: { equals: 'brasil', mode: 'insensitive' as const } }] } } : {}),
        },
        select: { userId: true, points: true },
      }),
    ]);

    const totals = new Map<string, number>();
    const cravas = new Map<string, number>();
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
}
