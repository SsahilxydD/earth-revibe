'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { BLUR_DATA_URL } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Trip Vibe data — 6 cards, each links to /products?vibe=<slug>      */
/*  Placeholder imagery from Unsplash; swap with real shoot later.     */
/* ------------------------------------------------------------------ */

interface Vibe {
  num: string;
  slug: string;
  kicker: string;
  title: [string, string];
  tagline: string;
  pieces: string;
  startingFrom: string;
  image: string;
  video?: string;
}

const VIBES: Vibe[] = [
  {
    num: '01',
    slug: 'above-the-clouds',
    kicker: 'MOUNTAIN COLLECTION',
    title: ['Above the', 'Clouds'],
    tagline: 'air gets thin, views get wild',
    pieces: '14 PIECES',
    startingFrom: 'FROM ₹990',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=720&q=80&fm=jpg',
    video:
      'https://pahlcltpwzsqdclizdtl.supabase.co/storage/v1/object/public/product-videos/showcase/above_the_clouds_opt.mp4',
  },
  {
    num: '02',
    slug: 'salt-on-skin',
    kicker: 'BEACH COLLECTION',
    title: ['Salt on', 'Skin'],
    tagline: 'sun-kissed, salt-soaked',
    pieces: '22 PIECES',
    startingFrom: 'FROM ₹990',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&q=80&fm=jpg',
    video:
      'https://pahlcltpwzsqdclizdtl.supabase.co/storage/v1/object/public/product-videos/showcase/salt_on_skin_opt.mp4',
  },
  {
    num: '03',
    slug: 'golden-hour-gang',
    kicker: 'DESERT COLLECTION',
    title: ['Golden', 'Hour Gang'],
    tagline: 'when the world turns gold',
    pieces: '16 PIECES',
    startingFrom: 'FROM ₹990',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=720&q=80&fm=jpg',
  },
  {
    num: '04',
    slug: 'into-the-wild',
    kicker: 'JUNGLE COLLECTION',
    title: ['Into the', 'Wild'],
    tagline: 'lost in the green',
    pieces: '22 PIECES',
    startingFrom: 'FROM ₹990',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=720&q=80&fm=jpg',
    video:
      'https://pahlcltpwzsqdclizdtl.supabase.co/storage/v1/object/public/product-videos/showcase/into_the_wild_opt.mp4',
  },
  {
    num: '05',
    slug: 'neon-nomads',
    kicker: 'CITY & NIGHTLIFE',
    title: ['Neon', 'Nomads'],
    tagline: 'street lights, late nights',
    pieces: '20 PIECES',
    startingFrom: 'FROM ₹990',
    image: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=720&q=80&fm=jpg',
  },
  {
    num: '06',
    slug: 'flight-mode',
    kicker: 'BUNDLES & COMBOS',
    title: ['Flight', 'Mode'],
    tagline: 'fully packed, ready for takeoff',
    pieces: '20+ BUNDLES',
    startingFrom: 'FROM ₹3,570',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=720&q=80&fm=jpg',
  },
];

/* ------------------------------------------------------------------ */
/*  Homepage — Trip Vibe                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <div className="font-[family-name:var(--font-inter)]" style={{ backgroundColor: '#FFF' }}>
      {/* ===== Hero — white editorial ===== */}
      <section
        style={{
          padding: '72px 28px 56px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#FFF',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#999',
          }}
        >
          SS &apos;26 &nbsp;·&nbsp; NEW DROP
        </span>
        <div style={{ height: 20 }} />
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: 48,
            fontWeight: 300,
            letterSpacing: -1.2,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Shop by
          <br />
          trip.
        </motion.h1>
        <div style={{ width: 32, height: 1, backgroundColor: '#000', marginTop: 4 }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.5,
            color: '#666',
            margin: 0,
          }}
        >
          Six places. Six moods.
          <br />
          One wardrobe.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            paddingTop: 16,
          }}
        >
          {['47 PIECES', '6 VIBES', "SS '26"].map((text, i) => (
            <span
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: 1.5,
                color: '#000',
              }}
            >
              {text}
              {i < 2 && <span style={{ color: '#CCC' }}>·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* ===== Stack section — "CHOOSE YOUR VIBE" label + 6 sticky cards ===== */}
      <section
        style={{
          padding: '40px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: 2,
              color: '#000',
            }}
          >
            CHOOSE YOUR VIBE
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 300,
              color: '#999',
            }}
          >
            Tap any card to explore.
          </span>
        </div>

        {/* Stacked sticky cards — all pin at the same top so later cards
            land fully on top of earlier ones, covering them completely */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginBottom: 24,
          }}
        >
          {VIBES.map((vibe, i) => (
            <Link
              key={vibe.slug}
              href={`/products?vibe=${vibe.slug}`}
              style={{
                position: 'sticky',
                top: 72,
                zIndex: i + 1,
                aspectRatio: '9 / 16',
                borderRadius: 20,
                border: '1px solid #F0F0F0',
                overflow: 'hidden',
                textDecoration: 'none',
                display: 'block',
                backgroundColor: '#1a1a1a',
              }}
            >
              {/* Background — video if available, otherwise image */}
              {vibe.video ? (
                <video
                  src={vibe.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={vibe.image}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Image
                  src={vibe.image}
                  alt={vibe.title.join(' ')}
                  fill
                  sizes="(max-width: 393px) 100vw, 393px"
                  quality={80}
                  priority={i === 0}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  style={{ objectFit: 'cover' }}
                />
              )}

              {/* Bottom-to-top gradient for text legibility */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.1) 100%)',
                }}
              />

              {/* Arrow icon — top-right */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 24,
                }}
              >
                <ArrowUpRight size={20} color="#FFF" />
              </div>

              {/* Centered text stack: kicker, title, accent line, tagline, stats */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '0 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 400,
                    letterSpacing: 2,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  {vibe.kicker}
                </span>
                <h2
                  style={{
                    fontSize: 42,
                    fontWeight: 300,
                    letterSpacing: -1.2,
                    lineHeight: 1,
                    fontStyle: 'italic',
                    color: '#FFF',
                    margin: 0,
                  }}
                >
                  {vibe.title[0]}
                  <br />
                  {vibe.title[1]}
                </h2>
                <div
                  style={{
                    width: 28,
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    marginTop: 4,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  &ldquo;{vibe.tagline}&rdquo;
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 400,
                    letterSpacing: 1.5,
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: 2,
                  }}
                >
                  {vibe.pieces} &nbsp;·&nbsp; {vibe.startingFrom}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Closer — white editorial CTA ===== */}
      <section
        style={{
          padding: '80px 28px 96px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'flex-start',
          backgroundColor: '#FFF',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#999',
          }}
        >
          BUILT FOR THE 20–30 TRAVELLER
        </span>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 300,
            letterSpacing: -0.8,
            lineHeight: 1.1,
            color: '#000',
            margin: 0,
          }}
        >
          One wardrobe.
          <br />
          Six vibes.
          <br />
          Zero confusion.
        </h2>
        <div style={{ width: 32, height: 1, backgroundColor: '#000' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.6,
            color: '#666',
            margin: 0,
          }}
        >
          47 pieces that know where you&apos;re going.
          <br />
          Picked by trip, not by rack.
        </p>
        <Link
          href="/products"
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 50,
            padding: '0 28px',
            borderRadius: 9999,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 1.5,
            textDecoration: 'none',
          }}
        >
          BROWSE ALL 47 PIECES →
        </Link>
      </section>
    </div>
  );
}
