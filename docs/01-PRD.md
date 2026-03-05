# Earth Revibe - Product Requirements Document (PRD)

## Project Overview

**Project Name:** Earth Revibe
**Type:** Full-Stack E-Commerce Platform
**Brand Identity:** Sustainable, earthy, mid-range clothing brand
**Target Market:** India (INR pricing, domestic shipping only)
**Price Range:** Rs 3,000 - Rs 10,000 per item
**Product Categories:** Tops & Basics, Bottoms & Pants, Outerwear & Jackets

---

## Vision Statement

Earth Revibe is a modern, full-stack e-commerce platform for a sustainable clothing brand. It delivers a premium shopping experience with a Shopify-caliber admin dashboard, loyalty/referral programs, integrated blog, and customer support — all built on a performant monorepo architecture with end-to-end type safety.

---

## In Scope (v1)

### Storefront (Customer-Facing)

#### Product Discovery
- Homepage with hero banner, featured collections, new arrivals, bestsellers
- Category pages with grid/list view toggle
- Advanced filtering: category, size, color, price range, material, sort order
- Full-text search with autocomplete suggestions
- Product detail pages with image gallery (zoom, multiple angles), size guide, material info, care instructions
- Product reviews and ratings (verified purchase badge)
- Related products / "You may also like" section

#### User Accounts
- Registration (email + password, OTP via phone)
- Login / Logout with JWT-based sessions
- Profile management (name, email, phone, avatar)
- Multiple saved addresses (home, work, custom labels)
- Order history with detailed order view
- Wishlist (add/remove, share)
- Loyalty points dashboard (balance, history, how to earn)
- Referral dashboard (unique code, track referrals, earned rewards)

#### Shopping & Checkout
- Persistent shopping cart (synced across devices for logged-in users)
- Cart management (quantity update, remove, move to wishlist)
- Apply discount codes at cart level
- Apply loyalty points as discount
- Razorpay Magic Checkout (UPI, cards, netbanking, wallets — single-click)
- Order confirmation page with order summary
- Email confirmation on successful order

#### Order Management (Customer Side)
- Real-time order tracking with status timeline
- Order statuses: Placed, Confirmed, Processing, Shipped, Out for Delivery, Delivered, Cancelled, Returned
- Cancel order (before shipping)
- Request return/exchange (after delivery, within return window)

#### Content
- Blog / Brand Journal (sustainability stories, styling tips, behind-the-scenes)
- Blog categories and tags
- About Us, Contact, FAQ, Shipping Policy, Return Policy, Privacy Policy pages
- Size guide page

#### Analytics
- GA4 integration with full e-commerce event tracking:
  - view_item, view_item_list, add_to_cart, remove_from_cart
  - begin_checkout, add_payment_info, purchase
  - search, view_promotion, select_promotion
  - sign_up, login
- Custom events: wishlist_add, referral_share, loyalty_redeem

#### SEO & Performance
- Server-side rendering (SSR) for product and category pages
- Static generation (SSG) for blog posts and policy pages
- Structured data (JSON-LD) for products, breadcrumbs, organization
- Dynamic meta tags (title, description, OG tags)
- Sitemap.xml and robots.txt
- Image optimization with next/image
- Mobile-first responsive design

---

### Admin Dashboard

#### Dashboard Home
- KPI cards: Total Revenue, Total Orders, Total Customers, Conversion Rate, Average Order Value
- Revenue chart (daily/weekly/monthly)
- Recent orders table
- Low stock alerts
- Top selling products

#### Product Management
- CRUD operations for products
- Product variants (size, color combinations with individual stock)
- Multiple image upload with drag-and-drop reordering
- Rich text product descriptions (WYSIWYG editor)
- Product status: Draft, Active, Archived
- Bulk actions (activate, archive, delete)
- Product import/export (CSV)

#### Category Management
- CRUD for categories and subcategories
- Category image and description
- Category ordering (drag-and-drop)
- Assign products to categories

#### Order Management
- Order list with filters (status, date range, payment status)
- Order detail view with full timeline
- Update order status
- Process refunds (via Razorpay)
- Print packing slip / invoice
- Order notes (internal)

#### Customer Management
- Customer list with search and filters
- Customer detail view (profile, orders, loyalty points, support tickets)
- Customer segments (new, returning, high-value)
- Export customer data

#### Inventory Management
- Stock levels per product variant
- Low stock threshold configuration
- Low stock alerts (dashboard + email)
- Stock adjustment history
- Bulk stock update

#### Discounts & Promotions
- Discount code creation:
  - Percentage off
  - Flat amount off
  - Buy X Get Y (BOGO)
  - Free shipping
- Conditions: minimum order value, specific products/categories, usage limits, expiry date
- Active/inactive toggle
- Usage analytics per code

#### Blog / CMS
- Create, edit, delete blog posts
- Rich text editor with image embedding
- Categories and tags management
- Draft / Published / Scheduled status
- SEO fields (meta title, description, slug)
- Featured image

#### Customer Support
- Ticket system: customers submit tickets from storefront
- Ticket list with status filters (Open, In Progress, Resolved, Closed)
- Ticket detail with conversation thread
- Assign tickets to support staff
- Canned responses
- Priority levels (Low, Medium, High, Urgent)

#### Loyalty Program Configuration
- Set points earned per Rs spent
- Set point redemption value (e.g., 100 points = Rs 10)
- Bonus point events (first purchase, birthday, review)
- View all loyalty transactions

#### Referral Program Configuration
- Set reward for referrer and referee
- Referral code format settings
- View referral analytics (total referrals, converted, points awarded)

#### Settings & Access Control
- Role-based access: Super Admin, Admin, Support Staff
- Permission matrix per role
- Store settings (name, logo, contact info, social links)
- Shipping configuration (zones, rates, free shipping threshold)
- Tax configuration (GST rates)
- Email template management

---

### Backend API

#### Architecture
- RESTful API with versioned endpoints (`/api/v1/`)
- JWT authentication with access + refresh token rotation
- Zod validation on all request/response payloads
- Consistent error response format with error codes
- Request logging and audit trails

#### Integrations
- Razorpay: payment creation, verification, webhooks, refunds
- Cloudinary: image upload, transformation, optimization
- Nodemailer: transactional emails (SMTP or service provider)
- GA4 Measurement Protocol: server-side event tracking

#### Security
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- CORS configuration
- Helmet security headers
- Input sanitization
- SQL injection prevention (via Prisma ORM)
- CSRF protection
- Webhook signature verification (Razorpay)

---

## Out of Scope (v1)

- Multi-currency / international shipping
- Mobile app (React Native / Flutter)
- Live chat / chatbot support
- AI-powered product recommendations
- Multi-vendor / marketplace functionality
- Subscription boxes / recurring orders
- PWA offline mode
- Social login (Google, Facebook) — can be added in v2
- Multi-language support (i18n)
- A/B testing framework
- Advanced analytics dashboards beyond GA4

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Page load time (4G mobile) | < 3 seconds |
| Lighthouse Performance Score | 90+ |
| Lighthouse Accessibility Score | 90+ |
| Checkout completion clicks | <= 2 (via Magic Checkout) |
| Admin CRUD operations | No developer assistance needed |
| GA4 e-commerce events | All standard events tracked |
| API response time (p95) | < 500ms |
| Uptime | 99.5% |

---

## Assumptions

- Single-tenant system (one brand: Earth Revibe)
- Shipping handled via third-party courier (integration out of scope for v1; manual status updates)
- Product images provided by the brand (no AI generation)
- Email service credentials provided by the client
- Razorpay API keys provided by the client
- Cloudinary account provided by the client
- Domain and hosting infrastructure decided separately
