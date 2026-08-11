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
- Prisma: this project has no `prisma/migrations` history — schema changes are applied with `npx prisma db push`, then `npx prisma generate` to refresh the client (no npm script wraps these)

## Architecture

This is a single NestJS backend for **Oratio**, a Catholic prayer app. Requests still carry an `X-App: oratio` header (checked against `AppType.ORATIO` — see `src/modules/auth/auth.service.ts`); the enum only has one member today, kept mainly so the header/validation plumbing doesn't need to change if another client is ever added.

- **`src/modules/oratio/`** — `consecration` (33-day consecration progress tracking), `liturgia` (daily liturgy, with a `builders/` subfolder assembling content), `voxai` (AI chat/conversation feature — has its own `dto`, `filters`, `guards`, `prompts`, `services`, `utils`, plus `voxai.cron.ts` for scheduled jobs), `prayers` (general prayer library), `activity` (user activity feed).
- **`src/modules/auth/`** — shared JWT auth (`passport-jwt`, Bearer token), plus `AdminGuard` (checks `user.isAdmin` in the DB; used across modules, not just auth). Login/session model: `RefreshSession` is one row per device/login (not a single token field on `User`) so logging in on a second device doesn't silently invalidate the first device's session — see the comment on that model in `prisma/schema.prisma`. Password-reset/email-verification flows deliberately respond identically whether the email exists or not (no user-enumeration signal — see `auth.service.ts` `requestPasswordReset`).
- **`src/modules/mail/`** — mail service sending Oratio-branded email templates (verification, password reset, email change).
- **`src/system-log/`** — in-memory ring buffer (last 100 entries) of 5xx errors, wired via `AllExceptionsFilter` in `main.ts`. Not persisted, not an audit log — resets on every restart/deploy; exists purely to give the admin panel quick visibility into "what broke recently" without DB cost.
- **`src/prisma/`** — `PrismaService`/`PrismaModule` wrapping the Prisma client; `prisma/schema.prisma` is the single schema.
- **`src/main.ts`** — global setup: the system-log exception filter, `helmet` with CSP disabled (pure JSON API; CSP was breaking the verify-email redirect), CORS open to `*` with `X-App` in allowed headers, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).

Despite the repo/package name (`finance-api`), there is no finance domain code here — the codebase is Oratio only. This API used to also serve a second, unrelated product ("Cravou!", a World Cup prediction pool) behind the same `X-App` header; that code and its `Cravou*` Prisma models were removed once the tournament ended, since it was no longer needed and mixing two products in one backend made the codebase harder to navigate.
