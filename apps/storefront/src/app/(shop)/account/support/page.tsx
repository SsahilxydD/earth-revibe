'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatDate, formatStatus } from '@/lib/utils';
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

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#EAB308',
  RESOLVED: '#22C55E',
  CLOSED: '#999',
};

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
      addToast(err?.message || 'Failed to create ticket', 'error');
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          TICKETS
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 400,
              color: '#000',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <Plus size={14} />
            New ticket
          </button>
        )}
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div style={{ marginTop: 20 }}>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Subject */}
            <div>
              <input
                placeholder="Subject"
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
                }}
                {...register('subject', {
                  required: 'Subject is required',
                  minLength: { value: 5, message: 'Too short' },
                })}
              />
              {errors.subject && (
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 10,
                    color: '#EF4444',
                    marginTop: 4,
                    margin: 0,
                    marginTop: 4,
                  }}
                >
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <select
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
                  borderRadius: 0,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
                {...register('category', {
                  required: 'Please select a category',
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
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 10,
                    color: '#EF4444',
                    margin: 0,
                    marginTop: 4,
                  }}
                >
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <textarea
                rows={5}
                placeholder="Describe your issue in detail..."
                style={{
                  width: '100%',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#000',
                  border: '1px solid #E5E5E5',
                  borderRadius: 0,
                  padding: 12,
                  outline: 'none',
                  background: 'transparent',
                  resize: 'vertical',
                }}
                {...register('description', {
                  required: 'Message is required',
                  minLength: { value: 20, message: 'Please provide more detail' },
                })}
              />
              {errors.description && (
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 10,
                    color: '#EF4444',
                    margin: 0,
                    marginTop: 4,
                  }}
                >
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  height: 46,
                  paddingLeft: 24,
                  paddingRight: 24,
                  backgroundColor: '#000',
                  color: '#FFF',
                  border: 'none',
                  cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: '2px',
                  opacity: createMutation.isPending ? 0.6 : 1,
                }}
              >
                {createMutation.isPending ? 'SUBMITTING...' : 'SUBMIT TICKET'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#999',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      {(!tickets || tickets.length === 0) && !showForm ? (
        <div
          style={{
            paddingTop: 60,
            paddingBottom: 60,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 300,
              color: '#999',
              margin: 0,
            }}
          >
            No tickets yet
          </p>
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 300,
              color: '#999',
              margin: 0,
              marginTop: 8,
            }}
          >
            Need help? Create a ticket
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {tickets?.map((ticket, index) => {
            const statusColor = STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN;
            return (
              <div key={ticket.id}>
                <Link
                  href={`/account/support/${ticket.ticketNumber}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div
                    style={{
                      paddingTop: 16,
                      paddingBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {/* Top row: ticket number + status */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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

                    {/* Subject */}
                    <p
                      style={{
                        fontFamily: 'var(--font-inter)',
                        fontSize: 13,
                        fontWeight: 400,
                        color: '#000',
                        margin: 0,
                        width: '100%',
                      }}
                    >
                      {ticket.subject}
                    </p>

                    {/* Meta */}
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
                </Link>
                {index < (tickets?.length ?? 0) - 1 && (
                  <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
