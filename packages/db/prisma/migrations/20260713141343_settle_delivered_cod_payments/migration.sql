-- Data fix (forward-only, no schema change): COD payments were never marked
-- collected when their orders were delivered — the settle-on-delivery half of
-- the COD design didn't exist, so every delivered COD order still showed
-- payment PENDING. Capture them now, stamping paidAt from the order's
-- delivery time when known. Prepaid payments are CAPTURED at creation and
-- are untouched; AUTHORIZED/FAILED/REFUNDED rows are deliberately excluded.
UPDATE "payments" AS p
SET "status" = 'CAPTURED',
    "paidAt" = COALESCE(o."deliveredAt", o."updatedAt")
FROM "orders" AS o
WHERE o."id" = p."orderId"
  AND o."status" = 'DELIVERED'
  AND p."status" = 'PENDING';
