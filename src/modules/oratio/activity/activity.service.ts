import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async updateLoginStreak(userId: string){

    const now = new Date()
    now.setHours(0,0,0,0)

    const stats = await this.prisma.spiritualStats.findUnique({
        where:{ userId }
    })

    let newStreak = 1

    if(stats){

        const currentStreak = stats.prayerStreak || 0

        if(stats.lastLoginDate){

        const last = new Date(stats.lastLoginDate)
        last.setHours(0,0,0,0)

        const diff = Math.floor(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
        )

        if(diff === 1){
            newStreak = currentStreak + 1
        } 
        else if(diff === 0){
            newStreak = currentStreak > 0 ? currentStreak : 1
        } 
        else {
            newStreak = 1
        }

        } else {
        newStreak = 1
        }

    }

    await this.prisma.spiritualStats.upsert({
        where:{ userId },
        update:{
        prayerStreak: newStreak,
        lastLoginDate: new Date()
        },
        create:{
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

    if(type === "LOGIN"){
        await this.updateLoginStreak(userId)
    }

    return result
    }
}