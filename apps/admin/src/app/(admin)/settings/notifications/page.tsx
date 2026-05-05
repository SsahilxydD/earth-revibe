'use client';

import { useState } from 'react';
import {
  Bell,
  Mail,
  Phone,
  MessageSquare,
  ShoppingCart,
  Package,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Card, Button, Input, Badge } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';

export default function NotificationsSettingsPage() {
  // Admin notifications
  const [newOrder, setNewOrder] = useState(true);
  const [orderFulfilled, setOrderFulfilled] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [failedPayment, setFailedPayment] = useState(true);
  const [newCustomer, setNewCustomer] = useState(false);
  const [newSupportTicket, setNewSupportTicket] = useState(true);
  const [adminEmail, setAdminEmail] = useState('earthrevibeofficial@gmail.com');

  // Customer notifications
  const [orderConfirmation, setOrderConfirmation] = useState(true);
  const [shippingConfirmation, setShippingConfirmation] = useState(true);
  const [deliveryConfirmation, setDeliveryConfirmation] = useState(true);
  const [refundConfirmation, setRefundConfirmation] = useState(true);
  const [accountWelcome, setAccountWelcome] = useState(true);
  const [abandonedCart, setAbandonedCart] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      errs.adminEmail = 'Enter a valid email address';
    }
    if (lowStockThreshold && (isNaN(Number(lowStockThreshold)) || Number(lowStockThreshold) < 1)) {
      errs.lowStockThreshold = 'Must be a positive number';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Notification settings saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Notifications</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage how you and your customers receive notifications
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Admin notifications */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Admin notifications</h3>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<ShoppingCart size={14} className="text-medium-gray" />}
              label="New order placed"
              description="Get notified when a customer places a new order"
              checked={newOrder}
              onChange={setNewOrder}
            />
            <ToggleRow
              icon={<Package size={14} className="text-medium-gray" />}
              label="Order fulfilled"
              description="Get notified when an order is marked as fulfilled"
              checked={orderFulfilled}
              onChange={setOrderFulfilled}
            />
            <ToggleRow
              icon={<AlertTriangle size={14} className="text-medium-gray" />}
              label="Order cancelled"
              description="Get notified when an order is cancelled"
              checked={orderCancelled}
              onChange={setOrderCancelled}
            />

            <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-off-white transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle size={14} className="text-medium-gray" />
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal">Low stock alert</p>
                  <p className="text-xs text-medium-gray mt-0.5">
                    Get notified when product stock falls below threshold
                  </p>
                  {lowStock && (
                    <div className="mt-2 w-32">
                      <Input
                        label="Threshold"
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => {
                          setLowStockThreshold(e.target.value);
                          if (errors.lowStockThreshold)
                            setErrors((prev) => ({ ...prev, lowStockThreshold: '' }));
                        }}
                        placeholder="10"
                        error={errors.lowStockThreshold}
                      />
                    </div>
                  )}
                </div>
              </div>
              <Toggle checked={lowStock} onChange={setLowStock} />
            </div>

            <ToggleRow
              icon={<AlertTriangle size={14} className="text-medium-gray" />}
              label="Failed payment"
              description="Get notified when a payment fails"
              checked={failedPayment}
              onChange={setFailedPayment}
            />
            <ToggleRow
              icon={<UserPlus size={14} className="text-medium-gray" />}
              label="New customer registration"
              description="Get notified when a new customer signs up"
              checked={newCustomer}
              onChange={setNewCustomer}
            />
            <ToggleRow
              icon={<MessageSquare size={14} className="text-medium-gray" />}
              label="New support ticket"
              description="Get notified when a customer submits a support ticket"
              checked={newSupportTicket}
              onChange={setNewSupportTicket}
            />
          </div>

          <div className="pt-2 border-t border-light-gray">
            <Input
              label="Admin notification email"
              type="email"
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value);
                if (errors.adminEmail) setErrors((prev) => ({ ...prev, adminEmail: '' }));
              }}
              placeholder="admin@example.com"
              helperText="All admin notifications will be sent to this email"
              error={errors.adminEmail}
            />
          </div>
        </div>
      </Card>

      {/* Customer notifications */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Customer notifications</h3>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<CheckCircle size={14} className="text-medium-gray" />}
              label="Order confirmation email"
              description="Send customers an email when their order is confirmed"
              checked={orderConfirmation}
              onChange={setOrderConfirmation}
            />
            <ToggleRow
              icon={<Package size={14} className="text-medium-gray" />}
              label="Shipping confirmation email"
              description="Send customers an email when their order is shipped"
              checked={shippingConfirmation}
              onChange={setShippingConfirmation}
            />
            <ToggleRow
              icon={<CheckCircle size={14} className="text-medium-gray" />}
              label="Delivery confirmation email"
              description="Send customers an email when their order is delivered"
              checked={deliveryConfirmation}
              onChange={setDeliveryConfirmation}
            />
            <ToggleRow
              icon={<CheckCircle size={14} className="text-medium-gray" />}
              label="Refund confirmation email"
              description="Send customers an email when their refund is processed"
              checked={refundConfirmation}
              onChange={setRefundConfirmation}
            />
            <ToggleRow
              icon={<UserPlus size={14} className="text-medium-gray" />}
              label="Account welcome email"
              description="Send a welcome email when a customer creates an account"
              checked={accountWelcome}
              onChange={setAccountWelcome}
            />
            <ToggleRow
              icon={<ShoppingCart size={14} className="text-medium-gray" />}
              label="Abandoned cart email"
              description="Send a reminder when a customer leaves items in their cart"
              checked={abandonedCart}
              onChange={setAbandonedCart}
            />
          </div>
        </div>
      </Card>

      {/* Notification channels */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Notification channels</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-off-white">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-deep-earth" />
                <div>
                  <p className="text-sm font-medium text-charcoal">Email</p>
                  <p className="text-xs text-medium-gray">Primary notification channel</p>
                </div>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-off-white">
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-medium-gray" />
                <div>
                  <p className="text-sm font-medium text-charcoal">SMS</p>
                  <p className="text-xs text-medium-gray">
                    Configure SMS notifications via Shiprocket
                  </p>
                </div>
              </div>
              <Badge>Not configured</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-off-white">
              <div className="flex items-center gap-3">
                <MessageSquare size={16} className="text-medium-gray" />
                <div>
                  <p className="text-sm font-medium text-charcoal">WhatsApp</p>
                  <p className="text-xs text-medium-gray">Coming soon</p>
                </div>
              </div>
              <Badge>Not configured</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle                                                            */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-forest-green' : 'bg-light-gray'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ToggleRow                                                         */
/* ------------------------------------------------------------------ */

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-off-white transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-charcoal">{label}</p>
          <p className="text-xs text-medium-gray mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
