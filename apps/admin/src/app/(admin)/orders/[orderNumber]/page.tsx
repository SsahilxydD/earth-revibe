'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Send,
  Truck,
  Tag,
  MapPin,
  CreditCard,
  Undo2,
  Printer,
  FileText,
  ExternalLink,
  Trash2,
  ArchiveRestore,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge, Card, Select } from '@earth-revibe/ui';
import { Modal } from '@earth-revibe/ui/modal';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { toast } from '@earth-revibe/ui/toast';
import {
  useOrder,
  useUpdateOrderStatus,
  useAddOrderNote,
  useCreateShipment,
  useAssignAWB,
  useGenerateLabel,
  useGenerateManifest,
  useOrderTracking,
  useRefundOrder,
  useArchiveOrder,
  useRestoreOrder,
  useSendDraftOtp,
  useVerifyDraftCustomer,
  useConfirmOfflineOrder,
  useUpdateDraftOrder,
  useUpdateOrderDate,
} from '@/hooks/use-orders';
import type { ConfirmOfflineOrderInput, OfflinePaymentMethod } from '@/types';
import { OrderItemsEditor, type LineItem } from '@/components/orders/order-items-editor';
import { todayLocalDate, isoToLocalDate, localDateToISO } from '@/lib/order-date';

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  DRAFT: 'default',
  PENDING: 'info',
  CONFIRMED: 'info',
  SHIPPING: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

const confirmStatusOptions = [
  { value: 'DELIVERED', label: 'Delivered (handed over in person)' },
  { value: 'CONFIRMED', label: 'Confirmed (will ship later)' },
  { value: 'SHIPPING', label: 'Shipping' },
];

const confirmPaymentOptions = [
  { value: '', label: 'Payment method (optional)' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
];

const statusFlow = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const { data, isLoading } = useOrder(orderNumber);
  const { data: trackingData } = useOrderTracking(orderNumber);
  const updateStatus = useUpdateOrderStatus();
  const addNote = useAddOrderNote();
  const createShipment = useCreateShipment();
  const assignAWB = useAssignAWB();
  const generateLabel = useGenerateLabel();
  const generateManifest = useGenerateManifest();
  const refundOrder = useRefundOrder();
  const archiveOrder = useArchiveOrder();
  const restoreOrder = useRestoreOrder();
  const sendDraftOtp = useSendDraftOtp();
  const verifyDraftCustomer = useVerifyDraftCustomer();
  const confirmOfflineOrder = useConfirmOfflineOrder();
  const updateDraft = useUpdateDraftOrder();
  const updateOrderDate = useUpdateOrderDate();

  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  // Draft offline-order flow: verify the temp customer, then confirm.
  const [draftOtpSent, setDraftOtpSent] = useState(false);
  const [draftOtpCode, setDraftOtpCode] = useState('');
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName] = useState('');
  const [confirmStatus, setConfirmStatus] = useState('DELIVERED');
  const [confirmPayment, setConfirmPayment] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  // Order date set at confirm time ('' = keep the draft's current date).
  const [confirmDate, setConfirmDate] = useState('');

  // Standalone order-date editor (non-draft offline orders).
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState('');

  // Inline draft editing: items + temp customer (name/phone) + totals.
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editShipping, setEditShipping] = useState('0');
  const [editTax, setEditTax] = useState('0');

  const order = (data as any)?.order ?? data;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await updateStatus.mutateAsync({
        orderNumber,
        status: newStatus,
        note: statusNote || undefined,
      });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      setNewStatus('');
      setStatusNote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await addNote.mutateAsync({ orderNumber, content: noteContent, isInternal: true });
      toast.success('Note added');
      setNoteContent('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    }
  };

  const handleCreateShipment = async () => {
    try {
      await createShipment.mutateAsync(orderNumber);
      toast.success('Shiprocket shipment created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment');
    }
  };

  const handleAssignAWB = async () => {
    try {
      const result = await assignAWB.mutateAsync({ orderNumber });
      toast.success(`AWB assigned: ${result.awbCode}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign AWB');
    }
  };

  const handleGenerateLabel = async () => {
    try {
      const result = await generateLabel.mutateAsync(orderNumber);
      if (result.labelUrl) window.open(result.labelUrl, '_blank');
      toast.success('Shipping label generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate label');
    }
  };

  const handleGenerateManifest = async () => {
    try {
      const result = await generateManifest.mutateAsync(orderNumber);
      if (result.manifestUrl) window.open(result.manifestUrl, '_blank');
      toast.success('Manifest generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate manifest');
    }
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    try {
      await refundOrder.mutateAsync({ orderNumber, reason: refundReason });
      toast.success('Refund initiated successfully');
      setShowRefundModal(false);
      setRefundReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate refund');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveOrder.mutateAsync({
        orderNumber,
        reason: archiveReason || undefined,
      });
      toast.success(`Order archived`);
      setShowArchiveModal(false);
      setArchiveReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive order');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreOrder.mutateAsync(orderNumber);
      toast.success('Order restored');
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore order');
    }
  };

  const handleSendDraftOtp = async () => {
    try {
      await sendDraftOtp.mutateAsync({ orderNumber });
      setDraftOtpSent(true);
      toast.success('OTP sent to the customer on WhatsApp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyDraft = async () => {
    if (!/^\d{6}$/.test(draftOtpCode.trim())) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    try {
      await verifyDraftCustomer.mutateAsync({
        orderNumber,
        code: draftOtpCode.trim(),
        firstName: draftFirstName.trim() || undefined,
        lastName: draftLastName.trim() || undefined,
      });
      toast.success('Customer verified');
      setDraftOtpSent(false);
      setDraftOtpCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify OTP');
    }
  };

  const handleConfirmOrder = async () => {
    const picked = confirmDate || isoToLocalDate(order.createdAt);
    const dateChanged = picked !== isoToLocalDate(order.createdAt);
    try {
      await confirmOfflineOrder.mutateAsync({
        orderNumber,
        status: confirmStatus as ConfirmOfflineOrderInput['status'],
        paymentMethod: (confirmPayment || undefined) as OfflinePaymentMethod | undefined,
        note: confirmNote.trim() || undefined,
        orderDate: dateChanged ? localDateToISO(picked) : undefined,
      });
      toast.success('Offline order confirmed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm order');
    }
  };

  const handleSaveDate = async () => {
    const changed = dateInput && dateInput !== isoToLocalDate(order.createdAt);
    if (!changed) {
      setEditingDate(false);
      return;
    }
    try {
      await updateOrderDate.mutateAsync({ orderNumber, orderDate: localDateToISO(dateInput) });
      toast.success('Order date updated');
      setEditingDate(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order date');
    }
  };

  // Pre-fill the inline editor from the current draft. Live stock isn't known
  // for existing lines (enforceStock={false} on the editor); it's re-checked at
  // confirm time. Name/phone fall back to a verified user if the draft already
  // has one linked.
  const startEdit = () => {
    setEditItems(
      (order.items ?? []).map((it: any) => ({
        lineId: crypto.randomUUID(),
        variantId: it.variantId,
        productName: it.productName,
        productImage: it.productImage ?? null,
        variantSize: it.variantSize ?? '',
        variantColor: it.variantColor ?? '',
        stock: 0,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        offlinePrice: null,
        variants: [],
      }))
    );
    setEditName(
      order.guestName || `${order.user?.firstName ?? ''} ${order.user?.lastName ?? ''}`.trim()
    );
    setEditPhone(order.guestPhone || order.user?.phone || '');
    setEditDiscount(String(order.discountAmount ?? 0));
    setEditShipping(String(order.shippingAmount ?? 0));
    setEditTax(String(order.taxAmount ?? 0));
    setIsEditing(true);
  };

  const handleSaveDraftEdit = async () => {
    if (!editName.trim()) {
      toast.error('Enter the customer name');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(editPhone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    if (editItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    try {
      await updateDraft.mutateAsync({
        orderNumber,
        guestName: editName.trim(),
        guestPhone: editPhone.trim(),
        items: editItems.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discountAmount: Number(editDiscount) || 0,
        shippingAmount: Number(editShipping) || 0,
        taxAmount: Number(editTax) || 0,
      });
      toast.success('Draft updated');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update draft');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Order not found</p>
        <Link href="/orders" className="text-deep-earth hover:underline mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const isArchived = !!order.deletedAt;
  const isOffline = order.source === 'OFFLINE';
  // Unconfirmed offline draft: customer captured but payment not received and
  // stock not reserved. Verify the customer (OTP) then confirm to finalize.
  const isDraft = order.status === 'DRAFT';
  const customerVerified = !!order.user;
  // DELIVERED stays out of the "final" bucket so admin can still approve a
  // post-delivery return → RETURNED.
  const cancelledOrFinal = ['CANCELLED', 'RETURNED'].includes(order.status);
  const canFulfill = ['CONFIRMED'].includes(order.status) && !isOffline;
  const canRefund =
    !isOffline && order.payment?.status === 'CAPTURED' && order.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Archived banner */}
      {isArchived && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>
              This order is <strong>archived</strong> and hidden from lists, customer history, and
              analytics. Data is retained.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRestore}
            disabled={restoreOrder.isPending}
          >
            <ArchiveRestore size={14} className="mr-1" />
            {restoreOrder.isPending ? 'Restoring…' : 'Restore'}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-charcoal">#{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status] || 'default'}>
              {order.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={isOffline ? 'warning' : 'info'}>
              {isOffline ? 'Offline (manual)' : 'Online'}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">
            {formatDateTime(order.createdAt)} &middot; {order.items.length} item
            {order.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canRefund && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRefundModal(true)}
            className="text-red-600 hover:bg-red-50"
          >
            <Undo2 size={16} className="mr-1" /> Refund
          </Button>
        )}
        {!isArchived && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchiveModal(true)}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-1" /> Archive
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items — inline-editable for an unconfirmed DRAFT */}
          {isEditing ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-charcoal">Editing draft</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveDraftEdit} disabled={updateDraft.isPending}>
                    {updateDraft.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
              <OrderItemsEditor
                items={editItems}
                onItemsChange={setEditItems}
                discountAmount={editDiscount}
                shippingAmount={editShipping}
                taxAmount={editTax}
                onDiscountChange={setEditDiscount}
                onShippingChange={setEditShipping}
                onTaxChange={setEditTax}
                enforceStock={false}
              />
            </>
          ) : (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-charcoal">Items</h3>
                {isDraft && !isArchived && (
                  <Button variant="secondary" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {order.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 py-2 border-b border-light-gray last:border-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center flex-shrink-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package size={20} className="text-medium-gray" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal truncate">{item.productName}</p>
                      <p className="text-xs text-medium-gray">
                        {item.variantSize} / {item.variantColor} &middot; Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-charcoal">{formatPrice(item.totalPrice)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-light-gray space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-medium-gray">Subtotal</span>
                  <span className="text-charcoal">{formatPrice(order.subtotal)}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount {order.discountCode ? `(${order.discountCode.code})` : ''}</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                {Number(order.shippingAmount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-medium-gray">Shipping</span>
                    <span className="text-charcoal">{formatPrice(order.shippingAmount)}</span>
                  </div>
                )}
                {order.loyaltyPointsUsed > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Loyalty Points ({order.loyaltyPointsUsed} pts)</span>
                    <span>-{formatPrice(order.loyaltyPointsUsed)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-light-gray">
                  <span className="text-charcoal">Total</span>
                  <span className="text-charcoal">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Fulfillment / Shipping */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} className="text-deep-earth" />
              <h3 className="text-base font-semibold text-charcoal">Fulfillment</h3>
            </div>

            {/* Shiprocket status */}
            {order.shiprocketOrderId ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-medium-gray block">Shiprocket Order</span>
                    <span className="text-charcoal font-medium">{order.shiprocketOrderId}</span>
                  </div>
                  {order.awbCode && (
                    <div>
                      <span className="text-medium-gray block">AWB / Tracking</span>
                      <span className="text-charcoal font-medium">{order.awbCode}</span>
                    </div>
                  )}
                  {order.courierName && (
                    <div>
                      <span className="text-medium-gray block">Courier</span>
                      <span className="text-charcoal font-medium">{order.courierName}</span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <div>
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-deep-earth hover:underline text-sm inline-flex items-center gap-1"
                      >
                        Track Shipment <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-light-gray">
                  {!order.awbCode && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleAssignAWB}
                      disabled={assignAWB.isPending}
                    >
                      <Tag size={14} className="mr-1" />{' '}
                      {assignAWB.isPending ? 'Assigning...' : 'Assign AWB'}
                    </Button>
                  )}
                  {order.shiprocketShipmentId && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleGenerateLabel}
                        disabled={generateLabel.isPending}
                      >
                        <Printer size={14} className="mr-1" />{' '}
                        {generateLabel.isPending ? 'Generating...' : 'Print Label'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleGenerateManifest}
                        disabled={generateManifest.isPending}
                      >
                        <FileText size={14} className="mr-1" />{' '}
                        {generateManifest.isPending ? 'Generating...' : 'Print Manifest'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Tracking activities */}
                {trackingData?.tracked && trackingData.activities?.length > 0 && (
                  <div className="pt-3 border-t border-light-gray">
                    <h4 className="text-sm font-medium text-charcoal mb-3">Tracking Updates</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {trackingData.activities.map((activity: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 ${i === 0 ? 'bg-deep-earth' : 'bg-light-gray'}`}
                            />
                            {i < trackingData.activities.length - 1 && (
                              <div className="w-0.5 flex-1 bg-light-gray mt-1" />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className="text-charcoal">{activity.activity || activity.status}</p>
                            <p className="text-xs text-medium-gray">
                              {activity.location} &middot; {activity.date}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : canFulfill ? (
              <div className="text-center py-6">
                <Truck size={32} className="mx-auto text-medium-gray mb-3" />
                <p className="text-sm text-medium-gray mb-4">No shipment created yet</p>
                <Button onClick={handleCreateShipment} disabled={createShipment.isPending}>
                  <Truck size={16} className="mr-2" />
                  {createShipment.isPending ? 'Creating Shipment...' : 'Create Shiprocket Shipment'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-medium-gray py-4">
                {order.status === 'PENDING'
                  ? 'Confirm the order before creating a shipment.'
                  : 'No shipment for this order.'}
              </p>
            )}
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Status History</h3>
            <div className="space-y-4">
              {order.statusHistory?.map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${i === 0 ? 'bg-deep-earth' : 'bg-light-gray'}`}
                    />
                    {i < order.statusHistory.length - 1 && (
                      <div className="w-0.5 flex-1 bg-light-gray mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[entry.status] || 'default'}>
                        {entry.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-medium-gray">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    {entry.note && <p className="text-sm text-dark-gray mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Internal Notes</h3>
            <div className="space-y-3 mb-4">
              {order.notes?.length === 0 && (
                <p className="text-sm text-medium-gray">No notes yet</p>
              )}
              {order.notes?.map((note: any) => (
                <div key={note.id} className="p-3 bg-off-white rounded-lg">
                  <p className="text-sm text-charcoal">{note.content}</p>
                  <p className="text-xs text-medium-gray mt-1">
                    {note.user?.firstName} {note.user?.lastName} &middot;{' '}
                    {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add an internal note..."
                className="flex-1 px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim() || addNote.isPending}
              >
                <Send size={14} />
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Draft offline order: verify the temp customer, then confirm */}
          {isDraft && !isArchived && !isEditing && (
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-deep-earth" />
                <h3 className="text-base font-semibold text-charcoal">Confirm offline order</h3>
              </div>
              <p className="text-xs text-medium-gray mb-4">
                Unconfirmed draft — no stock is held yet. Verify the customer by OTP, then confirm
                once payment has been received.
              </p>

              {/* Step 1 — verify the customer */}
              {customerVerified ? (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 size={18} className="text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="text-sm min-w-0">
                    <p className="font-medium text-charcoal">Customer verified</p>
                    <p className="text-xs text-medium-gray mt-0.5 truncate">
                      {`${order.user?.firstName ?? ''} ${order.user?.lastName ?? ''}`.trim()}
                      {order.user?.phone ? ` · +91 ${order.user.phone}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                    <p className="font-medium">Unverified customer</p>
                    <p className="text-xs mt-0.5">
                      {order.guestName || '—'}
                      {order.guestPhone ? ` · +91 ${order.guestPhone}` : ''}
                    </p>
                  </div>
                  {!draftOtpSent ? (
                    <Button
                      size="sm"
                      onClick={handleSendDraftOtp}
                      disabled={sendDraftOtp.isPending}
                    >
                      {sendDraftOtp.isPending ? 'Sending…' : 'Send verification OTP'}
                    </Button>
                  ) : (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draftOtpCode}
                        onChange={(e) =>
                          setDraftOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="6-digit code from WhatsApp"
                        className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 tracking-widest"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={draftFirstName}
                          onChange={(e) => setDraftFirstName(e.target.value)}
                          placeholder="First name (opt.)"
                          className="px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                        />
                        <input
                          type="text"
                          value={draftLastName}
                          onChange={(e) => setDraftLastName(e.target.value)}
                          placeholder="Last name"
                          className="px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          onClick={handleVerifyDraft}
                          disabled={verifyDraftCustomer.isPending || draftOtpCode.length !== 6}
                        >
                          {verifyDraftCustomer.isPending ? 'Verifying…' : 'Verify'}
                        </Button>
                        <button
                          type="button"
                          onClick={handleSendDraftOtp}
                          disabled={sendDraftOtp.isPending}
                          className="text-xs text-medium-gray hover:text-charcoal underline flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Resend
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2 — confirm into a real offline order */}
              <div className="space-y-3 pt-4 border-t border-light-gray">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Order date</label>
                  <input
                    type="date"
                    value={confirmDate || isoToLocalDate(order.createdAt)}
                    max={todayLocalDate()}
                    min="2020-01-01"
                    onChange={(e) => setConfirmDate(e.target.value)}
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Final status
                  </label>
                  <Select
                    options={confirmStatusOptions}
                    value={confirmStatus}
                    onChange={(e) => setConfirmStatus(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Payment method
                  </label>
                  <Select
                    options={confirmPaymentOptions}
                    value={confirmPayment}
                    onChange={(e) => setConfirmPayment(e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
                <Button
                  className="w-full"
                  onClick={handleConfirmOrder}
                  disabled={!customerVerified || confirmOfflineOrder.isPending}
                >
                  {confirmOfflineOrder.isPending
                    ? 'Confirming…'
                    : customerVerified
                      ? 'Confirm order'
                      : 'Verify customer to confirm'}
                </Button>
                <p className="text-xs text-medium-gray">
                  Confirming reserves stock and records the sale. The order then appears in the
                  customer&apos;s account.
                </p>
              </div>
            </Card>
          )}

          {/* Update Status */}
          {!cancelledOrFinal && !isDraft && (
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Update Status</h3>
              <div className="space-y-3">
                {(() => {
                  // Carrier-owned-status lock: once an AWB exists, Shiprocket
                  // drives SHIPPING and DELIVERED. Admin can still cancel
                  // pre-pickup or approve a post-delivery return.
                  const CARRIER_OWNED = new Set(['SHIPPING', 'DELIVERED']);
                  const carrierLocked = !!order.awbCode;
                  const availableOptions = carrierLocked
                    ? statusFlow.filter((opt) => !CARRIER_OWNED.has(opt.value))
                    : statusFlow;
                  return (
                    <>
                      {carrierLocked && (
                        <p className="text-xs text-medium-gray bg-off-white border border-light-gray rounded-md px-2.5 py-2 leading-snug">
                          AWB <span className="font-medium text-charcoal">{order.awbCode}</span> is
                          assigned — Shiprocket owns Shipping / Delivered transitions. Cancel and
                          Returned remain available for manual override.
                        </p>
                      )}
                      <Select
                        options={[{ value: '', label: 'Select new status' }, ...availableOptions]}
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      />
                    </>
                  );
                })()}
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateStatus.isPending}
                  className="w-full"
                >
                  Update Status
                </Button>
              </div>
            </Card>
          )}

          {/* Order date — backdate an offline sale entered after the fact */}
          {isOffline && !isDraft && !isArchived && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-charcoal">Order date</h3>
                {!editingDate && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDateInput(isoToLocalDate(order.createdAt));
                      setEditingDate(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {editingDate ? (
                <div className="space-y-3">
                  <input
                    type="date"
                    value={dateInput}
                    max={todayLocalDate()}
                    min="2020-01-01"
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                  <p className="text-xs text-medium-gray">
                    Backdating changes which day this sale counts toward in revenue &amp; reports.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDate} disabled={updateOrderDate.isPending}>
                      {updateOrderDate.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDate(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-charcoal">{formatDate(order.createdAt)}</p>
              )}
            </Card>
          )}

          {/* Customer info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold text-charcoal">Customer</h3>
            </div>
            {isEditing && isDraft ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit Indian mobile"
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
                <p className="text-xs text-medium-gray">
                  Editing the draft customer. Verify by OTP after saving to link a real account.
                </p>
              </div>
            ) : order.user ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-charcoal">
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-medium-gray">{order.user.email}</p>
                {order.user.phone && <p className="text-medium-gray">{order.user.phone}</p>}
                <Link
                  href={`/customers/${order.user.id}`}
                  className="text-deep-earth hover:underline text-xs inline-block mt-1"
                >
                  View customer
                </Link>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-charcoal">{order.guestName || 'Guest'}</p>
                {order.guestPhone && <p className="text-medium-gray">+91 {order.guestPhone}</p>}
                <p className="text-xs text-amber-600 mt-1">Unverified — no customer account yet</p>
              </div>
            )}
          </Card>

          {/* Shipping address */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-deep-earth" />
              <h3 className="text-base font-semibold text-charcoal">Shipping Address</h3>
            </div>
            {order.address ? (
              <div className="text-sm text-dark-gray space-y-1">
                <p className="font-medium text-charcoal">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>
                  {order.address.city}, {order.address.state} {order.address.pinCode}
                </p>
                <p>{order.address.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-medium-gray">No address</p>
            )}
          </Card>

          {/* Payment info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-deep-earth" />
              <h3 className="text-base font-semibold text-charcoal">Payment</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Status</span>
                <Badge
                  variant={
                    order.payment?.status === 'CAPTURED'
                      ? 'success'
                      : order.payment?.status === 'FAILED'
                        ? 'error'
                        : order.payment?.status === 'REFUNDED'
                          ? 'default'
                          : 'warning'
                  }
                >
                  {order.payment?.status || 'N/A'}
                </Badge>
              </div>
              {order.payment?.method && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Method</span>
                  <span className="text-charcoal">{order.payment.method}</span>
                </div>
              )}
              {order.payment?.paidAt && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Paid at</span>
                  <span className="text-charcoal">{formatDateTime(order.payment.paidAt)}</span>
                </div>
              )}
              {order.payment?.refundedAt && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Refunded at</span>
                  <span className="text-charcoal">{formatDateTime(order.payment.refundedAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Refund Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Initiate Refund"
        size="sm"
      >
        <p className="text-sm text-medium-gray mb-4">
          This will issue a full refund of {formatPrice(order.totalAmount)} via Razorpay.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Reason</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Enter refund reason..."
              className="w-full px-3 py-2 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 min-h-[80px]"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowRefundModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={!refundReason.trim() || refundOrder.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {refundOrder.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => {
          setShowArchiveModal(false);
          setArchiveReason('');
        }}
        title="Archive order"
        size="sm"
      >
        <div className="flex gap-3 mb-4">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-charcoal">
            Archive order <span className="font-mono">#{order.orderNumber}</span>? It will be hidden
            from lists, customer history, and analytics. Payment and status history are retained —
            you can restore it later.
            <br />
            <span className="text-medium-gray text-xs mt-1 inline-block">
              Archiving is not a refund. If money was charged, initiate a refund first.
            </span>
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g. test order, duplicate"
              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowArchiveModal(false);
                setArchiveReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={archiveOrder.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {archiveOrder.isPending ? 'Archiving…' : 'Confirm Archive'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
