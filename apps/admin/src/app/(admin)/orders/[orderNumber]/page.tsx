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
} from '@/hooks/use-orders';

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  PENDING: 'info',
  CONFIRMED: 'info',
  SHIPPING: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

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

  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

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

  // DELIVERED stays out of the "final" bucket so admin can still approve a
  // post-delivery return → RETURNED.
  const cancelledOrFinal = ['CANCELLED', 'RETURNED'].includes(order.status);
  const canFulfill = ['CONFIRMED'].includes(order.status);
  const canRefund = order.payment?.status === 'CAPTURED' && order.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">#{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status] || 'default'}>
              {order.status.replace(/_/g, ' ')}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Items</h3>
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
          {/* Update Status */}
          {!cancelledOrFinal && (
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

          {/* Customer info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold text-charcoal">Customer</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-charcoal">
                {order.user?.firstName} {order.user?.lastName}
              </p>
              <p className="text-medium-gray">{order.user?.email}</p>
              {order.user?.phone && <p className="text-medium-gray">{order.user.phone}</p>}
              <Link
                href={`/customers/${order.user?.id}`}
                className="text-deep-earth hover:underline text-xs inline-block mt-1"
              >
                View customer
              </Link>
            </div>
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
    </div>
  );
}
