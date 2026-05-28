-- CreateEnum
CREATE TYPE "ReferralPayoutStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable: referrer UPI for cash payouts
ALTER TABLE "users" ADD COLUMN "upiId" TEXT;

-- AlterTable: referral cash-payout tracking (manual admin payout)
ALTER TABLE "referrals"
  ADD COLUMN "payoutStatus" "ReferralPayoutStatus",
  ADD COLUMN "payoutPaidAt" TIMESTAMP(3),
  ADD COLUMN "payoutUpiId" TEXT,
  ADD COLUMN "payoutRef" TEXT;
