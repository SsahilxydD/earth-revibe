-- AlterTable: per-category fixed price for offline / in-person sales.
-- IF NOT EXISTS so this is safe to apply out-of-band (e.g. via the Supabase SQL
-- editor) and still be re-run idempotently by `prisma migrate deploy` on the
-- next deploy without colliding on "column already exists".
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "offlinePrice" DECIMAL(10,2);

-- Backfill the known offline prices by category slug. `AND "offlinePrice" IS
-- NULL` makes this idempotent AND non-destructive: re-running never overwrites a
-- price an admin later changed. A slug that doesn't exist updates zero rows.
UPDATE "categories" SET "offlinePrice" = 700  WHERE "slug" = 't-shirts'    AND "offlinePrice" IS NULL;
UPDATE "categories" SET "offlinePrice" = 1000 WHERE "slug" = 'shirts'      AND "offlinePrice" IS NULL;
UPDATE "categories" SET "offlinePrice" = 700  WHERE "slug" = 'polos'       AND "offlinePrice" IS NULL;
-- Bottomwear ₹1200. Production uses a single `bottomwear` category; the CSV seed
-- (dev) splits it into cargo-pants + trousers. Price all three so either
-- taxonomy is covered; the absent ones update zero rows.
UPDATE "categories" SET "offlinePrice" = 1200 WHERE "slug" = 'bottomwear'  AND "offlinePrice" IS NULL;
UPDATE "categories" SET "offlinePrice" = 1200 WHERE "slug" = 'cargo-pants' AND "offlinePrice" IS NULL;
UPDATE "categories" SET "offlinePrice" = 1200 WHERE "slug" = 'trousers'    AND "offlinePrice" IS NULL;
UPDATE "categories" SET "offlinePrice" = 1400 WHERE "slug" = 'shackets'    AND "offlinePrice" IS NULL;
