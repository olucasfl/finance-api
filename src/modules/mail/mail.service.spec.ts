import axios from 'axios';
import { MailService } from './mail.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MailService', () => {
  let service: MailService;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BREVO_API_KEY: 'brevo-key' };
    service = new MailService();
    mockedAxios.post.mockReset();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('sendOratioVerificationEmail', () => {
    it('posts to the Brevo API with the verification link embedded and returns true on success', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const result = await service.sendOratioVerificationEmail('user@example.com', 'tok-123');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({
          to: [{ email: 'user@example.com' }],
          subject: expect.stringContaining('Confirme seu email'),
          htmlContent: expect.stringContaining(
            'https://oratio-phi.vercel.app/verificar-email?token=tok-123',
          ),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'api-key': 'brevo-key' }),
        }),
      );
    });

    it('returns false instead of throwing when the Brevo API call fails', async () => {
      mockedAxios.post.mockRejectedValue({ response: { data: { message: 'bad request' } } });

      const result = await service.sendOratioVerificationEmail('user@example.com', 'tok-123');

      expect(result).toBe(false);
    });

    it('returns false without ever calling axios when BREVO_API_KEY is not configured', async () => {
      delete process.env.BREVO_API_KEY;

      const result = await service.sendOratioVerificationEmail('user@example.com', 'tok-123');

      expect(result).toBe(false);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('handles a network failure with no HTTP response (e.g. timeout) gracefully', async () => {
      mockedAxios.post.mockRejectedValue({ message: 'timeout of 10000ms exceeded' });

      await expect(
        service.sendOratioVerificationEmail('user@example.com', 'tok-123'),
      ).resolves.toBe(false);
    });
  });

  describe('sendOratioPasswordResetEmail', () => {
    it('embeds the reset link with token and app query params', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.sendOratioPasswordResetEmail('user@example.com', 'reset-tok');

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).htmlContent).toContain(
        'https://oratio-phi.vercel.app/login?resetToken=reset-tok&app=oratio',
      );
    });

    it('does not throw even when the send fails (forgot-password must respond the same either way)', async () => {
      mockedAxios.post.mockRejectedValue(new Error('down'));

      await expect(
        service.sendOratioPasswordResetEmail('user@example.com', 'reset-tok'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendOratioEmailChangeConfirmation', () => {
    it('embeds the confirm-email-change link with the token and returns true on success', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const result = await service.sendOratioEmailChangeConfirmation('new@example.com', 'tok-xyz');

      expect(result).toBe(true);
      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).htmlContent).toContain(
        'https://oratio-phi.vercel.app/confirmar-troca-email?token=tok-xyz',
      );
      expect((payload as any).to).toEqual([{ email: 'new@example.com' }]);
    });

    it('returns false when the send fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('down'));

      await expect(
        service.sendOratioEmailChangeConfirmation('new@example.com', 'tok-xyz'),
      ).resolves.toBe(false);
    });
  });
});
