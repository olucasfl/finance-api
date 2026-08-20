import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from 'src/prisma/prisma.service';

const DAY_MS = 1000 * 60 * 60 * 24;

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: {
    spiritualStats: { findUnique: jest.Mock; upsert: jest.Mock };
    userActivity: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      spiritualStats: { findUnique: jest.fn(), upsert: jest.fn() },
      userActivity: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('updateLoginStreak', () => {
    it('starts the streak at 1 for a user with no SpiritualStats row yet', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue(null);

      await service.updateLoginStreak('user-1');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { prayerStreak: 1, lastLoginDate: expect.any(Date) },
        create: { userId: 'user-1', prayerStreak: 1, lastLoginDate: expect.any(Date) },
      });
    });

    it('increments the streak when the last login was exactly one Brazil calendar day ago', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 4,
        lastLoginDate: new Date(Date.now() - DAY_MS),
      });

      await service.updateLoginStreak('user-1');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ prayerStreak: 5 }),
        }),
      );
    });

    it('does nothing when the user already logged in today (same Brazil calendar day)', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 4,
        lastLoginDate: new Date(),
      });

      await service.updateLoginStreak('user-1');

      expect(prisma.spiritualStats.upsert).not.toHaveBeenCalled();
    });

    it('resets the streak to 1 when more than a day was skipped', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 10,
        lastLoginDate: new Date(Date.now() - 3 * DAY_MS),
      });

      await service.updateLoginStreak('user-1');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ prayerStreak: 1 }),
        }),
      );
    });

    it('starts at 1 when the stats row exists but has never recorded a login date', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue({
        prayerStreak: 0,
        lastLoginDate: null,
      });

      await service.updateLoginStreak('user-1');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ prayerStreak: 1 }),
        }),
      );
    });
  });

  describe('log', () => {
    it('records the activity row with the given type and action', async () => {
      prisma.userActivity.create.mockResolvedValue({ id: 'a1' });

      await service.log('user-1', 'PRAYER', 'Oração rezada');

      expect(prisma.userActivity.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: 'PRAYER', action: 'Oração rezada' },
      });
    });

    it('also updates the login streak when the activity type is LOGIN', async () => {
      prisma.userActivity.create.mockResolvedValue({ id: 'a1' });
      prisma.spiritualStats.findUnique.mockResolvedValue(null);

      await service.log('user-1', 'LOGIN', 'Entrou no app');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalled();
    });

    it('does not touch the login streak for a non-LOGIN activity', async () => {
      prisma.userActivity.create.mockResolvedValue({ id: 'a1' });

      await service.log('user-1', 'PRAYER', 'Oração rezada');

      expect(prisma.spiritualStats.findUnique).not.toHaveBeenCalled();
      expect(prisma.spiritualStats.upsert).not.toHaveBeenCalled();
    });

    it('returns the created activity row', async () => {
      const created = { id: 'a1', type: 'PRAYER' };
      prisma.userActivity.create.mockResolvedValue(created);

      await expect(service.log('user-1', 'PRAYER', 'Oração rezada')).resolves.toBe(created);
    });
  });
});
