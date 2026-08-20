import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsecrationService } from './consecration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

/*
"Hoje" fixo em 2026-03-15 meio-dia no Brasil (UTC-3, sem horário de
verão desde 2019/2020) via fake timers — evita que os testes de
diferença de dias dependam do fuso horário da máquina que roda o teste
ou do dia real em que o teste é executado.
*/
const FAKE_NOW_UTC = Date.UTC(2026, 2, 15, 15, 0, 0); // 2026-03-15T12:00:00-03:00

function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0);
}

describe('ConsecrationService', () => {
  let service: ConsecrationService;
  let prisma: {
    consecrationProgress: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    consecrationCompletedDay: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
    consecrationStage: { findMany: jest.Mock; create: jest.Mock };
    consecrationDay: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    prayer: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    dayPrayer: { create: jest.Mock; update: jest.Mock };
  };
  let activityService: { log: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FAKE_NOW_UTC));

    prisma = {
      consecrationProgress: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      consecrationCompletedDay: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      consecrationStage: { findMany: jest.fn(), create: jest.fn() },
      consecrationDay: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      prayer: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      dayPrayer: { create: jest.fn(), update: jest.fn() },
    };

    activityService = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsecrationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<ConsecrationService>(ConsecrationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start', () => {
    it('creates a new progress row and logs the activity when none exists yet', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);
      prisma.consecrationProgress.create.mockResolvedValue({ id: 'p1', userId: 'u1' });

      const result = await service.start('u1', localDate(2026, 3, 15));

      expect(prisma.consecrationProgress.create).toHaveBeenCalledWith({
        data: { userId: 'u1', startDate: localDate(2026, 3, 15) },
      });
      expect(activityService.log).toHaveBeenCalledWith('u1', 'CONSECRATION', 'Iniciou a consagração');
      expect(result).toEqual({ id: 'p1', userId: 'u1' });
    });

    it('is idempotent: returns the existing progress instead of starting over when one is already active', async () => {
      const existing = { id: 'p1', userId: 'u1', completedAt: null };
      prisma.consecrationProgress.findUnique.mockResolvedValue(existing);

      const result = await service.start('u1', localDate(2026, 3, 15));

      expect(result).toBe(existing);
      expect(prisma.consecrationProgress.create).not.toHaveBeenCalled();
    });

    it('wipes the old finished run (progress + completed days) before starting a new one', async () => {
      const finished = { id: 'old', userId: 'u1', completedAt: new Date(FAKE_NOW_UTC) };
      prisma.consecrationProgress.findUnique.mockResolvedValue(finished);
      prisma.consecrationProgress.create.mockResolvedValue({ id: 'new', userId: 'u1' });

      await service.start('u1', localDate(2026, 3, 15));

      expect(prisma.consecrationCompletedDay.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(prisma.consecrationProgress.delete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(prisma.consecrationProgress.create).toHaveBeenCalled();
    });
  });

  describe('progress', () => {
    it('reports not started when there is no progress row', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);
      prisma.consecrationStage.findMany.mockResolvedValue([{ id: 's1' }]);

      const result = await service.progress('u1');

      expect(result).toEqual({ started: false, stages: [{ id: 's1' }] });
    });

    it('reports day 1, startedToday true, on the day the consecration starts', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 3, 15),
        completedAt: null,
      });
      prisma.consecrationStage.findMany.mockResolvedValue([]);
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([]);

      const result = await service.progress('u1');

      expect(result.started).toBe(true);
      expect(result.currentDay).toBe(1);
      expect(result.startedToday).toBe(true);
      expect(result.daysUntilStart).toBe(0);
      expect(result.finished).toBe(false);
    });

    it('reports the right currentDay a few days into the consecration', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 3, 11), // 4 days before the fixed "today"
        completedAt: null,
      });
      prisma.consecrationStage.findMany.mockResolvedValue([]);
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([
        { dayNumber: 1 }, { dayNumber: 2 },
      ]);

      const result = await service.progress('u1');

      expect(result.currentDay).toBe(5);
      expect(result.startedToday).toBe(false);
      expect(result.daysUntilStart).toBe(0);
      expect(result.completedDays).toEqual([1, 2]);
      expect(result.progress).toBe(Math.floor((2 / 33) * 100));
    });

    it('reports daysUntilStart and currentDay 0 when the chosen start date is still in the future', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 3, 17), // 2 days after the fixed "today"
        completedAt: null,
      });
      prisma.consecrationStage.findMany.mockResolvedValue([]);

      const result = await service.progress('u1');

      expect(result.currentDay).toBe(0);
      expect(result.daysUntilStart).toBe(2);
    });

    it('reports finished true and a formatted completedAt once the consecration is done', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 2, 10),
        completedAt: localDate(2026, 3, 14),
      });
      prisma.consecrationStage.findMany.mockResolvedValue([]);

      const result = await service.progress('u1');

      expect(result.finished).toBe(true);
      expect(result.completedAt).toBe('2026-03-14');
    });
  });

  describe('findDay', () => {
    it('returns the day when it exists', async () => {
      const day = { id: 'd1', dayNumber: 3 };
      prisma.consecrationDay.findFirst.mockResolvedValue(day);

      await expect(service.findDay(3)).resolves.toBe(day);
    });

    it('throws NotFoundException when the day does not exist', async () => {
      prisma.consecrationDay.findFirst.mockResolvedValue(null);

      await expect(service.findDay(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('today', () => {
    it('returns null when the consecration has not started', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);

      await expect(service.today('u1')).resolves.toBeNull();
    });

    it('returns null before the consecration officially begins', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 3, 17),
      });

      await expect(service.today('u1')).resolves.toBeNull();
    });

    it('returns null once the 33 days are over', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2025, 1, 1),
      });

      await expect(service.today('u1')).resolves.toBeNull();
    });

    it("returns today's day content while within the 33-day window", async () => {
      const day = { id: 'd5', dayNumber: 5 };
      prisma.consecrationProgress.findUnique.mockResolvedValue({
        userId: 'u1',
        startDate: localDate(2026, 3, 11), // diff = 5
      });
      prisma.consecrationDay.findFirst.mockResolvedValue(day);

      await expect(service.today('u1')).resolves.toBe(day);
      expect(prisma.consecrationDay.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dayNumber: 5 } }),
      );
    });
  });

  describe('reset', () => {
    it('deletes completed days and the progress row', async () => {
      const result = await service.reset('u1');

      expect(prisma.consecrationCompletedDay.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(prisma.consecrationProgress.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(result).toEqual({ success: true });
    });
  });

  describe('finish', () => {
    it('throws NotFoundException when the consecration was never started', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);

      await expect(service.finish('u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is idempotent: returns the already-finished progress without re-updating it', async () => {
      const finished = { id: 'p1', userId: 'u1', completedAt: new Date(FAKE_NOW_UTC) };
      prisma.consecrationProgress.findUnique.mockResolvedValue(finished);

      const result = await service.finish('u1');

      expect(result).toBe(finished);
      expect(prisma.consecrationProgress.update).not.toHaveBeenCalled();
    });

    it('refuses to finish before all 33 days are completed', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.count.mockResolvedValue(32);

      await expect(service.finish('u1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.consecrationProgress.update).not.toHaveBeenCalled();
    });

    it('marks the progress as completed, keeping the row, once all 33 days are done', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.count.mockResolvedValue(33);
      prisma.consecrationProgress.update.mockResolvedValue({ id: 'p1', userId: 'u1', completedAt: new Date() });

      await service.finish('u1');

      expect(prisma.consecrationProgress.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { completedAt: expect.any(Date) },
      });
      expect(activityService.log).toHaveBeenCalledWith(
        'u1', 'CONSECRATION', expect.stringContaining('Concluiu'),
      );
    });
  });

  describe('completeDay', () => {
    const activeProgress = { id: 'p1', userId: 'u1', startDate: localDate(2026, 3, 11), completedAt: null }; // diff = 5

    it('throws BadRequestException when there is no active consecration', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);

      await expect(service.completeDay('u1', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when the consecration is already finished', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ ...activeProgress, completedAt: new Date() });

      await expect(service.completeDay('u1', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to complete a day that has not been reached yet', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(activeProgress); // diff = 5
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([]);

      await expect(service.completeDay('u1', 6)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is idempotent: re-completing an already-completed day returns the existing row instead of erroring', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(activeProgress);
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }, { dayNumber: 2 }]);
      prisma.consecrationCompletedDay.findUnique.mockResolvedValue({ id: 'cd1', dayNumber: 2 });

      const result = await service.completeDay('u1', 2);

      expect(result).toEqual({ id: 'cd1', dayNumber: 2 });
      expect(prisma.consecrationCompletedDay.create).not.toHaveBeenCalled();
    });

    it('refuses to skip ahead: only the next expected day can be completed', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(activeProgress);
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }]);

      // next expected is day 2, attempting day 4 (already reached per diff=5, but out of order)
      await expect(service.completeDay('u1', 4)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('completes the next expected day and logs the activity', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(activeProgress);
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }]);
      prisma.consecrationCompletedDay.create.mockResolvedValue({ id: 'cd2', dayNumber: 2 });

      const result = await service.completeDay('u1', 2);

      expect(prisma.consecrationCompletedDay.create).toHaveBeenCalledWith({
        data: { userId: 'u1', dayNumber: 2 },
      });
      expect(activityService.log).toHaveBeenCalledWith('u1', 'CONSECRATION', expect.stringContaining('2/33'));
      expect(result).toEqual({ id: 'cd2', dayNumber: 2 });
    });
  });

  describe('uncompleteDay', () => {
    it('refuses to change days once the consecration is finished', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ userId: 'u1', completedAt: new Date() });

      await expect(service.uncompleteDay('u1', 2)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('only allows undoing the last completed day, not one in the middle', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }, { dayNumber: 2 }, { dayNumber: 3 }]);

      await expect(service.uncompleteDay('u1', 2)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses when there is nothing completed yet', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([]);

      await expect(service.uncompleteDay('u1', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes the last completed day when everything checks out', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }, { dayNumber: 2 }]);
      prisma.consecrationCompletedDay.findUnique.mockResolvedValue({ id: 'cd2', dayNumber: 2 });

      await service.uncompleteDay('u1', 2);

      expect(prisma.consecrationCompletedDay.delete).toHaveBeenCalledWith({ where: { id: 'cd2' } });
    });

    it('throws NotFoundException if the row was already gone (race condition)', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ userId: 'u1', completedAt: null });
      prisma.consecrationCompletedDay.findMany.mockResolvedValue([{ dayNumber: 1 }]);
      prisma.consecrationCompletedDay.findUnique.mockResolvedValue(null);

      await expect(service.uncompleteDay('u1', 1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStartDate', () => {
    it('throws NotFoundException when there is no progress to update', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue(null);

      await expect(service.updateStartDate('u1', localDate(2026, 3, 1))).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to change the date of an already-finished consecration', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1', completedAt: new Date() });

      await expect(service.updateStartDate('u1', localDate(2026, 3, 1))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the start date and wipes completed days so progress recalculates cleanly', async () => {
      prisma.consecrationProgress.findUnique.mockResolvedValue({ id: 'p1', userId: 'u1', completedAt: null });

      const result = await service.updateStartDate('u1', localDate(2026, 3, 1));

      expect(prisma.consecrationProgress.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { startDate: localDate(2026, 3, 1) },
      });
      expect(prisma.consecrationCompletedDay.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(result).toEqual({ success: true });
    });
  });

  describe('admin CRUD passthroughs', () => {
    it('createStage creates a stage', async () => {
      prisma.consecrationStage.create.mockResolvedValue({ id: 's1' });
      const dto = { title: 'Semana 1', order: 1, days: 7 } as any;

      await expect(service.createStage(dto)).resolves.toEqual({ id: 's1' });
      expect(prisma.consecrationStage.create).toHaveBeenCalledWith({ data: dto });
    });

    it('createDay creates a day', async () => {
      prisma.consecrationDay.create.mockResolvedValue({ id: 'd1' });
      const dto = { dayNumber: 1, stageId: 's1' } as any;

      await expect(service.createDay(dto)).resolves.toEqual({ id: 'd1' });
    });

    it('createPrayer creates a prayer', async () => {
      prisma.prayer.create.mockResolvedValue({ id: 'pr1' });
      const dto = { title: 'Ave Maria', content: '...' } as any;

      await expect(service.createPrayer(dto)).resolves.toEqual({ id: 'pr1' });
    });

    it('addPrayerToDay links a prayer to a day', async () => {
      prisma.dayPrayer.create.mockResolvedValue({ id: 'dp1' });
      const dto = { dayId: 'd1', prayerId: 'pr1', order: 1 } as any;

      await expect(service.addPrayerToDay(dto)).resolves.toEqual({ id: 'dp1' });
    });

    it('updateDayPrayer updates the order', async () => {
      prisma.dayPrayer.update.mockResolvedValue({ id: 'dp1', order: 2 });

      await expect(service.updateDayPrayer('dp1', 2)).resolves.toEqual({ id: 'dp1', order: 2 });
      expect(prisma.dayPrayer.update).toHaveBeenCalledWith({ where: { id: 'dp1' }, data: { order: 2 } });
    });

    it('updatePrayer throws NotFoundException for a missing prayer', async () => {
      prisma.prayer.findUnique.mockResolvedValue(null);

      await expect(service.updatePrayer('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updatePrayer updates an existing prayer', async () => {
      prisma.prayer.findUnique.mockResolvedValue({ id: 'pr1' });
      prisma.prayer.update.mockResolvedValue({ id: 'pr1', title: 'Novo título' });

      await expect(service.updatePrayer('pr1', { title: 'Novo título' })).resolves.toEqual({
        id: 'pr1', title: 'Novo título',
      });
    });

    it('getFullConsecration returns the ordered stages tree', async () => {
      prisma.consecrationStage.findMany.mockResolvedValue([{ id: 's1' }]);

      await expect(service.getFullConsecration()).resolves.toEqual([{ id: 's1' }]);
    });

    it('getStageDays returns days for a stage', async () => {
      prisma.consecrationDay.findMany.mockResolvedValue([{ id: 'd1' }]);

      await expect(service.getStageDays('s1')).resolves.toEqual([{ id: 'd1' }]);
      expect(prisma.consecrationDay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stageId: 's1' } }),
      );
    });

    it('getAllDays returns every day with its prayers and stage', async () => {
      prisma.consecrationDay.findMany.mockResolvedValue([{ id: 'd1' }]);

      await expect(service.getAllDays()).resolves.toEqual([{ id: 'd1' }]);
    });
  });
});
