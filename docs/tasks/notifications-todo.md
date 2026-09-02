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
- [ ] `thresholdDays Int?` e `band String?` (`"MORNING"|"AFTERNOON"|"EVENING"|"ANY"`)
      no model, aditivos
- [ ] `onModuleInit` preenche os valores nas regras que ainda estão `null`,
      mapeando o `hour` atual → faixa (ex.: 9→MORNING, 17/18→AFTERNOON, 20/21→EVENING)
      e o `minDays` de hoje → `thresholdDays` (BIBLE=3, CATECHISM=4, LAPSE=7…)
- [ ] Não mexe em regra cujo `band`/`thresholdDays` o admin já definiu

**Verificação:**
- [ ] `npx jest notifications.scheduler` (bloco `onModuleInit`) passa
- [ ] `npm run build` no backend
- [ ] Manual: após boot, `GET /rules` mostra `band`/`thresholdDays` preenchidos

**Dependências:** Checkpoint A
**Arquivos:** `oratio-api/prisma/schema.prisma`, `.../notifications.scheduler.ts`
(catálogo + reconcile), specs
**Escopo:** M

---

### Task 5: `evalCondition()` lê `thresholdDays` do registro
**Descrição:** Trocar os `minDays` hardcoded (`readingResume`, `rosaryLapse`,
`comeback`, `rosaryUnfinished` janela) pelo valor do registro da regra, com o
valor de hoje como default quando `thresholdDays` for `null`.

**Critérios de aceite:**
- [ ] `readingResume`, `rosaryLapse`, `comeback` recebem o limiar da regra
- [ ] `null` ⇒ mantém o número de hoje
- [ ] `streakAtRisk()` **não muda** (condição intocada — só herda band/textos)
- [ ] Condição desconhecida continua **não disparando** (sem fallback)

**Verificação:**
- [ ] `npx jest notifications.scheduler` — casos "limiar custom encurta/alonga a
      janela" e "sem limiar = comportamento atual"
- [ ] `npm run build` no backend
- [ ] Manual: baixar `thresholdDays` de BIBLE_RESUME pra 1 e ver disparar antes

**Dependências:** Task 4
**Arquivos:** `.../notifications.scheduler.ts`, specs
**Escopo:** S

---

### Task 6: UI do card de regra — limiar + faixa + on/off
**Descrição:** Estender o card de regra no `AdminNotifications` pra editar
`thresholdDays` (quando a condição usa limiar) e `band`, além do on/off que já
existe. `ruleTrigger()` passa a descrever com base nos valores reais.

**Critérios de aceite:**
- [ ] Select de faixa (Manhã/Tarde/Noite/Qualquer) por regra
- [ ] Campo de "dias" só aparece pras condições que usam limiar
- [ ] `updateRule` manda os campos novos; descrição do gatilho reflete o valor
- [ ] Regras de sistema seguem sem botão de excluir

**Verificação:**
- [ ] `npx vitest run AdminNotifications` passa
- [ ] `npm run build` no front
- [ ] Manual: mudar faixa e limiar, recarregar, valores persistem

**Dependências:** Task 5
**Arquivos:** `oratio/src/components/AdminNotifications/AdminNotifications.tsx`,
`.module.css`, `oratio/src/services/adminNotificationsService.ts`, test;
backend `dto/rule.dto.ts` + `updateRule` aceitando os campos
**Escopo:** M

---

## Checkpoint B — Fase 2
- [ ] Limiares e faixas editáveis pelo painel; defaults reproduzem o de hoje
- [ ] `streakAtRisk` intocada (teste de regressão verde)
- [ ] Revisar com o usuário

---

## Fase 3 — Faixas de horário por usuário

### Task 7: `UserNotificationProfile` + índice + classificador
**Descrição:** Model enxuto de perfil e um serviço que classifica o usuário numa
faixa a partir de `UserActivity` (30 dias, hora local Brasil), cacheando em
`activeBand`/`bandComputedAt` e recalculando quando passa de 7 dias.

**Critérios de aceite:**
- [ ] Model `UserNotificationProfile` (`userId` @unique, `activeBand String
      @default("ANY")`, `bandComputedAt DateTime?`)
- [ ] `@@index([userId, createdAt])` em `UserActivity`
- [ ] `classifyBand(userId)`: agrupa `createdAt` das atividades em 3 baldes
      horários, retorna o dominante; `< N` eventos ⇒ `ANY`
- [ ] `getBand(userId)`: lê o cache, recalcula se stale, faz upsert do perfil

**Verificação:**
- [ ] `npx jest` do serviço novo — "usuário matinal → MORNING", "pouca
      atividade → ANY", "cache fresco não recalcula"
- [ ] `npm run build` no backend
- [ ] Manual: seed de atividades e conferir `activeBand`

**Dependências:** Checkpoint B
**Arquivos:** `oratio-api/prisma/schema.prisma`,
`.../notifications/user-notification-profile.service.ts` (novo),
`.../notifications.module.ts`, spec
**Escopo:** M

---

### Task 8: Scheduler cruza faixa do usuário × faixa da regra
**Descrição:** No `tick()`, a lista de candidatas passa a exigir que a faixa do
usuário case com a `band` da regra (`ANY` de qualquer lado = sempre casa). Sem
perfil ou `band` da regra `null` ⇒ cai no `shouldFireAtHour(hour)` de hoje.

**Critérios de aceite:**
- [ ] `MORNING` só recebe regra `MORNING`/`ANY` durante a manhã dele
- [ ] Fallback pro comportamento por `hour` quando faltam dados
- [ ] Quiet hours continua valendo por cima
- [ ] No máximo 1 disparo por tick, como hoje

**Verificação:**
- [ ] `npx jest notifications.scheduler` — matriz faixa-usuário × faixa-regra
- [ ] `npm run build` no backend
- [ ] Manual: usuário EVENING não recebe regra MORNING às 9h

**Dependências:** Task 7
**Arquivos:** `.../notifications.scheduler.ts`, specs
**Escopo:** M

---

## Checkpoint C — Fase 3
- [ ] Timing por faixa funcionando com fallback seguro
- [ ] Custo de query do classificador aceitável (index + janela + cache)
- [ ] Revisar com o usuário

---

## Fase 4 — Pool de variantes de texto

### Task 9: `NotificationRuleVariant` + `Notification.variantId` + seed
**Descrição:** Tabela de variantes por regra e coluna de rastreio no item do
sino. Cada regra do catálogo ganha sua 1ª variante semeada do texto atual.

**Critérios de aceite:**
- [ ] Model `NotificationRuleVariant` (`id`, `ruleKey`, `title String?`,
      `body String`, `url String?`, `enabled Bool @default(true)`, `order Int`)
- [ ] `Notification.variantId String?` (aditivo, nullable)
- [ ] Boot semeia 1 variante por regra a partir de `title`/`body`/`url` atuais
      se a regra ainda não tem variante

**Verificação:**
- [ ] `npx jest` — seed cria exatamente 1 variante por regra; rodar boot 2×
      não duplica
- [ ] `npm run build` no backend
- [ ] Manual: `GET /rules` + variantes retorna o texto de hoje

**Dependências:** Checkpoint C
**Arquivos:** `oratio-api/prisma/schema.prisma`, `.../notifications.scheduler.ts`
(seed), possível `.../notification-variants.service.ts`, specs
**Escopo:** M

---

### Task 10: Scheduler escolhe a variante menos usada recentemente
**Descrição:** No `deliver()`, escolher entre as variantes `enabled` da regra a
que aquele usuário recebeu há mais tempo (ou nunca), a partir do histórico de
`Notification` (que o tick já carrega). Gravar `variantId` no item criado.

**Critérios de aceite:**
- [ ] Variante nunca recebida tem prioridade; empate → menor `order`
- [ ] Interpolação de `{count}`/`{label}`/`{nome}` continua funcionando
- [ ] `variantId` gravado em toda `Notification` de origem `RULE`
- [ ] 1 variante só ⇒ comportamento idêntico ao de hoje

**Verificação:**
- [ ] `npx jest notifications.scheduler` — "alterna A→B→A", "pula desativada"
- [ ] `npm run build` no backend
- [ ] Manual: forçar 3 disparos e ver os textos alternando

**Dependências:** Task 9
**Arquivos:** `.../notifications.scheduler.ts` (`deliver`/histórico), specs
**Escopo:** S

---

### Task 11: UI — editor de variantes por regra
**Descrição:** No card de regra, trocar os campos únicos de título/corpo por uma
lista de variantes (adicionar, editar, remover, ativar/desativar). Impede
desativar/remover a última ativa.

**Critérios de aceite:**
- [ ] CRUD de variante por regra, com ordem visível
- [ ] Não deixa a regra ficar sem nenhuma variante ativa
- [ ] Endpoints admin correspondentes (`POST/PATCH/DELETE .../rules/:key/variants`)

**Verificação:**
- [ ] `npx vitest run AdminNotifications` + `npx jest` dos endpoints
- [ ] `npm run build` nos dois repos
- [ ] Manual: adicionar 2ª variante, ver alternar no disparo de teste

**Dependências:** Task 10
**Arquivos:** `oratio/src/components/AdminNotifications/*`,
`oratio/src/services/adminNotificationsService.ts`,
`oratio-api/.../admin-notifications.controller.ts`, `dto/`, specs/tests
**Escopo:** M

---

## Checkpoint D — Fase 4
- [ ] Variantes editáveis; rotação LRU por usuário funcionando
- [ ] Piso de 1 variante ativa garantido na API e na UI
- [ ] Revisar com o usuário

---

## Fase 5 — Variáveis de contexto

### Task 12: Resolver de contexto na interpolação
**Descrição:** Um resolver que preenche `{nome}` (primeiro nome do usuário) e,
reusando os serviços de liturgia/santo já existentes, `{santo}` e
`{tempoLiturgico}`. Disponível pra qualquer variante.

**Critérios de aceite:**
- [ ] `{nome}`, `{santo}`, `{tempoLiturgico}` resolvidos no `deliver()`
- [ ] Variável sem valor ⇒ cai pra um texto neutro (nunca deixa `{x}` cru)
- [ ] Sem chamada de rede nova no caminho crítico (usa cache/serviço interno)

**Verificação:**
- [ ] `npx jest` — cada variável resolve; ausência não quebra o texto
- [ ] `npm run build` no backend
- [ ] Manual: variante com `{nome}, o santo de hoje é {santo}` renderiza certo

**Dependências:** Checkpoint D
**Arquivos:** `.../notifications/notification-context.service.ts` (novo),
`.../notifications.scheduler.ts`, spec
**Escopo:** S

---

## Checkpoint E — Revisão final
- [ ] Todos os critérios de aceite batidos
- [ ] `docs/ARCHITECTURE.md` (backend §5 e §7; front §3/§5/§9) atualizado
- [ ] Memória `notification-overhaul-roadmap` atualizada (o que virou este plano,
      o que ficou de fora)
- [ ] `npx prisma db push` + `npx prisma generate` em produção **após OK do usuário**
- [ ] Pendência manual: conferir `PUBLIC_API_URL` (herança da Etapa 0, se aplicável)
