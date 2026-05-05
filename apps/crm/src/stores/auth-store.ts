import { create } from 'zustand';
import { api, startProactiveRefresh, stopProactiveRefresh } from '@/lib/api-client';

interface CrmUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: CrmUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: CrmUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;

  login: (user: CrmUser) => void;
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
      const user = await api.get<CrmUser>('/auth/me');
      startProactiveRefresh();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      stopProactiveRefresh();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
