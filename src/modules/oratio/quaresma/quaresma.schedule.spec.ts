import {
  buildSchedule,
  countLateDays,
  getCurrentDay,
  prayingSunday,
  totalDays,
  weekdayOf,
  addDays,
  diffDays,
  quaresmaFeast,
  quaresmaStart,
  editionYear,
} from './quaresma.schedule';

describe('agenda da Quaresma de São Miguel', () => {

  describe('buildSchedule', () => {

    it('começa em 15/08', () => {
      const schedule = buildSchedule(2026);

      expect(schedule[0]).toBe('2026-08-15');
      expect(schedule[0]).toBe(quaresmaStart(2026));
    });

    it('TERMINA na Festa de São Miguel, em qualquer ano', () => {
      for (const year of [2025, 2026, 2027, 2028, 2029]) {
        const schedule = buildSchedule(year);
        expect(schedule[schedule.length - 1]).toBe(quaresmaFeast(year));
      }
    });

    it('em 2026 são 40 dias — 39 fora de domingo mais o último domingo', () => {
      const schedule = buildSchedule(2026);

      expect(diffDays('2026-08-15', '2026-09-29') + 1).toBe(46);

      const foraDeDomingo = schedule.filter((d) => weekdayOf(d) !== 0);
      const domingos = schedule.filter((d) => weekdayOf(d) === 0);

      expect(foraDeDomingo).toHaveLength(39);
      expect(domingos).toEqual(['2026-09-27']);
      expect(totalDays(2026)).toBe(40);
    });

    it('o dia 40 é a própria Festa, 29/09', () => {
      const schedule = buildSchedule(2026);

      expect(schedule[39]).toBe('2026-09-29');
      expect(schedule[38]).toBe('2026-09-28');
      expect(schedule[37]).toBe('2026-09-27'); // o domingo que conta
      expect(schedule[36]).toBe('2026-09-26');
    });

    it('inclui apenas o ÚLTIMO domingo do período', () => {
      for (const year of [2025, 2026, 2027, 2028, 2029]) {
        const domingos = buildSchedule(year).filter(
          (date) => weekdayOf(date) === 0,
        );

        expect(domingos).toHaveLength(1);
        expect(domingos[0]).toBe(prayingSunday(year));
        // Não sobra nenhum domingo depois dele até a Festa.
        expect(diffDays(domingos[0], quaresmaFeast(year))).toBeLessThan(7);
      }
    });

    it('os outros domingos ficam de fora — 16/08 e 23/08 não estão na agenda', () => {
      const schedule = buildSchedule(2026);

      expect(schedule).not.toContain('2026-08-16');
      expect(schedule).not.toContain('2026-08-23');
      expect(schedule).not.toContain('2026-09-20');
    });

    it('está em ordem crescente e sem datas repetidas', () => {
      const schedule = buildSchedule(2026);
      const ordenada = [...schedule].sort();

      expect(schedule).toEqual(ordenada);
      expect(new Set(schedule).size).toBe(schedule.length);
    });

    it('pula o domingo: 15/08/2026 é sábado, então o dia 2 é a segunda 17/08', () => {
      const schedule = buildSchedule(2026);

      expect(schedule[0]).toBe('2026-08-15'); // sábado
      expect(schedule[1]).toBe('2026-08-17'); // segunda (16 é domingo)
    });

    it('nunca passa da Festa', () => {
      const schedule = buildSchedule(2026);
      const festa = quaresmaFeast(2026);

      expect(festa).toBe('2026-09-29');
      expect(schedule.every((date) => date <= festa)).toBe(true);
    });

  });

  describe('getCurrentDay', () => {

    const schedule = buildSchedule(2026);

    it('é 0 antes do início', () => {
      expect(getCurrentDay(schedule, '2026-08-14')).toBe(0);
      expect(getCurrentDay(schedule, '2026-01-01')).toBe(0);
    });

    it('abre o dia 1 no próprio 15/08', () => {
      expect(getCurrentDay(schedule, '2026-08-15')).toBe(1);
    });

    it('não abre dia novo num domingo de descanso', () => {
      // 16/08/2026 é domingo: continua valendo o dia 1 aberto no sábado.
      expect(getCurrentDay(schedule, '2026-08-16')).toBe(1);
      expect(getCurrentDay(schedule, '2026-08-17')).toBe(2);
    });

    it('mas abre no último domingo, que é dia de oração', () => {
      expect(getCurrentDay(schedule, '2026-09-26')).toBe(37); // sábado
      expect(getCurrentDay(schedule, '2026-09-27')).toBe(38); // domingo que conta
      expect(getCurrentDay(schedule, '2026-09-28')).toBe(39);
      expect(getCurrentDay(schedule, '2026-09-29')).toBe(40); // Festa
    });

    it('trava no último dia depois do fim da agenda', () => {
      const ultimo = schedule[schedule.length - 1];

      expect(getCurrentDay(schedule, ultimo)).toBe(schedule.length);
      expect(getCurrentDay(schedule, addDays(ultimo, 30))).toBe(schedule.length);
    });

    it('devolve o índice certo pra cada data da agenda', () => {
      schedule.forEach((date, index) => {
        expect(getCurrentDay(schedule, date)).toBe(index + 1);
      });
    });

  });

  describe('countLateDays', () => {

    it('não conta o dia que abriu hoje como atraso', () => {
      // Dia 1 aberto hoje, nada rezado ainda: zero atraso.
      expect(countLateDays(1, 0, true)).toBe(0);
      // Dia 5 aberto hoje, 2 rezados: os dias 3 e 4 é que estão em atraso.
      expect(countLateDays(5, 2, true)).toBe(2);
    });

    it('em dia de descanso conta tudo que está aberto, porque já é passado', () => {
      expect(countLateDays(5, 2, false)).toBe(3);
      expect(countLateDays(5, 5, false)).toBe(0);
    });

    it('nunca é negativo', () => {
      expect(countLateDays(0, 0, true)).toBe(0);
      expect(countLateDays(3, 3, true)).toBe(0);
    });

  });

  describe('utilidades de data', () => {

    it('addDays atravessa a virada do mês', () => {
      expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
      expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
    });

    it('diffDays conta a distância até a Festa', () => {
      expect(diffDays('2026-08-15', '2026-09-29')).toBe(45);
      expect(diffDays('2026-09-29', '2026-09-29')).toBe(0);
    });

    it('weekdayOf identifica domingo', () => {
      expect(weekdayOf('2026-08-16')).toBe(0);
      expect(weekdayOf('2026-08-15')).toBe(6);
    });

    it('editionYear é o ano civil da data', () => {
      expect(editionYear('2026-08-15')).toBe(2026);
      expect(editionYear('2027-01-02')).toBe(2027);
    });

  });

});
