import { FormulaResponse } from "./api";

export type LedgerStageId =
  | "proposed"
  | "parsed"
  | "references"
  | "executed"
  | "verified";

export type LedgerStatus = "pass" | "fail" | "abstain" | "pending";

export type LedgerStage = {
  id: LedgerStageId;
  label: string;
  status: LedgerStatus;
};

const STAGE_ORDER: { id: LedgerStageId; label: string }[] = [
  { id: "proposed", label: "PROPOSED" },
  { id: "parsed", label: "PARSED" },
  { id: "references", label: "REFERENCES CHECKED" },
  { id: "executed", label: "EXECUTED" },
  { id: "verified", label: "VERIFIED" },
];

function detectFailingStage(errors: string[]): LedgerStageId {
  const text = errors.join(" ").toLowerCase();
  if (text.includes("timed out") || text.includes("no formula")) {
    return "proposed";
  }
  if (
    text.includes("reference") ||
    text.includes("cell") ||
    text.includes("unknown range")
  ) {
    return "references";
  }
  if (
    text.includes("execut") ||
    text.includes("#ref") ||
    text.includes("#value") ||
    text.includes("#div")
  ) {
    return "executed";
  }
  return "parsed";
}

export function computeLedgerStages(result: FormulaResponse): LedgerStage[] {
  if (result.status === "abstained") {
    return STAGE_ORDER.map((stage, index) => ({
      ...stage,
      status: index === 0 ? "abstain" : "pending",
    }));
  }

  if (result.status === "invalid") {
    const failingStage = detectFailingStage(result.validation_errors);
    const failingIndex = STAGE_ORDER.findIndex((s) => s.id === failingStage);
    return STAGE_ORDER.map((stage, index) => {
      if (index < failingIndex) return { ...stage, status: "pass" };
      if (index === failingIndex) return { ...stage, status: "fail" };
      return { ...stage, status: "pending" };
    });
  }

  return STAGE_ORDER.map((stage) => ({ ...stage, status: "pass" }));
}
