import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "Learn about Earth Revibe's 7-day return policy, exchange process, and refund timelines.",
};

export default function ReturnsPolicyPage() {
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
          <li className="text-[var(--primary-text)]">Returns &amp; Refunds</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="font-[var(--font-display)] text-3xl lg:text-4xl font-semibold text-[var(--chocolate)] mb-2">
        Returns &amp; Refunds
      </h1>
      <p className="text-sm text-[var(--muted-text)] mb-10">Last updated: March 2026</p>

      {/* Content */}
      <div className="space-y-8 text-[var(--secondary-text)] leading-relaxed">
        <p>
          At Earth Revibe, we want you to be completely satisfied with your purchase. If something
          doesn&apos;t work out, our straightforward return policy makes it easy to return or
          exchange your order.
        </p>

        {/* Return Eligibility */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Return Eligibility
          </h2>
          <p className="mb-2">
            You may request a return within <strong className="text-[var(--primary-text)]">7 days</strong> of
            delivery. To be eligible:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Items must be unused, unworn, and unwashed</li>
            <li>All original tags must be attached</li>
            <li>Items must be in their original packaging</li>
            <li>You must have proof of purchase (order confirmation email or receipt)</li>
          </ul>
        </section>

        {/* Condition Requirements */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Condition Requirements
          </h2>
          <p>
            Returned items are inspected upon receipt. Products that show signs of wear, washing,
            alterations, or missing tags will not be accepted for a refund or exchange and will be
            shipped back to you at your expense. We encourage you to try on items carefully and keep
            all packaging until you are sure you wish to keep the product.
          </p>
        </section>

        {/* How to Initiate a Return */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            How to Initiate a Return
          </h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Email us at{" "}
              <a
                href="mailto:hello@earthrevibe.in"
                className="text-[var(--chocolate)] underline hover:no-underline"
              >
                hello@earthrevibe.in
              </a>{" "}
              within 7 days of delivery with your order number and reason for return.
            </li>
            <li>Our team will respond within 24 hours with return instructions and a return authorisation.</li>
            <li>Pack the item securely in its original packaging and ship it back using a trackable shipping method.</li>
            <li>Once we receive and inspect the item, we will process your refund or exchange.</li>
          </ol>
        </section>

        {/* Refund Process */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Refund Process
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Refunds are processed within{" "}
              <strong className="text-[var(--primary-text)]">5&ndash;7 business days</strong> after we
              receive and inspect the returned item.
            </li>
            <li>The refund will be credited to your original payment method (credit/debit card, UPI, or net banking).</li>
            <li>You will receive an email confirmation once your refund has been initiated.</li>
            <li>Please allow an additional 3&ndash;5 business days for the refund to reflect in your bank account.</li>
          </ul>
        </section>

        {/* Exchange Policy */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Exchange Policy
          </h2>
          <p className="mb-2">
            If you would like to exchange an item for a different size or colour:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Contact us within 7 days of delivery to request an exchange.</li>
            <li>Exchanges are subject to stock availability.</li>
            <li>We will arrange pickup and delivery of the replacement item at no extra cost (within India).</li>
            <li>If the desired variant is unavailable, you may opt for a full refund instead.</li>
          </ul>
        </section>

        {/* Non-Returnable Items */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Non-Returnable Items
          </h2>
          <p className="mb-2">The following items cannot be returned or exchanged:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Items marked as &quot;Final Sale&quot; or &quot;Non-Returnable&quot;</li>
            <li>Undergarments and intimate apparel (for hygiene reasons)</li>
            <li>Items that have been worn, washed, or altered</li>
            <li>Items without original tags or packaging</li>
            <li>Gift cards and promotional vouchers</li>
          </ul>
        </section>

        {/* Damaged or Defective Items */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Damaged or Defective Items
          </h2>
          <p className="mb-2">
            If you receive a damaged or defective item, please contact us within 48 hours of
            delivery with photographs of the issue. We will arrange a free replacement or full
            refund — no return shipping required on your end.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Contact Us
          </h2>
          <p className="mb-2">For any questions about returns or refunds:</p>
          <p>
            Email:{" "}
            <a
              href="mailto:hello@earthrevibe.in"
              className="text-[var(--chocolate)] underline hover:no-underline"
            >
              hello@earthrevibe.in
            </a>
          </p>
          <p className="mt-2 text-sm text-[var(--muted-text)]">
            Our customer support team is available Monday to Saturday, 10:00 AM to 7:00 PM IST.
          </p>
        </section>
      </div>
    </div>
  );
}
