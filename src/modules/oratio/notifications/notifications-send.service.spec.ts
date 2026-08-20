import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsSendService } from './notifications-send.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushService } from './push.service';

describe('NotificationsSendService', () => {
  let service: NotificationsSendService;
  let prisma: {
    notification: {
      create: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      updateMany: jest.Mock;
    };
    notificationCampaign: {
      create: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
    notificationRule: {
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    user: { findMany: jest.Mock; count: jest.Mock };
    pushSubscription: { findMany: jest.Mock };
  };
  let push: { sendToUser: jest.Mock; sendToSubs: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      notificationCampaign: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationRule: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      user: { findMany: jest.fn(), count: jest.fn() },
      pushSubscription: { findMany: jest.fn().mockResolvedValue([]) },
    };

    push = {
      sendToUser: jest.fn().mockResolvedValue({ sent: 0, failed: 0 }),
      sendToSubs: jest.fn().mockResolvedValue({ sent: 0, failed: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsSendService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: push },
      ],
    }).compile();

    service = module.get<NotificationsSendService>(NotificationsSendService);
  });

  describe('deliverToUser', () => {
    it('creates a bell notification and reports pushed: false when the user has no active push subscription', async () => {
      push.sendToUser.mockResolvedValue({ sent: 0, failed: 0 });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.deliverToUser('user-1', { title: 'Olá' });

      expect(result).toEqual({ pushed: false });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', title: 'Olá', pushSent: false }),
        }),
      );
    });

    it('reports pushed: true when at least one push was actually sent', async () => {
      push.sendToUser.mockResolvedValue({ sent: 1, failed: 0 });
      prisma.notification.create.mockResolvedValue({});

      const result = await service.deliverToUser('user-1', { title: 'Olá' });

      expect(result).toEqual({ pushed: true });
      const args = prisma.notification.create.mock.calls[0][0];
      expect(args.data.pushSent).toBe(true);
    });

    it('defaults source to CAMPAIGN and nullifies optional fields not provided', async () => {
      await service.deliverToUser('user-1', { title: 'Olá' });

      const args = prisma.notification.create.mock.calls[0][0];
      expect(args.data.source).toBe('CAMPAIGN');
      expect(args.data.body).toBeNull();
      expect(args.data.url).toBeNull();
      expect(args.data.ruleKey).toBeNull();
      expect(args.data.campaignId).toBeNull();
    });

    it('preserves an explicit RULE source and ruleKey', async () => {
      await service.deliverToUser('user-1', { title: 'Olá', source: 'RULE', ruleKey: 'rosary_unfinished' });

      const args = prisma.notification.create.mock.calls[0][0];
      expect(args.data.source).toBe('RULE');
      expect(args.data.ruleKey).toBe('rosary_unfinished');
    });
  });

  describe('createCampaign', () => {
    it('targets every user for an ALL audience', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });

      const result = await service.createCampaign({ title: 'Aviso', audience: 'ALL' });

      expect(prisma.user.findMany).toHaveBeenCalledWith({ select: { id: true } });
      expect(prisma.notificationCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targeted: 2 }) }),
      );
      expect(result).toEqual({ id: 'camp-1' });
    });

    it('deduplicates userIds and filters out ids that do not exist for a SPECIFIC audience', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });

      await service.createCampaign({
        title: 'Aviso',
        audience: 'SPECIFIC',
        userIds: ['u1', 'u1', 'ghost-user'],
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'ghost-user'] } },
        select: { id: true },
      });
      expect(prisma.notificationCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targeted: 1 }) }),
      );
    });

    it('never queries the user table for an empty SPECIFIC userIds list, and targets no one', async () => {
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });

      await service.createCampaign({ title: 'Aviso', audience: 'SPECIFIC', userIds: [] });

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.notificationCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ targeted: 0 }) }),
      );
    });

    it('does not attempt delivery (deliverCampaign) when there are zero targets', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });

      await service.createCampaign({ title: 'Aviso', audience: 'ALL' });
      await new Promise((r) => setTimeout(r, 0));

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('delivers in the background to every target once there is at least one', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });
      prisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.createCampaign({ title: 'Aviso', audience: 'ALL' });
      await new Promise((r) => setTimeout(r, 0));

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ userId: 'u1', campaignId: 'camp-1', source: 'CAMPAIGN' }),
          expect.objectContaining({ userId: 'u2', campaignId: 'camp-1', source: 'CAMPAIGN' }),
        ],
      });
    });

    it('sends push only to targets with an active subscription, and marks their notification rows pushSent', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });
      prisma.pushSubscription.findMany.mockResolvedValue([
        { userId: 'u1', endpoint: 'ep-1', p256dh: 'p', auth: 'a' },
      ]);
      push.sendToSubs.mockResolvedValue({ sent: 1, failed: 0 });

      await service.createCampaign({ title: 'Aviso', audience: 'ALL' });
      await new Promise((r) => setTimeout(r, 0));

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { campaignId: 'camp-1', userId: { in: ['u1'] } },
        data: { pushSent: true },
      });
      expect(prisma.notificationCampaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { pushSent: 1, pushFailed: 0 },
      });
    });

    it('splits delivery into chunks of 500 targets per batch', async () => {
      const targets = Array.from({ length: 501 }, (_, i) => ({ id: `u${i}` }));
      prisma.user.findMany.mockResolvedValue(targets);
      prisma.notificationCampaign.create.mockResolvedValue({ id: 'camp-1' });
      prisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.createCampaign({ title: 'Aviso', audience: 'ALL' });
      await new Promise((r) => setTimeout(r, 0));

      expect(prisma.notification.createMany).toHaveBeenCalledTimes(2);
      expect((prisma.notification.createMany.mock.calls[0][0] as any).data).toHaveLength(500);
      expect((prisma.notification.createMany.mock.calls[1][0] as any).data).toHaveLength(1);
    });
  });

  describe('listCampaigns', () => {
    it('lists campaigns newest first', async () => {
      prisma.notificationCampaign.findMany.mockResolvedValue([{ id: 'c1' }]);

      await expect(service.listCampaigns()).resolves.toEqual([{ id: 'c1' }]);
      expect(prisma.notificationCampaign.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('deleteAllCampaigns', () => {
    it('deletes every CAMPAIGN-sourced notification and every campaign row', async () => {
      const result = await service.deleteAllCampaigns();

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { source: 'CAMPAIGN' },
      });
      expect(prisma.notificationCampaign.deleteMany).toHaveBeenCalledWith({});
      expect(result).toEqual({ ok: true });
    });
  });

  describe('subscribersCount', () => {
    it('reports total users and how many have a distinct active subscription', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.pushSubscription.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);

      await expect(service.subscribersCount()).resolves.toEqual({
        totalUsers: 10,
        subscribedUsers: 2,
      });
    });
  });

  describe('rules CRUD', () => {
    it('listRules orders by key ascending', () => {
      service.listRules();
      expect(prisma.notificationRule.findMany).toHaveBeenCalledWith({ orderBy: { key: 'asc' } });
    });

    it('updateRule forwards the given fields', () => {
      service.updateRule('rule-1', { enabled: false, title: 'Novo título' });
      expect(prisma.notificationRule.update).toHaveBeenCalledWith({
        where: { key: 'rule-1' },
        data: expect.objectContaining({ enabled: false, title: 'Novo título' }),
      });
    });

    it('createRule defaults optional fields to null', () => {
      service.createRule({ title: 'Nova regra' });
      expect(prisma.notificationRule.create).toHaveBeenCalledWith({
        data: {
          title: 'Nova regra',
          body: null,
          url: null,
          hour: null,
          condition: null,
        },
      });
    });

    it('deleteRule deletes by key', () => {
      service.deleteRule('rule-1');
      expect(prisma.notificationRule.delete).toHaveBeenCalledWith({ where: { key: 'rule-1' } });
    });
  });

  describe('deleteCampaign', () => {
    it('deletes every notification tied to the campaign, then the campaign itself', async () => {
      const result = await service.deleteCampaign('camp-1');

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { campaignId: 'camp-1' },
      });
      expect(prisma.notificationCampaign.delete).toHaveBeenCalledWith({ where: { id: 'camp-1' } });
      expect(result).toEqual({ ok: true });
    });

    it('does not throw if the campaign row is already gone', async () => {
      prisma.notificationCampaign.delete.mockRejectedValue(new Error('not found'));

      await expect(service.deleteCampaign('camp-1')).resolves.toEqual({ ok: true });
    });
  });

  describe('cleanupExpired', () => {
    it('deletes expired notifications and campaigns and logs when something was removed', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 3 });
      prisma.notificationCampaign.deleteMany.mockResolvedValue({ count: 1 });

      await service.cleanupExpired();

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
      expect(prisma.notificationCampaign.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it('does nothing to log when nothing was expired', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
      prisma.notificationCampaign.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.cleanupExpired()).resolves.toBeUndefined();
    });
  });
});
