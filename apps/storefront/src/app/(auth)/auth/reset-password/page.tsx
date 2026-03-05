"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@earth-revibe/shared";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", data);
      toast.success("Password reset successfully!");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.message || "Reset failed. Token may be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-heading font-semibold text-deep-earth text-center mb-2">New Password</h1>
      <p className="text-sm text-medium-gray text-center mb-6">Enter your new password</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("token")} />
        <Input label="New Password" type="password" placeholder="Min 8 chars" error={errors.password?.message} {...register("password")} />
        <Input label="Confirm Password" type="password" placeholder="Re-enter password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <Button type="submit" isLoading={isLoading} className="w-full">Reset Password</Button>
      </form>

      <p className="text-sm text-center text-medium-gray mt-6">
        <Link href="/auth/login" className="text-forest-green font-medium hover:underline">Back to Login</Link>
      </p>
    </>
  );
}
