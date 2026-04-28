'use client';

import Image from 'next/image';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { primaryImageUrl } from '@/lib/flight-mode-data';
import type { Product } from '@/types';

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
}

interface StackConfig {
  label: string;
  vibe: string;
  cards: CardPosition[];
}

const STACKS: StackConfig[] = [
  {
    label: 'WEEKENDER',
    vibe: 'salt-on-skin',
    cards: [
      { x: 30, y: 50, rotation: 6 },
      { x: 50, y: 40, rotation: -4 },
      { x: 38, y: 30, rotation: 1.5 },
    ],
  },
  {
    label: 'BEACH',
    vibe: 'salt-on-skin',
    cards: [
      { x: 25, y: 55, rotation: -5 },
      { x: 48, y: 42, rotation: 4 },
      { x: 35, y: 32, rotation: -1.5 },
    ],
  },
  {
    label: 'MOUNTAIN',
    vibe: 'above-the-clouds',
    cards: [
      { x: 32, y: 52, rotation: 5 },
      { x: 45, y: 40, rotation: -3.5 },
      { x: 36, y: 30, rotation: 1.5 },
    ],
  },
  {
    label: 'CITY',
    vibe: 'neon-nomads',
    cards: [
      { x: 28, y: 55, rotation: -6 },
      { x: 50, y: 44, rotation: 3.5 },
      { x: 38, y: 34, rotation: -1 },
    ],
  },
];

function StackCard({
  product,
  position,
  zIndex,
}: {
  product: Product;
  position: CardPosition;
  zIndex: number;
}) {
  const imgUrl = primaryImageUrl(product);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 280,
        height: 420,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '1px solid #ECECEC',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.125)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: `rotate(${position.rotation}deg)`,
        transformOrigin: 'top left',
        zIndex,
      }}
    >
      {/* Image area */}
      <div
        style={{
          width: '100%',
          flex: 1,
          backgroundColor: '#F0F0F0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imgUrl && (
          <Image
            src={getImageUrl(imgUrl, 560)}
            alt={product.name}
            fill
            sizes="280px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          padding: '14px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: -0.2,
            lineHeight: 1.2,
            color: '#000000',
          }}
        >
          {product.name}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            fontWeight: 400,
            color: '#666666',
          }}
        >
          {formatPrice(product.price)}
        </span>
      </div>
    </div>
  );
}

function StackCardSkeleton({
  position,
  zIndex,
}: {
  position: CardPosition;
  zIndex: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 280,
        height: 420,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '1px solid #ECECEC',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.125)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: `rotate(${position.rotation}deg)`,
        transformOrigin: 'top left',
        zIndex,
      }}
    >
      <div style={{ width: '100%', flex: 1, backgroundColor: '#F0F0F0' }} />
      <div
        style={{
          padding: '14px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
        <div style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
      </div>
    </div>
  );
}

function CategoryStack({ stack }: { stack: StackConfig }) {
  const { data, isLoading } = useProducts({
    vibe: stack.vibe,
    limit: 3,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const products = data?.products ?? [];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 500,
        overflow: 'visible',
      }}
    >
      {/* Category label */}
      <span
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 1.5,
          color: '#999999',
          zIndex: 10,
        }}
      >
        {stack.label}
      </span>

      {/* Stacked cards */}
      {stack.cards.map((pos, i) => {
        const product = products[i];
        if (isLoading || !product) {
          return <StackCardSkeleton key={i} position={pos} zIndex={i + 1} />;
        }
        return <StackCard key={product.id} product={product} position={pos} zIndex={i + 1} />;
      })}
    </div>
  );
}

export function ProductStacks() {
  return (
    <div
      style={{
        padding: '20px 20px 30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: '100%',
      }}
    >
      {STACKS.map((stack) => (
        <CategoryStack key={stack.label} stack={stack} />
      ))}
    </div>
  );
}
