import { create } from "zustand";

interface UIState {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isFilterDrawerOpen: boolean;
  isHeaderTransparent: boolean;

  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleFilterDrawer: () => void;
  setFilterDrawerOpen: (open: boolean) => void;
  setHeaderTransparent: (transparent: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isFilterDrawerOpen: false,
  isHeaderTransparent: false,

  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleFilterDrawer: () => set((s) => ({ isFilterDrawerOpen: !s.isFilterDrawerOpen })),
  setFilterDrawerOpen: (open) => set({ isFilterDrawerOpen: open }),
  setHeaderTransparent: (transparent) => set({ isHeaderTransparent: transparent }),
}));
