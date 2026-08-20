import { parseDeviceLabel, getClientIp, resolveLocation } from './session-info.util';

describe('parseDeviceLabel', () => {
  it('returns a fallback label when there is no user agent', () => {
    expect(parseDeviceLabel(undefined)).toBe('Dispositivo desconhecido');
    expect(parseDeviceLabel(null)).toBe('Dispositivo desconhecido');
    expect(parseDeviceLabel('')).toBe('Dispositivo desconhecido');
  });

  it('identifies Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
    expect(parseDeviceLabel(ua)).toBe('Chrome · Windows');
  });

  it('identifies Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
    expect(parseDeviceLabel(ua)).toBe('Safari · iPhone');
  });

  it('identifies Edge on Windows even though Edge also contains "Chrome" in its UA', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0';
    expect(parseDeviceLabel(ua)).toBe('Edge · Windows');
  });

  it('identifies Firefox on Android', () => {
    const ua = 'Mozilla/5.0 (Android 14; Mobile) Gecko/120.0 Firefox/120.0';
    expect(parseDeviceLabel(ua)).toBe('Firefox · Android');
  });

  it('falls back to generic browser/OS labels for an unrecognized user agent', () => {
    expect(parseDeviceLabel('SomeWeirdClient/1.0')).toBe('Navegador · sistema desconhecido');
  });
});

describe('getClientIp', () => {
  it('uses req.ip when present (trusts Express, which itself trusts the proxy hop)', () => {
    const req = { ip: '203.0.113.7', socket: { remoteAddress: '10.0.0.1' } };
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to the raw socket address when req.ip is absent', () => {
    const req = { socket: { remoteAddress: '10.0.0.1' } };
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('returns undefined when neither is available', () => {
    expect(getClientIp({})).toBeUndefined();
  });
});

describe('resolveLocation', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns null without calling fetch for a missing IP', async () => {
    global.fetch = jest.fn();
    await expect(resolveLocation(undefined)).resolves.toBeNull();
    await expect(resolveLocation(null)).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns null without calling fetch for private/loopback IPs', async () => {
    global.fetch = jest.fn();

    await expect(resolveLocation('127.0.0.1')).resolves.toBeNull();
    await expect(resolveLocation('10.1.2.3')).resolves.toBeNull();
    await expect(resolveLocation('192.168.0.5')).resolves.toBeNull();
    await expect(resolveLocation('172.16.0.5')).resolves.toBeNull();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns "city, country" for a successful lookup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', city: 'São Paulo', country: 'Brazil' }),
    });

    await expect(resolveLocation('203.0.113.7')).resolves.toBe('São Paulo, Brazil');
  });

  it('returns null when the provider responds but the lookup itself failed', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'fail' }),
    });

    await expect(resolveLocation('203.0.113.7')).resolves.toBeNull();
  });

  it('returns null when the HTTP response is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    await expect(resolveLocation('203.0.113.7')).resolves.toBeNull();
  });

  it('returns null instead of throwing when the network call fails', async () => {
    // resolveLocation's internal abort-timeout isn't cleared on the
    // fetch-rejected path, which otherwise leaks a real 2.5s timer past the
    // end of this test — fake timers keep that handle from lingering.
    jest.useFakeTimers();
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(resolveLocation('203.0.113.7')).resolves.toBeNull();

    jest.useRealTimers();
  });
});
