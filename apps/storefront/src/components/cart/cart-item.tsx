"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@earth-revibe/shared";

interface CartItemProps {
  item: {
    variantId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    size: string;
    color: string;
    price: number;
    quantity: number;
  };
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-3 py-4 border-b border-light-gray last:border-0">
      <div className="w-20 h-20 bg-off-white rounded-lg overflow-hidden flex-shrink-0">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-medium-gray text-xs">
            No image
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <Link
            href={`/products/${item.productSlug}`}
            className="text-sm font-medium text-charcoal hover:text-forest-green truncate"
          >
            {item.productName}
          </Link>
          <button
            onClick={() => removeItem(item.variantId)}
            className="p-0.5 text-medium-gray hover:text-error transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-medium-gray mt-0.5">{item.size} / {item.color}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-light-gray rounded">
            <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="p-1 text-charcoal hover:text-forest-green">
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="p-1 text-charcoal hover:text-forest-green">
              <Plus size={14} />
            </button>
          </div>
          <p className="text-sm font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</p>
        </div>
      </div>
    </div>
  );
}
