import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy | Earth Revibe',
  description:
    'Earth Revibe shipping information. Free shipping on all orders. Delivery timelines and shipping partners.',
};

export default function ShippingPolicyPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">
          Shipping Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Last updated: 1 January 2026</p>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8 text-sm leading-[1.8] text-[var(--color-muted)] md:py-14">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Shipping Charges
          </h2>
          <p>
            We offer{' '}
            <strong className="text-[var(--color-text)]">free shipping on all orders</strong> across
            India. No minimum order value required.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Delivery Timelines
          </h2>
          <div className="overflow-hidden rounded-[var(--button-radius)] border border-[var(--color-border)]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--color-surface)]">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                    Delivery Type
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                    Metro Cities
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                    Other Locations
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">Standard</td>
                  <td className="px-4 py-3">5-7 business days</td>
                  <td className="px-4 py-3">7-10 business days</td>
                </tr>
                <tr className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">Express*</td>
                  <td className="px-4 py-3">2-3 business days</td>
                  <td className="px-4 py-3">3-5 business days</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs">
            *Express delivery is available at select pin codes for an additional charge.
            Availability will be shown at checkout.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Shipping Partners
          </h2>
          <p>
            We partner with India&apos;s most trusted logistics providers to ensure safe and timely
            delivery:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Delhivery</li>
            <li>Blue Dart</li>
            <li>DTDC</li>
            <li>India Post (for remote areas)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Order Processing
          </h2>
          <p>
            Orders are processed within 1-2 business days after payment confirmation. Orders placed
            after 5 PM IST or on weekends/holidays will be processed on the next business day.
          </p>
          <p className="mt-2">
            During sale periods and festive seasons, processing may take an additional 1-2 days due
            to high order volumes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Order Tracking
          </h2>
          <p>
            Once your order is shipped, you will receive a tracking link via email and SMS. You can
            track your order at any time from:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your account dashboard under &quot;My Orders&quot;</li>
            <li>
              Our{' '}
              <a href="/track-order" className="font-semibold text-[var(--color-text)] underline">
                Track Order
              </a>{' '}
              page using your order number
            </li>
            <li>Directly on the courier partner&apos;s website using the AWB number</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Shipping Restrictions
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We currently ship only within India.</li>
            <li>Delivery to P.O. Boxes is not available.</li>
            <li>
              Some remote areas may have limited courier access. If we are unable to deliver to your
              pin code, we will notify you within 24 hours and process a full refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Delivery Issues
          </h2>
          <p>
            If your package is lost, damaged during transit, or significantly delayed (more than 15
            business days), please contact us immediately. We will investigate with our courier
            partner and arrange a replacement or full refund.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Contact Us
          </h2>
          <p>For shipping-related queries, contact us at:</p>
          <div className="mt-2">
            <p>
              Email:{' '}
              <a
                href="mailto:contact@earthrevibe.in"
                className="font-semibold text-[var(--color-text)] underline"
              >
                contact@earthrevibe.in
              </a>
            </p>
            <p>Phone: +91 93287 06759 (Mon-Sat, 10 AM - 7 PM IST)</p>
          </div>
        </section>
      </div>
    </div>
  );
}
