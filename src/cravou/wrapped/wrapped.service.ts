import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const SINGLETON_ID = 'singleton';

export interface WrappedStatus {
  active: boolean;
  activatedAt: string | null;
}

export interface WrappedRawStatus {
  status: 'off' | 'preview' | 'released';
  previewUserId: string | null;
  activatedAt: string | null;
}

export interface WrappedComparison {
  avgAprovPct: number;
}

@Injectable()
export class WrappedService {
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig() {
    return this.prisma.cravouWrappedConfig.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
  }

  /** Visibilidade calculada por usuário: nunca expõe o conceito de preview/released ao chamador. */
  async getStatusFor(userId: string): Promise<WrappedStatus> {
    const config = await this.getConfig();
    const visible =
      config.status === 'released' ||
      (config.status === 'preview' && config.previewUserId === userId);

    if (!visible) return { active: false, activatedAt: null };
    return { active: true, activatedAt: config.activatedAt!.toISOString() };
  }

  async activatePreview(callerUserId: string): Promise<WrappedStatus> {
    const config = await this.prisma.cravouWrappedConfig.upsert({
      where: { id: SINGLETON_ID },
      update: { status: 'preview', previewUserId: callerUserId, activatedAt: new Date() },
      create: { id: SINGLETON_ID, status: 'preview', previewUserId: callerUserId, activatedAt: new Date() },
    });
    return { active: true, activatedAt: config.activatedAt!.toISOString() };
  }

  async release(): Promise<WrappedStatus> {
    const config = await this.prisma.cravouWrappedConfig.upsert({
      where: { id: SINGLETON_ID },
      update: { status: 'released', previewUserId: null, activatedAt: new Date() },
      create: { id: SINGLETON_ID, status: 'released', activatedAt: new Date() },
    });
    return { active: true, activatedAt: config.activatedAt!.toISOString() };
  }

  /** Estado bruto (off/preview/released), só para o painel de admin — nunca exposto no endpoint público. */
  async getRawStatus(): Promise<WrappedRawStatus> {
    const config = await this.getConfig();
    return {
      status: config.status as WrappedRawStatus['status'],
      previewUserId: config.previewUserId,
      activatedAt: config.activatedAt?.toISOString() ?? null,
    };
  }

  /**
   * Aproveitamento médio de todo mundo — % de palpites pontuados (>0 pontos) sobre
   * o total de palpites já processados, calculado por usuário e depois com a média
   * simples entre eles (não pondera por volume de palpites, cada jogador conta igual).
   */
  async getComparison(): Promise<WrappedComparison> {
    const predictions = await this.prisma.cravouPrediction.findMany({
      where: { points: { not: null } },
      select: { userId: true, points: true },
    });

    const byUser = new Map<string, { scored: number; total: number }>();
    for (const p of predictions) {
      const entry = byUser.get(p.userId) ?? { scored: 0, total: 0 };
      entry.total += 1;
      if ((p.points ?? 0) > 0) entry.scored += 1;
      byUser.set(p.userId, entry);
    }

    const pcts = [...byUser.values()].map((e) => (e.total > 0 ? (e.scored / e.total) * 100 : 0));
    const avgAprovPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    return { avgAprovPct };
  }

  async deactivate(): Promise<WrappedStatus> {
    await this.prisma.cravouWrappedConfig.upsert({
      where: { id: SINGLETON_ID },
      update: { status: 'off', previewUserId: null, activatedAt: null },
      create: { id: SINGLETON_ID },
    });
    return { active: false, activatedAt: null };
  }
}
