'use client';

import { useEffect, useRef, useState, createContext, useContext, ReactNode } from 'react';
import type Lenis from 'lenis';

// Lenis context for accessing lenis instance
interface LenisContextType {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextType>({ lenis: null });

export const useLenis = () => useContext(LenisContext);

interface SmoothScrollProps {
  children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);

  useEffect(() => {
    let destroyed = false;
    let rafId: number | null = null;

    // Disable smooth scrolling for:
    // - Reduced motion users (accessibility)
    // - Small screens (mobile performance + native scrolling feels best)
    // - Data saver / very slow networks (PageSpeed / real users)
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const isSmallScreen = window.matchMedia?.('(max-width: 1023px)')?.matches ?? false;
    const connection = (navigator as any).connection as
      | { saveData?: boolean; effectiveType?: string }
      | undefined;
    const saveData = connection?.saveData === true;
    const effectiveType = connection?.effectiveType;
    const isVerySlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';

    if (prefersReducedMotion || isSmallScreen || saveData || isVerySlowConnection) {
      return;
    }

    const start = async () => {
      try {
        const mod = await import('lenis');
        if (destroyed) return;

        const LenisCtor = mod.default as unknown as new (opts: any) => Lenis;
        const lenis = new LenisCtor({
          duration: 1.4, // Slightly slower for more elegance
          easing: (t: number) => 1 - Math.pow(1 - t, 4), // Quartic ease-out
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 0.8,
          touchMultiplier: 1.5,
          infinite: false,
          lerp: 0.08,
        });

        lenisRef.current = lenis;
        setLenisInstance(lenis);

        const raf = (time: number) => {
          // rAF gives time in ms (Lenis expects ms)
          lenis.raf(time);
          rafId = window.requestAnimationFrame(raf);
        };
        rafId = window.requestAnimationFrame(raf);
      } catch {
        // Best-effort only: if Lenis isn't available or fails, fall back to native scroll.
      }
    };

    // Defer initialization to avoid impacting LCP / TBT on first paint.
    const requestIdleCallbackFn = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => void)
      | undefined;

    if (typeof requestIdleCallbackFn === 'function') {
      requestIdleCallbackFn(() => {
        void start();
      }, { timeout: 1500 });
    } else {
      setTimeout(() => {
        void start();
      }, 1);
    }

    return () => {
      destroyed = true;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={{ lenis: lenisInstance }}>
      {children}
    </LenisContext.Provider>
  );
}
