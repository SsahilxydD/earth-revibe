'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/providers';

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
  description: string;
}

const CATEGORIES = [
  'Order Issue',
  'Return & Refund',
  'Payment',
  'Shipping',
  'Product Inquiry',
  'Account',
  'Other',
] as const;

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

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => api.get<{ tickets: Ticket[]; total: number }>('/support'),
  });

  const tickets = data?.tickets;

  const createMutation = useMutation({
    mutationFn: (data: NewTicketForm) => api.post('/support', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setShowForm(false);
      reset();
      addToast('Ticket created successfully', 'success');
    },
    onError: (err: any) => {
      addToast(apiErrorMessage(err, 'Failed to create ticket'), 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewTicketForm>({
    defaultValues: { subject: '', category: '', description: '' },
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

  return (
    <div style={{ padding: '24px 28px 28px 28px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          TICKETS
        </span>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: '#000',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + New ticket
          </button>
        )}
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div style={{ marginTop: 20, padding: 20, border: '1px solid #E5E5E5' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              NEW TICKET
            </span>
            <button
              onClick={() => {
                setShowForm(false);
                reset();
              }}
              style={{
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Subject */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
                SUBJECT
              </label>
              <div style={{ height: 10 }} />
              <input
                {...register('subject', {
                  required: 'Subject is required',
                  minLength: { value: 5, message: 'Too short' },
                })}
                placeholder="Brief description"
                style={{
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#000',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  background: 'transparent',
                }}
              />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.subject && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.subject.message}
                </p>
              )}
            </div>
            {/* Category */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
                CATEGORY
              </label>
              <div style={{ height: 10 }} />
              <select
                {...register('category', { required: 'Select a category' })}
                style={{
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#000',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  background: 'transparent',
                  appearance: 'none' as const,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.category && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.category.message}
                </p>
              )}
            </div>
            {/* Message */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
                MESSAGE
              </label>
              <div style={{ height: 10 }} />
              <textarea
                {...register('description', {
                  required: 'Message is required',
                  minLength: { value: 20, message: 'Please provide more detail' },
                })}
                rows={4}
                placeholder="Describe your issue..."
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
              {errors.description && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.description.message}
                </p>
              )}
            </div>
            {/* Submit */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                width: '100%',
                height: 50,
                backgroundColor: '#000',
                color: '#FFF',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                border: 'none',
                cursor: 'pointer',
                opacity: createMutation.isPending ? 0.5 : 1,
              }}
            >
              {createMutation.isPending ? 'SUBMITTING...' : 'SUBMIT TICKET'}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {(!tickets || tickets.length === 0) && !showForm && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>No tickets yet</p>
          <p style={{ fontSize: 11, fontWeight: 300, color: '#CCC', marginTop: 8 }}>
            Need help? Create a ticket
          </p>
        </div>
      )}

      {/* Ticket list — 16px padding per ticket, 6px gap, 1px dividers, each ~88px */}
      {tickets && tickets.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {tickets.map((ticket, i) => (
            <div key={ticket.id}>
              <Link
                href={`/account/support/${ticket.ticketNumber}`}
                style={{ display: 'block', padding: '16px 0', textDecoration: 'none' }}
              >
                {/* Top: ticket number + status */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                      fontSize: 12,
                      fontWeight: 400,
                      color: '#000',
                      letterSpacing: 0.5,
                    }}
                  >
                    #{ticket.ticketNumber}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color: STATUS_COLOR[ticket.status] || '#999',
                      letterSpacing: 0.5,
                    }}
                  >
                    {formatTicketStatus(ticket.status)}
                  </span>
                </div>
                {/* Subject */}
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#000',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ticket.subject}
                </p>
                {/* Meta: category · date */}
                <p style={{ marginTop: 6, fontSize: 10, fontWeight: 300, color: '#999' }}>
                  {ticket.category} · {formatDate(ticket.createdAt)}
                </p>
              </Link>
              {i < tickets.length - 1 && <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
