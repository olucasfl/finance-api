# Plano: perfis de resposta do VoxAI

> **Plano-mestre desta feature.** É cross-repo: o núcleo é backend
> (`oratio-api/` — prompt, endpoint, schema), e a UI é frontend (`oratio/` —
> engrenagem de configurações, painel de perfis, onboarding). Checklists
> executáveis: `oratio-api/docs/tasks/vox-profiles-todo.md` (backend) e
> `oratio/docs/tasks/vox-profiles-todo.md` (frontend). O frontend tem também um
> ponteiro em `oratio/docs/tasks/vox-profiles.md`.
>
> Sessão de decisão com o usuário em 2026-09-02. Commits na `develop` dos dois
> repos (nunca `main`). Sem feature flag: entrega em fases, cada fase mergeada e
> testada, produção no ritmo normal.

---

## 1. Problema

O `VOX_SYSTEM_PROMPT` (`src/modules/oratio/voxai/prompts/vox.prompt.ts`) é **um
bloco único fixo**. Ele obriga o Vox a responder quase tudo no mesmo molde:

- **"Aplicação prática"** — *"Sempre que possível: mostre como viver aquilo no
  dia a dia"*.
- **"Arquitetura de uma resposta completa"** — prescreve 5 partes fixas,
  incluindo *"Como viver isso na prática"* e *"Em resumo"*.
- **"Resumo final"** — *"Quando aplicável, finalize com ## Em resumo"*.

Resultado: pergunta simples e pergunta complexa recebem o mesmo formato inchado,
sempre com "como usar no dia a dia" no fim, mesmo quando não faz sentido com a
pergunta. Essas três seções brigam com a própria regra do prompt que manda
*"comece direto com 1 ou 2 frases"*.

Não existe nada por usuário: `User` não tem preferência de Vox; `Conversation` é
uma thread simples.

## 2. O que este plano entrega

1. **Perfil Padrão destravado** — reescrever o prompt para que o formato
   acompanhe a pergunta. Entra para **todos** no deploy, tenha a pessoa
   escolhido perfil ou não.
2. **6 perfis de resposta** (Padrão + 5 dinâmicos), escolhidos **por usuário**,
   trocáveis a qualquer momento.
3. **Onboarding** na primeira abertura do Vox depois da atualização: card
   "os perfis chegaram" listando os 6 com um mini-texto e um "ver em detalhes"
   por perfil (abre a explicação completa daquele perfil). Aparece **uma única
   vez** — quem não escolher nada segue no Padrão e **não é mais incomodado**;
   troca depois pela engrenagem.
4. **Engrenagem "Configurações do Vox"** no header do Vox → painel com os perfis
   para trocar quando quiser.

### Fora de escopo (agora)

- Perfil por conversa (fica `por usuário`; porta aberta no schema/serviço).
- Perfis editáveis pelo admin sem deploy (conteúdo é **fixo no código**; migração
  para banco+admin é uma fase futura documentada, não agendada — ver §8).
- Feature flag / rollout percentual (não existe mecanismo hoje).
- Exemplos gerados pela IA ao vivo (são **fixos, escritos à mão**).
- Telemetria além de uma linha de log (ver §7).
- Mexer em `contentFilter`, rate limiter, liturgia, streaming SSE — intocados.

## 3. Os 6 perfis

Identidade **invariante** em todos (nunca muda): católico fiel à doutrina da
Igreja; cita Escritura / Catecismo / Magistério **sem inventar** citação;
humilde; pastoral; nunca condena a pessoa; distingue atual × antigo, doutrina ×
disciplina; sem ocultismo/esoterismo; formatação de textos sagrados em
blockquote com referência em negrito; regras de liturgia e data como hoje.

O que **varia** por perfil: tom, estrutura, tamanho, profundidade, uso de
exemplos, e **se fecha ou não com "como aplicar no dia a dia" / "em resumo"**.

| Chave | Rótulo (usuário) | Como responde | Para quem |
|---|---|---|---|
| `DEFAULT` | **Padrão** | Responde direto primeiro; **adapta** formato ao tipo de pergunta; só usa título/seções/"como viver na prática"/"em resumo" **quando faz sentido**. Nunca força o molde completo. | Todos (base, aplicado a quem não escolheu) |
| `DIRECT` | **Direto ao ponto** | Até ~5 frases, sem títulos, sem seção de aplicação, sem resumo. Aprofunda só se pedirem. | Dúvida rápida |
| `STUDY` | **Profundo** | Mais extenso, fundamento bíblico + Magistério, distinções (doutrina × disciplina, atual × antigo), desenvolvimento histórico. Registro teológico, ainda pastoral. | Estudo a fundo |
| `PASTORAL` | **Pastoral** | Tom de conversa, caloroso; acolhe primeiro (dor, medo, culpa), depois ensina; menos estrutura; sugere oração. Doutrina firme, muda o calor. | Momento pessoal / sofrimento |
| `CATECHIST` | **Catequista** | Passo a passo, assume pouco conhecimento, analogia do cotidiano, e aí sim fecha com "como viver isso" + frase-resumo. | Iniciante / catecúmeno |
| `APOLOGETIC` | **Apologético** | Trata a pergunta como objeção sincera: o que a Igreja de fato ensina (desfaz a caricatura) → fundamento → resposta às objeções comuns e aos textos usados contra. Clareza e caridade, nunca na defensiva. | Responder objeções / mal-entendidos |

Rótulos **descritivos** (não "Vox Sereno" etc.). `DEFAULT` também aparece como
card selecionável, para quem quiser voltar.

Rascunhos completos de `systemAppend` e exemplos: **Apêndice A**. São o material
que o usuário revisa e vai aceitando na Fase B3.

### Decisões da sessão (rodadas 4–5, 2026-09-02)

| Item | Decisão |
|---|---|
| "Ver em detalhes" | Lista os 6 perfis com mini-texto; "ver em detalhes" abre a **explicação completa por perfil** (não é tela de comparação). |
| `max_tokens` | **Varia por perfil**: `DIRECT` 600 · `DEFAULT` 1500 · `STUDY` 2600 · `PASTORAL`/`CATECHIST`/`APOLOGETIC` 1800. Substitui o `2000` fixo. |
| Onboarding | Modal **uma vez**. Não escolher = fica no Padrão, nunca mais aparece (precisa de `voxOnboardingSeenAt`). Trocar depois só pela engrenagem. |
| Padrão × "dia a dia" | Só inclui aplicação prática quando a pergunta é **claramente prática** ("como faço", hábito, moral vivida, devoção). Factual/histórica/"o que é X"/doutrina abstrata → nunca. |
| Exemplos | **1 por perfil**, cada um com uma pergunta diferente (a que melhor evidencia o estilo). |
| Troca de perfil no meio da conversa | Marca uma **linha discreta no chat** ("Perfil alterado para X") no ponto da troca. |
| Nome da seção da engrenagem | **"Configurações do Vox"**. |

## 4. Arquitetura

### 4.1 `vox.prompt.ts` — de bloco único para identidade + mapa de perfis

```ts
// Tudo o que é invariante (doutrina, fontes, citações, liturgia, formatação,
// "adaptação inteligente" como princípio geral) — MENOS as 3 seções que
// forçam molde ("Aplicação prática", "Arquitetura de uma resposta completa",
// "Resumo final").
export const VOX_IDENTITY = `# Identidade\nVocê é VOX ...`

export type VoxProfileKey =
  | 'DEFAULT' | 'DIRECT' | 'STUDY' | 'PASTORAL' | 'CATECHIST' | 'APOLOGETIC'

export interface VoxProfile {
  key: VoxProfileKey
  label: string        // "Padrão", "Direto ao ponto", ...
  short: string        // 1 linha para o card
  details: string      // markdown "o que muda neste perfil" (visão detalhada)
  systemAppend: string // bloco "# Estilo de resposta ativo: ..." colado no fim do system prompt
  maxTokens: number    // teto de resposta desse perfil (ver tabela em §4.2)
  examples: { question: string; answer: string }[] // 1 por perfil, escrito à mão
}

export const VOX_PROFILES: Record<VoxProfileKey, VoxProfile> = { ... }
export const VOX_PROFILE_KEYS = Object.keys(VOX_PROFILES) as VoxProfileKey[]

export function resolveVoxProfile(key: string | null | undefined): VoxProfile {
  return VOX_PROFILES[(key as VoxProfileKey)] ?? VOX_PROFILES.DEFAULT
}
```

- As 3 seções "forçadoras" **saem da identidade**. Onde cada ideia reaparece:
  - "como viver no dia a dia" → **condicional** no `DEFAULT`; **obrigatória** em
    `CATECHIST`; presente em `PASTORAL` como sugestão de oração; **ausente** em
    `DIRECT`, `STUDY` (opcional), `APOLOGETIC`.
  - estrutura de 5 partes → versão suave em `STUDY` e `CATECHIST`.
  - "Em resumo" → só respostas longas (`DEFAULT`), bem-vindo em `STUDY`, **nunca**
    em `DIRECT`.
- "Formatação de citações sagradas", "Tamanho das respostas", "Adaptação
  inteligente" (como princípio), regras de liturgia/data → **ficam na
  identidade**.

### 4.2 `voxai.service.ts` — montagem única do prompt

Hoje o system prompt é montado **duas vezes** (dentro de `chat` ~linha 352 e de
`chatStream` ~linha 641), idênticas. Extrair:

```ts
private buildSystemPrompt(args: {
  profileKey: string | null
  brazilToday: string
  liturgySection: string
}): string {
  const profile = resolveVoxProfile(args.profileKey)
  return `${VOX_IDENTITY}

Data atual (Brasil): ${args.brazilToday}
${args.liturgySection}

${profile.systemAppend}`
}
```

- O `systemAppend` vai **por último** de propósito: a identidade já está
  estabelecida; o estilo é a instrução mais recente sobre **formato**.
- `chat` e `chatStream` continuam sendo caminhos separados (regra do
  `ARCHITECTURE.md` §6, "não arriscar o que já funciona") — só passam a **chamar
  o mesmo helper** em vez de duplicar a string.
- Cada um carrega o perfil do usuário:
  `const { voxProfile } = await this.prisma.user.findUnique({ where: { id: userId }, select: { voxProfile: true } }) ?? {}`.
  Uma query extra barata; sem join no `conversation`.
- Linha de log de tokens ganha `profile=${profile.key}`:
  `[tokens] conversation=… profile=STUDY prompt=… completion=… total=…`
- **`max_tokens` por perfil.** O `max_tokens: 2000` fixo do payload da OpenAI
  (nos dois fluxos) vira `resolveVoxProfile(profileKey).maxTokens`:

  | Perfil | `maxTokens` |
  |---|---|
  | `DIRECT` | 600 |
  | `DEFAULT` | 1500 |
  | `PASTORAL` / `CATECHIST` / `APOLOGETIC` | 1800 |
  | `STUDY` | 2600 |

  O `extractDateWithAI` mantém seu `max_tokens: 20` (não passa por aqui).

### 4.3 Schema

```prisma
model User {
  // ...
  voxProfile          String?    // chave do perfil de resposta do Vox (ver VOX_PROFILE_KEYS).
                                 // null = nunca escolheu → comportamento = DEFAULT.
  voxOnboardingSeenAt DateTime?  // carimbado quando a pessoa escolhe um perfil OU dispensa
                                 // o card de novidade. Enquanto null (e voxProfile null),
                                 // o onboarding ainda aparece.
}
```

- Aditivos, nullable, sem default → `npx prisma db push` é seguro (sem migrations,
  ver `ARCHITECTURE.md` §2). **Confirmar com o usuário antes de rodar contra
  produção.**
- `voxProfile null` = comportamento `DEFAULT`. **Não é** o sinal do onboarding —
  o sinal é `voxProfile == null && voxOnboardingSeenAt == null`.
- Onboarding aparece **uma vez**: dispensar ("Depois"/fechar) carimba
  `voxOnboardingSeenAt` sem gravar perfil (a pessoa segue no Padrão). Escolher
  qualquer perfil grava `voxProfile` **e** carimba `voxOnboardingSeenAt`.
- Sem enum no Prisma (o schema usa `String` para chaves parametrizáveis —
  `NotificationRule.condition`, `.band`); validação da chave é no DTO.

### 4.4 Endpoints (todos sob `@Controller("oratio/voxai")` + `JwtAuthGuard`)

| Método | Rota | Corpo | Retorno |
|---|---|---|---|
| `GET` | `/profiles` | — | `[{ key, label, short, details, examples }]` — **sem** `systemAppend` nem `maxTokens` (internos). Fonte única para os cards e a visão detalhada do frontend. |
| `PATCH` | `/profile` | `{ profile: VoxProfileKey }` | `{ profile }`. `@IsIn(VOX_PROFILE_KEYS)` → chave inválida = 400. Grava `user.voxProfile` **e** carimba `voxOnboardingSeenAt` (se ainda null). |
| `POST` | `/profile/intro-seen` | — | `{ ok: true }`. Dispensa o onboarding sem escolher perfil: carimba `voxOnboardingSeenAt`. Idempotente. |

- `getBootstrap` passa a retornar, junto de `active` e `conversations`:
  - `profile: user.voxProfile ?? null`
  - `showVoxIntro: user.voxProfile == null && user.voxOnboardingSeenAt == null`
    (booleano já computado no servidor — o frontend não precisa saber a regra).
- `GET /profiles` é chamado **sob demanda** pelo frontend (ao abrir painel ou
  onboarding), não no bootstrap — mantém o load enxuto.

### 4.5 Frontend

- `src/services/voxService.ts`: `getVoxProfiles()`, `setVoxProfile(key)`,
  `dismissVoxIntro()`; tipo do `getBootstrap` ganha `profile: string | null` e
  `showVoxIntro: boolean`.
- `src/pages/Vox/Vox.tsx`:
  - estado `voxProfile: string | null` e `profiles: VoxProfileMeta[]` (carrega
    `profiles` na 1ª abertura de painel/onboarding, cacheia em estado).
  - **engrenagem** no `styles.headerActions` → abre `VoxSettingsPanel`.
  - depois do bootstrap, `showVoxIntro === true` → abre `VoxProfilesIntroModal`.
  - ao trocar de perfil **com mensagens na conversa atual**, insere um marcador
    local `{ role: 'system-note', content: 'Perfil alterado para <label>' }` na
    lista de mensagens (só visual, **não** persiste, não vai pro histórico da IA).
- Componentes novos (CSS Modules, cores de `variables.css`, sem dep nova, sem
  `dangerouslySetInnerHTML`):
  - `VoxProfileList/` — lista dos 6 perfis (radio), selecionado =
    `voxProfile ?? 'DEFAULT'`; cada item com `label` + `short` + "ver em
    detalhes". Compartilhado entre painel e onboarding.
  - `VoxProfileDetailsModal/` — recebe **um** perfil: `label`, `details`
    (markdown) e o exemplo (`question` no visual do balão do usuário; `answer`
    via o `VoxMarkdown` compartilhado). Aberto a partir de um card.
  - `VoxSettingsPanel/` — bottom sheet "Configurações do Vox": `VoxProfileList` +
    troca otimista (aplica na hora, chama `setVoxProfile`, reverte + erro se
    falhar). Seção montada de forma extensível (só perfil hoje).
  - `VoxProfilesIntroModal/` — "Novidade: os perfis do Vox chegaram" + pitch
    curto + `VoxProfileList` embutida + botões **Escolher agora** (grava o card
    marcado) e **Depois** (chama `dismissVoxIntro`). "Ver em detalhes" de um card
    abre o `VoxProfileDetailsModal`. Qualquer um dos dois caminhos fecha o
    onboarding **para sempre** (`showVoxIntro` fica `false` no próximo bootstrap).
  - `VoxMarkdown/` — extraído do bloco `ReactMarkdown` inline do `Vox.tsx` (mesmos
    overrides de parágrafo/lista/blockquote), reusado no chat e nos exemplos.
- localStorage: opcional espelhar o perfil selecionado (paint instantâneo do
  "qual está marcado" antes do bootstrap). Se feito, chave `voxProfile` em
  `KEEP_ON_LOGOUT`. Nice-to-have, não bloqueia.

## 5. Grafo de dependências

```
BACKEND
  B1  vox.prompt.ts → VOX_IDENTITY + VOX_PROFILES (só DEFAULT preenchido)
      + buildSystemPrompt() unificado em chat/chatStream
      + profile= no log de tokens
        │  entrega isolada: melhora o Padrão para TODO MUNDO (voxProfile null → DEFAULT)
        ▼
  B2  User.voxProfile + voxOnboardingSeenAt (schema + db push)
      + GET /profiles  + PATCH /profile  + POST /profile/intro-seen  (+ @IsIn)
      + chat/chatStream carregam user.voxProfile (perfil → systemAppend + maxTokens)
      + getBootstrap retorna profile + showVoxIntro
        │
        ├───────────────► B3  conteúdo dos 5 perfis restantes + exemplos à mão
        │                     (DIRECT, STUDY, PASTORAL, CATECHIST, APOLOGETIC)
        │                     — 1 tarefa por perfil, cada uma revisada e aceita
        │                       pelo usuário; testável via curl assim que B2 sobe
        ▼
FRONTEND  (precisa de B2 no ar na develop)
  F1  voxService: getVoxProfiles / setVoxProfile + tipo do bootstrap
        ▼
  F2  VoxProfileList + VoxProfileDetailsModal (componentes compartilhados)
        ▼
  F3  engrenagem no header + VoxSettingsPanel (trocar de perfil)
        ▼
  F4  VoxProfilesIntroModal (primeira vez, bootstrap.showVoxIntro)
        ▼
  FECHAMENTO  docs (ARCHITECTURE §6 dos dois repos, CLAUDE.md, este plano),
              revisão de contrato, build/lint/testes
```

B3 pode começar em paralelo a F1–F4 (é conteúdo), mas o **sign-off** de cada
perfil precisa de B2 no ar para testar de verdade.

## 6. Fases e checkpoints

| Fase | Repo | Entrega | Checkpoint antes de seguir |
|---|---|---|---|
| **B1** | api | Padrão destravado + montagem única | 5 perguntas-smoke (simples/factual/histórica/prática/emocional): nenhuma pergunta factual termina com "como viver isso"; build + testes verdes; **revisar com o humano** |
| **B2** | api | Persistência + endpoints | `curl` grava cada uma das 6 chaves; chave inválida → 400; `intro-seen` carimba; bootstrap traz `profile` + `showVoxIntro`; `chat` muda de estilo **e** de `max_tokens` por perfil; **revisar com o humano** |
| **B3** | api | Conteúdo dos 5 perfis (1 tarefa/perfil) | Matriz 6 perfis × 5 perguntas comparada; **usuário aceita cada perfil** individualmente |
| **F1–F2** | web | Serviço + componentes compartilhados | `VoxProfileDetailsModal` renderiza descrição + o exemplo; `VoxMarkdown` extraído sem mudança visual no chat; build verde |
| **F3** | web | Engrenagem + painel de troca | No device: trocar perfil → persiste no reload → próxima resposta muda de estilo; marcador "Perfil alterado para X" aparece no chat; **revisar com o humano** |
| **F4** | web | Onboarding primeira vez | Conta nova: modal aparece **1×**; "Depois" → recarregar → **não** reaparece; escolher (incl. Padrão) encerra; **revisar com o humano** |
| **Fechamento** | ambos | Docs + contrato | build/lint/testes verdes nos dois repos; `ARCHITECTURE.md` §6 atualizado; contrato `voxService.ts` ↔ controller conferido |

## 7. Telemetria

Só a linha de log que já existe em `voxai.service.ts`, agora com
`profile=<chave>`. Sem `ActivityService`, sem tabela, sem métrica nova. Dá para
ler adoção e custo por perfil nos logs do Render se precisar.

## 8. Fase futura (documentada, não agendada)

Se aparecer necessidade real de ajustar o texto dos perfis **sem deploy**:
migrar `VOX_PROFILES` para uma tabela `VoxProfile` (espelhando
`NotificationRule` + `NotificationRuleVariant`) + `admin-voxai.controller.ts` +
tela `AdminVoxProfiles` no frontend, semeada a partir do mapa de código atual.
O `resolveVoxProfile()` vira a costura: troca a fonte (mapa → banco com cache
curto) sem mexer em quem chama.

## 9. Testes (contrato + smoke manual)

**Backend** (`PrismaService` mockado, asserção por estado — `ARCHITECTURE.md`
§10):
- `resolveVoxProfile`: chave válida → perfil certo; `null`/`undefined`/lixo → `DEFAULT`.
- `buildSystemPrompt`: contém `VOX_IDENTITY`; contém o `systemAppend` do perfil
  pedido; perfil no fim da string; sem perfil → append do `DEFAULT`.
- `chat` / `chatStream`: leem `user.voxProfile` e passam ao helper (mock do
  `findUnique` do user retornando `voxProfile: 'STUDY'` → prompt tem o append do
  STUDY); `max_tokens` do payload = `maxTokens` do perfil resolvido (STUDY → 2600,
  sem perfil → 1500).
- `PATCH /profile`: chave inválida → 400; válida → grava, carimba
  `voxOnboardingSeenAt`, retorna `{ profile }`.
- `POST /profile/intro-seen`: carimba `voxOnboardingSeenAt`, não mexe em `voxProfile`.
- `getBootstrap`: inclui `profile` e `showVoxIntro` (true só quando os dois
  campos são null).
- Ajustar os specs existentes (`voxai.service.spec.ts`, `voxai.controller.spec.ts`).

**Frontend**:
- `voxService`: `setVoxProfile` faz `PATCH` no path certo; `getVoxProfiles` no
  `GET` certo; `dismissVoxIntro` no `POST` certo.
- `Vox.test.tsx`: bootstrap com `showVoxIntro: true` → intro modal aparece; com
  `false` → não aparece; "Depois" chama `dismissVoxIntro` e fecha; trocar no
  painel chama `setVoxProfile` e atualiza o marcado; trocar com mensagens na
  conversa insere o marcador "Perfil alterado para…".
- Ajustar mocks existentes de `getBootstrap` para os novos campos.

**Manual (checkpoint B3)**: matriz de 5 perguntas fixas
(1 factual curta · 1 "me explica" ampla · 1 histórica/litúrgica · 1 moral/prática
· 1 emocional/pessoal) × 6 perfis. Conferir: Padrão não engessa; Direto ≤ ~5
frases; Estudo traz fundamento duplo; Pastoral acolhe antes de ensinar;
Catequista tem passo a passo + resumo; Apologético desfaz caricatura. **Nenhum
perfil pode quebrar fidelidade doutrinária.**

---

## Apêndice A — rascunhos de `systemAppend` (material de revisão da Fase B3)

> O usuário revisa e vai aceitando/ajustando cada bloco. A identidade
> (`VOX_IDENTITY`) continua valendo por cima de todos.

### `DEFAULT` — Padrão (entra na Fase B1)

```
# Estilo de resposta ativo: Padrão (equilibrado)

Responda no tamanho e no formato que a PERGUNTA pede — não existe molde fixo.

- Pergunta simples, factual ou objetiva (nomes, números, datas, "o que é X",
  "quantos são"): responda em 1–3 frases. Sem título, sem seções, sem lista de
  aplicação prática, sem "Em resumo".
- Pergunta ampla ("me explica", "por que", tema profundo): pode usar seções e
  aprofundar; feche com uma síntese curta só se ela ajudar.
- Só inclua "como viver isso no dia a dia" quando a pergunta for prática, moral
  ou devocional E o passo concreto acrescentar algo real. Nunca cole essa seção
  numa pergunta factual, histórica ou doutrinal abstrata.
- Comece pela resposta e depois explique.
```

### `DIRECT` — Direto ao ponto

```
# Estilo de resposta ativo: Direto ao ponto

- No máximo ~5 frases. Vá direto à resposta.
- Sem títulos (#), sem seções, sem "Em resumo", sem lista de aplicação prática.
- Uma citação no máximo, e só se for essencial.
- Se o tema for grande demais para caber assim, dê a resposta essencial em
  poucas frases e ofereça aprofundar ("posso detalhar se quiser").
- Toda a fidelidade doutrinária e o cuidado com fontes continuam — só o formato
  é enxuto.
```

### `STUDY` — Profundo

```
# Estilo de resposta ativo: Profundo / Estudo

- Trate a pergunta como um pedido de estudo. Use títulos e seções.
- Traga o fundamento bíblico E o do Magistério (Catecismo, documento, concílio)
  quando existirem, com o texto citado em blockquote.
- Explicite as distinções relevantes: doutrina × disciplina, norma atual ×
  forma antiga, regra geral × exceção, desenvolvimento histórico do
  entendimento.
- Pode ser longo, mas legível no celular: seções curtas, nada de parágrafos
  gigantes.
- Fechar com "## Em resumo" é bem-vindo aqui.
- Seção de aplicação prática não é obrigatória; inclua só se o tema pedir.
```

### `PASTORAL` — Pastoral

```
# Estilo de resposta ativo: Pastoral / Acolhedor

- Tom de conversa, caloroso e humano — como um diretor espiritual atencioso,
  não um verbete.
- Comece acolhendo o que a pessoa trouxe (especialmente dor, medo, culpa,
  cansaço) antes de ensinar qualquer coisa.
- Menos estrutura: evite muitos títulos e listas; prefira parágrafos curtos.
- Ofereça esperança cristã concreta e, quando fizer sentido, uma oração curta
  ou uma sugestão simples de oração.
- A doutrina permanece firme e fiel — nunca relativize o pecado, nunca condene
  a pessoa. O que muda é o calor, não o conteúdo.
```

### `CATECHIST` — Catequista

```
# Estilo de resposta ativo: Catequista / Didático

- Assuma pouco conhecimento prévio. Explique os termos que usar.
- Ensine passo a passo, do mais simples ao mais completo.
- Use uma analogia ou imagem do cotidiano para aterrissar a ideia.
- Depois da explicação, inclua uma seção curta "Como viver isso" com 2–4 passos
  concretos e realistas.
- Feche com uma frase-resumo fácil de lembrar.
- Linguagem simples não é linguagem imprecisa — continue fiel e exato.
```

### `APOLOGETIC` — Apologético

```
# Estilo de resposta ativo: Apologético

- Trate a pergunta como uma objeção ou dúvida sincera sobre a fé católica,
  mesmo que venha em tom crítico. Responda com clareza e caridade, nunca na
  defensiva, nunca com ironia.
- Estrutura útil: (1) o que a Igreja de fato ensina, desfazendo a caricatura;
  (2) o fundamento — Escritura, Catecismo, Tradição, razão; (3) resposta às
  objeções mais comuns, incluindo os textos bíblicos usados contra o ponto.
- Reconheça o que há de legítimo na preocupação de quem pergunta.
- Nunca cite Escritura ou documento fora do sentido real; se não souber a
  passagem exata, explique o princípio sem inventar a citação.
```

## Apêndice B — exemplos (ilustrativo; B3 finaliza 1 por perfil, revisado)

**Pergunta factual — "Quantos são os sacramentos?"**
- *Padrão:* "São sete: Batismo, Confirmação (Crisma), Eucaristia, Penitência,
  Unção dos Enfermos, Ordem e Matrimônio." (fim)
- *Direto:* igual ao Padrão, uma frase.
- *Catequista:* a lista + uma frase do que é um sacramento + "Como viver isso:
  qual desses você recebeu? Quando foi sua última confissão?"

**Pergunta emocional — "Sinto que Deus me abandonou."**
- *Pastoral:* "Sinto muito que você esteja carregando isso agora. Esse silêncio
  que dói tem nome na tradição espiritual — muitos santos passaram por ele...
  Que tal hoje uma oração bem simples: só ficar diante Dele, sem precisar sentir
  nada."
- *Estudo:* seção sobre a "noite escura" em São João da Cruz, com referências.
- *Direto:* "Deus não abandona ninguém (Hb 13,5). O silêncio que você sente
  costuma ser prova de fé, não ausência. Vale conversar com um sacerdote."

Restante da matriz: Fase B3.
