import { Test, TestingModule } from '@nestjs/testing';
import { HomeService } from './home.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('HomeService', () => {
  let service: HomeService;
  let prisma: {
    rosarySession: { findFirst: jest.Mock };
    spiritualStats: { findUnique: jest.Mock };
    readingProgress: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      rosarySession: { findFirst: jest.fn() },
      spiritualStats: { findUnique: jest.fn() },
      readingProgress: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HomeService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<HomeService>(HomeService);

    // Defaults so each test only needs to override what it cares about.
    prisma.rosarySession.findFirst.mockResolvedValue(null);
    prisma.spiritualStats.findUnique.mockResolvedValue(null);
    prisma.readingProgress.findMany.mockResolvedValue([]);
  });

  describe('feed — rosary suggestion', () => {
    it('suggests resuming an in-progress rosary session when one exists', async () => {
      prisma.rosarySession.findFirst.mockResolvedValue({
        type: 'gozosos',
        currentStep: 3,
      });

      const { suggestions } = await service.feed('user-1');

      const rosary = suggestions.find((s) => s.id === 'rosary-resume');
      expect(rosary).toMatchObject({
        kind: 'rosary',
        why: 'Continue',
        path: '/oratio/rosary/gozosos?resumeStep=3',
      });
    });

    it('suggests the mystery of the day when the user has prayed before but has no session in progress', async () => {
      prisma.spiritualStats.findUnique.mockResolvedValue({ rosariesPrayed: 5 });

      const { suggestions } = await service.feed('user-1');

      const rosary = suggestions.find((s) => s.id === 'rosary-habit');
      expect(rosary).toMatchObject({ kind: 'rosary', why: 'Hábito' });
    });

    it('suggests nothing rosary-related for a user who never prayed and has no session', async () => {
      const { suggestions } = await service.feed('user-1');

      expect(suggestions.find((s) => s.kind === 'rosary')).toBeUndefined();
    });

    it('only queries active sessions started within the last 12 hours', async () => {
      await service.feed('user-1');

      const call = prisma.rosarySession.findFirst.mock.calls[0][0];
      expect(call.where.completed).toBe(false);
      expect(call.where.currentStep).toEqual({ gt: 0 });
      expect(call.where.startedAt.gte).toBeInstanceOf(Date);
      expect(call.where.startedAt.gte.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('feed — reading suggestion', () => {
    it('suggests continuing the Bible when the most recent reading is BIBLE', async () => {
      prisma.readingProgress.findMany.mockResolvedValue([
        { kind: 'BIBLE', reference: 'genesis/3', label: 'Gênesis 3' },
      ]);

      const { suggestions } = await service.feed('user-1');

      const reading = suggestions.find((s) => s.id === 'bible-continue');
      expect(reading).toMatchObject({
        kind: 'bible',
        why: 'Onde parou',
        subtitle: 'Gênesis 3',
        path: '/oratio/biblia/genesis/3',
      });
    });

    it('suggests continuing the Catechism when the most recent reading is CATECHISM', async () => {
      prisma.readingProgress.findMany.mockResolvedValue([
        { kind: 'CATECHISM', reference: '42', label: 'Página 42' },
      ]);

      const { suggestions } = await service.feed('user-1');

      const reading = suggestions.find((s) => s.id === 'catechism-continue');
      expect(reading).toMatchObject({
        kind: 'catechism',
        why: 'Onde parou',
        path: '/oratio/catecismo?page=42',
      });
    });

    it('only surfaces one reading suggestion even if both BIBLE and CATECHISM have progress', async () => {
      prisma.readingProgress.findMany.mockResolvedValue([
        { kind: 'CATECHISM', reference: '42', label: 'Página 42' },
        { kind: 'BIBLE', reference: 'genesis/3', label: 'Gênesis 3' },
      ]);

      const { suggestions } = await service.feed('user-1');

      const readingSuggestions = suggestions.filter(
        (s) => s.kind === 'bible' || s.kind === 'catechism',
      );
      expect(readingSuggestions).toHaveLength(1);
      expect(readingSuggestions[0].id).toBe('catechism-continue');
    });

    it('suggests nothing reading-related when there is no reading progress at all', async () => {
      const { suggestions } = await service.feed('user-1');

      expect(
        suggestions.find((s) => s.kind === 'bible' || s.kind === 'catechism'),
      ).toBeUndefined();
    });
  });
});
