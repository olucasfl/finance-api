---
name: bug-research
description: Investiga a causa raiz de um bug antes de qualquer correção. Use quando um teste falha, quando uma rota devolve o que não deveria, quando um usuário reporta um problema, ou quando você está prestes a "tentar uma coisa pra ver se resolve".
---

# Pesquisa de bug — provar a causa antes de corrigir

O erro que esta skill existe para evitar: corrigir o **sintoma que aparece por cima**, achar que
resolveu porque a resposta parou de dar 500, e o bug voltar em outra forma três semanas depois.

**A regra que sustenta tudo: não altere código de produção antes do passo 4.**

## Os 6 passos

### 1. Reproduzir

Antes de qualquer leitura de código, defina o caso concreto: qual rota, qual método, qual corpo,
com ou sem token, com qual `X-App`, admin ou não, qual estado no banco, que horas (fuso importa).

Se você **não consegue reproduzir**, esse é o resultado desta etapa. Diga o que tentou e o que
falta — e pare. Corrigir um bug não reproduzido é chutar.

Reproduza **local** (`npm run start:dev` + `curl` contra `localhost:3000`). Nunca contra
produção (`RULES.md` §1).

No Oratio API, boa parte dos bugs difíceis mora em quatro lugares — comece por eles se o sintoma
encaixar:
- **Fuso horário**: fronteira de dia em streak, liturgia do dia, `hour` de notificação. Sintoma:
  "só acontece de madrugada" ou "conta um dia a mais".
- **Auth**: `JwtAuthGuard`, refresh, `JWT_SECRET_KEY` × `JWT_REFRESH_SECRET` (são diferentes de
  propósito).
- **Scheduler de notificações**: condição de regra, faixa de horário, variante escolhida.
- **VoxAI**: montagem do prompt (`VOX_IDENTITY` + perfil), resposta da OpenAI, streaming.

### 2. Localizar a causa raiz

Leia o caminho de execução inteiro: controller → guard → DTO/pipe → service → Prisma. Não pare no
primeiro `if` suspeito.

Pergunte **por que** o valor errado chegou ali. E de novo, para a resposta. A causa raiz é aquela
em que a resposta vira "porque foi escrito assim".

Atenção especial: o dado errado veio do **banco** ou da **lógica**? São investigações diferentes,
e você não pode consultar o banco de produção para descobrir (`RULES.md` §2) — reproduza local
com um dado sintético que tenha a mesma forma.

### 3. Formular a hipótese

Uma frase testável: *"`getStreak()` conta um dia a mais quando o usuário reza entre 21h e 00h
porque compara `new Date()` do servidor (UTC) com a data já convertida para `America/Sao_Paulo`."*

Se não couber numa frase, você ainda está no passo 2.

### 4. Confirmar com um teste que falha

**Este é o portão.** Escreva um `*.spec.ts` que falha **pela razão da hipótese**.

- Rode-o e **mostre a saída da falha**, com a mensagem real.
- Se passar de primeira, a hipótese está errada. Volte ao passo 2 — você acabou de descobrir
  barato que ia corrigir a coisa errada.
- Convenção: `PrismaService` mockado como objeto de `jest.fn()`s, `fetch`/`axios` mockados no
  nível do módulo. Ver a skill `oratio-testing`.

### 5. Corrigir

Só agora. A **menor** mudança que faz o teste do passo 4 passar.

Se a correção exigir mudança de schema, de guard, de contrato de rota, ou de `vox.prompt.ts`,
**pare e peça aprovação** com o diff pronto (`RULES.md` §2, §4, §5).

### 6. Garantir a regressão

O teste do passo 4 **fica no repositório**. Rode `npm test` inteiro, `npm run build`, `npm run lint`.

Na mensagem do commit: o que era, por que acontecia, o que mudou, e qual teste impede a volta.

## Anti-padrões

| Sintoma | O que está acontecendo |
|---|---|
| "Vou tentar mudar isso e ver se resolve" | Pulou do passo 1 pro 5. Não sabe a causa. |
| Consultou o banco de produção pra entender | Violou `RULES.md` §2. Reproduza local. |
| Corrigiu, mas não escreveu teste | Sem passo 4 e sem passo 6: o bug volta e ninguém percebe. |
| O teste novo passa antes da correção | O teste não exercita o bug. Não confirma nada. |
| A correção mexeu no schema | Não é correção de bug; é mudança de dados. Vai por `/db-change`. |
| "Também aproveitei e arrumei…" | Vira outra tarefa. Sempre. |
