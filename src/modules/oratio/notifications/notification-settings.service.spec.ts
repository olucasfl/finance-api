import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettingsService,
} from './notification-settings.service';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  let prisma: { notificationSettings: { upsert: jest.Mock } };

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'default',
    maxPerDay: 2,
    maxNudgesPerDay: 1,
    quietStart: 22,
    quietEnd: 7,
    spacingHours: 6,
    restGapEnabled: true,
    urgentThreshold: 80,
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      notificationSettings: { upsert: jest.fn().mockResolvedValue(row()) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationSettingsService);
  });

  it('lazily upserts the singleton row and returns its knob values', async () => {
    const cfg = await service.get();

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'default' }, create: { id: 'default' } }),
    );
    expect(cfg).toEqual({
      maxPerDay: 2,
      maxNudgesPerDay: 1,
      quietStart: 22,
      quietEnd: 7,
      spacingHours: 6,
      restGapEnabled: true,
      urgentThreshold: 80,
    });
  });

  it('reflects a customised row', async () => {
    prisma.notificationSettings.upsert.mockResolvedValue(
      row({ maxPerDay: 5, quietStart: 21, restGapEnabled: false }),
    );

    const cfg = await service.get();

    expect(cfg.maxPerDay).toBe(5);
    expect(cfg.quietStart).toBe(21);
    expect(cfg.restGapEnabled).toBe(false);
  });

  it('caches the row for ~60s instead of hitting the database every call', async () => {
    await service.get();
    await service.get();
    await service.get();

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledTimes(1);
  });

  it('re-reads after invalidate()', async () => {
    await service.get();
    service.invalidate();
    await service.get();

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledTimes(2);
  });

  it('re-reads once the cache TTL has elapsed', async () => {
    jest.useFakeTimers();
    try {
      await service.get();
      jest.advanceTimersByTime(61_000);
      await service.get();
      expect(prisma.notificationSettings.upsert).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('falls back to the built-in defaults when the database read fails, without caching the fallback', async () => {
    prisma.notificationSettings.upsert.mockRejectedValueOnce(new Error('db down'));

    const cfg = await service.get();
    expect(cfg).toEqual(DEFAULT_NOTIFICATION_SETTINGS);

    // fallback não deve "grudar": a próxima chamada tenta o banco de novo
    prisma.notificationSettings.upsert.mockResolvedValue(row({ maxPerDay: 9 }));
    const cfg2 = await service.get();
    expect(cfg2.maxPerDay).toBe(9);
  });
});
