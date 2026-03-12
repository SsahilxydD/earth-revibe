"use client";

import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/providers";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string | null;
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const { addToast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/auth/me"),
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.put("/auth/profile", data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (result) {
        setUser({
          id: result.id || profile?.id || "",
          email: result.email || profile?.email || "",
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role || "customer",
        });
      }
      addToast("Profile updated successfully", "success");
    },
    onError: (err: any) => {
      addToast(err?.message || "Failed to update profile", "error");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.put("/auth/password", data),
    onSuccess: () => {
      passwordReset();
      addToast("Password changed successfully", "success");
    },
    onError: (err: any) => {
      addToast(err?.message || "Failed to change password", "error");
    },
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    values: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || "",
        }
      : undefined,
  });

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: passwordReset,
    watch: passwordWatch,
  } = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[var(--color-surface)]">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--color-muted)]">
              {profile?.firstName?.[0]}
              {profile?.lastName?.[0]}
            </div>
          )}
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100"
            aria-label="Change avatar"
          >
            <Camera size={20} />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-bold">
            {profile?.firstName} {profile?.lastName}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">{profile?.email}</p>
        </div>
      </div>

      {/* Profile Form */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">
          Personal Information
        </h3>
        <form
          onSubmit={handleProfileSubmit((data) =>
            profileMutation.mutate(data)
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              error={profileErrors.firstName?.message}
              {...profileRegister("firstName", {
                required: "First name is required",
              })}
            />
            <Input
              label="Last Name"
              error={profileErrors.lastName?.message}
              {...profileRegister("lastName", {
                required: "Last name is required",
              })}
            />
          </div>
          <Input label="Email" value={profile?.email || ""} disabled />
          <Input
            label="Phone"
            type="tel"
            error={profileErrors.phone?.message}
            {...profileRegister("phone", {
              pattern: {
                value: /^[6-9]\d{9}$/,
                message: "Enter a valid 10-digit Indian phone number",
              },
            })}
          />
          <Button
            type="submit"
            loading={profileMutation.isPending}
          >
            Save Changes
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="border-t border-[var(--color-border)] pt-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">
          Change Password
        </h3>
        <form
          onSubmit={handlePasswordSubmit((data) =>
            passwordMutation.mutate(data)
          )}
          className="max-w-md space-y-4"
        >
          <Input
            label="Current Password"
            type="password"
            autoComplete="current-password"
            error={passwordErrors.currentPassword?.message}
            {...passwordRegister("currentPassword", {
              required: "Current password is required",
            })}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.newPassword?.message}
            {...passwordRegister("newPassword", {
              required: "New password is required",
              minLength: { value: 8, message: "Min 8 characters" },
              validate: {
                uppercase: (v) =>
                  /[A-Z]/.test(v) || "Must contain an uppercase letter",
                number: (v) =>
                  /[0-9]/.test(v) || "Must contain a number",
              },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            error={passwordErrors.confirmNewPassword?.message}
            {...passwordRegister("confirmNewPassword", {
              required: "Please confirm your new password",
              validate: (value) =>
                value === passwordWatch("newPassword") ||
                "Passwords do not match",
            })}
          />
          <Button
            type="submit"
            loading={passwordMutation.isPending}
          >
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
