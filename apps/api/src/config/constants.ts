export const APP_CONSTANTS = {
  /** Pending checkouts older than this are considered stale (2 hours). */
  CHECKOUT_EXPIRY_MS: 2 * 60 * 60 * 1000,

  /** Low stock threshold for product variant alerts */
  LOW_STOCK_THRESHOLD: 5,

  /** Maximum items allowed in a single cart */
  MAX_CART_ITEMS: 50,

  /** Maximum upload size in megabytes */
  MAX_UPLOAD_SIZE_MB: 10,

  /** bcrypt hash rounds for passwords */
  PASSWORD_HASH_ROUNDS: 12,

  /** Default weight per item in kg for shipping estimate */
  DEFAULT_ITEM_WEIGHT_KG: 0.3,

  /** Minimum total shipping weight in kg */
  MIN_SHIPPING_WEIGHT_KG: 0.5,

  /** Shiprocket token cache duration (9 days; tokens last 10 days) */
  SHIPROCKET_TOKEN_CACHE_MS: 9 * 24 * 60 * 60 * 1000,

  /** Refresh token expiry duration (30 days) */
  REFRESH_TOKEN_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,

  /** Loyalty points earned per currency unit spent (1 point per 100 INR) */
  LOYALTY_POINTS_PER_HUNDRED: 1,

  /** Referral rewards */
  REFERRER_REWARD_POINTS: 100,
  REFEREE_REWARD_POINTS: 50,

  /** Rate limit: max requests per window */
  RATE_LIMIT_MAX: 1000,

  /** Rate limit: window duration in ms (15 minutes) */
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,

  /** Graceful shutdown timeout in ms */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 10_000,

  /** Max CSV export rows */
  MAX_CSV_EXPORT_ROWS: 10000,

  /** Autocomplete result limits */
  AUTOCOMPLETE_PRODUCTS_LIMIT: 5,
  AUTOCOMPLETE_CATEGORIES_LIMIT: 3,
  AUTOCOMPLETE_BLOG_LIMIT: 2,

  /** Default pagination limit */
  DEFAULT_PAGE_LIMIT: 20,

  /** Max pagination limit */
  MAX_PAGE_LIMIT: 100,
} as const;
