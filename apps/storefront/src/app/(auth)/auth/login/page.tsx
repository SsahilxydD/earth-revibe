"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError("");
    try {
      const result = await api.post<{ user: { id: string; email: string; firstName: string; lastName: string; role: string } }>("/auth/login", data);
      setUser(result.user);
      router.push("/");
    } catch (err: any) {
      setServerError(err?.message || "Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setServerError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setServerError(error.message);
        setGoogleLoading(false);
      }
      // Browser will redirect to Google — no need to setGoogleLoading(false)
    } catch (err: any) {
      setServerError(err?.message || "Google login failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-center text-xl font-bold uppercase tracking-wider">
        Log In
      </h1>

      {serverError && (
        <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
          {serverError}
        </div>
      )}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white text-sm font-medium transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
      >
        {googleLoading ? (
          <span className="text-[var(--color-muted)]">Redirecting...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Invalid email address",
            },
          })}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password", {
              required: "Password is required",
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-[34px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Log In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
