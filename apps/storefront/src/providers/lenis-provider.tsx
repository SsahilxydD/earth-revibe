"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

/**
 * Detect touch-primary devices (phones, tablets).
 * Lenis only improves mouse-wheel/trackpad scrolling.
 * On touch devices it interferes with iOS Safari's bfcache,
 * scroll restoration, and causes page blinks on back navigation.
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    // Check if the primary input is a fine pointer (mouse/trackpad)
    // AND the screen is wide enough to be a desktop/laptop
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  // Always let the browser handle scroll restoration natively
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
  }, []);

  // Desktop: wrap with Lenis for smooth wheel/trackpad
  // Mobile/tablet: render children directly — 100% native scrolling
  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.04,
        duration: 1.6,
        smoothWheel: true,
        wheelMultiplier: 0.8,
        autoResize: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
