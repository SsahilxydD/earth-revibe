"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps page content with a subtle fade transition.
 * Masks the re-render flash on iOS by fading between pages
 * instead of an instant swap.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Only animate when the top-level path segment changes
  // (not for search params changes which shouldn't trigger transitions)
  const segments = pathname.split("/").filter(Boolean);
  const transitionKey = segments.slice(0, 2).join("/") || "/";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0.92 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.92 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
