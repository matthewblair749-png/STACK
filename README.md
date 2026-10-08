# STACK

A workspace that connects the work apps people already use (email, chat, tasks, files, meetings), shows
what needs their attention, and drafts actions that only run after they approve them.

Live at https://www.stackunder.website. Built with Next.js 16 (App Router), React 19, Tailwind v4,
Prisma 5 on Postgres (Neon), and Auth.js v5.

> This Next.js version has breaking changes from older releases. Read [AGENTS.md](AGENTS.md) and the
> docs bundled in `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Local setup

1. **Install:** `npm install` (Node 20.9+; CI uses Node 22).
2. **Environment:** copy `.env.example` to `.env.local` and fill in at least `DATABASE_URL`,
   `AUTH_SECRET`, `ENCRYPTION_KEY`, `APP_URL=http://localhost:3000`, and one sign-in provider.
   Use a **development database** (a Neon branch), never the production one.
3. **Database:** the Prisma CLI doesn't read `.env.local`, so set the URL for the shell first:
   - PowerShell: `$env:DATABASE_URL = "<your dev database URL>"`
   - bash: `export DATABASE_URL="<your dev database URL>"`

   Then run `npx prisma migrate deploy` and `node prisma/seed.mjs` (loads the app catalog once).
4. **Run:** `npm run dev`, then open http://localhost:3000.

For OAuth app setup per provider, see [docs/app-registration-kit.md](docs/app-registration-kit.md).

## Checks

| Command | What it does |
| --- | --- |
| `npx tsc --noEmit` | Type-check |
| `npx eslint src --max-warnings=0` | Lint (zero warnings allowed) |
| `npm test` | Unit tests (Vitest; no database or network needed) |
| `npx next build` | Production build |

CI (`.github/workflows/ci.yml`) runs all four on every push to `main` and on pull requests.

## Deploying

- Vercel deploys `main` automatically on every push. Production env vars live in Vercel > Settings >
  Environment Variables. The full list, and what degrades without each, is in [docs/LAUNCH.md](docs/LAUNCH.md).
- **Schema changes:** apply the migration to production with `prisma migrate deploy` *before* pushing the
  code that uses it. Never run `migrate dev`, `migrate reset` or `db push` against production. See
  [docs/LAUNCH.md section 2](docs/LAUNCH.md#2-database-and-migrations).
- Deploy with the Vercel CLI only from a clean checkout: `vercel --prod` uploads your working folder,
  uncommitted files included.

## Runbook

Sync errors, expired connections, Stripe webhook retries, AI fallbacks, rate limits and data restores:
[docs/LAUNCH.md section 6](docs/LAUNCH.md#6-runbook).

## Project layout

- `src/app` - pages and API routes (`(app)` = signed-in app, `api/` = route handlers)
- `src/server` - server-only logic: auth, workspace access checks, integrations, sync, AI, billing,
  rate limiting
- `src/components`, `src/lib` - UI and shared client code
- `prisma/` - schema, migrations, catalog seed
- `docs/` - launch guide, app registration kit, Google verification pack
