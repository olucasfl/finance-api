import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConsecrationService {

  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, startDate: Date) {

    const existing = await this.prisma.consecrationProgress.findFirst({
      where: { userId }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.consecrationProgress.create({
      data: {
        userId,
        startDate
      }
    });
  }

  async progress(userId: string) {

  const progress = await this.prisma.consecrationProgress.findFirst({
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

  const today = new Date();
  const start = new Date(progress.startDate);

  const diff =
    Math.floor(
    (today.getTime() - start.getTime()) /
    (1000 * 60 * 60 * 24)
    ) + 1;

  const startedToday = diff >= 1;

  const daysUntilStart =
    diff < 1 ? Math.abs(diff) + 1 : 0;

  const completedDays = await this.prisma.consecrationCompletedDay.count({
    where: { userId }
  });

  const progressPercent =
    Math.floor((completedDays / 33) * 100);

  return {
    started: true,
    startDate: progress.startDate,
    currentDay: diff,
    startedToday,
    daysUntilStart,
    completedDays,
    progress: progressPercent,
    stages
  };

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

  async createStage(data: any) {

    return this.prisma.consecrationStage.create({
      data
    });

  }

  async createDay(data: any) {

    return this.prisma.consecrationDay.create({
      data
    });

  }

  async createPrayer(data: any) {

    return this.prisma.prayer.create({
      data
    });

  }

  async addPrayerToDay(data: any) {

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

    const progress = await this.prisma.consecrationProgress.findFirst({
      where: { userId }
    });

    if (!progress) {
      return null;
    }

    const diff =
      Math.floor(
        (Date.now() - progress.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1;

    if (diff < 1 || diff > 33) {
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

  async completeDay(userId: string, dayNumber: number) {

    const progress = await this.prisma.consecrationProgress.findFirst({
      where: { userId }
    });

    if (!progress) {
      throw new Error("Consagração não iniciada");
    }

    const diff =
      Math.floor(
        (Date.now() - progress.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1;

    if (dayNumber > diff) {
      throw new Error("Dia ainda não liberado");
    }

    const previous = await this.prisma.consecrationCompletedDay.findFirst({
      where: {
        userId,
        dayNumber: dayNumber - 1
      }
    });

    if (dayNumber !== 1 && !previous) {
      throw new Error("Complete o dia anterior primeiro");
    }

    return this.prisma.consecrationCompletedDay.create({
      data: {
        userId,
        dayNumber
      }
    });

  }

  async updateStartDate(userId: string, startDate: Date) {

  const progress = await this.prisma.consecrationProgress.findFirst({
    where:{userId}
  })

  if(!progress){
    throw new NotFoundException("Consagração não iniciada")
  }

  await this.prisma.consecrationProgress.update({
    where:{id:progress.id},
    data:{startDate}
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

  async uncompleteDay(userId: string, dayNumber: number){

  const day = await this.prisma.consecrationCompletedDay.findFirst({
    where:{
    userId,
    dayNumber
    }
  })

  if(!day){
    throw new NotFoundException("Dia não está marcado como concluído")
  }

  return this.prisma.consecrationCompletedDay.delete({
    where:{ id: day.id }
  })

  }

}