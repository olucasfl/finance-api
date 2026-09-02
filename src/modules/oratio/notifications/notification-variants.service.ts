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

type SeedVariant = { title: string; body: string };

// Pool inicial de textos de cada regra do catálogo. Semeado só quando a
// regra ainda não tem NENHUMA variante — depois disso o admin é dono da
// lista (adicionar/editar/desativar/remover pelo painel). `{count}` e
// `{label}` são interpolados pelo scheduler como sempre.
export const DEFAULT_VARIANTS: Record<string, SeedVariant[]> = {
  ROSARY_UNFINISHED: [
    { title: 'Volte para terminar seu Terço 📿', body: 'Você começou um terço e não terminou. Que tal concluir agora?' },
    { title: 'Seu Terço ficou pela metade 📿', body: 'Faltam poucos mistérios. Reserve uns minutos e complete com calma.' },
    { title: 'Retome seu Terço 📿', body: 'Nossa Senhora acolhe cada Ave-Maria. Termine o que você começou.' },
  ],
  STREAK_AT_RISK: [
    { title: 'Não perca sua sequência 🔥', body: 'Você está com {count} dias seguidos de oração. Reze hoje para manter!' },
    { title: '{count} dias rezando — continue 🔥', body: 'Seria uma pena parar agora. Um instante de oração garante mais um dia.' },
    { title: 'Sua constância vale muito 🔥', body: 'São {count} dias seguidos com Deus. Não deixe hoje passar em branco.' },
  ],
  BIBLE_RESUME: [
    { title: 'Continue sua leitura 📖', body: 'Você parou em {label}. Retome de onde ficou.' },
    { title: 'A Palavra te espera 📖', body: 'Faz uns dias desde {label}. Que tal ler um trecho hoje?' },
    { title: 'Volte para a Escritura 📖', body: 'Sua leitura parou em {label}. Uns minutos já fazem diferença.' },
  ],
  CATECHISM_RESUME: [
    { title: 'Retome o Catecismo 📘', body: 'Você parou em {label}. Continue seu estudo.' },
    { title: 'Seu estudo ficou em {label} 📘', body: 'Retomar agora mantém o fio da meada. Um ponto por dia já vale.' },
    { title: 'Um pouco de doutrina hoje? 📘', body: 'Você parou em {label}. A fé também se aprende — continue de onde ficou.' },
  ],
  ROSARY_LAPSE: [
    { title: 'Faz um tempo desde seu último Terço 📿', body: 'Que tal reservar alguns minutos para rezar hoje?' },
    { title: 'Sua Mãe sente sua falta 📿', body: 'Faz dias desde o último terço. Volte a essa oração que já foi sua.' },
    { title: 'Retome o hábito do Terço 📿', body: 'Uns minutos com o Rosário hoje podem recomeçar tudo.' },
  ],
  COMEBACK: [
    { title: 'Sentimos sua falta 🙏', body: 'Que tal um momento de oração hoje? Estamos aqui por você.' },
    { title: 'Deus não foi a lugar nenhum 🙏', body: 'Faz alguns dias que você não aparece. Volte quando quiser — Ele espera.' },
    { title: 'Um instante com Deus hoje? 🙏', body: 'A porta continua aberta. Reserve um minuto para rezar.' },
  ],
  SUNDAY_MASS: [
    { title: 'É domingo, dia do Senhor ✝️', body: 'Prepare o coração para a Santa Missa e as leituras de hoje.' },
    { title: 'Domingo é dia de Missa ✝️', body: 'Chegue com o coração pronto. Veja as leituras antes de ir.' },
    { title: 'O Dia do Senhor chegou ✝️', body: 'Reserve este domingo para a Eucaristia e o descanso em Deus.' },
  ],
  VOX_INTRO: [
    { title: 'Uma dúvida de fé? ✨', body: 'Converse com o VoxAI, seu assistente espiritual católico.' },
    { title: 'Pergunte ao VoxAI ✨', body: 'Dúvidas sobre a fé, a Missa, um santo? O VoxAI responde à luz da doutrina.' },
    { title: 'Conheça o VoxAI ✨', body: 'Um assistente para tirar dúvidas de fé com base na Igreja. Experimente.' },
  ],
  EXAMEN_NIGHT: [
    { title: 'Antes de dormir 🌙', body: 'Examine o seu dia com Deus — o que agradecer e o que confiar a Ele.' },
    { title: 'Um exame de consciência 🌙', body: 'Repasse o dia: onde Deus esteve, onde você faltou, o que entregar a Ele.' },
    { title: 'Feche o dia com Deus 🌙', body: 'Dois minutos de silêncio: gratidão pelo bem, perdão pelo resto.' },
  ],
};

@Injectable()
export class NotificationVariantsService {
  private readonly logger = new Logger(NotificationVariantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Semeia o pool inicial de variantes de cada regra, SÓ pras regras que
  // ainda não têm nenhuma. Regra do catálogo ganha o pool de `DEFAULT_VARIANTS`
  // (2–3 textos); regra custom ganha 1 variante do próprio texto. Idempotente
  // — depois que a regra tem ≥1 variante, o seed nunca mais mexe (o admin é
  // dono da lista). Chamado pelo scheduler DEPOIS de reconciliar o catálogo.
  async seedMissing(): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      select: { key: true, title: true, body: true, url: true },
    });
    for (const r of rules) {
      const count = await this.prisma.notificationRuleVariant
        .count({ where: { ruleKey: r.key } })
        .catch(() => 1); // erro ⇒ não tenta semear
      if (count > 0) continue;

      const catalog = DEFAULT_VARIANTS[r.key];
      const toCreate = catalog
        ? catalog.map((v, i) => ({
            ruleKey: r.key,
            title: v.title ?? null,
            body: v.body,
            url: r.url,
            order: i,
          }))
        : [{ ruleKey: r.key, title: r.title, body: r.body, url: r.url, order: 0 }];

      for (const data of toCreate) {
        await this.prisma.notificationRuleVariant
          .create({ data })
          .catch((e) =>
            this.logger.warn(`seed de variante falhou p/ ${r.key}: ${e?.message}`),
          );
      }
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
