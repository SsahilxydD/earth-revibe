'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  // No token in the URL — invalid link
  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle size={24} className="text-[var(--color-sale)]" />
        </div>
        <h1 className="mb-2 text-xl font-bold uppercase tracking-wider">Invalid Link</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          This reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordForm) => {
    setServerError('');
    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setServerError(err?.message || 'Failed to reset password. Please try again.');
    }
  };

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h1 className="mb-2 text-xl font-bold uppercase tracking-wider">Password Set!</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Your password has been set successfully. You can now log in to track your orders.
        </p>
        <Link href="/auth/login">
          <Button fullWidth size="lg">
            Log In
          </Button>
        </Link>
      </div>
    );
  }

  // Reset password form
  return (
    <div>
      <h1 className="mb-2 text-center text-xl font-bold uppercase tracking-wider">
        Set Your Password
      </h1>
      <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
        Choose a password for your Earth Revibe account.
      </p>

      {serverError && (
        <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="Min 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: {
              uppercase: (v) => /[A-Z]/.test(v) || 'Must contain uppercase letter',
              lowercase: (v) => /[a-z]/.test(v) || 'Must contain lowercase letter',
              number: (v) => /[0-9]/.test(v) || 'Must contain a number',
            },
          })}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('password') || "Passwords don't match",
          })}
        />

        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Set Password
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-8">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
