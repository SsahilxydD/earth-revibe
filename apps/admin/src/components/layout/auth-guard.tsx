"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
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
      } catch {
        clearUser();
        router.replace("/login");
      }
    }

    checkAuth();
  }, [router, setUser, clearUser, setLoading]);

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
    return null;
  }

  return <>{children}</>;
}
