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

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    referralCode: z.string().optional(),
    terms: z.literal(true, { message: "You must accept the terms" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
      terms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError("");
    try {
      const { terms, referralCode, ...payload } = data;
      const body = referralCode
        ? { ...payload, referralCode }
        : payload;
      const result = await api.post<{ user: { id: string; email: string; firstName: string; lastName: string; role: string } }>("/auth/register", body);
      setUser(result.user);
      router.push("/");
    } catch (err: any) {
      if (err?.details?.length) {
        setServerError(err.details.map((d: any) => d.message).join(". "));
      } else {
        setServerError(err?.message || "Registration failed");
      }
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-center text-xl font-bold uppercase tracking-wider">
        Create Account
      </h1>

      {serverError && (
        <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName", { required: "First name is required" })}
          />
          <Input
            label="Last Name"
            placeholder="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName", { required: "Last name is required" })}
          />
        </div>

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

        <Input
          label="Phone"
          type="tel"
          placeholder="9876543210"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone", {
            required: "Phone is required",
            pattern: {
              value: /^[6-9]\d{9}$/,
              message: "Enter a valid 10-digit Indian phone number",
            },
          })}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Min 8 characters" },
              validate: {
                uppercase: (v) =>
                  /[A-Z]/.test(v) || "Must contain an uppercase letter",
                number: (v) =>
                  /[0-9]/.test(v) || "Must contain a number",
              },
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

        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value, formValues) =>
                value === formValues.password || "Passwords do not match",
            })}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute right-3 top-[34px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <Input
          label="Referral Code (Optional)"
          placeholder="Enter referral code"
          error={errors.referralCode?.message}
          {...register("referralCode")}
        />

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
            {...register("terms", {
              required: "You must accept the terms",
            })}
          />
          <span className="text-[var(--color-muted)]">
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-[var(--color-primary)] underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-[var(--color-primary)] underline"
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-[var(--color-sale)]">
            {errors.terms.message}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
