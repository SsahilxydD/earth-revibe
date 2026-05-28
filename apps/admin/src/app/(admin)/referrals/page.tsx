'use client';

import { useState } from 'react';
import { Button, Card, Badge } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { toast } from '@earth-revibe/ui/toast';
import { useReferralPayouts, useMarkReferralPaid } from '@/hooks/use-referrals';

function formatINR(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReferralPayoutsPage() {
  const { data, isLoading } = useReferralPayouts('pending');
  const markPaid = useMarkReferralPaid();
  const [refs, setRefs] = useState<Record<string, string>>({});

  const payouts: any[] = (data as any[]) ?? [];

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid.mutateAsync({ id, payoutRef: refs[id]?.trim() || undefined });
      toast.success('Payout marked paid');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark paid');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Referral payouts</h1>
        <p className="text-sm text-medium-gray mt-1">
          Cash owed to referrers (20% of their friend&apos;s first order). Pay each one to the UPI
          shown from your own UPI app, then mark it paid.
        </p>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-sm text-medium-gray text-center py-8">No pending referral payouts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray text-left text-xs text-medium-gray">
                  <th className="px-3 py-2 font-medium">Referrer</th>
                  <th className="px-3 py-2 font-medium">UPI</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                  <th className="px-3 py-2 font-medium">Referred friend</th>
                  <th className="px-3 py-2 font-medium">Converted</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const name =
                    `${p.referrer?.firstName ?? ''} ${p.referrer?.lastName ?? ''}`.trim() || '—';
                  const referee =
                    `${p.referee?.firstName ?? ''} ${p.referee?.lastName ?? ''}`.trim() || '—';
                  const hasUpi = !!p.referrer?.upiId;
                  return (
                    <tr key={p.id} className="border-b border-light-gray last:border-0">
                      <td className="px-3 py-3 text-charcoal font-medium">{name}</td>
                      <td className="px-3 py-3">
                        {hasUpi ? (
                          <span className="font-mono text-charcoal">{p.referrer.upiId}</span>
                        ) : (
                          <Badge variant="warning">No UPI yet</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-charcoal">
                        {formatINR(p.amount)}
                      </td>
                      <td className="px-3 py-3 text-dark-gray">{referee}</td>
                      <td className="px-3 py-3 text-medium-gray">{formatDate(p.convertedAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={refs[p.id] ?? ''}
                            onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                            placeholder="UPI ref (optional)"
                            className="w-32 px-2 py-1 h-8 rounded border border-light-gray bg-white text-xs text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={!hasUpi || markPaid.isPending}
                            title={hasUpi ? 'Mark paid' : 'Referrer has not added a UPI yet'}
                          >
                            Mark paid
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
