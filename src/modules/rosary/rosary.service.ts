import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"
import { buildRosary } from "./rosaryBuilder"

@Injectable()
export class RosaryService{

 constructor(private prisma:PrismaService){}

 /* =========================
 START
 ========================= */

getRosary(type:string){

 const valid = ["gozosos","dolorosos","gloriosos","luminosos"]

 if(!valid.includes(type)){
  throw new NotFoundException("Invalid rosary type")
 }

 return buildRosary(type)

}

 async start(userId:string){

  const session = await this.prisma.rosarySession.create({
   data:{ userId }
  })

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

 return { success:true }

}

}