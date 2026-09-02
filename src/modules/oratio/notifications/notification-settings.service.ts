import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// Os parâmetros do funil que o scheduler consome. Espelham as colunas de
// `NotificationSettings` (menos `id`/`updatedAt`).
export type NotificationSettingsValues = {
  maxPerDay: number;
  maxNudgesPerDay: number;
  quietStart: number;
  quietEnd: number;
  spacingHours: number;
  restGapEnabled: boolean;
  urgentThreshold: number;
};

// Valores idênticos aos que eram constantes privadas no scheduler. Usados
// como fallback quando o banco está fora do ar — assim o tick nunca para
// por causa de uma falha de leitura da config.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsValues = {
  maxPerDay: 2,
  maxNudgesPerDay: 1,
  quietStart: 22,
  quietEnd: 7,
  spacingHours: 6,
  restGapEnabled: true,
  urgentThreshold: 80,
};

const SINGLETON_ID = 'default';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);
  private readonly TTL_MS = 60_000;

  private cache: NotificationSettingsValues | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /*
  Lê a linha única de config, criando-a preguiçosamente na primeira vez.
  Cacheia por ~60s pra não transformar o tick de 10 min (um usuário por
  vez) num festival de queries. Se o banco falhar, devolve os defaults
  (comportamento de antes) sem cachear esse fallback.
  */
  async get(): Promise<NotificationSettingsValues> {
    const now = Date.now();
    if (this.cache && now - this.cachedAt < this.TTL_MS) return this.cache;

    try {
      const row = await this.prisma.notificationSettings.upsert({
        where: { id: SINGLETON_ID },
        update: {},
        create: { id: SINGLETON_ID },
      });
      this.cache = {
        maxPerDay: row.maxPerDay,
        maxNudgesPerDay: row.maxNudgesPerDay,
        quietStart: row.quietStart,
        quietEnd: row.quietEnd,
        spacingHours: row.spacingHours,
        restGapEnabled: row.restGapEnabled,
        urgentThreshold: row.urgentThreshold,
      };
      this.cachedAt = now;
      return this.cache;
    } catch (e: any) {
      this.logger.warn(
        `não consegui ler NotificationSettings (${e?.message}); usando defaults`,
      );
      return this.cache ?? DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  // Linha inteira (id/updatedAt inclusos) pro GET do admin. Cria
  // preguiçosamente igual `get()`.
  async getFull() {
    return this.prisma.notificationSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  /*
  PATCH parcial vindo do admin. Só grava os campos definidos (o resto do
  DTO chega `undefined`) e invalida o cache pra próxima leitura do
  scheduler pegar o valor novo na hora.
  */
  async update(patch: Partial<NotificationSettingsValues>) {
    const data = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const row = await this.prisma.notificationSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
    this.invalidate();
    return row;
  }

  // Chamado pelo endpoint de PATCH depois de gravar — a próxima leitura
  // pega o valor novo na hora, sem esperar o TTL expirar.
  invalidate(): void {
    this.cache = null;
    this.cachedAt = 0;
  }
}
