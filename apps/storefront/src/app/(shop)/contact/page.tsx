'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/contact', data);
      addToast("Message sent! We'll get back to you soon.", 'success');
      reset();
    } catch (error: any) {
      addToast(error?.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <div className="mx-auto max-w-md px-6">
          <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">
            Connect With Us
          </h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Have a question, feedback, or just want to say hi? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact info strip */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto grid max-w-3xl grid-cols-1 divide-y divide-[var(--color-border)] px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: Mail,
              label: 'Email',
              value: 'hello@earthrevibe.in',
              href: 'mailto:hello@earthrevibe.in',
            },
            {
              icon: Phone,
              label: 'Phone',
              value: '+91 98765 43210',
              href: 'tel:+919876543210',
            },
            {
              icon: Clock,
              label: 'Hours',
              value: 'Mon - Sat, 10AM - 7PM IST',
              href: null,
            },
          ].map((info) => (
            <div key={info.label} className="flex flex-col items-center py-6 text-center">
              <info.icon className="h-4 w-4 text-[var(--color-muted)]" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                {info.label}
              </p>
              {info.href ? (
                <a
                  href={info.href}
                  className="mt-1 text-sm font-medium transition-colors hover:text-[var(--color-muted)]"
                >
                  {info.value}
                </a>
              ) : (
                <p className="mt-1 text-sm">{info.value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Form — centered single column */}
      <section className="mx-auto max-w-lg px-6 py-12 md:py-16">
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.15em]">
          Send Us a Message
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Name
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                placeholder="Your name"
                className="w-full border-b border-[var(--color-border)] bg-transparent py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:border-[var(--color-primary)]"
              />
              {errors.name && (
                <p className="mt-1 text-[10px] text-[var(--color-sale)]">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email',
                  },
                })}
                placeholder="you@example.com"
                className="w-full border-b border-[var(--color-border)] bg-transparent py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:border-[var(--color-primary)]"
              />
              {errors.email && (
                <p className="mt-1 text-[10px] text-[var(--color-sale)]">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Subject
            </label>
            <input
              {...register('subject', { required: 'Subject is required' })}
              placeholder="What's this about?"
              className="w-full border-b border-[var(--color-border)] bg-transparent py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:border-[var(--color-primary)]"
            />
            {errors.subject && (
              <p className="mt-1 text-[10px] text-[var(--color-sale)]">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Message
            </label>
            <textarea
              {...register('message', {
                required: 'Message is required',
                minLength: { value: 10, message: 'At least 10 characters' },
              })}
              rows={5}
              placeholder="Tell us what's on your mind..."
              className="w-full border-b border-[var(--color-border)] bg-transparent py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--color-muted)]/50 focus:border-[var(--color-primary)]"
            />
            {errors.message && (
              <p className="mt-1 text-[10px] text-[var(--color-sale)]">{errors.message.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 bg-[var(--color-primary)] py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send Message
              </>
            )}
          </button>
        </form>
      </section>

      {/* Address */}
      <section className="border-t border-[var(--color-border)] py-10 text-center">
        <div className="mx-auto max-w-sm px-6">
          <MapPin className="mx-auto h-4 w-4 text-[var(--color-muted)]" />
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Earth Revibe HQ, Bandra West, Mumbai, Maharashtra 400050, India
          </p>
        </div>
      </section>
    </div>
  );
}
