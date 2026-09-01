import { Test, TestingModule } from '@nestjs/testing';
import { BibleMarksController } from './bible-marks.controller';
import { BibleMarksService } from './bible-marks.service';

describe('BibleMarksController', () => {
  let controller: BibleMarksController;
  let service: { list: jest.Mock; upsert: jest.Mock };

  beforeEach(async () => {
    service = { list: jest.fn(), upsert: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BibleMarksController],
      providers: [{ provide: BibleMarksService, useValue: service }],
    }).compile();

    controller = module.get<BibleMarksController>(BibleMarksController);
  });

  const req = { user: { userId: 'user-1' } };

  describe('list', () => {
    it('passes book and a numeric chapter through to the service', () => {
      controller.list(req, 'João', '3');
      expect(service.list).toHaveBeenCalledWith('user-1', 'João', 3);
    });

    it('passes undefined chapter when the query param is absent', () => {
      controller.list(req, undefined, undefined);
      expect(service.list).toHaveBeenCalledWith('user-1', undefined, undefined);
    });

    it('drops a non-numeric chapter instead of forwarding NaN', () => {
      controller.list(req, 'João', 'abc');
      expect(service.list).toHaveBeenCalledWith('user-1', 'João', undefined);
    });
  });

  describe('upsert', () => {
    it('uses the authenticated user id, never a value from the body', () => {
      const body = {
        book: 'João',
        chapter: 3,
        verse: 16,
        reference: 'João 3,16',
        text: 'Porque Deus amou...',
        highlighted: true,
      } as any;

      controller.upsert(req, body);

      expect(service.upsert).toHaveBeenCalledWith('user-1', body);
    });
  });
});
