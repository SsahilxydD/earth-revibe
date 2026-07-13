import type { Vibe } from '../enums/vibe';

// The storefront's built-in Shop-by-Vibe cards — rendered whenever the
// homepage CMS has no VIBE_CARD blocks. The admin homepage editor shows the
// same list as the "currently live" state and can import it into the CMS,
// so both apps must read from this single definition.
//
// Image URLs are storefront-relative or remote; the admin resolves relative
// paths against the storefront origin for previews.
export interface DefaultVibeCard {
  label: string;
  vibe: Vibe;
  imageUrl: string;
}

export const DEFAULT_VIBE_CARDS: DefaultVibeCard[] = [
  {
    label: 'BEACH VIBE',
    vibe: 'salt-on-skin',
    imageUrl: '/vibes/beach.webp',
  },
  {
    label: 'MOUNTAIN VIBE',
    vibe: 'above-the-clouds',
    imageUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80&fm=jpg',
  },
  {
    label: 'CITY VIBE',
    vibe: 'neon-nomads',
    imageUrl: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=600&q=80&fm=jpg',
  },
];
