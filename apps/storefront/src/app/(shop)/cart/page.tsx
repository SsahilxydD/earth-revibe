'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';
import { KitUpsellBanner } from '@/components/cart/kit-upsell-banner';

// Free shipping on all orders

function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-4 border-b border-[var(--color-border)] py-5">
      <Link
        href={`/products/${item.slug}`}
        className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-[var(--badge-radius)] bg-[var(--color-surface)] sm:w-24"
      >
        <Image
          src={getImageUrl(item.image, 200)}
          alt={item.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/products/${item.slug}`}
              className="text-sm font-semibold uppercase tracking-wider hover:underline"
            >
              {item.name}
            </Link>
            <div className="mt-1 flex gap-3 text-xs text-[var(--color-muted)]">
              {item.size && <span>Size: {item.size}</span>}
              {item.color && <span>Color: {item.color}</span>}
            </div>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-sale)]"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center rounded-[var(--button-radius)] border border-[var(--color-border)]">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center text-sm font-semibold">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.maxQuantity}
              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-[var(--color-surface)] disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
            {item.compareAtPrice && item.compareAtPrice > item.price && (
              <p className="text-xs text-[var(--color-muted)] line-through">
                {formatPrice(item.compareAtPrice * item.quantity)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeShippingBar() {
  return (
    <div className="rounded-[var(--badge-radius)] bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
      Free shipping on all orders
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-surface)]">
        <ShoppingBag className="h-10 w-10 text-[var(--color-muted)]" />
      </div>
      <h2 className="mt-6 text-xl font-bold uppercase tracking-wider">Your cart is empty</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Start with a shirt, a pair of linens, or whatever the weekend needs.
      </p>
      <Link href="/products">
        <Button size="lg" className="mt-8">
          Browse Products
        </Button>
      </Link>
    </div>
  );
}

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const removeDiscount = useCartStore((s) => s.removeDiscount);

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const { addToast } = useToast();

  const subtotal = getSubtotal();
  const total = getTotal();
  const shippingEstimate = 0; // Always free shipping

  const handleApplyDiscount = async () => {
    const code = couponInput.trim();
    if (!code) return;

    setCouponError('');
    setCouponLoading(true);
    try {
      const result = await api.post<{ code: string; discountAmount: number }>(
        '/discounts/validate',
        { code, orderTotal: subtotal }
      );
      applyDiscount(result.code, result.discountAmount);
      setCouponInput('');
      addToast('Discount applied!', 'success');
    } catch (discountErr: any) {
      try {
        const ref = await api.get<{ valid: boolean; reason?: string; referrerName?: string }>(
          `/referrals/validate?code=${encodeURIComponent(code)}`
        );
        if (ref.valid) {
          const refereeDiscount = Math.floor(subtotal * 0.15);
          applyDiscount(code, refereeDiscount);
          setCouponInput('');
          addToast('Referral code applied! 15% off your first order.', 'success');
        } else {
          const messages: Record<string, string> = {
            'not-found': 'Invalid code',
            self: "You can't use your own referral code",
            'not-first-order': 'Referral codes only work on your first order',
            'different-referrer': 'You have already used a different referral code',
          };
          setCouponError(messages[ref.reason ?? ''] ?? discountErr?.message ?? 'Invalid code');
        }
      } catch {
        setCouponError(discountErr?.message || 'Invalid code');
      }
    } finally {
      setCouponLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 md:px-8 lg:px-12 xl:px-20">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Shopping Cart</h1>
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 lg:px-12 xl:px-20">
      <h1 className="text-2xl font-bold uppercase tracking-wider">Shopping Cart</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: Cart Items */}
        <div>
          <FreeShippingBar />
          <div className="mt-6">
            <KitUpsellBanner variant="page" />
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </div>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">Order Summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>

              {discountCode && discountAmount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{discountCode}</span>
                    <button
                      onClick={removeDiscount}
                      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
                      aria-label="Remove discount"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Shipping estimate</span>
                <span className="font-semibold">
                  {shippingEstimate === 0 ? 'FREE' : formatPrice(shippingEstimate)}
                </span>
              </div>

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">{formatPrice(total + shippingEstimate)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Tax included. Shipping calculated at checkout.
                </p>
              </div>
            </div>

            {/* Discount Code */}
            {!discountCode && (
              <div className="mt-5">
                <div className="flex gap-2">
                  <Input
                    placeholder="Discount code"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyDiscount();
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyDiscount}
                    loading={couponLoading}
                    disabled={!couponInput.trim()}
                  >
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p className="mt-1.5 text-xs text-[var(--color-sale)]">{couponError}</p>
                )}
              </div>
            )}

            <Link href="/checkout" className="mt-6 block">
              <Button fullWidth size="lg">
                Checkout
              </Button>
            </Link>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
