// Generated contract mirror. Refresh from the FastAPI OpenAPI document with npm run generate:api.
export type TaskType = "generate" | "repair";
export type ResultStatus = "valid" | "invalid" | "abstained";
export type CellValue = {
  address: string;
  value: string | number | boolean | null;
};
export type FormulaRequest = {
  task_type: TaskType;
  instruction: string;
  sheet_name: string;
  target_cell: string;
  cells: CellValue[];
  current_formula?: string;
  error_message?: string;
};
export type FormulaResponse = {
  request_id: string;
  status: ResultStatus;
  formula: string | null;
  validation_errors: string[];
  preview_value: unknown;
  model_id: string;
  adapter_version: string | null;
  latency_ms: number;
};
export type WorkbookPreview = {
  sheets: string[];
  selected_sheet: string;
  cells: CellValue[];
  non_empty_cell_count: number;
};
export type ModelMetadata = {
  model_id: string;
  adapter_version: string | null;
  ready: boolean;
  backend: string;
};

// On Vercel the FastAPI backend is deployed as a Python Function in the same
// project (api/index.py), so requests are same-origin and need no base URL.
const base =
  process.env.NEXT_PUBLIC_FORMULAFORGE_API ??
  (process.env.VERCEL ? "" : "http://127.0.0.1:8000");
export async function previewWorkbook(
  file: File,
  sheetName?: string,
): Promise<WorkbookPreview> {
  const body = new FormData();
  body.append("file", file);
  if (sheetName) body.append("sheet_name", sheetName);
  const response = await fetch(`${base}/api/v1/workbooks/preview`, {
    method: "POST",
    body,
  });
  if (!response.ok)
    throw new Error(
      (await response.json()).detail ?? "Could not read workbook",
    );
  return response.json();
}
export async function getModelMetadata(): Promise<ModelMetadata> {
  const response = await fetch(`${base}/api/v1/models`);
  if (!response.ok) throw new Error("Could not load model metadata");
  return response.json();
}
export async function generateFormula(
  request: FormulaRequest,
): Promise<FormulaResponse> {
  const response = await fetch(`${base}/api/v1/formulas/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok)
    throw new Error((await response.json()).detail ?? "Formula request failed");
  return response.json();
}
export async function applyFormula(
  file: File,
  sheetName: string,
  targetCell: string,
  formula: string,
): Promise<Blob> {
  const body = new FormData();
  body.append("file", file);
  body.append("sheet_name", sheetName);
  body.append("target_cell", targetCell);
  body.append("formula", formula);
  const response = await fetch(`${base}/api/v1/workbooks/apply-formula`, {
    method: "POST",
    body,
  });
  if (!response.ok)
    throw new Error((await response.json()).detail ?? "Could not apply formula");
  return response.blob();
}
