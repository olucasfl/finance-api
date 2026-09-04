---
description: Prepara uma mudança de schema — escreve o script e o rollback para revisão humana. Nunca executa.
argument-hint: <descrição da mudança>
---

Prepare a mudança de schema: **$ARGUMENTS**

## Por que este comando existe

Este projeto **não tem `prisma/migrations`**. O schema vai para o banco por `npx prisma db push`
direto, **sem histórico e sem rollback automático** (`ARCHITECTURE.md` §2/§8). E `DATABASE_URL`
aponta para **produção** por padrão.

Ou seja: um `db push` disparado sem querer é perda de dado sem desfazer. Por isso o agente
**escreve**; o humano **executa**.

## Procedimento

### 1. Classificar

Diga, na primeira linha, se a mudança é:
- **Aditiva** — model novo, campo opcional novo, índice novo. Baixo risco.
- **Destrutiva** — campo removido, model removido, tipo alterado, `@@unique` alterado, campo
  obrigatório novo em tabela com dados, `onDelete` afrouxado. **Exige aprovação explícita.**

### 2. Editar o schema

Altere `prisma/schema.prisma`. Isso é código, pode. Siga a convenção do arquivo: comentário curto
no model explicando qualquer restrição não óbvia (por que a chave composta, por que a linha some
em vez de ser flagada).

### 3. Escrever o efeito, em português

Antes de qualquer comando, escreva em texto: **o que será criado, o que será alterado, e o que
pode ser perdido** — tabela por tabela. Se a resposta para "pode perder dado?" for "não sei",
trate como destrutiva.

### 4. Escrever o script e o rollback

Crie `prisma/db-scripts/AAAA-MM-DD-descricao.sql` com o SQL equivalente **e o rollback**,
comentados. Prefira sempre a forma não-bloqueante:

- `ADD COLUMN ... DEFAULT ...` em vez de `ADD COLUMN` + backfill manual.
- `CREATE INDEX CONCURRENTLY` em vez de `CREATE INDEX` (não trava escrita numa tabela em uso).
- Campo novo **opcional**; torná-lo obrigatório é um segundo passo, depois do backfill.

O cuidado vale para o **texto** do script, não só para quem o executa.

### 5. Entregar e parar

```
npx prisma generate      # local, seguro: só regenera o client
```

E entregue, num bloco, o comando que **o humano** vai rodar:

```
npx prisma db push && npx prisma generate
```

**Não execute `db push`.** Está negado em `.claude/settings.json` e em `RULES.md` §2 — se for
tentado, o certo é parar, não contornar.

### 6. Registrar a pendência

Adicione a pendência em `docs/specs/INDEX.md` (seção "Pendências de execução humana") e no
`docs/tasks/*-todo.md` da feature, como item não marcado. Ela só sai da lista quando o humano
confirmar que rodou.
