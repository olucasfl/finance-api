import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrayersController } from './prayers.controller';
import { PrayersService } from './prayers.service';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from 'src/modules/auth/admin.guard';

describe('PrayersController', () => {
  let controller: PrayersController;
  let service: {
    createCategory: jest.Mock;
    getCategories: jest.Mock;
    createPrayer: jest.Mock;
    getPrayersByCategory: jest.Mock;
    getHistory: jest.Mock;
    getPrayer: jest.Mock;
    completePrayer: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createCategory: jest.fn(),
      getCategories: jest.fn(),
      createPrayer: jest.fn(),
      getPrayersByCategory: jest.fn(),
      getHistory: jest.fn(),
      getPrayer: jest.fn(),
      completePrayer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrayersController],
      providers: [{ provide: PrayersService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PrayersController>(PrayersController);
  });

  describe('getPrayers', () => {
    it('rejects the request when no category slug is given', () => {
      expect(() => controller.getPrayers(undefined as any)).toThrow(BadRequestException);
      expect(service.getPrayersByCategory).not.toHaveBeenCalled();
    });

    it('delegates to the service with the given slug', () => {
      controller.getPrayers('marianas');
      expect(service.getPrayersByCategory).toHaveBeenCalledWith('marianas');
    });
  });

  describe('getHistory', () => {
    it('passes the authenticated user id to the service', () => {
      controller.getHistory({ user: { userId: 'user-1' } });
      expect(service.getHistory).toHaveBeenCalledWith('user-1');
    });
  });

  describe('completePrayer', () => {
    it('passes the authenticated user id to the service', () => {
      controller.completePrayer({ user: { userId: 'user-1' } });
      expect(service.completePrayer).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPrayer', () => {
    it('delegates to the service with the given id', () => {
      controller.getPrayer('prayer-1');
      expect(service.getPrayer).toHaveBeenCalledWith('prayer-1');
    });
  });

  describe('createCategory / createPrayer / getCategories', () => {
    it('delegates category creation to the service', () => {
      const body = { name: 'Marianas', slug: 'marianas' } as any;
      controller.createCategory(body);
      expect(service.createCategory).toHaveBeenCalledWith(body);
    });

    it('delegates prayer creation to the service', () => {
      const body = { title: 'Ave Maria', content: '...', categoryId: 'c1' } as any;
      controller.createPrayer(body);
      expect(service.createPrayer).toHaveBeenCalledWith(body);
    });

    it('delegates listing categories to the service', () => {
      controller.getCategories();
      expect(service.getCategories).toHaveBeenCalled();
    });
  });
});
