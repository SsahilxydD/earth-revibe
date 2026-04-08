'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Share2, Loader2, ChevronRight, Star } from 'lucide-react';
// Lazy-load DOMPurify to avoid jsdom SSR crash
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _purify: any = null;
function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  if (!_purify) {
    _purify = require('isomorphic-dompurify');
    if (_purify.default) _purify = _purify.default;
  }
  return _purify.sanitize(dirty);
}
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import {
  trackProductViewed,
  trackAddToCart,
  trackCheckoutStarted,
  trackPurchaseCompleted,
} from '@/lib/analytics';
import { api } from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import { useRazorpay } from '@/hooks/use-razorpay';
import { useToast } from '@/providers';
import { RelatedProducts } from './related-products';
import type { Product, ProductVariant } from '@/types';

interface ProductDetailProps {
  product: Product;
  isPreview?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Variant helpers                                                    */
/* ------------------------------------------------------------------ */

function getUniqueSizes(variants: ProductVariant[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of variants) {
    if (v.size && !seen.has(v.size)) {
      seen.add(v.size);
      result.push(v.size);
    }
  }
  return result;
}

function getVariantStock(variants: ProductVariant[], size: string | null): number {
  const match = variants.find((v) => size === null || v.size === size);
  return match?.stock ?? 0;
}

function getSelectedVariant(
  variants: ProductVariant[],
  size: string | null
): ProductVariant | undefined {
  return variants.find((v) => size === null || v.size === size);
}

/* ------------------------------------------------------------------ */
/*  Metafield helpers                                                  */
/* ------------------------------------------------------------------ */

interface MetafieldRow {
  label: string;
  value: string;
}

function buildDetailsFit(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.material) rows.push({ label: 'Material', value: p.material });
  if (p.fit) rows.push({ label: 'Fit', value: p.fit });
  if (p.measurements) rows.push({ label: 'Measurements', value: p.measurements });
  if (p.printType) rows.push({ label: 'Print Type', value: p.printType });
  return rows;
}

function buildCompositionCare(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.composition) rows.push({ label: 'Composition', value: p.composition });
  if (p.careInstructions) rows.push({ label: 'Care Instructions', value: p.careInstructions });
  if (p.washInstructions) rows.push({ label: 'Wash Instructions', value: p.washInstructions });
  if (p.fabricWeight) rows.push({ label: 'Fabric Weight', value: p.fabricWeight });
  return rows;
}

function buildShippingReturns(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.shippingInfo) rows.push({ label: 'Shipping', value: p.shippingInfo });
  if (p.returnsInfo) rows.push({ label: 'Returns', value: p.returnsInfo });
  if (p.origin) rows.push({ label: 'Origin', value: p.origin });
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Size Guide Bottom Sheet (Bluorng — from Pencil node ChbrV)         */
/* ------------------------------------------------------------------ */

function SizeGuideSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [unit, setUnit] = useState<'IN' | 'CM'>('CM');

  const dataIN = [
    { size: 'S', chest: '39', shoulder: '19.5', length: '26.5' },
    { size: 'M', chest: '42', shoulder: '20', length: '28' },
    { size: 'L', chest: '45', shoulder: '21', length: '29' },
    { size: 'XL', chest: '48', shoulder: '21.5', length: '29.5' },
    { size: 'XXL', chest: '51', shoulder: '22', length: '30' },
  ];

  const dataCM = dataIN.map((row) => ({
    size: row.size,
    chest: (parseFloat(row.chest) * 2.54).toFixed(1),
    shoulder: (parseFloat(row.shoulder) * 2.54).toFixed(1),
    length: (parseFloat(row.length) * 2.54).toFixed(1),
  }));

  const data = unit === 'IN' ? dataIN : dataCM;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          backgroundColor: 'rgba(0,0,0,0.4)',
          transition: 'opacity 300ms',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 71,
          backgroundColor: '#FFF',
          borderRadius: '16px 16px 0 0',
          transition: 'transform 300ms ease-out',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' }} />
        </div>

        {/* Header: title + IN/CM toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 20px 16px 20px',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 500, color: '#000' }}>Size guide</span>
          <div style={{ display: 'flex', height: 32 }}>
            <button
              onClick={() => setUnit('IN')}
              style={{
                width: 40,
                height: 32,
                borderRadius: '8px 0 0 8px',
                border: unit === 'IN' ? 'none' : '1px solid #E5E5E5',
                backgroundColor: unit === 'IN' ? '#000' : 'transparent',
                color: unit === 'IN' ? '#FFF' : '#999',
                fontSize: 10,
                letterSpacing: 0.5,
                fontWeight: unit === 'IN' ? 400 : 300,
                cursor: 'pointer',
              }}
            >
              IN
            </button>
            <button
              onClick={() => setUnit('CM')}
              style={{
                width: 40,
                height: 32,
                borderRadius: '0 8px 8px 0',
                border: unit === 'CM' ? 'none' : '1px solid #E5E5E5',
                backgroundColor: unit === 'CM' ? '#000' : 'transparent',
                color: unit === 'CM' ? '#FFF' : '#999',
                fontSize: 10,
                letterSpacing: 0.5,
                fontWeight: unit === 'CM' ? 400 : 300,
                cursor: 'pointer',
              }}
            >
              CM
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: '0 16px 24px 16px' }}>
          <div
            style={{
              border: '1px solid #F0F0F0',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                height: 44,
                alignItems: 'center',
                backgroundColor: '#F8F8F8',
              }}
            >
              {['Size', 'Chest', 'Shoulder', 'Length'].map((h) => (
                <span
                  key={h}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#000',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
            <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

            {/* Data rows */}
            {data.map((row, i) => (
              <div key={row.size}>
                <div
                  style={{
                    display: 'flex',
                    height: 40,
                    alignItems: 'center',
                    backgroundColor: i % 2 === 1 ? '#FAFAFA' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 400,
                      color: '#000',
                    }}
                  >
                    {row.size}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#666',
                    }}
                  >
                    {row.chest}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#666',
                    }}
                  >
                    {row.shoulder}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#666',
                    }}
                  >
                    {row.length}
                  </span>
                </div>
                {i < data.length - 1 && <div style={{ height: 1, backgroundColor: '#F5F5F5' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Tabs (from Pencil — tabSec)                                 */
/* ------------------------------------------------------------------ */

type TabKey = 'details' | 'washcare' | 'shipping';

function DetailTabs({
  description,
  compositionRows,
  shippingRows,
  detailRows,
}: {
  description: string | null;
  compositionRows: MetafieldRow[];
  shippingRows: MetafieldRow[];
  detailRows: MetafieldRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Details & Description' },
    { key: 'washcare', label: 'Washcare' },
    { key: 'shipping', label: 'Shipping' },
  ];

  return (
    <div style={{ paddingTop: 24 }}>
      {/* Tab bar — 44px height, 20px horizontal padding */}
      <div
        style={{ height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 24 }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                height: 44,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                fontSize: 11,
                fontWeight: isActive ? 400 : 300,
                color: isActive ? '#000' : '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              {tab.label}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#000',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Tab content — padding: 20px 20px 24px 20px */}
      <div style={{ padding: '20px 20px 24px 20px' }}>
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Details label + bullet list */}
            {detailRows.length > 0 && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailRows.map((row) => (
                    <span key={row.label} style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>
                      {row.value}
                    </span>
                  ))}
                </div>
              </>
            )}
            {/* Description */}
            {description && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>Description</span>
                <div
                  style={{ fontSize: 12, fontWeight: 300, color: '#666', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(description) }}
                />
              </>
            )}
            {detailRows.length === 0 && !description && (
              <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
                No details available.
              </span>
            )}
          </div>
        )}

        {activeTab === 'washcare' &&
          (compositionRows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {compositionRows.map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999', flexShrink: 0 }}>
                    {row.label}:
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
              No washcare info available.
            </span>
          ))}

        {activeTab === 'shipping' &&
          (shippingRows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shippingRows.map((row) => (
                <div key={row.label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999', flexShrink: 0 }}>
                    {row.label}:
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
              No shipping info available.
            </span>
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Star Rating                                                        */
/* ------------------------------------------------------------------ */

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={cn(
              star <= Math.round(rating)
                ? 'fill-[var(--color-star)] text-[var(--color-star)]'
                : 'fill-none text-[var(--color-border)]'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--color-muted)]">
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ProductDetail({ product, isPreview = false }: ProductDetailProps) {
  const sizes = useMemo(() => getUniqueSizes(product.variants), [product.variants]);

  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const buyNowRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    setMounted(true);
    trackProductViewed({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category?.name,
    });
  }, [product.id, product.name, product.price, product.category?.name]);

  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

  const selectedVariant = useMemo(
    () => getSelectedVariant(product.variants, selectedSize),
    [product.variants, selectedSize]
  );

  const displayPrice = selectedVariant?.price ?? product.price;
  const isOnSale = product.compareAtPrice !== null && product.compareAtPrice > displayPrice;

  /* ---- Add to cart ---- */
  const handleAddToCart = async (size?: string) => {
    const sz = size || selectedSize;
    if (sizes.length > 0 && !sz) return;

    const variant = getSelectedVariant(product.variants, sz);
    if (sizes.length > 0 && (!variant || variant.stock <= 0)) return;

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 300));

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

    addItem({
      id: variant?.id || product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || '',
      price: variant?.price ?? product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      size: sz || '',
      color: '',
      maxQuantity: variant?.stock ?? 99,
      quantity,
    });

    trackAddToCart({
      id: product.id,
      name: product.name,
      price: variant?.price ?? product.price,
      quantity,
      variant: sz || undefined,
    });
    addToast('Added to cart', 'success');
    setIsAdding(false);
  };

  /* ---- Buy now ---- */
  const { initiatePayment } = useRazorpay();

  const executeBuyNow = async (size?: string) => {
    const variant = getSelectedVariant(product.variants, size || selectedSize);
    if (!variant || variant.stock <= 0) return;

    setIsBuyingNow(true);
    try {
      const result = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
        orderNumber: string;
        prefill: { name: string; email: string; contact: string };
      }>('/checkout/create-order', {
        items: [{ variantId: variant.id, quantity }],
        loyaltyPointsToUse: 0,
      });

      trackCheckoutStarted({ total: result.amount, itemCount: quantity });

      const paymentResponse = await initiatePayment({
        orderId: result.orderNumber,
        razorpayOrderId: result.razorpayOrderId,
        amount: Math.round(result.amount * 100),
        currency: 'INR',
        customerName: result.prefill?.name,
        customerEmail: result.prefill?.email,
        customerPhone: result.prefill?.contact,
        description: `Order ${result.orderNumber}`,
      });

      if (!paymentResponse) {
        addToast('Payment was cancelled', 'info');
        setIsBuyingNow(false);
        return;
      }

      await api.post('/checkout/verify-payment', {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      });

      trackPurchaseCompleted({
        orderId: result.orderNumber,
        total: result.amount,
        itemCount: quantity,
        paymentMethod: 'razorpay',
      });

      addToast('Order placed successfully!', 'success');
      router.push('/account/orders');
    } catch (err: any) {
      addToast(err?.message || 'Something went wrong', 'error');
    } finally {
      setIsBuyingNow(false);
    }
  };

  const handleMobileAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      addToast('Please select a size', 'info');
      return;
    }
    handleAddToCart();
  };

  const handleMobileBuyNow = () => {
    if (sizes.length > 0 && !selectedSize) {
      addToast('Please select a size', 'info');
      return;
    }
    if (sizes.length > 0) {
      buyNowRef.current = true;
    }
    executeBuyNow();
  };

  const detailsFitRows = buildDetailsFit(product);
  const compositionCareRows = buildCompositionCare(product);
  const shippingReturnsRows = buildShippingReturns(product);

  const sortedImages = useMemo(
    () => [...product.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [product.images]
  );
  const firstImage = sortedImages[0] || null;

  return (
    <div className="font-[family-name:var(--font-inter)]">
      {/* ===== DESKTOP LAYOUT (lg+) ===== */}
      <div className="hidden lg:block px-4 py-6 md:px-8 lg:px-12 xl:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-[var(--color-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
            Home
          </Link>
          <ChevronRight size={12} />
          {product.category && (
            <>
              <Link
                href={`/categories/${product.category.slug}`}
                className="transition-colors hover:text-[var(--color-text)]"
              >
                {product.category.name}
              </Link>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-[var(--color-text)]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-2 items-start gap-10">
          <div>
            {firstImage && (
              <Image
                src={getImageUrl(firstImage.url, 1200)}
                alt={firstImage.altText || product.name}
                width={800}
                height={1200}
                quality={75}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-auto w-full"
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            )}
          </div>

          <div className="sticky top-24">
            <h1 className="text-2xl font-semibold uppercase leading-tight tracking-wide">
              {product.name}
            </h1>

            {product.averageRating !== null && product.reviewCount > 0 && (
              <div className="mt-2">
                <StarRating rating={product.averageRating} count={product.reviewCount} />
              </div>
            )}

            <div className="mt-4 flex items-baseline gap-3">
              <span className={cn('text-xl font-semibold', isOnSale && 'text-[var(--color-sale)]')}>
                {formatPrice(displayPrice)}
              </span>
              {isOnSale && (
                <span className="text-sm text-[var(--color-muted)] line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-[var(--color-muted)]">MRP incl. of all taxes</p>

            {product.shortDescription && (
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                {product.shortDescription}
              </p>
            )}

            {/* Desktop size selector */}
            {sizes.length > 0 && (
              <div className="mt-6 text-center">
                <div className="mb-2 flex items-center justify-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Size:{' '}
                    <span className="font-normal normal-case text-[var(--color-muted)]">
                      {selectedSize || 'Select'}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {sizes.map((size) => {
                    const stock = getVariantStock(product.variants, size);
                    const oos = stock <= 0;
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => !oos && setSelectedSize(size)}
                        disabled={oos}
                        className={cn(
                          'flex min-w-[3.5rem] items-center justify-center border px-4 py-2 transition-colors',
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                            : oos
                              ? 'cursor-not-allowed border-[var(--color-border)] text-[var(--color-sold-out)] line-through'
                              : 'border-[var(--color-primary)] hover:bg-[var(--color-surface)]'
                        )}
                      >
                        <span className="text-sm font-semibold">{size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desktop actions */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => handleAddToCart()}
                disabled={isAdding || (sizes.length > 0 && !selectedSize)}
                className={cn(
                  'flex h-[45px] w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-opacity',
                  sizes.length > 0 && !selectedSize
                    ? 'cursor-not-allowed bg-[var(--color-sold-out)] text-white'
                    : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                )}
              >
                {isAdding ? <Loader2 size={18} className="animate-spin" /> : 'Add to Cart'}
              </button>
              <button
                onClick={() => executeBuyNow()}
                disabled={isAdding || (sizes.length > 0 && !selectedSize)}
                className={cn(
                  'flex h-[45px] w-full items-center justify-center border-2 text-sm font-bold uppercase tracking-wider transition-colors',
                  sizes.length > 0 && !selectedSize
                    ? 'cursor-not-allowed border-[var(--color-sold-out)] text-[var(--color-sold-out)]'
                    : 'border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-surface)]'
                )}
              >
                Buy Now
              </button>
            </div>

            {product.description && (
              <div className="mt-8 border-t border-[var(--color-border)] border-opacity-0 pt-6">
                <div
                  className="prose prose-sm max-w-none text-sm leading-relaxed text-[var(--color-text)]"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
                />
              </div>
            )}
          </div>
        </div>

        {sortedImages.length > 1 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {sortedImages.slice(1).map((img) => (
              <div key={img.id}>
                <Image
                  src={getImageUrl(img.url, 1200)}
                  alt={img.altText || product.name}
                  width={800}
                  height={1200}
                  quality={75}
                  sizes="50vw"
                  className="h-auto w-full"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </div>
            ))}
          </div>
        )}

        <RelatedProducts categorySlug={product.category?.slug} excludeProductId={product.id} />
      </div>

      {/* ===== MOBILE LAYOUT — Bluorng style (from Pencil node ALtU6) ===== */}
      <div className="lg:hidden" style={{ backgroundColor: '#FFF' }}>
        {/* 1. Hero Image — 500px, full bleed, counter bottom-left, wishlist+share top-right */}
        {firstImage && (
          <div style={{ position: 'relative', backgroundColor: '#E8E4DF' }}>
            <Image
              src={getImageUrl(firstImage.url, 800)}
              alt={firstImage.altText || product.name}
              width={800}
              height={1200}
              quality={75}
              sizes="100vw"
              className="h-auto w-full"
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
            {/* Image counter — bottom left */}
            <span
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                fontSize: 10,
                fontWeight: 300,
                color: '#FFF',
              }}
            >
              1 / {sortedImages.length}
            </span>
            {/* Wishlist — top right */}
            <button
              onClick={() => setIsWishlisted((v) => !v)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Bookmark
                size={20}
                className={cn(isWishlisted ? 'fill-white text-white' : 'text-white')}
              />
            </button>
            {/* Share — top right, next to wishlist */}
            <button
              style={{
                position: 'absolute',
                top: 17,
                right: 48,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: product.name,
                    url: window.location.href,
                  });
                }
              }}
            >
              <Share2 size={18} color="#FFF" />
            </button>
          </div>
        )}

        {/* 2. infoSec — Name + bookmark, Size Guide btn, Price */}
        <div
          style={{ padding: '20px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {/* nameRow: name+bookmark left, Size Guide right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: '#000' }}>{product.name}</span>
              <button
                onClick={() => setIsWishlisted((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Bookmark
                  size={16}
                  className={cn(isWishlisted ? 'fill-black text-black' : 'text-black')}
                />
              </button>
            </div>
            <button
              onClick={() => setShowSizeGuide(true)}
              style={{
                height: 28,
                padding: '0 12px',
                border: '1px solid #E5E5E5',
                borderRadius: 4,
                background: 'none',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 300,
                color: '#000',
                flexShrink: 0,
              }}
            >
              Size Guide
            </button>
          </div>
          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 300, color: '#000' }}>
              {formatPrice(displayPrice)}
            </span>
            {isOnSale && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#CCC',
                  textDecoration: 'line-through',
                }}
              >
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
        </div>

        {/* 3. sizeSec — Rounded pill size buttons */}
        {sizes.length > 0 && (
          <div style={{ padding: '16px 20px 0 20px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {sizes.map((s) => {
                const isSelected = s === selectedSize;
                const stock = getVariantStock(product.variants, s);
                const oos = product.variants.length > 0 && stock <= 0;
                return (
                  <button
                    key={s}
                    onClick={() => !oos && setSelectedSize(s)}
                    disabled={oos}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: isSelected ? 400 : 300,
                      color: oos ? '#CCC' : isSelected ? '#FFF' : '#000',
                      backgroundColor: isSelected ? '#000' : 'transparent',
                      border: isSelected ? 'none' : `1px solid ${oos ? '#F0F0F0' : '#E5E5E5'}`,
                      cursor: oos ? 'default' : 'pointer',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. btnSec — ADD TO BAG + BUY NOW rounded full-width */}
        <div
          style={{ padding: '20px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <button
            type="button"
            onClick={handleMobileAddToCart}
            disabled={isAdding}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 9999,
              border: '1px solid #E5E5E5',
              backgroundColor: 'transparent',
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: 1.5,
              color: '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isAdding && !isBuyingNow ? 0.5 : 1,
            }}
          >
            {isAdding && !isBuyingNow ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'ADD TO BAG'
            )}
          </button>
          <button
            type="button"
            onClick={handleMobileBuyNow}
            disabled={isAdding || isBuyingNow}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 9999,
              border: 'none',
              backgroundColor: '#000',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isBuyingNow ? 0.5 : 1,
            }}
          >
            {isBuyingNow ? <Loader2 size={16} className="animate-spin" /> : 'BUY NOW'}
          </button>
        </div>

        {/* 5. tabSec — Detail Tabs */}
        <DetailTabs
          description={product.description}
          compositionRows={compositionCareRows}
          shippingRows={shippingReturnsRows}
          detailRows={detailsFitRows}
        />

        {/* 6. Remaining images — stacked full bleed */}
        {sortedImages.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedImages.slice(1).map((img) => (
              <Image
                key={img.id}
                src={getImageUrl(img.url, 800)}
                alt={img.altText || product.name}
                width={800}
                height={1200}
                quality={75}
                sizes="100vw"
                className="h-auto w-full"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            ))}
          </div>
        )}

        {/* 7. relSec — Related products */}
        <div style={{ padding: '0 20px 28px 20px' }}>
          <RelatedProducts categorySlug={product.category?.slug} excludeProductId={product.id} />
        </div>
      </div>

      {/* Size Guide bottom sheet — portaled */}
      {!isPreview &&
        mounted &&
        createPortal(
          <SizeGuideSheet isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />,
          document.body
        )}
    </div>
  );
}
