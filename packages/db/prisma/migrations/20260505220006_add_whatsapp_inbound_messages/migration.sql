-- CreateTable
CREATE TABLE "whatsapp_inbound_messages" (
    "id" TEXT NOT NULL,
    "messageId" VARCHAR(255) NOT NULL,
    "fromWaId" VARCHAR(20) NOT NULL,
    "userId" TEXT,
    "messageType" VARCHAR(32) NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "repliedTo" VARCHAR(255),
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_inbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_inbound_messages_messageId_key" ON "whatsapp_inbound_messages"("messageId");

-- CreateIndex
CREATE INDEX "whatsapp_inbound_messages_userId_idx" ON "whatsapp_inbound_messages"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_inbound_messages_fromWaId_idx" ON "whatsapp_inbound_messages"("fromWaId");

-- CreateIndex
CREATE INDEX "whatsapp_inbound_messages_receivedAt_idx" ON "whatsapp_inbound_messages"("receivedAt");

-- CreateIndex
CREATE INDEX "whatsapp_inbound_messages_repliedTo_idx" ON "whatsapp_inbound_messages"("repliedTo");

-- AddForeignKey
ALTER TABLE "whatsapp_inbound_messages" ADD CONSTRAINT "whatsapp_inbound_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
