import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsSendService } from './notifications-send.service';

const DAY = 24 * 60 * 60 * 1000;

// Catálogo fixo de regras — semeadas por `key`. QUANDO/PRA QUEM é código
// (o `condition`); o texto/hora são editáveis no admin. Regras fora deste
// catálogo são removidas no boot (ex.: liturgia/Angelus antigas).
const DEFAULT_RULES = [
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
  {
    key: 'BIBLE_RESUME',
    title: 'Continue sua leitura 📖',
    body: 'Você parou em {label}. Retome de onde ficou.',
    url: '/oratio/biblia',
    hour: 9,
    condition: 'BIBLE_RESUME' as string | null,
  },
  {
    key: 'CATECHISM_RESUME',
    title: 'Retome o Catecismo 📘',
    body: 'Você parou em {label}. Continue seu estudo.',
    url: '/oratio/catecismo',
    hour: 9,
    condition: 'CATECHISM_RESUME' as string | null,
  },
  {
    key: 'ROSARY_LAPSE',
    title: 'Faz um tempo desde seu último Terço 📿',
    body: 'Que tal reservar alguns minutos para rezar hoje?',
    url: '/oratio/rosary',
    hour: 17,
    condition: 'ROSARY_LAPSE' as string | null,
  },
  {
    key: 'COMEBACK',
    title: 'Sentimos sua falta 🙏',
    body: 'Que tal um momento de oração hoje? Estamos aqui por você.',
    url: '/oratio/home',
    hour: 10,
    condition: 'COMEBACK' as string | null,
  },
  {
    key: 'SUNDAY_MASS',
    title: 'É domingo, dia do Senhor ✝️',
    body: 'Prepare o coração para a Santa Missa e as leituras de hoje.',
    url: '/oratio/liturgia-completa',
    hour: 8,
    condition: 'SUNDAY' as string | null,
  },
  {
    key: 'VOX_INTRO',
    title: 'Uma dúvida de fé? ✨',
    body: 'Converse com o VoxAI, seu assistente espiritual católico.',
    url: '/oratio/vox',
    hour: 11,
    condition: 'VOX_INTRO' as string | null,
  },
  {
    key: 'EXAMEN_NIGHT',
    title: 'Antes de dormir 🌙',
    body: 'Examine o seu dia com Deus — o que agradecer e o que confiar a Ele.',
    url: '/oratio/home',
    hour: 21,
    condition: null as string | null,
  },
];

// Prioridade (urgência) e cooldown (dias mínimos até repetir a MESMA regra
// pra mesma pessoa). priority >= URGENT_THRESHOLD = urgente (passa na frente
// e não gasta a cota de "convite" do dia).
const RULE_META: Record<string, { priority: number; cooldownDays: number }> = {
  STREAK_AT_RISK:   { priority: 90, cooldownDays: 2 },
  ROSARY_UNFINISHED:{ priority: 85, cooldownDays: 2 },
  COMEBACK:         { priority: 70, cooldownDays: 7 },
  SUNDAY_MASS:      { priority: 65, cooldownDays: 7 },
  ROSARY_LAPSE:     { priority: 60, cooldownDays: 7 },
  BIBLE_RESUME:     { priority: 55, cooldownDays: 3 },
  CATECHISM_RESUME: { priority: 55, cooldownDays: 4 },
  VOX_INTRO:        { priority: 45, cooldownDays: 30 },
  EXAMEN_NIGHT:     { priority: 40, cooldownDays: 3 },
};

type RuleRow = {
  key: string;
  title: string;
  body: string | null;
  url: string | null;
  hour: number | null;
  condition: string | null;
};

// null = condição não bateu (não envia). Objeto = envia, opcionalmente com
// `url` dinâmica e `vars` pra interpolar no corpo ({label}, {count}, …).
type FireCtx = { url?: string; vars?: Record<string, string> } | null;

@Injectable()
export class NotificationsScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationsScheduler.name);

  private readonly QUIET_END = 7;            // não incomodar antes disso (hora local)
  private readonly QUIET_START = 22;         // nem a partir disso
  private readonly MAX_PER_DAY = 2;          // teto de automáticas por pessoa por dia
  private readonly MAX_NUDGES_PER_DAY = 1;   // teto de "convites" (não-urgentes) por dia
  private readonly URGENT_THRESHOLD = 80;    // priority >= isso = urgente
  private readonly SPACING_MS = 6 * 60 * 60 * 1000; // 6h entre duas automáticas
  private readonly HISTORY_DAYS = 35;        // janela pra olhar o histórico recente

  constructor(
    private prisma: PrismaService,
    private send: NotificationsSendService,
  ) {}

  // Reconcilia o catálogo: cria as regras que faltam (sem sobrescrever o que
  // o admin editou) e remove as que saíram do catálogo (liturgia/Angelus).
  async onModuleInit() {
    const keys = DEFAULT_RULES.map((r) => r.key);

    for (const r of DEFAULT_RULES) {
      const exists = await this.prisma.notificationRule
        .findUnique({ where: { key: r.key } })
        .catch(() => null);
      if (!exists) {
        await this.prisma.notificationRule.create({ data: r }).catch(() => {});
      }
    }

    await this.prisma.notificationRule
      .deleteMany({ where: { key: { notIn: keys } } })
      .catch(() => {});
  }

  /*
  true se `hours` (hora local) está na janela de disparo da regra: da hora
  marcada em diante (fica "na fila" o dia todo até um slot liberar), sempre
  fora do quiet hours. Pública para teste unitário.
  */
  shouldFireAtHour(hours: number, ruleHour: number): boolean {
    if (hours < this.QUIET_END || hours >= this.QUIET_START) return false;
    return hours >= ruleHour;
  }

  private priority(key: string): number {
    return RULE_META[key]?.priority ?? 50;
  }

  private isUrgent(key: string): boolean {
    return this.priority(key) >= this.URGENT_THRESHOLD;
  }

  private cooldownOk(lastAt: number | undefined, key: string, now: number): boolean {
    if (lastAt == null) return true;
    const days = RULE_META[key]?.cooldownDays ?? 3;
    return now - lastAt >= days * DAY;
  }

  private nowInZone(tz: string): { hours: number; dateStr: string; weekday: string } {
    const now = new Date();
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
      }).formatToParts(now);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
      return {
        hours: parseInt(get('hour')) % 24,
        dateStr: `${get('year')}-${get('month')}-${get('day')}`,
        weekday: get('weekday'),
      };
    } catch {
      return { hours: now.getUTCHours(), dateStr: now.toISOString().slice(0, 10), weekday: '' };
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

  /*
  Roda a cada 10 min. Fila anti-spam por usuário:
  - só quem ativou push, fora do quiet hours;
  - no máximo MAX_PER_DAY por dia, com >= 6h entre elas;
  - no máximo MAX_NUDGES_PER_DAY "convites" — o resto do teto fica reservado
    pras urgentes (elas passam na frente);
  - cada regra tem cooldown (não repete em dias seguidos);
  - ordem: prioridade (urgência) e, entre iguais, quem espera há mais tempo.
  Dispara no máximo UMA por tick.
  */
  @Cron('*/10 * * * *')
  async tick() {
    const rules = (await this.prisma.notificationRule.findMany({
      where: { enabled: true },
    })) as RuleRow[];
    if (rules.length === 0) return;

    // um fuso por usuário (o do primeiro aparelho encontrado)
    const subs = await this.prisma.pushSubscription.findMany({
      select: { userId: true, timezone: true },
    });
    const tzByUser = new Map<string, string>();
    for (const s of subs) {
      if (!tzByUser.has(s.userId)) tzByUser.set(s.userId, s.timezone || 'UTC');
    }

    const now = Date.now();

    for (const [userId, tz] of tzByUser) {
      try {
        const { hours, dateStr: todayStr } = this.nowInZone(tz);
        if (hours < this.QUIET_END || hours >= this.QUIET_START) continue; // quiet hours

        const hist = await this.prisma.notification.findMany({
          where: {
            userId,
            source: 'RULE',
            createdAt: { gte: new Date(now - this.HISTORY_DAYS * DAY) },
          },
          select: { createdAt: true, ruleKey: true },
          orderBy: { createdAt: 'desc' },
        });

        const sentToday = hist.filter((n) => this.dateInZone(n.createdAt, tz) === todayStr);
        if (sentToday.length >= this.MAX_PER_DAY) continue; // teto do dia

        const lastAt = hist[0]?.createdAt?.getTime();
        if (lastAt && now - lastAt < this.SPACING_MS) continue; // espaçamento 6h

        const nudgesToday = sentToday.filter(
          (n) => !n.ruleKey || !this.isUrgent(n.ruleKey),
        ).length;

        // última vez de cada regra (cooldown + justiça)
        const lastByRule = new Map<string, number>();
        for (const n of hist) {
          if (n.ruleKey && !lastByRule.has(n.ruleKey)) {
            lastByRule.set(n.ruleKey, n.createdAt.getTime());
          }
        }

        // candidatas: hora chegou + cooldown ok
        const candidates = rules.filter(
          (r) =>
            r.hour != null &&
            this.shouldFireAtHour(hours, r.hour) &&
            this.cooldownOk(lastByRule.get(r.key), r.key, now),
        );
        if (candidates.length === 0) continue;

        // ordena: prioridade DESC; empate → quem espera há mais tempo primeiro
        candidates.sort((a, b) => {
          const pa = this.priority(a.key);
          const pb = this.priority(b.key);
          if (pa !== pb) return pb - pa;
          return (lastByRule.get(a.key) ?? 0) - (lastByRule.get(b.key) ?? 0);
        });

        // dispara a primeira permitida cuja condição bate
        for (const rule of candidates) {
          // convite (não-urgente) só se ainda houver cota de convite no dia
          if (!this.isUrgent(rule.key) && nudgesToday >= this.MAX_NUDGES_PER_DAY) {
            continue;
          }
          if (await this.tryFire(userId, rule, tz)) break;
        }
      } catch (e: any) {
        this.logger.error(`regra falhou p/ ${userId}: ${e?.message}`);
      }
    }
  }

  // Avalia a condição e, se bater, entrega. Retorna se disparou.
  private async tryFire(userId: string, rule: RuleRow, tz: string): Promise<boolean> {
    const ctx = await this.evalCondition(userId, rule.condition, tz);
    if (!ctx) return false;
    await this.deliver(userId, rule, ctx);
    return true;
  }

  private async evalCondition(userId: string, cond: string | null, tz: string): Promise<FireCtx> {
    switch (cond) {
      case 'ROSARY_UNFINISHED':
        return (await this.rosaryUnfinished(userId)) ? {} : null;
      case 'STREAK_AT_RISK': {
        const s = await this.streakAtRisk(userId, tz);
        return s >= 2 ? { vars: { count: String(s) } } : null;
      }
      case 'BIBLE_RESUME':
        return this.readingResume(userId, 'BIBLE', 3);
      case 'CATECHISM_RESUME':
        return this.readingResume(userId, 'CATECHISM', 4);
      case 'ROSARY_LAPSE':
        return (await this.rosaryLapse(userId)) ? {} : null;
      case 'COMEBACK':
        return (await this.comeback(userId)) ? {} : null;
      case 'SUNDAY':
        return this.nowInZone(tz).weekday === 'Sun' ? {} : null;
      case 'VOX_INTRO':
        return (await this.voxIntro(userId)) ? {} : null;
      default:
        return {}; // sem condição (ex.: EXAMEN) — elegível quando a hora chega
    }
  }

  private async deliver(userId: string, rule: RuleRow, ctx: NonNullable<FireCtx>) {
    let body = rule.body ?? undefined;
    if (body && ctx.vars) {
      for (const [k, v] of Object.entries(ctx.vars)) {
        body = body.split(`{${k}}`).join(v);
      }
    }

    await this.send.deliverToUser(userId, {
      title: rule.title,
      body,
      url: ctx.url ?? rule.url ?? undefined,
      source: 'RULE',
      ruleKey: rule.key,
    });
  }

  /* ===== Condições ===== */

  private async rosaryUnfinished(userId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - DAY);
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

  // Leitura (Bíblia/Catecismo) parada há >= minDays: convida a retomar.
  private async readingResume(
    userId: string,
    kind: 'BIBLE' | 'CATECHISM',
    minDays: number,
  ): Promise<FireCtx> {
    const r = await this.prisma.readingProgress.findFirst({
      where: { userId, kind: kind as any },
      select: { reference: true, label: true, updatedAt: true },
    });
    if (!r) return null;
    const days = (Date.now() - r.updatedAt.getTime()) / DAY;
    if (days < minDays) return null;

    const url =
      kind === 'BIBLE'
        ? `/oratio/biblia/${r.reference}`
        : `/oratio/catecismo?page=${r.reference}`;
    return { url, vars: { label: r.label } };
  }

  // Já rezava terço, mas nenhum concluído há >= 7 dias.
  private async rosaryLapse(userId: string): Promise<boolean> {
    const stats = await this.prisma.spiritualStats.findUnique({
      where: { userId },
      select: { rosariesPrayed: true },
    });
    if (!stats || (stats.rosariesPrayed ?? 0) === 0) return false;
    const lastDone = await this.prisma.rosarySession.findFirst({
      where: { userId, completed: true },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true },
    });
    const lastAt = lastDone?.finishedAt?.getTime() ?? 0;
    return (Date.now() - lastAt) / DAY >= 7;
  }

  // Sem abrir o app há 3–14 dias (janela de reengajamento; depois disso, para).
  private async comeback(userId: string): Promise<boolean> {
    const s = await this.prisma.spiritualStats.findUnique({
      where: { userId },
      select: { lastLoginDate: true },
    });
    if (!s?.lastLoginDate) return false;
    const days = (Date.now() - s.lastLoginDate.getTime()) / DAY;
    return days >= 3 && days <= 14;
  }

  // Nunca usou o VoxAI e a conta já tem alguns dias.
  private async voxIntro(userId: string): Promise<boolean> {
    const conv = await this.prisma.conversation.findFirst({
      where: { userId, hasMessages: true },
      select: { id: true },
    });
    if (conv) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) return false;
    return (Date.now() - user.createdAt.getTime()) / DAY >= 3;
  }
}
