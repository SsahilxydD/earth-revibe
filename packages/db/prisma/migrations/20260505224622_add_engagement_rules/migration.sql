-- CreateEnum
CREATE TYPE "EngagementRuleTrigger" AS ENUM ('CART_ABANDONED_READ_NO_PURCHASE');

-- CreateEnum
CREATE TYPE "EngagementRuleActionType" AS ENUM ('FLAG_FOR_MANUAL_OUTREACH', 'SEND_EMAIL');

-- CreateTable
CREATE TABLE "engagement_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "EngagementRuleTrigger" NOT NULL,
    "delayHours" INTEGER NOT NULL,
    "actionType" "EngagementRuleActionType" NOT NULL,
    "actionPayload" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_rule_fires" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" JSONB,

    CONSTRAINT "engagement_rule_fires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagement_rules_isActive_trigger_idx" ON "engagement_rules"("isActive", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_rule_fires_ruleId_targetType_targetId_key" ON "engagement_rule_fires"("ruleId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "engagement_rule_fires_ruleId_idx" ON "engagement_rule_fires"("ruleId");

-- CreateIndex
CREATE INDEX "engagement_rule_fires_firedAt_idx" ON "engagement_rule_fires"("firedAt");

-- AddForeignKey
ALTER TABLE "engagement_rule_fires" ADD CONSTRAINT "engagement_rule_fires_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "engagement_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
