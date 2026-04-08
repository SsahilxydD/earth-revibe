'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
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

  // Import address from Razorpay: opens Magic Checkout (phone -> OTP -> address).
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

      // Open Magic Checkout — Razorpay handles phone -> OTP -> address
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

  const defaultMutation = useMutation({
    mutationFn: (id: string) => api.put(`/addresses/${id}`, { isDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      addToast('Default address updated', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to set default address', 'error');
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
    <div style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          SAVED ADDRESSES
        </span>
        {!showForm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={importFromRazorpay}
              disabled={isImporting}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#2B84EA',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                opacity: isImporting ? 0.6 : 1,
              }}
            >
              <Zap size={12} />
              {isImporting ? 'Importing...' : 'Import via Razorpay'}
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                reset();
                setShowForm(true);
              }}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#000',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Add new
            </button>
          </div>
        )}
      </div>

      {/* Address Form */}
      {showForm && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 400,
                color: '#999',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              {editingId ? 'EDIT ADDRESS' : 'NEW ADDRESS'}
            </span>
            <button
              onClick={closeForm}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Full Name */}
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#999',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  FULL NAME
                </label>
                <input
                  {...register('fullName', { required: 'Full name is required' })}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#000',
                    border: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    outline: 'none',
                    padding: '4px 0 8px',
                    background: 'transparent',
                    borderRadius: 0,
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                  }}
                />
                {errors.fullName && (
                  <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              {/* Phone */}
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#999',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  PHONE
                </label>
                <input
                  type="tel"
                  {...register('phone', {
                    required: 'Phone is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Enter a valid 10-digit number',
                    },
                  })}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#000',
                    border: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    outline: 'none',
                    padding: '4px 0 8px',
                    background: 'transparent',
                    borderRadius: 0,
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                  }}
                />
                {errors.phone && (
                  <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Address Line 1 */}
            <div style={{ marginTop: 24 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#999',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                ADDRESS LINE 1
              </label>
              <input
                {...register('line1', { required: 'Address is required' })}
                style={{
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#000',
                  border: 'none',
                  borderBottom: '1px solid #E5E5E5',
                  outline: 'none',
                  padding: '4px 0 8px',
                  background: 'transparent',
                  borderRadius: 0,
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              />
              {errors.line1 && (
                <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                  {errors.line1.message}
                </p>
              )}
            </div>

            {/* Address Line 2 */}
            <div style={{ marginTop: 24 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#999',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                ADDRESS LINE 2 (OPTIONAL)
              </label>
              <input
                {...register('line2')}
                style={{
                  width: '100%',
                  fontSize: 14,
                  fontWeight: 300,
                  color: '#000',
                  border: 'none',
                  borderBottom: '1px solid #E5E5E5',
                  outline: 'none',
                  padding: '4px 0 8px',
                  background: 'transparent',
                  borderRadius: 0,
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                }}
              />
            </div>

            {/* City, State, Pin Code */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 24,
                marginTop: 24,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#999',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  CITY
                </label>
                <input
                  {...register('city', { required: 'City is required' })}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#000',
                    border: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    outline: 'none',
                    padding: '4px 0 8px',
                    background: 'transparent',
                    borderRadius: 0,
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                  }}
                />
                {errors.city && (
                  <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#999',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  STATE
                </label>
                <select
                  {...register('state', { required: 'State is required' })}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#000',
                    border: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    outline: 'none',
                    padding: '4px 0 8px',
                    background: 'transparent',
                    borderRadius: 0,
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                    {errors.state.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#999',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  PIN CODE
                </label>
                <input
                  {...register('pinCode', {
                    required: 'Pin code is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'Enter a valid 6-digit pin code',
                    },
                  })}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    fontWeight: 300,
                    color: '#000',
                    border: 'none',
                    borderBottom: '1px solid #E5E5E5',
                    outline: 'none',
                    padding: '4px 0 8px',
                    background: 'transparent',
                    borderRadius: 0,
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                  }}
                />
                {errors.pinCode && (
                  <p style={{ fontSize: 11, color: '#cc0000', marginTop: 4 }}>
                    {errors.pinCode.message}
                  </p>
                )}
              </div>
            </div>

            {/* Default checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 24,
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                {...register('isDefault')}
                style={{ width: 14, height: 14, accentColor: '#000' }}
              />
              Set as default address
            </label>

            {/* Save button */}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                width: '100%',
                marginTop: 32,
                padding: '14px 0',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 0,
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                opacity: createMutation.isPending || updateMutation.isPending ? 0.6 : 1,
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'SAVING...' : 'SAVE ADDRESS'}
            </button>
          </form>
        </div>
      )}

      {/* Address Cards */}
      {(!addresses || addresses.length === 0) && !showForm ? (
        <div
          style={{
            paddingTop: 60,
            paddingBottom: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>No saved addresses yet</p>
          <p style={{ fontSize: 12, fontWeight: 300, color: '#999', marginTop: 8 }}>
            Add a delivery address to speed up checkout.
          </p>
        </div>
      ) : (
        !showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
            {addresses?.map((address) => (
              <div
                key={address.id}
                style={{
                  border: address.isDefault ? '1px solid #E5E5E5' : '1px solid #F0F0F0',
                  borderRadius: 0,
                  padding: 20,
                }}
              >
                {/* Top row: name + default badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>
                    {address.fullName}
                  </span>
                  {address.isDefault && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 400,
                        color: '#000',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      DEFAULT
                    </span>
                  )}
                </div>

                {/* Address text */}
                <div style={{ marginTop: 10 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: '#999',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {address.line1}
                    {address.line2 ? (
                      <>
                        <br />
                        {address.line2}
                      </>
                    ) : null}
                    <br />
                    {address.city}, {address.state} {address.pinCode}
                  </p>
                </div>

                {/* Phone */}
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 300,
                    color: '#999',
                    marginTop: 10,
                    marginBottom: 0,
                  }}
                >
                  {address.phone}
                </p>

                {/* Actions row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    paddingTop: 6,
                    marginTop: 10,
                  }}
                >
                  <button
                    onClick={() => openEdit(address.id)}
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: '#000',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deleteMutation.isPending}
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#999',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontFamily: 'var(--font-inter), Inter, sans-serif',
                      opacity: deleteMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    Remove
                  </button>
                  {!address.isDefault && (
                    <button
                      onClick={() => defaultMutation.mutate(address.id)}
                      disabled={defaultMutation.isPending}
                      style={{
                        fontSize: 11,
                        fontWeight: 300,
                        color: '#999',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        opacity: defaultMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      Set as default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
