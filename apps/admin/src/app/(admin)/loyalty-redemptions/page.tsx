'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';

type RedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface Redemption {
  id: string;
  userId: string;
  pointsAmount: number;
  status: RedemptionStatus;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  discountCodeId: string | null;
  createdAt: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    loyaltyPoints: number;
  };
  discountCode: {
    code: string;
    expiresAt: string;
    usageCount: number;
    usageLimit: number | null;
  } | null;
}

interface RedemptionsResponse {
  data: Redemption[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CustomerRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  loyaltyPoints: number;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number };
}

interface CustomersResponse {
  customers: CustomerRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_STYLES: Record<RedemptionStatus, { bg: string; color: string; label: string }> = {
  PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'PENDING' },
  APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'APPROVED' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'REJECTED' },
  CANCELLED: { bg: '#E5E7EB', color: '#374151', label: 'CANCELLED' },
};

export default function LoyaltyRedemptionsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RedemptionStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    userEmail: '',
    orderNumber: '',
    pointsAmount: '',
    notes: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(customerSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const { data, isLoading } = useQuery<RedemptionsResponse>({
    queryKey: ['admin-redemptions', statusFilter],
    queryFn: () =>
      api.get<RedemptionsResponse>(
        `/admin/loyalty/redemptions${statusFilter ? `?status=${statusFilter}` : ''}`
      ),
  });

  const { data: customersData, isLoading: customersLoading } = useQuery<CustomersResponse>({
    queryKey: ['loyalty-customers', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: '20',
        sortBy: 'loyaltyPoints',
        sortOrder: 'desc',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get<CustomersResponse>(`/admin/customers?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const openRedemptionFor = (email: string) => {
    setForm({ userEmail: email, orderNumber: '', pointsAmount: '', notes: '' });
    setShowCreate(true);
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      userEmail?: string;
      orderNumber?: string;
      pointsAmount: number;
      notes?: string;
    }) => api.post('/admin/loyalty/redemptions', payload),
    onSuccess: () => {
      toast.success('Redemption request created');
      qc.invalidateQueries({ queryKey: ['admin-redemptions'] });
      setShowCreate(false);
      setForm({ userEmail: '', orderNumber: '', pointsAmount: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/loyalty/redemptions/${id}/approve`),
    onSuccess: () => {
      toast.success('Redemption approved — code emailed to user');
      qc.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/loyalty/redemptions/${id}/reject`, {}),
    onSuccess: () => {
      toast.success('Redemption rejected');
      qc.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Reject failed'),
  });

  const expireMutation = useMutation({
    mutationFn: () =>
      api.post<{ scanned: number; expiredPoints: number }>('/admin/loyalty/expire-points'),
    onSuccess: (res) => {
      toast.success(
        `Expiry sweep: ${res.scanned} rows scanned, ${res.expiredPoints} pts removed`
      );
    },
    onError: (err: Error) => toast.error(err.message || 'Expiry failed'),
  });

  const onCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = Number(form.pointsAmount);
    const email = form.userEmail.trim();
    const orderNumber = form.orderNumber.trim();
    if ((!email && !orderNumber) || !pts || pts <= 0) {
      toast.error('Email OR order number + positive points amount required');
      return;
    }
    createMutation.mutate({
      userEmail: email || undefined,
      orderNumber: orderNumber || undefined,
      pointsAmount: pts,
      notes: form.notes || undefined,
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Loyalty Redemptions</h1>
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Customers email support to request a cash-out; approve here to mint a single-use code
            for their account. Points are deducted only on approval.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outline"
            onClick={() => expireMutation.mutate()}
            disabled={expireMutation.isPending}
          >
            {expireMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Run expiry sweep'
            )}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New redemption
          </Button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #E5E5E5',
          padding: 16,
          marginBottom: 32,
          background: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Customers by balance
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              Top 20 by points. Search any name, email, or phone to find a specific customer.
            </div>
          </div>
          <div style={{ position: 'relative', width: 320 }}>
            <Search
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
              }}
              className="h-4 w-4"
            />
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                border: '1px solid #E5E5E5',
                background: '#fff',
                fontSize: 13,
              }}
            />
          </div>
        </div>
        {customersLoading && !customersData ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#999' }}>
            Loading customers…
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E5E5', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px', fontSize: 11, letterSpacing: 1 }}>CUSTOMER</th>
                <th style={{ padding: '8px 6px', fontSize: 11, letterSpacing: 1 }}>EMAIL</th>
                <th style={{ padding: '8px 6px', fontSize: 11, letterSpacing: 1 }}>BALANCE</th>
                <th style={{ padding: '8px 6px', fontSize: 11, letterSpacing: 1 }}>ORDERS</th>
                <th style={{ padding: '8px 6px' }}></th>
              </tr>
            </thead>
            <tbody>
              {(customersData?.customers ?? []).map((c) => {
                const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 500 }}>{name || '—'}</div>
                      {c.phone && (
                        <div style={{ fontSize: 11, color: '#999' }}>{c.phone}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', fontSize: 12, color: '#444' }}>{c.email}</td>
                    <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>
                      ₹{c.loyaltyPoints.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#666' }}>
                      {c._count?.orders ?? 0}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <button
                        onClick={() => openRedemptionFor(c.email)}
                        disabled={c.loyaltyPoints <= 0}
                        style={{
                          padding: '4px 10px',
                          background: c.loyaltyPoints > 0 ? '#000' : '#E5E5E5',
                          color: c.loyaltyPoints > 0 ? '#fff' : '#999',
                          border: 'none',
                          fontSize: 11,
                          cursor: c.loyaltyPoints > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Redeem →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(customersData?.customers ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                    {debouncedSearch
                      ? `No customers matching "${debouncedSearch}"`
                      : 'No customers yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Redemption requests
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 12px',
              border: '1px solid #E5E5E5',
              backgroundColor: statusFilter === s ? '#000' : '#fff',
              color: statusFilter === s ? '#fff' : '#000',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: 32, textAlign: 'center' }}>Loading…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px' }}>Customer</th>
              <th style={{ padding: '10px 8px' }}>Points</th>
              <th style={{ padding: '10px 8px' }}>Balance now</th>
              <th style={{ padding: '10px 8px' }}>Status</th>
              <th style={{ padding: '10px 8px' }}>Code</th>
              <th style={{ padding: '10px 8px' }}>Created</th>
              <th style={{ padding: '10px 8px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).map((r) => {
              const style = STATUS_STYLES[r.status];
              const name = `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim();
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ fontWeight: 500 }}>{name || '—'}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{r.user.email}</div>
                    {r.user.phone && (
                      <div style={{ fontSize: 11, color: '#0A7A3B', fontWeight: 500 }}>
                        📱 {r.user.phone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>
                    ₹{r.pointsAmount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>
                    {r.user.loyaltyPoints.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: style.bg,
                        color: style.color,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      {style.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 11 }}>
                    {r.discountCode?.code ?? '—'}
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 11, color: '#666' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => approveMutation.mutate(r.id)}
                          disabled={approveMutation.isPending}
                          style={{
                            padding: '4px 10px',
                            background: '#000',
                            color: '#fff',
                            border: 'none',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          <Check className="inline h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(r.id)}
                          disabled={rejectMutation.isPending}
                          style={{
                            padding: '4px 10px',
                            background: '#fff',
                            border: '1px solid #000',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          <X className="inline h-3 w-3" /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {(data?.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#999' }}>
                  No redemption requests {statusFilter && `with status ${statusFilter}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New redemption request"
        maxWidth="max-w-lg"
      >
        <form onSubmit={onCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 10, background: '#FEF9E7', fontSize: 11, color: '#7A5901', border: '1px solid #F5E7A8' }}>
            Fill EITHER email OR order number. Order number is more reliable for phone-signup customers whose email was auto-generated.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
              ORDER NUMBER
            </label>
            <input
              type="text"
              value={form.orderNumber}
              onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
              placeholder="e.g. ORD-2026-ABC123"
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #E5E5E5',
                fontSize: 13,
                marginTop: 4,
                fontFamily: 'monospace',
              }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#999', letterSpacing: 2 }}>
            — OR —
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
              CUSTOMER EMAIL
            </label>
            <input
              type="email"
              value={form.userEmail}
              onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #E5E5E5',
                fontSize: 13,
                marginTop: 4,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
              POINTS TO REDEEM (₹)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.pointsAmount}
              onChange={(e) => setForm({ ...form, pointsAmount: e.target.value })}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #E5E5E5',
                fontSize: 13,
                marginTop: 4,
              }}
              required
            />
          </div>
          <div style={{ padding: 12, background: '#F5F5F5', fontSize: 11, color: '#666' }}>
            Balance check happens on submit — if the customer has insufficient points, the backend rejects with the current balance.
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>NOTES (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: 10,
                border: '1px solid #E5E5E5',
                fontSize: 13,
                marginTop: 4,
              }}
              placeholder="Reference email thread, customer support ticket, etc."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
