# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The repo root holds only this file and `README.md` (project overview / GitHub
landing page). **Everything else — the technical guide and every work plan —
lives under `docs/`, and there is important context there. Do not start work
without reading the relevant pieces below.**

## `docs/ARCHITECTURE.md` — read this before ANY code change

The full guide to this backend: modules, domain model, auth design, the VoxAI
(AI chat) feature, the notification scheduler, known quirks (the `prayerStreak`
misnomer, the no-migrations Prisma setup, timezone rules), and conventions. It is
the single source of truth — this file stays a thin pointer so it can't drift.

## `docs/` — what's there and when to open it

| Path | What it is | Read it when |
|---|---|---|
| `docs/ARCHITECTURE.md` | The technical guide (§1–§10). | Always, before touching code. Update the affected §§ when you change behavior. |
| `README.md` (root) | Project overview / onboarding / GitHub landing page. | You need the high-level picture or setup steps. |
| `docs/tasks/` | Active and past work plans, each a `*-plan.md` (design + phases) plus a `*-todo.md` (executable checklist). | Before starting or continuing any multi-step feature — check for an existing plan first. |

## `docs/tasks/` — current plans

| Feature | Files | Status |
|---|---|---|
| **Reformulação das notificações** (torna regras/timing/textos configuráveis sem deploy) | `docs/tasks/notifications-plan.md` · `docs/tasks/notifications-todo.md` | Ativo. Plano-mestre cross-repo — o frontend tem só um ponteiro em `oratio/docs/tasks/notifications.md`. |
| **Bíblia de Estudo** (backend: bible-marks, bible-collections) | `docs/tasks/biblia-plan.md` · `docs/tasks/biblia-todo.md` | Frontend em `oratio/docs/tasks/biblia-*.md` — ler os dois juntos. |

When you finish a task, tick it in its `*-todo.md` and, if behavior changed,
update `docs/ARCHITECTURE.md` in the same commit.

## Sibling repo

The frontend is **`oratio`** (React/Vite PWA), a sibling folder. Any change to a
route path, DTO shape, or header requirement here needs a matching change in its
`src/services/*Service.ts`. Its own guide is `oratio/docs/ARCHITECTURE.md`.
