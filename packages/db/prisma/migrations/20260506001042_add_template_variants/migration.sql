-- AlterTable: add A/B variant tracking columns to whatsapp_message_events
ALTER TABLE "whatsapp_message_events"
  ADD COLUMN "templateKey" VARCHAR(64),
  ADD COLUMN "variantKey" VARCHAR(64);

-- CreateIndex
CREATE INDEX "whatsapp_message_events_templateKey_variantKey_status_idx"
  ON "whatsapp_message_events"("templateKey", "variantKey", "status");

-- CreateTable
CREATE TABLE "whatsapp_template_variants" (
    "id" TEXT NOT NULL,
    "templateKey" VARCHAR(64) NOT NULL,
    "variantKey" VARCHAR(64) NOT NULL,
    "templateName" VARCHAR(255) NOT NULL,
    "bodyPreview" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_template_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_variants_templateKey_variantKey_key"
  ON "whatsapp_template_variants"("templateKey", "variantKey");

-- CreateIndex
CREATE INDEX "whatsapp_template_variants_templateKey_isActive_idx"
  ON "whatsapp_template_variants"("templateKey", "isActive");
