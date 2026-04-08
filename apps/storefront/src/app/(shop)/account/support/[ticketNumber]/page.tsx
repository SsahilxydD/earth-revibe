'use client';

import { use } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, User, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatDate, formatStatus } from '@/lib/utils';
import { useToast } from '@/providers';

interface TicketMessage {
  id: string;
  content: string;
  attachment: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  messages: TicketMessage[];
}

interface ReplyForm {
  content: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-800' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketNumber: string }>;
}) {
  const { ticketNumber } = use(params);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', ticketNumber],
    queryFn: () => api.get<TicketDetail>(`/support/${ticketNumber}`),
    enabled: !!ticketNumber,
  });

  const replyMutation = useMutation({
    mutationFn: (data: ReplyForm) => api.post(`/support/${ticketNumber}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['support-ticket', ticketNumber],
      });
      reset();
      addToast('Reply sent', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to send reply', 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyForm>({
    defaultValues: { content: '' },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-lg font-bold">Ticket Not Found</h2>
        <Link href="/account/support" className="text-sm text-[var(--color-muted)] hover:underline">
          Back to Support
        </Link>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN;
  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div>
      <Link
        href="/account/support"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        Back to Support
      </Link>

      {/* Ticket Info */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{ticket.subject}</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
              <span>#{ticket.ticketNumber}</span>
              <span>{ticket.category}</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-[var(--badge-radius)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
          >
            {formatStatus(ticket.status)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-6 space-y-4">
        {ticket.messages.map((msg) => {
          const isCustomer = msg.user.role === 'CUSTOMER';
          const senderName = `${msg.user.firstName} ${msg.user.lastName}`.trim();
          return (
            <div key={msg.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isCustomer
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
                }`}
              >
                {isCustomer ? <User size={14} /> : <Headphones size={14} />}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  isCustomer
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isCustomer ? 'text-white/80' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {senderName}
                  </span>
                  <span
                    className={`text-[10px] ${
                      isCustomer ? 'text-white/60' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Form */}
      {!isClosed ? (
        <form onSubmit={handleSubmit((data) => replyMutation.mutate(data))} className="flex gap-3">
          <div className="flex-1">
            <textarea
              className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              rows={3}
              placeholder="Type your reply..."
              {...register('content', {
                required: 'Message is required',
              })}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-[var(--color-sale)]">{errors.content.message}</p>
            )}
          </div>
          <Button type="submit" loading={replyMutation.isPending} className="shrink-0 self-end">
            <Send size={16} />
            Send
          </Button>
        </form>
      ) : (
        <div className="rounded-xl bg-[var(--color-surface)] px-4 py-3 text-center text-sm text-[var(--color-muted)]">
          This ticket is {formatStatus(ticket.status).toLowerCase()}. Create a new ticket if you
          need further assistance.
        </div>
      )}
    </div>
  );
}
