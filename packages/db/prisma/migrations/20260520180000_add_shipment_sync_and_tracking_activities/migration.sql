-- AlterTable
ALTER TABLE "orders" ADD COLUMN "lastShipmentSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_lastShipmentSyncAt_idx" ON "orders"("lastShipmentSyncAt");

-- CreateTable
CREATE TABLE "order_tracking_activities" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "activity" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_tracking_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_tracking_activities_orderId_occurredAt_idx" ON "order_tracking_activities"("orderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_tracking_activities_orderId_occurredAt_status_key" ON "order_tracking_activities"("orderId", "occurredAt", "status");

-- AddForeignKey
ALTER TABLE "order_tracking_activities" ADD CONSTRAINT "order_tracking_activities_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
