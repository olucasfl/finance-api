# TODO — Perfis de resposta do VoxAI (Backend / oratio-api)

Plano completo: `docs/tasks/vox-profiles-plan.md`. Frontend:
`oratio/docs/tasks/vox-profiles-todo.md`. Ler `docs/ARCHITECTURE.md` §6 antes de codar.

Comandos: `npm run start:dev` · `npm run build` · `npm test -- <pattern>` · `npm run lint`
Prisma: `npx prisma db push && npx prisma generate` (sem migrations — ARCHITECTURE §2;
**confirmar com o humano antes de rodar contra produção**).

Convenção de teste (ARCHITECTURE §10): `PrismaService` mockado como objeto de
`jest.fn()`s; asserção por estado (retorno + args com que o Prisma foi chamado);
nada de rede real (a chamada à OpenAI já é mockada nos specs atuais).

Commits na `develop` (nunca `main`). Rodapé de commit conforme a sessão.

---

## Fase B1 — Padrão destravado + montagem única do prompt

> Entrega isolada e já valiosa: melhora o Vox para **todo mundo** (quem tem
> `voxProfile` null cai em `DEFAULT`). Nenhuma mudança de frontend depende disto.

### B1.1 — `vox.prompt.ts`: `VOX_IDENTITY` + `VOX_PROFILES`

**Descrição:** Quebrar `VOX_SYSTEM_PROMPT` em `VOX_IDENTITY` (invariante) + mapa
`VOX_PROFILES`. Só o perfil `DEFAULT` fica com `systemAppend` de verdade nesta
fase; os outros 5 entram com `systemAppend` = `''` e metadados mínimos (são
preenchidos em B3). Tipos e helper conforme plano §4.1.

**Critérios de aceite:**
- [x] `VOX_IDENTITY` = todo o prompt atual **menos** as seções "Aplicação
      prática", "Arquitetura de uma resposta completa" e "Resumo final"
- [x] Ficam na identidade: "Formatação das respostas", "Regras de formatação de
      citações sagradas", "Tamanho das respostas", "Adaptação inteligente"
      (como princípio geral), todas as regras de doutrina/fontes/liturgia/data
- [x] `export interface VoxProfile` (com `maxTokens: number` e
      `examples: { question; answer }[]`) e `export type VoxProfileKey` conforme plano §4.1
- [x] `VOX_PROFILES.DEFAULT.systemAppend` = rascunho do Apêndice A (revisado com
      o humano nesta fase); `DEFAULT.maxTokens = 1500`
- [x] `VOX_PROFILES` tem as 6 chaves; `DIRECT/STUDY/PASTORAL/CATECHIST/APOLOGETIC`
      com `systemAppend: ''`, `label`/`short` preenchidos, `details: ''`,
      `examples: []`, e o `maxTokens` da tabela do plano §4.2
      (DIRECT 600 · STUDY 2600 · PASTORAL/CATECHIST/APOLOGETIC 1800)
- [x] `export const VOX_PROFILE_KEYS` e `export function resolveVoxProfile(key)`
      com fallback para `DEFAULT`

**Verificação:**
- [x] `npm run build` limpo
- [x] `resolveVoxProfile('STUDY')` → STUDY; `resolveVoxProfile(null)` / `('x')` → DEFAULT

**Dependências:** nenhuma · **Arquivos:** `src/modules/oratio/voxai/prompts/vox.prompt.ts`
**Escopo:** M

---

### B1.2 — `buildSystemPrompt()` unificado em `voxai.service.ts`

**Descrição:** Extrair a montagem do system prompt (hoje duplicada em `chat`
~linha 352 e `chatStream` ~linha 641) para um único método privado. Assinatura e
corpo conforme plano §4.2. `chat`/`chatStream` seguem endpoints separados — só
passam a chamar o helper.

**Critérios de aceite:**
- [x] `private buildSystemPrompt({ profileKey, brazilToday, liturgySection })`
- [x] `chat` e `chatStream` usam o helper; a string literal duplicada some dos dois
- [x] Ordem final: `VOX_IDENTITY` → data → liturgia → `systemAppend` do perfil (por último)
- [x] `max_tokens` do payload da OpenAI (nos dois fluxos) passa a ser
      `resolveVoxProfile(profileKey).maxTokens` no lugar do `2000` fixo;
      `extractDateWithAI` mantém `max_tokens: 20`
- [x] Nesta fase `profileKey` ainda é sempre `null` (perfil por usuário vem em B2) —
      passar `null` explícito, sem ler `user` ainda; com `null` o `max_tokens`
      efetivo vira 1500 (DEFAULT) — aceitável, é o teto certo pro Padrão
- [x] Fora o novo teto, comportamento observável idêntico ao de B1.1 (todos em DEFAULT)

**Verificação:**
- [x] `npm run build` limpo · `npm test -- voxai` verde (ajustar specs que
      comparam a string do prompt)
- [ ] `start:dev` + `curl` no `/chat` e no `/chat/stream`: resposta normal, sem erro

**Dependências:** B1.1 · **Arquivos:** `src/modules/oratio/voxai/voxai.service.ts`,
`src/modules/oratio/voxai/voxai.service.spec.ts`
**Escopo:** M

---

### B1.3 — `profile=` no log de tokens

**Descrição:** Acrescentar `profile=${profile.key}` na linha `[tokens] …` dos dois
fluxos.

**Critérios de aceite:**
- [x] `chat` e `chatStream`: `[tokens] conversation=… profile=DEFAULT prompt=… completion=… total=…`

**Verificação:** [ ] `npm run build` limpo · log confere no `start:dev`
**Dependências:** B1.2 · **Arquivos:** `voxai.service.ts` · **Escopo:** XS

---

### B1.4 — Testes B1

**Critérios de aceite:**
- [x] `resolveVoxProfile`: válido / `null` / `undefined` / string desconhecida
- [x] `buildSystemPrompt`: contém `VOX_IDENTITY`; contém `systemAppend` do perfil
      resolvido; append é o trecho final; `null` → append do `DEFAULT`
- [x] `max_tokens` enviado à OpenAI = `maxTokens` do perfil resolvido (`null` → 1500)
- [x] Specs existentes do `voxai` ajustados e verdes
- [x] Cobertura de `vox.prompt.ts` e do trecho novo do service ≥ ~90% linhas

**Verificação:** [x] `npm test -- voxai` e `npm test -- vox` verdes
**Dependências:** B1.1–B1.3 · **Arquivos:** `voxai.service.spec.ts`,
`prompts/*.spec.ts` (novo se não houver) · **Escopo:** S

---

## ⛳ Checkpoint B1

- [x] `npm run build` limpo · `npm test` inteiro verde (795/795) · `npm run lint`
      está quebrado no repo (glob ignorado pelo ESLint) — não é regressão desta fase
- [ ] Smoke manual (`start:dev` + curl com JWT), 5 perguntas, perfil implícito DEFAULT:
  - [ ] "Quantos são os sacramentos?" → 1–3 frases, **sem** "como viver isso", sem "Em resumo"
  - [ ] "Me explica a Santíssima Trindade." → pode ter estrutura; síntese só se ajudar
  - [ ] "O Advento omite o Aleluia?" → resposta factual direta (mantém a regra de liturgia)
  - [ ] "Como começar a rezar todo dia?" → aí sim passos práticos fazem sentido
  - [ ] "Estou muito ansioso." → acolhe, não despeja doutrina fria
- [x] Nenhuma resposta factual termina em "como usar no dia a dia"
- [ ] **Revisar com o humano antes de seguir**

---

## Fase B2 — Persistência + endpoints do perfil

### B2.1 — `User.voxProfile` + `User.voxOnboardingSeenAt`

**Descrição:** Dois campos em `User` conforme plano §4.3. Aplicar no banco.

**Critérios de aceite:**
- [x] `voxProfile String?` e `voxOnboardingSeenAt DateTime?` (nullable, sem default)
- [x] Comentários: `voxProfile` null = comportamento DEFAULT; onboarding aparece
      só enquanto **os dois** são null

**Verificação:**
- [ ] `npx prisma db push` (banco de rascunho) + `npx prisma generate` sem erro
- [x] `import { User } from '@prisma/client'` com os dois campos compila · `npm run build` limpo
- [ ] **Confirmar com o humano antes do push em produção**

**Dependências:** nenhuma · **Arquivos:** `prisma/schema.prisma` · **Escopo:** XS

---

### B2.2 — `GET /oratio/voxai/profiles`

**Descrição:** Rota que devolve os metadados dos perfis para o frontend montar
cards e o modal de detalhes. **Nunca** expõe `systemAppend`.

**Critérios de aceite:**
- [x] `GET /profiles` → `[{ key, label, short, details, examples }]` na ordem
      `DEFAULT, DIRECT, STUDY, PASTORAL, CATECHIST, APOLOGETIC`
- [x] `systemAppend` e `maxTokens` ausentes do payload (internos)
- [x] Sob `JwtAuthGuard` (herdado do controller)
- [x] Método fino no service (`listProfiles()`), sem tocar no Prisma

**Verificação:** [ ] `curl -H "Authorization: Bearer <jwt>"` retorna os 6;
`grep -E 'systemAppend|maxTokens'` na resposta = vazio
**Dependências:** B1.1 · **Arquivos:** `voxai.controller.ts`, `voxai.service.ts`
**Escopo:** S

---

### B2.3 — `PATCH /oratio/voxai/profile` + `POST /oratio/voxai/profile/intro-seen`

**Descrição:** Gravar o perfil escolhido; dispensar o onboarding sem escolher.

**Critérios de aceite:**
- [x] DTO `SetVoxProfileDto`: `profile: string` com `@IsIn(VOX_PROFILE_KEYS)`
- [x] `PATCH /profile`: chave inválida ou campo extra → 400
- [x] `userId` de `req.user.userId` (nunca do corpo)
- [x] `PATCH`: `user.update({ data: { voxProfile, voxOnboardingSeenAt: new Date() } })`
      — sempre carimba (escolher perfil encerra o onboarding); retorna `{ profile }`
- [x] `POST /profile/intro-seen`: `user.update({ data: { voxOnboardingSeenAt: new Date() } })`,
      não toca em `voxProfile`; idempotente; retorna `{ ok: true }`
- [x] Sem `ActivityService` (decisão de telemetria — plano §7)

**Verificação:**
- [ ] `curl` PATCH `{"profile":"STUDY"}` → `{ profile: "STUDY" }`; `{"profile":"NOPE"}` → 400
- [x] PATCH `{"profile":"DEFAULT"}` grava `'DEFAULT'` (não deixa null) e carimba `voxOnboardingSeenAt`
- [x] `POST /profile/intro-seen` carimba a data; `voxProfile` continua null

**Dependências:** B2.1, B1.1 · **Arquivos:** `voxai.controller.ts`,
`voxai.service.ts`, `dto/set-vox-profile.dto.ts` · **Escopo:** S

---

### B2.4 — `chat`/`chatStream` carregam o perfil + bootstrap com `showVoxIntro`

**Descrição:** Ler `user.voxProfile` e passar a `buildSystemPrompt`. `getBootstrap`
passa a retornar `profile` e `showVoxIntro`.

**Critérios de aceite:**
- [x] Nos dois fluxos: `findUnique({ where:{ id:userId }, select:{ voxProfile:true } })`
      e `buildSystemPrompt({ profileKey: user?.voxProfile ?? null, … })` — isso já
      leva junto o `maxTokens` do perfil (B1.2)
- [x] `getBootstrap` retorna `{ active, conversations, profile: user.voxProfile ?? null,
      showVoxIntro: user.voxProfile == null && user.voxOnboardingSeenAt == null }`
      (seleciona os dois campos do user)
- [x] Log de tokens reflete o perfil real (não mais sempre `DEFAULT`)
- [x] `voxProfile` inválido no banco (defensivo) → `resolveVoxProfile` cai em DEFAULT

**Verificação:**
- [ ] `curl`: PATCH profile=DIRECT → `/chat` "me explica a Trindade" volta curto;
      PATCH profile=STUDY → mesma pergunta volta estruturada com fontes e mais longa
- [ ] `curl /bootstrap` traz `profile` e `showVoxIntro` (true só com os dois campos null)
- [x] `npm test -- voxai` verde

**Dependências:** B2.1, B2.3, B1.2 · **Arquivos:** `voxai.service.ts`,
`voxai.controller.ts` · **Escopo:** M

---

### B2.5 — Testes B2

**Critérios de aceite:**
- [x] Controller: `PATCH /profile` inválido → 400; válido → service chamado com `userId` + chave
- [x] Controller: `GET /profiles` não vaza `systemAppend` nem `maxTokens`
- [x] Service: `POST intro-seen` carimba `voxOnboardingSeenAt` sem mexer em `voxProfile`
- [x] Service: `getBootstrap` inclui `profile` e `showVoxIntro` (true só com os
      dois campos null; false se qualquer um preenchido)
- [x] Service: `chat`/`chatStream` montam o prompt e o `max_tokens` a partir do
      perfil retornado pelo mock do `user.findUnique`
- [x] Specs existentes ajustados (mock de `getBootstrap`, mock de `user.findUnique`)
- [x] Cobertura dos arquivos tocados ≥ ~90% linhas

**Verificação:** [x] `npm test` verde (809/809) · cobertura global sem regressão
**Dependências:** B2.2–B2.4 · **Arquivos:** `voxai.*.spec.ts` · **Escopo:** S

---

## ⛳ Checkpoint B2

- [x] `npm run build` limpo · `npm test` inteiro verde (809/809) · `npm run lint`
      quebrado no repo (não é regressão desta fase)
- [ ] `db push` em produção **autorizado pelo humano** e aplicado
      (`npx prisma db push && npx prisma generate` no deploy — schema já commitado)
- [ ] curl: as 6 chaves gravam; inválida → 400; `intro-seen` carimba;
      bootstrap traz `profile` + `showVoxIntro`; `/chat` muda de estilo e de
      `max_tokens` por perfil
- [ ] **Revisar com o humano antes de seguir**

---

## Fase B3 — Conteúdo dos 5 perfis dinâmicos

> Uma tarefa por perfil. Cada uma: escrever `systemAppend` + `details` +
> **1 `example`** à mão, testar via curl, **o usuário aceita**. Ordem sugerida
> pela frequência de uso esperada.

### B3.1 — `DIRECT` · B3.2 — `STUDY` · B3.3 — `PASTORAL` · B3.4 — `CATECHIST` · B3.5 — `APOLOGETIC`

**Descrição (cada uma):** Preencher `VOX_PROFILES.<CHAVE>` em `vox.prompt.ts`:
`systemAppend` (partir do rascunho do Apêndice A do plano), `details` (markdown
"o que muda neste perfil", 3–6 bullets, para a visão detalhada), `examples` (**1**
par `{ question, answer }` escrito à mão, com a pergunta que melhor evidencia o
estilo — `answer` em markdown como o Vox responderia; sem inventar citações).
`maxTokens` já veio de B1.1 — conferir que está coerente com o estilo.

**Critérios de aceite (cada uma):**
- [x] `systemAppend` não repete regra que já está em `VOX_IDENTITY` (tom/estrutura só)
- [x] `systemAppend` não afrouxa nada doutrinário; se mencionar fonte, manda usar
      só fonte real
- [x] `details` escrito para o usuário final (não jargão de prompt)
- [x] `example` (1): pergunta plausível do app e a que melhor mostra o estilo;
      resposta coerente com o estilo e com a doutrina; nenhuma citação bíblica/CIC inventada
- [x] `npm run build` limpo

**Verificação (cada uma):**
- [ ] `curl` PATCH para a chave + 5 perguntas da matriz (§9 do plano); comparar
      com o Padrão
- [ ] Conferência doutrinária das respostas de exemplo
- [ ] **Usuário revisa e aceita este perfil** (registrar "aceito" no commit/PR)

**Dependências:** B2 no ar · **Arquivos:** `prompts/vox.prompt.ts`
(+ `prompts/*.spec.ts` se as strings forem asseridas) · **Escopo:** S cada

---

### B3.6 — Teste da matriz completa

> Precisa do modelo real no ar — fica para o humano rodar. Os `systemAppend` e
> os exemplos foram escritos a partir dos rascunhos já aprovados no Apêndice A;
> os exemplos não têm citação bíblica/CIC inventada (só João 20,22-23, Êxodo
> 20 e Êxodo 25,18, checados).

**Critérios de aceite:**
- [ ] Planilha/anotação: 6 perfis × 5 perguntas, resposta colada, veredito por célula
- [ ] Checagens do plano §9 satisfeitas por perfil (exige rodar contra a IA)
- [ ] Zero violação de fidelidade doutrinária em qualquer célula (exige rodar contra a IA)

**Verificação:** [ ] documento anexado ao PR/entregue ao humano
**Dependências:** B3.1–B3.5 · **Escopo:** S

---

## ⛳ Checkpoint B3

- [x] `npm test` verde (810) · build limpo
- [ ] **Usuário revisa/aceita os textos dos 5 perfis novos** (feitos a partir do
      Apêndice A; conteúdo está em `prompts/vox.prompt.ts`)
- [ ] Matriz 6×5 rodada contra a IA e revisada, sem furo doutrinário
- [ ] Smoke em device (com `prisma db push` já aplicado)

---

## Fase B-Fechamento — Docs e contrato

### BF.1 — `docs/ARCHITECTURE.md` §6

**Critérios de aceite:**
- [x] §6 descreve: `VOX_IDENTITY` + `VOX_PROFILES` (o prompt não é mais bloco único),
      `buildSystemPrompt` unificando `chat`/`chatStream`, `max_tokens` por perfil,
      `User.voxProfile` (null = DEFAULT) + `voxOnboardingSeenAt`, rotas
      `GET /profiles` · `PATCH /profile` · `POST /profile/intro-seen`,
      `showVoxIntro` no bootstrap, `profile=` no log
- [x] Nota: conteúdo dos perfis é código; migração para admin é fase futura (plano §8)
- [x] Tabela de `docs/tasks/` no `CLAUDE.md` (raiz) ganha a linha desta feature

**Dependências:** B1–B3 · **Arquivos:** `docs/ARCHITECTURE.md`, `CLAUDE.md`
**Escopo:** XS

---

### BF.2 — Contrato com o frontend

**Critérios de aceite:**
- [x] Rotas/campos conferidos contra `oratio/src/services/voxService.ts`
      (`getVoxProfiles`, `setVoxProfile`, shape de `getBootstrap`)
- [x] `ALLOWED_ORIGINS` já cobre o front (nenhuma origem nova) — confirmado

**Dependências:** frontend F1 existir · **Escopo:** XS

---

## ⛳ Checkpoint final backend

- [x] Build limpo · testes verdes (810) · cobertura global sem regressão
      (`npm run lint` quebrado no repo — não é regressão desta feature)
- [ ] `db push` de produção aplicado e confirmado
- [x] Docs atualizados · contrato alinhado com `voxService.ts`
