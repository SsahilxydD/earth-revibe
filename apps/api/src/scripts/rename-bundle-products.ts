/* ------------------------------------------------------------------ */
/*  rename-bundle-products                                              */
/*                                                                      */
/*  One-shot script to align Product.name on the prod DB with the deck  */
/*  copy from EarthRevibe Bundle Collection 2026. Slugs are NOT touched */
/*  — only the display name. Idempotent: runs that find no diffs are    */
/*  no-ops, and re-runs after partial application skip already-updated  */
/*  rows.                                                                */
/*                                                                      */
/*  Usage:                                                               */
/*    pnpm tsx apps/api/src/scripts/rename-bundle-products.ts            */
/*      → dry-run, prints intended diffs, no writes                      */
/*    pnpm tsx apps/api/src/scripts/rename-bundle-products.ts --apply    */
/*      → applies the updates                                            */
/* ------------------------------------------------------------------ */

import { prisma } from '@earth-revibe/db';

/**
 * slug → deck-canonical product name.
 *
 * Source of truth: EarthRevibe_Bundle_Collection_2026.pptx, slides 4-23
 * (the "What's Inside" section of each bundle).
 *
 * Slugs preserved as-is even when they diverge from the deck wording
 * (e.g. terra-drift-linen-shirt → "Terra Drift Pocket Shirt") so that
 * existing URLs, cart records, and the new combos.ts references keep
 * working.
 */
const RENAMES: Record<string, string> = {
  // Polos
  'poolside-retreat-polo': 'Poolside Retreat Polo',
  'golden-sands-polo': 'Golden Sands Polo',
  'shoreline-drift-polo': 'Shoreline Drift Polo',
  'countryside-calm-polo': 'Countryside Calm Polo',
  'summit-escape-polo': 'Summit Escape Polo',
  'wildflower-valley-polo': 'Wildflower Valley Polo',
  'contrast-oversized-polo-with-unique-collar-branding': 'Contrast Oversized Polo',

  // Shirts
  'solstice-check-camp-shirt': 'Solstice Check Camp Shirt',
  'fireside-heritage-plaid-shirt': 'Fireside Heritage Plaid Shirt',
  'tidewater-stripe-shirt': 'Tidewater Stripe Shirt',
  'earthstone-relaxed-shirt': 'Earthstone Relaxed Shirt',
  'ember-grid-plaid-shirt': 'Ember Grid Plaid Shirt',
  'aqua-trail-check-camp-shirt': 'Aqua Trail Check Camp Shirt',
  'windpath-pinstripe-shirt': 'Windpath Pinstripe Shirt',
  'void-passage-pocket-shirt': 'Void Passage Pocket Shirt',
  'terra-drift-linen-shirt': 'Terra Drift Pocket Shirt',
  'ether-bloom-linen-shirt': 'Ether Bloom Oversized Shirt',
  'dustroad-glen-check-shirt': 'Dustroad Glen Check Shirt',
  'cloudweave-overshirt': 'Cloudweave Overshirt',
  'skin-conscious-embroidered-collar-boxy-shirt': 'Skin-Conscious Embroidered Collar Boxy Shirt',
  'cream-twill-all-over-star-print-boxy-shirt': 'Cream Twill All-Over Star Print Boxy Shirt',
  'blu-skin-cotton-oversized-stripe-boxy-fit-shirt': 'Blu Oversized Stripe Boxy Shirt',

  // Tees
  'water-color-wave-graphic-boxy-tee': 'Water Color Wave Graphic Boxy Tee',
  'two-panel-minimal-branding-boxy-tee': 'Two-Panel Minimal Branding Boxy Tee',
  'olive-herbal-cotton-reflective-boxy-tee': 'Olive Herbal Cotton Reflective Boxy Tee',
  'cream-cotton-puff-print-boxy-tee': 'Cream Cotton Puff Print Boxy Tee',
  'grey-contrast-stitch-puff-print-boxy-tee': 'Grey Contrast Stitch Puff Print Boxy Tee',
  'a-to-a-maroon-graphic-tee': 'A-to-A Maroon Graphic Tee',
  'plain-blue-word-hunt-boxy-tee': 'Plain Blue Word Hunt Boxy Tee',
  'herbal-white-all-over-print-boxy-tee': 'Herbal White All-Over Print Boxy Tee',

  // Pants / Trousers / Shackets
  'black-twill-straight-fit-cargo-pants': 'Black Twill Straight-Fit Cargo Pants',
  'twill-off-white-cotton-formal-trousers': 'Twill Off-White Cotton Formal Trousers',
  'vintage-print-twill-straight-fit-pants': 'Vintage Print Twill Straight-Fit Pants',
  'green-twill-bellbottom-utility-pants': 'Green Twill Bellbottom Utility Pants',
  'white-black-twill-zipper-shacket': 'White & Black Twill Zipper Shacket',
  'khakhi-shadow-twill-block-print-shacket': 'Khakhi Shadow Twill Block Print Shacket',
  'aqua-blue-twill-cactus-printed-shacket': 'Aqua Blue Twill Cactus Printed Shacket',

  // Standalone
  'marine-folklore': 'Marine Folklore',
};

interface Diff {
  slug: string;
  current: string;
  desired: string;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const slugs = Object.keys(RENAMES);

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true },
  });

  const foundSlugs = new Set(products.map((p) => p.slug));
  const missing = slugs.filter((s) => !foundSlugs.has(s));

  const diffs: Diff[] = [];
  const unchanged: string[] = [];

  for (const p of products) {
    const desired = RENAMES[p.slug];
    if (p.name === desired) unchanged.push(p.slug);
    else diffs.push({ slug: p.slug, current: p.name, desired });
  }

  console.log(`\n=== rename-bundle-products (${apply ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`map size:   ${slugs.length}`);
  console.log(`db hits:    ${products.length}`);
  console.log(`unchanged:  ${unchanged.length}`);
  console.log(`to update:  ${diffs.length}`);
  console.log(`missing:    ${missing.length}`);

  if (missing.length > 0) {
    console.log('\nslugs in map but NOT in DB (skipped):');
    for (const s of missing) console.log(`  - ${s}`);
  }

  if (diffs.length === 0) {
    console.log('\nNo changes needed.');
    return;
  }

  console.log('\nIntended changes:');
  for (const d of diffs) {
    console.log(`  ${d.slug}`);
    console.log(`    - ${d.current}`);
    console.log(`    + ${d.desired}`);
  }

  if (!apply) {
    console.log('\n(dry run — re-run with --apply to write)');
    return;
  }

  let applied = 0;
  for (const d of diffs) {
    await prisma.product.update({
      where: { slug: d.slug },
      data: { name: d.desired },
    });
    applied++;
  }
  console.log(`\nApplied ${applied} rename(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
