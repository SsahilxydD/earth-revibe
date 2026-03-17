"use client";

import { useState, useEffect } from "react";
import {
  Save,
  UserCheck,
  Phone,
  Settings,
  Languages,
  Heart,
} from "lucide-react";
import { Card, Button, Input, Select } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-deep-earth/20 focus:ring-offset-1 ${
        checked ? "bg-forest-green" : "bg-light-gray"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {description && (
          <p className="text-xs text-medium-gray mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function CheckoutSettingsPage() {
  // Customer accounts
  const [requireLogin, setRequireLogin] = useState(false);
  const [allowGuest, setAllowGuest] = useState(true);
  const [collectPhone, setCollectPhone] = useState(true);

  // Customer contact
  const [contactMethod, setContactMethod] = useState<"email" | "email_or_phone">(
    "email_or_phone"
  );
  const [requireFullName, setRequireFullName] = useState(true);
  const [requireCompany, setRequireCompany] = useState(false);

  // Order processing
  const [autoFulfillDigital, setAutoFulfillDigital] = useState(false);
  const [autoArchive, setAutoArchive] = useState(true);
  const [sendOrderConfirmation, setSendOrderConfirmation] = useState(true);
  const [sendShippingConfirmation, setSendShippingConfirmation] = useState(true);

  // Checkout language
  const [language, setLanguage] = useState("en");
  const [completeButtonText, setCompleteButtonText] = useState("");

  // Tips
  const [allowTips, setAllowTips] = useState(false);
  const [tipPresets, setTipPresets] = useState("10,20,50");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((data: any) => {
      const cfg = data?.checkoutConfig;
      if (!cfg) return;
      if (cfg.requireLogin !== undefined) setRequireLogin(cfg.requireLogin);
      if (cfg.allowGuest !== undefined) setAllowGuest(cfg.allowGuest);
      if (cfg.collectPhone !== undefined) setCollectPhone(cfg.collectPhone);
      if (cfg.contactMethod) setContactMethod(cfg.contactMethod);
      if (cfg.requireFullName !== undefined) setRequireFullName(cfg.requireFullName);
      if (cfg.requireCompany !== undefined) setRequireCompany(cfg.requireCompany);
      if (cfg.autoFulfillDigital !== undefined) setAutoFulfillDigital(cfg.autoFulfillDigital);
      if (cfg.autoArchive !== undefined) setAutoArchive(cfg.autoArchive);
      if (cfg.sendOrderConfirmation !== undefined) setSendOrderConfirmation(cfg.sendOrderConfirmation);
      if (cfg.sendShippingConfirmation !== undefined) setSendShippingConfirmation(cfg.sendShippingConfirmation);
      if (cfg.language) setLanguage(cfg.language);
      if (cfg.completeButtonText) setCompleteButtonText(cfg.completeButtonText);
      if (cfg.allowTips !== undefined) setAllowTips(cfg.allowTips);
      if (cfg.tipPresets) setTipPresets(cfg.tipPresets);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        checkoutConfig: {
          requireLogin, allowGuest, collectPhone, contactMethod,
          requireFullName, requireCompany, autoFulfillDigital, autoArchive,
          sendOrderConfirmation, sendShippingConfirmation,
          language, completeButtonText, allowTips, tipPresets,
        },
      });
      toast.success("Checkout settings saved");
    } catch {
      toast.error("Failed to save checkout settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Checkout</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Configure how customers complete their purchases
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Customer accounts */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Customer accounts
            </h3>
          </div>

          <div className="divide-y divide-light-gray">
            <ToggleRow
              label="Require customer to log in before checkout"
              description="Customers must create an account or sign in to complete an order"
              checked={requireLogin}
              onChange={setRequireLogin}
            />
            <ToggleRow
              label="Allow guest checkout"
              description="Customers can check out without creating an account"
              checked={allowGuest}
              onChange={setAllowGuest}
            />
            <ToggleRow
              label="Enable phone number collection at checkout"
              description="Collect customer phone numbers during checkout"
              checked={collectPhone}
              onChange={setCollectPhone}
            />
          </div>
        </div>
      </Card>

      {/* Customer contact */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Customer contact
            </h3>
          </div>

          <div>
            <p className="text-sm font-medium text-charcoal mb-3">
              How customers can check out
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="contactMethod"
                  value="email"
                  checked={contactMethod === "email"}
                  onChange={() => setContactMethod("email")}
                  className="h-4 w-4 text-deep-earth border-light-gray focus:ring-deep-earth/20"
                />
                <span className="text-sm text-charcoal">Email only</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="contactMethod"
                  value="email_or_phone"
                  checked={contactMethod === "email_or_phone"}
                  onChange={() => setContactMethod("email_or_phone")}
                  className="h-4 w-4 text-deep-earth border-light-gray focus:ring-deep-earth/20"
                />
                <span className="text-sm text-charcoal">
                  Email or phone number
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-light-gray pt-4">
            <div className="divide-y divide-light-gray">
              <ToggleRow
                label="Require full name at checkout"
                description="First and last name will be required fields"
                checked={requireFullName}
                onChange={setRequireFullName}
              />
              <ToggleRow
                label="Require company name"
                description="Company name will be a required field at checkout"
                checked={requireCompany}
                onChange={setRequireCompany}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Order processing */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Order processing
            </h3>
          </div>

          <div className="divide-y divide-light-gray">
            <ToggleRow
              label="Auto-fulfill digital orders"
              description="Automatically mark digital product orders as fulfilled"
              checked={autoFulfillDigital}
              onChange={setAutoFulfillDigital}
            />
            <ToggleRow
              label="Auto-archive fulfilled orders"
              description="Move fulfilled orders to the archive automatically"
              checked={autoArchive}
              onChange={setAutoArchive}
            />
            <ToggleRow
              label="Send order confirmation email automatically"
              description="Email customers when their order is confirmed"
              checked={sendOrderConfirmation}
              onChange={setSendOrderConfirmation}
            />
            <ToggleRow
              label="Send shipping confirmation email automatically"
              description="Email customers when their order ships"
              checked={sendShippingConfirmation}
              onChange={setSendShippingConfirmation}
            />
          </div>
        </div>
      </Card>

      {/* Checkout language */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Languages size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Checkout language
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "Hindi" },
              ]}
            />
            <Input
              label="Custom button text"
              value={completeButtonText}
              onChange={(e) => setCompleteButtonText(e.target.value)}
              placeholder="Complete order"
              helperText="Override the default 'Complete order' button label"
            />
          </div>
        </div>
      </Card>

      {/* Tips / Additional charges */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Tips / Additional charges
            </h3>
          </div>

          <div className="divide-y divide-light-gray">
            <ToggleRow
              label="Allow customers to add tips at checkout"
              description="Show a tipping option during the checkout process"
              checked={allowTips}
              onChange={setAllowTips}
            />
          </div>

          {allowTips && (
            <div className="pt-1">
              <Input
                label="Tip preset amounts"
                value={tipPresets}
                onChange={(e) => setTipPresets(e.target.value)}
                placeholder="10,20,50"
                helperText="Comma-separated amounts in INR shown as quick-select options"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
