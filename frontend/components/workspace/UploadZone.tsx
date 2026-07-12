"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "../../lib/utils";

type UploadZoneProps = {
  fileName: string | null;
  onSelect: (file: File) => void;
};

export function UploadZone({ fileName, onSelect }: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const next = accepted[0];
      if (next) onSelect(next);
    },
    [onSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
  });

  const inputProps = getInputProps();

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line bg-surface-2 px-6 py-8 text-center transition-colors",
        isDragActive && "border-accent bg-surface-1",
      )}
    >
      <input {...inputProps} data-testid="workbook-input" />
      <span aria-hidden="true" className="text-lg text-ink-3">
        ↑
      </span>
      <strong className="text-sm font-medium text-ink">
        {fileName ?? "Drop an .xlsx workbook"}
      </strong>
      <small className="text-xs text-ink-2">
        {fileName
          ? "Workbook is read in memory only"
          : "Up to 2 MB · macros and external links rejected"}
      </small>
    </div>
  );
}
