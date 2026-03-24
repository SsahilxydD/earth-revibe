# Earth Revibe -- Database Schema

## Overview

**Database:** PostgreSQL 16
**ORM:** Prisma 5.22.0
**Schema file:** `packages/db/prisma/schema.prisma`

The database uses Prisma Client for all data access. IDs use CUID strings (`@default(cuid())`). Timestamps use `DateTime` with `@default(now())` for creation and `@updatedAt` for updates. All monetary values use `Decimal(10, 2)`.

Authentication is managed by Supabase. The application database stores a `User` record synced from Supabase auth data. The `passwordHash` field defaults to `"supabase-managed"` since Supabase handles password storage.

---

## Enums

### UserRole
| Value | Description |
|-------|-------------|
| `CUSTOMER` | Default role for registered shoppers |
| `ADMIN` | Full admin dashboard access |
| `SUPER_ADMIN` | Admin with elevated privileges (settings, user management) |
| `SUPPORT_STAFF` | Limited admin access for support tickets |

### ProductStatus
| Value | Description |
|-------|-------------|
| `DRAFT` | Not visible on storefront |
| `ACTIVE` | Published and purchasable |
| `ARCHIVED` | Removed from catalog, preserved for order history |

### OrderStatus
| Value | Description |
|-------|-------------|
| `PLACED` | Order created after payment verification |
| `CONFIRMED` | Admin confirmed the order |
| `PROCESSING` | Order being prepared for shipment |
| `SHIPPED` | Handed to courier (Shiprocket) |
| `OUT_FOR_DELIVERY` | Last-mile delivery in progress |
| `DELIVERED` | Successfully delivered to customer |
| `CANCELLED` | Order cancelled (before shipment) |
| `RETURNED` | Customer returned the order |
| `REFUNDED` | Refund processed via Razorpay |

### PaymentStatus
| Value | Description |
|-------|-------------|
| `PENDING` | Razorpay order created, awaiting payment |
| `AUTHORIZED` | Payment authorized but not captured |
| `CAPTURED` | Payment successfully captured |
| `FAILED` | Payment failed |
| `REFUNDED` | Full refund processed |
| `PARTIALLY_REFUNDED` | Partial refund processed |

### PaymentMethod
| Value | Description |
|-------|-------------|
| `UPI` | Unified Payments Interface |
| `CARD` | Credit or debit card |
| `NETBANKING` | Internet banking |
| `WALLET` | Digital wallet (Paytm, PhonePe, etc.) |
| `EMI` | Equated monthly installments |

### DiscountType
| Value | Description |
|-------|-------------|
| `PERCENTAGE` | Percentage off subtotal |
| `FLAT` | Fixed amount off subtotal |
| `BUY_X_GET_Y` | Buy X items, get Y free |
| `FREE_SHIPPING` | Waive shipping charges |

### LoyaltyTransactionType
| Value | Description |
|-------|-------------|
| `EARNED` | Points earned from a purchase |
| `REDEEMED` | Points spent at checkout |
| `BONUS` | Welcome, review, birthday, or promotional bonus |
| `EXPIRED` | Points expired after inactivity |
| `ADJUSTED` | Manual admin adjustment |

### ReferralStatus
| Value | Description |
|-------|-------------|
| `PENDING` | Referral link shared, referee not yet signed up |
| `SIGNED_UP` | Referee created an account |
| `CONVERTED` | Referee completed a purchase (rewards issued) |

### BlogPostStatus
| Value | Description |
|-------|-------------|
| `DRAFT` | Unpublished draft |
| `PUBLISHED` | Live on the blog |
| `SCHEDULED` | Will auto-publish at `scheduledAt` timestamp |

### TicketStatus
| Value | Description |
|-------|-------------|
| `OPEN` | New ticket, awaiting response |
| `IN_PROGRESS` | Being handled by support staff |
| `RESOLVED` | Issue resolved, awaiting confirmation |
| `CLOSED` | Ticket closed |

### TicketPriority
| Value | Description |
|-------|-------------|
| `LOW` | Non-urgent inquiry |
| `MEDIUM` | Standard priority (default) |
| `HIGH` | Requires prompt attention |
| `URGENT` | Critical issue requiring immediate action |

### ReturnStatus
| Value | Description |
|-------|-------------|
| `REQUESTED` | Customer submitted return request |
| `APPROVED` | Admin approved the return |
| `REJECTED` | Admin rejected the return |
| `PICKED_UP` | Return pickup completed |
| `RECEIVED` | Returned item received at warehouse |
| `REFUND_INITIATED` | Refund processing started |
| `COMPLETED` | Return fully processed and refunded |

### NotificationType
| Value | Description |
|-------|-------------|
| `ORDER_CONFIRMED` | Order confirmation |
| `ORDER_SHIPPED` | Shipment dispatched |
| `ORDER_DELIVERED` | Delivery completed |
| `ORDER_CANCELLED` | Order cancelled |
| `RETURN_UPDATE` | Return request status change |
| `TICKET_REPLY` | New reply on support ticket |
| `LOYALTY_EARNED` | Points earned |
| `REFERRAL_REWARD` | Referral reward issued |
| `LOW_STOCK` | Admin alert for low inventory |
| `PROMOTION` | Promotional notification |

---

## Models

### User
**Table:** `users`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `email` | String | unique | -- | Email address |
| `phone` | String? | unique | -- | Phone number (optional) |
| `passwordHash` | String | -- | `"supabase-managed"` | Password hash (managed by Supabase) |
| `firstName` | String | -- | -- | First name |
| `lastName` | String | -- | -- | Last name |
| `avatar` | String? | -- | -- | Avatar image URL |
| `role` | UserRole | -- | `CUSTOMER` | User role |
| `isActive` | Boolean | -- | `true` | Account active status |
| `emailVerified` | Boolean | -- | `false` | Email verification status |
| `phoneVerified` | Boolean | -- | `false` | Phone verification status |
| `lastLoginAt` | DateTime? | -- | -- | Last login timestamp |
| `loyaltyPoints` | Int | -- | `0` | Current loyalty points balance |
| `referralCode` | String? | unique | -- | Unique referral code |
| `createdAt` | DateTime | -- | `now()` | Record creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** addresses (1:N), orders (1:N), reviews (1:N), wishlistItems (1:N), cart (1:1), loyaltyHistory (1:N), referralsMade (1:N as Referrer), referredBy (1:1 as Referee), supportTickets (1:N), ticketMessages (1:N), refreshTokens (1:N), notifications (1:N), orderNotes (1:N)

---

### RefreshToken
**Table:** `refresh_tokens`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `token` | String | unique | -- | Token value |
| `userId` | String | FK -> User | -- | Owner user |
| `expiresAt` | DateTime | -- | -- | Token expiry time |
| `createdAt` | DateTime | -- | `now()` | Creation time |

**Indexes:** `[userId]`

---

### Address
**Table:** `addresses`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `userId` | String? | FK -> User | -- | Owner user (null for guest checkout addresses) |
| `label` | String | -- | `"Home"` | Address label (Home, Work, etc.) |
| `fullName` | String | -- | -- | Recipient full name |
| `phone` | String | -- | -- | Contact phone |
| `line1` | String | -- | -- | Address line 1 |
| `line2` | String? | -- | -- | Address line 2 |
| `city` | String | -- | -- | City |
| `state` | String | -- | -- | State |
| `pinCode` | String | -- | -- | PIN code (Indian postal code) |
| `isDefault` | Boolean | -- | `false` | Default address flag |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** orders (1:N)
**Indexes:** `[userId]`

---

### Category
**Table:** `categories`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | -- | -- | Display name |
| `slug` | String | unique | -- | URL slug |
| `description` | String? | -- | -- | Category description |
| `image` | String? | -- | -- | Category image URL |
| `parentId` | String? | FK -> Category | -- | Parent category (self-referential) |
| `sortOrder` | Int | -- | `0` | Display order |
| `isActive` | Boolean | -- | `true` | Active/visible status |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** parent (N:1 self), children (1:N self), products (1:N)
**Indexes:** `[parentId]`

---

### HomepageSection
**Table:** `homepage_sections`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `label` | String | -- | -- | Section display label |
| `href` | String | -- | -- | Link target URL |
| `imageUrl` | String? | -- | -- | Section background/feature image |
| `sortOrder` | Int | -- | `0` | Display order on homepage |
| `isActive` | Boolean | -- | `true` | Active/visible status |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

---

### Product
**Table:** `products`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | -- | -- | Product name |
| `slug` | String | unique | -- | URL slug |
| `description` | String | @db.Text | -- | Full description (rich text) |
| `shortDescription` | String? | -- | -- | Brief description for cards |
| `price` | Decimal(10,2) | -- | -- | Base price in INR |
| `compareAtPrice` | Decimal(10,2)? | -- | -- | Original/compare price (for sales) |
| `material` | String? | -- | -- | Material composition |
| `careInstructions` | String? | @db.Text | -- | Care instructions |
| `seoTitle` | String? | -- | -- | SEO meta title |
| `seoDescription` | String? | @db.Text | -- | SEO meta description |
| `seoKeywords` | String? | -- | -- | SEO keywords |
| `returnsInfo` | String? | -- | -- | Return policy for this product |
| `shippingInfo` | String? | -- | -- | Shipping details |
| `origin` | String? | -- | -- | Country/place of origin |
| `composition` | String? | -- | -- | Fabric composition |
| `measurements` | String? | -- | -- | Size chart / measurements |
| `fabricWeight` | String? | -- | -- | Fabric weight (e.g., "280 GSM") |
| `fit` | String? | -- | -- | Fit type (e.g., "Oversized") |
| `printType` | String? | -- | -- | Print technique (e.g., "Screen print") |
| `washInstructions` | String? | -- | -- | Washing instructions |
| `status` | ProductStatus | -- | `DRAFT` | Publication status |
| `isFeatured` | Boolean | -- | `false` | Featured on homepage |
| `categoryId` | String | FK -> Category | -- | Category assignment |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** category (N:1), images (1:N), variants (1:N), reviews (1:N), wishlistItems (1:N), tags (M:N via ProductTag)
**Indexes:** `[categoryId]`, `[status]`, `[slug]`

---

### ProductImage
**Table:** `product_images`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `productId` | String | FK -> Product (cascade delete) | -- | Parent product |
| `url` | String | -- | -- | Image URL (Cloudflare Images) |
| `publicId` | String | -- | `""` | Cloudflare public ID |
| `altText` | String? | -- | -- | Image alt text |
| `sortOrder` | Int | -- | `0` | Display order |
| `isPrimary` | Boolean | -- | `false` | Primary image flag |

**Indexes:** `[productId]`

---

### ProductVariant
**Table:** `product_variants`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `productId` | String | FK -> Product (cascade delete) | -- | Parent product |
| `sku` | String | unique | -- | Stock keeping unit |
| `size` | String | -- | -- | Size label (S, M, L, XL, etc.) |
| `color` | String | -- | `""` | Color name |
| `colorHex` | String? | -- | -- | Color hex code for swatch display |
| `price` | Decimal(10,2)? | -- | -- | Price override (null = use product price) |
| `stock` | Int | -- | `0` | Current stock quantity |
| `lowStockThreshold` | Int | -- | `5` | Low stock alert threshold |
| `barcode` | String? | -- | -- | Barcode/EAN |
| `weight` | Decimal(10,2)? | -- | -- | Item weight |
| `weightUnit` | String? | -- | `"g"` | Weight unit (g, kg) |
| `isActive` | Boolean | -- | `true` | Active/purchasable status |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** cartItems (1:N), orderItems (1:N)
**Unique constraint:** `[productId, size, color]`
**Indexes:** `[productId]`, `[sku]`

---

### Tag
**Table:** `tags`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | unique | -- | Tag display name |
| `slug` | String | unique | -- | URL slug |

**Relations:** products (M:N via ProductTag)

---

### ProductTag (Join Table)
**Table:** `product_tags`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `productId` | String | PK (composite), FK -> Product (cascade delete) | Product reference |
| `tagId` | String | PK (composite), FK -> Tag (cascade delete) | Tag reference |

---

### Cart
**Table:** `carts`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `userId` | String | unique, FK -> User (cascade delete) | -- | Owner user (one cart per user) |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** items (1:N)

---

### CartItem
**Table:** `cart_items`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `cartId` | String | FK -> Cart (cascade delete) | -- | Parent cart |
| `variantId` | String | FK -> ProductVariant | -- | Selected variant |
| `quantity` | Int | -- | `1` | Item quantity |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Unique constraint:** `[cartId, variantId]`
**Indexes:** `[cartId]`

---

### Order
**Table:** `orders`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderNumber` | String | unique | -- | Human-readable order number |
| `userId` | String? | FK -> User | -- | Customer (null for guest orders) |
| `guestEmail` | String? | -- | -- | Guest checkout email |
| `addressId` | String | FK -> Address | -- | Shipping address |
| `status` | OrderStatus | -- | `PLACED` | Current order status |
| `subtotal` | Decimal(10,2) | -- | -- | Subtotal before discounts |
| `discountAmount` | Decimal(10,2) | -- | `0` | Discount amount applied |
| `shippingAmount` | Decimal(10,2) | -- | `0` | Shipping charges |
| `taxAmount` | Decimal(10,2) | -- | `0` | Tax amount (GST) |
| `totalAmount` | Decimal(10,2) | -- | -- | Final total charged |
| `loyaltyPointsUsed` | Int | -- | `0` | Points redeemed on this order |
| `loyaltyPointsEarned` | Int | -- | `0` | Points earned from this order |
| `discountCodeId` | String? | FK -> DiscountCode | -- | Applied discount code |
| `shiprocketOrderId` | Int? | -- | -- | Shiprocket order ID |
| `shiprocketShipmentId` | Int? | -- | -- | Shiprocket shipment ID |
| `awbCode` | String? | -- | -- | Air Waybill tracking code |
| `courierName` | String? | -- | -- | Courier company name |
| `trackingUrl` | String? | -- | -- | Shipment tracking URL |
| `createdAt` | DateTime | -- | `now()` | Order placement time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** user (N:1), address (N:1), discountCode (N:1), items (1:N), payment (1:1), statusHistory (1:N), notes (1:N), returnRequest (1:1)
**Indexes:** `[userId]`, `[orderNumber]`, `[status]`

---

### OrderItem
**Table:** `order_items`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderId` | String | FK -> Order (cascade delete) | -- | Parent order |
| `variantId` | String | FK -> ProductVariant | -- | Purchased variant |
| `quantity` | Int | -- | -- | Quantity purchased |
| `unitPrice` | Decimal(10,2) | -- | -- | Price per unit at time of purchase |
| `totalPrice` | Decimal(10,2) | -- | -- | Line total (unitPrice * quantity) |
| `productName` | String | -- | -- | Snapshot: product name at purchase |
| `productImage` | String? | -- | -- | Snapshot: product image URL at purchase |
| `variantSize` | String | -- | -- | Snapshot: variant size at purchase |
| `variantColor` | String | -- | -- | Snapshot: variant color at purchase |

**Indexes:** `[orderId]`

---

### OrderStatusHistory
**Table:** `order_status_history`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderId` | String | FK -> Order (cascade delete) | -- | Parent order |
| `status` | OrderStatus | -- | -- | Status at this point |
| `note` | String? | -- | -- | Optional note for the status change |
| `changedBy` | String? | -- | -- | User ID or system identifier that made the change |
| `createdAt` | DateTime | -- | `now()` | Timestamp of the status change |

**Indexes:** `[orderId]`

---

### OrderNote
**Table:** `order_notes`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderId` | String | FK -> Order (cascade delete) | -- | Parent order |
| `userId` | String | FK -> User | -- | Author (admin/support staff) |
| `content` | String | @db.Text | -- | Note content |
| `isInternal` | Boolean | -- | `true` | Internal-only or customer-visible |
| `createdAt` | DateTime | -- | `now()` | Creation time |

**Indexes:** `[orderId]`

---

### Payment
**Table:** `payments`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderId` | String | unique, FK -> Order | -- | Associated order (1:1) |
| `razorpayOrderId` | String | unique | -- | Razorpay order ID |
| `razorpayPaymentId` | String? | unique | -- | Razorpay payment ID (set after capture) |
| `razorpaySignature` | String? | -- | -- | Razorpay payment signature |
| `amount` | Decimal(10,2) | -- | -- | Payment amount in INR |
| `currency` | String | -- | `"INR"` | Currency code |
| `status` | PaymentStatus | -- | `PENDING` | Payment status |
| `method` | PaymentMethod? | -- | -- | Payment method used |
| `refundId` | String? | -- | -- | Razorpay refund ID |
| `refundAmount` | Decimal(10,2)? | -- | -- | Refund amount |
| `failureReason` | String? | -- | -- | Failure reason (if failed) |
| `paidAt` | DateTime? | -- | -- | Timestamp of successful payment |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Indexes:** `[razorpayOrderId]`

---

### ReturnRequest
**Table:** `return_requests`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderId` | String | unique, FK -> Order | -- | Associated order (1:1) |
| `reason` | String | @db.Text | -- | Customer's return reason |
| `status` | ReturnStatus | -- | `REQUESTED` | Return status |
| `adminNote` | String? | @db.Text | -- | Admin notes on the return |
| `refundAmount` | Decimal(10,2)? | -- | -- | Approved refund amount |
| `createdAt` | DateTime | -- | `now()` | Request creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

---

### Review
**Table:** `reviews`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `productId` | String | FK -> Product (cascade delete) | -- | Reviewed product |
| `userId` | String | FK -> User | -- | Review author |
| `rating` | Int | -- | -- | Star rating (1-5) |
| `title` | String? | -- | -- | Review title |
| `content` | String? | @db.Text | -- | Review body text |
| `isVerified` | Boolean | -- | `false` | Verified purchase flag |
| `isApproved` | Boolean | -- | `true` | Moderation approval |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Unique constraint:** `[productId, userId]` (one review per user per product)
**Indexes:** `[productId]`

---

### WishlistItem
**Table:** `wishlist_items`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `userId` | String | FK -> User (cascade delete) | -- | Owner user |
| `productId` | String | FK -> Product (cascade delete) | -- | Wishlisted product |
| `createdAt` | DateTime | -- | `now()` | Creation time |

**Unique constraint:** `[userId, productId]`
**Indexes:** `[userId]`

---

### DiscountCode
**Table:** `discount_codes`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `code` | String | unique | -- | Discount code string |
| `description` | String? | -- | -- | Internal description |
| `type` | DiscountType | -- | -- | Discount type |
| `value` | Decimal(10,2) | -- | -- | Discount value (percentage or flat amount) |
| `minOrderValue` | Decimal(10,2)? | -- | -- | Minimum order subtotal to apply |
| `maxDiscountAmount` | Decimal(10,2)? | -- | -- | Maximum discount cap |
| `usageLimit` | Int? | -- | -- | Global usage limit (null = unlimited) |
| `usageCount` | Int | -- | `0` | Current usage count |
| `perUserLimit` | Int | -- | `1` | Maximum uses per user |
| `applicableCategories` | String[] | -- | -- | Category IDs this code applies to (empty = all) |
| `applicableProducts` | String[] | -- | -- | Product IDs this code applies to (empty = all) |
| `isActive` | Boolean | -- | `true` | Active status |
| `startsAt` | DateTime | -- | -- | Start date |
| `expiresAt` | DateTime | -- | -- | Expiry date |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** orders (1:N)
**Indexes:** `[code]`

---

### LoyaltyTransaction
**Table:** `loyalty_transactions`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `userId` | String | FK -> User | -- | User who earned/spent points |
| `type` | LoyaltyTransactionType | -- | -- | Transaction type |
| `points` | Int | -- | -- | Points amount (positive for earn, negative for redeem) |
| `description` | String | -- | -- | Human-readable description |
| `orderId` | String? | -- | -- | Associated order ID (if applicable) |
| `createdAt` | DateTime | -- | `now()` | Transaction time |

**Indexes:** `[userId]`

---

### LoyaltyConfig
**Table:** `loyalty_config`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `pointsPerRupee` | Decimal(10,4) | -- | -- | Points earned per rupee spent |
| `pointRedemptionValue` | Decimal(10,4) | -- | -- | INR value of one point |
| `welcomeBonus` | Int | -- | `0` | Points awarded on registration |
| `reviewBonus` | Int | -- | `0` | Points awarded for leaving a review |
| `birthdayBonus` | Int | -- | `0` | Points awarded on birthday |
| `minRedeemPoints` | Int | -- | `100` | Minimum points required to redeem |
| `isActive` | Boolean | -- | `true` | Loyalty program active status |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

---

### Referral
**Table:** `referrals`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `referrerId` | String | FK -> User (as Referrer) | -- | User who referred |
| `refereeId` | String | unique, FK -> User (as Referee) | -- | User who was referred |
| `status` | ReferralStatus | -- | `PENDING` | Referral status |
| `referrerReward` | Int | -- | `0` | Points awarded to referrer |
| `refereeReward` | Int | -- | `0` | Points awarded to referee |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Indexes:** `[referrerId]`

---

### ReferralConfig
**Table:** `referral_config`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `referrerReward` | Int | -- | `100` | Default points for referrer |
| `refereeReward` | Int | -- | `50` | Default points for referee |
| `requirePurchase` | Boolean | -- | `true` | Require purchase for conversion |
| `isActive` | Boolean | -- | `true` | Referral program active status |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

---

### BlogPost
**Table:** `blog_posts`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `title` | String | -- | -- | Post title |
| `slug` | String | unique | -- | URL slug |
| `excerpt` | String? | -- | -- | Short excerpt for listings |
| `content` | String | @db.Text | -- | Full content (TipTap JSON/HTML) |
| `featuredImage` | String? | -- | -- | Featured image URL |
| `authorId` | String | -- | -- | Author user ID |
| `status` | BlogPostStatus | -- | `DRAFT` | Publication status |
| `publishedAt` | DateTime? | -- | -- | Actual publish timestamp |
| `scheduledAt` | DateTime? | -- | -- | Scheduled publish timestamp |
| `metaTitle` | String? | -- | -- | SEO meta title |
| `metaDescription` | String? | -- | -- | SEO meta description |
| `readTime` | Int? | -- | -- | Estimated read time in minutes |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** categories (M:N via BlogPostCategory), tags (M:N via BlogPostTag)
**Indexes:** `[slug]`, `[status]`

---

### BlogCategory
**Table:** `blog_categories`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | unique | -- | Category name |
| `slug` | String | unique | -- | URL slug |

**Relations:** posts (M:N via BlogPostCategory)

---

### BlogPostCategory (Join Table)
**Table:** `blog_post_categories`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `postId` | String | PK (composite), FK -> BlogPost (cascade delete) | Blog post reference |
| `categoryId` | String | PK (composite), FK -> BlogCategory (cascade delete) | Category reference |

---

### BlogTag
**Table:** `blog_tags`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | unique | -- | Tag name |
| `slug` | String | unique | -- | URL slug |

**Relations:** posts (M:N via BlogPostTag)

---

### BlogPostTag (Join Table)
**Table:** `blog_post_tags`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `postId` | String | PK (composite), FK -> BlogPost (cascade delete) | Blog post reference |
| `tagId` | String | PK (composite), FK -> BlogTag (cascade delete) | Tag reference |

---

### SupportTicket
**Table:** `support_tickets`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `ticketNumber` | String | unique | -- | Human-readable ticket number |
| `userId` | String | FK -> User | -- | Ticket creator |
| `subject` | String | -- | -- | Ticket subject |
| `category` | String | -- | -- | Ticket category |
| `status` | TicketStatus | -- | `OPEN` | Current status |
| `priority` | TicketPriority | -- | `MEDIUM` | Priority level |
| `assignedTo` | String? | -- | -- | Assigned staff user ID |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

**Relations:** messages (1:N)
**Indexes:** `[userId]`, `[status]`

---

### TicketMessage
**Table:** `ticket_messages`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `ticketId` | String | FK -> SupportTicket (cascade delete) | -- | Parent ticket |
| `userId` | String | FK -> User | -- | Message author |
| `content` | String | @db.Text | -- | Message content |
| `attachment` | String? | -- | -- | Attachment URL |
| `createdAt` | DateTime | -- | `now()` | Creation time |

**Indexes:** `[ticketId]`

---

### Notification
**Table:** `notifications`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `userId` | String | FK -> User (cascade delete) | -- | Recipient user |
| `type` | NotificationType | -- | -- | Notification type |
| `title` | String | -- | -- | Notification title |
| `message` | String | -- | -- | Notification body |
| `data` | Json? | -- | -- | Additional data (deep link info) |
| `isRead` | Boolean | -- | `false` | Read status |
| `createdAt` | DateTime | -- | `now()` | Creation time |

**Indexes:** `[userId, isRead]`

---

### StoreSettings
**Table:** `store_settings`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `storeName` | String | -- | `"Earth Revibe"` | Store display name |
| `logo` | String? | -- | -- | Store logo URL |
| `contactEmail` | String? | -- | -- | Customer support email |
| `contactPhone` | String? | -- | -- | Customer support phone |
| `socialInstagram` | String? | -- | -- | Instagram profile URL |
| `socialFacebook` | String? | -- | -- | Facebook page URL |
| `socialTwitter` | String? | -- | -- | Twitter/X profile URL |
| `freeShippingThreshold` | Decimal(10,2)? | -- | -- | Order subtotal for free shipping |
| `gstRate` | Decimal(5,2) | -- | `18` | GST percentage |
| `returnWindowDays` | Int | -- | `7` | Days allowed for return requests |
| `checkoutConfig` | Json? | -- | -- | Razorpay checkout configuration |
| `shippingConfig` | Json? | -- | -- | Shipping rules configuration |
| `updatedAt` | DateTime | -- | `@updatedAt` | Last update time |

---

### ShippingZone
**Table:** `shipping_zones`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `name` | String | -- | -- | Zone name (e.g., "North India") |
| `states` | String[] | -- | -- | Indian states in this zone |
| `rate` | Decimal(10,2) | -- | -- | Shipping rate in INR |
| `minDays` | Int | -- | -- | Minimum delivery days |
| `maxDays` | Int | -- | -- | Maximum delivery days |
| `isActive` | Boolean | -- | `true` | Active status |

---

### PendingCheckout
**Table:** `pending_checkouts`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `orderNumber` | String | unique | -- | Pre-assigned order number |
| `userId` | String? | -- | -- | User ID (null for guest checkout) |
| `guestEmail` | String? | -- | -- | Guest email |
| `razorpayOrderId` | String | unique | -- | Razorpay order ID |
| `discountCode` | String? | -- | -- | Applied discount code |
| `loyaltyPointsToUse` | Int | -- | `0` | Points to deduct on completion |
| `subtotal` | Decimal(10,2) | -- | -- | Order subtotal |
| `discountAmount` | Decimal(10,2) | -- | `0` | Discount amount |
| `loyaltyDiscount` | Decimal(10,2) | -- | `0` | Loyalty points discount amount |
| `itemsJson` | String | -- | -- | Serialized cart items |
| `stockReserved` | Boolean | -- | `false` | Whether stock has been reserved |
| `reservedAt` | DateTime? | -- | -- | Stock reservation timestamp |
| `createdAt` | DateTime | -- | `now()` | Checkout initiation time |

**Indexes:** `[userId]`, `[createdAt]`

---

### IdempotencyKey
**Table:** `idempotency_keys`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | String | PK | `cuid()` | Unique identifier |
| `key` | String | unique | -- | Idempotency key value |
| `userId` | String | -- | -- | User who made the request |
| `status` | String | -- | -- | Processing status: PROCESSING, COMPLETED, FAILED |
| `endpoint` | String | -- | -- | API endpoint that was called |
| `response` | Json? | -- | -- | Cached response (for completed requests) |
| `createdAt` | DateTime | -- | `now()` | Creation time |
| `expiresAt` | DateTime | -- | -- | Key expiry time |

**Indexes:** `[key, userId]`, `[expiresAt]`

---

## Relationship Diagram (Simplified)

```
User 1--N Address
User 1--1 Cart
User 1--N Order
User 1--N Review
User 1--N WishlistItem
User 1--N LoyaltyTransaction
User 1--N SupportTicket
User 1--N Notification
User 1--N Referral (as Referrer)
User 1--1 Referral (as Referee)

Category 1--N Product (category tree: Category -> Category)
Product 1--N ProductImage
Product 1--N ProductVariant
Product M--N Tag (via ProductTag)

Cart 1--N CartItem
CartItem N--1 ProductVariant

Order 1--N OrderItem
Order 1--1 Payment
Order 1--N OrderStatusHistory
Order 1--N OrderNote
Order 1--1 ReturnRequest
Order N--1 DiscountCode
Order N--1 Address
OrderItem N--1 ProductVariant

BlogPost M--N BlogCategory (via BlogPostCategory)
BlogPost M--N BlogTag (via BlogPostTag)

SupportTicket 1--N TicketMessage
```
