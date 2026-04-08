'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';
import type { Product } from '@/types';

const COLOR_HEX: Record<string, string> = {
  black: '#1C1C1C',
  white: '#FFFFFF',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  yellow: '#EAB308',
  pink: '#EC4899',
  orange: '#F97316',
  purple: '#9333EA',
  brown: '#92400E',
  gray: '#78716C',
  grey: '#78716C',
  navy: '#1E3A5F',
  beige: '#D2B48C',
  sand: '#D2B48C',
  olive: '#556B2F',
  cream: '#FFFDD0',
  khaki: '#BDB76B',
  tan: '#D2B48C',
  maroon: '#800000',
  teal: '#0D9488',
  coral: '#F97171',
  lavender: '#C084FC',
  mint: '#86EFAC',
  charcoal: '#374151',
  sky: '#87CEEB',
  rust: '#B7410E',
  ivory: '#FFFFF0',
  sage: '#9CAF88',
  stone: '#A8A29E',
  slate: '#64748B',
  indigo: '#4F46E5',
  mocha: '#7B5B3A',
  taupe: '#8B7D6B',
  coffee: '#6F4E37',
  camel: '#C19A6B',
  mustard: '#CEAB07',
  wine: '#722F37',
  burgundy: '#800020',
  peach: '#FFDAB9',
  lilac: '#C8A2C8',
  aqua: '#00CED1',
  denim: '#1560BD',
  ash: '#B2BEB5',
};

function getColorHex(name: string): string {
  const lower = name.toLowerCase().trim();
  if (COLOR_HEX[lower]) return COLOR_HEX[lower];
  const words = lower.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    if (COLOR_HEX[words[i]]) return COLOR_HEX[words[i]];
  }
  return '#A8A29E';
}

interface QuickAddModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickAddModal({ product, onClose }: QuickAddModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { addToast } = useToast();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Fetch full product with variants when modal opens
  const { data: fullProduct, isLoading: loadingVariants } = useQuery({
    queryKey: ['product-detail', product?.slug],
    queryFn: () => api.get<Product>(`/products/${product!.slug}`),
    enabled: !!product?.slug,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });

  // Use full product variants if available, fallback to whatever the listing gave us
  const variants = fullProduct?.variants ?? product?.variants ?? [];
  const images = fullProduct?.images ?? product?.images ?? [];

  const primaryImage = useMemo(() => {
    if (!images.length) return null;
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted.find((img) => img.isPrimary) || sorted[0];
  }, [images]);

  // Available sizes and colors
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

  const colors = useMemo(() => {
    const c = new Map<string, { inStock: boolean; hex: string }>();
    variants.forEach((v) => {
      if (v.color) {
        const existing = c.get(v.color);
        c.set(v.color, {
          inStock: existing?.inStock || v.stock > 0,
          hex: v.colorHex || getColorHex(v.color),
        });
      }
    });
    return Array.from(c.entries()).map(([color, { inStock, hex }]) => ({ color, inStock, hex }));
  }, [variants]);

  // Auto-select first available size/color
  useEffect(() => {
    if (product) {
      const firstSize = sizes.find((s) => s.inStock)?.size || sizes[0]?.size || '';
      const firstColor = colors.find((c) => c.inStock)?.color || colors[0]?.color || '';
      setSelectedSize(firstSize);
      setSelectedColor(firstColor);
    }
  }, [product, sizes, colors]);

  // Lock body scroll when open
  useEffect(() => {
    if (product) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [product]);

  // Escape to close
  useEffect(() => {
    if (!product) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [product, onClose]);

  // Find matching variant
  const matchedVariant = useMemo(() => {
    return (
      variants.find(
        (v) =>
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor) &&
          v.stock > 0
      ) ||
      variants.find(
        (v) =>
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor)
      )
    );
  }, [variants, selectedSize, selectedColor]);

  const isInStock = matchedVariant ? matchedVariant.stock > 0 : variants.length === 0;
  const stockCount = matchedVariant?.stock ?? 0;

  const handleAdd = () => {
    if (!product) return;
    const variantId = matchedVariant?.id || `${product.id}-default`;
    addItem({
      id: variantId,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice || undefined,
      size: selectedSize || 'M',
      color: selectedColor || 'Default',
      maxQuantity: matchedVariant?.stock && matchedVariant.stock > 0 ? matchedVariant.stock : 10,
    });
    addToast('Added to bag', 'success');
    onClose();
    setTimeout(() => openCart(), 200);
  };

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
        {/* Drag handle — 40x4, centered */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 0 0' }}>
          <div style={{ width: 40, height: 4, backgroundColor: '#E5E5E5', borderRadius: 2 }} />
        </div>

        {/* Header — product preview + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Thumbnail — 48x64 */}
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
                {formatPrice(product.price)}
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

        {/* Loading state while fetching variants */}
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

        {/* Size selector — label + full-width buttons, gap=8, h=40 */}
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
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Color selector — label + circles, gap=10, 28px */}
        {!loadingVariants && colors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              COLOR{selectedColor ? ` — ${selectedColor}` : ''}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {colors.map(({ color, inStock, hex }) => {
                const isSelected = selectedColor === color;
                const isWhite = ['#FFFFFF', '#FFFFF0', '#FFFDD0', '#FFDAB9'].includes(
                  hex.toUpperCase()
                );
                const bg = hex;
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    disabled={!inStock}
                    title={color}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9999,
                      backgroundColor: bg,
                      border: isWhite
                        ? '1px solid #E5E5E5'
                        : isSelected
                          ? '2px solid #000'
                          : 'none',
                      outline: isSelected && !isWhite ? '2px solid #000' : 'none',
                      outlineOffset: 2,
                      cursor: inStock ? 'pointer' : 'default',
                      opacity: inStock ? 1 : 0.3,
                      padding: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stock status — green dot + text */}
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

        {/* ADD TO BAG — 50px, black, price included */}
        <button
          onClick={handleAdd}
          disabled={!isInStock}
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
            opacity: isInStock ? 1 : 0.4,
          }}
        >
          {isInStock ? `ADD TO BAG — ${formatPrice(product.price)}` : 'OUT OF STOCK'}
        </button>
      </div>
    </div>
  );
}
