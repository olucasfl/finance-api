---
description: Investiga a causa raiz de um bug e corrige — sem editar nada antes de ter um teste que falha
argument-hint: <descrição do bug ou teste falhando>
---

Bug: **$ARGUMENTS**

Aplique a skill **`bug-research`** integralmente. Ela não é sugestão: é o procedimento.

## O portão

**Não altere código de produção antes do passo 4** (teste que falha pela razão da hipótese).
Se você se pegar editando um arquivo em `src/` antes de ter mostrado a saída de um teste
falhando, pare e volte.

## Sequência

1. **Reproduzir** — local (`npm run start:dev` + `curl` contra `localhost:3000`), nunca contra
   produção. Defina rota, método, corpo, token, `X-App`, estado no banco e horário.
2. **Localizar a causa raiz** — controller → guard → DTO/pipe → service → Prisma, inteiro.
   Pergunte se o dado errado veio do **banco** ou da **lógica**; são investigações diferentes.
3. **Hipótese** em uma frase testável.
4. **Teste que falha** — rode e cole a saída real. Se passar de primeira, a hipótese está errada:
   volte ao 2.
5. **Corrigir** — a menor mudança possível. Delegue ao agente `bug-fixer` se o escopo for claro.
6. **Regressão** — o teste fica no repo; `npm test` completo + `npm run build` + `npm run lint`.

## Limites

- **Nunca** consulte o banco de produção para entender o bug (`RULES.md` §2). Reproduza local com
  dado sintético de mesma forma.
- **Nunca** altere `prisma/schema.prisma` como parte de uma correção — vai por `/db-change`.
- **Nunca** remova ou afrouxe um guard para fazer um teste passar.
- Se a correção mudar o contrato de uma rota, **pare e pergunte**: o frontend muda em lockstep.
- Um bug por execução. Achou um segundo? Descreva e siga.
