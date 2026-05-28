-- CreateTable
CREATE TABLE "promo_campaigns" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pointsReward" INTEGER NOT NULL,
    "expiryDays" INTEGER NOT NULL DEFAULT 180,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxClaims" INTEGER,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_campaigns_code_key" ON "promo_campaigns"("code");

-- CreateTable
CREATE TABLE "promo_claims" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_claims_userId_idx" ON "promo_claims"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_claims_campaignId_userId_key" ON "promo_claims"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "promo_claims" ADD CONSTRAINT "promo_claims_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "promo_campaigns"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_claims" ADD CONSTRAINT "promo_claims_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the default QR scan campaign so the /spinner?spin=true landing works in
-- every environment this migration runs in (incl. production via migrate deploy).
-- Idempotent: re-running the migration won't duplicate or reset it.
INSERT INTO "promo_campaigns"
  ("id", "code", "title", "pointsReward", "expiryDays", "isActive", "maxClaims", "claimCount", "createdAt", "updatedAt")
VALUES
  ('promo_scan500', 'SCAN500', 'Scan & Earn 500 Points', 500, 180, true, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
