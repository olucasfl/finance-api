import { HttpException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';

/*
Instancia o controller direto (sem DI/guards) — o que importa aqui é a
lógica de cada rota: delegação pro service certo com os argumentos certos,
e o cooldown em memória de 60s no endpoint de teste de push.
*/
describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notifications: Record<string, jest.Mock>;
  let push: { publicKey: string; sendToUser: jest.Mock };

  const req = (userId = 'user-1') => ({ user: { userId } });

  beforeEach(() => {
    notifications = {
      status: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      updateTimezone: jest.fn(),
      getInbox: jest.fn(),
      unseenCount: jest.fn(),
      markAllSeen: jest.fn(),
      markSeen: jest.fn(),
    };
    push = { publicKey: 'vapid-public-key', sendToUser: jest.fn() };

    controller = new NotificationsController(notifications as any, push as any);
  });

  it('publicKey() returns the VAPID public key', () => {
    expect(controller.publicKey()).toEqual({ publicKey: 'vapid-public-key' });
  });

  it('status() delegates with the authenticated userId', () => {
    notifications.status.mockReturnValue({ enabled: true });

    expect(controller.status(req('user-1'))).toEqual({ enabled: true });
    expect(notifications.status).toHaveBeenCalledWith('user-1');
  });

  it('subscribe() delegates the userId and subscription body', () => {
    const body = { endpoint: 'ep', p256dh: 'p', auth: 'a' } as any;

    controller.subscribe(req('user-1'), body);

    expect(notifications.subscribe).toHaveBeenCalledWith('user-1', body);
  });

  it('unsubscribe() delegates the userId and endpoint', () => {
    controller.unsubscribe(req('user-1'), { endpoint: 'ep' } as any);

    expect(notifications.unsubscribe).toHaveBeenCalledWith('user-1', 'ep');
  });

  it('timezone() delegates the userId and timezone', () => {
    controller.timezone(req('user-1'), { timezone: 'America/Sao_Paulo' } as any);

    expect(notifications.updateTimezone).toHaveBeenCalledWith('user-1', 'America/Sao_Paulo');
  });

  describe('test() — self test-push with a 60s cooldown', () => {
    it('sends a test push on the first call', () => {
      push.sendToUser.mockReturnValue('sent');

      const result = controller.test(req('user-1'));

      expect(push.sendToUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
        title: expect.any(String),
      }));
      expect(result).toBe('sent');
    });

    it('rejects a second call from the same user within 60s with 429', () => {
      controller.test(req('user-1'));

      expect(() => controller.test(req('user-1'))).toThrow(HttpException);
      expect(push.sendToUser).toHaveBeenCalledTimes(1);
    });

    it('does not rate-limit a different user', () => {
      controller.test(req('user-1'));

      expect(() => controller.test(req('user-2'))).not.toThrow();
      expect(push.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('inbox()', () => {
    it('defaults limit to 10 and passes the cursor through when given', () => {
      controller.inbox(req('user-1'), 'cursor-1', undefined);

      expect(notifications.getInbox).toHaveBeenCalledWith('user-1', 'cursor-1', 10);
    });

    it('converts an explicit limit query param to a number', () => {
      controller.inbox(req('user-1'), undefined, '5');

      expect(notifications.getInbox).toHaveBeenCalledWith('user-1', undefined, 5);
    });
  });

  it('unseenCount() delegates with the userId', () => {
    controller.unseenCount(req('user-1'));
    expect(notifications.unseenCount).toHaveBeenCalledWith('user-1');
  });

  it('seenAll() delegates with the userId', () => {
    controller.seenAll(req('user-1'));
    expect(notifications.markAllSeen).toHaveBeenCalledWith('user-1');
  });

  it('seen() delegates with the userId and notification id', () => {
    controller.seen(req('user-1'), 'notif-1');
    expect(notifications.markSeen).toHaveBeenCalledWith('user-1', 'notif-1');
  });
});
