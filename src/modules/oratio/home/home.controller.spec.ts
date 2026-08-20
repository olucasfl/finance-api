import { Test, TestingModule } from '@nestjs/testing';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

describe('HomeController', () => {
  let controller: HomeController;
  let service: { feed: jest.Mock };

  beforeEach(async () => {
    service = { feed: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: service }],
    }).compile();

    controller = module.get<HomeController>(HomeController);
  });

  it('passes the authenticated user id to the service', () => {
    controller.feed({ user: { userId: 'user-1' } });
    expect(service.feed).toHaveBeenCalledWith('user-1');
  });
});
