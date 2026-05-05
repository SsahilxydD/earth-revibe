'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, User } from 'lucide-react';
import { Button, Badge, Card, Select, Textarea, Spinner } from '@earth-revibe/ui';
import {
  useAdminTicket,
  useUpdateTicketStatus,
  useAdminTicketReply,
} from '@/hooks/use-support-tickets';

const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const priorityVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
  URGENT: 'error',
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketNumber: string }>;
}) {
  const { ticketNumber } = use(params);
  const { data, isLoading } = useAdminTicket(ticketNumber);
  const statusMutation = useUpdateTicketStatus();
  const replyMutation = useAdminTicketReply();
  const [reply, setReply] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const ticket = data;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await replyMutation.mutateAsync({ ticketNumber, content: reply });
    setReply('');
  };

  const handleStatusChange = () => {
    if (newStatus && newStatus !== ticket?.status) {
      statusMutation.mutate({ ticketNumber, status: newStatus });
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!ticket) return <p className="text-center py-20 text-medium-gray">Ticket not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/support-tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-charcoal">{ticket.ticketNumber}</h1>
        <Badge variant={statusVariant[ticket.status] || 'default'}>
          {ticket.status.replace('_', ' ')}
        </Badge>
        <Badge variant={priorityVariant[ticket.priority] || 'default'}>{ticket.priority}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-1">{ticket.subject}</h3>
            <p className="text-xs text-medium-gray mb-4">Category: {ticket.category}</p>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages?.map((msg: any) => {
                const isStaff =
                  msg.user?.role === 'ADMIN' ||
                  msg.user?.role === 'SUPER_ADMIN' ||
                  msg.user?.role === 'SUPPORT_STAFF';
                return (
                  <div key={msg.id} className={`flex gap-3 ${isStaff ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isStaff ? 'bg-deep-earth' : 'bg-forest-green/10'}`}
                    >
                      <User size={14} className={isStaff ? 'text-white' : 'text-forest-green'} />
                    </div>
                    <div className={`max-w-[75%] ${isStaff ? 'text-right' : ''}`}>
                      <div
                        className={`rounded-lg px-4 py-3 ${isStaff ? 'bg-deep-earth/5' : 'bg-off-white'}`}
                      >
                        <p className="text-sm text-charcoal whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-medium-gray mt-1">
                        {msg.user?.firstName} {msg.user?.lastName} &middot;{' '}
                        {formatDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {ticket.status !== 'CLOSED' && (
            <Card>
              <form onSubmit={handleReply} className="space-y-3">
                <Textarea
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={replyMutation.isPending || !reply.trim()}>
                    <Send size={14} /> {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Customer</h4>
            <p className="text-sm text-charcoal">
              {ticket.user?.firstName} {ticket.user?.lastName}
            </p>
            <p className="text-xs text-medium-gray">{ticket.user?.email}</p>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Update Status</h4>
            <div className="space-y-2">
              <Select
                value={newStatus || ticket.status}
                onChange={(e) => setNewStatus(e.target.value)}
                options={[
                  { value: 'OPEN', label: 'Open' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'CLOSED', label: 'Closed' },
                ]}
              />
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleStatusChange}
                disabled={statusMutation.isPending || !newStatus || newStatus === ticket.status}
              >
                Update
              </Button>
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold text-charcoal mb-3">Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Created</span>
                <span className="text-charcoal">{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medium-gray">Updated</span>
                <span className="text-charcoal">{formatDateTime(ticket.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-medium-gray">Messages</span>
                <span className="text-charcoal">{ticket.messages?.length || 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
