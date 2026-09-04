---
description: Confere se CLAUDE.md, ARCHITECTURE.md, specs/INDEX.md e docs/tasks batem com a realidade do código
---

Audite a documentação deste repo contra o estado real. Índice que mente é pior que índice que
falta: um agente que lê um `ARCHITECTURE.md` desatualizado toma decisão errada com confiança.

## O que conferir

**1. `CLAUDE.md` × arquivos reais**
- Todo caminho citado existe? (`docs/specs/`, `docs/tasks/*.md`, `.claude/rules/RULES.md`)
- A numeração prometida (`§1–§N`) bate com os `##` reais de `docs/ARCHITECTURE.md`?
- A tabela de "current plans" reflete o status real de cada `docs/tasks/*-todo.md`?

**2. `docs/ARCHITECTURE.md` × código**
- Cada afirmação verificável ainda é verdade? Cheque as mais caras de estar erradas: contagem de
  `*.spec.ts` (`find src -name '*.spec.ts' | wc -l`), scripts em `package.json`, variáveis de
  ambiente listadas em §9 contra os `process.env` reais, módulos listados em §7 contra
  `src/modules/`, e os quatro pacotes declarados como não usados (§8) — ainda não são?
- Alguma seção descreve comportamento que o código não tem mais?

**3. `docs/specs/INDEX.md` × `docs/specs/` e `docs/tasks/`**
- Toda spec no disco está na tabela? Toda linha aponta para arquivo existente?
- O status bate com os checkboxes do `*-todo.md`?
- A lista de **pendências humanas** (`db push` de produção, aceite doutrinário) está atual? Uma
  pendência já resolvida e ainda listada é tão ruim quanto uma resolvida sem registro.

**4. `docs/tasks/*-todo.md` × git**
- Alguma fase marcada como pendente que já foi entregue em commit? (`git log --oneline -30`)
- Alguma marcada `[x]` sem commit correspondente?

**5. `prisma/schema.prisma` × docs**
- Todo model novo aparece em `ARCHITECTURE.md` §4? Há model no schema que a doc não menciona?

**6. Cross-repo**
- Os ponteiros para `oratio/docs/` apontam para arquivos que existem?

## Saída

| Arquivo | Linha | Afirma | Realidade | Gravidade |
|---|---|---|---|---|

Gravidade **alta** quando a afirmação errada levaria alguém a uma decisão ruim. **Baixa** quando
é só cosmético.

Depois da tabela, proponha as correções — **e pare**. Aplique só com o "ok" do humano, num commit
de `docs:` separado do trabalho de feature.
