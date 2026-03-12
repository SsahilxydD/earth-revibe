"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { useToast } from "@/providers";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@earthrevibe.com",
    href: "mailto:hello@earthrevibe.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Earth Revibe HQ, Bandra West, Mumbai, Maharashtra 400050, India",
    href: null,
  },
];

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
      await api.post("/contact", data);
      addToast("Message sent! We'll get back to you soon.", "success");
      reset();
    } catch (error: any) {
      addToast(
        error?.message || "Failed to send message. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Have a question or feedback? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px]">
        {/* Contact Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 rounded-[var(--button-radius)] border border-[var(--color-border)] p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Your Name"
              {...register("name", { required: "Name is required" })}
              error={errors.name?.message}
              placeholder="John Doe"
            />
            <Input
              label="Email Address"
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
              error={errors.email?.message}
              placeholder="john@example.com"
            />
          </div>

          <Input
            label="Subject"
            {...register("subject", { required: "Subject is required" })}
            error={errors.subject?.message}
            placeholder="What's this about?"
          />

          <div className="w-full">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Message
            </label>
            <textarea
              {...register("message", {
                required: "Message is required",
                minLength: {
                  value: 10,
                  message: "Message must be at least 10 characters",
                },
              })}
              rows={6}
              placeholder="Tell us what's on your mind..."
              className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            {errors.message && (
              <p className="mt-1 text-xs text-[var(--color-sale)]">
                {errors.message.message}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className="gap-2">
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </form>

        {/* Contact Info */}
        <div>
          <div className="space-y-6">
            {CONTACT_INFO.map((info) => (
              <div key={info.label} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)]">
                  <info.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    {info.label}
                  </p>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="mt-0.5 text-sm font-semibold transition-colors hover:text-[var(--color-muted)]"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm">{info.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Map Placeholder */}
          <div className="mt-8 flex aspect-[4/3] items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-surface)]">
            <div className="text-center">
              <MapPin className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                Mumbai, Maharashtra
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[var(--button-radius)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Business Hours
            </p>
            <p className="mt-1 text-sm">Monday - Saturday: 10 AM - 7 PM IST</p>
            <p className="text-sm text-[var(--color-muted)]">
              Sunday: Closed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
