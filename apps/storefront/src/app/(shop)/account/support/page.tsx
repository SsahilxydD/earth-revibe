"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  Plus,
  ChevronRight,
  X,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/providers";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface NewTicketForm {
  subject: string;
  category: string;
  message: string;
}

const CATEGORIES = [
  "Order Issue",
  "Return & Refund",
  "Payment",
  "Shipping",
  "Product Inquiry",
  "Account",
  "Other",
] as const;

const TICKET_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-blue-100", text: "text-blue-800" },
  "in-progress": { bg: "bg-yellow-100", text: "text-yellow-800" },
  waiting: { bg: "bg-purple-100", text: "text-purple-800" },
  resolved: { bg: "bg-green-100", text: "text-green-800" },
  closed: { bg: "bg-gray-100", text: "text-gray-800" },
};

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => api.get<{ tickets: Ticket[]; total: number }>("/support/tickets"),
  });

  const tickets = data?.tickets;

  const createMutation = useMutation({
    mutationFn: (data: NewTicketForm) => api.post("/support/tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setShowForm(false);
      reset();
      addToast("Ticket created successfully", "success");
    },
    onError: (err: any) => {
      addToast(err?.message || "Failed to create ticket", "error");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewTicketForm>({
    defaultValues: { subject: "", category: "", message: "" },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Support Tickets
        </h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            New Ticket
          </Button>
        )}
      </div>

      <hr style={{ marginTop: 28, marginBottom: 28, border: "none", borderTop: "1px solid #e5e5e5" }} />

      {/* New Ticket Form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--color-border)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              New Ticket
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                reset();
              }}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <Input
              label="Subject"
              placeholder="Brief description of your issue"
              error={errors.subject?.message}
              {...register("subject", {
                required: "Subject is required",
                minLength: { value: 5, message: "Too short" },
              })}
            />
            <div className="w-full">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Category
              </label>
              <select
                className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                {...register("category", {
                  required: "Please select a category",
                })}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-[var(--color-sale)]">
                  {errors.category.message}
                </p>
              )}
            </div>
            <div className="w-full">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Message
              </label>
              <textarea
                className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                rows={5}
                placeholder="Describe your issue in detail..."
                {...register("message", {
                  required: "Message is required",
                  minLength: { value: 20, message: "Please provide more detail" },
                })}
              />
              {errors.message && (
                <p className="mt-1 text-xs text-[var(--color-sale)]">
                  {errors.message.message}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" loading={createMutation.isPending}>
                Submit Ticket
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      {(!tickets || tickets.length === 0) && !showForm ? (
        <div style={{ paddingTop: 60, paddingBottom: 60 }} className="flex flex-col items-center text-center">
          <HelpCircle size={40} strokeWidth={1} className="text-[#c0c0c0]" />
          <h3 style={{ marginTop: 24 }} className="text-xs font-bold uppercase tracking-[0.2em]">
            No support tickets
          </h3>
          <p style={{ marginTop: 10, maxWidth: 240 }} className="text-xs leading-relaxed text-[#999]">
            Need help? Create a ticket and we&apos;ll get back to you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets?.map((ticket) => {
            const statusStyle =
              TICKET_STATUS_STYLES[ticket.status] ||
              TICKET_STATUS_STYLES.open;
            return (
              <Link
                key={ticket.id}
                href={`/account/support/${ticket.ticketNumber}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-surface)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageSquare
                      size={14}
                      className="text-[var(--color-muted)]"
                    />
                    <span className="text-sm font-bold">
                      #{ticket.ticketNumber}
                    </span>
                    <span
                      className={`rounded-[var(--badge-radius)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm">{ticket.subject}</p>
                  <div className="mt-1 flex gap-3 text-xs text-[var(--color-muted)]">
                    <span>{ticket.category}</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-[var(--color-muted)]"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
