'use client';

import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/providers';
import { useRouter } from 'next/navigation';

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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { addToast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/auth/me'),
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => api.put('/auth/profile', data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (result) {
        setUser({
          id: result.id || profile?.id || '',
          email: result.email || profile?.email || '',
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role || 'customer',
        });
      }
      addToast('Profile updated successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to update profile', 'error');
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
          phone: profile.phone || '',
        }
      : undefined,
  });

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`;
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const displayPhone = profile?.phone ? `+91 ${profile.phone}` : '';

  return (
    <div className="font-[family-name:var(--font-inter)] px-[28px] py-[32px] bg-white">
      {/* Avatar section: circle + name/phone */}
      <div className="flex items-center gap-[16px]">
        <div className="w-[56px] h-[56px] rounded-full bg-[#F5F5F5] flex items-center justify-center shrink-0">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt="Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-[18px] font-light text-black tracking-[1px]">{initials}</span>
          )}
        </div>
        <div>
          <p className="text-[16px] font-normal text-black leading-tight">{fullName}</p>
          {displayPhone && (
            <p className="text-[12px] font-light text-[#999] mt-[2px]">{displayPhone}</p>
          )}
        </div>
      </div>

      {/* Section label */}
      <p className="mt-[36px] text-[10px] font-normal text-[#999] tracking-[1.5px] uppercase">
        PERSONAL INFORMATION
      </p>

      {/* Profile form */}
      <form
        onSubmit={handleProfileSubmit((data) => profileMutation.mutate(data))}
        className="mt-[24px]"
      >
        {/* First Name */}
        <div className="mb-[28px]">
          <label className="block text-[10px] font-normal text-[#999] tracking-[1.5px] uppercase">
            FIRST NAME
          </label>
          <input
            type="text"
            className="mt-[10px] block w-full text-[14px] font-light text-black bg-transparent outline-none border-none p-0"
            {...profileRegister('firstName', {
              required: 'First name is required',
            })}
          />
          <div className="mt-[10px] h-px bg-[#E5E5E5]" />
          {profileErrors.firstName?.message && (
            <p className="mt-[6px] text-[11px] text-red-500">{profileErrors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="mb-[28px]">
          <label className="block text-[10px] font-normal text-[#999] tracking-[1.5px] uppercase">
            LAST NAME
          </label>
          <input
            type="text"
            className="mt-[10px] block w-full text-[14px] font-light text-black bg-transparent outline-none border-none p-0"
            {...profileRegister('lastName', {
              required: 'Last name is required',
            })}
          />
          <div className="mt-[10px] h-px bg-[#E5E5E5]" />
          {profileErrors.lastName?.message && (
            <p className="mt-[6px] text-[11px] text-red-500">{profileErrors.lastName.message}</p>
          )}
        </div>

        {/* Email (disabled) */}
        <div className="mb-[28px]">
          <label className="block text-[10px] font-normal text-[#999] tracking-[1.5px] uppercase">
            EMAIL
          </label>
          <input
            type="email"
            value={profile?.email || ''}
            disabled
            className="mt-[10px] block w-full text-[14px] font-light text-[#CCC] bg-transparent outline-none border-none p-0 cursor-not-allowed"
          />
          <div className="mt-[10px] h-px bg-[#F0F0F0]" />
        </div>

        {/* Phone */}
        <div className="mb-[28px]">
          <label className="block text-[10px] font-normal text-[#999] tracking-[1.5px] uppercase">
            PHONE
          </label>
          <div className="mt-[10px] flex items-center gap-0">
            <span className="text-[14px] font-light text-black shrink-0">+91</span>
            <div className="w-px h-[16px] bg-[#E5E5E5] mx-[10px] shrink-0" />
            <input
              type="tel"
              className="block w-full text-[14px] font-light text-black bg-transparent outline-none border-none p-0"
              {...profileRegister('phone', {
                pattern: {
                  value: /^[6-9]\d{9}$/,
                  message: 'Enter a valid 10-digit Indian phone number',
                },
              })}
            />
          </div>
          <div className="mt-[10px] h-px bg-[#E5E5E5]" />
          {profileErrors.phone?.message && (
            <p className="mt-[6px] text-[11px] text-red-500">{profileErrors.phone.message}</p>
          )}
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={profileMutation.isPending}
          className="mt-[36px] w-full h-[50px] bg-black text-white text-[12px] font-normal tracking-[2px] uppercase flex items-center justify-center disabled:opacity-50 transition-opacity"
        >
          {profileMutation.isPending ? <Spinner className="h-4 w-4" /> : 'SAVE CHANGES'}
        </button>
      </form>

      {/* Log out link */}
      <button
        onClick={handleLogout}
        className="mt-[36px] w-full text-center text-[12px] font-light text-[#999] bg-transparent border-none cursor-pointer hover:text-[#666] transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
