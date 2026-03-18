import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'

@Injectable()
export class PrayersService {

 constructor(private readonly prisma: PrismaService) {}

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

   async completePrayer(userId:string){

   const stats = await this.prisma.spiritualStats.findUnique({
   where:{ userId }
   })

   if(!stats){

   return this.prisma.spiritualStats.create({
      data:{
      userId,
      prayersPrayed:1,
      lastPrayerDate:new Date()
      }
   })

   }

   return this.prisma.spiritualStats.update({
   where:{ userId },
   data:{
      prayersPrayed:{
      increment:1
      },
      lastPrayerDate:new Date()
   }
   })

   }

   

}