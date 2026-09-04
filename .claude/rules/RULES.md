# RULES.md — regras permanentes do Oratio API

> O padrão aqui é **negar por padrão, abrir exceções nomeadas, e dizer o que fazer em
> vez disso**. Não é desconfiança do agente: é não deixar pra ele uma decisão que só um
> humano deveria tomar.

**Precedência:** `RULES.md` > `CLAUDE.md` > `docs/ARCHITECTURE.md` > spec (`docs/specs/`) >
plano (`docs/tasks/`) > prompt da conversa.

Se o prompt pedir algo que este arquivo proíbe, **recuse, explique em uma frase, e ofereça o
caminho aprovado** — não execute "porque o usuário pediu". Uma ordem repetida do usuário
libera o que está em "Perguntar antes"; **não libera o que está em "Nunca"**.

---

## 1. Infraestrutura e produção — negado por padrão

**Proibido**, inclusive de forma indireta (`curl`/`wget`, script npm, CI, `docker exec`, MCP não
aprovado):

- Qualquer operação no **Render** (onde esta API roda): deploy, redeploy, rollback, variáveis de
  ambiente, logs de produção, shell.
- Qualquer operação na Vercel (frontend), DNS, CDN, certificados, ou SaaS que mexa em infra,
  dinheiro ou dado externo.
- Chamar a **API de produção** com qualquer método — inclusive `GET` em rota autenticada, que
  exigiria um token real.
- Endpoints administrativos da própria aplicação (`/admin/**`). `PATCH /admin/users/:id` concede
  ou revoga admin e é protegido por `ADMIN_PASSWORD` além do `AdminGuard` justamente porque é
  destrutivo (`ARCHITECTURE.md` §9).

**Exceções nomeadas:**
- Ambiente local: `npm run start:dev`, `npm run build`, `npm test`, `npm run test:cov`,
  `npm run lint`, e `curl` contra `http://localhost:3000`.
- Leitura de rota pública local (liturgia, register, login) para investigar um bug.

**Em vez disso:** descrever a ação, explicar o efeito, **escrever o comando exato num bloco**, e
deixar o humano executar.

> ⚠️ Não existe manifesto de deploy neste repo (`ARCHITECTURE.md` §8). Não infira como o
> serviço sobe em produção a partir dos scripts do `package.json` — pergunte.

---

## 2. Banco de dados — a regra mais importante deste arquivo

Este projeto **não tem `prisma/migrations`**. O schema vai para o banco via
`npx prisma db push` direto, **sem histórico de migração e sem rollback automático**
(`ARCHITECTURE.md` §2/§8). Um `db push` errado contra o banco errado é perda de dados sem desfazer.

**Nunca:**
- Rodar `prisma db push`, `prisma migrate`, `prisma db execute`, `prisma studio`, `psql`,
  `pg_dump`, ou qualquer SQL — contra **qualquer** banco que não seja um Postgres local
  descartável do próprio desenvolvedor.
- Assumir que `DATABASE_URL`/`DIRECT_URL` apontam para local. **Por padrão, apontam para
  produção.**
- Alterar `prisma/schema.prisma` de forma destrutiva (remover campo, remover model, mudar tipo,
  mudar `@@unique`) dentro de uma tarefa que não seja explicitamente sobre isso.

**Em vez disso**, ao precisar de mudança de schema:
1. Editar `prisma/schema.prisma` (isso é código, pode).
2. **Escrever o efeito em texto**: o que será criado, alterado ou perdido, e em qual tabela.
3. Escrever num arquivo `prisma/db-scripts/AAAA-MM-DD-descricao.sql` o SQL equivalente **e o
   rollback**, para revisão humana.
4. Entregar o comando pronto (`npx prisma db push && npx prisma generate`) num bloco e **parar**.
5. Marcar na tarefa que o `db push` de produção está **pendente de execução humana** — como
   `docs/tasks/vox-profiles-todo.md` já faz.

**Preferir sempre** mudança aditiva e não-bloqueante: `ADD COLUMN ... DEFAULT` em vez de backfill
manual, `CREATE INDEX CONCURRENTLY` em vez de `CREATE INDEX`, campo novo opcional em vez de
obrigatório. O cuidado vale para o **texto** do script, não só para quem o executa.

---

## 3. Comunicação real com usuário

Esta API **fala com pessoas de verdade**. Nada aqui pode ser disparado por conveniência.

**Nunca:**
- Enviar e-mail via `MailService` (Brevo) — verificação de conta, recuperação de senha, qualquer
  template — fora de teste com mock.
- Enviar push via `PushService` (Web Push/VAPID).
- Executar manualmente o **scheduler de notificações**, ou qualquer método que o simule, contra
  dados que não sejam locais e sintéticos. Ele resolve destinatários reais.
- Chamar a **OpenAI** (`VoxAiService`) em loop, em teste, ou em script de verificação: custa
  dinheiro por chamada. Em teste, `fetch` é sempre mockado (`ARCHITECTURE.md` §10).

**Em vez disso:** mockar no nível do módulo (`jest.mock('axios')`, `global.fetch = jest.fn()`) e,
quando for realmente preciso exercitar o caminho real, escrever o comando e pedir ao humano.

---

## 4. Conteúdo doutrinário — `VOX_IDENTITY` e `VOX_PROFILES`

`src/modules/oratio/voxai/vox.prompt.ts` não é configuração: é a **doutrina que o app ensina**.
`VOX_IDENTITY` fixa o que o Vox é; cada `systemAppend` de perfil ajusta só o estilo.

**Nunca:**
- Afrouxar, remover ou "simplificar" restrição doutrinária de `VOX_IDENTITY` para melhorar a
  qualidade percebida de uma resposta.
- Escrever ou alterar `systemAppend` de um perfil sem **aceite humano explícito**, perfil a
  perfil — é exatamente o gate que `docs/tasks/vox-profiles-todo.md` já exige ("Usuário revisa e
  aceita este perfil (registrar 'aceito' no commit/PR)").
- Duplicar em `systemAppend` uma regra que já está em `VOX_IDENTITY` — o perfil trata de tom e
  estrutura, não de doutrina.
- Inventar citação de Catecismo, concílio, encíclica ou versículo. Sem fonte confirmada, dizer
  que não encontrou e parar.

**Em vez disso:** apresentar o texto proposto, a pergunta de exemplo e a resposta que ele gera,
e esperar o "aceito".

---

## 5. Segurança de aplicação

**Nunca:**
- Criar rota que devolva dado de usuário sem `JwtAuthGuard`, ou rota administrativa sem
  `AdminGuard` empilhado depois dele (`ARCHITECTURE.md` §10).
- Confiar em `userId` vindo do body ou da query. Ele vem de `req.user.userId`, sempre.
- Hardcodar segredo, chave ou token. Toda credencial vem de env (`ARCHITECTURE.md` §9).
- Logar corpo de request de auth, token, hash de senha, ou `OPENAI_API_KEY`.
- Commitar `.env`.

**Perguntar antes:**
- Remover ou afrouxar guard de rota existente — inclusive "só pra testar".
- Mexer em `ALLOWED_ORIGINS` (CORS, `main.ts`). Origem faltando é bloqueada **pelo navegador**,
  não pelo servidor: o sintoma aparece só em produção, no cliente.
- Mexer na exigência do header `X-App: oratio` (`auth`, `users`) — mudar isso exige mudança em
  lockstep no frontend.
- Introduzir lógica de data sem timezone. Toda fronteira de dia (streak, liturgia do dia, `hour`
  de notificação) usa `America/Sao_Paulo` **explicitamente**; `new Date()` cru gera bug que só
  aparece de madrugada.

---

## 6. Dados pessoais e LGPD

**Convicção religiosa é dado pessoal sensível** (LGPD, art. 5º, II) — e é o núcleo do que esta
API armazena: intenções de oração, progresso de consagração, histórico de conversa com o Vox,
streak, e-mail.

**Nunca**, nem em teste, nem em exemplo de documentação:
- Colar dado real de usuário em prompt, log, teste, spec, script ou mensagem de commit.
- Usar dump ou export de produção como fixture.
- Enviar histórico real de conversa do Vox para qualquer lugar que não seja a própria chamada da
  OpenAI feita pelo serviço.

**Em vez disso:** dados sintéticos óbvios (`usuario@exemplo.com`, `Fulano de Tal`).

---

## 7. Git e branches

- **`main` e `develop` são protegidas.** `main` é o que está no Render.
- Antes de qualquer `commit`, rodar `git rev-parse --abbrev-ref HEAD` e **recusar** se for `main`
  ou `develop`.
- Branch nova sempre a partir de `develop`:
  `git fetch origin develop && git checkout -b feat/x FETCH_HEAD`.
  Nunca `git checkout -b feat/x origin/develop` — a branch nova nasceria rastreando a protegida e
  o próximo `push` tentaria ir pra ela. Use `/nova-branch`.
- Nomenclatura: `feat/`, `fix/`, `chore/`, `docs/`.
- **Nunca:** `git push --force`, `git reset --hard`, `rebase` de branch já publicada, reescrita de
  histórico, ou remoção de branch remota.
- Um commit por tarefa concluída, com o **porquê** na mensagem. Marcar a tarefa `[x]` no
  `docs/tasks/*.md` correspondente **no mesmo commit**.
- PR passa por `/review-pr` antes de existir. O agente **antecede** a revisão humana, nunca a
  substitui.

---

## 8. Dependências

**Perguntar antes** de qualquer mudança em `package.json`/`package-lock.json`.

**Antes de usar um pacote que está no `package.json`, faça `grep` em `src/`.** Quatro deles não
são importados em lugar nenhum (`ARCHITECTURE.md` §8): `@google/generative-ai`, `nodemailer`,
`resend`, `@getbrevo/brevo`. O VoxAI chama a OpenAI por HTTP direto; o e-mail usa a API HTTP crua
da Brevo, não o SDK. Não assuma que Gemini, SMTP, Resend ou o SDK da Brevo estão ligados.

---

## 9. Como pedir exceção

Quando uma regra bloquear algo que parece necessário:

1. Diga **qual regra** está bloqueando e por que ela existe.
2. Descreva a ação exata que seria tomada e o efeito dela.
3. Escreva o comando ou o diff pronto num bloco, para o humano executar ou aprovar.
4. **Pare.** Não execute enquanto não houver um "sim" explícito nesta conversa.

Aprovação vale para **aquela** ação, naquela conversa. Não se estende à próxima.
