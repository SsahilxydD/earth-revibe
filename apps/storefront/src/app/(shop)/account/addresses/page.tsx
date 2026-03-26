'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Pencil, Trash2, X, Star, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

interface AddressForm {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<Address[]>('/addresses'),
  });

  // Import address from Razorpay: opens Magic Checkout (phone → OTP → address).
  // When the user selects an address and dismisses before paying, we capture it.
  const importFromRazorpay = useCallback(async () => {
    setIsImporting(true);
    try {
      // Create a temporary ₹1 order for address collection
      const order = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
      }>('/checkout/address-collection');

      // Dynamically load Razorpay script
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.body.appendChild(script);
        });
      }

      // Open Magic Checkout — Razorpay handles phone → OTP → address
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Earth Revibe',
        description: 'Import your saved address',
        order_id: order.razorpayOrderId,
        handler: async (response: any) => {
          // Payment completed for ₹1 — fetch the shipping address from Razorpay order
          try {
            const result = await api.get<{ address: any }>(
              `/checkout/order-address/${response.razorpay_order_id}`
            );
            const addr = result?.address;
            if (addr && (addr.line1 || addr.city)) {
              await api.post('/addresses', {
                fullName: addr.fullName || '',
                phone: addr.phone || '',
                line1: addr.line1 || '',
                line2: addr.line2 || '',
                city: addr.city || '',
                state: addr.state || '',
                pinCode: addr.pinCode || '',
                isDefault: false,
              });
              queryClient.invalidateQueries({ queryKey: ['addresses'] });
              addToast('Address imported from Razorpay!', 'success');
            } else {
              addToast('No address found in Razorpay. Try again.', 'error');
            }
          } catch {
            addToast('Failed to import address', 'error');
          }
          setIsImporting(false);
        },
        modal: {
          ondismiss: () => {
            setIsImporting(false);
            // Even if dismissed, Razorpay's shipping-info callback may have
            // already sent the address to our server. Refetch to check.
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
          },
        },
        theme: { color: '#121212' },
      });
      rzp.open();
    } catch (err: any) {
      addToast(err?.message || 'Failed to open Razorpay', 'error');
      setIsImporting(false);
    }
  }, [addToast, queryClient]);

  const createMutation = useMutation({
    mutationFn: (data: AddressForm) => api.post('/addresses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      closeForm();
      addToast('Address added', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to add address', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressForm }) =>
      api.put(`/addresses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      closeForm();
      addToast('Address updated', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to update address', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      addToast('Address removed', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to delete address', 'error');
    },
  });

  const editingAddress = editingId ? addresses?.find((a) => a.id === editingId) : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    values: editingAddress
      ? {
          fullName: editingAddress.fullName,
          phone: editingAddress.phone,
          line1: editingAddress.line1,
          line2: editingAddress.line2 || '',
          city: editingAddress.city,
          state: editingAddress.state,
          pinCode: editingAddress.pinCode,
          isDefault: editingAddress.isDefault,
        }
      : {
          fullName: '',
          phone: '',
          line1: '',
          line2: '',
          city: '',
          state: '',
          pinCode: '',
          isDefault: false,
        },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const onSubmit = (data: AddressForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-sm font-bold uppercase tracking-wider">Saved Addresses</h2>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        Manage your delivery addresses for faster checkout.
      </p>

      {/* Action buttons */}
      {!showForm && (
        <div style={{ marginTop: 24 }} className="flex gap-3">
          <button
            onClick={importFromRazorpay}
            disabled={isImporting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--button-radius)] border border-[#2B84EA] px-3 py-3 text-xs font-semibold text-[#2B84EA] transition-colors hover:bg-[#2B84EA]/5 disabled:opacity-60 md:flex-none"
          >
            <Zap size={14} />
            {isImporting ? 'Importing...' : 'Import via Razorpay'}
          </button>
          <Button
            size="sm"
            className="flex-1 py-3 md:flex-none"
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
          >
            <Plus size={16} />
            Add Address
          </Button>
        </div>
      )}

      {/* Divider */}
      <hr
        style={{ marginTop: 28, marginBottom: 28, border: 'none', borderTop: '1px solid #e5e5e5' }}
      />

      {/* Address Form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              {editingId ? 'Edit Address' : 'New Address'}
            </h3>
            <button
              onClick={closeForm}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                error={errors.fullName?.message}
                {...register('fullName', {
                  required: 'Full name is required',
                })}
              />
              <Input
                label="Phone"
                type="tel"
                error={errors.phone?.message}
                {...register('phone', {
                  required: 'Phone is required',
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: 'Enter a valid 10-digit number',
                  },
                })}
              />
            </div>
            <Input
              label="Address Line 1"
              error={errors.line1?.message}
              {...register('line1', {
                required: 'Address is required',
              })}
            />
            <Input label="Address Line 2 (Optional)" {...register('line2')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="City"
                error={errors.city?.message}
                {...register('city', { required: 'City is required' })}
              />
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  State
                </label>
                <select
                  className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                  {...register('state', { required: 'State is required' })}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className="mt-1 text-xs text-[var(--color-sale)]">{errors.state.message}</p>
                )}
              </div>
              <Input
                label="Pin Code"
                error={errors.pinCode?.message}
                {...register('pinCode', {
                  required: 'Pin code is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Enter a valid 6-digit pin code',
                  },
                })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--color-primary)]"
                {...register('isDefault')}
              />
              <span className="text-[var(--color-muted)]">Set as default address</span>
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards */}
      {(!addresses || addresses.length === 0) && !showForm ? (
        <div
          style={{ paddingTop: 60, paddingBottom: 60 }}
          className="flex flex-col items-center text-center"
        >
          <MapPin size={40} strokeWidth={1} className="text-[#c0c0c0]" />
          <h3 style={{ marginTop: 24 }} className="text-xs font-bold uppercase tracking-[0.2em]">
            No saved addresses
          </h3>
          <p
            style={{ marginTop: 10, maxWidth: 240 }}
            className="text-xs leading-relaxed text-[#999]"
          >
            Add a delivery address to speed up checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses?.map((address) => (
            <div
              key={address.id}
              className="relative rounded-xl border border-[var(--color-border)] p-5"
            >
              {address.isDefault && (
                <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
                  <Star size={12} className="fill-current" />
                  Default Address
                </div>
              )}
              <p className="text-sm font-bold">{address.fullName}</p>
              <div className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--color-muted)]">
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.pinCode}
                </p>
              </div>
              <p className="mt-3 text-xs text-[var(--color-muted)]">Phone: {address.phone}</p>
              <div className="mt-4 flex gap-4 border-t border-[var(--color-border)] pt-4">
                <button
                  onClick={() => openEdit(address.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-sale)] hover:underline"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
