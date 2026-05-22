-- Two-phase offline orders: add a DRAFT order status + temp-customer fields.
--
-- DRAFT is an additive enum value (an unconfirmed offline order whose payment
-- hasn't landed). guestName/guestPhone hold the temp customer captured before
-- OTP verification. All three changes are additive and fast on Postgres 16.
--
-- IDEMPOTENT (IF NOT EXISTS) on purpose: this migration may be applied manually
-- via the Supabase SQL editor before it lands in Prisma's _prisma_migrations
-- table. `prisma migrate deploy` (run on every Railway deploy) will then re-run
-- it as a harmless no-op and record it, instead of failing on "already exists"
-- and blocking the API from booting.
--
-- Note: ALTER TYPE ... ADD VALUE is allowed inside a transaction on PG12+ as
-- long as the new value isn't used in the same transaction (it isn't here).

-- 1. Add DRAFT to the OrderStatus enum (placed before PENDING to match schema).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'PENDING';

-- 2. Temp-customer fields for DRAFT offline orders.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
