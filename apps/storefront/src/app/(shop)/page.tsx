import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Recycle, Star, Users, Wallet } from 'lucide-react';
import { DestinationStoriesSection } from '@/components/home/destination-stories-section';
import { ReviewsCarousel } from '@/components/home/reviews-carousel';
import { NewsletterInline } from '@/components/home/newsletter-inline';

export const revalidate = 3600; // refresh vibe counts + featured pieces hourly

export const metadata: Metadata = {
  title: 'Earth Revibe — Vacation-Ready Minimal Fits',
  description:
    'One rack, three vibes, zero filler. 47 vacation-ready pieces made in India — dress for Goa, Manali, Kerala, Jaipur or Ladakh.',
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

// The three shopping vibes — labels + imagery mirror /products' vibe row so
// the homepage cards and the filter chips always tell the same story.
const VIBE_CARDS = [
  {
    label: 'BEACH VIBE',
    vibe: 'salt-on-skin',
    img: '/vibes/beach.webp',
  },
  {
    label: 'MOUNTAIN VIBE',
    vibe: 'above-the-clouds',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80&fm=jpg',
  },
  {
    label: 'CITY VIBE',
    vibe: 'neon-nomads',
    img: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=600&q=80&fm=jpg',
  },
] as const;

const QUICK_BROWSE = [
  { label: 'SHIRTS', href: '/products?category=shirts' },
  { label: 'POLOS', href: '/products?category=polos' },
  { label: 'T-SHIRTS', href: '/products?category=t-shirts' },
  { label: 'BOTTOMWEAR', href: '/products?category=bottomwear' },
  { label: 'SHACKETS', href: '/products?category=shackets' },
  { label: 'OFFERS', href: '/offers' },
];

interface FeaturedProduct {
  slug: string;
  name: string;
  price: number;
  category: string;
  image: string | null;
  rating: number | null;
  reviews: number | null;
}

async function fetchVibeCount(vibe: string): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/products?vibe=${vibe}&limit=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.data?.total === 'number' ? json.data.total : null;
  } catch {
    return null;
  }
}

async function fetchFeatured(): Promise<FeaturedProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/products?isFeatured=true&limit=4`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const products = json?.data?.products;
    if (!Array.isArray(products)) return [];
    return products.map(
      (p: {
        slug: string;
        name: string;
        price: string;
        category?: { name?: string };
        images?: { url: string; isPrimary?: boolean }[];
        averageRating?: number;
        reviewCount?: number;
      }) => ({
        slug: p.slug,
        name: p.name,
        price: Number(p.price),
        category: p.category?.name?.toUpperCase() ?? 'PIECE',
        image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null,
        rating: typeof p.averageRating === 'number' ? p.averageRating : null,
        reviews: typeof p.reviewCount === 'number' ? p.reviewCount : null,
      })
    );
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, ...vibeCounts] = await Promise.all([
    fetchFeatured(),
    ...VIBE_CARDS.map((v) => fetchVibeCount(v.vibe)),
  ]);

  return (
    <div className="bg-[#FAF7F0]">
      {/* ===== Hero — full-bleed under the transparent header. #home-covers
              tells the header when the dark imagery has scrolled past. ===== */}
      <div id="home-covers">
        <section className="relative block aspect-[9/16] w-full overflow-hidden md:aspect-auto md:h-[92vh]">
          <Image
            src="/covers/linens.jpg"
            alt="Vacation-ready linens — Earth Revibe"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-screen-md px-6 pb-10">
            <p className="text-[10px] font-medium tracking-[0.22em] text-white/85">
              NEW ARRIVALS · MONSOON EDIT
            </p>
            <h1 className="mt-3 text-[34px] font-light leading-[1.15] text-white md:text-5xl">
              Wear it like
              <br />
              <span className="italic">you&rsquo;re already there.</span>
            </h1>
            <Link
              href="/products"
              prefetch
              className="mt-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] text-white"
            >
              <span className="border-b border-white/90 pb-1">EXPLORE THE EDIT</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </section>
      </div>

      <div className="mx-auto w-full max-w-screen-md">
        {/* ===== Destination stories (Instagram-style) ===== */}
        <DestinationStoriesSection />

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
            {VIBE_CARDS.map((card, i) => {
              const count = vibeCounts[i];
              return (
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
                  <p className="mt-3 text-[11px] font-medium tracking-[0.14em] text-[#171310]">
                    {card.label}
                  </p>
                  {count !== null && (
                    <p className="mt-1 text-[10px] tracking-[0.12em] text-[#8A8378]">
                      {count} PIECES
                    </p>
                  )}
                </Link>
              );
            })}
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

          {featured.length > 0 && (
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
          )}
        </section>

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
