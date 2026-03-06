'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@earth-revibe/shared';

function CartItemImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="text-[8px] text-slate-400">No Image</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="80px"
      className="object-cover"
      onError={() => setHasError(true)}
    />
  );
}

function CouponCodeInput() {
  const { discountCode, discountError, isApplyingDiscount, applyDiscount, removeDiscount } = useCartStore();
  const [code, setCode] = useState('');

  if (discountCode) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[10px] text-green-700 font-medium uppercase tracking-wide">{discountCode}</span>
        </div>
        <button onClick={removeDiscount} className="text-[9px] text-red-500 hover:text-red-700 uppercase tracking-wide">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="flex-1 px-3 py-2 text-[10px] border border-slate-200 rounded focus:outline-none focus:border-black uppercase tracking-wide"
          onKeyDown={(e) => e.key === 'Enter' && applyDiscount(code.trim())}
        />
        <button
          onClick={() => applyDiscount(code.trim())}
          disabled={isApplyingDiscount || !code.trim()}
          className="px-4 py-2 bg-black text-white text-[9px] uppercase tracking-wide hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplyingDiscount ? '...' : 'Apply'}
        </button>
      </div>
      {discountError && <p className="text-[9px] text-red-500">{discountError}</p>}
    </div>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, setCartOpen, getSubtotal, getTotal, discountAmount, updateQuantity, removeItem } = useCartStore();
  const subtotal = getSubtotal();
  const total = getTotal();

  const handleCheckout = () => {
    setCartOpen(false);
    router.push('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:max-w-[400px] bg-white z-50 transition-transform duration-500 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="font-[var(--font-cinzel)] text-[11px] tracking-[0.12em] uppercase text-black">
            Cart ({items.length})
          </h2>
          <button
            onClick={() => setCartOpen(false)}
            className="p-1 text-slate-400 hover:text-black transition-colors"
            aria-label="Close cart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-12 h-12 text-slate-200 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-[11px] tracking-[0.08em] uppercase text-black mb-6">Your cart is empty</p>
              <button
                onClick={() => { setCartOpen(false); router.push('/products'); }}
                className="text-[10px] tracking-[0.1em] uppercase text-slate-500 border-b border-slate-300 pb-0.5 hover:text-black hover:border-black transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="w-[72px] h-[96px] bg-slate-50 flex-shrink-0 relative overflow-hidden">
                    <CartItemImage src={item.productImage || ''} alt={item.productName} />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="text-[11px] tracking-[0.04em] text-black font-medium uppercase">{item.productName}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 tracking-wide">
                        {item.color}{item.size ? ` / ${item.size}` : ''}
                      </p>
                      <p className="text-[11px] text-black mt-2">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-black transition-colors text-[11px]"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-[10px] text-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-black transition-colors text-[11px]"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-[9px] tracking-[0.08em] uppercase text-slate-400 hover:text-black transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="shrink-0 px-6 py-5 bg-white border-t border-slate-100">
            <div className="mb-4">
              <CouponCodeInput />
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.08em] uppercase text-slate-500">Subtotal</span>
                <span className="text-[11px] text-black">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.08em] uppercase text-green-600">Discount</span>
                  <span className="text-[11px] text-green-600">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] tracking-[0.08em] uppercase text-black font-medium">Total</span>
                <span className="text-[12px] font-medium text-black">{formatPrice(total)}</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mb-4 tracking-wide">Inclusive of all Taxes</p>
            <button
              onClick={handleCheckout}
              className="block w-full py-3 bg-black text-white text-center text-[10px] tracking-[0.12em] uppercase hover:opacity-90"
            >
              Checkout
            </button>
            <Link
              href="/cart"
              onClick={() => setCartOpen(false)}
              className="block w-full py-3 mt-2 text-center text-[10px] tracking-[0.12em] uppercase text-slate-500 hover:text-black transition-colors duration-300"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
