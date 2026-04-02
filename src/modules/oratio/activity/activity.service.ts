import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  private getBrazilDateString(date: Date = new Date()): string {
    return date.toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo"
    })
  }

  async updateLoginStreak(userId: string) {

    const today = this.getBrazilDateString()

    const stats = await this.prisma.spiritualStats.findUnique({
      where: { userId }
    })

    let newStreak = 1 // 🔥 sempre começa em 1 ao logar

    if (stats) {

      const currentStreak = stats.prayerStreak || 0

      if (stats.lastLoginDate) {

        const last = this.getBrazilDateString(new Date(stats.lastLoginDate))

        const diff = Math.floor(
          (new Date(today).getTime() - new Date(last).getTime()) /
          (1000 * 60 * 60 * 24)
        )

        if (diff === 1) {
          // 🔥 continua sequência
          newStreak = currentStreak + 1
        }
        else if (diff === 0) {
          // 🔥 mesmo dia → não muda
          return
        }
        else {
          // ❄️ quebrou → mas ao entrar vira 1
          newStreak = 1
        }

      }

    }

    await this.prisma.spiritualStats.upsert({
      where: { userId },
      update: {
        prayerStreak: newStreak,
        lastLoginDate: new Date()
      },
      create: {
        userId,
        prayerStreak: 1,
        lastLoginDate: new Date()
      }
    })
  }

  async log(userId: string, type: string, action: string) {

    const result = await this.prisma.userActivity.create({
      data: {
        userId,
        type,
        action,
      },
    })

    if (type === "LOGIN") {
      await this.updateLoginStreak(userId)
    }

    return result
  }
}