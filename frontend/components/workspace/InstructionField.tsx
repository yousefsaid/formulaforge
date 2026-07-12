"use client";

import { TaskType } from "../../lib/api";

type InstructionFieldProps = {
  task: TaskType;
  instruction: string;
  onInstructionChange: (value: string) => void;
  current: string;
  onCurrentChange: (value: string) => void;
};

export function InstructionField({
  task,
  instruction,
  onInstructionChange,
  current,
  onCurrentChange,
}: InstructionFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
        What should this formula do?
        <textarea
          value={instruction}
          onChange={(event) => onInstructionChange(event.target.value)}
          className="min-h-[84px] resize-y rounded-input border border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-ink-3 focus-visible:border-accent"
        />
      </label>
      {task === "repair" && (
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
          Current formula
          <input
            value={current}
            onChange={(event) => onCurrentChange(event.target.value)}
            placeholder="=SUM(B2:C2)"
            className="h-10 rounded-input border border-line bg-surface-1 px-3 font-mono text-sm text-ink outline-none transition-colors hover:border-ink-3 focus-visible:border-accent"
          />
        </label>
      )}
    </div>
  );
}
