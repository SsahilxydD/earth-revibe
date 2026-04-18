import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy for Razorpay Magic Checkout get-promotions callback.
 * See sibling file shipping-info/route.ts for why this proxy exists.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';

  console.log(`[promotions proxy] ua=${userAgent} sig=${signature ? 'yes' : 'no'} body=${body}`);

  const upstream = await fetch(`${API_BASE}/checkout/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body,
  });

  const text = await upstream.text();
  console.log(`[promotions proxy] upstream=${upstream.status} response=${text}`);

  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
