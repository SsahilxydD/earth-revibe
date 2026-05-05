# Prisma migrations

This folder is the source of truth for the Earth Revibe database schema. Every change goes through a migration file here, applied automatically on deploy.

## Status as of 2026-05-05

The first migration `20260505172925_baseline_2026_05_05/migration.sql` is the **baseline** — it represents the entire schema as it existed when we switched from `prisma db push` to formal migrations.

The baseline is **NOT yet marked as applied on production** as of this commit. That step is scheduled for the next session along with flipping the API start command. Once those two atomic steps land, this folder is fully wired up.

## Workflow going forward (after baseline is wired)

1. Edit `packages/db/prisma/schema.prisma`.
2. From the repo root, run `pnpm db:migrate -- --name <descriptive_name>`. This creates a new migration file and applies it to your dev DB.
3. Commit the new migration file alongside the schema change in the same commit.
4. Push. Railway runs `prisma migrate deploy` automatically before app boot, applying the migration.

## Workflow during hotfixes

If you absolutely have to apply schema changes in a hurry without going through the migration flow (don't, but if you must):

1. Apply the SQL directly in Supabase SQL editor.
2. Generate the matching migration file via `pnpm exec prisma migrate diff --from-schema-datamodel <prev> --to-schema-datamodel <new> --script`.
3. Mark it as applied in `_prisma_migrations` table manually.
4. Commit and push.

This is exactly what the 2026-05-05 incident postmortem warns against — it's a recovery procedure, not a default flow.

## Don't

- Don't use `pnpm db:push` anymore. It's still in `package.json` for emergency use only. Normal flow is `db:migrate`.
- Don't edit migration files after they've been applied. Once applied, they're immutable history. Make a new migration to fix.
- Don't delete the baseline migration. Migrations are forward-only.
