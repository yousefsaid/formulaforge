import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormulaWorkspace } from "../components/FormulaWorkspace";

describe("FormulaWorkspace", () => {
  it("renders the workbook upload state", () => {
    render(<FormulaWorkspace />);
    expect(screen.getByText("Drop an .xlsx workbook")).toBeTruthy();
    expect(
      screen.getByText("Your selected sheet will appear here."),
    ).toBeTruthy();
  });
});
