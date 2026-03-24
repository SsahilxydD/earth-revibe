# Earth Revibe -- Implementation Plan

## Overview

Earth Revibe follows a bottom-up build sequence: shared packages first, then the API, then the storefront and admin dashboard in parallel. Each phase builds on the previous one.

---

## Phase 1: Foundation (DONE)

**Goal:** Monorepo setup, database schema, shared type system.

**Completed work:**
- Turborepo monorepo with pnpm workspaces
- TypeScript configuration across all packages (`@earth-revibe/tsconfig`)
- `packages/shared`: Zod 4 schemas, enums, and TypeScript types as the single source of truth
- `packages/db`: Full Prisma 5 schema with all 30+ models, enums, indexes, and relations
- PostgreSQL 16 database provisioning
- Prisma client generation and database push
- Seed script with sample data (`bcryptjs` for password hashing, `tsx` for execution)
- Environment variable validation with Zod (`apps/api/src/config/env.ts`)

---

## Phase 2: API Core (DONE)

**Goal:** Complete REST API with authentication, middleware, and all CRUD endpoints.

**Completed work:**
- Express 5 application setup (`apps/api`)
- Middleware stack: helmet (security headers), cors, compression, cookie-parser, pino-http (logging), express-rate-limit
- Supabase authentication middleware (JWT validation via service role key)
- Role-based authorization (CUSTOMER, ADMIN, SUPER_ADMIN, SUPPORT_STAFF)
- Central error handler with consistent response format: `{ success, data?, error?: { code, message } }`
- Pagination utilities for all list endpoints
- **29 route files** covering all resources:
  - Auth: login, register, refresh token, logout
  - Products: list (paginated, filterable by status/category), get by slug
  - Categories: list (hierarchical), get by slug with products
  - Cart: CRUD cart items with stock validation
  - Checkout: Razorpay order creation, PendingCheckout with stock reservation, payment verification
  - Orders: list user orders, detail, return requests
  - Addresses: CRUD with default address management
  - Wishlist: add/remove products
  - Reviews: create, list by product
  - Search: product search with autocomplete
  - Discounts: validate discount codes
  - Loyalty: points balance, transaction history
  - Referrals: code generation, referral tracking
  - Blog: list published posts, get by slug
  - Support: ticket CRUD, threaded messages
  - Shipping: zones and rate calculation
  - Upload: Cloudflare Images upload via multer
  - Webhooks: Razorpay payment webhook with signature verification and idempotency
  - Admin routes: products, orders, customers, blog, discounts, inventory, support, notifications, homepage CMS, settings, analytics
- Razorpay SDK integration (Magic Checkout order creation, payment verification, refunds)
- Shiprocket integration (shipment creation, AWB assignment, tracking)
- Cloudflare Images upload integration
- Nodemailer configuration for transactional email
- Opossum circuit breaker for external service calls
- Vitest test suite with supertest for API integration tests

---

## Phase 3: Storefront (DONE)

**Goal:** Customer-facing shopping experience with all pages and features.

**Completed work:**
- Next.js 15 App Router with React 19
- Tailwind CSS 4 design system with custom CSS properties
- Archivo Narrow + Poppins fonts via `next/font/google`
- **Pages built:**
  - Homepage with dynamic CMS sections
  - Category/listing pages with filterable product grid and infinite scroll
  - Product detail with swipeable image gallery, size/color selectors, add-to-cart
  - Cart drawer (slide-in sidebar) and full cart page
  - Checkout integration with Razorpay Magic Checkout popup
  - Order confirmation page
  - Account pages: profile, orders, order detail, addresses, wishlist, loyalty points, referrals
  - Blog listing and post detail
  - Search with autocomplete
  - Static pages: FAQ, shipping policy, return policy, privacy policy, terms, contact
  - Login and registration pages
- **Component library:**
  - Product card, product gallery, product filters
  - Cart drawer, cart item, cart summary
  - Header variants (transparent homepage, sticky listing, minimal product detail)
  - Mobile bottom dock (Home, Search, Wishlist, Cart)
  - Mobile hamburger menu
  - UI primitives: button, input, badge, modal, accordion, skeleton loader
- **State management:**
  - Zustand stores for cart and UI state
  - TanStack React Query for all server state (products, categories, orders, user data)
- **Forms:** react-hook-form with Zod resolver (schemas from `@earth-revibe/shared`)
- **Animations:** Framer Motion for page transitions, swipe gestures, micro-interactions
- **Auth:** Supabase client via `@supabase/ssr` for cookie-based session management
- **Images:** All images via `next/image` with Cloudflare Images CDN URLs

---

## Phase 4: Admin Dashboard (DONE)

**Goal:** Complete admin dashboard for managing all platform operations.

**Completed work:**
- Next.js 15 App Router on port 3001
- Admin design system: Space Grotesk headings, Inter body text, semantic color tokens
- Supabase admin authentication with role-based access control
- **Pages built:**
  - Dashboard home with KPI cards and revenue charts (recharts)
  - Product management: list, create, edit with variant manager and multi-image upload
  - Category management: hierarchical list, CRUD, batch product picker
  - Order management: list with status filtering, detail with status updates, refunds, Shiprocket shipment creation
  - Inventory management: stock levels, low stock alerts, inline editing
  - Customer management: list, detail with order history
  - Discount management: CRUD for all discount types
  - Blog management: post editor with TipTap rich text, category/tag management, publish/schedule
  - Support ticket management: queue, detail, threaded replies, assignment
  - Notification management: send to users
  - Analytics: revenue, orders, customer metrics (recharts)
  - Settings: store info, social links, shipping, returns, checkout config
  - Homepage CMS: section CRUD with drag-and-drop reordering
- **Rich text:** TipTap editor integration for product descriptions and blog posts
- **Drag and drop:** @hello-pangea/dnd for homepage sections and image reordering
- **File uploads:** react-dropzone with Cloudflare Images API upload
- **Charts:** recharts with ResponsiveContainer for all data visualizations

---

## Phase 5: Checkout (DONE)

**Goal:** Complete payment flow with Razorpay Magic Checkout and stock management.

**Completed work:**
- Razorpay Magic Checkout integration (popup handles address + payment)
- Standard Razorpay checkout as fallback
- PendingCheckout model for stock reservation during payment
- Stock reservation on checkout initiation, release on failure/timeout
- Idempotency key system to prevent duplicate order creation
- Razorpay webhook handler with signature verification
- Order creation from webhook: Order + OrderItems + Payment records
- Loyalty points earning and redemption at checkout
- Discount code application and usage count increment
- Cart clearing after successful order
- Guest checkout support (user auto-creation from Razorpay data)

---

## Phase 6: Shipping (DONE)

**Goal:** Shiprocket integration for order fulfillment and tracking.

**Completed work:**
- Shiprocket API integration (email/password auth, session token management)
- Shipment creation from admin order detail
- AWB code assignment and courier name tracking
- Tracking URL generation and storage on Order record
- Shipping zone model with state-based rate calculation
- Free shipping threshold (configurable in store settings)
- Shipping rate display on storefront

---

## Phase 7: PWA (DONE)

**Goal:** Progressive Web App capabilities for app-like mobile experience.

**Completed work:**
- Serwist (service worker library) integration via `@serwist/next`
- Web app manifest (`manifest.json`) with app name, icons, theme color
- Service worker with caching strategies for static assets and API responses
- Installable PWA (Add to Home Screen) on Android and iOS
- Offline product browsing capability
- Apple Web App meta tags for iOS standalone mode

---

## Phase 8: Performance (DONE)

**Goal:** Optimize for speed and smooth user experience.

**Completed work:**
- Lenis smooth scroll integration (wraps entire app via LenisProvider)
- TanStack Query `staleTimes` configuration for intelligent cache management
- Prefetching: product data prefetched on hover/viewport entry
- Next.js image optimization with sharp
- Skeleton loading states for all data-dependent content
- CSS animations (fadeIn, slideUp, shimmer) for perceived performance
- `overscroll-behavior-x: none` to prevent accidental back navigation
- Hidden scrollbars for cleaner mobile appearance

---

## Phase 9: Polish (IN PROGRESS)

**Goal:** Fix edge cases, improve reliability, and optimize for production.

**Current work:**
- iOS Safari blink fixes (`backface-visibility: hidden` on body)
- Scroll restoration improvements between page navigations
- Image optimization: lazy loading, proper sizing, blur placeholders
- Product detail swipe between products refinement
- Cart drawer animation smoothness
- Filter sidebar mobile experience
- Error boundary improvements
- Loading state consistency across all pages

---

## Phase 10: Phone OTP Login (NEXT)

**Goal:** Add phone number OTP authentication as an alternative to email/password.

**Planned work:**
- Supabase Phone Auth integration (OTP via SMS)
- Twilio or Supabase built-in SMS provider configuration
- Phone number input with Indian country code (+91) pre-filled
- OTP input screen with auto-focus and auto-submit
- Phone login option on login/register pages
- Phone number verification for existing accounts
- Update User model `phoneVerified` flag on successful OTP

---

## Phase 11: Email Notifications (NEXT)

**Goal:** Transactional email for key order lifecycle events.

**Planned work:**
- Email templates (HTML) for:
  - Order confirmation (order details, items, total, estimated delivery)
  - Shipping notification (tracking link, courier name, AWB)
  - Delivery confirmation
  - Return request status updates
  - Password reset (already via Supabase, may customize template)
  - Welcome email on registration
- Nodemailer SMTP transport configuration (already set up, templates needed)
- Email queue/retry mechanism for reliability
- Unsubscribe option for marketing emails

---

## Phase 12: Analytics Dashboard Enhancements (NEXT)

**Goal:** Richer analytics and reporting for the admin dashboard.

**Planned work:**
- Revenue breakdown by category, product, time period
- Customer cohort analysis (new vs returning)
- Conversion funnel visualization (visit -> cart -> checkout -> order)
- Top-selling products ranking with trend charts
- Discount code performance (usage, revenue impact)
- Loyalty program metrics (points issued, redeemed, ROI)
- Export reports to CSV
- Date range picker for all analytics views

---

## Phase 13: Multi-Language Support (FUTURE)

**Goal:** Support Hindi and other Indian languages alongside English.

**Planned work:**
- i18n framework integration (next-intl or similar)
- Translation files for Hindi (primary) and potentially Tamil, Telugu, Marathi
- Language switcher in storefront header
- RTL support evaluation (not needed for Hindi but future-proofing)
- Admin dashboard remains English-only initially
- Product names/descriptions: manual translation by admin (not auto-translated)

---

## Phase 14: Mobile App (FUTURE)

**Goal:** Native mobile app wrapping the PWA or as a standalone React Native app.

**Planned work:**
- Evaluate: React Native wrapper vs Capacitor vs standalone React Native
- Push notifications via Firebase Cloud Messaging
- Native biometric authentication (fingerprint/face)
- Deep linking for order tracking and referral codes
- App Store (iOS) and Play Store (Android) submission
- Share target integration (share products via native share sheet)

---

## Technical Debt and Ongoing Maintenance

| Item | Priority | Status |
|------|----------|--------|
| API integration test coverage (target >80%) | High | In progress |
| End-to-end tests with Playwright | High | Setup done, tests needed |
| Database migration workflow (currently using `db push`) | Medium | Pending migration to `prisma migrate` |
| Legacy JWT secrets cleanup (fully migrated to Supabase) | Low | Optional removal |
| Admin responsive design (currently desktop-optimized) | Medium | Planned |
| Rate limiting tuning for production traffic patterns | Medium | Pending |
| PendingCheckout cleanup cron job (expire stale reservations) | High | Needs implementation |
| Monitoring and alerting (error tracking, uptime) | High | Planned |
| CDN caching headers for static assets | Medium | Planned |
| Database connection pooling optimization | Medium | Using Prisma defaults |
