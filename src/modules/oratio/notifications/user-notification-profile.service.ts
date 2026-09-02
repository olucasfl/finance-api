import { Injectable, Logger } from '@nestjs/common';
import { toZonedTime } from 'date-fns-tz';
import { PrismaService } from 'src/prisma/prisma.service';

export type ActiveBand = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY';

const TZ = 'America/Sao_Paulo';
const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30; // janela de atividade que conta pra classificação
const MIN_EVENTS = 5; // abaixo disso não dá pra afirmar um padrão → ANY
const STALE_DAYS = 7; // recalcula quando o perfil passa disso

// Empate no voto → esta ordem decide (manhã > tarde > noite).
const TIE_ORDER: Exclude<ActiveBand, 'ANY'>[] = ['MORNING', 'AFTERNOON', 'EVENING'];

@Injectable()
export class UserNotificationProfileService {
  private readonly logger = new Logger(UserNotificationProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  private bandForHour(hourBR: number): Exclude<ActiveBand, 'ANY'> {
    if (hourBR >= 5 && hourBR <= 11) return 'MORNING';
    if (hourBR >= 12 && hourBR <= 17) return 'AFTERNOON';
    return 'EVENING'; // 18–23 e a madrugada (0–4)
  }

  /*
  Classifica o usuário numa faixa a partir das atividades dos últimos
  ~30 dias, agrupando por hora local do Brasil. Pouca atividade ⇒ ANY
  (elegível o dia todo, como hoje).
  */
  async classifyBand(userId: string): Promise<ActiveBand> {
    const acts = await this.prisma.userActivity.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - WINDOW_DAYS * DAY) } },
      select: { createdAt: true },
    });
    if (acts.length < MIN_EVENTS) return 'ANY';

    const votes: Record<Exclude<ActiveBand, 'ANY'>, number> = {
      MORNING: 0,
      AFTERNOON: 0,
      EVENING: 0,
    };
    for (const a of acts) {
      votes[this.bandForHour(toZonedTime(a.createdAt, TZ).getHours())]++;
    }

    let winner = TIE_ORDER[0];
    for (const band of TIE_ORDER) {
      if (votes[band] > votes[winner]) winner = band;
    }
    return winner;
  }

  /*
  Faixa do usuário com cache preguiçoso no próprio perfil: devolve o
  valor gravado se foi calculado há menos de STALE_DAYS; senão recalcula,
  faz upsert e devolve. Nunca lança — qualquer falha vira ANY (o
  scheduler trata ANY como "elegível o dia todo").
  */
  async getBand(userId: string): Promise<ActiveBand> {
    try {
      const profile = await this.prisma.userNotificationProfile.findUnique({
        where: { userId },
      });
      const computedAt = profile?.bandComputedAt?.getTime();
      if (computedAt != null && Date.now() - computedAt < STALE_DAYS * DAY) {
        return (profile!.activeBand as ActiveBand) ?? 'ANY';
      }

      const band = await this.classifyBand(userId);
      await this.prisma.userNotificationProfile.upsert({
        where: { userId },
        create: { userId, activeBand: band, bandComputedAt: new Date() },
        update: { activeBand: band, bandComputedAt: new Date() },
      });
      return band;
    } catch (e: any) {
      this.logger.warn(`classificação de faixa falhou p/ ${userId}: ${e?.message}`);
      return 'ANY';
    }
  }
}
