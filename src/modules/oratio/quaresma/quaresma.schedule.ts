/**
 * Agenda da Quaresma de São Miguel.
 *
 * A devoção começa em 15/08 (Assunção) e termina NA Festa de São Miguel
 * (29/09), pulando os domingos — que são dia de descanso e Missa, como na
 * Quaresma da Páscoa. Um "dia" da devoção é, portanto, uma data que não
 * cai em domingo.
 *
 * O total sai do próprio calendário do ano, não de uma constante — e a
 * agenda sempre termina NA Festa, que é o que define a devoção.
 *
 * Tudo aqui é função pura sobre datas ISO ("YYYY-MM-DD"): nada de `new
 * Date()` escondido, nada de fuso do servidor influenciando o resultado.
 * Quem chama decide qual é o "hoje" (veja `todayInSaoPaulo`), e o mesmo
 * cálculo roda igualzinho no frontend.
 */

/** Início da devoção: 15 de agosto, Assunção de Nossa Senhora. */
export const QUARESMA_START_MONTH = 8;
export const QUARESMA_START_DAY = 15;

/** Festa de São Miguel Arcanjo: 29 de setembro. */
export const QUARESMA_FEAST_MONTH = 9;
export const QUARESMA_FEAST_DAY = 29;

/** Fuso do público do app — a agenda é a mesma pra todo mundo. */
export const QUARESMA_TIMEZONE = 'America/Sao_Paulo';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Dia da semana (0 = domingo) de uma data ISO, sem passar por fuso:
 * o `Date` é montado em UTC e lido em UTC.
 */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Soma dias a uma data ISO, devolvendo outra data ISO. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return isoDate(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    base.getUTCDate(),
  );
}

/** Diferença em dias entre duas datas ISO (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const from = Date.UTC(ay, am - 1, ad);
  const to = Date.UTC(by, bm - 1, bd);
  return Math.round((to - from) / 86400000);
}

export function quaresmaStart(year: number) {
  return isoDate(year, QUARESMA_START_MONTH, QUARESMA_START_DAY);
}

export function quaresmaFeast(year: number) {
  return isoDate(year, QUARESMA_FEAST_MONTH, QUARESMA_FEAST_DAY);
}

/**
 * As datas de oração do ano, em ordem: `schedule[n - 1]` é a data do dia
 * `n`. Vai de 15/08 até a Festa (29/09).
 *
 * A regra dos domingos tem uma exceção que é o que faz a conta fechar em
 * 40: os domingos do período são de descanso, MENOS o último, que entra
 * na contagem oficial de oração. Em 2026 são 46 dias de calendário, 39
 * deles fora de domingo, mais o domingo 27/09 — 40 dias, terminando
 * exatamente na Festa dos Arcanjos.
 */
export function buildSchedule(year: number): string[] {
  const feast = quaresmaFeast(year);

  const all: string[] = [];
  for (let cursor = quaresmaStart(year); cursor <= feast; cursor = addDays(cursor, 1)) {
    all.push(cursor);
  }

  const lastSunday = [...all].reverse().find((date) => weekdayOf(date) === 0);

  return all.filter((date) => weekdayOf(date) !== 0 || date === lastSunday);
}

/** Quantos dias de oração a edição do ano tem (40 em 2026). */
export function totalDays(year: number): number {
  return buildSchedule(year).length;
}

/** O domingo do período que conta como dia de oração, se houver. */
export function prayingSunday(year: number): string | undefined {
  return buildSchedule(year).find((date) => weekdayOf(date) === 0);
}

/**
 * Quantos dias já abriram até `todayIso` — ou seja, quantas datas da
 * agenda já chegaram. 0 antes de começar, 40 depois do fim. Em domingo
 * nenhum dia novo abre, porque domingo não está na agenda.
 */
export function getCurrentDay(schedule: string[], todayIso: string): number {
  let count = 0;
  for (const date of schedule) {
    if (date <= todayIso) count++;
    else break;
  }
  return count;
}

/**
 * Dias em atraso: os que ABRIRAM ANTES DE HOJE e não foram rezados.
 *
 * O dia que abriu hoje ainda está em aberto — contá-lo como atraso faria
 * a pessoa ver "1 em atraso" no dia 1, antes mesmo de poder rezar. Num
 * dia de descanso não abre dia novo, então tudo que está aberto já é
 * passado.
 */
export function countLateDays(
  currentDay: number,
  completedCount: number,
  todayIsPrayerDay: boolean,
): number {
  const opened = todayIsPrayerDay
    ? Math.max(currentDay - 1, 0)
    : currentDay;

  return Math.max(opened - completedCount, 0);
}

/** A data de hoje no fuso do app, como ISO. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  // 'en-CA' formata como YYYY-MM-DD, que é exatamente o formato ISO curto.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: QUARESMA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * A edição da devoção a que `todayIso` pertence é simplesmente o ano
 * civil — a janela inteira (agosto/setembro) cabe dentro de um ano só.
 * Antes de 15/08 a edição do ano ainda não começou (`currentDay` = 0).
 */
export function editionYear(todayIso: string): number {
  return Number(todayIso.slice(0, 4));
}
