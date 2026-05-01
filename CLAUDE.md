# Earth Revibe — Monorepo

Single-brand D2C streetwear platform (India-only, INR-only). Turborepo + pnpm 9 monorepo, all TypeScript, Node ≥20, PostgreSQL 16.

## Structure

```
apps/
  storefront      Next 15.5.15 · port 3000 · React 19 · Tailwind 4 · PWA via serwist
  admin           Next 15.5.15 · port 3001 · recharts · TipTap · @hello-pangea/dnd · @xyflow/react (funnels)
  api             Express 5    · port 5000 · Prisma 5.22 · pino
  admin-mobile    Expo SDK 53 + Expo Router v4 + RN 0.79 + NativeWind v4 — real native Android, not WebView
  trip-form       Next 15      · port 3002 · WhatsApp-OTP-gated Travel Circle application form (deployed at earthrevibe.info)
  try-on-guide    Next 15      · port 3003

packages/
  shared          Zod 4 schemas, enums, types, utilities — imported by every app
  db              Prisma client + schema — imported only by api
  tsconfig        Shared TS config base — devDep'd by every workspace
```

No cross-app imports. Apps share code only through `packages/`.

## Commands

```bash
pnpm dev          # start all apps via turbo
pnpm build        # build all apps
pnpm lint         # lint all apps
pnpm db:generate  # regenerate Prisma client after schema changes
pnpm db:push      # push schema to database
pnpm db:seed      # seed database
```

## Thinking Protocol

Always use the `mcp__sequential-thinking__sequentialthinking` MCP tool on every prompt before writing any code or making changes. Use it to break down the task, analyze side effects, and verify your approach. Mandatory — never skip, even for small tasks.

## Key Conventions

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate in apps
- All enums live in `packages/shared/src/enums/` — import from `@earth-revibe/shared`
- API response format: `{ success: boolean, data?: T, error?: { code, message } }`
- API: thin controllers; all Prisma access in `services/`; Zod validation in middleware
- Storefront/admin: Server Components by default; `"use client"` only when needed
- Forms: react-hook-form + Zod resolver from `@earth-revibe/shared`
- State: Zustand for client/UI state; TanStack Query for all server state
- Icons: lucide-react (web) / lucide-react-native (mobile) only
- Auth: Supabase (email/password). `RefreshToken` and `OtpCode` Prisma models back refresh + WhatsApp OTP. `jose`/JWT in `apps/api` is legacy compat.
- Images: Cloudflare Images CDN (REST API) — never local disk, never Cloudinary
- Email: Resend for transactional. `nodemailer` is installed but unused.
- Razorpay webhooks: raw body is preserved at the express layer for `/api/v1/webhooks/*` so HMAC signature verify works — don't move JSON parsing earlier
- Public GET endpoints (`products`, `categories`, `homepage`, `blog`, `search`, `catalog`) skip rate limiting because Indian CGNAT collapses per-IP buckets
- Never commit `.env` files — use `.env.example` as reference

## External integrations (real, from code)

Razorpay (payments + webhooks) · Supabase (auth) · Cloudflare Images (CDN) · Shiprocket (shipping) · Resend (email) · WhatsApp Cloud API · Discord (admin alerts) · Expo Push (admin-mobile new-order pings) · PostHog (server + client) · Sentry · Mappls (address autocomplete).

## Where to dig deeper

- Data model (~30 models, ~975 lines): `packages/db/prisma/schema.prisma`
- API mount, CORS, cron, webhooks: `apps/api/src/app.ts`
- API server entry + signal handling: `apps/api/src/index.ts`
- Per-app conventions: `apps/{storefront,admin,api,admin-mobile}/CLAUDE.md`
- Domain spec: `docs/01-PRD.md`, `docs/02-APP-FLOW.md`, `docs/05-BACKEND-SCHEMA.md`
- Implementation history: `docs/plans/2026-03-05-phase{1..11}-*.md`
- Pre-computed code graph (snapshot 2026-04-18): `graphify-out/` — `GRAPH_REPORT.md`, `graph.json` (1944 nodes / 2497 edges), `graph.html`
