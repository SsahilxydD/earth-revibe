'use client';

import { useState } from 'react';
import { Undo2, Truck, Shield, FileText, Save } from 'lucide-react';
import { Card, Button, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';

interface Policy {
  key: string;
  name: string;
  icon: React.ReactNode;
  content: string;
  showOnStorefront: boolean;
  lastUpdated: string;
}

const defaultPolicies: Policy[] = [
  {
    key: 'refund',
    name: 'Refund & Return Policy',
    icon: <Undo2 size={16} className="text-deep-earth" />,
    content:
      'We offer hassle-free returns within 7 days of delivery. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the returned item.',
    showOnStorefront: true,
    lastUpdated: 'February 20, 2026',
  },
  {
    key: 'shipping',
    name: 'Shipping Policy',
    icon: <Truck size={16} className="text-deep-earth" />,
    content:
      'All orders ship free across India via our logistics partner. Orders are typically dispatched within 1-2 business days. Estimated delivery: 5-7 business days.',
    showOnStorefront: true,
    lastUpdated: 'February 18, 2026',
  },
  {
    key: 'privacy',
    name: 'Privacy Policy',
    icon: <Shield size={16} className="text-deep-earth" />,
    content:
      'We are committed to protecting your privacy. We collect only essential information needed to process your orders and improve your shopping experience.',
    showOnStorefront: true,
    lastUpdated: 'February 15, 2026',
  },
  {
    key: 'terms',
    name: 'Terms of Service',
    icon: <FileText size={16} className="text-deep-earth" />,
    content:
      'By using our website and purchasing our products, you agree to these terms. All products are sold subject to availability.',
    showOnStorefront: true,
    lastUpdated: 'February 15, 2026',
  },
];

export default function PoliciesSettingsPage() {
  const [policies, setPolicies] = useState<Policy[]>(defaultPolicies);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Policies saved');
    setSaving(false);
  };

  const updatePolicy = (key: string, field: keyof Policy, value: string | boolean) => {
    setPolicies((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Policies</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage your store policies displayed to customers
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {policies.map((policy) => (
        <Card key={policy.key}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {policy.icon}
                <h3 className="text-sm font-semibold text-charcoal">{policy.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-medium-gray">Show on storefront</span>
                <Toggle
                  checked={policy.showOnStorefront}
                  onChange={(v) => updatePolicy(policy.key, 'showOnStorefront', v)}
                />
              </div>
            </div>

            <Textarea
              value={policy.content}
              onChange={(e) => updatePolicy(policy.key, 'content', e.target.value)}
              rows={4}
            />

            <p className="text-xs text-medium-gray">Last updated: {policy.lastUpdated}</p>
          </div>
        </Card>
      ))}
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
