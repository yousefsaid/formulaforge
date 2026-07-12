"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    number: "01",
    mark: "ƒ",
    title: "Propose",
    body: "The 0.6B model drafts one formula from your instruction and the visible sheet context.",
    detail: "e.g. =SUMIF(B2:B40, D2, C2:C40)",
  },
  {
    number: "02",
    mark: "✓",
    title: "Verify",
    body: "A parser, reference checker, and deterministic evaluator execute it against your sheet.",
    detail: "checks: syntax · cell references · execution",
  },
  {
    number: "03",
    mark: "∅",
    title: "Abstain",
    body: "When it can't prove the formula is correct, it says so instead of guessing.",
    detail: "reasons: unknown range · unsupported function · timeout",
  },
];

export function HowItProves() {
  return (
    <section className="mx-auto w-full max-w-content px-6 py-section">
      <p className="font-mono text-eyebrow text-ink-3">HOW IT PROVES IT</p>
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: index * 0.08 }}
          >
            <div className="flex items-baseline gap-3 font-mono text-sm text-ink-3">
              <span>{step.number}</span>
              <span aria-hidden="true" className="text-accent">
                {step.mark}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-medium text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {step.body}
            </p>
            <p className="mt-3 font-mono text-xs text-ink-3">{step.detail}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
