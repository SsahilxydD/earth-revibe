# New-drop WhatsApp alerts — design

**Date:** 2026-05-06
**Status:** Draft, awaiting Sahil's ack before code
**Author:** Sahil + Claude
**Companion to:** `2026-05-05-crm-app-prd.md` (CRM migration plan), `feedback_meta_fair_use.md` user memory (broadcast-class hazard)

---

## TL;DR

Ship a customer-opt-in carousel WhatsApp template that fires when a new drop launches. Use the same infrastructure shape as PR 10's back-in-stock alerts (table + subscription + dispatcher), but with the differences a **marketing-category** message demands: explicit consent record, per-user frequency cap, daily-cap headroom for OTPs, and one-tap unsubscribe.

This is the _responsible_ version of what got deleted in PR 4. The 2026-05-06 broadcast deletion stands; this is not the "broadcasts are back" path.

---

## What changed since PR 4 said "no"

PR 4 deleted the broadcast UIs because they were **opt-out by default** (anyone with a phone in the system was a target) and **operator-initiated** (admin clicks a button, message blasts). That's the pattern Meta's fair-use review punishes.

A new-drop alert is salvageable if and only if every send is:

1. **Opt-in** — recorded against a specific user with an `optInAt` timestamp
2. **Capped** — per-user frequency limit (≤1 drop alert / 7 days) and per-day account limit (well below the 2000/24h tier ceiling)
3. **Unsubscribable** — one-tap stop link in every send, immediately effective
4. **Auditable** — every send logged with the (template, variant, opt-in source, sent timestamp)

Skip any of those and we're back in PR-4 territory.

---

## Where it sits in our Meta posture

| Surface                        | Category       | Status                                     |
| ------------------------------ | -------------- | ------------------------------------------ |
| OTP login                      | Authentication | Live, never restricted                     |
| Order updates                  | Utility        | Live, never restricted                     |
| Abandoned-cart recovery        | Utility        | Live (post-cart, opt-in by adding to cart) |
| Loyalty redemption code        | Utility        | Live                                       |
| Trip-circle decisions          | Utility        | Live                                       |
| Back-in-stock alerts (PR 10)   | Utility        | Live (post `/notify-me`, opt-in)           |
| **New-drop alerts (this doc)** | **Marketing**  | **Proposed**                               |
| Bulk broadcast templates       | Marketing      | **Deleted, do not restore** (PR 4)         |

The MARKETING-category line is the one to walk carefully. Everything else above is utility, and Meta's tolerance is much broader.

---

## Daily-cap math

The Meta tier cap is shared across all surfaces (`project_whatsapp_meta_limit.md`). Today's tier: **2000/24h**.

Steady-state utility traffic estimate:

| Surface                 | Avg per day | Notes                                              |
| ----------------------- | ----------- | -------------------------------------------------- |
| OTPs                    | 50 — 200    | Login + register                                   |
| Order updates           | 100 — 400   | New orders + status changes                        |
| Abandoned-cart recovery | 100 — 300   | Hourly cron, capped                                |
| Trip-circle decisions   | 0 — 50      | Bursty                                             |
| Back-in-stock           | 0 — 200     | Spiky on restock days                              |
| **Reserved headroom**   | **~1000**   | OTPs are non-negotiable; can never be queue-pushed |

Available budget for marketing: **~500–700/day** in a normal day. A single drop alert to 1k subscribers exhausts that _and_ eats into utility headroom. So:

**Hard constraint:** drop alert sends per day ≤ 500. With more subscribers, batch over multiple days or upgrade the Meta tier first.

The dispatcher MUST respect this. Suggested implementation:

- A `MarketingSendBudget` row tracks today's marketing send count (resets at midnight Asia/Kolkata).
- Drop dispatcher checks remaining budget before each batch and stops if it would push utility under reserve.
- Admin "Send drop alert" button shows estimated cost vs available budget before confirming.

---

## Data model

```prisma
/// Opt-in record for new-drop marketing alerts. Distinct from
/// BackInStockSubscription (utility category) — different Meta posture
/// and different cap accounting.
model DropSubscription {
  id              String    @id @default(cuid())
  userId          String    @unique  // one row per user
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  optInAt         DateTime  @default(now())
  /// Most recent send timestamp. Frequency cap (≤1 / 7 days) compares against this.
  lastNotifiedAt  DateTime?
  /// Set when the user clicks the unsubscribe link in a sent message.
  /// Non-null = paused. Re-opt-in clears it (writes a new optInAt).
  unsubscribedAt  DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([unsubscribedAt, lastNotifiedAt])
  @@map("drop_subscriptions")
}

/// Audit log of every drop alert sent. Lets us reconstruct who got
/// what for compliance and frequency-cap enforcement.
model DropAlertSend {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// The product whose release triggered this alert (the "hero" of the carousel).
  productId       String
  /// Meta's template + variant used (for funnel analytics via WhatsAppMessageEvent join).
  templateKey     String   @db.VarChar(64)
  variantKey      String   @db.VarChar(64)
  /// Meta's outbound message id — joins to whatsapp_message_events for status.
  messageId       String?  @unique @db.VarChar(255)
  sentAt          DateTime @default(now())

  @@index([userId, sentAt])
  @@index([productId, sentAt])
  @@map("drop_alert_sends")
}

/// Daily marketing-send budget tracker (one row per day).
/// Drop dispatcher reads + increments transactionally.
model MarketingSendBudget {
  id          String   @id @default(cuid())
  /// YYYY-MM-DD in Asia/Kolkata. Unique — one row per day.
  day         String   @unique @db.VarChar(10)
  sentCount   Int      @default(0)
  /// Set at row creation, mutable by admin if the tier changes mid-day.
  cap         Int      @default(500)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("marketing_send_budgets")
}
```

Three new tables, one migration.

---

## Subscribe / unsubscribe flow

### Opt-in

- **Storefront**: account-settings toggle "Get a heads-up when we drop new collections" with body copy spelling out frequency (~weekly) and that they can unsubscribe anytime.
- **Storefront**: optional homepage banner offering the same after the user has been browsing for ≥30s (no aggressive interrupt).
- **API**: `POST /api/v1/me/drop-subscription` (auth required, customer self-service).

### Unsubscribe

- Every drop-alert WhatsApp message has an interactive button: "Stop these alerts" → opens a deep link `https://earthrevibe.com/u/<token>`.
- Token-based unsubscribe page (no login required — the token is single-purpose, revocation is its only operation). Sets `unsubscribedAt = now`.
- A user replying "STOP" via WhatsApp also unsubscribes (handled in the inbox webhook from PR 6 — match incoming text against `/^stop$/i`).
- **Honor immediately**: unsubscribed users cannot be re-targeted unless they explicitly re-opt-in via the storefront.

### Re-opt-in

- Visiting the toggle in account settings, with `unsubscribedAt` set, presents the toggle as off. Switching it on clears `unsubscribedAt` and writes a new `optInAt`. No "are you sure" — they did the work to come back.

---

## Send helper + template structure

`sendWhatsAppDropAlert(phone, firstName, products[])` assembles a Meta carousel template. Meta-approved structure (registered in Business Manager):

```
Header: image (drop hero shot)
Body: "Hey {{firstName}}, our {{drop_name}} drop just landed. Quick look:"
Carousel: N cards (locked at 3 in v1)
  Card N:
    Header: image (product hero)
    Body: "{{product_name}} — {{price}}"
    Buttons: [Shop now] (URL: /products/{{slug}}?utm=drop)
Footer: "Reply STOP to unsubscribe"
```

Card count is **fixed at 3** for v1. To send a drop with 5 products, the picker chooses the top 3 by some heuristic (admin-defined order, then sales velocity, then recency). PR 8c can add multi-template variants later (`new_drop_alert_3card`, `_5card`).

The `templateKey` is `NEW_DROP_ALERT`, reusing PR 8's variant infrastructure for A/B testing copy without code changes.

---

## Trigger paths

Two ways a drop alert fires:

1. **Admin product page** — when a product moves from draft → published, an admin sees a "Send drop alert" button on the product page. Clicking it shows a dry-run modal:
   - Eligible recipients: subscribers with `unsubscribedAt = null` AND `lastNotifiedAt < now - 7 days`
   - Today's marketing budget remaining: e.g. 487 / 500
   - Estimated send count, time, and which template variant
   - Confirm → enqueues the dispatcher job

2. **Cron path (deferred)** — a scheduled "every Friday 11am Asia/Kolkata, send the week's drops" cron that auto-fires for newly-published products. Hold this until v2; manual admin-trigger is safer for V1.

Both paths funnel into the same dispatcher service.

---

## Dispatcher logic

```
function dispatchDropAlert(productId, triggeredBy) {
  product = product.findUnique({ id: productId })
  hero3 = pickHeroProducts(productId, 3)  // for the carousel cards

  eligibleUsers = users.findMany({
    where: {
      role: 'CUSTOMER',
      isActive: true,
      phone: { not: null },
      dropSubscription: {
        unsubscribedAt: null,
        OR: [
          { lastNotifiedAt: null },
          { lastNotifiedAt: { lt: now - 7 days } }
        ]
      }
    }
  })

  budget = getOrCreateTodayBudget()  // e.g. 500 cap, 13 used so far

  if (eligibleUsers.length > budget.remaining) {
    log.warn("Drop alert oversubscribed; sending to first <budget.remaining> users")
    eligibleUsers = eligibleUsers.slice(0, budget.remaining)
  }

  for (user of eligibleUsers) {
    result = sendWhatsAppDropAlert(user.phone, user.firstName, hero3)
    if (result.ok) {
      DropAlertSend.create({ userId, productId, messageId, templateKey, variantKey })
      DropSubscription.update({ where: { userId }, data: { lastNotifiedAt: now } })
      MarketingSendBudget.update({ sentCount: { increment: 1 } })
    } else {
      // log, do not retry — drops are time-sensitive, marketing
    }
  }
}
```

Best-effort batch. Per-user failures are logged but don't abort. The frequency-cap update happens BEFORE the send result is known so a flapping Meta API can't double-bill the cap.

---

## Out of scope for V1

- Image carousel template approval workflow — Sahil submits the template by hand in Business Manager, just like every other Meta template
- Storefront UI for the opt-in toggle — separate UI PR
- CRM dashboard for subscription stats — separate UI PR
- Cron-based auto-dispatch — manual admin trigger only in V1
- A/B testing of carousel content — works automatically through PR 8 once `NEW_DROP_ALERT` variants are added
- Per-segment targeting — uses _all_ subscribers in V1; segment-aware drop targeting needs PR 9 segment integration as a follow-up
- Internationalisation — single-language template only

---

## Risks

| Risk                                                                         | Mitigation                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Meta classifies our template as MARKETING and rejects it on first submission | Submit with utility-leaning copy (no aggressive CTAs, clear value). Have a fallback plain-text marketing template ready.                                                                                                 |
| OTP delivery degrades because drop alert ate the daily budget                | Hard cap at 500/day with admin override required for higher; OTP send-helper checks remaining budget before sending non-utility traffic                                                                                  |
| Subscriber base grows past 500/day and admin needs to "send to all"          | Multi-day batching in the dispatcher; admin sees "this drop will send over 3 days" in the dry-run modal                                                                                                                  |
| User unsubscribes via WhatsApp reply but we keep sending                     | Inbox webhook (PR 6) matches `/^stop$/i` and writes `unsubscribedAt`. Run a backfill check at dispatch time too: only send if `unsubscribedAt` is null at the moment of send, not at the moment of `eligibleUsers` query |
| Click attribution missing                                                    | PR 8c handles click tracking generally; until then, drop alerts use UTM-tagged URLs and PostHog correlates orders to UTM source                                                                                          |

---

## Migration sequence (the A in "B then A")

Implementation breaks into 3 incremental commits, each independently shippable:

### Commit 1: data model + dispatcher (backend only)

- Schema: 3 new tables, 1 migration
- `apps/api/src/services/drop-alert.service.ts` — subscribe/unsubscribe/dispatch
- `sendWhatsAppDropAlert` send helper with the carousel payload assembly
- Public endpoints:
  - `POST /api/v1/me/drop-subscription` (subscribe — auth required)
  - `DELETE /api/v1/me/drop-subscription` (unsubscribe — auth required)
  - `GET /api/v1/u/:token` (token-based unsubscribe page — no auth)
- Admin endpoint:
  - `POST /api/v1/admin/products/:id/dispatch-drop-alert` (admin-only)
- Webhook (PR 6) extension: STOP-text auto-unsubscribe

### Commit 2: admin UI

- Product detail page in `apps/admin` gets a "Send drop alert" button next to the publish toggle
- Dry-run modal: eligible count, budget remaining, confirm

### Commit 3: storefront UI

- Account settings toggle: "Get drop alerts"
- Optional homepage banner with same toggle (defer if scope creeps)
- `/u/:token` unsubscribe landing page (one-tap, confirms with a toast)

---

## Open questions

1. Confirm the daily marketing cap of **500/day** is the right number, or should it scale with the Meta tier?
2. Cron-based auto-dispatch (drop alerts fire at the same weekly time, no admin button) — V1 or V2?
3. Does the storefront opt-in toggle default to **on** for new sign-ups (with explicit checkbox at registration) or default to **off** (post-purchase upsell)? **Recommend default-off** — opt-in is meaningful only when it's not preselected.
4. After 7 days of inactivity (no clicks, no opens), should the user be auto-unsubscribed? Aggressive but Meta-friendly.
5. EU customers — out of scope for India-only Earth Revibe today, but worth noting if international expansion lands.
