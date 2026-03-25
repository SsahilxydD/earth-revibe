"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setServerError("");
    try {
      // Call resetPasswordForEmail from the BROWSER's Supabase client.
      // PKCE flow stores the code verifier in the browser, so when the user
      // clicks the email link, exchangeCodeForSession can find the matching verifier.
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "Something went wrong");
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)]">
          <Mail size={24} className="text-[var(--color-primary)]" />
        </div>
        <h1 className="mb-2 text-xl font-bold uppercase tracking-wider">
          Check Your Email
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          If an account exists with that email, we&apos;ve sent password reset
          instructions to your inbox.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-xl font-bold uppercase tracking-wider">
        Forgot Password
      </h1>
      <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {serverError && (
        <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
          {serverError}
        </div>
      )}

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

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Send Reset Link
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
