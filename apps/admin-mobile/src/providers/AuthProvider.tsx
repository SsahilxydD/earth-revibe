import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { tokenStore, userStore } from '@/lib/secure-store';
import { api } from '@/lib/api-client';
import {
  registerForPushNotificationsAsync,
  registerDeviceWithApi,
  unregisterDeviceWithApi,
} from '@/lib/push';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOMER' | 'SUPPORT_STAFF';
  avatar?: string | null;
}

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);

  // Hydrate on cold start: try cached user → silently verify with /auth/me.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const cached = await userStore.get<AdminUser>();
      if (cached && !cancelled) setUser(cached);

      const { accessToken } = await tokenStore.getTokens();
      if (!accessToken) {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      try {
        const fresh = await api.get<AdminUser>('/auth/me');
        if (!cancelled) {
          setUser(fresh);
          await userStore.set(fresh);
        }
      } catch {
        // /auth/me failed (expired refresh, etc.). api-client already tried
        // to refresh — if it got here, refresh failed too. Drop the session.
        await tokenStore.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Best-effort push registration after a session is active. Failures are
  // non-fatal — the user still gets the rest of the app.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) return;
      pushTokenRef.current = token;
      try {
        await registerDeviceWithApi(token);
      } catch {
        /* ignore — device row will be missing, no push, but app works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Deep-link on notification tap. The API encodes order number in the
  // notification's data payload (see admin-alert.service.ts pushToAllAdmins).
  // Also handle the cold-start case via getLastNotificationResponseAsync.
  useEffect(() => {
    if (!user) return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { type?: string; orderNumber?: string }
        | undefined;
      if (data?.type === 'NEW_ORDER' && data.orderNumber) {
        router.push(`/orders/${data.orderNumber}`);
      }
    };

    // App was launched (cold start) by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    // App was already running (foreground or background) when notification arrived.
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      async signIn(email, password) {
        const data = await api.post<{
          user: AdminUser;
          accessToken: string;
          refreshToken: string;
        }>('/auth/login', { email, password }, { skipAuth: true });
        await tokenStore.setTokens(data.accessToken, data.refreshToken);
        await userStore.set(data.user);
        setUser(data.user);
      },
      async signOut() {
        const tokenToDrop = pushTokenRef.current;
        if (tokenToDrop) {
          await unregisterDeviceWithApi(tokenToDrop);
        }
        try {
          await api.post('/auth/logout');
        } catch {
          /* tokens may be expired; we still clear locally below */
        }
        await tokenStore.clear();
        setUser(null);
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
