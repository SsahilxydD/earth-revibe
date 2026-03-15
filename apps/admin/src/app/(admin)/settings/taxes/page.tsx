"use client";

import { useState } from "react";
import {
  Receipt,
  IndianRupee,
  FileText,
  Calculator,
  CheckCircle,
  Save,
} from "lucide-react";
import { Card, Button, Input, Select } from "@/components/ui";
import { toast } from "@/components/ui/toast";

export default function TaxesSettingsPage() {
  // Tax settings
  const [chargeTaxes, setChargeTaxes] = useState(true);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);

  // GST configuration
  const [gstin, setGstin] = useState("");
  const [defaultGstRate, setDefaultGstRate] = useState("5");
  const [hsnCode, setHsnCode] = useState("");

  // Tax documents
  const [includeTaxInvoice, setIncludeTaxInvoice] = useState(true);
  const [showGstinOnInvoice, setShowGstinOnInvoice] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) {
      errs.gstin = "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)";
    }
    if (hsnCode && !/^[0-9]{4,8}$/.test(hsnCode)) {
      errs.hsnCode = "HSN code must be 4-8 digits";
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
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Tax settings saved");
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Taxes</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage tax rates and GST configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Tax settings */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Tax settings
            </h3>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<Receipt size={14} className="text-medium-gray" />}
              label="Charge taxes on products"
              description="Apply tax rates to products sold through your store"
              checked={chargeTaxes}
              onChange={setChargeTaxes}
            />
            <ToggleRow
              icon={<IndianRupee size={14} className="text-medium-gray" />}
              label="All prices include tax"
              description="Product prices are displayed inclusive of GST (Indian MRP standard)"
              checked={pricesIncludeTax}
              onChange={setPricesIncludeTax}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <CheckCircle size={14} className="text-forest-green" />
            <span className="text-xs text-dark-gray">
              In India, all MRP prices are inclusive of GST
            </span>
          </div>
        </div>
      </Card>

      {/* GST configuration */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              GST configuration
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GSTIN"
              value={gstin}
              onChange={(e) => { setGstin(e.target.value.toUpperCase()); if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: "" })); }}
              placeholder="22AAAAA0000A1Z5"
              helperText="Your GST Identification Number"
              error={errors.gstin}
              maxLength={15}
            />
            <Select
              label="Default GST rate"
              value={defaultGstRate}
              onChange={(e) => setDefaultGstRate(e.target.value)}
              options={[
                { value: "0", label: "0% GST" },
                { value: "5", label: "5% GST" },
                { value: "12", label: "12% GST" },
                { value: "18", label: "18% GST" },
                { value: "28", label: "28% GST" },
              ]}
            />
          </div>

          <Input
            label="HSN Code"
            value={hsnCode}
            onChange={(e) => { setHsnCode(e.target.value.replace(/\D/g, "")); if (errors.hsnCode) setErrors((prev) => ({ ...prev, hsnCode: "" })); }}
            placeholder="6109 for T-shirts"
            helperText="Harmonized System of Nomenclature code for your products"
            error={errors.hsnCode}
            maxLength={8}
          />

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <CheckCircle
              size={14}
              className="text-forest-green mt-0.5 flex-shrink-0"
            />
            <span className="text-xs text-dark-gray">
              GST rates for clothing: Items up to &#8377;1000 attract 5% GST,
              above &#8377;1000 attract 12% GST
            </span>
          </div>
        </div>
      </Card>

      {/* Tax regions */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Tax regions
            </h3>
          </div>

          <div className="border border-light-gray rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-off-white">
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Region
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Tax type
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-dark-gray">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-light-gray">
                  <td className="px-4 py-3 text-charcoal font-medium">
                    India
                  </td>
                  <td className="px-4 py-3 text-dark-gray">GST</td>
                  <td className="px-4 py-3 text-dark-gray">
                    <div className="space-y-1">
                      <p>
                        5%{" "}
                        <span className="text-medium-gray">
                          (items &#8806;&#8377;1000)
                        </span>
                      </p>
                      <p>
                        12%{" "}
                        <span className="text-medium-gray">
                          (items &gt;&#8377;1000)
                        </span>
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <CheckCircle
              size={14}
              className="text-forest-green mt-0.5 flex-shrink-0"
            />
            <span className="text-xs text-dark-gray">
              Inter-state (IGST) and intra-state (CGST+SGST) are handled
              automatically based on customer address
            </span>
          </div>
        </div>
      </Card>

      {/* Tax documents */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">
              Tax documents
            </h3>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<FileText size={14} className="text-medium-gray" />}
              label="Include tax invoice with order confirmation"
              description="Automatically attach a tax invoice to the order confirmation email"
              checked={includeTaxInvoice}
              onChange={setIncludeTaxInvoice}
            />
            <ToggleRow
              icon={<Receipt size={14} className="text-medium-gray" />}
              label="Show GSTIN on invoices"
              description="Display your GSTIN on all generated invoices"
              checked={showGstinOnInvoice}
              onChange={setShowGstinOnInvoice}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <CheckCircle size={14} className="text-forest-green" />
            <span className="text-xs text-dark-gray">
              Tax invoices are automatically generated for B2B orders
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle                                                            */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-forest-green" : "bg-light-gray"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
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
