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

        // After Google OAuth, Supabase redirects here with ?code=... (PKCE)
        // We MUST exchange the code for a session first.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Code exchange failed:", error.message);
            router.replace("/auth/login");
            return;
          }
        }

        // Now we have a session — get tokens
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth/login");
          return;
        }

        // Exchange Supabase tokens for httpOnly API cookies
        await api.post("/auth/oauth-session", {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });

        // Fetch user profile — auth middleware auto-provisions Prisma user
        try {
          const user = await api.get<{
            id: string; email: string; firstName: string; lastName: string; role: string;
          }>("/auth/me");
          setUser(user);
        } catch {
          // Will be provisioned on next request
        }

        router.replace("/");
      } catch (err) {
        console.error("Auth callback error:", err);
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
