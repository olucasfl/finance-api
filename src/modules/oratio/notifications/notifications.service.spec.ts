import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    pushSubscription: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      pushSubscription: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('subscribe', () => {
    it('upserts by endpoint and defaults timezone to UTC when none is given', async () => {
      await service.subscribe('user-1', { endpoint: 'ep-1', p256dh: 'p', auth: 'a' });

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: 'ep-1' },
        create: { userId: 'user-1', endpoint: 'ep-1', p256dh: 'p', auth: 'a', timezone: 'UTC' },
        update: { userId: 'user-1', p256dh: 'p', auth: 'a', timezone: 'UTC' },
      });
    });

    it('keeps an explicit timezone instead of the UTC default', async () => {
      await service.subscribe('user-1', {
        endpoint: 'ep-1',
        p256dh: 'p',
        auth: 'a',
        timezone: 'America/Sao_Paulo',
      });

      const args = prisma.pushSubscription.upsert.mock.calls[0][0];
      expect(args.create.timezone).toBe('America/Sao_Paulo');
      expect(args.update.timezone).toBe('America/Sao_Paulo');
    });

    it('deletes the user\'s other stale subscriptions (different endpoint)', async () => {
      await service.subscribe('user-1', { endpoint: 'ep-new', p256dh: 'p', auth: 'a' });

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', endpoint: { not: 'ep-new' } },
      });
    });
  });

  describe('unsubscribe', () => {
    it('deletes the subscription matching the user and endpoint', async () => {
      const result = await service.unsubscribe('user-1', 'ep-1');

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', endpoint: 'ep-1' },
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('updateTimezone', () => {
    it('updates every subscription belonging to the user', async () => {
      await service.updateTimezone('user-1', 'America/Sao_Paulo');

      expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { timezone: 'America/Sao_Paulo' },
      });
    });
  });

  describe('status', () => {
    it('reports enabled: false when the user has no active subscription', async () => {
      prisma.pushSubscription.count.mockResolvedValue(0);

      await expect(service.status('user-1')).resolves.toEqual({ enabled: false });
    });

    it('reports enabled: true when at least one subscription exists', async () => {
      prisma.pushSubscription.count.mockResolvedValue(2);

      await expect(service.status('user-1')).resolves.toEqual({ enabled: true });
    });
  });

  describe('getInbox', () => {
    it('clamps a limit above 30 down to 30', async () => {
      await service.getInbox('user-1', undefined, 999);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 31 }),
      );
    });

    it('clamps a limit below 1 up to 1', async () => {
      await service.getInbox('user-1', undefined, 0);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
    });

    it('does not add a cursor clause when no cursor is given', async () => {
      await service.getInbox('user-1');

      const args = prisma.notification.findMany.mock.calls[0][0];
      expect(args.cursor).toBeUndefined();
      expect(args.skip).toBeUndefined();
    });

    it('selects ruleKey so the client can show a category per notification', async () => {
      await service.getInbox('user-1');

      const args = prisma.notification.findMany.mock.calls[0][0];
      expect(args.select).toMatchObject({ ruleKey: true, source: true });
    });

    it('adds cursor/skip when a cursor is given', async () => {
      await service.getInbox('user-1', 'row-10');

      const args = prisma.notification.findMany.mock.calls[0][0];
      expect(args.cursor).toEqual({ id: 'row-10' });
      expect(args.skip).toBe(1);
    });

    it('returns no nextCursor when there is no extra row beyond the page', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const result = await service.getInbox('user-1', undefined, 10);

      expect(result).toEqual({ items: [{ id: '1' }, { id: '2' }], nextCursor: null });
    });

    it('pops the extra row and returns its id as nextCursor when the page is full', async () => {
      const rows = Array.from({ length: 3 }, (_, i) => ({ id: `${i}` }));
      prisma.notification.findMany.mockResolvedValue(rows);

      const result = await service.getInbox('user-1', undefined, 2);

      expect(result.nextCursor).toBe('2');
      expect(result.items).toEqual([{ id: '0' }, { id: '1' }]);
    });
  });

  describe('unseenCount', () => {
    it('counts only unseen, unexpired notifications for the user', async () => {
      prisma.notification.count.mockResolvedValue(4);

      await expect(service.unseenCount('user-1')).resolves.toEqual({ count: 4 });
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', seenAt: null }),
        }),
      );
    });
  });

  describe('markSeen', () => {
    it('marks only the given notification, scoped to its owner, as seen', async () => {
      const result = await service.markSeen('user-1', 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1', seenAt: null },
        data: { seenAt: expect.any(Date) },
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('markAllSeen', () => {
    it('marks every unseen notification for the user as seen', async () => {
      const result = await service.markAllSeen('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', seenAt: null },
        data: { seenAt: expect.any(Date) },
      });
      expect(result).toEqual({ ok: true });
    });
  });
});
