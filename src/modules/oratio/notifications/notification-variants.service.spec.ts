import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DEFAULT_VARIANTS,
  NotificationVariantsService,
  VariantRow,
} from './notification-variants.service';

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
      notificationRule: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ key: 'R' }),
      },
      notificationRuleVariant: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
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
    it('seeds the full DEFAULT_VARIANTS pool for a catalog rule with no variants', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([
        { key: 'EXAMEN_NIGHT', title: 'T', body: 'B', url: '/x' },
      ]);
      prisma.notificationRuleVariant.count.mockResolvedValue(0);

      await service.seedMissing();

      const pool = DEFAULT_VARIANTS.EXAMEN_NIGHT;
      expect(pool.length).toBeGreaterThanOrEqual(2);
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledTimes(pool.length);
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledWith({
        data: { ruleKey: 'EXAMEN_NIGHT', title: pool[0].title, body: pool[0].body, url: '/x', order: 0 },
      });
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ order: pool.length - 1 }) }),
      );
    });

    it('seeds a single variant from the rule text for a custom (non-catalog) rule', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([
        { key: 'CUSTOM_X', title: 'Ta', body: 'Ba', url: '/a' },
      ]);
      prisma.notificationRuleVariant.count.mockResolvedValue(0);

      await service.seedMissing();

      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledTimes(1);
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledWith({
        data: { ruleKey: 'CUSTOM_X', title: 'Ta', body: 'Ba', url: '/a', order: 0 },
      });
    });

    it('does not touch a rule that already has variants (idempotent — admin owns the list)', async () => {
      prisma.notificationRule.findMany.mockResolvedValue([
        { key: 'EXAMEN_NIGHT', title: 'T', body: 'B', url: null },
      ]);
      prisma.notificationRuleVariant.count.mockResolvedValue(1);

      await service.seedMissing();

      expect(prisma.notificationRuleVariant.create).not.toHaveBeenCalled();
    });

    it('every catalog rule ships at least 2 non-empty variants', () => {
      for (const pool of Object.values(DEFAULT_VARIANTS)) {
        expect(pool.length).toBeGreaterThanOrEqual(2);
        for (const v of pool) {
          expect(v.title.trim().length).toBeGreaterThan(0);
          expect(v.body.trim().length).toBeGreaterThan(0);
        }
      }
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

  describe('CRUD guards (piso de 1 variante ativa)', () => {
    it('createForRule appends after the existing variants and 404s an unknown rule', async () => {
      prisma.notificationRuleVariant.count.mockResolvedValue(2);
      await service.createForRule('R', { body: 'nova' });
      expect(prisma.notificationRuleVariant.create).toHaveBeenCalledWith({
        data: { ruleKey: 'R', title: null, body: 'nova', url: null, order: 2 },
      });

      prisma.notificationRule.findUnique.mockResolvedValue(null);
      await expect(service.createForRule('X', {})).rejects.toThrow('Regra não encontrada');
    });

    it('update refuses to disable the last enabled variant', async () => {
      prisma.notificationRuleVariant.findUnique.mockResolvedValue({
        id: 'v1', ruleKey: 'R', enabled: true,
      });
      prisma.notificationRuleVariant.count.mockResolvedValue(1);

      await expect(service.update('v1', { enabled: false })).rejects.toThrow(
        'pelo menos uma variante ativa',
      );
    });

    it('update allows disabling when another enabled variant remains', async () => {
      prisma.notificationRuleVariant.findUnique.mockResolvedValue({
        id: 'v1', ruleKey: 'R', enabled: true,
      });
      prisma.notificationRuleVariant.count.mockResolvedValue(2);

      await service.update('v1', { enabled: false });
      expect(prisma.notificationRuleVariant.update).toHaveBeenCalled();
    });

    it('remove refuses when it is the rule\'s only variant', async () => {
      prisma.notificationRuleVariant.findUnique.mockResolvedValue({
        id: 'v1', ruleKey: 'R', enabled: true,
      });
      prisma.notificationRuleVariant.count.mockResolvedValue(1);

      await expect(service.remove('v1')).rejects.toThrow('pelo menos uma variante');
      expect(prisma.notificationRuleVariant.delete).not.toHaveBeenCalled();
    });

    it('remove works when other variants remain', async () => {
      prisma.notificationRuleVariant.findUnique.mockResolvedValue({
        id: 'v1', ruleKey: 'R', enabled: false,
      });
      prisma.notificationRuleVariant.count.mockResolvedValue(3);

      await expect(service.remove('v1')).resolves.toEqual({ ok: true });
      expect(prisma.notificationRuleVariant.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    });
  });
});
