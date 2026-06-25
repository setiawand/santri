# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sistem Santri — Markaz Qur'an Bekasi** is a Next.js 14 (App Router) web app for managing Islamic boarding school (pesantren) students. It digitizes three forms: student registration, Qur'an recitation logs (setoran), and monthly payment cards (pembayaran).

ORM is **Drizzle + better-sqlite3** (synchronous driver, fast prepared statements — chosen over Prisma for faster bulk insert/update).

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # next build (type-checks all routes)
npm run lint         # ESLint (not yet configured — prompts on first run)

npm run db:push      # Sync schema to DB (drizzle-kit push, no migration files)
npm run db:seed      # Seed initial users + sample data (tsx src/db/seed.ts)
npm run db:reset     # Delete dev.db then push + re-seed
npm run db:studio    # drizzle-kit studio — GUI for browsing/editing records
```

No test suite exists. Verify changes via `npm run build` (full type-check) and by exercising endpoints against `npm run dev`.

## Architecture

**Single Next.js 14 monorepo** — frontend and backend coexist.

- `src/app/(app)/` — protected route group (requires JWT cookie). Contains `dashboard/`, `santri/` (list, new, `[id]` detail with tabs).
- `src/app/api/` — REST API routes: `auth/` (login/logout/me), `santri/`, `setoran/`, `pembayaran/`, `stats/`.
- `src/components/` — shared UI: `Sidebar`, `Logo`, `SantriForm`, `SetoranPanel`, `PembayaranPanel`.
- `src/lib/` — `jwt.ts` (jose-based JWT + cookie name), `password.ts` (bcrypt), `session.ts` (server-side session helper), `utils.ts`.
- `src/db/` — `schema.ts` (Drizzle table defs + relations), `index.ts` (better-sqlite3 client singleton, exported as `db`), `seed.ts`.
- `src/middleware.ts` — JWT cookie validation; redirects unauthenticated requests to `/login`, returns 401 for unauthenticated API calls.
- `drizzle.config.ts` — drizzle-kit config (dialect sqlite, schema path, DB credentials).

## Auth

JWT stored in an httpOnly cookie. Two roles: `admin` and `guru` (stored as strings on `User`). The middleware protects all routes except `/api/auth/*` and static assets. Session payload is read server-side via `src/lib/session.ts`.

## Database Notes

- SQLite via better-sqlite3. Tables/columns in `src/db/schema.ts` keep the same names as the original Prisma schema (`User`, `Santri`, `Setoran`, `Pembayaran`).
- Primary keys are cuid2 strings generated in-app (`@paralleldrive/cuid2` via `$defaultFn`); timestamps are stored as integers (`{ mode: "timestamp" }`).
- The client enables `PRAGMA foreign_keys = ON` and `journal_mode = WAL` — required for `onDelete: "cascade"` to work. Deleting a `Santri` cascades to its `Setoran` and `Pembayaran`.
- `Pembayaran` has a unique index on `(santriId, periode, bulan)` — one payment record per student per month per academic year.
- Unique-constraint violations surface as errors with `code` containing `SQLITE_CONSTRAINT`; routes catch these and return HTTP 409.
- API routes return Drizzle row objects directly; `Date` fields serialize to ISO strings in JSON. Keep response shapes (notably `_count` on the santri list, built via SQL subqueries) stable — the client components depend on them.
- better-sqlite3 needs a persistent filesystem, so this setup targets a Node server/VPS, not serverless/edge.

## Environment

Copy `.env.example` to `.env`. Variables: `DATABASE_URL` (SQLite file path; a `file:` prefix is stripped automatically, e.g. `file:./dev.db`) and `AUTH_SECRET` (JWT signing secret).
