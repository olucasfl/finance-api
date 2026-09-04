# Plano de Implementação — Bíblia de Estudo (Backend / oratio-api)

> **✅ CONCLUÍDO — entregue e em produção.** As Fases B1–B3 estão na `main`, fechadas por
> `ee3b132 release: API da Bíblia de Estudo — bible-marks, bible-collections` e
> `f4edc1b chore(biblia): fecha o plano`. Evoluções posteriores: `?book&chapter&verse` no
> `GET /collections` (`a4fba27`) e a cor do grifo (`5e24b77`).
>
> **Como este checklist foi fechado (2026-09-04).** Os checkboxes ficaram congelados em **0/55**
> desde `95c0f00` (a consolidação da documentação em `docs/`), enquanto os dois módulos foram
> escritos, testados e publicados — o arquivo dizia que nada tinha sido feito.
> Foram fechados retroativamente conferindo **cada critério de aceite contra o código e os
> testes**: os models `BibleMark`/`BibleCollection`/`BibleCollectionItem` no `schema.prisma` com
> os `@@unique`, `@@index` e `onDelete: Cascade` exigidos; as 2 rotas de `bible-marks` e as 7 de
> `bible-collections`, todas sob `@UseGuards(JwtAuthGuard)`; os 4 DTOs; o `ensureOwned()` que
> transforma acesso alheio em `NotFoundException`; e `npx jest bible` → **4 suítes, 39 testes,
> todos verdes**. O §7 e o §4 do `ARCHITECTURE.md` descrevem os dois módulos (B3.1), e o
> contrato bate com `oratio/src/services/bibleMarksService.ts` e `bibleCollectionsService.ts`
> (B3.2).
> Os itens de **verificação manual** (sequência de `curl`, `prisma db push`) **não foram
> re-executados**: a evidência para eles é a feature estar em produção.

> Parte **backend** da feature "Bíblia de Estudo". O plano do frontend está em
> `oratio/docs/tasks/biblia-plan.md`. Leia os dois juntos.

## Visão geral

Adicionar persistência por usuário para a experiência de estudo da Bíblia no Oratio:
**grifos** (marca-texto de versículo inteiro), **favoritos** (1 toque), **anotações**
(um texto por versículo) e **coleções** (pastas nomeadas onde a pessoa junta versículos
para estudar). Tudo sincronizado na conta (sobrevive a logout e troca de aparelho),
seguindo o mesmo padrão do `ReadingProgressModule` — módulo novo, isolado, sem tocar
em nada que já existe.

O **painel de leitura** (tamanho de fonte, espaçamento, fonte serifada/sem serifa,
tema sépia/escuro) é 100% frontend/localStorage — **não** entra aqui.

## Decisões de arquitetura

1. **Uma tabela `BibleMark` com flags**, não três tabelas separadas. Uma linha por
   `(userId, book, chapter, verse)` que a pessoa tocou, com `highlighted: Boolean`,
   `favorite: Boolean` e `note: String?`. Toggle é `upsert`; quando os três zeram
   (sem grifo, sem favorito, sem nota) a linha é **deletada** para não acumular lixo.
   Isso também deixa o carregamento de um capítulo em **uma** query.
2. **O cliente manda o snapshot do texto** (`text`) e o rótulo (`reference`, ex.
   `"João 3,16"`) em toda escrita. O backend **nunca** precisa do JSON da Bíblia
   (~5 MB, hoje só no bundle do frontend). A tela "Minha Bíblia" renderiza a lista
   sem baixar a Bíblia inteira. Texto bíblico é estático — não há risco de o
   snapshot "envelhecer".
3. **Identidade do versículo = `book` (string) + `chapter` (int) + `verse` (int)**.
   `book` é o nome em português vindo do JSON estático (`"Gênesis"`, `"João"`) — o
   mesmo que o frontend já usa nas URLs (`/oratio/biblia/:book/:chapter`). Sem tabela
   de livros, sem IDs canônicos: overkill para dado estático.
4. **Grifo é de versículo inteiro, com escolha de cor** (`amber`/`green`/`blue`/
   `pink`/`purple`). Coluna `highlightColor` no `BibleMark`, forçada a `null` quando
   `highlighted` é false. É só a cor — **sem** legenda/significado/renomear/filtrar
   (essa parte segue fora de escopo).
5. **Sem endpoint de busca.** "Minha Bíblia" filtra no cliente sobre a lista de marks
   do próprio usuário — volume é pequeno (dezenas/centenas de itens por pessoa).
6. **Ownership com `NotFoundException`** para coleção/item inexistente ou de outro
   dono (mesmo padrão do `VoxAiController.deleteConversation` — não vaza se o id
   existe). Nunca `throw new Error` cru (vira 500 e polui o ring buffer do admin).
7. **`America/Sao_Paulo`** não se aplica aqui — não há lógica de virada de dia,
   streak ou horário nesta feature.

## Modelo de dados (`prisma/schema.prisma`)

```prisma
// Estudo da Bíblia — uma linha por versículo que o usuário marcou de alguma
// forma. `highlighted`/`favorite`/`note` são independentes; quando os três
// ficam vazios a linha é apagada (o service faz isso), então a existência da
// linha nunca é fonte de verdade sozinha. `text`/`reference` são snapshots
// mandados pelo cliente — o backend não tem o texto bíblico.
model BibleMark {
  id          String   @id @default(uuid())
  userId      String
  book        String
  chapter     Int
  verse       Int
  reference   String   // rótulo pronto: "João 3,16"
  text        String   // snapshot do versículo
  highlighted Boolean  @default(false)
  favorite    Boolean  @default(false)
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, book, chapter, verse])
  @@index([userId])
}

// Pasta nomeada onde a pessoa junta versículos para estudar.
model BibleCollection {
  id        String                @id @default(uuid())
  userId    String
  name      String
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt
  user      User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     BibleCollectionItem[]

  @@index([userId])
}

model BibleCollectionItem {
  id           String          @id @default(uuid())
  collectionId String
  book         String
  chapter      Int
  verse        Int
  reference    String
  text         String
  note         String?         // nota específica desta coleção (opcional)
  createdAt    DateTime        @default(now())
  collection   BibleCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@unique([collectionId, book, chapter, verse])
  @@index([collectionId])
}
```

Adicionar as relações inversas em `User`:
`bibleMarks BibleMark[]` e `bibleCollections BibleCollection[]`.

Aplicar: `npx prisma db push && npx prisma generate` (sem migrations neste repo — ver
`docs/ARCHITECTURE.md` §2). Só criação de tabela nova — additivo, sem risco destrutivo.

## Superfície de API

Prefixo `oratio/bible`. Todas as rotas com `@UseGuards(JwtAuthGuard)`.

| Método | Rota | Corpo / Query | Retorno |
|---|---|---|---|
| `GET` | `/oratio/bible/marks` | `?book=&chapter=` (opcional) | Sem query: todos os marks do usuário. Com query: só do capítulo. |
| `PUT` | `/oratio/bible/marks` | `{ book, chapter, verse, reference, text, highlighted?, favorite?, note? }` | O mark após upsert, ou `{ deleted: true }` se zerou. |
| `GET` | `/oratio/bible/collections` | — | Coleções do usuário + contagem de itens. |
| `POST` | `/oratio/bible/collections` | `{ name }` | Coleção criada. |
| `PATCH` | `/oratio/bible/collections/:id` | `{ name }` | Coleção atualizada. |
| `DELETE` | `/oratio/bible/collections/:id` | — | `{ deleted: true }`. |
| `GET` | `/oratio/bible/collections/:id` | — | Coleção + `items[]`. |
| `POST` | `/oratio/bible/collections/:id/items` | `{ book, chapter, verse, reference, text, note? }` | Item criado (upsert por `@@unique`). |
| `DELETE` | `/oratio/bible/collections/:id/items/:itemId` | — | `{ deleted: true }`. |

**Regra do `PUT /marks`:** upsert por `userId_book_chapter_verse`. Campos ausentes no
corpo **não** são alterados (merge com a linha atual). Depois do merge, se
`highlighted === false && favorite === false && (!note || note.trim() === '')`,
deleta a linha e retorna `{ deleted: true }`.

## Lista de tarefas

### Fase B1 — Grifos, favoritos e anotações
- [x] **B1.1** `BibleMark` no schema + relação em `User` + `db push`/`generate`
- [x] **B1.2** `bible-marks` module: service + controller + DTOs + registro no `app.module.ts`
- [x] **B1.3** Testes de `bible-marks` (service + controller, Prisma mockado)

### Checkpoint B1
- [x] `npm run build` limpo
- [x] `npm test -- bible-marks` verde
- [x] `curl` manual com JWT real: grifar → favoritar → anotar → limpar tudo (linha some)

### Fase B2 — Coleções
- [x] **B2.1** `BibleCollection` + `BibleCollectionItem` no schema + relação em `User` + `db push`/`generate`
- [x] **B2.2** `bible-collections` module: service + controller + DTOs + registro no `app.module.ts`
- [x] **B2.3** Testes de `bible-collections` (inclui ownership: 404 para coleção de outro usuário)

### Checkpoint B2
- [x] `npm run build` limpo, `npm run lint` limpo
- [x] `npm test` inteiro verde, cobertura dos módulos novos ≥ padrão do repo (~90%)
- [x] `curl` manual: criar coleção → adicionar 2 versículos → listar → remover 1 → deletar coleção
- [x] Tentar acessar coleção de outro usuário retorna 404 (não 403, não 500)

### Fase B3 — Fechamento
- [x] **B3.1** Atualizar `docs/ARCHITECTURE.md` §4 (modelo de domínio) e §7 (módulos)
- [x] **B3.2** Revisão: rotas batem com `oratio/src/services/bibleMarksService.ts` e `bibleCollectionsService.ts`

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Sem histórico de migrations (`db push` direto) | Médio | Só tabelas novas, additivo. Nunca alterar/dropar coluna existente nesta feature. |
| `ValidationPipe` com `forbidNonWhitelisted` | Baixo | DTOs declaram **todos** os campos; teste que manda campo extra deve dar 400. |
| `PUT /marks` com merge parcial + delete-quando-vazio | Médio | Lógica idempotente; `@@unique` resolve corrida; teste cada transição de estado. |
| Contrato desalinhado com o frontend | Médio | B3.2 revisa lado a lado; qualquer mudança de rota/DTO vai junto nos dois repos. |
| `note` muito grande | Baixo | `@MaxLength(5000)` no DTO. |

## Perguntas em aberto (respostas assumidas como padrão)

1. **Uma nota por versículo** (editável/apagável) — não múltiplas. *Assumido: sim.*
2. **Tamanho máximo da nota:** 5000 caracteres. *Assumido.*
3. **Nome da coleção:** 1–60 caracteres, sem unicidade forçada (pode ter duas "Fé"). *Assumido.*
4. Sincronizar preferências de leitura (tipografia) no backend um dia? *Assumido: não, fica local.*
