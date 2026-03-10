"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }
    // Store locally for now (no API endpoint yet)
    const existing = JSON.parse(localStorage.getItem("newsletter_subscribers") || "[]");
    if (!existing.includes(email)) {
      existing.push(email);
      localStorage.setItem("newsletter_subscribers", JSON.stringify(existing));
    }
    setStatus("success");
    setEmail("");
    setTimeout(() => setStatus("idle"), 5000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
      />
      <button
        type="submit"
        className="bg-[var(--sage)] hover:bg-[var(--sage)]/80 text-white px-3 py-2 rounded transition-colors"
        aria-label="Subscribe"
      >
        <Send size={16} />
      </button>
      {status === "success" && <p className="text-xs text-[var(--sage)] mt-1 absolute">Thank you! We&apos;ll notify you when we launch our newsletter.</p>}
    </form>
  );
}
