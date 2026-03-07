import { create } from "zustand";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  referralCode?: string | null;
  loyaltyPoints?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;

  login: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  login: (user) => {
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors — cookies are cleared server-side
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
