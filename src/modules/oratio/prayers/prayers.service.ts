import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { ActivityService } from '../activity/activity.service'

@Injectable()
export class PrayersService {

 constructor(private readonly prisma: PrismaService,
   private activityService: ActivityService
 ) {}

 /* =========================
    CATEGORIES
 ========================= */

 async createCategory(data:any){

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

 async createPrayer(data:any){

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

   await this.activityService.log(
      userId,
      "PRAYER",
      "Oração rezada"
   )

   return { success:true }
   }  

}