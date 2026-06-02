# Reviews Engine — Real Review Collection + Display

**Branch:** `feat/product-reviews` · **Date:** 2026-06-02 · **Status:** planned, executing slice-by-slice

## Goal

A legitimate review system that gets **real, verified-buyer** reviews onto product pages and shows them in a way that builds trust and converts. No fabricated reviews (consumer-protection: India CPA + BIS IS 19000:2022; FTC 16 CFR 465). Locked decisions: **display first, then collection**; **no incentive**; verified-buyer only flagged, all reviews admin-gated (`isApproved`).

## What already exists (recon, 2026-06-02)

- **`Review` model** (`schema.prisma:945`): `id, productId, userId, rating, title?, content?, isVerified, isApproved, createdAt, updatedAt`, `@@unique([productId,userId])`. No fit/size/photo fields. No `ReviewFit` enum.
- **API**: `GET /api/v1/reviews/products/:productId` (public, paginated, returns `avgRating`), `POST /api/v1/reviews` (authenticated; `createReview` sets `isVerified` from a DELIVERED order containing the product, `isApproved:false`). `getProductBySlug` returns computed `averageRating`, `reviewCount`, `ratingBreakdown` + up to 20 written approved reviews. (`review.service.ts`, `product.service.ts:210-265`)
- **Shared**: `createReviewSchema` = `{ productId, rating 1-5, title?, content? }` (`schemas/review.schema.ts`); `Review`/`Product` types (`types/index.ts`).
- **Admin review flow**: list + per-product drill-in + approve/reject/delete — live.
- **Storefront**: `product-reviews.tsx` (drafted PDP section, reads embedded `product.reviews`), rendered in `product-detail.tsx`. `account/orders/[orderNumber]` detail has `status`, `deliveredAt`, `items[]` (id, productSlug, variant, `alreadyReturnedQty`). `return-request-modal.tsx` is the RHF+Modal+useToast+`useMutation` pattern to mirror.
- **Infra**: `node-cron` in `index.ts` (Asia/Kolkata; e.g. abandoned-cart every 15m) + `x-cron-secret` HTTP endpoints. WhatsApp via `whatsapp.service.ts` (Meta-approved templates, soft-fail). Email via Resend (`config/resend.ts`, inline HTML; `abandoned-cart-job.ts` is the pattern). `deliveredAt` set on all DELIVERED transitions incl. Shiprocket sync.

## Flags (resolve during build)

1. **BUG — dead hook**: storefront `use-reviews.ts` calls `/products/:id/reviews` (GET+POST); real API is `GET /reviews/products/:id` + `POST /reviews` (productId in body). Fix the hook in P4.
2. **Photo upload is admin-only** (`upload.routes.ts` → `authorize(ADMIN…)`). Customer review photos need a new authenticated endpoint (`POST /reviews/image`) reusing `upload.service.ts` (Cloudflare Images). P4.
3. **WhatsApp template** for the review request must be created + Meta-approved (`earth_revibe_review_request`, params: name, order#, link). Until approved, the **email** reminder still works. **User action** in Meta Business Manager. P5.
4. **Migration without a local dev DB**: this env has no `DATABASE_URL`. The P1 migration will be additive (`ALTER TABLE … ADD COLUMN`), authored via `prisma migrate diff` (or hand-written matching Prisma's format), committed alongside the schema change, and applied to prod by Railway `migrate deploy` on deploy. Never `db:push`.

## Slices

### P3 — PDP display upgrade (FIRST; no backend change)
`product-reviews.tsx`:
- **Clickable ratings histogram** (Baymard's most-used element): bars from `ratingBreakdown`; clicking a star filters the shown reviews (client-side over embedded written reviews for now; server-side star filter added in P2 when volume warrants).
- **Sort control** (Most recent default; Highest; Lowest — "Most helpful" once `helpfulCount` exists).
- **Verified Buyer** badge (already wired via `isVerified`).
- **Show negatives** (already shows all written reviews; keep, don't hide low stars).
- **Honest empty state** ("No reviews yet — be the first") instead of rendering nothing.
- **Conditional blocks** for fit summary + photos that stay dormant until P1/P4 add the data.
Ship on `feat/product-reviews`.

### P0 — Shared (for collection)
- `enums`: `ReviewFit = RUNS_SMALL | TRUE_TO_SIZE | RUNS_LARGE`.
- `createReviewSchema`: add `fit?`, `sizePurchased?`, `reviewerHeight?`, `photos?: string[].max(5)`.
- Types: extend `Review` (`fit`, `sizePurchased`, `reviewerHeight`, `photos`, `helpfulCount`); add `Product.fitBreakdown?`.

### P1 — DB migration (additive)
`Review`: `+ fit ReviewFit?`, `+ sizePurchased String?`, `+ reviewerHeight String?`, `+ photos String[] @default([])`, `+ helpfulCount Int @default(0)`. New enum `ReviewFit`. `pnpm db:generate`. Migration committed with schema; Railway applies.

### P2 — API
- `createReview`: persist new fields.
- `getProductBySlug`: add `fitBreakdown` (counts → "% true to size"); include new fields in the `reviews` projection.
- `listApprovedByProduct`: optional `rating` + `withPhotos` + `sort` filters; return new fields. (Powers server-side histogram filter at volume.)

### P4 — Collection (storefront)
- **Fix** `use-reviews.ts` paths (`GET /reviews/products/:id`, `POST /reviews` with productId in body).
- **Review submit modal** (mirror return modal): rating picker, optional title/content, **fit** (runs small/true/large), **size purchased**, optional **height**, **photo upload** (1-5). Entry: per delivered item on `account/orders/[orderNumber]` (gated `status==='DELIVERED'`, not already reviewed). On success invalidate product + reviews queries.
- **`POST /reviews/image`**: new authenticated upload endpoint → Cloudflare Images.

### P5 — Post-delivery request (cron)
- `jobs/review-request-job.ts` + daily `cron.schedule('0 10 * * *', …, Asia/Kolkata)` in `index.ts`:
  - **Day 4**: orders DELIVERED ~4d ago, no review for their items, no open return → WhatsApp request (new template) with deep link to the order's review entry. Stamp `reviewRequestedAt`.
  - **Day 8**: still no review → Resend email reminder (inline HTML, order items + link). Stamp `reviewReminderAt`.
  - (Needs 2 nullable `Order` timestamps: `reviewRequestedAt?`, `reviewReminderAt?` — fold into P1 migration.)
- No incentive.

### P6 — SEO schema
- `Review` + `AggregateRating` JSON-LD on the PDP (the `schema` skill), emitted **only when real approved reviews exist**.

## Risks
- Migration relaxes nothing/additive → low risk; verify on prod via `migrate deploy`.
- WhatsApp template approval is external + gating for the WhatsApp leg (email leg unaffected).
- Don't emit review JSON-LD without real reviews (Google guideline + honesty).

## Verification
- `pnpm --filter @earth-revibe/shared build`, `pnpm db:generate`, `pnpm lint` across api/storefront.
- API: submit a review for a delivered order → `isVerified` true, `isApproved` false, appears after admin approve; `getProductBySlug` aggregates + `fitBreakdown` correct.
- UI (Claude-in-Chrome): PDP histogram filter + empty state; review modal submits fit/photo; admin approve flips it live; cron dry-run finds the right orders.
