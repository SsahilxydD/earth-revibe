-- AlterTable
ALTER TABLE "products" ADD COLUMN     "costPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "costPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "operating_expenses" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operating_expenses_incurredAt_idx" ON "operating_expenses"("incurredAt");

-- CreateIndex
CREATE INDEX "operating_expenses_category_idx" ON "operating_expenses"("category");

-- AddForeignKey
ALTER TABLE "operating_expenses" ADD CONSTRAINT "operating_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
