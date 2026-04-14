'use client';

import { useState } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import {
  useTravelApplications,
  useExportTravelApplicationsCSV,
  useUpdateTravelApplication,
  type TravelApplicationRow,
} from '@/hooks/use-travel-applications';
import type { TravelApplicationStatus } from '@earth-revibe/shared';

const STATUS_OPTIONS: { value: '' | TravelApplicationStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WAITLISTED', label: 'Waitlisted' },
];

const STATUS_BADGE: Record<TravelApplicationStatus, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  WAITLISTED: 'default',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TravelApplicationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | TravelApplicationStatus>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TravelApplicationRow | null>(null);

  const { data, isLoading, isError } = useTravelApplications({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  });
  const exportCSV = useExportTravelApplicationsCSV();
  const update = useUpdateTravelApplication();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Travel Applications</h1>
          <p className="text-sm text-medium-gray mt-1">
            Review Travel Circle applications submitted via /apply-for-trip-form
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={exportCSV.isPending}
          onClick={async () => {
            try {
              const result = await exportCSV.mutateAsync();
              if (result?.truncated) {
                toast.success(
                  `Exported ${result.exported?.toLocaleString()} of ${result.total?.toLocaleString()} applications (limit reached)`
                );
              } else {
                toast.success('Applications exported');
              }
            } catch (err: any) {
              toast.error(err.message || 'Failed to export');
            }
          }}
        >
          <Download size={16} />
          {exportCSV.isPending ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search by name, city, phone, Instagram, or app #"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | TravelApplicationStatus);
              setPage(1);
            }}
            className="w-full sm:w-44"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load applications</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.data?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No applications found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Application
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">City</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Phone</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Traveler</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Submitted</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-charcoal">
                        {row.applicationNumber}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setSelected(row)}
                          className="font-medium text-charcoal hover:text-deep-earth text-left"
                        >
                          {row.name}
                        </button>
                        <div className="text-xs text-medium-gray">Age {row.age}</div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{row.city}</td>
                      <td className="px-6 py-3 text-dark-gray">{row.phone}</td>
                      <td className="px-6 py-3 text-dark-gray capitalize">{row.travelerType}</td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(row.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelected(row)}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.pagination.page} of {data.pagination.totalPages} (
                  {data.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (data) => {
            try {
              const next = await update.mutateAsync({ id: selected.id, data });
              setSelected(next);
              toast.success('Application updated');
            } catch (err: any) {
              toast.error(err.message || 'Failed to update');
            }
          }}
          pending={update.isPending}
        />
      )}
    </div>
  );
}

function DetailDrawer({
  row,
  onClose,
  onUpdate,
  pending,
}: {
  row: TravelApplicationRow;
  onClose: () => void;
  onUpdate: (data: { status?: TravelApplicationStatus; reviewNotes?: string }) => Promise<void>;
  pending: boolean;
}) {
  const [notes, setNotes] = useState(row.reviewNotes ?? '');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-light-gray flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-medium-gray">{row.applicationNumber}</p>
            <h2 className="text-lg font-semibold text-charcoal">{row.name}</h2>
          </div>
          <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>
        </div>

        <div className="p-6 space-y-5 text-sm">
          <Field label="Age">{row.age}</Field>
          <Field label="City">{row.city}</Field>
          <Field label="Phone">{row.phone}</Field>
          <Field label="Instagram">{row.instagram}</Field>
          <Field label="Traveler type">
            <span className="capitalize">{row.travelerType}</span>
          </Field>
          <Field label="Trip preferences">
            <div className="flex flex-wrap gap-1.5">
              {row.tripPrefs.map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-md bg-off-white text-xs capitalize">
                  {p}
                </span>
              ))}
            </div>
          </Field>
          <Field label="Travelled with strangers?">{row.pastTravel}</Field>
          <Field label="Met someone before?">{row.meetBefore}</Field>
          <Field label="OK with curated selection?">{row.curated}</Field>
          <Field label="Why they want to join">
            <p className="whitespace-pre-wrap text-charcoal">{row.whyJoin}</p>
          </Field>
          <Field label="Submitted">{new Date(row.createdAt).toLocaleString('en-IN')}</Field>
          {row.reviewedAt ? (
            <Field label="Last reviewed">{new Date(row.reviewedAt).toLocaleString('en-IN')}</Field>
          ) : null}
        </div>

        <div className="border-t border-light-gray p-6 space-y-4 bg-off-white/40">
          <div>
            <label className="block text-xs font-semibold text-medium-gray uppercase tracking-wider mb-1.5">
              Review notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes — visible to admins only"
              className="w-full p-3 rounded-lg border border-light-gray bg-white text-sm outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() => onUpdate({ status: 'APPROVED', reviewNotes: notes })}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => onUpdate({ status: 'WAITLISTED', reviewNotes: notes })}
            >
              Waitlist
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => onUpdate({ status: 'REJECTED', reviewNotes: notes })}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => onUpdate({ reviewNotes: notes })}
            >
              Save notes
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-medium-gray uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-charcoal">{children}</div>
    </div>
  );
}
