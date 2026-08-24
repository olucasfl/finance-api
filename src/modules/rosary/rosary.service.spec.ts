import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RosaryService } from './rosary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../oratio/activity/activity.service';

describe('RosaryService', () => {
  let service: RosaryService;
  let prisma: {
    rosarySession: {
      deleteMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
    spiritualStats: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let activityService: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      rosarySession: {
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      spiritualStats: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    activityService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RosaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<RosaryService>(RosaryService);
  });

  describe('getRosary', () => {
    it('returns the built step sequence for a known type', () => {
      const steps = service.getRosary('gozosos');
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('returns the built sequence for each non-default devotion type', () => {
      const types = [
        'sete-dores', 'misericordia', 'sagrado-coracao', 'sao-jose',
        'sao-miguel', 'sao-bento', 'espirito-santo', 'coroa-lagrimas', 'via-sacra',
      ];

      for (const type of types) {
        expect(service.getRosary(type).length).toBeGreaterThan(0);
      }
    });

    it('throws NotFoundException for an unknown type', () => {
      expect(() => service.getRosary('nao-existe')).toThrow(NotFoundException);
    });
  });

  describe('start', () => {
    it('reuses an existing in-progress session instead of creating a new one', async () => {
      const existing = {
        id: 'session-1',
        userId: 'user-1',
        type: 'gozosos',
        startedAt: new Date(),
      };
      prisma.rosarySession.findFirst.mockResolvedValue(existing);

      const result = await service.start('user-1', 'gozosos');

      expect(result).toBe(existing);
      expect(prisma.rosarySession.create).not.toHaveBeenCalled();
    });

    it('creates a new session and logs the activity when none exists', async () => {
      prisma.rosarySession.findFirst.mockResolvedValue(null);
      const created = { id: 'session-2', userId: 'user-1', type: 'gozosos' };
      prisma.rosarySession.create.mockResolvedValue(created);

      const result = await service.start('user-1', 'gozosos');

      expect(prisma.rosarySession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: 'gozosos' },
      });
      expect(activityService.log).toHaveBeenCalledWith('user-1', 'ROSARY', 'Iniciou o terço');
      expect(result).toBe(created);
    });

    it('deletes incomplete sessions of that type before creating a fresh one when restart is requested', async () => {
      const created = { id: 'session-3', userId: 'user-1', type: 'gozosos' };
      prisma.rosarySession.create.mockResolvedValue(created);

      await service.start('user-1', 'gozosos', true);

      expect(prisma.rosarySession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: 'gozosos', completed: false },
      });
      // restart skips the "reuse existing" lookup entirely
      expect(prisma.rosarySession.findFirst).not.toHaveBeenCalled();
      expect(prisma.rosarySession.create).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns null when there is no in-progress session', async () => {
      prisma.rosarySession.findFirst.mockResolvedValue(null);

      const result = await service.getSession('user-1', 'gozosos');

      expect(result).toBeNull();
    });

    it('returns the session when it was started recently', async () => {
      const recent = {
        id: 'session-1',
        startedAt: new Date(Date.now() - 60_000), // 1 minute ago
      };
      prisma.rosarySession.findFirst.mockResolvedValue(recent);

      const result = await service.getSession('user-1', 'gozosos');

      expect(result).toBe(recent);
      expect(prisma.rosarySession.delete).not.toHaveBeenCalled();
    });

    it('discards and returns null for a session abandoned more than 12 hours ago', async () => {
      const stale = {
        id: 'session-1',
        startedAt: new Date(Date.now() - 13 * 60 * 60 * 1000), // 13 hours ago
      };
      prisma.rosarySession.findFirst.mockResolvedValue(stale);

      const result = await service.getSession('user-1', 'gozosos');

      expect(result).toBeNull();
      expect(prisma.rosarySession.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
    });
  });

  describe('updateStep', () => {
    it('returns null when there is no session to update', async () => {
      prisma.rosarySession.findFirst.mockResolvedValue(null);

      const result = await service.updateStep('user-1', 'gozosos', 3);

      expect(result).toBeNull();
      expect(prisma.rosarySession.update).not.toHaveBeenCalled();
    });

    it('updates the current step, and elapsedSeconds only when provided', async () => {
      const session = { id: 'session-1', startedAt: new Date() };
      prisma.rosarySession.findFirst.mockResolvedValue(session);
      prisma.rosarySession.update.mockResolvedValue({ ...session, currentStep: 3 });

      await service.updateStep('user-1', 'gozosos', 3);

      expect(prisma.rosarySession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { currentStep: 3 },
      });
    });

    it('includes elapsedSeconds in the update payload when given', async () => {
      const session = { id: 'session-1', startedAt: new Date() };
      prisma.rosarySession.findFirst.mockResolvedValue(session);
      prisma.rosarySession.update.mockResolvedValue({ ...session });

      await service.updateStep('user-1', 'gozosos', 3, 120);

      expect(prisma.rosarySession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { currentStep: 3, elapsedSeconds: 120 },
      });
    });
  });

  describe('getActiveProgress', () => {
    it('keeps only the most recent session per type, dropping older duplicates', async () => {
      const older = { type: 'gozosos', currentStep: 2, startedAt: new Date(Date.now() - 5000) };
      const newer = { type: 'gozosos', currentStep: 5, startedAt: new Date() };
      prisma.rosarySession.findMany.mockResolvedValue([newer, older]);

      const result = await service.getActiveProgress('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].currentStep).toBe(5);
    });

    it('excludes sessions that have not been started (currentStep 0)', async () => {
      prisma.rosarySession.findMany.mockResolvedValue([
        { type: 'gozosos', currentStep: 0, startedAt: new Date() },
      ]);

      const result = await service.getActiveProgress('user-1');

      expect(result).toEqual([]);
    });

    it('excludes a session whose type no longer maps to a buildable rosary', async () => {
      prisma.rosarySession.findMany.mockResolvedValue([
        { type: 'tipo-removido', currentStep: 3, startedAt: new Date() },
      ]);

      const result = await service.getActiveProgress('user-1');

      expect(result).toEqual([]);
    });

    it('reports the total step count for a valid, in-progress type', async () => {
      prisma.rosarySession.findMany.mockResolvedValue([
        { type: 'gozosos', currentStep: 3, startedAt: new Date() },
      ]);

      const result = await service.getActiveProgress('user-1');

      expect(result).toEqual([
        { type: 'gozosos', currentStep: 3, totalSteps: expect.any(Number) },
      ]);
      expect(result[0].totalSteps).toBeGreaterThan(0);
    });
  });

  describe('getHistory', () => {
    it('fetches only completed sessions, newest first, capped at 50', async () => {
      prisma.rosarySession.findMany.mockResolvedValue([]);

      await service.getHistory('user-1');

      expect(prisma.rosarySession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', completed: true },
        orderBy: { finishedAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('finish', () => {
    it('throws NotFoundException when there is no session to finish', async () => {
      prisma.rosarySession.findFirst.mockResolvedValue(null);

      await expect(service.finish('user-1', 'gozosos')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks the session completed and creates fresh stats for a first-time pray-er', async () => {
      const session = { id: 'session-1', startedAt: new Date() };
      prisma.rosarySession.findFirst.mockResolvedValue(session);
      prisma.spiritualStats.findUnique.mockResolvedValue(null);

      const result = await service.finish('user-1', 'gozosos');

      expect(prisma.rosarySession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { completed: true, finishedAt: expect.any(Date) },
      });
      expect(prisma.spiritualStats.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', rosariesPrayed: 1, lastPrayerDate: expect.any(Date) },
      });
      expect(activityService.log).toHaveBeenCalledWith('user-1', 'ROSARY', 'Terço concluído');
      expect(result).toEqual({ success: true });
    });

    it('increments rosariesPrayed on existing stats instead of overwriting them', async () => {
      const session = { id: 'session-1', startedAt: new Date() };
      prisma.rosarySession.findFirst.mockResolvedValue(session);
      prisma.spiritualStats.findUnique.mockResolvedValue({ userId: 'user-1', rosariesPrayed: 4 });

      await service.finish('user-1', 'gozosos');

      expect(prisma.spiritualStats.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { rosariesPrayed: { increment: 1 }, lastPrayerDate: expect.any(Date) },
      });
      expect(prisma.spiritualStats.create).not.toHaveBeenCalled();
    });
  });

  describe('cleanupAbandonedSessions', () => {
    it('deletes incomplete sessions older than the abandoned-session window', async () => {
      prisma.rosarySession.deleteMany.mockResolvedValue({ count: 3 });

      await service.cleanupAbandonedSessions();

      expect(prisma.rosarySession.deleteMany).toHaveBeenCalledWith({
        where: { completed: false, startedAt: { lt: expect.any(Date) } },
      });
    });

    it('does not throw when nothing needed cleanup', async () => {
      prisma.rosarySession.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.cleanupAbandonedSessions()).resolves.toBeUndefined();
    });
  });
});
