import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service'

@Injectable()
export class ConsecrationService {

  constructor(private readonly prisma: PrismaService,
    private activityService: ActivityService
  ) {}

  private toLocalDate(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }

  private diffUtcDays(start: Date, end: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;

    const startTime = this.toLocalDate(start).getTime();
    const endTime = this.toLocalDate(end).getTime();

    return Math.floor((endTime - startTime) / msPerDay);
  }

  async start(userId: string, startDate: Date) {

    const existing = await this.prisma.consecrationProgress.findFirst({
      where: { userId }
    });

    if (existing) {
      return existing;
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

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startRaw = new Date(progress.startDate);
    const start = this.toLocalDate(startRaw);
    const utcToday = this.toLocalDate(today);

    const diff = this.diffUtcDays(start, utcToday) + 1;

    const currentDay = Math.min(diff, 33);

    const startedToday = diff >= 1;

    const daysUntilStart =
      diff < 1 ? Math.abs(diff) + 1 : 0;

    const completedDays = await this.prisma.consecrationCompletedDay.count({
      where: { userId }
    });

    const progressPercent =
      Math.floor((completedDays / 33) * 100);

      const consecrationDate = new Date(start)
      consecrationDate.setDate(consecrationDate.getDate() + 32)

    return {
      started: true,
      startDate: progress.startDate.toISOString().split("T")[0],
      consecrationDate: consecrationDate.toISOString().split("T")[0],
      currentDay,
      startedToday,
      daysUntilStart,
      completedDays,
      progress: progressPercent,
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

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startRaw = new Date(progress.startDate);
    const start = this.toLocalDate(startRaw);
    const utcToday = this.toLocalDate(today);

    const diff = this.diffUtcDays(start, utcToday) + 1;

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

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startRaw = new Date(progress.startDate);
    const start = this.toLocalDate(startRaw);
    const utcToday = this.toLocalDate(today);

    const diff = this.diffUtcDays(start, utcToday) + 1;

    if (dayNumber > diff) {
      throw new Error("Dia ainda não liberado");
    }

    const existing = await this.prisma.consecrationCompletedDay.findFirst({
      where:{
        userId,
        dayNumber
      }
    });

    if(existing){
      return existing;
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

    const result = await this.prisma.consecrationCompletedDay.create({
        data: {
          userId,
          dayNumber
        }
      })

      // 🔥 LOG AQUI
      await this.activityService.log(
        userId,
        "CONSECRATION",
        `Dia ${dayNumber}/33 concluído`
      )

      return result

  }

  async updateStartDate(userId: string, startDate: Date) {

    const progress = await this.prisma.consecrationProgress.findFirst({
      where:{userId}
    })

    if(!progress){
      throw new NotFoundException("Consagração não iniciada")
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