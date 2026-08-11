import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string; timezone?: string },
  ) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        timezone: data.timezone ?? 'UTC',
      },
      update: {
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
        timezone: data.timezone ?? 'UTC',
      },
    });

    // Um aparelho só tem uma inscrição viva por vez. Quando o navegador
    // rotaciona o endpoint (limpou dados do site, re-adicionou o PWA), as
    // linhas antigas deste usuário estão mortas — apaga pra não mandar a
    // mesma notificação duas vezes pro mesmo aparelho.
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: { not: data.endpoint } },
    });

    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  async updateTimezone(userId: string, timezone: string) {
    await this.prisma.pushSubscription.updateMany({ where: { userId }, data: { timezone } });
    return { ok: true };
  }

  async status(userId: string) {
    const count = await this.prisma.pushSubscription.count({ where: { userId } });
    return { enabled: count > 0 };
  }

  /* ===== Sino / caixa de entrada ===== */

  // Lista paginada (10 por vez), só as ainda válidas (não expiradas).
  async getInbox(userId: string, cursor?: string, limit = 10) {
    const take = Math.min(Math.max(limit, 1), 30);

    const rows = await this.prisma.notification.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        createdAt: true,
        seenAt: true,
        source: true,
      },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      nextCursor = rows.pop()!.id;
    }

    return { items: rows, nextCursor };
  }

  // Badge do sino: quantas não-vistas e ainda válidas.
  async unseenCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, seenAt: null, expiresAt: { gt: new Date() } },
    });
    return { count };
  }

  async markSeen(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, seenAt: null },
      data: { seenAt: new Date() },
    });
    return { ok: true };
  }

  async markAllSeen(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, seenAt: null },
      data: { seenAt: new Date() },
    });
    return { ok: true };
  }
}
