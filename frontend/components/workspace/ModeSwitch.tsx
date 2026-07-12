"use client";

import { motion } from "motion/react";
import { TaskType } from "../../lib/api";
import { cn } from "../../lib/utils";

type ModeSwitchProps = {
  task: TaskType;
  onChange: (task: TaskType) => void;
};

const OPTIONS: { value: TaskType; label: string }[] = [
  { value: "generate", label: "Generate" },
  { value: "repair", label: "Repair" },
];

export function ModeSwitch({ task, onChange }: ModeSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="Formula mode"
      className="inline-flex w-max rounded-full border border-line bg-surface-2 p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === task;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active ? "text-surface-0" : "text-ink-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-switch-thumb"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
