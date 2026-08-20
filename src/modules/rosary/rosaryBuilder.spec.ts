import { buildRosary } from './rosaryBuilder';

describe('buildRosary', () => {
  const types = ['gozosos', 'dolorosos', 'gloriosos', 'luminosos'] as const;

  it.each(types)('builds a full sequence of 81 steps for %s (9 intro + 5 mysteries x14 + 2 closing)', (type) => {
    const steps = buildRosary(type);
    expect(steps).toHaveLength(81);
  });

  it.each(types)('includes exactly one "mystery" step per decade for %s', (type) => {
    const steps = buildRosary(type);
    expect(steps.filter((s: any) => s.type === 'mystery')).toHaveLength(5);
  });

  it.each(types)('starts with the Sign of the Cross and ends with Salve Rainha for %s', (type) => {
    const steps = buildRosary(type);
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Salve Rainha' });
  });

  it('numbers each mystery in order using its title from ROSARY_MYSTERIES', () => {
    const steps: any[] = buildRosary('gozosos');
    const mysterySteps = steps.filter((s) => s.type === 'mystery');

    expect(mysterySteps[0].title).toContain('1º Mistério');
    expect(mysterySteps[0].title).toContain('Anunciação do Anjo Gabriel a Maria');
    expect(mysterySteps[4].title).toContain('5º Mistério');
  });

  it('throws for a mystery set that does not exist (no defensive check in the current implementation)', () => {
    // Documents current behavior: ROSARY_MYSTERIES["invalid"] is undefined,
    // and .forEach on undefined throws. Not fixing this — tests only.
    expect(() => buildRosary('invalid-type')).toThrow();
  });
});
