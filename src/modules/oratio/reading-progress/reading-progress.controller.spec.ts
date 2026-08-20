import { Test, TestingModule } from '@nestjs/testing';
import { ReadingProgressController } from './reading-progress.controller';
import { ReadingProgressService } from './reading-progress.service';

describe('ReadingProgressController', () => {
  let controller: ReadingProgressController;
  let service: { save: jest.Mock; list: jest.Mock };

  beforeEach(async () => {
    service = { save: jest.fn(), list: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadingProgressController],
      providers: [{ provide: ReadingProgressService, useValue: service }],
    }).compile();

    controller = module.get<ReadingProgressController>(ReadingProgressController);
  });

  describe('save', () => {
    it('passes the authenticated user id and the full body to the service', () => {
      const req = { user: { userId: 'user-1' } };
      const body = { kind: 'BIBLE', reference: 'genesis/3', label: 'Gênesis 3' } as any;

      controller.save(req, body);

      expect(service.save).toHaveBeenCalledWith('user-1', 'BIBLE', 'genesis/3', 'Gênesis 3');
    });
  });

  describe('list', () => {
    it('passes the authenticated user id to the service', () => {
      controller.list({ user: { userId: 'user-1' } });
      expect(service.list).toHaveBeenCalledWith('user-1');
    });
  });
});
