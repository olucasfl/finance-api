import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: { log: jest.Mock };

  beforeEach(async () => {
    service = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [{ provide: ActivityService, useValue: service }],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  it('logs a LOGIN activity for the authenticated user', async () => {
    await controller.ping({ user: { userId: 'user-1' } });

    expect(service.log).toHaveBeenCalledWith('user-1', 'LOGIN', 'Entrou no app');
  });
});
