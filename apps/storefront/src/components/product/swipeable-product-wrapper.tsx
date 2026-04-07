'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { SwipePanelContainer } from './swipe-panel-container';
import type { Product } from '@/types';

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const didMount = useRef(false);

  // Seed the query cache so useProduct() and prefetch have data immediately
  useEffect(() => {
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Scroll to top on first mount (handles back-navigation with restored scroll)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      window.scrollTo(0, 0);
    }
  }, []);

  return <SwipePanelContainer initialProduct={initialProduct} initialSlug={initialSlug} />;
}
