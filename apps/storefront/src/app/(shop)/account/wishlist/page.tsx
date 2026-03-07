"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.get("/wishlist"),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Removed from wishlist");
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">My Wishlist</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : !items?.length ? (
        <Card>
          <div className="text-center py-12">
            <Heart size={48} className="mx-auto text-light-gray mb-4" />
            <p className="text-medium-gray mb-4">Your wishlist is empty</p>
            <Link href="/products">
              <Button>
                <ShoppingBag size={16} />
                Browse Products
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <Card key={item.id} className="group relative">
              <button
                onClick={() => removeItem.mutate(item.product.id)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white shadow-sm hover:bg-error/10 transition-colors"
                title="Remove from wishlist"
              >
                <Trash2 size={14} className="text-error" />
              </button>
              <Link href={`/products/${item.product.slug}`}>
                <div className="aspect-[3/4] rounded-lg bg-off-white mb-3 overflow-hidden relative">
                  {item.product.images?.[0]?.url ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={32} className="text-light-gray" />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-charcoal group-hover:text-forest-green transition-colors truncate">
                  {item.product.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-charcoal">{formatPrice(item.product.price)}</span>
                  {item.product.compareAtPrice && Number(item.product.compareAtPrice) > Number(item.product.price) && (
                    <span className="text-sm text-medium-gray line-through">
                      {formatPrice(item.product.compareAtPrice)}
                    </span>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
