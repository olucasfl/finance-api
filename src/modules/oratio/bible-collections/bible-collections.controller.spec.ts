import { Test, TestingModule } from '@nestjs/testing';
import { BibleCollectionsController } from './bible-collections.controller';
import { BibleCollectionsService } from './bible-collections.service';

describe('BibleCollectionsController', () => {
  let controller: BibleCollectionsController;
  let service: {
    list: jest.Mock;
    create: jest.Mock;
    get: jest.Mock;
    rename: jest.Mock;
    remove: jest.Mock;
    addItem: jest.Mock;
    removeItem: jest.Mock;
  };

  const req = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      get: jest.fn(),
      rename: jest.fn(),
      remove: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BibleCollectionsController],
      providers: [{ provide: BibleCollectionsService, useValue: service }],
    }).compile();

    controller = module.get<BibleCollectionsController>(BibleCollectionsController);
  });

  it('list forwards the authenticated user id (no verse filter)', () => {
    controller.list(req);
    expect(service.list).toHaveBeenCalledWith('user-1', undefined);
  });

  it('list passes a verse reference when book/chapter/verse are given', () => {
    controller.list(req, 'João', '3', '16');
    expect(service.list).toHaveBeenCalledWith('user-1', {
      book: 'João',
      chapter: 3,
      verse: 16,
    });
  });

  it('list ignores a partial verse reference', () => {
    controller.list(req, 'João', '3', undefined);
    expect(service.list).toHaveBeenCalledWith('user-1', undefined);
  });

  it('create passes only the name from the body', () => {
    controller.create(req, { name: 'Fé' } as any);
    expect(service.create).toHaveBeenCalledWith('user-1', 'Fé');
  });

  it('get forwards user id and collection id', () => {
    controller.get(req, 'c1');
    expect(service.get).toHaveBeenCalledWith('user-1', 'c1');
  });

  it('rename forwards user id, id and the new name', () => {
    controller.rename(req, 'c1', { name: 'Esperança' } as any);
    expect(service.rename).toHaveBeenCalledWith('user-1', 'c1', 'Esperança');
  });

  it('remove forwards user id and id', () => {
    controller.remove(req, 'c1');
    expect(service.remove).toHaveBeenCalledWith('user-1', 'c1');
  });

  it('addItem forwards user id, collection id and the body', () => {
    const body = { book: 'Salmos', chapter: 23, verse: 1 } as any;
    controller.addItem(req, 'c1', body);
    expect(service.addItem).toHaveBeenCalledWith('user-1', 'c1', body);
  });

  it('removeItem forwards user id, collection id and item id', () => {
    controller.removeItem(req, 'c1', 'i1');
    expect(service.removeItem).toHaveBeenCalledWith('user-1', 'c1', 'i1');
  });
});
