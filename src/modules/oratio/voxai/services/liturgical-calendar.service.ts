import { Injectable } from "@nestjs/common"
import axios from "axios"

interface LiturgicalData {
 data?: string
 festas?: {
  principal?: {
   nome: string
   cor: string
   grau: string
   classe: string
  }
  primeira?: {
   nome: string
   cor: string
   grau: string
   classe: string
  }
  segunda?: {
   nome: string
   cor: string
   grau: string
   classe: string
  }
 }
 leitoras?: {
  primeira?: {
   titulo: string
   referencia: string
   texto: string
  }
  segunda?: {
   titulo: string
   referencia: string
   texto: string
  }
  evangelio?: {
   titulo: string
   referencia: string
   texto: string
  }
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
 async getLiturgicalData(date: Date = new Date()): Promise<LiturgicalData | null> {
  const dateStr = this.formatDate(date)

  // Verifica cache
  const cached = this.cache.get(dateStr)
  if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY) {
   return cached.data
  }

  // Busca da API
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const response = await axios.get(`${this.API_URL}?dia=${day}&mes=${month}&ano=${year}`, {
   validateStatus: (status) => status < 500, // Aceita 404, mas rejeita 5xx
  })

  if (response.status === 404) {
   // Dados não disponíveis para esta data
   return null
  }

  const data = response.data

  // Salva em cache
  this.cache.set(dateStr, {
   date: dateStr,
   data,
   timestamp: Date.now(),
  })

  return data
 }

 /**
  * Formata dados litúrgicos em texto amigável para o prompt
  */
 private formatLiturgicalInfo(data: LiturgicalData): string {
  if (!data) return ""

  let info = ""

  // Festa principal
  if (data.festas?.principal) {
   const festa = data.festas.principal
   info += `🎎 **Festa**: ${festa.nome} (${festa.cor})\n`
   info += `   Classe: ${festa.classe}, Grau: ${festa.grau}\n`
  }

  // Leituras
  if (data.leitoras) {
   info += `\n📖 **Leituras Litúrgicas**:\n`

   if (data.leitoras.primeira) {
    info += `   **1ª Leitura**: ${data.leitoras.primeira.referencia}\n`
    info += `   ${data.leitoras.primeira.texto?.substring(0, 150)}...\n`
   }

   if (data.leitoras.segunda) {
    info += `\n   **2ª Leitura**: ${data.leitoras.segunda.referencia}\n`
    info += `   ${data.leitoras.segunda.texto?.substring(0, 150)}...\n`
   }

   if (data.leitoras.evangelio) {
    info += `\n   **Evangelho**: ${data.leitoras.evangelio.referencia}\n`
    info += `   ${data.leitoras.evangelio.texto?.substring(0, 150)}...\n`
   }
  }

  return info
 }

 /**
  * Busca contexto litúrgico para hoje, ontem, amanhã e data solicitada
  */
 async getLiturgicalContext(requestedDate?: Date): Promise<string> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let context = "## 📅 CONTEXTO LITÚRGICO ATUAL\n\n"

  // Ontem
  const yesterdayData = await this.getLiturgicalData(yesterday)
  if (yesterdayData) {
   context += `### 📆 Ontem (${this.formatDate(yesterday)})\n`
   context += this.formatLiturgicalInfo(yesterdayData)
  }

  // Hoje
  const todayData = await this.getLiturgicalData(today)
  if (todayData) {
   context += `\n### 📆 Hoje (${this.formatDate(today)})\n`
   context += this.formatLiturgicalInfo(todayData)
  }

  // Amanhã
  const tomorrowData = await this.getLiturgicalData(tomorrow)
  if (tomorrowData) {
   context += `\n### 📆 Amanhã (${this.formatDate(tomorrow)})\n`
   context += this.formatLiturgicalInfo(tomorrowData)
  }

  if (requestedDate) {
   const requestedData = await this.getLiturgicalData(requestedDate)
   context += `\n### 📆 Data solicitada (${this.formatDate(requestedDate)})\n`
   context += requestedData ? this.formatLiturgicalInfo(requestedData) : "Dados litúrgicos não disponíveis para esta data.\n"
  }

  return context
 }

 /**
  * Busca dados litúrgicos de data específica com informações amigáveis
  */
 async getDayInfo(
  offsetDays: number = 0
 ): Promise<{ date: string; info: string }> {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const dateStr = this.formatDate(date)

  const data = await this.getLiturgicalData(date)
  const info = data ? this.formatLiturgicalInfo(data) : "Dados não disponíveis"

  return { date: dateStr, info }
 }
}
