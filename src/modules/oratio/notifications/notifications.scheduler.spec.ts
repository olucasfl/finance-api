import { NotificationsScheduler } from './notifications.scheduler';

describe('NotificationsScheduler.shouldFireAtHour', () => {
  // shouldFireAtHour é puro (não toca prisma/send), então dá pra instanciar
  // com dependências vazias.
  const scheduler = new NotificationsScheduler({} as any, {} as any);

  it('dispara na hora exata da regra', () => {
    expect(scheduler.shouldFireAtHour(7, 7)).toBe(true);
    expect(scheduler.shouldFireAtHour(12, 12)).toBe(true);
    expect(scheduler.shouldFireAtHour(20, 20)).toBe(true);
  });

  it('dispara dentro da janela de catch-up (hora + 1)', () => {
    expect(scheduler.shouldFireAtHour(8, 7)).toBe(true);
  });

  it('não dispara depois da janela de catch-up', () => {
    expect(scheduler.shouldFireAtHour(9, 7)).toBe(false);
  });

  it('não dispara antes da hora da regra', () => {
    expect(scheduler.shouldFireAtHour(6, 7)).toBe(false);
  });

  it('respeita quiet hours no começo do dia (antes das 7h)', () => {
    // regra às 6h nunca dispara — 6h está dentro do quiet
    expect(scheduler.shouldFireAtHour(6, 6)).toBe(false);
  });

  it('respeita quiet hours no fim do dia (22h em diante)', () => {
    // 21h ok; 22h já é quiet, mesmo que o catch-up alcançasse
    expect(scheduler.shouldFireAtHour(21, 21)).toBe(true);
    expect(scheduler.shouldFireAtHour(22, 21)).toBe(false);
  });
});
