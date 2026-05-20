-- Collapse OrderStatus from 9 values to 6.
-- Postgres doesn't support removing enum values in place, so this widens the
-- column to TEXT, remaps the doomed values, recreates the enum with the new
-- shape, then casts back. Order of operations matters: every table that uses
-- the enum (orders + order_status_history) gets widened/remapped/cast in lock-
-- step inside one transaction so a partially-applied migration can't leave
-- columns referencing a dropped enum value.
--
-- Old → new mapping:
--   PLACED            → PENDING
--   PROCESSING        → SHIPPING
--   SHIPPED           → SHIPPING
--   OUT_FOR_DELIVERY  → SHIPPING
--   REFUNDED          → RETURNED   (financial refund still tracked on Payment)

-- 1. Drop the default so the cast to TEXT doesn't trip on it.
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

-- 2. Widen the columns to TEXT so we can rewrite values freely.
ALTER TABLE "orders" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

-- 3. Remap legacy values.
UPDATE "orders" SET "status" = 'PENDING'   WHERE "status" = 'PLACED';
UPDATE "orders" SET "status" = 'SHIPPING'  WHERE "status" IN ('PROCESSING','SHIPPED','OUT_FOR_DELIVERY');
UPDATE "orders" SET "status" = 'RETURNED'  WHERE "status" = 'REFUNDED';

UPDATE "order_status_history" SET "status" = 'PENDING'   WHERE "status" = 'PLACED';
UPDATE "order_status_history" SET "status" = 'SHIPPING'  WHERE "status" IN ('PROCESSING','SHIPPED','OUT_FOR_DELIVERY');
UPDATE "order_status_history" SET "status" = 'RETURNED'  WHERE "status" = 'REFUNDED';

-- 4. Drop the old type and create the new six-value enum.
DROP TYPE "OrderStatus";
CREATE TYPE "OrderStatus" AS ENUM ('PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED','RETURNED');

-- 5. Cast the columns back to the new enum type.
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";

-- 6. Restore the default on new orders.
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
