"use client";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  FormulaResponse,
  TaskType,
  WorkbookPreview,
  applyFormula,
  generateFormula,
  getModelMetadata,
  previewWorkbook,
} from "../lib/api";
import { buildGrid } from "../lib/grid";

const emptyPreview: WorkbookPreview | null = null;
export function FormulaWorkspace() {
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
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;
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
  }
  async function submit() {
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
  }
  async function download() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <main className="shell">
      <header className="masthead">
        <div className="brand-mark">ƒ</div>
        <div>
          <p className="eyebrow">LOCAL FORMULA LAB</p>
          <h1>FormulaForge</h1>
        </div>
        <span className="local-badge">● Local only</span>
      </header>
      {isStubModel && (
        <p className="stub-banner" role="status">
          Hosted demo uses a stub model; real inference runs locally on Apple
          Silicon — see the eval report for measured quality.
        </p>
      )}
      <section className="intro">
        <div>
          <p className="eyebrow">EXCEL, REASONED OUT</p>
          <h2>Write less. Verify more.</h2>
          <p>
            Describe the calculation. FormulaForge proposes one formula, then
            checks it against the visible workbook context before you use it.
          </p>
        </div>
        <div className="grid-art" aria-hidden="true">
          <span>Σ</span>
          <i></i>
          <i></i>
          <i></i>
          <i></i>
        </div>
      </section>
      <section className="workspace" aria-label="Formula workspace">
        <div className="control-panel">
          <label className="upload">
            <input
              type="file"
              accept=".xlsx"
              onChange={selectFile}
              data-testid="workbook-input"
            />
            <span className="upload-icon">↑</span>
            <strong>{file ? file.name : "Drop an .xlsx workbook"}</strong>
            <small>
              {file
                ? "Workbook is read in memory only"
                : "Up to 2 MB · macros and external links rejected"}
            </small>
          </label>
          {preview && (
            <>
              <div className="field-row">
                <label>
                  Sheet
                  <select
                    value={sheet}
                    onChange={(e) => setSheet(e.target.value)}
                  >
                    {preview.sheets.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Target cell
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    aria-label="Target cell"
                  />
                </label>
              </div>
              <div className="mode-switch">
                <button
                  className={task === "generate" ? "active" : ""}
                  onClick={() => setTask("generate")}
                >
                  Generate
                </button>
                <button
                  className={task === "repair" ? "active" : ""}
                  onClick={() => setTask("repair")}
                >
                  Repair
                </button>
              </div>
              <label>
                What should this formula do?
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
              </label>
              {task === "repair" && (
                <label>
                  Current formula
                  <input
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    placeholder="=SUM(B2:C2)"
                  />
                </label>
              )}
              <button className="forge" disabled={loading} onClick={submit}>
                {loading ? "Checking formula…" : "Forge formula →"}
              </button>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <aside className="preview-panel">
          <div className="panel-heading">
            <span>CONTEXT PREVIEW</span>
            {preview && (
              <small>{preview.non_empty_cell_count} non-empty cells</small>
            )}
          </div>
          {grid ? (
            <>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th></th>
                    {grid.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((row) => (
                    <tr key={row}>
                      <th>{row}</th>
                      {grid.columns.map((col) => {
                        const cell = grid.cellsByAddress.get(`${col}${row}`);
                        return <td key={col}>{cell ? String(cell.value) : ""}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {grid.truncated && (
                <small className="grid-truncated">
                  Showing a bounded window of the sheet; not all non-empty cells fit.
                </small>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span>▦</span>
              <p>Your selected sheet will appear here.</p>
            </div>
          )}
        </aside>
      </section>
      {result && (
        <section className={`result ${result.status}`}>
          <div>
            <p className="eyebrow">
              {result.status === "valid"
                ? "VALIDATED PROPOSAL"
                : result.status.toUpperCase()}
            </p>
            <code>{result.formula ?? "No formula proposed"}</code>
          </div>
          <div className="result-details">
            <p>
              {result.validation_errors.length
                ? result.validation_errors.join(" · ")
                : `Preview value: ${String(result.preview_value)}`}
            </p>
            <small>
              {result.model_id} · {result.adapter_version ?? "base"} ·{" "}
              {result.latency_ms} ms
            </small>
            {result.status === "valid" && (
              <button onClick={download} disabled={downloading}>
                {downloading
                  ? "Preparing workbook…"
                  : "Confirm and download modified workbook"}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
