---
description: Implementa uma spec aprovada — plano curto primeiro, depois código e testes por critério
argument-hint: <caminho-da-spec ou do todo>
---

Implemente **$ARGUMENTS**.

## 1. Contexto (antes de qualquer edição)

Leia: `.claude/rules/RULES.md` → `CLAUDE.md` → `docs/ARCHITECTURE.md` (§3 lifecycle, §4 domínio,
§5 auth, §6 VoxAI, §10 convenções) → a spec/checklist passado → o plano pareado em `docs/tasks/`.

Se a spec não tiver critérios de aceite em BDD, **diga isso** e proponha convertê-los antes de
codar — sem eles, `/qa-verify` não consegue provar nada depois.

## 2. Plano curto, antes de editar

Apresente, em no máximo 15 linhas: arquivos que vão mudar, a ordem, e qual critério de aceite cada
passo fecha. **Pare e espere o "ok"** se o plano tocar algo que o `RULES.md` marca como
"Perguntar antes" — em especial **qualquer mudança em `prisma/schema.prisma`**, guard, CORS,
header `X-App`, ou `vox.prompt.ts`.

## 3. Implementar, em fatias verticais

Uma fatia = um critério fechado ponta a ponta (model → service → controller → DTO → teste), não
"todos os models e depois todos os controllers". Siga o formato dos módulos existentes
(`reading-progress` é o mais representativo).

Obrigatório em toda rota nova: `@UseGuards(JwtAuthGuard)`, `userId` de `req.user.userId`, DTO com
validação e limites, e `America/Sao_Paulo` explícito em qualquer fronteira de dia.

## 4. Testar cada critério

Aplique a skill `oratio-testing`. `PrismaService` mockado, HTTP externo mockado, asserção por
estado. Cada critério ganha ao menos um teste que falharia se o comportamento sumisse.

## 5. Verificar

```
npm test -- <pattern>
npm test
npm run build
npm run lint
```

Se a feature muda o schema: **não rode `db push`**. Use `/db-change`, registre a pendência e
siga (`RULES.md` §2).

## 6. Fechar

- Marque `[x]` no `docs/tasks/*-todo.md` correspondente.
- Atualize `docs/ARCHITECTURE.md` se o comportamento mudou, **no mesmo commit**.
- Atualize o status e as pendências humanas em `docs/specs/INDEX.md`.
- Confira o contrato contra o `oratio/src/services/*Service.ts` correspondente.
- Commit com o **porquê** na mensagem. Confira a branch antes (`RULES.md` §7).

Se um critério não puder ser fechado, **diga qual e por quê** — não entregue silenciosamente
parcial.
