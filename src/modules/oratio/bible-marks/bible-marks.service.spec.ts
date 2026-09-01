import { Test, TestingModule } from '@nestjs/testing';
import { BibleMarksService } from './bible-marks.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('BibleMarksService', () => {
  let service: BibleMarksService;
  let prisma: {
    bibleMark: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
  };

  const base = {
    book: 'João',
    chapter: 3,
    verse: 16,
    reference: 'João 3,16',
    text: 'Porque Deus amou o mundo...',
  };

  const key = {
    userId_book_chapter_verse: {
      userId: 'user-1',
      book: 'João',
      chapter: 3,
      verse: 16,
    },
  };

  beforeEach(async () => {
    prisma = {
      bibleMark: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BibleMarksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<BibleMarksService>(BibleMarksService);
  });

  describe('list', () => {
    it('returns all user marks ordered by most recently updated when no chapter filter', async () => {
      const rows = [{ id: 'm1' }, { id: 'm2' }];
      prisma.bibleMark.findMany.mockResolvedValue(rows);

      const result = await service.list('user-1');

      expect(prisma.bibleMark.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toBe(rows);
    });

    it('filters by book+chapter when both are given', async () => {
      prisma.bibleMark.findMany.mockResolvedValue([]);

      await service.list('user-1', 'João', 3);

      expect(prisma.bibleMark.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', book: 'João', chapter: 3 },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('ignores a book without a chapter (partial filter is not applied)', async () => {
      prisma.bibleMark.findMany.mockResolvedValue([]);

      await service.list('user-1', 'João');

      expect(prisma.bibleMark.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('upsert', () => {
    it('creates a highlighted mark (default amber) when none exists', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue(null);
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1', highlighted: true });

      await service.upsert('user-1', { ...base, highlighted: true });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith({
        where: key,
        update: {
          reference: base.reference,
          text: base.text,
          highlighted: true,
          highlightColor: 'amber',
          favorite: false,
          note: null,
        },
        create: {
          userId: 'user-1',
          ...base,
          highlighted: true,
          highlightColor: 'amber',
          favorite: false,
          note: null,
        },
      });
    });

    it('stores the chosen highlight colour and turns the highlight on implicitly', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue(null);
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1' });

      await service.upsert('user-1', { ...base, highlightColor: 'green' });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ highlighted: true, highlightColor: 'green' }),
        }),
      );
    });

    it('clears the colour when the highlight is turned off', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue({
        id: 'm1',
        ...base,
        highlighted: true,
        highlightColor: 'blue',
        favorite: true,
        note: null,
      });
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1' });

      await service.upsert('user-1', { ...base, highlighted: false });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ highlighted: false, highlightColor: null }),
        }),
      );
    });

    it('keeps the existing colour when only the note changes', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue({
        id: 'm1',
        ...base,
        highlighted: true,
        highlightColor: 'pink',
        favorite: false,
        note: null,
      });
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1' });

      await service.upsert('user-1', { ...base, note: 'oi' });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ highlightColor: 'pink' }),
        }),
      );
    });

    it('merges a partial update onto the existing row (favorite stays true when only note changes)', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue({
        id: 'm1',
        ...base,
        highlighted: false,
        favorite: true,
        note: null,
      });
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1' });

      await service.upsert('user-1', { ...base, note: 'meditar nisso' });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            favorite: true,
            highlighted: false,
            note: 'meditar nisso',
          }),
        }),
      );
    });

    it('deletes the row when the update clears the last remaining flag', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue({
        id: 'm1',
        ...base,
        highlighted: true,
        favorite: false,
        note: null,
      });

      const result = await service.upsert('user-1', { ...base, highlighted: false });

      expect(prisma.bibleMark.delete).toHaveBeenCalledWith({ where: key });
      expect(prisma.bibleMark.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it('treats a whitespace-only note as empty', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue(null);

      const result = await service.upsert('user-1', { ...base, note: '   ' });

      expect(result).toEqual({ deleted: true });
      expect(prisma.bibleMark.upsert).not.toHaveBeenCalled();
      expect(prisma.bibleMark.delete).not.toHaveBeenCalled();
    });

    it('does not call delete when there is nothing to clear and nothing to save', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue(null);

      await service.upsert('user-1', { ...base });

      expect(prisma.bibleMark.delete).not.toHaveBeenCalled();
    });

    it('trims a stored note', async () => {
      prisma.bibleMark.findUnique.mockResolvedValue(null);
      prisma.bibleMark.upsert.mockResolvedValue({ id: 'm1' });

      await service.upsert('user-1', { ...base, note: '  estudar  ' });

      expect(prisma.bibleMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ note: 'estudar' }),
        }),
      );
    });
  });
});
