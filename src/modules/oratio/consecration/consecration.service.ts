import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service'
import { toZonedTime } from 'date-fns-tz'
import { format } from 'date-fns'
import { CreateConsecrationStageDto } from './dto/create-consecration-stage.dto';
import { CreateConsecrationDayDto } from './dto/create-consecration-day.dto';
import { CreateConsecrationPrayerDto } from './dto/create-consecration-prayer.dto';
import { AddDayPrayerDto } from './dto/add-day-prayer.dto';

const TOTAL_DAYS = 33;

@Injectable()
export class ConsecrationService {

  constructor(private readonly prisma: PrismaService,
    private activityService: ActivityService
  ) {}

  private getTodayBrazil() {
    const now = toZonedTime(new Date(), "America/Sao_Paulo")

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
  }

  private toLocalDate(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12, 0, 0
    );
}

  private diffDays(start: Date, end: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;

    const startTime = this.toLocalDate(start).getTime();
    const endTime = this.toLocalDate(end).getTime();

    return Math.round((endTime - startTime) / msPerDay);
  }

  private formatLocalDate(date: Date){
    const local = new Date(date)

    const y = local.getFullYear()
    const m = String(local.getMonth() + 1).padStart(2, "0")
    const d = String(local.getDate()).padStart(2, "0")

    return `${y}-${m}-${d}`
  }

  // Quantos dias já passaram desde o início (1 = primeiro dia). 0 ou
  // negativo significa que a preparação ainda não começou.
  private diffFromStart(startDate: Date) {
    const today = this.getTodayBrazil();
    const start = this.toLocalDate(new Date(startDate));
    const utcToday = this.toLocalDate(today);

    return this.diffDays(start, utcToday) + 1;
  }

  private async completedDayNumbers(userId: string) {
    const rows = await this.prisma.consecrationCompletedDay.findMany({
      where: { userId },
      orderBy: { dayNumber: 'asc' },
      select: { dayNumber: true },
    });

    return rows.map((r) => r.dayNumber);
  }

  async start(userId: string, startDate: Date) {

    const existing = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    // Já tem uma consagração ativa: idempotente, devolve a mesma (não
    // reinicia por engano num duplo toque/reenvio).
    if (existing && !existing.completedAt) {
      return existing;
    }

    // Já concluiu uma vez e está começando outra: a antiga vira histórico
    // (já foi registrada no log de atividade ao concluir) — apaga o
    // registro e os dias marcados antes de abrir um ciclo novo.
    if (existing && existing.completedAt) {
      await this.prisma.consecrationCompletedDay.deleteMany({ where: { userId } });
      await this.prisma.consecrationProgress.delete({ where: { userId } });
    }

    const utcStartDate = this.toLocalDate(startDate);

    const result = await this.prisma.consecrationProgress.create({
        data: {
          userId,
          startDate: utcStartDate
        }
      })

      await this.activityService.log(
        userId,
        "CONSECRATION",
        "Iniciou a consagração"
      )

      return result
  }

  async progress(userId: string) {

    const progress = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    const stages = await this.prisma.consecrationStage.findMany({
      orderBy: { order: "asc" }
    });

    if (!progress) {
      return {
        started: false,
        stages
      };
    }

    const diff = this.diffFromStart(progress.startDate);

    // 0 = a preparação ainda não começou (a pessoa escolheu uma data de
    // consagração a mais de 1 dia no futuro); nunca fica negativo.
    const currentDay = Math.max(0, Math.min(diff, TOTAL_DAYS));

    const startedToday = diff === 1;

    const daysUntilStart =
      diff < 1 ? Math.abs(diff) + 1 : 0;

    const completedDays = await this.completedDayNumbers(userId);

      const consecrationDate = new Date(this.toLocalDate(progress.startDate))
      consecrationDate.setDate(consecrationDate.getDate() + TOTAL_DAYS)

      const startZoned = toZonedTime(progress.startDate, "America/Sao_Paulo")
      const consecrationZoned = toZonedTime(consecrationDate, "America/Sao_Paulo")

    return {
      started: true,
      startDate: format(startZoned, "yyyy-MM-dd"),
      consecrationDate: format(consecrationZoned, "yyyy-MM-dd"),
      currentDay,
      startedToday,
      daysUntilStart,
      completedDays,
      progress: Math.floor((completedDays.length / TOTAL_DAYS) * 100),
      finished: !!progress.completedAt,
      completedAt: progress.completedAt
        ? format(toZonedTime(progress.completedAt, "America/Sao_Paulo"), "yyyy-MM-dd")
        : null,
      stages
    }

  }

  async findDay(dayNumber: number) {

    const day = await this.prisma.consecrationDay.findFirst({
      where: { dayNumber },
      include: {
        stage: true,
        prayers: {
          include: {
            prayer: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!day) {
      throw new NotFoundException('Day not found');
    }

    return day;
  }

  async createStage(data: CreateConsecrationStageDto) {

    return this.prisma.consecrationStage.create({
      data
    });

  }

  async createDay(data: CreateConsecrationDayDto) {

    return this.prisma.consecrationDay.create({
      data
    });

  }

  async createPrayer(data: CreateConsecrationPrayerDto) {

    return this.prisma.prayer.create({
      data
    });

  }

  async addPrayerToDay(data: AddDayPrayerDto) {

    return this.prisma.dayPrayer.create({
      data
    });

  }

  async updateDayPrayer(id: string, order: number) {

    return this.prisma.dayPrayer.update({
      where: { id },
      data: { order }
    });
  }

  async updatePrayer(prayerId: string, data: { title?: string; content?: string }) {

    const prayer = await this.prisma.prayer.findUnique({
      where: { id: prayerId }
    });

    if (!prayer) {
      throw new NotFoundException("Prayer not found");
    }

    return this.prisma.prayer.update({
      where: { id: prayerId },
      data
    });

  }

  async getFullConsecration() {

    return this.prisma.consecrationStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        daysContent: {
          orderBy: { dayNumber: 'asc' },
          include: {
            prayers: {
              orderBy: { order: 'asc' },
              include: {
                prayer: true
              }
            }
          }
        }
      }
    });

  }

  async today(userId: string) {

    const progress = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      return null;
    }

    const diff = this.diffFromStart(progress.startDate);

    if (diff < 1 || diff > TOTAL_DAYS) {
      return null;
    }

    return this.findDay(diff);
  }

  async reset(userId: string) {

    await this.prisma.consecrationCompletedDay.deleteMany({
      where: { userId }
    });

    await this.prisma.consecrationProgress.deleteMany({
      where: { userId }
    });

    return { success: true };

  }

  // Fecha o ciclo: só pode acontecer com os 33 dias concluídos. Ao
  // contrário do reset, mantém a linha (e os dias) — é isso que diferencia
  // "terminou" de "desistiu" para a tela de finalização e as estatísticas
  // do admin.
  async finish(userId: string) {

    const progress = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      throw new NotFoundException("Consagração não iniciada");
    }

    if (progress.completedAt) {
      return progress;
    }

    const completedCount = await this.prisma.consecrationCompletedDay.count({
      where: { userId }
    });

    if (completedCount < TOTAL_DAYS) {
      throw new BadRequestException(
        `Complete os ${TOTAL_DAYS} dias antes de concluir a consagração.`
      );
    }

    const updated = await this.prisma.consecrationProgress.update({
      where: { userId },
      data: { completedAt: new Date() }
    });

    await this.activityService.log(
      userId,
      "CONSECRATION",
      `Concluiu a consagração de ${TOTAL_DAYS} dias a Nossa Senhora`
    ).catch(() => {});

    return updated;

  }

  async completeDay(userId: string, dayNumber: number) {

    const progress = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    if (!progress) {
      throw new BadRequestException("Consagração não iniciada");
    }

    if (progress.completedAt) {
      throw new BadRequestException("Esta consagração já foi concluída");
    }

    const diff = this.diffFromStart(progress.startDate);

    if (dayNumber > diff) {
      throw new BadRequestException("Este dia ainda não foi liberado");
    }

    const completedDays = await this.completedDayNumbers(userId);

    // Já concluído: idempotente, um duplo toque não vira erro.
    if (completedDays.includes(dayNumber)) {
      return this.prisma.consecrationCompletedDay.findUnique({
        where: { userId_dayNumber: { userId, dayNumber } }
      });
    }

    const nextExpected = completedDays.length + 1;

    if (dayNumber !== nextExpected) {
      throw new BadRequestException("Complete o dia anterior primeiro");
    }

    const result = await this.prisma.consecrationCompletedDay.create({
        data: {
          userId,
          dayNumber
        }
      })

      await this.activityService.log(
        userId,
        "CONSECRATION",
        `Dia ${dayNumber}/${TOTAL_DAYS} concluído`
      ).catch(() => {})

      return result

  }

  async updateStartDate(userId: string, startDate: Date) {

    const progress = await this.prisma.consecrationProgress.findUnique({
      where:{userId}
    })

    if(!progress){
      throw new NotFoundException("Consagração não iniciada")
    }

    if (progress.completedAt) {
      throw new BadRequestException("Não é possível alterar a data de uma consagração já concluída")
    }

    const utcStartDate = this.toLocalDate(startDate);

    await this.prisma.consecrationProgress.update({
      where:{id:progress.id},
      data:{startDate: utcStartDate}
    })

    await this.prisma.consecrationCompletedDay.deleteMany({
      where:{userId}
    })

    return { success:true }

  }

  async getStageDays(stageId: string) {

    const days = await this.prisma.consecrationDay.findMany({
      where: { stageId },
      orderBy: { dayNumber: "asc" }
    })

    return days

  }

  // Só desfaz o ÚLTIMO dia concluído — não deixa abrir buracos no meio
  // (ex.: desmarcar o dia 2 com os dias 1-5 já concluídos), que travava
  // permanentemente o avanço porque "próximo dia liberado" é sempre
  // calculado como completedDays.length + 1.
  async uncompleteDay(userId: string, dayNumber: number){

    const progress = await this.prisma.consecrationProgress.findUnique({
      where: { userId }
    });

    if (progress?.completedAt) {
      throw new BadRequestException("Não é possível alterar dias de uma consagração já concluída")
    }

    const completedDays = await this.completedDayNumbers(userId);

    if (completedDays.length === 0 || dayNumber !== completedDays[completedDays.length - 1]) {
      throw new BadRequestException("Só é possível desmarcar o último dia concluído")
    }

    const day = await this.prisma.consecrationCompletedDay.findUnique({
      where:{ userId_dayNumber: { userId, dayNumber } }
    })

    if(!day){
      throw new NotFoundException("Dia não está marcado como concluído")
    }

    return this.prisma.consecrationCompletedDay.delete({
      where:{ id: day.id }
    })

  }

  async getAllDays(){

    return this.prisma.consecrationDay.findMany({
      include:{
        prayers:{
          include:{
            prayer:true
          }
        },
        stage:true
      },
      orderBy:{
        dayNumber:"asc"
      }
    })

  }

}
