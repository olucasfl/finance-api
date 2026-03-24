import { Injectable } from "@nestjs/common"
import axios from "axios"

import { PrismaService } from "src/prisma/prisma.service"

import { VoxAiDto } from "./dto/voxai.dto"
import { VOX_SYSTEM_PROMPT } from "./prompts/vox.prompt"
import { buildPrompt } from "./utils/buildPrompt"
import { contentFilter } from "./filters/vox.content-filter"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"

@Injectable()
export class VoxAiService{

 constructor(
  private rateLimiter: VoxRateLimiter,
  private prisma: PrismaService,
  private liturgicalCalendarService: LiturgicalCalendarService
 ){}

 private apiKey = process.env.GEMINI_API_KEY

 private url =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"

 /* =========================
    GERAR TÍTULO (🔥 NOVO)
 ========================= */
 private generateTitle(text: string){
  return text
   .replace(/[^\w\s]/gi, "")
   .split(" ")
   .slice(0, 5)
   .join(" ")
 }

 private parseDateFromMessage(message: string){
  const today = new Date()
  const normalized = message.toLowerCase()

  // Datas explícitas: 23/03/2026 ou 23/03
  const explicitDateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/) 
  if(explicitDateMatch){
   const day = Number(explicitDateMatch[1])
   const month = Number(explicitDateMatch[2])
   const year = explicitDateMatch[3] ? Number(explicitDateMatch[3]) : today.getFullYear()
   if(month >= 1 && month <= 12 && day >= 1 && day <= 31){
    return new Date(year, month - 1, day)
   }
  }

  // Datas por extenso: 25 de março de 2026 ou 25 de março
  const monthNames = {
   janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
   julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12
  }
  const extensoDateMatch = normalized.match(/(\d{1,2})\s+de\s+(\w+)\s*(?:de\s+(\d{2,4}))?/)
  if(extensoDateMatch){
   const day = Number(extensoDateMatch[1])
   const monthName = extensoDateMatch[2]
   const year = extensoDateMatch[3] ? Number(extensoDateMatch[3]) : today.getFullYear()
   const month = monthNames[monthName as keyof typeof monthNames]
   if(month && day >= 1 && day <= 31){
    return new Date(year, month - 1, day)
   }
  }

  if(normalized.includes("hoje")){
   return today
  }

  if(normalized.includes("ontem")){
   const y = new Date(today)
   y.setDate(today.getDate() - 1)
   return y
  }

  if(normalized.includes("amanhã") || normalized.includes("amanha")){
   const t = new Date(today)
   t.setDate(today.getDate() + 1)
   return t
  }

  // Dias da semana ("domingo que vem", "próximo sábado")
  const weekdayNames: Record<string, number> = {
   domingo: 0,
   segunda: 1,
   "segunda-feira": 1,
   terça: 2,
   "terça-feira": 2,
   quarta: 3,
   "quarta-feira": 3,
   quinta: 4,
   "quinta-feira": 4,
   sexta: 5,
   "sexta-feira": 5,
   sábado: 6,
   sabado: 6,
  }

  const weekdayMatch = normalized.match(/(domingo|segunda(?:-feira)?|terça(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|sabado)\s+(que\s+vem|pro[óo]ximo|pr[oó]ximo)/)
  if (weekdayMatch) {
   const weekday = weekdayNames[weekdayMatch[1] as keyof typeof weekdayNames]
   if (weekday !== undefined) {
    const currentWeekday = today.getDay()
    let diff = (weekday - currentWeekday + 7) % 7
    if (diff === 0) {
     diff = 7
    }
    const target = new Date(today)
    target.setDate(today.getDate() + diff)
    return target
   }
  }

  // Relativo genérico - dias, semanas, meses, anos
  const relativeRules = [
   { regex: /(\d+)\s+dia[s]?\s+atr[aá]s/, value: -1, unit: "days" },
   { regex: /daqui\s+(\d+)\s+dia[s]?/, value: 1, unit: "days" },
   { regex: /em\s+(\d+)\s+dia[s]?/, value: 1, unit: "days" },
   { regex: /(\d+)\s+semana[s]?\s+atr[aá]s/, value: -1, unit: "weeks" },
   { regex: /daqui\s+(\d+)\s+semana[s]?/, value: 1, unit: "weeks" },
   { regex: /em\s+(\d+)\s+semana[s]?/, value: 1, unit: "weeks" },
   { regex: /(\d+)\s+mes[e]s?\s+atr[aá]s/, value: -1, unit: "months" },
   { regex: /daqui\s+(\d+)\s+mes[e]s?/, value: 1, unit: "months" },
   { regex: /em\s+(\d+)\s+mes[e]s?/, value: 1, unit: "months" },
   { regex: /(\d+)\s+ano[s]?\s+atr[aá]s/, value: -1, unit: "years" },
   { regex: /daqui\s+(\d+)\s+ano[s]?/, value: 1, unit: "years" },
   { regex: /em\s+(\d+)\s+ano[s]?/, value: 1, unit: "years" },
  ]

  for(const rule of relativeRules){
   const m = normalized.match(rule.regex)
   if(m){
    const count = Number(m[1])
    if(Number.isNaN(count)) continue
    const delta = count * rule.value
    const target = new Date(today)

    if(rule.unit === "days") target.setDate(today.getDate() + delta)
    if(rule.unit === "weeks") target.setDate(today.getDate() + delta * 7)
    if(rule.unit === "months") target.setMonth(today.getMonth() + delta)
    if(rule.unit === "years") target.setFullYear(today.getFullYear() + delta)

    return target
   }
  }

  // Se não houver data clara, retorna hoje para germinar respostas sempre válidas.
  return today
 }

 /* =========================
    PEGAR OU CRIAR CONVERSA ATIVA
 ========================= */
 async getOrCreateActiveConversation(userId: string){

  const existing = await this.prisma.conversation.findFirst({
   where:{
    userId,
    hasMessages:false
   },
   orderBy:{ createdAt:"desc" }
  })

  if(existing) return existing

  return this.prisma.conversation.create({
   data:{
    userId,
    title:"Nova conversa",
    hasMessages:false
   }
  })
 }

 /* =========================
    CHAT (IA)
 ========================= */
 async chat(data: VoxAiDto){

  try{

   if(!this.apiKey){
    throw new Error("GEMINI_API_KEY not configured")
   }

   if(!data.message){
    return {
     success:false,
     error:"EMPTY_MESSAGE",
     message:"Mensagem vazia."
    }
   }

   if(data.message.length > 1000){
    return {
     success:false,
     error:"MESSAGE_TOO_LONG",
     message:"Mensagem muito longa."
    }
   }

   const conversation = await this.prisma.conversation.findUnique({
    where:{ id: data.conversationId }
   })

   if(!conversation){
    return {
     success:false,
     error:"INVALID_CONVERSATION",
     message:"Conversa inválida."
    }
   }

   const rate = this.rateLimiter.check("global-user")

   if(!rate.allowed){
    return {
     success:false,
     error:"RATE_LIMIT",
     message:rate.message
    }
   }

   const filter = contentFilter(data.message)

   if(filter.blocked){
    return {
     success:true,
     response:filter.message
    }
   }

   const historyMessages = await this.prisma.message.findMany({
    where:{ conversationId: data.conversationId },
    orderBy:{ createdAt:"desc" },
    take:6
   })

   const history = historyMessages
    .reverse()
    .map(m => ({
     role: m.role,
     content: m.content
    }))

   const existing = await this.prisma.message.findFirst({
    where:{
     conversationId: data.conversationId,
     role:"user",
     content:data.message,
     createdAt:{
      gte: new Date(Date.now() - 5000)
     }
    },
    orderBy:{ createdAt:"desc" }
   })

   if(existing){
    return {
     success:true,
     response:"Aguarde, processando sua última mensagem..."
    }
   }

   // Contexto de datas + liturgia com base nas demandas do chat
   const now = new Date()
   const brazilToday = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
   const parsedDate = this.parseDateFromMessage(data.message)

   const todayLiturgical = await this.liturgicalCalendarService.getLiturgicalData()
   let targetLiturgical = todayLiturgical
   let requestedDateText = "hoje"

   if(parsedDate){
    requestedDateText = parsedDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    const parsedDay = parsedDate.getDate()
    const parsedMonth = parsedDate.getMonth() + 1
    const parsedYear = parsedDate.getFullYear()

    try {
     const liturgicalByDate = await this.liturgicalCalendarService.getLiturgicalData(parsedDate)
     if(liturgicalByDate && typeof liturgicalByDate === 'object' && !('erro' in liturgicalByDate)){
      targetLiturgical = liturgicalByDate
     } else {
      targetLiturgical = null // Não disponível
     }
    } catch {
     targetLiturgical = null
    }
   }

   const liturgicalContext = await this.liturgicalCalendarService.getLiturgicalContext(parsedDate)
   const liturgySummarized = targetLiturgical ? JSON.stringify(targetLiturgical) : "Dados litúrgicos não disponíveis para essa data. Consulte fontes oficiais como o site da CNBB."

   const enhancedSystemPrompt = `${VOX_SYSTEM_PROMPT}\n\nData atual (Brasil): ${brazilToday}\nData solicitada: ${requestedDateText}\nContexto litúrgico (hoje, ontem, amanhã e data solicitada): ${liturgicalContext}\nLiturgia solicitada: ${liturgySummarized}`

   const prompt = buildPrompt(
    enhancedSystemPrompt,
    history,
    data.message
   )

   const response = await axios.post(
    `${this.url}?key=${this.apiKey}`,
    {
     contents:[
      {
       parts:[
        { text:prompt }
       ]
      }
     ]
    },
    {
     timeout:30000
    }
   )

   const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text

   if(!text){
    throw new Error("EMPTY_AI_RESPONSE")
   }

   const isFirstMessage = !conversation.hasMessages

   await this.prisma.$transaction([

    this.prisma.message.create({
     data:{
      conversationId: data.conversationId,
      role:"user",
      content:data.message
     }
    }),

    this.prisma.message.create({
     data:{
      conversationId: data.conversationId,
      role:"assistant",
      content:text
     }
    }),

    this.prisma.conversation.update({
     where:{ id: data.conversationId },
     data:{
      updatedAt:new Date(),
      hasMessages:true,
      ...(isFirstMessage && {
        title: this.generateTitle(data.message)
      })
     }
    })
   ])

   return {
    success:true,
    response:text
   }

  }catch(error:any){

   console.error("Erro VoxAI:", {
    status: error?.response?.status,
    data: error?.response?.data,
    message: error.message
   })

   if(error?.response?.status === 401){
    return {
     success:false,
     error:"UNAUTHORIZED",
     message:"Sessão expirada."
    }
   }

   if(error?.response?.status === 429){
    return {
     success:false,
     error:"LIMIT_EXCEEDED",
     message:"O VoxAI atingiu o limite diário."
    }
   }

   if(error.code === "ECONNABORTED"){
    return {
     success:false,
     error:"TIMEOUT",
     message:"O Vox demorou para responder."
    }
   }

   if(error?.response){
    return {
     success:false,
     error:"AI_PROVIDER_ERROR",
     message:"Erro na comunicação com a IA."
    }
   }

   return {
    success:false,
    error:"UNKNOWN_ERROR",
    message:"Erro inesperado no servidor."
   }

  }
 }

 /* =========================
    DELETAR CONVERSA
 ========================= */
 async deleteConversation(userId: string, conversationId: string){

  const conversation = await this.prisma.conversation.findUnique({
   where:{ id: conversationId }
  })

  if(!conversation || conversation.userId !== userId){
   throw new Error("CONVERSATION_NOT_FOUND")
  }

  await this.prisma.message.deleteMany({
   where:{ conversationId }
  })

  await this.prisma.conversation.delete({
   where:{ id: conversationId }
  })

  // 🔥 pega ou cria nova ativa automaticamente
  return this.getOrCreateActiveConversation(userId)
 }

 /* =========================
    RENOMEAR CONVERSA
 ========================= */
 async renameConversation(
  userId: string,
  conversationId: string,
  title: string
 ){

  const conversation = await this.prisma.conversation.findUnique({
   where:{ id: conversationId }
  })

  if(!conversation || conversation.userId !== userId){
   throw new Error("CONVERSATION_NOT_FOUND")
  }

  return this.prisma.conversation.update({
   where:{ id: conversationId },
   data:{ title }
  })
 }

}