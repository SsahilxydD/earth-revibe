import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Earth Revibe',
  description:
    "Read Earth Revibe's terms and conditions governing the use of our website and services.",
};

export default function TermsPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Last updated: 1 January 2026</p>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8 text-sm leading-[1.8] text-[var(--color-muted)] md:py-14">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using the Earth Revibe website (www.earthrevibe.com), you accept and
            agree to be bound by these Terms & Conditions. If you do not agree to these terms,
            please do not use our website or services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            2. Use of the Website
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You must be at least 18 years old to make purchases on our website.</li>
            <li>
              You are responsible for maintaining the confidentiality of your account credentials.
            </li>
            <li>
              You agree to provide accurate, current, and complete information during registration
              and checkout.
            </li>
            <li>You agree not to use the website for any unlawful or prohibited purpose.</li>
            <li>
              We reserve the right to refuse service, terminate accounts, or cancel orders at our
              discretion.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            3. Products and Pricing
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              All prices are listed in Indian Rupees (INR) and are inclusive of GST unless otherwise
              stated.
            </li>
            <li>
              We strive to display accurate product colours and details, but we cannot guarantee
              that your device&apos;s display accurately reflects the actual product.
            </li>
            <li>
              We reserve the right to modify prices without prior notice. Price changes will not
              affect orders already placed and confirmed.
            </li>
            <li>
              In the event of a pricing error, we reserve the right to cancel the order and issue a
              full refund.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            4. Orders and Payment
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              An order is confirmed only after successful payment processing. You will receive an
              order confirmation email.
            </li>
            <li>
              We reserve the right to cancel or refuse any order for reasons including but not
              limited to: product unavailability, pricing errors, suspected fraud, or violation of
              these terms.
            </li>
            <li>
              Payment is processed securely through Razorpay. We accept UPI, credit/debit cards, net
              banking, wallets, and Cash on Delivery (subject to availability).
            </li>
            <li>
              For COD orders, we reserve the right to verify the order via phone before dispatch.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            5. Shipping and Delivery
          </h2>
          <p>
            Please refer to our{' '}
            <a
              href="/policies/shipping"
              className="font-semibold text-[var(--color-text)] underline"
            >
              Shipping Policy
            </a>{' '}
            for detailed information on shipping charges, delivery timelines, and shipping partners.
            Delivery timelines are estimates and may vary due to unforeseen circumstances.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            6. Returns and Refunds
          </h2>
          <p>
            Please refer to our{' '}
            <a
              href="/policies/returns"
              className="font-semibold text-[var(--color-text)] underline"
            >
              Returns & Exchange Policy
            </a>{' '}
            for detailed information on returns, exchanges, and refund processing.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            7. Intellectual Property
          </h2>
          <p>
            All content on this website, including text, graphics, logos, images, designs, and
            software, is the property of Earth Revibe and is protected under Indian copyright and
            trademark laws. You may not reproduce, distribute, modify, or use any content without
            our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            8. User Content
          </h2>
          <p>
            By submitting reviews, comments, or any content on our website, you grant Earth Revibe a
            non-exclusive, royalty-free, perpetual licence to use, reproduce, and display such
            content. You are responsible for the accuracy and legality of any content you submit.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            9. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Earth Revibe shall not be liable for any
            indirect, incidental, special, or consequential damages arising from your use of our
            website or purchase of our products. Our total liability shall not exceed the amount
            paid by you for the specific product giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            10. Governing Law
          </h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of India. Any
            disputes arising from these terms or your use of the website shall be subject to the
            exclusive jurisdiction of the courts in Mumbai, Maharashtra.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            11. Changes to Terms
          </h2>
          <p>
            We reserve the right to update these terms at any time. Changes will be effective
            immediately upon posting on this page. Continued use of the website after changes
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            12. Contact Us
          </h2>
          <p>For any questions regarding these terms, please contact us at:</p>
          <div className="mt-2">
            <p>
              <strong>Earth Revibe</strong>
            </p>
            <p>Bandra West, Mumbai, Maharashtra 400050, India</p>
            <p>
              Email:{' '}
              <a
                href="mailto:contact@earthrevibe.in"
                className="font-semibold text-[var(--color-text)] underline"
              >
                contact@earthrevibe.in
              </a>
            </p>
            <p>Phone: +91 93287 06759</p>
          </div>
        </section>
      </div>
    </div>
  );
}
