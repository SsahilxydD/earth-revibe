'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bookmark, Share2, Plus, Loader2 } from 'lucide-react';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
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
import { useProducts } from '@/hooks/use-products';
import type { Product, ProductVariant } from '@/types';

// Lazy-load DOMPurify
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _purify: any = null;
function sanitize(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  if (!_purify) {
    _purify = require('isomorphic-dompurify');
    if (_purify.default) _purify = _purify.default;
  }
  return _purify.sanitize(dirty);
}

interface ProductDetailProps {
  product: Product;
}

function uniqueSizes(variants: ProductVariant[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    if (v.size && !seen.has(v.size)) {
      seen.add(v.size);
      out.push(v.size);
    }
  }
  return out;
}

function findVariant(variants: ProductVariant[], size: string | null): ProductVariant | undefined {
  return variants.find((v) => size === null || v.size === size);
}

function stockFor(variants: ProductVariant[], size: string | null): number {
  return findVariant(variants, size)?.stock ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Size Guide Sheet (Pencil node ChbrV)                               */
/* ------------------------------------------------------------------ */

function SizeGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [unit, setUnit] = useState<'IN' | 'CM'>('CM');

  const rowsIN = [
    { size: 'S', chest: '39', shoulder: '19.5', length: '26.5' },
    { size: 'M', chest: '42', shoulder: '20', length: '28' },
    { size: 'L', chest: '45', shoulder: '21', length: '29' },
    { size: 'XL', chest: '48', shoulder: '21.5', length: '29.5' },
    { size: 'XXL', chest: '51', shoulder: '22', length: '30' },
  ];

  const rowsCM = rowsIN.map((r) => ({
    size: r.size,
    chest: (parseFloat(r.chest) * 2.54).toFixed(1),
    shoulder: (parseFloat(r.shoulder) * 2.54).toFixed(1),
    length: (parseFloat(r.length) * 2.54).toFixed(1),
  }));

  const rows = unit === 'IN' ? rowsIN : rowsCM;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          backgroundColor: 'rgba(0,0,0,0.4)',
          transition: 'opacity 300ms',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
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
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* sgHandle — drag bar 40x4 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' }} />
        </div>

        {/* sgHeader — title + toggle */}
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
            {(['IN', 'CM'] as const).map((u, i) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  width: 40,
                  height: 32,
                  borderRadius: i === 0 ? '8px 0 0 8px' : '0 8px 8px 0',
                  border: unit === u ? 'none' : '1px solid #E5E5E5',
                  backgroundColor: unit === u ? '#000' : 'transparent',
                  color: unit === u ? '#FFF' : '#999',
                  fontSize: 10,
                  letterSpacing: 0.5,
                  fontWeight: unit === u ? 400 : 300,
                  cursor: 'pointer',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* tblCard — rounded 12, stroke #F0F0F0 */}
        <div style={{ padding: '0 16px 24px 16px' }}>
          <div style={{ border: '1px solid #F0F0F0', borderRadius: 12, overflow: 'hidden' }}>
            {/* tH — header row, h44, #F8F8F8 */}
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
            {rows.map((r, i) => (
              <div key={r.size}>
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
                    {r.size}
                  </span>
                  {[r.chest, r.shoulder, r.length].map((val, j) => (
                    <span
                      key={j}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: 11,
                        fontWeight: 300,
                        color: '#666',
                      }}
                    >
                      {val}
                    </span>
                  ))}
                </div>
                {i < rows.length - 1 && <div style={{ height: 1, backgroundColor: '#F5F5F5' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Tabs — Pencil node Mzs7t                                    */
/*  tabBar: zgrsv (h44, padding 0 20)                                  */
/*  tabDivider: pJGrN (1px #F0F0F0)                                   */
/*  tabContent: csm3f (padding 20 20 24 20, gap 16)                    */
/* ------------------------------------------------------------------ */

type TabKey = 'details' | 'washcare' | 'shipping';

function DetailTabs({ product }: { product: Product }) {
  const [tab, setTab] = useState<TabKey>('details');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Details & Description' },
    { key: 'washcare', label: 'Washcare' },
    { key: 'shipping', label: 'Shipping' },
  ];

  const detailRows: string[] = [];
  if (product.material) detailRows.push(product.material);
  if (product.fit) detailRows.push(product.fit);
  if (product.measurements) detailRows.push(product.measurements);
  if (product.origin) detailRows.push(`Proudly Made in ${product.origin}`);

  const washRows: { label: string; value: string }[] = [];
  if (product.composition) washRows.push({ label: 'Composition', value: product.composition });
  if (product.careInstructions) washRows.push({ label: 'Care', value: product.careInstructions });
  if (product.washInstructions) washRows.push({ label: 'Wash', value: product.washInstructions });
  if (product.fabricWeight) washRows.push({ label: 'Fabric Weight', value: product.fabricWeight });

  const shipRows: { label: string; value: string }[] = [];
  if (product.shippingInfo) shipRows.push({ label: 'Shipping', value: product.shippingInfo });
  if (product.returnsInfo) shipRows.push({ label: 'Returns', value: product.returnsInfo });

  return (
    <div style={{ paddingTop: 24 }}>
      {/* zgrsv — tabBar h44 */}
      <div
        style={{
          height: 44,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                height: 44,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
                fontSize: 11,
                fontWeight: active ? 400 : 300,
                color: active ? '#000' : '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            >
              {t.label}
              {active && (
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
      {/* pJGrN — divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* csm3f — tabContent padding 20 20 24 20, gap 16 */}
      <div style={{ padding: '20px 20px 24px 20px' }}>
        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {detailRows.length > 0 && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailRows.map((r, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </>
            )}
            {product.description && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#000' }}>Description</span>
                <div
                  style={{ fontSize: 12, fontWeight: 300, color: '#666', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: sanitize(product.description) }}
                />
              </>
            )}
            {detailRows.length === 0 && !product.description && (
              <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
                No details available.
              </span>
            )}
          </div>
        )}

        {tab === 'washcare' &&
          (washRows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {washRows.map((r) => (
                <div key={r.label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999', flexShrink: 0 }}>
                    {r.label}:
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
              No washcare info available.
            </span>
          ))}

        {tab === 'shipping' &&
          (shipRows.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shipRows.map((r) => (
                <div key={r.label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999', flexShrink: 0 }}>
                    {r.label}:
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>{r.value}</span>
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
/*  relSec — Pencil node dPB6i                                         */
/*  2-col grid (jUVqS, gap 10), each card: image 220px rounded 8,     */
/*  bookmark top-right, info row with name+price left, plus icon right */
/* ------------------------------------------------------------------ */

function RelatedSection({ categorySlug, excludeId }: { categorySlug?: string; excludeId: string }) {
  const { data } = useProducts({
    category: categorySlug,
    limit: 4,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const products = useMemo(() => {
    const all = data?.products ?? [];
    return all.filter((p: Product) => p.id !== excludeId).slice(0, 2);
  }, [data, excludeId]);

  if (products.length === 0) return null;

  return (
    /* dPB6i — padding 0 20 28 20, gap 16 */
    <div style={{ padding: '0 20px 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* jUVqS — relGrid, 2 cols, gap 10 */}
      <div style={{ display: 'flex', gap: 10 }}>
        {products.map((p: Product) => {
          const img = p.images?.find((i: { isPrimary?: boolean }) => i.isPrimary) || p.images?.[0];
          return (
            /* r1 / r2 — vertical layout, fill_container width */
            <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* r1Img / r2Img — h220, rounded 8, #F0F0F0 bg, bookmark top-right */}
              <div
                style={{
                  position: 'relative',
                  height: 220,
                  borderRadius: 8,
                  backgroundColor: '#F0F0F0',
                  overflow: 'hidden',
                }}
              >
                {img && (
                  <Image
                    src={getImageUrl(img.url, 400)}
                    alt={img.altText || p.name}
                    fill
                    sizes="50vw"
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                )}
                {/* r1Bm — bookmark 16px white, positioned top-right */}
                <Bookmark
                  size={16}
                  color="#FFF"
                  fill="none"
                  style={{ position: 'absolute', top: 10, right: 10 }}
                />
              </div>
              {/* r1Info — space-between, padding 10 0 0 0 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                }}
              >
                {/* r1Left — name + price, gap 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>{p.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 300, color: '#000' }}>
                    {formatPrice(p.price)}
                  </span>
                </div>
                {/* r1Add — plus icon 16px black */}
                <Plus size={16} color="#000" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProductDetail — Pencil node ALtU6                                  */
/*  EXACT structure: JDMjn → OuNSa → EjlwE → ByiXm → Mzs7t → dPB6i  */
/*  Nothing else. No stacked images. No desktop layout.                */
/* ------------------------------------------------------------------ */

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const sizes = useMemo(() => uniqueSizes(product.variants), [product.variants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
  const { initiatePayment } = useRazorpay();

  const variant = useMemo(
    () => findVariant(product.variants, selectedSize),
    [product.variants, selectedSize]
  );
  const price = variant?.price ?? product.price;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > price;

  const hero = useMemo(() => {
    const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted[0] || null;
  }, [product.images]);

  const addToBag = async () => {
    if (sizes.length > 0 && !selectedSize) {
      addToast('Please select a size', 'info');
      return;
    }
    const v = findVariant(product.variants, selectedSize);
    if (sizes.length > 0 && (!v || v.stock <= 0)) return;

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 300));

    const img = product.images.find((i) => i.isPrimary) || product.images[0];
    addItem({
      id: v?.id || product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: img?.url || '',
      price: v?.price ?? product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      size: selectedSize || '',
      color: '',
      maxQuantity: v?.stock ?? 99,
      quantity: 1,
    });

    trackAddToCart({
      id: product.id,
      name: product.name,
      price: v?.price ?? product.price,
      quantity: 1,
      variant: selectedSize || undefined,
    });
    addToast('Added to cart', 'success');
    setIsAdding(false);
  };

  const buyNow = async () => {
    if (sizes.length > 0 && !selectedSize) {
      addToast('Please select a size', 'info');
      return;
    }
    const v = findVariant(product.variants, selectedSize);
    if (!v || v.stock <= 0) return;

    setIsBuying(true);
    try {
      const order = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
        orderNumber: string;
        prefill: { name: string; email: string; contact: string };
      }>('/checkout/create-order', {
        items: [{ variantId: v.id, quantity: 1 }],
        loyaltyPointsToUse: 0,
      });

      trackCheckoutStarted({ total: order.amount, itemCount: 1 });

      const pay = await initiatePayment({
        orderId: order.orderNumber,
        razorpayOrderId: order.razorpayOrderId,
        amount: Math.round(order.amount * 100),
        currency: 'INR',
        customerName: order.prefill?.name,
        customerEmail: order.prefill?.email,
        customerPhone: order.prefill?.contact,
        description: `Order ${order.orderNumber}`,
      });

      if (!pay) {
        addToast('Payment was cancelled', 'info');
        setIsBuying(false);
        return;
      }

      await api.post('/checkout/verify-payment', {
        razorpayOrderId: pay.razorpay_order_id,
        razorpayPaymentId: pay.razorpay_payment_id,
        razorpaySignature: pay.razorpay_signature,
      });

      trackPurchaseCompleted({
        orderId: order.orderNumber,
        total: order.amount,
        itemCount: 1,
        paymentMethod: 'razorpay',
      });
      addToast('Order placed successfully!', 'success');
      router.push('/account/orders');
    } catch (err: any) {
      addToast(err?.message || 'Something went wrong', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FFF', display: 'flex', flexDirection: 'column' }}
    >
      {/* ===== JDMjn — Hero Image, h500, #E8E4DF, layout:none ===== */}
      {hero && (
        <div
          style={{
            position: 'relative',
            height: 500,
            backgroundColor: '#E8E4DF',
            overflow: 'hidden',
          }}
        >
          <Image
            src={getImageUrl(hero.url, 800)}
            alt={hero.altText || product.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
          {/* uIyUd — imgCounter, x:16 y:476, 10px/300/white */}
          <span
            style={{
              position: 'absolute',
              left: 16,
              top: 476,
              fontSize: 10,
              fontWeight: 300,
              color: '#FFF',
            }}
          >
            1 / {product.images.length}
          </span>
          {/* sP1wX — wishBtn bookmark, x:345 y:16, 20px white */}
          <button
            onClick={() => setWishlisted((v) => !v)}
            style={{
              position: 'absolute',
              left: 345,
              top: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Bookmark size={20} color="#FFF" fill={wishlisted ? '#FFF' : 'none'} />
          </button>
          {/* 6LGs4 — shareBtn, x:370 y:17, 18px white */}
          <button
            onClick={() => {
              if (navigator.share)
                navigator.share({ title: product.name, url: window.location.href });
            }}
            style={{
              position: 'absolute',
              left: 370,
              top: 17,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Share2 size={18} color="#FFF" />
          </button>
        </div>
      )}

      {/* ===== OuNSa — infoSec, padding 20 20 0 20, gap 6, vertical ===== */}
      <div
        style={{
          padding: '20px 20px 0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* ejhxA — nameRow, space-between */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* ZGyz4 — nameGroup, gap 8 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* cPNL0 — pdpName 16px/500/black */}
            <span style={{ fontSize: 16, fontWeight: 500, color: '#000' }}>{product.name}</span>
            {/* 6jczs — pdpBookmark 16px black */}
            <button
              onClick={() => setWishlisted((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Bookmark size={16} color="#000" fill={wishlisted ? '#000' : 'none'} />
            </button>
          </div>
          {/* EOoig — sizeGuideBtn, h28, cornerRadius 4, stroke #E5E5E5, padding 0 12 */}
          <button
            onClick={() => setSizeGuideOpen(true)}
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
        {/* rBZft — pdpPrice, 14px/300/black */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 300, color: '#000' }}>{formatPrice(price)}</span>
          {onSale && (
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

      {/* ===== EjlwE — sizeSec, padding 16 20 0 20, gap 10, vertical ===== */}
      {sizes.length > 0 && (
        <div style={{ padding: '16px 20px 0 20px' }}>
          {/* UOkor — sizeRow1, gap 8 */}
          <div style={{ display: 'flex', gap: 8 }}>
            {sizes.map((s) => {
              const sel = s === selectedSize;
              const stock = stockFor(product.variants, s);
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
                    fontWeight: sel ? 400 : 300,
                    color: oos ? '#CCC' : sel ? '#FFF' : '#000',
                    backgroundColor: sel ? '#000' : 'transparent',
                    border: sel ? 'none' : `1px solid ${oos ? '#F0F0F0' : '#E5E5E5'}`,
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

      {/* ===== ByiXm — btnSec, padding 20 20 0 20, gap 10, vertical ===== */}
      <div
        style={{
          padding: '20px 20px 0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* 6IZXY — addBtn, h50, rounded pill, stroke #E5E5E5 */}
        <button
          onClick={addToBag}
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
            opacity: isAdding ? 0.5 : 1,
          }}
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'ADD TO BAG'}
        </button>
        {/* E1Y3u — buyBtn, h50, rounded pill, black fill, 500 weight */}
        <button
          onClick={buyNow}
          disabled={isBuying}
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
            opacity: isBuying ? 0.5 : 1,
          }}
        >
          {isBuying ? <Loader2 size={16} className="animate-spin" /> : 'BUY NOW'}
        </button>
      </div>

      {/* ===== Mzs7t — tabSec, paddingTop 24 ===== */}
      <DetailTabs product={product} />

      {/* ===== dPB6i — relSec ===== */}
      <RelatedSection categorySlug={product.category?.slug} excludeId={product.id} />

      {/* Size Guide portal */}
      {mounted &&
        createPortal(
          <SizeGuideSheet open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />,
          document.body
        )}
    </div>
  );
}
