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
 * returning. Retries restore until the page is tall enough to scroll to
 * the saved position (images/dynamic content may not be loaded yet).
 */
function ScrollRetain() {
  const lenis = useLenis();
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  // Save position continuously (debounced) so we always have the latest
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveScrollForRoute(pathname, window.scrollY), 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      // Final save when leaving this route
      saveScrollForRoute(pathname, window.scrollY);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  // Restore scroll position when arriving at a route
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
    }

    const saved = getScrollMap()[pathname];
    if (saved == null || saved <= 0) return;

    // Retry restore until page is tall enough or we give up (1s max)
    let attempts = 0;
    const maxAttempts = 20; // 20 * 50ms = 1s
    const tryRestore = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= saved || attempts >= maxAttempts) {
        const target = Math.min(saved, Math.max(0, maxScroll));
        if (lenis) {
          lenis.scrollTo(target, { immediate: true });
        } else {
          window.scrollTo(0, target);
        }
        return;
      }
      attempts++;
      setTimeout(tryRestore, 50);
    };

    // Small initial delay to let React render the new page
    requestAnimationFrame(() => requestAnimationFrame(tryRestore));
  }, [pathname, lenis]);

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
