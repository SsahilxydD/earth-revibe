'use client';

import { create } from 'zustand';
import { api, startProactiveRefresh, stopProactiveRefresh } from '@/lib/api-client';
import { identifyUser, resetUser } from '@/lib/analytics';

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    if (user) {
      identifyUser(user.id, { email: user.email, name: `${user.firstName} ${user.lastName}` });
      startProactiveRefresh();
    } else {
      stopProactiveRefresh();
    }
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    });
  },

  logout: async () => {
    stopProactiveRefresh();
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout even if API call fails
    }
    resetUser();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await api.get<AuthUser>('/auth/me');
      identifyUser(user.id, { email: user.email, name: `${user.firstName} ${user.lastName}` });
      startProactiveRefresh();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      stopProactiveRefresh();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
