'use client';

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Body overflow lock — reference counted so overlapping modals       */
/*  (cart + search + mobile menu) don't clobber each other             */
/* ------------------------------------------------------------------ */
let overflowLockCount = 0;

export function lockBodyScroll() {
  overflowLockCount++;
  if (overflowLockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll() {
  overflowLockCount = Math.max(0, overflowLockCount - 1);
  if (overflowLockCount === 0) {
    document.body.style.overflow = '';
  }
}

/* ------------------------------------------------------------------ */
/*  Mobile bottom-dock visibility — reference counted so overlapping   */
/*  modals (quick-add, etc.) that sit on top of the dock can hide it   */
/*  for the duration of their open state without clobbering each other */
/* ------------------------------------------------------------------ */
let dockHiddenCount = 0;
const dockListeners = new Set<(hidden: boolean) => void>();

export function hideDock() {
  dockHiddenCount++;
  if (dockHiddenCount === 1) dockListeners.forEach((fn) => fn(true));
}

export function showDock() {
  dockHiddenCount = Math.max(0, dockHiddenCount - 1);
  if (dockHiddenCount === 0) dockListeners.forEach((fn) => fn(false));
}

export function subscribeDockHidden(fn: (hidden: boolean) => void): () => void {
  dockListeners.add(fn);
  fn(dockHiddenCount > 0);
  return () => {
    dockListeners.delete(fn);
  };
}

/* ------------------------------------------------------------------ */
/*  Announcement dismissed persistence                                 */
/* ------------------------------------------------------------------ */
const ANNOUNCEMENT_KEY = 'er-announcement-dismissed';

function getAnnouncementDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ANNOUNCEMENT_KEY) === '1';
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */
interface UiState {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  announcementDismissed: boolean;

  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  dismissAnnouncement: () => void;
  resetAnnouncement: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  announcementDismissed: getAnnouncementDismissed(),

  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  dismissAnnouncement: () => {
    try {
      sessionStorage.setItem(ANNOUNCEMENT_KEY, '1');
    } catch {}
    set({ announcementDismissed: true });
  },
  resetAnnouncement: () => {
    try {
      sessionStorage.removeItem(ANNOUNCEMENT_KEY);
    } catch {}
    set({ announcementDismissed: false });
  },
}));
