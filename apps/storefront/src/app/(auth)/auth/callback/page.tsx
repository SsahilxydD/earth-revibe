"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          router.replace("/auth/login");
          return;
        }

        // Exchange Supabase tokens for httpOnly API cookies.
        // This sets the access_token cookie so all subsequent API calls
        // are authenticated. The auth middleware auto-provisions the
        // Prisma user from the Supabase JWT.
        await api.post("/auth/oauth-session", {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });

        // Now fetch the user profile (auto-provisioned by auth middleware)
        try {
          const user = await api.get<{
            id: string; email: string; firstName: string; lastName: string; role: string;
          }>("/auth/me");
          setUser(user);
        } catch {
          // User will be provisioned on next authenticated request
        }

        router.replace("/");
      } catch {
        router.replace("/auth/login");
      }
    };

    handleCallback();
  }, [router, setUser]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner className="h-8 w-8" />
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        Signing you in...
      </p>
    </div>
  );
}
