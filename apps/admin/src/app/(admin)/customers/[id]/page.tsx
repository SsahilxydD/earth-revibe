"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Star, UserCheck, UserX } from "lucide-react";
import { Button, Badge, Card } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useCustomer, useToggleCustomerActive } from "@/hooks/use-customers";

const statusVariant: Record<string, "success" | "warning" | "default" | "error" | "info"> = {
  PLACED: "info",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "warning",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
  RETURNED: "error",
  REFUNDED: "default",
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useCustomer(id);
  const toggleActive = useToggleCustomerActive();

  const customer = data?.customer;

  const handleToggle = async () => {
    if (!customer) return;
    const action = customer.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this customer?`)) return;
    try {
      await toggleActive.mutateAsync(id);
      toast.success(`Customer ${action}d`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Customer not found</p>
        <Link href="/customers" className="text-deep-earth hover:underline mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">
              {customer.firstName} {customer.lastName}
            </h1>
            <Badge variant={customer.isActive ? "success" : "error"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">Customer since {formatDate(customer.createdAt)}</p>
        </div>
        <Button
          variant={customer.isActive ? "danger" : "secondary"}
          onClick={handleToggle}
          disabled={toggleActive.isPending}
        >
          {customer.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
          {customer.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <ShoppingBag size={20} className="text-info" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">{customer._count?.orders || 0}</p>
                  <p className="text-xs text-medium-gray">Total Orders</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <span className="text-success font-semibold text-sm">&#8377;</span>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">{formatPrice(customer.totalSpent || 0)}</p>
                  <p className="text-xs text-medium-gray">Total Spent</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Star size={20} className="text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">{customer.loyaltyPoints}</p>
                  <p className="text-xs text-medium-gray">Loyalty Points</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent orders */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Recent Orders</h3>
            {!customer.orders?.length ? (
              <p className="text-sm text-medium-gray">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-gray">
                      <th className="text-left pb-2 font-medium text-medium-gray">Order</th>
                      <th className="text-left pb-2 font-medium text-medium-gray">Date</th>
                      <th className="text-left pb-2 font-medium text-medium-gray">Status</th>
                      <th className="text-right pb-2 font-medium text-medium-gray">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order: any) => (
                      <tr key={order.id} className="border-b border-light-gray last:border-0">
                        <td className="py-2">
                          <Link href={`/orders/${order.orderNumber}`} className="text-deep-earth hover:underline">
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 text-dark-gray">{formatDate(order.createdAt)}</td>
                        <td className="py-2">
                          <Badge variant={statusVariant[order.status] || "default"}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium text-charcoal">
                          {formatPrice(order.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-medium-gray" />
                <span className="text-dark-gray">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-medium-gray" />
                  <span className="text-dark-gray">{customer.phone}</span>
                </div>
              )}
              <div className="pt-2 border-t border-light-gray">
                <p className="text-xs text-medium-gray">
                  Email {customer.emailVerified ? "verified" : "not verified"}
                </p>
                {customer.lastLoginAt && (
                  <p className="text-xs text-medium-gray mt-1">
                    Last login: {formatDate(customer.lastLoginAt)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Addresses */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Addresses ({customer.addresses?.length || 0})
            </h3>
            {!customer.addresses?.length ? (
              <p className="text-sm text-medium-gray">No addresses</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((addr: any) => (
                  <div key={addr.id} className="p-3 bg-off-white rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={12} className="text-medium-gray" />
                      <span className="font-medium text-charcoal">{addr.label}</span>
                      {addr.isDefault && <Badge variant="info">Default</Badge>}
                    </div>
                    <p className="text-dark-gray">{addr.fullName}</p>
                    <p className="text-dark-gray">{addr.line1}</p>
                    {addr.line2 && <p className="text-dark-gray">{addr.line2}</p>}
                    <p className="text-dark-gray">{addr.city}, {addr.state} {addr.pinCode}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
