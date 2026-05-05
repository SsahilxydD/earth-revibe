# Earth Revibe CRM — Product Requirements Document

**Date:** 2026-05-05
**Status:** Approved — open questions resolved 2026-05-05
**Author:** Sahil + Claude
**Target:** First production release of `apps/crm`

---

## 1. Executive Summary

Spin up `apps/crm` as a sibling Next.js app to `apps/admin`, dedicated to customer-facing engagement workflows: WhatsApp campaigns, abandoned cart recovery, customer 360 timelines, and broadcast tooling. Move existing customer-engagement features out of `apps/admin` so admin can stay focused on operations (inventory, orders, fulfillment, blog). Share the API, the auth cookie (already set on the API origin), and a new `packages/ui` for design primitives so the two apps don't drift.

The migration is sequenced as 4 backwards-compatible PRs (extract UI package → scaffold CRM → move pages → build new features), each independently shippable and revertable. No database migrations are required for the lift-and-shift; new tables only land when we begin Phase 3 (inbound message inbox).

---

## 2. Why Now

The admin sidebar currently has 19 entries and is starting to feel like a kitchen sink. Several of those entries — **Abandoned Carts**, **WhatsApp Broadcast**, **Trip Opening Broadcast**, parts of **Notifications** and **Customers** — are fundamentally about _engaging_ customers, not _managing operations_. The mental model breaks: an ops person opening admin to fulfill orders gets visual noise from marketing tooling, and a marketing person looking at campaign performance has to navigate past products and inventory to get there.

Three forcing functions:

- We just shipped reliable WhatsApp infrastructure (delivery webhook, retry semantics, message audit log). The natural next step is _using_ that data — building cohorts, escalation rules, conversion funnels — and that work would more than double the admin sidebar.
- The team will likely grow: marketing folks shouldn't need to see fulfillment tooling, and ops folks shouldn't need to see broadcast-send buttons that could accidentally blast 2,000 recipients.
- The architecture already supports it. Earth Revibe runs `trip-form` and `try-on-guide` as standalone Next.js apps mounted on separate Vercel projects. CRM follows the same pattern, no new infrastructure pattern to invent.

---

## 3. Goals and Non-Goals

### Goals

- **G1.** Reduce admin sidebar entries from 19 → ~12 by relocating customer-engagement features.
- **G2.** Build a single source of truth for customer engagement: every WhatsApp message, every cart event, every loyalty action visible from one timeline view per customer.
- **G3.** Unblock customer-engagement features that would worsen admin's clutter problem (inbound inbox, escalation rules, A/B template testing, campaign analytics).
- **G4.** Keep admin and CRM in lockstep on shared UI/UX so users don't have to learn two design systems.
- **G5.** Land the migration with zero regressions to existing functionality. Every moved page must behave identically to its admin counterpart on day one.

### Non-Goals

- **NG1.** Not rebuilding any feature during the move. Pages get lifted-and-shifted; iteration happens after.
- **NG2.** Not rebuilding auth. Both apps share the API's existing JWT cookie pattern.
- **NG3.** Not introducing role-based access beyond what's already in the API (`ADMIN`, `SUPER_ADMIN`). Granular CRM-only roles can wait until there's a marketing team that doesn't have ops access.
- **NG4.** Not rebuilding the API. CRM is a frontend on existing endpoints. New endpoints land only as new features require them.
- **NG5.** Not breaking the admin app at any point during the migration. Each PR is shippable on its own; admin keeps working until a feature is fully relocated.
- **NG6.** Not building a multi-channel CRM (email, SMS, push). Stay focused on WhatsApp + in-app for V1.

---

## 4. Personas and Jobs to be Done

### P1: Operations team (admin app users)

**Job:** Fulfill orders, manage inventory, handle returns, publish blog posts, configure shipping zones. Operations use admin app exclusively.

### P2: Brand owner / strategy

**Job:** See revenue, conversion, and engagement at a glance. Toggle between admin (ops health) and CRM (customer health) as needed. Is the only persona who legitimately spans both apps daily.

### P3: Marketing / engagement

**Job:** Run abandoned-cart recovery, broadcast announcements, monitor delivery+read rates, respond to inbound WhatsApp questions. Lives in CRM. Should never need to touch admin.

### P4: Support staff (future)

**Job:** Respond to inbound customer questions, look up customer history. Lives mostly in CRM with occasional admin lookups (e.g., "edit this address").

For V1, P2 and P3 are the same person. The split matters as the team grows.

---

## 5. Architecture

### 5.1 Repository layout

```
apps/
  storefront        Next 15 — earthrevibe.com
  admin             Next 15 — admin.vercel.app — ops/inventory/orders/blog
  crm               Next 15 — NEW — crm.vercel.app — customer engagement
  api               Express 5 — Railway
  admin-mobile      React Native — Expo
  trip-form         Next 15 — earthrevibe.info
  try-on-guide      Next 15
packages/
  shared            Zod schemas, enums, types
  db                Prisma client + schema (api-only)
  tsconfig          Shared tsconfig base
  ui                NEW — extracted shared design primitives
                    (Button, Input, Card, Modal, Toast, Skeleton, Badge,
                     Select, Textarea, Spinner)
```

CRM and admin are siblings with no cross-app imports. Code reuse goes through `packages/ui` and `packages/shared`. This matches the existing monorepo discipline (no app imports another app's code).

### 5.2 Why a separate Next.js app rather than a route group inside admin

Considered three alternatives:

- **Route group (`app/(crm)/...` inside admin):** Doesn't actually solve the bloat — the same codebase, the same deployment, the same sidebar can-of-worms problem one menu deeper.
- **Multi-zones / Next.js middleware-based routing:** Two apps wearing one trench coat. Configuration complexity, deployment complexity, no real benefit over independent apps.
- **Dedicated `apps/crm`:** Clean separation, independent deploy, smaller bundle per surface, follows existing pattern. Higher upfront cost (scaffold a new Next app) but pays back from the first week.

Decision: dedicated app.

### 5.3 Authentication

Already solved. The API sets the refresh-token cookie scoped to its own origin (`earth-revibeapi-production.up.railway.app`) with `SameSite=None; Secure; HttpOnly`. Admin and CRM both call the same API with `credentials: 'include'`. The browser stores one cookie against one origin (the API), and sends it to the API regardless of which frontend initiated the request.

Concrete consequences:

- A user logging into admin is instantly logged in on CRM, and vice versa.
- No `Domain=.earthrevibe.com` cookie sharing needed (Vercel's `*.vercel.app` is on the Public Suffix List, which would block such cookies anyway).
- CORS in `apps/api/src/app.ts` already accepts `*.vercel.app`, so a new CRM Vercel project gets allowed without API changes.
- Each app gets its own `/login` route, but both POST to the same `/api/v1/auth/login` endpoint and reuse the same JWT.

### 5.4 Data model

**V1 (lift-and-shift): zero new tables.** Everything CRM needs already exists in the schema:

- `User` — customer profile
- `Order`, `OrderItem`, `OrderStatusHistory`, `Payment` — purchase history
- `Cart`, `CartItem` — active carts
- `GuestAbandonedCart` — guest pre-checkout carts
- `WhatsAppMessageEvent` — outbound message delivery audit log (built last week)
- `LoyaltyTransaction`, `LoyaltyRedemption` — points history
- `Notification` — in-app notification log
- `Wishlist` — wishlist items per user
- `SupportTicket`, `TicketMessage` — support history
- `Review` — review history

**V3+ (new features) tables:**

- `WhatsAppInboundMessage` — landed when we wire the inbound message handler. Schema: `id`, `messageId` (Meta's), `fromWaId`, `userId` (nullable, soft-mapped), `messageType`, `text`, `mediaUrl?`, `repliedTo?` (foreign key to WhatsAppMessageEvent if it's a reply to one of our outbound messages), `rawPayload`, `receivedAt`.
- `EngagementRule` — escalation ladder configuration. Schema: `id`, `name`, `trigger` (e.g. `cart_abandoned_read_no_purchase`), `delayHours`, `actionType` (e.g. `send_template`, `send_email`, `flag_for_manual_outreach`), `actionPayload` Json, `isActive`, `createdAt`, `updatedAt`. Initially admin-editable via a CRM page; can graduate to a no-code rule builder later.
- `CustomerSegment` — saved cohort definitions. Schema: `id`, `name`, `definition` Json (a Zod-validated query DSL), `lastEvaluatedAt`, `memberCount`. Used for broadcast targeting and dashboard filters.

Each new table lands in its own Phase PR with a Prisma migration.

### 5.5 API surface

**V1: zero new endpoints.** CRM hits the existing admin endpoints (`/api/v1/admin/*`). They're already auth-gated by `authenticate + authorize(ADMIN, SUPER_ADMIN)` middleware in the routers — that gate is correct for CRM users too.

**V2: customer 360.** One new endpoint:

- `GET /api/v1/admin/customers/:id/timeline` — unified timeline across orders, WhatsApp events, loyalty transactions, support tickets, reviews, wishlist activity. Cursor-paginated by event timestamp. Returns a discriminated union of event types.

**V3+: as features land.** Inbound webhook handler (extends existing `/api/v1/webhooks/whatsapp`). New endpoints for engagement rules CRUD, segment evaluation, etc.

### 5.6 Routing / URL convention

CRM uses `app/` router (Next.js 15 App Router), same as admin. URL structure:

```
/                                redirect to /dashboard
/login                           public
/dashboard                       overview: outstanding inbound, pending sweeps, key metrics
/customers                       searchable customer list
/customers/[id]                  customer 360 timeline
/abandoned-carts                 (moved from admin)
/broadcasts                      (moved from admin/whatsapp-broadcast)
/broadcasts/trip-opening         (moved from admin/trip-opening-broadcast)
/inbox                           V3 — inbound messages
/rules                           V4 — engagement rules
/segments                        V5 — saved cohorts
/templates                       V5 — template performance dashboard
/settings                        CRM-specific settings (broadcast caps, escalation defaults)
```

Admin's deep links into CRM use `process.env.NEXT_PUBLIC_CRM_URL` (set per-environment) as the origin so no hard-coded domain leaks.

---

## 6. Migration Plan

Five backwards-compatible PRs. Each is independently shippable. None touch the API in V1.

### PR 1: Extract `packages/ui` from admin

**Scope:** Move `apps/admin/src/components/ui/*` → `packages/ui/src/*`. Add a `package.json` (`name: "@earth-revibe/ui"`, type module, exports map). Wire `apps/admin/package.json` to depend on `workspace:*`. Replace admin imports of `@/components/ui` with `@earth-revibe/ui`. No behavioral change.

**Files to move (10):** `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `index.ts`, `input.tsx`, `modal.tsx`, `select.tsx`, `skeleton.tsx`, `spinner.tsx`, `textarea.tsx`, `toast.tsx`.

**Risk:** Tailwind classes inside primitives reference admin's `tailwind.config.ts` color tokens (`bg-charcoal`, `bg-accent`, etc.). The package needs its own neutral classes OR the consuming app needs to extend Tailwind with the same tokens. **Resolution:** declare token names as CSS custom properties at the app layout level; primitives use `var(--accent)`-style classes. This keeps tokens themeable per-app without forking primitives.

**QA:** Admin must look pixel-identical before and after. Manual smoke test of: dashboard render, products list, abandoned carts page, modals on loyalty redemptions, toast on any mutation.

**Rollback:** Revert the PR. Admin's components/ui still exists under git history; restoring is one revert.

### PR 2: Scaffold `apps/crm`

**Scope:** New Next.js 15 app at `apps/crm`. Auth-guarded layout. Login page (mirror of admin's). Dashboard with placeholder. Customer search page (one screen, validates the auth loop end-to-end before we move complex pages).

**Files to create:** `apps/crm/{package.json, next.config.ts, tailwind.config.ts, postcss.config.js, tsconfig.json}`, `apps/crm/src/app/{layout.tsx, page.tsx, (crm)/dashboard/page.tsx, login/page.tsx}`, `apps/crm/src/components/layout/{sidebar.tsx, topbar.tsx, auth-guard.tsx}`, `apps/crm/src/lib/api-client.ts` (copied from admin, identical behavior), `apps/crm/src/providers/*`.

**Risk:** Vercel preview deploys land on auto-generated `*.vercel.app` URLs. CORS already handles those. But the first preview deploy is a good test that auth works end-to-end before we move real pages.

**QA:**

- Log in on admin → open CRM in same browser → expect to be already authenticated.
- Log out on admin → CRM should redirect to its `/login`.
- Log in on CRM → admin should be authenticated too.
- Login flow on CRM should accept the same email/password as admin.

**Rollback:** Delete the Vercel project, delete the `apps/crm` directory.

### PR 3: Move abandoned-carts page

**Scope:** Move `apps/admin/src/app/(admin)/abandoned-carts/page.tsx` and `apps/admin/src/hooks/use-abandoned-carts.ts` to CRM. Delete from admin. Add a redirect at the old admin URL pointing to the new CRM URL. Update admin sidebar to remove the entry. Update admin dashboard widgets that link to abandoned carts (if any) to point at the CRM URL via `NEXT_PUBLIC_CRM_URL`.

**Risk:** A user with admin's `/abandoned-carts` URL bookmarked needs a clean redirect. Implement via `next.config.ts` redirects array, not middleware (faster, cached). Bookmarks should redirect with 301.

**QA:**

- Visit `https://admin.vercel.app/abandoned-carts` → 301 to `https://crm.vercel.app/abandoned-carts`.
- All four buttons on the page still work: Run sweep now, Send recovery, Resend, pagination.
- Search by email/phone still works.
- Stats cards populate.
- Sidebar in CRM has a clear active state for this entry.

**Rollback:** Revert the move. The page still exists under admin in git history. Sidebar entry restoration is one line.

### PR 4: Move broadcasts pages

**Scope:** Move `apps/admin/src/app/(admin)/whatsapp-broadcast/*` and `apps/admin/src/app/(admin)/trip-opening-broadcast/*` to CRM. Delete from admin. Redirect old URLs.

**Risk:** Trip-opening broadcast is closely related to the Travel Applications page (which stays in admin — it's both ops and engagement, but more on the ops side). Need a deep link from admin's travel-applications page to CRM's trip-opening broadcast page. Same `NEXT_PUBLIC_CRM_URL` pattern.

**QA:** Same shape as PR 3.

**Rollback:** Same shape as PR 3.

### PR 5+: New CRM features (incremental, one feature per PR)

After PR 4 ships and stabilizes, build new features one at a time. Recommended order based on impact:

- **PR 5:** Customer 360 timeline (`/customers/:id`). Read-only timeline + downloadable JSON export. Events: orders, WhatsApp delivery/read/reply, loyalty transactions, support tickets, reviews, wishlist add/remove. Backend: one new cursor-paginated endpoint that unions all event sources by timestamp. Frontend: chronological feed with type filter chips.
- **PR 6:** Inbound message handler. Backend: extend webhook handler, new `WhatsAppInboundMessage` table + migration. Frontend: `/inbox` page.
- **PR 7:** Read-receipt escalation rules. Backend: cron + `EngagementRule` table. Frontend: `/rules` editor.
- **PR 8:** Template performance dashboard with **A/B variants**. Each template definition can declare N body-text variants with weighted allocation. The send helpers (`sendWhatsAppAbandonedCart`, `sendWhatsAppOrderUpdate`, etc.) pick a variant per send and tag the resulting `WhatsAppMessageEvent` row with `variantKey`. The dashboard shows funnel metrics per variant: sent → delivered → read → click → purchase, with a chi-squared significance check at p<0.05. Backend: extend `WhatsAppMessageEvent` schema with a `variantKey` column + add a `WhatsAppTemplateVariant` table for the variants themselves. Frontend: variant editor + funnel charts. Larger PR than originally scoped — split into PR 8a (variant infra + tagging) and PR 8b (dashboard) if it grows past two weeks of work.
- **PR 9:** Customer segments. Backend: `CustomerSegment` table + evaluation cron. Frontend: `/segments`.
- **PR 10:** Back-in-stock WhatsApp alerts. Backend: hook into stock update, new template registration.

Each is its own PRD section in a follow-up doc; this PRD only ratifies the move and the V1 scope.

---

## 7. UI / UX Principles

- **Customer-centric.** Everything in CRM starts from a customer or a cohort. Admin's product-centric model (here are 200 SKUs, manage them) doesn't apply. The hub is the customer 360.
- **Time-based timelines.** Customer 360 is fundamentally a chronological feed. Same idiom as Stripe's customer page or Front's contact page.
- **Empty-state-first design.** Every page must have a useful empty state — no abandoned carts, no inbound messages, no segments yet. The empty state should explain what shows up here when data exists, not just "no data."
- **Outreach actions are confirmable, irreversible actions (broadcasts) double-confirmable.** A misclick that blasts 250 customers in WhatsApp is worse than a misclick that opens a wrong modal. Mirror the trip-application-receipts confirmation pattern already in admin.
- **Match admin's design language exactly.** Through `packages/ui`. CRM has a different domain but shouldn't feel like a different product.
- **Mobile-responsive but desktop-first.** CRM users mostly use this on a laptop. Mobile breakpoints exist for emergency lookups but aren't the optimization target.

---

## 8. Cross-App Integration

Both apps need to deep-link to each other. Convention:

- **Admin → CRM:** any time admin shows a customer or an order with an associated user, render an "View customer engagement →" link to `${NEXT_PUBLIC_CRM_URL}/customers/${userId}`. Admin's existing `/customers/:id` page can stay (basic info, address book, suspend toggle) but adds this link to the header.
- **CRM → Admin:** customer 360 has an "Open in admin →" link for each order, pointing to admin's `/orders/:orderNumber`. Each broadcast row in CRM links to the underlying template definition in admin if relevant.

Both apps read the other's URL from environment:

- `apps/admin` gets `NEXT_PUBLIC_CRM_URL` (e.g. `https://earth-revibe-crm.vercel.app`)
- `apps/crm` gets `NEXT_PUBLIC_ADMIN_URL` (e.g. `https://earth-revibe-admin-nine.vercel.app`)

Set in Vercel project settings, mirrored in `.env.example` for local dev.

---

## 9. Testing and QA Strategy

This is what "no errors or bugs" reduces to operationally. Each PR ships with the following gates:

### 9.1 Per-PR gates (mandatory before merge)

- **Type check:** `pnpm tsc --noEmit` on api, admin, and crm. Zero errors.
- **Lint:** `pnpm lint`. Zero new errors. Pre-existing warnings allowed.
- **Build:** `pnpm build` for every changed app. CI fails if any app's build fails.
- **Unit tests:** `pnpm test` on api. Failures block merge.
- **Manual smoke test list** documented in the PR description. Author runs through it locally before requesting review. Reviewer runs through it on Vercel preview before approving.

### 9.2 Smoke test checklists

#### PR 1 (extract packages/ui)

1. Open admin dashboard. Stats cards render, no console errors.
2. Navigate to Products. Table renders. Edit a product, modal opens, fields visible, save closes modal.
3. Navigate to Loyalty Redemptions. Create modal opens. Submit, success toast.
4. Navigate to Abandoned Carts (still in admin pre-PR-3). Stats cards, search, "Run sweep now", "Send" buttons all visible and clickable.
5. Logout. Login flow works.

#### PR 2 (scaffold CRM)

1. Visit CRM `/` while logged out → redirect to `/login`.
2. Login with admin credentials → redirect to `/dashboard`.
3. Logout in admin → CRM `/dashboard` shows redirect to `/login` on next request.
4. Login in CRM → admin accepts the session without re-login.
5. Sidebar shows CRM-specific entries (no products, no inventory).

#### PR 3 (move abandoned-carts)

1. CRM `/abandoned-carts` renders identically to admin's pre-move version.
2. All four user actions work: Run sweep, Send, Resend, pagination.
3. Stats numbers match a direct DB query (`SELECT count(*) FROM carts WHERE …` etc.).
4. Old admin URL `https://admin.vercel.app/abandoned-carts` 301s to CRM.
5. Admin sidebar no longer has Abandoned Carts entry.
6. Production logs show no 404s on the old admin URL after a few minutes (test by hitting it once).

#### PR 4 (move broadcasts)

Same shape as PR 3.

### 9.3 Cross-cutting tests we should add

- **E2E auth test (Playwright or similar):** scripted login flow that hits both apps. Initially manual; automated in PR 5+ if flake increases.
- **Visual regression (eventual):** screenshot baseline of admin pre-and-post `packages/ui` extraction. Manual diff-by-eye in PR 1; could automate later.
- **API contract tests:** existing api tests cover the endpoints CRM uses. No new test files for V1.

### 9.4 What we're explicitly NOT doing for V1

- No load testing. Traffic to CRM will be low (single-digit concurrent users from the team).
- No accessibility audit. Defer until product is stable; CRM is internal-only and not exposed to customers.
- No localization. All copy in English; the team is English-speaking.

---

## 10. Observability and Error Handling

- **Sentry:** wire `apps/crm` with the same Sentry DSN as admin (or a separate project; recommended: same project, tagged `app=crm`). Source maps uploaded on Vercel build.
- **Error boundaries:** every page wrapped in a Next.js `error.tsx` that renders a friendly fallback + reports to Sentry. Same pattern admin uses.
- **Loading states:** every async-data page uses Skeleton primitives during load. Never show a flash of empty content.
- **Toast for every mutation:** success and failure both surface a toast. Failure toast includes the API error message.
- **PostHog:** capture page views and key actions (sweep run, broadcast sent, recovery resent). Same instance as admin, tagged `app=crm`.
- **API errors:** the existing `{ success: false, error: { code, message } }` envelope is preserved. CRM's `api-client.ts` reads `error.message` for toast text.

---

## 11. Security and Privacy

- **Auth:** unchanged from admin. Same JWT cookie, same expiry, same refresh flow.
- **Authz:** unchanged. Both apps require `ADMIN` or `SUPER_ADMIN` role. CRM-only role can be added later but is not in V1 scope.
- **PII handling:** CRM displays customer email + phone. Both are already visible to admin role; no change to who-sees-what. Customer 360 may surface raw WhatsApp message bodies (which can contain PII the customer typed); same exposure as the Meta dashboard, no expansion.
- **Audit log:** any outreach action (Send recovery, Run sweep, Send broadcast) writes to `Notification` (existing table) with actor user id. Existing pattern, no new infra.
- **Rate limit per admin user:** existing per-IP rate limit on the API applies. No new per-user rate limit in V1, but flagged as risk if someone misuses broadcast send.
- **Data export (DPDP / GDPR):** customer 360 has a "Download timeline" button (V1 scope). Returns the same data as the timeline endpoint, in JSON. CSV later if requested.
- **Secrets:** no new secrets in V1. New CRM Vercel project gets its own minimal env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ADMIN_URL`, `SENTRY_DSN`, `POSTHOG_API_KEY`, `POSTHOG_HOST`. No backend secrets.

---

## 12. Performance and Scale

- **Page load:** target <2s LCP on a 4G connection from India (PoP: Mumbai). Same target as admin. CRM is internal-only, so we don't need the storefront's <1s budget.
- **API response time:** existing endpoints are already used by admin; CRM doesn't change their SLA. The new customer 360 endpoint (V2) has a stricter target: <500ms p95 even for customers with 1,000+ events. Pagination + DB indexes handle this.
- **Bundle size:** initial CRM bundle target <300 KB gzipped. Reuse `packages/ui` and `packages/shared` aggressively. No heavy chart libraries in V1; recharts can stay in admin.
- **Concurrency on broadcast sends:** the existing 250-per-2h limit on broadcast service is preserved. The mutex on abandoned-cart sweep is preserved.

---

## 13. Risks and Mitigations

| Risk                                                                   | Likelihood            | Impact           | Mitigation                                                                                                                                                            |
| ---------------------------------------------------------------------- | --------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui` extraction breaks admin styling                          | Medium                | High             | Token-based CSS variables; manual visual smoke test before merge. Rollback in 1 revert.                                                                               |
| Auth cookie not attached cross-app                                     | Low                   | High             | API CORS already accepts `*.vercel.app`. Verified by PR 2 smoke test before any pages move.                                                                           |
| Old admin URLs break user bookmarks                                    | Medium                | Medium           | 301 redirects via `next.config.ts` for every moved route. Logged 30 days; if any 404s appear we add more redirects.                                                   |
| Component drift between admin and CRM after extraction                 | Medium                | Medium           | Strict policy: no app-local UI primitives once extracted. Lint rule (eslint custom rule or grep) to detect imports of `./components/ui/button` post-PR-1.             |
| Vercel project misconfigured (env vars, build settings)                | Medium                | Low              | Document env requirements in PR 2. Use Vercel project import via JSON if available.                                                                                   |
| Customer 360 timeline endpoint slow on heavy customers                 | Low                   | Medium           | Cursor pagination from day one. DB indexes on `WhatsAppMessageEvent.eventAt`, `Order.createdAt` (already exist). p95 budget enforced via Sentry transaction sampling. |
| Inbound webhook handler (V3) introduces duplicate-event bugs           | Medium                | Medium           | Add `@@unique([messageId])` constraint when we add the inbound table. Idempotent insert with `onConflict do nothing`.                                                 |
| Team forgets which app a feature lives in                              | Low                   | Low              | Document in `apps/{admin,crm}/CLAUDE.md`. Sidebar entries are obvious; URL convention reinforces.                                                                     |
| Sentry / PostHog quota doubles                                         | Low                   | Low              | Tag events with `app=crm` so we can budget separately. Monitor for the first month.                                                                                   |
| Marketing-team user accidentally accesses ops in admin                 | Low (V1: same person) | Medium (V2+)     | Add `MARKETING` role in API, gate admin routes; CRM-only role gates ops. Out of V1 scope; flagged for V2 if team grows.                                               |
| Public Suffix List bug or browser change breaks `*.vercel.app` cookies | Very low              | High (auth dies) | Mitigated by API-domain cookie pattern (cookie lives on Railway, not Vercel). Already the design.                                                                     |

---

## 14. Success Metrics

- **Launch criteria (V1, after PR 4):** admin sidebar entries reduced from 19 → 13 (six entries moved or consolidated). Zero regressions reported in first 7 days. Both apps deploy cleanly from Vercel preview to production.
- **Adoption (V1+30 days):** the brand-owner persona uses CRM ≥ 3× per week (rough proxy: PostHog session count). Abandoned-cart recovery actions per week unchanged or higher than pre-move (proves the move didn't make engagement work harder).
- **V2+ (per-feature):** measured against the lever each feature pulls. E.g., read-receipt escalation: target +15% recovery on read-but-not-purchased cohort within 60 days of launch. Defined in each phase's PRD.

---

## 15. Rollout Plan

- **PR 1 → main:** ship to production immediately. No user-facing change.
- **PR 2 → main:** deploy CRM to production immediately on a Vercel preview URL (no DNS yet). Smoke test from team accounts. After 48h with no issues, mark as the canonical CRM URL in `NEXT_PUBLIC_CRM_URL`.
- **PR 3 → main:** ship Friday afternoon (lowest-traffic window). Watch Sentry and Railway logs for the next 24h. If anything regresses, revert PR 3 only — earlier PRs stay.
- **PR 4 → main:** ship after PR 3 has been stable for 3 days.
- **PR 5+ (new features):** standard cadence. Each goes behind a feature flag (`NEXT_PUBLIC_FEATURE_<name>`) for the first week so we can disable per-deploy if needed.

**Rollback procedure for any PR:** `git revert <sha> && git push`. CI redeploys both apps within 5 minutes. Database migrations (V3+) use Prisma's `prisma migrate down` if reversible, otherwise a forward-fix migration. No PR in V1 (PRs 1–4) introduces a migration, so rollback is trivial.

**Feature flag convention:** use environment variables, not a flag service. Vercel's per-environment config is enough; we don't have the volume to justify LaunchDarkly.

---

## 16. Decisions (resolved 2026-05-05)

1. **Naming.** App name is `crm`. Workspace package: `@earth-revibe/crm`.

2. **Vercel project.** New Vercel project will be created under the existing Sahil account during PR 2.

3. **CRM URL in V1.** Auto-generated `*.vercel.app` (matching admin's current pattern). Custom domain (`crm.earthrevibe.com`) deferred — purely cosmetic, no functional impact, can swap whenever.

4. **Customer 360 scope.** Full scope from PR 5: order history, WhatsApp event history (delivery + read + reply), loyalty transactions, support tickets, reviews, wishlist activity. Login history excluded (low value, high noise). All on a single chronological timeline with type filters.

5. **Customer pages — both apps have them, with different jobs.**
   - **Admin `/customers`:** moderation tooling — suspend account, change role, edit address book, see basic profile. Stays in admin.
   - **CRM `/customers` + `/customers/:id`:** engagement tooling — searchable customer list with engagement metrics (last seen, last message, lifetime spend), and the full 360 timeline. Built fresh in PR 2 (list page, basic) + PR 5 (timeline).
   - Both apps cross-link: admin's customer page has a "View engagement →" button to CRM; CRM's 360 has an "Edit profile / suspend →" link to admin.

6. **A/B testing in templates page.** PR 8 includes A/B variants from day one. Each template can have N variants with weighted allocation; we measure delivery rate, read rate, click rate, and downstream conversion per variant. Statistical significance check shown on the dashboard. Adds ~2 days to PR 8 scope vs measurement-only; flagged for revisit if PR 8 starts feeling too big.

7. **Permission split (CRM-only role).** Defer. Both apps continue to require `ADMIN` or `SUPER_ADMIN`. Revisit when team grows beyond Sahil. Adding the role later is a one-line API change + an authorization middleware update; cost of waiting is near-zero, cost of adding now is one extra abstraction nobody uses yet.

---

## 17. Appendix: PR Sequence Recap

| PR  | Scope                                                     | LOC est.                        | Risk   | Touches API? |
| --- | --------------------------------------------------------- | ------------------------------- | ------ | ------------ |
| 1   | Extract `packages/ui`                                     | ~600                            | Low    | No           |
| 2   | Scaffold `apps/crm` (login + dashboard + customer search) | ~1,200                          | Low    | No           |
| 3   | Move abandoned-carts page                                 | ~50 net (delete + add redirect) | Low    | No           |
| 4   | Move broadcasts pages                                     | ~100 net                        | Low    | No           |
| 5   | Customer 360 timeline                                     | ~800 + 1 endpoint               | Medium | Yes          |
| 6   | Inbound message handler + inbox                           | ~600 + migration                | Medium | Yes          |
| 7   | Engagement rules engine                                   | ~1,000 + migration              | High   | Yes          |
| 8   | Template performance dashboard with A/B variants          | ~1,000 + migration              | Medium | Yes          |
| 9   | Customer segments                                         | ~800 + migration                | Medium | Yes          |
| 10  | Back-in-stock WhatsApp alerts                             | ~300                            | Low    | Yes          |

PRs 1–4 are the "move." PRs 5+ are the "iterate." This PRD primarily ratifies 1–4. Each later PR gets its own short PRD before implementation.

---

_End of PRD. Reviewers: please leave comments inline. Open questions in section 16 are blockers for PR 1._
