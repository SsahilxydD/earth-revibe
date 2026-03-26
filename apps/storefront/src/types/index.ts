/**
 * Re-export all shared types from @earth-revibe/shared.
 * This is the ONLY place storefront types come from — never duplicate here.
 */
export type {
  // Pagination & API
  Pagination,
  PaginatedResponse,
  ApiErrorDetail,
  ApiSuccessResponse,

  // Product
  Product,
  ProductImage,
  ProductVariant,
  Category,
  ProductListParams,

  // User & Auth
  User,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,

  // Address
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,

  // Order
  Order,
  OrderItem,
  OrderPayment,
  OrderListParams,

  // Blog
  BlogPost,
  BlogCategory,
  BlogTag,
  BlogListParams,

  // Review
  Review,
  CreateReviewPayload,

  // Support
  SupportTicket,
  TicketMessage,
  CreateTicketPayload,
  ReplyToTicketPayload,

  // Wishlist
  WishlistItem,

  // Loyalty
  LoyaltyTransaction,
  LoyaltySummary,

  // Referral
  Referral,

  // Discount
  Discount,

  // Cart
  CartItem,

  // Notification
  Notification,
} from '@earth-revibe/shared';

// Re-export ClientApiError as ApiError for backward compat with existing hook code
export type { ClientApiError as ApiError } from '@earth-revibe/shared';

export type { ProductStatus } from '@earth-revibe/shared';
