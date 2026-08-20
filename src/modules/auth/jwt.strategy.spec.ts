import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET_KEY;

  afterEach(() => {
    process.env.JWT_SECRET_KEY = ORIGINAL_SECRET;
  });

  it('throws at construction time when JWT_SECRET_KEY is not configured', () => {
    delete process.env.JWT_SECRET_KEY;

    expect(() => new JwtStrategy()).toThrow('JWT_SECRET_KEY não configurada no ambiente');
  });

  it('builds successfully when JWT_SECRET_KEY is configured', () => {
    process.env.JWT_SECRET_KEY = 'test-secret';

    expect(() => new JwtStrategy()).not.toThrow();
  });

  describe('validate', () => {
    it('maps the JWT payload to { userId, email } — never leaks the raw token payload as-is', async () => {
      process.env.JWT_SECRET_KEY = 'test-secret';
      const strategy = new JwtStrategy();

      const result = await strategy.validate({
        sub: 'user-1',
        email: 'person@example.com',
        iat: 123,
        exp: 456,
      });

      expect(result).toEqual({ userId: 'user-1', email: 'person@example.com' });
    });
  });
});
