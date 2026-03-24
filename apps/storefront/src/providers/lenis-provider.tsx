"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * On route change, scroll to top immediately so Lenis and the browser
 * agree on position. Prevents scroll-position glitches on back/forward nav.
 */
function ScrollReset() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    // Reset Lenis scroll position on every route change
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname, lenis]);

  return null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  // Disable browser's built-in scroll restoration — we manage it ourselves
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

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
      <ScrollReset />
      {children}
    </ReactLenis>
  );
}
