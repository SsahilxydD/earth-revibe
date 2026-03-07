'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const footerLinks = {
  shop: [
    { name: 'All Products', href: '/products' },
    { name: 'T-Shirts', href: '/categories/t-shirts' },
    { name: 'Shirts', href: '/categories/shirts' },
    { name: 'Polos', href: '/categories/polos' },
    { name: 'Cargo Pants', href: '/categories/cargo-pants' },
    { name: 'Outerwear', href: '/categories/outerwear' },
  ],
  help: [
    { name: 'Shipping', href: '/policies/shipping' },
    { name: 'Returns', href: '/policies/returns' },
    { name: 'Size Guide', href: '/size-guide' },
    { name: 'Track Order', href: '/track-order' },
    { name: 'FAQ', href: '/faq' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Privacy', href: '/policies/privacy' },
    { name: 'Terms', href: '/policies/terms' },
  ],
};

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  const handleNewsletterSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) {
      setSubscriptionMessage({ type: 'error', text: 'Please enter a valid email address' });
      setTimeout(() => setSubscriptionMessage({ type: null, text: '' }), 5000);
      return;
    }
    setIsSubscribing(true);
    setSubscriptionMessage({ type: null, text: '' });
    // Store locally for now
    try {
      const existing = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
      existing.push({ email, date: new Date().toISOString() });
      localStorage.setItem('newsletter_subscribers', JSON.stringify(existing));
      setEmail('');
      setSubscriptionMessage({ type: 'success', text: 'Successfully subscribed to newsletter!' });
      setTimeout(() => setSubscriptionMessage({ type: null, text: '' }), 5000);
    } catch {
      setSubscriptionMessage({ type: 'error', text: 'An error occurred. Please try again later.' });
      setTimeout(() => setSubscriptionMessage({ type: null, text: '' }), 5000);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-white border-t border-transparent" style={{ display: 'block', width: '100%', borderTopColor: 'transparent' }}>
      {/* Mobile Footer */}
      <div className="md:hidden">
        <div className="px-6 pt-12 pb-20">
          {/* Logo */}
          <div className="flex justify-center pb-[48px]">
            <Image
              src="/Earth Revibe Logo Black.png"
              alt="Earth Revibe"
              width={100}
              height={28}
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>

          {/* Links */}
          <div className="grid grid-cols-3 gap-2 px-2">
            <div className="text-center">
              <h2 className="text-[11px] font-[var(--font-sans)] font-normal tracking-[0.1em] uppercase text-slate-800 mb-3">Shop</h2>
              <ul className="space-y-[6px]">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[11px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <h2 className="text-[11px] font-[var(--font-sans)] font-normal tracking-[0.1em] uppercase text-slate-800 mb-3">Help</h2>
              <ul className="space-y-[6px]">
                {footerLinks.help.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[11px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <h2 className="text-[11px] font-[var(--font-sans)] font-normal tracking-[0.1em] uppercase text-slate-800 mb-3">Company</h2>
              <ul className="space-y-[6px]">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[11px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="mt-8 pt-8 border-t border-slate-100 px-2">
            <h2 className="text-[11px] font-[var(--font-sans)] font-normal tracking-[0.12em] uppercase text-slate-800 mb-4 text-center">Newsletter</h2>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={isSubscribing}
                  className="flex-1 px-4 py-3 text-[12px] border border-slate-200 focus:border-black focus:outline-none transition-colors font-[var(--font-sans)] font-light disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-6 py-3 bg-black text-white text-[10px] font-normal tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors font-[var(--font-sans)] disabled:opacity-50"
                >
                  {isSubscribing ? '...' : 'Join'}
                </button>
              </div>
              {subscriptionMessage.type && (
                <p className={`text-[11px] text-center font-[var(--font-sans)] font-light ${subscriptionMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {subscriptionMessage.text}
                </p>
              )}
            </form>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-[var(--font-sans)] font-light">
              &copy; {new Date().getFullYear()} Earth Revibe. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Footer */}
      <div className="hidden md:block w-full">
        <div className="w-full py-16">
          {/* Logo at Top */}
          <div className="mb-16 lg:mb-20 text-center w-full" style={{ marginBottom: '80px' }}>
            <div className="flex justify-center mb-4">
              <Image
                src="/Earth Revibe Logo Black.png"
                alt="Earth Revibe"
                width={140}
                height={40}
                className="object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-3 mb-12 w-full px-16 lg:px-32 xl:px-48">
            <div className="text-center">
              <h2 className="text-[14px] font-[var(--font-sans)] font-normal tracking-[0.12em] uppercase text-slate-800 mb-5">Shop</h2>
              <ul className="space-y-3">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[13px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <h2 className="text-[14px] font-[var(--font-sans)] font-normal tracking-[0.12em] uppercase text-slate-800 mb-5">Help</h2>
              <ul className="space-y-3">
                {footerLinks.help.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[13px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <h2 className="text-[14px] font-[var(--font-sans)] font-normal tracking-[0.12em] uppercase text-slate-800 mb-5">Company</h2>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-[13px] text-slate-500 hover:text-black transition-colors duration-300 font-[var(--font-sans)] font-light">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter at Bottom */}
          <div className="pt-8 border-t border-slate-100 text-center">
            <h2 className="text-[14px] font-[var(--font-sans)] font-normal tracking-[0.12em] uppercase text-slate-800 mb-5">Newsletter</h2>
            <p className="text-[12px] text-slate-500 mb-6 font-[var(--font-sans)] font-light">Subscribe for updates</p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="flex gap-2 max-w-md mx-auto items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  disabled={isSubscribing}
                  className="flex-1 px-4 py-2 text-[12px] border border-slate-200 focus:border-black focus:outline-none transition-colors text-center font-[var(--font-sans)] font-light disabled:opacity-50"
                  style={{ textAlign: 'center', height: '40px', lineHeight: '1' }}
                  required
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-4 py-2 bg-black text-white text-[10px] font-normal tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors text-center font-[var(--font-sans)] flex-shrink-0 disabled:opacity-50"
                  style={{ height: '40px', lineHeight: '1' }}
                >
                  {isSubscribing ? '...' : 'Subscribe'}
                </button>
              </div>
              {subscriptionMessage.type && (
                <p className={`text-[11px] font-[var(--font-sans)] font-light ${subscriptionMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {subscriptionMessage.text}
                </p>
              )}
            </form>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-[var(--font-sans)] font-light">
              &copy; {new Date().getFullYear()} Earth Revibe. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
