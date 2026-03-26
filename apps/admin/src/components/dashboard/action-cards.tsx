'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Truck, CreditCard, Globe, Palette, X, BarChart3 } from 'lucide-react';

interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  bgColor: string;
  dismissible?: boolean;
}

const defaultCards: ActionCard[] = [
  {
    id: 'products',
    title: 'Add your first product',
    description:
      'Write a description, add photos, and set pricing for the products you plan to sell.',
    icon: <Package size={32} className="text-deep-earth" />,
    primaryAction: { label: 'Add product', href: '/products/new' },
    bgColor: 'bg-[#F1F8E9]',
  },
  {
    id: 'payments',
    title: 'Set up Razorpay payments',
    description:
      'Start accepting payments by connecting your Razorpay account. Accept UPI, cards, netbanking and more.',
    icon: <CreditCard size={32} className="text-orange-600" />,
    primaryAction: { label: 'Set up payments', href: '/settings/payments' },
    bgColor: 'bg-orange-50',
  },
  {
    id: 'shipping',
    title: 'Set up shipping with Shiprocket',
    description:
      'Connect Shiprocket for automated shipping labels, tracking, and delivery management across India.',
    icon: <Truck size={32} className="text-blue-600" />,
    primaryAction: { label: 'Set up shipping', href: '/settings/shipping' },
    bgColor: 'bg-blue-50',
  },
  {
    id: 'customize',
    title: 'Customize your online store',
    description:
      'Choose a theme and add your brand colors, logo, and images to reflect your brand identity.',
    icon: <Palette size={32} className="text-purple-600" />,
    primaryAction: { label: 'Customize theme', href: '/settings/brand' },
    bgColor: 'bg-purple-50',
  },
  {
    id: 'domain',
    title: 'Add a custom domain',
    description:
      'Your current domain is earthrevibe.com. Add or connect a custom domain to help customers find your store.',
    icon: <Globe size={32} className="text-emerald-600" />,
    primaryAction: { label: 'Add domain', href: '/settings/domains' },
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'marketing',
    title: 'Share your store on social media',
    description:
      'Drive traffic by sharing your products on Instagram, Facebook, and WhatsApp. Get your first customers today.',
    icon: <BarChart3 size={32} className="text-pink-600" />,
    primaryAction: { label: 'Create campaign', href: '/settings/domains' },
    bgColor: 'bg-pink-50',
  },
];

export function ActionCards() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleCards = defaultCards.filter((c) => !dismissed.has(c.id));

  if (visibleCards.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleCards.map((card) => (
        <div
          key={card.id}
          className="bg-white rounded-xl border border-light-gray overflow-hidden hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start gap-5 p-5">
            {/* Icon area */}
            <div
              className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center flex-shrink-0`}
            >
              {card.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-charcoal">{card.title}</h3>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(card.id))}
                  className="p-1 rounded-md text-medium-gray hover:text-dark-gray hover:bg-off-white transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm text-medium-gray mt-1 leading-relaxed">{card.description}</p>
              {card.primaryAction && (
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={card.primaryAction.href}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-charcoal text-white text-xs font-medium rounded-lg hover:bg-charcoal/90 transition-colors"
                  >
                    {card.primaryAction.label}
                  </Link>
                  {card.secondaryAction && (
                    <Link
                      href={card.secondaryAction.href}
                      className="text-xs font-medium text-deep-earth hover:underline"
                    >
                      {card.secondaryAction.label}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
