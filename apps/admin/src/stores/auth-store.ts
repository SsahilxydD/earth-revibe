import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { startProactiveRefresh, stopProactiveRefresh } from '@/lib/api-client';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AdminUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;

  login: (user: AdminUser) => void;
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
    // Tokens are in httpOnly cookies — no localStorage needed
    startProactiveRefresh();
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    stopProactiveRefresh();
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout even if API call fails
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await api.get<AdminUser>('/auth/me');
      startProactiveRefresh();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      stopProactiveRefresh();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
