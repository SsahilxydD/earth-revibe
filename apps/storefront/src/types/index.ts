// ─── Product ────────────────────────────────────────────────────────────────

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductImage {
  id: string;
  url: string;
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

// ─── Category ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
}

// ─── User / Auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  loyaltyPoints: number;
  referralCode: string | null;
  createdAt: string;
}

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
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ─── Orders ─────────────────────────────────────────────────────────────────

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

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: Record<string, unknown>;
  payment: Record<string, unknown>;
  createdAt: string;
}

// ─── Address ────────────────────────────────────────────────────────────────

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

// ─── Blog ───────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  user: { firstName: string; lastName: string };
  createdAt: string;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
}

// ─── Support ────────────────────────────────────────────────────────────────

export interface TicketMessage {
  id: string;
  content: string;
  isStaff: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
  createdAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  category: string;
  message: string;
  priority?: string;
}

export interface ReplyToTicketPayload {
  content: string;
}

// ─── Wishlist ───────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string;
  product: Product;
  createdAt: string;
}

// ─── Loyalty ────────────────────────────────────────────────────────────────

export interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  createdAt: string;
}

// ─── Referrals ──────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  refereeId: string;
  status: string;
  reward: number;
  createdAt: string;
  referee?: { firstName: string; lastName: string; email: string };
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  products?: T[];
  orders?: T[];
  items?: T[];
  pagination: Pagination;
}

// ─── Product Query Params ───────────────────────────────────────────────────

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
  sortOrder?: 'asc' | 'desc';
  isFeatured?: boolean;
  status?: ProductStatus;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ─── API Error ──────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: { field?: string; message: string }[];
}
