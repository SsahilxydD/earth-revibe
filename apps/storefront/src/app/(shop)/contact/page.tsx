'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@earthrevibe.com',
    link: 'mailto:hello@earthrevibe.com',
    description: 'We typically respond within 24 hours',
  },
  {
    icon: Phone,
    title: 'Phone',
    value: '+91 98765 43210',
    link: 'tel:+919876543210',
    description: 'Mon - Fri, 10am - 6pm IST',
  },
  {
    icon: MapPin,
    title: 'Address',
    value: 'Mumbai, Maharashtra',
    link: 'https://www.openstreetmap.org',
    description: 'By appointment only',
  },
];

const faqs = [
  {
    question: 'What are the delivery times?',
    answer: 'Standard delivery takes 5-7 business days within India. Express shipping is available for 2-3 business day delivery.',
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a hassle-free 30-day return policy for all unused items in their original condition with tags attached.',
  },
  {
    question: 'How can I track my order?',
    answer: 'Once your order is shipped, you will receive a tracking number via email. You can use this number on our Track Order page.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards, UPI payments, net banking, and popular wallets. COD is also available.',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subject = encodeURIComponent(`[${formData.subject}] Contact Form: ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nSubject: ${formData.subject}\n\n${formData.message}`
    );
    const mailtoUrl = `mailto:hello@earthrevibe.com?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;

    // Show success after a brief moment to let the mail client open
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="px-6 py-12 lg:py-20 lg:px-10 text-center border-b border-slate-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-4">
            Get in Touch
          </h1>
          <p className="text-[14px] text-slate-500 max-w-md mx-auto">
            Have a question or feedback? We&apos;d love to hear from you.
          </p>
        </motion.div>
      </div>

      {/* Contact Info Cards */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {contactInfo.map((info, index) => {
              const IconComponent = info.icon;
              return (
                <motion.a
                  key={info.title}
                  href={info.link}
                  target={info.title === 'Address' ? '_blank' : undefined}
                  rel={info.title === 'Address' ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-8 hover:bg-slate-50 transition-colors group text-center lg:text-left"
                >
                  <div className="mb-6 flex justify-center lg:justify-start">
                    <IconComponent
                      className="w-6 h-6 text-slate-400 group-hover:text-black transition-colors"
                      strokeWidth={1.25}
                    />
                  </div>
                  <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-400 mb-2">
                    {info.title}
                  </p>
                  <p className="text-[14px] font-medium text-black group-hover:text-slate-600 transition-colors">
                    {info.value}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {info.description}
                  </p>
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-12 lg:py-20 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-[14px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-black mb-8">
                Send us a Message
              </h2>

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 border border-slate-200"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-16 h-16 mx-auto mb-6 bg-black rounded-full flex items-center justify-center"
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className="text-[14px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-2">
                    Email Client Opened
                  </h3>
                  <p className="text-[13px] text-slate-500 mb-6">
                    Please send the email from your mail app. We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="text-[11px] text-black font-medium hover:underline"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors bg-white"
                    >
                      <option value="">Select a topic</option>
                      <option value="order">Order Inquiry</option>
                      <option value="product">Product Question</option>
                      <option value="returns">Returns & Exchanges</option>
                      <option value="shipping">Shipping</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-500 mb-2">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 text-[14px] border border-slate-200 focus:border-black focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-black text-white text-[12px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-[14px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-black mb-8">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-slate-200"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <span className="text-[13px] font-medium text-black pr-4">
                        {faq.question}
                      </span>
                      <motion.span
                        animate={{ rotate: expandedFaq === index ? 45 : 0 }}
                        className="text-[18px] text-slate-400 flex-shrink-0"
                      >
                        +
                      </motion.span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: expandedFaq === index ? 'auto' : 0,
                        opacity: expandedFaq === index ? 1 : 0,
                      }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-[13px] text-slate-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-slate-50">
                <p className="text-[12px] text-slate-600 mb-3">
                  Can&apos;t find what you&apos;re looking for?
                </p>
                <Link
                  href="/faq"
                  className="text-[11px] font-medium text-black hover:underline"
                >
                  View All FAQs →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="px-6 py-12 bg-slate-50 lg:py-16 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
            Follow Us
          </p>
          <div className="flex justify-center gap-6">
            {['Instagram', 'Twitter', 'Pinterest', 'Facebook'].map((social) => (
              <a
                key={social}
                href="#"
                className="text-[12px] text-slate-600 hover:text-black transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
