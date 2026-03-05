"use client";

import Link from "next/link";

const shopLinks = [
  { name: "All Products", href: "/products" },
  { name: "Tops & Basics", href: "/categories/tops-basics" },
  { name: "Bottoms & Pants", href: "/categories/bottoms-pants" },
  { name: "Outerwear", href: "/categories/outerwear-jackets" },
];

const companyLinks = [
  { name: "Our Story", href: "/about" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "/contact" },
  { name: "FAQ", href: "/faq" },
];

const policyLinks = [
  { name: "Shipping Policy", href: "/shipping" },
  { name: "Returns & Exchanges", href: "/returns" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-deep-earth text-white/80 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-heading text-xl font-bold text-white mb-3">Earth Revibe</h3>
            <p className="text-sm leading-relaxed mb-4">
              Sustainable clothing crafted with care for you and the planet. Premium quality, conscious fashion.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Shop</h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Policies</h4>
            <ul className="space-y-2.5">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} Earth Revibe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
