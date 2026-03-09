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
          orderBy: { order: 'asc' }
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

    return this.prisma.consecrationPrayer.create({
      data
    });
  }

}