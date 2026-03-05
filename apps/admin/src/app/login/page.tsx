"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@earth-revibe/shared";
import { Leaf } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await api.post("/auth/login", data);

      // Check admin role
      if (result.user.role !== "ADMIN" && result.user.role !== "SUPER_ADMIN") {
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      login(result.user, result.accessToken, result.refreshToken);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-deep-earth rounded-xl flex items-center justify-center mb-3">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-deep-earth">Earth Revibe</h1>
          <p className="text-sm text-medium-gray mt-1">Admin Dashboard</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-xl border border-light-gray p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-1">Sign in</h2>
          <p className="text-sm text-medium-gray mb-6">Enter your admin credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@earthrevibe.com"
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

            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
