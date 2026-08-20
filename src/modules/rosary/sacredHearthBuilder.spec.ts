import { buildSacredHeart } from './sacredHearthBuilder';

describe('buildSacredHeart', () => {
  it('builds 68 steps: 7 intro + 5 decades x12 + 1 closing prayer', () => {
    const steps = buildSacredHeart();
    expect(steps).toHaveLength(68);
  });

  it('starts with the Sign of the Cross and ends with Salve Rainha', () => {
    const steps = buildSacredHeart();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Salve Rainha' });
  });

  it('has no "mystery"-typed steps', () => {
    const steps: any[] = buildSacredHeart();
    expect(steps.some((s) => s.type === 'mystery')).toBe(false);
  });

  it('repeats "Sagrado Coração de Jesus" ten times per decade, across 5 decades', () => {
    const steps: any[] = buildSacredHeart();
    const invocations = steps.filter((s) => s.title.startsWith('Sagrado Coração de Jesus'));
    expect(invocations).toHaveLength(50);
  });
});
