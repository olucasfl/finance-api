# Índice de specs — Oratio API

Mapa único de `spec ↔ plano ↔ checklist ↔ status`. **Este arquivo é a fonte da verdade sobre o
que existe**; não confie em adivinhar nome de arquivo. Quem fecha uma fase atualiza esta tabela
no mesmo commit — e `/docs-sync` confere se ela bate com a realidade.

| Feature | Spec | Plano | Checklist | Frontend pareado | Status |
|---|---|---|---|---|---|
| Reformulação das notificações | — | `tasks/notifications-plan.md` | `tasks/notifications-todo.md` | `oratio/docs/tasks/notifications.md` (ponteiro) | ✅ concluída (Fases 1–5) |
| Perfis de resposta do VoxAI | — *(não precisa: já entregue)* | `tasks/vox-profiles-plan.md` | `tasks/vox-profiles-todo.md` | `oratio/docs/tasks/vox-profiles-todo.md` | 🚧 código entregue; falta aceite dos 5 perfis, matriz 6×5 e `db push` de produção |
| Bíblia de Estudo | — *(não precisa: já entregue)* | `tasks/biblia-plan.md` | `tasks/biblia-todo.md` | `oratio/docs/tasks/biblia-*.md` | ✅ **em produção** (B1–B3 na `main`; `npx jest bible` → 4 suítes, 39 testes verdes) |

## Legenda de status

| Status | Significa |
|---|---|
| 📝 rascunho | spec escrita, ainda não aprovada pelo humano |
| ✅ aprovada | aprovada, implementação não começou |
| 🚧 em andamento | tem plano e checklist abertos em `docs/tasks/` |
| ✅ implementada | todos os critérios de aceite verificados por `/qa-verify` |
| 🗑️ obsoleta | superada por outra spec — diga qual |

## Como usar

- **Feature nova:** `/criar-spec <nome>` → gera `specs/<nome>.md` a partir de `_template.md` e
  adiciona a linha aqui.
- **Implementar:** `/implement-story specs/<nome>.md`.
- **Provar que está pronto:** `/qa-verify specs/<nome>.md` — um `curl` por critério, contra o
  serviço local no ar, com evidência.
- **Requisito mudou:** edite **só a spec** e rode `/spec-sync specs/<nome>.md`.
- **Mudança de schema:** `/db-change <descrição>` — escreve o script e o rollback para revisão
  humana. Nunca executa (`RULES.md` §2).

## Pendências de execução humana registradas

Estas não são tarefas de código; são passos que só o humano pode executar e que bloqueiam o
fechamento de uma feature. Mantenha a lista curta e atual.

- **`db push` de produção** do schema de perfis do VoxAI (`User.voxProfile`,
  `User.voxOnboardingSeenAt`) — ver `tasks/vox-profiles-todo.md`, Checkpoint final backend.
- **Aceite doutrinário** dos 5 perfis dinâmicos e a matriz 6 perfis × 5 perguntas
  (`tasks/vox-profiles-todo.md`, Fase B3).

## Dívidas conhecidas (medidas em 2026-09-04)

- **`notifications-todo.md` tem 11 itens abertos** que são verificação manual (`curl`, painel,
  seed) e dois avisos de `db push` pendente — mas o `db push` da Fase 4 foi aplicado
  (`1603429 docs(notif): db push da Fase 4 aplicado`) e o plano fechou no Checkpoint E. O
  arquivo não reflete isso. Fica registrado; não foi reconciliado nesta rodada.

## Por que não há spec para as features existentes

Todas as features desta tabela foram construídas direto no par plano+checklist, sem spec — e
**não vale a pena escrever spec retroativa para elas**. Spec é contrato antes do código: quando o
código já existe e funciona, o que sobra é documentação, e isso o `docs/ARCHITECTURE.md` já faz.
Um terceiro arquivo dizendo o mesmo só cria mais uma coisa para manter em sincronia.

O template e os comandos (`/criar-spec`, `/qa-verify`, `/spec-sync`) valem para a **próxima**
feature — a que ainda não existe. Aí a spec é contrato de verdade, e mudar um requisito vira
editar um arquivo em vez de reexplicar contexto numa conversa nova.
