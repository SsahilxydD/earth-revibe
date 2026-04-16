'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';

interface RawWishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    images: { url: string; thumbnailUrl?: string }[];
  };
}

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
}

function normalizeWishlistItems(raw: RawWishlistItem[]): WishlistItem[] {
  return raw.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    slug: item.product.slug,
    image: item.product.images?.[0]?.url || '',
    price: item.product.price,
    compareAtPrice: item.product.compareAtPrice,
    inStock: true,
  }));
}

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

  const { data: rawItems, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<RawWishlistItem[]>('/wishlist'),
  });

  const items = rawItems ? normalizeWishlistItems(rawItems) : undefined;

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      addToast('Removed from wishlist', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to remove item', 'error');
    },
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div
        style={{
          padding: '80px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>Your wishlist is empty</p>
        <Link
          href="/products"
          style={{
            marginTop: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 46,
            padding: '0 32px',
            border: '1px solid #000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#000',
            textDecoration: 'none',
          }}
        >
          BROWSE COLLECTIONS
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 28px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          SAVED ITEMS
        </span>
        <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* 2-column grid — gap=14, starts 20px after header */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Image — 220px height */}
            <Link
              href={`/products/${item.slug}`}
              style={{
                display: 'block',
                position: 'relative',
                width: '100%',
                height: 220,
                backgroundColor: '#F5F5F5',
                overflow: 'hidden',
              }}
            >
              {item.image ? (
                <Image
                  src={getImageUrl(item.image, 400)}
                  alt={item.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="50vw"
                />
              ) : null}
              {!item.inStock && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                  }}
                >
                  <span
                    style={{ fontSize: 10, fontWeight: 400, color: '#FFF', letterSpacing: 1.5 }}
                  >
                    SOLD OUT
                  </span>
                </div>
              )}
            </Link>
            {/* Name — 12px, clamp 2 lines */}
            <Link
              href={`/products/${item.slug}`}
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: '#000',
                textDecoration: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.name}
            </Link>
            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: '#000' }}>
                {formatPrice(item.price)}
              </span>
              {item.compareAtPrice && item.compareAtPrice > item.price && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 300,
                    color: '#CCC',
                    textDecoration: 'line-through',
                  }}
                >
                  {formatPrice(item.compareAtPrice)}
                </span>
              )}
            </div>
            {/* ADD TO BAG button — 36px height */}
            {item.inStock ? (
              <button
                onClick={() => {
                  addItem({
                    id: `${item.productId}-default`,
                    productId: item.productId,
                    name: item.name,
                    slug: item.slug,
                    image: item.image,
                    price: item.price,
                    compareAtPrice: item.compareAtPrice || undefined,
                    size: 'M',
                    color: 'Default',
                    maxQuantity: 10,
                  });
                  addToast('Added to cart', 'success');
                }}
                style={{
                  width: '100%',
                  height: 36,
                  border: '1px solid #E5E5E5',
                  backgroundColor: 'transparent',
                  fontSize: 9,
                  fontWeight: 400,
                  letterSpacing: 1.5,
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                ADD TO BAG
              </button>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 36,
                  backgroundColor: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 400, letterSpacing: 1.5, color: '#999' }}>
                  SOLD OUT
                </span>
              </div>
            )}
            {/* Remove link */}
            <button
              onClick={() => removeMutation.mutate(item.productId)}
              disabled={removeMutation.isPending}
              style={{
                fontSize: 10,
                fontWeight: 300,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
