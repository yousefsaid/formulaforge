from __future__ import annotations

import io

from fastapi import HTTPException
from openpyxl import load_workbook

from .evaluator import validate_and_evaluate
from .workbooks import normalize_workbook


def apply_formula_to_workbook(
    raw: bytes, sheet_name: str, target_cell: str, formula: str
) -> bytes:
    """Re-validate the formula against the real workbook, then write it in memory.

    The frontend already validated this formula via /formulas/generate, but that
    response describes the *preview* context, not necessarily this exact file (it
    could be stale, or a different upload). Re-running the same deterministic
    validator here means the download path can never write an unverified formula,
    matching the "model output is never trusted" constraint for every code path.
    normalize_workbook() already enforces every size/sheet-count/link-safety limit
    from workbooks.py, so this function only needs to re-open for writing.
    """
    preview = normalize_workbook(raw, sheet_name)
    evaluation = validate_and_evaluate(formula, preview.cells, target_cell)
    if not evaluation.valid:
        raise HTTPException(400, f"Formula no longer validates: {'; '.join(evaluation.errors)}")

    workbook = load_workbook(io.BytesIO(raw), read_only=False, data_only=False, keep_links=False)
    workbook[sheet_name][target_cell] = formula

    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()
