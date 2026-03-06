'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TermsPage() {
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
              <li className="text-black">Terms of Service</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-3">
              Terms of Service
            </h1>
            <p className="text-[11px] text-slate-400 tracking-[0.08em]">
              Last updated: January 2026
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
            transition={{ delay: 0.1 }}
            className="prose prose-slate max-w-none"
          >
            <div className="text-[14px] text-slate-600 leading-[1.9] space-y-8">
              <p>
                Welcome to Earth Revibe. These Terms of Service (&quot;Terms&quot;) govern your use of our website earthrevibe.com and earthrevibe.store (the &quot;Site&quot;) and your purchase of products from us. By accessing or using our Site, you agree to be bound by these Terms.
              </p>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing this website, you confirm that you are at least 18 years old (or have parental consent) and agree to comply with these Terms. If you do not agree with any part of these Terms, you must not use our Site.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">2. Products and Pricing</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>All products are subject to availability</li>
                  <li>We reserve the right to discontinue any product at any time</li>
                  <li>Prices are listed in Indian Rupees (INR) and include applicable taxes</li>
                  <li>We reserve the right to modify prices without prior notice</li>
                  <li>Promotional offers and discounts are valid for limited periods as specified</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">3. Orders and Payment</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>By placing an order, you are making an offer to purchase products</li>
                  <li>We reserve the right to refuse or cancel any order for any reason</li>
                  <li>Payment must be made at the time of purchase through Razorpay</li>
                  <li>We accept major credit cards, debit cards, UPI, and net banking</li>
                  <li>All payment information is processed securely through Razorpay&apos;s PCI-DSS compliant payment gateway</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">4. Shipping and Delivery</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>We offer FREE DELIVERY on all orders across India</strong></li>
                  <li>Estimated delivery times are provided at checkout</li>
                  <li>Delivery times may vary based on your location and other factors</li>
                  <li>We are not responsible for delays caused by shipping carriers or customs</li>
                  <li>Risk of loss passes to you upon delivery of the product</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">5. Returns and Refunds</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>We offer a 72-HOUR HASSLE-FREE return policy</strong></li>
                  <li>Please refer to our <Link href="/policies/returns" className="text-black underline hover:no-underline">Return & Refund Policy</Link> for complete details</li>
                  <li>Items must be returned in original, unused condition with tags attached</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">6. Intellectual Property</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>All content on this Site, including text, images, logos, and designs, is the property of Earth Revibe</li>
                  <li>You may not reproduce, distribute, or create derivative works without our written permission</li>
                  <li>The Earth Revibe name, logo, and branding are our trademarks</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">7. User Conduct</h2>
                <p>You agree not to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Use the Site for any unlawful purpose</li>
                  <li>Attempt to gain unauthorized access to any part of the Site</li>
                  <li>Interfere with the proper functioning of the Site</li>
                  <li>Submit false or misleading information</li>
                  <li>Engage in any activity that could harm Earth Revibe or other users</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">8. Account Responsibilities</h2>
                <p>If you create an account on our Site:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>You are responsible for maintaining the confidentiality of your account</li>
                  <li>You are responsible for all activities under your account</li>
                  <li>You must notify us immediately of any unauthorized use</li>
                  <li>We reserve the right to terminate accounts that violate these Terms</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">9. Limitation of Liability</h2>
                <p>To the fullest extent permitted by law:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Earth Revibe shall not be liable for any indirect, incidental, or consequential damages</li>
                  <li>Our total liability shall not exceed the amount paid by you for the product in question</li>
                  <li>We do not guarantee that the Site will be error-free or uninterrupted</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">10. Disclaimer of Warranties</h2>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Products are provided &quot;as is&quot; without warranties of any kind</li>
                  <li>We make no warranties regarding the accuracy of product descriptions</li>
                  <li>Colors may appear differently on your screen than in person</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">11. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless Earth Revibe, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Site or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">12. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">13. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">14. Contact Information</h2>
                <p>For questions about these Terms of Service, please contact us:</p>
                <p className="mt-2">
                  Email:{' '}
                  <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">
                    earthrevibeofficial@gmail.com
                  </a>
                </p>
              </section>

              <div className="mt-8 p-4 bg-slate-50 rounded">
                <p className="text-[13px] text-slate-500 italic">
                  By using Earth Revibe, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>
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
            transition={{ delay: 0.7 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Questions about our terms?
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
