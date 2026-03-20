import { Injectable } from "@nestjs/common"
import axios from "axios"

import { PrismaService } from "src/prisma/prisma.service"

import { VoxAiDto } from "./dto/voxai.dto"
import { VOX_SYSTEM_PROMPT } from "./prompts/vox.prompt"
import { buildPrompt } from "./utils/buildPrompt"
import { contentFilter } from "./filters/vox.content-filter"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"

@Injectable()
export class VoxAiService{

 constructor(
  private rateLimiter: VoxRateLimiter,
  private prisma: PrismaService
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

   /* =========================
      VALIDAÇÕES
   ========================= */

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

   /* =========================
      BUSCAR HISTÓRICO
   ========================= */

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

   /* =========================
      EVITAR DUPLICAÇÃO (ANTI-SPAM)
   ========================= */

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
      BUILD PROMPT
   ========================= */

   const prompt = buildPrompt(
    VOX_SYSTEM_PROMPT,
    history,
    data.message
   )

   /* =========================
      CHAMAR IA
   ========================= */

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

   /* =========================
      DETECTAR PRIMEIRA MENSAGEM
   ========================= */

   const isFirstMessage = !conversation.hasMessages

   /* =========================
      SALVAR TUDO (TRANSAÇÃO)
   ========================= */

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
}