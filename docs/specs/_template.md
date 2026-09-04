# Spec: <nome da feature>

> Status: rascunho | aprovada | implementada | obsoleta
> Plano: `docs/tasks/<feature>-plan.md` · Checklist: `docs/tasks/<feature>-todo.md`
> Frontend pareado: `oratio/docs/specs/<feature>.md` (ou "n/a")

## Objetivo

<Uma frase: o que esta feature permite que hoje não é possível.>

## Stack

<Só o que diverge do padrão da casa. Se seguir `docs/ARCHITECTURE.md` §1 inteiro, escreva
"padrão da casa" e siga em frente. Se divergir, diga **o quê** e **por quê**.>

## Comportamento esperado

- <entrada> → <saída>
- <regra de negócio>
- <o que acontece sem autenticação / sem permissão de admin>
- <o que acontece no erro: status HTTP, corpo, se loga>
- <fronteira de dia / timezone, se houver — `America/Sao_Paulo` explícito>

## Requisitos de saída

<O contrato, literal. Para cada rota:
— método e path (`GET /oratio/...`)
— guards (`JwtAuthGuard`, `AdminGuard`) e headers exigidos (`X-App: oratio`)
— shape do request (DTO, validações, limites)
— shape do response, incluindo o caso vazio
— códigos de erro e quando cada um acontece
Este bloco é o que `/qa-verify` transforma em `curl` — seja literal.>

## Modelo de dados

<Models Prisma novos ou alterados: campos, `@@unique`, `@@index`, `onDelete`.
Diga o que é **aditivo** e o que é **destrutivo** — `RULES.md` §2 trata os dois de forma
diferente. Se houver `db push` pendente, registre aqui.>

## Critérios de aceite (testáveis, em BDD)

- [ ] **Dado** <estado inicial>, **quando** <requisição>, **então** <status + corpo esperados>.
- [ ] **Dado** <estado inicial>, **quando** <requisição>, **então** <status + corpo esperados>.

<Regras para escrever um critério útil:
— o "então" tem que ser verificável por alguém que não escreveu o código;
— nada de "funciona corretamente" ou "está seguro";
— um critério por comportamento, não um por endpoint;
— inclua pelo menos um caminho sem token, um com token de outro usuário, e um de payload inválido.>

## Plano de testes

- **Unitário (Jest):** <quais `*.spec.ts`, o que cada um cobre>
- **Contrato:** <sequência de `curl` que prova o fluxo ponta a ponta contra `localhost:3000`>
- **Manual:** <o que só dá para verificar com serviço real: OpenAI, push, e-mail — e quem executa>

Loop de verificação por tarefa:
`npm test -- <pattern>` → `npm test` → `npm run build` → `npm run lint` → commit.

## Fora de escopo

- <o que NÃO faz parte desta entrega>
- <separe explicitamente **feature do produto** de **passo do processo de dev**: `db push` de
  produção, atualização de doc e revisão de contrato com o frontend são processo, não critério
  de aceite>

## Notas de ambiente

- <variável de env nova, `ALLOWED_ORIGINS`, `db push` pendente, custo de chamada externa
  (OpenAI), impacto no scheduler de notificações — tudo que o `RULES.md` exige decidir
  explicitamente>

## Questões em aberto

- [ ] <pergunta que muda o design e ainda não foi respondida — se não houver, escreva "Nenhuma">
