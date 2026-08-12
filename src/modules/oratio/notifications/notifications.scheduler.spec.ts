import { NotificationsScheduler } from './notifications.scheduler';

describe('NotificationsScheduler.shouldFireAtHour', () => {
  // shouldFireAtHour é puro (não toca prisma/send), então dá pra instanciar
  // com dependências vazias.
  const scheduler = new NotificationsScheduler({} as any, {} as any);

  it('elegível da hora marcada em diante (fica na fila o dia todo)', () => {
    expect(scheduler.shouldFireAtHour(7, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(8, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(13, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(21, 7)).toBe(true);
  });

  it('não elegível antes da hora da regra', () => {
    expect(scheduler.shouldFireAtHour(6, 7)).toBe(false);
    expect(scheduler.shouldFireAtHour(19, 20)).toBe(false);
  });

  it('respeita quiet hours no começo do dia (antes das 7h)', () => {
    expect(scheduler.shouldFireAtHour(6, 6)).toBe(false);
  });

  it('respeita quiet hours no fim do dia (22h em diante)', () => {
    expect(scheduler.shouldFireAtHour(20, 20)).toBe(true);
    expect(scheduler.shouldFireAtHour(21, 20)).toBe(true);
    expect(scheduler.shouldFireAtHour(22, 20)).toBe(false);
  });
});
