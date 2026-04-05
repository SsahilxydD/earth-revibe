'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CartItemRow } from './cart-item';
import { LoginModal } from '@/components/auth/login-modal';
import { api } from '@/lib/api-client';
import { useRazorpay, preloadRazorpayScript } from '@/hooks/use-razorpay';
import { useToast } from '@/providers';

// Free shipping on all orders — no threshold

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

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const { initiatePayment } = useRazorpay();
  const { addToast } = useToast();

  const subtotal = getSubtotal();
  const total = getTotal();
  // Always free shipping

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Preload Razorpay SDK as soon as cart opens so it's ready at checkout
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

  // Launch Razorpay Magic Checkout directly from the cart drawer — no page navigation
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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={closeCart} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Your Cart</h2>
          <button
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
            <ShoppingBag className="h-16 w-16 text-[var(--color-border)]" />
            <p className="text-sm font-medium text-[var(--color-muted)]">Your cart is empty</p>
            <Button onClick={closeCart} variant="primary" size="md">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping banner */}
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <p className="text-center text-xs font-semibold text-green-600">
                Free shipping on all orders
              </p>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-4">
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <CartItemRow item={item} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              {/* Discount */}
              {!discountCode ? (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="Discount code"
                      className="flex-1 rounded-[var(--button-radius)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyDiscount}
                      loading={applyingDiscount}
                    >
                      Apply
                    </Button>
                  </div>
                  {discountError && (
                    <p className="mt-1 text-xs text-[var(--color-sale)]">{discountError}</p>
                  )}
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-between rounded-[var(--badge-radius)] bg-[var(--color-surface)] px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{discountCode}</span> &minus;
                    {formatPrice(discountAmount)}
                  </span>
                  <button
                    onClick={removeDiscount}
                    className="text-xs text-[var(--color-sale)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Totals */}
              <div className="mb-4 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted)]">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[var(--color-sale)]">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {checkoutStep !== 'idle' ? (
                <div className="space-y-3">
                  {/* Progress steps */}
                  <div className="flex items-center gap-3">
                    {[
                      { key: 'securing', label: 'Securing your order' },
                      { key: 'opening', label: 'Opening payment' },
                      { key: 'verifying', label: 'Confirming' },
                    ].map((step) => {
                      const steps = ['securing', 'opening', 'verifying'];
                      const current = steps.indexOf(checkoutStep);
                      const isActive = steps.indexOf(step.key) === current;
                      const isDone = steps.indexOf(step.key) < current;
                      return (
                        <div key={step.key} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={`h-1 w-full rounded-full transition-all duration-500 ${
                              isDone
                                ? 'bg-[var(--color-text)]'
                                : isActive
                                  ? 'animate-pulse bg-[var(--color-text)]'
                                  : 'bg-[var(--color-border)]'
                            }`}
                          />
                          <span
                            className={`text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                              isActive
                                ? 'font-semibold text-[var(--color-text)]'
                                : isDone
                                  ? 'text-[var(--color-muted)]'
                                  : 'text-[var(--color-border)]'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-xs text-[var(--color-muted)]">
                    Please don&apos;t close this window
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={isAuthenticated ? launchMagicCheckout : () => setShowLoginModal(true)}
                >
                  Checkout
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Login modal — shown when unauthenticated user tries to checkout */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={launchMagicCheckout}
      />
    </div>
  );
}
