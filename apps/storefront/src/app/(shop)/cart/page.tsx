"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@earth-revibe/shared";

function CartItemImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <span className="text-[9px] text-slate-400 uppercase">No Image</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100px, 120px"
      className="object-cover"
      onError={() => setHasError(true)}
    />
  );
}

export default function CartPage() {
  const router = useRouter();
  const { items, getSubtotal, updateQuantity, removeItem } = useCartStore();
  const subtotal = getSubtotal();

  return (
    <div className="bg-white min-h-screen">
      <div className="h-16 lg:h-20" aria-hidden="true" />

      <div className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto pt-8 pb-24 lg:pb-12">
        {items.length === 0 ? (
          /* Empty cart */
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="w-12 h-12 text-slate-200 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-[13px] text-slate-600 mb-2">Your cart is empty</p>
            <p className="text-[11px] text-slate-400 mb-6">Looks like you haven&apos;t added anything yet.</p>
            <Link
              href="/products"
              className="h-11 px-8 flex items-center bg-black text-white text-[11px] tracking-[0.1em] uppercase rounded-full hover:bg-black/85 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-baseline justify-between mb-8">
              <h1 className="text-[22px] font-medium text-black">Your cart</h1>
              <Link
                href="/products"
                className="text-[13px] text-slate-800 underline underline-offset-4 hover:text-black transition-colors"
              >
                Continue shopping
              </Link>
            </div>

            {/* Column headers */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-[10px] tracking-[0.1em] uppercase text-slate-500">Product</span>
              <span className="text-[10px] tracking-[0.1em] uppercase text-slate-500">Total</span>
            </div>

            {/* Cart items */}
            <div className="divide-y divide-slate-200">
              {items.map((item) => (
                <div key={item.variantId} className="py-6">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="w-[100px] h-[120px] sm:w-[120px] sm:h-[140px] bg-slate-50 flex-shrink-0 relative overflow-hidden block rounded"
                    >
                      <CartItemImage src={item.productImage || ""} alt={item.productName} />
                    </Link>

                    {/* Details + Total */}
                    <div className="flex-1 min-w-0 flex justify-between">
                      <div>
                        <Link href={`/products/${item.productSlug}`}>
                          <h3 className="text-[14px] text-slate-800 leading-snug hover:underline transition-colors">
                            {item.productName}
                          </h3>
                        </Link>
                        <p className="text-[13px] text-slate-400 mt-1">{formatPrice(item.price)}</p>
                        {item.size && (
                          <p className="text-[13px] text-slate-400 mt-0.5">Size: {item.size}</p>
                        )}

                        {/* Quantity stepper + delete */}
                        <div className="flex items-center gap-3 mt-4">
                          <div className="flex items-center border border-slate-300 rounded">
                            <button
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-black transition-colors text-[15px]"
                            >
                              &minus;
                            </button>
                            <span className="w-8 text-center text-[13px] text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              disabled={item.quantity >= (item.stock ?? 999)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-black transition-colors text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                          {/* Delete icon */}
                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Total price (right-aligned) */}
                      <div className="text-right shrink-0 pl-4">
                        <span className="text-[14px] text-slate-800">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estimated total */}
            <div className="border-t border-slate-200 pt-8 pb-4">
              <div className="flex items-baseline justify-center gap-4 mb-2">
                <span className="text-[16px] font-medium text-black">Estimated total</span>
                <span className="text-[16px] font-medium text-black">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[12px] text-slate-400 text-center">
                Taxes included. Discounts and shipping calculated at checkout.
              </p>
            </div>

            {/* Check out button */}
            <div className="mt-4">
              <button
                onClick={() => router.push("/checkout")}
                className="w-full h-[52px] rounded-full border border-black text-[14px] text-black hover:bg-black hover:text-white transition-colors"
              >
                Check out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
