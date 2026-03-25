"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Extract and verify the recovery token from the URL hash.
  // Supabase puts the token in the hash fragment: #access_token=...&type=recovery
  useEffect(() => {
    const verifyToken = async () => {
      const supabase = createClient();

      // PKCE flow (default): Supabase puts a `code` in the query string
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      // Implicit flow (legacy): tokens in the URL hash
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashToken = hashParams.get("access_token");

      try {
        if (code) {
          // PKCE: exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            setTokenError("This reset link has expired. Please request a new one.");
            setVerifying(false);
            return;
          }
          setAccessToken(data.session.access_token);
        } else if (hashToken) {
          // Implicit: use the hash tokens directly
          const { error } = await supabase.auth.setSession({
            access_token: hashToken,
            refresh_token: hashParams.get("refresh_token") || "",
          });
          if (error) {
            setTokenError("This reset link has expired. Please request a new one.");
            setVerifying(false);
            return;
          }
          setAccessToken(hashToken);
        } else {
          setTokenError("Invalid or missing reset link. Please request a new one.");
          setVerifying(false);
          return;
        }
      } catch {
        setTokenError("Failed to verify reset link. Please try again.");
      }
      setVerifying(false);
    };

    verifyToken();
  }, []);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!accessToken) return;
    setServerError("");

    try {
      await api.post("/auth/reset-password", {
        token: accessToken,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setServerError(err?.message || "Failed to reset password. Please try again.");
    }
  };

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Verifying your reset link...
        </p>
      </div>
    );
  }

  // Invalid/expired token
  if (tokenError) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle size={24} className="text-[var(--color-sale)]" />
        </div>
        <h1 className="mb-2 text-xl font-bold uppercase tracking-wider">
          Link Expired
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">{tokenError}</p>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h1 className="mb-2 text-xl font-bold uppercase tracking-wider">
          Password Set!
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Your password has been set successfully. You can now log in to track
          your orders.
        </p>
        <Link href="/auth/login">
          <Button fullWidth size="lg">
            Log In
          </Button>
        </Link>
      </div>
    );
  }

  // Reset password form
  return (
    <div>
      <h1 className="mb-2 text-center text-xl font-bold uppercase tracking-wider">
        Set Your Password
      </h1>
      <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
        Choose a password for your Earth Revibe account.
      </p>

      {serverError && (
        <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="Min 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "At least 8 characters" },
            validate: {
              uppercase: (v) => /[A-Z]/.test(v) || "Must contain uppercase letter",
              lowercase: (v) => /[a-z]/.test(v) || "Must contain lowercase letter",
              number: (v) => /[0-9]/.test(v) || "Must contain a number",
            },
          })}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Please confirm your password",
            validate: (v) => v === watch("password") || "Passwords don't match",
          })}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Set Password
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </p>
    </div>
  );
}
