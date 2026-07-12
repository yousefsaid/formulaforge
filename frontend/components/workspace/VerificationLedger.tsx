"use client";

import { motion } from "motion/react";
import { FormulaResponse } from "../../lib/api";
import { computeLedgerStages, LedgerStatus } from "../../lib/ledger";
import { cn } from "../../lib/utils";
import { TextEffect } from "../ui/text-effect";

type VerificationLedgerProps = {
  loading: boolean;
  result: FormulaResponse | null;
  isStubModel: boolean;
  onDownload: () => void;
  downloading: boolean;
};

const STATUS_GLYPH: Record<LedgerStatus, string> = {
  pending: "○",
  pass: "●",
  fail: "✕",
  abstain: "▲",
};

const STATUS_COLOR: Record<LedgerStatus, string> = {
  pending: "text-ink-3",
  pass: "text-verified",
  fail: "text-danger",
  abstain: "text-abstain",
};

export function VerificationLedger({
  loading,
  result,
  isStubModel,
  onDownload,
  downloading,
}: VerificationLedgerProps) {
  if (!loading && !result) return null;

  const stages = result
    ? computeLedgerStages(result)
    : [
        { id: "proposed" as const, label: "PROPOSED", status: "pending" as const },
        { id: "parsed" as const, label: "PARSED", status: "pending" as const },
        {
          id: "references" as const,
          label: "REFERENCES CHECKED",
          status: "pending" as const,
        },
        { id: "executed" as const, label: "EXECUTED", status: "pending" as const },
        { id: "verified" as const, label: "VERIFIED", status: "pending" as const },
      ];

  const terminalLabel =
    result?.status === "abstained"
      ? "ABSTAINED"
      : result?.status === "invalid"
        ? "REJECTED"
        : "VERIFIED";

  return (
    <section
      aria-label="Verification ledger"
      className="mt-6 rounded-panel border border-line bg-surface-1 p-6 shadow-panel md:p-8"
    >
      <ol className="flex flex-col gap-2 font-mono text-sm">
        {stages.map((stage, index) => {
          const label = stage.id === "verified" ? terminalLabel : stage.label;
          return (
            <motion.li
              key={stage.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.12, duration: 0.25 }}
              className="flex items-center gap-2"
            >
              <span className={cn(STATUS_COLOR[stage.status])}>
                {STATUS_GLYPH[stage.status]}
              </span>
              <span
                className={cn(
                  stage.status === "pending" ? "text-ink-3" : "text-ink-2",
                )}
              >
                {label}
              </span>
            </motion.li>
          );
        })}
      </ol>

      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: stages.length * 0.12 + 0.15, duration: 0.3 }}
          className="mt-6 border-t border-line pt-6"
        >
          {result.formula ? (
            <TextEffect
              text={result.formula}
              className="block font-mono text-formula text-ink"
            />
          ) : (
            <p className="font-mono text-formula text-ink-3">
              No formula proposed
            </p>
          )}

          <p className="mt-2 text-sm text-ink-2">
            {result.validation_errors.length
              ? result.validation_errors.join(" · ")
              : `Preview value: ${String(result.preview_value)}`}
          </p>

          <p className="mt-2 font-mono text-xs text-ink-3">
            {result.model_id} · {result.adapter_version ?? "base"} ·{" "}
            {result.latency_ms} ms
            {isStubModel &&
              " · model: stub (hosted demo) — real inference runs locally on Apple Silicon"}
          </p>

          {result.status === "valid" && (
            <button
              onClick={onDownload}
              disabled={downloading}
              className="mt-4 rounded-input border border-line bg-ink px-4 py-2 text-sm font-medium text-surface-0 transition-transform hover:-translate-y-px disabled:opacity-60"
            >
              {downloading
                ? "Preparing workbook…"
                : "Confirm and download modified workbook"}
            </button>
          )}
        </motion.div>
      )}
    </section>
  );
}
