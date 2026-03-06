"use client";

import { useCartStore } from "@/stores/cart-store";
import { useRazorpayCheckout } from "@/hooks/use-razorpay-checkout";
import { toast } from "@/components/ui/toast";

interface AddToCartProps {
  variant: {
    id: string;
    size: string;
    color: string;
    stock: number;
    price?: number | string | null;
  } | null;
  product: {
    name: string;
    slug: string;
    price: number | string;
    images: { url: string }[];
  };
  disabled?: boolean;
}

export function AddToCart({ variant, product, disabled }: AddToCartProps) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const { startCheckout, isProcessing } = useRazorpayCheckout();

  const currentQtyInCart = variant ? (items.find((i) => i.variantId === variant.id)?.quantity || 0) : 0;
  const stockLeft = variant ? variant.stock - currentQtyInCart : 0;

  const addToCart = () => {
    if (!variant) return;
    if (stockLeft <= 0) {
      toast.error("No more stock available");
      return;
    }
    addItem({
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.images?.[0]?.url,
      size: variant.size,
      color: variant.color,
      price: Number(variant.price || product.price),
      quantity: 1,
      stock: variant.stock,
    });
    toast.success(`${product.name} added to cart`);
  };

  const buyNow = () => {
    if (!variant) return;
    // Add to cart first so it's tracked
    addToCart();
    // Open Magic Checkout directly with this item
    startCheckout([{ variantId: variant.id, quantity: 1 }]);
  };

  const needsSelection = disabled || !variant;
  const outOfStock = variant && variant.stock === 0;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <button
        onClick={addToCart}
        disabled={needsSelection || !!outOfStock}
        className={`w-full h-[50px] rounded-full text-[11px] tracking-[0.12em] uppercase transition-colors border ${
          needsSelection
            ? "border-slate-200 text-slate-400 cursor-default"
            : outOfStock
            ? "border-slate-200 text-slate-400 cursor-not-allowed"
            : "border-black text-black hover:bg-black hover:text-white"
        }`}
      >
        {needsSelection ? "Add to Bag" : outOfStock ? "Out of Stock" : "Add to Bag"}
      </button>

      <button
        onClick={buyNow}
        disabled={needsSelection || !!outOfStock || isProcessing}
        className={`w-full h-[50px] rounded-full text-[11px] tracking-[0.12em] uppercase transition-colors ${
          needsSelection || outOfStock
            ? "bg-slate-900 text-white opacity-40 cursor-not-allowed"
            : isProcessing
            ? "bg-black/70 text-white cursor-wait"
            : "bg-black text-white hover:bg-black/85"
        }`}
      >
        {isProcessing ? "Processing..." : "Buy Now"}
      </button>
    </div>
  );
}
