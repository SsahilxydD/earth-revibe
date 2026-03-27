import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Earth Revibe',
  description:
    "Read Earth Revibe's privacy policy. Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div>
      <section className="border-b border-[var(--color-border)] py-12 text-center md:py-16">
        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] md:text-3xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Last updated: 1 January 2026</p>
      </section>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8 text-sm leading-[1.8] text-[var(--color-muted)] md:py-14">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            1. Information We Collect
          </h2>
          <p>
            When you visit Earth Revibe (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), we
            collect certain information about you to provide and improve our services:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Personal Information:</strong> Name, email address, phone number, shipping and
              billing address when you create an account or place an order.
            </li>
            <li>
              <strong>Payment Information:</strong> Payment details are processed securely by our
              payment partner Razorpay. We do not store your credit/debit card details on our
              servers.
            </li>
            <li>
              <strong>Usage Data:</strong> IP address, browser type, device information, pages
              visited, and interactions on our website, collected through cookies and similar
              technologies.
            </li>
            <li>
              <strong>Communications:</strong> Records of your correspondence with us via email,
              chat, or phone.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Process and fulfil your orders</li>
            <li>Send order confirmations, shipping updates, and delivery notifications</li>
            <li>Provide customer support and respond to your queries</li>
            <li>Send promotional emails and newsletters (with your consent)</li>
            <li>Improve our website, products, and services</li>
            <li>Prevent fraud and ensure the security of our platform</li>
            <li>Comply with legal obligations under Indian law</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            3. Information Sharing
          </h2>
          <p>
            We do not sell or rent your personal information to third parties. We may share your
            information with:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Shipping Partners:</strong> To deliver your orders (e.g., Delhivery, Blue
              Dart, India Post).
            </li>
            <li>
              <strong>Payment Processors:</strong> Razorpay for secure payment processing.
            </li>
            <li>
              <strong>Analytics Providers:</strong> Google Analytics to understand website usage
              patterns.
            </li>
            <li>
              <strong>Law Enforcement:</strong> When required by law or to protect our rights.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            4. Cookies
          </h2>
          <p>
            We use cookies and similar technologies to enhance your browsing experience, remember
            your preferences, and analyse site traffic. You can manage your cookie preferences
            through your browser settings. Disabling cookies may affect certain features of our
            website.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            5. Data Security
          </h2>
          <p>
            We implement industry-standard security measures including SSL encryption, secure
            servers, and regular security audits to protect your personal information. However, no
            method of transmission over the Internet is 100% secure, and we cannot guarantee
            absolute security.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            6. Data Retention
          </h2>
          <p>
            We retain your personal information for as long as your account is active or as needed
            to provide you services, comply with our legal obligations, resolve disputes, and
            enforce our agreements. Order data is retained for a minimum of 8 years as per Indian
            tax regulations.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            7. Your Rights
          </h2>
          <p>
            Under the Digital Personal Data Protection Act, 2023 (DPDPA), you have the right to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access your personal data held by us</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your personal data</li>
            <li>Withdraw consent for data processing</li>
            <li>Register a complaint with the Data Protection Board of India</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please email us at{' '}
            <a
              href="mailto:contact@earthrevibe.in"
              className="font-semibold text-[var(--color-text)] underline"
            >
              contact@earthrevibe.in
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            8. Children&apos;s Privacy
          </h2>
          <p>
            Our website is not intended for children under the age of 18. We do not knowingly
            collect personal information from children. If you believe a child has provided us with
            their information, please contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. Any changes will be posted on this
            page with an updated revision date. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-text)]">
            10. Contact Us
          </h2>
          <p>If you have any questions about this privacy policy, please contact us at:</p>
          <div className="mt-2">
            <p>
              <strong>Earth Revibe</strong>
            </p>
            <p>Ashram Road, Ahmedabad, Gujarat 380009, India</p>
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
