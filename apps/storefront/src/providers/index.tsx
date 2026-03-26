'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartDrawer } from '@/components/cart/cart-drawer';
import { AuthInitializer } from './auth-initializer';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  addToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

export const useToast = () => useContext(ToastContext);

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-slide-up rounded-[var(--button-radius)] px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error'
              ? 'bg-[var(--color-sale)]'
              : toast.type === 'success'
                ? 'bg-[var(--color-primary)]'
                : 'bg-[var(--color-muted)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 24 * 60 * 60 * 1000, // 24 hours — effectively never stale
            gcTime: 24 * 60 * 60 * 1000, // 24 hours — never GC during session
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={{ addToast }}>
        <AuthInitializer>{children}</AuthInitializer>
        <CartDrawer />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
