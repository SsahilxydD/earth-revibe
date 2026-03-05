"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button, Badge, Card, Input, Select, Skeleton } from "@/components/ui";
import { useAdminTickets } from "@/hooks/use-support-tickets";

const statusVariant: Record<string, "success" | "warning" | "info" | "error" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

const priorityVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  LOW: "default",
  MEDIUM: "warning",
  HIGH: "error",
  URGENT: "error",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SupportTicketsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useAdminTickets(page, status || undefined, priority || undefined, search || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Support Tickets</h1>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input placeholder="Search tickets..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All Status" options={[
            { value: "OPEN", label: "Open" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "CLOSED", label: "Closed" },
          ]} />
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} placeholder="All Priority" options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
            { value: "URGENT", label: "Urgent" },
          ]} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !data?.tickets?.length ? (
          <p className="text-medium-gray py-8 text-center">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray text-left">
                  <th className="py-3 px-2 font-medium text-medium-gray">Ticket</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Customer</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Category</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Status</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Priority</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Updated</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Msgs</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="border-b border-light-gray hover:bg-off-white/50">
                    <td className="py-3 px-2">
                      <Link href={`/support-tickets/${ticket.ticketNumber}`} className="text-deep-earth hover:underline font-medium">
                        {ticket.ticketNumber}
                      </Link>
                      <p className="text-xs text-medium-gray truncate max-w-[200px]">{ticket.subject}</p>
                    </td>
                    <td className="py-3 px-2 text-charcoal">
                      {ticket.user?.firstName} {ticket.user?.lastName}
                    </td>
                    <td className="py-3 px-2 text-medium-gray">{ticket.category}</td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant[ticket.status] || "default"}>{ticket.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={priorityVariant[ticket.priority] || "default"}>{ticket.priority}</Badge>
                    </td>
                    <td className="py-3 px-2 text-medium-gray">{formatDate(ticket.updatedAt)}</td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-medium-gray">
                        <MessageSquare size={14} /> {ticket._count?.messages || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
            <p className="text-xs text-medium-gray">Page {data.page} of {data.totalPages} ({data.total} tickets)</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
