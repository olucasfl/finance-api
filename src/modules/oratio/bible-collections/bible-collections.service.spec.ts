import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BibleCollectionsService } from './bible-collections.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('BibleCollectionsService', () => {
  let service: BibleCollectionsService;
  let prisma: {
    bibleCollection: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    bibleCollectionItem: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
  };

  const item = {
    book: 'Salmos',
    chapter: 23,
    verse: 1,
    reference: 'Salmos 23,1',
    text: 'O Senhor é meu pastor, nada me faltará.',
  };

  beforeEach(async () => {
    prisma = {
      bibleCollection: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      bibleCollectionItem: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BibleCollectionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<BibleCollectionsService>(BibleCollectionsService);
  });

  describe('list', () => {
    it('returns the user collections newest-first with an item count', async () => {
      const rows = [{ id: 'c1', _count: { items: 2 } }];
      prisma.bibleCollection.findMany.mockResolvedValue(rows);

      const result = await service.list('user-1');

      expect(prisma.bibleCollection.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      });
      expect(result).toBe(rows);
    });
  });

  describe('create', () => {
    it('trims the name and scopes to the user', async () => {
      prisma.bibleCollection.create.mockResolvedValue({ id: 'c1' });

      await service.create('user-1', '  Promessas de Deus  ');

      expect(prisma.bibleCollection.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', name: 'Promessas de Deus' },
      });
    });
  });

  describe('rename', () => {
    it('renames when the collection belongs to the user', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.bibleCollection.update.mockResolvedValue({ id: 'c1', name: 'Fé' });

      await service.rename('user-1', 'c1', ' Fé ');

      expect(prisma.bibleCollection.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { name: 'Fé' },
      });
    });

    it('throws NotFound for a collection owned by someone else', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue(null);

      await expect(service.rename('user-1', 'c9', 'x')).rejects.toThrow(NotFoundException);
      expect(prisma.bibleCollection.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an owned collection and reports it', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.bibleCollection.delete.mockResolvedValue({});

      const result = await service.remove('user-1', 'c1');

      expect(prisma.bibleCollection.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFound for a non-owned collection', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue(null);
      await expect(service.remove('user-1', 'c9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('get', () => {
    it('returns the collection with its items oldest-first', async () => {
      const row = { id: 'c1', items: [] };
      prisma.bibleCollection.findFirst.mockResolvedValue(row);

      const result = await service.get('user-1', 'c1');

      expect(prisma.bibleCollection.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', userId: 'user-1' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      expect(result).toBe(row);
    });

    it('throws NotFound when the collection is missing or not owned', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue(null);
      await expect(service.get('user-1', 'c9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addItem', () => {
    it('upserts the verse into the collection (no duplicate on repeat)', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.bibleCollectionItem.upsert.mockResolvedValue({ id: 'i1' });

      await service.addItem('user-1', 'c1', { ...item, note: '  ' });

      expect(prisma.bibleCollectionItem.upsert).toHaveBeenCalledWith({
        where: {
          collectionId_book_chapter_verse: {
            collectionId: 'c1',
            book: 'Salmos',
            chapter: 23,
            verse: 1,
          },
        },
        update: { reference: item.reference, text: item.text, note: null },
        create: {
          collectionId: 'c1',
          ...item,
          note: null,
        },
      });
    });

    it('throws NotFound when adding to a collection the user does not own', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue(null);
      await expect(service.addItem('user-1', 'c9', { ...item })).rejects.toThrow(NotFoundException);
      expect(prisma.bibleCollectionItem.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('removes an item that belongs to an owned collection', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.bibleCollectionItem.findFirst.mockResolvedValue({ id: 'i1' });
      prisma.bibleCollectionItem.delete.mockResolvedValue({});

      const result = await service.removeItem('user-1', 'c1', 'i1');

      expect(prisma.bibleCollectionItem.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFound when the item is not in that collection', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.bibleCollectionItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem('user-1', 'c1', 'i9')).rejects.toThrow(NotFoundException);
      expect(prisma.bibleCollectionItem.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the collection is not owned', async () => {
      prisma.bibleCollection.findFirst.mockResolvedValue(null);
      await expect(service.removeItem('user-1', 'c9', 'i1')).rejects.toThrow(NotFoundException);
    });
  });
});
