"""Reproducible, workbook-grouped MLX-LM dataset preparation.

Download sources manually into artifacts/datasets/ after reviewing their licenses. This
script records source revision/checksum metadata and never silently downloads data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = 42


def canonical(formula: str) -> str:
    return "".join(formula.upper().split())


def eligible(item: dict) -> bool:
    return bool(item.get("formula", "").startswith("="))


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(ROOT / "ml/data/seed_examples.jsonl"))
    parser.add_argument("--output", default=str(ROOT / "ml/data/processed"))
    args = parser.parse_args()
    rows = [json.loads(line) for line in Path(args.input).read_text().splitlines() if line.strip()]
    unique = {canonical(row["formula"]): row for row in rows if eligible(row)}
    groups = sorted({row.get("workbook_id", row["id"]) for row in unique.values()})
    random.Random(SEED).shuffle(groups)
    cut_a, cut_b = int(len(groups) * 0.8), int(len(groups) * 0.9)
    partitions = {
        "train": set(groups[:cut_a]),
        "validation": set(groups[cut_a:cut_b]),
        "test": set(groups[cut_b:]),
    }
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    for name, ids in partitions.items():
        selected = [row for row in unique.values() if row.get("workbook_id", row["id"]) in ids]
        (out / f"{name}.jsonl").write_text(
            "\n".join(
                json.dumps(
                    {
                        "messages": [
                            {
                                "role": "user",
                                "content": json.dumps(
                                    {
                                        k: row[k]
                                        for k in (
                                            "task_type",
                                            "instruction",
                                            "sheet_name",
                                            "target_cell",
                                            "cells",
                                        )
                                    }
                                ),
                            },
                            {
                                "role": "assistant",
                                "content": json.dumps({"formula": canonical(row["formula"])}),
                            },
                        ]
                    }
                )
                for row in selected
            )
            + "\n"
        )
    (out / "manifest.json").write_text(
        json.dumps(
            {
                "seed": SEED,
                "input": str(args.input),
                "sha256": checksum(Path(args.input)),
                "rows": len(unique),
                "splits": {k: len(v) for k, v in partitions.items()},
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
