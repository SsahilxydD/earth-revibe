import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Recycle, Star, Users, Wallet } from 'lucide-react';
import {
  DEFAULT_DESTINATION_STORIES,
  DEFAULT_VIBE_CARDS,
  type HomepagePayload,
} from '@earth-revibe/shared';
import { DestinationStoriesSection } from '@/components/home/destination-stories-section';
import type { DestinationStory } from '@/components/home/destination-stories';
import { ReviewsCarousel } from '@/components/home/reviews-carousel';
import { NewsletterInline } from '@/components/home/newsletter-inline';
import { fetchFeaturedFallback, fetchHomepage, fetchVibeCount } from '@/lib/homepage-data';

export const revalidate = 3600; // hourly ISR; admin edits revalidate instantly via tag 'homepage'

export const metadata: Metadata = {
  title: 'Earth Revibe — Vacation-Ready Minimal Fits',
  description:
    'One rack, three vibes, zero filler. 47 vacation-ready pieces made in India — dress for Goa, Manali, Kerala, Jaipur or Ladakh.',
};

// ---------------------------------------------------------------------------
// Built-in defaults — rendered whenever the CMS has no content for a section
// or the API is unreachable. An empty CMS can never blank the homepage.
// ---------------------------------------------------------------------------

const DEFAULT_HERO = {
  imageUrl: '/covers/linens.jpg',
  kicker: 'NEW ARRIVALS · MONSOON EDIT',
  headline: 'Wear it like',
  headlineItalic: 'you’re already there.',
  ctaLabel: 'EXPLORE THE EDIT',
  ctaHref: '/products',
};

// Default vibe cards come from @earth-revibe/shared (DEFAULT_VIBE_CARDS) so
// the admin editor can show and import the exact same "currently live" set.

const QUICK_BROWSE = [
  { label: 'SHIRTS', href: '/products?category=shirts' },
  { label: 'POLOS', href: '/products?category=polos' },
  { label: 'T-SHIRTS', href: '/products?category=t-shirts' },
  { label: 'BOTTOMWEAR', href: '/products?category=bottomwear' },
  { label: 'SHACKETS', href: '/products?category=shackets' },
  { label: 'OFFERS', href: '/offers' },
];

/** CMS story stacks → the DestinationStory shape the story viewer renders. */
function toDestinationStories(stacks: HomepagePayload['storyStacks']): DestinationStory[] {
  return stacks.map((s) => ({
    id: s.id,
    name: s.name,
    avatar: s.avatarUrl,
    avatarPosition: s.avatarPosition,
    items: s.items.map((item) => ({
      src: item.imageUrl,
      duration: item.durationMs,
      kicker: item.kicker || undefined,
      headline: item.headline || undefined,
      cta: item.ctaLabel && item.ctaHref ? { label: item.ctaLabel, href: item.ctaHref } : undefined,
    })),
  }));
}

export default async function HomePage() {
  // One parallel burst, all ISR-cached: the CMS payload plus the fallback
  // sources used when the CMS is empty or the /homepage endpoint is down.
  const [cms, fallbackFeatured, ...fallbackCounts] = await Promise.all([
    fetchHomepage(),
    fetchFeaturedFallback(),
    ...DEFAULT_VIBE_CARDS.map((v) => fetchVibeCount(v.vibe)),
  ]);

  const hero = cms?.hero ?? DEFAULT_HERO;
  const vibeCards =
    cms && cms.vibeCards.length > 0
      ? cms.vibeCards.map((c) => ({
          label: c.label,
          vibe: c.vibe,
          img: c.imageUrl,
          count: c.pieceCount,
        }))
      : DEFAULT_VIBE_CARDS.map((c, i) => ({
          label: c.label,
          vibe: c.vibe,
          img: c.imageUrl,
          count: fallbackCounts[i] ?? null,
        }));
  const stories = toDestinationStories(
    cms && cms.storyStacks.length > 0
      ? cms.storyStacks
      : // Built-in fallback from shared — stable ids keep framer layoutIds
        // consistent across renders.
        DEFAULT_DESTINATION_STORIES.map((s) => ({ id: `builtin-${s.name.toLowerCase()}`, ...s }))
  );
  // /homepage already falls back to isFeatured-flagged products server-side;
  // fallbackFeatured only covers the endpoint itself being down.
  const featured = cms ? cms.featured : fallbackFeatured;

  return (
    <div className="bg-[#FAF7F0]">
      {/* ===== Hero — full-bleed under the transparent header. #home-covers
              tells the header when the dark imagery has scrolled past. ===== */}
      <div id="home-covers">
        <section className="relative block aspect-[9/16] w-full overflow-hidden md:aspect-auto md:h-[92vh]">
          <Image
            src={hero.imageUrl}
            alt="Vacation-ready fits — Earth Revibe"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-screen-md px-6 pb-10">
            {hero.kicker && (
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/85">
                {hero.kicker}
              </p>
            )}
            <h1 className="mt-3 text-[34px] font-light leading-[1.15] text-white md:text-5xl">
              {hero.headline}
              {hero.headlineItalic && (
                <>
                  <br />
                  <span className="italic">{hero.headlineItalic}</span>
                </>
              )}
            </h1>
            {hero.ctaLabel && (
              <Link
                href={hero.ctaHref}
                prefetch
                className="mt-6 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white"
              >
                <span className="border-b border-white/90 pb-1">{hero.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="mx-auto w-full max-w-screen-md">
        {/* ===== Destination stories (Instagram-style) ===== */}
        <DestinationStoriesSection stories={stories} />

        {/* ===== Shop by Vibe ===== */}
        <section className="pt-12" aria-label="Shop by vibe">
          <div className="flex items-end justify-between px-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">BROWSE</p>
              <h2 className="mt-2 text-2xl font-light text-[#171310]">Shop by Vibe</h2>
            </div>
            <Link
              href="/products"
              className="flex items-center gap-1.5 pb-1 text-[10px] font-medium tracking-[0.18em] text-[#171310]"
            >
              ALL <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="hide-scrollbar mt-6 flex gap-3 overflow-x-auto px-6">
            {vibeCards.map((card) => (
              <Link
                key={card.vibe}
                href={`/products?vibe=${card.vibe}`}
                className="w-[140px] shrink-0"
              >
                <span className="relative block h-[186px] w-full overflow-hidden">
                  <Image
                    src={card.img}
                    alt={`${card.label} — Earth Revibe`}
                    fill
                    sizes="140px"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </span>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#171310]">
                  {card.label}
                </p>
                {card.count !== null && (
                  <p className="mt-1 text-[10px] tracking-[0.12em] text-[#8A8378]">
                    {card.count} PIECES
                  </p>
                )}
              </Link>
            ))}
          </div>
          <div className="mx-6 mt-10 h-px bg-[#E2DBCD]" />
        </section>

        {/* ===== Philosophy + analytics ===== */}
        <section className="px-6 pt-10" aria-label="Our philosophy">
          <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">OUR PHILOSOPHY</p>
          <h2 className="mt-4 text-[27px] font-light leading-snug text-[#171310]">
            One rack. Three vibes.
            <br />
            <span className="italic">Zero filler.</span>
          </h2>
          <p className="mt-5 max-w-md text-[13px] font-light leading-relaxed text-[#6B6459]">
            47 pieces that earn their place. Picked by cloth, not by trend. Cut for the 20–30
            traveller — made in India, worn anywhere.
          </p>
          <Link
            href="/about"
            className="mt-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] text-[#171310]"
          >
            <span className="border-b border-[#171310] pb-1">OUR STORY</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>

          <div className="mt-9 grid grid-cols-3 divide-x divide-[#E2DBCD] border-y border-[#E2DBCD] py-6">
            {(
              [
                { value: '47', label: 'PIECES' },
                { value: '3', label: 'VIBES' },
                { value: '4.6', label: 'AVG RATING' },
              ] as const
            ).map((s) => (
              <div key={s.label} className="px-4 first:pl-0">
                <p className="text-[22px] font-light text-[#171310]">{s.value}</p>
                <p className="mt-1 text-[9px] font-medium tracking-[0.18em] text-[#8A8378]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Featured pieces ===== */}
        {featured.length > 0 && (
          <section className="pt-12" aria-label="Featured pieces">
            <div className="flex items-end justify-between px-6">
              <div>
                <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">CURATED</p>
                <h2 className="mt-2 text-2xl font-light text-[#171310]">Featured Pieces</h2>
              </div>
              <Link
                href="/products"
                className="flex items-center gap-1.5 pb-1 text-[10px] font-medium tracking-[0.18em] text-[#171310]"
              >
                VIEW ALL <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>

            <div className="hide-scrollbar mt-6 flex gap-3 overflow-x-auto px-6">
              {featured.map((p) => (
                <Link key={p.slug} href={`/products/${p.slug}`} className="w-[168px] shrink-0">
                  <span className="relative block aspect-[3/4] w-full overflow-hidden bg-[#F0EAE0]">
                    {p.image && (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="168px"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                    )}
                  </span>
                  <p className="mt-3 text-[9px] font-medium tracking-[0.18em] text-[#8A8378]">
                    {p.category}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-[#171310]">{p.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-[#171310]">
                    ₹{p.price.toLocaleString('en-IN')}
                    {p.rating !== null && (
                      <span className="flex items-center gap-1 text-[10px] font-normal text-[#8A8378]">
                        <Star className="h-3 w-3 fill-[#A9663B] text-[#A9663B]" />
                        {p.rating.toFixed(1)}
                        {p.reviews !== null && ` (${p.reviews})`}
                      </span>
                    )}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== Payback — we pay you back, three ways ===== */}
        <section className="px-5 pt-14" aria-label="Rewards">
          <div className="flex flex-col items-center gap-6 rounded-[14px] bg-[#F5F2ED] px-5 pb-8 pt-10">
            <h4 className="whitespace-pre-line text-center text-[18px] font-bold leading-[1.25] tracking-[1.5px] text-black">
              {'WE PAY YOU BACK.\nTHREE WAYS.'}
            </h4>
            <div className="flex w-full gap-2">
              {(
                [
                  {
                    icon: Wallet,
                    eyebrow: 'TODAY',
                    title: 'First-Order Cashback',
                    desc: '100% of your first order, as loyalty points',
                  },
                  {
                    icon: Users,
                    eyebrow: 'PER FRIEND',
                    title: 'Cash for Referrals',
                    desc: '20% cash to your bank, per friend’s first order',
                  },
                  {
                    icon: Recycle,
                    eyebrow: 'YEAR 1+',
                    title: 'Forever Buyback',
                    desc: '33% back, any time after a year',
                  },
                ] as const
              ).map((col) => (
                <div key={col.eyebrow} className="flex flex-1 flex-col items-center gap-2.5">
                  <col.icon className="h-8 w-8 text-[#2A2419]" strokeWidth={1.5} />
                  <p className="text-[9px] font-medium tracking-[2.2px] text-[#999]">
                    {col.eyebrow}
                  </p>
                  <p className="text-center text-[12px] font-bold text-black">{col.title}</p>
                  <p className="text-center text-[9px] leading-[1.5] text-[#5C5247]">{col.desc}</p>
                </div>
              ))}
            </div>
            <Link href="/offers" prefetch className="text-[10px] font-light text-[#999] underline">
              Always on. No code. No expiry.
            </Link>
          </div>
        </section>

        {/* ===== Reviews ===== */}
        <section className="pt-14" aria-label="Customer reviews">
          <ReviewsCarousel />
        </section>

        {/* ===== Quick browse ===== */}
        <section className="px-6 pb-14 pt-12" aria-label="Quick browse">
          <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">QUICK BROWSE</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {QUICK_BROWSE.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="border border-[#B7AE9E] px-4 py-2.5 text-[10px] font-medium tracking-[0.15em] text-[#171310] transition-colors hover:border-[#171310]"
                style={
                  c.label === 'OFFERS' ? { color: '#A9663B', borderColor: '#A9663B' } : undefined
                }
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ===== Newsletter ===== */}
        <NewsletterInline />
      </div>
    </div>
  );
}
