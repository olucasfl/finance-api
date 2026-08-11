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
}
