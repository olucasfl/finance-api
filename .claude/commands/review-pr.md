---
description: Revisão completa antes do PR — critérios de aceite e varredura de erros, em paralelo
argument-hint: [branch base, padrão develop]
---

Revise a branch atual antes de abrir PR. Base: **${ARGUMENTS:-develop}**.

## 1. Sanidade

```
git rev-parse --abbrev-ref HEAD
git diff --stat ${ARGUMENTS:-develop}...HEAD
```

Se a branch atual for `main` ou `develop`, **pare** — `RULES.md` §7. Se o diff estiver vazio,
diga isso e pare.

## 2. Dois revisores, em paralelo

Dispare os dois agentes **read-only**, na mesma mensagem:

- **`ac-reviewer`** — recebe a spec (`docs/specs/`) ou o checklist (`docs/tasks/*-todo.md`).
  Devolve veredito por critério de aceite, com evidência.
- **`error-scanner`** — recebe o diff. Devolve os achados do checklist fixo de 12 itens (guard
  ausente, `userId` de fonte não confiável, segredo, log sensível, schema destrutivo, DTO sem
  validação, timezone, teste com rede real, doutrina, CORS/`X-App`, pacote não usado, dado
  pessoal).

Nenhum dos dois edita código. É isso que torna a saída deles confiável como portão.

## 3. Verificação mecânica

```
npm test
npm run build
npm run lint
```

## 4. Síntese

Um veredito só, em três blocos:

- **Bloqueadores** — critério não atendido, achado crítico, build quebrado. Qualquer um deles e o
  veredito é **não abrir**.
- **Corrigir antes do merge** — o que dá para resolver rápido.
- **Registrar como dívida** — o que fica, e onde foi anotado.

Confirme também a higiene: `docs/tasks/*-todo.md` com os `[x]` marcados, `docs/ARCHITECTURE.md`
atualizado se o comportamento mudou, `docs/specs/INDEX.md` com o status e as **pendências
humanas** (`db push`, aceite doutrinário) em dia, e o contrato conferido contra
`oratio/src/services/*Service.ts`.

**O agente antecede a revisão humana, nunca a substitui.** Diga isso no fecho.
