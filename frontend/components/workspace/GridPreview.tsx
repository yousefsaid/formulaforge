"use client";

import { Grid } from "../../lib/grid";

type GridPreviewProps = {
  grid: Grid | null;
  nonEmptyCellCount: number | null;
  targetCell: string | null;
};

export function GridPreview({
  grid,
  nonEmptyCellCount,
  targetCell,
}: GridPreviewProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface-2">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4 font-mono text-eyebrow text-ink-2">
        <span>CONTEXT PREVIEW</span>
        {nonEmptyCellCount !== null && (
          <span>{nonEmptyCellCount} non-empty cells</span>
        )}
      </div>
      {grid ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-max border-collapse font-mono text-xs">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-8 border border-line bg-surface-2" />
                {grid.columns.map((col) => (
                  <th
                    key={col}
                    className="border border-line bg-surface-2 px-2 py-1.5 text-center font-medium text-ink-2"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map((row) => (
                <tr key={row}>
                  <th className="sticky left-0 border border-line bg-surface-2 px-2 py-1.5 text-center font-medium text-ink-2">
                    {row}
                  </th>
                  {grid.columns.map((col) => {
                    const address = `${col}${row}`;
                    const cell = grid.cellsByAddress.get(address);
                    const isTarget = address === targetCell;
                    return (
                      <td
                        key={col}
                        className={
                          "max-w-[120px] truncate whitespace-nowrap border border-line bg-surface-1 px-2 py-1.5 text-right tabular-nums " +
                          (isTarget
                            ? "relative outline outline-2 -outline-offset-2 outline-accent"
                            : "")
                        }
                      >
                        {isTarget && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 animate-pulse bg-accent/10"
                          />
                        )}
                        <span className="relative">
                          {cell ? String(cell.value) : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {grid.truncated && (
            <p className="px-4 py-2 text-xs text-ink-3">
              Showing a bounded window of the sheet; not all non-empty cells
              fit.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:24px_24px] px-6 text-center opacity-70">
          <p className="max-w-xs rounded-md bg-surface-0/80 px-3 py-2 text-sm text-ink-2">
            Your sheet appears here — nothing is uploaded to a server.
          </p>
        </div>
      )}
    </div>
  );
}
