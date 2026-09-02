import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LiturgicalCalendarService } from '../voxai/services/liturgical-calendar.service';

// Variáveis de contexto que uma variante pode usar no título/corpo, além
// das que a condição já injeta ({count}, {label}).
export const CONTEXT_VARS = ['nome', 'santo', 'tempoLiturgico'] as const;
export type ContextVar = (typeof CONTEXT_VARS)[number];

// Fallbacks neutros — nunca deixa um {x} cru no texto entregue.
const NEUTRAL: Record<ContextVar, string> = {
  nome: 'você',
  santo: 'o santo de hoje',
  tempoLiturgico: 'este tempo litúrgico',
};

function firstName(name?: string | null): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first || null;
}

@Injectable()
export class NotificationContextService {
  private readonly logger = new Logger(NotificationContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly liturgy: LiturgicalCalendarService,
  ) {}

  // Quais CONTEXT_VARS aparecem em `text` (como `{nome}` etc.).
  varsIn(text: string): ContextVar[] {
    return CONTEXT_VARS.filter((v) => text.includes(`{${v}}`));
  }

  /*
  Resolve as variáveis pedidas pra um usuário. Cada uma que não resolver
  cai no fallback neutro. Sem chamada de rede nova no caminho crítico: o
  nome vem de uma query barata e a liturgia sai do cache de 24h do
  LiturgicalCalendarService (que ainda tem circuit breaker por baixo).
  */
  async resolve(userId: string, wanted: ContextVar[]): Promise<Record<string, string>> {
    const need = new Set(wanted);
    const out: Record<string, string> = {};

    if (need.has('nome')) {
      const user = await this.prisma.user
        .findUnique({ where: { id: userId }, select: { name: true } })
        .catch(() => null);
      out.nome = firstName(user?.name) ?? NEUTRAL.nome;
    }

    if (need.has('santo') || need.has('tempoLiturgico')) {
      const data = await this.liturgy.getLiturgicalData().catch(() => null);
      const celebra = (data as any)?.liturgia?.toString().trim() || null;
      if (need.has('santo')) out.santo = celebra ?? NEUTRAL.santo;
      if (need.has('tempoLiturgico')) out.tempoLiturgico = celebra ?? NEUTRAL.tempoLiturgico;
    }

    return out;
  }
}
