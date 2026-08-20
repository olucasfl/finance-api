import { getBrazilToday } from './brazil-date';

describe('getBrazilToday', () => {

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the Brazil-local calendar date even when it differs from the UTC date', () => {
    // 2026-01-01T02:30:00Z is still 2025-12-31 23:30 in Brazil (UTC-3) —
    // this is exactly the day-boundary mismatch this function exists to avoid.
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T02:30:00Z'));

    const today = getBrazilToday();

    expect(today.getFullYear()).toBe(2025);
    expect(today.getMonth()).toBe(11); // December (0-indexed)
    expect(today.getDate()).toBe(31);
  });

  it('returns the same calendar date as UTC when well within the Brazil day', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T15:00:00Z'));

    const today = getBrazilToday();

    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(5); // June
    expect(today.getDate()).toBe(15);
  });

});
