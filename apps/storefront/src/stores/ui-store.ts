"use client";

import { create } from "zustand";

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
  announcementDismissed: false,

  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () =>
    set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  dismissAnnouncement: () => set({ announcementDismissed: true }),
  resetAnnouncement: () => set({ announcementDismissed: false }),
}));
