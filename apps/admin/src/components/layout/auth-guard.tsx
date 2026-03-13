"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    }

    checkSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setIsAuthenticated(false);
          router.replace("/login");
        } else {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

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
