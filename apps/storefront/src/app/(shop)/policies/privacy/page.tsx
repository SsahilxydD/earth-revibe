import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Earth Revibe collects, uses, and protects your personal information. Compliant with the Indian IT Act.",
};

export default function PrivacyPolicyPage() {
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
          <li className="text-[var(--primary-text)]">Privacy Policy</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="font-[var(--font-display)] text-3xl lg:text-4xl font-semibold text-[var(--chocolate)] mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[var(--muted-text)] mb-10">Last updated: March 2026</p>

      {/* Content */}
      <div className="space-y-8 text-[var(--secondary-text)] leading-relaxed">
        <p>
          Earth Revibe (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
          protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you visit our website or make a purchase. This policy is
          published in compliance with the Information Technology Act, 2000 and the Information
          Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
          Information) Rules, 2011.
        </p>

        {/* Information We Collect */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Information We Collect
          </h2>
          <p className="mb-3">
            <strong className="text-[var(--primary-text)]">Personal Information</strong>
          </p>
          <p className="mb-2">
            When you create an account or place an order, we may collect the following:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping and billing address</li>
            <li>Payment information (processed securely through Razorpay)</li>
          </ul>

          <p className="mt-4 mb-2">
            <strong className="text-[var(--primary-text)]">Automatically Collected Information</strong>
          </p>
          <p className="mb-2">
            When you browse our website, we automatically collect certain device and usage data,
            including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>IP address and browser type</li>
            <li>Operating system</li>
            <li>Pages viewed and links clicked</li>
            <li>Access times and referring URLs</li>
          </ul>
        </section>

        {/* How We Use Your Information */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            How We Use Your Information
          </h2>
          <p className="mb-2">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Process and fulfil your orders</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Communicate about products, services, and sustainability initiatives</li>
            <li>Improve our website and customer experience</li>
            <li>Prevent fraudulent transactions and protect against misuse</li>
            <li>Comply with applicable legal obligations under Indian law</li>
          </ul>
        </section>

        {/* Data Sharing */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Data Sharing
          </h2>
          <p className="mb-2">We share your information only with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Shipping partners (Delhivery, BlueDart, etc.) to deliver your orders</li>
            <li>Payment processors (Razorpay) for secure transaction handling</li>
            <li>Analytics providers who help us understand site usage</li>
            <li>Law enforcement agencies, when required by law</li>
          </ul>
          <p className="mt-3 font-medium text-[var(--primary-text)]">
            We do NOT sell, rent, or trade your personal information to third parties for marketing
            purposes.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Cookies
          </h2>
          <p>
            We use cookies and similar tracking technologies to enhance your browsing experience,
            remember your preferences, analyse site traffic, and personalise content. You can manage
            cookie preferences through your browser settings, though disabling cookies may affect
            certain site functionality.
          </p>
        </section>

        {/* Security */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Security
          </h2>
          <p>
            We implement industry-standard security measures to protect your personal data. All
            payment transactions are processed through Razorpay, a PCI-DSS compliant payment
            gateway. We do not store your complete credit or debit card details on our servers.
            While we strive to protect your information, no method of electronic transmission or
            storage is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Your Rights
          </h2>
          <p className="mb-2">
            Under applicable Indian data protection laws, you have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate or incomplete data</li>
            <li>Request deletion of your personal information</li>
            <li>Withdraw consent for marketing communications at any time</li>
            <li>Lodge a grievance with our Grievance Officer</li>
          </ul>
        </section>

        {/* Compliance with Indian IT Act */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Compliance with Indian IT Act
          </h2>
          <p>
            This policy is published in accordance with the provisions of the Information Technology
            Act, 2000 and the rules made thereunder, including the IT (Reasonable Security Practices
            and Procedures and Sensitive Personal Data or Information) Rules, 2011. We maintain
            reasonable security practices and procedures as mandated by Indian law for the
            protection of sensitive personal data.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-3">
            Contact Us
          </h2>
          <p className="mb-2">
            If you have questions or concerns about this Privacy Policy, or wish to exercise any of
            your rights, please contact us:
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
          <p className="mt-2 text-sm text-[var(--muted-text)]">
            Our customer support team is available Monday to Saturday, 10:00 AM to 7:00 PM IST.
          </p>
        </section>
      </div>
    </div>
  );
}
