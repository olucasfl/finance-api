import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrayersService } from './prayers.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

describe('PrayersService', () => {
  let service: PrayersService;
  let prisma: {
    prayerCategory: { create: jest.Mock; findMany: jest.Mock };
    generalPrayer: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    spiritualStats: { upsert: jest.Mock };
    userActivity: { findMany: jest.Mock };
  };
  let activityService: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      prayerCategory: { create: jest.fn(), findMany: jest.fn() },
      generalPrayer: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      spiritualStats: { upsert: jest.fn() },
      userActivity: { findMany: jest.fn() },
    };
    activityService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrayersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<PrayersService>(PrayersService);
  });

  describe('getPrayersByCategory', () => {
    it('filters general prayers by the category slug, ordered by title', async () => {
      const prayers = [{ id: 'p1', title: 'Ave Maria' }];
      prisma.generalPrayer.findMany.mockResolvedValue(prayers);

      const result = await service.getPrayersByCategory('marianas');

      expect(prisma.generalPrayer.findMany).toHaveBeenCalledWith({
        where: { category: { slug: 'marianas' } },
        orderBy: { title: 'asc' },
      });
      expect(result).toBe(prayers);
    });
  });

  describe('getPrayer', () => {
    it('returns the prayer when it exists', async () => {
      const prayer = { id: 'p1', title: 'Pai Nosso' };
      prisma.generalPrayer.findUnique.mockResolvedValue(prayer);

      await expect(service.getPrayer('p1')).resolves.toBe(prayer);
    });

    it('throws NotFoundException when the prayer does not exist', async () => {
      prisma.generalPrayer.findUnique.mockResolvedValue(null);

      await expect(service.getPrayer('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('completePrayer', () => {
    it('increments prayersPrayed and logs the activity without the prayer title', async () => {
      prisma.spiritualStats.upsert.mockResolvedValue({});
      activityService.log.mockResolvedValue({});

      const result = await service.completePrayer('user-1');

      expect(prisma.spiritualStats.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          prayersPrayed: { increment: 1 },
          lastPrayerDate: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          prayersPrayed: 1,
          lastPrayerDate: expect.any(Date),
        },
      });

      expect(activityService.log).toHaveBeenCalledWith('user-1', 'PRAYER', 'Oração rezada');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getHistory', () => {
    it('returns the 50 most recent PRAYER activities for the user', async () => {
      const activities = [{ id: 'a1' }];
      prisma.userActivity.findMany.mockResolvedValue(activities);

      const result = await service.getHistory('user-1');

      expect(prisma.userActivity.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'PRAYER' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      expect(result).toBe(activities);
    });
  });

  describe('createCategory / createPrayer / getCategories', () => {
    it('creates a prayer category', async () => {
      const data = { name: 'Marianas', slug: 'marianas' } as any;
      prisma.prayerCategory.create.mockResolvedValue({ id: 'c1', ...data });

      await service.createCategory(data);

      expect(prisma.prayerCategory.create).toHaveBeenCalledWith({ data });
    });

    it('creates a general prayer', async () => {
      const data = { title: 'Ave Maria', content: '...', categoryId: 'c1' } as any;
      prisma.generalPrayer.create.mockResolvedValue({ id: 'p1', ...data });

      await service.createPrayer(data);

      expect(prisma.generalPrayer.create).toHaveBeenCalledWith({ data });
    });

    it('lists categories ordered by name', async () => {
      const categories = [{ id: 'c1', name: 'Marianas' }];
      prisma.prayerCategory.findMany.mockResolvedValue(categories);

      const result = await service.getCategories();

      expect(prisma.prayerCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toBe(categories);
    });
  });
});
