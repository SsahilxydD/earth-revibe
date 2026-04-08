'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Lock } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import { formatPrice } from '@/lib/utils';
import { CartItemRow } from './cart-item';
import { LoginModal } from '@/components/auth/login-modal';
import { PaymentMethodModal } from '@/components/checkout/payment-method-modal';
import { CODCheckoutModal } from '@/components/checkout/cod-checkout-modal';
import { api } from '@/lib/api-client';
import { useRazorpay, preloadRazorpayScript } from '@/hooks/use-razorpay';
import { useToast } from '@/providers';
import { Spinner } from '@/components/ui/spinner';

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
          /* ───── Empty state ───── */
          <>
            {/* Header */}
            <div
              style={{
                height: 56,
                paddingLeft: 28,
                paddingRight: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 400, letterSpacing: 2, color: '#000' }}>
                YOUR BAG
              </span>
              <button
                onClick={closeCart}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Close cart"
              >
                <X size={20} color="#000" strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

            {/* Centered empty content */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '0 48px',
              }}
            >
              <ShoppingBag size={48} color="#E5E5E5" strokeWidth={1} />
              <p style={{ fontSize: 14, fontWeight: 300, color: '#999' }}>Your bag is empty</p>
              <p style={{ fontSize: 12, fontWeight: 300, color: '#CCC', textAlign: 'center' }}>
                Looks like you haven&apos;t added anything yet
              </p>
              <div style={{ height: 8 }} />
              <button
                onClick={closeCart}
                style={{
                  height: 46,
                  padding: '0 32px',
                  border: '1px solid #000',
                  backgroundColor: 'transparent',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: 2,
                  color: '#000',
                  cursor: 'pointer',
                }}
              >
                CONTINUE SHOPPING
              </button>
            </div>

            <div />
          </>
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
