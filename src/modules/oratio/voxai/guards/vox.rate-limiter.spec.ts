import { VoxRateLimiter } from './vox.rate-limiter';

describe('VoxRateLimiter', () => {
  let limiter: VoxRateLimiter;

  beforeEach(() => {
    limiter = new VoxRateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows the first request for a user', () => {
    const result = limiter.check('user-1');
    expect(result.allowed).toBe(true);
  });

  it('allows up to 5 requests within the same minute', () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user-1').allowed).toBe(true);
    }
  });

  it('blocks the 6th request within the same minute and reports a retry time', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }

    const result = limiter.check('user-1');

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(result.message).toContain('limite de perguntas por minuto');
  });

  it('tracks each user independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }

    expect(limiter.check('user-1').allowed).toBe(false);
    expect(limiter.check('user-2').allowed).toBe(true);
  });

  it('allows requests again once the window has fully passed', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }
    expect(limiter.check('user-1').allowed).toBe(false);

    jest.advanceTimersByTime(60_001);

    expect(limiter.check('user-1').allowed).toBe(true);
  });

  it('does not allow requests again a moment before the window passes', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }

    jest.advanceTimersByTime(59_000);

    expect(limiter.check('user-1').allowed).toBe(false);
  });

});
