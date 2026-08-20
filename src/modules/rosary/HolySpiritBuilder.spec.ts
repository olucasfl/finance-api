import { buildHolySpirit } from './HolySpiritBuilder';

describe('buildHolySpirit', () => {
  it('builds 68 steps: 7 intro + 5 decades x12 + 1 closing prayer', () => {
    const steps = buildHolySpirit();
    expect(steps).toHaveLength(68);
  });

  it('starts with the Sign of the Cross and ends with the closing prayer', () => {
    const steps = buildHolySpirit();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({
      type: 'prayer',
      title: 'Oração ao Espírito Santo',
    });
  });

  it('has no "mystery"-typed steps — every step is a prayer', () => {
    const steps: any[] = buildHolySpirit();
    expect(steps.every((s) => s.type === 'prayer')).toBe(true);
  });

  it('every step has a non-empty title', () => {
    const steps: any[] = buildHolySpirit();
    expect(steps.every((s) => typeof s.title === 'string' && s.title.length > 0)).toBe(true);
  });
});
