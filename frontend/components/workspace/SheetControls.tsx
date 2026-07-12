"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type SheetControlsProps = {
  sheets: string[];
  sheet: string;
  onSheetChange: (sheet: string) => void;
  target: string;
  onTargetChange: (target: string) => void;
};

export function SheetControls({
  sheets,
  sheet,
  onSheetChange,
  target,
  onTargetChange,
}: SheetControlsProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-3">
      <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-ink-2">
        Sheet
        <Select value={sheet} onValueChange={onSheetChange}>
          <SelectTrigger aria-label="Sheet" className="min-w-0">
            <span className="truncate">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {sheets.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
        Target cell
        <input
          value={target}
          onChange={(event) => onTargetChange(event.target.value)}
          aria-label="Target cell"
          className="h-10 rounded-input border border-line bg-surface-1 px-3 font-mono text-sm text-ink outline-none transition-colors hover:border-ink-3 focus-visible:border-accent"
        />
      </label>
    </div>
  );
}
