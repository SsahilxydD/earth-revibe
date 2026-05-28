'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { api } from '@/lib/api-client';
import { PENDING_PROMO_KEY } from '@/app/(shop)/spinner/page';

interface ServerCartItem {
  variantId: string;
  quantity: number;
  variant: {
    id: string;
    size: string | null;
    color: string | null;
    stock: number;
    price: number | null;
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      images: { url: string }[];
    };
  };
}

interface ServerCart {
  items: ServerCartItem[];
}

/**
 * Runs checkAuth() once on app mount to restore session from httpOnly cookies.
 * After auth is restored, merges server-side cart with local cart so
 * abandoned cart detection can track items in the database.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    checkAuth().then(async () => {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // Resume a QR promo claim captured before login: the /spinner page stashed
      // the campaign code, sent the visitor to log in, and now that they're
      // authenticated we send them back to /spinner to finish claiming.
      try {
        const pendingPromo = localStorage.getItem(PENDING_PROMO_KEY);
        if (pendingPromo && window.location.pathname !== '/spinner') {
          router.replace(`/spinner?spin=true&c=${encodeURIComponent(pendingPromo)}`);
        }
      } catch {
        // localStorage unavailable — non-fatal, claim can be retried via the QR.
      }

      try {
        const serverCart = await api.get<ServerCart>('/cart');
        const localItems = useCartStore.getState().items;

        // Convert server cart to local format
        const serverItems = serverCart.items.map((item) => ({
          id: item.variant.id,
          productId: item.variant.product.id,
          name: item.variant.product.name,
          slug: item.variant.product.slug,
          image: item.variant.product.images[0]?.url || '',
          price: Number(item.variant.price ?? item.variant.product.price),
          size: item.variant.size || '',
          color: item.variant.color || '',
          quantity: item.quantity,
          maxQuantity: item.variant.stock,
        }));

        if (serverItems.length > 0 && localItems.length > 0) {
          // Merge: start with server cart, add any local-only items
          const serverIds = new Set(serverItems.map((i) => i.id));
          const localOnly = localItems.filter((i) => !serverIds.has(i.id));
          const merged = [...serverItems, ...localOnly];
          useCartStore.setState({ items: merged });

          // Sync merged cart back to server
          if (localOnly.length > 0) {
            await api.post('/cart/sync', {
              items: merged.map((i) => ({ variantId: i.id, quantity: i.quantity })),
            });
          }
        } else if (serverItems.length > 0) {
          // Server has items, local empty — restore from server
          useCartStore.setState({ items: serverItems });
        } else if (localItems.length > 0) {
          // Local has items, server empty — push local to server
          await api.post('/cart/sync', {
            items: localItems.map((i) => ({ variantId: i.id, quantity: i.quantity })),
          });
        }
      } catch {
        // Cart merge is best-effort — don't break the app
      }
    });
  }, [checkAuth]);

  return <>{children}</>;
}
