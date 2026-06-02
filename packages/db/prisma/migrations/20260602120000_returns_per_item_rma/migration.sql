-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('REFUND', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'DAMAGED_IN_TRANSIT', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_TOO_SMALL', 'SIZE_TOO_LARGE', 'CHANGED_MIND', 'OTHER');

-- AlterTable: delivery timestamp that anchors the 72h return window
ALTER TABLE "orders" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- Backfill deliveredAt for already-delivered orders from the earliest DELIVERED
-- status-history row, so existing orders are eligible/ineligible correctly.
UPDATE "orders" o
SET "deliveredAt" = sub."createdAt"
FROM (
  SELECT DISTINCT ON ("orderId") "orderId", "createdAt"
  FROM "order_status_history"
  WHERE "status" = 'DELIVERED'
  ORDER BY "orderId", "createdAt" ASC
) sub
WHERE o."id" = sub."orderId" AND o."deliveredAt" IS NULL;

-- AlterTable: refund timestamp
ALTER TABLE "payments" ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable: 72h policy + auto-exchange toggle (Postgres 16 → fast add-with-default)
ALTER TABLE "store_settings" ADD COLUMN     "returnWindowHours" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "autoApproveExchanges" BOOLEAN NOT NULL DEFAULT true;

-- DropIndex: a return is no longer one-per-order
DROP INDEX "return_requests_orderId_key";

-- AlterTable: per-item returns, exchange type, reverse-pickup + replacement link
ALTER TABLE "return_requests" ADD COLUMN     "userId" TEXT,
ADD COLUMN     "type" "ReturnType" NOT NULL DEFAULT 'REFUND',
ADD COLUMN     "reasonCode" "ReturnReason" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "returnShiprocketOrderId" INTEGER,
ADD COLUMN     "returnShipmentId" INTEGER,
ADD COLUMN     "returnAwbCode" TEXT,
ADD COLUMN     "returnTrackingUrl" TEXT,
ADD COLUMN     "replacementOrderId" TEXT;

-- AlterTable: reason becomes an optional free-text comment
ALTER TABLE "return_requests" ALTER COLUMN "reason" DROP NOT NULL;

-- CreateTable
CREATE TABLE "return_items" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "exchangeVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_status_history" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_requests_orderId_idx" ON "return_requests"("orderId");

-- CreateIndex
CREATE INDEX "return_requests_userId_idx" ON "return_requests"("userId");

-- CreateIndex
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");

-- CreateIndex
CREATE INDEX "return_items_returnRequestId_idx" ON "return_items"("returnRequestId");

-- CreateIndex
CREATE INDEX "return_items_orderItemId_idx" ON "return_items"("orderItemId");

-- CreateIndex
CREATE INDEX "return_status_history_returnRequestId_idx" ON "return_status_history"("returnRequestId");

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_status_history" ADD CONSTRAINT "return_status_history_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
