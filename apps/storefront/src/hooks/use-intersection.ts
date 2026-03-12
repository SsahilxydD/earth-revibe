'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseIntersectionOptions extends IntersectionObserverInit {
  /** When true the observer disconnects after the first intersection. */
  once?: boolean;
  /** Convenience callback fired when the element becomes visible. */
  onIntersect?: () => void;
}

interface UseIntersectionReturn<T extends HTMLElement> {
  /** Attach this ref to the sentinel element you want to observe. */
  ref: RefObject<T | null>;
  /** Whether the observed element is currently intersecting. */
  isIntersecting: boolean;
}

/**
 * Observes an element via `IntersectionObserver` and exposes whether it is
 * currently visible in the viewport. Ideal for infinite-scroll triggers,
 * lazy-loading, and scroll-based animations.
 */
export function useIntersection<T extends HTMLElement = HTMLDivElement>(
  options: UseIntersectionOptions = {}
): UseIntersectionReturn<T> {
  const { root, rootMargin = '0px', threshold = 0, once = false, onIntersect } = options;
  const ref = useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const onIntersectRef = useRef(onIntersect);

  // Keep callback ref up to date without retriggering the effect
  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsIntersecting(visible);

        if (visible) {
          onIntersectRef.current?.();
          if (once) observer.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [root, rootMargin, threshold, once]);

  return { ref, isIntersecting };
}
