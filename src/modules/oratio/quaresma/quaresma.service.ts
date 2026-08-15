import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

import {
  buildSchedule,
  countLateDays,
  editionYear,
  getCurrentDay,
  quaresmaFeast,
  todayInSaoPaulo,
  weekdayOf,
} from './quaresma.schedule';

@Injectable()
export class QuaresmaService {

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  /**
   * Estado da edição atual: quais dias já foram rezados, qual dia está
   * aberto hoje e o texto das penitências. O frontend recalcula a agenda
   * por conta própria (as orações são estáticas), mas o backend continua
   * sendo a fonte de verdade do progresso.
   */
  async getProgress(userId: string) {

    const today = todayInSaoPaulo();
    const year = editionYear(today);
    const schedule = buildSchedule(year);

    const [days, penance] = await Promise.all([
      this.prisma.quaresmaMichaelDay.findMany({
        where: { userId, year },
        orderBy: { dayNumber: 'asc' },
        select: { dayNumber: true },
      }),
      this.prisma.quaresmaMichaelPenance.findUnique({
        where: { userId_year: { userId, year } },
        select: { content: true, updatedAt: true },
      }),
    ]);

    const completedDays = days.map((d) => d.dayNumber);
    const currentDay = getCurrentDay(schedule, today);

    // Domingo é descanso — menos o último do período, que é dia de oração.
    const todayIsPrayerDay = schedule.includes(today);
    const isRestDay = weekdayOf(today) === 0 && !todayIsPrayerDay;

    return {
      year,
      today,
      totalDays: schedule.length,
      startDate: schedule[0],
      endDate: schedule[schedule.length - 1],
      feastDate: quaresmaFeast(year),
      currentDay,
      isRestDay,
      completedDays,
      lateDays: countLateDays(
        currentDay,
        completedDays.length,
        todayIsPrayerDay,
      ),
      remainingDays: schedule.length - completedDays.length,
      penance: penance?.content ?? null,
      penanceUpdatedAt: penance?.updatedAt ?? null,
    };

  }

  /**
   * Marca um dia como rezado. Só o próximo da fila, e só se a data dele
   * já chegou — não dá pra adiantar a devoção nem pular dia.
   * Idempotente: repetir a chamada do mesmo dia não quebra nem duplica.
   */
  async completeDay(userId: string, dayNumber: number) {

    const today = todayInSaoPaulo();
    const year = editionYear(today);
    const schedule = buildSchedule(year);
    const currentDay = getCurrentDay(schedule, today);

    if (
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      dayNumber > schedule.length
    ) {
      throw new BadRequestException(
        `Dia inválido — a Quaresma de São Miguel tem ${schedule.length} dias este ano.`,
      );
    }

    if (currentDay === 0) {
      throw new BadRequestException(
        'A Quaresma de São Miguel ainda não começou este ano.',
      );
    }

    if (dayNumber > currentDay) {
      throw new BadRequestException('Este dia ainda não está disponível.');
    }

    const completedCount = await this.prisma.quaresmaMichaelDay.count({
      where: { userId, year },
    });

    // Já concluído antes: devolve o registro existente em vez de erro,
    // pra um toque duplicado (ou reenvio da fila offline) não virar falha.
    if (dayNumber <= completedCount) {
      return this.prisma.quaresmaMichaelDay.findUnique({
        where: { userId_year_dayNumber: { userId, year, dayNumber } },
      });
    }

    if (dayNumber !== completedCount + 1) {
      throw new BadRequestException('Conclua os dias anteriores primeiro.');
    }

    const created = await this.prisma.quaresmaMichaelDay.create({
      data: { userId, year, dayNumber },
    });

    await this.activityService
      .log(
        userId,
        'QUARESMA_MICHAEL',
        `Dia ${dayNumber}/${schedule.length} da Quaresma de São Miguel concluído`,
      )
      .catch(() => {});

    return created;

  }

  /** Desfaz a conclusão — só do último dia marcado, pra não abrir buracos. */
  async uncompleteDay(userId: string, dayNumber: number) {

    const today = todayInSaoPaulo();
    const year = editionYear(today);

    const completedCount = await this.prisma.quaresmaMichaelDay.count({
      where: { userId, year },
    });

    if (completedCount === 0 || dayNumber !== completedCount) {
      throw new BadRequestException(
        'Só é possível desfazer o último dia concluído.',
      );
    }

    const day = await this.prisma.quaresmaMichaelDay.findUnique({
      where: { userId_year_dayNumber: { userId, year, dayNumber } },
    });

    if (!day) {
      throw new NotFoundException('Dia não está marcado como concluído.');
    }

    return this.prisma.quaresmaMichaelDay.delete({ where: { id: day.id } });

  }

  /** Salva (ou atualiza) as penitências oferecidas nesta edição. */
  async savePenance(userId: string, content: string) {

    const year = editionYear(todayInSaoPaulo());

    return this.prisma.quaresmaMichaelPenance.upsert({
      where: { userId_year: { userId, year } },
      update: { content },
      create: { userId, year, content },
      select: { content: true, updatedAt: true },
    });

  }

}
