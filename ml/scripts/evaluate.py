"""Base-vs-adapted evaluation harness for FormulaForge.

Every metric in the written report traces back to an actual model run against
ml/data/processed/{split}_examples.jsonl -- nothing here is estimated or invented
(see the "measured or absent" rule in PORTFOLIO_PLAN.md).

The dataset behind these numbers is currently the repository's smoke-test seed set
(see artifacts/datasets/sources.json for why the three intended benchmark sources
could not be used). Results produced by this script validate that the harness works
end-to-end; they are NOT a benchmark claim about model quality until run against a
properly licensed dataset.
"""

from __future__ import annotations

import argparse
import json
import platform
import random
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.contracts import CellValue, FormulaRequest  # noqa: E402
from app.evaluator import validate_and_evaluate  # noqa: E402
from app.model import MLXFormulaModel  # noqa: E402

MODEL_ID = "Qwen/Qwen3-0.6B"
DEFAULT_ADAPTER_PATH = ROOT / "artifacts/adapters/qwen3-formulaforge-r8"
DEFAULT_DATASET = ROOT / "ml/data/processed/test_examples.jsonl"
BOOTSTRAP_SAMPLES = 1000
SEED = 42


def canonical(formula: str) -> str:
    return "".join(formula.upper().split())


def to_request(row: dict) -> FormulaRequest:
    return FormulaRequest(
        task_type=row["task_type"],
        instruction=row["instruction"],
        sheet_name=row["sheet_name"],
        target_cell=row["target_cell"],
        cells=[CellValue(**cell) for cell in row["cells"]],
        current_formula=row.get("current_formula"),
    )


def load_examples(path: Path, limit: int | None) -> list[dict]:
    if not path.exists():
        raise SystemExit(f"Dataset not found at {path}. Run `ml/scripts/prepare_data.py` first.")
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    return rows[:limit] if limit else rows


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def bootstrap_ci(values: list[float], samples: int = BOOTSTRAP_SAMPLES) -> list[float]:
    if not values:
        return [0.0, 0.0]
    rng = random.Random(SEED)
    n = len(values)
    means = sorted(_mean([values[rng.randrange(n)] for _ in range(n)]) for _ in range(samples))
    lo_idx = max(0, int(0.025 * samples) - 1)
    hi_idx = min(samples - 1, int(0.975 * samples))
    return [round(means[lo_idx], 4), round(means[hi_idx], 4)]


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(pct / 100 * (len(ordered) - 1))))
    return ordered[idx]


def evaluate_prediction(row: dict, raw_output: str | None) -> dict[str, Any]:
    ground_truth = canonical(row["formula"])
    if raw_output is None:
        return {
            "id": row["id"],
            "task_type": row["task_type"],
            "source": row.get("source", "unknown"),
            "ground_truth": ground_truth,
            "predicted_formula": None,
            "abstained": True,
            "exact_match": False,
            "syntactically_valid": False,
            "supported_functions": False,
            "references_valid": False,
            "execution_success": False,
            "errors": ["No parseable JSON formula in model output"],
        }
    predicted = canonical(raw_output)
    cells = [CellValue(**cell) for cell in row["cells"]]
    evaluation = validate_and_evaluate(predicted, cells, row["target_cell"])
    unsupported = any("Unsupported function" in e for e in evaluation.errors)
    unknown_ref = any("Unknown cell reference" in e for e in evaluation.errors)
    return {
        "id": row["id"],
        "task_type": row["task_type"],
        "source": row.get("source", "unknown"),
        "ground_truth": ground_truth,
        "predicted_formula": predicted,
        "abstained": False,
        "exact_match": predicted == ground_truth,
        "syntactically_valid": predicted.startswith("="),
        "supported_functions": not unsupported,
        "references_valid": not unknown_ref,
        "execution_success": evaluation.valid,
        "errors": evaluation.errors,
    }


def environment_metadata() -> dict[str, Any]:
    import importlib.metadata

    uv_lock = ROOT / "backend/uv.lock"
    try:
        mlx_version = importlib.metadata.version("mlx")
    except importlib.metadata.PackageNotFoundError:
        mlx_version = "unavailable"
    try:
        mlx_lm_version = importlib.metadata.version("mlx-lm")
    except importlib.metadata.PackageNotFoundError:
        mlx_lm_version = "unavailable"
    try:
        chip = subprocess.run(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except Exception:
        chip = platform.machine()
    return {
        "uv_lock_sha256": _sha256(uv_lock) if uv_lock.exists() else None,
        "mlx_version": mlx_version,
        "mlx_lm_version": mlx_lm_version,
        "machine": platform.machine(),
        "chip": chip,
        "platform": platform.platform(),
    }


def _sha256(path: Path) -> str:
    import hashlib

    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["base", "adapted"], required=True)
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--adapter-path", default=str(DEFAULT_ADAPTER_PATH))
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    examples = load_examples(dataset_path, args.limit)
    if not examples:
        raise SystemExit(f"No examples found in {dataset_path}")

    adapter_path = args.adapter_path if args.model == "adapted" else None
    if adapter_path and not Path(adapter_path).exists():
        raise SystemExit(
            f"Adapter not found at {adapter_path}. Run `make train` before `make evaluate`."
        )

    model = MLXFormulaModel(MODEL_ID, adapter_path)
    model._load()

    try:
        import mlx.core as mx

        reset_peak_memory = getattr(mx, "reset_peak_memory", mx.metal.reset_peak_memory)
        reset_peak_memory()
        have_metal = True
    except Exception:
        have_metal = False

    predictions: list[dict[str, Any]] = []
    latencies_ms: list[float] = []
    tps_samples: list[float] = []
    for row in examples:
        request = to_request(row)
        started = time.perf_counter()
        raw = model.generate(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        latencies_ms.append(elapsed_ms)
        if raw:
            token_count = len(model._tokenizer.encode(raw))
            if elapsed_ms > 0:
                tps_samples.append(token_count / (elapsed_ms / 1000))
        scored = evaluate_prediction(row, raw)
        scored["latency_ms"] = round(elapsed_ms, 2)
        predictions.append(scored)

    get_peak_memory = (
        getattr(mx, "get_peak_memory", mx.metal.get_peak_memory) if have_metal else None
    )
    peak_memory_mb = round(get_peak_memory() / (1024 * 1024), 2) if have_metal else None

    non_abstained = [p for p in predictions if not p["abstained"]]
    repairs = [p for p in predictions if p["task_type"] == "repair"]

    exact_matches = [1.0 if p["exact_match"] else 0.0 for p in predictions]
    execution_successes = [1.0 if p["execution_success"] else 0.0 for p in predictions]
    abstentions = [1.0 if p["abstained"] else 0.0 for p in predictions]
    repair_successes = [1.0 if p["execution_success"] else 0.0 for p in repairs]

    metrics = {
        "canonical_exact_match": round(_mean(exact_matches), 4),
        "canonical_exact_match_ci95": bootstrap_ci(exact_matches),
        "syntactic_validity": round(
            _mean([1.0 if p["syntactically_valid"] else 0.0 for p in non_abstained]), 4
        ),
        "supported_function_rate": round(
            _mean([1.0 if p["supported_functions"] else 0.0 for p in non_abstained]), 4
        ),
        "reference_validity": round(
            _mean([1.0 if p["references_valid"] else 0.0 for p in non_abstained]), 4
        ),
        "execution_success": round(_mean(execution_successes), 4),
        "execution_success_ci95": bootstrap_ci(execution_successes),
        "repair_success": round(_mean(repair_successes), 4) if repairs else None,
        "abstention_rate": round(_mean(abstentions), 4),
        "median_latency_ms": round(statistics.median(latencies_ms), 2) if latencies_ms else None,
        "p95_latency_ms": round(percentile(latencies_ms, 95), 2) if latencies_ms else None,
        "peak_memory_mb": peak_memory_mb,
        "tokens_per_second": round(_mean(tps_samples), 2) if tps_samples else None,
    }

    report = {
        "model": args.model,
        "model_id": MODEL_ID,
        "adapter_path": adapter_path,
        "dataset": str(dataset_path),
        "example_count": len(examples),
        "metrics": metrics,
        "environment": environment_metadata(),
        "note": (
            "SMOKE TEST ONLY: evaluated against the in-repo seed_examples.jsonl dataset, "
            "not a licensed benchmark. See artifacts/datasets/sources.json."
        ),
    }

    output = ROOT / "artifacts/reports"
    output.mkdir(parents=True, exist_ok=True)
    (output / f"{args.model}-evaluation.json").write_text(
        json.dumps({"report": report, "predictions": predictions}, indent=2)
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
