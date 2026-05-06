-- CreateTable
CREATE TABLE "drop_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotifiedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drop_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drop_subscriptions_userId_key" ON "drop_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drop_subscriptions_unsubToken_key" ON "drop_subscriptions"("unsubToken");

-- CreateIndex
CREATE INDEX "drop_subscriptions_unsubscribedAt_lastNotifiedAt_idx"
  ON "drop_subscriptions"("unsubscribedAt", "lastNotifiedAt");

-- AddForeignKey
ALTER TABLE "drop_subscriptions" ADD CONSTRAINT "drop_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "drop_alert_sends" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "templateKey" VARCHAR(64) NOT NULL,
    "variantKey" VARCHAR(64) NOT NULL,
    "messageId" VARCHAR(255),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_alert_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drop_alert_sends_messageId_key" ON "drop_alert_sends"("messageId");

-- CreateIndex
CREATE INDEX "drop_alert_sends_userId_sentAt_idx" ON "drop_alert_sends"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "drop_alert_sends_productId_sentAt_idx" ON "drop_alert_sends"("productId", "sentAt");

-- AddForeignKey
ALTER TABLE "drop_alert_sends" ADD CONSTRAINT "drop_alert_sends_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "marketing_send_budgets" (
    "id" TEXT NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "cap" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_send_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_send_budgets_day_key" ON "marketing_send_budgets"("day");
