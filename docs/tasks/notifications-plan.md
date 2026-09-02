# Plano: destravar o sistema de notificações (versão enxuta)

> **Plano-mestre desta reformulação.** Ele é cross-repo: o grosso é backend
> (`oratio-api/`), mas as Fases 1, 2 e 4 têm parte de painel no frontend
> (`oratio/`). O checklist executável está em
> `oratio-api/docs/tasks/notifications-todo.md`; o frontend tem só um ponteiro
> em `oratio/docs/tasks/notifications.md`.
> Aprovado pelo usuário em 2026-09-02. Commits na `develop` dos dois repos
> (nunca `main` — memória `git-workflow-develop-only`).

## Visão geral

O sistema atual funciona, mas é **engessado**: cada notificação automática é um
registro fixo em `DEFAULT_RULES` + um `case` no `switch` de `evalCondition()` +
uma entrada em `RULE_META` (3 lugares no código). O painel admin só edita
título/corpo/hora/on-off. Limiares ("Bíblia parada há 3 dias"), quiet hours,
teto por dia e espaçamento são constantes no código. Um texto fixo por regra que
repete e cansa. Todo mundo recebe no mesmo horário.

Este plano deixa o sistema **configurável sem deploy e menos repetitivo**, sem
virar plataforma de analytics/experimentação. Escopo aprovado pelo usuário:

| Eixo | Decisão |
|---|---|
| Gatilhos | As ~9 regras seguem semeadas por código (o *tipo* de condição é código). O painel passa a expor **limiar (N dias), faixa de horário, pool de textos e on/off** de cada uma. Admin **não cria** regra nova. |
| Timing | **Faixas fixas manhã / tarde / noite.** Cada usuário é classificado numa faixa pela atividade recente; cada regra tem uma faixa preferida. Regra dispara na interseção. |
| Conteúdo | **Pool de variantes por regra.** A cada disparo escolhe a variante **menos usada recentemente por aquele usuário**. Variáveis de contexto ({nome}, {count}, {label}, e depois {santo}/{tempoLiturgico}). |
| Funil anti-spam | Mesma lógica, mas `maxPerDay`, quiet hours, espaçamento e afins viram **um bloco de config editável no admin**. |
| Entrega | **Backend + painel admin.** Sem campanhas agendadas/recorrentes. Sino/caixa de entrada fica como está. |
| Roadmap antigo (8 etapas) | **Reaproveitar o que dá** do schema da Etapa 0 (branches `backup/pre-align-20260902` nos dois repos): índice de `UserActivity`, um `UserNotificationProfile` enxuto, `NotificationRuleVariant`. Descartar: `NotificationEvent` (funil evento-a-evento), `NotificationDailyStat`, `EngagementTier`, A/B, `MuteChannel`, compositor de campanha. |

## Decisões de arquitetura

- **Aditivo e reversível por default.** Toda coluna/tabela nova é opcional e
  semeada com o valor que reproduz o comportamento de hoje. Se o motor novo
  falhar, as regras continuam disparando pelos defaults.
- **`prisma db push`, sem migrations.** (ver `docs/ARCHITECTURE.md` §2). Nada de
  `DROP`/`ALTER` destrutivo. Testar o push contra um banco de rascunho e
  **confirmar com o usuário antes de rodar contra produção**.
- **O *tipo* de condição continua sendo código.** `evalCondition()` segue com
  seu `switch` — e segue **sem fallback "sempre elegível"** para condição
  desconhecida (ver `docs/ARCHITECTURE.md` §5, é intencional). O que sai do
  código é o *parâmetro* (limiar, faixa, texto), não a query.
- **Config e perfil lidos com cache curto em memória** (TTL ~60s) pra não
  transformar o tick de 10 min num festival de queries.
- **Não encostar em `streakAtRisk()` / `prayerStreak` / `lastLoginDate`.** O
  nome do campo é enganoso e já causou bug (ver `docs/ARCHITECTURE.md` §5/§7). A
  regra `STREAK_AT_RISK` ganha limiar/faixa/textos como as outras, mas a
  condição em si fica intocada.
- **Classificação de faixa: preguiçosa + cacheada.** Calculada a partir de
  `UserActivity` (janela de ~30 dias, hora local Brasil), gravada em
  `UserNotificationProfile.activeBand`, recalculada quando `bandComputedAt`
  passa de 7 dias — dentro do próprio tick, sem cron dedicado. Pouca atividade
  ⇒ faixa `ANY` (elegível o dia todo, como hoje).
- **Variante "menos usada recentemente" sai do histórico de `Notification`**
  (nova coluna `variantId`), que o tick já carrega. Sem tabela de estado extra.

## Grafo de dependências

```
NotificationSettings (singleton)      ─┐
UserActivity @@index                   │
UserNotificationProfile (activeBand)   ├─→ scheduler lê dado no lugar de constante
NotificationRule +thresholdDays +band  │      (faixa ∩ faixa, limiar do registro,
NotificationRuleVariant                 │       variante LRU)
Notification +variantId                ─┘
        │
        └─→ endpoints admin (settings / knobs de regra / variantes)
                │
                └─→ UI AdminNotifications (bloco de ajustes, editor de regra, editor de variantes)
```

Ordem = de baixo pra cima. Cada fatia entrega uma capacidade ponta a ponta
(schema → serviço → scheduler → painel) e deixa o sistema funcionando.

## Lista de tarefas

Rastreadas em `oratio-api/docs/tasks/notifications-todo.md`. Repositórios:
`oratio-api/` (backend) e `oratio/` (painel).

### Fase 1 — Bloco de configuração do funil
- Task 1: `NotificationSettings` singleton + serviço com cache; scheduler lê dele
- Task 2: Endpoint admin GET/PATCH das configurações
- Task 3: UI "Ajustes de frequência" no `AdminNotifications` *(frontend)*
- **Checkpoint A**

### Fase 2 — Limiar e faixa por regra (knobs no dado)
- Task 4: `NotificationRule` +`thresholdDays` +`band`; seed a partir do catálogo atual
- Task 5: `evalCondition()` lê `thresholdDays` do registro (fim dos `minDays` hardcoded)
- Task 6: UI do card de regra expõe limiar + faixa + on/off *(frontend)*
- **Checkpoint B**

### Fase 3 — Faixas de horário por usuário
- Task 7: `UserNotificationProfile` + `UserActivity` `@@index`; classificador de faixa
- Task 8: Scheduler filtra candidatas por (faixa do usuário ∩ faixa da regra)
- **Checkpoint C**

### Fase 4 — Pool de variantes de texto
- Task 9: `NotificationRuleVariant` + `Notification.variantId`; seed 1 variante por regra
- Task 10: Scheduler escolhe a variante menos usada recentemente pelo usuário
- Task 11: UI: editor de variantes por regra (add/editar/remover/ativar) *(frontend)*
- **Checkpoint D**

### Fase 5 — Variáveis de contexto (polimento)
- Task 12: Resolver de contexto ({nome}, {santo}, {tempoLiturgico}) na interpolação
- **Checkpoint E — revisão final**

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| `prisma db push` sem rollback contra produção | Alto | Só mudança aditiva/opcional; testar em banco de rascunho; **pedir OK do usuário** antes do push em prod; `npx prisma generate` junto |
| Mudança no scheduler causa tempestade ou silêncio de notificações | Alto | Defaults idênticos ao de hoje; testes de scheduler cobrindo "sem config" / "sem perfil" / "sem variante"; rollout regra a regra pelo `enabled` |
| Classificador de faixa varre `UserActivity` inteira | Médio | `@@index([userId, createdAt])`; janela de 30 dias; cache de 7 dias no perfil |
| Mexer sem querer em `streakAtRisk`/`prayerStreak` | Médio | Regra explícita: condição intocada, só ganha knobs; teste de regressão |
| `variantId` numa tabela quente (`Notification`) | Baixo | Coluna nullable, aditiva; sem índice novo obrigatório |
| Reaproveitar schema da Etapa 0 arrastar peso morto | Baixo | Copiar só as 3 estruturas listadas; nada de enums de funil/tier/campanha |

## Perguntas em aberto (decidir antes/durante a implementação)

1. **Faixa vs. hora exata no painel:** `band` substitui o campo `hour` na UI, ou
   os dois coexistem (hora como desempate dentro da faixa)?
2. **Recalcular faixa:** preguiçoso dentro do tick (plano atual) está de bom
   tamanho, ou prefere um cron semanal explícito?
3. **Variáveis de contexto:** quais realmente importam primeiro — santo do dia?
   tempo litúrgico? trecho do Evangelho do dia? Definir o conjunto mínimo.
4. **Piso de variantes:** garantir sempre ≥1 variante ativa por regra (a UI
   impede desativar a última)?
5. **"Rest gap" / cota de convite / limiar de urgência:** entram todos no bloco
   de config editável, ou é hora de aposentar o "rest gap" e simplificar?
