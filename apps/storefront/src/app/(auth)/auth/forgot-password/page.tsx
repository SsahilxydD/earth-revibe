"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@earth-revibe/shared";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", data);
      setSent(true);
    } catch {
      // Still show success (don't reveal if email exists)
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-heading font-semibold text-deep-earth mb-2">Check Your Email</h1>
        <p className="text-sm text-medium-gray mb-6">If an account exists with that email, we&apos;ve sent a password reset link.</p>
        <Link href="/auth/login" className="text-sm text-forest-green font-medium hover:underline">Back to Login</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-heading font-semibold text-deep-earth text-center mb-2">Reset Password</h1>
      <p className="text-sm text-medium-gray text-center mb-6">Enter your email to receive a reset link</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Button type="submit" isLoading={isLoading} className="w-full">Send Reset Link</Button>
      </form>

      <p className="text-sm text-center text-medium-gray mt-6">
        <Link href="/auth/login" className="text-forest-green font-medium hover:underline">Back to Login</Link>
      </p>
    </>
  );
}
