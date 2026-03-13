"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = email.trim();
      if (!trimmed) return;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setStatus("error");
        setErrorMessage("Please enter a valid email address");
        return;
      }

      setStatus("loading");
      setErrorMessage("");

      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://earth-revibeapi-production.up.railway.app/api/v1";
        const res = await fetch(`${apiBase}/newsletter/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error?.message || "Something went wrong. Please try again.",
          );
        }

        setStatus("success");
        setEmail("");
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    },
    [email],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="bg-[var(--color-surface)] py-12 md:py-20 px-4 md:px-8"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          Join the Tribe
        </h2>
        <p className="mt-3 text-sm md:text-base text-[var(--color-muted)]">
          Get 10% off your first order + early access to new drops
        </p>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
            <p className="text-sm font-medium text-green-700">
              You&apos;re in! Check your inbox for your 10% off code.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-0"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setErrorMessage("");
                }
              }}
              placeholder="Enter your email"
              required
              className={cn(
                "flex-1 px-4 py-3 md:py-3.5 text-sm bg-white border border-[var(--color-border)]",
                "sm:rounded-l-[var(--button-radius)] sm:rounded-r-none rounded-[var(--button-radius)]",
                "outline-none focus:border-[var(--color-primary)] transition-colors",
                "placeholder:text-[var(--color-muted)]",
              )}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className={cn(
                "px-6 py-3 md:py-3.5 bg-[var(--color-primary)] text-white text-xs md:text-sm",
                "font-semibold uppercase tracking-[0.15em]",
                "sm:rounded-r-[var(--button-radius)] sm:rounded-l-none rounded-[var(--button-radius)]",
                "hover:bg-[var(--color-primary)]/90 transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
              )}
            >
              {status === "loading" ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Subscribe</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {status === "error" && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-[var(--color-sale)] flex items-center justify-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {errorMessage}
          </motion.p>
        )}
      </div>
    </motion.section>
  );
}
