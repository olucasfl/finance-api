import { Test, TestingModule } from '@nestjs/testing';
import { ReadingProgressService } from './reading-progress.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ReadingProgressService', () => {
  let service: ReadingProgressService;
  let prisma: {
    readingProgress: { upsert: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      readingProgress: { upsert: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadingProgressService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReadingProgressService>(ReadingProgressService);
  });

  describe('save', () => {
    it('upserts on the (userId, kind) unique key so the same kind overwrites instead of duplicating', async () => {
      prisma.readingProgress.upsert.mockResolvedValue({ id: 'r1' });

      await service.save('user-1', 'BIBLE' as any, 'genesis/3', 'Gênesis 3');

      expect(prisma.readingProgress.upsert).toHaveBeenCalledWith({
        where: { userId_kind: { userId: 'user-1', kind: 'BIBLE' } },
        update: { reference: 'genesis/3', label: 'Gênesis 3' },
        create: { userId: 'user-1', kind: 'BIBLE', reference: 'genesis/3', label: 'Gênesis 3' },
      });
    });

    it('keeps BIBLE and CATECHISM progress independent (different kind keys)', async () => {
      prisma.readingProgress.upsert.mockResolvedValue({ id: 'r1' });

      await service.save('user-1', 'CATECHISM' as any, 'p42', 'Página 42');

      expect(prisma.readingProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_kind: { userId: 'user-1', kind: 'CATECHISM' } },
        }),
      );
    });
  });

  describe('list', () => {
    it('returns the user progress rows ordered by most recently updated', async () => {
      const rows = [{ id: 'r1' }, { id: 'r2' }];
      prisma.readingProgress.findMany.mockResolvedValue(rows);

      const result = await service.list('user-1');

      expect(prisma.readingProgress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('findOne', () => {
    it('looks up progress by the (userId, kind) unique key', async () => {
      const row = { id: 'r1', kind: 'BIBLE' };
      prisma.readingProgress.findUnique.mockResolvedValue(row);

      const result = await service.findOne('user-1', 'BIBLE' as any);

      expect(prisma.readingProgress.findUnique).toHaveBeenCalledWith({
        where: { userId_kind: { userId: 'user-1', kind: 'BIBLE' } },
      });
      expect(result).toBe(row);
    });
  });
});
