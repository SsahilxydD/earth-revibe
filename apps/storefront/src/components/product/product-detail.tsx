'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Bookmark, Share2, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { useAddToWishlist, useRemoveFromWishlist, useWishlist } from '@/hooks/use-wishlist';
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
  const [cardMinH, setCardMinH] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const measured = useRef(false);

  // On mount: cycle through all tabs, measure each card height, lock to the tallest
  useEffect(() => {
    if (measured.current || !cardRef.current) return;
    measured.current = true;
    const origTab = tab;
    let maxH = cardRef.current.scrollHeight;

    // Briefly switch to each tab to measure
    const allTabs: TabKey[] = ['details', 'washcare', 'shipping'];
    const measure = async () => {
      for (const t of allTabs) {
        setTab(t);
        // Wait for React to render
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (cardRef.current) {
          maxH = Math.max(maxH, cardRef.current.scrollHeight);
        }
      }
      setTab(origTab as TabKey);
      setCardMinH(maxH);
    };
    measure();
  }, []);

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
    /* Mzs7t — rounded card, dynamic minHeight locked on mount */
    <div
      ref={cardRef}
      style={{
        margin: '0 20px',
        width: 'auto',
        padding: '20px 20px 24px 20px',
        borderRadius: 20,
        border: '1px solid #F0F0F0',
        backgroundColor: '#F5F5F5',
        minHeight: cardMinH > 0 ? cardMinH : undefined,
      }}
    >
      {/* zgrsv — tabBar h44, padding 0 4 */}
      <div
        style={{
          height: 44,
          padding: '0 4px',
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
      {/* csm3f — tabContent, padding 16 4 20 4 */}
      <div style={{ padding: '16px 4px 20px 4px' }}>
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
/*  relSec — Pencil node e6Y3o (was dPB6i)                             */
/*  Mood circles (radio, first default) + 2-col product grid           */
/* ------------------------------------------------------------------ */

const MOODS = [
  { label: 'Beach', value: 'beach', img: '/moods/beach.webp' },
  { label: 'Brunch', value: 'brunch', img: '/moods/brunch.webp' },
  { label: 'Sunset', value: 'sunset', img: '/moods/sunset.webp' },
  { label: 'Poolside', value: 'poolside', img: '/moods/poolside.webp' },
  { label: 'Island', value: 'island', img: '/moods/island.webp' },
];

const MOOD_KEYWORDS: Record<string, string[]> = {
  beach: ['Aqua', 'Coastal', 'Marine', 'Tidewater', 'Shoreline', 'Water', 'Blu ', 'Alpine Ivory'],
  brunch: [
    'Latte',
    'Mocha',
    'Cream',
    'Oat',
    'Vanilla',
    'Biscotti',
    'Cinnamon',
    'Macchiato',
    'Caramel',
  ],
  sunset: ['Amber', 'Coral', 'Ember', 'Peach', 'Flame', 'Sienna', 'Tangerine', 'Rust', 'Brick'],
  poolside: ['Aqua', 'Mint', 'Teal', 'Cool', 'Fresh', 'Breeze', 'Splash', 'Dew', 'Mist'],
  island: [
    'Palm',
    'Fern',
    'Moss',
    'Sage',
    'Forest',
    'Olive',
    'Tropical',
    'Jungle',
    'Leaf',
    'Void',
    'Earth',
    'Terra',
    'Stone',
    'Drift',
  ],
};

function MoodSection({ excludeId }: { excludeId: string }) {
  const [mood, setMood] = useState(MOODS[0].value);
  const { data } = useProducts({ limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

  const filtered = useMemo(() => {
    const all = data?.products ?? [];
    const keywords = MOOD_KEYWORDS[mood] || [];
    return all
      .filter((p: Product) => p.id !== excludeId)
      .filter((p: Product) =>
        keywords.some((kw) => p.name.toLowerCase().includes(kw.toLowerCase()))
      )
      .slice(0, 2);
  }, [data, mood, excludeId]);

  return (
    /* relSec — padding 20 20 28 20, gap 16 */
    <div
      style={{ padding: '20px 20px 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* moodRow — h80, space-between */}
      <div
        style={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {MOODS.map((m) => {
          const active = mood === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  backgroundImage: `url(${m.img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  outline: active ? '2px solid #000' : 'none',
                  outlineOffset: 2,
                }}
              />
              <span style={{ fontSize: 9, fontWeight: active ? 400 : 300, color: '#000' }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* moodGrid — 2 cols, gap 10 */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 10 }}>
          {filtered.map((p: Product) => {
            const img =
              p.images?.find((i: { isPrimary?: boolean }) => i.isPrimary) || p.images?.[0];
            return (
              <a
                key={p.id}
                href={`/products/${p.slug}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                }}
              >
                {/* image — h220, rounded 8 */}
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
                  <Bookmark
                    size={16}
                    color="#FFF"
                    fill="none"
                    style={{ position: 'absolute', top: 10, right: 10 }}
                  />
                </div>
                {/* info — name + price left, plus right */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 10,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 300, color: '#000' }}>
                      {formatPrice(p.price)}
                    </span>
                  </div>
                  <Plus size={16} color="#000" />
                </div>
              </a>
            );
          })}
        </div>
      )}
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
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wishlist
  const { data: wishlistData } = useWishlist({ retry: false });
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const wishlisted = useMemo(
    () => (wishlistData || []).some((item) => item.product?.id === product.id),
    [wishlistData, product.id]
  );
  const toggleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist.mutate(product.id);
    } else {
      addToWishlist.mutate(product.id);
    }
  };

  // Image carousel
  const [activeImg, setActiveImg] = useState(0);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeRef = useRef({ startX: 0, dx: 0, active: false });
  const heroRef = useRef<HTMLDivElement>(null);

  const images = useMemo(
    () => [...product.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [product.images]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    swipeRef.current.startX = e.touches[0].clientX;
    swipeRef.current.active = true;
    setSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current.active) return;
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    swipeRef.current.dx = dx;
    setSwipeX(dx);
  };

  const onTouchEnd = () => {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;
    setSwiping(false);
    const dx = swipeRef.current.dx;
    const threshold = 50;
    setActiveImg((prev) => {
      if (dx < -threshold && prev < images.length - 1) return prev + 1;
      if (dx > threshold && prev > 0) return prev - 1;
      return prev;
    });
    swipeRef.current.dx = 0;
    setSwipeX(0);
  };

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
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{
        backgroundColor: '#FFF',
        position: 'relative',
      }}
    >
      {/* ===== JDMjn — Hero Image carousel, h500, sticky below header (56px) ===== */}
      {images.length > 0 && (
        <div
          ref={heroRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'sticky',
            top: 56,
            zIndex: 0,
            height: 500,
            backgroundColor: '#E8E4DF',
            overflow: 'hidden',
            touchAction: 'pan-y',
          }}
        >
          {/* Sliding tape — each slide is exactly the container width */}
          <div
            style={{
              display: 'flex',
              height: '100%',
              transform: `translateX(calc(-${activeImg * 100}% + ${swipeX}px))`,
              transition: swiping ? 'none' : 'transform 300ms ease-out',
              willChange: 'transform',
            }}
          >
            {images.map((img, i) => (
              <div
                key={img.id}
                style={{
                  position: 'relative',
                  minWidth: '100%',
                  height: '100%',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={getImageUrl(img.url, 800)}
                  alt={img.altText || product.name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={i === 0}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </div>
            ))}
          </div>
          {/* sP1wX — wishBtn bookmark, top-right */}
          <button
            onClick={toggleWishlist}
            style={{
              position: 'absolute',
              right: 28,
              top: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Bookmark size={20} color="#FFF" fill={wishlisted ? '#FFF' : 'none'} />
          </button>
          {/* 6LGs4 — shareBtn, top-right offset */}
          <button
            onClick={() => {
              if (navigator.share)
                navigator.share({ title: product.name, url: window.location.href });
            }}
            style={{
              position: 'absolute',
              right: 3,
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

      {/* ===== GABNg — infoWrap: rounded top 16, white bg, marginTop -16
           to overlap sticky hero. z-index 1 so it scrolls over the hero. ===== */}
      <motion.div
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: -16,
          backgroundColor: '#FFF',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
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
                onClick={toggleWishlist}
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
            <span style={{ fontSize: 14, fontWeight: 300, color: '#000' }}>
              {formatPrice(price)}
            </span>
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

        {/* ===== ByiXm — btnSec, padding 20 all sides, gap 10, vertical ===== */}
        <div
          style={{
            padding: 20,
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

        {/* ===== p8hDz — stacked image cards (staggered sticky) =====
             Images from index 1 onwards stack as user scrolls. Each image
             sticks at a staggered top offset so underlying rounded corners
             peek through. After the last image, natural scrolling resumes. */}
        {images.length > 1 && (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {images.slice(1).map((img, i) => (
              <div
                key={img.id}
                style={{
                  position: 'sticky',
                  top: 72 + i * 16,
                  height: 440,
                  borderRadius: 20,
                  border: '1px solid #F0F0F0',
                  backgroundColor: '#F5F5F5',
                  overflow: 'hidden',
                  zIndex: i + 1,
                }}
              >
                <Image
                  src={getImageUrl(img.url, 800)}
                  alt={img.altText || product.name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </div>
            ))}
          </div>
        )}

        {/* ===== Mzs7t — tabSec, paddingTop 24 ===== */}
        <DetailTabs product={product} />

        {/* ===== relSec — mood filters + grid ===== */}
        <MoodSection excludeId={product.id} />
      </motion.div>

      {/* Size Guide portal */}
      {mounted &&
        createPortal(
          <SizeGuideSheet open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />,
          document.body
        )}
    </div>
  );
}
