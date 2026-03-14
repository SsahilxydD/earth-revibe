/**
 * Shared API response types for all Earth Revibe apps.
 *
 * These are the shapes returned by the API after JSON serialization.
 * All Decimal fields become `number`, all Date fields become `string`.
 * Both storefront and admin should import from here — never duplicate.
 */

import type {
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  DiscountType,
  BlogPostStatus,
  TicketStatus,
  TicketPriority,
  LoyaltyTransactionType,
  ReferralStatus,
  UserRole,
} from "../enums";

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generic paginated API response.
 * The API returns flat pagination (total, page, limit, totalPages) alongside the data array.
 * The data array key varies per entity (products, orders, posts, etc.).
 * Use `normalizePaginated()` to ensure a nested `pagination` object is always present.
 */
/**
 * When K is explicitly provided (e.g. 'products'), the entity array is strongly typed.
 * When K is omitted (defaults to string), falls back to permissive dynamic access.
 */
export type PaginatedResponse<T = unknown, K extends string = string> =
  { pagination: Pagination } &
  (string extends K ? Record<string, any> : Record<K, T[]>);

// ─── API Response / Error ────────────────────────────────────────────────────

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Client-side API error shape (thrown by API client on non-2xx responses) */
export interface ClientApiError {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  /** Full-quality original image (Supabase Storage) */
  url: string;
  /** Optimized thumbnail (Cloudflare Images when available, otherwise null) */
  thumbnailUrl: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string | null;
  price: number | null;
  stock: number;
  lowStockThreshold: number;
  barcode: string | null;
  weight: number | null;
  weightUnit: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  averageRating: number | null;
  reviewCount: number;
  categoryId: string | null;
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: { tag: { name: string } }[];
  // Metafields
  material: string | null;
  careInstructions: string | null;
  dimensions: string | null;
  weight: number | null;
  weightUnit: string | null;
  fit: string | null;
  printType: string | null;
  washInstructions: string | null;
  composition: string | null;
  fabricGsm: string | null;
  measurements: string | null;
  neckline: string | null;
  sleeveLength: string | null;
  colorPattern: string | null;
  fabricWeight: string | null;
  origin: string | null;
  ageGroup: string | null;
  targetGender: string | null;
  waistRise: string | null;
  pantsLengthType: string | null;
  topLengthType: string | null;
  outerwearFeatures: string | null;
  vendor: string | null;
  productType: string | null;
  returnsInfo: string | null;
  shippingInfo: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole | string;
  isActive: boolean;
  loyaltyPoints: number;
  referralCode: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderPayment {
  id: string;
  status: PaymentStatus | string;
  method: PaymentMethod | string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amount: number;
  paidAt: string | null;
  refundId: string | null;
  refundAmount: number | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderStatus | string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  items: OrderItem[];
  shippingAddress: Address | null;
  payment: OrderPayment | null;
  notes: string | null;
  awbCode: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Blog ────────────────────────────────────────────────────────────────────

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: BlogPostStatus | string;
  publishedAt: string | null;
  scheduledAt: string | null;
  readTime: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  author: { firstName: string; lastName: string } | null;
  categories?: { category: BlogCategory }[];
  tags?: { tag: BlogTag }[];
  createdAt: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  user: { firstName: string; lastName: string };
  createdAt: string;
}

// ─── Support ─────────────────────────────────────────────────────────────────

export interface TicketMessage {
  id: string;
  content: string;
  isStaff: boolean;
  attachment: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  assignedTo: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  product: Product;
  createdAt: string;
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTransactionType | string;
  points: number;
  description: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface LoyaltySummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
}

// ─── Referral ────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  refereeId: string;
  status: ReferralStatus | string;
  referrerReward: number;
  refereeReward: number;
  createdAt: string;
  referee?: { firstName: string; lastName: string; email: string };
}

// ─── Discount ────────────────────────────────────────────────────────────────

export interface Discount {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType | string;
  value: number;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  applicableCategories: string[];
  applicableProducts: string[];
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice: number | null;
  size: string;
  color: string;
  quantity: number;
  maxQuantity: number;
}

// ─── Query Params ────────────────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isFeatured?: boolean;
  status?: ProductStatus | string;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DiscountListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
  type?: string;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: string;
  sortBy?: string;
  threshold?: number;
}

// ─── Auth Payloads ───────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  referralCode?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface CreateAddressPayload {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault?: boolean;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export interface CreateTicketPayload {
  subject: string;
  category: string;
  description: string;
  priority?: string;
}

export interface ReplyToTicketPayload {
  content: string;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
}
