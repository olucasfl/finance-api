import {
 Controller,
 Post,
 Get,
 Param,
 Body,
 UseGuards,
 Req,
 Res,
 Delete,
 Patch
} from "@nestjs/common"
import type { Request, Response } from "express"

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
 async chat(@Body() body: VoxAiDto, @Req() req){

  const userId = req.user.userId

  return this.voxAiService.chat(body, userId)
 }

 /* =========================
    CHAT EM STREAMING (IA) — mesma regra, resposta chegando aos
    pedaços em vez de tudo de uma vez. Endpoint separado do /chat
    de propósito, pra não arriscar nada no que já funciona.
 ========================= */

 @Post("chat/stream")
 async chatStream(
  @Body() body: VoxAiDto,
  @Req() req: Request & { user: { userId: string } },
  @Res() res: Response
 ){

  const userId = req.user.userId

  await this.voxAiService.chatStream(body, userId, req, res)
 }

 /* =========================
    BOOTSTRAP (lista + conversa ativa numa só chamada)
 ========================= */

 @Get("bootstrap")
 async getBootstrap(@Req() req){

  const userId = req.user.userId

  return this.voxAiService.getBootstrap(userId)
 }

 /* =========================
    CONVERSA ATIVA (🔥 PRINCIPAL)
 ========================= */

 @Get("conversation/active")
 async getActiveConversation(@Req() req){

  const userId = req.user.userId

  return this.voxAiService.getOrCreateActiveConversation(userId)
 }

 /* =========================
    NOVA CONVERSA (INTELIGENTE)
 ========================= */

 @Post("conversation")
 async createConversation(@Req() req){

  const userId = req.user.userId

  // 🔥 NÃO cria duplicada
  return this.voxAiService.getOrCreateActiveConversation(userId)
 }

 /* =========================
    LISTAR CONVERSAS (DO USUÁRIO)
 ========================= */

 @Get("conversations")
 async getConversations(@Req() req){

  const userId = req.user.userId

  return this.prisma.conversation.findMany({
   where:{ userId },
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

 /* =========================
   DELETAR CONVERSA
========================= */

    @Delete("conversation/:id")
    async deleteConversation(
    @Param("id") id: string,
    @Req() req
    ){
    const userId = req.user.userId

    return this.voxAiService.deleteConversation(userId, id)
    }

    /* =========================
   RENOMEAR CONVERSA
========================= */

    @Patch("conversation/:id")
    async renameConversation(
    @Param("id") id: string,
    @Body("title") title: string,
    @Req() req
    ){
    const userId = req.user.userId

    return this.voxAiService.renameConversation(userId, id, title)
    }
}