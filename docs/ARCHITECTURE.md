# Oratio API — Architecture Guide

This is the guide for the **oratio-api** backend: a single NestJS service for **Oratio**, a Catholic prayer app (daily liturgy, the Rosary, a 33-day Marian consecration, a seasonal "Quaresma de São Miguel" devotion, a prayer library, reading progress, push/notification campaigns, and VoxAI — an AI spiritual-assistant chat).

Read this before touching the code — human or AI agent. It explains what exists, why it's shaped the way it is, and where the non-obvious constraints live. When you make a decision that isn't obvious from the code (a workaround, a security tradeoff, a "why not the simpler way"), record it here or as a comment at the point of use — don't let it live only in a commit message or a chat log.

## 1. Quick facts

| | |
|---|---|
| Framework | NestJS 11, Express platform |
| Language | TypeScript |
| Database | PostgreSQL via Prisma 5 (`prisma/schema.prisma`) |
| Auth | JWT (access + refresh), `passport-jwt` |
| AI provider | OpenAI (`gpt-4.1-mini`), called directly via `axios` — **not** the `openai` SDK |
| Email | Brevo transactional API (`@getbrevo/brevo` / raw HTTP), not SMTP |
| Push | Web Push (VAPID) via the `web-push` package |
| Package name | `finance-api` (historical — see §8, "Naming and dead code") |
| Repo root | `oratio-api/` (sibling to the frontend repo `oratio/`, not a monorepo — no shared package/workspace) |

There is no infrastructure-as-code or deploy manifest in this repo (no Dockerfile, no `render.yaml`/`Procfile`/CI workflow found as of this writing). Hosting/deploy configuration lives outside the repo — check with whoever manages the deployment before assuming a build step.

## 2. Commands

```bash
npm run start:dev      # Nest CLI, watch mode
npm run start:debug     # watch mode with --inspect
npm run build           # nest build -> dist/
npm run start:prod      # run compiled build (dist/src/main.js)
npm run lint             # ESLint --fix over src, apps, libs, test
npm run format            # Prettier over src/**/*.ts and test/**/*.ts
npm test                  # Jest unit tests (*.spec.ts, rootDir src)
npm test -- <pattern>       # run a single test file/suite
npm run test:watch
npm run test:cov            # coverage -> /coverage
npm run test:e2e             # test/jest-e2e.json
```

**Prisma:** this project has no `prisma/migrations` history. Schema changes are applied directly:

```bash
npx prisma db push       # push schema.prisma to the database
npx prisma generate      # regenerate the Prisma client
```

No npm script wraps these — run them by hand after editing `prisma/schema.prisma`. Because there's no migration history, there's also no rollback path beyond editing the schema back and pushing again; be careful with destructive column/table changes against production data.

## 3. Request lifecycle (`src/main.ts`)

Every request passes through, in order:

1. **`AllExceptionsFilter`** (`src/system-log/`) — catches all exceptions globally, logs 5xx into an in-memory ring buffer (see §7).
2. **`helmet`** with `contentSecurityPolicy: false` — this is a pure JSON API; CSP was breaking the verify-email redirect (`GET` request that 302s to the frontend), so it's disabled entirely rather than tuned.
3. **CORS**, open (`origin: "*"`), allowing `Content-Type`, `Authorization`, `X-App` headers, exposing `Authorization`.
4. **Global `ValidationPipe`** — `whitelist: true, forbidNonWhitelisted: true, transform: true`. Any DTO field not explicitly declared is stripped (`whitelist`) or rejects the request (`forbidNonWhitelisted`). When adding a request field, it must exist on the DTO or it silently disappears (or the whole request 400s, depending on which flag catches it) — there's no partial/loose mode.

The `X-App` header (`AppType.ORATIO = "oratio"`) is checked in several places (see §5). The enum has one member. It's kept — rather than removed — as routing plumbing in case another client is ever added; don't read it as "there are two apps," there is one.

## 4. Domain model (`prisma/schema.prisma`)

One `User` at the center, with these relations. Grouped by feature, not declaration order:

**Auth / session**
- `User` — canonical account row. Email verification, password reset, and email-change all use the same pattern: a random token column + an expiry column on `User` itself (`emailVerificationToken`/`Expires`, `passwordResetToken`/`Expires`, `pendingEmail`/`pendingEmailToken`/`Expires`). No separate token table.
- `RefreshSession` — **one row per device/login**, not a single token field on `User`. This is deliberate: before this model existed, logging in on a second device overwrote the one refresh token on `User`, silently invalidating the first device's session. Now each login creates its own session row; refreshing rotates that same row's `tokenHash`/`expiresAt` instead of creating a new one (see §5).

**Prayer & devotion features**
- `ConsecrationProgress` / `ConsecrationCompletedDay` / `ConsecrationStage` / `ConsecrationDay` / `Prayer` / `DayPrayer` — the 33-day consecration. `ConsecrationProgress` is one row per user representing the *current* (or most recent) run; `completedAt` distinguishes "finished all 33 days" from "cancelled partway" (cancelling deletes the row; finishing sets `completedAt` and keeps it, because the completion screen and admin stats depend on that distinction). Starting over after finishing deletes the old row (and its completed-day rows) before creating a new one — there is no history of past runs, only the current/latest one.
- `QuaresmaMichaelDay` / `QuaresmaMichaelPenance` — the 40-day "Quaresma de São Miguel" seasonal devotion (Aug 15 → Sep 29, skipping Sundays). Both are scoped by `year` in their unique constraint, because the devotion recurs every year — without `year`, one year's completed days would make the next year's edition read as already-finished on day one.
- `PrayerCategory` / `GeneralPrayer` — the general prayer library (unrelated to the consecration's `Prayer` model — two separate prayer concepts, don't conflate them).
- `RosarySession` — one row per rosary session in progress or completed (`type` = mystery set, e.g. `"gozosos"`; `completed`/`finishedAt` mark completion).
- `SpiritualStats` — one row per user: rosaries prayed, prayers prayed, login/prayer streak. Aggregate counters, updated by the feature services as activity happens (see `ActivityService`).
- `ReadingProgress` — last reading position for Bible/Catechism ("continue where you left off" on Home). One row per `(userId, kind)`, always overwritten — no history, just a pointer (`reference`/`label`).

**VoxAI (AI chat)**
- `Conversation` / `Message` — a user's chat threads with VoxAI.

**Notifications**
- `PushSubscription` — one row per browser/device Web Push subscription (endpoint + keys).
- `NotificationCampaign` — an admin-triggered broadcast (title/body/url/audience + sent/failed counters). Expires in 15 days; a cron sweeps expired ones.
- `Notification` — one row per user per notification (the in-app "bell" inbox). `source` distinguishes an admin `CAMPAIGN` from an automatic `RULE`. `seenAt` drives the unread badge; `expiresAt` (created + 7 days) removes it from the bell/panel; a cron deletes expired rows.
- `NotificationRule` — the catalog of automatic notification rules (text + on/off + hour), editable in the admin panel. *When* and *to whom* to fire is code (`condition`, matched by `key`), not data — see `notifications.scheduler.ts`.

**Misc**
- `UserActivity` — a generic activity-feed log (`type`/`action` per row), read by `ActivityModule`.

## 5. Auth module (`src/modules/auth/`)

JWT-based, two-secret design:

- **Access token**: signed with `JWT_SECRET_KEY`, 15 min TTL, validated by `JwtStrategy` (`passport-jwt`, Bearer extraction) on every `@UseGuards(JwtAuthGuard)` route.
- **Refresh token**: signed with a **separate** secret, `JWT_REFRESH_SECRET`, 180-day TTL. Different secret on purpose — a leaked refresh token can't be replayed as a Bearer access token, because its signature won't validate against `JWT_SECRET_KEY`.
- Refresh tokens are hashed with **SHA-256**, not bcrypt, before being stored in `RefreshSession.tokenHash`. Bcrypt truncates input at 72 bytes; since every refresh JWT for the same user shares a fixed prefix (header + `sub` + `email`, before the variable `iat`/`exp`), different tokens for the same user could collide under a truncated bcrypt hash — a rotated-out token could still "validate" against a newer one's hash. A JWT is already high-entropy, so a fast, non-truncating hash (SHA-256) is the correct tool here, and it also enables a direct hash lookup instead of comparing against every session.
- **Rotation, not accumulation**: `refresh()` updates the *same* `RefreshSession` row's `tokenHash`/`expiresAt` rather than deleting and re-creating. The access token's 15-min TTL means the app calls `refresh()` many times a day just to stay logged in — those are the same continuous session, not a new device. Only `generateTokens()` (called from `login()`) creates a new `RefreshSession` row. Confusing these two paths would turn "active sessions" in the profile UI into a list of dozens of rotation artifacts instead of actual devices.
- `AdminGuard` checks `user.isAdmin` from the DB on every request (not cached in the JWT payload) — exported from `AuthModule` and reused by other modules (notifications admin endpoints, etc.), not auth-only.
- Password-reset and resend-verification flows respond identically whether the target email exists or not (`requestPasswordReset`, and the `!user` branch of `resendVerification`) — this avoids leaking which emails have accounts. `resendVerification`'s failure path is the deliberate exception: once execution reaches the "send the email" step, existence is already established by the branches above it, so a real send failure is reported as a real error instead of a fake success.
- Email verification and email-change confirmation are **idempotent by design**: the token is *not* cleared on success, only checked against the current state (`emailVerified` / `email === pendingEmail`) before acting. Verification links in email are frequently pre-fetched by mail clients (Apple Mail privacy protection, anti-phishing scanners) before the user actually clicks — if the token were cleared on that first "ghost" hit, the user's real click would 401.
- `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])` is registered inside `AuthModule`, but `@nestjs/throttler`'s `ThrottlerModule` is itself `@Global()` — so once `AuthModule` brings it in, its providers (the default 10 req/min config, storage) are available to the **whole app**, not just `AuthModule`. That's how `UsersController` uses `ThrottlerGuard` on its sensitive routes (`change-password`, `me/email`, admin stats) without importing `ThrottlerModule` itself. Both controllers apply the guard per-route (not at the controller level, except `AuthController` which applies it class-wide and then tightens specific routes) and override the default with `@Throttle({ default: { limit, ttl } })` where a route needs a stricter cap than the app-wide default (5/min on login, password change, and email change — see the comments at each). VoxAI does **not** use this mechanism at all; it has its own in-memory limiter (§6). If `AuthModule` is ever removed or refactored to stop importing `ThrottlerModule`, `UsersController`'s throttled routes would break at bootstrap (missing DI providers) — this cross-module dependency is easy to miss since nothing in `UsersModule` imports `ThrottlerModule`.

## 6. VoxAI (`src/modules/oratio/voxai/`) — the AI chat feature

The largest and most stateful module (`voxai.service.ts` is ~870 lines). Structure:

```
voxai/
  voxai.controller.ts      routes: chat, chat/stream, bootstrap, conversation CRUD
  voxai.service.ts          conversation state, prompt assembly, OpenAI call, streaming
  voxai.cron.ts              warms the daily liturgical-calendar cache at 00:01 America/Sao_Paulo
  dto/voxai.dto.ts
  guards/vox.rate-limiter.ts    in-memory per-user rate limit (5 req / 60s)
  filters/vox.content-filter.ts  keyword blocklist (horoscope, tarot, occultism, ...)
  prompts/vox.prompt.ts           the system prompt defining VOX's persona and doctrinal boundaries
  services/liturgical-calendar.service.ts  fetches/caches the day's liturgical data for the assistant to reference
  utils/brazil-date.ts, date-parser.ts
```

Key points:

- **All routes require `JwtAuthGuard`** (`@UseGuards(JwtAuthGuard)` at the controller level) — VoxAI is never anonymous.
- **Calls OpenAI directly over HTTP** (`axios.post("https://api.openai.com/v1/chat/completions", ...)`), model `gpt-4.1-mini`. There is no `openai` npm package in `package.json` — don't go looking for an SDK client. `chat` and `chat/stream` are separate endpoints/code paths by design ("don't risk what already works" — the streaming path was added later, alongside the non-streaming one, not replacing it).
- **Rate limiting is per-instance, in-memory** (`VoxRateLimiter`, a `Map<userId, timestamp[]>`) — 5 requests/minute per user. This resets on every restart/deploy and does **not** work correctly across multiple server instances (each instance has its own map). If this service is ever scaled horizontally, this needs to move to a shared store (Redis, DB) — it currently silently under-enforces the limit when there's more than one instance.
- **Content filtering is a keyword blocklist** (`contentFilter`), checked before the model is called — not a model-based classifier. It's a first line of defense (occult/esoteric topics), not a complete safety system; the system prompt (`vox.prompt.ts`) is the primary control on what VOX will and won't say, restricting it to Scripture, the Catechism, and Catholic doctrine.
- **`getOrCreateActiveConversation`** — VoxAI keeps one "active" conversation per user rather than always starting fresh; `POST /conversation` is intentionally the same call as `GET /conversation/active` under the hood ("não cria duplicada" in the source) — calling create twice does not create two conversations.
- `@google/generative-ai` is a dependency in `package.json` but is **not used anywhere in `src/`** — see §8.

## 7. Other backend modules

- **`src/modules/oratio/liturgia/`** — daily Mass liturgy. `liturgia.service.ts` fetches/assembles the day's readings; `builders/missa.builder.ts` shapes the raw data into the section structure the frontend renders (Ritos Iniciais → ... ), branching on `isDomingo` (Sunday gets a third Eucharistic-prayer option). Public route (`liturgia.controller.ts` has no guard) — liturgy is not user-specific.
- **`src/modules/oratio/home/`** — assembles the Home screen's "For you today" suggestions (`HomeSuggestion[]`): resume an unfinished rosary, continue Bible/Catechism reading, or the day's traditional mystery, each tagged with a short "why" (`"Continue"`, `"Hábito"`, `"Onde parou"`). Read-only aggregation over other modules' data, not its own domain.
- **`src/modules/oratio/consecration/`**, **`prayers/`**, **`reading-progress/`**, **`quaresma/`** — each a straightforward Prisma-backed CRUD/service module per the schema entities in §4. `consecration` and `quaresma` both call into `ActivityService` on completion events (streaks/stats), rather than duplicating that logic.
- **`src/modules/oratio/activity/`** — `ActivityService` centralizes login-streak and activity-log bookkeeping (`UserActivity`, `SpiritualStats`); called by other feature services rather than owning its own user-facing routes primarily.
- **`src/modules/oratio/notifications/`** — three concerns split across files:
  - `notifications.controller.ts` — user-facing: list/mark-seen the bell inbox, push subscribe/unsubscribe.
  - `admin-notifications.controller.ts` — admin-only (`AdminGuard`): create campaigns, manage `NotificationRule`s.
  - `notifications.scheduler.ts` — a `DEFAULT_RULES` catalog (rosary unfinished, streak at risk, Bible/Catechism resume, Sunday Mass, VoxAI intro, night examen, etc.), each with a `key`, fixed local `hour`, and a `condition` matched in code; rules outside this catalog are pruned on boot (`OnModuleInit`). Editable copy/on-off lives in the DB (`NotificationRule`); *when* and *to whom* is code.
  - `notifications-send.service.ts` / `push.service.ts` — fan-out: writes `Notification` rows and, for users with an active `PushSubscription`, sends a real Web Push message via VAPID (`web-push` package). A `410`/`404` response from a push endpoint means the browser subscription is dead — that subscription row is deleted immediately rather than retried.
- **`src/modules/rosary/`** — Rosary session tracking plus one "builder" file per mystery/devotion variant (`rosaryBuilder.ts`, `divineMercyBuilder.ts`, `sevenSorrowsBuilder.ts`, `stMichaelBuilder.ts`, `StJosephBuilder.ts`, `sacredHearthBuilder.ts`, `tearsMaryBuilder.ts`, `viaSacraBuilder.ts`, `HolySpiritBuilder.ts`) — each returns the static step-by-step content for that devotion; `rosary.service.ts`/`rosary.controller.ts` handle the stateful session (progress, elapsed time, history) on top.
- **`src/modules/users/`** — account CRUD: registration (`create`, gated by `X-App` like login), profile updates, account deletion. Registration checks `password === confirmPassword` server-side (not just a frontend concern) and sends the verification email through `MailService`.
- **`src/modules/mail/`** — `MailService` posts directly to the **Brevo** transactional email HTTP API via raw `axios` (`https://api.brevo.com/v3/smtp/email`, `BREVO_API_KEY`) — not the `@getbrevo/brevo` SDK, not SMTP/`nodemailer`, not Resend (all three are dependencies in `package.json` but none are imported in `src/` — see §8). Builds Oratio-branded HTML templates inline (verification, password reset, email-change confirmation) in `buildOratioTemplate`.
- **`src/system-log/`** — `AllExceptionsFilter` (wired globally in `main.ts`) catches every exception and, for 5xx responses, appends to an **in-memory ring buffer of the last 100 entries** (`SystemLogService`). Not persisted, not a real audit log — resets on every restart/deploy. Exists purely so the admin panel can show "what broke recently" without paying for a logging service or DB writes on every error.
- **`src/prisma/`** — `PrismaService`/`PrismaModule` thinly wrap the generated Prisma client for DI; `prisma/schema.prisma` is the single source of truth for the schema (see §2 for the no-migrations caveat).

## 8. Naming, dead code, and other things that will confuse you if unexplained

- **Package name is `finance-api`, but there is no finance domain here.** The codebase is Oratio-only. Don't go looking for finance models or routes — there aren't any. Renaming the package would be a nice cleanup but touches deploy config outside this repo, so it hasn't happened.
- **This API used to also serve a second, unrelated product** ("Cravou!", a World Cup prediction pool) behind the same `X-App` header pattern. That code and its `Cravou*` Prisma models were removed once the tournament ended. `AppType` still being an enum (with one member) instead of a boolean is a remnant of that — it's cheap insurance against needing another product-routing header again, not evidence one currently exists.
- **`@google/generative-ai`, `nodemailer`, `resend`, and `@getbrevo/brevo` are dependencies that are not used anywhere in `src/`** (verified by grep — zero imports of any of the four). VoxAI calls OpenAI directly over HTTP (§6); mail goes through Brevo's raw HTTP API, not its SDK (§7). Don't assume these packages are wired up — check for actual imports before relying on Gemini, SMTP, Resend, or the Brevo SDK being available. Removing unused dependencies is safe cleanup, not a functional risk, but hasn't been done yet.
- **No `prisma/migrations` folder.** Schema changes go live via `npx prisma db push` directly against the database, with no recorded migration history and no automatic rollback (see §2). Be extra careful with any change that would drop or truncate data.
- **No deploy manifest lives in this repo.** If you need to know how/where this actually runs in production, ask — don't infer it from `package.json` scripts alone.

## 9. Environment variables

Required (see `.env`, not committed):

| Variable | Used by |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Prisma (`prisma/schema.prisma` datasource) |
| `JWT_SECRET_KEY` | Access token signing (`auth.module.ts`, `jwt.strategy.ts`) |
| `JWT_REFRESH_SECRET` | Refresh token signing (`auth.service.ts`) — must differ from `JWT_SECRET_KEY` |
| `BREVO_API_KEY` | `MailService` (Brevo HTTP API) |
| `OPENAI_API_KEY` | `VoxAiService` (OpenAI chat completions) |
| `ADMIN_PASSWORD` | A single shared secret (not per-user) checked in `UsersService.setAdminStatus` — required, in addition to already being logged in as an admin, to grant or revoke another user's admin status (`PATCH /admin/users/:id`). A second factor on top of `AdminGuard` for that one destructive action. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (optional, defaults to a placeholder) | `PushService` (Web Push). Push is **silently disabled** (not an error) if the two VAPID keys are missing — see `PushService.onModuleInit`. |
| `PORT` (optional, defaults to `3000`) | `main.ts` |

## 10. Working in this codebase — conventions to follow

- **Comments explain *why*, not *what*.** This codebase already does this well in most modules (see the Prisma schema and `auth.service.ts` for examples) — keep doing it. A comment justifying a non-obvious choice (a security tradeoff, a workaround, an ordering constraint) is worth keeping; a comment restating the code below it is not.
- **`X-App: oratio`** must be sent by any client calling routes that check it (`auth`, `users`) — see `AppType` in §3/§8. This will keep existing even with one app because removing it would require the frontend and any other future client to change in lockstep.
- **Timezone-sensitive logic uses `America/Sao_Paulo` explicitly** (`date-fns-tz`, or manual `toLocaleDateString("en-CA", { timeZone: ... })`) — Oratio's user base is Brazilian, and daily resets (streaks, daily liturgy, notification `hour`) are meant to align with Brazil's clock regardless of server timezone. Don't introduce naive `new Date()` day-boundary logic in a new feature without checking how the neighboring modules handle it.
- **Guards**: `JwtAuthGuard` for anything user-specific, `AdminGuard` (stacked after `JwtAuthGuard`) for admin-only routes. Public routes (liturgy, register, login, password-reset request) intentionally have no guard — don't add one without checking whether that breaks the flow (e.g. password-reset must work for a logged-out user).
- **New Prisma models**: add a short comment on the model explaining any non-obvious constraint (why a field is unique on a compound key, why there's a `year` column, why a row is deleted vs. flagged) — this schema already sets that precedent; match it.
- Before assuming a package in `package.json` is actually used, grep for it in `src/` — see §8 for three that currently aren't.
