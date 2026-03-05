# Earth Revibe - App Flow Document

## Storefront User Flows

---

### 1. Homepage Flow

```
[Landing on Homepage]
  |
  +-- Hero Banner (rotating slides with CTA buttons)
  |     |-- "Shop New Arrivals" -> /collections/new-arrivals
  |     |-- "Explore Outerwear" -> /categories/outerwear
  |
  +-- Featured Collections Section
  |     |-- Collection Card -> /collections/:slug
  |
  +-- New Arrivals Carousel
  |     |-- Product Card -> /products/:slug
  |     |-- "View All" -> /collections/new-arrivals
  |
  +-- Bestsellers Grid
  |     |-- Product Card -> /products/:slug
  |     |-- "View All" -> /collections/bestsellers
  |
  +-- Sustainability Story Banner -> /blog/:slug or /about
  |
  +-- Newsletter Signup (email input + subscribe)
  |
  +-- Footer (links, social, policies)
```

---

### 2. Navigation Structure

```
Header (sticky):
  [Logo] [Search Bar] [Nav Links] [Wishlist Icon] [Cart Icon] [User Icon]

Primary Nav:
  - Shop
    - All Products (/products)
    - Tops & Basics (/categories/tops-basics)
    - Bottoms & Pants (/categories/bottoms-pants)
    - Outerwear & Jackets (/categories/outerwear-jackets)
    - New Arrivals (/collections/new-arrivals)
    - Bestsellers (/collections/bestsellers)
  - Our Story (/about)
  - Blog (/blog)
  - Contact (/contact)

Mobile Nav:
  - Hamburger menu -> slide-in drawer with same structure
  - Bottom sticky bar: Home, Categories, Cart, Account

User Dropdown (logged in):
  - My Profile (/account/profile)
  - My Orders (/account/orders)
  - Wishlist (/account/wishlist)
  - Loyalty Points (/account/loyalty)
  - Referrals (/account/referrals)
  - Support Tickets (/account/support)
  - Logout

User Dropdown (logged out):
  - Login (/auth/login)
  - Register (/auth/register)
```

---

### 3. Product Discovery Flow

```
[Category Page / All Products] (/products or /categories/:slug)
  |
  +-- Breadcrumb: Home > Category Name
  |
  +-- Filter Sidebar (desktop) / Filter Drawer (mobile)
  |     |-- Category checkboxes
  |     |-- Size checkboxes (XS, S, M, L, XL, XXL)
  |     |-- Color swatches
  |     |-- Price range slider (min-max)
  |     |-- Material checkboxes (Organic Cotton, Linen, Hemp, Recycled)
  |     |-- "Clear All Filters"
  |
  +-- Sort Dropdown: Newest, Price Low-High, Price High-Low, Popularity, Rating
  |
  +-- Grid/List View Toggle
  |
  +-- Product Grid
  |     |-- Product Card:
  |     |     [Image (hover: second image)]
  |     |     [Brand Badge: "Organic" / "Recycled"]
  |     |     [Product Name]
  |     |     [Price (Rs X,XXX)]
  |     |     [Star Rating]
  |     |     [Quick Add to Cart (size selector popup)]
  |     |     [Wishlist Heart Icon]
  |     |     Click -> /products/:slug
  |
  +-- Pagination / Infinite Scroll
```

---

### 4. Product Detail Flow

```
[Product Detail Page] (/products/:slug)
  |
  +-- Breadcrumb: Home > Category > Product Name
  |
  +-- Left: Image Gallery
  |     |-- Main image (zoomable on hover)
  |     |-- Thumbnail strip (click to change main image)
  |     |-- Mobile: swipeable carousel
  |
  +-- Right: Product Info
  |     |-- Product Name
  |     |-- Price: Rs X,XXX
  |     |-- Star Rating (X.X / 5) + "XX Reviews" link
  |     |-- Short Description
  |     |-- Color Selector (swatches, changes images)
  |     |-- Size Selector (buttons: XS S M L XL XXL)
  |     |     |-- Unavailable sizes greyed out
  |     |     |-- "Size Guide" link -> modal
  |     |-- Quantity Selector (+/- buttons)
  |     |-- [Add to Cart] button
  |     |     |-- Success: toast notification + cart icon badge updates
  |     |     |-- Out of stock: "Notify Me" button -> email input
  |     |-- [Add to Wishlist] button
  |     |-- Sustainability badges (Organic, Fair Trade, etc.)
  |     |-- Accordion sections:
  |           |-- Product Details (material, weight, fit)
  |           |-- Care Instructions
  |           |-- Shipping & Returns info
  |
  +-- Below: Tabs
        |-- Reviews Tab
        |     |-- Average rating summary
        |     |-- Rating distribution bar chart
        |     |-- Individual reviews (avatar, name, date, rating, text, verified badge)
        |     |-- "Write a Review" (logged-in users who purchased)
        |     |-- Sort: Most Recent, Highest, Lowest
        |
        |-- Related Products Carousel
              |-- Product Cards (4-6 items)
```

---

### 5. Search Flow

```
[User clicks Search Icon / Search Bar]
  |
  +-- Search input expands / opens overlay
  |
  +-- As user types (debounced 300ms):
  |     |-- Autocomplete dropdown appears
  |     |     |-- Product suggestions (image + name + price) - max 5
  |     |     |-- Category suggestions - max 3
  |     |     |-- Blog post suggestions - max 2
  |     |-- Click suggestion -> navigate to that page
  |
  +-- Press Enter / Submit:
        |-- Navigate to /search?q=query
        |-- Search results page (same layout as product grid)
        |-- "X results for 'query'"
        |-- No results: "No products found" + suggestions
```

---

### 6. Cart Flow

```
[Cart Page] (/cart)
  |
  +-- Cart Items List:
  |     |-- [Product Image] [Name] [Color/Size] [Quantity +/-] [Line Total] [Remove X]
  |     |-- "Move to Wishlist" link per item
  |     |-- Empty cart: illustration + "Continue Shopping" CTA
  |
  +-- Discount Code Input: [Enter Code] [Apply]
  |     |-- Success: discount shown, total updated
  |     |-- Error: "Invalid code" message
  |
  +-- Loyalty Points Toggle: "Use X points (Rs Y value)"
  |
  +-- Order Summary Sidebar:
  |     |-- Subtotal
  |     |-- Discount (if applied)
  |     |-- Loyalty Points Discount (if applied)
  |     |-- Shipping (calculated or "Free" if above threshold)
  |     |-- GST
  |     |-- Total
  |
  +-- [Proceed to Checkout] button
        |-- Not logged in -> redirect to /auth/login?redirect=/checkout
        |-- Logged in -> /checkout
```

---

### 7. Checkout Flow

```
[Checkout Page] (/checkout)
  |
  +-- Step 1: Shipping Address
  |     |-- Select from saved addresses (radio buttons)
  |     |-- OR "Add New Address" form:
  |           |-- Full Name, Phone, Address Line 1, Line 2, City, State, PIN Code
  |           |-- "Save this address" checkbox
  |     |-- [Continue to Payment]
  |
  +-- Step 2: Order Review
  |     |-- Order items summary (compact)
  |     |-- Shipping address selected
  |     |-- Order total breakdown
  |     |-- [Place Order] button
  |
  +-- Step 3: Razorpay Magic Checkout
  |     |-- Razorpay modal opens automatically
  |     |-- Pre-filled: name, email, phone from user profile
  |     |-- Payment methods: UPI, Cards, Netbanking, Wallets
  |     |-- On Success:
  |     |     |-- Backend verifies payment signature
  |     |     |-- Order created with status "Confirmed"
  |     |     |-- Loyalty points awarded
  |     |     |-- Redirect to /order-confirmation/:orderId
  |     |-- On Failure:
  |           |-- Error toast: "Payment failed. Please try again."
  |           |-- Stay on checkout page
  |
  +-- Order Confirmation Page (/order-confirmation/:orderId)
        |-- "Thank you for your order!"
        |-- Order ID, items, total, estimated delivery
        |-- Loyalty points earned this order
        |-- [Track Order] -> /account/orders/:orderId
        |-- [Continue Shopping] -> /
        |-- Confirmation email sent
```

---

### 8. User Account Flows

```
[Registration] (/auth/register)
  |-- Name, Email, Phone, Password, Confirm Password
  |-- "I agree to Terms & Conditions" checkbox
  |-- [Register] button
  |-- "Already have an account? Login"
  |-- On success: auto-login -> redirect to previous page or /
  |-- Referral code input (optional): "Have a referral code?"

[Login] (/auth/login)
  |-- Email, Password
  |-- "Forgot Password?" -> /auth/forgot-password
  |-- [Login] button
  |-- "Don't have an account? Register"
  |-- On success: redirect to previous page or /

[Forgot Password] (/auth/forgot-password)
  |-- Email input
  |-- [Send Reset Link]
  |-- Email with reset link sent
  |-- /auth/reset-password?token=xxx
  |     |-- New Password, Confirm Password
  |     |-- [Reset Password]
  |     |-- On success: redirect to /auth/login

[Profile Page] (/account/profile)
  |-- Edit name, email, phone, avatar
  |-- Change password section
  |-- Manage addresses (list, add, edit, delete, set default)

[Orders Page] (/account/orders)
  |-- Order list (order ID, date, status badge, total)
  |-- Click order -> /account/orders/:orderId
  |     |-- Order timeline (status history with timestamps)
  |     |-- Items list
  |     |-- Shipping address
  |     |-- Payment details
  |     |-- [Cancel Order] (if status allows)
  |     |-- [Request Return] (if delivered within return window)

[Wishlist Page] (/account/wishlist)
  |-- Product grid (same as category page cards)
  |-- [Add to Cart] per item
  |-- [Remove] per item
  |-- Empty: "Your wishlist is empty" + "Browse Products" CTA

[Loyalty Page] (/account/loyalty)
  |-- Points Balance (large display)
  |-- How it works (earn/redeem explanation)
  |-- Points History table (date, description, points +/-)
  |-- "Earn more" suggestions

[Referral Page] (/account/referrals)
  |-- Unique referral code + copy button
  |-- Share buttons (WhatsApp, copy link)
  |-- "How it works" explanation
  |-- Referral stats: total shared, signed up, purchased
  |-- Points earned from referrals

[Support Page] (/account/support)
  |-- [Create New Ticket] button
  |     |-- Subject, Category dropdown, Description, Attach image
  |-- Ticket list (ID, subject, status badge, last updated)
  |-- Click ticket -> conversation thread view
  |     |-- Messages (customer + support staff)
  |     |-- Reply input + send
```

---

### 9. Blog Flow

```
[Blog Index] (/blog)
  |-- Featured post (large card)
  |-- Category filter bar (All, Sustainability, Style Tips, Behind the Scenes)
  |-- Blog post grid:
  |     |-- [Featured Image] [Category Tag] [Title] [Excerpt] [Date] [Read Time]
  |     |-- Click -> /blog/:slug
  |-- Pagination

[Blog Post] (/blog/:slug)
  |-- Featured image (full width)
  |-- Category + Date + Read Time
  |-- Title
  |-- Rich text content (headings, paragraphs, images, quotes)
  |-- Author info
  |-- Share buttons (WhatsApp, Twitter, Facebook, Copy Link)
  |-- Related posts carousel
  |-- Newsletter signup CTA
```

---

### 10. Static Pages

```
/about         - Brand story, sustainability mission, team
/contact       - Contact form (name, email, subject, message) + store info
/faq           - Accordion FAQ sections
/shipping      - Shipping zones, rates, delivery times
/returns       - Return policy, process, conditions
/privacy       - Privacy policy
/terms         - Terms and conditions
/size-guide    - Size charts per category with measurement guide
```

---

## Admin Dashboard Flows

---

### 1. Admin Authentication

```
[Admin Login] (/admin/login)
  |-- Email + Password
  |-- [Login]
  |-- On success: redirect to /admin/dashboard
  |-- Failed: error message
  |-- No "register" — admins created by Super Admin only
```

---

### 2. Admin Dashboard Home

```
[Dashboard] (/admin/dashboard)
  |
  +-- Top Bar: [Search] [Notifications Bell] [Admin Avatar + Dropdown]
  |
  +-- Sidebar Navigation:
  |     |-- Dashboard
  |     |-- Products
  |     |-- Categories
  |     |-- Orders
  |     |-- Customers
  |     |-- Inventory
  |     |-- Discounts
  |     |-- Blog
  |     |-- Support Tickets
  |     |-- Loyalty Program
  |     |-- Referral Program
  |     |-- Settings
  |
  +-- Main Content:
        |-- KPI Cards Row: Revenue | Orders | Customers | Conversion Rate | AOV
        |-- Revenue Chart (line chart, toggle daily/weekly/monthly)
        |-- Two columns:
        |     |-- Recent Orders table (5 latest)
        |     |-- Low Stock Alerts (products below threshold)
        |-- Top Selling Products (bar chart or list)
```

---

### 3. Product Management Flow

```
[Products List] (/admin/products)
  |-- Search bar + filters (status, category)
  |-- [+ Add Product] button
  |-- Products table: Image | Name | Category | Price | Stock | Status | Actions
  |-- Bulk select + bulk actions (Activate, Archive, Delete)
  |-- Pagination
  |
  |-- Click product -> /admin/products/:id/edit
  |-- Click [+ Add Product] -> /admin/products/new

[Add/Edit Product] (/admin/products/new or /admin/products/:id/edit)
  |-- Left column (main):
  |     |-- Product Name
  |     |-- Slug (auto-generated, editable)
  |     |-- Description (rich text editor)
  |     |-- Images (drag-drop upload, reorder, set primary)
  |
  |-- Right column (sidebar):
  |     |-- Status: Draft / Active / Archived
  |     |-- Category (dropdown)
  |     |-- Tags (multi-select)
  |     |-- Price (Rs)
  |     |-- Compare-at Price (for showing discounts)
  |     |-- Material
  |     |-- Sustainability badges (checkboxes)
  |
  |-- Variants Section:
  |     |-- Add variant options: Size, Color
  |     |-- Variant matrix auto-generated
  |     |-- Per variant: SKU, price override, stock quantity
  |
  |-- SEO Section:
  |     |-- Meta title, meta description
  |     |-- Preview snippet
  |
  |-- [Save Draft] [Publish] [Delete] buttons
```

---

### 4. Order Management Flow

```
[Orders List] (/admin/orders)
  |-- Filters: Status, Date range, Payment status
  |-- Search by order ID or customer
  |-- Orders table: Order ID | Customer | Date | Items | Total | Payment | Status | Actions
  |-- Click order -> /admin/orders/:id

[Order Detail] (/admin/orders/:id)
  |-- Order timeline (status changes with timestamps)
  |-- Customer info (name, email, phone)
  |-- Shipping address
  |-- Items table (product, variant, quantity, price)
  |-- Payment details (Razorpay payment ID, method, status)
  |-- Order totals (subtotal, discount, shipping, GST, total)
  |-- Actions:
  |     |-- Update Status dropdown + [Update]
  |     |-- [Process Refund] -> Razorpay refund API
  |     |-- [Print Invoice] -> PDF generation
  |-- Internal Notes section (add notes visible only to admin)
```

---

### 5. Other Admin Flows

```
[Categories] (/admin/categories) - CRUD with drag-drop ordering
[Customers] (/admin/customers) - List, detail view, order history
[Inventory] (/admin/inventory) - Stock levels, alerts, bulk update
[Discounts] (/admin/discounts) - Create/manage discount codes
[Blog] (/admin/blog) - Post list, create/edit with rich editor
[Support] (/admin/support) - Ticket queue, respond, assign, resolve
[Loyalty] (/admin/loyalty) - Configure points rules, view transactions
[Referrals] (/admin/referrals) - Configure rewards, view analytics
[Settings] (/admin/settings)
  |-- General (store name, logo, contact)
  |-- Shipping (zones, rates)
  |-- Tax (GST configuration)
  |-- Team (manage admin users, roles)
  |-- Email Templates
  |-- Payments (Razorpay keys)
```

---

## Page Map Summary

### Storefront Pages (23 pages)

| Route | Page | Rendering |
|-------|------|-----------|
| `/` | Homepage | SSR |
| `/products` | All Products | SSR |
| `/products/:slug` | Product Detail | SSR |
| `/categories/:slug` | Category Page | SSR |
| `/collections/:slug` | Collection Page | SSR |
| `/search` | Search Results | CSR |
| `/cart` | Shopping Cart | CSR |
| `/checkout` | Checkout | CSR |
| `/order-confirmation/:id` | Order Confirmation | CSR |
| `/auth/login` | Login | CSR |
| `/auth/register` | Register | CSR |
| `/auth/forgot-password` | Forgot Password | CSR |
| `/auth/reset-password` | Reset Password | CSR |
| `/account/profile` | User Profile | CSR |
| `/account/orders` | Order History | CSR |
| `/account/orders/:id` | Order Detail | CSR |
| `/account/wishlist` | Wishlist | CSR |
| `/account/loyalty` | Loyalty Dashboard | CSR |
| `/account/referrals` | Referral Dashboard | CSR |
| `/account/support` | Support Tickets | CSR |
| `/blog` | Blog Index | SSG + ISR |
| `/blog/:slug` | Blog Post | SSG + ISR |
| `/about`, `/contact`, `/faq`, `/shipping`, `/returns`, `/privacy`, `/terms`, `/size-guide` | Static Pages | SSG |

### Admin Pages (15 pages)

| Route | Page |
|-------|------|
| `/admin/login` | Admin Login |
| `/admin/dashboard` | Dashboard Home |
| `/admin/products` | Products List |
| `/admin/products/new` | Add Product |
| `/admin/products/:id/edit` | Edit Product |
| `/admin/categories` | Categories |
| `/admin/orders` | Orders List |
| `/admin/orders/:id` | Order Detail |
| `/admin/customers` | Customers List |
| `/admin/customers/:id` | Customer Detail |
| `/admin/inventory` | Inventory Management |
| `/admin/discounts` | Discounts & Promos |
| `/admin/blog` | Blog Management |
| `/admin/support` | Support Tickets |
| `/admin/loyalty` | Loyalty Config |
| `/admin/referrals` | Referral Config |
| `/admin/settings` | Settings (tabbed) |
