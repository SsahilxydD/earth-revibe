'use client';

import { useState } from 'react';
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
          'Simply browse our collection, select the items you love, choose your size and colour, and add them to your cart. Proceed to checkout, enter your shipping details, and complete the payment. You will receive an order confirmation email once your order is placed.',
      },
      {
        question: 'Can I modify or cancel my order?',
        answer:
          'You can modify or cancel your order within 1 hour of placing it. After that, the order goes into processing and cannot be changed. Please contact our support team at hello@earthrevibe.com for assistance.',
      },
      {
        question: 'How do I track my order?',
        answer:
          'Once your order is shipped, you will receive a tracking link via email and SMS. You can also track your order from your account dashboard or use our Track Order page with your order number.',
      },
      {
        question: 'What if I receive a damaged or incorrect item?',
        answer:
          "We're sorry if that happens! Please contact us within 48 hours of receiving your order with photos of the damaged or incorrect item. We will arrange a replacement or refund immediately.",
      },
    ],
  },
  {
    title: 'Shipping',
    items: [
      {
        question: 'What are the shipping charges?',
        answer:
          'We offer free shipping on all orders above Rs.999. For orders below Rs.999, a flat shipping fee of Rs.79 applies. We ship across India via trusted courier partners.',
      },
      {
        question: 'How long does delivery take?',
        answer:
          'Standard delivery takes 5-7 business days for metro cities and 7-10 business days for other locations. Express delivery (2-3 business days) is available at an additional charge for select pin codes.',
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Currently, we only ship within India. We are working on expanding our shipping to other countries. Stay tuned to our newsletter for updates!',
      },
      {
        question: 'Can I change my shipping address after placing an order?',
        answer:
          'Address changes can be made within 1 hour of placing the order. After that, we cannot guarantee a change as the order may have already been dispatched. Contact support immediately if you need to update your address.',
      },
    ],
  },
  {
    title: 'Returns & Exchanges',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          'We offer a 7-day easy return policy from the date of delivery. Items must be unused, unwashed, and in their original packaging with all tags attached. Sale items and innerwear are not eligible for returns.',
      },
      {
        question: 'How do I initiate a return?',
        answer:
          'Log in to your account, go to your order history, and select the item you wish to return. Choose your reason and schedule a pickup. Our courier partner will collect the item from your doorstep.',
      },
      {
        question: 'How long does the refund take?',
        answer:
          'Once we receive and inspect the returned item, your refund will be processed within 5-7 business days. The amount will be credited back to your original payment method.',
      },
      {
        question: 'Can I exchange an item for a different size?',
        answer:
          "Yes! You can exchange items for a different size within 7 days of delivery, subject to availability. The process is the same as a return, just select 'Exchange' instead.",
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major payment methods including UPI (Google Pay, PhonePe, Paytm), credit and debit cards (Visa, Mastercard, Rupay), net banking, wallets, and Cash on Delivery (COD). All online payments are processed securely through Razorpay.',
      },
      {
        question: 'Is Cash on Delivery (COD) available?',
        answer:
          'Yes, COD is available for orders up to Rs.5,000 at select pin codes. A nominal COD fee of Rs.49 applies. COD availability is shown at checkout based on your delivery pin code.',
      },
      {
        question: 'Is my payment information secure?',
        answer:
          'Absolutely. All payment transactions are processed through Razorpay, which is PCI DSS Level 1 compliant. We never store your card details on our servers. Your payment information is encrypted end-to-end.',
      },
      {
        question: 'My payment failed but money was debited. What should I do?',
        answer:
          "Don't worry! If your payment failed but the amount was debited, it will be automatically refunded within 5-7 business days. If you don't see the refund, please contact our support team with your transaction details.",
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        question: 'How do I create an account?',
        answer:
          "Click on the user icon in the header and select 'Register'. You can sign up with your email address and create a password, or use your Google account for quick registration.",
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer:
          "Click on 'Login' and then 'Forgot Password'. Enter your registered email address and we will send you a password reset link. The link is valid for 24 hours.",
      },
      {
        question: 'How do I update my account details?',
        answer:
          "Log in to your account and go to 'Profile Settings'. You can update your name, email, phone number, and manage your saved addresses from there.",
      },
      {
        question: 'How do I delete my account?',
        answer:
          'We are sorry to see you go. To delete your account, please email us at hello@earthrevibe.com from your registered email address. Your account and all associated data will be permanently deleted within 30 days.',
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
        <span className="pr-4 text-sm font-semibold">{item.question}</span>
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
          isOpen ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

function FaqSection({ category }: { category: FaqCategory }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-lg font-bold uppercase tracking-wider">{category.title}</h2>
      <div className="mt-4">
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
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Find answers to the most common questions about orders, shipping, returns, and more.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {FAQ_DATA.map((category) => (
          <FaqSection key={category.title} category={category} />
        ))}
      </div>

      <div className="mt-12 rounded-[var(--button-radius)] bg-[var(--color-surface)] p-6 text-center">
        <p className="text-sm font-semibold">Still have questions?</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Our support team is here to help. Reach out to us anytime.
        </p>
        <a
          href="mailto:hello@earthrevibe.com"
          className="mt-3 inline-block rounded-[var(--button-radius)] bg-[var(--color-primary)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
