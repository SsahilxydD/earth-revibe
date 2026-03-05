# Earth Revibe - Backend Schema Document

## Database: PostgreSQL 16 with Prisma ORM

---

## Enums (Shared via `packages/shared`)

```typescript
// packages/shared/src/enums.ts

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  SUPPORT_STAFF = "SUPPORT_STAFF",
}

export enum ProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum OrderStatus {
  PLACED = "PLACED",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMethod {
  UPI = "UPI",
  CARD = "CARD",
  NETBANKING = "NETBANKING",
  WALLET = "WALLET",
  EMI = "EMI",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FLAT = "FLAT",
  BUY_X_GET_Y = "BUY_X_GET_Y",
  FREE_SHIPPING = "FREE_SHIPPING",
}

export enum TicketStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum TicketPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum BlogPostStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  SCHEDULED = "SCHEDULED",
}

export enum LoyaltyTransactionType {
  EARNED = "EARNED",
  REDEEMED = "REDEEMED",
  BONUS = "BONUS",
  EXPIRED = "EXPIRED",
  ADJUSTED = "ADJUSTED",
}

export enum ReferralStatus {
  PENDING = "PENDING",
  SIGNED_UP = "SIGNED_UP",
  CONVERTED = "CONVERTED",
}

export enum ReturnStatus {
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PICKED_UP = "PICKED_UP",
  RECEIVED = "RECEIVED",
  REFUND_INITIATED = "REFUND_INITIATED",
  COMPLETED = "COMPLETED",
}

export enum NotificationType {
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  ORDER_SHIPPED = "ORDER_SHIPPED",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  RETURN_UPDATE = "RETURN_UPDATE",
  TICKET_REPLY = "TICKET_REPLY",
  LOYALTY_EARNED = "LOYALTY_EARNED",
  REFERRAL_REWARD = "REFERRAL_REWARD",
  LOW_STOCK = "LOW_STOCK",
  PROMOTION = "PROMOTION",
}
```

---

## Prisma Schema (`packages/db/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// USER & AUTH
// ==========================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  phone         String?   @unique
  passwordHash  String
  firstName     String
  lastName      String
  avatar        String?
  role          UserRole  @default(CUSTOMER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  phoneVerified Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  addresses         Address[]
  orders            Order[]
  reviews           Review[]
  wishlistItems     WishlistItem[]
  cart              Cart?
  loyaltyPoints     Int              @default(0)
  loyaltyHistory    LoyaltyTransaction[]
  referralCode      String?          @unique
  referralsMade     Referral[]       @relation("Referrer")
  referredBy        Referral?        @relation("Referee")
  supportTickets    SupportTicket[]
  ticketMessages    TicketMessage[]
  refreshTokens     RefreshToken[]
  notifications     Notification[]
  orderNotes        OrderNote[]

  @@map("users")
}

enum UserRole {
  CUSTOMER
  ADMIN
  SUPER_ADMIN
  SUPPORT_STAFF
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("refresh_tokens")
}

model Address {
  id         String  @id @default(cuid())
  userId     String
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label      String  @default("Home") // Home, Work, Other
  fullName   String
  phone      String
  line1      String
  line2      String?
  city       String
  state      String
  pinCode    String
  isDefault  Boolean @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  orders     Order[]

  @@index([userId])
  @@map("addresses")
}

// ==========================================
// PRODUCTS & CATEGORIES
// ==========================================

model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  products    Product[]

  @@index([parentId])
  @@map("categories")
}

model Product {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  description     String        @db.Text
  shortDescription String?
  price           Decimal       @db.Decimal(10, 2)
  compareAtPrice  Decimal?      @db.Decimal(10, 2)
  material        String?
  careInstructions String?      @db.Text
  status          ProductStatus @default(DRAFT)
  isFeatured      Boolean       @default(false)
  categoryId      String
  category        Category      @relation(fields: [categoryId], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  images          ProductImage[]
  variants        ProductVariant[]
  reviews         Review[]
  wishlistItems   WishlistItem[]
  tags            ProductTag[]

  @@index([categoryId])
  @@index([status])
  @@index([slug])
  @@map("products")
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  publicId  String  // Cloudinary public ID
  altText   String?
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)

  @@index([productId])
  @@map("product_images")
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku       String  @unique
  size      String  // XS, S, M, L, XL, XXL
  color     String
  colorHex  String?
  price     Decimal? @db.Decimal(10, 2) // Override product price if set
  stock     Int     @default(0)
  lowStockThreshold Int @default(5)
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cartItems  CartItem[]
  orderItems OrderItem[]

  @@unique([productId, size, color])
  @@index([productId])
  @@index([sku])
  @@map("product_variants")
}

model Tag {
  id       String       @id @default(cuid())
  name     String       @unique
  slug     String       @unique
  products ProductTag[]

  @@map("tags")
}

model ProductTag {
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tagId     String
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tags")
}

// ==========================================
// CART
// ==========================================

model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@map("carts")
}

model CartItem {
  id        String         @id @default(cuid())
  cartId    String
  cart      Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int            @default(1)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@unique([cartId, variantId])
  @@index([cartId])
  @@map("cart_items")
}

// ==========================================
// ORDERS & PAYMENTS
// ==========================================

model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique // Earth Revibe format: ER-XXXXXX
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  addressId       String
  address         Address       @relation(fields: [addressId], references: [id])
  status          OrderStatus   @default(PLACED)
  subtotal        Decimal       @db.Decimal(10, 2)
  discountAmount  Decimal       @default(0) @db.Decimal(10, 2)
  shippingAmount  Decimal       @default(0) @db.Decimal(10, 2)
  taxAmount       Decimal       @default(0) @db.Decimal(10, 2)
  totalAmount     Decimal       @db.Decimal(10, 2)
  loyaltyPointsUsed   Int       @default(0)
  loyaltyPointsEarned Int       @default(0)
  discountCodeId  String?
  discountCode    DiscountCode? @relation(fields: [discountCodeId], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  items           OrderItem[]
  payment         Payment?
  statusHistory   OrderStatusHistory[]
  notes           OrderNote[]
  returnRequest   ReturnRequest?

  @@index([userId])
  @@index([orderNumber])
  @@index([status])
  @@map("orders")
}

enum OrderStatus {
  PLACED
  CONFIRMED
  PROCESSING
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURNED
  REFUNDED
}

model OrderItem {
  id        String         @id @default(cuid())
  orderId   String
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId String
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  quantity  Int
  unitPrice Decimal        @db.Decimal(10, 2)
  totalPrice Decimal       @db.Decimal(10, 2)

  // Snapshot of product details at time of order (denormalized)
  productName    String
  productImage   String?
  variantSize    String
  variantColor   String

  @@index([orderId])
  @@map("order_items")
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  changedBy String?     // Admin user ID who changed it
  createdAt DateTime    @default(now())

  @@index([orderId])
  @@map("order_status_history")
}

model OrderNote {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  content   String   @db.Text
  isInternal Boolean @default(true)
  createdAt DateTime @default(now())

  @@index([orderId])
  @@map("order_notes")
}

model Payment {
  id                  String        @id @default(cuid())
  orderId             String        @unique
  order               Order         @relation(fields: [orderId], references: [id])
  razorpayOrderId     String        @unique
  razorpayPaymentId   String?       @unique
  razorpaySignature   String?
  amount              Decimal       @db.Decimal(10, 2)
  currency            String        @default("INR")
  status              PaymentStatus @default(PENDING)
  method              PaymentMethod?
  refundId            String?
  refundAmount        Decimal?      @db.Decimal(10, 2)
  failureReason       String?
  paidAt              DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([razorpayOrderId])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PaymentMethod {
  UPI
  CARD
  NETBANKING
  WALLET
  EMI
}

// ==========================================
// RETURNS
// ==========================================

model ReturnRequest {
  id           String       @id @default(cuid())
  orderId      String       @unique
  order        Order        @relation(fields: [orderId], references: [id])
  reason       String       @db.Text
  status       ReturnStatus @default(REQUESTED)
  adminNote    String?      @db.Text
  refundAmount Decimal?     @db.Decimal(10, 2)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@map("return_requests")
}

enum ReturnStatus {
  REQUESTED
  APPROVED
  REJECTED
  PICKED_UP
  RECEIVED
  REFUND_INITIATED
  COMPLETED
}

// ==========================================
// REVIEWS
// ==========================================

model Review {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  rating     Int      // 1-5
  title      String?
  content    String?  @db.Text
  isVerified Boolean  @default(false) // Verified purchase
  isApproved Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([productId, userId])
  @@index([productId])
  @@map("reviews")
}

// ==========================================
// WISHLIST
// ==========================================

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, productId])
  @@index([userId])
  @@map("wishlist_items")
}

// ==========================================
// DISCOUNTS
// ==========================================

model DiscountCode {
  id               String       @id @default(cuid())
  code             String       @unique
  description      String?
  type             DiscountType
  value            Decimal      @db.Decimal(10, 2) // Percentage or flat amount
  minOrderValue    Decimal?     @db.Decimal(10, 2)
  maxDiscountAmount Decimal?    @db.Decimal(10, 2) // Cap for percentage discounts
  usageLimit       Int?         // Total uses allowed
  usageCount       Int          @default(0)
  perUserLimit     Int          @default(1)
  applicableCategories String[] // Category IDs, empty = all
  applicableProducts   String[] // Product IDs, empty = all
  isActive         Boolean      @default(true)
  startsAt         DateTime
  expiresAt        DateTime
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  orders           Order[]

  @@index([code])
  @@map("discount_codes")
}

enum DiscountType {
  PERCENTAGE
  FLAT
  BUY_X_GET_Y
  FREE_SHIPPING
}

// ==========================================
// LOYALTY & REFERRALS
// ==========================================

model LoyaltyTransaction {
  id          String                 @id @default(cuid())
  userId      String
  user        User                   @relation(fields: [userId], references: [id])
  type        LoyaltyTransactionType
  points      Int
  description String
  orderId     String?
  createdAt   DateTime               @default(now())

  @@index([userId])
  @@map("loyalty_transactions")
}

enum LoyaltyTransactionType {
  EARNED
  REDEEMED
  BONUS
  EXPIRED
  ADJUSTED
}

model LoyaltyConfig {
  id                  String  @id @default(cuid())
  pointsPerRupee      Decimal @db.Decimal(10, 4) // e.g., 0.1 = 1 point per Rs 10
  pointRedemptionValue Decimal @db.Decimal(10, 4) // e.g., 0.1 = 100 points = Rs 10
  welcomeBonus        Int     @default(0)
  reviewBonus         Int     @default(0)
  birthdayBonus       Int     @default(0)
  minRedeemPoints     Int     @default(100)
  isActive            Boolean @default(true)
  updatedAt           DateTime @updatedAt

  @@map("loyalty_config")
}

model Referral {
  id           String         @id @default(cuid())
  referrerId   String
  referrer     User           @relation("Referrer", fields: [referrerId], references: [id])
  refereeId    String         @unique
  referee      User           @relation("Referee", fields: [refereeId], references: [id])
  status       ReferralStatus @default(PENDING)
  referrerReward Int          @default(0) // Points awarded to referrer
  refereeReward  Int          @default(0) // Points awarded to referee
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([referrerId])
  @@map("referrals")
}

enum ReferralStatus {
  PENDING
  SIGNED_UP
  CONVERTED
}

model ReferralConfig {
  id              String  @id @default(cuid())
  referrerReward  Int     @default(100) // Points for referrer
  refereeReward   Int     @default(50)  // Points for referee
  requirePurchase Boolean @default(true) // Require purchase to convert
  isActive        Boolean @default(true)
  updatedAt       DateTime @updatedAt

  @@map("referral_config")
}

// ==========================================
// BLOG / CMS
// ==========================================

model BlogPost {
  id            String         @id @default(cuid())
  title         String
  slug          String         @unique
  excerpt       String?
  content       String         @db.Text
  featuredImage String?
  authorId      String
  status        BlogPostStatus @default(DRAFT)
  publishedAt   DateTime?
  scheduledAt   DateTime?
  metaTitle     String?
  metaDescription String?
  readTime      Int?           // Minutes
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  categories    BlogPostCategory[]
  tags          BlogPostTag[]

  @@index([slug])
  @@index([status])
  @@map("blog_posts")
}

enum BlogPostStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
}

model BlogCategory {
  id    String             @id @default(cuid())
  name  String             @unique
  slug  String             @unique
  posts BlogPostCategory[]

  @@map("blog_categories")
}

model BlogPostCategory {
  postId     String
  post       BlogPost     @relation(fields: [postId], references: [id], onDelete: Cascade)
  categoryId String
  category   BlogCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([postId, categoryId])
  @@map("blog_post_categories")
}

model BlogTag {
  id    String        @id @default(cuid())
  name  String        @unique
  slug  String        @unique
  posts BlogPostTag[]

  @@map("blog_tags")
}

model BlogPostTag {
  postId String
  post   BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  tagId  String
  tag    BlogTag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("blog_post_tags")
}

// ==========================================
// SUPPORT TICKETS
// ==========================================

model SupportTicket {
  id         String         @id @default(cuid())
  ticketNumber String       @unique // ER-TKT-XXXXX
  userId     String
  user       User           @relation(fields: [userId], references: [id])
  subject    String
  category   String
  status     TicketStatus   @default(OPEN)
  priority   TicketPriority @default(MEDIUM)
  assignedTo String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  messages   TicketMessage[]

  @@index([userId])
  @@index([status])
  @@map("support_tickets")
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model TicketMessage {
  id        String        @id @default(cuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  content   String        @db.Text
  attachment String?
  createdAt DateTime      @default(now())

  @@index([ticketId])
  @@map("ticket_messages")
}

// ==========================================
// NOTIFICATIONS
// ==========================================

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  data      Json?            // Additional context (order ID, etc.)
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@map("notifications")
}

enum NotificationType {
  ORDER_CONFIRMED
  ORDER_SHIPPED
  ORDER_DELIVERED
  ORDER_CANCELLED
  RETURN_UPDATE
  TICKET_REPLY
  LOYALTY_EARNED
  REFERRAL_REWARD
  LOW_STOCK
  PROMOTION
}

// ==========================================
// STORE SETTINGS
// ==========================================

model StoreSettings {
  id                  String  @id @default(cuid())
  storeName           String  @default("Earth Revibe")
  logo                String?
  contactEmail        String?
  contactPhone        String?
  socialInstagram     String?
  socialFacebook      String?
  socialTwitter       String?
  freeShippingThreshold Decimal? @db.Decimal(10, 2)
  gstRate             Decimal @default(18) @db.Decimal(5, 2) // GST percentage
  returnWindowDays    Int     @default(7)
  updatedAt           DateTime @updatedAt

  @@map("store_settings")
}

model ShippingZone {
  id        String  @id @default(cuid())
  name      String
  states    String[] // List of Indian states
  rate      Decimal  @db.Decimal(10, 2)
  minDays   Int
  maxDays   Int
  isActive  Boolean  @default(true)

  @@map("shipping_zones")
}
```

---

## Authentication Flow

### Registration
```
Client                    API                      Database
  |                        |                          |
  |-- POST /auth/register ->|                          |
  |   {email, password,    |                          |
  |    firstName, lastName,|                          |
  |    phone, referralCode}|                          |
  |                        |-- Validate (Zod) ------->|
  |                        |-- Hash password -------->|
  |                        |-- Create user ---------->|
  |                        |-- Generate referral code->|
  |                        |-- Process referral ------>|
  |                        |-- Award welcome bonus --->|
  |                        |-- Generate JWT tokens --->|
  |<-- {accessToken,       |                          |
  |     refreshToken,      |                          |
  |     user}              |                          |
```

### Login
```
Client                    API                      Database
  |                        |                          |
  |-- POST /auth/login --->|                          |
  |   {email, password}    |                          |
  |                        |-- Find user by email ---->|
  |                        |-- Verify password ------->|
  |                        |-- Generate JWT tokens --->|
  |                        |-- Store refresh token --->|
  |<-- {accessToken,       |                          |
  |     refreshToken,      |                          |
  |     user}              |                          |
```

### Token Refresh
```
Client                    API                      Database
  |                        |                          |
  |-- POST /auth/refresh ->|                          |
  |   {refreshToken}       |                          |
  |                        |-- Verify refresh token -->|
  |                        |-- Rotate tokens -------->|
  |                        |-- Delete old token ------>|
  |                        |-- Store new token ------->|
  |<-- {accessToken,       |                          |
  |     refreshToken}      |                          |
```

### Password Reset
```
Client                    API                      Database
  |                        |                          |
  |-- POST /auth/          |                          |
  |   forgot-password      |                          |
  |   {email}              |                          |
  |                        |-- Generate reset token -->|
  |                        |-- Send email ------------>|
  |<-- {message: "sent"}   |                          |
  |                        |                          |
  |-- POST /auth/          |                          |
  |   reset-password       |                          |
  |   {token, password}    |                          |
  |                        |-- Verify token --------->|
  |                        |-- Hash new password ----->|
  |                        |-- Update user ----------->|
  |<-- {message: "reset"}  |                          |
```

---

## Payment Flow (Razorpay)

```
Client                    API                    Razorpay
  |                        |                        |
  |-- POST /orders ------->|                        |
  |   {items, address,     |                        |
  |    discountCode,       |                        |
  |    loyaltyPoints}      |                        |
  |                        |-- Validate order ------>|
  |                        |-- Calculate totals ---->|
  |                        |-- Create Razorpay     ->|
  |                        |   order (amount, INR)   |
  |                        |<- razorpayOrderId ------|
  |                        |-- Create DB order ------>|
  |<-- {order,             |                        |
  |     razorpayOrderId,   |                        |
  |     razorpayKeyId}     |                        |
  |                        |                        |
  |-- Open Razorpay       -|----------------------->|
  |   Magic Checkout       |                        |
  |                        |                        |
  |<-- Payment callback ---|------------------------|
  |   {paymentId,          |                        |
  |    orderId, signature} |                        |
  |                        |                        |
  |-- POST /orders/verify ->|                        |
  |   {paymentId, orderId, |                        |
  |    signature}          |                        |
  |                        |-- Verify signature ---->|
  |                        |-- Update payment ------>|
  |                        |-- Update order status -->|
  |                        |-- Award loyalty pts ---->|
  |                        |-- Reduce stock -------->|
  |                        |-- Send confirmation ---->|
  |<-- {order: confirmed}  |                        |
  |                        |                        |
  |                        |<-- Webhook: payment   --|
  |                        |    captured              |
  |                        |-- Verify webhook sig -->|
  |                        |-- Update payment ------>|
```

---

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new customer | Public |
| POST | `/login` | Login | Public |
| POST | `/refresh` | Refresh access token | Public |
| POST | `/logout` | Logout (invalidate refresh token) | Customer |
| POST | `/forgot-password` | Send reset email | Public |
| POST | `/reset-password` | Reset password with token | Public |
| GET | `/me` | Get current user | Customer |

### Products (`/api/v1/products`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List products (filtered, paginated) | Public |
| GET | `/:slug` | Get product by slug | Public |
| POST | `/` | Create product | Admin |
| PUT | `/:id` | Update product | Admin |
| DELETE | `/:id` | Delete product | Admin |
| POST | `/:id/images` | Upload product images | Admin |
| DELETE | `/:id/images/:imageId` | Delete product image | Admin |

### Categories (`/api/v1/categories`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List categories | Public |
| GET | `/:slug` | Get category by slug | Public |
| POST | `/` | Create category | Admin |
| PUT | `/:id` | Update category | Admin |
| DELETE | `/:id` | Delete category | Admin |
| PUT | `/reorder` | Reorder categories | Admin |

### Cart (`/api/v1/cart`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get user cart | Customer |
| POST | `/items` | Add item to cart | Customer |
| PUT | `/items/:id` | Update cart item quantity | Customer |
| DELETE | `/items/:id` | Remove cart item | Customer |
| DELETE | `/` | Clear cart | Customer |

### Orders (`/api/v1/orders`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create order + Razorpay order | Customer |
| POST | `/verify` | Verify payment & confirm order | Customer |
| GET | `/` | List orders (customer: own, admin: all) | Customer/Admin |
| GET | `/:id` | Get order detail | Customer/Admin |
| PUT | `/:id/status` | Update order status | Admin |
| POST | `/:id/refund` | Process refund | Admin |
| POST | `/:id/cancel` | Cancel order | Customer |
| POST | `/:id/return` | Request return | Customer |
| PUT | `/:id/return` | Update return status | Admin |
| POST | `/:id/notes` | Add order note | Admin |
| POST | `/webhook` | Razorpay webhook handler | Public (verified) |

### Reviews (`/api/v1/reviews`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/product/:productId` | Get product reviews | Public |
| POST | `/` | Create review | Customer |
| PUT | `/:id` | Update review | Customer |
| DELETE | `/:id` | Delete review | Customer/Admin |

### Wishlist (`/api/v1/wishlist`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get wishlist | Customer |
| POST | `/` | Add to wishlist | Customer |
| DELETE | `/:productId` | Remove from wishlist | Customer |

### Discounts (`/api/v1/discounts`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/validate` | Validate discount code | Customer |
| GET | `/` | List all discount codes | Admin |
| POST | `/` | Create discount code | Admin |
| PUT | `/:id` | Update discount code | Admin |
| DELETE | `/:id` | Delete discount code | Admin |

### Loyalty (`/api/v1/loyalty`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/balance` | Get loyalty points balance | Customer |
| GET | `/history` | Get loyalty transactions | Customer |
| GET | `/config` | Get loyalty config | Admin |
| PUT | `/config` | Update loyalty config | Admin |

### Referrals (`/api/v1/referrals`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get referral info & stats | Customer |
| GET | `/config` | Get referral config | Admin |
| PUT | `/config` | Update referral config | Admin |
| GET | `/analytics` | Get referral analytics | Admin |

### Blog (`/api/v1/blog`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/posts` | List published posts | Public |
| GET | `/posts/:slug` | Get post by slug | Public |
| GET | `/posts/all` | List all posts (inc. drafts) | Admin |
| POST | `/posts` | Create post | Admin |
| PUT | `/posts/:id` | Update post | Admin |
| DELETE | `/posts/:id` | Delete post | Admin |
| GET | `/categories` | List blog categories | Public |
| POST | `/categories` | Create blog category | Admin |

### Support (`/api/v1/support`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tickets` | List tickets | Customer/Admin |
| POST | `/tickets` | Create ticket | Customer |
| GET | `/tickets/:id` | Get ticket detail | Customer/Admin |
| POST | `/tickets/:id/messages` | Add message | Customer/Admin |
| PUT | `/tickets/:id/status` | Update ticket status | Admin |
| PUT | `/tickets/:id/assign` | Assign ticket | Admin |

### Customers (`/api/v1/customers`) — Admin only
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List customers | Admin |
| GET | `/:id` | Get customer detail | Admin |

### Inventory (`/api/v1/inventory`) — Admin only
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List inventory (stock levels) | Admin |
| PUT | `/:variantId` | Update stock level | Admin |
| PUT | `/bulk` | Bulk stock update | Admin |
| GET | `/alerts` | Get low stock alerts | Admin |

### Settings (`/api/v1/settings`) — Admin only
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/store` | Get store settings | Admin |
| PUT | `/store` | Update store settings | Admin |
| GET | `/shipping` | Get shipping zones | Admin |
| POST | `/shipping` | Create shipping zone | Admin |
| PUT | `/shipping/:id` | Update shipping zone | Admin |
| DELETE | `/shipping/:id` | Delete shipping zone | Admin |
| GET | `/team` | List admin users | Super Admin |
| POST | `/team` | Create admin user | Super Admin |
| PUT | `/team/:id` | Update admin user role | Super Admin |
| DELETE | `/team/:id` | Deactivate admin user | Super Admin |

### Search (`/api/v1/search`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/?q=query` | Search products, categories, blog | Public |
| GET | `/autocomplete?q=query` | Autocomplete suggestions | Public |

### Analytics (`/api/v1/analytics`) — Admin only
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dashboard` | Dashboard KPIs | Admin |
| GET | `/revenue` | Revenue chart data | Admin |
| GET | `/top-products` | Top selling products | Admin |
| GET | `/customer-stats` | Customer statistics | Admin |

### Upload (`/api/v1/upload`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/image` | Upload image to Cloudinary | Admin |
| DELETE | `/image/:publicId` | Delete image from Cloudinary | Admin |
