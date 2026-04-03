import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'product-images';
const MAX_WIDTH = 2000;
const WEBP_QUALITY = 85;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type CompressResult =
  | { status: 'compressed'; url: string }
  | { status: 'skipped' }
  | { status: 'failed' };

async function compressAndReupload(imageUrl: string): Promise<CompressResult> {
  try {
    // Download the original image
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.error(`  Failed to download: ${res.status}`);
      return { status: 'failed' };
    }

    const originalBuffer = Buffer.from(await res.arrayBuffer());
    const originalSize = originalBuffer.length;

    // Skip if already small (<2MB — probably already compressed)
    if (originalSize < 2 * 1024 * 1024) {
      console.log(`  Already small (${(originalSize / 1024).toFixed(0)}KB) — skipping`);
      return { status: 'skipped' };
    }

    // Compress with sharp
    const compressed = await sharp(originalBuffer)
      .resize(MAX_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const ratio = ((1 - compressed.length / originalSize) * 100).toFixed(1);
    console.log(
      `  ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressed.length / 1024).toFixed(0)}KB (${ratio}% smaller)`
    );

    // Upload compressed version
    const storagePath = `${randomUUID()}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, compressed, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });

    if (error) {
      console.error(`  Upload failed: ${error.message}`);
      return { status: 'failed' };
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return { status: 'compressed', url: urlData.publicUrl };
  } catch (err) {
    console.error(`  Error:`, err instanceof Error ? err.message : err);
    return { status: 'failed' };
  }
}

async function main() {
  console.log('=== Compress Existing Product Images ===\n');

  const images = await prisma.productImage.findMany({
    select: { id: true, url: true, productId: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`Found ${images.length} images to process\n`);

  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    console.log(`[${i + 1}/${images.length}] ${img.url.split('/').pop()}`);

    const result = await compressAndReupload(img.url);

    if (result.status === 'compressed') {
      await prisma.productImage.update({
        where: { id: img.id },
        data: { url: result.url },
      });
      console.log(`  ✓ Updated DB\n`);
      compressed++;
    } else if (result.status === 'skipped') {
      skipped++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Compressed: ${compressed}`);
  console.log(`Skipped (already small): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
