'use client';

import { use } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#EAB308',
  RESOLVED: '#22C55E',
  CLOSED: '#999',
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 13,
            fontWeight: 400,
            color: '#000',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Ticket Not Found
        </p>
        <Link
          href="/account/support"
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 300,
            color: '#999',
            textDecoration: 'none',
          }}
        >
          Back to Support
        </Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN;
  const isClosed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/account/support"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-inter)',
          fontSize: 11,
          fontWeight: 300,
          color: '#999',
          textDecoration: 'none',
          marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} />
        Back to Support
      </Link>

      {/* Ticket Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 12,
              fontWeight: 400,
              color: '#000',
              letterSpacing: '0.5px',
            }}
          >
            #{ticket.ticketNumber}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              fontWeight: 400,
              color: statusColor,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {formatStatus(ticket.status)}
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 16,
            fontWeight: 400,
            color: '#000',
            margin: 0,
            marginBottom: 6,
          }}
        >
          {ticket.subject}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 300,
            color: '#999',
            margin: 0,
          }}
        >
          {ticket.category} &middot; {formatDate(ticket.createdAt)}
        </p>
      </div>

      <div style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 24 }} />

      {/* Messages */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {ticket.messages.map((msg) => {
          const isCustomer = msg.user.role === 'CUSTOMER';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isCustomer ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  backgroundColor: isCustomer ? '#F5F5F5' : 'transparent',
                  border: isCustomer ? 'none' : '1px solid #F0F0F0',
                  padding: '12px 16px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    fontWeight: 300,
                    color: '#000',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 10,
                    fontWeight: 300,
                    color: '#999',
                    margin: 0,
                    marginTop: 6,
                  }}
                >
                  {formatDate(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Form */}
      {!isClosed ? (
        <form
          onSubmit={handleSubmit((data) => replyMutation.mutate(data))}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <textarea
            rows={3}
            placeholder="Type your reply..."
            style={{
              width: '100%',
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 400,
              color: '#000',
              border: 'none',
              borderBottom: '1px solid #E5E5E5',
              padding: '8px 0',
              outline: 'none',
              background: 'transparent',
              resize: 'vertical',
            }}
            {...register('content', {
              required: 'Message is required',
            })}
          />
          {errors.content && (
            <p
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                color: '#EF4444',
                margin: 0,
              }}
            >
              {errors.content.message}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={replyMutation.isPending}
              style={{
                height: 46,
                paddingLeft: 24,
                paddingRight: 24,
                backgroundColor: '#000',
                color: '#FFF',
                border: 'none',
                cursor: replyMutation.isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-inter)',
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '2px',
                opacity: replyMutation.isPending ? 0.6 : 1,
              }}
            >
              {replyMutation.isPending ? 'SENDING...' : 'SEND'}
            </button>
          </div>
        </form>
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 13,
            fontWeight: 300,
            color: '#999',
            textAlign: 'center',
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          This ticket is {formatStatus(ticket.status).toLowerCase()}. Create a new ticket if you
          need further assistance.
        </p>
      )}
    </div>
  );
}
