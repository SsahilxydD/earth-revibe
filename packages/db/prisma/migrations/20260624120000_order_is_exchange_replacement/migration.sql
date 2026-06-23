-- AlterTable: mark net-zero exchange-replacement orders so analytics can
-- exclude them (see return.service.processExchange + order-filters.realOrders).
ALTER TABLE "orders" ADD COLUMN "isExchangeReplacement" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: flag the single pre-existing net-zero exchange-replacement order
-- (created before this column existed) so it is excluded from analytics too.
UPDATE "orders" SET "isExchangeReplacement" = true WHERE "orderNumber" = 'ER-MQQY2M3W3Q1Q2F';
