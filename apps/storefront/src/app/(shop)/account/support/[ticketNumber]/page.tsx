"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Card, Badge, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";

const statusVariant: Record<string, "success" | "warning" | "info" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TicketDetailPage({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const { ticketNumber } = use(params);
  const { user } = useAuthStore();
  const [reply, setReply] = useState("");
  const qc = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["my-ticket", ticketNumber],
    queryFn: () => api.get(`/support/${ticketNumber}`),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => api.post(`/support/${ticketNumber}/messages`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ticket", ticketNumber] });
      toast.success("Message sent");
      setReply("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send message"),
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    replyMutation.mutate(reply);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!ticket) return <p className="text-center py-20 text-medium-gray">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account/support">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-charcoal">{ticket.ticketNumber}</h1>
            <Badge variant={statusVariant[ticket.status] || "default"}>{ticket.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-medium-gray">{ticket.category}</p>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-charcoal mb-4">{ticket.subject}</h2>

        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {ticket.messages?.map((msg: any) => {
            const isMe = msg.user?.id === user?.id;
            const isStaff = msg.user?.role === "ADMIN" || msg.user?.role === "SUPER_ADMIN" || msg.user?.role === "SUPPORT_STAFF";
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isStaff ? "bg-forest-green" : "bg-forest-green/10"
                }`}>
                  <User size={14} className={isStaff ? "text-white" : "text-forest-green"} />
                </div>
                <div className={`max-w-[80%] ${isMe ? "text-right" : ""}`}>
                  <div className={`rounded-lg px-4 py-3 ${isMe ? "bg-forest-green/5" : "bg-off-white"}`}>
                    <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-[10px] text-medium-gray mt-1">
                    {isStaff ? "Support Team" : `${msg.user?.firstName}`} &middot; {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {ticket.status !== "CLOSED" && (
        <Card>
          <form onSubmit={handleReply} className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message..."
              rows={2}
              required
              className="flex-1 rounded-lg border border-light-gray px-3 py-2 text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-forest-green/20 focus:border-forest-green resize-none"
            />
            <Button type="submit" disabled={replyMutation.isPending || !reply.trim()}>
              <Send size={16} />
            </Button>
          </form>
        </Card>
      )}

      {ticket.status === "CLOSED" && (
        <Card>
          <p className="text-sm text-medium-gray text-center py-2">This ticket is closed. Create a new ticket if you need further assistance.</p>
        </Card>
      )}
    </div>
  );
}
