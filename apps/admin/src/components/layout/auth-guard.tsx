"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, clearUser } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate checks (React Strict Mode / dependency re-runs)
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function checkAuth() {
      const token = localStorage.getItem("adminAccessToken");
      if (!token) {
        clearUser();
        router.replace("/login");
        return;
      }

      try {
        const user = await api.get("/auth/me");
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
          api.clearTokens();
          clearUser();
          router.replace("/login");
          return;
        }
        setUser(user);
      } catch (err: any) {
        // Only redirect to login for auth-related errors (401, 403)
        // For network errors, keep the user on the page with loading state
        if (err?.status === 401 || err?.status === 403) {
          api.clearTokens();
          clearUser();
          router.replace("/login");
        } else {
          // Network error or server error — retry once after a short delay
          try {
            await new Promise((r) => setTimeout(r, 1000));
            const user = await api.get("/auth/me");
            if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
              api.clearTokens();
              clearUser();
              router.replace("/login");
              return;
            }
            setUser(user);
          } catch {
            api.clearTokens();
            clearUser();
            router.replace("/login");
          }
        }
      }
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-off-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-deep-earth" />
          <p className="text-sm text-medium-gray">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-off-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-deep-earth" />
          <p className="text-sm text-medium-gray">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
