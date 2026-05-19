import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common"

import { PrismaService } from "src/prisma/prisma.service"

import { JourneyRole } from "@prisma/client"

import { getCurrentWeekKey } from "./utils/week.util"

@Injectable()
export class JourneyService {

  constructor(
    private prisma: PrismaService
  ) {}

  /*
  ============================
  CREATE JOURNEY
  ============================
  */

  async createJourney(
    userId: string,
    partnerEmail: string
  ) {

    const partner = await this.prisma.user.findUnique({
      where: {
        email: partnerEmail
      }
    })

    if (!partner) {
      throw new NotFoundException("Usuário não encontrado")
    }

    if (partner.id === userId) {
      throw new BadRequestException(
        "Você não pode criar uma jornada consigo mesmo"
      )
    }

    const alreadyInJourney =
      await this.prisma.journeyMember.findFirst({
        where: {
          OR: [
            { userId },
            { userId: partner.id }
          ]
        }
      })

    if (alreadyInJourney) {
      throw new BadRequestException(
        "Um dos usuários já participa de uma jornada"
      )
    }

    const journey = await this.prisma.prayerJourney.create({
      data: {

        members: {

          create: [

            {
              userId,
              role: JourneyRole.OWNER
            },

            {
              userId: partner.id,
              role: JourneyRole.MEMBER
            }

          ]

        }

      },

      include: {
        members: {
          include: {
                user: {
                    select: {
                    id: true,
                    name: true,
                    email: true,
                    isAdmin: true
                    }
                }
            }
        }
      }

    })

    return journey

  }

  /*
  ============================
  GET JOURNEY
  ============================
  */

  async getJourney(userId: string) {

    const member =
      await this.prisma.journeyMember.findFirst({

        where: {
          userId
        },

        include: {

          user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isAdmin: true
                }
            },

          journey: {
            include: {

              members: {
                include: {
                        user: {
                            select: {
                            id: true,
                            name: true,
                            email: true,
                            isAdmin: true
                            }
                        }
                    }
              }

            }
          }

        }

      })

    if (!member) {
      return null
    }

    const weekKey = getCurrentWeekKey()

    const members = await Promise.all(

      member.journey.members.map(async (m) => {

        const progress =
          await this.prisma.weeklyJourneyProgress.findUnique({

            where: {
              memberId_weekKey: {
                memberId: m.id,
                weekKey
              }
            }

          })

        return {

          id: m.user.id,

          name: m.user.name,

          email: m.user.email,

          role: m.role,

          totalPoints: m.totalPoints,

          currentStreak: m.currentStreak,

          bestStreak: m.bestStreak,

          rosariesCompleted:
            progress?.rosariesCompleted || 0,

          goalReached:
            progress?.goalReached || false

        }

      })

    )

    const intentsRaw =
  await this.prisma.journeyPrayerIntent.findMany({

    where:{
      journeyId: member.journeyId,
      weekKey
    },

    include:{
      user:{
        select:{
          id:true,
          name:true
        }
      }
    },

    orderBy:{
      createdAt:"desc"
    }

  })

      const intents = intentsRaw.map(intent => ({

        id: intent.id,

        text: intent.text,

        createdAt: intent.createdAt,

        canDelete:
          intent.userId === userId,

        user:{
          id: intent.user.id,
          name: intent.user.name
        }

      }))

    return {

        weekKey,

        goal:4,

        members,

        intents

        }

  }

  /*
  ============================
  INCREMENT WEEKLY PROGRESS
  ============================
  */

  async incrementWeeklyProgress(userId: string) {

  const member =
    await this.prisma.journeyMember.findFirst({

      where: {
        userId
      }

    })


  if (!member) {


    throw new Error("MEMBER NÃO ENCONTRADO")

  }

  const weekKey = getCurrentWeekKey()


  const existing =
    await this.prisma.weeklyJourneyProgress.findUnique({

      where: {
        memberId_weekKey: {
          memberId: member.id,
          weekKey
        }
      }

    })


  if (!existing) {


    await this.prisma.weeklyJourneyProgress.create({

      data: {

        memberId: member.id,

        weekKey,

        rosariesCompleted: 1,

        goalReached: false

      }

    })


    return

  }

  const updated =
    await this.prisma.weeklyJourneyProgress.update({

      where: {
        memberId_weekKey: {
          memberId: member.id,
          weekKey
        }
      },

      data: {

        rosariesCompleted: {
          increment: 1
        }

      }

    })


  if (
    updated.rosariesCompleted >= 4 &&
    !updated.goalReached
  ) {


    await this.prisma.weeklyJourneyProgress.update({

      where: {
        id: updated.id
      },

      data: {
        goalReached: true
      }

    })

  }

}

  /*
  ============================
  HISTORY
  ============================
  */

  async getHistory(userId: string) {

    const member =
      await this.prisma.journeyMember.findFirst({

        where: {
          userId
        }

      })

    if (!member) {
      return []
    }

    return this.prisma.weeklyJourneyProgress.findMany({

      where: {
        memberId: member.id
      },

      orderBy: {
        createdAt: "desc"
      }

    })

  }

  async deleteJourney(userId:string){

    const member =
        await this.prisma.journeyMember.findFirst({

        where:{
            userId
        }

        })

    if(!member){

        throw new NotFoundException(
        "Journey not found"
        )

    }

    await this.prisma.prayerJourney.delete({

        where:{
        id: member.journeyId
        }

    })

    return {
        success:true
    }

    }

    async createIntent(
  userId:string,
  text:string
){

  const member =
    await this.prisma.journeyMember.findFirst({

      where:{
        userId
      }

    })

  if(!member){

    throw new NotFoundException(
      "Journey not found"
    )

  }

  const weekKey =
    getCurrentWeekKey()

  return this.prisma.journeyPrayerIntent.create({

    data:{

      journeyId: member.journeyId,

      userId,

      text,

      weekKey

    },

    include:{
      user:{
        select:{
          id:true,
          name:true
        }
      }
    }

  })

}

async deleteIntent(
  userId:string,
  intentId:string
){

  const intent =
    await this.prisma.journeyPrayerIntent.findUnique({

      where:{
        id:intentId
      }

    })

  if(!intent){

    throw new NotFoundException(
      "Intent not found"
    )

  }

  if(intent.userId !== userId){

    throw new BadRequestException(
      "Você não pode remover essa intenção"
    )

  }

  await this.prisma.journeyPrayerIntent.delete({

    where:{
      id:intentId
    }

  })

  return {
    success:true
  }

}

}