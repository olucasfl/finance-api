import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushService } from './push.service';

export const RETENTION_DAYS = 7;

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
      const ids = [...new Set(input.userIds ?? [])];
      // Só quem existe de fato — um userId inválido derrubava o envio
      // inteiro (FK no createMany). Filtra antes.
      const existing = ids.length
        ? await this.prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          })
        : [];
      targetIds = existing.map((u) => u.id);
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

    // Entrega em segundo plano, em lotes — a request do admin volta na
    // hora (não trava com base grande). Os contadores pushSent/pushFailed
    // vão sendo atualizados na própria campanha conforme a entrega termina.
    if (targetIds.length > 0) {
      void this.deliverCampaign(campaign.id, targetIds, {
        title: input.title,
        body: input.body,
        url: input.url,
        expiresAt,
      }).catch((e) =>
        this.logger.error(`entrega da campanha ${campaign.id} falhou: ${e?.message}`),
      );
    }

    return campaign;
  }

  private readonly CHUNK = 500;

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // Cria os itens do sino, dispara os pushes e atualiza os contadores —
  // tudo em lotes de CHUNK, pra nunca fazer uma query/rajada gigante.
  private async deliverCampaign(
    campaignId: string,
    targetIds: string[],
    n: { title: string; body?: string; url?: string; expiresAt: Date },
  ) {
    // 1) itens do sino (todos os alvos, dentro do app)
    for (const part of this.chunk(targetIds, this.CHUNK)) {
      await this.prisma.notification.createMany({
        data: part.map((userId) => ({
          userId,
          title: n.title,
          body: n.body ?? null,
          url: n.url ?? null,
          source: 'CAMPAIGN' as const,
          campaignId,
          expiresAt: n.expiresAt,
        })),
      });
    }

    // 2) push (fora do app) só pra quem tem inscrição, agregando contadores
    let sent = 0;
    let failed = 0;
    const pushedUserIds = new Set<string>();

    for (const part of this.chunk(targetIds, this.CHUNK)) {
      const subs = await this.prisma.pushSubscription.findMany({
        where: { userId: { in: part } },
      });
      if (subs.length === 0) continue;

      const r = await this.push.sendToSubs(subs, {
        title: n.title,
        body: n.body,
        url: n.url,
      });
      sent += r.sent;
      failed += r.failed;
      subs.forEach((s) => pushedUserIds.add(s.userId));
    }

    // 3) marca pushSent nos itens de quem recebeu
    for (const part of this.chunk([...pushedUserIds], this.CHUNK)) {
      await this.prisma.notification.updateMany({
        where: { campaignId, userId: { in: part } },
        data: { pushSent: true },
      });
    }

    // 4) contadores finais na campanha
    await this.prisma.notificationCampaign
      .update({
        where: { id: campaignId },
        data: { pushSent: sent, pushFailed: failed },
      })
      .catch(() => {});
  }

  // Todos os envios criados (mais recentes primeiro) — pro painel admin.
  // Sem filtro de expiração: o admin vê tudo o que ainda existe na tabela.
  async listCampaigns() {
    return this.prisma.notificationCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Apaga TODOS os envios do admin de uma vez — cada um some também do
  // sino de quem recebeu (itens de campanha). Não mexe nas automáticas.
  async deleteAllCampaigns() {
    await this.prisma.notification.deleteMany({ where: { source: 'CAMPAIGN' } });
    await this.prisma.notificationCampaign.deleteMany({});
    return { ok: true };
  }

  async subscribersCount() {
    const [totalUsers, subs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] }),
    ]);
    return { totalUsers, subscribedUsers: subs.length };
  }

  /* ===== Regras automáticas (admin) ===== */

  listRules() {
    return this.prisma.notificationRule.findMany({ orderBy: { key: 'asc' } });
  }

  updateRule(
    key: string,
    data: { enabled?: boolean; title?: string; body?: string | null; url?: string | null; hour?: number | null },
  ) {
    return this.prisma.notificationRule.update({
      where: { key },
      data: {
        enabled: data.enabled,
        title: data.title,
        body: data.body,
        url: data.url,
        hour: data.hour,
      },
    });
  }

  createRule(data: { title: string; body?: string; url?: string; hour?: number; condition?: string }) {
    return this.prisma.notificationRule.create({
      data: {
        title: data.title,
        body: data.body ?? null,
        url: data.url ?? null,
        hour: data.hour ?? null,
        condition: data.condition ?? null,
      },
    });
  }

  deleteRule(key: string) {
    return this.prisma.notificationRule.delete({ where: { key } });
  }

  // Apaga um envio: some do sino de todos que receberam + remove a campanha
  async deleteCampaign(id: string) {
    await this.prisma.notification.deleteMany({ where: { campaignId: id } });
    await this.prisma.notificationCampaign.delete({ where: { id } }).catch(() => {});
    return { ok: true };
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
