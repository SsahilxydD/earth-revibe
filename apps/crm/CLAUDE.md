# CRM — apps/crm

Next.js 15 App Router · React 19 · Tailwind 4 · port 3004.
Customer-engagement frontend on the same API as `apps/admin`. Lift-and-shift target for WhatsApp campaigns, abandoned-cart recovery, customer 360, broadcasts, inbound inbox, template A/B testing.

PRD: `docs/plans/2026-05-05-crm-app-prd.md`. Read that for the full migration plan (5 PRs, V1 = lift-and-shift, V3+ = new features).

## Structure

src/
app/
(crm)/ # all auth-protected routes
dashboard/ # placeholder until features migrate
customers/ # searchable list — moves to 360 timeline in PR 5
layout.tsx # AuthGuard + sidebar + topbar
login/ # public, mirrors admin's login
layout.tsx # root provider stack (QueryProvider + ToastContainer)
components/layout/ # sidebar, topbar, auth-guard, crm-layout
hooks/ # TanStack Query hooks against admin endpoints
lib/ # api-client (cookie-based, same JWT as admin), query-client
providers/ # QueryProvider
stores/ # zustand: auth-store, ui-store

## Patterns

- **Server Components by default** — `"use client"` only when interactivity is needed
- **API client:** `apps/crm/src/lib/api-client.ts` — identical pattern to admin. Same `credentials: 'include'`, same `/auth/refresh` rotation, same proactive-refresh interval. Don't fork.
- **Auth:** shared with admin via cookie on the API origin. Logging in on either app authenticates the other automatically (same browser, same `*.vercel.app` PSL, same API origin).
- **State:** Zustand for client/UI state, TanStack Query for all server state — same conventions as admin.
- **Forms:** react-hook-form + Zod resolver, schemas from `@earth-revibe/shared`.
- **UI primitives:** import from `@earth-revibe/ui` (extracted in PR 1, commit `90a313f`). Don't re-create primitives locally.
- **Icons:** `lucide-react` only.
- **API URL:** browser-side fetches go to `/api/v1` and Vercel rewrites them to Railway (see `next.config.mjs`). This avoids CORS preflight on every request. Server-side fetches use `NEXT_PUBLIC_API_URL`.

## Design tokens

`globals.css` mirrors admin's tokens (Tailwind 4 `@theme` block) so primitives from `@earth-revibe/ui` render identically across both apps. If admin's tokens change, mirror them here in the same commit.

## Sidebar

`src/components/layout/sidebar.tsx` is the source of truth for nav. Disabled entries (`disabled: true`) render dimmed with a `soon` badge — they unlock as features migrate or land. Order matches the PRD's IA.

## Migration sequence (PRD §6)

1. ✅ PR 1 — Extract `packages/ui` from admin (merged: `90a313f`)
2. → PR 2 — Scaffold (this commit)
3. PR 3 — Move `abandoned-carts` from admin
4. PR 4 — Move `whatsapp-broadcast` + `trip-opening-broadcast` from admin
5. PR 5+ — New features (customer 360, inbox, escalation rules, A/B templates)

## Don't

- Don't re-create UI primitives in `apps/crm` — use `@earth-revibe/ui`
- Don't cross-import from `apps/admin` — code reuse goes through `packages/`
- Don't add new API endpoints for V1 work — CRM uses existing admin-gated endpoints (`/api/v1/admin/*`)
- Don't deep-link admin → CRM with hard-coded URLs — use `NEXT_PUBLIC_CRM_URL`
