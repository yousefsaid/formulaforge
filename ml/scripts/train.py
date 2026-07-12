"""Runs the fixed MLX-LM LoRA recipe; a retry is permitted only on non-improvement."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = {
    "model": "Qwen/Qwen3-0.6B",
    "rank": 8,
    "num_layers": 8,
    "batch_size": 1,
    "grad_accumulation_steps": 8,
    "max_seq_length": 1024,
    "learning_rate": 1e-5,
    "iters": 3,
    "seed": 42,
}


def main() -> None:
    output = ROOT / "artifacts/adapters/qwen3-formulaforge-r8"
    output.parent.mkdir(parents=True, exist_ok=True)
    (output.parent / "training-config.json").write_text(json.dumps(CONFIG, indent=2))
    subprocess.run(
        [
            "python",
            "-m",
            "mlx_lm.lora",
            "--model",
            CONFIG["model"],
            "--train",
            "--data",
            str(ROOT / "ml/data/processed"),
            "--adapter-path",
            str(output),
            "--batch-size",
            "1",
            "--num-layers",
            "8",
            "--lora-rank",
            "8",
            "--learning-rate",
            "1e-5",
            "--seed",
            "42",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
