'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ShippingPage() {
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
              <li className="text-black">Shipping</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-3">
              Shipping Policy
            </h1>
            <p className="text-[11px] text-slate-400 tracking-[0.08em]">
              Last updated: January 2026
            </p>
          </motion.div>
        </div>
      </div>

      {/* Free Delivery Highlight */}
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
              FREE Shipping on All Orders
            </p>
            <p className="text-[13px] text-slate-500 mt-2">No minimum order value required</p>
          </motion.div>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-b border-slate-100">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
              Delivery Timeframes
            </p>

            <div className="space-y-0">
              <div className="py-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-black">Metro Cities</p>
                  <p className="text-[12px] text-slate-500 mt-1">Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad</p>
                </div>
                <p className="text-[13px] font-medium text-black">3-5 days</p>
              </div>
              <div className="py-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-black">Tier 2 Cities</p>
                  <p className="text-[12px] text-slate-500 mt-1">Pune, Ahmedabad, Jaipur, Lucknow, etc.</p>
                </div>
                <p className="text-[13px] font-medium text-black">5-7 days</p>
              </div>
              <div className="py-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-black">Other Areas</p>
                  <p className="text-[12px] text-slate-500 mt-1">Tier 3 cities and towns</p>
                </div>
                <p className="text-[13px] font-medium text-black">7-10 days</p>
              </div>
              <div className="py-5 flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-black">Remote/Rural Areas</p>
                  <p className="text-[12px] text-slate-500 mt-1">Hill stations, islands, remote locations</p>
                </div>
                <p className="text-[13px] font-medium text-black">10-14 days</p>
              </div>
            </div>

            <p className="text-[12px] text-slate-400 mt-4 italic">
              *Delivery times are estimates and may vary due to factors beyond our control.
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
                At Earth Revibe, we are committed to delivering your orders quickly and efficiently. Here&apos;s everything you need to know about our shipping.
              </p>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Processing Time</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Orders are processed within 1-2 business days</li>
                  <li>Orders placed on weekends or holidays will be processed on the next business day</li>
                  <li>You will receive an email confirmation with tracking information once your order ships</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Shipping Partners</h2>
                <p>We work with trusted shipping partners including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Shiprocket</li>
                  <li>Delhivery</li>
                  <li>BlueDart</li>
                  <li>India Post</li>
                </ul>
                <p className="mt-2">The carrier is selected based on your location to ensure the fastest and most reliable delivery.</p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Order Tracking</h2>
                <p>Once your order ships:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>You will receive an email with your tracking number</li>
                  <li>Track your order using the link provided in the email</li>
                  <li>You can also track your order at: <Link href="/track-order" className="text-black underline hover:no-underline">Track Order</Link></li>
                </ol>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Shipping Restrictions</h2>
                <p>We currently ship only within India. International shipping is not available at this time.</p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Delivery Attempts</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Our shipping partners will make up to 3 delivery attempts</li>
                  <li>If delivery fails after 3 attempts, the package will be returned to us</li>
                  <li>You will be contacted via email/phone before the package is returned</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Incorrect Address</h2>
                <p>Please ensure your shipping address is correct before placing your order:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>We are not responsible for orders shipped to incorrect addresses provided by the customer</li>
                  <li>Address changes can only be made before the order is shipped</li>
                  <li>Contact us immediately if you need to update your address</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Missing or Lost Packages</h2>
                <p>If your package appears to be lost:</p>
                <ol className="list-decimal pl-6 mt-2 space-y-1">
                  <li>Check your tracking information for the latest update</li>
                  <li>Wait for the estimated delivery window to pass</li>
                  <li>Contact us at <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">earthrevibeofficial@gmail.com</a> with your order number</li>
                  <li>We will investigate with the shipping carrier and resolve the issue</li>
                </ol>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Damaged Packages</h2>
                <p>If you receive a damaged package:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Do not accept the delivery if the damage is visible</li>
                  <li>If you&apos;ve already accepted, take photos immediately</li>
                  <li>Contact us within 24 hours at <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">earthrevibeofficial@gmail.com</a></li>
                  <li>We will arrange for a replacement at no extra cost</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Contact Us</h2>
                <p>For shipping inquiries:</p>
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
            transition={{ delay: 0.5 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Have questions about shipping?
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
