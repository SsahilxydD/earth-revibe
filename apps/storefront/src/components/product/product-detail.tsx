'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bookmark, Share2, Loader2 } from 'lucide-react';
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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ProductDetailProps {
  product: Product;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
  const heads = ['Size', 'Chest', 'Shoulder', 'Length'];

  return (
    <>
      {/* backdrop */}
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

      {/* sheet */}
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
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5' }} />
        </div>

        {/* header */}
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

        {/* table card */}
        <div style={{ padding: '0 16px 24px 16px' }}>
          <div style={{ border: '1px solid #F0F0F0', borderRadius: 12, overflow: 'hidden' }}>
            {/* header row */}
            <div
              style={{
                display: 'flex',
                height: 44,
                alignItems: 'center',
                backgroundColor: '#F8F8F8',
              }}
            >
              {heads.map((h) => (
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

            {/* data rows */}
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
/*  Detail Tabs (Pencil — tabSec node Mzs7t)                           */
/* ------------------------------------------------------------------ */

type TabKey = 'details' | 'washcare' | 'shipping';

function DetailTabs({ product }: { product: Product }) {
  const [tab, setTab] = useState<TabKey>('details');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Details & Description' },
    { key: 'washcare', label: 'Washcare' },
    { key: 'shipping', label: 'Shipping' },
  ];

  // build rows
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
      {/* tab bar — height 44, padding 0 20 */}
      <div
        style={{ height: 44, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 24 }}
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
      {/* divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* content — padding 20 20 24 20 */}
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
/*  ProductDetail (Pencil node ALtU6)                                  */
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

  const images = useMemo(
    () => [...product.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [product.images]
  );
  const hero = images[0] || null;

  /* ---- Add to bag ---- */
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

  /* ---- Buy now ---- */
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
    <div className="font-[family-name:var(--font-inter)]" style={{ backgroundColor: '#FFF' }}>
      {/* ===== 1. Hero Image (Pencil: JDMjn — 500px, #E8E4DF bg) ===== */}
      {hero && (
        <div style={{ position: 'relative', backgroundColor: '#E8E4DF' }}>
          <Image
            src={getImageUrl(hero.url, 800)}
            alt={hero.altText || product.name}
            width={800}
            height={1200}
            quality={75}
            sizes="100vw"
            className="h-auto w-full"
            priority
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
          {/* counter — bottom left, 10px/300/white */}
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
            1 / {images.length}
          </span>
          {/* wishlist bookmark — top right, 20px white */}
          <button
            onClick={() => setWishlisted((v) => !v)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={20} color="#FFF" fill={wishlisted ? '#FFF' : 'none'} />
          </button>
          {/* share — top right offset, 18px white */}
          <button
            onClick={() => {
              if (navigator.share)
                navigator.share({ title: product.name, url: window.location.href });
            }}
            style={{
              position: 'absolute',
              top: 17,
              right: 48,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Share2 size={18} color="#FFF" />
          </button>
        </div>
      )}

      {/* ===== 2. infoSec (Pencil: OuNSa — padding 20 20 0 20, gap 6) ===== */}
      <div
        style={{ padding: '20px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {/* nameRow: name+bookmark left, sizeGuideBtn right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* pdpName — 16px/500/black */}
            <span style={{ fontSize: 16, fontWeight: 500, color: '#000' }}>{product.name}</span>
            {/* pdpBookmark — 16px black */}
            <button
              onClick={() => setWishlisted((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Bookmark size={16} color="#000" fill={wishlisted ? '#000' : 'none'} />
            </button>
          </div>
          {/* sizeGuideBtn — h28, cornerRadius 4, stroke #E5E5E5, 10px/300 */}
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
        {/* pdpPrice — 14px/300/black */}
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

      {/* ===== 3. sizeSec (Pencil: EjlwE — padding 16 20 0 20, gap 8) ===== */}
      {sizes.length > 0 && (
        <div style={{ padding: '16px 20px 0 20px' }}>
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

      {/* ===== 4. btnSec (Pencil: ByiXm — padding 20 20 0 20, gap 10) ===== */}
      <div
        style={{ padding: '20px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* ADD TO BAG — outlined pill, h50, 12px, letterSpacing 1.5 */}
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
        {/* BUY NOW — filled black pill, h50, 12px/500, letterSpacing 1.5 */}
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

      {/* ===== 5. tabSec (Pencil: Mzs7t — paddingTop 24) ===== */}
      <DetailTabs product={product} />

      {/* ===== 6. Remaining images — stacked full bleed ===== */}
      {images.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {images.slice(1).map((img) => (
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

      {/* bottom padding */}
      <div style={{ height: 28 }} />

      {/* ===== Size Guide portal ===== */}
      {mounted &&
        createPortal(
          <SizeGuideSheet open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />,
          document.body
        )}
    </div>
  );
}
