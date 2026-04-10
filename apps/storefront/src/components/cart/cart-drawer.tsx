'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Lock, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { CartItemRow } from './cart-item';
import { LoginModal } from '@/components/auth/login-modal';
import { PaymentMethodModal } from '@/components/checkout/payment-method-modal';
import { CODCheckoutModal } from '@/components/checkout/cod-checkout-modal';
import { api } from '@/lib/api-client';
import { useRazorpay, preloadRazorpayScript } from '@/hooks/use-razorpay';
import { useProducts } from '@/hooks/use-products';
import { useToast } from '@/providers';
import { Spinner } from '@/components/ui/spinner';
import type { Product } from '@/types';

const EMPTY_VIBES: { label: string; slug: string; img: string; count: string }[] = [
  {
    label: 'Above the Clouds',
    slug: 'above-the-clouds',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=80&fm=jpg',
    count: '14',
  },
  {
    label: 'Salt on Skin',
    slug: 'salt-on-skin',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80&fm=jpg',
    count: '22',
  },
  {
    label: 'Golden Hour Gang',
    slug: 'golden-hour-gang',
    img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=80&fm=jpg',
    count: '16',
  },
  {
    label: 'Into the Wild',
    slug: 'into-the-wild',
    img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=80&fm=jpg',
    count: '22',
  },
  {
    label: 'Neon Nomads',
    slug: 'neon-nomads',
    img: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=200&q=80&fm=jpg',
    count: '20',
  },
  {
    label: 'Flight Mode',
    slug: 'flight-mode',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&q=80&fm=jpg',
    count: '20+',
  },
];

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    discountCode,
    discountAmount,
    applyDiscount,
    removeDiscount,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'securing' | 'opening' | 'verifying'>(
    'idle'
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showCODCheckout, setShowCODCheckout] = useState(false);
  const [pendingCOD, setPendingCOD] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const { initiatePayment } = useRazorpay();
  const { addToast } = useToast();

  const subtotal = getSubtotal();
  const total = getTotal();

  // ───── Empty cart — live newest products from T-shirts / Shirts / Polos ─────
  // Fetch 4 newest from each category, only when the cart is actually open and
  // empty, then interleave them as t,s,p,t,s,p,t,s,p,t,s,p → 12 total.
  const emptyQueryEnabled = isOpen && items.length === 0;
  const tshirtsQuery = useProducts(
    { category: 't-shirts', limit: 4, sortBy: 'createdAt', sortOrder: 'desc' },
    { enabled: emptyQueryEnabled, staleTime: 5 * 60 * 1000 }
  );
  const shirtsQuery = useProducts(
    { category: 'shirts', limit: 4, sortBy: 'createdAt', sortOrder: 'desc' },
    { enabled: emptyQueryEnabled, staleTime: 5 * 60 * 1000 }
  );
  const polosQuery = useProducts(
    { category: 'polos', limit: 4, sortBy: 'createdAt', sortOrder: 'desc' },
    { enabled: emptyQueryEnabled, staleTime: 5 * 60 * 1000 }
  );

  const emptyRecommended = useMemo<Product[]>(() => {
    const t = tshirtsQuery.data?.products ?? [];
    const s = shirtsQuery.data?.products ?? [];
    const p = polosQuery.data?.products ?? [];
    const out: Product[] = [];
    for (let i = 0; i < 4; i++) {
      if (t[i]) out.push(t[i]);
      if (s[i]) out.push(s[i]);
      if (p[i]) out.push(p[i]);
    }
    return out;
  }, [tshirtsQuery.data, shirtsQuery.data, polosQuery.data]);

  const emptyRecommendedLoading =
    emptyQueryEnabled && (tshirtsQuery.isLoading || shirtsQuery.isLoading || polosQuery.isLoading);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      preloadRazorpayScript();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeCart();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setApplyingDiscount(true);
    setDiscountError('');
    try {
      const result = await api.post<{ code: string; discountAmount: number }>(
        '/discounts/validate',
        { code: discountInput.trim(), orderTotal: subtotal }
      );
      applyDiscount(result.code, result.discountAmount);
      setDiscountInput('');
    } catch (error: any) {
      setDiscountError(error?.message || 'Invalid discount code');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const launchMagicCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutStep('securing');

    try {
      const result = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
        orderNumber: string;
        prefill: { name: string; email: string; contact: string };
      }>('/checkout/create-order', {
        items: items.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        })),
        ...(discountCode ? { discountCode } : {}),
        loyaltyPointsToUse: 0,
      });

      setCheckoutStep('opening');

      const paymentResponse = await initiatePayment({
        orderId: result.orderNumber,
        razorpayOrderId: result.razorpayOrderId,
        amount: Math.round(result.amount * 100),
        currency: 'INR',
        customerName: result.prefill.name,
        customerEmail: result.prefill.email,
        customerPhone: result.prefill.contact,
        description: `Order ${result.orderNumber}`,
      });

      if (!paymentResponse) {
        addToast('Payment was cancelled. You can try again.', 'info');
        setCheckoutStep('idle');
        return;
      }

      setCheckoutStep('verifying');

      const verification = await api.post<{
        orderNumber: string;
        pointsEarned: number;
        accountAutoCreated: boolean;
      }>('/checkout/verify-payment', {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      });

      closeCart();
      setCheckoutStep('idle');
      const params = new URLSearchParams({ orderId: verification.orderNumber });
      if (verification.accountAutoCreated) params.set('newAccount', '1');
      router.push(`/checkout/confirmation?${params.toString()}`);
    } catch (error: any) {
      addToast(error?.message || 'Something went wrong. Please try again.', 'error');
      setCheckoutStep('idle');
    }
  }, [items, discountCode, initiatePayment, addToast, clearCart, closeCart, router]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className="animate-slide-in-right font-[family-name:var(--font-inter)]"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          width: '100%',
          maxWidth: 393,
          backgroundColor: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {items.length === 0 ? (
          /* ───── Empty state — editorial Bluorng-style discovery surface ───── */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '56px 32px 72px 32px',
            }}
          >
            {/* Title block + close */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2
                  style={{
                    fontSize: 44,
                    fontWeight: 300,
                    fontStyle: 'italic',
                    letterSpacing: -1.8,
                    lineHeight: 1,
                    color: '#000',
                    margin: 0,
                  }}
                >
                  Your cart
                  <br />
                  is empty.
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 300,
                    color: '#999',
                    margin: 0,
                  }}
                >
                  Every trip starts with a clean rack.
                </p>
              </div>
              <button
                onClick={closeCart}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
                aria-label="Close cart"
              >
                <X size={20} color="#000" strokeWidth={1.5} />
              </button>
            </div>

            {/* Shop now link */}
            <Link
              href="/products"
              onClick={closeCart}
              style={{
                marginTop: 28,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                fontWeight: 400,
                color: '#000',
                textDecoration: 'none',
              }}
            >
              Shop now
              <ArrowUpRight size={14} color="#000" />
            </Link>

            {/* Spacer — major section break */}
            <div style={{ height: 80 }} />

            {/* PRODUCTS YOU MAY LIKE label */}
            <span
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: 2.5,
                color: '#999',
              }}
            >
              PRODUCTS YOU MAY LIKE
            </span>

            {/* Horizontal scroll — 12 newest products interleaved t,s,p,t,s,p,… */}
            <div
              className="hide-scrollbar"
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                marginLeft: -32,
                marginRight: -32,
                paddingLeft: 32,
                paddingRight: 32,
              }}
            >
              {emptyRecommendedLoading && emptyRecommended.length === 0
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      style={{
                        width: 128,
                        height: 172,
                        flexShrink: 0,
                        borderRadius: 14,
                        backgroundColor: '#F5F5F5',
                      }}
                    />
                  ))
                : emptyRecommended.map((product) => {
                    const sorted = [...(product.images ?? [])].sort(
                      (a, b) => a.sortOrder - b.sortOrder
                    );
                    const primary = sorted.find((img) => img.isPrimary) || sorted[0];
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={closeCart}
                        style={{
                          position: 'relative',
                          width: 128,
                          height: 172,
                          flexShrink: 0,
                          borderRadius: 14,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                        }}
                      >
                        {primary && (
                          <Image
                            src={getImageUrl(primary.url, 300, primary.thumbnailUrl)}
                            alt={primary.altText || product.name}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        )}
                      </Link>
                    );
                  })}
            </div>

            {/* Spacer — major section break */}
            <div style={{ height: 88 }} />

            {/* BROWSE BY VIBE label */}
            <span
              style={{
                display: 'block',
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: 2.5,
                color: '#999',
              }}
            >
              BROWSE BY VIBE
            </span>

            {/* Vibe list */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column' }}>
              {EMPTY_VIBES.map((v, i) => (
                <div key={v.slug}>
                  <Link
                    href={`/products?vibe=${v.slug}`}
                    onClick={closeCart}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: 96,
                      gap: 20,
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
                      <div
                        style={{
                          position: 'relative',
                          width: 52,
                          height: 72,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F5',
                          flexShrink: 0,
                        }}
                      >
                        <Image
                          src={v.img}
                          alt={v.label}
                          fill
                          sizes="52px"
                          className="object-cover"
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 400,
                          color: '#000',
                        }}
                      >
                        {v.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 300, color: '#CCC' }}>
                        {v.count}
                      </span>
                      <ChevronRight size={12} color="#CCC" />
                    </div>
                  </Link>
                  {i < EMPTY_VIBES.length - 1 && (
                    <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ───── Cart with items ───── */
          <>
            {/* Top section */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Header — 56px */}
              <div
                style={{
                  height: 56,
                  paddingLeft: 28,
                  paddingRight: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: 2, color: '#000' }}>
                  YOUR BAG ({items.reduce((acc, i) => acc + i.quantity, 0)})
                </span>
                <button
                  onClick={closeCart}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label="Close cart"
                >
                  <X size={20} color="#000" strokeWidth={1.5} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: '#F0F0F0', flexShrink: 0 }} />

              {/* Free shipping banner — 40px */}
              <div
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 300, color: '#22C55E' }}>
                  Free shipping on all orders
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, backgroundColor: '#F0F0F0', flexShrink: 0 }} />

              {/* Items list — scrollable, padding 20/28 */}
              <div
                className="hide-scrollbar"
                style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}
              >
                {items.map((item, i) => (
                  <div key={item.id}>
                    <div style={{ padding: '16px 0' }}>
                      <CartItemRow item={item} />
                    </div>
                    {i < items.length - 1 && (
                      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer — padding 20/28/28/28, gap 20 */}
            <div
              style={{
                padding: '20px 28px 28px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                flexShrink: 0,
              }}
            >
              {/* Top divider */}
              <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

              {/* Discount row */}
              {!discountCode ? (
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div
                      style={{
                        flex: 1,
                        height: 42,
                        border: '1px solid #E5E5E5',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 14px',
                      }}
                    >
                      <input
                        type="text"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyDiscount();
                        }}
                        placeholder="Discount code"
                        style={{
                          width: '100%',
                          fontSize: 12,
                          fontWeight: 300,
                          color: '#000',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                        }}
                      />
                    </div>
                    <button
                      onClick={handleApplyDiscount}
                      disabled={applyingDiscount}
                      style={{
                        height: 42,
                        padding: '0 20px',
                        border: '1px solid #000',
                        backgroundColor: 'transparent',
                        fontSize: 10,
                        fontWeight: 400,
                        letterSpacing: 1.5,
                        color: '#000',
                        cursor: 'pointer',
                        opacity: applyingDiscount ? 0.5 : 1,
                      }}
                    >
                      {applyingDiscount ? '...' : 'APPLY'}
                    </button>
                  </div>
                  {discountError && (
                    <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>{discountError}</p>
                  )}
                </div>
              ) : (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
                    {discountCode}{' '}
                    <span style={{ fontWeight: 300, color: '#22C55E' }}>
                      −{formatPrice(discountAmount)}
                    </span>
                  </span>
                  <button
                    onClick={removeDiscount}
                    style={{
                      fontSize: 10,
                      fontWeight: 300,
                      color: '#999',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Totals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Subtotal</span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
                    {formatPrice(subtotal)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Discount</span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#22C55E' }}>
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Shipping</span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>Free</span>
                </div>
                <div style={{ height: 8 }} />
                <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
                <div style={{ height: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>Total</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Checkout button or progress */}
              {checkoutStep !== 'idle' ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 50,
                      backgroundColor: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Spinner className="h-4 w-4" />
                    <span
                      style={{ fontSize: 12, fontWeight: 400, letterSpacing: 2, color: '#FFF' }}
                    >
                      {checkoutStep === 'securing'
                        ? 'SECURING ORDER...'
                        : checkoutStep === 'opening'
                          ? 'OPENING PAYMENT...'
                          : 'CONFIRMING...'}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, fontWeight: 300, color: '#CCC' }}>
                    Please don&apos;t close this window
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setShowPaymentMethodModal(true)}
                  style={{
                    width: '100%',
                    height: 50,
                    backgroundColor: '#000',
                    color: '#FFF',
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: 2,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  CHECKOUT
                </button>
              )}

              {/* Secure checkout + delivery */}
              <div
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
              >
                <Lock size={12} color="#CCC" />
                <span style={{ fontSize: 10, fontWeight: 300, color: '#CCC' }}>
                  Secure checkout · Delivery in 3–5 days
                </span>
              </div>

              {/* Continue shopping */}
              <button
                onClick={closeCart}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 300,
                  color: '#999',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectPrepaid={() => {
          if (isAuthenticated) {
            launchMagicCheckout();
          } else {
            setPendingCOD(false);
            setShowLoginModal(true);
          }
        }}
        onSelectCOD={() => {
          if (isAuthenticated) {
            setShowCODCheckout(true);
          } else {
            setPendingCOD(true);
            setShowLoginModal(true);
          }
        }}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingCOD(false);
        }}
        onSuccess={() => {
          setShowLoginModal(false);
          if (pendingCOD) {
            setPendingCOD(false);
            setShowCODCheckout(true);
          } else {
            launchMagicCheckout();
          }
        }}
        onGuest={
          pendingCOD
            ? undefined
            : () => {
                setShowLoginModal(false);
                launchMagicCheckout();
              }
        }
      />

      <CODCheckoutModal isOpen={showCODCheckout} onClose={() => setShowCODCheckout(false)} />
    </div>
  );
}
