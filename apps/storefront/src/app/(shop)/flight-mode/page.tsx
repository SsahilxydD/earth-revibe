'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Flame } from 'lucide-react';
import { COMBOS, formatBundleSavings } from '@/lib/flight-mode-data';
import { formatPrice } from '@/lib/utils';

type Filter = 'all' | '3-piece' | '5-piece' | 'weekender';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '3-piece', label: '3-piece' },
  { value: '5-piece', label: '5-piece' },
  { value: 'weekender', label: 'Weekender' },
];

export default function FlightModePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const flagship = useMemo(() => COMBOS.find((c) => c.featured), []);
  const rest = useMemo(
    () => COMBOS.filter((c) => !c.featured && (filter === 'all' || c.category === filter)),
    [filter]
  );
  const showFlagship = filter === 'all' || (flagship && flagship.category === filter);

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FFF', minHeight: '100vh' }}
    >
      {/* Hero */}
      <section
        style={{
          padding: '48px 28px 40px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2,
            color: '#999',
          }}
        >
          BUNDLES · COMBOS
        </span>
        <div style={{ height: 8 }} />
        <h1
          style={{
            fontSize: 52,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1.6,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Flight
          <br />
          Mode.
        </h1>
        <div style={{ width: 28, height: 1, backgroundColor: '#000', marginTop: 4 }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Pre-packed kits, picked by the trip.
          <br />
          Fewer decisions, bigger savings.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingTop: 20,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#000',
            }}
          >
            20+ BUNDLES
          </span>
          <span style={{ fontSize: 10, color: '#CCC' }}>·</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#000',
            }}
          >
            FROM ₹3,570
          </span>
          <span style={{ fontSize: 10, color: '#CCC' }}>·</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#22C55E',
            }}
          >
            SAVE UP TO 22%
          </span>
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Filter chips */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 20px',
          overflowX: 'auto',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              style={{
                flexShrink: 0,
                height: 32,
                padding: '0 14px',
                borderRadius: 9999,
                backgroundColor: active ? '#000' : '#FFF',
                border: active ? 'none' : '1px solid #E5E5E5',
                color: active ? '#FFF' : '#666',
                fontSize: 11,
                fontWeight: active ? 400 : 300,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Bundle list */}
      <div
        style={{
          padding: '20px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {showFlagship && flagship && <FlagshipCard combo={flagship} />}
        {rest.map((combo) => (
          <HorizontalCard key={combo.slug} combo={combo} />
        ))}
      </div>

      {/* Closer — Build your own */}
      <section
        style={{
          padding: '60px 28px 80px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: '#FAFAFA',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
          BUILD YOUR OWN
        </span>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -0.8,
            lineHeight: 1.1,
            color: '#000',
            margin: 0,
          }}
        >
          Can&apos;t pick?
          <br />
          We&apos;ll pack.
        </h2>
        <div style={{ width: 28, height: 1, backgroundColor: '#000' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Tell us your trip. We&apos;ll hand-pack a kit for you — still bundle pricing, still free
          shipping.
        </p>
        <Link
          href="/flight-mode/build"
          style={{
            marginTop: 4,
            height: 50,
            padding: '0 24px',
            borderRadius: 9999,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          START A KIT
          <ArrowRight size={14} color="#FFF" />
        </Link>
      </section>
    </div>
  );
}

function FlagshipCard({ combo }: { combo: (typeof COMBOS)[number] }) {
  const { savedPct } = formatBundleSavings(combo);
  const bg = combo.heroImages[0];
  return (
    <Link
      href={`/flight-mode/${combo.slug}`}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: 360,
        borderRadius: 20,
        overflow: 'hidden',
        textDecoration: 'none',
        backgroundColor: '#1a1a1a',
      }}
    >
      <Image
        src={bg}
        alt={combo.name}
        fill
        sizes="(max-width: 393px) 100vw, 393px"
        style={{ objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.44)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 26,
          padding: '0 12px',
          borderRadius: 9999,
          backgroundColor: '#FFF',
        }}
      >
        <Flame size={12} color="#000" />
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: 2,
            color: '#000',
          }}
        >
          MOST PACKED
        </span>
      </div>
      <div style={{ position: 'absolute', top: 22, right: 20 }}>
        <ArrowUpRight size={20} color="#FFF" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {combo.kicker}
        </span>
        <h3
          style={{
            fontSize: 32,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#FFF',
            margin: 0,
          }}
        >
          {combo.name}
        </h3>
        <div
          style={{
            width: 24,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.5)',
          }}
        />
        <p
          style={{
            fontSize: 12,
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {combo.description}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            paddingTop: 12,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 300,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'line-through',
            }}
          >
            {formatPrice(combo.individualTotal)}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#FFF',
              letterSpacing: -0.4,
            }}
          >
            {formatPrice(combo.price)}
          </span>
          <span
            style={{
              height: 22,
              padding: '0 8px',
              borderRadius: 9999,
              backgroundColor: '#22C55E',
              color: '#FFF',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            SAVE {savedPct}%
          </span>
        </div>
      </div>
    </Link>
  );
}

function HorizontalCard({ combo }: { combo: (typeof COMBOS)[number] }) {
  const { savedAmount } = formatBundleSavings(combo);
  const mosaic = combo.heroImages.slice(0, 4);
  return (
    <Link
      href={`/flight-mode/${combo.slug}`}
      style={{
        display: 'flex',
        width: '100%',
        height: 200,
        borderRadius: 16,
        border: '1px solid #F0F0F0',
        overflow: 'hidden',
        textDecoration: 'none',
        backgroundColor: '#FFF',
      }}
    >
      {/* 2×2 thumbnail mosaic */}
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 200,
          backgroundColor: '#F5F5F5',
          flexShrink: 0,
        }}
      >
        {mosaic.map((src, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 80,
              height: 100,
              top: i < 2 ? 0 : 100,
              left: i % 2 === 0 ? 0 : 80,
              overflow: 'hidden',
            }}
          >
            <Image src={src} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} />
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 32,
            height: 32,
            borderRadius: 9999,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {combo.pieces.length}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 2,
              color: '#999',
            }}
          >
            {combo.kicker}
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: -0.4,
              color: '#000',
            }}
          >
            {combo.name}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: '#666',
              lineHeight: 1.4,
            }}
          >
            {combo.description}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 300, color: '#CCC' }}>
              {formatPrice(combo.individualTotal)}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: -0.3,
                color: '#000',
              }}
            >
              {formatPrice(combo.price)}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: 1.5,
                color: '#22C55E',
              }}
            >
              SAVE {formatPrice(savedAmount)}
            </span>
          </div>
          <ArrowUpRight size={18} color="#000" />
        </div>
      </div>
    </Link>
  );
}
