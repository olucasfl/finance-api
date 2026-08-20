import { parseNaturalDate } from './date-parser';

/*
"Hoje" fixado em 2026-02-04 (quarta-feira) via fake timers, porque
parseNaturalDate deriva tudo de getBrazilToday() -> new Date() por baixo
dos panos. 15:00Z cai bem no meio do dia em Brasília (UTC-3, sem
ambiguidade de fronteira de dia).
*/
function expectDate(date: Date | null, year: number, month: number, day: number) {
  expect(date).not.toBeNull();
  expect(date!.getFullYear()).toBe(year);
  expect(date!.getMonth()).toBe(month);
  expect(date!.getDate()).toBe(day);
}

describe('parseNaturalDate', () => {

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-04T15:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when no date expression is recognized', () => {
    expect(parseNaturalDate('qual é a capital da França?')).toBeNull();
  });

  describe('simple relatives', () => {
    it('"hoje" resolves to today', () => {
      expectDate(parseNaturalDate('o que é a liturgia de hoje?'), 2026, 1, 4);
    });

    it('"ontem" resolves to yesterday', () => {
      expectDate(parseNaturalDate('o que foi a liturgia de ontem?'), 2026, 1, 3);
    });

    /*
    BUG (not fixed here, see report): "ontem" is checked before
    "anteontem" in the source, and "anteontem" contains "ontem" as a
    substring — so this branch is unreachable dead code. Any message with
    "anteontem" actually matches the "ontem" (yesterday) check first and
    returns 1 day ago instead of 2. This test documents the real, current
    behavior, not the intended one.
    */
    it('"anteontem" actually resolves to ONE day ago, not two — "ontem" matches first', () => {
      expectDate(parseNaturalDate('e anteontem, o que foi?'), 2026, 1, 3);
    });

    it('"amanhã" resolves to tomorrow', () => {
      expectDate(parseNaturalDate('e amanhã, o que vai ser?'), 2026, 1, 5);
    });

    it('accepts "amanha" without the accent', () => {
      expectDate(parseNaturalDate('e amanha?'), 2026, 1, 5);
    });
  });

  describe('"há X dias/semanas"', () => {
    it('"há 3 dias" subtracts 3 days', () => {
      expectDate(parseNaturalDate('o que foi há 3 dias?'), 2026, 1, 1);
    });

    it('"há 2 semanas" subtracts 14 days', () => {
      expectDate(parseNaturalDate('o que foi há 2 semanas?'), 2026, 0, 21);
    });
  });

  describe('"daqui X dias/semanas"', () => {
    it('"daqui 5 dias" adds 5 days', () => {
      expectDate(parseNaturalDate('o que vai ser daqui 5 dias?'), 2026, 1, 9);
    });

    it('"daqui 1 semana" adds 7 days', () => {
      expectDate(parseNaturalDate('o que vai ser daqui 1 semana?'), 2026, 1, 11);
    });
  });

  describe('week references', () => {
    it('"semana passada" subtracts 7 days', () => {
      expectDate(parseNaturalDate('a liturgia da semana passada'), 2026, 0, 28);
    });

    it('"semana que vem" adds 7 days', () => {
      expectDate(parseNaturalDate('a liturgia da semana que vem'), 2026, 1, 11);
    });

    it('"próxima semana" also adds 7 days', () => {
      expectDate(parseNaturalDate('a liturgia da próxima semana'), 2026, 1, 11);
    });
  });

  describe('weekday references', () => {
    it('"segunda passada" resolves to the most recent past Monday', () => {
      expectDate(parseNaturalDate('o evangelho de segunda passada'), 2026, 1, 2);
    });

    it('"sexta que vem" resolves to the coming Friday', () => {
      expectDate(parseNaturalDate('o evangelho de sexta que vem'), 2026, 1, 6);
    });

    it('"quarta passada" on a Wednesday means the PREVIOUS week, not today', () => {
      expectDate(parseNaturalDate('o evangelho de quarta passada'), 2026, 0, 28);
    });

    it('"quarta que vem" on a Wednesday means the NEXT week, not today', () => {
      expectDate(parseNaturalDate('o evangelho de quarta que vem'), 2026, 1, 11);
    });
  });

  describe('special Sunday references', () => {
    it('"domingo passado" resolves to the most recent past Sunday', () => {
      expectDate(parseNaturalDate('a liturgia de domingo passado'), 2026, 1, 1);
    });

    it('"domingo retrasado" resolves to the Sunday before that', () => {
      expectDate(parseNaturalDate('a liturgia de domingo retrasado'), 2026, 0, 25);
    });
  });

  describe('numeric dates', () => {
    it('"dd/mm" without a year assumes the current year', () => {
      expectDate(parseNaturalDate('o que foi em 15/03?'), 2026, 2, 15);
    });

    it('"dd/mm/yyyy" uses the given year', () => {
      expectDate(parseNaturalDate('o que foi em 15/03/2027?'), 2027, 2, 15);
    });

    it('accepts "-" as a separator', () => {
      expectDate(parseNaturalDate('o que foi em 15-03-2027?'), 2027, 2, 15);
    });
  });

  describe('textual dates ("10 de dezembro")', () => {
    it('without a year assumes the current year', () => {
      expectDate(parseNaturalDate('o que foi em 10 de dezembro?'), 2026, 11, 10);
    });

    it('with a year uses the given year', () => {
      expectDate(parseNaturalDate('o que foi em 10 de dezembro de 2024?'), 2024, 11, 10);
    });

    it('accepts "marco" without the cedilla', () => {
      expectDate(parseNaturalDate('o que foi em 5 de marco?'), 2026, 2, 5);
    });

    it('returns null for an unrecognized month name', () => {
      expect(parseNaturalDate('o que foi em 5 de nadamas?')).toBeNull();
    });
  });

});
