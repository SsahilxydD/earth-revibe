"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card, Badge, Input, Skeleton } from "@/components/ui";
import { toast } from "@/components/ui/toast";

const statusVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

const categories = ["Order Issue", "Payment", "Shipping", "Returns & Refunds", "Product Question", "Account", "Other"];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupportPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "Order Issue", description: "" });

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tickets", page, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      return api.get(`/support?${params}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/support", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast.success("Ticket created! We'll get back to you soon.");
      setShowForm(false);
      setForm({ subject: "", category: "Order Issue", description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create ticket"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Support</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Ticket</>}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Create a Support Ticket</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Subject *</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green"
              >
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                required
                className="w-full rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green"
        >
          <option value="">All Tickets</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data?.tickets?.length ? (
        <Card>
          <div className="text-center py-8">
            <MessageSquare size={40} className="mx-auto text-light-gray mb-3" />
            <p className="text-medium-gray">No support tickets yet.</p>
            <p className="text-sm text-medium-gray mt-1">Need help? Create a ticket above.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.tickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/account/support/${ticket.ticketNumber}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-medium-gray">{ticket.ticketNumber}</span>
                      <Badge variant={statusVariant[ticket.status] || "default"}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-charcoal">{ticket.subject}</h3>
                    <p className="text-xs text-medium-gray mt-1">{ticket.category} &middot; {formatDate(ticket.updatedAt)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-medium-gray">
                    <MessageSquare size={12} /> {ticket._count?.messages || 0}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs text-medium-gray">Page {data.page} of {data.totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
