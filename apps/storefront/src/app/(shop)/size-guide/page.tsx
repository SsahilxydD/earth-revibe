'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const sizeCharts = {
  tops: {
    title: 'Tops & T-Shirts',
    headers: ['Size', 'Chest', 'Length', 'Shoulder', 'Sleeve'],
    rows: [
      ['XS', '86-91', '66', '40', '20'],
      ['S', '91-96', '68', '42', '21'],
      ['M', '96-101', '70', '44', '22'],
      ['L', '101-106', '72', '46', '23'],
      ['XL', '106-111', '74', '48', '24'],
      ['XXL', '111-116', '76', '50', '25'],
    ]
  },
  bottoms: {
    title: 'Pants & Denims',
    headers: ['Size', 'Waist', 'Hip', 'Inseam', 'Thigh'],
    rows: [
      ['28', '71-74', '88-91', '81', '54'],
      ['30', '76-79', '93-96', '81', '56'],
      ['32', '81-84', '98-101', '81', '58'],
      ['34', '86-89', '103-106', '81', '60'],
      ['36', '91-94', '108-111', '81', '62'],
      ['38', '96-99', '113-116', '81', '64'],
    ]
  }
};

export default function SizeGuidePage() {
  const [activeTab, setActiveTab] = useState<'tops' | 'bottoms'>('tops');
  const [unit, setUnit] = useState<'cm' | 'in'>('cm');

  const convertToInches = (cm: string) => {
    if (cm.includes('-')) {
      const [min, max] = cm.split('-').map(Number);
      return `${(min / 2.54).toFixed(1)}-${(max / 2.54).toFixed(1)}`;
    }
    return (Number(cm) / 2.54).toFixed(1);
  };

  const currentChart = sizeCharts[activeTab];

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="px-6 py-12 lg:py-20 lg:px-10 border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <ol className="flex items-center gap-2 text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase">
              <li>
                <Link href="/" className="text-slate-400 hover:text-black transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-slate-300">/</li>
              <li className="text-black">Size Guide</li>
            </ol>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-4">
              Size Guide
            </h1>
            <p className="text-[14px] text-slate-500">
              Find your perfect fit with our comprehensive size guide.
            </p>
          </motion.div>
        </div>
      </div>

      {/* How to Measure */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-b border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
              How to Measure
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape horizontal.' },
                { name: 'Waist', desc: 'Measure around your natural waistline, keeping the tape comfortably loose.' },
                { name: 'Hip', desc: 'Measure around the fullest part of your hips, about 8 inches below your waist.' },
                { name: 'Inseam', desc: 'Measure from the crotch seam to the bottom of the leg along the inside.' },
              ].map((item) => (
                <div key={item.name}>
                  <p className="text-[12px] font-medium text-black mb-2">{item.name}</p>
                  <p className="text-[12px] text-slate-500 leading-[1.7]">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Size Chart */}
      <div className="px-6 py-12 lg:py-16 lg:px-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              {/* Category Tabs */}
              <div className="flex">
                {(['tops', 'bottoms'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 text-[11px] font-medium tracking-[0.08em] uppercase transition-colors border ${
                      activeTab === tab
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-black'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium tracking-[0.08em] uppercase text-slate-400">Unit</span>
                <div className="flex">
                  {(['cm', 'in'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] uppercase transition-colors border ${
                        unit === u
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-black'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {currentChart.headers.map((header, index) => (
                      <th
                        key={index}
                        className="py-4 px-4 text-left text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentChart.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={`py-4 px-4 text-[13px] ${
                            cellIndex === 0 ? 'font-medium text-black' : 'text-slate-600'
                          }`}
                        >
                          {cellIndex === 0
                            ? cell
                            : unit === 'in'
                              ? convertToInches(cell)
                              : cell
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fit Guide */}
      <div className="px-6 py-12 lg:py-16 lg:px-10 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-6">
              Fit Guide
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Slim Fit', desc: 'Tailored cut that sits close to the body. If between sizes, size up.' },
                { name: 'Regular Fit', desc: 'Classic fit with comfortable room. True to size.' },
                { name: 'Relaxed Fit', desc: 'Loose, comfortable silhouette. Consider sizing down for a less oversized look.' },
              ].map((fit) => (
                <div key={fit.name} className="p-6 border border-slate-200">
                  <p className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black mb-2">
                    {fit.name}
                  </p>
                  <p className="text-[13px] text-slate-500 leading-[1.7]">
                    {fit.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="px-6 py-12 bg-slate-50 lg:py-16 lg:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-[13px] text-slate-600 mb-6">
              Need help finding your size?
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-black text-white text-[11px] font-medium tracking-[0.08em] uppercase hover:bg-slate-800 transition-colors"
            >
              Contact Us
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
