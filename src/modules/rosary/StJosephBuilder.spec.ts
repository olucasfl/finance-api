import { buildStJoseph } from './StJosephBuilder';

describe('buildStJoseph', () => {
  it('builds 68 steps: 8 intro + 5 mysteries x12', () => {
    const steps = buildStJoseph();
    expect(steps).toHaveLength(68);
  });

  it('has exactly 5 "mystery" steps, one per decade', () => {
    const steps: any[] = buildStJoseph();
    expect(steps.filter((s) => s.type === 'mystery')).toHaveLength(5);
  });

  it('starts with the Sign of the Cross', () => {
    const steps = buildStJoseph();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
  });

  it('names each mystery from the fixed "Primeiro..Quinto Mistério" list, in order', () => {
    const steps: any[] = buildStJoseph();
    const mysteryTitles = steps.filter((s) => s.type === 'mystery').map((s) => s.title);

    expect(mysteryTitles).toEqual([
      'Primeiro Mistério',
      'Segundo Mistério',
      'Terceiro Mistério',
      'Quarto Mistério',
      'Quinto Mistério',
    ]);
  });
});
