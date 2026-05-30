import posthog from 'posthog-js';

// ── PostHog events ──────────────────────────────────────────────────────────

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits);
}

export function resetUser() {
  posthog.reset();
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'fbq' in window) {
    (window as any).fbq(...args);
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag(...args);
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

// ── E-commerce events (tracked to PostHog + GA4 + Meta Pixel) ──────────────

export function trackProductViewed(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  trackEvent('product_viewed', product);

  // GA4 standard ecommerce: view_item
  gtag('event', 'view_item', {
    currency: 'INR',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
      },
    ],
  });

  fbq('track', 'ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    content_type: 'product',
    value: product.price,
    currency: 'INR',
  });
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}) {
  trackEvent('add_to_cart', product);

  // GA4 standard ecommerce: add_to_cart
  gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: product.price * product.quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_variant: product.variant,
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });

  fbq('track', 'AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    value: product.price * product.quantity,
    currency: 'INR',
  });
}

export function trackRemoveFromCart(product: { id: string; name: string }) {
  trackEvent('remove_from_cart', product);

  // GA4 standard ecommerce: remove_from_cart
  gtag('event', 'remove_from_cart', {
    items: [{ item_id: product.id, item_name: product.name }],
  });
}

export function trackCheckoutStarted(cart: { total: number; itemCount: number }) {
  trackEvent('checkout_started', cart);

  // GA4 standard ecommerce: begin_checkout
  gtag('event', 'begin_checkout', {
    currency: 'INR',
    value: cart.total,
  });

  fbq('track', 'InitiateCheckout', {
    value: cart.total,
    currency: 'INR',
    num_items: cart.itemCount,
  });
}

export function trackPurchaseCompleted(order: {
  orderId: string;
  total: number;
  itemCount: number;
  paymentMethod?: string;
}) {
  trackEvent('purchase_completed', order);

  // GA4 standard ecommerce: purchase
  gtag('event', 'purchase', {
    transaction_id: order.orderId,
    currency: 'INR',
    value: order.total,
    payment_type: order.paymentMethod,
  });

  fbq(
    'track',
    'Purchase',
    {
      value: order.total,
      currency: 'INR',
      num_items: order.itemCount,
      content_type: 'product',
    },
    // Shared dedup key with the server CAPI Purchase (sends eventId=orderNumber).
    // Without this, prepaid + COD purchases are double-counted by Meta.
    { eventID: order.orderId }
  );
}

export function trackSearch(query: string, resultCount?: number) {
  trackEvent('search', { query, result_count: resultCount });

  // GA4 standard: search
  gtag('event', 'search', { search_term: query });

  fbq('track', 'Search', { search_string: query });
}

export function trackWishlistToggle(product: { id: string; name: string; added: boolean }) {
  trackEvent(product.added ? 'wishlist_added' : 'wishlist_removed', product);

  if (product.added) {
    // GA4 standard: add_to_wishlist
    gtag('event', 'add_to_wishlist', {
      items: [{ item_id: product.id, item_name: product.name }],
    });

    fbq('track', 'AddToWishlist', {
      content_ids: [product.id],
      content_name: product.name,
    });
  }
}
