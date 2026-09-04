---
name: oratio-testing
description: Convenções de teste do backend Oratio (Jest + NestJS + Prisma mockado). Use ao escrever qualquer teste novo, ao testar um módulo novo, ou ao decidir como cobrir um serviço que fala com banco ou HTTP externo.
---

# Testes no Oratio API

Stack: **Jest** sobre NestJS. Há 66 arquivos `*.spec.ts` em `src/`, e a cobertura já é alta —
ver `docs/ARCHITECTURE.md` §2 para os números atuais e onde estão as exclusões.

Este é o repo com a suíte madura dos dois. **Não regrida a cobertura**: módulo novo nasce com
teste no mesmo commit.

## Onde o teste mora

Ao lado do arquivo: `bible-marks.service.ts` → `bible-marks.service.spec.ts`.
Um arquivo de teste por arquivo de produção com lógica.

`*.module.ts` e `main.ts` ficam fora do denominador de cobertura — são fiação, não comportamento.

## A regra mais importante: nada de banco e nada de rede

**`PrismaService` é sempre mockado como objeto simples de `jest.fn()`s — só os métodos que aquele
teste realmente usa.** Nunca instancie `PrismaClient`. Nunca aponte para banco de teste real.

```ts
const prisma = {
  bibleMark: { findMany: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
} as unknown as PrismaService

const service = new BibleMarksService(prisma)
```

**HTTP externo é mockado no nível do módulo**: `jest.mock('axios')`, ou
`global.fetch = jest.fn()`. Nenhum teste desta suíte faz chamada de rede real — inclusive porque
a OpenAI **cobra por chamada** e o Brevo/Web Push **entrega para pessoas reais** (`RULES.md` §3).

## Como assertar

**Prefira asserção por estado a asserção por sequência.** Duas perguntas por teste:

1. O que a função **retornou**?
2. Com **quais argumentos** o Prisma (ou o mock externo) foi chamado?

```ts
expect(await service.upsert(userId, dto)).toEqual({ deleted: true })
expect(prisma.bibleMark.delete).toHaveBeenCalledWith({
  where: { userId_book_chapter_verse: { userId, book: "Jo", chapter: 3, verse: 16 } },
})
```

Assertar a ordem exata das chamadas trava o teste no *como* em vez do *quê*, e quebra em todo
refactor legítimo. Use só quando a ordem **é** o comportamento (ex.: transação, ou o scheduler
marcando a notificação como enviada só depois do envio).

## O que todo módulo novo precisa cobrir

Além do caminho feliz:

- **Sem token** → 401. **Token de outro usuário** → não enxerga o dado alheio.
- **Payload inválido** → 400 (campo não declarado, string acima do `@MaxLength`, número < `@Min`).
- **Caso vazio** → o que a rota devolve quando não há nada (`[]`, `null`, 404 — decida e teste).
- **Fronteira de dia**, se a lógica tiver data: teste com um horário que cai no limite em
  `America/Sao_Paulo`, não só com "agora".

## Loop de verificação

```
npm test -- <pattern>    # o teste que você acabou de escrever
npm test                 # suíte inteira
npm run build
npm run lint
```

Só depois disso, commit.

## Contrato: o teste não substitui o `curl`

Teste unitário com Prisma mockado **não prova** que a rota responde o que a spec diz — ele prova
que o serviço chama o Prisma direito. Para o contrato, use `/qa-verify`: um `curl` por critério de
aceite, contra `localhost:3000` no ar. Os dois são necessários e cobrem coisas diferentes.
