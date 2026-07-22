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

  // Busca da API
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const response = await axios.get(`${this.API_URL}?dia=${day}&mes=${month}&ano=${year}`, {
   validateStatus: (status) => status < 500, // Aceita 404, mas rejeita 5xx
   httpsAgent: this.httpsAgent,
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
}
