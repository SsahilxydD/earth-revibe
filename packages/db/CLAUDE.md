# DB — packages/db

Prisma 5.22 client + schema. Imported only by `apps/api`. PostgreSQL 16 hosted on Supabase. Two connection URLs:

- `DATABASE_URL` — pooler on port 6543, transaction mode, **must include `?pgbouncer=true`** (see `project_prisma_supabase_pgbouncer.md` in user memory)
- `DIRECT_URL` — direct on port 5432, session mode, used by `prisma migrate`

## Migration workflow

1. Edit `prisma/schema.prisma`.
2. From repo root: `pnpm db:migrate -- --name <descriptive_name>`. Generates a migration file in `prisma/migrations/<timestamp>_<name>/migration.sql` and applies it to the dev DB.
3. Commit the migration file alongside the schema change in the **same commit**.
4. Push. Railway runs `prisma migrate deploy` before `node dist/index.js` (see `apps/api/package.json` start script), so the new migration applies to production before the app boots.

**Why the same commit:** prevents drift between code that references new fields and the prod DB schema. This is the single rule that would have prevented the 2026-05-05 payment outage.

## Scripts

- `pnpm db:generate` — regenerate Prisma client after schema change (pre-migration).
- `pnpm db:migrate -- --name foo` — create + apply a migration locally (dev DB).
- `pnpm db:migrate:deploy` — apply pending migrations to whatever `DATABASE_URL` points at (used by Railway start command, also for manual ops).
- `pnpm db:migrate:status` — show what's applied and pending against the configured DB.
- `pnpm db:seed` — seed the dev DB.
- `pnpm db:studio` — Prisma Studio for browsing data.
- `pnpm db:push` — **emergency only**. Bypasses migrations, applies schema directly. Caused the 2026-05-05 outage when used carelessly.

## Files

- `prisma/schema.prisma` — single source of truth for the schema.
- `prisma/migrations/` — every migration that has ever been applied. Forward-only; never edit applied migrations.
- `prisma/migrations/README.md` — operational notes on the migration system.
- `src/index.ts` — exports the Prisma client + types for the API.

## Common pitfalls

- Adding a `Json?` column → ALTER TABLE works fine, but Prisma's `SELECT *` will still try to read it. If the column doesn't exist on prod, every query that touches the model fails. (This was the 2026-05-05 cause.)
- Dropping a column → migration drops, but if old code is still running on a previous deploy, those instances can break. Use a multi-step migration: stop reading the column first, deploy, then drop in next migration.
- Renames → Prisma treats as drop + create. Use `@map(...)` for the column name to avoid this.
- Long migrations on big tables → Postgres `ALTER TABLE ... ADD COLUMN` is fast; `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` rewrites the whole table on Postgres < 11. Use Postgres 11+ or split into add-then-update.

## Don't

- Don't edit `_prisma_migrations` directly except for baselining a fresh setup.
- Don't roll back a migration in production by deleting the file. Make a new migration that undoes the change.
- Don't run `prisma migrate reset` against production. It nukes everything.
