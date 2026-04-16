'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { useProductNavStore } from '@/stores/product-nav-store';
import { SwipePanelContainer } from './swipe-panel-container';
import { api } from '@/lib/api-client';
import type { Product } from '@/types';

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const didMount = useRef(false);
  const slugsFetched = useRef(false);

  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const slugs = useProductNavStore((s) => s.slugs);
  const setAllSlugs = useProductNavStore((s) => s.setAllSlugs);
  const setNavContext = useProductNavStore((s) => s.setNavContext);

  // Seed the query cache so useProduct() and prefetch have data immediately
  useEffect(() => {
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // If no slug list is populated (direct product page load), fetch sibling products
  useEffect(() => {
    if (slugsFetched.current) return;
    if (allSlugs.length > 1 || slugs.length > 1) return;

    slugsFetched.current = true;

    const categorySlug = initialProduct.category?.slug;
    const endpoint = categorySlug
      ? `/products?category=${categorySlug}&limit=50`
      : '/products?limit=50';

    api
      .get<{ products: { slug: string }[] }>(endpoint)
      .then((result) => {
        const productSlugs = result.products.map((p) => p.slug);
        if (productSlugs.length > 1) {
          if (categorySlug) {
            setNavContext(productSlugs, initialProduct.category?.name || 'Products', '/products');
          } else {
            setAllSlugs(productSlugs);
          }
        }
      })
      .catch(() => {
        // Silent fail — swipe just won't be available
      });
  }, [allSlugs.length, slugs.length, initialProduct, setAllSlugs, setNavContext]);

  // Scroll to top on first mount (handles back-navigation with restored scroll)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      window.scrollTo(0, 0);
    }
  }, []);

  return <SwipePanelContainer initialProduct={initialProduct} initialSlug={initialSlug} />;
}
