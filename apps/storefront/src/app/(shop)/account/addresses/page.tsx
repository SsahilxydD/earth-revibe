'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/* underline field style reuse */
const labelStyle = { fontSize: 10, fontWeight: 400 as const, color: '#999', letterSpacing: 1.5 };
const inputStyle = {
  width: '100%',
  fontSize: 14,
  fontWeight: 300 as const,
  color: '#000',
  border: 'none' as const,
  outline: 'none' as const,
  padding: 0,
  background: 'transparent',
};

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

  const importFromRazorpay = useCallback(async () => {
    setIsImporting(true);
    try {
      const order = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
      }>('/checkout/address-collection');

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

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: 'INR',
        name: 'Earth Revibe',
        description: 'Import your saved address',
        order_id: order.razorpayOrderId,
        handler: async (response: any) => {
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
      addToast(err?.message || 'Failed to set default', 'error');
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
    editingId ? updateMutation.mutate({ id: editingId, data }) : createMutation.mutate(data);
  };
  const handleDelete = (id: string) => {
    if (window.confirm('Delete this address?')) deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 28px 28px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          SAVED ADDRESSES
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {!showForm && (
            <>
              <button
                onClick={importFromRazorpay}
                disabled={isImporting}
                style={{
                  fontSize: 11,
                  fontWeight: 300,
                  color: '#999',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: isImporting ? 0.5 : 1,
                }}
              >
                {isImporting ? 'Importing…' : 'Import'}
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
                }}
              >
                + Add new
              </button>
            </>
          )}
        </div>
      </div>

      {/* Address Form */}
      {showForm && (
        <div style={{ marginTop: 20, padding: 20, border: '1px solid #E5E5E5' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
              {editingId ? 'EDIT ADDRESS' : 'NEW ADDRESS'}
            </span>
            <button
              onClick={closeForm}
              style={{
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Full Name */}
            <div>
              <label style={labelStyle}>FULL NAME</label>
              <div style={{ height: 10 }} />
              <input {...register('fullName', { required: 'Required' })} style={inputStyle} />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.fullName && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.fullName.message}
                </p>
              )}
            </div>
            {/* Phone */}
            <div>
              <label style={labelStyle}>PHONE</label>
              <div style={{ height: 10 }} />
              <input
                {...register('phone', {
                  required: 'Required',
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Valid 10-digit number' },
                })}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                style={inputStyle}
              />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.phone && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.phone.message}
                </p>
              )}
            </div>
            {/* Address Line 1 */}
            <div>
              <label style={labelStyle}>ADDRESS LINE 1</label>
              <div style={{ height: 10 }} />
              <input {...register('line1', { required: 'Required' })} style={inputStyle} />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.line1 && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.line1.message}
                </p>
              )}
            </div>
            {/* Address Line 2 */}
            <div>
              <label style={labelStyle}>ADDRESS LINE 2</label>
              <div style={{ height: 10 }} />
              <input
                {...register('line2')}
                placeholder="Optional"
                style={{ ...inputStyle, color: '#000' }}
              />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
            </div>
            {/* City */}
            <div>
              <label style={labelStyle}>CITY</label>
              <div style={{ height: 10 }} />
              <input {...register('city', { required: 'Required' })} style={inputStyle} />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.city && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.city.message}
                </p>
              )}
            </div>
            {/* State */}
            <div>
              <label style={labelStyle}>STATE</label>
              <div style={{ height: 10 }} />
              <select
                {...register('state', { required: 'Required' })}
                style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.state && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.state.message}
                </p>
              )}
            </div>
            {/* Pin Code */}
            <div>
              <label style={labelStyle}>PIN CODE</label>
              <div style={{ height: 10 }} />
              <input
                {...register('pinCode', {
                  required: 'Required',
                  pattern: { value: /^\d{6}$/, message: '6-digit pin' },
                })}
                inputMode="numeric"
                maxLength={6}
                style={inputStyle}
              />
              <div style={{ height: 10 }} />
              <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
              {errors.pinCode && (
                <p style={{ fontSize: 11, color: '#cf2929', marginTop: 4 }}>
                  {errors.pinCode.message}
                </p>
              )}
            </div>
            {/* Default checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
              }}
            >
              <input type="checkbox" {...register('isDefault')} style={{ accentColor: '#000' }} />
              Set as default address
            </label>
            {/* Save button */}
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{
                width: '100%',
                height: 50,
                backgroundColor: '#000',
                color: '#FFF',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                border: 'none',
                cursor: 'pointer',
                opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1,
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'SAVING...' : 'SAVE ADDRESS'}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {(!addresses || addresses.length === 0) && !showForm && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>No saved addresses</p>
        </div>
      )}

      {/* Address Cards — 20px gap, 1px border, 20px padding */}
      {addresses && addresses.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              style={{ border: `1px solid ${addr.isDefault ? '#E5E5E5' : '#F0F0F0'}`, padding: 20 }}
            >
              {/* Name row + DEFAULT badge */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>
                  {addr.fullName}
                </span>
                {addr.isDefault && (
                  <span style={{ fontSize: 9, fontWeight: 400, color: '#000', letterSpacing: 1.5 }}>
                    DEFAULT
                  </span>
                )}
              </div>
              {/* Address text */}
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#999',
                  lineHeight: 1.6,
                }}
              >
                {addr.line1}
                {addr.line2 && (
                  <>
                    <br />
                    {addr.line2}
                  </>
                )}
                <br />
                {addr.city}, {addr.state} — {addr.pinCode}
              </p>
              {/* Phone */}
              <p style={{ marginTop: 10, fontSize: 12, fontWeight: 300, color: '#999' }}>
                +91 {addr.phone.replace(/^\+91/, '')}
              </p>
              {/* Actions — 6px top padding, 16px gap */}
              <div style={{ marginTop: 10, paddingTop: 6, display: 'flex', gap: 16 }}>
                <button
                  onClick={() => openEdit(addr.id)}
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: '#000',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={deleteMutation.isPending}
                  style={{
                    fontSize: 11,
                    fontWeight: 300,
                    color: '#999',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
                {!addr.isDefault && (
                  <button
                    onClick={() => defaultMutation.mutate(addr.id)}
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#999',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
