# Earth Revibe -- Application Flow

## 1. Storefront (Customer-Facing)

### 1.1 Homepage

The homepage is dynamically configured via the admin CMS. It renders `HomepageSection` records from the database, ordered by `sortOrder`. Each section is a clickable card with a label, image, and link (typically to a category page). The homepage layout features a transparent header that transitions to a sticky white header on scroll.

**Key elements:**

- Full-width hero/banner sections (CMS-managed)
- Featured collections grid
- New arrivals carousel
- Category navigation cards

### 1.2 Category / Listing Pages

**Route:** `/category/[slug]`

- Sticky white header with centered "EARTH REVIBE" logo
- Filter bar below header: category filters, sort options (price low-high, price high-low, newest, popularity)
- Product grid (2 columns on mobile, 3--4 on desktop)
- Infinite scroll pagination (loads more products as user scrolls down)
- Each product card shows: primary image, product name, price (with compare-at price and sale badge if discounted), sold-out badge if all variants are out of stock

### 1.3 Product Detail Page

**Route:** `/product/[slug]`

**Navigation:** Custom header with back arrow (left), share and wishlist icons (right). No standard site header.

**Layout:**

- Swipeable product image gallery (horizontal swipe between images, Framer Motion animations)
- Swipe left/right between products in the same category for discovery
- Product name, price (with crossed-out compare-at price if on sale)
- Size selector (visual buttons, disabled for out-of-stock sizes)
- Color selector (color swatches with hex preview)
- "Add to Cart" button (full-width, sticky on mobile)
- Expandable accordion sections: Description, Material and Care, Measurements, Shipping Info, Returns Info
- Customer reviews section (star ratings, review text)
- Related products carousel

### 1.4 Cart

**Two views:**

1. **Cart Drawer (Sidebar):** Slides in from the right when an item is added or the cart icon is tapped. Shows cart items with quantity controls, variant info (size/color), line totals, and a subtotal. Discount code input field. "Checkout" button.

2. **Full Cart Page:** `/cart` -- same information in a full-page layout for users who navigate directly.

**Discount code flow:** User enters a code, the API validates it (checks expiry, usage limits, minimum order value, applicable products/categories), and the discount is applied to the subtotal in real time.

### 1.5 Checkout

Earth Revibe uses **Razorpay Magic Checkout**, which means the platform does NOT have its own checkout page with address and payment forms. Instead:

1. User clicks "Checkout" in the cart
2. The API creates a Razorpay order and a `PendingCheckout` record (reserving stock)
3. The Razorpay Magic Checkout popup opens in an overlay
4. Razorpay handles: shipping address collection, payment method selection, payment processing
5. On successful payment, a Razorpay webhook fires
6. The API verifies the payment signature, creates the `Order` record, decrements stock, awards loyalty points, and clears the cart
7. User is redirected to the order confirmation page

**Guest checkout:** If the user is not logged in, Razorpay collects their email and phone. The API creates or finds a user record from this data after payment verification.

### 1.6 Order Confirmation

**Route:** `/order/[orderNumber]`

Displays: order number, order items with images, quantities, prices, shipping address, payment method, order total breakdown (subtotal, discount, shipping, tax, total), and expected delivery timeline.

### 1.7 Account Pages

**Route:** `/account/*`

All account pages require authentication. If not logged in, user is redirected to login.

- **Profile** (`/account`): Edit first name, last name, email, phone, avatar
- **Orders** (`/account/orders`): List of past orders with status badges, click to view order detail
- **Order Detail** (`/account/orders/[id]`): Full order information, status timeline, tracking link (Shiprocket), return request button (if eligible)
- **Addresses** (`/account/addresses`): Saved address list, add/edit/delete addresses, set default
- **Wishlist** (`/account/wishlist`): Grid of wishlisted products with remove and add-to-cart actions
- **Loyalty Points** (`/account/loyalty`): Current points balance, transaction history (earned, redeemed, bonus, expired)
- **Referrals** (`/account/referrals`): Unique referral code with share functionality, list of referrals and their status

### 1.8 Authentication

**Routes:** `/login`, `/register`

- Email and password authentication via Supabase
- Registration creates a Supabase auth user and a corresponding `User` record in the application database
- Login returns Supabase session tokens; the API validates these tokens via Supabase middleware
- Password reset flow via Supabase email

### 1.9 Blog

**Routes:** `/blog`, `/blog/[slug]`

- Blog listing page with post cards (featured image, title, excerpt, read time, date)
- Blog post detail with rendered rich text content (from TipTap JSON)
- Category and tag filtering

### 1.10 Search

**Route:** `/search`

- Search bar with autocomplete suggestions (product names)
- Search results page with product grid
- Full-text product search via the API

### 1.11 Static / Policy Pages

- **FAQ** (`/faq`)
- **Shipping Policy** (`/policies/shipping`)
- **Return Policy** (`/policies/returns`)
- **Privacy Policy** (`/policies/privacy`)
- **Terms and Conditions** (`/policies/terms`)
- **Contact** (`/contact`)

### 1.12 Navigation (Storefront)

**Mobile Bottom Dock (persistent on all pages):**

- Home (house icon)
- Search (magnifying glass icon)
- Wishlist (heart icon) -- requires auth, shows count badge
- Cart (shopping bag icon) -- shows item count badge

**Header variants:**

1. **Homepage:** Transparent header overlaying hero, transitions to solid white on scroll. Centered logo. Hamburger menu (left), user/cart icons (right).
2. **Category/Listing pages:** Sticky white header with centered "EARTH REVIBE" text logo.
3. **Product Detail page:** Minimal header with back arrow (left), share and wishlist heart icons (right). No logo.

**Mobile menu:** Full-screen slide-in from left. Category links, account links, policy links.

---

## 2. Admin Dashboard

### 2.1 Authentication

**Route:** `/login`

Admin login via Supabase email/password. Only users with role ADMIN or SUPER_ADMIN can access the dashboard. Unauthorized users are redirected to the login page.

### 2.2 Dashboard Home

**Route:** `/`

- KPI cards: total revenue, total orders, total customers, average order value
- Revenue chart (recharts line/bar chart)
- Recent orders list
- Low stock alerts

### 2.3 Products

**Routes:** `/products`, `/products/new`, `/products/[id]/edit`

**Product list:**

- Table with columns: image thumbnail, name, category, price, status (DRAFT/ACTIVE/ARCHIVED), stock total, actions
- Search and filter by status/category
- Bulk actions

**Product form (create/edit):**

- Basic info: name (auto-generates slug), short description, full description (TipTap rich text editor)
- Pricing: price, compare-at price
- Category selector (dropdown)
- Product details: material, care instructions, composition, measurements, fabric weight, fit, print type, wash instructions, returns info, shipping info, origin
- SEO fields: SEO title, SEO description, SEO keywords
- Status selector: DRAFT, ACTIVE, ARCHIVED
- Featured toggle
- **Image uploader:** Drag-and-drop zone (react-dropzone), uploads to Cloudflare Images via API. Drag-and-drop reordering of images (@hello-pangea/dnd). Set primary image. Alt text editing.
- **Variant manager:** Table of variants. Each row: size, color, color hex, SKU (auto-generated or manual), price override, stock, low stock threshold, barcode, weight, active toggle. Add/remove variant rows.
- Tag management

### 2.4 Categories

**Routes:** `/categories`, `/categories/new`, `/categories/[id]/edit`

- Category list with hierarchical tree view
- Category form: name, slug, description, image, parent category, sort order, active toggle
- **Batch product picker:** Modal to assign products to a category. Tick multiple products from a searchable list, save all at once. API limited to 100 products per request.

### 2.5 Orders

**Routes:** `/orders`, `/orders/[id]`

**Order list:**

- Table: order number, customer name/email, date, status badge, total amount
- Filter by status, date range
- Search by order number or customer

**Order detail:**

- Order items with product images, variant info, quantities, prices
- Order total breakdown: subtotal, discount, shipping, tax, total
- Customer info and shipping address
- Payment details: Razorpay payment ID, method, status
- **Status updates:** Dropdown to advance order status with confirmation
- **Refund initiation:** Trigger refund via Razorpay API
- **Shiprocket shipment:** Create shipment, view AWB code, courier name, tracking URL
- **Order notes:** Add internal or customer-visible notes
- **Order status history:** Timeline of all status changes with timestamps

### 2.6 Inventory

**Route:** `/inventory`

- Table of all product variants with current stock levels
- Low stock indicators (variants below their threshold)
- Inline stock editing
- Bulk stock updates

### 2.7 Customers

**Routes:** `/customers`, `/customers/[id]`

- Customer list: name, email, registration date, order count, total spent
- Customer detail: profile info, order history, loyalty points, addresses, support tickets

### 2.8 Discounts

**Routes:** `/discounts`, `/discounts/new`, `/discounts/[id]/edit`

- Discount list: code, type, value, usage count/limit, status, dates
- Discount form: code, description, type (PERCENTAGE/FLAT/BUY_X_GET_Y/FREE_SHIPPING), value, minimum order value, maximum discount amount, usage limit, per-user limit, applicable categories/products, start date, expiry date, active toggle

### 2.9 Blog Management

**Routes:** `/blog`, `/blog/new`, `/blog/[id]/edit`

- Post list: title, status, author, published date, actions
- Post editor: title, slug, excerpt, featured image upload, TipTap rich text editor for content, category/tag assignment, SEO fields, status (DRAFT/PUBLISHED/SCHEDULED), scheduled publish date, read time

### 2.10 Support Tickets

**Routes:** `/support`, `/support/[id]`

- Ticket queue: ticket number, subject, customer, category, priority, status, assigned to
- Ticket detail: threaded message view, reply box with attachment upload, status update, priority change, staff assignment

### 2.11 Notifications

**Route:** `/notifications`

- Send notifications to individual users or broadcast
- Notification type selection
- View sent notification history

### 2.12 Analytics

**Route:** `/analytics`

- Revenue over time (line chart)
- Orders over time (bar chart)
- Top-selling products
- Customer acquisition metrics
- All charts use recharts with ResponsiveContainer

### 2.13 Settings

**Route:** `/settings`

- **Store info:** Store name, logo, contact email, contact phone
- **Social links:** Instagram, Facebook, Twitter URLs
- **Shipping:** Free shipping threshold, GST rate
- **Returns:** Return window (days)
- **Checkout config:** JSON configuration for Razorpay checkout options
- **Shipping config:** JSON configuration for shipping zones and rules

### 2.14 Homepage CMS

**Route:** `/homepage`

- List of homepage sections ordered by `sortOrder`
- Drag-and-drop reordering (@hello-pangea/dnd)
- Each section: label, href (link target), image URL, active toggle
- Add/edit/delete sections

### 2.15 Admin Navigation

**Sidebar (collapsible):**

- Dashboard
- Products
- Categories
- Orders
- Inventory
- Customers
- Discounts
- Blog
- Support
- Notifications
- Analytics
- Settings
- Homepage

**Topbar:** Breadcrumbs, admin user menu

---

## 3. API Routes

All routes are prefixed with `/api/v1/`. Public routes do not require authentication. Protected routes require a valid Supabase JWT in the Authorization header.

### Public Routes

| Route File           | Endpoints                                                  |
| -------------------- | ---------------------------------------------------------- |
| `auth.routes.ts`     | Login, register, refresh token, logout, password reset     |
| `product.routes.ts`  | List products (paginated, filterable), get product by slug |
| `category.routes.ts` | List categories, get category by slug with products        |
| `search.routes.ts`   | Search products with autocomplete                          |
| `blog.routes.ts`     | List published posts, get post by slug                     |
| `homepage.routes.ts` | Get active homepage sections                               |
| `shipping.routes.ts` | Get shipping zones and rates                               |
| `webhook.routes.ts`  | Razorpay payment webhook (signature-verified)              |

### Protected Routes (Customer)

| Route File           | Endpoints                                                    |
| -------------------- | ------------------------------------------------------------ |
| `cart.routes.ts`     | Get cart, add item, update quantity, remove item, clear cart |
| `checkout.routes.ts` | Create checkout (Razorpay order), verify payment             |
| `order.routes.ts`    | List user orders, get order detail, request return           |
| `address.routes.ts`  | CRUD addresses, set default                                  |
| `wishlist.routes.ts` | List wishlist, add/remove product                            |
| `discount.routes.ts` | Validate discount code                                       |
| `loyalty.routes.ts`  | Get points balance, transaction history                      |
| `referral.routes.ts` | Get referral code, list referrals                            |
| `support.routes.ts`  | Create ticket, list tickets, add message                     |
| `upload.routes.ts`   | Upload image to Cloudflare Images                            |

### Admin Routes

| Route File                     | Endpoints                                                          |
| ------------------------------ | ------------------------------------------------------------------ |
| `admin-product.routes.ts`      | CRUD products, manage variants, manage images                      |
| `admin-order.routes.ts`        | List all orders, update status, create refund, Shiprocket shipment |
| `admin-customer.routes.ts`     | List customers, view customer detail                               |
| `admin-blog.routes.ts`         | CRUD blog posts, categories, tags                                  |
| `admin-discount.routes.ts`     | CRUD discount codes                                                |
| `admin-inventory.routes.ts`    | View and update stock levels                                       |
| `admin-support.routes.ts`      | Manage tickets, assign staff, reply                                |
| `admin-notification.routes.ts` | Send notifications                                                 |
| `admin-homepage.routes.ts`     | CRUD homepage sections, reorder                                    |
| `admin-settings.routes.ts`     | Get/update store settings                                          |
| `analytics.routes.ts`          | Revenue, orders, customers, product analytics                      |

---

## 4. Authentication Flow

```
User clicks "Login"
  |
  v
Storefront sends email + password to Supabase Auth
  |
  v
Supabase returns session (access_token + refresh_token)
  |
  v
Storefront stores session via @supabase/ssr (cookies)
  |
  v
API requests include Authorization: Bearer <supabase_access_token>
  |
  v
API middleware validates token with Supabase Admin SDK
  |
  v
API looks up/creates User record in application database
  |
  v
req.user is set with user ID and role for downstream handlers
```

**Magic Checkout guest flow:**

1. Unauthenticated user adds items to cart (local storage)
2. Clicks checkout -- API creates PendingCheckout without userId
3. Razorpay collects email and phone during Magic Checkout
4. On payment success webhook, API receives customer details from Razorpay
5. API creates or finds User record by email
6. Order is created and linked to that user

---

## 5. Checkout Flow (Detailed)

```
1. User clicks "Checkout" in cart
   |
2. Frontend calls POST /api/v1/checkout/create
   - Sends: cart items, discount code (optional), loyalty points to use (optional)
   |
3. API validates stock, calculates totals, applies discount
   |
4. API creates Razorpay order (amount in paise)
   |
5. API creates PendingCheckout record with:
   - Generated order number
   - Razorpay order ID
   - Reserved stock (decremented from variants)
   - Serialized items JSON
   |
6. API returns Razorpay order ID + checkout config to frontend
   |
7. Frontend opens Razorpay Magic Checkout popup
   - Razorpay handles: address, payment method, payment
   |
8. On payment success:
   a. Razorpay sends webhook to POST /api/v1/webhook/razorpay
   b. API verifies X-Razorpay-Signature header
   c. API uses idempotency key to prevent duplicate processing
   d. API creates Order + OrderItems + Payment records
   e. API awards loyalty points
   f. API increments discount code usage count
   g. API clears user cart
   h. API deletes PendingCheckout record
   |
9. Frontend redirects to /order/[orderNumber] confirmation page

On payment failure or timeout:
   a. PendingCheckout stock reservation expires
   b. Background job restores reserved stock
```
