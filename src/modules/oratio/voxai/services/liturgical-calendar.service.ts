import { Injectable } from "@nestjs/common"
import axios from "axios"
import https from "https"

import { getBrazilToday } from "../utils/brazil-date"

interface LiturgicalReading {
 referencia?: string
 texto?: string
 refrao?: string
}

// Reflete o formato real devolvido pela API (liturgia.up.railway.app) e
// consumido em voxai.service.ts. Os nomes já bateram errado aqui antes
// (leitoras/evangelio) e nunca deram erro de tipo porque nada checava
// contra esta interface de verdade — daí o cuidado de mantê-la fiel.
interface LiturgicalData {
 data?: string
 liturgia?: string
 cor?: string
 leituras?: {
  primeiraLeitura?: LiturgicalReading[]
  segundaLeitura?: LiturgicalReading[]
  salmo?: LiturgicalReading[]
  evangelho?: LiturgicalReading[]
 }
}

interface CachedLiturgicalInfo {
 date: string
 data: LiturgicalData
 timestamp: number
}

@Injectable()
export class LiturgicalCalendarService {
 private cache: Map<string, CachedLiturgicalInfo> = new Map()
 private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 horas
 private readonly API_URL = "https://liturgia.up.railway.app/v2/"

 // Reaproveita a conexão HTTPS com a API de liturgia em vez de abrir
 // um socket novo a cada consulta.
 private readonly httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 })

 /*
 Circuit breaker: sem timeout, uma API de liturgia fora do ar podia
 deixar CADA pergunta com tema litúrgico esperando minutos até o
 pedido falhar sozinho — travando a conversa mesmo já existindo um
 try/catch do lado de quem chama. Agora, depois de algumas falhas
 seguidas, o circuito "abre" e devolve null na hora (sem nem tentar a
 rede) até o tempo de espera passar; aí libera uma tentativa de teste
 pra ver se a API já voltou.
 */
 private consecutiveFailures = 0
 private readonly FAILURE_THRESHOLD = 3
 private circuitOpenedAt: number | null = null
 private readonly COOLDOWN = 60 * 1000 // 1 minuto

 private isCircuitOpen(): boolean {

  if (this.circuitOpenedAt === null) return false

  if (Date.now() - this.circuitOpenedAt > this.COOLDOWN) {
   // esfriou — libera uma tentativa de teste
   this.circuitOpenedAt = null
   return false
  }

  return true
 }

 private registerSuccess(){
  this.consecutiveFailures = 0
  this.circuitOpenedAt = null
 }

 private registerFailure(){
  this.consecutiveFailures++

  if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
   this.circuitOpenedAt = Date.now()
  }
 }

 /**
  * Formata uma data para YYYY-MM-DD
  */
 private formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
 }

 /**
  * Busca dados litúrgicos de uma data específica
  */
 async getLiturgicalData(date: Date = getBrazilToday()): Promise<LiturgicalData | null> {
  const dateStr = this.formatDate(date)

  // Verifica cache
  const cached = this.cache.get(dateStr)
  if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
   return cached.data
  }

  if (this.isCircuitOpen()) {
   return null
  }

  // Busca da API
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  try{

   const response = await axios.get(`${this.API_URL}?dia=${day}&mes=${month}&ano=${year}`, {
    validateStatus: (status) => status < 500, // Aceita 404, mas rejeita 5xx
    httpsAgent: this.httpsAgent,
    timeout: 5000,
   })

   if (response.status === 404) {
    // API respondeu normalmente, só não tem dado pra essa data — não
    // é falha da API, não conta pro circuit breaker
    this.registerSuccess()
    return null
   }

   const data = response.data

   // Salva em cache
   this.cache.set(dateStr, {
    date: dateStr,
    data,
    timestamp: Date.now(),
   })

   this.registerSuccess()

   return data

  }catch(error){
   this.registerFailure()
   throw error
  }
 }
}
