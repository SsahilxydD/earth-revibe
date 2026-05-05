'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button, Card, Input } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import {
  useBroadcastQuota,
  useTripOpeningBroadcast,
  type BroadcastResult,
} from '@/hooks/use-whatsapp-broadcast';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED';

const STATUS_OPTIONS: { value: Status; label: string; defaultOn: boolean }[] = [
  { value: 'PENDING', label: 'Pending', defaultOn: true },
  { value: 'APPROVED', label: 'Approved', defaultOn: true },
  { value: 'WAITLISTED', label: 'Waitlisted', defaultOn: true },
  { value: 'REJECTED', label: 'Rejected', defaultOn: false },
];

export default function TripOpeningBroadcastPage() {
  const [city, setCity] = useState('Ahmedabad');
  const [tripLabel, setTripLabel] = useState('');
  const [statuses, setStatuses] = useState<Record<Status, boolean>>(() =>
    STATUS_OPTIONS.reduce(
      (acc, opt) => ({ ...acc, [opt.value]: opt.defaultOn }),
      {} as Record<Status, boolean>
    )
  );
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);

  const { data: quota } = useBroadcastQuota();
  const broadcast = useTripOpeningBroadcast();

  const activeStatuses = STATUS_OPTIONS.filter((o) => statuses[o.value]).map((o) => o.value);

  const run = async (dryRun: boolean) => {
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!tripLabel.trim()) {
      toast.error('Trip label is required (e.g. "Ahmedabad weekender")');
      return;
    }
    if (activeStatuses.length === 0) {
      toast.error('Select at least one applicant status');
      return;
    }
    if (!dryRun) {
      const confirmed = window.confirm(
        `Send the Utility trip-opening message to ${city} applicants (${activeStatuses.join(', ')})? This fires real WhatsApp messages.`
      );
      if (!confirmed) return;
    }

    try {
      const result = await broadcast.mutateAsync({
        city: city.trim(),
        tripLabel: tripLabel.trim(),
        statuses: activeStatuses,
        dryRun,
      });
      setLastResult(result);
      if (dryRun) {
        toast.success(`Dry run matched ${result.totalResolved} applicant(s)`);
      } else {
        toast.success(
          `Sent: ${result.totalSent} · Failed: ${result.totalFailed}` +
            (result.totalFailed > 0 ? ' — see details below' : '')
        );
      }
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e.message || 'Broadcast failed');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Trip Opening — Utility Broadcast</h1>
        <p className="text-sm text-medium-gray mt-1">
          Send the <code className="text-xs">er_trip_opening_update</code> Utility template to
          existing Travel Circle applicants in a chosen city. Delivers reliably (Utility, not paced
          like Marketing).
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-medium-gray">
              {quota ? `${Math.round(quota.windowMinutes / 60)}-hour send window` : 'Send window'}
            </div>
            <div className="text-2xl font-semibold text-charcoal mt-1">
              {quota ? `${quota.remaining} / ${quota.limit}` : '—'}
            </div>
          </div>
          <div className="w-40 h-2 bg-gray-200 overflow-hidden rounded">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${quota ? Math.min(100, (quota.used / quota.limit) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">City</label>
          <p className="text-xs text-medium-gray mb-2">
            Matches applicants' stored city (case-insensitive). Only those who applied from this
            city receive the message.
          </p>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ahmedabad" />
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Trip label (body variable)
          </label>
          <p className="text-xs text-medium-gray mb-2">
            Short description of the trip batch — appears in the message body. e.g. "Ahmedabad
            weekender", "Himachal winter batch".
          </p>
          <Input
            value={tripLabel}
            onChange={(e) => setTripLabel(e.target.value)}
            placeholder="Ahmedabad weekender"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">
            Applicant statuses to include
          </label>
          <div className="flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={statuses[opt.value]}
                  onChange={(e) => setStatuses((s) => ({ ...s, [opt.value]: e.target.checked }))}
                />
                <span className="text-charcoal">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="secondary" onClick={() => run(true)} disabled={broadcast.isPending}>
            {broadcast.isPending && broadcast.variables?.dryRun ? (
              <Loader2 className="animate-spin" size={16} />
            ) : null}
            Dry run
          </Button>
          <Button onClick={() => run(false)} disabled={broadcast.isPending}>
            {broadcast.isPending && !broadcast.variables?.dryRun ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            Send broadcast
          </Button>
        </div>
      </Card>

      {lastResult && (
        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium text-charcoal">
            Last {lastResult.dryRun ? 'dry run' : 'send'} result
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-medium-gray">Resolved</div>
              <div className="text-lg font-semibold">{lastResult.totalResolved}</div>
            </div>
            <div>
              <div className="text-xs text-medium-gray">Sent</div>
              <div className="text-lg font-semibold text-success">{lastResult.totalSent}</div>
            </div>
            <div>
              <div className="text-xs text-medium-gray">Failed</div>
              <div className="text-lg font-semibold text-error">{lastResult.totalFailed}</div>
            </div>
          </div>

          {lastResult.sampleRecipients && lastResult.sampleRecipients.length > 0 && (
            <div className="text-xs text-medium-gray pt-2 border-t border-border">
              Sample: {lastResult.sampleRecipients.join(', ')}
            </div>
          )}

          {lastResult.failures.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-medium-gray mb-1">Failures (first 50)</div>
              <ul className="text-xs font-mono space-y-0.5 max-h-48 overflow-auto">
                {lastResult.failures.map((f, i) => (
                  <li key={i}>
                    <span className="text-charcoal">{f.phone}</span>
                    <span className="text-medium-gray"> · {f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
