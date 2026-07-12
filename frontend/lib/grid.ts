import { CellValue } from "./api";

export type Grid = {
  columns: string[];
  rows: number[];
  cellsByAddress: Map<string, CellValue>;
  truncated: boolean;
};

const MAX_COLS = 12;
const MAX_ROWS = 40;
const ADDRESS_RE = /^([A-Z]+)([0-9]+)$/;

function parseAddress(address: string): { col: string; row: number } {
  const match = ADDRESS_RE.exec(address);
  if (!match) throw new Error(`Invalid cell address: ${address}`);
  return { col: match[1], row: Number(match[2]) };
}

export function columnToIndex(col: string): number {
  let value = 0;
  for (const ch of col) value = value * 26 + (ch.charCodeAt(0) - 64);
  return value;
}

export function indexToColumn(index: number): string {
  let value = "";
  let n = index;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    n = Math.floor((n - 1) / 26);
  }
  return value;
}

export function buildGrid(cells: CellValue[]): Grid {
  if (cells.length === 0) {
    return { columns: [], rows: [], cellsByAddress: new Map(), truncated: false };
  }
  const parsed = cells.map((cell) => ({ cell, ...parseAddress(cell.address) }));
  const colIndices = parsed.map((p) => columnToIndex(p.col));
  const rowNumbers = parsed.map((p) => p.row);
  const minCol = Math.min(...colIndices);
  const maxColFull = Math.max(...colIndices);
  const minRow = Math.min(...rowNumbers);
  const maxRowFull = Math.max(...rowNumbers);

  const maxCol = Math.min(maxColFull, minCol + MAX_COLS - 1);
  const maxRow = Math.min(maxRowFull, minRow + MAX_ROWS - 1);
  const truncated = maxColFull > maxCol || maxRowFull > maxRow;

  const columns: string[] = [];
  for (let i = minCol; i <= maxCol; i++) columns.push(indexToColumn(i));
  const rows: number[] = [];
  for (let r = minRow; r <= maxRow; r++) rows.push(r);

  const cellsByAddress = new Map<string, CellValue>();
  for (const cell of cells) cellsByAddress.set(cell.address, cell);

  return { columns, rows, cellsByAddress, truncated };
}
