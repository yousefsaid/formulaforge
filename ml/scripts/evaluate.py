"""Offline evaluator scaffold recording base/adapted predictions and report inputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["base", "adapted"], required=True)
    args = parser.parse_args()
    records = []
    report = {
        "model": args.model,
        "dataset": "internal seed",
        "metrics": {
            "canonical_exact_match": 0.0,
            "syntactic_validity": 0.0,
            "supported_function_rate": 0.0,
            "reference_validity": 0.0,
            "execution_success": 0.0,
            "repair_success": 0.0,
            "abstention_rate": 0.0,
            "median_latency_ms": 0,
            "p95_latency_ms": 0,
            "peak_memory_mb": None,
            "tokens_per_second": None,
        },
        "note": "Run with provisioned model and prepared benchmark datasets to populate metrics.",
    }
    output = ROOT / "artifacts/reports"
    output.mkdir(parents=True, exist_ok=True)
    (output / f"{args.model}-evaluation.json").write_text(
        json.dumps({"report": report, "predictions": records}, indent=2)
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
