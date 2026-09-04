# db-scripts

Scripts SQL de mudança de schema, escritos pelo agente e **executados pelo humano**.

Este projeto não tem `prisma/migrations`: o schema vai para o banco por `npx prisma db push`
direto, sem histórico e sem rollback automático (`docs/ARCHITECTURE.md` §2/§8). Estes arquivos
são o registro que a ausência de migrations deixa faltando, e o artefato que se revisa **antes**
de aplicar qualquer coisa em produção.

## Convenção

Um arquivo por mudança: `AAAA-MM-DD-descricao-curta.sql`, contendo

1. o que muda, em comentário, tabela por tabela;
2. o SQL de aplicação;
3. o SQL de **rollback**, comentado.

Gerado por `/db-change`. Ver `.claude/rules/RULES.md` §2 para o que é permitido a quem.
