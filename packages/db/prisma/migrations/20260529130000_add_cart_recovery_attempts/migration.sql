-- Track how many abandoned-cart recovery messages we've sent per cart, so the
-- sweep can re-engage a still-abandoned cart after a cooldown (instead of
-- one-shot forever) while capping total nudges. ADD COLUMN with a constant
-- default is a fast, non-rewriting operation on Postgres 11+.
ALTER TABLE "carts" ADD COLUMN "recoveryAttempts" INTEGER NOT NULL DEFAULT 0;
