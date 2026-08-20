import { ROSARY_MYSTERIES } from './rosaryMysteries';

describe('ROSARY_MYSTERIES', () => {
  const sets = ['gozosos', 'dolorosos', 'gloriosos', 'luminosos'] as const;

  it.each(sets)('has exactly 5 mysteries for %s', (key) => {
    expect(ROSARY_MYSTERIES[key]).toHaveLength(5);
  });

  it.each(sets)('every mystery in %s has a non-empty title and meditation', (key) => {
    for (const mystery of ROSARY_MYSTERIES[key]) {
      expect(typeof mystery.title).toBe('string');
      expect(mystery.title.length).toBeGreaterThan(0);
      expect(typeof mystery.meditation).toBe('string');
      expect(mystery.meditation.length).toBeGreaterThan(0);
    }
  });

  it('does not define a mystery set beyond the four traditional ones', () => {
    expect(Object.keys(ROSARY_MYSTERIES).sort()).toEqual([...sets].sort());
  });
});
