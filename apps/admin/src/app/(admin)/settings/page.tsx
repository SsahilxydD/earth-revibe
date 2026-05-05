'use client';

import { useState } from 'react';
import { Store, Mail, MapPin, Globe, Clock, Save, Flag } from 'lucide-react';
import { Card, Button, Input, Select } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { api } from '@/lib/api-client';

export default function GeneralSettingsPage() {
  const [storeName, setStoreName] = useState('Earth Revibe');
  const [legalName, setLegalName] = useState('Earth Revibe');
  const [email, setEmail] = useState('earthrevibeofficial@gmail.com');
  const [phone, setPhone] = useState('9328706759');
  const [address, setAddress] = useState('nana chiloda, Nana Chiloda');
  const [city, setCity] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('382330');
  const [country] = useState('India');
  const [_currency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [unitSystem, setUnitSystem] = useState('metric');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [orderPrefix, setOrderPrefix] = useState('ER-');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        storeName,
        legalName,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        timezone,
        unitSystem,
        weightUnit,
        orderPrefix,
      });
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">General</h2>
          <p className="text-sm text-medium-gray mt-0.5">Basic information about your store</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Business details */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Business details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Your store name"
            />
            <Input
              label="Legal business name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Legal entity name"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <Flag size={14} className="text-medium-gray" />
            <span className="text-sm text-dark-gray">{country}</span>
          </div>
        </div>
      </Card>

      {/* Store contact details */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Store contact details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="store@example.com"
            />
            <Input
              label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </div>
      </Card>

      {/* Store address */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Store address</h3>
          </div>

          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
            <Input label="PIN Code" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <Globe size={14} className="text-medium-gray" />
            <span className="text-sm text-dark-gray">{country}</span>
          </div>
        </div>
      </Card>

      {/* Store defaults */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Store defaults</h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
            <div>
              <p className="text-sm font-medium text-charcoal">Currency display</p>
              <p className="text-xs text-medium-gray">The currency used across your store</p>
            </div>
            <span className="text-sm font-medium text-charcoal">Indian Rupee (INR ₹)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Time zone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'Asia/Kolkata', label: '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
                { value: 'Asia/Colombo', label: '(GMT+05:30) Sri Lanka' },
                { value: 'Asia/Dhaka', label: '(GMT+06:00) Dhaka' },
                { value: 'Asia/Dubai', label: '(GMT+04:00) Dubai' },
                { value: 'Europe/London', label: '(GMT+00:00) London' },
                { value: 'America/New_York', label: '(GMT-05:00) New York' },
              ]}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Unit system"
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value)}
                options={[
                  { value: 'metric', label: 'Metric system' },
                  { value: 'imperial', label: 'Imperial system' },
                ]}
              />
              <Select
                label="Weight unit"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                options={[
                  { value: 'kg', label: 'Kilogram (kg)' },
                  { value: 'g', label: 'Gram (g)' },
                  { value: 'lb', label: 'Pound (lb)' },
                  { value: 'oz', label: 'Ounce (oz)' },
                ]}
              />
            </div>
          </div>

          <Input
            label="Order ID prefix"
            value={orderPrefix}
            onChange={(e) => setOrderPrefix(e.target.value)}
            placeholder="e.g. ER-"
            helperText="Added before order numbers (e.g. ER-1001)"
          />
        </div>
      </Card>
    </div>
  );
}
