import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Recycle, Users, Wallet } from 'lucide-react';

export const revalidate = 3600; // refresh live piece counts/prices hourly

export const metadata: Metadata = {
  title: 'Earth Revibe — Vacation-Ready Minimal Fits',
  description:
    'Six collections of vacation-ready essentials, made in India. Linens, cheques, polos, tees, stripes and overshirts — picked by cloth, not by trend.',
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

// The 6 collection covers — editorial photoshoot per collection
// (public/collections/<key>.jpg). `query` drives both the tile link and the
// live stats lookup; copy mirrors the earth-revibe.pen homepage design.
const COLLECTIONS = [
  {
    key: 'linens',
    kicker: 'THE LINEN EDIT',
    title: 'Linens',
    tagline: '“breathes easy, wears lighter”',
    query: 'search=linen',
    scrim: 0.25,
  },
  {
    key: 'cheques',
    kicker: 'CHECKS & PLAIDS',
    title: 'Cheques',
    tagline: '“boxes you’d happily live in”',
    query: 'search=check',
    scrim: 0.25,
  },
  {
    key: 'polos',
    kicker: 'KNIT & PIQUÉ POLOS',
    title: 'Polos',
    tagline: '“collared, never corporate”',
    query: 'category=polos',
    scrim: 0.25,
  },
  {
    key: 'tees',
    kicker: 'HEAVYWEIGHT TEES',
    title: 'Tees',
    tagline: '“heavy on comfort, light on noise”',
    query: 'category=t-shirts',
    scrim: 0.25,
  },
  {
    key: 'stripes',
    kicker: 'TIDEWATER STRIPES',
    title: 'Stripes',
    tagline: '“lines that go places”',
    query: 'search=stripe',
    scrim: 0.32,
  },
  {
    key: 'overshirts',
    kicker: 'SHACKETS & OVERSHIRTS',
    title: 'Overshirts',
    tagline: '“one layer, every season”',
    query: 'category=shackets',
    scrim: 0.35,
  },
] as const;

interface TileStats {
  count: number | null;
  fromPrice: number | null;
}

// One request per tile: cheapest item first → data.total is the piece count,
// products[0].price the entry price. Soft-fails to null (stat line hidden).
async function fetchTileStats(query: string): Promise<TileStats> {
  try {
    const res = await fetch(`${API_BASE}/products?${query}&limit=1&sortBy=price&sortOrder=asc`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { count: null, fromPrice: null };
    const json = await res.json();
    const data = json?.data;
    const price = Number(data?.products?.[0]?.price);
    return {
      count: typeof data?.total === 'number' ? data.total : null,
      fromPrice: Number.isFinite(price) ? price : null,
    };
  } catch {
    return { count: null, fromPrice: null };
  }
}

export default async function HomePage() {
  const stats = await Promise.all(COLLECTIONS.map((c) => fetchTileStats(c.query)));

  return (
    <div className="bg-white font-[family-name:var(--font-inter)]">
      {/* ===== Collection covers — full-bleed under the transparent header.
              #home-covers lets the header know when it has scrolled past the
              dark imagery and must switch back to solid. ===== */}
      <div id="home-covers">
        {COLLECTIONS.map((c, i) => {
          const s = stats[i];
          const statLine = [
            s.count ? `${s.count} PIECES` : null,
            s.fromPrice ? `FROM ₹${s.fromPrice.toLocaleString('en-IN')}` : null,
          ]
            .filter(Boolean)
            .join('   ·   ');
          return (
            <Link
              key={c.key}
              href={`/products?${c.query}`}
              prefetch={i < 2}
              aria-label={`Shop ${c.title}`}
              className="relative block aspect-[9/16] w-full overflow-hidden md:aspect-auto md:h-[92vh]"
            >
              <Image
                src={`/covers/${c.key}.jpg`}
                alt={`${c.title} collection — Earth Revibe`}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
              {/* scrim for text legibility */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0,0,0,${c.scrim})` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
                <p className="text-[9px] font-normal tracking-[2px] text-white/80">{c.kicker}</p>
                <h2 className="pt-2 text-[42px] font-light italic leading-none tracking-[-1.2px] text-white">
                  {c.title}
                </h2>
                <div className="my-5 h-px w-7 bg-white/80" />
                <p className="text-[11px] font-light italic text-white/80">{c.tagline}</p>
                {statLine && (
                  <p className="pt-4 text-[9px] tracking-[1.5px] text-white/80">{statLine}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ===== Editorial quote ===== */}
      <div className="flex flex-col items-center gap-3.5 px-7 pt-14">
        <div className="h-px w-6 bg-[#CCC]" />
        <p className="text-center text-[13px] font-light italic text-[#999]">
          &ldquo;Wear it like you&rsquo;re already there.&rdquo;
        </p>
        <div className="h-px w-6 bg-[#CCC]" />
      </div>

      {/* ===== Closer ===== */}
      <div className="flex flex-col gap-5 px-7 pb-[72px] pt-20">
        <p className="text-[10px] tracking-[2px] text-[#999]">BUILT FOR THE 20–30 TRAVELLER</p>
        <h3 className="whitespace-pre-line text-[32px] font-light leading-[1.1] tracking-[-0.8px] text-black">
          {'One rack.\nSix collections.\nZero filler.'}
        </h3>
        <div className="h-px w-8 bg-black" />
        <p className="whitespace-pre-line text-[13px] font-light leading-[1.6] text-[#666]">
          {'56 pieces that earn their place.\nPicked by cloth, not by trend.'}
        </p>
        <Link
          href="/products"
          prefetch
          className="mt-1 inline-flex h-[50px] w-[200px] items-center justify-center rounded-full bg-black text-[10px] font-medium tracking-[1.5px] text-white"
        >
          BROWSE ALL PIECES →
        </Link>
      </div>

      {/* ===== Payback — we pay you back, three ways ===== */}
      <div className="px-5 pb-14">
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
                <p className="text-[9px] font-medium tracking-[2.2px] text-[#999]">{col.eyebrow}</p>
                <p className="text-center text-[12px] font-bold text-black">{col.title}</p>
                <p className="text-center text-[9px] leading-[1.5] text-[#5C5247]">{col.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/offers" prefetch className="text-[10px] font-light text-[#999] underline">
            Always on. No code. No expiry.
          </Link>
        </div>
      </div>
    </div>
  );
}
