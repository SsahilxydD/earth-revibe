"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@earth-revibe/shared";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await api.post("/auth/login", data);
      login(result.user, result.accessToken, result.refreshToken);
      toast.success("Welcome back!");
      router.push(redirect);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-heading font-semibold text-deep-earth text-center mb-2">Welcome Back</h1>
      <p className="text-sm text-medium-gray text-center mb-6">Sign in to your account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-sm text-forest-green hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-sm text-center text-medium-gray mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="text-forest-green font-medium hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
