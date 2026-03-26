# Earth Revibe -- Product Requirements Document

## 1. Product Overview

**Product Name:** Earth Revibe
**Type:** Direct-to-consumer e-commerce platform
**Market:** India only -- all prices in INR, domestic shipping only
**Brand Identity:** Indian streetwear brand targeting youth culture. Oversized tees, hoodies, joggers, and statement pieces.
**Tagline:** "Streetwear for the Culture"
**Price Range:** Mid-range streetwear (typically Rs 999 -- Rs 10,000)

Earth Revibe is a full-stack e-commerce platform purpose-built for a single Indian streetwear brand. It is not a marketplace or multi-vendor system. The platform consists of a customer-facing storefront, an admin dashboard, and a REST API, all deployed as a monorepo.

## 2. Target Users

### Primary: Indian Gen-Z and Millennials (Ages 16--30)

- Urban and semi-urban residents
- Active on Instagram, interested in streetwear and street culture
- Comfortable with UPI payments and mobile-first shopping
- Expect fast, app-like mobile experiences (PWA)
- Price-conscious but willing to spend on statement pieces

### Secondary: Admin / Operations Team

- Brand owners managing product catalog, inventory, and orders
- Support staff handling customer tickets and returns
- Content creators publishing blog posts and managing homepage CMS

## 3. Core Features (Built)

### 3.1 Product Catalog

- Hierarchical categories with parent/child relationships and custom sort order
- Products with rich metadata: description, short description, material, care instructions, SEO fields, composition, measurements, fabric weight, fit, print type, wash instructions, returns info, shipping info, origin
- Product variants with size, color (with hex preview), individual pricing override, SKU, stock level, low-stock threshold, barcode, weight
- Multiple product images with sort order, primary image flag, alt text, and Cloudflare Images CDN URLs
- Product tags (many-to-many) for cross-cutting categorization
- Product status lifecycle: DRAFT -> ACTIVE -> ARCHIVED
- Featured product flag for homepage promotion

### 3.2 User Accounts

- Authentication via Supabase (email/password)
- Auto-creation of user records from Razorpay Magic Checkout data (guest -> registered flow)
- User roles: CUSTOMER, ADMIN, SUPER_ADMIN, SUPPORT_STAFF
- Profile management: name, email, phone, avatar
- Multiple saved addresses with labels (Home, Work, etc.) and default address selection
- Email and phone verification flags

### 3.3 Shopping Cart

- Server-side cart persisted in database (one cart per user)
- Cart items reference specific product variants (size + color)
- Quantity management with stock validation
- Guest users use local storage; cart merges on login

### 3.4 Checkout and Payments

- Razorpay Magic Checkout: Razorpay handles the entire address + payment UI in a popup overlay
- Standard Razorpay checkout as fallback
- PendingCheckout model for stock reservation during payment flow
- Stock is reserved when checkout begins, released if payment fails or times out
- Idempotency keys prevent duplicate order creation
- Payment methods supported via Razorpay: UPI, credit/debit cards, net banking, wallets, EMI
- All amounts in INR, currency hardcoded to INR
- Guest checkout supported (order linked by email, no account required)

### 3.5 Order Management

- Order lifecycle: PLACED -> CONFIRMED -> PROCESSING -> SHIPPED -> OUT_FOR_DELIVERY -> DELIVERED
- Additional statuses: CANCELLED, RETURNED, REFUNDED
- Order status history with timestamps and actor tracking
- Order notes (internal for staff, or customer-visible)
- Order items snapshot product name, image, size, color, and price at time of purchase
- Discount tracking per order (discount code reference, discount amount)
- Loyalty points earned and redeemed per order
- Shiprocket integration: order ID, shipment ID, AWB code, courier name, tracking URL

### 3.6 Discount Codes

- Types: PERCENTAGE, FLAT, BUY_X_GET_Y, FREE_SHIPPING
- Configurable: minimum order value, maximum discount cap, usage limit (global), per-user limit
- Scoping: applicable to specific categories or specific products (or all)
- Date-bound: start date and expiry date
- Usage tracking (count incremented on successful order)

### 3.7 Loyalty Points System

- Configurable points-per-rupee earning rate
- Configurable point redemption value (points to INR conversion)
- Bonus points: welcome bonus, review bonus, birthday bonus
- Minimum redemption threshold
- Transaction types: EARNED, REDEEMED, BONUS, EXPIRED, ADJUSTED
- Full transaction history per user
- Points can be applied at checkout to reduce order total

### 3.8 Referral Program

- Each user gets a unique referral code
- Referral lifecycle: PENDING -> SIGNED_UP -> CONVERTED
- Configurable rewards for both referrer and referee (loyalty points)
- Option to require a purchase before conversion

### 3.9 Blog (CMS)

- TipTap rich text editor for content creation
- Blog post metadata: title, slug, excerpt, featured image, author, read time
- Post status: DRAFT, PUBLISHED, SCHEDULED (with scheduled publish date)
- SEO fields: meta title, meta description
- Blog categories and tags (many-to-many relationships)

### 3.10 Support Tickets

- Ticket creation with subject, category, and priority (LOW, MEDIUM, HIGH, URGENT)
- Ticket lifecycle: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
- Threaded messages with file attachment support
- Staff assignment
- Auto-generated ticket numbers

### 3.11 Customer Reviews

- Star rating (1--5) with optional title and text content
- One review per user per product (enforced at database level)
- Verified purchase flag
- Approval moderation (approved by default, can be toggled)

### 3.12 Wishlist

- Add/remove products to wishlist
- One entry per user per product (enforced at database level)

### 3.13 Search

- Product search with autocomplete
- Search endpoint with text matching

### 3.14 Notifications

- In-app notification system
- Types: ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED, RETURN_UPDATE, TICKET_REPLY, LOYALTY_EARNED, REFERRAL_REWARD, LOW_STOCK, PROMOTION
- Read/unread tracking
- JSON data payload for deep linking

### 3.15 Admin Dashboard

- **Products:** CRUD with variant manager, multi-image upload (drag-and-drop reordering), rich text descriptions
- **Categories:** CRUD with hierarchical tree, batch product picker to assign products
- **Orders:** List with filtering by status, detail view with status updates, refund initiation, Shiprocket shipment creation
- **Inventory:** Stock level overview with low-stock alerts
- **Customers:** Customer list with order history
- **Discounts:** CRUD for all discount code types
- **Blog:** Post editor with TipTap, category/tag management, publish/schedule
- **Support:** Ticket queue with assignment and threaded replies
- **Notifications:** Send notifications to users
- **Analytics:** Revenue charts, KPI cards (recharts)
- **Settings:** Store configuration (name, logo, contact info, social links, GST rate, free shipping threshold, return window, checkout config, shipping config)
- **Homepage CMS:** Reorderable homepage sections (label, href, image) with drag-and-drop

### 3.16 Shipping

- Shiprocket integration for shipment creation and tracking
- Shipping zones with state-based rate calculation
- Configurable min/max delivery days per zone
- Free shipping threshold (configurable in store settings)

### 3.17 Returns

- Return request submission with reason
- Return lifecycle: REQUESTED -> APPROVED -> REJECTED -> PICKED_UP -> RECEIVED -> REFUND_INITIATED -> COMPLETED
- Admin notes on return requests
- Refund amount tracking

## 4. Integrations

| Service               | Purpose                                             | SDK/Method                          |
| --------------------- | --------------------------------------------------- | ----------------------------------- |
| **Razorpay**          | Payments (Magic Checkout + standard)                | `razorpay` npm SDK v2.9             |
| **Supabase**          | Authentication (email/password, token verification) | `@supabase/supabase-js` v2.99       |
| **Cloudflare Images** | Image CDN (product images, blog images, avatars)    | REST API via account ID + API token |
| **Shiprocket**        | Shipping (order creation, AWB, tracking)            | REST API via email/password auth    |
| **Nodemailer**        | Transactional email (SMTP)                          | `nodemailer` v8                     |

## 5. Success Criteria

- Sub-3-second initial page load on 4G mobile connections
- PWA installable with offline product browsing
- Checkout completion in under 60 seconds (Razorpay Magic Checkout handles address + payment)
- Zero-downtime deployments
- Admin can manage full product lifecycle without developer intervention
- Mobile-first design with native-app-like feel (smooth scrolling, swipe gestures, bottom navigation)

## 6. Out of Scope (Current Phase)

- **Multi-currency:** All prices are in INR only. No currency conversion.
- **Multi-language:** English only. No i18n framework.
- **Marketplace / Multi-vendor:** Single brand, single seller. No vendor onboarding.
- **International shipping:** India domestic only via Shiprocket.
- **Social login:** Only email/password via Supabase (phone OTP planned for future).
- **Native mobile app:** PWA only (React Native wrapper planned for future).
- **Subscription/recurring billing:** One-time purchases only.
- **Real-time chat support:** Ticket-based support only.
