import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationVariantsService, VariantRow } from './notification-variants.service';

const v = (over: Partial<VariantRow> = {}): VariantRow => ({
  id: 'v1',
  ruleKey: 'R',
  title: null,
  body: 'texto',
  url: null,
  enabled: true,
  order: 0,
  ...over,
});

describe('NotificationVariantsService', () => {
  let service: NotificationVariantsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notificationRule: { findMany: jest.fn().mockResolvedValue([]) },
      notificationRuleVariant: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationVariantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationVariantsService);
  });

  describe('seedMissing', () => {
    it('creates exactly one variant per rule that has none', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([
        { key: 'A', title: 'Ta', body: 'Ba', url: '/a' },
        { key: 'B', title: 'Tb', body: null, url: null },
      ]);
      prisma.notificationRuleVariant.count.mockResolvedValue(0);

      await service.seedMissing();

      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledTimes(2);
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledWith({
        data: { ruleKey: 'A', title: 'Ta', body: 'Ba', url: '/a', order: 0 },
      });
    });

    it('does not seed a rule that already has a variant (idempotent)', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([{ key: 'A', title: 'T', body: 'B', url: null }]);
      prisma.notificationRuleVariant.count.mockResolvedValue(1);

      await service.seedMissing();

      expect(prisma.notificationRuleVariant.create).not.toHaveBeenCalled();
    });
  });

  describe('pickVariant', () => {
    it('returns the only variant when there is just one (identical to today)', () => {
      const only = v({ id: 'x' });
      expect(service.pickVariant([only], ['x', 'x', 'x'])).toBe(only);
    });

    it('returns null when the pool is empty or all disabled', () => {
      expect(service.pickVariant([], [])).toBeNull();
      expect(service.pickVariant([v({ enabled: false })], [])).toBeNull();
    });

    it('prefers a never-used variant, breaking ties by order', () => {
      const a = v({ id: 'a', order: 1 });
      const b = v({ id: 'b', order: 0 });
      // 'a' já usada; 'b' nunca → escolhe 'b'
      expect(service.pickVariant([a, b], ['a'])?.id).toBe('b');
    });

    it('when all were used, picks the one used longest ago', () => {
      const a = v({ id: 'a' });
      const b = v({ id: 'b' });
      const c = v({ id: 'c' });
      // recente→antigo: c, a, b  → 'b' foi usada há mais tempo
      expect(service.pickVariant([a, b, c], ['c', 'a', 'b'])?.id).toBe('b');
    });

    it('rotates A→B→A across successive calls', () => {
      const a = v({ id: 'a', order: 0 });
      const b = v({ id: 'b', order: 1 });
      expect(service.pickVariant([a, b], [])?.id).toBe('a'); // nada usado → menor order
      expect(service.pickVariant([a, b], ['a'])?.id).toBe('b'); // b nunca usada
      expect(service.pickVariant([a, b], ['b', 'a'])?.id).toBe('a'); // a usada há mais tempo
    });

    it('skips a disabled variant even if it is the least recently used', () => {
      const a = v({ id: 'a', enabled: true });
      const b = v({ id: 'b', enabled: false });
      expect(service.pickVariant([a, b], ['a', 'a'])?.id).toBe('a');
    });
  });
});
