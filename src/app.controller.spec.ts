import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SystemLogService } from './system-log/system-log.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: { getHello: jest.Mock };
  let prisma: { $queryRaw: jest.Mock };
  let systemLog: { getRecent: jest.Mock };

  beforeEach(async () => {
    appService = { getHello: jest.fn().mockReturnValue('Hello World!') };
    prisma = { $queryRaw: jest.fn() };
    systemLog = { getRecent: jest.fn().mockReturnValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: appService },
        { provide: PrismaService, useValue: prisma },
        { provide: SystemLogService, useValue: systemLog },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('delegates to AppService', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });

  describe('healthCheck', () => {
    it('reports the database up when the ping query succeeds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);

      await expect(controller.healthCheck()).resolves.toEqual({
        status: 'OK',
        database: 'up',
      });
    });

    it('throws ServiceUnavailableException when the ping query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(controller.healthCheck()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('testCrash', () => {
    it('always throws — used to exercise the admin error panel', () => {
      expect(() => controller.testCrash()).toThrow('Erro simulado pra testar a aba Sistema');
    });
  });

  describe('getSystemStatus', () => {
    it('rejects a request with no authenticated user', async () => {
      await expect(controller.getSystemStatus({ user: undefined })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('reports database up and includes recent errors from the system log', async () => {
      prisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);
      systemLog.getRecent.mockReturnValue([{ message: 'boom' }]);

      const result = await controller.getSystemStatus({ user: { userId: 'admin-1' } });

      expect(result.database).toBe('up');
      expect(result.recentErrors).toEqual([{ message: 'boom' }]);
      expect(systemLog.getRecent).toHaveBeenCalledWith(50);
    });

    it('reports database down (without throwing) when the ping query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      const result = await controller.getSystemStatus({ user: { userId: 'admin-1' } });

      expect(result.database).toBe('down');
    });

    it('includes memory and uptime info', async () => {
      prisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);

      const result = await controller.getSystemStatus({ user: { userId: 'admin-1' } });

      expect(result.memory).toEqual(
        expect.objectContaining({
          rssMB: expect.any(Number),
          heapUsedMB: expect.any(Number),
          heapTotalMB: expect.any(Number),
        }),
      );
      expect(typeof result.uptimeSeconds).toBe('number');
    });
  });
});
