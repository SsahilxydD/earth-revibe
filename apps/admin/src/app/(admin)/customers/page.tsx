'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Eye, UserCheck, UserX, Download } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import {
  useCustomers,
  useToggleCustomerActive,
  useExportCustomersCSV,
} from '@/hooks/use-customers';

const activeOptions = [
  { value: '', label: 'All Customers' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useCustomers({
    page,
    limit: 20,
    search: search || undefined,
    isActive: isActive || undefined,
  });
  const toggleActive = useToggleCustomerActive();
  const exportCSV = useExportCustomersCSV();

  const handleToggle = async (id: string, name: string, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${name}"?`)) return;
    try {
      await toggleActive.mutateAsync(id);
      toast.success(`Customer ${action}d`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Customers</h1>
          <p className="text-sm text-medium-gray mt-1">View and manage customer accounts</p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              const result = await exportCSV.mutateAsync();
              if (result?.truncated) {
                toast.success(
                  `Exported ${result.exported?.toLocaleString()} of ${result.total?.toLocaleString()} customers (limit reached)`
                );
              } else {
                toast.success('Customers exported successfully');
              }
            } catch (err: any) {
              toast.error(err.message || 'Failed to export customers');
            }
          }}
          disabled={exportCSV.isPending}
        >
          <Download size={16} />
          {exportCSV.isPending ? 'Exporting...' : 'Export CSV'}
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
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={activeOptions}
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Customers table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load customers</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.customers?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No customers found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Orders</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Loyalty Pts
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Joined</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((customer: any) => (
                    <tr
                      key={customer.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-charcoal hover:text-deep-earth"
                        >
                          {customer.firstName} {customer.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{customer.email}</td>
                      <td className="px-6 py-3 text-charcoal">{customer._count?.orders || 0}</td>
                      <td className="px-6 py-3 text-charcoal">{customer.loyaltyPoints}</td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(customer.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={customer.isActive ? 'success' : 'error'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </Link>
                          <button
                            onClick={() =>
                              handleToggle(
                                customer.id,
                                `${customer.firstName} ${customer.lastName}`,
                                customer.isActive
                              )
                            }
                            className={`p-1.5 rounded-md transition-colors ${customer.isActive ? 'hover:bg-error/10' : 'hover:bg-success/10'}`}
                            title={customer.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {customer.isActive ? (
                              <UserX size={16} className="text-error" />
                            ) : (
                              <UserCheck size={16} className="text-success" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} customers)
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
                    disabled={page >= data.totalPages}
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
    </div>
  );
}
