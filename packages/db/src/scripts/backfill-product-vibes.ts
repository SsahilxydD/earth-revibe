/**
 * Backfill Product.vibes from the canonical PDF mapping.
 *
 * Usage:
 *   pnpm --filter @earth-revibe/db backfill-vibes -- --dry-run    # report only
 *   pnpm --filter @earth-revibe/db backfill-vibes                  # apply
 *
 * Idempotent: re-running with the same mapping is a no-op.
 */
import { prisma } from '../client';
import { PRODUCT_VIBES } from '../data/product-vibes';
import { VIBES } from '@earth-revibe/shared';

interface MatchReport {
  matched: { slug: string; vibes: readonly string[] }[];
  orphans: { slug: string; name: string }[]; // DB products not in PDF
  unusedPdfRows: string[]; // PDF rows with no matching DB product
}

async function buildReport(): Promise<MatchReport> {
  const dbProducts = await prisma.product.findMany({
    select: { slug: true, name: true },
  });
  const dbSlugs = new Set(dbProducts.map((p) => p.slug));
  const pdfSlugs = new Set(Object.keys(PRODUCT_VIBES));

  const matched: MatchReport['matched'] = [];
  const orphans: MatchReport['orphans'] = [];

  for (const p of dbProducts) {
    if (PRODUCT_VIBES[p.slug]) {
      matched.push({ slug: p.slug, vibes: PRODUCT_VIBES[p.slug] });
    } else {
      orphans.push({ slug: p.slug, name: p.name });
    }
  }

  const unusedPdfRows = [...pdfSlugs].filter((s) => !dbSlugs.has(s));

  return { matched, orphans, unusedPdfRows };
}

function printReport(r: MatchReport): void {
  console.log('\n=== Backfill Report ===\n');

  // Per-vibe count check vs PDF legend
  const counts: Record<string, number> = Object.fromEntries(VIBES.map((v: string) => [v, 0]));
  for (const m of r.matched) {
    for (const v of m.vibes) {
      if (v in counts) counts[v]++;
    }
  }
  const expected: Record<string, number> = {
    'above-the-clouds': 14,
    'salt-on-skin': 22,
    'golden-hour-gang': 16,
    'into-the-wild': 22,
    'neon-nomads': 20,
  };
  console.log('Per-vibe counts (matched vs PDF legend):');
  for (const v of VIBES) {
    const ok = counts[v] === expected[v] ? '✓' : '⚠';
    console.log(`  ${ok} ${v}: matched=${counts[v]}, expected=${expected[v]}`);
  }

  console.log(`\nMatched: ${r.matched.length} products`);
  console.log(`Orphans (DB products not in PDF): ${r.orphans.length}`);
  if (r.orphans.length > 0) {
    console.log('  These products will get vibes=[] (invisible from vibe filter):');
    for (const o of r.orphans) console.log(`    - ${o.slug} (${o.name})`);
  }

  console.log(`\nUnused PDF rows (in PDF but no matching DB product): ${r.unusedPdfRows.length}`);
  if (r.unusedPdfRows.length > 0) {
    console.log('  These slugs in product-vibes.ts have no DB match — verify spelling:');
    for (const s of r.unusedPdfRows) console.log(`    - ${s}`);
  }
  console.log();
}

async function applyBackfill(matched: MatchReport['matched']): Promise<void> {
  console.log(`Writing vibes to ${matched.length} products...`);
  let i = 0;
  for (const m of matched) {
    await prisma.product.update({
      where: { slug: m.slug },
      data: { vibes: [...m.vibes] },
    });
    i++;
    if (i % 10 === 0) console.log(`  ${i}/${matched.length}`);
  }
  console.log(`✓ Updated ${matched.length} products.`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'WRITE'}`);

  const report = await buildReport();
  printReport(report);

  if (dryRun) {
    console.log('Dry run complete. Re-run without --dry-run to apply.');
    return;
  }

  if (report.unusedPdfRows.length > 0) {
    console.log(
      'Refusing to write while PDF mapping has unused rows — fix slugs in product-vibes.ts and re-run dry-run first.'
    );
    process.exitCode = 1;
    return;
  }

  await applyBackfill(report.matched);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
