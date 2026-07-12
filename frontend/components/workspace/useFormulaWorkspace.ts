"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FormulaResponse,
  TaskType,
  WorkbookPreview,
  applyFormula,
  generateFormula,
  getModelMetadata,
  previewWorkbook,
} from "../../lib/api";
import { buildGrid } from "../../lib/grid";

const emptyPreview: WorkbookPreview | null = null;

export function useFormulaWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(emptyPreview);
  const [sheet, setSheet] = useState("");
  const [target, setTarget] = useState("D2");
  const [task, setTask] = useState<TaskType>("generate");
  const [instruction, setInstruction] = useState(
    "Calculate total sales for this row",
  );
  const [current, setCurrent] = useState("");
  const [result, setResult] = useState<FormulaResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isStubModel, setIsStubModel] = useState(false);

  useEffect(() => {
    getModelMetadata()
      .then((metadata) => setIsStubModel(metadata.backend === "fake"))
      .catch(() => setIsStubModel(false));
  }, []);

  const grid = useMemo(
    () => (preview ? buildGrid(preview.cells) : null),
    [preview],
  );

  const selectFile = useCallback(async (next: File) => {
    setError("");
    setResult(null);
    setFile(next);
    try {
      const data = await previewWorkbook(next);
      setPreview(data);
      setSheet(data.selected_sheet);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Invalid workbook");
    }
  }, []);

  const submit = useCallback(async () => {
    if (!preview || !sheet) {
      setError("Upload a valid workbook first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await generateFormula({
          task_type: task,
          instruction,
          sheet_name: sheet,
          target_cell: target.toUpperCase(),
          cells: preview.cells,
          ...(task === "repair" && current ? { current_formula: current } : {}),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Formula request failed");
    } finally {
      setLoading(false);
    }
  }, [current, instruction, preview, sheet, target, task]);

  const download = useCallback(async () => {
    if (!file || !result?.formula) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await applyFormula(
        file,
        sheet,
        target.toUpperCase(),
        result.formula,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "formulaforge-modified.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Workbook downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [file, result, sheet, target]);

  return {
    file,
    preview,
    sheet,
    setSheet,
    target,
    setTarget,
    task,
    setTask,
    instruction,
    setInstruction,
    current,
    setCurrent,
    result,
    error,
    loading,
    downloading,
    isStubModel,
    grid,
    selectFile,
    submit,
    download,
  };
}

export type FormulaWorkspaceState = ReturnType<typeof useFormulaWorkspace>;
