'use client';

import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/providers';

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
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`;
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const displayPhone = profile?.phone ? `+91 ${profile.phone.replace(/^\+91/, '')}` : '';

  return (
    <div style={{ padding: '32px 28px 28px 28px' }}>
      {/* Avatar row — h=56, gap=16, center aligned */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            backgroundColor: '#F5F5F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9999 }}
            />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 300, color: '#000', letterSpacing: 1 }}>
              {initials}
            </span>
          )}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 400, color: '#000', lineHeight: 1.2 }}>
            {fullName}
          </p>
          {displayPhone && (
            <p style={{ fontSize: 12, fontWeight: 300, color: '#999', marginTop: 4 }}>
              {displayPhone}
            </p>
          )}
        </div>
      </div>

      {/* Section label — 36px gap from avatar */}
      <p
        style={{ marginTop: 36, fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}
      >
        PERSONAL INFORMATION
      </p>

      {/* Fields — 36px gap from label, 28px between fields */}
      <form
        onSubmit={handleProfileSubmit((data) => profileMutation.mutate(data))}
        style={{ marginTop: 36 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* First Name */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              FIRST NAME
            </label>
            <div style={{ height: 10 }} />
            <input
              {...profileRegister('firstName', { required: 'First name is required' })}
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 300,
                color: '#000',
                border: 'none',
                outline: 'none',
                padding: 0,
                background: 'transparent',
              }}
            />
            <div style={{ height: 10 }} />
            <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
            {profileErrors.firstName && (
              <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                {profileErrors.firstName.message}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              LAST NAME
            </label>
            <div style={{ height: 10 }} />
            <input
              {...profileRegister('lastName', { required: 'Last name is required' })}
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 300,
                color: '#000',
                border: 'none',
                outline: 'none',
                padding: 0,
                background: 'transparent',
              }}
            />
            <div style={{ height: 10 }} />
            <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
            {profileErrors.lastName && (
              <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                {profileErrors.lastName.message}
              </p>
            )}
          </div>

          {/* Email — disabled, #CCC text, #F0F0F0 line */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              EMAIL
            </label>
            <div style={{ height: 10 }} />
            <input
              value={profile?.email || ''}
              disabled
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 300,
                color: '#CCC',
                border: 'none',
                outline: 'none',
                padding: 0,
                background: 'transparent',
              }}
            />
            <div style={{ height: 10 }} />
            <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
          </div>

          {/* Phone — +91 prefix with separator */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              PHONE
            </label>
            <div style={{ height: 10 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>+91</span>
              <div style={{ width: 1, height: 14, backgroundColor: '#CCC' }} />
              <input
                {...profileRegister('phone', {
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Enter a valid 10-digit Indian phone number',
                  },
                })}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#000',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  background: 'transparent',
                }}
              />
            </div>
            <div style={{ height: 10 }} />
            <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
            {profileErrors.phone && (
              <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                {profileErrors.phone.message}
              </p>
            )}
          </div>
        </div>

        {/* Save button — 36px gap, h=50, black, full-width */}
        <button
          type="submit"
          disabled={profileMutation.isPending}
          style={{
            marginTop: 36,
            width: '100%',
            height: 50,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: profileMutation.isPending ? 0.5 : 1,
          }}
        >
          {profileMutation.isPending ? <Spinner className="h-4 w-4" /> : 'SAVE CHANGES'}
        </button>
      </form>

      {/* Log out — 36px gap, centered */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: 36,
          width: '100%',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 300,
          color: '#999',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Log out
      </button>
    </div>
  );
}
