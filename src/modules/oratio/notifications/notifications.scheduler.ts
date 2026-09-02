import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsSendService } from './notifications-send.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettingsService,
} from './notification-settings.service';
import {
  ActiveBand,
  UserNotificationProfileService,
} from './user-notification-profile.service';
import { NotificationVariantsService } from './notification-variants.service';
import { NotificationContextService } from './notification-context.service';

const DAY = 24 * 60 * 60 * 1000;

// Catálogo fixo de regras — semeadas por `key`. QUANDO/PRA QUEM é código
// (o `condition`); o texto/hora são editáveis no admin. Regras fora deste
// catálogo são removidas no boot (ex.: liturgia/Angelus antigas).
// `thresholdDays`/`band` são os valores-semente dos knobs da Fase 2: o
// `onModuleInit` preenche as regras que ainda estão com `null` (sem tocar
// no que o admin editou). `thresholdDays: null` = a condição não usa
// janela de "parado há N dias". `band` é a faixa de horário preferida.
const DEFAULT_RULES = [
  {
    key: 'ROSARY_UNFINISHED',
    title: 'Volte para terminar seu Terço 📿',
    body: 'Você começou um terço e não terminou. Que tal concluir agora?',
    url: '/oratio/rosary',
    hour: 18,
    condition: 'ROSARY_UNFINISHED' as string | null,
    thresholdDays: null as number | null,
    band: 'AFTERNOON' as string | null,
  },
  {
    key: 'STREAK_AT_RISK',
    title: 'Não perca sua sequência 🔥',
    body: 'Você está com {count} dias seguidos de oração. Reze hoje para manter!',
    url: null as string | null, // basta abrir o app — sem redirecionamento
    hour: 20,
    condition: 'STREAK_AT_RISK' as string | null,
    thresholdDays: null as number | null,
    band: 'EVENING' as string | null,
  },
  {
    key: 'BIBLE_RESUME',
    title: 'Continue sua leitura 📖',
    body: 'Você parou em {label}. Retome de onde ficou.',
    url: '/oratio/biblia',
    hour: 9,
    condition: 'BIBLE_RESUME' as string | null,
    thresholdDays: 3 as number | null,
    band: 'MORNING' as string | null,
  },
  {
    key: 'CATECHISM_RESUME',
    title: 'Retome o Catecismo 📘',
    body: 'Você parou em {label}. Continue seu estudo.',
    url: '/oratio/catecismo',
    hour: 9,
    condition: 'CATECHISM_RESUME' as string | null,
    thresholdDays: 4 as number | null,
    band: 'MORNING' as string | null,
  },
  {
    key: 'ROSARY_LAPSE',
    title: 'Faz um tempo desde seu último Terço 📿',
    body: 'Que tal reservar alguns minutos para rezar hoje?',
    url: '/oratio/rosary',
    hour: 17,
    condition: 'ROSARY_LAPSE' as string | null,
    thresholdDays: 7 as number | null,
    band: 'AFTERNOON' as string | null,
  },
  {
    key: 'COMEBACK',
    title: 'Sentimos sua falta 🙏',
    body: 'Que tal um momento de oração hoje? Estamos aqui por você.',
    url: null as string | null, // basta abrir o app — sem redirecionamento
    hour: 10,
    condition: 'COMEBACK' as string | null,
    thresholdDays: 3 as number | null,
    band: 'MORNING' as string | null,
  },
  {
    key: 'SUNDAY_MASS',
    title: 'É domingo, dia do Senhor ✝️',
    body: 'Prepare o coração para a Santa Missa e as leituras de hoje.',
    url: '/oratio/liturgia-completa',
    hour: 8,
    condition: 'SUNDAY' as string | null,
    thresholdDays: null as number | null,
    band: 'MORNING' as string | null,
  },
  {
    key: 'VOX_INTRO',
    title: 'Uma dúvida de fé? ✨',
    body: 'Converse com o VoxAI, seu assistente espiritual católico.',
    url: '/oratio/vox',
    hour: 11,
    condition: 'VOX_INTRO' as string | null,
    thresholdDays: null as number | null,
    band: 'MORNING' as string | null,
  },
  {
    key: 'EXAMEN_NIGHT',
    title: 'Antes de dormir 🌙',
    body: 'Examine o seu dia com Deus — o que agradecer e o que confiar a Ele.',
    url: '/oratio/confissao',
    hour: 21,
    condition: null as string | null,
    thresholdDays: null as number | null,
    band: 'EVENING' as string | null,
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
  thresholdDays: number | null;
  band: string | null;
};

// null = condição não bateu (não envia). Objeto = envia, opcionalmente com
// `url` dinâmica e `vars` pra interpolar no corpo ({label}, {count}, …).
type FireCtx = { url?: string; vars?: Record<string, string> } | null;

@Injectable()
export class NotificationsScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationsScheduler.name);

  // Os parâmetros do funil (quiet hours, tetos, espaçamento, limiar de
  // urgência, rest gap) agora vêm de `NotificationSettings` via
  // `NotificationSettingsService` — editáveis no admin sem deploy. Os
  // defaults do serviço reproduzem os valores que eram constantes aqui.
  private readonly HISTORY_DAYS = 35;        // janela pra olhar o histórico recente

  constructor(
    private prisma: PrismaService,
    private send: NotificationsSendService,
    private settings: NotificationSettingsService,
    private profiles: UserNotificationProfileService,
    private variants: NotificationVariantsService,
    private context: NotificationContextService,
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
        continue;
      }
      // Correção de destino: regras antigas caíam no próprio Home (não
      // levavam a lugar nenhum, já que o sino fica na Home). Aponta pro
      // destino útil do catálogo. Só toca no valor errado — não sobrescreve
      // um link que o admin tenha definido de propósito.
      if (exists.url === '/oratio/home' && r.url !== '/oratio/home') {
        await this.prisma.notificationRule
          .update({ where: { key: r.key }, data: { url: r.url } })
          .catch(() => {});
      }

      // Backfill dos knobs da Fase 2: preenche `band`/`thresholdDays` só
      // quando a regra ainda está com `null` (banco que existia antes das
      // colunas). Nunca reescreve um valor que o admin já definiu.
      const backfill: { band?: string | null; thresholdDays?: number | null } = {};
      if (exists.band == null && r.band != null) backfill.band = r.band;
      if (exists.thresholdDays == null && r.thresholdDays != null) {
        backfill.thresholdDays = r.thresholdDays;
      }
      if (Object.keys(backfill).length > 0) {
        await this.prisma.notificationRule
          .update({ where: { key: r.key }, data: backfill })
          .catch(() => {});
      }
    }

    await this.prisma.notificationRule
      .deleteMany({ where: { key: { notIn: keys } } })
      .catch(() => {});

    // Depois de o catálogo estar reconciliado: garante 1 variante de texto
    // por regra (Fase 4). Idempotente.
    await this.variants.seedMissing().catch(() => {});
  }

  /*
  true se `hours` (hora local) está na janela de disparo da regra: da hora
  marcada em diante (fica "na fila" o dia todo até um slot liberar), sempre
  fora do quiet hours. Pública para teste unitário.
  */
  shouldFireAtHour(
    hours: number,
    ruleHour: number,
    quietEnd: number = DEFAULT_NOTIFICATION_SETTINGS.quietEnd,
    quietStart: number = DEFAULT_NOTIFICATION_SETTINGS.quietStart,
  ): boolean {
    if (hours < quietEnd || hours >= quietStart) return false;
    return hours >= ruleHour;
  }

  /*
  A faixa do usuário casa com a da regra? `ANY` de qualquer lado (ou
  regra sem `band` definida) sempre casa — aí vale só a hora, como antes.
  */
  bandMatches(userBand: ActiveBand, ruleBand: string | null): boolean {
    if (!ruleBand || ruleBand === 'ANY' || userBand === 'ANY') return true;
    return userBand === ruleBand;
  }

  private priority(key: string): number {
    return RULE_META[key]?.priority ?? 50;
  }

  private isUrgent(
    key: string,
    threshold: number = DEFAULT_NOTIFICATION_SETTINGS.urgentThreshold,
  ): boolean {
    return this.priority(key) >= threshold;
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

    const cfg = await this.settings.get();

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
        if (hours < cfg.quietEnd || hours >= cfg.quietStart) continue; // quiet hours

        // Faixa horária do usuário (cacheada ~7 dias no perfil). ANY =
        // sem dados suficientes ⇒ elegível o dia todo, como antes.
        const userBand = await this.profiles.getBand(userId);

        const hist = await this.prisma.notification.findMany({
          where: {
            userId,
            source: 'RULE',
            createdAt: { gte: new Date(now - this.HISTORY_DAYS * DAY) },
          },
          select: { createdAt: true, ruleKey: true, variantId: true },
          orderBy: { createdAt: 'desc' },
        });

        const sentToday = hist.filter((n) => this.dateInZone(n.createdAt, tz) === todayStr);
        if (sentToday.length >= cfg.maxPerDay) continue; // teto do dia

        const lastAt = hist[0]?.createdAt?.getTime();
        if (lastAt && now - lastAt < cfg.spacingHours * 60 * 60 * 1000) continue; // espaçamento

        const nudgesToday = sentToday.filter(
          (n) => !n.ruleKey || !this.isUrgent(n.ruleKey, cfg.urgentThreshold),
        ).length;

        // Gap de descanso: não notificar todo dia. As SUPLEMENTARES só
        // disparam se não houve NENHUMA notificação hoje nem ontem — assim
        // ficam ~3–4 dias/semana, com dias vazios entre eles. As URGENTES
        // ignoram esse gap (passam na frente mesmo em dia de folga).
        const yesterdayStr = this.dateInZone(new Date(now - DAY), tz);
        const lastDay = hist[0] ? this.dateInZone(hist[0].createdAt, tz) : null;
        const inRestGap =
          cfg.restGapEnabled && (lastDay === todayStr || lastDay === yesterdayStr);

        // última vez de cada regra (cooldown + justiça)
        const lastByRule = new Map<string, number>();
        for (const n of hist) {
          if (n.ruleKey && !lastByRule.has(n.ruleKey)) {
            lastByRule.set(n.ruleKey, n.createdAt.getTime());
          }
        }

        // candidatas: hora chegou + faixa casa + cooldown ok
        const candidates = rules.filter(
          (r) =>
            r.hour != null &&
            this.shouldFireAtHour(hours, r.hour, cfg.quietEnd, cfg.quietStart) &&
            this.bandMatches(userBand, r.band) &&
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

        // variantIds já recebidos por regra (mais recente → mais antigo),
        // pro rodízio de variantes na entrega
        const recentVariantsByRule = new Map<string, (string | null)[]>();
        for (const n of hist) {
          if (!n.ruleKey) continue;
          const list = recentVariantsByRule.get(n.ruleKey) ?? [];
          list.push(n.variantId ?? null);
          recentVariantsByRule.set(n.ruleKey, list);
        }

        // dispara a primeira permitida cuja condição bate
        for (const rule of candidates) {
          // convite (não-urgente): só se ainda houver cota de convite no dia
          // E não estivermos no gap de descanso (nenhuma notificação hoje
          // nem ontem). As urgentes ignoram os dois.
          if (
            !this.isUrgent(rule.key, cfg.urgentThreshold) &&
            (inRestGap || nudgesToday >= cfg.maxNudgesPerDay)
          ) {
            continue;
          }
          const recent = recentVariantsByRule.get(rule.key) ?? [];
          if (await this.tryFire(userId, rule, tz, recent)) break;
        }
      } catch (e: any) {
        this.logger.error(`regra falhou p/ ${userId}: ${e?.message}`);
      }
    }
  }

  // Avalia a condição e, se bater, entrega. Retorna se disparou.
  // `recentVariantIds` = variantes já recebidas por este usuário nesta
  // regra (mais recente → mais antigo), pro rodízio de textos.
  private async tryFire(
    userId: string,
    rule: RuleRow,
    tz: string,
    recentVariantIds: (string | null)[] = [],
  ): Promise<boolean> {
    const ctx = await this.evalCondition(userId, rule, tz);
    if (!ctx) return false;
    await this.deliver(userId, rule, ctx, recentVariantIds);
    return true;
  }

  // `rule` (não só `rule.condition`) porque as condições de janela agora
  // leem o limiar do registro (`thresholdDays`); `null` cai no default de
  // código de sempre.
  private async evalCondition(
    userId: string,
    rule: Pick<RuleRow, 'condition' | 'thresholdDays'>,
    tz: string,
  ): Promise<FireCtx> {
    const cond = rule.condition;
    switch (cond) {
      case 'ROSARY_UNFINISHED':
        return (await this.rosaryUnfinished(userId)) ? {} : null;
      case 'STREAK_AT_RISK': {
        const s = await this.streakAtRisk(userId, tz);
        return s >= 2 ? { vars: { count: String(s) } } : null;
      }
      case 'BIBLE_RESUME':
        return this.readingResume(userId, 'BIBLE', rule.thresholdDays ?? 3);
      case 'CATECHISM_RESUME':
        return this.readingResume(userId, 'CATECHISM', rule.thresholdDays ?? 4);
      case 'ROSARY_LAPSE':
        return (await this.rosaryLapse(userId, rule.thresholdDays ?? 7)) ? {} : null;
      case 'COMEBACK':
        return (await this.comeback(userId, rule.thresholdDays ?? 3)) ? {} : null;
      case 'SUNDAY':
        return this.nowInZone(tz).weekday === 'Sun' ? {} : null;
      case 'VOX_INTRO':
        return (await this.voxIntro(userId)) ? {} : null;
      case null:
        return {}; // sem condição (ex.: EXAMEN) — elegível quando a hora chega
      default:
        // `condition` não reconhecido (typo, regra custom mal configurada):
        // nunca dispara sozinho — do contrário caía aqui e virava "sempre
        // elegível", disparando todo dia sem que ninguém tenha pedido isso.
        this.logger.warn(`condição de regra desconhecida: "${String(cond)}" — regra não disparará`);
        return null;
    }
  }

  private async deliver(
    userId: string,
    rule: RuleRow,
    ctx: NonNullable<FireCtx>,
    recentVariantIds: (string | null)[] = [],
  ) {
    // Escolhe a variante menos usada recentemente por este usuário. Sem
    // variantes (ou serviço fora do ar) ⇒ cai no texto da própria regra,
    // idêntico ao de antes.
    const pool = await this.variants.listEnabledForRule(rule.key).catch(() => []);
    const variant = this.variants.pickVariant(pool, recentVariantIds);

    let title = variant?.title ?? rule.title;
    let body = (variant?.body ?? rule.body) ?? undefined;

    // Variáveis: as da condição ({count}/{label}) + as de contexto
    // ({nome}/{santo}/{tempoLiturgico}) que aparecerem no texto.
    const wanted = this.context.varsIn(`${title} ${body ?? ''}`);
    const ctxVars = wanted.length
      ? await this.context.resolve(userId, wanted).catch(() => ({}))
      : {};
    const vars = { ...ctxVars, ...ctx.vars };

    title = this.interpolate(title, vars);
    if (body) body = this.interpolate(body, vars);

    await this.send.deliverToUser(userId, {
      title,
      body,
      url: ctx.url ?? variant?.url ?? rule.url ?? undefined,
      source: 'RULE',
      ruleKey: rule.key,
      variantId: variant?.id,
    });
  }

  private interpolate(text: string, vars: Record<string, string>): string {
    let out = text;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(v);
    }
    return out;
  }

  /* ===== Condições ===== */

  private async rosaryUnfinished(userId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - DAY);
    // Mesmo horizonte de "ainda vale lembrar" que `rosaryLapse` usa (7 dias)
    // — sem isso, uma sessão abandonada há semanas (que a própria UI já não
    // mostra mais em "continuar", ver rosary.service.ts getActiveProgress)
    // ficava disparando "termine seu terço" pra sempre, porque a linha no
    // banco nunca é revisitada se o usuário não voltar àquele MESMO tipo.
    const staleCutoff = new Date(Date.now() - 7 * DAY);
    const unfinished = await this.prisma.rosarySession.findFirst({
      where: {
        userId,
        completed: false,
        currentStep: { gt: 0 }, // só conta se a pessoa de fato avançou, não um "abrir e sair"
        startedAt: { lt: cutoff, gte: staleCutoff },
      },
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
      select: { prayerStreak: true, lastLoginDate: true },
    });
    // `prayerStreak` é, na prática, uma sequência de LOGIN (ver
    // ActivityService.updateLoginStreak, incrementada a cada "entrou no
    // app" — não a cada oração concluída). O que "mantém" a sequência é
    // `lastLoginDate`, não `lastPrayerDate` (que só muda ao concluir um
    // terço/oração). Comparar contra `lastPrayerDate` avisava "vai perder
    // sua sequência" mesmo em dias em que o usuário já tinha aberto o app
    // — que é exatamente o que preserva a sequência.
    if (!s || (s.prayerStreak ?? 0) < 2 || !s.lastLoginDate) return 0;
    const today = this.nowInZone(tz).dateStr;
    const last = this.dateInZone(s.lastLoginDate, tz);
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

  // Já rezava terço, mas nenhum concluído há >= `minDays` dias.
  private async rosaryLapse(userId: string, minDays = 7): Promise<boolean> {
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
    return (Date.now() - lastAt) / DAY >= minDays;
  }

  // Sem abrir o app há `minDays`–14 dias (janela de reengajamento; o teto de
  // 14 dias é fixo — "depois disso, para de incomodar", não é um knob).
  private async comeback(userId: string, minDays = 3): Promise<boolean> {
    const s = await this.prisma.spiritualStats.findUnique({
      where: { userId },
      select: { lastLoginDate: true },
    });
    if (!s?.lastLoginDate) return false;
    const days = (Date.now() - s.lastLoginDate.getTime()) / DAY;
    return days >= minDays && days <= 14;
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
