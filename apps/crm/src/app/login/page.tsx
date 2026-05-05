'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@earth-revibe/shared';
import { Sparkles } from 'lucide-react';
import { Button, Input } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { api } from '@/lib/api-client';

export default function CrmLoginPage() {
  const router = useRouter();
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
      await api.post('/auth/login', data);
      toast.success('Welcome back!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-deep-earth rounded-xl flex items-center justify-center mb-3">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-deep-earth">Earth Revibe</h1>
          <p className="text-sm text-medium-gray mt-1">CRM</p>
        </div>

        <div className="bg-white rounded-xl border border-light-gray p-6">
          <h2 className="text-lg font-semibold text-charcoal mb-1">Sign in</h2>
          <p className="text-sm text-medium-gray mb-6">
            Use the same credentials as your admin account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="admin@earthrevibe.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
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
