import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushService } from './push.service';

const RETENTION_DAYS = 15;

type DeliverInput = {
  title: string;
  body?: string;
  url?: string;
  source?: 'CAMPAIGN' | 'RULE';
  ruleKey?: string;
  campaignId?: string;
};

@Injectable()
export class NotificationsSendService {
  private readonly logger = new Logger(NotificationsSendService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}

  private expiryDate(): Date {
    return new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  }

  /*
  Entrega a UM usuário: cria o item no sino e, se a pessoa tiver push
  ativo, manda também pra fora. Reutilizado pelas regras automáticas.
  */
  async deliverToUser(userId: string, n: DeliverInput): Promise<{ pushed: boolean }> {
    const expiresAt = this.expiryDate();

    const { sent } = await this.push.sendToUser(userId, {
      title: n.title,
      body: n.body,
      url: n.url,
    });

    await this.prisma.notification.create({
      data: {
        userId,
        title: n.title,
        body: n.body ?? null,
        url: n.url ?? null,
        source: n.source ?? 'CAMPAIGN',
        ruleKey: n.ruleKey ?? null,
        campaignId: n.campaignId ?? null,
        pushSent: sent > 0,
        expiresAt,
      },
    });

    return { pushed: sent > 0 };
  }

  /*
  Envio do admin: cria a campanha, gera 1 item de sino por usuário-alvo
  e dispara push pra quem tiver inscrição. "ALL" = todos; "SPECIFIC" =
  lista de userIds.
  */
  async createCampaign(input: {
    title: string;
    body?: string;
    url?: string;
    audience: 'ALL' | 'SPECIFIC';
    userIds?: string[];
    createdBy?: string;
  }) {
    const expiresAt = this.expiryDate();

    let targetIds: string[];
    if (input.audience === 'SPECIFIC') {
      targetIds = [...new Set(input.userIds ?? [])];
    } else {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      targetIds = users.map((u) => u.id);
    }

    const campaign = await this.prisma.notificationCampaign.create({
      data: {
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
        audience: input.audience,
        createdBy: input.createdBy ?? null,
        expiresAt,
        targeted: targetIds.length,
      },
    });

    if (targetIds.length === 0) return campaign;

    // Itens do sino em lote (todos os alvos recebem, dentro do app)
    await this.prisma.notification.createMany({
      data: targetIds.map((userId) => ({
        userId,
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
        source: 'CAMPAIGN' as const,
        campaignId: campaign.id,
        expiresAt,
      })),
    });

    // Push (fora do app) só pra quem tem inscrição
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: targetIds } },
    });

    const { sent, failed } = await this.push.sendToSubs(subs, {
      title: input.title,
      body: input.body,
      url: input.url,
    });

    const pushedUserIds = [...new Set(subs.map((s) => s.userId))];
    if (pushedUserIds.length > 0) {
      await this.prisma.notification.updateMany({
        where: { campaignId: campaign.id, userId: { in: pushedUserIds } },
        data: { pushSent: true },
      });
    }

    return this.prisma.notificationCampaign.update({
      where: { id: campaign.id },
      data: { pushSent: sent, pushFailed: failed },
    });
  }

  // Campanhas ativas (últimos 15 dias) — pro painel admin
  async listCampaigns() {
    return this.prisma.notificationCampaign.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async subscribersCount() {
    const [totalUsers, subs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] }),
    ]);
    return { totalUsers, subscribedUsers: subs.length };
  }

  // Limpeza diária: apaga notificações e campanhas vencidas (15 dias)
  @Cron('15 0 * * *', { timeZone: 'America/Sao_Paulo' })
  async cleanupExpired() {
    const now = new Date();
    const n = await this.prisma.notification.deleteMany({ where: { expiresAt: { lt: now } } });
    const c = await this.prisma.notificationCampaign.deleteMany({ where: { expiresAt: { lt: now } } });
    if (n.count || c.count) {
      this.logger.log(`[cleanup] ${n.count} notificações e ${c.count} campanhas vencidas removidas`);
    }
  }
}
