# Earth Revibe — WhatsApp Daily Engine

**Goal:** make WhatsApp a daily revenue channel that is _far-reaching but never overwhelming._
**Golden rule:** never broadcast to the whole list daily. Daily volume comes from **behavioral automations** (fire on user actions, to a few people each); broadcasts are **segmented + capped**.

Channel: WhatsMarketing (app.whatsmarketing.in) on WABA +91 93130 99659. See `whatsmarketing-drop-broadcast` memory for the exact template/broadcast build flow.

---

## 0. Guardrails (the "not overwhelming" part — non-negotiable)

- **Per-person frequency cap:** max **2 marketing broadcasts / 7 days** per subscriber. Automations are exempt but a person never gets >1 automation message/day.
- **Same-day suppression:** if someone received ANY WhatsApp from us today, exclude them from today's broadcast (use labels — see §3).
- **Quiet hours:** send only **09:00–21:00 IST**. Never night sends.
- **Opt-out is sacred:** honor every unsubscribe instantly; only ever message `whatsappOptIn = true` subscribers (consent shipped in PR #85).
- **Quality watch:** check WABA **quality rating** + block/opt-out rate after every broadcast. If blocks/opt-outs rise or rating drops to Medium → cut broadcast frequency in half until it recovers.
- **Relevance over reach:** a segmented send to 150 people who care beats 612 who don't. Meta rewards engagement, punishes blocks.

---

## 1. Layer 1 — Behavioral automations (the daily engine)

Always-on. Built as **WhatsMarketing Sequences/flows** + app-side triggers. High relevance, policy-safe, no fatigue.

| #   | Automation                | Trigger                                           | Timing          | Template                      | Goal                                               |
| --- | ------------------------- | ------------------------------------------------- | --------------- | ----------------------------- | -------------------------------------------------- |
| 1   | **Welcome series**        | New opted-in subscriber                           | t+0, t+2d, t+5d | `er_welcome_1/2/3`            | Intro brand → EARTH15 → first-order cashback nudge |
| 2   | **Abandoned cart** (live) | Cart, no checkout                                 | t+1h, t+24h     | `earth_revibe_abandoned_cart` | Recover cart                                       |
| 3   | **Browse abandonment**    | Viewed product ≥2×, no add                        | t+6h            | `er_browse_nudge`             | Pull back to PDP                                   |
| 4   | **Back-in-stock**         | Restock of a variant a user wishlisted/viewed OOS | on restock      | `er_restock_alert`            | Convert demand                                     |
| 5   | **Post-purchase**         | Order delivered                                   | t+3d            | `er_postpurchase_crosssell`   | Review ask + cross-sell                            |
| 6   | **Win-back**              | No order 30 / 60 / 90d                            | each milestone  | `er_winback_30/60/90`         | Re-activate; escalate offer                        |
| 7   | **Points nudge**          | Loyalty points balance > 0, unredeemed 14d        | t+14d           | `er_points_nudge`             | Drive redemption → repeat order                    |

App-side triggers needed (code, route via WhatsMarketing API or app WA): browse-abandon event, back-in-stock event, delivered→t+3d, lapsed-days job. Cart + welcome can be done in WhatsMarketing natively.

---

## 2. Layer 2 — Template library (pre-approved, always ready)

Each marketing template needs Meta approval (mins–24h). Keep **10–12 approved** so creative is always ready. Build via Bot Manager → Message Template → Create → **Mixed Template** (see memory). All Marketing category, English (US), image header, footer "Earth Revibe · Vacation-Ready Minimal Fits", button Visit-website → earthrevibe.com unless noted.

**Verified offers to use (never invent):** EARTH15 = 15% off · free shipping all orders · 100% first-order cashback as points · 20% referral / 15% friend · 33% take-back after 1yr.

| Template name                | Use             | Body (draft)                                                                                                                |
| ---------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `earth_revibe_linen_drop` ✅ | New drop        | (live — SS'26 linen)                                                                                                        |
| `er_new_drop_generic`        | Any drop        | "{drop} just landed. New-season fits, made in India. 15% off with EARTH15 · free shipping. Pack light, wear it everywhere." |
| `er_restock_alert`           | Restock         | "Back in stock: the pieces you wanted. Limited runs — grab yours before they go again. Free shipping, always."              |
| `er_offer_earth15`           | Offer reminder  | "Still thinking about it? EARTH15 takes 15% off your order. Free shipping + your first order comes 100% back as points."    |
| `er_editorial_styling`       | Editorial/value | "3 ways to wear linen this season. Breathable, sun-washed, built for the heat. Tap to shop the look."                       |
| `er_referral`                | Referral push   | "Bring a friend, both win: they get 15% off, you get 20% of their order in cash. No cap."                                   |
| `er_bestsellers`             | Social proof    | "What everyone's buying right now. Our most-loved fits, restocked. Free shipping on every order."                           |
| `er_winback_30`              | Lapsed 30d      | "We saved your spot. Here's 15% off to come back — EARTH15. New arrivals are in."                                           |
| `er_winback_60`              | Lapsed 60d      | "It's been a while. New-season linen + free shipping + EARTH15. Come see what's new."                                       |
| `er_points_nudge`            | Points          | "You've got rewards waiting. Your loyalty points are ready to spend on your next order."                                    |
| `er_browse_nudge`            | Browse abandon  | "Still eyeing it? It's in stock and ready to ship — free shipping, easy 7-day returns."                                     |
| `er_welcome_1`               | Welcome         | "Welcome to Earth Revibe. Vacation-ready minimal fits, made in India. Here's EARTH15 for 15% off your first order."         |

(Each gets its own on-brand hero via the pipeline in §4.)

---

## 3. Segments (WhatsMarketing labels)

Broadcasts filter via Include/Exclude label ids + recency + custom fields. Maintain these labels (assigned via flows/rules/import):

- `new_30d` — subscribed in last 30d (welcome-eligible)
- `buyer` / `non_buyer`
- `lapsed_30` / `lapsed_60` / `lapsed_90`
- `interest_linen` / `interest_polo` / `interest_tees` (from browse/purchase category)
- `high_value` — AOV or LTV above threshold
- `messaged_today` — **suppression label**; anyone messaged today, exclude from today's broadcast
- `vip_optin` — engaged openers (low risk, can take slightly higher frequency)

---

## 4. Creative pipeline (10-min recipe per campaign)

The exact flow we used for the SS'26 drop — repeat it:

1. Pull the real product photo (Supabase `product-images/<uuid>.webp`) for the featured item.
2. Higgsfield `generate_image` — model `nano_banana_pro`, `aspect_ratio 3:4`, `resolution 2k`, pass the product photo(s) as `medias` (https URL ok), with the anti-AI film-photography prompt (real skin/grain, natural light, negative space up top). ~2 credits.
3. Composite brand overlay (white logo `public/Earth Revibe Logo White.png` + headline + scrim) via canvas/GDI+ → save to `images/`.
4. Host it: Higgsfield `media_upload` presigned PUT (server-side curl, sandbox off) → `media_confirm` → CDN URL.
5. Template: Bot Manager → Message Template → Mixed Template; inject the hosted image into the Dropzone (`Dropzone.instances.find(visible).addFile(file)` after fetching the blob); fill copy + button; Save → submit.
6. Broadcast (when ready): Broadcasting → Create → select template → re-upload media to broadcast Dropzone → set segment labels → Save Changes.

Reuse heroes across templates where sensible; generate fresh only when the product/theme changes.

---

## 5. The 7-day rhythm (feels daily, capped per person)

"Daily" = something goes out every day, but rotated across **automations + segments** so no individual exceeds the cap.

| Day | Broadcast (segmented, exclude `messaged_today`)         | Always-on automations running underneath                        |
| --- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Mon | New arrivals → `non_buyer` + `interest_*`               | welcome, cart, browse, restock, post-purchase, win-back, points |
| Tue | — (automations only)                                    | ″                                                               |
| Wed | Editorial/styling → `vip_optin` + `buyer`               | ″                                                               |
| Thu | — (automations only)                                    | ″                                                               |
| Fri | Drop / restock / bestsellers → broad but capped segment | ″                                                               |
| Sat | Offer or referral → `non_buyer`                         | ″                                                               |
| Sun | — (automations only)                                    | ″                                                               |

→ ~3 broadcasts/week, each to a _different_ segment, so a given person gets ≤2/week. Automations fill the other days with relevant 1:1 messages. Schedule the week's broadcasts in advance with "Send later."

---

## 6. Measure → adjust (weekly)

Per send + weekly: **delivered, read %, click %, opt-out %, block %, orders attributed.** Watch WABA quality rating. Rules: read <30% → tighten segment/subject; opt-out >0.5% or blocks rising → cut frequency; high performers → clone the template/theme. Tie to PostHog/orders for revenue attribution.

---

## Build order (live, in batches — not all at once)

1. **Templates** (unblocks everything): build + submit the library in batches of 2–3.
2. **Segments**: create the labels; wire assignment (flows + app signals).
3. **Automations**: welcome + browse + win-back + points in WhatsMarketing; app-side triggers for browse/restock/post-purchase.
4. **Schedule** the first week's 3 broadcasts.
5. **Review** after week 1, adjust.
