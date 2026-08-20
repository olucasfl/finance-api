import { Test, TestingModule } from '@nestjs/testing';
import { LiturgiaController } from './liturgia.controller';
import { LiturgiaService } from './liturgia.service';

describe('LiturgiaController', () => {
  let controller: LiturgiaController;
  let service: { getToday: jest.Mock; getByDate: jest.Mock; getFull: jest.Mock };

  beforeEach(async () => {
    service = { getToday: jest.fn(), getByDate: jest.fn(), getFull: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiturgiaController],
      providers: [{ provide: LiturgiaService, useValue: service }],
    }).compile();

    controller = module.get<LiturgiaController>(LiturgiaController);
  });

  describe('getToday', () => {
    it('fetches by explicit date when dia/mes/ano are all given', () => {
      controller.getToday('25', '12', '2026');

      expect(service.getByDate).toHaveBeenCalledWith('25', '12', '2026');
      expect(service.getToday).not.toHaveBeenCalled();
    });

    it("falls back to today's liturgy when any of dia/mes/ano is missing", () => {
      controller.getToday('25', undefined, '2026');

      expect(service.getToday).toHaveBeenCalled();
      expect(service.getByDate).not.toHaveBeenCalled();
    });

    it("falls back to today's liturgy when no date parts are given at all", () => {
      controller.getToday();

      expect(service.getToday).toHaveBeenCalled();
      expect(service.getByDate).not.toHaveBeenCalled();
    });
  });

  describe('getFull', () => {
    it('delegates to the service with the given date', () => {
      controller.getFull('25', '12', '2026');
      expect(service.getFull).toHaveBeenCalledWith('25', '12', '2026');
    });
  });
});
