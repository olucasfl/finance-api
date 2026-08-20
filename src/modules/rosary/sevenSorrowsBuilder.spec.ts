import { buildSevenSorrows } from './sevenSorrowsBuilder';

describe('buildSevenSorrows', () => {
  it('builds 67 steps: 2 intro + 7 sorrows x9 + 2 closing', () => {
    const steps = buildSevenSorrows();
    expect(steps).toHaveLength(67);
  });

  it('has exactly 7 "mystery" steps, one per Sorrow', () => {
    const steps: any[] = buildSevenSorrows();
    expect(steps.filter((s) => s.type === 'mystery')).toHaveLength(7);
  });

  it('starts with "Início" and ends with Salve Rainha', () => {
    const steps = buildSevenSorrows();
    expect(steps[0]).toMatchObject({ type: 'prayer', title: 'Início' });
    expect(steps[steps.length - 1]).toMatchObject({ type: 'prayer', title: 'Salve Rainha' });
  });

  it('numbers the 7 Sorrows in order from "1ª Dor" to "7ª Dor"', () => {
    const steps: any[] = buildSevenSorrows();
    const sorrowTitles = steps.filter((s) => s.type === 'mystery').map((s) => s.title);

    expect(sorrowTitles[0]).toContain('1ª Dor');
    expect(sorrowTitles[6]).toContain('7ª Dor');
  });
});
