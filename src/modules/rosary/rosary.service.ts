import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"
import { buildRosary } from "./rosaryBuilder"
import { ActivityService } from '../oratio/activity/activity.service'
import { buildSevenSorrows } from "./sevenSorrowsBuilder"
import { buildDivineMercy } from "./divineMercyBuilder"
import { buildSacredHeart } from "./sacredHearthBuilder"
import { buildStJoseph } from "./StJosephBuilder"
import { buildStMichael } from "./stMichaelBuilder"
import { buildStBenedict } from "./stBenedictBuilder"
import { buildHolySpirit } from "./HolySpiritBuilder"
import { buildTearsMary } from "./tearsMaryBuilder"
import { buildViaSacra } from "./viaSacraBuilder"
import { JourneyService } from "../oratio/journey/journey.service"

@Injectable()
export class RosaryService{

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
    private journeyService: JourneyService
  ){}

 /* =========================
 START
 ========================= */

getRosary(type:string){

 const defaultRosaries = ["gozosos","dolorosos","gloriosos","luminosos"]

 if(defaultRosaries.includes(type)){
  return buildRosary(type)
 }

 // 👇 NOVOS TERÇOS
 if(type === "sete-dores"){
  return buildSevenSorrows()
 }

  if(type === "misericordia"){
    return buildDivineMercy()
  }
  
  if(type === "sagrado-coracao"){
    return buildSacredHeart()
  }

  if(type === "sao-jose"){
    return buildStJoseph()
  }

  if(type === "sao-miguel"){
    return buildStMichael()
  }

  if(type === "sao-bento"){
    return buildStBenedict()
  }

  if(type === "espirito-santo"){
    return buildHolySpirit()
  }

  if(type === "coroa-lagrimas"){
    return buildTearsMary()
  }

  if(type === "via-sacra"){
    return buildViaSacra()
  }

 throw new NotFoundException("Invalid rosary type")
}

 async start(userId:string){

  const session = await this.prisma.rosarySession.create({
   data:{ userId }
  })

  await this.activityService.log(
   userId,
   "ROSARY",
   "Iniciou o terço"
 )

  return session

 }

 /* =========================
 GET SESSION
 ========================= */

 async getSession(userId:string){

  return this.prisma.rosarySession.findFirst({

   where:{
    userId,
    completed:false
   }

  })

 }

 /* =========================
 NEXT STEP
 ========================= */

 async nextStep(userId:string){

  const session = await this.getSession(userId)

  if(!session){
   throw new NotFoundException("Rosary session not found")
  }

  return this.prisma.rosarySession.update({

   where:{ id:session.id },

   data:{
    currentStep:{
     increment:1
    }
   }

  })

 }

 /* =========================
 FINISH
 ========================= */

async finish(userId:string){

 const session = await this.getSession(userId)

 if(!session){
  throw new NotFoundException("Rosary session not found")
 }

 const now = new Date()

 await this.prisma.rosarySession.update({

  where:{ id:session.id },

  data:{
   completed:true,
   finishedAt:now
  }

 })

 /* atualizar stats */

 const stats = await this.prisma.spiritualStats.findUnique({
  where:{ userId }
 })

 if(!stats){

  await this.prisma.spiritualStats.create({

   data:{
    userId,
    rosariesPrayed:1,
    lastPrayerDate:now
   }

  })

 }else{

  await this.prisma.spiritualStats.update({

   where:{ userId },

   data:{
    rosariesPrayed:{
     increment:1
    },
    lastPrayerDate:now
   }

  })

 }

 try {

  await this.journeyService
    .incrementWeeklyProgress(userId)

} catch(error){

  console.log(error)

}

 await this.activityService.log(
  userId,
  "ROSARY",
  "Terço concluído"
)

 return { success:true }

}

}