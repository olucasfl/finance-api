import { Test, TestingModule } from '@nestjs/testing';
import { ConsecrationController } from './consecration.controller';
import { ConsecrationService } from './consecration.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ConsecrationController', () => {
  let controller: ConsecrationController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      start: jest.fn(),
      progress: jest.fn(),
      findDay: jest.fn(),
      today: jest.fn(),
      reset: jest.fn(),
      finish: jest.fn(),
      completeDay: jest.fn(),
      updateStartDate: jest.fn(),
      uncompleteDay: jest.fn(),
      createStage: jest.fn(),
      createDay: jest.fn(),
      createPrayer: jest.fn(),
      addPrayerToDay: jest.fn(),
      updateDayPrayer: jest.fn(),
      updatePrayer: jest.fn(),
      getFullConsecration: jest.fn(),
      getStageDays: jest.fn(),
      getAllDays: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsecrationController],
      providers: [
        { provide: ConsecrationService, useValue: service },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ConsecrationController>(ConsecrationController);
  });

  describe('start', () => {
    it('converts the chosen consecration date into a start date 33 days earlier', () => {
      const req = { user: { userId: 'u1' } };

      controller.start(req, { consecrationDate: '2026-04-17' } as any);

      const startDate: Date = service.start.mock.calls[0][1];
      expect(service.start).toHaveBeenCalledWith('u1', expect.any(Date));
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(2); // março (0-indexed)
      expect(startDate.getDate()).toBe(15);
    });
  });

  describe('updateStartDate', () => {
    it('converts the new consecration date into a start date 33 days earlier', () => {
      const req = { user: { userId: 'u1' } };

      controller.updateStartDate(req, { consecrationDate: '2026-05-01' } as any);

      const startDate: Date = service.updateStartDate.mock.calls[0][1];
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(2);
      expect(startDate.getDate()).toBe(29);
    });
  });

  describe('read-only routes delegate to the service with the right params', () => {
    it('getDay', () => {
      controller.getDay('5');
      expect(service.findDay).toHaveBeenCalledWith(5);
    });

    it('progress', () => {
      controller.progress({ user: { userId: 'u1' } });
      expect(service.progress).toHaveBeenCalledWith('u1');
    });

    it('today', () => {
      controller.today({ user: { userId: 'u1' } });
      expect(service.today).toHaveBeenCalledWith('u1');
    });
  });

  describe('write routes delegate to the service with the right params', () => {
    it('reset', () => {
      controller.reset({ user: { userId: 'u1' } });
      expect(service.reset).toHaveBeenCalledWith('u1');
    });

    it('finish', () => {
      controller.finish({ user: { userId: 'u1' } });
      expect(service.finish).toHaveBeenCalledWith('u1');
    });

    it('complete', () => {
      controller.complete({ user: { userId: 'u1' } }, '3');
      expect(service.completeDay).toHaveBeenCalledWith('u1', 3);
    });

    it('uncompleteDay', () => {
      controller.uncompleteDay({ user: { userId: 'u1' } }, '3');
      expect(service.uncompleteDay).toHaveBeenCalledWith('u1', 3);
    });
  });

  describe('admin routes delegate to the service', () => {
    it('createStage', () => {
      const dto = { title: 'Semana 1' } as any;
      controller.createStage(dto);
      expect(service.createStage).toHaveBeenCalledWith(dto);
    });

    it('createDay', () => {
      const dto = { dayNumber: 1 } as any;
      controller.createDay(dto);
      expect(service.createDay).toHaveBeenCalledWith(dto);
    });

    it('createPrayer', () => {
      const dto = { title: 'Ave Maria' } as any;
      controller.createPrayer(dto);
      expect(service.createPrayer).toHaveBeenCalledWith(dto);
    });

    it('addPrayerToDay', () => {
      const dto = { dayId: 'd1', prayerId: 'p1' } as any;
      controller.addPrayerToDay(dto);
      expect(service.addPrayerToDay).toHaveBeenCalledWith(dto);
    });

    it('updateDayPrayer', () => {
      controller.updateDayPrayer('dp1', { order: 2 });
      expect(service.updateDayPrayer).toHaveBeenCalledWith('dp1', 2);
    });

    it('updatePrayer', () => {
      controller.updatePrayer('p1', { title: 'Novo' });
      expect(service.updatePrayer).toHaveBeenCalledWith('p1', { title: 'Novo' });
    });

    it('getAll', () => {
      controller.getAll();
      expect(service.getFullConsecration).toHaveBeenCalled();
    });

    it('getStageDays', () => {
      controller.getStageDays('s1');
      expect(service.getStageDays).toHaveBeenCalledWith('s1');
    });

    it('getAllDays', () => {
      controller.getAllDays();
      expect(service.getAllDays).toHaveBeenCalled();
    });
  });
});
