'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { ProductDetail } from './product-detail';
import type { Product } from '@/types';

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [currentProduct, setCurrentProduct] = useState<Product>(initialProduct);
  const didMount = useRef(false);

  // Sync when navigating to a different product via client-side routing
  useEffect(() => {
    if (initialSlug !== currentSlug) {
      setCurrentSlug(initialSlug);
      setCurrentProduct(initialProduct);
      window.scrollTo(0, 0);
    }
    // Seed the query cache so useProduct() has data immediately
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Scroll to top on first mount (handles back-navigation with restored scroll)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      window.scrollTo(0, 0);
    }
  }, []);

  return <ProductDetail key={currentSlug} product={currentProduct} />;
}
