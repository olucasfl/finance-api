import { Injectable } from "@nestjs/common"
import axios from "axios"

import { VoxAiDto } from "./dto/voxai.dto"
import { VOX_SYSTEM_PROMPT } from "./prompts/vox.prompt"
import { buildPrompt } from "./utils/buildPrompt"
import { contentFilter } from "./filters/vox.content-filter"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"

@Injectable()
export class VoxAiService{

 constructor(
  private rateLimiter:VoxRateLimiter
 ){}

 private apiKey = process.env.GEMINI_API_KEY

 private url =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"

 async chat(data:VoxAiDto){

  try{

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

   const history = data.history?.slice(-6) || []

   const prompt = buildPrompt(
    VOX_SYSTEM_PROMPT,
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

   const text =
    response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Não foi possível gerar resposta."

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