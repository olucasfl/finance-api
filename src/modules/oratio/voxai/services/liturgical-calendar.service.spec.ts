import axios from 'axios';
import { LiturgicalCalendarService } from './liturgical-calendar.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LiturgicalCalendarService', () => {
  let service: LiturgicalCalendarService;

  beforeEach(() => {
    service = new LiturgicalCalendarService();
    mockedAxios.get.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches and returns liturgical data from the API', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { data: '2026-02-04', liturgia: 'Quarta-feira' },
    });

    const result = await service.getLiturgicalData(new Date(2026, 1, 4));

    expect(result).toEqual({ data: '2026-02-04', liturgia: 'Quarta-feira' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get.mock.calls[0][0]).toContain('dia=04&mes=02&ano=2026');
  });

  it('caches a successful response so a second call for the same date skips the network', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { data: '2026-02-04' },
    });

    const date = new Date(2026, 1, 4);
    await service.getLiturgicalData(date);
    await service.getLiturgicalData(date);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('does not cache across different dates', async () => {
    mockedAxios.get.mockResolvedValue({ status: 200, data: { data: 'x' } });

    await service.getLiturgicalData(new Date(2026, 1, 4));
    await service.getLiturgicalData(new Date(2026, 1, 5));

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('returns null on a 404 (no data for that date) without throwing', async () => {
    mockedAxios.get.mockResolvedValue({ status: 404, data: null });

    const result = await service.getLiturgicalData(new Date(2026, 1, 4));

    expect(result).toBeNull();
  });

  it('a 404 does not count toward the circuit breaker — repeated 404s keep hitting the network', async () => {
    mockedAxios.get.mockResolvedValue({ status: 404, data: null });

    const date = new Date(2026, 1, 4);
    await service.getLiturgicalData(date);
    await service.getLiturgicalData(date);
    await service.getLiturgicalData(date);
    await service.getLiturgicalData(date);

    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
  });

  it('propagates a network/API error to the caller', async () => {
    mockedAxios.get.mockRejectedValue(new Error('ECONNRESET'));

    await expect(
      service.getLiturgicalData(new Date(2026, 1, 4)),
    ).rejects.toThrow('ECONNRESET');
  });

  it('opens the circuit after 3 consecutive failures and short-circuits further calls', async () => {
    jest.useFakeTimers();
    mockedAxios.get.mockRejectedValue(new Error('boom'));

    // 3 different dates so caching never masks a network call
    await expect(service.getLiturgicalData(new Date(2026, 1, 1))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 2))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 3))).rejects.toThrow();

    expect(mockedAxios.get).toHaveBeenCalledTimes(3);

    // circuit is now open — a 4th, different date should short-circuit to
    // null instead of calling the network again
    const result = await service.getLiturgicalData(new Date(2026, 1, 4));

    expect(result).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });

  it('retries the network again once the cooldown has passed', async () => {
    jest.useFakeTimers();
    mockedAxios.get.mockRejectedValue(new Error('boom'));

    await expect(service.getLiturgicalData(new Date(2026, 1, 1))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 2))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 3))).rejects.toThrow();
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(60_001);

    mockedAxios.get.mockResolvedValue({ status: 200, data: { data: 'ok' } });

    const result = await service.getLiturgicalData(new Date(2026, 1, 5));

    expect(result).toEqual({ data: 'ok' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
  });

  it('a success resets the failure counter so the circuit does not open early afterwards', async () => {
    // 2 failures, then 1 success, then 2 more failures — should NOT open
    // the circuit, since the counter reset in between.
    mockedAxios.get
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ status: 200, data: { data: 'ok' } })
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'));

    await expect(service.getLiturgicalData(new Date(2026, 1, 1))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 2))).rejects.toThrow();
    await service.getLiturgicalData(new Date(2026, 1, 3));
    await expect(service.getLiturgicalData(new Date(2026, 1, 4))).rejects.toThrow();
    await expect(service.getLiturgicalData(new Date(2026, 1, 5))).rejects.toThrow();

    // a 6th call should still try the network (circuit not open)
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { data: 'ok' } });
    const result = await service.getLiturgicalData(new Date(2026, 1, 6));

    expect(result).toEqual({ data: 'ok' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(6);
  });

});
