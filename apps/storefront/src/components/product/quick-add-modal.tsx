'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { lockBodyScroll, unlockBodyScroll, hideDock, showDock } from '@/stores/ui-store';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import type { Product } from '@/types';

interface QuickAddModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickAddModal({ product, onClose }: QuickAddModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { addToast } = useToast();

  const [selectedSize, setSelectedSize] = useState<string>('');

  // Fetch full product with variants when modal opens
  const { data: fullProduct, isLoading: loadingVariants } = useQuery({
    queryKey: ['product-detail', product?.slug],
    queryFn: () => api.get<Product>(`/products/${product!.slug}`),
    enabled: !!product?.slug,
    staleTime: 5 * 60 * 1000,
  });

  const variants = fullProduct?.variants ?? product?.variants ?? [];
  const images = fullProduct?.images ?? product?.images ?? [];

  const primaryImage = useMemo(() => {
    if (!images.length) return null;
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted.find((img) => img.isPrimary) || sorted[0];
  }, [images]);

  // Available sizes
  const sizes = useMemo(() => {
    const s = new Map<string, boolean>();
    variants.forEach((v) => {
      if (v.size) {
        const existing = s.get(v.size);
        s.set(v.size, existing || v.stock > 0);
      }
    });
    return Array.from(s.entries()).map(([size, inStock]) => ({ size, inStock }));
  }, [variants]);

  // Auto-select first available size
  useEffect(() => {
    if (product && sizes.length > 0) {
      const first = sizes.find((s) => s.inStock)?.size || sizes[0]?.size || '';
      setSelectedSize(first);
    }
  }, [product, sizes]);

  useEffect(() => {
    if (product) {
      lockBodyScroll();
      hideDock();
      return () => {
        unlockBodyScroll();
        showDock();
      };
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [product, onClose]);

  const matchedVariant = useMemo(() => {
    return (
      variants.find((v) => (!selectedSize || v.size === selectedSize) && v.stock > 0) ||
      variants.find((v) => !selectedSize || v.size === selectedSize)
    );
  }, [variants, selectedSize]);

  const isInStock = matchedVariant ? matchedVariant.stock > 0 : variants.length === 0;
  const stockCount = matchedVariant?.stock ?? 0;

  const handleAdd = () => {
    if (!product) return;
    // Never fabricate a `${product.id}-default` id — it doesn't exist in the
    // DB, so checkout later rejects the item as "no longer available". Require
    // a real, in-stock variant.
    if (!matchedVariant?.id || matchedVariant.stock <= 0) {
      addToast('This item is unavailable', 'info');
      return;
    }
    addItem({
      id: matchedVariant.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || '',
      // Use the selected variant's price, not the product base price — they can
      // differ, and the wrong price here surprises the user at checkout.
      price: matchedVariant.price ?? product.price,
      compareAtPrice: product.compareAtPrice || undefined,
      size: selectedSize || matchedVariant.size || 'M',
      color: matchedVariant.color || 'Default',
      maxQuantity: matchedVariant.stock,
    });
    addToast('Added to bag', 'success');
    onClose();
    setTimeout(() => openCart(), 200);
  };

  // Price to display — the matched variant's price when resolved, else base.
  const displayPrice = matchedVariant?.price ?? product?.price ?? 0;

  if (!product) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="animate-slide-up font-[family-name:var(--font-inter)]"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFF',
          padding: '24px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 0 0' }}>
          <div style={{ width: 40, height: 4, backgroundColor: '#E5E5E5', borderRadius: 2 }} />
        </div>

        {/* Header — product preview + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 64,
                backgroundColor: '#F5F5F5',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {primaryImage && (
                <Image
                  src={getImageUrl(primaryImage.url, 150, primaryImage.thumbnailUrl)}
                  alt={product.name}
                  fill
                  sizes="48px"
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>{product.name}</span>
              <span style={{ fontSize: 12, fontWeight: 300, color: '#000' }}>
                {formatPrice(displayPrice)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <X size={18} color="#999" />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

        {/* Loading */}
        {loadingVariants && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px 0',
            }}
          >
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {/* Size selector */}
        {!loadingVariants && sizes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              SIZE
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {sizes.map(({ size, inStock }) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={!inStock}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      flex: 1,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: isSelected ? 400 : 300,
                      color: !inStock ? '#CCC' : isSelected ? '#FFF' : '#000',
                      backgroundColor: isSelected ? '#000' : 'transparent',
                      border: isSelected ? 'none' : `1px solid ${inStock ? '#E5E5E5' : '#F0F0F0'}`,
                      cursor: inStock ? 'pointer' : 'default',
                      opacity: inStock ? 1 : 0.5,
                    }}
                  >
                    {/* Slash out-of-stock sizes for an unmistakable unavailable cue */}
                    {!inStock && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="100"
                          y2="100"
                          stroke="#BBB"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                    <span style={{ position: 'relative' }}>{size}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock status */}
        {!loadingVariants && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 9999,
                backgroundColor: isInStock ? '#22C55E' : '#EF4444',
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
              {isInStock
                ? `In stock${stockCount > 0 && stockCount <= 10 ? ` — only ${stockCount} left` : ' — ships in 2–3 days'}`
                : 'Out of stock'}
            </span>
          </div>
        )}

        {/* ADD TO BAG */}
        <button
          onClick={handleAdd}
          disabled={!isInStock || loadingVariants}
          style={{
            width: '100%',
            height: 50,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            border: 'none',
            cursor: isInStock ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isInStock && !loadingVariants ? 1 : 0.4,
          }}
        >
          {isInStock ? `ADD TO BAG — ${formatPrice(displayPrice)}` : 'OUT OF STOCK'}
        </button>
      </div>
    </div>
  );
}
