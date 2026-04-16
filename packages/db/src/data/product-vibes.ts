/**
 * Product slug → vibe slugs mapping.
 *
 * Source of truth: EarthRevibe_Trip_Vibe_Homepage.pdf (page 10 coverage matrix).
 *
 * Slugs were verified against the live Supabase project (pahlcltpwzsqdclizdtl)
 * on 2026-04-16 — all 47 keys match an existing Product.slug exactly.
 *
 * The backfill script reconciles these against actual DB Product.slug values
 * and reports orphans/near-matches before writing.
 *
 * Expected per-vibe totals from the PDF legend (sanity check):
 *   above-the-clouds: 14
 *   salt-on-skin:     22
 *   golden-hour-gang: 16
 *   into-the-wild:    22
 *   neon-nomads:      20
 */
export const PRODUCT_VIBES: Record<string, readonly string[]> = {
  // 01-24
  'essential-round-neck-tee-garden-sage': ['into-the-wild'],
  'essential-round-neck-tee-heritage-mocha': ['golden-hour-gang', 'into-the-wild'],
  'essential-round-neck-tee-tropical-noir': ['salt-on-skin', 'neon-nomads'],
  'essential-round-neck-tee-coastal-powder-blue': ['above-the-clouds', 'salt-on-skin'],
  'essential-round-neck-tee-desert-mulberry': ['golden-hour-gang', 'neon-nomads'],
  'essential-round-neck-tee-alpine-ivory': ['above-the-clouds', 'salt-on-skin'],
  'wildflower-valley-polo': ['above-the-clouds', 'into-the-wild'],
  'countryside-calm-polo': ['golden-hour-gang', 'into-the-wild'],
  'summit-escape-polo': ['above-the-clouds', 'into-the-wild'],
  'golden-sands-polo': ['salt-on-skin', 'golden-hour-gang'],
  'shoreline-drift-polo': ['salt-on-skin', 'golden-hour-gang'],
  'poolside-retreat-polo': ['salt-on-skin', 'neon-nomads'],
  'dustroad-glen-check-shirt': ['golden-hour-gang', 'into-the-wild'],
  'void-passage-pocket-shirt': ['into-the-wild', 'neon-nomads'],
  'ether-bloom-oversized-shirt': ['salt-on-skin', 'into-the-wild'],
  'cloudweave-overshirt': ['above-the-clouds', 'salt-on-skin'],
  'fireside-heritage-plaid-shirt': ['above-the-clouds', 'into-the-wild'],
  'ember-grid-plaid-shirt': ['above-the-clouds', 'golden-hour-gang'],
  'aqua-trail-check-camp-shirt': ['salt-on-skin', 'into-the-wild'],
  'earthstone-relaxed-shirt': ['golden-hour-gang', 'into-the-wild'],
  'windpath-pinstripe-shirt': ['above-the-clouds', 'neon-nomads'],
  'tidewater-stripe-shirt': ['salt-on-skin'],
  'solstice-check-camp-shirt': ['golden-hour-gang', 'into-the-wild'],
  'terra-drift-pocket-shirt': ['golden-hour-gang', 'into-the-wild'],

  // 25-47
  'white-black-twill-zipper-shacket': ['above-the-clouds', 'neon-nomads'],
  'aqua-blue-twill-cactus-printed-shacket': ['salt-on-skin', 'golden-hour-gang'],
  'blu-skin-cotton-oversized-stripe-boxy-fit-shirt': ['salt-on-skin', 'neon-nomads'],
  'vintage-print-twill-straight-fit-pants': ['golden-hour-gang', 'neon-nomads'],
  'two-panel-minimal-branding-boxy-tee': ['neon-nomads'],
  'khakhi-shadow-twill-block-print-shacket': ['golden-hour-gang', 'into-the-wild'],
  'olive-herbal-cotton-reflective-boxy-tee': ['into-the-wild'],
  'cream-cotton-puff-print-boxy-tee': ['salt-on-skin', 'golden-hour-gang'],
  'all-over-print-formal-boxy-polo': ['salt-on-skin', 'neon-nomads'],
  'green-twill-bellbottom-utility-pants': ['above-the-clouds', 'into-the-wild'],
  'contrast-oversized-polo-with-unique-collar-branding': ['salt-on-skin', 'neon-nomads'],
  'cream-twill-all-over-star-print-boxy-shirt': ['salt-on-skin', 'neon-nomads'],
  'water-color-wave-graphic-boxy-tee': ['salt-on-skin', 'neon-nomads'],
  'twill-off-white-cotton-formal-trousers': ['salt-on-skin', 'neon-nomads'],
  'skin-conscious-embroidered-collar-boxy-shirt': ['into-the-wild', 'neon-nomads'],
  'herbal-white-all-over-print-boxy-tee': ['into-the-wild', 'neon-nomads'],
  'herbal-cotton-contrast-collar-branding-polo': ['into-the-wild', 'neon-nomads'],
  'grey-contrast-stitch-puff-print-boxy-tee': ['above-the-clouds', 'neon-nomads'],
  'plain-blue-word-hunt-boxy-tee': ['salt-on-skin', 'neon-nomads'],
  'black-twill-straight-fit-cargo-pants': ['salt-on-skin', 'into-the-wild', 'neon-nomads'],
  'a-to-a-maroon-graphic-tee': ['golden-hour-gang', 'neon-nomads'],
  'vintage-herbarium-shirt': ['golden-hour-gang', 'into-the-wild'],
  'marine-folklore': ['neon-nomads'],
};
