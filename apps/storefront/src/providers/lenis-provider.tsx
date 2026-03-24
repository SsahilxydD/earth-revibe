"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SCROLL_MAP_KEY = "er-route-scroll";

function getScrollMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_MAP_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveScrollForRoute(path: string, y: number) {
  try {
    const map = getScrollMap();
    map[path] = y;
    sessionStorage.setItem(SCROLL_MAP_KEY, JSON.stringify(map));
  } catch { /* full or unavailable */ }
}

/**
 * Saves scroll position when leaving a route and restores it when
 * returning. Never jumps — always retains where the user was.
 */
function ScrollRetain() {
  const lenis = useLenis();
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      // Save position of the page we're leaving
      saveScrollForRoute(prevPath.current, window.scrollY);
      prevPath.current = pathname;
    }

    // Restore position for the page we're arriving at
    const saved = getScrollMap()[pathname];
    if (saved != null && saved > 0) {
      // Use requestAnimationFrame to let the DOM render first
      requestAnimationFrame(() => {
        if (lenis) {
          lenis.scrollTo(saved, { immediate: true });
        } else {
          window.scrollTo(0, saved);
        }
      });
    }
  }, [pathname, lenis]);

  // Save on unmount / tab close
  useEffect(() => {
    const save = () => saveScrollForRoute(pathname, window.scrollY);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("beforeunload", save);
    };
  }, [pathname]);

  return null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  // Let us manage scroll restoration, not the browser
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
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
      <ScrollRetain />
      {children}
    </ReactLenis>
  );
}
