---
description: Escreve uma spec nova em docs/specs/ por entrevista dirigida, com critérios de aceite em BDD
argument-hint: <nome-da-feature>
---

Crie a spec de **$ARGUMENTS** em `docs/specs/$ARGUMENTS.md`, a partir de `docs/specs/_template.md`.

## Antes de perguntar qualquer coisa

Leia, nesta ordem: `.claude/rules/RULES.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md` e
`docs/specs/INDEX.md`. Se já existir spec ou plano para algo parecido, **diga isso e pergunte se
é para estender o que existe** em vez de criar arquivo novo.

## Como conduzir

Faça **perguntas direcionadas, uma de cada vez**, com opções quando fizer sentido. Cubra:
objetivo · comportamento esperado · contrato das rotas · modelo de dados · guards e permissões ·
erros e limites · timezone (se houver fronteira de dia) · critérios de aceite · fora de escopo ·
notas de ambiente.

**Não pergunte o que já está claro no pedido ou nas convenções do projeto — só o que realmente
muda o design.** Teto de **3 perguntas** antes de propor a spec. O que faltar, você assume um
padrão razoável, escreve na spec, e **sinaliza a suposição explicitamente**.

## Regras de conteúdo

- **Critérios de aceite em BDD**: `Dado <estado>, quando <requisição>, então <status + corpo>`.
  Inclua pelo menos **um sem token**, **um com token de outro usuário**, e **um com payload
  inválido**.
- Nada de "funciona corretamente" ou "está seguro" — se não dá para outra pessoa verificar com um
  `curl`, não é critério.
- **A seção "Requisitos de saída" é literal**: método, path, guards, headers, DTO, response,
  códigos de erro. É dela que `/qa-verify` monta os `curl`.
- **Modelo de dados**: separe o que é aditivo do que é destrutivo. `RULES.md` §2 trata os dois de
  forma diferente, e mudança destrutiva vira pendência humana registrada.
- **Separe feature do produto de passo de processo.** `db push` de produção, atualizar
  `ARCHITECTURE.md` e revisar contrato com o frontend são processo: vão em "Fora de escopo".
- Se a feature toca o frontend, registre o par em `oratio/docs/specs/` e aponte um para o outro.

## Ao terminar

1. Escreva o arquivo com `Status: rascunho`.
2. Adicione a linha correspondente em `docs/specs/INDEX.md`.
3. Liste as suposições que você fez, em bullets, e **pare** — a spec só vira `aprovada` com um
   "ok" explícito do humano. Não comece a implementar.
