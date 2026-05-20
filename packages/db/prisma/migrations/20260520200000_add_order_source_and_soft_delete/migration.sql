-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'OFFLINE');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ONLINE';

-- CreateIndex
CREATE INDEX "orders_source_idx" ON "orders"("source");

-- CreateIndex
CREATE INDEX "orders_deletedAt_idx" ON "orders"("deletedAt");
