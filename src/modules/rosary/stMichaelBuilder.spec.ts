import { buildStMichael } from './stMichaelBuilder';

describe('buildStMichael', () => {
  it('builds 63 steps: 7 intro + 5 decades x11 + 1 closing prayer', () => {
    const steps = buildStMichael();
    expect(steps).toHaveLength(63);
  });

  it('has exactly 5 "mystery" steps, one per decade', () => {
    const steps: any[] = buildStMichael();
    expect(steps.filter((s) => s.type === 'mystery')).toHaveLength(5);
  });

  it('starts with the Sign of the Cross and ends with the closing prayer', () => {
    const steps = buildStMichael();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Oração Final' });
  });

  it('numbers each decade from "1ª dezena" to "5ª dezena", in order', () => {
    const steps: any[] = buildStMichael();
    const decadeTitles = steps.filter((s) => s.type === 'mystery').map((s) => s.title);

    expect(decadeTitles).toEqual(['1ª dezena', '2ª dezena', '3ª dezena', '4ª dezena', '5ª dezena']);
  });
});
