'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bookmark, Share2, Lock, ChevronDown } from 'lucide-react';
import { getCombo, formatBundleSavings, type ComboPiece } from '@/lib/flight-mode-data';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export default function ComboDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const combo = getCombo(slug);
  if (!combo) notFound();

  const router = useRouter();
  const { addToast } = useToast();
  const addItem = useCartStore((s) => s.addItem);

  // Per-piece size state — default to M for everything
  const [sizes, setSizes] = useState<Record<string, string>>(() =>
    Object.fromEntries(combo.pieces.map((p) => [p.slug, 'M']))
  );
  const [openSizePicker, setOpenSizePicker] = useState<string | null>(null);

  const { savedAmount, savedPct } = useMemo(() => formatBundleSavings(combo), [combo]);

  const addBundleToCart = () => {
    // Add each piece as its own cart line with a bundle reference in the name
    combo.pieces.forEach((piece) => {
      addItem({
        id: `${combo.slug}-${piece.slug}`,
        productId: piece.slug,
        name: `${piece.name} · ${combo.name}`,
        slug: piece.slug,
        image: piece.image,
        price: Math.round((combo.price / combo.individualTotal) * piece.price),
        size: sizes[piece.slug] || 'M',
        color: '',
        maxQuantity: 99,
        quantity: 1,
      });
    });
    addToast(`${combo.name} added to bag`, 'success');
  };

  const buyBundleNow = () => {
    addBundleToCart();
    router.push('/cart');
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FFF', minHeight: '100vh' }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFF',
          borderBottom: '1px solid #F0F0F0',
          position: 'sticky',
          top: 56,
          zIndex: 10,
        }}
      >
        <Link
          href="/flight-mode"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} color="#000" />
        </Link>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2,
            color: '#000',
          }}
        >
          FLIGHT MODE · {combo.name.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'share' in navigator) {
              navigator.share?.({ title: combo.name, url: window.location.href }).catch(() => {});
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Share2 size={18} color="#000" />
        </button>
      </div>

      {/* Hero mosaic */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 440,
          backgroundColor: '#EDE8DF',
          overflow: 'hidden',
        }}
      >
        {combo.heroImages.slice(0, 4).map((src, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '50%',
              height: '50%',
              top: i < 2 ? 0 : '50%',
              left: i % 2 === 0 ? 0 : '50%',
              overflow: 'hidden',
            }}
          >
            <Image src={src} alt="" fill sizes="50vw" style={{ objectFit: 'cover' }} />
          </div>
        ))}
        <button
          type="button"
          style={{
            position: 'absolute',
            right: 16,
            top: 20,
            width: 32,
            height: 32,
            borderRadius: 9999,
            backgroundColor: 'rgba(255,255,255,0.82)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Save combo"
        >
          <Bookmark size={14} color="#000" />
        </button>
      </div>

      {/* Header block */}
      <section
        style={{
          padding: '32px 24px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
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
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            letterSpacing: -0.8,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          {combo.name}
        </h1>
        <div style={{ width: 24, height: 1, backgroundColor: '#000' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {combo.description}
        </p>
      </section>

      {/* What's in it */}
      <section
        style={{
          padding: '8px 24px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2.5,
            color: '#999',
          }}
        >
          WHAT&apos;S IN IT
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {combo.pieces.map((piece, i) => (
            <div key={`${piece.slug}-${i}`}>
              <PieceRow
                piece={piece}
                size={sizes[piece.slug] || 'M'}
                onSizeClick={() =>
                  setOpenSizePicker((cur) => (cur === piece.slug ? null : piece.slug))
                }
                expanded={openSizePicker === piece.slug}
                onSizeChange={(s) => {
                  setSizes((prev) => ({ ...prev, [piece.slug]: s }));
                  setOpenSizePicker(null);
                }}
              />
              {i < combo.pieces.length - 1 && (
                <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Price summary */}
      <section
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          backgroundColor: '#F5F5F5',
        }}
      >
        <SumRow
          left={<span>Individual total</span>}
          right={<span style={{ color: '#999' }}>{formatPrice(combo.individualTotal)}</span>}
          leftColor="#666"
          rightSize={13}
        />
        <SumRow
          left={<span style={{ color: '#22C55E' }}>Bundle discount (−{savedPct}%)</span>}
          right={<span style={{ color: '#22C55E' }}>−{formatPrice(savedAmount)}</span>}
          leftColor="#22C55E"
          rightSize={13}
        />
        <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>You pay</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#000',
              letterSpacing: -0.5,
            }}
          >
            {formatPrice(combo.price)}
          </span>
        </div>
      </section>

      {/* CTAs */}
      <section
        style={{
          padding: '20px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={addBundleToCart}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 9999,
            backgroundColor: 'transparent',
            border: '1px solid #E5E5E5',
            color: '#000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 1.5,
            cursor: 'pointer',
          }}
        >
          ADD PACK TO BAG
        </button>
        <button
          type="button"
          onClick={buyBundleNow}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 9999,
            backgroundColor: '#000',
            border: 'none',
            color: '#FFF',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1.5,
            cursor: 'pointer',
          }}
        >
          BUY PACK NOW · {formatPrice(combo.price)}
        </button>
        <div
          style={{
            padding: '8px 0 0 0',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={12} color="#CCC" />
          <span
            style={{
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: 2,
              color: '#999',
            }}
          >
            365-DAY BUYBACK · FREE SHIPPING
          </span>
        </div>
      </section>
    </div>
  );
}

function PieceRow({
  piece,
  size,
  onSizeClick,
  expanded,
  onSizeChange,
}: {
  piece: ComboPiece;
  size: string;
  onSizeClick: () => void;
  expanded: boolean;
  onSizeChange: (s: string) => void;
}) {
  return (
    <div style={{ padding: '16px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 60,
            height: 72,
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#F5F5F5',
          }}
        >
          <Image
            src={piece.image}
            alt={piece.name}
            fill
            sizes="60px"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#999',
            }}
          >
            {piece.kind}
          </span>
          <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>{piece.name}</span>
          <button
            type="button"
            onClick={onSizeClick}
            style={{
              marginTop: 2,
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              height: 28,
              width: 80,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #E5E5E5',
              backgroundColor: '#FFF',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 400, color: '#000' }}>Size · {size}</span>
            <ChevronDown size={10} color="#000" />
          </button>
        </div>
        <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
          {formatPrice(piece.price)}
        </span>
      </div>
      {expanded && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            paddingLeft: 74,
          }}
        >
          {SIZES.map((s) => {
            const active = s === size;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSizeChange(s)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 8,
                  border: active ? 'none' : '1px solid #E5E5E5',
                  backgroundColor: active ? '#000' : '#FFF',
                  color: active ? '#FFF' : '#000',
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SumRow({
  left,
  right,
  leftColor = '#666',
  rightSize = 13,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftColor?: string;
  rightSize?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 300, color: leftColor }}>{left}</span>
      <span style={{ fontSize: rightSize, fontWeight: 400, color: '#000' }}>{right}</span>
    </div>
  );
}
