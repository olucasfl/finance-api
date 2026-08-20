import { buildStBenedict } from './stBenedictBuilder';

describe('buildStBenedict', () => {
  it('builds 82 steps: 6 intro + 6 mysteries x12 + 3 repeated + 1 closing prayer', () => {
    const steps = buildStBenedict();
    expect(steps).toHaveLength(82);
  });

  it('has exactly 6 "mystery" steps', () => {
    const steps: any[] = buildStBenedict();
    expect(steps.filter((s) => s.type === 'mystery')).toHaveLength(6);
  });

  it('starts with the Sign of the Cross and ends with the closing prayer', () => {
    const steps = buildStBenedict();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Oração Final' });
  });

  it('pairs each of the 6 mysteries with its own medal phrase as invocation text', () => {
    const steps: any[] = buildStBenedict();
    const firstDecadeInvocations = steps.filter((s) => s.title === 'São Bento 1/10');

    expect(firstDecadeInvocations).toHaveLength(6);
    expect(firstDecadeInvocations[0].text).toBe('A Cruz sagrada seja minha Luz');
  });
});
