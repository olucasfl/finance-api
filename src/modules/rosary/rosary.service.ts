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

 async start(userId:string, type:string, restart?:boolean){

  if(restart){

   await this.prisma.rosarySession.deleteMany({
    where:{ userId, type, completed:false }
   })

  }else{

   const existing = await this.getSession(userId, type)

   if(existing){
    return existing
   }

  }

  const session = await this.prisma.rosarySession.create({
   data:{ userId, type }
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

 // Sessão incompleta aberta há mais tempo que isso é tratada como
 // abandonada, não como "para continuar depois". Sem esse limite, uma
 // pessoa que abre um terço, não termina, e só volta dias depois
 // reaproveitava a MESMA sessão — e ao finalizar, a duração calculada
 // (finishedAt - startedAt) virava um número absurdo (dias, às vezes
 // meses), porque startedAt continuava sendo o de semanas atrás.
 private readonly STALE_SESSION_HOURS = 12

 async getSession(userId:string, type:string){

  const session = await this.prisma.rosarySession.findFirst({

   where:{
    userId,
    type,
    completed:false
   },

   orderBy:{ startedAt:"desc" }

  })

  if(!session) return null

  const cutoff = new Date(Date.now() - this.STALE_SESSION_HOURS * 60 * 60 * 1000)

  if(session.startedAt < cutoff){

   // Descarta a sessão abandonada — quem chamou começa uma nova, fresca.
   await this.prisma.rosarySession.delete({
    where:{ id:session.id }
   })

   return null

  }

  return session

 }

 /* =========================
 UPDATE STEP
 ========================= */

 async updateStep(userId:string, type:string, step:number, elapsedSeconds?:number){

  const session = await this.getSession(userId, type)

  if(!session){
   return null
  }

  return this.prisma.rosarySession.update({

   where:{ id:session.id },

   data:{
    currentStep:step,
    ...(typeof elapsedSeconds === "number"
     ? { elapsedSeconds }
     : {})
   }

  })

 }

 /* =========================
 ACTIVE PROGRESS (para a lista de terços)
 ========================= */

 async getActiveProgress(userId:string){

  const cutoff = new Date(Date.now() - this.STALE_SESSION_HOURS * 60 * 60 * 1000)

  const sessions = await this.prisma.rosarySession.findMany({

   // Sessões abandonadas há mais de STALE_SESSION_HOURS não aparecem
   // como "continuar de onde parou" — mesmo critério do getSession().
   where:{ userId, completed:false, startedAt:{ gte:cutoff } },

   orderBy:{ startedAt:"desc" }

  })

  // mantém só a sessão mais recente de cada type
  const latestByType = new Map<string, typeof sessions[number]>()

  for(const s of sessions){
   if(!latestByType.has(s.type)){
    latestByType.set(s.type, s)
   }
  }

  return Array.from(latestByType.values())
   .filter((s)=> s.currentStep > 0)
   .map((s)=>{

    let totalSteps = 0

    try{
     totalSteps = this.getRosary(s.type).length
    }catch{
     totalSteps = 0
    }

    return {
     type:s.type,
     currentStep:s.currentStep,
     totalSteps
    }

   })
   .filter((s)=> s.totalSteps > 0)

 }

 /* =========================
 HISTÓRICO
 ========================= */

 async getHistory(userId:string){

  return this.prisma.rosarySession.findMany({

   where:{ userId, completed:true },

   orderBy:{ finishedAt:"desc" },

   take:50

  })

 }

 /* =========================
 FINISH
 ========================= */

async finish(userId:string, type:string){

 const session = await this.getSession(userId, type)

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
