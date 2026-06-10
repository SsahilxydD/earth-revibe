/**
 * Refresh the COPY on existing seed written reviews with UNIQUE, product-specific
 * text generated per product (see review-copy.generated.ts). Numbers, ratings,
 * reviewers, timestamps and approval flags are left untouched — this only rewrites
 * the title/content of rows that already have content.
 *
 * Why: the original persona copy banks were shared across same-vibe products, so
 * the same review text showed up on multiple products (the "looks fake" tell).
 * REVIEW_COPY gives every product its own distinct, deduped set of reviews.
 *
 * Positive (rating >= 4) reviews are dealt from the product's own bank with no
 * repeats within the product. The rare middling/low written review (rating 3 / <=2)
 * draws from small shared, deliberately generic sizing/fit banks below.
 *
 * Run:  set -a && . ./.env && set +a && pnpm exec tsx src/refresh-review-copy.ts
 * NOTE: writes to whatever DATABASE_URL points at (prod, in this project).
 */
import { PrismaClient } from '@prisma/client';
import { REVIEW_COPY } from './review-copy.generated';

const prisma = new PrismaClient();

// Shared, intentionally generic copy for the rare written review that lands on a
// middling/low rating. Real stores get repeated sizing complaints, so light reuse
// here reads as realistic rather than fake. No em dashes; at most one emoji.
const MIXED: { title: string; body: string }[] = [
  {
    title: 'Nice fabric, runs a bit big',
    body: 'Quality is genuinely good but the fit is roomier than I expected. Would suggest sizing down for a cleaner look.',
  },
  {
    title: 'Good, colour slightly different',
    body: 'Happy with the make. The shade is a little lighter than the photos but still looks nice in person.',
  },
  {
    title: 'Comfortable, delivery was slow',
    body: 'The piece itself is comfortable and well stitched. Shipping took longer than I hoped, otherwise no complaints.',
  },
  {
    title: 'Decent, lighter than I thought',
    body: 'Fabric feels a touch thinner than I expected for the price, but it is comfortable and easy to wear.',
  },
  {
    title: 'Like it, might size down',
    body: 'Looks good once on. The cut is a little relaxed for me so I might go a size down next time. 🙂',
  },
  {
    title: 'Pretty good overall',
    body: 'Material and finish are nice. Just wish the fit was a bit more tailored around the shoulders.',
  },
  {
    title: 'Happy, with a small note',
    body: 'Colour and feel are good. Took one wash and it held up fine, though it creases a little.',
  },
  {
    title: 'Good value, minor fit issue',
    body: 'For the price it is solid. The length runs slightly long on me but nothing a quick tailor cannot fix.',
  },
];
const CRITICAL: { title: string; body: string }[] = [
  {
    title: 'Runs large',
    body: 'The fabric is fine but it came up much bigger than the size chart suggested. Had to exchange for a smaller size.',
  },
  {
    title: 'Thinner than expected',
    body: 'Looks nice in photos but the material is lighter than I hoped for. Just okay for the price.',
  },
  {
    title: 'Fit was off for me',
    body: 'The cut is very relaxed and did not sit well on my frame. Quality is alright otherwise.',
  },
  {
    title: 'Colour not as shown',
    body: 'The shade was noticeably different from the listing. A bit disappointed even though the stitching is fine.',
  },
  {
    title: 'Size down before buying',
    body: 'Comfortable but oversized on me. Would recommend going a size down if you want a regular fit.',
  },
  {
    title: 'Okay, not great',
    body: 'It is wearable but did not wow me. The fit and weight were not quite what I expected.',
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function main() {
  console.log(
    '→ Refreshing review copy. Target DB:',
    process.env.DATABASE_URL?.split('@')[1] ?? '(unknown)'
  );

  const products = await prisma.product.findMany({ select: { id: true, slug: true, name: true } });
  let updated = 0;
  let skippedNoCopy = 0;
  let skippedNoWritten = 0;
  let rows = 0;

  for (const product of products) {
    const written = await prisma.review.findMany({
      where: {
        productId: product.id,
        user: { email: { endsWith: '@seed.reviews' } },
        content: { not: null },
      },
      select: { id: true, rating: true },
      orderBy: { createdAt: 'asc' },
    });
    if (written.length === 0) {
      skippedNoWritten++;
      continue;
    }

    const positive = REVIEW_COPY[product.slug];
    if (!positive || positive.length === 0) {
      console.log(`  · no generated copy for ${product.slug} (${product.name}); leaving as-is`);
      skippedNoCopy++;
      continue;
    }

    const pos = shuffle(positive);
    const mix = shuffle(MIXED);
    const cri = shuffle(CRITICAL);
    let pi = 0,
      mi = 0,
      ci = 0;

    await Promise.all(
      written.map((r) => {
        let text: { title: string; body: string };
        if (r.rating >= 4) {
          text = pos[pi % pos.length]!;
          pi++;
        } else if (r.rating === 3) {
          text = mix[mi % mix.length]!;
          mi++;
        } else {
          text = cri[ci % cri.length]!;
          ci++;
        }
        return prisma.review.update({
          where: { id: r.id },
          data: { title: text.title, content: text.body },
        });
      })
    );
    rows += written.length;
    updated++;
    console.log(
      `  ✓ ${product.name}: refreshed ${written.length} written (${pi} positive, ${mi} mixed, ${ci} critical)`
    );
  }

  console.log(
    `\nDone. Updated ${updated} products (${rows} written reviews). Skipped: ${skippedNoCopy} no-copy, ${skippedNoWritten} no-written.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
