'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="px-6 py-12 lg:py-20 lg:px-10 border-b border-slate-100">
        <div className="max-w-3xl mx-auto">
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
              <li className="text-black">Returns & Exchanges</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-3">
              Returns & Refunds
            </h1>
            <p className="text-[11px] text-slate-400 tracking-[0.08em]">
              Last updated: January 2026
            </p>
          </motion.div>
        </div>
      </div>

      {/* Policy Highlight */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-b border-slate-100 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-4">
              Our Promise
            </p>
            <p className="text-[18px] lg:text-[22px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black leading-relaxed">
              72-Hour Hassle-Free Returns
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-12 lg:py-16 lg:px-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="prose prose-slate max-w-none"
          >
            <div className="text-[14px] text-slate-600 leading-[1.9] space-y-8">
              <p>
                At Earth Revibe, we want you to be completely satisfied with your purchase. We offer a hassle-free 72-hour return and refund policy for your peace of mind.
              </p>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">72-Hour Hassle-Free Returns</h2>
                <p>You may return most items within 72 hours (3 days) of delivery for a full refund or exchange. To be eligible for a return:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Items must be unused, unworn, and in original condition</li>
                  <li>Items must have all original tags attached</li>
                  <li>Items must be in original packaging</li>
                  <li>You must have proof of purchase (order confirmation email or receipt)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">How to Initiate a Return</h2>
                <ol className="list-decimal pl-6 mt-2 space-y-2">
                  <li>Contact us within 72 hours of receiving your order at <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">earthrevibeofficial@gmail.com</a></li>
                  <li>Include your order number and reason for return</li>
                  <li>Our team will respond within 24 hours with return instructions</li>
                  <li>Ship the item back to us using a trackable shipping method</li>
                  <li>Once received and inspected, we will process your refund</li>
                </ol>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Refund Process</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Refunds will be processed within 5-7 business days after we receive and inspect the returned item</li>
                  <li>Refunds will be credited to your original payment method (credit/debit card or UPI)</li>
                  <li>You will receive an email confirmation once your refund has been processed</li>
                  <li>Please allow additional time for your bank to reflect the refund in your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Exchange Policy</h2>
                <p>If you&apos;d like to exchange an item for a different size or color:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Contact us within 72 hours of delivery</li>
                  <li>We will arrange for pickup and delivery of the new item at no extra cost</li>
                  <li>Exchanges are subject to availability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Non-Returnable Items</h2>
                <p>The following items cannot be returned or exchanged:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Items marked as &quot;Final Sale&quot; or &quot;Non-Returnable&quot;</li>
                  <li>Undergarments and intimate apparel (for hygiene reasons)</li>
                  <li>Items that have been worn, washed, or altered</li>
                  <li>Items without original tags</li>
                  <li>Gift cards</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Damaged or Defective Items</h2>
                <p>If you receive a damaged or defective item:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Contact us immediately (within 24 hours of delivery) at <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">earthrevibeofficial@gmail.com</a></li>
                  <li>Include photos of the damaged/defective item</li>
                  <li>We will arrange for a free replacement or full refund</li>
                  <li>No return shipping required for damaged/defective items</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Late or Missing Refunds</h2>
                <p>If you haven&apos;t received your refund after 7 business days:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>Check your bank account again</li>
                  <li>Contact your credit card company (processing times vary)</li>
                  <li>Contact your bank</li>
                  <li>If you&apos;ve done all of this and still have not received your refund, contact us at <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">earthrevibeofficial@gmail.com</a></li>
                </ol>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Cancellations</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Orders can be cancelled free of charge before they are shipped</li>
                  <li>Once an order has been shipped, it cannot be cancelled</li>
                  <li>You may refuse delivery and the item will be returned to us for a refund</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Contact Us</h2>
                <p>For any questions about returns or refunds:</p>
                <p className="mt-2">
                  Email:{' '}
                  <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">
                    earthrevibeofficial@gmail.com
                  </a>
                </p>
                <p className="mt-2 text-slate-500">
                  Our customer service team is available Monday through Saturday, 10:00 AM to 7:00 PM IST.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="px-6 py-12 bg-slate-50 lg:py-16 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Need help with a return?
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
