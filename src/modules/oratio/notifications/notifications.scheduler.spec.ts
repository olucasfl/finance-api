import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsScheduler } from './notifications.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsSendService } from './notifications-send.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettingsService,
} from './notification-settings.service';
import { UserNotificationProfileService } from './user-notification-profile.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('NotificationsScheduler.shouldFireAtHour', () => {
  // shouldFireAtHour é puro (não toca prisma/send/settings/profiles), então
  // dá pra instanciar com dependências vazias.
  const scheduler = new NotificationsScheduler({} as any, {} as any, {} as any, {} as any);

  it('elegível da hora marcada em diante (fica na fila o dia todo)', () => {
    expect(scheduler.shouldFireAtHour(7, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(8, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(13, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(21, 7)).toBe(true);
  });

  it('não elegível antes da hora da regra', () => {
    expect(scheduler.shouldFireAtHour(6, 7)).toBe(false);
    expect(scheduler.shouldFireAtHour(19, 20)).toBe(false);
  });

  it('respeita quiet hours no começo do dia (antes das 7h)', () => {
    expect(scheduler.shouldFireAtHour(6, 6)).toBe(false);
  });

  it('respeita quiet hours no fim do dia (22h em diante)', () => {
    expect(scheduler.shouldFireAtHour(20, 20)).toBe(true);
    expect(scheduler.shouldFireAtHour(21, 20)).toBe(true);
    expect(scheduler.shouldFireAtHour(22, 20)).toBe(false);
  });
});

describe('NotificationsScheduler', () => {
  let scheduler: NotificationsScheduler;
  let prisma: any;
  let send: { deliverToUser: jest.Mock };
  let settings: { get: jest.Mock; invalidate: jest.Mock };
  let profiles: { getBand: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notificationRule: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      pushSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      rosarySession: { findFirst: jest.fn() },
      spiritualStats: { findUnique: jest.fn() },
      readingProgress: { findFirst: jest.fn() },
      conversation: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    send = { deliverToUser: jest.fn().mockResolvedValue({ pushed: true }) };
    settings = {
      get: jest.fn().mockResolvedValue({ ...DEFAULT_NOTIFICATION_SETTINGS }),
      invalidate: jest.fn(),
    };
    // default ANY = comportamento de antes (elegível o dia todo)
    profiles = { getBand: jest.fn().mockResolvedValue('ANY') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsSendService, useValue: send },
        { provide: NotificationSettingsService, useValue: settings },
        { provide: UserNotificationProfileService, useValue: profiles },
      ],
    }).compile();

    scheduler = module.get<NotificationsScheduler>(NotificationsScheduler);
  });

  describe('onModuleInit', () => {
    it('creates every catalog rule that does not exist yet', async () => {
      prisma.notificationRule.findUnique.mockResolvedValue(null);

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.create).toHaveBeenCalledTimes(9);
    });

    // findUnique é chamado 1x por regra do catálogo — devolve o mesmo shape
    // pra qualquer key, com os overrides do teste.
    const existingRow = (over: Record<string, unknown> = {}) =>
      prisma.notificationRule.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve({ key: where.key, url: '/whatever', band: 'MORNING', thresholdDays: 99, ...over }),
      );

    it('does not touch a rule that already exists with url and knobs set', async () => {
      existingRow();

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.create).not.toHaveBeenCalled();
      expect(prisma.notificationRule.update).not.toHaveBeenCalled();
    });

    it('fixes a stale url pointing at /oratio/home without overwriting an admin-chosen url', async () => {
      existingRow({ url: '/oratio/home' });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.update).toHaveBeenCalledWith({
        where: { key: 'ROSARY_UNFINISHED' },
        data: { url: '/oratio/rosary' },
      });
    });

    it('backfills band/thresholdDays on a legacy rule where they are still null', async () => {
      existingRow({ band: null, thresholdDays: null });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.update).toHaveBeenCalledWith({
        where: { key: 'BIBLE_RESUME' },
        data: { band: 'MORNING', thresholdDays: 3 },
      });
      // regra sem janela: só a band é semeada, sem thresholdDays
      expect(prisma.notificationRule.update).toHaveBeenCalledWith({
        where: { key: 'EXAMEN_NIGHT' },
        data: { band: 'EVENING' },
      });
    });

    it('never overwrites band/thresholdDays the admin already customised', async () => {
      existingRow({ band: 'EVENING', thresholdDays: 10 });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.update).not.toHaveBeenCalled();
    });

    it('prunes rules that fell out of the catalog', async () => {
      prisma.notificationRule.findUnique.mockResolvedValue({ key: 'x', url: null });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.deleteMany).toHaveBeenCalledWith({
        where: { key: { notIn: expect.arrayContaining(['ROSARY_UNFINISHED', 'EXAMEN_NIGHT']) } },
      });
    });
  });

  describe('tick()', () => {
    const rule = (overrides: Partial<any> = {}) => ({
      key: 'EXAMEN_NIGHT',
      title: 'Antes de dormir',
      body: 'corpo',
      url: '/oratio/confissao',
      hour: 9,
      condition: null,
      ...overrides,
    });

    // Todo o cálculo de "hora local" e "hoje" dentro do scheduler passa por
    // `new Date()` no momento da chamada — controlar isso via fake timers
    // (em vez de mockar getUTCHours, que só é usado no fallback de timezone
    // inválida) é o único jeito confiável de fixar a hora com um fuso real
    // como 'UTC' passando pelo caminho normal (Intl.DateTimeFormat).
    afterEach(() => {
      jest.useRealTimers();
    });

    function setUtcHour(hour: number) {
      jest.useFakeTimers();
      const now = new Date();
      now.setUTCHours(hour, 0, 0, 0);
      jest.setSystemTime(now);
      return now;
    }

    it('does nothing when there are no enabled rules', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([]);

      await scheduler.tick();

      expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it('skips a user entirely during quiet hours', async () => {
      setUtcHour(3);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 0 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);

      await scheduler.tick();

      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    it('delivers a no-condition rule once its hour has arrived, outside quiet hours', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([]);

      await scheduler.tick();

      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ ruleKey: 'EXAMEN_NIGHT', source: 'RULE' }),
      );
    });

    it('does not fire the same rule again the same tick once the daily cap (MAX_PER_DAY) is reached', async () => {
      const now = setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([
        { createdAt: now, ruleKey: 'A' },
        { createdAt: now, ruleKey: 'B' },
      ]);

      await scheduler.tick();

      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    it('respects the 6h spacing between two automatic notifications', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);

      const recentlySent = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
      prisma.notification.findMany.mockResolvedValue([{ createdAt: recentlySent, ruleKey: 'A' }]);

      await scheduler.tick();

      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    it('picks the highest-priority eligible rule when several candidates qualify', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([
        rule({ key: 'EXAMEN_NIGHT', hour: 9, condition: null }),
        rule({ key: 'STREAK_AT_RISK', hour: 9, condition: 'STREAK_AT_RISK' }),
      ]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 5,
        lastLoginDate: new Date('2000-01-01'),
      });

      await scheduler.tick();

      // STREAK_AT_RISK (priority 90) beats EXAMEN_NIGHT (priority 40)
      expect(send.deliverToUser).toHaveBeenCalledTimes(1);
      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ ruleKey: 'STREAK_AT_RISK' }),
      );
    });

    it('caps non-urgent "nudge" rules at MAX_NUDGES_PER_DAY even when the daily cap and spacing both have room', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9, key: 'EXAMEN_NIGHT' })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);

      // Sent earlier today (same UTC calendar day, but > 6h ago so the
      // spacing guard doesn't itself block this tick) — a non-urgent nudge
      // (COMEBACK, priority 70 < URGENT_THRESHOLD 80) that already used up
      // the day's one nudge slot; EXAMEN_NIGHT is itself a nudge, so it
      // must be skipped by the nudge cap specifically.
      const earlierToday = new Date();
      earlierToday.setUTCHours(3, 0, 0, 0);
      prisma.notification.findMany.mockResolvedValue([
        { createdAt: earlierToday, ruleKey: 'COMEBACK' },
      ]);

      await scheduler.tick();

      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    it('logs and continues to the next user when evaluating one user throws', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([
        { userId: 'u-broken', timezone: 'UTC' },
        { userId: 'u-ok', timezone: 'UTC' },
      ]);
      prisma.notification.findMany
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce([]);

      await expect(scheduler.tick()).resolves.toBeUndefined();

      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u-ok',
        expect.objectContaining({ ruleKey: 'EXAMEN_NIGHT' }),
      );
    });

    it('interpolates {count}/{label} vars from the condition into the delivered body', async () => {
      setUtcHour(10);
      prisma.notificationRule.findMany.mockResolvedValue([
        {
          key: 'STREAK_AT_RISK',
          title: 'Sequência',
          body: 'Você está com {count} dias seguidos.',
          url: null,
          hour: 9,
          condition: 'STREAK_AT_RISK',
        },
      ]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 7,
        lastLoginDate: new Date('2000-01-01'),
      });

      await scheduler.tick();

      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ body: 'Você está com 7 dias seguidos.' }),
      );
    });

    it('behaves exactly as before when NotificationSettings falls back to the built-in defaults', async () => {
      setUtcHour(10);
      // get() devolvendo os defaults é o mesmo cenário de "banco sem linha"
      settings.get.mockResolvedValue({ ...DEFAULT_NOTIFICATION_SETTINGS });
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([]);

      await scheduler.tick();

      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ ruleKey: 'EXAMEN_NIGHT' }),
      );
    });

    it('honours a customised daily cap from NotificationSettings (maxPerDay: 1)', async () => {
      const now = setUtcHour(10);
      settings.get.mockResolvedValue({ ...DEFAULT_NOTIFICATION_SETTINGS, maxPerDay: 1 });
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 9 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      // uma única automática hoje já bate o teto customizado
      prisma.notification.findMany.mockResolvedValue([{ createdAt: now, ruleKey: 'A' }]);

      await scheduler.tick();

      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    it('honours a widened quiet-hours window from NotificationSettings (quietStart: 9)', async () => {
      setUtcHour(10);
      settings.get.mockResolvedValue({ ...DEFAULT_NOTIFICATION_SETTINGS, quietStart: 9 });
      prisma.notificationRule.findMany.mockResolvedValue([rule({ hour: 8 })]);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
      prisma.notification.findMany.mockResolvedValue([]);

      await scheduler.tick();

      // 10h agora cai dentro do quiet hours (>= 9) → ninguém recebe
      expect(send.deliverToUser).not.toHaveBeenCalled();
    });

    describe('rest gap (dias vazios entre notificações não-urgentes)', () => {
      // notificação de ONTEM: dentro do histórico, fora do "hoje", e a >6h
      // (não trava por espaçamento nem pelo teto do dia)
      const yesterday = () => new Date(Date.now() - DAY_MS);

      it('suppresses a non-urgent nudge when anything was delivered yesterday', async () => {
        setUtcHour(10);
        prisma.notificationRule.findMany.mockResolvedValue([
          rule({ key: 'EXAMEN_NIGHT', hour: 9, condition: null }),
        ]);
        prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
        prisma.notification.findMany.mockResolvedValue([
          { createdAt: yesterday(), ruleKey: 'SUNDAY_MASS' },
        ]);

        await scheduler.tick();

        expect(send.deliverToUser).not.toHaveBeenCalled();
      });

      it('still lets an URGENT rule through during the rest gap', async () => {
        setUtcHour(10);
        prisma.notificationRule.findMany.mockResolvedValue([
          rule({ key: 'STREAK_AT_RISK', hour: 9, condition: 'STREAK_AT_RISK' }),
        ]);
        prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
        prisma.notification.findMany.mockResolvedValue([
          { createdAt: yesterday(), ruleKey: 'SUNDAY_MASS' },
        ]);
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 5,
          lastLoginDate: new Date('2000-01-01'),
        });

        await scheduler.tick();

        expect(send.deliverToUser).toHaveBeenCalledWith(
          'u1',
          expect.objectContaining({ ruleKey: 'STREAK_AT_RISK' }),
        );
      });

      it('does not apply the gap when restGapEnabled is false', async () => {
        setUtcHour(10);
        settings.get.mockResolvedValue({ ...DEFAULT_NOTIFICATION_SETTINGS, restGapEnabled: false });
        prisma.notificationRule.findMany.mockResolvedValue([
          rule({ key: 'EXAMEN_NIGHT', hour: 9, condition: null }),
        ]);
        prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
        prisma.notification.findMany.mockResolvedValue([
          { createdAt: yesterday(), ruleKey: 'SUNDAY_MASS' },
        ]);

        await scheduler.tick();

        expect(send.deliverToUser).toHaveBeenCalledWith(
          'u1',
          expect.objectContaining({ ruleKey: 'EXAMEN_NIGHT' }),
        );
      });
    });

    describe('band matching (faixa do usuário × faixa da regra)', () => {
      const setup = (userBand: string, ruleBand: string | null) => {
        setUtcHour(10);
        profiles.getBand.mockResolvedValue(userBand);
        prisma.notificationRule.findMany.mockResolvedValue([
          rule({ key: 'EXAMEN_NIGHT', hour: 9, condition: null, band: ruleBand }),
        ]);
        prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1', timezone: 'UTC' }]);
        prisma.notification.findMany.mockResolvedValue([]);
      };

      it('delivers when the user band matches the rule band', async () => {
        setup('MORNING', 'MORNING');
        await scheduler.tick();
        expect(send.deliverToUser).toHaveBeenCalled();
      });

      it('suppresses a rule whose band does not match the user band', async () => {
        setup('EVENING', 'MORNING');
        await scheduler.tick();
        expect(send.deliverToUser).not.toHaveBeenCalled();
      });

      it('a rule with band ANY reaches every user', async () => {
        setup('EVENING', 'ANY');
        await scheduler.tick();
        expect(send.deliverToUser).toHaveBeenCalled();
      });

      it('a rule without a band falls back to hour-only (reaches everyone)', async () => {
        setup('EVENING', null);
        await scheduler.tick();
        expect(send.deliverToUser).toHaveBeenCalled();
      });

      it('a user classified ANY (not enough data) still gets banded rules', async () => {
        setup('ANY', 'MORNING');
        await scheduler.tick();
        expect(send.deliverToUser).toHaveBeenCalled();
      });
    });
  });

  describe('bandMatches', () => {
    const s = () => scheduler as any;
    it('matches on ANY (either side), on a null rule band, and on an exact band', () => {
      expect(s().bandMatches('MORNING', 'MORNING')).toBe(true);
      expect(s().bandMatches('MORNING', 'EVENING')).toBe(false);
      expect(s().bandMatches('ANY', 'EVENING')).toBe(true);
      expect(s().bandMatches('EVENING', 'ANY')).toBe(true);
      expect(s().bandMatches('EVENING', null)).toBe(true);
    });
  });

  describe('condition evaluators', () => {
    const s = () => scheduler as any;

    describe('rosaryUnfinished', () => {
      it('is false when there is no unfinished session older than a day', async () => {
        prisma.rosarySession.findFirst.mockResolvedValueOnce(null);
        await expect(s().rosaryUnfinished('u1')).resolves.toBe(false);
      });

      it('is true when an unfinished session exists and nothing was completed since', async () => {
        prisma.rosarySession.findFirst
          .mockResolvedValueOnce({ startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }) // unfinished
          .mockResolvedValueOnce(null); // no completion since
        await expect(s().rosaryUnfinished('u1')).resolves.toBe(true);
      });

      it('is false when a rosary was completed after the unfinished one started', async () => {
        prisma.rosarySession.findFirst
          .mockResolvedValueOnce({ startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) })
          .mockResolvedValueOnce({ id: 'done-1' });
        await expect(s().rosaryUnfinished('u1')).resolves.toBe(false);
      });

      it('only queries sessions with real engagement (currentStep > 0) within a 1-7 day window', async () => {
        prisma.rosarySession.findFirst.mockResolvedValueOnce(null);
        await s().rosaryUnfinished('u1');

        const query = prisma.rosarySession.findFirst.mock.calls[0][0];
        expect(query.where.currentStep).toEqual({ gt: 0 });
        expect(query.where.startedAt.lt).toBeInstanceOf(Date);
        expect(query.where.startedAt.gte).toBeInstanceOf(Date);
        // a sessão abandonada há semanas não deve mais entrar na janela
        const staleSpan = query.where.startedAt.lt.getTime() - query.where.startedAt.gte.getTime();
        expect(staleSpan).toBe(6 * DAY_MS);
      });
    });

    describe('streakAtRisk', () => {
      it('is 0 when the user has no SpiritualStats row', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue(null);
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(0);
      });

      it('is 0 when the streak is below 2', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 1,
          lastLoginDate: new Date(),
        });
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(0);
      });

      it('is 0 when the user already opened the app today (streak not actually at risk)', async () => {
        const today = new Date();
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 5,
          lastLoginDate: today,
        });
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(0);
      });

      it('returns the streak count when it has not opened the app yet today', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 5,
          lastLoginDate: new Date('2000-01-01'),
        });
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(5);
      });
    });

    describe('readingResume', () => {
      it('returns null when there is no reading progress at all', async () => {
        prisma.readingProgress.findFirst.mockResolvedValue(null);
        await expect(s().readingResume('u1', 'BIBLE', 3)).resolves.toBeNull();
      });

      it('returns null when the reading was updated too recently', async () => {
        prisma.readingProgress.findFirst.mockResolvedValue({
          reference: 'genesis/3',
          label: 'Gênesis 3',
          updatedAt: new Date(),
        });
        await expect(s().readingResume('u1', 'BIBLE', 3)).resolves.toBeNull();
      });

      it('builds a Bible url and interpolation vars once the minimum days have passed', async () => {
        prisma.readingProgress.findFirst.mockResolvedValue({
          reference: 'genesis/3',
          label: 'Gênesis 3',
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
        await expect(s().readingResume('u1', 'BIBLE', 3)).resolves.toEqual({
          url: '/oratio/biblia/genesis/3',
          vars: { label: 'Gênesis 3' },
        });
      });

      it('builds a Catechism url with a ?page= query instead', async () => {
        prisma.readingProgress.findFirst.mockResolvedValue({
          reference: '42',
          label: 'Página 42',
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
        const result = await s().readingResume('u1', 'CATECHISM', 4);
        expect(result.url).toBe('/oratio/catecismo?page=42');
      });
    });

    describe('rosaryLapse', () => {
      it('is false when the user has never prayed a rosary', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({ rosariesPrayed: 0 });
        await expect(s().rosaryLapse('u1')).resolves.toBe(false);
      });

      it('is true when the last completed rosary was 7+ days ago', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({ rosariesPrayed: 3 });
        prisma.rosarySession.findFirst.mockResolvedValue({
          finishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
        await expect(s().rosaryLapse('u1')).resolves.toBe(true);
      });

      it('is false when the last completed rosary was recent', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({ rosariesPrayed: 3 });
        prisma.rosarySession.findFirst.mockResolvedValue({ finishedAt: new Date() });
        await expect(s().rosaryLapse('u1')).resolves.toBe(false);
      });
    });

    describe('comeback', () => {
      it('is false without a lastLoginDate', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue(null);
        await expect(s().comeback('u1')).resolves.toBe(false);
      });

      it('is false when the user logged in very recently (< 3 days)', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({ lastLoginDate: new Date() });
        await expect(s().comeback('u1')).resolves.toBe(false);
      });

      it('is true within the 3-14 day re-engagement window', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          lastLoginDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        });
        await expect(s().comeback('u1')).resolves.toBe(true);
      });

      it('is false once past the 14-day window (stop nudging forever)', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          lastLoginDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        });
        await expect(s().comeback('u1')).resolves.toBe(false);
      });
    });

    describe('voxIntro', () => {
      it('is false once the user has any conversation with messages', async () => {
        prisma.conversation.findFirst.mockResolvedValue({ id: 'c1' });
        await expect(s().voxIntro('u1')).resolves.toBe(false);
      });

      it('is false when the user record is missing', async () => {
        prisma.conversation.findFirst.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(s().voxIntro('u1')).resolves.toBe(false);
      });

      it('is false for a brand new account (< 3 days old)', async () => {
        prisma.conversation.findFirst.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue({ createdAt: new Date() });
        await expect(s().voxIntro('u1')).resolves.toBe(false);
      });

      it('is true once the account is 3+ days old and never used VoxAI', async () => {
        prisma.conversation.findFirst.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue({
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
        await expect(s().voxIntro('u1')).resolves.toBe(true);
      });
    });

    describe('evalCondition', () => {
      it('is eligible (fires) when the rule has no condition at all (null)', async () => {
        await expect(
          s().evalCondition('u1', { condition: null, thresholdDays: null }, 'UTC'),
        ).resolves.toEqual({});
      });

      it('never fires for an unrecognized condition string instead of firing unconditionally', async () => {
        // Regressão: um `condition` custom com typo (ex.: "SUNDAY_MASS" em vez
        // de "SUNDAY") caía no `default` do switch, que costumava tratar
        // qualquer string desconhecida como "sem condição" — disparando a
        // regra todo santo dia em vez de nunca.
        await expect(
          s().evalCondition('u1', { condition: 'ALGUM_TYPO_QUALQUER', thresholdDays: null }, 'UTC'),
        ).resolves.toBeNull();
      });

      it('reads thresholdDays from the rule for a window condition (BIBLE_RESUME)', async () => {
        prisma.readingProgress.findFirst.mockResolvedValue({
          reference: 'genesis/3',
          label: 'Gênesis 3',
          updatedAt: new Date(Date.now() - 2 * DAY_MS), // parado há 2 dias
        });

        // limiar custom de 1 dia → 2 dias parado já dispara
        await expect(
          s().evalCondition('u1', { condition: 'BIBLE_RESUME', thresholdDays: 1 }, 'UTC'),
        ).resolves.toMatchObject({ url: '/oratio/biblia/genesis/3' });

        // sem limiar → cai no default de código (3 dias) → 2 dias ainda não
        await expect(
          s().evalCondition('u1', { condition: 'BIBLE_RESUME', thresholdDays: null }, 'UTC'),
        ).resolves.toBeNull();
      });

      it('reads thresholdDays for ROSARY_LAPSE / COMEBACK too', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          rosariesPrayed: 3,
          lastLoginDate: new Date(Date.now() - 4 * DAY_MS),
        });
        prisma.rosarySession.findFirst.mockResolvedValue({
          finishedAt: new Date(Date.now() - 4 * DAY_MS),
        });

        // ROSARY_LAPSE: último terço há 4 dias, limiar custom 3 → dispara
        await expect(
          s().evalCondition('u1', { condition: 'ROSARY_LAPSE', thresholdDays: 3 }, 'UTC'),
        ).resolves.toEqual({});

        // COMEBACK: sem abrir há 4 dias, limiar custom 5 → ainda não
        await expect(
          s().evalCondition('u1', { condition: 'COMEBACK', thresholdDays: 5 }, 'UTC'),
        ).resolves.toBeNull();
      });
    });
  });
});
