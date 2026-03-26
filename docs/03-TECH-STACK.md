# Earth Revibe -- Tech Stack

## 1. Architecture Overview

Turborepo monorepo with pnpm workspaces. Three applications share two common packages. All code is TypeScript.

```
earth-revibe/
  apps/
    storefront/    -- Customer-facing Next.js app (port 3000)
    admin/         -- Admin dashboard Next.js app (port 3001)
    api/           -- Express REST API (port 5000)
  packages/
    shared/        -- Zod schemas, enums, TypeScript types
    db/            -- Prisma client, schema, migrations, seed
```

**Package manager:** pnpm 9.15.4
**Node.js:** >= 20
**Build orchestrator:** Turborepo 2.8.13
**Language:** TypeScript 5.9.3 (all packages)

---

## 2. Storefront (`@earth-revibe/storefront`)

Customer-facing shopping experience. Mobile-first PWA.

| Package                 | Version | Purpose                                      |
| ----------------------- | ------- | -------------------------------------------- |
| `next`                  | 15.5.14 | React framework (App Router)                 |
| `react`                 | 19.2.4  | UI library                                   |
| `react-dom`             | 19.2.4  | React DOM renderer                           |
| `tailwindcss`           | 4.2.1   | Utility-first CSS                            |
| `@tailwindcss/postcss`  | 4.2.1   | PostCSS plugin for Tailwind                  |
| `@tanstack/react-query` | 5.90.21 | Server state management, caching             |
| `zustand`               | 5.0.11  | Client state management (cart, UI)           |
| `framer-motion`         | 12.35.2 | Animations and page transitions              |
| `lenis`                 | 1.3.20  | Smooth scroll library                        |
| `react-hook-form`       | 7.71.2  | Form state management                        |
| `@hookform/resolvers`   | 5.2.2   | Zod resolver for react-hook-form             |
| `zod`                   | 4.3.6   | Schema validation (via @earth-revibe/shared) |
| `@supabase/supabase-js` | 2.99.0  | Supabase client for auth                     |
| `@supabase/ssr`         | 0.9.0   | Supabase SSR cookie management               |
| `@serwist/next`         | 9.5.7   | Next.js PWA/service worker integration       |
| `serwist`               | 9.5.7   | Service worker runtime (caching, offline)    |
| `lucide-react`          | 0.577.0 | Icon library                                 |
| `clsx`                  | 2.1.1   | Conditional className utility                |
| `tailwind-merge`        | 3.5.0   | Merge Tailwind classes without conflicts     |
| `sharp`                 | 0.34.5  | Image optimization (Next.js image pipeline)  |
| `isomorphic-dompurify`  | 3.5.1   | HTML sanitization (blog content)             |

**Dev dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.9.3 | TypeScript compiler |
| `@types/react` | 19.0.0 | React type definitions |
| `@types/react-dom` | 19.0.0 | React DOM type definitions |
| `@types/node` | 22.0.0 | Node.js type definitions |

---

## 3. Admin Dashboard (`@earth-revibe/admin`)

Internal dashboard for managing products, orders, customers, content, and settings.

| Package                 | Version | Purpose                               |
| ----------------------- | ------- | ------------------------------------- |
| `next`                  | 15.5.14 | React framework (App Router)          |
| `react`                 | 19.2.4  | UI library                            |
| `react-dom`             | 19.2.4  | React DOM renderer                    |
| `tailwindcss`           | 4.2.1   | Utility-first CSS                     |
| `@tailwindcss/postcss`  | 4.2.1   | PostCSS plugin for Tailwind           |
| `@tanstack/react-query` | 5.90.21 | Server state management, caching      |
| `zustand`               | 5.0.11  | Client state management (sidebar, UI) |
| `react-hook-form`       | 7.71.2  | Form state management                 |
| `@hookform/resolvers`   | 5.2.2   | Zod resolver for react-hook-form      |
| `recharts`              | 3.8.0   | Charts and data visualization         |
| `@supabase/supabase-js` | 2.49.4  | Supabase client for auth              |
| `@supabase/ssr`         | 0.9.0   | Supabase SSR cookie management        |
| `lucide-react`          | 0.577.0 | Icon library                          |

**Note:** The admin also uses `@tiptap/react` for rich text editing, `@hello-pangea/dnd` for drag-and-drop (homepage sections, image reordering), and `react-dropzone` for file uploads. These may be installed as sub-dependencies or added separately.

**Dev dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.9.3 | TypeScript compiler |
| `@types/react` | 19.0.0 | React type definitions |
| `@types/react-dom` | 19.0.0 | React DOM type definitions |
| `@types/node` | 22.0.0 | Node.js type definitions |

---

## 4. API (`@earth-revibe/api`)

Express 5 REST API serving both the storefront and admin dashboard.

| Package                 | Version   | Purpose                                  |
| ----------------------- | --------- | ---------------------------------------- |
| `express`               | 5.2.1     | HTTP framework                           |
| `@earth-revibe/db`      | workspace | Prisma client (database access)          |
| `@earth-revibe/shared`  | workspace | Zod schemas, types, enums                |
| `@supabase/supabase-js` | 2.99.0    | Supabase Admin SDK (token verification)  |
| `razorpay`              | 2.9.6     | Razorpay payment SDK                     |
| `nodemailer`            | 8.0.2     | Email sending (SMTP)                     |
| `zod`                   | 4.3.6     | Request validation                       |
| `jose`                  | 4.x       | JWT signing/verification (legacy compat) |
| `pino`                  | 10.3.1    | JSON logger                              |
| `pino-http`             | 11.0.0    | HTTP request logging middleware          |
| `helmet`                | 8.1.0     | Security headers                         |
| `cors`                  | 2.8.6     | Cross-origin resource sharing            |
| `compression`           | 1.8.1     | Response compression (gzip)              |
| `express-rate-limit`    | 8.3.1     | Rate limiting                            |
| `opossum`               | 9.0.0     | Circuit breaker (external service calls) |
| `cookie-parser`         | 1.4.7     | Cookie parsing middleware                |
| `multer`                | 2.0.0     | Multipart file upload parsing            |
| `slugify`               | 1.6.6     | URL slug generation                      |

**Dev/Test dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.9.3 | TypeScript compiler |
| `tsx` | 4.19.0 | TypeScript execution (dev server) |
| `vitest` | 4.0.18 | Test runner |
| `@vitest/coverage-v8` | 4.0.18 | Code coverage |
| `supertest` | 7.2.2 | HTTP assertion testing |
| `@faker-js/faker` | 10.3.0 | Test data generation |
| `dotenv` | 17.3.1 | Environment variable loading |
| `pino-pretty` | 13.1.3 | Human-readable log formatting (dev) |

---

## 5. Shared Package (`@earth-revibe/shared`)

Single source of truth for all types, schemas, and enums used across apps.

| Package      | Version | Purpose                          |
| ------------ | ------- | -------------------------------- |
| `zod`        | 4.3.6   | Schema definition and validation |
| `typescript` | 5.9.3   | TypeScript compiler              |

All Zod schemas live in `packages/shared/src/schemas/`. All enums live in `packages/shared/src/enums/`. Apps import from `@earth-revibe/shared` -- types are never duplicated across apps.

---

## 6. Database Package (`@earth-revibe/db`)

Prisma ORM client, schema definition, migrations, and seed script.

| Package          | Version | Purpose                            |
| ---------------- | ------- | ---------------------------------- |
| `@prisma/client` | 5.22.0  | Prisma ORM client (runtime)        |
| `prisma`         | 5.22.0  | Prisma CLI (dev, migrations)       |
| `tsx`            | 4.19.0  | TypeScript execution (seed script) |
| `bcryptjs`       | 2.4.3   | Password hashing (seed data)       |

**Database:** PostgreSQL 16

---

## 7. Root / Tooling

| Package            | Version | Purpose                     |
| ------------------ | ------- | --------------------------- |
| `turbo`            | 2.8.13  | Monorepo build orchestrator |
| `@playwright/test` | 1.51.0  | End-to-end testing          |
| `typescript`       | 5.9.3   | TypeScript (workspace root) |

---

## 8. External Services

### 8.1 Razorpay (Payments)

- **Magic Checkout:** Razorpay-hosted checkout popup that handles address collection, payment method selection, and payment processing. No custom checkout UI needed.
- **Standard Checkout:** Fallback Razorpay checkout for cases where Magic Checkout is not available.
- **Webhooks:** Payment verification via `X-Razorpay-Signature` header validation.
- **Refunds:** Programmatic refund initiation via Razorpay API.

### 8.2 Supabase (Authentication)

- **Auth provider:** Email/password authentication.
- **Token verification:** API validates Supabase JWTs using the service role key.
- **SSR integration:** `@supabase/ssr` manages auth cookies for server-side rendering in Next.js.
- **User sync:** Supabase manages auth state; the application database stores the business User record, synced via middleware.

### 8.3 Cloudflare Images (CDN)

- **Image upload:** Product images, blog images, and avatars are uploaded via the Cloudflare Images API using an account ID and API token.
- **CDN delivery:** Images are served from Cloudflare's global CDN with automatic optimization.
- **No local storage:** The API never stores image files on disk.

### 8.4 Shiprocket (Shipping)

- **Authentication:** Email/password to obtain a session token.
- **Order creation:** Push orders to Shiprocket for fulfillment.
- **AWB assignment:** Automatic or manual AWB (Air Waybill) code assignment.
- **Tracking:** Courier name and tracking URL stored on the Order record.
- **Shipping zones:** Rate calculation based on Indian states.

### 8.5 Nodemailer (Email)

- **SMTP transport:** Configurable SMTP host, port, user, password.
- **Transactional email:** Order confirmations, shipping updates, password resets.

---

## 9. Environment Variables

All environment variables are validated at API startup via Zod (`apps/api/src/config/env.ts`). The API will not start if required variables are missing or invalid.

| Variable                      | Required | Default                 | Description                                                    |
| ----------------------------- | -------- | ----------------------- | -------------------------------------------------------------- |
| `NODE_ENV`                    | No       | `development`           | Environment: `development`, `production`, or `test`            |
| `PORT`                        | No       | `5000`                  | API server port                                                |
| `DATABASE_URL`                | **Yes**  | --                      | PostgreSQL connection string (pooled, via Prisma)              |
| `DIRECT_URL`                  | No       | --                      | Direct PostgreSQL connection (for migrations, bypasses pooler) |
| `SUPABASE_URL`                | **Yes**  | --                      | Supabase project URL                                           |
| `SUPABASE_ANON_KEY`           | **Yes**  | --                      | Supabase anonymous/public key                                  |
| `SUPABASE_SERVICE_ROLE_KEY`   | **Yes**  | --                      | Supabase service role key (server-side only, admin privileges) |
| `JWT_ACCESS_SECRET`           | No       | --                      | Legacy JWT access token secret (backward compat)               |
| `JWT_REFRESH_SECRET`          | No       | --                      | Legacy JWT refresh token secret (backward compat)              |
| `JWT_ACCESS_EXPIRY`           | No       | `15m`                   | Access token expiry duration                                   |
| `JWT_REFRESH_EXPIRY`          | No       | `7d`                    | Refresh token expiry duration                                  |
| `RAZORPAY_KEY_ID`             | No       | --                      | Razorpay API key ID                                            |
| `RAZORPAY_KEY_SECRET`         | No       | --                      | Razorpay API key secret                                        |
| `RAZORPAY_WEBHOOK_SECRET`     | No       | --                      | Razorpay webhook signature verification secret                 |
| `CLOUDFLARE_ACCOUNT_ID`       | No       | --                      | Cloudflare account ID for Images API                           |
| `CLOUDFLARE_IMAGES_API_TOKEN` | No       | --                      | Cloudflare Images API bearer token                             |
| `SMTP_HOST`                   | No       | --                      | SMTP server hostname                                           |
| `SMTP_PORT`                   | No       | --                      | SMTP server port                                               |
| `SMTP_USER`                   | No       | --                      | SMTP authentication username                                   |
| `SMTP_PASS`                   | No       | --                      | SMTP authentication password                                   |
| `EMAIL_FROM`                  | No       | --                      | Sender email address for outgoing mail                         |
| `FRONTEND_URL`                | No       | `http://localhost:3000` | Storefront URL (for CORS, email links)                         |
| `ADMIN_URL`                   | No       | `http://localhost:3001` | Admin dashboard URL (for CORS)                                 |
| `SHIPROCKET_EMAIL`            | No       | --                      | Shiprocket account email                                       |
| `SHIPROCKET_PASSWORD`         | No       | --                      | Shiprocket account password                                    |
| `SHIPROCKET_PICKUP_PINCODE`   | No       | `110001`                | Pickup location PIN code                                       |
| `SHIPROCKET_PICKUP_LOCATION`  | No       | `Earthrevibe`           | Shiprocket pickup location name                                |

---

## 10. Development Commands

```bash
# Root commands (via Turborepo)
pnpm dev              # Start all apps concurrently
pnpm build            # Build all apps and packages
pnpm lint             # Lint all apps
pnpm clean            # Clean all build artifacts

# Database commands
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:push          # Push schema to database (no migration)
pnpm db:seed          # Seed database with sample data

# Individual app dev
cd apps/storefront && pnpm dev    # Storefront on port 3000
cd apps/admin && pnpm dev         # Admin on port 3001
cd apps/api && pnpm dev           # API on port 5000

# API testing
cd apps/api && pnpm test          # Run tests (vitest)
cd apps/api && pnpm test:watch    # Watch mode
cd apps/api && pnpm test:coverage # Coverage report
```
