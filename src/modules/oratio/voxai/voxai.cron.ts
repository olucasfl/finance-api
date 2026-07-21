import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"

import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"
import { getBrazilToday } from "./utils/brazil-date"

/*
============================
Pré-aquece o cache de liturgia do dia — assim o primeiro usuário a
perguntar sobre liturgia no dia não paga o custo de buscar na API
externa na hora.
============================
*/
@Injectable()
export class VoxAiCron implements OnApplicationBootstrap {

  private readonly logger = new Logger(VoxAiCron.name)

  constructor(
    private liturgicalCalendarService: LiturgicalCalendarService
  ) {}

  async onApplicationBootstrap() {
    await this.warmTodayCache()
  }

  // 00:01 no horário de Brasília, todos os dias
  @Cron("1 0 * * *", { timeZone: "America/Sao_Paulo" })
  async handleMidnightWarmup() {
    await this.warmTodayCache()
  }

  private async warmTodayCache() {
    try {
      await this.liturgicalCalendarService.getLiturgicalData(getBrazilToday())
    } catch {
      this.logger.warn("Não foi possível pré-aquecer o cache de liturgia do dia")
    }
  }

}
