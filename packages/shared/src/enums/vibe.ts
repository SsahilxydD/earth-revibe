// 5 trip vibes that apply to individual products. Flight Mode (bundles)
// is intentionally excluded — bundles are a separate future concept.
export const VIBES = [
  'above-the-clouds',
  'salt-on-skin',
  'golden-hour-gang',
  'into-the-wild',
  'neon-nomads',
] as const;

export type Vibe = (typeof VIBES)[number];

export function isVibe(v: unknown): v is Vibe {
  return typeof v === 'string' && (VIBES as readonly string[]).includes(v);
}

// Display labels for UI (admin form, storefront chips, etc.)
export const VIBE_LABELS: Record<Vibe, string> = {
  'above-the-clouds': 'Above the Clouds',
  'salt-on-skin': 'Salt on Skin',
  'golden-hour-gang': 'Golden Hour Gang',
  'into-the-wild': 'Into the Wild',
  'neon-nomads': 'Neon Nomads',
};
