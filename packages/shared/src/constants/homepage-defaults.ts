import type { Vibe } from '../enums/vibe';
import type { HomepageStoryStackContent } from '../schemas/homepage.schema';

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

// The storefront's built-in destination story stacks — same contract as the
// vibe cards above: rendered as the fallback when the CMS has no STORY_STACK
// blocks, and shown/importable in the admin editor as the live state.
// Shaped exactly like HomepageStoryStackContent so imports go straight into
// HomepageBlock.content. Images reuse the /covers photography until real
// story content is shot.
export const DEFAULT_DESTINATION_STORIES: HomepageStoryStackContent[] = [
  {
    name: 'Goa',
    avatarUrl: '/covers/linens.jpg',
    avatarPosition: '50% 12%',
    items: [
      {
        imageUrl: '/covers/linens.jpg',
        kicker: 'THE LINEN EDIT',
        headline: 'Shoreline mornings, zero effort.',
        ctaLabel: 'Shop Beach Vibe',
        ctaHref: '/products?vibe=salt-on-skin',
      },
      {
        imageUrl: '/covers/stripes.jpg',
        kicker: 'TIDEWATER STRIPES',
        headline: 'Lines that go places.',
        ctaLabel: 'Shop Beach Vibe',
        ctaHref: '/products?vibe=salt-on-skin',
      },
    ],
  },
  {
    name: 'Manali',
    avatarUrl: '/covers/overshirts.jpg',
    avatarPosition: '50% 8%',
    items: [
      {
        imageUrl: '/covers/overshirts.jpg',
        kicker: 'SHACKETS & OVERSHIRTS',
        headline: 'One layer, every season.',
        ctaLabel: 'Shop Mountain Vibe',
        ctaHref: '/products?vibe=above-the-clouds',
      },
      {
        imageUrl: '/covers/tees.jpg',
        kicker: 'HEAVYWEIGHT TEES',
        headline: 'Heavy on comfort, light on noise.',
        ctaLabel: 'Shop Mountain Vibe',
        ctaHref: '/products?vibe=above-the-clouds',
      },
    ],
  },
  {
    name: 'Kerala',
    avatarUrl: '/covers/polos.jpg',
    avatarPosition: '50% 10%',
    items: [
      {
        imageUrl: '/covers/polos.jpg',
        kicker: 'KNIT & PIQUÉ POLOS',
        headline: 'Collared, never corporate.',
        ctaLabel: 'Shop Outdoors',
        ctaHref: '/products?vibe=into-the-wild',
      },
    ],
  },
  {
    name: 'Jaipur',
    avatarUrl: '/covers/cheques.jpg',
    avatarPosition: '50% 10%',
    items: [
      {
        imageUrl: '/covers/cheques.jpg',
        kicker: 'CHECKS & PLAIDS',
        headline: 'Boxes you’d happily live in.',
        ctaLabel: 'Shop Wild Vibe',
        ctaHref: '/products?vibe=golden-hour-gang',
      },
    ],
  },
  {
    name: 'Ladakh',
    avatarUrl: '/covers/tees.jpg',
    avatarPosition: '50% 8%',
    items: [
      {
        imageUrl: '/covers/tees.jpg',
        kicker: 'BUILT FOR ALTITUDE',
        headline: 'Made in India, worn anywhere.',
        ctaLabel: 'Shop Mountain Vibe',
        ctaHref: '/products?vibe=above-the-clouds',
      },
      {
        imageUrl: '/covers/overshirts.jpg',
        kicker: 'SHACKETS & OVERSHIRTS',
        headline: 'One layer, every season.',
        ctaLabel: 'Shop Mountain Vibe',
        ctaHref: '/products?vibe=above-the-clouds',
      },
    ],
  },
];
