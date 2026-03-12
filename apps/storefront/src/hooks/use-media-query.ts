'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * SSR-safe: defaults to `false` on the server so hydration stays stable.
 */
export function useMediaQuery(query: string): boolean {
  const getMatch = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);

    // Sync immediately in case the value changed between render and effect
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Shorthand: returns `true` when the viewport is 768px wide or narrower.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
