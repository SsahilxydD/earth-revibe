'use client';

import { motion } from 'framer-motion';
import { SectionHeader } from './section-header';

const reviews = [
  { name: 'Arjun S.', location: 'Mumbai', text: 'The quality is unmatched. These tees have become my daily uniform.', rating: 5 },
  { name: 'Priya M.', location: 'Delhi', text: 'Finally found basics that actually last. Worth every rupee.', rating: 5 },
  { name: 'Rahul K.', location: 'Bangalore', text: 'The fit is perfect and the fabric feels premium. Highly recommend.', rating: 5 },
];

export function SocialProofSection() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <SectionHeader
        subtitle="What People Say"
        title="Customer Reviews"
      />
      <div className="grid md:grid-cols-3 gap-0">
        {reviews.map((review, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="bg-white p-6 lg:p-8"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(review.rating)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {/* Quote */}
            <p className="text-[14px] text-slate-700 leading-relaxed mb-6">
              &quot;{review.text}&quot;
            </p>
            {/* Author */}
            <div>
              <p className="text-[12px] font-medium text-black">{review.name}</p>
              <p className="text-[11px] text-slate-400">{review.location}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
