# TODO: destravar notificações (versão enxuta)

Plano completo em `oratio-api/docs/tasks/notifications-plan.md`. Backend =
`oratio-api/`, painel = `oratio/` (repos irmãos na mesma pasta).
Commits na `develop`. Rodar `npx prisma db push` + `npx prisma generate` só
depois de OK do usuário; testar antes num banco de rascunho.

Comandos de verificação (rodar dentro do repo respectivo):
- Backend testes focados: `oratio-api$ npx jest <arquivo>`
- Backend build: `oratio-api$ npm run build`
- Front testes focados: `oratio$ npx vitest run <arquivo>`
- Front build: `oratio$ npm run build`

---

## Pós-plano

- **2026-09-02 — pool inicial de variantes ampliado:** o `seedMissing` da
  Task 9 semeava só 1 variante por regra. `DEFAULT_VARIANTS` agora traz **3
  textos por regra** do catálogo (regra custom segue com 1, do próprio texto).
  Semeado só quando a regra tem 0 variantes — depois disso o admin é dono da
  lista. Sem mudança de schema. `oratio-api` branch `feat/notif-mais-variantes`.

---

## Fase 1 — Bloco de configuração do funil

### Task 1: `NotificationSettings` singleton + leitura no scheduler
**Descrição:** Criar uma tabela de linha única com os parâmetros do funil
anti-spam e um serviço que a lê com cache curto. O scheduler passa a ler dela
em vez das constantes privadas, com defaults idênticos aos valores de hoje.

**Critérios de aceite:**
- [x] Model `NotificationSettings` (id fixo `"default"`, colunas: `maxPerDay`
      Int @default(2), `maxNudgesPerDay` Int @default(1), `quietStart` Int
      @default(22), `quietEnd` Int @default(7), `spacingHours` Int @default(6),
      `restGapEnabled` Bool @default(true), `urgentThreshold` Int @default(80),
      `updatedAt`)
- [x] `NotificationSettingsService.get()` faz upsert-lazy da linha default e
      cacheia por ~60s (+ `invalidate()` pro PATCH da Task 2; fallback pros
      defaults se o banco falhar, sem cachear o fallback)
- [x] `notifications.scheduler.ts` usa esses valores no lugar de `MAX_PER_DAY`,
      `MAX_NUDGES_PER_DAY`, `QUIET_START/END`, `SPACING_MS`, `URGENT_THRESHOLD`,
      `inRestGap`
- [x] Com o banco recém-criado (sem linha), o tick se comporta exatamente como
      antes — os defaults do serviço reproduzem as constantes antigas
- [x] ⚠️ **Achado + fix:** `inRestGap` era variável morta (calculada, nunca
      usada) — o "gap de descanso" nunca esteve ligado. Era a causa direta da
      queixa do usuário (mesmas notificações a cada 1–2 dias). **Ligado nesta
      fase** (decisão do usuário, 2026-09-02): notificação não-urgente só
      dispara se não houve NENHUMA notificação hoje nem ontem; urgentes
      (streak/terço não terminado) ignoram o gap. Sob a flag `restGapEnabled`
      (default on, desligável pelo painel). Testes: `describe('rest gap')` em
      `notifications.scheduler.spec.ts`.

**Verificação:**
- [x] `npx jest notifications.scheduler` passa (specs existentes + novos casos
      "sem linha de settings", "maxPerDay customizado", "quiet hours ampliado")
- [x] `npm run build` no backend — suíte completa: 728 testes passando
- [ ] Manual: `GET` no banco mostra 1 linha `NotificationSettings` após o 1º
      tick — depende do `prisma db push` em prod (Checkpoint, com OK do usuário)

**Dependências:** Nenhuma
**Arquivos:** `oratio-api/prisma/schema.prisma`,
`oratio-api/src/modules/oratio/notifications/notification-settings.service.ts` (novo),
`.../notifications.scheduler.ts`, `.../notifications.module.ts`, specs
**Escopo:** M

---

### Task 2: Endpoint admin de configurações
**Descrição:** Expor `GET` e `PATCH` das configurações do funil sob o
`AdminGuard`, reusando o `NotificationSettingsService`.

**Critérios de aceite:**
- [x] `GET /oratio/admin/notifications/settings` devolve a linha atual
      (`getFull()`, upsert preguiçoso)
- [x] `PATCH /oratio/admin/notifications/settings` valida faixas via
      `UpdateSettingsDto` (`quietStart/End` 0–23, `maxPerDay`/`maxNudgesPerDay`
      0–10, `spacingHours` 0–24, `urgentThreshold` 0–100, `restGapEnabled` bool)
      e invalida o cache (`settings.update()` chama `invalidate()`)
- [x] Só admin acessa — `@UseGuards(JwtAuthGuard, AdminGuard)` a nível de
      classe já cobre as rotas novas

**Verificação:**
- [x] `npx jest notification` passa com casos novos (getSettings/updateSettings
      no controller; getFull/update no serviço)
- [x] `npm run build` no backend — suíte completa: 733 testes passando
- [ ] Manual: `curl` PATCH muda `maxPerDay` e o `GET` reflete — depende do
      `prisma db push` em prod (Checkpoint, com OK do usuário)

**Dependências:** Task 1
**Arquivos:** `.../admin-notifications.controller.ts`, `.../dto/settings.dto.ts` (novo),
`.../notification-settings.service.ts` (getFull/update), specs
**Escopo:** S

---

### Task 3: UI "Ajustes de frequência"
**Descrição:** Bloco no `AdminNotifications` pra ver/editar as configurações do
funil, com salvar explícito e feedback de erro de validação.

**Critérios de aceite:**
- [x] Campos: máx por dia, máx convites por dia, quiet hours (início/fim),
      intervalo mínimo (h), limiar de urgência, toggle do gap de descanso
- [x] Carrega do `GET`, salva no `PATCH` (objeto inteiro), mostra estado
      salvando/salvo/erro
- [x] Texto curto (`.setHint`) explicando o efeito de cada campo

**Verificação:**
- [x] `npx vitest run AdminNotifications` passa (14 testes, +3 novos)
- [x] `npm run build` no front — suíte completa: 728 testes passando
- [ ] Manual: mudar quiet hours no painel e confirmar persistência no reload
      — depende do `prisma db push` (o endpoint 500 sem a tabela)

**Dependências:** Task 2
**Arquivos:** `oratio/src/components/AdminNotifications/AdminNotifications.tsx`,
`.module.css`, `oratio/src/services/adminNotificationsService.ts`, test
**Escopo:** M
**Commit:** `oratio@cb1a7e1` (branch `feat/notificacoes-config`)

---

## Checkpoint A — Fase 1
- [x] Testes de backend (736) e front (728) passam; os dois buildam
- [x] Funil configurável ponta a ponta; sem config/tabela, o scheduler se
      comporta igual ao de antes (defaults do serviço = constantes antigas)
- [x] Bônus (decisão do usuário): gap de descanso ligado — ataca direto a
      queixa "mesmas notificações a cada 1–2 dias"
- [ ] ⏳ **Pendente:** `npx prisma db push` + `generate` — schema fica à
      frente do banco até o Checkpoint E (ou antes, com OK do usuário). Até
      lá, `GET/PATCH .../settings` retorna 500 em prod; o scheduler segue
      normal pelo fallback.
- [ ] Revisar com o usuário antes da Fase 2

---

## Fase 2 — Limiar e faixa por regra

### Task 4: Colunas `thresholdDays` e `band` em `NotificationRule` + seed
**Descrição:** Adicionar os dois knobs ao model e semear a partir do catálogo
`DEFAULT_RULES` na reconciliação de boot (sem sobrescrever edição do admin).

**Critérios de aceite:**
- [x] `thresholdDays Int?` e `band String?` no model, aditivos e nullable
- [x] Valores-semente ficam no próprio catálogo `DEFAULT_RULES` (explícito >
      heurística por hora): MORNING pra 8–11h, AFTERNOON pra ROSARY_UNFINISHED/
      ROSARY_LAPSE, EVENING pra STREAK/EXAMEN. `thresholdDays`: BIBLE=3,
      CATECHISM=4, ROSARY_LAPSE=7, COMEBACK=3; `null` nas condições sem janela
- [x] `onModuleInit` faz backfill só onde a regra está `null` (banco pré-colunas);
      nunca reescreve valor que o admin definiu
- [x] Regra criada do zero já nasce com os dois campos (`create({ data: r })`)

**Verificação:**
- [x] `npx jest notifications.scheduler` (bloco `onModuleInit`, +3 casos) passa
- [x] `npm run build` no backend
- [ ] Manual: após boot, `GET /rules` mostra `band`/`thresholdDays` — depende
      do `prisma db push`

**Dependências:** Checkpoint A
**Arquivos:** `oratio-api/prisma/schema.prisma`, `.../notifications.scheduler.ts`
(catálogo + reconcile), specs
**Escopo:** M
**Commit:** `oratio-api` branch `feat/notif-regra-knobs`

---

### Task 5: `evalCondition()` lê `thresholdDays` do registro
**Descrição:** Trocar os `minDays` hardcoded (`readingResume`, `rosaryLapse`,
`comeback`) pelo valor do registro da regra, com o valor de hoje como default
quando `thresholdDays` for `null`.

**Critérios de aceite:**
- [x] `evalCondition(userId, rule, tz)` (recebe a regra inteira, não só a
      condição); `readingResume`/`rosaryLapse`/`comeback` usam `rule.thresholdDays ?? <default>`
- [x] `null` ⇒ mantém o número de hoje (3/4/7/3)
- [x] `streakAtRisk()` e `rosaryUnfinished()` **intocados** (janelas fixas na
      condição, não são "parado há N dias"); `voxIntro` idem (idade da conta)
- [x] Condição desconhecida continua **não disparando** (sem fallback)
- [x] Teto de 14 dias do `comeback` fica fixo (não é knob)

**Verificação:**
- [x] `npx jest notifications.scheduler` — "limiar custom encurta a janela",
      "sem limiar = comportamento atual", ROSARY_LAPSE/COMEBACK
- [x] `npm run build` no backend — suíte completa: 740 testes passando

**Dependências:** Task 4
**Arquivos:** `.../notifications.scheduler.ts`, specs
**Escopo:** S
**Commit:** junto da Task 4 (colunas inúteis sem quem leia)

---

### Task 6: UI do card de regra — limiar + faixa + on/off
**Descrição:** Estender o card de regra no `AdminNotifications` pra editar
`thresholdDays` (quando a condição usa limiar) e `band`, além do on/off que já
existe. `ruleTrigger()` passa a descrever com base nos valores reais.

**Critérios de aceite:**
- [x] Select de faixa (Manhã/Tarde/Noite/Qualquer) por regra (`.knobSelect`)
- [x] Campo "Parado há … dias" só aparece pras condições de janela
      (`THRESHOLD_CONDITIONS`: BIBLE/CATECHISM_RESUME, ROSARY_LAPSE, COMEBACK)
- [x] `saveRule` manda `band`/`thresholdDays`; `ruleTrigger()` interpola o
      limiar real ("parou a leitura da Bíblia há 3 dias")
- [x] Regras de sistema seguem sem botão de excluir (comportamento não mexido)
- [x] Backend: `UpdateRuleDto` valida `band`/`thresholdDays`; `updateRule`
      repassa os dois

**Verificação:**
- [x] `npx vitest run AdminNotifications` passa (16 testes, +2 novos)
- [x] `npm run build` no front
- [x] `npx jest notifications` no back (139) — suíte back completa: 741
- [ ] Manual: mudar faixa e limiar, recarregar, valores persistem — depende
      do `prisma db push`

**Dependências:** Task 5
**Arquivos:** `oratio/src/components/AdminNotifications/*`,
`oratio/src/services/adminNotificationsService.ts`, test;
`oratio-api/.../dto/rule.dto.ts` + `notifications-send.service.ts`
**Escopo:** M
**Commits:** `oratio-api@39666e2` (back) + `oratio` branch `feat/notif-regra-knobs` (front)

---

## Checkpoint B — Fase 2
- [x] Limiares e faixas editáveis pelo painel; defaults (catálogo + `?? <n>`)
      reproduzem o comportamento de hoje
- [x] `streakAtRisk` / `rosaryUnfinished` / `voxIntro` intocados — testes de
      regressão verdes (741 back)
- [x] O scheduler ainda NÃO filtra por `band` — só semeia e expõe no painel.
      O uso do `band` no tick é a Fase 3 (Task 8).
- [ ] ⏳ `prisma db push` segue pendente (agora +2 colunas em `NotificationRule`)
- [x] `prisma db push` das Fases 1–2 aplicado em produção (2026-09-02, com OK
      do usuário) — diff 100% aditivo (2 colunas nullable em `NotificationRule`
      + tabela `NotificationSettings`); `migrate diff` pós-push = vazio
- [x] Revisado com o usuário — seguir pra Fase 3

---

## Fase 3 — Faixas de horário por usuário

### Task 7: `UserNotificationProfile` + índice + classificador
**Descrição:** Model enxuto de perfil e um serviço que classifica o usuário numa
faixa a partir de `UserActivity` (30 dias, hora local Brasil), cacheando em
`activeBand`/`bandComputedAt` e recalculando quando passa de 7 dias.

**Critérios de aceite:**
- [x] Model `UserNotificationProfile` (`userId @id`, `activeBand String
      @default("ANY")`, `bandComputedAt DateTime?`, `updatedAt`) + relação em `User`
- [x] `@@index([userId, createdAt])` em `UserActivity`
- [x] `classifyBand(userId)`: 30 dias, hora local BR via `toZonedTime`, 3 baldes
      (MORNING 5–11, AFTERNOON 12–17, EVENING 18–4); `< 5` eventos ⇒ `ANY`;
      empate → MORNING > AFTERNOON > EVENING
- [x] `getBand(userId)`: cache no perfil, recalcula se `bandComputedAt` > 7d,
      upsert; **nunca lança** — qualquer falha ⇒ `ANY`

**Verificação:**
- [x] `npx jest user-notification-profile` (8 casos) passa
- [x] `npm run build` no backend — suíte completa: 749 testes
- [ ] Manual: seed de atividades e conferir `activeBand` — pós `db push` da Fase 3

**Dependências:** Checkpoint B
**Arquivos:** `oratio-api/prisma/schema.prisma`,
`.../notifications/user-notification-profile.service.ts` (novo),
`.../notifications.module.ts`, spec
**Escopo:** M
**Commit:** `oratio-api` branch `feat/notif-faixa-usuario`

---

### Task 8: Scheduler cruza faixa do usuário × faixa da regra
**Descrição:** No `tick()`, a lista de candidatas passa a exigir que a faixa do
usuário case com a `band` da regra (`ANY` de qualquer lado = sempre casa). Sem
perfil ou `band` da regra `null` ⇒ cai no `shouldFireAtHour(hour)` de hoje.

**Critérios de aceite:**
- [x] `tick()` chama `profiles.getBand(userId)` (1x por usuário) e filtra
      candidatas por `bandMatches(userBand, rule.band)`
- [x] `bandMatches`: `ANY` de qualquer lado, ou `rule.band` null ⇒ casa
      sempre (vale só a hora, como antes); senão exige igualdade
- [x] Fallback seguro: `getBand` nunca lança (⇒ ANY); regra sem band ⇒ hora-only
- [x] Quiet hours continua por cima; no máx. 1 disparo por tick
- [x] **Fix de tabela:** `shouldFireAtHour` no `tick()` passou a receber
      `cfg.quietEnd/quietStart` (antes usava os defaults hardcoded mesmo com
      quiet hours customizado no admin — latente desde a Task 1)

**Verificação:**
- [x] `npx jest notifications.scheduler` — matriz faixa-usuário × faixa-regra
      (5 casos) + `bandMatches` puro
- [x] `npm run build` no backend — suíte completa: 755 testes

**Dependências:** Task 7
**Arquivos:** `.../notifications.scheduler.ts`, specs
**Escopo:** M
**Commit:** `oratio-api` branch `feat/notif-faixa-usuario`

---

## Checkpoint C — Fase 3
- [x] Timing por faixa funcionando com fallback seguro (755 testes back)
- [x] Custo de query aceitável: `@@index([userId, createdAt])` + janela de 30d
      + cache de 7d no perfil; `getBand` = 1 findUnique por tick na maioria
      das vezes, recálculo (findMany + upsert) só ~1x/semana por usuário
- [x] `prisma db push` da Fase 3 aplicado em produção (2026-09-02, com OK do
      usuário) — `UserNotificationProfile` + índice `UserActivity(userId,createdAt)`
      + FK; `migrate diff` pós-push = vazio
- [x] Revisado — seguir pra Fase 4

---

## Fase 4 — Pool de variantes de texto

### Task 9: `NotificationRuleVariant` + `Notification.variantId` + seed
**Descrição:** Tabela de variantes por regra e coluna de rastreio no item do
sino. Cada regra do catálogo ganha sua 1ª variante semeada do texto atual.

**Critérios de aceite:**
- [x] Model `NotificationRuleVariant` (`id`, `ruleKey` + relação FK cascade,
      `title String?`, `body String?`, `url String?`, `enabled @default(true)`,
      `order @default(0)`, timestamps, `@@index([ruleKey])`).
      `body` ficou `String?` (espelha `NotificationRule.body` nullable) — o
      piso de "1 variante ativa" é da API/UI, não do schema
- [x] `Notification.variantId String?` (aditivo, nullable)
- [x] `NotificationVariantsService.seedMissing()` cria 1 variante por regra
      sem nenhuma, a partir de `title`/`body`/`url`; idempotente (checa `count`)
- [x] Chamado no `onModuleInit` do scheduler DEPOIS do reconcile do catálogo

**Verificação:**
- [x] `npx jest notification-variants` (8) + `notifications.scheduler` (seed) passam
- [x] `npm run build` no backend — suíte completa: 764 testes

**Dependências:** Checkpoint C
**Arquivos:** `oratio-api/prisma/schema.prisma`,
`.../notification-variants.service.ts` (novo), `.../notifications.scheduler.ts`
(chamada do seed), `.../notifications.module.ts`, specs
**Escopo:** M
**Commit:** `oratio-api` branch `feat/notif-variantes`

---

### Task 10: Scheduler escolhe a variante menos usada recentemente
**Descrição:** No `deliver()`, escolher entre as variantes `enabled` da regra a
que aquele usuário recebeu há mais tempo (ou nunca), a partir do histórico de
`Notification` (que o tick já carrega). Gravar `variantId` no item criado.

**Critérios de aceite:**
- [x] `pickVariant()` (no `NotificationVariantsService`): nunca-usada tem
      prioridade (empate → menor `order`); todas usadas → a mais antiga;
      pula `enabled:false`; 1 variante ⇒ devolve ela (idêntico a hoje)
- [x] `deliver()` monta o `recentVariantIds` da regra a partir do `hist`
      (agora com `variantId` no select) e usa `variant.title/body/url ??`
      o da regra; interpolação de `{count}`/`{label}` intacta
- [x] `variantId` gravado na `Notification` via `NotificationsSendService`
      (`DeliverInput.variantId`)
- [x] Serviço de variantes fora do ar ⇒ `catch` ⇒ texto da regra

**Verificação:**
- [x] `npx jest notification-variants` (rotação A→B→A, pula desativada) +
      `notifications.scheduler` (deliver usa variante, grava variantId,
      fallback) passam
- [x] `npm run build` no backend — suíte completa: 767 testes

**Dependências:** Task 9
**Arquivos:** `.../notification-variants.service.ts` (`pickVariant`),
`.../notifications.scheduler.ts` (`deliver`/histórico),
`.../notifications-send.service.ts` (`variantId`), specs
**Escopo:** S
**Commit:** `oratio-api` branch `feat/notif-variantes`

---

### Task 11: UI — editor de variantes por regra
**Descrição:** No card de regra, trocar os campos únicos de título/corpo por uma
lista de variantes (adicionar, editar, remover, ativar/desativar). Impede
desativar/remover a última ativa.

**Critérios de aceite:**
- [x] Componente `RuleVariants` no card de regra: lista as variantes (título
      + corpo editáveis, toggle ativar, remover, "Adicionar variante"); os
      campos únicos de título/corpo da regra saíram do card
- [x] Piso de 1 variante ativa: backend recusa desativar/remover a última
      ativa (400); a UI reflete o erro e reverte o toggle otimista
- [x] Endpoints: `GET/POST /oratio/admin/notifications/rules/:key/variants`,
      `PATCH/DELETE .../variants/:id` (todos sob `AdminGuard`)
- [x] `saveRule` agora só manda os parâmetros da regra (enabled/url/hour/
      band/thresholdDays) — título/corpo vivem nas variantes

**Verificação:**
- [x] `npx vitest run AdminNotifications` (21, +5) + `npx jest notification`
      (172, endpoints + guards)
- [x] `npm run build` nos dois repos
- [ ] Manual: adicionar 2ª variante, ver alternar no disparo — pós `db push`

**Dependências:** Task 10
**Arquivos:** `oratio/src/components/AdminNotifications/*`,
`oratio/src/services/adminNotificationsService.ts`,
`oratio-api/.../admin-notifications.controller.ts`, `.../notification-variants.service.ts`,
`.../dto/variant.dto.ts`, specs/tests
**Escopo:** M
**Commits:** `oratio-api@2619b05` (back) + `oratio` branch `feat/notif-variantes` (front)

---

## Checkpoint D — Fase 4
- [x] Variantes editáveis ponta a ponta; rotação LRU por usuário no `deliver`
- [x] Piso de 1 variante ativa garantido na API (400) e refletido na UI
- [x] 1 variante só / serviço fora do ar ⇒ texto da regra, idêntico a antes
- [x] `prisma db push` da Fase 4 aplicado em produção (2026-09-02, com OK do
      usuário) — `Notification.variantId` + tabela `NotificationRuleVariant`
      + índice + FK; `migrate diff` pós-push = vazio. Seed de 1 variante/regra
      roda no próximo boot do backend.
- [x] Revisado — seguir pra Fase 5 (última: variáveis de contexto)

---

## Fase 5 — Variáveis de contexto

### Task 12: Resolver de contexto na interpolação
**Descrição:** Um resolver que preenche `{nome}` (primeiro nome do usuário) e,
reusando os serviços de liturgia/santo já existentes, `{santo}` e
`{tempoLiturgico}`. Disponível pra qualquer variante.

**Critérios de aceite:**
- [x] `NotificationContextService.resolve()` preenche `{nome}` (1º nome do
      usuário) e `{santo}`/`{tempoLiturgico}` (do `data.liturgia` do
      `LiturgicalCalendarService`, cache 24h + circuit breaker)
- [x] `deliver()` detecta as vars de contexto no título+corpo (`varsIn`),
      resolve só as necessárias e interpola em ambos; `{count}`/`{label}`
      da condição continuam funcionando (mergeadas por cima)
- [x] Sem valor ⇒ fallback neutro (`você` / `o santo de hoje` /
      `este tempo litúrgico`); serviço fora do ar / user sem nome ⇒ nunca
      lança, cai no fallback
- [x] Sem rede nova no caminho crítico: nome = query barata, liturgia = cache
      de 24h que o Vox já usa (2ª instância do serviço, cache próprio)

**Verificação:**
- [x] `npx jest notification-context` (7) + `notifications.scheduler` (interpola
      {nome} em título e corpo) passam
- [x] `npm run build` no backend — suíte completa: 782 testes
- [ ] Manual: criar variante com `{nome}` e ver renderizar — pós próximo boot

**Dependências:** Checkpoint D
**Arquivos:** `.../notification-context.service.ts` (novo),
`.../notifications.scheduler.ts` (`deliver`/`interpolate`),
`.../notifications.module.ts`, spec
**Escopo:** S
**Commit:** `oratio-api` branch `feat/notif-contexto`

---

## Checkpoint E — Revisão final ✅
- [x] Todos os critérios de aceite batidos; 782 testes back + 735 front, os 2 buildam
- [x] `oratio-api/docs/ARCHITECTURE.md` §7 (bullet de notifications) atualizado
- [x] `oratio/docs/ARCHITECTURE.md` §6 (AdminNotifications) atualizado
- [x] Memória `notifications-overhaul` atualizada (plano enxuto concluído)
- [x] `prisma db push` + `generate` em produção — feito nas Fases 1/2, 3 e 4
      (com OK do usuário a cada diff); Fase 5 não muda schema
- [x] `PUBLIC_API_URL`: era pendência da Etapa 0 CANCELADA, não deste plano —
      nada a fazer aqui

### Resumo do que este plano entregou (em produção, na `develop`)
- **Funil configurável no painel** sem deploy (`NotificationSettings`)
- **Gap de descanso religado** — era código morto; causa direta da queixa
  "mesmas notificações a cada 1–2 dias"
- **Limiar + faixa de horário por regra** editáveis no dado
- **Faixa de horário por usuário** — classificada pela atividade, cruzada com
  a faixa da regra
- **Pool de variantes de texto por regra** — rodízio LRU por usuário; editor
  no painel com piso de 1 variante ativa
- **Variáveis de contexto** `{nome}`/`{santo}`/`{tempoLiturgico}`

### Fora de escopo (não feito, de propósito)
Analytics/coorte, A/B, holdout, send-time por ML, compositor de campanhas
recorrentes, segmentação, `NotificationEvent` funil-evento-a-evento,
`EngagementTier` — tudo do roadmap grande CANCELADO.
