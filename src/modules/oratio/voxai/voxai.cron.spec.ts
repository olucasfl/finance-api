import { Test, TestingModule } from '@nestjs/testing';
import { VoxAiCron } from './voxai.cron';
import { LiturgicalCalendarService } from './services/liturgical-calendar.service';

describe('VoxAiCron', () => {
  let cron: VoxAiCron;
  let liturgicalCalendarService: { getLiturgicalData: jest.Mock };

  beforeEach(async () => {
    liturgicalCalendarService = { getLiturgicalData: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoxAiCron,
        { provide: LiturgicalCalendarService, useValue: liturgicalCalendarService },
      ],
    }).compile();

    cron = module.get<VoxAiCron>(VoxAiCron);
  });

  describe('onApplicationBootstrap', () => {
    it("warms today's liturgical cache on startup", async () => {
      liturgicalCalendarService.getLiturgicalData.mockResolvedValue({ data: 'x' });

      await cron.onApplicationBootstrap();

      expect(liturgicalCalendarService.getLiturgicalData).toHaveBeenCalledTimes(1);
    });

    it('does not throw when the warmup fails', async () => {
      liturgicalCalendarService.getLiturgicalData.mockRejectedValue(new Error('API down'));

      await expect(cron.onApplicationBootstrap()).resolves.toBeUndefined();
    });
  });

  describe('handleMidnightWarmup', () => {
    it('warms the cache when the scheduled job fires', async () => {
      liturgicalCalendarService.getLiturgicalData.mockResolvedValue({ data: 'x' });

      await cron.handleMidnightWarmup();

      expect(liturgicalCalendarService.getLiturgicalData).toHaveBeenCalledTimes(1);
    });

    it('swallows a failure instead of letting the scheduled job crash', async () => {
      liturgicalCalendarService.getLiturgicalData.mockRejectedValue(new Error('API down'));

      await expect(cron.handleMidnightWarmup()).resolves.toBeUndefined();
    });
  });

});
