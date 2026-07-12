// Destination story stacks for the homepage story circles. Static config
// for v1 — images come from the existing cover photography so the feature
// ships without new assets; swap `items` per destination as real story
// content gets shot. Slugs in `cta.href` reuse the live vibe filters.

export interface StoryItem {
  /** Public path or whitelisted remote URL, ideally 9:16-ish. */
  src: string;
  /** How long this item plays, in ms. */
  duration?: number;
  kicker?: string;
  headline?: string;
  cta?: { label: string; href: string };
}

export interface DestinationStory {
  id: string;
  name: string;
  avatar: string;
  /** object-position for the circle crop, e.g. '50% 20%'. */
  avatarPosition?: string;
  items: StoryItem[];
}

export const STORY_DURATION_MS = 15000;

export const DESTINATION_STORIES: DestinationStory[] = [
  {
    id: 'goa',
    name: 'Goa',
    avatar: '/covers/linens.jpg',
    avatarPosition: '50% 12%',
    items: [
      {
        src: '/covers/linens.jpg',
        kicker: 'THE LINEN EDIT',
        headline: 'Shoreline mornings, zero effort.',
        cta: { label: 'Shop Beach Vibe', href: '/products?vibe=salt-on-skin' },
      },
      {
        src: '/covers/stripes.jpg',
        kicker: 'TIDEWATER STRIPES',
        headline: 'Lines that go places.',
        cta: { label: 'Shop Beach Vibe', href: '/products?vibe=salt-on-skin' },
      },
    ],
  },
  {
    id: 'manali',
    name: 'Manali',
    avatar: '/covers/overshirts.jpg',
    avatarPosition: '50% 8%',
    items: [
      {
        src: '/covers/overshirts.jpg',
        kicker: 'SHACKETS & OVERSHIRTS',
        headline: 'One layer, every season.',
        cta: { label: 'Shop Mountain Vibe', href: '/products?vibe=above-the-clouds' },
      },
      {
        src: '/covers/tees.jpg',
        kicker: 'HEAVYWEIGHT TEES',
        headline: 'Heavy on comfort, light on noise.',
        cta: { label: 'Shop Mountain Vibe', href: '/products?vibe=above-the-clouds' },
      },
    ],
  },
  {
    id: 'kerala',
    name: 'Kerala',
    avatar: '/covers/polos.jpg',
    avatarPosition: '50% 10%',
    items: [
      {
        src: '/covers/polos.jpg',
        kicker: 'KNIT & PIQUÉ POLOS',
        headline: 'Collared, never corporate.',
        cta: { label: 'Shop Outdoors', href: '/products?vibe=into-the-wild' },
      },
    ],
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    avatar: '/covers/cheques.jpg',
    avatarPosition: '50% 10%',
    items: [
      {
        src: '/covers/cheques.jpg',
        kicker: 'CHECKS & PLAIDS',
        headline: 'Boxes you’d happily live in.',
        cta: { label: 'Shop Wild Vibe', href: '/products?vibe=golden-hour-gang' },
      },
    ],
  },
  {
    id: 'ladakh',
    name: 'Ladakh',
    avatar: '/covers/tees.jpg',
    avatarPosition: '50% 8%',
    items: [
      {
        src: '/covers/tees.jpg',
        kicker: 'BUILT FOR ALTITUDE',
        headline: 'Made in India, worn anywhere.',
        cta: { label: 'Shop Mountain Vibe', href: '/products?vibe=above-the-clouds' },
      },
      {
        src: '/covers/overshirts.jpg',
        kicker: 'SHACKETS & OVERSHIRTS',
        headline: 'One layer, every season.',
        cta: { label: 'Shop Mountain Vibe', href: '/products?vibe=above-the-clouds' },
      },
    ],
  },
];
