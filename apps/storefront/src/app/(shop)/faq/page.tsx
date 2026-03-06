'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const faqData = [
  {
    category: 'Shipping',
    questions: [
      {
        q: 'What are the delivery times?',
        a: 'Standard delivery takes 5-7 business days within India. Express shipping is available for 2-3 business day delivery. International orders typically arrive within 10-15 business days depending on the destination country.',
      },
      {
        q: 'How much does shipping cost?',
        a: 'We offer free standard shipping on all orders above Rs. 999. For orders below Rs. 999, a flat shipping fee of Rs. 99 applies. Express shipping is available at Rs. 199 regardless of order value. International shipping rates are calculated at checkout based on destination and package weight.',
      },
      {
        q: 'How can I track my order?',
        a: 'Once your order is shipped, you will receive a tracking number via email and SMS. You can use this number to track your package on our website under \'My Orders\', or directly on the courier partner\'s website. Real-time tracking updates are available for all domestic shipments.',
      },
    ],
  },
  {
    category: 'Returns',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We offer a hassle-free 30-day return policy for all unused items in their original condition with tags attached. Sale items can be returned within 15 days. Items must be unworn, unwashed, and free of any alterations to be eligible for a return.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'To initiate a return, log in to your account, go to \'My Orders\', select the order, and click \'Return Item\'. Choose your reason for return and schedule a pickup. Our courier partner will collect the item from your doorstep. You can also email us at hello@earthrevibe.com with your order number.',
      },
      {
        q: 'How long does it take to receive a refund?',
        a: 'Once we receive and inspect the returned item, refunds are processed within 3-5 business days. The amount will be credited to your original payment method. Bank processing times may add an additional 2-5 business days for the refund to reflect in your account.',
      },
    ],
  },
  {
    category: 'Products',
    questions: [
      {
        q: 'What materials do you use?',
        a: 'We use premium, sustainably sourced materials including 100% organic Supima cotton, Belgian linen, and Japanese denim. All our fabrics are GOTS (Global Organic Textile Standard) certified and free from harmful chemicals. We prioritise materials that are both luxurious to wear and gentle on the planet.',
      },
      {
        q: 'How do I find my correct size?',
        a: 'Each product page includes a detailed size guide with measurements in both centimetres and inches. We recommend measuring yourself and comparing with our size chart for the best fit. If you are between sizes, we generally recommend sizing up for a relaxed fit or sizing down for a more tailored look.',
      },
      {
        q: 'How should I care for my garments?',
        a: 'To keep your Earth Revibe pieces looking their best, we recommend machine washing on a gentle cycle with cold water and air drying when possible. Avoid bleach and harsh detergents. For linen items, a cool iron works best. Detailed care instructions are printed on each garment\'s label and listed on the product page.',
      },
    ],
  },
  {
    category: 'Orders',
    questions: [
      {
        q: 'Can I modify or cancel my order after placing it?',
        a: 'You can modify or cancel your order within 2 hours of placing it, provided it has not already been shipped. To make changes, go to \'My Orders\' in your account or contact our support team immediately at hello@earthrevibe.com. Once an order is in transit, it cannot be cancelled but can be returned after delivery.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, RuPay), UPI payments, net banking, and popular wallets. EMI options are available on orders above Rs. 3,000. We also offer Cash on Delivery (COD) for domestic orders up to Rs. 10,000.',
      },
    ],
  },
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <motion.div
        className="px-6 py-16 lg:py-24 lg:px-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-2xl mx-auto faq-header-container">
          <motion.p
            className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Support
          </motion.p>
          <motion.h1
            className="text-[32px] lg:text-[48px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            How can we help?
          </motion.h1>
          <motion.p
            className="text-[14px] lg:text-[15px] text-slate-500 leading-relaxed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Find answers to common questions below, or{' '}
            <Link href="/contact" className="text-black underline underline-offset-4 hover:no-underline transition-all">
              get in touch
            </Link>
            {' '}with our team.
          </motion.p>
        </div>
      </motion.div>

      {/* FAQ Sections */}
      <div className="px-6 pb-12 lg:pb-20 lg:px-10">
        <div className="max-w-2xl mx-auto faq-container">
          {faqData.map((section, sectionIndex) => (
            <motion.section
              key={sectionIndex}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.6,
                delay: sectionIndex * 0.1,
                ease: [0.25, 0.1, 0.25, 1]
              }}
              className="faq-section"
            >
              <p className="text-[14px] lg:text-[16px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-4">
                {section.category}
              </p>

              <div>
                {section.questions.map((item, itemIndex) => {
                  const id = `${sectionIndex}-${itemIndex}`;
                  const isOpen = openItem === id;

                  return (
                    <div
                      key={itemIndex}
                      className="overflow-hidden"
                    >
                      <motion.button
                        onClick={() => toggleItem(id)}
                        className="w-full flex items-center justify-between pt-5 pb-5 text-left group"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className={`text-[13px] pr-8 transition-colors duration-300 ${
                          isOpen ? 'text-black' : 'text-slate-500 group-hover:text-black'
                        }`}>
                          {item.q}
                        </span>
                        <motion.span
                          className="text-[20px] text-slate-300 flex-shrink-0 w-6 h-6 flex items-center justify-center"
                          animate={{ rotate: isOpen ? 45 : 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                          +
                        </motion.span>
                      </motion.button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                              transition: {
                                height: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
                                opacity: { duration: 0.3, delay: 0.1 }
                              }
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                              transition: {
                                height: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                                opacity: { duration: 0.2 }
                              }
                            }}
                          >
                            <motion.p
                              className="pb-6 text-[12px] lg:text-[13px] text-slate-500 leading-[1.9] pr-12 max-w-2xl"
                              initial={{ y: -10 }}
                              animate={{ y: 0 }}
                              transition={{ duration: 0.3, delay: 0.1 }}
                            >
                              {item.a}
                            </motion.p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <motion.div
        className="px-6 py-16 lg:py-20 bg-slate-50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-2xl mx-auto text-center faq-contact-cta">
          <motion.p
            className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Still have questions?
          </motion.p>
          <motion.p
            className="text-[18px] lg:text-[22px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black mb-8"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            We&apos;re here to help
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link
              href="/contact"
              className="inline-block px-10 py-4 bg-black text-white text-[11px] font-medium tracking-[0.12em] uppercase hover:bg-slate-800 transition-all duration-300 hover:tracking-[0.15em]"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
