import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsSendService } from './notifications-send.service';

// Regras padrão — semeadas UMA vez (só se a tabela estiver vazia), pra que
// apagar/editar depois seja permanente. hour = hora local; condition define
// a lógica especial (senão é diária no horário).
const DEFAULT_RULES = [
  {
    key: 'LITURGY_MORNING',
    title: 'A liturgia de hoje já está no ar ✝️',
    body: 'Comece o dia com a Palavra: leia as leituras da Missa de hoje.',
    url: '/oratio/liturgia-completa',
    hour: 7,
    condition: null as string | null,
  },
  {
    key: 'ANGELUS_MIDDAY',
    title: 'É meio-dia — reze o Angelus 🔔',
    body: '"O Anjo do Senhor anunciou a Maria, e ela concebeu do Espírito Santo…"',
    url: '/oratio/prayers',
    hour: 12,
    condition: null as string | null,
  },
  {
    key: 'ROSARY_UNFINISHED',
    title: 'Volte para terminar seu Terço 📿',
    body: 'Você começou um terço e não terminou. Que tal concluir agora?',
    url: '/oratio/rosary',
    hour: 18,
    condition: 'ROSARY_UNFINISHED' as string | null,
  },
  {
    key: 'STREAK_AT_RISK',
    title: 'Não perca sua sequência 🔥',
    body: 'Você está com {count} dias seguidos de oração. Reze hoje para manter!',
    url: '/oratio/home',
    hour: 20,
    condition: 'STREAK_AT_RISK' as string | null,
  },
];

type RuleRow = {
  key: string;
  title: string;
  body: string | null;
  url: string | null;
  hour: number | null;
  condition: string | null;
};

@Injectable()
export class NotificationsScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private send: NotificationsSendService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.notificationRule.count().catch(() => 1);
    if (count > 0) return; // já semeado (ou o admin já mexeu) → não recria
    for (const r of DEFAULT_RULES) {
      await this.prisma.notificationRule.create({ data: r }).catch(() => {});
    }
  }

  private nowInZone(tz: string): { hours: number; dateStr: string } {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(now);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
      return {
        hours: parseInt(get('hour')) % 24,
        dateStr: `${get('year')}-${get('month')}-${get('day')}`,
      };
    } catch {
      return { hours: now.getUTCHours(), dateStr: now.toISOString().slice(0, 10) };
    }
  }

  private dateInZone(d: Date, tz: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }

  // Roda a cada 10 min. As automáticas só vão pra quem ATIVOU push,
  // respeitando fuso de cada aparelho, quiet hours (22h–7h) e dedupe diário.
  @Cron('*/10 * * * *')
  async tick() {
    const rules = (await this.prisma.notificationRule.findMany({
      where: { enabled: true },
    })) as RuleRow[];
    if (rules.length === 0) return;

    const subs = await this.prisma.pushSubscription.findMany({
      select: { userId: true, timezone: true },
      distinct: ['userId'],
    });

    for (const sub of subs) {
      try {
        const tz = sub.timezone || 'UTC';
        const { hours } = this.nowInZone(tz);
        if (hours < 7 || hours >= 22) continue; // quiet hours

        for (const rule of rules) {
          if (rule.hour == null || rule.hour !== hours) continue; // só na hora marcada

          if (rule.condition === 'ROSARY_UNFINISHED') {
            if (await this.rosaryUnfinished(sub.userId)) await this.fire(sub.userId, rule);
          } else if (rule.condition === 'STREAK_AT_RISK') {
            const streak = await this.streakAtRisk(sub.userId, tz);
            if (streak >= 2) await this.fire(sub.userId, rule, streak);
          } else {
            await this.fire(sub.userId, rule); // diária no horário
          }
        }
      } catch (e: any) {
        this.logger.error(`regra falhou p/ ${sub.userId}: ${e?.message}`);
      }
    }
  }

  private async fire(userId: string, rule: RuleRow, count?: number) {
    // dedupe: já mandou essa regra pra essa pessoa nas últimas ~20h?
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const dup = await this.prisma.notification.findFirst({
      where: { userId, ruleKey: rule.key, createdAt: { gte: since } },
      select: { id: true },
    });
    if (dup) return;

    let body = rule.body ?? undefined;
    if (count != null && body) body = body.replace('{count}', String(count));

    await this.send.deliverToUser(userId, {
      title: rule.title,
      body,
      url: rule.url ?? undefined,
      source: 'RULE',
      ruleKey: rule.key,
    });
  }

  private async rosaryUnfinished(userId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unfinished = await this.prisma.rosarySession.findFirst({
      where: { userId, completed: false, startedAt: { lt: cutoff } },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });
    if (!unfinished) return false;
    const done = await this.prisma.rosarySession.findFirst({
      where: { userId, completed: true, finishedAt: { gte: unfinished.startedAt } },
      select: { id: true },
    });
    return !done;
  }

  private async streakAtRisk(userId: string, tz: string): Promise<number> {
    const s = await this.prisma.spiritualStats.findUnique({
      where: { userId },
      select: { prayerStreak: true, lastPrayerDate: true },
    });
    if (!s || (s.prayerStreak ?? 0) < 2 || !s.lastPrayerDate) return 0;
    const today = this.nowInZone(tz).dateStr;
    const last = this.dateInZone(s.lastPrayerDate, tz);
    return last !== today ? s.prayerStreak : 0;
  }
}
