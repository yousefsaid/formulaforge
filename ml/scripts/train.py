"""Runs the fixed MLX-LM LoRA recipe; a retry is permitted only on non-improvement."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import yaml

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
    adapter_dir = ROOT / "artifacts/adapters"
    output = adapter_dir / "qwen3-formulaforge-r8"
    adapter_dir.mkdir(parents=True, exist_ok=True)
    (adapter_dir / "training-config.json").write_text(json.dumps(CONFIG, indent=2))

    # `mlx_lm.lora` has no CLI flag for LoRA rank/dropout/scale -- they can only be
    # set via a YAML config file's `lora_parameters` key. Everything else is passed
    # as explicit CLI flags so the fixed recipe never silently falls back to
    # mlx_lm.lora's own defaults (iters=1000, grad_accumulation_steps=1, etc.).
    lora_config_path = adapter_dir / "lora_parameters.yaml"
    lora_config_path.write_text(
        yaml.safe_dump({"lora_parameters": {"rank": CONFIG["rank"], "dropout": 0.0, "scale": 20.0}})
    )

    subprocess.run(
        [
            "python",
            "-m",
            "mlx_lm.lora",
            "--config",
            str(lora_config_path),
            "--model",
            CONFIG["model"],
            "--train",
            "--data",
            str(ROOT / "ml/data/processed"),
            "--adapter-path",
            str(output),
            "--batch-size",
            str(CONFIG["batch_size"]),
            "--num-layers",
            str(CONFIG["num_layers"]),
            "--learning-rate",
            str(CONFIG["learning_rate"]),
            "--iters",
            str(CONFIG["iters"]),
            "--grad-accumulation-steps",
            str(CONFIG["grad_accumulation_steps"]),
            "--max-seq-length",
            str(CONFIG["max_seq_length"]),
            "--seed",
            str(CONFIG["seed"]),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
