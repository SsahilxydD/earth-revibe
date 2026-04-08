'use client';

import { use } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/providers';

interface TicketMessage {
  id: string;
  content: string;
  attachment: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
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

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#EAB308',
  RESOLVED: '#22C55E',
  CLOSED: '#999',
};

function formatTicketStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(\w)(\w*)/g, (_, f, r) => f + r.toLowerCase());
}

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
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketNumber] });
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
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>Ticket not found</p>
        <Link
          href="/account/support"
          style={{
            marginTop: 16,
            fontSize: 12,
            fontWeight: 300,
            color: '#999',
            textDecoration: 'none',
          }}
        >
          ← Back to support
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Back link */}
      <Link
        href="/account/support"
        style={{ fontSize: 12, fontWeight: 300, color: '#999', textDecoration: 'none' }}
      >
        ← Back to support
      </Link>

      {/* Ticket info header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>{ticket.subject}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              color: STATUS_COLOR[ticket.status] || '#999',
              letterSpacing: 0.5,
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            {formatTicketStatus(ticket.status)}
          </span>
        </div>
        <p style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
          #{ticket.ticketNumber} · {ticket.category} · {formatDate(ticket.createdAt)}
        </p>
      </div>

      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Messages thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {ticket.messages.map((msg) => {
          const isCustomer = msg.user.role === 'CUSTOMER';
          const senderName = `${msg.user.firstName} ${msg.user.lastName}`.trim();
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isCustomer ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: 16,
                  backgroundColor: isCustomer ? '#F5F5F5' : 'transparent',
                  border: isCustomer ? 'none' : '1px solid #F0F0F0',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 300, color: '#000', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </p>
              </div>
              <p style={{ marginTop: 4, fontSize: 10, fontWeight: 300, color: '#999' }}>
                {senderName} · {formatDate(msg.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reply form or closed notice */}
      {!isClosed ? (
        <form
          onSubmit={handleSubmit((data) => replyMutation.mutate(data))}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <textarea
            {...register('content', { required: 'Message is required' })}
            rows={3}
            placeholder="Type your reply..."
            style={{
              width: '100%',
              fontSize: 14,
              fontWeight: 300,
              color: '#000',
              border: '1px solid #E5E5E5',
              outline: 'none',
              padding: 12,
              background: 'transparent',
              resize: 'vertical',
            }}
          />
          {errors.content && (
            <p style={{ fontSize: 11, color: '#cf2929' }}>{errors.content.message}</p>
          )}
          <button
            type="submit"
            disabled={replyMutation.isPending}
            style={{
              width: '100%',
              height: 46,
              backgroundColor: '#000',
              color: '#FFF',
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: 2,
              border: 'none',
              cursor: 'pointer',
              opacity: replyMutation.isPending ? 0.5 : 1,
            }}
          >
            {replyMutation.isPending ? 'SENDING...' : 'SEND'}
          </button>
        </form>
      ) : (
        <p
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: '#999',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          This ticket is {formatTicketStatus(ticket.status).toLowerCase()}. Create a new ticket if
          you need further help.
        </p>
      )}
    </div>
  );
}
