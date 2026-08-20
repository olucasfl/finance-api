import { Test, TestingModule } from '@nestjs/testing';
import { QuaresmaController } from './quaresma.controller';
import { QuaresmaService } from './quaresma.service';

describe('QuaresmaController', () => {
  let controller: QuaresmaController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      getProgress: jest.fn(),
      completeDay: jest.fn(),
      uncompleteDay: jest.fn(),
      savePenance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuaresmaController],
      providers: [{ provide: QuaresmaService, useValue: service }],
    }).compile();

    controller = module.get<QuaresmaController>(QuaresmaController);
  });

  it('getProgress delegates to the service with the current user', () => {
    controller.getProgress({ user: { userId: 'u1' } });
    expect(service.getProgress).toHaveBeenCalledWith('u1');
  });

  it('completeDay delegates with the parsed day number', () => {
    controller.completeDay({ user: { userId: 'u1' } }, 3);
    expect(service.completeDay).toHaveBeenCalledWith('u1', 3);
  });

  it('uncompleteDay delegates with the parsed day number', () => {
    controller.uncompleteDay({ user: { userId: 'u1' } }, 3);
    expect(service.uncompleteDay).toHaveBeenCalledWith('u1', 3);
  });

  it('savePenance delegates with the submitted content', () => {
    controller.savePenance({ user: { userId: 'u1' } }, { content: 'Jejum às sextas' } as any);
    expect(service.savePenance).toHaveBeenCalledWith('u1', 'Jejum às sextas');
  });
});
