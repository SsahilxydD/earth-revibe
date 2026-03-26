'use client';

import { useState } from 'react';
import { Shield, Building, FileText, Mail, CheckCircle, Save } from 'lucide-react';
import { Card, Button, Input, Select } from '@/components/ui';
import { toast } from '@/components/ui/toast';

export default function LegalSettingsPage() {
  // Business registration
  const [legalName, setLegalName] = useState('Earth Revibe');
  const [businessType, setBusinessType] = useState('sole_proprietorship');
  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');

  // Registered address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');

  // Contact information
  const [legalEmail, setLegalEmail] = useState('');
  const [legalPhone, setLegalPhone] = useState('');
  const [grievanceOfficerName, setGrievanceOfficerName] = useState('');
  const [grievanceOfficerEmail, setGrievanceOfficerEmail] = useState('');

  // Compliance
  const [displayGstin, setDisplayGstin] = useState(false);
  const [displayLegalName, setDisplayLegalName] = useState(true);
  const [acceptEcomRules, setAcceptEcomRules] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      errs.pan = 'PAN must be in format ABCDE1234F';
    }
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) {
      errs.gstin = 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)';
    }
    if (pin && !/^[1-9][0-9]{5}$/.test(pin)) {
      errs.pin = 'PIN must be a 6-digit number';
    }
    if (legalPhone && !/^\+?[0-9\s-]{7,15}$/.test(legalPhone)) {
      errs.legalPhone = 'Enter a valid phone number';
    }
    if (legalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalEmail)) {
      errs.legalEmail = 'Enter a valid email address';
    }
    if (grievanceOfficerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(grievanceOfficerEmail)) {
      errs.grievanceOfficerEmail = 'Enter a valid email address';
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
    toast.success('Legal settings saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Legal</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Business registration and legal compliance information
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Business registration */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Business registration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Legal business name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Your legal business name"
            />
            <Select
              label="Business type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              options={[
                { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
                { value: 'partnership', label: 'Partnership' },
                { value: 'llp', label: 'LLP' },
                { value: 'private_limited', label: 'Private Limited' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="PAN Number"
              value={pan}
              onChange={(e) => {
                setPan(e.target.value.toUpperCase());
                if (errors.pan) setErrors((prev) => ({ ...prev, pan: '' }));
              }}
              placeholder="ABCDE1234F"
              error={errors.pan}
              maxLength={10}
            />
            <Input
              label="GSTIN"
              value={gstin}
              onChange={(e) => {
                setGstin(e.target.value.toUpperCase());
                if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: '' }));
              }}
              placeholder="22AAAAA0000A1Z5"
              error={errors.gstin}
              maxLength={15}
            />
          </div>
        </div>
      </Card>

      {/* Registered address */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Registered address</h3>
          </div>

          <Input
            label="Address line 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Street address, building name"
          />
          <Input
            label="Address line 2"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Apartment, suite, area (optional)"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
            />
            <Input
              label="PIN Code"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                if (errors.pin) setErrors((prev) => ({ ...prev, pin: '' }));
              }}
              placeholder="PIN Code"
              error={errors.pin}
              maxLength={6}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <span className="text-sm text-dark-gray">Country:</span>
            <span className="text-sm font-medium text-charcoal">India</span>
          </div>
        </div>
      </Card>

      {/* Contact information */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Contact information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Legal email"
              type="email"
              value={legalEmail}
              onChange={(e) => {
                setLegalEmail(e.target.value);
                if (errors.legalEmail) setErrors((prev) => ({ ...prev, legalEmail: '' }));
              }}
              placeholder="legal@example.com"
              helperText="For legal and compliance notices"
              error={errors.legalEmail}
            />
            <Input
              label="Legal phone"
              value={legalPhone}
              onChange={(e) => {
                setLegalPhone(e.target.value);
                if (errors.legalPhone) setErrors((prev) => ({ ...prev, legalPhone: '' }));
              }}
              placeholder="+91 XXXXX XXXXX"
              error={errors.legalPhone}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer grievance officer name"
              value={grievanceOfficerName}
              onChange={(e) => setGrievanceOfficerName(e.target.value)}
              placeholder="Full name"
            />
            <Input
              label="Customer grievance officer email"
              type="email"
              value={grievanceOfficerEmail}
              onChange={(e) => {
                setGrievanceOfficerEmail(e.target.value);
                if (errors.grievanceOfficerEmail)
                  setErrors((prev) => ({ ...prev, grievanceOfficerEmail: '' }));
              }}
              placeholder="grievance@example.com"
              error={errors.grievanceOfficerEmail}
            />
          </div>
        </div>
      </Card>

      {/* Compliance */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Compliance</h3>
          </div>

          <div className="space-y-3">
            <ToggleRow
              icon={<CheckCircle size={14} className="text-medium-gray" />}
              label="Display GSTIN on website footer"
              description="Show your GSTIN in the storefront footer"
              checked={displayGstin}
              onChange={setDisplayGstin}
            />
            <ToggleRow
              icon={<Building size={14} className="text-medium-gray" />}
              label="Display legal entity name on invoices"
              description="Include your legal business name on all invoices"
              checked={displayLegalName}
              onChange={setDisplayLegalName}
            />
            <ToggleRow
              icon={<Shield size={14} className="text-medium-gray" />}
              label="Accept E-commerce consumer protection rules"
              description="Comply with Consumer Protection (E-Commerce) Rules, 2020"
              checked={acceptEcomRules}
              onChange={setAcceptEcomRules}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-off-white rounded-lg">
            <CheckCircle size={14} className="text-forest-green mt-0.5 flex-shrink-0" />
            <span className="text-xs text-dark-gray">
              As per Indian E-Commerce Rules 2020, sellers must display certain information on their
              website.
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
