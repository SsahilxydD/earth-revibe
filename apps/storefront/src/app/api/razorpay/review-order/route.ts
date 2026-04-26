import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy for Razorpay Magic Checkout COD Review API.
 *
 * Razorpay calls this before confirming any COD order. Like the other
 * Magic Checkout callbacks (see sibling shipping-info/route.ts), Razorpay
 * only dispatches to URLs on a merchant's registered business-domain
 * allowlist — Railway isn't on it, so we accept the call here on
 * www.earthrevibe.com and forward to Railway with the Basic Auth header
 * preserved so the upstream credential check still runs.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const authHeader = request.headers.get('authorization') ?? '';
  const userAgent = request.headers.get('user-agent') ?? '';
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '';

  console.log(
    `[review-order proxy] ua=${userAgent} ip=${ip} auth=${authHeader ? 'present' : 'missing'} body=${body}`
  );

  const upstream = await fetch(`${API_BASE}/checkout/review-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body,
  });

  const text = await upstream.text();
  console.log(`[review-order proxy] upstream=${upstream.status} response=${text}`);

  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}
