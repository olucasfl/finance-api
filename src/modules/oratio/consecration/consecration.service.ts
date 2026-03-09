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

    if (!progress) {
      return { started: false };
    }

    const today = new Date();
    const diff = today.getTime() - progress.startDate.getTime();
    const currentDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

    return {
      started: true,
      startDate: progress.startDate,
      currentDay
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

    return this.prisma.consecrationProgress.deleteMany({
      where: { userId }
    });

  }
}