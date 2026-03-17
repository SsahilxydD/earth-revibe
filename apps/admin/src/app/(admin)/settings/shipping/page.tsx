"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Truck,
  Package,
  MapPin,
  ExternalLink,
  CheckCircle,
  Globe,
  Ruler,
  Clock,
} from "lucide-react";
import { Card, Button, Input, Badge } from "@/components/ui";
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

export default function ShippingSettingsPage() {
  // Package dimensions
  const [defaultWeight, setDefaultWeight] = useState("0.5");
  const [defaultLength, setDefaultLength] = useState("20");
  const [defaultWidth, setDefaultWidth] = useState("15");
  const [defaultHeight, setDefaultHeight] = useState("10");

  // Delivery expectations
  const [estimatedDelivery, setEstimatedDelivery] = useState(
    "5-7 business days"
  );
  const [showEstimatedDelivery, setShowEstimatedDelivery] = useState(true);
  const [showTrackingLink, setShowTrackingLink] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/admin/settings").then((data: any) => {
      const cfg = data?.shippingConfig;
      if (!cfg) return;
      if (cfg.defaultWeight) setDefaultWeight(cfg.defaultWeight);
      if (cfg.defaultLength) setDefaultLength(cfg.defaultLength);
      if (cfg.defaultWidth) setDefaultWidth(cfg.defaultWidth);
      if (cfg.defaultHeight) setDefaultHeight(cfg.defaultHeight);
      if (cfg.estimatedDelivery) setEstimatedDelivery(cfg.estimatedDelivery);
      if (cfg.showEstimatedDelivery !== undefined) setShowEstimatedDelivery(cfg.showEstimatedDelivery);
      if (cfg.showTrackingLink !== undefined) setShowTrackingLink(cfg.showTrackingLink);
    }).catch(() => {});
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const numFields: Record<string, string> = { defaultWeight, defaultLength, defaultWidth, defaultHeight };
    for (const [key, val] of Object.entries(numFields)) {
      if (val && (isNaN(Number(val)) || Number(val) <= 0)) {
        errs[key] = "Must be a positive number";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the validation errors");
      return;
    }
    setSaving(true);
    try {
      await api.put("/admin/settings", {
        shippingConfig: {
          defaultWeight, defaultLength, defaultWidth, defaultHeight,
          estimatedDelivery, showEstimatedDelivery, showTrackingLink,
        },
      });
      toast.success("Shipping settings saved");
    } catch {
      toast.error("Failed to save shipping settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">
            Shipping & Delivery
          </h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage how you ship orders to customers
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Shipping policy */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Shipping policy
            </h3>
          </div>

          <div className="flex items-center gap-3 p-4 bg-forest-green/5 border border-forest-green/20 rounded-lg">
            <CheckCircle size={20} className="text-forest-green flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-charcoal">
                Free shipping on all orders
              </p>
              <p className="text-xs text-medium-gray mt-0.5">
                All orders ship free. Shiprocket shipping costs are absorbed as
                a business expense.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Shiprocket integration */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-deep-earth" />
              <h3 className="text-sm font-semibold text-charcoal">
                Shiprocket integration
              </h3>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-off-white rounded-lg">
              <MapPin size={14} className="text-medium-gray mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-charcoal">
                  Pickup address
                </p>
                <p className="text-sm text-dark-gray mt-0.5">
                  nana chiloda, Nana Chiloda, 382330 Ahmedabad Gujarat, India
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-off-white rounded-lg">
                <p className="text-xs text-medium-gray">Pickup pincode</p>
                <p className="text-sm font-medium text-charcoal mt-0.5">
                  382330
                </p>
              </div>
              <div className="p-3 bg-off-white rounded-lg">
                <p className="text-xs text-medium-gray">Default courier</p>
                <p className="text-sm font-medium text-charcoal mt-0.5">
                  Auto-selected by Shiprocket
                </p>
              </div>
            </div>
          </div>

          <a
            href="https://app.shiprocket.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-deep-earth hover:text-deep-earth/80 transition-colors"
          >
            Open Shiprocket Dashboard
            <ExternalLink size={14} />
          </a>
        </div>
      </Card>

      {/* Shipping zones */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Shipping zones
            </h3>
          </div>

          <div className="border border-light-gray rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-off-white border-b border-light-gray">
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Zone
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Rate
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-light-gray">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-charcoal font-medium">
                        Domestic (India)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Free</Badge>
                  </td>
                  <td className="px-4 py-3 text-dark-gray">All states</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <span className="text-charcoal font-medium">
                      International
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>Not available</Badge>
                  </td>
                  <td className="px-4 py-3 text-medium-gray">&mdash;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-medium-gray">
            Shipping zones are managed through Shiprocket
          </p>
        </div>
      </Card>

      {/* Package dimensions */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Package dimensions
            </h3>
          </div>

          <Input
            label="Default weight (kg)"
            type="number"
            value={defaultWeight}
            onChange={(e) => { setDefaultWeight(e.target.value); if (errors.defaultWeight) setErrors((prev) => ({ ...prev, defaultWeight: "" })); }}
            placeholder="0.5"
            error={errors.defaultWeight}
          />

          <div>
            <label className="text-sm font-medium text-charcoal block mb-1">
              Default dimensions (cm)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                value={defaultLength}
                onChange={(e) => { setDefaultLength(e.target.value); if (errors.defaultLength) setErrors((prev) => ({ ...prev, defaultLength: "" })); }}
                placeholder="Length"
                error={errors.defaultLength}
              />
              <Input
                type="number"
                value={defaultWidth}
                onChange={(e) => { setDefaultWidth(e.target.value); if (errors.defaultWidth) setErrors((prev) => ({ ...prev, defaultWidth: "" })); }}
                placeholder="Width"
                error={errors.defaultWidth}
              />
              <Input
                type="number"
                value={defaultHeight}
                onChange={(e) => { setDefaultHeight(e.target.value); if (errors.defaultHeight) setErrors((prev) => ({ ...prev, defaultHeight: "" })); }}
                placeholder="Height"
                error={errors.defaultHeight}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <p className="text-xs text-medium-gray text-center">L</p>
              <p className="text-xs text-medium-gray text-center">W</p>
              <p className="text-xs text-medium-gray text-center">H</p>
            </div>
          </div>

          <p className="text-xs text-medium-gray">
            Used as defaults when creating Shiprocket shipments
          </p>
        </div>
      </Card>

      {/* Delivery expectations */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Delivery expectations
            </h3>
          </div>

          <Input
            label="Estimated delivery time"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            placeholder="5-7 business days"
            helperText="Displayed to customers on product and checkout pages"
          />

          <div className="divide-y divide-light-gray">
            <ToggleRow
              label="Show estimated delivery on product pages"
              description="Display the estimated delivery time on each product page"
              checked={showEstimatedDelivery}
              onChange={setShowEstimatedDelivery}
            />
            <ToggleRow
              label="Show tracking link in order confirmation email"
              description="Include a Shiprocket tracking link in confirmation emails"
              checked={showTrackingLink}
              onChange={setShowTrackingLink}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
