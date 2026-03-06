"use client";

import { useState } from "react";
import Link from "next/link";

type TabKey = "tops" | "bottoms" | "outerwear";

const sizeData: Record<
  TabKey,
  { headers: string[]; rows: string[][] }
> = {
  tops: {
    headers: ["Size", "Chest (in)", "Waist (in)", "Length (in)"],
    rows: [
      ["S", "36 - 38", "30 - 32", "27"],
      ["M", "38 - 40", "32 - 34", "28"],
      ["L", "40 - 42", "34 - 36", "29"],
      ["XL", "42 - 44", "36 - 38", "30"],
      ["XXL", "44 - 46", "38 - 40", "31"],
    ],
  },
  bottoms: {
    headers: ["Size", "Waist (in)", "Hip (in)", "Length (in)"],
    rows: [
      ["S", "28 - 30", "36 - 38", "40"],
      ["M", "30 - 32", "38 - 40", "41"],
      ["L", "32 - 34", "40 - 42", "42"],
      ["XL", "34 - 36", "42 - 44", "43"],
      ["XXL", "36 - 38", "44 - 46", "44"],
    ],
  },
  outerwear: {
    headers: ["Size", "Chest (in)", "Shoulder (in)", "Length (in)"],
    rows: [
      ["S", "38 - 40", "16.5", "26"],
      ["M", "40 - 42", "17", "27"],
      ["L", "42 - 44", "17.5", "28"],
      ["XL", "44 - 46", "18", "29"],
      ["XXL", "46 - 48", "18.5", "30"],
    ],
  },
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "tops", label: "Tops" },
  { key: "bottoms", label: "Bottoms" },
  { key: "outerwear", label: "Outerwear" },
];

export default function SizeGuidePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tops");

  const current = sizeData[activeTab];

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
          <li className="text-[var(--primary-text)]">Size Guide</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="font-[var(--font-display)] text-3xl lg:text-4xl font-semibold text-[var(--chocolate)] mb-2">
        Size Guide
      </h1>
      <p className="text-[var(--secondary-text)] leading-relaxed mb-10">
        Find your perfect fit. All measurements are in inches and correspond to standard Indian
        sizing.
      </p>

      {/* Tab Switcher */}
      <div className="flex border-b border-[var(--border-color)] mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-[var(--chocolate)]"
                : "text-[var(--muted-text)] hover:text-[var(--secondary-text)]"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--chocolate)]" />
            )}
          </button>
        ))}
      </div>

      {/* Size Table */}
      <div className="overflow-x-auto mb-12">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {current.headers.map((header) => (
                <th
                  key={header}
                  className="border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3 text-left font-semibold text-[var(--primary-text)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.rows.map((row, rowIndex) => (
              <tr
                key={row[0]}
                className={rowIndex % 2 === 1 ? "bg-[var(--card-bg)]" : "bg-white"}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`border border-[var(--border-color)] px-4 py-3 ${
                      cellIndex === 0
                        ? "font-semibold text-[var(--primary-text)]"
                        : "text-[var(--secondary-text)]"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How to Measure */}
      <section>
        <h2 className="font-[var(--font-display)] text-xl font-semibold text-[var(--chocolate)] mb-4">
          How to Measure
        </h2>
        <div className="space-y-5 text-[var(--secondary-text)] leading-relaxed">
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Chest</h3>
            <p>
              Stand straight with your arms relaxed at your sides. Wrap the measuring tape around
              the fullest part of your chest, just under your arms. Keep the tape snug but not
              tight, and make sure it stays horizontal across your back.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Waist</h3>
            <p>
              Measure around your natural waistline — the narrowest part of your torso, usually
              just above the belly button. Keep the tape comfortably loose; you should be able to
              slide a finger between the tape and your body.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Hip</h3>
            <p>
              Stand with your feet together and measure around the widest part of your hips and
              buttocks. Keep the tape parallel to the floor.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Length (Tops &amp; Outerwear)</h3>
            <p>
              Measure from the highest point of your shoulder, down the front of your body, to the
              desired hem position.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Length (Bottoms)</h3>
            <p>
              Measure from the waistband down the outer side of the leg to the desired hem. For
              inseam, measure from the crotch seam to the ankle.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--primary-text)] mb-1">Shoulder</h3>
            <p>
              Measure from one shoulder point to the other across the back, following the natural
              line where a well-fitting shirt seam would sit.
            </p>
          </div>
        </div>
      </section>

      {/* Tip */}
      <div className="mt-10 p-5 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)]">
        <p className="text-sm text-[var(--muted-text)]">
          <strong className="text-[var(--primary-text)]">Tip:</strong> If you fall between two
          sizes, we recommend sizing up for a relaxed fit or sizing down for a more tailored look.
          If you have any questions, feel free to reach out at{" "}
          <a
            href="mailto:hello@earthrevibe.in"
            className="text-[var(--chocolate)] underline hover:no-underline"
          >
            hello@earthrevibe.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}
