'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: 'Orders',
    items: [
      {
        question: 'How do I place an order?',
        answer:
          'Browse our collection, select your size and colour, and add items to your cart. Proceed to checkout, enter your shipping details, and complete the payment. You will receive a confirmation email once the order is placed.',
      },
      {
        question: 'Can I modify or cancel my order?',
        answer:
          'You can modify or cancel within 1 hour of placing it. After that, the order enters processing and cannot be changed. Contact hello@earthrevibe.in for help.',
      },
      {
        question: 'How do I track my order?',
        answer:
          'Once shipped, you will receive a tracking link via email and SMS. You can also track from your account dashboard or use the Track Order page.',
      },
      {
        question: 'What if I receive a damaged or incorrect item?',
        answer:
          'Contact us within 48 hours of delivery with photos of the item. We will arrange a replacement or full refund immediately.',
      },
    ],
  },
  {
    title: 'Shipping',
    items: [
      {
        question: 'What are the shipping charges?',
        answer:
          'Free shipping on all orders above \u20B9999. For orders below \u20B9999, a flat fee of \u20B979 applies. We ship across India via trusted courier partners.',
      },
      {
        question: 'How long does delivery take?',
        answer:
          'Metro cities: 5\u20137 business days. Other locations: 7\u201310 business days. Express delivery (2\u20133 days) is available for select pin codes at an additional charge.',
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Currently we ship within India only. International shipping is coming soon \u2014 subscribe to our newsletter for updates.',
      },
    ],
  },
  {
    title: 'Returns & Exchanges',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          '7-day easy returns from date of delivery. Items must be unused, unwashed, in original packaging with tags attached. Sale items and innerwear are not eligible.',
      },
      {
        question: 'How do I initiate a return?',
        answer:
          'Log in to your account, go to order history, select the item, choose your reason, and schedule a pickup. Our courier partner will collect from your doorstep.',
      },
      {
        question: 'How long does the refund take?',
        answer:
          'Once we receive and inspect the returned item, your refund will be processed within 5\u20137 business days to your original payment method.',
      },
      {
        question: 'Can I exchange for a different size?',
        answer:
          'Yes, exchanges are available within 7 days of delivery, subject to stock availability. Select \u201cExchange\u201d instead of \u201cReturn\u201d when initiating.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'UPI (Google Pay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, Rupay), net banking, wallets, and Cash on Delivery. All payments processed securely via Razorpay.',
      },
      {
        question: 'Is Cash on Delivery available?',
        answer:
          'Yes, COD is available for orders up to \u20B95,000 at select pin codes. A \u20B949 COD fee applies. Availability shown at checkout.',
      },
      {
        question: 'My payment failed but money was debited.',
        answer:
          'The amount will be automatically refunded within 5\u20137 business days. If not, contact support with your transaction details.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        question: 'How do I create an account?',
        answer:
          'Tap the user icon and select Register. Sign up with email or use Google for quick registration.',
      },
      {
        question: 'I forgot my password.',
        answer:
          'Tap Login, then Forgot Password. Enter your registered email and we will send a reset link valid for 24 hours.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Email hello@earthrevibe.in from your registered email. Your account and data will be permanently deleted within 30 days.',
      },
    ],
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="pr-6 text-sm font-medium">{item.question}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200',
          isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-[1.8] text-[var(--color-muted)]">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

function FaqSection({ category }: { category: FaqCategory }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
        {category.title}
      </h2>
      <div className="mt-3">
        {category.items.map((item, idx) => (
          <AccordionItem
            key={idx}
            item={item}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex((prev) => (prev === idx ? null : idx))}
          />
        ))}
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div>
      {/* Header */}
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <div className="mx-auto max-w-md px-6">
          <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">FAQs</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Everything you need to know about orders, shipping, returns, and more.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <div className="mx-auto max-w-2xl px-6 py-10 md:py-14">
        <div className="space-y-10">
          {FAQ_DATA.map((category) => (
            <FaqSection key={category.title} category={category} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-[var(--color-border)] py-10 text-center md:py-12">
        <div className="mx-auto max-w-sm px-6">
          <p className="text-sm font-medium">Still have questions?</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Our support team is here to help.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block bg-[var(--color-primary)] px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
          >
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  );
}
