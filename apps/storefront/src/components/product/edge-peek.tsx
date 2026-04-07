'use client';

import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import type { Product } from '@/types';

interface EdgePeekProps {
  product: Product | null;
  side: 'right' | 'left';
  visible: boolean;
}

/** Thin strip at the screen edge hinting at the next/prev product */
export function EdgePeek({ product, side, visible }: EdgePeekProps) {
  if (!visible || !product) return null;

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  if (!primaryImage) return null;

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10 w-1 overflow-hidden"
      style={{
        [side]: 0,
        boxShadow: side === 'right' ? '-2px 0 8px rgba(0,0,0,0.1)' : '2px 0 8px rgba(0,0,0,0.1)',
      }}
    >
      <Image
        src={getImageUrl(primaryImage.url, 50)}
        alt=""
        fill
        className="object-cover"
        sizes="4px"
        aria-hidden
      />
    </div>
  );
}
