"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui";
import { useCartStore } from "@/stores/cart-store";
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
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = () => {
    if (!variant) return;
    addItem({
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.images?.[0]?.url,
      size: variant.size,
      color: variant.color,
      price: Number(variant.price || product.price),
      quantity,
    });
    toast.success(`${product.name} added to cart`);
    setQuantity(1);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Quantity */}
      <div className="flex items-center border border-light-gray rounded-lg">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="p-2.5 text-charcoal hover:text-forest-green transition-colors"
        >
          <Minus size={16} />
        </button>
        <span className="w-10 text-center text-sm font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(variant?.stock || 10, quantity + 1))}
          className="p-2.5 text-charcoal hover:text-forest-green transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add to cart button */}
      <Button
        onClick={handleAdd}
        disabled={disabled || !variant || variant.stock === 0}
        size="lg"
        className="flex-1"
      >
        <ShoppingBag size={20} />
        {!variant ? "Select options" : variant.stock === 0 ? "Out of Stock" : "Add to Cart"}
      </Button>
    </div>
  );
}
