import { Injectable } from "@nestjs/common"
import axios from "axios"

import { PrismaService } from "src/prisma/prisma.service"

import { VoxAiDto } from "./dto/voxai.dto"
import { VOX_SYSTEM_PROMPT } from "./prompts/vox.prompt"
import { contentFilter } from "./filters/vox.content-filter"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"
import { parseNaturalDate } from "./utils/date-parser"
import { ActivityService } from '../activity/activity.service'

@Injectable()
export class VoxAiService{

 constructor(
  private rateLimiter: VoxRateLimiter,
  private prisma: PrismaService,
  private liturgicalCalendarService: LiturgicalCalendarService,
  private activityService: ActivityService
 ){}

 private apiKey = process.env.OPENAI_API_KEY

 private url = "https://api.openai.com/v1/chat/completions"

 private model = "gpt-4.1-mini"

 private get headers(){
  return {
   Authorization: `Bearer ${this.apiKey}`,
   "Content-Type": "application/json"
  }
 }

 /* =========================
    GERAR TÍTULO
 ========================= */
 private generateTitle(text: string){
  return text
   .replace(/[^\w\s]/gi, "")
   .split(" ")
   .slice(0, 5)
   .join(" ")
 }

 private formatLiturgicalForAI(data: any): string {

  if (!data) return "NÃO DISPONÍVEL"

  const evangelho = data?.leituras?.evangelho?.[0]
  const primeira = data?.leituras?.primeiraLeitura?.[0]
  const segunda = data?.leituras?.segundaLeitura?.[0]
  const salmo = data?.leituras?.salmo?.[0]

  return `
📅 Data: ${data.data}
📖 Liturgia: ${data.liturgia}
🎨 Cor: ${data.cor}

📜 Primeira Leitura: ${primeira?.referencia}
${primeira?.texto?.slice(0, 300)}

📜 Salmo: ${salmo?.referencia}
Refrao: ${salmo?.refrao}
${salmo?.texto?.slice(0, 600)}

📜 Segunda Leitura: ${segunda?.referencia || "—"}
${segunda?.texto?.slice(0, 300) || ""}

📜 Evangelho: ${evangelho?.referencia}
${evangelho?.texto?.slice(0, 800)}
`
}

 /* =========================
    🧠 EXTRAIR DATA COM IA
 ========================= */
 private async extractDateWithAI(message: string): Promise<Date | null>{

  try{

   const response = await axios.post(
    this.url,
    {
     model: this.model,
     messages:[
      {
       role:"user",
       content:`Extraia a data da frase abaixo.

Regras MUITO IMPORTANTES:
- Responda SOMENTE no formato YYYY-MM-DD (ex: 2026-03-22)
- NÃO escreva texto
- NÃO explique
- NÃO use outro formato

Se não houver data clara, responda: NONE

Frase: "${message}"`
      }
     ],
     max_tokens: 20
    },
    { headers: this.headers }
   )

   const text = response?.data?.choices?.[0]?.message?.content?.trim()

   if(!text || text === "NONE") return null

   const normalized = text.trim()

   if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(normalized + "T00:00:00")
   }

   const parsed = new Date(normalized)

   if (!isNaN(parsed.getTime())) {
    return parsed
   }

   return null

  }catch{
   return null
  }
 }

 /* =========================
    PEGAR OU CRIAR CONVERSA
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
 async chat(data: VoxAiDto, userId: string){

  try{

   if(!this.apiKey){
    throw new Error("OPENAI_API_KEY not configured")
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

   if(conversation.userId !== userId){
    return {
     success:false,
     error:"FORBIDDEN",
     message:"Conversa inválida."
    }
   }

   const rate = this.rateLimiter.check(userId)

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
     role: m.role as "user" | "assistant",
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

   /* =========================
      🧠 DATA INTELIGENTE
   ========================= */

   const now = new Date()
   const brazilToday = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })

   let parsedDate = await this.extractDateWithAI(data.message)

   if (!parsedDate) {
    parsedDate = parseNaturalDate(data.message)
   }

   if (!parsedDate) {
    parsedDate = now
   }

   const requestedDateText = parsedDate.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo"
   })

   /* =========================
      📅 LITURGIA
   ========================= */

   let targetLiturgical: unknown = null

   try{
    targetLiturgical = await this.liturgicalCalendarService.getLiturgicalData(parsedDate)
   }catch{
    targetLiturgical = null
   }

   const liturgySummarized = this.formatLiturgicalForAI(targetLiturgical)

   /* =========================
      🧠 PROMPT FINAL
   ========================= */

   const systemPrompt = `${VOX_SYSTEM_PROMPT}

⚠️ REGRA ABSOLUTA:
Se a seção "Liturgia EXATA" estiver presente, você DEVE usar essas informações.
É PROIBIDO dizer que não tem dados se eles estiverem disponíveis.

Data atual (Brasil): ${brazilToday}
Data solicitada: ${requestedDateText}

Liturgia EXATA:
${liturgySummarized}
`

   const response = await axios.post(
    this.url,
    {
     model: this.model,
     messages:[
      { role:"system", content: systemPrompt },
      ...history,
      { role:"user", content: data.message }
     ],
     max_tokens: 2000
    },
    {
     headers: this.headers,
     timeout: 30000
    }
   )

   const text = response?.data?.choices?.[0]?.message?.content

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

   await this.activityService.log(
      conversation.userId,
      "VOX",
      "Conversou com o Vox"
   )

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
    DELETE
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

  return this.getOrCreateActiveConversation(userId)
 }

 /* =========================
    RENAME
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
