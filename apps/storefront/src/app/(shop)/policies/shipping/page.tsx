import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Earth Revibe shipping information — free delivery above Rs 1,499, delivery timelines across India, and order tracking.",
};

export default function ShippingPolicyPage() {
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
          <li className="text-[var(--primary-text)]">Shipping Policy</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="font-[var(--font-display)] text-3xl lg:text-4xl font-semibold text-[var(--chocolate)] mb-2">
        Shipping Policy
      </h1>
      <p className="text-sm text-[var(--muted-text)] mb-10">Last updated: March 2026</p>

      {/* Content */}
      <div className="space-y-8 text-[var(--secondary-text)] leading-relaxed">
        <p>
          At Earth Revibe, we are committed to delivering your sustainable fashion essentials
          quickly and reliably. Here is everything you need to know about our shipping process.
        </p>

        {/* Delivery Areas */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Delivery Areas
          </h2>
          <p>
            We currently ship to all serviceable pin codes across{" "}
            <strong className="text-[var(--primary-text)]">India only</strong>. International
            shipping is not available at this time. If you are ordering from outside India, please
            check back — we plan to expand internationally in the future.
          </p>
        </section>

        {/* Shipping Rates */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Shipping Rates
          </h2>
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 bg-[var(--sage-light)]">
              <span className="font-medium text-[var(--primary-text)]">
                Orders above &#8377;1,499
              </span>
              <span className="font-semibold text-[var(--chocolate)]">FREE Shipping</span>
            </div>
            <div className="flex justify-between items-center px-5 py-4">
              <span className="font-medium text-[var(--primary-text)]">
                Orders below &#8377;1,499
              </span>
              <span className="font-semibold text-[var(--chocolate)]">&#8377;99 flat rate</span>
            </div>
          </div>
        </section>

        {/* Delivery Times */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Delivery Times
          </h2>
          <p className="mb-3">
            Orders are processed within 1&ndash;2 business days. Estimated delivery times after
            dispatch:
          </p>
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden text-sm">
            <div className="grid grid-cols-2 px-5 py-3 bg-[var(--card-bg)] font-medium text-[var(--primary-text)]">
              <span>Region</span>
              <span className="text-right">Estimated Delivery</span>
            </div>
            <div className="grid grid-cols-2 px-5 py-3 border-t border-[var(--border-color)]">
              <div>
                <p className="font-medium text-[var(--primary-text)]">Metro Cities</p>
                <p className="text-xs text-[var(--muted-text)]">
                  Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad
                </p>
              </div>
              <span className="text-right font-medium text-[var(--primary-text)]">2&ndash;4 days</span>
            </div>
            <div className="grid grid-cols-2 px-5 py-3 border-t border-[var(--border-color)] bg-[var(--card-bg)]">
              <div>
                <p className="font-medium text-[var(--primary-text)]">Rest of India</p>
                <p className="text-xs text-[var(--muted-text)]">
                  Tier 2 &amp; 3 cities, towns, and rural areas
                </p>
              </div>
              <span className="text-right font-medium text-[var(--primary-text)]">4&ndash;7 days</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--muted-text)] italic">
            * Delivery times are estimates and may vary due to weather, holidays, or other factors
            beyond our control.
          </p>
        </section>

        {/* Order Tracking */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Order Tracking
          </h2>
          <p className="mb-2">Once your order has shipped:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>You will receive an email and SMS with your tracking number.</li>
            <li>Use the tracking link in the email to follow your shipment in real time.</li>
            <li>
              You can also track your order from your{" "}
              <Link
                href="/account/orders"
                className="text-[var(--chocolate)] underline hover:no-underline"
              >
                account dashboard
              </Link>
              .
            </li>
          </ol>
        </section>

        {/* Shipping Partners */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Shipping Partners
          </h2>
          <p className="mb-2">
            We work with trusted logistics partners to ensure safe and timely delivery:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Delhivery</li>
            <li>BlueDart</li>
            <li>Shiprocket</li>
            <li>India Post (for remote areas)</li>
          </ul>
          <p className="mt-2">
            The carrier is automatically selected based on your pin code to ensure the fastest
            possible delivery.
          </p>
        </section>

        {/* Delivery Attempts & Issues */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Delivery Attempts &amp; Issues
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Our shipping partners will make up to 3 delivery attempts.</li>
            <li>If delivery fails after 3 attempts, the package will be returned to us.</li>
            <li>Please ensure your shipping address and phone number are correct at checkout.</li>
            <li>
              For any shipping issues, contact us at{" "}
              <a
                href="mailto:hello@earthrevibe.in"
                className="text-[var(--chocolate)] underline hover:no-underline"
              >
                hello@earthrevibe.in
              </a>{" "}
              with your order number.
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Contact Us
          </h2>
          <p className="mb-2">For shipping enquiries:</p>
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
