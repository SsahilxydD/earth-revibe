'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [order, setOrder] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);

    if (!orderNumber.trim() || !email.trim()) {
      setError('Please enter both order number and email address.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.get(`/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`);
      setOrder(result);
    } catch (err: any) {
      setError(err.message || 'Order not found. Please check your order number and email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="px-6 py-12 lg:py-20 lg:px-10 border-b border-slate-100">
        <div className="max-w-xl mx-auto">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <ol className="flex items-center gap-2 text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase">
              <li>
                <Link href="/" className="text-slate-400 hover:text-black transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-slate-300">/</li>
              <li className="text-black">Track Order</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-4">
              Track Your Order
            </h1>
            <p className="text-[14px] text-slate-500">
              Enter your order number and email to track your shipment.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Track Form */}
      <div className="px-6 py-12 lg:py-16 lg:px-10">
        <div className="max-w-md mx-auto">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                Order Number
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., ER-2024-12345"
                className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="The email used for your order"
                className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-black text-white text-[12px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Tracking...
                </>
              ) : (
                'Track Order'
              )}
            </button>
          </motion.form>
        </div>
      </div>

      {/* Order Details */}
      {order && (
        <div className="px-6 py-12 lg:py-16 lg:px-10 border-t border-slate-100">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 p-6"
            >
              <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-4">
                Order {order.id || order.orderNumber}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-1">
                    Status
                  </p>
                  <p className="text-[14px] text-black">{order.status}</p>
                </div>
                <div>
                  <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-1">
                    Order Date
                  </p>
                  <p className="text-[14px] text-black">{order.date || order.createdAt}</p>
                </div>

                {/* Tracking Information */}
                {order.tracking && (
                  <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-3">
                      Tracking Information
                    </p>
                    <div className="space-y-2">
                      {order.tracking.carrier && (
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-slate-500">Carrier:</span>
                          <span className="text-[13px] font-medium text-black">{order.tracking.carrier}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-slate-500">Tracking #:</span>
                        <span className="text-[13px] font-mono text-black">{order.tracking.number}</span>
                      </div>
                      {order.tracking.url && (
                        <a
                          href={order.tracking.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-black text-white text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Track Shipment
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {order.deliveredDate && (
                  <div>
                    <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-1">
                      Delivered
                    </p>
                    <p className="text-[14px] text-black">{order.deliveredDate}</p>
                  </div>
                )}
                {order.estimatedDelivery && !order.deliveredDate && (
                  <div>
                    <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-1">
                      Estimated Delivery
                    </p>
                    <p className="text-[14px] text-black">{order.estimatedDelivery}</p>
                  </div>
                )}

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div>
                    <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-1">
                      Shipping To
                    </p>
                    <p className="text-[13px] text-black">{order.shippingAddress.name}</p>
                    <p className="text-[13px] text-slate-600">{order.shippingAddress.address}</p>
                    <p className="text-[13px] text-slate-600">
                      {order.shippingAddress.city}{order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress.pincode}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                    Items
                  </p>
                  <div className="space-y-2">
                    {order.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 text-[13px]">
                        <span className="text-slate-600">{item.quantity}x</span>
                        <span className="text-black">{item.name || item.productName}</span>
                        <span className="text-slate-500 ml-auto">
                          {item.price != null ? `Rs. ${Number(item.price).toLocaleString('en-IN')}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500">
                      Total
                    </p>
                    <p className="text-[16px] font-medium text-black">
                      Rs. {(typeof order.total === 'number' ? (order.total >= 1000 ? order.total / 100 : order.total) : Number(order.totalAmount || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Alternative Options */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-t border-slate-100">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
              Other Ways to Track
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-black mb-1">Check Your Email</p>
                  <p className="text-[13px] text-slate-500 leading-[1.7]">
                    We sent a tracking link to your email when your order shipped.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-black mb-1">Sign In to Your Account</p>
                  <p className="text-[13px] text-slate-500 leading-[1.7]">
                    View all your orders and tracking info in My Orders.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Order Status Guide */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 bg-slate-50">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
              Order Status Guide
            </p>

            <div className="space-y-4">
              {[
                { color: 'bg-slate-300', status: 'Processing', desc: 'We\'re preparing your order' },
                { color: 'bg-amber-400', status: 'Shipped', desc: 'Your order is on the way' },
                { color: 'bg-blue-400', status: 'Out for Delivery', desc: 'Arriving today' },
                { color: 'bg-green-500', status: 'Delivered', desc: 'Enjoy your purchase!' },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-4">
                  <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                  <span className="text-[13px] text-slate-600">
                    <strong className="text-black font-medium">{item.status}</strong> — {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="px-6 py-12 lg:py-16 lg:px-10">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Need help with your order?
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-black text-white text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
