import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuaresmaService } from './quaresma.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

/*
"Hoje" fixo em datas conhecidas da agenda 2026 (ver quaresma.schedule.spec.ts,
que já prova que 15/08/2026 é sábado = dia 1, 16/08 é domingo de descanso,
17/08 é o dia 2). Usar fake timers evita depender do dia real em que o
teste roda.
*/
function setBrazilNow(year: number, month: number, day: number) {
  // meio-dia no Brasil (UTC-3, sem horário de verão desde 2019/2020)
  jest.setSystemTime(new Date(Date.UTC(year, month - 1, day, 15, 0, 0)));
}

describe('QuaresmaService', () => {
  let service: QuaresmaService;
  let prisma: {
    quaresmaMichaelDay: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    quaresmaMichaelPenance: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let activityService: { log: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();

    prisma = {
      quaresmaMichaelDay: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      quaresmaMichaelPenance: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };

    activityService = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuaresmaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<QuaresmaService>(QuaresmaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getProgress', () => {
    it('reports the current day, totals and dates for the running edition', async () => {
      setBrazilNow(2026, 8, 19); // dia 4 (15=1, 17=2, 18=3, 19=4)
      prisma.quaresmaMichaelDay.findMany.mockResolvedValue([
        { dayNumber: 1 }, { dayNumber: 2 },
      ]);

      const result = await service.getProgress('u1');

      expect(result.year).toBe(2026);
      expect(result.today).toBe('2026-08-19');
      expect(result.totalDays).toBe(40);
      expect(result.startDate).toBe('2026-08-15');
      expect(result.endDate).toBe('2026-09-29');
      expect(result.feastDate).toBe('2026-09-29');
      expect(result.currentDay).toBe(4);
      expect(result.completedDays).toEqual([1, 2]);
      expect(result.remainingDays).toBe(38);
      expect(result.isRestDay).toBe(false);
    });

    it('marks a skipped Sunday as a rest day (no new day opens)', async () => {
      setBrazilNow(2026, 8, 16); // domingo pulado

      const result = await service.getProgress('u1');

      expect(result.isRestDay).toBe(true);
      expect(result.currentDay).toBe(1); // continua o dia 1 aberto no sábado
    });

    it('does NOT mark the one praying Sunday as a rest day', async () => {
      setBrazilNow(2026, 9, 27); // o único domingo que conta como dia de oração

      const result = await service.getProgress('u1');

      expect(result.isRestDay).toBe(false);
    });

    it('returns null penance when nothing was saved yet, and the content when it was', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelPenance.findUnique.mockResolvedValue({
        content: 'Jejum às sextas',
        updatedAt: new Date('2026-08-18'),
      });

      const result = await service.getProgress('u1');

      expect(result.penance).toBe('Jejum às sextas');
      expect(result.penanceUpdatedAt).toEqual(new Date('2026-08-18'));
    });

    it('scopes the lookups to the current year', async () => {
      setBrazilNow(2026, 8, 19);

      await service.getProgress('u1');

      expect(prisma.quaresmaMichaelDay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', year: 2026 } }),
      );
      expect(prisma.quaresmaMichaelPenance.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId_year: { userId: 'u1', year: 2026 } } }),
      );
    });
  });

  describe('completeDay', () => {
    it('rejects a day number outside the edition range', async () => {
      setBrazilNow(2026, 8, 19);

      await expect(service.completeDay('u1', 0)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.completeDay('u1', 41)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.completeDay('u1', 1.5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects any day before the edition has started', async () => {
      setBrazilNow(2026, 8, 1); // antes de 15/08

      await expect(service.completeDay('u1', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a day that hasn't opened yet", async () => {
      setBrazilNow(2026, 8, 19); // dia 4 aberto

      await expect(service.completeDay('u1', 5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is idempotent: re-completing an already-completed day returns the existing row', async () => {
      setBrazilNow(2026, 8, 19); // dia 4
      prisma.quaresmaMichaelDay.count.mockResolvedValue(2); // dias 1 e 2 já feitos
      prisma.quaresmaMichaelDay.findUnique.mockResolvedValue({ id: 'd2', dayNumber: 2 });

      const result = await service.completeDay('u1', 2);

      expect(result).toEqual({ id: 'd2', dayNumber: 2 });
      expect(prisma.quaresmaMichaelDay.create).not.toHaveBeenCalled();
    });

    it('refuses to skip ahead of the next expected day', async () => {
      setBrazilNow(2026, 8, 19); // dia 4 aberto
      prisma.quaresmaMichaelDay.count.mockResolvedValue(1); // só o dia 1 feito

      // dia 4 já abriu, mas o próximo esperado é o 2
      await expect(service.completeDay('u1', 4)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('completes the next expected day and logs the activity', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelDay.count.mockResolvedValue(1);
      prisma.quaresmaMichaelDay.create.mockResolvedValue({ id: 'd2', dayNumber: 2 });

      const result = await service.completeDay('u1', 2);

      expect(prisma.quaresmaMichaelDay.create).toHaveBeenCalledWith({
        data: { userId: 'u1', year: 2026, dayNumber: 2 },
      });
      expect(activityService.log).toHaveBeenCalledWith(
        'u1', 'QUARESMA_MICHAEL', expect.stringContaining('2/40'),
      );
      expect(result).toEqual({ id: 'd2', dayNumber: 2 });
    });
  });

  describe('uncompleteDay', () => {
    it('refuses when nothing has been completed yet', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelDay.count.mockResolvedValue(0);

      await expect(service.uncompleteDay('u1', 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('only allows undoing the last completed day', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelDay.count.mockResolvedValue(3);

      await expect(service.uncompleteDay('u1', 2)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes the last completed day', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelDay.count.mockResolvedValue(3);
      prisma.quaresmaMichaelDay.findUnique.mockResolvedValue({ id: 'd3', dayNumber: 3 });

      await service.uncompleteDay('u1', 3);

      expect(prisma.quaresmaMichaelDay.delete).toHaveBeenCalledWith({ where: { id: 'd3' } });
    });

    it('throws NotFoundException if the row is already gone', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelDay.count.mockResolvedValue(3);
      prisma.quaresmaMichaelDay.findUnique.mockResolvedValue(null);

      await expect(service.uncompleteDay('u1', 3)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('savePenance', () => {
    it('upserts the penance text scoped to the current year', async () => {
      setBrazilNow(2026, 8, 19);
      prisma.quaresmaMichaelPenance.upsert.mockResolvedValue({
        content: 'Jejum às sextas',
        updatedAt: new Date(),
      });

      await service.savePenance('u1', 'Jejum às sextas');

      expect(prisma.quaresmaMichaelPenance.upsert).toHaveBeenCalledWith({
        where: { userId_year: { userId: 'u1', year: 2026 } },
        update: { content: 'Jejum às sextas' },
        create: { userId: 'u1', year: 2026, content: 'Jejum às sextas' },
        select: { content: true, updatedAt: true },
      });
    });
  });
});
