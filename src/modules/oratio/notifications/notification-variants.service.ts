import { Injectable, Logger } from '@nestjs/common';
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
