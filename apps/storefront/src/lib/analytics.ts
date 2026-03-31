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

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);

  // Also send to GA4 if available
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', event, properties);
  }
}

// ── E-commerce events (tracked to both PostHog + GA4) ───────────────────────

export function trackProductViewed(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  trackEvent('product_viewed', product);
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
}

export function trackCheckoutStarted(cart: { total: number; itemCount: number }) {
  trackEvent('checkout_started', cart);
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
  fbq('track', 'Purchase', {
    value: order.total,
    currency: 'INR',
    num_items: order.itemCount,
    content_type: 'product',
  });
}

export function trackSearch(query: string, resultCount?: number) {
  trackEvent('search', { query, result_count: resultCount });
  fbq('track', 'Search', { search_string: query });
}

export function trackWishlistToggle(product: { id: string; name: string; added: boolean }) {
  trackEvent(product.added ? 'wishlist_added' : 'wishlist_removed', product);
  if (product.added) {
    fbq('track', 'AddToWishlist', {
      content_ids: [product.id],
      content_name: product.name,
    });
  }
}
