# TODO — Bíblia de Estudo (Backend / oratio-api)

Plano completo: `docs/tasks/biblia-plan.md`. Frontend: `oratio/docs/tasks/biblia-todo.md`.

Comandos: `npm run start:dev` · `npm run build` · `npm test -- <pattern>` · `npm run lint`
Prisma: `npx prisma db push && npx prisma generate` (sem migrations — ver ARCHITECTURE §2)

Convenção de teste (ARCHITECTURE §2 / §10): `PrismaService` mockado como objeto de
`jest.fn()`s (só os métodos usados); asserções por estado (retorno + com que args o
Prisma foi chamado); nada de rede real.

---

## Fase B1 — Grifos, favoritos e anotações

### B1.1 — Modelo `BibleMark`

**Descrição:** Adicionar o model `BibleMark` ao `schema.prisma` e a relação inversa
`bibleMarks BibleMark[]` em `User`. Aplicar no banco.

**Critérios de aceite:**
- [ ] Model com `@@unique([userId, book, chapter, verse])` e `@@index([userId])`
- [ ] Comentário no model explicando a regra "linha some quando os 3 zeram" (padrão do schema)
- [ ] `onDelete: Cascade` na relação com `User`

**Verificação:**
- [ ] `npx prisma db push` sem erro
- [ ] `npx prisma generate` e `import { BibleMark } from '@prisma/client'` compila
- [ ] `npm run build` limpo

**Dependências:** Nenhuma
**Arquivos:** `prisma/schema.prisma`
**Escopo:** XS

---

### B1.2 — Módulo `bible-marks`

**Descrição:** Criar `src/modules/oratio/bible-marks/` (service, controller, module, DTO)
seguindo o formato do `reading-progress`. Registrar `BibleMarksModule` no `app.module.ts`.

**Critérios de aceite:**
- [ ] `GET /oratio/bible/marks` sem query → todos os marks do usuário (`orderBy: updatedAt desc`)
- [ ] `GET /oratio/bible/marks?book=&chapter=` → só os do capítulo
- [ ] `PUT /oratio/bible/marks` → upsert por `userId_book_chapter_verse`; campos ausentes preservam o valor atual (merge)
- [ ] Após o merge, se `!highlighted && !favorite && !note?.trim()` → `delete` da linha, retorna `{ deleted: true }`
- [ ] Todas as rotas com `@UseGuards(JwtAuthGuard)`, `userId` vindo de `req.user.userId`
- [ ] DTO `UpsertBibleMarkDto`: `book`/`reference`/`text` string obrigatórios, `chapter`/`verse` int ≥ 1, `highlighted`/`favorite` bool opcionais, `note` string opcional `@MaxLength(5000)`

**Verificação:**
- [ ] `npm run build` limpo
- [ ] `curl -H "Authorization: Bearer <jwt>"` — sequência: PUT highlighted → GET capítulo mostra; PUT favorite=true; PUT note="teste"; PUT highlighted=false,favorite=false,note="" → `{ deleted: true }` e GET não retorna mais
- [ ] Corpo com campo não declarado no DTO → 400

**Dependências:** B1.1
**Arquivos:** `src/modules/oratio/bible-marks/{bible-marks.module,bible-marks.controller,bible-marks.service}.ts`, `.../dto/upsert-bible-mark.dto.ts`, `src/app.module.ts`
**Escopo:** M

---

### B1.3 — Testes `bible-marks`

**Descrição:** `bible-marks.service.spec.ts` e `bible-marks.controller.spec.ts`.

**Critérios de aceite:**
- [ ] Service: upsert cria quando não existe; faz merge quando existe; deleta quando os 3 zeram
- [ ] Service: `list` com e sem filtro de capítulo chama o Prisma com o `where` certo
- [ ] Controller: repassa `req.user.userId` (não confia em body para identidade)
- [ ] Cobertura dos arquivos novos ≥ ~90% linhas

**Verificação:**
- [ ] `npm test -- bible-marks` verde

**Dependências:** B1.2
**Arquivos:** `src/modules/oratio/bible-marks/*.spec.ts`
**Escopo:** S

---

## ⛳ Checkpoint B1
- [ ] `npm run build` limpo · `npm test -- bible-marks` verde
- [ ] Fluxo manual grifar→favoritar→anotar→limpar validado via curl
- [ ] **Revisar com o humano antes de seguir**

---

## Fase B2 — Coleções

### B2.1 — Modelos `BibleCollection` + `BibleCollectionItem`

**Descrição:** Adicionar os dois models + relação `bibleCollections BibleCollection[]` em `User`. Aplicar.

**Critérios de aceite:**
- [ ] `BibleCollectionItem` com `@@unique([collectionId, book, chapter, verse])`, `onDelete: Cascade` da coleção
- [ ] `BibleCollection` com `@@index([userId])`, `onDelete: Cascade` do user
- [ ] Comentário curto explicando o propósito (padrão do schema)

**Verificação:**
- [ ] `npx prisma db push` + `generate` sem erro · `npm run build` limpo

**Dependências:** Nenhuma (pode ir em paralelo com B1)
**Arquivos:** `prisma/schema.prisma`
**Escopo:** XS

---

### B2.2 — Módulo `bible-collections`

**Descrição:** Criar `src/modules/oratio/bible-collections/`. Registrar no `app.module.ts`.

**Critérios de aceite:**
- [ ] `GET /collections` → coleções do usuário + `_count.items`
- [ ] `POST /collections` `{ name }` → cria (DTO: `name` 1–60 chars)
- [ ] `PATCH /collections/:id` `{ name }` → renomeia; 404 se não for do usuário
- [ ] `DELETE /collections/:id` → deleta (cascata nos itens); 404 se não for do usuário
- [ ] `GET /collections/:id` → coleção + `items` ordenados por `createdAt`; 404 se não for do usuário
- [ ] `POST /collections/:id/items` → upsert do item por `@@unique`; 404 se a coleção não for do usuário
- [ ] `DELETE /collections/:id/items/:itemId` → remove; 404 se coleção ou item não baterem com o usuário
- [ ] Coleção/item inexistente ou de outro dono → `NotFoundException` (nunca `Error` cru)

**Verificação:**
- [ ] `npm run build` limpo
- [ ] curl: criar → GET lista mostra `count: 0` → add 2 itens → GET detalhe mostra 2 → delete 1 → rename → delete coleção
- [ ] curl com JWT de outro usuário em `/collections/:id` alheio → 404

**Dependências:** B2.1
**Arquivos:** `src/modules/oratio/bible-collections/{module,controller,service}.ts`, `.../dto/{create-collection,rename-collection,add-collection-item}.dto.ts`, `src/app.module.ts`
**Escopo:** M

---

### B2.3 — Testes `bible-collections`

**Critérios de aceite:**
- [ ] Cada rota testada no service + controller
- [ ] Ownership: operação em coleção de outro `userId` lança `NotFoundException`
- [ ] `addItem` faz upsert (não duplica versículo já na coleção)
- [ ] Cobertura dos arquivos novos ≥ ~90% linhas

**Verificação:**
- [ ] `npm test -- bible-collections` verde

**Dependências:** B2.2
**Arquivos:** `src/modules/oratio/bible-collections/*.spec.ts`
**Escopo:** S

---

## ⛳ Checkpoint B2
- [ ] `npm run build` + `npm run lint` limpos
- [ ] `npm test` inteiro verde, sem regressão de cobertura global
- [ ] Fluxo manual de coleções + teste de ownership (404) validados
- [ ] **Revisar com o humano antes de seguir**

---

## Fase B3 — Fechamento

### B3.1 — Documentação

**Critérios de aceite:**
- [ ] `docs/ARCHITECTURE.md` §4: `BibleMark`, `BibleCollection`, `BibleCollectionItem` descritos no grupo certo
- [ ] `docs/ARCHITECTURE.md` §7: bullet dos módulos `bible-marks` e `bible-collections`
- [ ] Menção à regra "linha some quando zera" e ao snapshot de texto vindo do cliente

**Dependências:** B1, B2
**Arquivos:** `docs/ARCHITECTURE.md`
**Escopo:** XS

---

### B3.2 — Revisão de contrato com o frontend

**Critérios de aceite:**
- [ ] Rotas, nomes de campo e shapes conferidos contra `oratio/src/services/bibleMarksService.ts` e `bibleCollectionsService.ts`
- [ ] `ALLOWED_ORIGINS` já cobre o front (nenhuma origem nova) — confirmado

**Dependências:** F-frontend services existirem
**Arquivos:** —
**Escopo:** XS

---

## ⛳ Checkpoint final backend
- [ ] Build + lint + testes verdes
- [ ] Docs atualizados
- [ ] Contrato alinhado com os `*Service.ts` do frontend
