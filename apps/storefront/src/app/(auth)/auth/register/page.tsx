"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@earth-revibe/shared";
import { Button, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const result = await api.post("/auth/register", data);
      login(result.user, result.accessToken, result.refreshToken);
      toast.success("Account created successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-heading font-semibold text-deep-earth text-center mb-2">Create Account</h1>
      <p className="text-sm text-medium-gray text-center mb-6">Join the sustainable fashion movement</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...register("firstName")} />
          <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...register("lastName")} />
        </div>
        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Input label="Phone (optional)" type="tel" placeholder="9876543210" error={errors.phone?.message} {...register("phone")} />
        <Input label="Password" type="password" placeholder="Min 8 chars, upper + lower + number" error={errors.password?.message} {...register("password")} />
        <Input label="Confirm Password" type="password" placeholder="Re-enter password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
        <Input label="Referral Code (optional)" placeholder="REVIBE-XXXXXX" error={errors.referralCode?.message} {...register("referralCode")} />

        <Button type="submit" isLoading={isLoading} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="text-sm text-center text-medium-gray mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-forest-green font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
