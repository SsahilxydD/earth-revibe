import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy for Razorpay Magic Checkout shipping-info callback.
 *
 * Why this exists on the storefront instead of hitting Railway directly:
 * Razorpay's callback pipeline appears to only fire for URLs on a merchant's
 * registered business domains. Our Railway host is not on that allowlist, so
 * the callback never reached the API. Registering THIS URL
 * (www.earthrevibe.com/api/razorpay/shipping-info) in Razorpay's dashboard
 * puts the callback target on an approved domain; we then forward to Railway.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  const upstream = await fetch(`${API_BASE}/checkout/shipping-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
