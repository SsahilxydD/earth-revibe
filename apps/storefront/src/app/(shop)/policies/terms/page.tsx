import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions governing your use of the Earth Revibe website and purchase of our products.",
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 lg:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center gap-2 text-xs text-[var(--muted-text)]">
          <li>
            <Link href="/" className="hover:text-[var(--chocolate)] transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-[var(--primary-text)]">Terms of Service</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="font-[var(--font-display)] text-3xl lg:text-4xl font-semibold text-[var(--chocolate)] mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-[var(--muted-text)] mb-10">Last updated: March 2026</p>

      {/* Content */}
      <div className="space-y-8 text-[var(--secondary-text)] leading-relaxed">
        <p>
          Welcome to Earth Revibe. These Terms of Service (&quot;Terms&quot;) govern your use of
          our website and your purchase of products from us. By accessing or using our site, you
          agree to be bound by these Terms. If you do not agree, please do not use our website.
        </p>

        {/* Acceptance of Terms */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Acceptance of Terms
          </h2>
          <p>
            By accessing this website, you confirm that you are at least 18 years of age (or have
            parental or guardian consent) and agree to comply with these Terms. We may update these
            Terms from time to time, and your continued use of the site constitutes acceptance of
            any changes.
          </p>
        </section>

        {/* Account Terms */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Account Terms
          </h2>
          <p className="mb-2">When you create an account on our site:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must provide accurate, current, and complete information during registration.</li>
            <li>You must notify us immediately of any unauthorised use of your account.</li>
            <li>
              We reserve the right to suspend or terminate accounts that violate these Terms or
              engage in fraudulent activity.
            </li>
          </ul>
        </section>

        {/* Products and Pricing */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Products and Pricing
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>All products are subject to availability.</li>
            <li>We reserve the right to discontinue any product at any time without notice.</li>
            <li>
              All prices are listed in{" "}
              <strong className="text-[var(--primary-text)]">Indian Rupees (INR)</strong> and are
              inclusive of applicable GST.
            </li>
            <li>We reserve the right to modify prices without prior notice.</li>
            <li>
              Promotional offers and discount codes are valid for limited periods as specified and
              cannot be combined unless stated otherwise.
            </li>
            <li>
              Product images are for illustration purposes. Actual colours may vary slightly due
              to screen settings and the natural characteristics of sustainable fabrics.
            </li>
          </ul>
        </section>

        {/* Payment */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Payment
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Payment must be made in full at the time of purchase.</li>
            <li>
              We accept major credit cards, debit cards, UPI, net banking, and popular wallets
              through our payment partner Razorpay.
            </li>
            <li>
              All payment information is processed securely through Razorpay&apos;s PCI-DSS
              compliant gateway.
            </li>
            <li>We reserve the right to refuse or cancel any order for any reason, including suspected fraud.</li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Intellectual Property
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              All content on this site — including text, images, graphics, logos, product designs,
              and branding — is the property of Earth Revibe and is protected by Indian and
              international copyright laws.
            </li>
            <li>
              You may not reproduce, distribute, modify, or create derivative works from our
              content without prior written permission.
            </li>
            <li>The Earth Revibe name, logo, and all related marks are our registered trademarks.</li>
          </ul>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Limitation of Liability
          </h2>
          <p className="mb-2">To the fullest extent permitted by applicable law:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Earth Revibe shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the site or purchase of products.
            </li>
            <li>
              Our total liability for any claim shall not exceed the amount you paid for the
              specific product giving rise to the claim.
            </li>
            <li>
              We do not guarantee that the website will be available at all times, error-free, or
              free of viruses or other harmful components.
            </li>
          </ul>
        </section>

        {/* Governing Law */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. Any
            disputes arising from or related to these Terms or your use of the website shall be
            subject to the exclusive jurisdiction of the courts in New Delhi, India.
          </p>
        </section>

        {/* Changes to Terms */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Changes to These Terms
          </h2>
          <p>
            We may revise these Terms at any time by updating this page. The &quot;Last updated&quot;
            date at the top will reflect the most recent revision. We encourage you to review this
            page periodically. Your continued use of the site after changes are posted constitutes
            your acceptance of the revised Terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Contact Us
          </h2>
          <p className="mb-2">
            If you have questions about these Terms of Service, please contact us:
          </p>
          <p>
            Email:{" "}
            <a
              href="mailto:hello@earthrevibe.in"
              className="text-[var(--chocolate)] underline hover:no-underline"
            >
              hello@earthrevibe.in
            </a>
          </p>
        </section>

        {/* Acknowledgement */}
        <div className="mt-4 p-5 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)]">
          <p className="text-sm text-[var(--muted-text)] italic">
            By using Earth Revibe, you acknowledge that you have read, understood, and agree to be
            bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
