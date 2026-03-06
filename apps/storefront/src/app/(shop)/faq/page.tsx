"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  category: string;
  items: FAQItem[];
}

const faqData: FAQSection[] = [
  {
    category: "Shipping",
    items: [
      {
        question: "What are the delivery times?",
        answer:
          "Standard delivery takes 5-7 business days within India. Express shipping is available for 2-3 business day delivery. International orders typically arrive within 10-15 business days depending on the destination country.",
      },
      {
        question: "How much does shipping cost?",
        answer:
          "We offer free standard shipping on all orders above Rs. 999. For orders below Rs. 999, a flat shipping fee of Rs. 99 applies. Express shipping is available at Rs. 199 regardless of order value. International shipping rates are calculated at checkout based on destination and package weight.",
      },
      {
        question: "How can I track my order?",
        answer:
          "Once your order is shipped, you will receive a tracking number via email and SMS. You can use this number to track your package on our website under 'My Orders', or directly on the courier partner's website. Real-time tracking updates are available for all domestic shipments.",
      },
    ],
  },
  {
    category: "Returns",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "We offer a hassle-free 30-day return policy for all unused items in their original condition with tags attached. Sale items can be returned within 15 days. Items must be unworn, unwashed, and free of any alterations to be eligible for a return.",
      },
      {
        question: "How do I initiate a return?",
        answer:
          "To initiate a return, log in to your account, go to 'My Orders', select the order, and click 'Return Item'. Choose your reason for return and schedule a pickup. Our courier partner will collect the item from your doorstep. You can also email us at hello@earthrevibe.com with your order number.",
      },
      {
        question: "How long does it take to receive a refund?",
        answer:
          "Once we receive and inspect the returned item, refunds are processed within 3-5 business days. The amount will be credited to your original payment method. Bank processing times may add an additional 2-5 business days for the refund to reflect in your account.",
      },
    ],
  },
  {
    category: "Products",
    items: [
      {
        question: "What materials do you use?",
        answer:
          "We use premium, sustainably sourced materials including 100% organic Supima cotton, Belgian linen, and Japanese denim. All our fabrics are GOTS (Global Organic Textile Standard) certified and free from harmful chemicals. We prioritise materials that are both luxurious to wear and gentle on the planet.",
      },
      {
        question: "How do I find my correct size?",
        answer:
          "Each product page includes a detailed size guide with measurements in both centimetres and inches. We recommend measuring yourself and comparing with our size chart for the best fit. If you are between sizes, we generally recommend sizing up for a relaxed fit or sizing down for a more tailored look.",
      },
      {
        question: "How should I care for my garments?",
        answer:
          "To keep your Earth Revibe pieces looking their best, we recommend machine washing on a gentle cycle with cold water and air drying when possible. Avoid bleach and harsh detergents. For linen items, a cool iron works best. Detailed care instructions are printed on each garment's label and listed on the product page.",
      },
    ],
  },
  {
    category: "Orders",
    items: [
      {
        question: "Can I modify or cancel my order after placing it?",
        answer:
          "You can modify or cancel your order within 2 hours of placing it, provided it has not already been shipped. To make changes, go to 'My Orders' in your account or contact our support team immediately at hello@earthrevibe.com. Once an order is in transit, it cannot be cancelled but can be returned after delivery.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit and debit cards (Visa, Mastercard, Amex, RuPay), UPI payments, net banking, and popular wallets. EMI options are available on orders above Rs. 3,000. We also offer Cash on Delivery (COD) for domestic orders up to Rs. 10,000.",
      },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function FAQPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <section className="px-6 py-16 lg:py-24 lg:px-10 text-center">
        <div className="max-w-2xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--muted-text)] mb-4"
          >
            Support
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[28px] lg:text-[40px] font-[var(--font-display)] font-medium tracking-[0.02em] mb-6"
          >
            Frequently Asked Questions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[var(--text-base)] lg:text-[var(--text-md)] text-[var(--secondary-text)] leading-relaxed"
          >
            Find answers to common questions below, or{" "}
            <Link
              href="/contact"
              className="text-[var(--chocolate)] underline underline-offset-4 hover:no-underline transition-all"
            >
              get in touch
            </Link>{" "}
            with our team.
          </motion.p>
        </div>
      </section>

      {/* FAQ Accordion Sections */}
      <section className="px-6 pb-16 lg:pb-24 lg:px-10">
        <div className="max-w-2xl mx-auto">
          {faqData.map((section, sectionIndex) => (
            <motion.div
              key={section.category}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              custom={sectionIndex}
              className="mb-10 last:mb-0"
            >
              {/* Category heading */}
              <h2 className="text-[var(--text-lg)] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-[var(--chocolate)] mb-4 pb-2 border-b border-[var(--border-color)]">
                {section.category}
              </h2>

              {/* Items */}
              <div>
                {section.items.map((item, itemIndex) => {
                  const id = `${sectionIndex}-${itemIndex}`;
                  const isOpen = openItem === id;

                  return (
                    <div
                      key={id}
                      className="border-b border-[var(--border-color)] last:border-b-0"
                    >
                      <button
                        onClick={() => toggleItem(id)}
                        className="w-full flex items-center justify-between py-5 text-left group"
                        aria-expanded={isOpen}
                      >
                        <span
                          className={`text-[var(--text-sm)] lg:text-[var(--text-base)] pr-8 transition-colors duration-200 ${
                            isOpen
                              ? "text-[var(--chocolate)]"
                              : "text-[var(--secondary-text)] group-hover:text-[var(--primary-text)]"
                          }`}
                        >
                          {item.question}
                        </span>
                        <motion.span
                          className="flex-shrink-0 text-[var(--muted-text)]"
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.25, 0.1, 0.25, 1],
                          }}
                        >
                          <ChevronDown className="w-5 h-5" strokeWidth={1.5} />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                              transition: {
                                height: {
                                  duration: 0.35,
                                  ease: [0.25, 0.1, 0.25, 1],
                                },
                                opacity: { duration: 0.25, delay: 0.1 },
                              },
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                              transition: {
                                height: {
                                  duration: 0.3,
                                  ease: [0.25, 0.1, 0.25, 1],
                                },
                                opacity: { duration: 0.15 },
                              },
                            }}
                            className="overflow-hidden"
                          >
                            <p className="pb-5 text-[var(--text-sm)] text-[var(--secondary-text)] leading-[1.9] pr-10">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="px-6 py-16 lg:py-20 bg-[var(--sage-light)]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--muted-text)] mb-3">
              Still have questions?
            </p>
            <h2 className="text-[var(--text-xl)] lg:text-[var(--text-2xl)] font-[var(--font-display)] font-medium tracking-[0.02em] mb-8">
              We&apos;re Here to Help
            </h2>
            <Link
              href="/contact"
              className="inline-block px-10 py-4 bg-[var(--chocolate)] text-white text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase hover:opacity-90 transition-opacity duration-300"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
