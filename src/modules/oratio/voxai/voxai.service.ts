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

 async chat(data: VoxAiDto){

  try{

   /* =========================
      VALIDAÇÕES
   ========================= */

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
      SALVAR MENSAGEM DO USER
   ========================= */

   await this.prisma.message.create({
    data:{
     conversationId: data.conversationId,
     role: "user",
     content: data.message
    }
   })

   /* =========================
      GERAR TÍTULO (SE PRIMEIRA MSG)
   ========================= */

   const count = await this.prisma.message.count({
    where:{ conversationId: data.conversationId }
   })

   if(count === 1){

    const words = data.message.trim().split(/\s+/).slice(0,5)
    const title = words.join(" ")

    await this.prisma.conversation.update({
     where:{ id: data.conversationId },
     data:{ title }
    })
   }

   /* =========================
      BUSCAR HISTÓRICO (ÚLTIMAS 6)
   ========================= */

   const historyMessages = await this.prisma.message.findMany({
    where:{
     conversationId: data.conversationId
    },
    orderBy:{
     createdAt:"desc"
    },
    take:6
   })

   const history = historyMessages
    .reverse()
    .map(m => ({
     role: m.role,
     content: m.content
    }))

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

   const text =
    response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Não foi possível gerar resposta."

   /* =========================
      SALVAR RESPOSTA DA IA
   ========================= */

   await this.prisma.message.create({
    data:{
     conversationId: data.conversationId,
     role:"assistant",
     content:text
    }
   })

   /* =========================
      ATUALIZAR CONVERSA (ORDER)
   ========================= */

   await this.prisma.conversation.update({
    where:{ id: data.conversationId },
    data:{ updatedAt: new Date() }
   })

   return {
    success:true,
    response:text
   }

  }catch(error:any){

   console.error("Erro VoxAI:",error?.response?.data || error)

   if(error?.response?.status === 429){
    return {
     success:false,
     error:"LIMIT_EXCEEDED",
     message:
      "O VoxAI atingiu o limite diário de mensagens. Tente novamente amanhã."
    }
   }

   return {
    success:false,
    error:"AI_ERROR",
    message:"O VoxAI está temporariamente indisponível."
   }

  }

 }

}