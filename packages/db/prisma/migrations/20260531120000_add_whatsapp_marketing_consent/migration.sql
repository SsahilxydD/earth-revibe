-- WhatsApp marketing consent on users. Marketing-category templates
-- (abandoned-cart recovery, drop alerts) require opt-in for Meta to deliver.
--
-- Existing phone-verified users are backfilled to opted-IN (legitimate
-- interest — they shared their number via OTP), so abandoned-cart recovery
-- resumes for the current base. New signups set consent explicitly at the OTP
-- step. Transactional sends (OTP, order updates) do NOT consult this flag.
--
-- ADD COLUMN with a constant default is a fast, non-rewriting op on Postgres 11+.
ALTER TABLE "users" ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);

-- Stamp a consent timestamp for the backfilled base so we can distinguish
-- "legacy implicit opt-in" from "explicitly opted in after this date".
UPDATE "users" SET "whatsappOptInAt" = NOW() WHERE "phoneVerified" = true;
