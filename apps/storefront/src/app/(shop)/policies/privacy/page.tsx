'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PrivacyPage() {
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
              <li className="text-black">Privacy Policy</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-3">
              Privacy Policy
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
                Earth Revibe (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website earthrevibe.com and earthrevibe.store.
              </p>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Information We Collect</h2>
                <p className="mb-4"><strong>Personal Information</strong></p>
                <p>When you make a purchase or attempt to make a purchase, we collect certain information from you, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Shipping address</li>
                  <li>Billing address</li>
                  <li>Payment information (processed securely through Razorpay)</li>
                </ul>

                <p className="mt-4 mb-4"><strong>Automatically Collected Information</strong></p>
                <p>When you visit our website, we automatically collect certain information about your device, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>IP address</li>
                  <li>Browser type</li>
                  <li>Operating system</li>
                  <li>Access times</li>
                  <li>Pages viewed</li>
                  <li>Links clicked</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Process and fulfill your orders</li>
                  <li>Send order confirmations and shipping updates</li>
                  <li>Communicate with you about products, services, and promotions</li>
                  <li>Improve our website and customer experience</li>
                  <li>Prevent fraudulent transactions and protect against theft</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Sharing Your Information</h2>
                <p>We share your information only with:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Shipping partners (to deliver your orders)</li>
                  <li>Payment processors (Razorpay) for secure payment processing</li>
                  <li>Service providers who assist in our operations</li>
                  <li>Law enforcement, if required by law</li>
                </ul>
                <p className="mt-4 font-medium">We DO NOT sell, rent, or trade your personal information to third parties for marketing purposes.</p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Payment Security</h2>
                <p>
                  All payment transactions are processed through Razorpay, a PCI-DSS compliant payment gateway. We do not store your complete credit/debit card details on our servers. Your payment information is encrypted and handled securely.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Cookies</h2>
                <p>
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can choose to disable cookies through your browser settings, though this may affect site functionality.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Data Retention</h2>
                <p>
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Opt-out of marketing communications</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, contact us at{' '}
                  <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">
                    earthrevibeofficial@gmail.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Children&apos;s Privacy</h2>
                <p>
                  Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. The updated version will be indicated by an updated &quot;Last Updated&quot; date at the top of this page.
                </p>
              </section>

              <section>
                <h2 className="text-[16px] font-[var(--font-cinzel)] font-medium text-black mb-4">Contact Us</h2>
                <p>If you have questions about this Privacy Policy, please contact us:</p>
                <p className="mt-2">
                  Email:{' '}
                  <a href="mailto:earthrevibeofficial@gmail.com" className="text-black underline hover:no-underline">
                    earthrevibeofficial@gmail.com
                  </a>
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
            transition={{ delay: 0.7 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Questions about our privacy practices?
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
