import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { secret, tags } = await request.json();

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ success: false, message: 'Invalid secret' }, { status: 401 });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, message: 'tags must be a non-empty array' },
        { status: 400 }
      );
    }

    for (const tag of tags) {
      revalidateTag(tag);
    }

    return NextResponse.json({ success: true, revalidated: tags });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }
}
