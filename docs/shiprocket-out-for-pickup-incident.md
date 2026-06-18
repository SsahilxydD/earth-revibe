# Incident: Shiprocket "Out For Pickup" mis-mapped to a terminal state

**Date found:** 2026-06-18 · **Code fix:** this PR (`apps/api/src/services/shiprocket.service.ts`)

## What happened

The Shiprocket status-code → `OrderStatus` map had the wrong carrier codes:

| Code | We treated it as             | It actually is                               | Effect                                         |
| ---- | ---------------------------- | -------------------------------------------- | ---------------------------------------------- |
| `19` | `RETURNED` ("RTO Delivered") | **Out For Pickup** (RTO Delivered is `10`)   | live pickups flipped to a terminal state       |
| `13` | `CANCELLED` ("Lost")         | **Pickup Error** (recoverable; Lost is `12`) | recoverable pickup errors flipped to cancelled |

In the admin, `RETURNED` and `CANCELLED` both render as the same red badge, so an order the courier was _coming to collect_ looked cancelled/returned. Because the refresh sweep skips terminal states and the admin "reopen" only accepts `CANCELLED`, affected orders are stuck and won't self-heal.

The fix removes `19` and `13` from the id map (they fall through to `null` = no status change, so the order stays `CONFIRMED` and keeps getting swept) and adds the correct `10 → RETURNED`.

## Confirmed affected (admin audit, 2026-06-18)

5 of 7 `RETURNED` orders were wrong (the other 2 were genuine "RTO Delivered"):

| Order             | Value  | Payment         | Flipped      |
| ----------------- | ------ | --------------- | ------------ |
| ER-MQFIMKV02T6P6D | ₹1,599 | COD             | 17 Jun 13:38 |
| ER-MQEYXWTI522M25 | ₹1,097 | UPI (captured)  | 17 Jun 13:38 |
| ER-MQERRH1316I6B8 | ₹2,140 | COD             | 17 Jun 13:38 |
| ER-MQDXOHDK4YQ515 | ₹1,449 | CARD (captured) | 17 Jun 13:38 |
| ER-MQ8P41V81V3S19 | ₹4,497 | COD             | 15 Jun 13:11 |

## Remediation — RUN IN THIS ORDER

> ⚠️ The code fix MUST be deployed (this PR merged → Railway redeploys the API) **before** running the repair. Otherwise the next carrier webhook re-flips the orders.

### Step 1 — (read-only) confirm the full affected set, including archived

```sql
SELECT o."orderNumber",
       o.status,
       o."awbCode",
       (o."deletedAt" IS NOT NULL) AS archived,
       h.note,
       h."createdAt" AS flipped_at
FROM orders o
JOIN LATERAL (
  SELECT note, "createdAt"
  FROM order_status_history
  WHERE "orderId" = o.id
  ORDER BY "createdAt" DESC
  LIMIT 1
) h ON true
WHERE o.status IN ('RETURNED', 'CANCELLED')
  AND ( h.note ILIKE '%out for pickup%'
     OR h.note ILIKE '%pickup error%'
     OR h.note ILIKE '%pickup exception%' )
ORDER BY h."createdAt" DESC;
```

An order is affected when its **most recent** status-history note is a pickup-phase carrier status while its current status is terminal-negative. Eyeball the rows before Step 2.

### Step 2 — (write) reset affected orders so the sweep re-syncs them

Wrapped in a transaction with a row-count check. The `affected` CTE is computed once, so the audit-log insert and the status update target the same set.

```sql
BEGIN;

WITH affected AS (
  SELECT o.id
  FROM orders o
  WHERE o.status IN ('RETURNED', 'CANCELLED')
    AND ( SELECT note FROM order_status_history
          WHERE "orderId" = o.id ORDER BY "createdAt" DESC LIMIT 1 )
        ILIKE ANY (ARRAY['%out for pickup%', '%pickup error%', '%pickup exception%'])
),
logged AS (
  INSERT INTO order_status_history (id, "orderId", status, note, "createdAt")
  SELECT gen_random_uuid()::text, id, 'CONFIRMED',
         'Manual fix 2026-06: reset from terminal state wrongly set by a Shiprocket pickup-phase mis-map; will re-sync from carrier.',
         now()
  FROM affected
  RETURNING 1
)
UPDATE orders SET status = 'CONFIRMED' WHERE id IN (SELECT id FROM affected);

-- Expect the UPDATE count to equal the Step-1 row count (5 at time of writing).
-- If it matches:  COMMIT;
-- If not:         ROLLBACK;
COMMIT;
```

### Step 3 — re-sync from carrier

After the reset the orders are `CONFIRMED`, so the next `/api/v1/internal/refresh-shipment-status` sweep picks them up and writes their true current status (with the fix, "Out for Pickup" is a no-op → stays `CONFIRMED`; once actually shipped/delivered it advances correctly). Trigger the cron manually or wait for the next run; then re-check the orders in the admin.
