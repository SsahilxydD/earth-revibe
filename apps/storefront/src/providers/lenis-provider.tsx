"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function LenisProvider({ children }: { children: ReactNode }) {
  // Start as false — same on server and client (no hydration mismatch)
  // Only enable Lenis after mount check, but children always render the same
  const [enableLenis, setEnableLenis] = useState(false);

  useEffect(() => {
    // Only enable on desktop with fine pointer (mouse/trackpad)
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    setEnableLenis(mq.matches);
    const handler = (e: MediaQueryListEvent) => setEnableLenis(e.matches);
    mq.addEventListener("change", handler);

    // Let browser handle scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }

    return () => mq.removeEventListener("change", handler);
  }, []);

  // Always render the same tree structure — Lenis wraps or doesn't
  // but children never change position in the tree (no unmount/remount)
  if (!enableLenis) {
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
