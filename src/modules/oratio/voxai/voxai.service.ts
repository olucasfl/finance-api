import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import axios from "axios"
import https from "https"
import type { Request, Response } from "express"

import { PrismaService } from "src/prisma/prisma.service"

import { VoxAiDto } from "./dto/voxai.dto"
import { VOX_IDENTITY, VOX_PROFILES, VOX_PROFILE_KEYS, resolveVoxProfile } from "./prompts/vox.prompt"
import { contentFilter } from "./filters/vox.content-filter"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"
import { parseNaturalDate } from "./utils/date-parser"
import { getBrazilToday } from "./utils/brazil-date"
import { ActivityService } from '../activity/activity.service'

// Só vale acionar o parser/busca de data litúrgica quando a mensagem
// realmente tem a ver com liturgia — evita forçar o Vox a comentar a
// liturgia do dia em perguntas que não têm nada a ver com isso.
const LITURGY_KEYWORDS = /liturgia|evangelho|leituras?\b|santos? do dia|missal|calend[aá]rio lit[uú]rgico|o que a igreja celebra|celebra[cç][aã]o (de|do) (hoje|dia)|que dia lit[uú]rgico/i

@Injectable()
export class VoxAiService{

 constructor(
  private rateLimiter: VoxRateLimiter,
  private prisma: PrismaService,
  private liturgicalCalendarService: LiturgicalCalendarService,
  private activityService: ActivityService
 ){}

 private readonly logger = new Logger(VoxAiService.name)

 private apiKey = process.env.OPENAI_API_KEY

 private url = "https://api.openai.com/v1/chat/completions"

 private model = "gpt-4.1-mini"

 // Conexão HTTPS reaproveitada entre requisições (keep-alive) em vez de
 // abrir um socket TLS novo para a OpenAI a cada mensagem.
 private httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 })

 private get headers(){
  return {
   Authorization: `Bearer ${this.apiKey}`,
   "Content-Type": "application/json"
  }
 }

 private toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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
    MONTAGEM DO SYSTEM PROMPT

    Fonte única: chat() e chatStream() chamam este helper em vez de montar
    a string cada um por conta própria. A identidade (VOX_IDENTITY) é fixa;
    o systemAppend do perfil (quando existe) vai POR ÚLTIMO, como a
    instrução mais recente sobre formato/tom. A identidade continua valendo.
 ========================= */
 private buildSystemPrompt(args: {
  profileKey: string | null
  brazilToday: string
  liturgySection: string
 }): string {

  const profile = resolveVoxProfile(args.profileKey)

  const base = `${VOX_IDENTITY}

Data atual (Brasil): ${args.brazilToday}
${args.liturgySection}`

  return profile.systemAppend
   ? `${base}

${profile.systemAppend}`
   : base
 }

 /* =========================
    🧠 EXTRAIR DATA COM IA (fallback quando o parser local não reconhece)
 ========================= */
 private async extractDateWithAI(message: string, referenceDate: Date): Promise<Date | null>{

  try{

   const referenceStr = this.toISODate(referenceDate)

   const response = await axios.post(
    this.url,
    {
     model: this.model,
     messages:[
      {
       role:"user",
       content:`Hoje é ${referenceStr} (formato YYYY-MM-DD). Extraia a data mencionada na frase abaixo, calculando datas relativas (ex: "amanhã", "semana que vem", "daqui a 3 dias") a partir de hoje.

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
    { headers: this.headers, httpsAgent: this.httpsAgent }
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
    BOOTSTRAP (lista + conversa ativa numa só ida ao backend)
 ========================= */
 async getBootstrap(userId: string){

  // sequencial de propósito: garante que, se uma conversa nova precisar
  // ser criada, ela já apareça na lista devolvida logo em seguida
  const active = await this.getOrCreateActiveConversation(userId)

  const conversations = await this.prisma.conversation.findMany({
   where:{ userId },
   orderBy:{ updatedAt:"desc" }
  })

  const user = await this.prisma.user.findUnique({
   where:{ id: userId },
   select:{ voxProfile:true, voxOnboardingSeenAt:true }
  })

  return {
   active,
   conversations,
   profile: user?.voxProfile ?? null,
   // card de novidade só enquanto a pessoa nunca escolheu perfil E nunca
   // dispensou o onboarding — escolher ou dispensar carimba a data
   showVoxIntro: !user?.voxProfile && !user?.voxOnboardingSeenAt
  }
 }

 /* =========================
    PERFIS DE RESPOSTA DO VOX
 ========================= */

 // Metadados dos perfis para o frontend (cards + visão detalhada).
 // Nunca devolve systemAppend nem maxTokens — são internos.
 listProfiles(){
  return VOX_PROFILE_KEYS.map(key => {
   const { label, short, details, examples } = VOX_PROFILES[key]
   return { key, label, short, details, examples }
  })
 }

 async setProfile(userId: string, profile: string){
  await this.prisma.user.update({
   where:{ id: userId },
   // escolher um perfil também encerra o onboarding
   data:{ voxProfile: profile, voxOnboardingSeenAt: new Date() }
  })
  return { profile }
 }

 async markIntroSeen(userId: string){
  await this.prisma.user.update({
   where:{ id: userId },
   data:{ voxOnboardingSeenAt: new Date() }
  })
  return { ok: true }
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
     message:rate.message,
     retryAfterSeconds:rate.retryAfterSeconds
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
      🧠 DATA ATUAL (sempre disponível ao Vox, para "que dia é hoje",
      "amanhã" etc. — independente de a mensagem falar de liturgia)
   ========================= */

   const brazilNow = getBrazilToday()
   const brazilToday = this.toISODate(brazilNow)

   /* =========================
      📅 LITURGIA (só entra em jogo quando a mensagem realmente
      menciona liturgia/evangelho/santo do dia — senão o Vox fica
      "obrigado" a comentar liturgia em qualquer pergunta)
   ========================= */

   let liturgySection = ""

   if (LITURGY_KEYWORDS.test(data.message)) {

    // parser local primeiro (instantâneo); IA só entra se o parser
    // não reconhecer nenhuma data na frase
    let parsedDate = parseNaturalDate(data.message)

    if (!parsedDate) {
     parsedDate = await this.extractDateWithAI(data.message, brazilNow)
    }

    if (!parsedDate) {
     parsedDate = brazilNow
    }

    const requestedDateText = this.toISODate(parsedDate)

    let targetLiturgical: unknown = null

    try{
     targetLiturgical = await this.liturgicalCalendarService.getLiturgicalData(parsedDate)
    }catch{
     targetLiturgical = null
    }

    const liturgySummarized = this.formatLiturgicalForAI(targetLiturgical)

    liturgySection = `
⚠️ REGRA ABSOLUTA:
A seção "Liturgia EXATA" abaixo está aqui porque a pergunta do usuário menciona liturgia, evangelho, santo do dia ou uma data específica. Se os dados estiverem disponíveis, você DEVE usá-los e é PROIBIDO dizer que não tem dados.

Data solicitada: ${requestedDateText}

Liturgia EXATA:
${liturgySummarized}
`
   }

   /* =========================
      🧠 PROMPT FINAL

      Perfil de resposta do usuário (null → DEFAULT "Padrão"). Define o
      systemAppend colado no fim do prompt e o teto de tokens da resposta.
   ========================= */

   const voxUser = await this.prisma.user.findUnique({
    where:{ id: userId },
    select:{ voxProfile:true }
   })
   const profileKey = voxUser?.voxProfile ?? null
   const profile = resolveVoxProfile(profileKey)

   const systemPrompt = this.buildSystemPrompt({
    profileKey,
    brazilToday,
    liturgySection
   })

   const response = await axios.post(
    this.url,
    {
     model: this.model,
     messages:[
      { role:"system", content: systemPrompt },
      ...history,
      { role:"user", content: data.message }
     ],
     max_tokens: profile.maxTokens
    },
    {
     headers: this.headers,
     httpsAgent: this.httpsAgent,
     timeout: 30000
    }
   )

   const text = response?.data?.choices?.[0]?.message?.content

   if(!text){
    throw new Error("EMPTY_AI_RESPONSE")
   }

   // Métrica interna de custo — não afeta o comportamento, só dá
   // visibilidade real de quanto cada conversa consome em tokens.
   const usage = response?.data?.usage

   if(usage){
    this.logger.log(
     `[tokens] conversation=${data.conversationId} profile=${profile.key} prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`
    )
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
    CHAT EM STREAMING (SSE)

    Endpoint separado de chat() de propósito — chat() continua
    exatamente como estava, sem nenhum risco de regressão. Este método
    duplica as mesmas validações (em vez de compartilhar código com
    chat()) para que nenhuma mudança aqui possa afetar o fluxo não
    streaming, que outras partes do app podem vir a usar.

    Contrato com o frontend: cada evento é uma linha
    `data: {...json...}\n\n`, com "type" podendo ser:
      - "delta": { text } — um pedaço de texto pra acrescentar
      - "done": fim normal do streaming
      - "error": { error, message, retryAfterSeconds? } — mesmos
        códigos de erro que chat() já usava, pro frontend continuar
        tratando do mesmo jeito
 ========================= */
 async chatStream(data: VoxAiDto, userId: string, req: Request, res: Response){

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  // desativa o buffering de proxies (ex: nginx na frente do Render) —
  // sem isso o "streaming" pode chegar tudo de uma vez mesmo assim
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const send = (payload: Record<string, unknown>) => {
   if(res.writableEnded) return
   res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const abortController = new AbortController()

  // se o usuário sair da tela/fechar a aba no meio da resposta, para de
  // gastar tokens com uma resposta que ninguém mais vai ler
  req.on("close", () => {
   abortController.abort()
  })

  try{

   if(!this.apiKey){
    throw new Error("OPENAI_API_KEY not configured")
   }

   if(!data.message){
    send({ type:"error", error:"EMPTY_MESSAGE", message:"Mensagem vazia." })
    return res.end()
   }

   if(data.message.length > 1000){
    send({ type:"error", error:"MESSAGE_TOO_LONG", message:"Mensagem muito longa." })
    return res.end()
   }

   const conversation = await this.prisma.conversation.findUnique({
    where:{ id: data.conversationId }
   })

   if(!conversation){
    send({ type:"error", error:"INVALID_CONVERSATION", message:"Conversa inválida." })
    return res.end()
   }

   if(conversation.userId !== userId){
    send({ type:"error", error:"FORBIDDEN", message:"Conversa inválida." })
    return res.end()
   }

   const rate = this.rateLimiter.check(userId)

   if(!rate.allowed){
    send({ type:"error", error:"RATE_LIMIT", message:rate.message, retryAfterSeconds:rate.retryAfterSeconds })
    return res.end()
   }

   const filter = contentFilter(data.message)

   if(filter.blocked){
    // mesma regra do chat() não-streaming: resposta do filtro não é
    // persistida, é só devolvida pro cliente
    send({ type:"delta", text:filter.message })
    send({ type:"done" })
    return res.end()
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
    send({ type:"delta", text:"Aguarde, processando sua última mensagem..." })
    send({ type:"done" })
    return res.end()
   }

   const brazilNow = getBrazilToday()
   const brazilToday = this.toISODate(brazilNow)

   let liturgySection = ""

   if (LITURGY_KEYWORDS.test(data.message)) {

    let parsedDate = parseNaturalDate(data.message)

    if (!parsedDate) {
     parsedDate = await this.extractDateWithAI(data.message, brazilNow)
    }

    if (!parsedDate) {
     parsedDate = brazilNow
    }

    const requestedDateText = this.toISODate(parsedDate)

    let targetLiturgical: unknown = null

    try{
     targetLiturgical = await this.liturgicalCalendarService.getLiturgicalData(parsedDate)
    }catch{
     targetLiturgical = null
    }

    const liturgySummarized = this.formatLiturgicalForAI(targetLiturgical)

    liturgySection = `
⚠️ REGRA ABSOLUTA:
A seção "Liturgia EXATA" abaixo está aqui porque a pergunta do usuário menciona liturgia, evangelho, santo do dia ou uma data específica. Se os dados estiverem disponíveis, você DEVE usá-los e é PROIBIDO dizer que não tem dados.

Data solicitada: ${requestedDateText}

Liturgia EXATA:
${liturgySummarized}
`
   }

   const voxUser = await this.prisma.user.findUnique({
    where:{ id: userId },
    select:{ voxProfile:true }
   })
   const profileKey = voxUser?.voxProfile ?? null
   const profile = resolveVoxProfile(profileKey)

   const systemPrompt = this.buildSystemPrompt({
    profileKey,
    brazilToday,
    liturgySection
   })

   const requestPayload = {
    model: this.model,
    messages:[
     { role:"system", content: systemPrompt },
     ...history,
     { role:"user", content: data.message }
    ],
    max_tokens: profile.maxTokens,
    stream: true
   }

   const requestConfig = {
    headers: this.headers,
    httpsAgent: this.httpsAgent,
    timeout: 30000,
    responseType: "stream" as const,
    signal: abortController.signal
   }

   let openaiResponse

   try{

    openaiResponse = await axios.post(this.url, requestPayload, requestConfig)

   }catch(err:any){

    // "!err.response" = a chamada nem chegou a ter uma resposta HTTP
    // (timeout, conexão caiu no meio, DNS falhou) — isso é o tipo de
    // falha curta e transitória que vale tentar de novo sem incomodar
    // o usuário. Erro de verdade da OpenAI (4xx/5xx com resposta) não
    // se resolve tentando de novo, então segue pro catch de fora.
    const isTransient = !err.response

    if(!isTransient || abortController.signal.aborted){
     throw err
    }

    this.logger.warn(`[chatStream] falha transitória na chamada à OpenAI, tentando de novo: ${err.message}`)

    await new Promise(resolve => setTimeout(resolve, 400))

    openaiResponse = await axios.post(this.url, requestPayload, requestConfig)
   }

   let fullText = ""
   // "any" de propósito: é só um log, e o tipo estreito aqui confundia
   // o narrowing do TS por causa da reatribuição dentro do callback
   let usage: any = null
   let buffer = ""

   await new Promise<void>((resolve, reject) => {

    openaiResponse.data.on("data", (chunk: Buffer) => {

     buffer += chunk.toString("utf8")

     const lines = buffer.split("\n")
     buffer = lines.pop() || "" // guarda linha incompleta pro próximo chunk

     for (const line of lines) {

      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue

      const payload = trimmed.slice(5).trim()
      if (payload === "[DONE]") continue
      if (!payload) continue

      try {
       const json = JSON.parse(payload)
       const delta = json?.choices?.[0]?.delta?.content

       if (delta) {
        fullText += delta
        send({ type:"delta", text:delta })
       }

       if (json?.usage) {
        usage = json.usage
       }
      } catch {
       // linha cortada no meio por um chunk de rede — ignora, o
       // buffer acima já garante que ela volta inteira no próximo
      }
     }
    })

    openaiResponse.data.on("end", () => resolve())
    openaiResponse.data.on("error", (err: Error) => reject(err))
   })

   if (!fullText) {
    throw new Error("EMPTY_AI_RESPONSE")
   }

   if(usage){
    this.logger.log(
     `[tokens] conversation=${data.conversationId} profile=${profile.key} prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`
    )
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
      content:fullText
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

   send({ type:"done" })
   res.end()

  }catch(error:any){

   if(abortController.signal.aborted){
    // cliente já foi embora — não tem pra quem mandar erro
    return res.end()
   }

   console.error("Erro VoxAI (stream):", {
    status: error?.response?.status,
    data: error?.response?.data,
    message: error.message
   })

   if(error?.response?.status === 401){
    send({ type:"error", error:"UNAUTHORIZED", message:"Sessão expirada." })
   }else if(error?.response?.status === 429){
    send({ type:"error", error:"LIMIT_EXCEEDED", message:"O VoxAI atingiu o limite diário." })
   }else if(error.code === "ECONNABORTED"){
    send({ type:"error", error:"TIMEOUT", message:"O Vox demorou para responder." })
   }else if(error?.response){
    send({ type:"error", error:"AI_PROVIDER_ERROR", message:"Erro na comunicação com a IA." })
   }else{
    send({ type:"error", error:"UNKNOWN_ERROR", message:"Erro inesperado no servidor." })
   }

   res.end()

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
   throw new NotFoundException("CONVERSATION_NOT_FOUND")
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
   throw new NotFoundException("CONVERSATION_NOT_FOUND")
  }

  return this.prisma.conversation.update({
   where:{ id: conversationId },
   data:{ title }
  })
 }

}
