import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Exchange Policy | Earth Revibe',
  description:
    "Learn about Earth Revibe's hassle-free 72-hour return and exchange policy. Easy returns, quick refunds.",
};

export default function ReturnsPolicyPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">
          Returns & Exchange Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Last updated: 1 January 2026</p>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8 text-sm leading-[1.8] text-[var(--color-muted)] md:py-14">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Easy 72-Hour Returns
          </h2>
          <p>
            We want you to love every piece you buy from Earth Revibe. If you are not completely
            satisfied with your purchase, you can return it within 72 hours of delivery for a full
            refund or exchange.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Return Eligibility
          </h2>
          <p>To be eligible for a return, the item must be:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Unused, unwashed, and in its original condition</li>
            <li>In its original packaging with all tags attached</li>
            <li>Returned within 72 hours of the delivery date</li>
            <li>Accompanied by the original invoice or order confirmation</li>
          </ul>
          <p className="mt-3 font-semibold text-[var(--color-text)]">
            Items NOT eligible for return:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Items purchased during sale or with discount codes</li>
            <li>Innerwear, socks, and accessories</li>
            <li>Customised or personalised items</li>
            <li>Items showing signs of wear, washing, or alteration</li>
            <li>Items without original tags and packaging</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            How to Initiate a Return
          </h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Log in to your Earth Revibe account and navigate to <strong>My Orders</strong>.
            </li>
            <li>Select the order containing the item you wish to return.</li>
            <li>
              Click <strong>&quot;Return&quot;</strong> next to the item and select your reason for
              return.
            </li>
            <li>
              Choose your preferred resolution: <strong>Refund</strong> or <strong>Exchange</strong>
              .
            </li>
            <li>
              Schedule a pickup from your address. Our courier partner will collect the item within
              2-3 business days.
            </li>
          </ol>
          <p className="mt-3">
            Alternatively, you can email us at{' '}
            <a
              href="mailto:contact@earthrevibe.in"
              className="font-semibold text-[var(--color-text)] underline"
            >
              contact@earthrevibe.in
            </a>{' '}
            with your order number and reason for return.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Exchanges
          </h2>
          <p>
            Want a different size or colour? We are happy to exchange your item, subject to
            availability. The exchange process follows the same steps as a return. If the desired
            size or colour is not available, we will process a full refund instead.
          </p>
          <p className="mt-2">
            Exchange shipping is free for your first exchange per order. For additional exchanges,
            standard shipping charges apply.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Refunds
          </h2>
          <p>
            Once we receive and inspect the returned item, we will notify you via email about the
            approval or rejection of your refund.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Approved refunds</strong> are processed within 5-7 business days.
            </li>
            <li>
              <strong>UPI/Wallet payments:</strong> Refunded to the original payment source within
              2-3 business days.
            </li>
            <li>
              <strong>Credit/Debit Card:</strong> Refunded within 5-7 business days (may take up to
              10 days depending on your bank).
            </li>
            <li>
              <strong>COD orders:</strong> Refunded via bank transfer. Please provide your bank
              details when initiating the return.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Damaged or Defective Items
          </h2>
          <p>
            If you receive a damaged or defective item, please contact us within 48 hours of
            delivery with clear photographs of the damage. We will arrange a free return pickup and
            send you a replacement or full refund immediately, no questions asked.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Return Shipping
          </h2>
          <p>
            Return shipping is free for all eligible returns. Our courier partner will pick up the
            item from your doorstep. Please ensure the item is securely packed in its original
            packaging.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            Contact Us
          </h2>
          <p>For any return or exchange related queries, reach out to us at:</p>
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
