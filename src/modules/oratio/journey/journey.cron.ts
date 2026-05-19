import { Injectable } from "@nestjs/common"

import { Cron }
from "@nestjs/schedule"

import { PrismaService }
from "src/prisma/prisma.service"

import { getCurrentWeekKey }
from "./utils/week.util"

@Injectable()
export class JourneyCron {

  constructor(
    private prisma: PrismaService
  ) {}

  /*
  ============================
  EVERY SUNDAY
  ============================
  */

  @Cron("0 0 * * 0")
  async handleWeeklyJourney() {

    const weekKey = getCurrentWeekKey()

    const progressList =
      await this.prisma.weeklyJourneyProgress.findMany({

        where: {
          weekKey
        },

        include: {
          member: true
        }

      })

    for (const progress of progressList) {

      if (
        progress.goalReached &&
        !progress.rewardCollected
      ) {

        const streak =
          progress.member.currentStreak + 1

        await this.prisma.journeyMember.update({

          where: {
            id: progress.member.id
          },

          data: {

            totalPoints: {
              increment: 1
            },

            currentStreak: streak,

            bestStreak:
              streak > progress.member.bestStreak
              ? streak
              : progress.member.bestStreak

          }

        })

        await this.prisma.weeklyJourneyProgress.update({

          where: {
            id: progress.id
          },

          data: {
            rewardCollected: true
          }

        })

      }

      if (!progress.goalReached) {

        await this.prisma.journeyMember.update({

          where: {
            id: progress.member.id
          },

          data: {
            currentStreak: 0
          }

        })

      }

    }

  }

}