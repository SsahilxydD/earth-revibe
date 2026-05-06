-- CreateTable
CREATE TABLE "back_in_stock_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "back_in_stock_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "back_in_stock_subscriptions_userId_variantId_key"
  ON "back_in_stock_subscriptions"("userId", "variantId");

-- CreateIndex
CREATE INDEX "back_in_stock_subscriptions_variantId_notifiedAt_idx"
  ON "back_in_stock_subscriptions"("variantId", "notifiedAt");

-- CreateIndex
CREATE INDEX "back_in_stock_subscriptions_userId_idx"
  ON "back_in_stock_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "back_in_stock_subscriptions"
  ADD CONSTRAINT "back_in_stock_subscriptions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "back_in_stock_subscriptions"
  ADD CONSTRAINT "back_in_stock_subscriptions_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "product_variants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
