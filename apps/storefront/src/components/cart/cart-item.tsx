'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { trackRemoveFromCart } from '@/lib/analytics';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-3">
      {/* Image */}
      <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-[var(--badge-radius)] bg-[var(--color-surface)]">
        <Image
          src={getImageUrl(item.image, 150)}
          alt={item.name}
          fill
          sizes="72px"
          className="object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {item.size && `Size: ${item.size}`}
            {item.size && item.color && ' / '}
            {item.color && `Color: ${item.color}`}
          </p>
        </div>

        <div className="flex items-end justify-between">
          {/* Quantity stepper */}
          <div className="flex items-center rounded-[var(--badge-radius)] border border-[var(--color-border)]">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="flex h-7 w-7 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex h-7 w-6 items-center justify-center text-xs font-semibold">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.maxQuantity}
              className="flex h-7 w-7 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Price + remove */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
            <button
              onClick={() => {
                trackRemoveFromCart({ id: item.id, name: item.name });
                removeItem(item.id);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-sale)]"
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
