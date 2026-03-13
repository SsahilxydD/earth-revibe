"use client";

import Link from "next/link";
import {
  Bell,
  ShoppingCart,
  Package,
  CreditCard,
  Headset,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, type AdminNotification } from "@/hooks/use-notifications";

const notificationConfig: Record<
  string,
  {
    icon: typeof ShoppingCart;
    href: string;
    action: string;
    color: string;
    iconColor: string;
  }
> = {
  NEW_ORDER: {
    icon: ShoppingCart,
    href: "/orders",
    action: "View Orders",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600 bg-blue-100",
  },
  LOW_STOCK: {
    icon: Package,
    href: "/inventory",
    action: "Check Inventory",
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600 bg-amber-100",
  },
  OUT_OF_STOCK: {
    icon: AlertTriangle,
    href: "/inventory",
    action: "Check Inventory",
    color: "bg-red-50 border-red-200",
    iconColor: "text-red-600 bg-red-100",
  },
  FAILED_PAYMENT: {
    icon: CreditCard,
    href: "/orders",
    action: "View Orders",
    color: "bg-red-50 border-red-200",
    iconColor: "text-red-600 bg-red-100",
  },
  PENDING_SUPPORT: {
    icon: Headset,
    href: "/support-tickets",
    action: "View Tickets",
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600 bg-purple-100",
  },
};

function NotificationCard({ notification }: { notification: AdminNotification }) {
  const config = notificationConfig[notification.type];
  const Icon = config?.icon ?? Bell;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border ${config?.color ?? "bg-gray-50 border-gray-200"}`}
    >
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.iconColor ?? "text-gray-600 bg-gray-100"}`}
      >
        <Icon size={22} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-semibold text-charcoal">{notification.title}</h3>
          <Badge variant={notification.priority === "high" ? "error" : "warning"} className="text-[10px]">
            {notification.priority}
          </Badge>
        </div>
        <p className="text-sm text-dark-gray">{notification.message}</p>
      </div>

      <Link
        href={config?.href ?? "/notifications"}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-light-gray text-sm font-medium text-charcoal hover:bg-off-white transition-colors flex-shrink-0"
      >
        {config?.action ?? "View"}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();

  const highPriority = notifications?.filter((n) => n.priority === "high") ?? [];
  const mediumPriority = notifications?.filter((n) => n.priority === "medium") ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Notifications</h1>
        <p className="text-sm text-medium-gray mt-1">
          Real-time alerts for orders, inventory, and support
        </p>
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      ) : !notifications?.length ? (
        <Card>
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-off-white flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-medium-gray" />
            </div>
            <h3 className="text-base font-medium text-charcoal mb-1">All clear</h3>
            <p className="text-sm text-medium-gray">
              No active notifications. Everything is running smoothly.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* High priority */}
          {highPriority.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
                High Priority
              </h2>
              {highPriority.map((notification, index) => (
                <NotificationCard
                  key={`${notification.type}-${index}`}
                  notification={notification}
                />
              ))}
            </div>
          )}

          {/* Medium priority */}
          {mediumPriority.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider">
                Medium Priority
              </h2>
              {mediumPriority.map((notification, index) => (
                <NotificationCard
                  key={`${notification.type}-${index}`}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
