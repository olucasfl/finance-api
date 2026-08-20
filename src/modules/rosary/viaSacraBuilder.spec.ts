import { buildViaSacra } from './viaSacraBuilder';

describe('buildViaSacra', () => {
  it('builds 60 steps: 2 intro + 14 stations x4 + 2 closing', () => {
    const steps = buildViaSacra();
    expect(steps).toHaveLength(60);
  });

  it('has exactly 14 "mystery" steps, one per Station of the Cross', () => {
    const steps: any[] = buildViaSacra();
    expect(steps.filter((s) => s.type === 'mystery')).toHaveLength(14);
  });

  it('starts with the Sign of the Cross and ends with the prayer to Our Lady of Sorrows', () => {
    const steps = buildViaSacra();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Sinal da Santa Cruz' });
    expect(steps[steps.length - 1]).toMatchObject({
      type: 'prayer',
      title: 'Oração a Nossa Senhora das Dores',
    });
  });

  it('numbers the 14 stations in order from the 1st to the 14th', () => {
    const steps: any[] = buildViaSacra();
    const stationTitles = steps.filter((s) => s.type === 'mystery').map((s) => s.title);

    expect(stationTitles[0]).toContain('1ª Estação');
    expect(stationTitles[13]).toContain('14ª Estação');
  });

  it('follows every station with Pai Nosso, Ave Maria and Glória ao Pai, in that order', () => {
    const steps: any[] = buildViaSacra();
    const firstStationIndex = steps.findIndex((s) => s.type === 'mystery');

    expect(steps[firstStationIndex + 1]).toMatchObject({ type: 'prayer', title: 'Pai Nosso' });
    expect(steps[firstStationIndex + 2]).toMatchObject({ type: 'prayer', title: 'Ave Maria' });
    expect(steps[firstStationIndex + 3]).toMatchObject({ type: 'prayer', title: 'Glória ao Pai' });
  });
});
