# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run start:dev` — run the API in watch mode (Nest CLI)
- `npm run start:debug` — watch mode with `--inspect`
- `npm run build` — `nest build` to `dist/`
- `npm run start:prod` — run compiled build (`dist/src/main.js`)
- `npm run lint` — ESLint with `--fix` over `src`, `apps`, `libs`, `test`
- `npm run format` — Prettier over `src/**/*.ts` and `test/**/*.ts`
- `npm test` — Jest unit tests (`*.spec.ts`, rootDir `src`)
- `npm test -- <path or name pattern>` — run a single test file/suite
- `npm run test:watch` — Jest watch mode
- `npm run test:cov` — coverage report (output in `/coverage`)
- `npm run test:e2e` — e2e tests via `test/jest-e2e.json`
- `npm run seed:cravou` — seed the Cravou (World Cup pool) data via `prisma/seed-cravou.ts`
- Prisma: edit `prisma/schema.prisma`, then `npx prisma migrate dev` / `npx prisma generate` as needed (no npm script wraps these)

## Architecture

This is a single NestJS backend serving **two distinct products** behind one API, distinguished per-request by the `X-App` header (`AppType.ORATIO` / `AppType.CRAVOU` — see `src/modules/auth/auth.service.ts`). Auth, users, and mail are shared; everything else is siloed by product.

- **`src/modules/oratio/`** — "Oratio", a Catholic prayer app: `consecration` (33-day consecration progress tracking), `liturgia` (daily liturgy, with a `builders/` subfolder assembling content), `voxai` (AI chat/conversation feature — has its own `dto`, `filters`, `guards`, `prompts`, `services`, `utils`, plus `voxai.cron.ts` for scheduled jobs), `prayers` (general prayer library), `activity` (user activity feed).
- **`src/cravou/`** — "Cravou!", a World Cup 2026 prediction pool (bolão): `matches`, `predictions`, `groups` (private pool groups with invite codes), `scoring` (points-calculation rules engine, kept separate from `matches`/`predictions` so scoring logic changes don't touch match/prediction CRUD), `ranking`, `copa-standings` (group-stage standings), `bracket` (knockout-stage bracket slots), `realtime` (WebSocket gateway, e.g. live score pushes), `scheduled` (cron jobs, e.g. pulling live match data), `wrapped` (end-of-tournament recap feature, gated by `CravouWrappedConfig` singleton row), `admin`, `football-api` (external football data client), `common`.
- **`src/modules/auth/`** — shared JWT auth (`passport-jwt`, Bearer token). One `User` model serves both apps. Login/session model: `RefreshSession` is one row per device/login (not a single token field on `User`) so logging in on a second device doesn't silently invalidate the first device's session — see the comment on that model in `prisma/schema.prisma`. Password-reset/email-verification flows branch behavior by `X-App` and deliberately respond identically whether the email exists or the app header is invalid (no user-enumeration signal — see `auth.service.ts` `requestPasswordReset`).
- **`src/modules/mail/`** — single mail service sending app-specific templates (Oratio vs. Cravou) depending on which flow calls it.
- **`src/system-log/`** — in-memory ring buffer (last 100 entries) of 5xx errors, wired via `AllExceptionsFilter` in `main.ts`. Not persisted, not an audit log — resets on every restart/deploy; exists purely to give the admin panel quick visibility into "what broke recently" without DB cost.
- **`src/prisma/`** — `PrismaService`/`PrismaModule` wrapping the Prisma client; `prisma/schema.prisma` is the single schema for both products (models prefixed `Cravou*` belong to the pool app).
- **`src/main.ts`** — global setup: Socket.IO adapter, the system-log exception filter, `helmet` with CSP disabled (pure JSON API; CSP was breaking the verify-email redirect), CORS open to `*` with `X-App` in allowed headers, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).

Despite the repo/package name (`finance-api`), there is no finance domain code here — the codebase is Oratio + Cravou.
