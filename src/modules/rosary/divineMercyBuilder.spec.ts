import { buildDivineMercy } from './divineMercyBuilder';

describe('buildDivineMercy', () => {
  it('builds 63 steps: 4 intro + 5 decades x11 + 4 closing', () => {
    const steps = buildDivineMercy();
    expect(steps).toHaveLength(63);
  });

  it('starts with the Sign of the Cross and ends with the closing prayer', () => {
    const steps = buildDivineMercy();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Oração Final' });
  });

  it('has no "mystery"-typed steps — the Chaplet has no distinct mystery block', () => {
    const steps: any[] = buildDivineMercy();
    expect(steps.some((s) => s.type === 'mystery')).toBe(false);
  });

  it('repeats "Pela Sua dolorosa Paixão" ten times per decade, across 5 decades', () => {
    const steps: any[] = buildDivineMercy();
    const repeated = steps.filter((s) => s.title === 'Pela Sua dolorosa Paixão');
    expect(repeated).toHaveLength(50);
  });
});
