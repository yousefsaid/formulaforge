"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { HeroCanvasLoader } from "./hero/HeroCanvasLoader";

const STATS = [
  { value: 747, suffix: "ms", label: "median latency" },
  { value: 12, suffix: "", label: "supported functions" },
  { value: 100, suffix: "%", label: "execution-checked" },
];

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section
      id="top"
      className="relative flex min-h-[92vh] items-center overflow-hidden bg-surface-0 pt-24"
    >
      <HeroCanvasLoader />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-0/10 via-surface-0/70 to-surface-0"
      />
      <div className="relative mx-auto w-full max-w-content px-6">
        <p className="font-mono text-eyebrow text-ink-3">
          LOCAL-FIRST · VERIFIED · 0.6B PARAMETERS
        </p>
        <h1 className="mt-4 max-w-3xl text-display text-ink">
          Every formula, proven before you see it.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
          A fine-tuned 0.6B model proposes Excel formulas; a deterministic
          evaluator executes and verifies each one on your machine.
          Spreadsheets never leave it.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <a
            href="#workspace"
            className="rounded-input bg-accent px-5 py-3 text-sm font-semibold text-surface-0 transition-transform hover:-translate-y-px"
          >
            Try it below ↓
          </a>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="text-sm text-ink-2 underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            Watch the 40s demo
          </button>
        </div>
        <dl className="mt-16 flex flex-wrap gap-x-10 gap-y-4 font-mono text-sm text-ink-2">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-lg font-medium text-ink">
                <NumberFlow value={stat.value} />
                {stat.suffix}
              </dd>
              <span aria-hidden="true" className="text-ink-3">
                {stat.label}
              </span>
            </div>
          ))}
        </dl>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">FormulaForge demo</DialogTitle>
          <video
            controls
            autoPlay
            className="aspect-video w-full rounded-[10px]"
            src="/media/demo.mp4"
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
