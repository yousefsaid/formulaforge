"""Reproducible, workbook-grouped dataset preparation for mlx_lm.lora training and eval.

Only datasets with a verified, permissive license may be fed into this script -- see
artifacts/datasets/sources.json for the license audit and the dataset actually in use.
This script never downloads data itself; it only transforms what is already on disk.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CellValue, FormulaRequest  # noqa: E402
from app.prompting import SYSTEM_PROMPT, serialize_request  # noqa: E402

SEED = 42
MODEL_ID = "Qwen/Qwen3-0.6B"
ALLOWED_FUNCTIONS = frozenset(
    {
        "SUM",
        "AVERAGE",
        "MIN",
        "MAX",
        "COUNT",
        "COUNTA",
        "IF",
        "SUMIF",
        "COUNTIF",
        "INDEX",
        "MATCH",
        "VLOOKUP",
    }
)
FUNCTION_RE = re.compile(r"\b([A-Z][A-Z0-9_]*)\s*\(")
CELL_RE = re.compile(r"(?<![A-Z0-9_])\$?([A-Z]{1,3})\$?([1-9][0-9]*)(?![A-Z0-9_])")


def canonical(formula: str) -> str:
    return "".join(formula.upper().split())


def references_known(formula: str, known: set[str]) -> bool:
    referenced = {f"{m.group(1)}{m.group(2)}" for m in CELL_RE.finditer(formula)}
    return referenced <= known


def eligible(row: dict) -> bool:
    formula = canonical(row.get("formula", ""))
    if not formula.startswith("="):
        return False
    if len(formula) > 2048:
        return False
    functions = set(FUNCTION_RE.findall(formula))
    if not functions <= ALLOWED_FUNCTIONS:
        return False
    known_cells = {cell["address"].upper() for cell in row.get("cells", [])}
    return references_known(formula, known_cells)


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_rows(path: Path) -> list[dict]:
    seen_ids: set[str] = set()
    rows = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        if row["id"] in seen_ids:
            continue
        seen_ids.add(row["id"])
        row = dict(row, formula=canonical(row["formula"]))
        if row.get("current_formula"):
            row["current_formula"] = canonical(row["current_formula"])
        rows.append(row)
    return rows


def split_groups(groups: list[str]) -> dict[str, set[str]]:
    shuffled = list(groups)
    random.Random(SEED).shuffle(shuffled)
    if len(shuffled) < 3:
        # Too few workbook groups for a meaningful 80/10/10 split (e.g. this repo's
        # smoke-test dataset has a single workbook). Every split gets every group so
        # the harness still runs end-to-end -- see manifest.json's degenerate_split flag.
        return {"train": set(shuffled), "validation": set(shuffled), "test": set(shuffled)}
    cut_a, cut_b = int(len(shuffled) * 0.8), int(len(shuffled) * 0.9)
    return {
        "train": set(shuffled[:cut_a]),
        "validation": set(shuffled[cut_a:cut_b]),
        "test": set(shuffled[cut_b:]),
    }


def to_request(row: dict) -> FormulaRequest:
    return FormulaRequest(
        task_type=row["task_type"],
        instruction=row["instruction"],
        sheet_name=row["sheet_name"],
        target_cell=row["target_cell"],
        cells=[CellValue(**cell) for cell in row["cells"]],
        current_formula=row.get("current_formula"),
    )


def to_training_text(row: dict) -> str:
    request = to_request(row)
    user_content = serialize_request(request)
    assistant_content = json.dumps(
        {"formula": row["formula"]}, ensure_ascii=False, separators=(",", ":")
    )
    return (
        f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
        f"<|im_start|>user\n{user_content}<|im_end|>\n"
        f"<|im_start|>assistant\n{assistant_content}<|im_end|>\n"
    )


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.write_text("\n".join(json.dumps(record, ensure_ascii=False) for record in records) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(ROOT / "ml/data/seed_examples.jsonl"))
    parser.add_argument("--output", default=str(ROOT / "ml/data/processed"))
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = load_rows(input_path)
    eligible_rows = [row for row in rows if eligible(row)]
    dropped = len(rows) - len(eligible_rows)

    groups = sorted({row.get("workbook_id", row["id"]) for row in eligible_rows})
    partitions = split_groups(groups)
    degenerate_split = len(groups) < 3

    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)

    split_rows: dict[str, list[dict]] = {}
    for name, ids in partitions.items():
        selected = [row for row in eligible_rows if row.get("workbook_id", row["id"]) in ids]
        if len(selected) > 5000:
            selected = selected[:5000]
        split_rows[name] = selected

    mlx_names = {"train": "train", "validation": "valid", "test": "test"}
    for name, selected in split_rows.items():
        write_jsonl(
            out / f"{mlx_names[name]}.jsonl",
            [{"text": to_training_text(row)} for row in selected],
        )
        write_jsonl(out / f"{name}_examples.jsonl", selected)

    (out / "manifest.json").write_text(
        json.dumps(
            {
                "seed": SEED,
                "model_id": MODEL_ID,
                "input": str(input_path),
                "sha256": checksum(input_path),
                "total_rows": len(rows),
                "eligible_rows": len(eligible_rows),
                "dropped_rows": dropped,
                "splits": {name: len(rows_) for name, rows_ in split_rows.items()},
                "workbook_groups": len(groups),
                "degenerate_split": degenerate_split,
                "degenerate_split_note": (
                    "Fewer than 3 workbook groups; every split contains every group "
                    "so the pipeline still runs. Not a statistically meaningful split."
                    if degenerate_split
                    else None
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
