import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormulaWorkspace } from "../components/FormulaWorkspace";
import * as api from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    previewWorkbook: vi.fn(),
    generateFormula: vi.fn(),
    getModelMetadata: vi.fn(),
    applyFormula: vi.fn(),
  };
});

const previewWorkbook = vi.mocked(api.previewWorkbook);
const generateFormula = vi.mocked(api.generateFormula);
const getModelMetadata = vi.mocked(api.getModelMetadata);
const applyFormula = vi.mocked(api.applyFormula);

const preview: api.WorkbookPreview = {
  sheets: ["Sheet1"],
  selected_sheet: "Sheet1",
  cells: [
    { address: "A1", value: 2 },
    { address: "A2", value: 3 },
  ],
  non_empty_cell_count: 2,
};

function xlsxFile(): File {
  return new File(["dummy"], "book.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function uploadAndWaitForPreview(): Promise<void> {
  const input = screen.getByTestId("workbook-input");
  fireEvent.change(input, { target: { files: [xlsxFile()] } });
  await waitFor(() => expect(previewWorkbook).toHaveBeenCalled());
}

beforeEach(() => {
  vi.resetAllMocks();
  getModelMetadata.mockResolvedValue({
    model_id: "fake/formula-model",
    adapter_version: "test",
    ready: true,
    backend: "fake",
  });
});

describe("FormulaWorkspace", () => {
  it("renders the workbook upload state", async () => {
    render(<FormulaWorkspace />);
    expect(screen.getByText("Drop an .xlsx workbook")).toBeTruthy();
    expect(
      screen.getByText("Your selected sheet will appear here."),
    ).toBeTruthy();
    await waitFor(() => expect(getModelMetadata).toHaveBeenCalled());
  });

  it("shows the stub-model banner when the backend reports a fake model", async () => {
    render(<FormulaWorkspace />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Hosted demo uses a stub model",
      ),
    );
  });

  it("shows an error message when the workbook preview fails", async () => {
    previewWorkbook.mockRejectedValue(new Error("Invalid .xlsx archive"));
    render(<FormulaWorkspace />);
    await uploadAndWaitForPreview();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Invalid .xlsx archive",
      ),
    );
  });

  it("renders an abstained result with its validation error", async () => {
    previewWorkbook.mockResolvedValue(preview);
    generateFormula.mockResolvedValue({
      request_id: "r1",
      status: "abstained",
      formula: null,
      validation_errors: ["Inference timed out"],
      preview_value: null,
      model_id: "fake/formula-model",
      adapter_version: "test",
      latency_ms: 5,
    });
    render(<FormulaWorkspace />);
    await uploadAndWaitForPreview();
    fireEvent.click(screen.getByText("Forge formula →"));
    await waitFor(() =>
      expect(screen.getByText("No formula proposed")).toBeTruthy(),
    );
    expect(screen.getByText("Inference timed out")).toBeTruthy();
    expect(
      screen.queryByText("Confirm and download modified workbook"),
    ).toBeNull();
  });

  it("downloads the modified workbook after a valid result", async () => {
    previewWorkbook.mockResolvedValue(preview);
    generateFormula.mockResolvedValue({
      request_id: "r2",
      status: "valid",
      formula: "=SUM(A1:A2)",
      validation_errors: [],
      preview_value: 5,
      model_id: "fake/formula-model",
      adapter_version: "test",
      latency_ms: 5,
    });
    const blob = new Blob(["fake xlsx"]);
    applyFormula.mockResolvedValue(blob);
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    // jsdom does not implement these
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL =
      createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL =
      revokeObjectURL;

    render(<FormulaWorkspace />);
    await uploadAndWaitForPreview();
    fireEvent.click(screen.getByText("Forge formula →"));
    await waitFor(() => expect(screen.getByText("=SUM(A1:A2)")).toBeTruthy());

    fireEvent.click(screen.getByText("Confirm and download modified workbook"));
    await waitFor(() => expect(applyFormula).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
