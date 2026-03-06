"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Clock } from "lucide-react";

const subjectOptions = [
  { value: "", label: "Select a topic" },
  { value: "order", label: "Order Inquiry" },
  { value: "product", label: "Product Question" },
  { value: "returns", label: "Returns & Exchanges" },
  { value: "shipping", label: "Shipping" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Other" },
];

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@earthrevibe.com",
    link: "mailto:hello@earthrevibe.com",
    note: "We typically respond within 24 hours",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91-9876543210",
    link: "tel:+919876543210",
    note: "Mon - Sat, 10am - 6pm IST",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon - Sat, 10am - 6pm IST",
    link: null,
    note: "Closed on Sundays and public holidays",
  },
];

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject) {
      newErrors.subject = "Please select a subject";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsSubmitting(false);
    setIsSubmitted(true);
    alert("Thank you! Your message has been sent. We will get back to you within 24 hours.");
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setFormData({ name: "", email: "", subject: "", message: "" });
    setErrors({});
  };

  const inputClasses =
    "w-full px-4 py-3 text-[var(--text-base)] border border-[var(--border-color)] bg-white focus:border-[var(--chocolate)] focus:outline-none transition-colors duration-200";
  const labelClasses =
    "block text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-[var(--muted-text)] mb-2";
  const errorClasses = "text-[var(--text-xs)] text-red-600 mt-1";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <section className="px-6 py-12 lg:py-20 lg:px-10 text-center border-b border-[var(--border-color)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-[24px] lg:text-[36px] font-[var(--font-display)] font-medium tracking-[0.04em] mb-4">
            Get In Touch
          </h1>
          <p className="text-[var(--text-base)] text-[var(--secondary-text)] max-w-md mx-auto">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-12 lg:py-20 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Contact Form — left (3 cols) */}
            <motion.div
              className="lg:col-span-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <h2 className="text-[var(--text-sm)] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase mb-8">
                Send Us a Message
              </h2>

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 border border-[var(--border-color)]"
                >
                  <div className="w-14 h-14 mx-auto mb-6 bg-[var(--sage)] rounded-full flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-[var(--text-sm)] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase mb-2">
                    Message Sent
                  </h3>
                  <p className="text-[var(--text-sm)] text-[var(--secondary-text)] mb-6">
                    We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={resetForm}
                    className="text-[var(--text-xs)] text-[var(--chocolate)] font-medium hover:underline"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="contact-name" className={labelClasses}>
                        Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={inputClasses}
                        placeholder="Your name"
                      />
                      {errors.name && (
                        <p className={errorClasses}>{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="contact-email" className={labelClasses}>
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={inputClasses}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className={errorClasses}>{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className={labelClasses}>
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`${inputClasses} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_12px_center]`}
                    >
                      {subjectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className={errorClasses}>{errors.subject}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-message" className={labelClasses}>
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={6}
                      className={`${inputClasses} resize-none`}
                      placeholder="How can we help you?"
                    />
                    {errors.message && (
                      <p className={errorClasses}>{errors.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[var(--chocolate)] text-white text-[var(--text-xs)] font-medium tracking-[0.08em] uppercase hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Company Info — right (2 cols) */}
            <motion.div
              className="lg:col-span-2"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <h2 className="text-[var(--text-sm)] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase mb-8">
                Contact Information
              </h2>

              <div className="space-y-8">
                {contactDetails.map((detail, index) => {
                  const IconComponent = detail.icon;
                  const content = (
                    <motion.div
                      key={detail.label}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      custom={index + 2}
                      className="flex items-start gap-4 group"
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[var(--sage-light)] flex items-center justify-center">
                        <IconComponent
                          className="w-5 h-5 text-[var(--sage)]"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div>
                        <p className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-[var(--muted-text)] mb-1">
                          {detail.label}
                        </p>
                        <p className="text-[var(--text-base)] font-medium text-[var(--primary-text)] group-hover:text-[var(--chocolate)] transition-colors">
                          {detail.value}
                        </p>
                        <p className="text-[var(--text-xs)] text-[var(--muted-text)] mt-1">
                          {detail.note}
                        </p>
                      </div>
                    </motion.div>
                  );

                  if (detail.link) {
                    return (
                      <a key={detail.label} href={detail.link}>
                        {content}
                      </a>
                    );
                  }
                  return <div key={detail.label}>{content}</div>;
                })}
              </div>

              {/* Extra info box */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={5}
                className="mt-10 p-6 bg-[var(--sage-light)] rounded-sm"
              >
                <p className="text-[var(--text-sm)] font-medium text-[var(--primary-text)] mb-2">
                  Need immediate help?
                </p>
                <p className="text-[var(--text-sm)] text-[var(--secondary-text)] leading-relaxed">
                  For urgent order-related queries, please call us during business
                  hours. For all other inquiries, email is the fastest way to reach
                  us.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
