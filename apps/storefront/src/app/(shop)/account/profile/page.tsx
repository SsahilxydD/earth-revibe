"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Input, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { updateProfileSchema, changePasswordSchema } from "@earth-revibe/shared";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/auth/me"),
  });

  const profileForm = useForm({
    resolver: zodResolver(updateProfileSchema) as any,
    values: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || "",
        }
      : undefined,
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema) as any,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => api.put("/auth/profile", data),
    onSuccess: (updatedUser: any) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setUser({ ...user!, ...updatedUser });
      toast.success("Profile updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update profile"),
  });

  const changePassword = useMutation({
    mutationFn: (data: any) => api.put("/auth/password", data),
    onSuccess: () => {
      passwordForm.reset();
      setShowPassword(false);
      toast.success("Password changed successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to change password"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">My Profile</h1>

      {/* Profile form */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Personal Information</h3>
        <form
          onSubmit={profileForm.handleSubmit((data) => updateProfile.mutate(data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">First Name</label>
              <Input {...profileForm.register("firstName")} />
              {profileForm.formState.errors.firstName && (
                <p className="text-xs text-error mt-1">{profileForm.formState.errors.firstName.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Last Name</label>
              <Input {...profileForm.register("lastName")} />
              {profileForm.formState.errors.lastName && (
                <p className="text-xs text-error mt-1">{profileForm.formState.errors.lastName.message as string}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
            <Input value={profile?.email || ""} disabled className="bg-off-white" />
            <p className="text-xs text-medium-gray mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
            <Input {...profileForm.register("phone")} placeholder="10-digit Indian mobile number" />
            {profileForm.formState.errors.phone && (
              <p className="text-xs text-error mt-1">{profileForm.formState.errors.phone.message as string}</p>
            )}
          </div>
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-charcoal">Password</h3>
          {!showPassword && (
            <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)}>
              Change Password
            </Button>
          )}
        </div>

        {showPassword && (
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePassword.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Current Password</label>
              <Input type="password" {...passwordForm.register("currentPassword")} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.currentPassword.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">New Password</label>
              <Input type="password" {...passwordForm.register("newPassword")} />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.newPassword.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Confirm New Password</label>
              <Input type="password" {...passwordForm.register("confirmNewPassword")} />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className="text-xs text-error mt-1">{passwordForm.formState.errors.confirmNewPassword.message as string}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Changing..." : "Change Password"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowPassword(false); passwordForm.reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
