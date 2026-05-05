'use client';

import { useState } from 'react';
import {
  CreditCard,
  Wallet,
  Banknote,
  IndianRupee,
  Shield,
  CheckCircle,
  ExternalLink,
  Undo2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Card, Button, Input, Badge } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  note?: string;
}

export default function PaymentsSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'upi',
      name: 'UPI',
      description: 'Google Pay, PhonePe, Paytm',
      icon: <IndianRupee size={20} className="text-deep-earth" />,
      enabled: true,
    },
    {
      id: 'cards',
      name: 'Credit & Debit Cards',
      description: 'Visa, Mastercard, RuPay',
      icon: <CreditCard size={20} className="text-deep-earth" />,
      enabled: true,
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'All major banks',
      icon: <Banknote size={20} className="text-deep-earth" />,
      enabled: true,
    },
    {
      id: 'wallets',
      name: 'Wallets',
      description: 'Paytm, PhonePe, Amazon Pay',
      icon: <Wallet size={20} className="text-deep-earth" />,
      enabled: true,
    },
    {
      id: 'emi',
      name: 'EMI',
      description: 'Credit card EMI',
      icon: <CreditCard size={20} className="text-deep-earth" />,
      enabled: true,
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Collect payment on delivery',
      icon: <Banknote size={20} className="text-deep-earth" />,
      enabled: true,
      note: '\u20B90 extra charge for COD orders',
    },
  ]);

  const [captureMode, setCaptureMode] = useState<'automatic' | 'manual'>('automatic');
  const [allowPartialRefunds, setAllowPartialRefunds] = useState(true);
  const [autoRestockOnRefund, setAutoRestockOnRefund] = useState(true);
  const [refundProcessingTime, setRefundProcessingTime] = useState('5-7 business days');
  const [saving, setSaving] = useState(false);

  const toggleMethod = (id: string) => {
    setPaymentMethods((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Payment settings saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Payments</h2>
          <p className="text-sm text-medium-gray mt-0.5">Manage payment providers and methods</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Payment provider */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Payment provider</h3>
          </div>

          <div className="flex items-start gap-4 p-4 bg-off-white rounded-lg border border-light-gray">
            <div className="w-12 h-12 rounded-lg bg-deep-earth/10 flex items-center justify-center flex-shrink-0">
              <CreditCard size={24} className="text-deep-earth" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-charcoal">Razorpay</h4>
                <Badge variant="success">Connected</Badge>
                <Badge variant="info">Live mode</Badge>
              </div>
              <p className="text-sm text-medium-gray mb-3">
                Accept payments via UPI, cards, net banking, wallets, and more.
              </p>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-medium-gray">Key ID:</span>
                <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-light-gray text-charcoal">
                  rzp_live_****XXXX
                </code>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://dashboard.razorpay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-deep-earth hover:underline"
                >
                  <ExternalLink size={12} />
                  Razorpay Dashboard
                </a>
                <Button variant="secondary" size="sm">
                  Manage in Razorpay
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Accepted payment methods */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Accepted payment methods</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`relative flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                  method.enabled
                    ? 'border-deep-earth/30 bg-deep-earth/5'
                    : 'border-light-gray bg-white'
                }`}
              >
                {method.enabled && (
                  <CheckCircle size={16} className="absolute top-3 right-3 text-success" />
                )}
                <div className="w-10 h-10 rounded-lg bg-white border border-light-gray flex items-center justify-center flex-shrink-0">
                  {method.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">{method.name}</p>
                  <p className="text-xs text-medium-gray mt-0.5">{method.description}</p>
                  {method.note && method.enabled && (
                    <p className="text-xs text-deep-earth mt-1 flex items-center gap-1">
                      <AlertCircle size={10} />
                      {method.note}
                    </p>
                  )}
                  <button
                    onClick={() => toggleMethod(method.id)}
                    className="mt-2"
                    type="button"
                    aria-label={`Toggle ${method.name}`}
                  >
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        method.enabled ? 'bg-forest-green' : 'bg-light-gray'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          method.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Payment capture */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Payment capture</h3>
          </div>

          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                captureMode === 'automatic'
                  ? 'border-deep-earth/30 bg-deep-earth/5'
                  : 'border-light-gray bg-white hover:bg-off-white'
              }`}
            >
              <input
                type="radio"
                name="captureMode"
                value="automatic"
                checked={captureMode === 'automatic'}
                onChange={() => setCaptureMode('automatic')}
                className="mt-0.5 accent-deep-earth"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-charcoal">Automatic capture</p>
                  <Badge variant="success">Recommended</Badge>
                </div>
                <p className="text-xs text-medium-gray mt-1">
                  Payments are automatically captured when a customer completes checkout. This is
                  the default and recommended option for most stores.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                captureMode === 'manual'
                  ? 'border-deep-earth/30 bg-deep-earth/5'
                  : 'border-light-gray bg-white hover:bg-off-white'
              }`}
            >
              <input
                type="radio"
                name="captureMode"
                value="manual"
                checked={captureMode === 'manual'}
                onChange={() => setCaptureMode('manual')}
                className="mt-0.5 accent-deep-earth"
              />
              <div>
                <p className="text-sm font-medium text-charcoal">Manual capture</p>
                <p className="text-xs text-medium-gray mt-1">
                  Payments are authorized at checkout but not captured until you manually capture
                  them. Use this if you need to review orders before charging.
                </p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Refund settings */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Undo2 size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Refund settings</h3>
          </div>

          <div className="space-y-4">
            {/* Allow partial refunds */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">Allow partial refunds</p>
                <p className="text-xs text-medium-gray mt-0.5">
                  Enable staff to issue refunds for part of an order total
                </p>
              </div>
              <button
                onClick={() => setAllowPartialRefunds(!allowPartialRefunds)}
                type="button"
                aria-label="Toggle partial refunds"
              >
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    allowPartialRefunds ? 'bg-forest-green' : 'bg-light-gray'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      allowPartialRefunds ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="border-t border-light-gray" />

            {/* Auto-restock on refund */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">Auto-restock on refund</p>
                <p className="text-xs text-medium-gray mt-0.5">
                  Automatically add items back to inventory when a refund is issued
                </p>
              </div>
              <button
                onClick={() => setAutoRestockOnRefund(!autoRestockOnRefund)}
                type="button"
                aria-label="Toggle auto-restock on refund"
              >
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    autoRestockOnRefund ? 'bg-forest-green' : 'bg-light-gray'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      autoRestockOnRefund ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="border-t border-light-gray" />

            {/* Refund processing time */}
            <Input
              label="Refund processing time"
              value={refundProcessingTime}
              onChange={(e) => setRefundProcessingTime(e.target.value)}
              placeholder="e.g. 5-7 business days"
              helperText="Displayed to customers on order and refund pages"
            />

            <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
              <AlertCircle size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
              <p className="text-xs text-medium-gray">
                Refunds are processed via Razorpay. The actual processing time depends on the
                payment method used and Razorpay&apos;s processing schedule. Bank refunds may take
                5-10 business days.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Currency */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Currency</h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
            <div>
              <p className="text-sm font-medium text-charcoal">Store currency</p>
              <p className="text-xs text-medium-gray mt-0.5">
                All prices are displayed in this currency
              </p>
            </div>
            <span className="text-sm font-medium text-charcoal">Indian Rupee (INR &#8377;)</span>
          </div>

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <AlertCircle size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
            <p className="text-xs text-medium-gray">
              Currency is set at the account level and cannot be changed. Contact support if you
              need to update your store currency.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
