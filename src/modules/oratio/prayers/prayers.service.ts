import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { ActivityService } from '../activity/activity.service'
import { CreatePrayerCategoryDto } from './dto/create-prayer-category.dto'
import { CreatePrayerDto } from './dto/create-prayer.dto'

@Injectable()
export class PrayersService {

 constructor(private readonly prisma: PrismaService,
   private activityService: ActivityService
 ) {}

 /* =========================
    CATEGORIES
 ========================= */

 async createCategory(data:CreatePrayerCategoryDto){

  return this.prisma.prayerCategory.create({
   data
  })

 }

 async getCategories(){

  return this.prisma.prayerCategory.findMany({
   orderBy:{
    name:"asc"
   }
  })

 }

 /* =========================
    PRAYERS
 ========================= */

 async createPrayer(data:CreatePrayerDto){

  return this.prisma.generalPrayer.create({
   data
  })

 }

 async getPrayersByCategory(slug:string){

  const prayers = await this.prisma.generalPrayer.findMany({

   where:{
    category:{
     slug
    }
   },

   orderBy:{
    title:"asc"
   }

  })

  return prayers

 }

 async getPrayer(id:string){

  const prayer = await this.prisma.generalPrayer.findUnique({
   where:{ id }
  })

  if(!prayer){
   throw new NotFoundException("Prayer not found")
  }

  return prayer

 }

   async completePrayer(userId: string){

   const now = new Date()

   await this.prisma.spiritualStats.upsert({
      where:{ userId },
      update:{
         prayersPrayed:{ increment:1 },
         lastPrayerDate:now
      },
      create:{
         userId,
         prayersPrayed:1,
         lastPrayerDate:now
      }
   })

   // Sem o título da oração de propósito — qual oração específica a
   // pessoa reza é dado sensível (pode ser um Ato de Contrição, uma
   // oração de cura, etc.) e não deve aparecer nem pro admin.
   await this.activityService.log(
      userId,
      "PRAYER",
      "Oração rezada"
   )

   return { success:true }
   }

   /* =========================
      HISTÓRICO
   ========================= */

   async getHistory(userId: string){

      return this.prisma.userActivity.findMany({
         where:{ userId, type:"PRAYER" },
         orderBy:{ createdAt:"desc" },
         take:50
      })

   }

}