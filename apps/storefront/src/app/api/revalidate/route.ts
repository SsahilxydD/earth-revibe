import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

// The admin app calls this route from the BROWSER on a different origin, so
// the preflight must be answered with explicit CORS headers — without them
// the browser blocks the POST and admin edits only go live on the hourly
// ISR timer (the silent-staleness bug of 2026-07-13). Wildcard origin is
// fine here: the route is gated by the secret, not by the caller's origin,
// and no cookies/credentials are involved.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { secret, tags } = await request.json();

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Invalid secret' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, message: 'tags must be a non-empty array' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({ success: true, revalidated: tags }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
