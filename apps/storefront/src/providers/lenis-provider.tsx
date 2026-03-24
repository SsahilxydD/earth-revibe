"use client";

import { useEffect } from "react";
import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function LenisProvider({ children }: { children: ReactNode }) {
  // Let the BROWSER handle scroll restoration — it's the only thing
  // that reliably works across back/forward navigation because it
  // hooks into the bfcache and knows the exact scroll position.
  // We do NOT set scrollRestoration to "manual".
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
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
      {children}
    </ReactLenis>
  );
}
