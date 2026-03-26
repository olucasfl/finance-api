import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  // 🔥 Centraliza timezone (evita repetição e erro)
  private getBrazilMidnight(date: Date = new Date()): Date {
    const brDate = new Date(
      date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    )
    brDate.setHours(0, 0, 0, 0)
    return brDate
  }

  async updateLoginStreak(userId: string) {

    const now = this.getBrazilMidnight()

    const stats = await this.prisma.spiritualStats.findUnique({
      where: { userId }
    })

    let newStreak = 1

    if (stats) {

      const currentStreak = stats.prayerStreak || 0

      if (stats.lastLoginDate) {

        const last = this.getBrazilMidnight(new Date(stats.lastLoginDate))

        const diff = Math.floor(
          (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        )

        // 🔥 Dia seguinte → incrementa
        if (diff === 1) {
          newStreak = currentStreak + 1
        }

        // 🔥 Mesmo dia → NÃO FAZ NADA (evita update inútil)
        else if (diff === 0) {
          return
        }

        // 🔥 Quebrou streak
        else {
          newStreak = 1
        }

      } else {
        newStreak = 1
      }

    }

    await this.prisma.spiritualStats.upsert({
      where: { userId },
      update: {
        prayerStreak: newStreak,
        lastLoginDate: new Date() // mantém UTC (boa prática)
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