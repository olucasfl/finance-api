import { buildTearsMary } from './tearsMaryBuilder';

describe('buildTearsMary', () => {
  it('builds 65 steps: 2 intro + 7 decades x8 + 7 closing', () => {
    const steps = buildTearsMary();
    expect(steps).toHaveLength(65);
  });

  it('has no "mystery"-typed steps — every step is a prayer', () => {
    const steps: any[] = buildTearsMary();
    expect(steps.every((s) => s.type === 'prayer')).toBe(true);
  });

  it('starts with the Sign of the Cross', () => {
    const steps = buildTearsMary();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
  });

  it('numbers all 7 decades from "1ª Dezena" to "7ª Dezena"', () => {
    const steps: any[] = buildTearsMary();
    const decadeTitles = steps.filter((s) => /^\d+ª Dezena$/.test(s.title)).map((s) => s.title);

    expect(decadeTitles).toEqual([
      '1ª Dezena', '2ª Dezena', '3ª Dezena', '4ª Dezena', '5ª Dezena', '6ª Dezena', '7ª Dezena',
    ]);
  });
});
