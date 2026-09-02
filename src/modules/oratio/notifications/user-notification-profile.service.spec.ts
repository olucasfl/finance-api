import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserNotificationProfileService } from './user-notification-profile.service';

const DAY_MS = 24 * 60 * 60 * 1000;

// Constrói um Date UTC cuja hora local em São Paulo (UTC-3) é `hourBR`.
function atBrazilHour(hourBR: number, daysAgo = 1): Date {
  const d = new Date(Date.now() - daysAgo * DAY_MS);
  d.setUTCHours(hourBR + 3, 0, 0, 0); // BR = UTC-3
  return d;
}

describe('UserNotificationProfileService', () => {
  let service: UserNotificationProfileService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      userActivity: { findMany: jest.fn().mockResolvedValue([]) },
      userNotificationProfile: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve(create)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserNotificationProfileService);
  });

  describe('bandForHour', () => {
    it('maps hours to the three bands', () => {
      const s = service as any;
      expect(s.bandForHour(5)).toBe('MORNING');
      expect(s.bandForHour(11)).toBe('MORNING');
      expect(s.bandForHour(12)).toBe('AFTERNOON');
      expect(s.bandForHour(17)).toBe('AFTERNOON');
      expect(s.bandForHour(18)).toBe('EVENING');
      expect(s.bandForHour(23)).toBe('EVENING');
      expect(s.bandForHour(2)).toBe('EVENING'); // madrugada conta como noite
    });
  });

  describe('classifyBand', () => {
    it('is ANY when there is too little activity to be meaningful', async () => {
      prisma.userActivity.findMany.mockResolvedValue([
        { createdAt: atBrazilHour(9) },
        { createdAt: atBrazilHour(10) },
      ]);
      await expect(service.classifyBand('u1')).resolves.toBe('ANY');
    });

    it('returns the dominant band for a user who is mostly active in the morning', async () => {
      prisma.userActivity.findMany.mockResolvedValue([
        { createdAt: atBrazilHour(8) },
        { createdAt: atBrazilHour(9) },
        { createdAt: atBrazilHour(9) },
        { createdAt: atBrazilHour(10) },
        { createdAt: atBrazilHour(20) },
        { createdAt: atBrazilHour(15) },
      ]);
      await expect(service.classifyBand('u1')).resolves.toBe('MORNING');
    });

    it('only looks at roughly the last 30 days', async () => {
      await service.classifyBand('u1');
      const arg = prisma.userActivity.findMany.mock.calls[0][0];
      const cutoff = arg.where.createdAt.gte as Date;
      const daysBack = (Date.now() - cutoff.getTime()) / DAY_MS;
      expect(daysBack).toBeGreaterThan(29);
      expect(daysBack).toBeLessThan(31);
      expect(arg.where.userId).toBe('u1');
    });
  });

  describe('getBand', () => {
    it('returns the cached band without recomputing when the profile is fresh', async () => {
      prisma.userNotificationProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        activeBand: 'EVENING',
        bandComputedAt: new Date(Date.now() - 2 * DAY_MS),
      });

      await expect(service.getBand('u1')).resolves.toBe('EVENING');
      expect(prisma.userActivity.findMany).not.toHaveBeenCalled();
      expect(prisma.userNotificationProfile.upsert).not.toHaveBeenCalled();
    });

    it('recomputes and upserts when the profile is stale (> 7 days)', async () => {
      prisma.userNotificationProfile.findUnique.mockResolvedValue({
        userId: 'u1',
        activeBand: 'ANY',
        bandComputedAt: new Date(Date.now() - 10 * DAY_MS),
      });
      prisma.userActivity.findMany.mockResolvedValue(
        Array.from({ length: 6 }, () => ({ createdAt: atBrazilHour(20) })),
      );

      await expect(service.getBand('u1')).resolves.toBe('EVENING');
      expect(prisma.userNotificationProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1' },
          update: expect.objectContaining({ activeBand: 'EVENING' }),
        }),
      );
    });

    it('computes and upserts a profile that does not exist yet', async () => {
      prisma.userNotificationProfile.findUnique.mockResolvedValue(null);
      prisma.userActivity.findMany.mockResolvedValue([]);

      await expect(service.getBand('u1')).resolves.toBe('ANY');
      expect(prisma.userNotificationProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ userId: 'u1', activeBand: 'ANY' }),
        }),
      );
    });

    it('never throws — a classification failure falls back to ANY', async () => {
      prisma.userNotificationProfile.findUnique.mockRejectedValue(new Error('db down'));
      await expect(service.getBand('u1')).resolves.toBe('ANY');
    });
  });
});
