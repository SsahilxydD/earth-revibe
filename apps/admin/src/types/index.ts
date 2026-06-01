/**
 * Re-export all shared types from @earth-revibe/shared.
 * This is the ONLY place admin types come from — never duplicate here.
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

  // Admin list params
  CustomerListParams,
  DiscountListParams,
  InventoryListParams,

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

// Re-export ClientApiError as ApiError for consistency with storefront
export type { ClientApiError as ApiError } from '@earth-revibe/shared';

// Re-export enums
export type { ProductStatus, OrderStatus, PaymentStatus, OrderSource } from '@earth-revibe/shared';

// Manual / offline order types
export type {
  CreateManualOrderInput,
  ManualOrderItemInput,
  OfflinePaymentMethod,
  ArchiveOrderInput,
  AdminOrderQuery,
  SendCustomerOtpInput,
  VerifyCustomerOtpInput,
  CreateDraftOrderInput,
  UpdateDraftOrderInput,
  VerifyDraftCustomerInput,
  ConfirmOfflineOrderInput,
  UpdateOrderDateInput,
} from '@earth-revibe/shared';
