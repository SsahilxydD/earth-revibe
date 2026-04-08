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
    inStock: true, // If it's in the DB, the product exists
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div
        style={{
          paddingTop: 80,
          paddingBottom: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          fontFamily: 'var(--font-inter), Inter, sans-serif',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 300, color: '#999', margin: 0 }}>
          Your wishlist is empty
        </p>
        <Link
          href="/categories/new-arrivals"
          style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #E5E5E5',
            borderRadius: 0,
            padding: '12px 32px',
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#000',
            textDecoration: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-inter), Inter, sans-serif',
          }}
        >
          BROWSE COLLECTIONS
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          SAVED ITEMS
        </span>
        <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Product grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          marginTop: 24,
        }}
      >
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Image */}
            <Link href={`/products/${item.slug}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  width: '100%',
                  height: 220,
                  backgroundColor: '#F5F5F5',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 0,
                }}
              >
                {item.image ? (
                  <Image
                    src={getImageUrl(item.image, 400)}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 50vw"
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
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 400,
                        color: '#fff',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      SOLD OUT
                    </span>
                  </div>
                )}
              </div>
            </Link>

            {/* Name */}
            <Link
              href={`/products/${item.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: '#000',
                  margin: 0,
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.name}
              </p>
            </Link>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: '#000' }}>
                {formatPrice(item.price)}
              </span>
              {item.compareAtPrice && item.compareAtPrice > item.price && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 300,
                    color: '#CCC',
                    textDecoration: 'line-through',
                  }}
                >
                  {formatPrice(item.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Add to bag / Sold out button */}
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
                  borderRadius: 0,
                  background: 'transparent',
                  fontSize: 9,
                  fontWeight: 400,
                  color: '#000',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                ADD TO BAG
              </button>
            ) : (
              <button
                disabled
                style={{
                  width: '100%',
                  height: 36,
                  border: 'none',
                  borderRadius: 0,
                  backgroundColor: '#000',
                  fontSize: 9,
                  fontWeight: 400,
                  color: '#999',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  cursor: 'not-allowed',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              >
                SOLD OUT
              </button>
            )}

            {/* Remove from wishlist - small text link below button */}
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
                padding: 0,
                textAlign: 'left',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                opacity: removeMutation.isPending ? 0.5 : 1,
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
