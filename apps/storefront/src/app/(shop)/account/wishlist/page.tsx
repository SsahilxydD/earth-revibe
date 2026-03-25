"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/providers";

interface RawWishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    images: { url: string; thumbnailUrl?: string }[];
  };
}

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
}

function normalizeWishlistItems(raw: RawWishlistItem[]): WishlistItem[] {
  return raw.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    slug: item.product.slug,
    image: item.product.images?.[0]?.url || "",
    price: item.product.price,
    compareAtPrice: item.product.compareAtPrice,
    inStock: true, // If it's in the DB, the product exists
  }));
}

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

  const { data: rawItems, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get<RawWishlistItem[]>("/wishlist"),
  });

  const items = rawItems ? normalizeWishlistItems(rawItems) : undefined;

  const removeMutation = useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      addToast("Removed from wishlist", "success");
    },
    onError: (err: any) => {
      addToast(err?.message || "Failed to remove item", "error");
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)]">
          <Heart size={28} className="text-[var(--color-muted)]" />
        </div>
        <h2 className="mb-2 text-lg font-bold">Your Wishlist Is Empty</h2>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Save items you love and come back to them later.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
        >
          Browse Collections
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider">
        Wishlist
      </h2>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {items.length} {items.length === 1 ? "item" : "items"} saved
      </p>

      <hr style={{ marginTop: 28, marginBottom: 28, border: "none", borderTop: "1px solid #e5e5e5" }} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-xl border border-[var(--color-border)] overflow-hidden"
          >
            <Link href={`/products/${item.slug}`}>
              <div className="aspect-[2/3] bg-[var(--color-surface)] relative overflow-hidden">
                {item.image ? (
                  <Image
                    src={getImageUrl(item.image, 400)}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag
                      size={32}
                      className="text-[var(--color-muted)]"
                    />
                  </div>
                )}
                {!item.inStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-[var(--badge-radius)] bg-white px-3 py-1 text-xs font-bold uppercase">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-3">
              <Link href={`/products/${item.slug}`}>
                <h3 className="text-xs font-semibold leading-tight line-clamp-2">
                  {item.name}
                </h3>
              </Link>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm font-bold">
                  {formatPrice(item.price)}
                </span>
                {item.compareAtPrice && item.compareAtPrice > item.price && (
                  <span className="text-xs text-[var(--color-muted)] line-through">
                    {formatPrice(item.compareAtPrice)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => removeMutation.mutate(item.productId)}
                  disabled={removeMutation.isPending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--button-radius)] border border-[var(--color-border)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-sale)] hover:text-[var(--color-sale)]"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={14} />
                </button>
                {item.inStock && (
                  <button
                    onClick={() => {
                      addItem({
                        id: `${item.productId}-default`,
                        productId: item.productId,
                        name: item.name,
                        slug: item.slug,
                        image: item.image,
                        price: item.price,
                        compareAtPrice: item.compareAtPrice || undefined,
                        size: "M",
                        color: "Default",
                        maxQuantity: 10,
                      });
                      addToast("Added to cart", "success");
                    }}
                    className="flex h-8 flex-1 items-center justify-center gap-1 rounded-[var(--button-radius)] bg-[var(--color-primary)] text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
                  >
                    <ShoppingBag size={12} />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
