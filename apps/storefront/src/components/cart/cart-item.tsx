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
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      {/* Image — w64, 3:4 */}
      <div
        style={{
          width: 64,
          aspectRatio: '3 / 4',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        }}
      >
        <Image
          src={getImageUrl(item.image, 150)}
          alt={item.name}
          fill
          sizes="64px"
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Name */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: '#000',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </p>
        {/* Meta */}
        <p style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
          {item.size && `Size: ${item.size}`}
          {item.size && item.color && ' / '}
          {item.color && `Color: ${item.color}`}
        </p>
        {/* Bottom row: qty stepper left, price + remove right */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          {/* Quantity stepper — 28px buttons, 24px center, 28px height, 1px border */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #E5E5E5',
              height: 28,
            }}
          >
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 300,
                color: item.quantity <= 1 ? '#E5E5E5' : '#999',
              }}
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span
              style={{
                width: 24,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 400,
                color: '#000',
              }}
            >
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.maxQuantity}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 300,
                color: item.quantity >= item.maxQuantity ? '#E5E5E5' : '#000',
              }}
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Price + remove */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
              {formatPrice(item.price * item.quantity)}
            </span>
            <button
              onClick={() => {
                trackRemoveFromCart({ id: item.id, name: item.name });
                removeItem(item.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Remove item"
            >
              <Trash2 size={14} color="#CCC" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
