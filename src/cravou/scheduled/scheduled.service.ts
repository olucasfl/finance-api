import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

// Duração estimada de uma partida em milissegundos (90min + intervalos)
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
// Antecedência para bloquear palpites antes do início (30 minutos)
const LOCK_BEFORE_MS = 30 * 60 * 1000;

@Injectable()
export class ScheduledService {
  private readonly logger = new Logger(ScheduledService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
  ) {}

  // Roda a cada minuto para gerenciar o ciclo de vida das partidas
  @Cron('* * * * *')
  async handleMatchLifecycle() {
    const now = new Date();
    await Promise.all([
      this.autoLockPredictions(now),
      this.setMatchesLive(now),
      this.setMatchesAwaitingResult(now),
    ]);
  }

  // 1. Bloqueia palpites 30 minutos antes do jogo
  private async autoLockPredictions(now: Date) {
    const lockThreshold = new Date(now.getTime() + LOCK_BEFORE_MS);

    const matches = await this.prisma.cravouMatch.findMany({
      where: {
        status: 'upcoming',
        predictionsLocked: false,
        matchDate: { lte: lockThreshold },
      },
    });

    for (const match of matches) {
      await this.prisma.cravouMatch.update({
        where: { id: match.id },
        data: { predictionsLocked: true },
      });
      this.gateway.emitMatchLocked(match.id);
      this.logger.log(
        `[AUTO-LOCK] ${match.homeTeam} x ${match.awayTeam} — palpites encerrados (30min antes do início)`,
      );
    }
  }

  // 2. Muda para 'live' quando o horário da partida chega
  private async setMatchesLive(now: Date) {
    const matches = await this.prisma.cravouMatch.findMany({
      where: {
        status: 'upcoming',
        matchDate: { lte: now },
      },
    });

    for (const match of matches) {
      const updated = await this.prisma.cravouMatch.update({
        where: { id: match.id },
        data: { status: 'live', predictionsLocked: true },
      });
      this.gateway.emitMatchUpdated(updated);
      this.logger.log(
        `[LIVE] ${match.homeTeam} x ${match.awayTeam} — partida iniciada`,
      );
    }
  }

  // 3. Após 2h do início, muda para 'awaiting_result' (aguardando admin)
  private async setMatchesAwaitingResult(now: Date) {
    const awaitingThreshold = new Date(now.getTime() - MATCH_DURATION_MS);

    const matches = await this.prisma.cravouMatch.findMany({
      where: {
        status: 'live',
        matchDate: { lte: awaitingThreshold },
      },
    });

    for (const match of matches) {
      const updated = await this.prisma.cravouMatch.update({
        where: { id: match.id },
        data: { status: 'awaiting_result' },
      });
      this.gateway.emitMatchUpdated(updated);
      this.logger.log(
        `[AWAITING] ${match.homeTeam} x ${match.awayTeam} — aguardando resultado`,
      );
    }
  }
}
