# Earth Revibe - Implementation Plan

## Build Sequence Overview

The implementation follows a bottom-up approach: shared packages first, then API, then storefront and admin in parallel. Each phase builds on the previous one.

```
Phase 1: Foundation (Monorepo + Shared + DB)
    |
Phase 2: API Core (Auth + Products + Categories)
    |
Phase 3: Storefront Core (Layout + Products + Auth)
    |
Phase 4: Admin Core (Layout + Products + Categories)
    |
Phase 5: Cart & Checkout (Cart + Razorpay + Orders)
    |
Phase 6: Admin Orders & Customers
    |
Phase 7: User Features (Wishlist + Reviews + Profile)
    |
Phase 8: Loyalty & Referrals
    |
Phase 9: Blog/CMS + Support Tickets
    |
Phase 10: Analytics + SEO + Polish
    |
Phase 11: Testing + Security + Deployment Prep
```

---

## Phase 1: Foundation

### Step 1.1: Monorepo Setup
- [ ] Initialize git repository
- [ ] Create pnpm workspace (`pnpm-workspace.yaml`)
- [ ] Set up Turborepo (`turbo.json` with build/dev/lint pipelines)
- [ ] Create directory structure (`apps/`, `packages/`)
- [ ] Set up shared TypeScript config (`packages/tsconfig/`)
- [ ] Configure ESLint and Prettier at root level
- [ ] Create root `package.json` with workspace scripts

### Step 1.2: Shared Package (`packages/shared`)
- [ ] Create package with TypeScript config
- [ ] Define all enums (`UserRole`, `OrderStatus`, `PaymentStatus`, etc.)
- [ ] Create Zod schemas for all entities:
  - User schemas (register, login, profile update)
  - Product schemas (create, update, query filters)
  - Order schemas (create, status update)
  - Category schemas
  - Review schemas
  - Discount schemas
  - Blog schemas
  - Support ticket schemas
  - Settings schemas
- [ ] Export inferred TypeScript types from Zod schemas
- [ ] Create shared utility functions (formatPrice, generateOrderNumber)
- [ ] Create API response types (success, error, paginated)
- [ ] Create shared constants (sizes, colors, Indian states)

### Step 1.3: Database Package (`packages/db`)
- [ ] Initialize Prisma with PostgreSQL
- [ ] Write complete `schema.prisma` with all models
- [ ] Create initial migration
- [ ] Set up seed script with sample data:
  - Admin user (Super Admin)
  - Sample categories (Tops, Bottoms, Outerwear)
  - Sample products with variants and images
  - Store settings defaults
  - Loyalty and referral config defaults
- [ ] Export Prisma client instance
- [ ] Verify all relations and indexes

### Step 1.4: Verify Foundation
- [ ] `pnpm install` succeeds
- [ ] `turbo build` compiles all packages
- [ ] Database migration runs successfully
- [ ] Seed script populates sample data

---

## Phase 2: API Core

### Step 2.1: Express App Setup
- [ ] Initialize `apps/api` with TypeScript
- [ ] Set up Express 5 with middleware stack:
  - CORS (allow storefront + admin origins)
  - Helmet (security headers)
  - JSON body parser
  - Morgan (request logging)
  - Rate limiter
- [ ] Create folder structure:
  ```
  apps/api/src/
  ├── index.ts          # Entry point
  ├── app.ts            # Express app setup
  ├── config/           # Environment config with Zod validation
  ├── middleware/        # Auth, error handler, validate
  ├── routes/           # Route definitions
  ├── controllers/      # Request handlers
  ├── services/         # Business logic
  ├── utils/            # Helpers
  └── types/            # API-specific types
  ```
- [ ] Create Zod-validated environment config
- [ ] Create error handling middleware (centralized error responses)
- [ ] Create Zod validation middleware (validates req.body/params/query)
- [ ] Create auth middleware (JWT verification, role checking)
- [ ] Verify server starts and responds to health check

### Step 2.2: Authentication API
- [ ] POST `/auth/register` — create user, hash password, generate tokens
- [ ] POST `/auth/login` — verify credentials, generate tokens
- [ ] POST `/auth/refresh` — rotate refresh token
- [ ] POST `/auth/logout` — invalidate refresh token
- [ ] POST `/auth/forgot-password` — generate reset token, send email
- [ ] POST `/auth/reset-password` — verify token, update password
- [ ] GET `/auth/me` — get current user profile
- [ ] Implement JWT access + refresh token pair
- [ ] Implement role-based route guards (customer, admin, superAdmin)
- [ ] Test all auth flows manually (Postman)

### Step 2.3: Products API
- [ ] GET `/products` — list with filters (category, size, color, price, status, search), pagination, sorting
- [ ] GET `/products/:slug` — get product with images, variants, reviews
- [ ] POST `/products` — create product (Admin)
- [ ] PUT `/products/:id` — update product (Admin)
- [ ] DELETE `/products/:id` — soft delete / archive (Admin)
- [ ] POST `/products/:id/images` — upload to Cloudinary (Admin)
- [ ] DELETE `/products/:id/images/:imageId` — delete image (Admin)
- [ ] Set up Cloudinary integration

### Step 2.4: Categories API
- [ ] Full CRUD for categories
- [ ] Nested category support (parent-child)
- [ ] Reorder endpoint
- [ ] Category with product count

### Step 2.5: Search API
- [ ] GET `/search?q=query` — full-text search across products
- [ ] GET `/search/autocomplete?q=query` — suggestions (products, categories)

---

## Phase 3: Storefront Core

### Step 3.1: Next.js App Setup
- [ ] Initialize `apps/storefront` with Next.js 16 (App Router)
- [ ] Configure Tailwind CSS 4
- [ ] Set up folder structure:
  ```
  apps/storefront/src/
  ├── app/              # App Router pages
  │   ├── layout.tsx    # Root layout
  │   ├── page.tsx      # Homepage
  │   ├── (auth)/       # Auth pages group
  │   ├── (shop)/       # Shop pages group
  │   ├── (account)/    # Account pages group
  │   └── (content)/    # Blog, static pages group
  ├── components/       # Reusable components
  │   ├── ui/           # Base UI components
  │   ├── layout/       # Header, Footer, Nav
  │   ├── product/      # Product-specific components
  │   ├── cart/         # Cart components
  │   └── forms/        # Form components
  ├── lib/              # Utilities, API client, hooks
  ├── stores/           # Zustand stores
  └── styles/           # Global styles
  ```
- [ ] Create API client (fetch wrapper with auth token injection)
- [ ] Set up TanStack Query provider
- [ ] Set up Zustand stores (cart, UI state)
- [ ] Create base UI components (Button, Input, Badge, Card, Modal, Toast)
- [ ] Import and configure fonts (Playfair Display, Inter)

### Step 3.2: Layout & Navigation
- [ ] Root layout with metadata
- [ ] Header component (logo, search, nav, cart icon, user menu)
- [ ] Mobile navigation (hamburger + drawer)
- [ ] Footer component (links, newsletter, social)
- [ ] Mobile bottom navigation bar
- [ ] Breadcrumb component

### Step 3.3: Homepage
- [ ] Hero banner with CTA (carousel with Swiper)
- [ ] Featured collections section
- [ ] New arrivals carousel
- [ ] Bestsellers grid
- [ ] Sustainability story banner
- [ ] Newsletter signup section

### Step 3.4: Product Pages
- [ ] Category page with filter sidebar/drawer and product grid
- [ ] Product grid component (responsive 2/3/4 columns)
- [ ] Product card component (image, name, price, rating, wishlist)
- [ ] Filter component (category, size, color, price, material)
- [ ] Sort dropdown component
- [ ] Pagination component
- [ ] Product detail page:
  - Image gallery with zoom (Swiper)
  - Product info (name, price, rating)
  - Color/size selectors
  - Add to cart button
  - Accordion sections (details, care, shipping)
- [ ] Connect to products API with TanStack Query

### Step 3.5: Authentication Pages
- [ ] Login page with form (react-hook-form + Zod)
- [ ] Register page with form
- [ ] Forgot password page
- [ ] Reset password page
- [ ] Auth state management (Zustand store with token handling)
- [ ] Protected route wrapper (redirect to login if not authenticated)
- [ ] Auto token refresh on 401

---

## Phase 4: Admin Core

### Step 4.1: Admin App Setup
- [ ] Initialize `apps/admin` with Next.js 16 (App Router)
- [ ] Configure Tailwind CSS 4
- [ ] Create admin-specific folder structure (similar to storefront)
- [ ] Create admin API client with auth
- [ ] Set up TanStack Query provider
- [ ] Create admin base UI components (similar to storefront but admin-styled)

### Step 4.2: Admin Layout & Auth
- [ ] Admin login page
- [ ] Sidebar navigation (collapsible)
- [ ] Top bar (search, notifications, user dropdown)
- [ ] Admin layout wrapper with sidebar + main content
- [ ] Role-based route protection

### Step 4.3: Dashboard Home
- [ ] KPI cards (Revenue, Orders, Customers, Conversion, AOV)
- [ ] Revenue chart (Recharts line chart, daily/weekly/monthly toggle)
- [ ] Recent orders table
- [ ] Low stock alerts panel
- [ ] Top selling products
- [ ] Connect to analytics API

### Step 4.4: Product Management
- [ ] Products list page (table with search, filters, pagination)
- [ ] Bulk actions (activate, archive, delete)
- [ ] Add/Edit product form:
  - Basic info (name, slug, description, short description)
  - Pricing (price, compare-at price)
  - Category assignment
  - Status selector
  - Image upload with drag-and-drop (react-dropzone + Cloudinary)
  - Image reordering (drag-and-drop)
  - Variants management (size/color matrix, stock per variant)
  - SEO fields
  - Material & sustainability badges
- [ ] Product preview

### Step 4.5: Category Management
- [ ] Categories list with tree view
- [ ] Drag-and-drop reordering
- [ ] Add/Edit category modal (name, slug, image, parent)
- [ ] Delete with confirmation

---

## Phase 5: Cart & Checkout

### Step 5.1: Cart API
- [ ] GET/POST/PUT/DELETE cart endpoints
- [ ] Cart total calculation with tax
- [ ] Stock validation on add/update

### Step 5.2: Cart UI (Storefront)
- [ ] Cart page with item list
- [ ] Quantity update (+/-)
- [ ] Remove item
- [ ] Move to wishlist
- [ ] Order summary sidebar
- [ ] Discount code input and validation
- [ ] Persistent cart (Zustand + API sync for logged-in)
- [ ] Cart icon badge (item count)
- [ ] Mini cart drawer (click cart icon)

### Step 5.3: Checkout Flow
- [ ] Checkout page (multi-step or single page)
- [ ] Address selection / new address form
- [ ] Order review section
- [ ] Razorpay integration:
  - Create Razorpay order via API
  - Initialize Razorpay Magic Checkout on frontend
  - Handle payment success callback
  - Verify payment on backend
  - Handle payment failure
- [ ] Order confirmation page
- [ ] Email confirmation (Nodemailer)
- [ ] Stock reduction on successful order

### Step 5.4: Orders API
- [ ] POST `/orders` — create order + Razorpay order
- [ ] POST `/orders/verify` — verify payment signature
- [ ] GET `/orders` — list orders (customer/admin)
- [ ] GET `/orders/:id` — order detail
- [ ] PUT `/orders/:id/status` — update status (admin)
- [ ] POST `/orders/:id/cancel` — cancel order (customer)
- [ ] POST `/orders/webhook` — Razorpay webhook handler
- [ ] Order number generation (ER-XXXXXX format)

---

## Phase 6: Admin Orders & Customers

### Step 6.1: Admin Order Management
- [ ] Orders list page (filterable table)
- [ ] Order detail page:
  - Status timeline
  - Customer info
  - Items table
  - Payment details
  - Update status dropdown
  - Refund button (Razorpay refund API)
  - Invoice/packing slip print
  - Internal notes
- [ ] Order status update with history tracking

### Step 6.2: Admin Customer Management
- [ ] Customers list with search/filter
- [ ] Customer detail page (profile, orders, loyalty, tickets)
- [ ] Customer segments view

### Step 6.3: Admin Inventory
- [ ] Inventory list (product variants with stock levels)
- [ ] Low stock threshold configuration
- [ ] Stock adjustment (individual + bulk)
- [ ] Low stock email alerts

---

## Phase 7: User Features

### Step 7.1: Wishlist
- [ ] Wishlist API (add, remove, list)
- [ ] Wishlist page (storefront)
- [ ] Wishlist heart icon on product cards
- [ ] Move to cart from wishlist

### Step 7.2: Reviews
- [ ] Reviews API (CRUD, verified purchase check)
- [ ] Reviews section on product detail page
- [ ] Write review form (rating stars, title, content)
- [ ] Rating distribution chart
- [ ] Admin review moderation (optional)

### Step 7.3: User Profile & Orders
- [ ] Profile page (edit info, change password)
- [ ] Address management (CRUD, set default)
- [ ] Order history page
- [ ] Order detail with timeline
- [ ] Cancel order functionality
- [ ] Return request form

---

## Phase 8: Loyalty & Referrals

### Step 8.1: Loyalty System
- [ ] Loyalty API (balance, history, config)
- [ ] Points earning on purchase (auto-award after payment)
- [ ] Points redemption at checkout
- [ ] Loyalty dashboard (storefront — points balance, history)
- [ ] Bonus points (welcome, review, birthday)
- [ ] Admin loyalty config page
- [ ] Admin loyalty transactions view

### Step 8.2: Referral System
- [ ] Referral API (generate code, track, config)
- [ ] Unique referral code per user (generated on registration)
- [ ] Referral code input on registration
- [ ] Points award on referral conversion (first purchase)
- [ ] Referral dashboard (storefront — code, share, stats)
- [ ] Admin referral config page
- [ ] Admin referral analytics

---

## Phase 9: Blog/CMS + Support

### Step 9.1: Blog API & Admin
- [ ] Blog posts API (CRUD, publish/draft/schedule)
- [ ] Blog categories & tags API
- [ ] Admin blog management page (list, create/edit with rich text editor)
- [ ] TipTap rich text editor integration
- [ ] Image embedding in blog posts
- [ ] SEO fields per post

### Step 9.2: Blog Frontend
- [ ] Blog index page (featured post + grid)
- [ ] Category filter
- [ ] Blog post page (rich content, share buttons, related posts)
- [ ] Newsletter signup CTA
- [ ] SSG with ISR for blog pages

### Step 9.3: Support Ticket API & Admin
- [ ] Support tickets API (CRUD, messages, assign)
- [ ] Admin ticket queue (filterable list)
- [ ] Ticket detail with conversation thread
- [ ] Assign to staff
- [ ] Canned responses
- [ ] Priority management

### Step 9.4: Support Frontend (Storefront)
- [ ] Create ticket form
- [ ] Ticket list (customer's own)
- [ ] Ticket conversation view
- [ ] Ticket status tracking

---

## Phase 10: Analytics + SEO + Polish

### Step 10.1: GA4 Integration
- [ ] Install gtag.js in storefront layout
- [ ] Track page views (automatic with App Router)
- [ ] E-commerce events:
  - `view_item` on product detail page
  - `view_item_list` on category/collection pages
  - `add_to_cart` / `remove_from_cart`
  - `begin_checkout`
  - `add_payment_info`
  - `purchase` on order confirmation
  - `search` on search
- [ ] Custom events (wishlist, referral share, loyalty redeem)
- [ ] Server-side events via Measurement Protocol (for webhook-triggered events)

### Step 10.2: SEO
- [ ] Dynamic metadata per page (Next.js Metadata API)
- [ ] JSON-LD structured data:
  - Product schema
  - BreadcrumbList schema
  - Organization schema
- [ ] Sitemap generation (`/sitemap.xml`)
- [ ] Robots.txt
- [ ] Open Graph tags for social sharing
- [ ] Canonical URLs

### Step 10.3: Admin Discounts & Promotions
- [ ] Discount codes CRUD API
- [ ] Admin discounts page (create, edit, toggle, delete)
- [ ] Discount validation logic (conditions, limits, expiry)
- [ ] Usage tracking and analytics per code

### Step 10.4: Admin Settings
- [ ] Store settings page (name, logo, contact, social)
- [ ] Shipping zones management
- [ ] Tax (GST) configuration
- [ ] Team management (Super Admin: create/edit admin users)
- [ ] Email template preview

### Step 10.5: Static Pages
- [ ] About Us page
- [ ] Contact page with form
- [ ] FAQ page (accordion)
- [ ] Shipping policy
- [ ] Returns policy
- [ ] Privacy policy
- [ ] Terms and conditions
- [ ] Size guide page

### Step 10.6: Notifications
- [ ] Notification API (create, list, mark read)
- [ ] Admin notification bell with dropdown
- [ ] Storefront notification bell
- [ ] Email notifications:
  - Order confirmation
  - Order shipped
  - Order delivered
  - Password reset
  - Referral reward
  - Low stock alert (admin)

---

## Phase 11: Testing + Security + Deployment Prep

### Step 11.1: Security Hardening
- [ ] Audit all API endpoints for proper auth guards
- [ ] Rate limiting on auth endpoints (stricter)
- [ ] Input sanitization review
- [ ] CSRF protection for state-changing operations
- [ ] Razorpay webhook signature verification
- [ ] Secure HTTP-only cookies for refresh tokens
- [ ] Environment variables audit (no secrets in code)
- [ ] SQL injection prevention audit (Prisma parameterized queries)
- [ ] XSS prevention audit

### Step 11.2: Performance
- [ ] Image optimization audit (next/image, WebP, lazy loading)
- [ ] Bundle size analysis
- [ ] API response time profiling
- [ ] Database query optimization (check N+1 queries)
- [ ] Add proper Prisma indexes verification
- [ ] Implement API response caching where appropriate
- [ ] Lighthouse audit (target 90+ all categories)

### Step 11.3: Error Handling & Logging
- [ ] Centralized error handling in API
- [ ] User-friendly error pages (404, 500) in storefront and admin
- [ ] API request/response logging
- [ ] Error tracking setup (optional: Sentry)

### Step 11.4: Deployment Preparation
- [ ] Docker setup for API + PostgreSQL
- [ ] Environment configuration for production
- [ ] Database migration strategy
- [ ] Build scripts and CI/CD pipeline setup
- [ ] Documentation (API docs, setup guide, README)

---

## Phase Dependency Graph

```
Phase 1 (Foundation)
  ├── Phase 2 (API Core)
  │     ├── Phase 3 (Storefront Core)
  │     │     └── Phase 5 (Cart & Checkout) ──┐
  │     │                                      ├── Phase 7 (User Features)
  │     ├── Phase 4 (Admin Core)              │     └── Phase 8 (Loyalty & Referrals)
  │     │     └── Phase 6 (Admin Orders) ─────┘
  │     │
  │     └── Phase 9 (Blog + Support)
  │
  └── Phase 10 (Analytics + SEO + Polish)
        └── Phase 11 (Testing + Security + Deploy)
```

---

## Estimated File Count per Phase

| Phase | New Files (approx) |
|-------|-------------------|
| Phase 1: Foundation | ~25 |
| Phase 2: API Core | ~40 |
| Phase 3: Storefront Core | ~60 |
| Phase 4: Admin Core | ~50 |
| Phase 5: Cart & Checkout | ~30 |
| Phase 6: Admin Orders & Customers | ~20 |
| Phase 7: User Features | ~25 |
| Phase 8: Loyalty & Referrals | ~20 |
| Phase 9: Blog + Support | ~30 |
| Phase 10: Analytics + SEO + Polish | ~35 |
| Phase 11: Testing + Security | ~15 |
| **Total** | **~350 files** |

---

## Build Order Rules

1. **Never skip phases** — each phase depends on previous ones
2. **Shared package first** — all Zod schemas and types must exist before API/frontend
3. **API before frontend** — endpoints must exist before UI connects to them
4. **Core before features** — auth + products before cart + checkout
5. **Test each phase** — verify functionality before moving to next phase
6. **Commit per step** — granular git history for easy rollback
