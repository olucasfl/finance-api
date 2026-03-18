import {
 Controller,
 Post,
 Get,
 Param,
 Body,
 UseGuards,
 Req
} from "@nestjs/common"

import { VoxAiService } from "./voxai.service"
import { VoxAiDto } from "./dto/voxai.dto"
import { PrismaService } from "src/prisma/prisma.service"
import { JwtAuthGuard } from "src/modules/auth/jwt-auth.guard"

@Controller("oratio/voxai")
@UseGuards(JwtAuthGuard)
export class VoxAiController{

 constructor(
  private readonly voxAiService: VoxAiService,
  private prisma: PrismaService
 ){}

 /* =========================
    CHAT (IA)
 ========================= */

 @Post("chat")
 async chat(@Body() body: VoxAiDto){
  return this.voxAiService.chat(body)
 }

 /* =========================
    CRIAR NOVA CONVERSA
 ========================= */

 @Post("conversation")
 async createConversation(@Req() req){

  const userId = req.user.userId // 🔥 vem do token

  return this.prisma.conversation.create({
   data:{
    userId,
    title: "Nova conversa"
   }
  })
 }

 /* =========================
    LISTAR CONVERSAS (DO USUÁRIO)
 ========================= */

 @Get("conversations")
 async getConversations(@Req() req){

  const userId = req.user.userId

  return this.prisma.conversation.findMany({
   where:{ userId }, // 🔥 só do usuário
   orderBy:{ updatedAt:"desc" }
  })
 }

 /* =========================
    PEGAR MENSAGENS DA CONVERSA
 ========================= */

 @Get("conversation/:id")
 async getMessages(
  @Param("id") id:string,
  @Req() req
 ){

  const userId = req.user.userId

  // 🔥 segurança: garante que a conversa é do usuário
  const conversation = await this.prisma.conversation.findUnique({
   where:{ id }
  })

  if(!conversation || conversation.userId !== userId){
   return { error:"Acesso negado" }
  }

  return this.prisma.message.findMany({
   where:{ conversationId:id },
   orderBy:{ createdAt:"asc" }
  })
 }

}