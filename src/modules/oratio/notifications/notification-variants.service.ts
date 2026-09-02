import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type VariantRow = {
  id: string;
  ruleKey: string;
  title: string | null;
  body: string | null;
  url: string | null;
  enabled: boolean;
  order: number;
};

@Injectable()
export class NotificationVariantsService {
  private readonly logger = new Logger(NotificationVariantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Semeia 1 variante por regra a partir do title/body/url atuais, só pras
  // regras que ainda não têm nenhuma. Idempotente — rodar no boot 2x não
  // duplica. Chamado pelo scheduler DEPOIS de reconciliar o catálogo.
  async seedMissing(): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      select: { key: true, title: true, body: true, url: true },
    });
    for (const r of rules) {
      const count = await this.prisma.notificationRuleVariant
        .count({ where: { ruleKey: r.key } })
        .catch(() => 1); // erro ⇒ não tenta semear
      if (count > 0) continue;
      await this.prisma.notificationRuleVariant
        .create({
          data: { ruleKey: r.key, title: r.title, body: r.body, url: r.url, order: 0 },
        })
        .catch((e) =>
          this.logger.warn(`seed de variante falhou p/ ${r.key}: ${e?.message}`),
        );
    }
  }

  listEnabledForRule(ruleKey: string): Promise<VariantRow[]> {
    return this.prisma.notificationRuleVariant.findMany({
      where: { ruleKey, enabled: true },
      orderBy: { order: 'asc' },
    }) as Promise<VariantRow[]>;
  }

  /* ===== CRUD do admin ===== */

  listForRule(ruleKey: string): Promise<VariantRow[]> {
    return this.prisma.notificationRuleVariant.findMany({
      where: { ruleKey },
      orderBy: { order: 'asc' },
    }) as Promise<VariantRow[]>;
  }

  async createForRule(
    ruleKey: string,
    data: { title?: string | null; body?: string | null; url?: string | null; order?: number },
  ): Promise<VariantRow> {
    const rule = await this.prisma.notificationRule.findUnique({ where: { key: ruleKey } });
    if (!rule) throw new NotFoundException('Regra não encontrada');

    // ordem no fim da lista se não vier explícita
    const order =
      data.order ??
      ((await this.prisma.notificationRuleVariant.count({ where: { ruleKey } })) as number);

    return this.prisma.notificationRuleVariant.create({
      data: {
        ruleKey,
        title: data.title ?? null,
        body: data.body ?? null,
        url: data.url ?? null,
        order,
      },
    }) as Promise<VariantRow>;
  }

  async update(
    id: string,
    data: {
      title?: string | null;
      body?: string | null;
      url?: string | null;
      enabled?: boolean;
      order?: number;
    },
  ): Promise<VariantRow> {
    const current = await this.prisma.notificationRuleVariant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Variante não encontrada');

    // Piso de 1 variante ativa por regra: não deixa desativar a última.
    if (data.enabled === false && current.enabled) {
      const enabledCount = await this.prisma.notificationRuleVariant.count({
        where: { ruleKey: current.ruleKey, enabled: true },
      });
      if (enabledCount <= 1) {
        throw new BadRequestException('A regra precisa de pelo menos uma variante ativa');
      }
    }

    return this.prisma.notificationRuleVariant.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        url: data.url,
        enabled: data.enabled,
        order: data.order,
      },
    }) as Promise<VariantRow>;
  }

  async remove(id: string): Promise<{ ok: true }> {
    const current = await this.prisma.notificationRuleVariant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Variante não encontrada');

    const total = await this.prisma.notificationRuleVariant.count({
      where: { ruleKey: current.ruleKey },
    });
    if (total <= 1) {
      throw new BadRequestException('A regra precisa de pelo menos uma variante');
    }
    // Se era a última ATIVA (mas há outras inativas), não deixa remover —
    // ativar outra primeiro.
    if (current.enabled) {
      const enabledCount = await this.prisma.notificationRuleVariant.count({
        where: { ruleKey: current.ruleKey, enabled: true },
      });
      if (enabledCount <= 1) {
        throw new BadRequestException(
          'Ative outra variante antes de remover a única ativa',
        );
      }
    }

    await this.prisma.notificationRuleVariant.delete({ where: { id } });
    return { ok: true };
  }

  /*
  Escolhe a variante que este usuário recebeu há MAIS tempo (ou nunca).
  `recentVariantIds` = variantIds das últimas notificações da regra pra
  esse usuário, do mais recente pro mais antigo. Nunca-usada ganha (empate
  → menor `order`); todas já usadas → a que foi usada há mais tempo.
  */
  pickVariant(variants: VariantRow[], recentVariantIds: (string | null)[]): VariantRow | null {
    const pool = variants.filter((v) => v.enabled);
    if (pool.length === 0) return null;
    if (pool.length === 1) return pool[0];

    const recent = recentVariantIds.filter((x): x is string => !!x);

    const neverUsed = pool
      .filter((v) => !recent.includes(v.id))
      .sort((a, b) => a.order - b.order);
    if (neverUsed.length > 0) return neverUsed[0];

    // todas já usadas: a "mais antiga" é a cujo uso mais recente está mais
    // pro fim de `recent` (maior índice da primeira ocorrência).
    let best = pool[0];
    let bestIdx = recent.indexOf(pool[0].id);
    for (const v of pool.slice(1)) {
      const idx = recent.indexOf(v.id);
      if (idx > bestIdx) {
        bestIdx = idx;
        best = v;
      }
    }
    return best;
  }
}
