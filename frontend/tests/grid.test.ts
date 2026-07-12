import { describe, expect, it } from "vitest";
import { buildGrid, columnToIndex, indexToColumn } from "../lib/grid";

describe("columnToIndex / indexToColumn", () => {
  it("round-trips single letters", () => {
    expect(columnToIndex("A")).toBe(1);
    expect(columnToIndex("Z")).toBe(26);
    expect(indexToColumn(1)).toBe("A");
    expect(indexToColumn(26)).toBe("Z");
  });

  it("round-trips multi-letter columns", () => {
    expect(columnToIndex("AA")).toBe(27);
    expect(indexToColumn(27)).toBe("AA");
    expect(columnToIndex(indexToColumn(53))).toBe(53);
  });
});

describe("buildGrid", () => {
  it("returns an empty grid for no cells", () => {
    const grid = buildGrid([]);
    expect(grid.columns).toEqual([]);
    expect(grid.rows).toEqual([]);
    expect(grid.truncated).toBe(false);
  });

  it("computes the bounding box of a small sheet", () => {
    const grid = buildGrid([
      { address: "B2", value: 1 },
      { address: "A1", value: 2 },
      { address: "C3", value: 3 },
    ]);
    expect(grid.columns).toEqual(["A", "B", "C"]);
    expect(grid.rows).toEqual([1, 2, 3]);
    expect(grid.cellsByAddress.get("A1")?.value).toBe(2);
    expect(grid.truncated).toBe(false);
  });

  it("truncates a sheet wider or taller than the render cap", () => {
    const cells = [
      { address: "A1", value: "start" },
      { address: "Z1", value: "far column" },
      { address: "A100", value: "far row" },
    ];
    const grid = buildGrid(cells);
    expect(grid.truncated).toBe(true);
    expect(grid.columns.length).toBeLessThan(26);
    expect(grid.rows.length).toBeLessThan(100);
  });
});
