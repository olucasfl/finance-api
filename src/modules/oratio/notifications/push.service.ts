import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from 'src/prisma/prisma.service';

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
};

/*
Wrapper do Web Push (VAPID). Mantém a mesma ideia do projeto weekly:
envia via `web-push`, e quando o navegador responde 410/404 (inscrição
morta) apaga a linha do banco pra não seguir tentando mandar pra um
endpoint que não existe mais.
*/
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'mailto:dev@oratio.app';

    if (!pub || !priv) {
      this.logger.warn('VAPID keys ausentes — push desativado');
      return;
    }

    webpush.setVapidDetails(email, pub, priv);
    this.enabled = true;
    this.logger.log('Web Push habilitado');
  }

  get publicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || '';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendToSubs(
    subs: { endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    if (!this.enabled || subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    const body = JSON.stringify(payload);

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
          sent++;
        } catch (err: any) {
          failed++;
          this.logger.error(`send falhou: ${err?.message}`);
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.prisma.pushSubscription
              .deleteMany({ where: { endpoint: sub.endpoint } })
              .catch(() => {});
          }
        }
      }),
    );

    return { sent, failed };
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    return this.sendToSubs(subs, payload);
  }
}
