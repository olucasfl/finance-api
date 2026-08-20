import { Test, TestingModule } from '@nestjs/testing';
import * as webpush from 'web-push';
import { PushService } from './push.service';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('web-push');
const mockedWebpush = webpush as jest.Mocked<typeof webpush>;

describe('PushService', () => {
  let service: PushService;
  let prisma: { pushSubscription: { findMany: jest.Mock; deleteMany: jest.Mock } };
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    prisma = {
      pushSubscription: {
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PushService>(PushService);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('stays disabled and does not call setVapidDetails when VAPID keys are missing', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      service.onModuleInit();

      expect(service.isEnabled()).toBe(false);
      expect(mockedWebpush.setVapidDetails).not.toHaveBeenCalled();
    });

    it('enables push and configures VAPID details when both keys are present', () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      process.env.VAPID_EMAIL = 'mailto:ops@oratio.app';

      service.onModuleInit();

      expect(service.isEnabled()).toBe(true);
      expect(mockedWebpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:ops@oratio.app',
        'pub-key',
        'priv-key',
      );
    });

    it('falls back to a default VAPID_EMAIL when none is configured', () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      delete process.env.VAPID_EMAIL;

      service.onModuleInit();

      expect(mockedWebpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:dev@oratio.app',
        'pub-key',
        'priv-key',
      );
    });
  });

  describe('publicKey', () => {
    it('returns the configured VAPID public key', () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      expect(service.publicKey).toBe('pub-key');
    });

    it('returns an empty string when no public key is configured', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      expect(service.publicKey).toBe('');
    });
  });

  describe('sendToSubs', () => {
    it('does nothing and reports 0/0 when push is disabled', async () => {
      const result = await service.sendToSubs(
        [{ endpoint: 'ep', p256dh: 'p', auth: 'a' }],
        { title: 'Oi' },
      );

      expect(result).toEqual({ sent: 0, failed: 0 });
      expect(mockedWebpush.sendNotification).not.toHaveBeenCalled();
    });

    it('does nothing and reports 0/0 when there are no subscriptions, even if enabled', () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();

      return expect(service.sendToSubs([], { title: 'Oi' })).resolves.toEqual({
        sent: 0,
        failed: 0,
      });
    });

    it('counts a successful send and never touches the subscription table', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      mockedWebpush.sendNotification.mockResolvedValue({} as any);

      const result = await service.sendToSubs(
        [{ endpoint: 'ep-1', p256dh: 'p', auth: 'a' }],
        { title: 'Oi' },
      );

      expect(result).toEqual({ sent: 1, failed: 0 });
      expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes the subscription immediately on a 410 (gone) response, without retrying', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      mockedWebpush.sendNotification.mockRejectedValue({ statusCode: 410, message: 'Gone' });

      const result = await service.sendToSubs(
        [{ endpoint: 'ep-dead', p256dh: 'p', auth: 'a' }],
        { title: 'Oi' },
      );

      expect(result).toEqual({ sent: 0, failed: 1 });
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'ep-dead' },
      });
      expect(mockedWebpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('deletes the subscription on a 404 response too', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      mockedWebpush.sendNotification.mockRejectedValue({ statusCode: 404, message: 'Not found' });

      await service.sendToSubs([{ endpoint: 'ep-dead', p256dh: 'p', auth: 'a' }], { title: 'Oi' });

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'ep-dead' },
      });
    });

    it('does not delete the subscription on a transient error (e.g. 500)', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      mockedWebpush.sendNotification.mockRejectedValue({ statusCode: 500, message: 'boom' });

      const result = await service.sendToSubs(
        [{ endpoint: 'ep-1', p256dh: 'p', auth: 'a' }],
        { title: 'Oi' },
      );

      expect(result).toEqual({ sent: 0, failed: 1 });
      expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });

    it('tallies mixed outcomes across multiple subscriptions independently', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      mockedWebpush.sendNotification
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce({ statusCode: 410 })
        .mockResolvedValueOnce({} as any);

      const result = await service.sendToSubs(
        [
          { endpoint: 'ep-1', p256dh: 'p', auth: 'a' },
          { endpoint: 'ep-2', p256dh: 'p', auth: 'a' },
          { endpoint: 'ep-3', p256dh: 'p', auth: 'a' },
        ],
        { title: 'Oi' },
      );

      expect(result).toEqual({ sent: 2, failed: 1 });
    });
  });

  describe('sendToUser', () => {
    it('loads the user\'s subscriptions and fans out to sendToSubs', async () => {
      process.env.VAPID_PUBLIC_KEY = 'pub-key';
      process.env.VAPID_PRIVATE_KEY = 'priv-key';
      service.onModuleInit();
      prisma.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'ep-1', p256dh: 'p', auth: 'a' },
      ]);
      mockedWebpush.sendNotification.mockResolvedValue({} as any);

      const result = await service.sendToUser('user-1', { title: 'Oi' });

      expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({ sent: 1, failed: 0 });
    });
  });
});
