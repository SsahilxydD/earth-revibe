"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Leaf, Recycle, Heart } from "lucide-react";

const stats = [
  { number: "2019", label: "Founded" },
  { number: "50K+", label: "Happy Customers" },
  { number: "12", label: "Countries" },
  { number: "100%", label: "Sustainable Cotton" },
];

const pillars = [
  {
    icon: Leaf,
    title: "Eco-Friendly Materials",
    description:
      "We source only organic and sustainably grown fabrics, ensuring every piece treads lightly on the planet.",
  },
  {
    icon: Recycle,
    title: "Circular Fashion",
    description:
      "From recyclable packaging to garment take-back programmes, we design with the full lifecycle in mind.",
  },
  {
    icon: Heart,
    title: "Ethical Production",
    description:
      "Fair wages, safe conditions, and transparent supply chains — because the people who make our clothes matter.",
  },
];

const promises = [
  "Every product is crafted from premium, sustainably sourced materials.",
  "We never compromise on fair wages and ethical working conditions.",
  "Our packaging is 100% recyclable and plastic-free.",
  "We continuously reduce our carbon footprint across the supply chain.",
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Banner */}
      <section className="relative bg-[var(--chocolate)] py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--sage)] to-transparent" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--sage)] mb-4"
          >
            Our Story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-[28px] lg:text-[44px] font-[var(--font-display)] font-medium tracking-[0.02em] text-white mb-6 leading-tight"
          >
            Fashion That Honors the Earth
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-[var(--text-base)] lg:text-[var(--text-md)] text-white/70 max-w-2xl mx-auto leading-relaxed"
          >
            Crafting timeless essentials that feel luxurious, look effortless,
            and are made to last — for you and the planet.
          </motion.p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="px-6 py-16 lg:py-24 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={0}
            className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--muted-text)] mb-4"
          >
            How It Began
          </motion.p>
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            custom={1}
            className="text-[var(--text-2xl)] lg:text-[var(--text-3xl)] font-[var(--font-display)] font-medium tracking-[0.02em] mb-8"
          >
            Built on Quality, Not Quantity
          </motion.h2>
          <div className="space-y-5 text-[var(--text-base)] text-[var(--secondary-text)] leading-[1.9]">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={2}
            >
              In 2019, Earth Revibe was born from a simple question: why is it so
              hard to find well-made basics? Fast fashion promised affordability
              but delivered clothes that fell apart. Luxury brands offered quality
              but at prices that felt exclusionary.
            </motion.p>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={3}
            >
              We believed there had to be a better way. By working directly with
              ethical manufacturers, cutting out middlemen, and focusing on what
              matters — quality materials and honest craftsmanship — we created a
              brand that bridges the gap between sustainability and style.
            </motion.p>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              custom={4}
            >
              Today, we ship to customers in over 12 countries, but our mission
              remains the same: to make premium, sustainable essentials accessible
              to everyone.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 lg:py-16 bg-[var(--sage-light)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={index}
                className="text-center"
              >
                <p className="text-[32px] lg:text-[42px] font-[var(--font-display)] font-light text-[var(--chocolate)] mb-2">
                  {stat.number}
                </p>
                <p className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-[var(--muted-text)]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sustainability Pillars */}
      <section className="px-6 py-16 lg:py-24 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--muted-text)] mb-4"
            >
              What We Stand For
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
              className="text-[var(--text-2xl)] lg:text-[var(--text-3xl)] font-[var(--font-display)] font-medium tracking-[0.02em]"
            >
              Our Sustainability Pillars
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {pillars.map((pillar, index) => {
              const IconComponent = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={index}
                  className="text-center p-8 border border-[var(--border-color)] rounded-sm hover:shadow-[var(--shadow-md)] transition-shadow duration-300"
                >
                  <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[var(--sage-light)] flex items-center justify-center">
                    <IconComponent
                      className="w-6 h-6 text-[var(--sage)]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-[var(--text-sm)] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-[var(--text-sm)] text-[var(--secondary-text)] leading-[1.8]">
                    {pillar.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Promise */}
      <section className="px-6 py-16 lg:py-24 bg-[var(--chocolate)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
              className="text-[var(--text-xs)] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-[var(--sage)] mb-4"
            >
              Our Commitment
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
              className="text-[var(--text-2xl)] lg:text-[var(--text-3xl)] font-[var(--font-display)] font-medium tracking-[0.02em] text-white"
            >
              Our Promise to You
            </motion.h2>
          </div>

          <div className="space-y-6">
            {promises.map((promise, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={index}
                className="flex items-start gap-4 p-5 border border-white/10 rounded-sm"
              >
                <div className="w-6 h-6 flex-shrink-0 rounded-full bg-[var(--sage)] flex items-center justify-center mt-0.5">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-[var(--text-base)] text-white/80 leading-relaxed">
                  {promise}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 lg:py-20 bg-[var(--page-bg)]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-[var(--text-xl)] lg:text-[var(--text-3xl)] font-[var(--font-display)] font-medium tracking-[0.02em] mb-4">
              Experience the Difference
            </h2>
            <p className="text-[var(--text-base)] text-[var(--secondary-text)] mb-8">
              Join thousands of customers who have upgraded their everyday
              essentials.
            </p>
            <Link
              href="/products"
              className="inline-block px-10 py-4 bg-[var(--chocolate)] text-white text-[var(--text-xs)] font-medium tracking-[0.08em] uppercase hover:opacity-90 transition-opacity duration-300"
            >
              Shop Collection
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
