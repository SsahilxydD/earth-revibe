'use client';

import { useMemo, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  useBroadcastQuota,
  useTripBroadcast,
  type BroadcastResult,
} from '@/hooks/use-whatsapp-broadcast';

// Accept a variety of pasted formats: newline, comma, semicolon, space — the
// user doesn't care about format, we do. Normalise to +91 E.164 when the
// number is 10 digits bare.
function parsePhones(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const token of tokens) {
    const digits = token.replace(/\D/g, '');
    let normalised: string | null = null;
    if (/^\d{10}$/.test(digits)) normalised = `+91${digits}`;
    else if (/^91\d{10}$/.test(digits)) normalised = `+${digits}`;
    else if (/^\d{11,15}$/.test(digits)) normalised = `+${digits}`;

    if (normalised) valid.add(normalised);
    else invalid.push(token);
  }

  return { valid: [...valid], invalid };
}

function formatResetAt(iso: string | null): string {
  if (!iso) return 'available now';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'available now';
  const minutes = Math.ceil(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `in ${hours}h ${mins}m`;
}

export default function WhatsAppBroadcastPage() {
  const [raw, setRaw] = useState('');
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);

  const { data: quota } = useBroadcastQuota();
  const broadcast = useTripBroadcast();

  const { valid, invalid } = useMemo(() => parsePhones(raw), [raw]);
  const overQuota = quota ? valid.length > quota.remaining : false;

  const runBroadcast = async (dryRun: boolean) => {
    if (valid.length === 0) {
      toast.error('Paste at least one phone number');
      return;
    }
    if (!dryRun && overQuota) {
      toast.error(
        `Too many: ${valid.length} requested, ${quota?.remaining ?? 0} left in this window.`
      );
      return;
    }
    if (!dryRun) {
      const confirmed = window.confirm(
        `Send the trip announcement template to ${valid.length} ${
          valid.length === 1 ? 'number' : 'numbers'
        }? This fires real WhatsApp messages and counts against Meta's daily cap.`
      );
      if (!confirmed) return;
    }

    try {
      const result = await broadcast.mutateAsync({
        recipients: valid.map((phone) => ({ phone })),
        dryRun,
      });
      setLastResult(result);
      if (dryRun) {
        toast.success(`Dry run resolved ${result.totalResolved} recipients`);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">WhatsApp Broadcast</h1>
        <p className="text-sm text-medium-gray mt-1">
          Send the approved <code className="text-xs">earth_revibe_trip_announcement</code> template
          to a pasted list of phone numbers.
        </p>
      </div>

      {/* Quota card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-medium-gray">
              {quota ? `${Math.round(quota.windowMinutes / 60)}-hour send window` : 'Send window'}
            </div>
            <div className="text-2xl font-semibold text-charcoal mt-1">
              {quota ? `${quota.remaining} / ${quota.limit}` : '—'}
            </div>
            <div className="text-xs text-medium-gray mt-0.5">
              {quota
                ? quota.used === 0
                  ? 'Fresh window'
                  : `${quota.used} sent · resets ${formatResetAt(quota.resetAt)}`
                : 'Loading…'}
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

      {/* Paste + validate */}
      <Card className="p-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-charcoal">Phone numbers</span>
          <span className="block text-xs text-medium-gray mt-0.5">
            One per line, or separated by commas / spaces. 10-digit numbers are treated as +91.
          </span>
          <Textarea
            rows={10}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'9876543210\n9876543211\n+919876543212'}
            className="mt-2 font-mono text-sm"
          />
        </label>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-charcoal">
            <strong>{valid.length}</strong> valid
          </span>
          {invalid.length > 0 && (
            <span className="text-error">
              <strong>{invalid.length}</strong> invalid ({invalid.slice(0, 3).join(', ')}
              {invalid.length > 3 ? '…' : ''})
            </span>
          )}
          {overQuota && (
            <span className="text-error">Exceeds remaining quota ({quota?.remaining ?? 0})</span>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="secondary"
            onClick={() => runBroadcast(true)}
            disabled={broadcast.isPending || valid.length === 0}
          >
            {broadcast.isPending && broadcast.variables?.dryRun ? (
              <Loader2 className="animate-spin" size={16} />
            ) : null}
            Dry run
          </Button>
          <Button
            onClick={() => runBroadcast(false)}
            disabled={broadcast.isPending || valid.length === 0 || overQuota}
          >
            {broadcast.isPending && !broadcast.variables?.dryRun ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            Send to {valid.length}
          </Button>
        </div>
      </Card>

      {/* Result panel */}
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
