import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsScheduler } from './notifications.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsSendService } from './notifications-send.service';

describe('NotificationsScheduler.shouldFireAtHour', () => {
  // shouldFireAtHour é puro (não toca prisma/send), então dá pra instanciar
  // com dependências vazias.
  const scheduler = new NotificationsScheduler({} as any, {} as any);

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsSendService, useValue: send },
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

    it('does not touch a rule that already exists and has a normal url', async () => {
      prisma.notificationRule.findUnique.mockResolvedValue({
        key: 'ROSARY_UNFINISHED',
        url: '/oratio/rosary',
      });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.create).not.toHaveBeenCalled();
      expect(prisma.notificationRule.update).not.toHaveBeenCalled();
    });

    it('fixes a stale url pointing at /oratio/home without overwriting an admin-chosen url', async () => {
      prisma.notificationRule.findUnique.mockResolvedValue({
        key: 'ROSARY_UNFINISHED',
        url: '/oratio/home',
      });

      await scheduler.onModuleInit();

      expect(prisma.notificationRule.update).toHaveBeenCalledWith({
        where: { key: 'ROSARY_UNFINISHED' },
        data: { url: '/oratio/rosary' },
      });
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
        lastPrayerDate: new Date('2000-01-01'),
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
        lastPrayerDate: new Date('2000-01-01'),
      });

      await scheduler.tick();

      expect(send.deliverToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ body: 'Você está com 7 dias seguidos.' }),
      );
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
          .mockResolvedValueOnce({ startedAt: new Date('2020-01-01') }) // unfinished
          .mockResolvedValueOnce(null); // no completion since
        await expect(s().rosaryUnfinished('u1')).resolves.toBe(true);
      });

      it('is false when a rosary was completed after the unfinished one started', async () => {
        prisma.rosarySession.findFirst
          .mockResolvedValueOnce({ startedAt: new Date('2020-01-01') })
          .mockResolvedValueOnce({ id: 'done-1' });
        await expect(s().rosaryUnfinished('u1')).resolves.toBe(false);
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
          lastPrayerDate: new Date(),
        });
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(0);
      });

      it('is 0 when the user already prayed today (streak not actually at risk)', async () => {
        const today = new Date();
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 5,
          lastPrayerDate: today,
        });
        await expect(s().streakAtRisk('u1', 'UTC')).resolves.toBe(0);
      });

      it('returns the streak count when it has not prayed yet today', async () => {
        prisma.spiritualStats.findUnique.mockResolvedValue({
          prayerStreak: 5,
          lastPrayerDate: new Date('2000-01-01'),
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
  });
});
