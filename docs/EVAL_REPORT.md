# Evaluation Report

**Status: pipeline validated end-to-end; no benchmark-quality claim can be made yet.**

Every number below comes directly from `artifacts/reports/base-evaluation.json` and
`artifacts/reports/adapted-evaluation.json`, produced by `make reproduce`
(`prepare_data.py` → `evaluate.py --model base` → `train.py` → `evaluate.py --model
adapted`). Nothing here is estimated.

## Why this is a smoke test, not a benchmark

Per `artifacts/datasets/sources.json`, all three benchmark sources named in
`docs/DATA_CARD.md` turned out to be unusable when actually checked:

- **NL2Formula** has no LICENSE file on GitHub (`license: null`) -- no permission to
  use or redistribute.
- **FoRepBench** (in `microsoft/prose-benchmarks`) is not covered by that repo's own
  LICENSE, which explicitly whitelists a specific list of other benchmark folders and
  does not include FoRepBench. Its seed data is also self-described as "scraped from
  open-source forums" with no stated rights.
- **SpreadNaLa** is MIT-licensed, but the repository contains no data -- its README
  says to contact the author directly for access, which requires a manual step outside
  this pipeline.

Given that, this run uses the repository's existing `ml/data/seed_examples.jsonl`
(2 rows, 1 workbook), which `docs/DATA_CARD.md` already flags as smoke-test-only.
**The numbers below prove the harness runs correctly end-to-end. They are not a
measurement of model quality** and must not be read as one. A real benchmark claim
requires re-running this exact, already-working pipeline against a properly licensed
dataset (e.g. SpreadNaLa once access is obtained).

## Dataset

- Input: `ml/data/seed_examples.jsonl` (sha256
  `55c20cd5ca7ab429621e29431815235c63a2edb25bb9a1be40afd2d98a172690`)
- 2 rows, 1 workbook group -> the 80/10/10 split is degenerate (every split contains
  every row; see `ml/data/processed/manifest.json`'s `degenerate_split` flag). This is
  not a statistically meaningful split.
- Test set evaluated: 2 examples (1 `generate`, 1 `repair`), both from source `seed`.

## Results

| Metric | Base | Adapted |
|---|---|---|
| Canonical exact match | 0.0 (CI 0.0-0.0) | 0.0 (CI 0.0-0.0) |
| Syntactic validity | 1.0 | 1.0 |
| Supported-function rate | 1.0 | 1.0 |
| Reference validity | 1.0 | 1.0 |
| Execution success | 1.0 (CI 1.0-1.0) | 1.0 (CI 1.0-1.0) |
| Repair success | 1.0 | 1.0 |
| Abstention rate | 0.0 | 0.0 |
| Median latency | 747 ms | 1,110 ms |
| p95 latency | 916 ms | 1,546 ms |
| Peak memory | 1,289 MB | 1,286 MB |
| Tokens/sec | 5.55 | 3.75 |

Bootstrap 95% CIs use 1,000 resamples of the (n=2) test set, per the recipe in
`ml/scripts/evaluate.py`; with only 2 examples the CI is necessarily degenerate
(collapses to the point estimate) and should not be read as a real confidence
interval. This is a direct consequence of dataset size, not a bug in the bootstrap
implementation.

**Training recipe used** (fixed, no tuning): Qwen3-0.6B base, LoRA rank 8, last 8
layers, batch size 1, gradient accumulation 8, max sequence length 1024, learning
rate 1e-5, seed 42, 3 iterations (`artifacts/adapters/training-config.json`). No
predeclared retry was triggered or attempted -- see "What didn't work" below for why
one would be meaningless at this dataset size.

### Breakdown by task type

| Task type | n | Base exact match | Adapted exact match |
|---|---|---|---|
| generate | 1 | 0/1 | 0/1 |
| repair | 1 | 0/1 | 0/1 |

### Breakdown by source dataset

Both examples are from `source: "seed"` -- there is no second source to break out.

### Breakdown by formula function / formula length

Both ground-truth formulas are `=SUM(B2:C2)` (11 characters) -- the sample is too
small for a meaningful function- or length-based breakdown.

## Failure appendix

The plan calls for manually classifying at least 25 failures. With only 2 test
examples that target is not reachable from this dataset; both actual failures are
classified below instead of padding the count with fabricated examples.

1. **`generate` task -- plausible-but-wrong.** Ground truth `=SUM(B2:C2)` (range
   syntax); both base and adapted predicted `=SUM(B2,C2)` (comma-separated arguments
   instead of a range). This evaluates and executes correctly against the given
   cells (SUM of two explicit arguments equals SUM of the equivalent range), so the
   deterministic evaluator correctly scores it as `execution_success: true` while
   `canonical_exact_match` correctly scores it as `false` -- the two metrics are
   capturing genuinely different things here, which is the intended design.
2. **`repair` task -- under-repair / no-op.** Given `current_formula: "=B2"` and an
   instruction to include February's column too, both base and adapted predicted
   `=B2` unchanged -- the model did not perform the requested repair. This is neither
   a hallucination nor a malformed-output case; it is a plain task failure.

No abstentions, no malformed JSON, no hallucinated column references, and no
unsupported-function attempts occurred in this run.

## What didn't work

The base and fine-tuned models produced **byte-identical predictions** on both test
examples. This is expected, not a bug: 3 LoRA iterations over a 2-example dataset is
far too little signal to move a 0.6B model's weights in any observable way. The
fixed recipe's `iters: 3` value is calibrated for a real ~5,000-example training set
(per `docs/DATA_CARD.md`'s target), not for this smoke test's 2 rows -- running it
here validates the training and evaluation code paths work correctly (the adapter
directory is produced, loads, and generates), but says nothing about whether LoRA
fine-tuning actually helps on this task. That question stays open until this same
pipeline runs against a real, properly licensed dataset.

Two implementation bugs were found and fixed while building this harness, both
required for `make reproduce` to run at all against the pinned dependency versions:

- `backend/app/model.py` passed `temp=0.0` directly to `mlx_lm.generate()`; the
  installed `mlx-lm` (0.31.3, within the `>=0.20,<1` pin) requires a `sampler=`
  callable instead and raised `TypeError` on every call.
- `ml/scripts/train.py` passed `--lora-rank 8`, a flag that does not exist in the
  installed `mlx_lm.lora` CLI, and never passed `--iters`, `--grad-accumulation-steps`,
  or `--max-seq-length` despite declaring them in its own `CONFIG` dict -- meaning a
  "fixed recipe" run would have silently used `mlx_lm.lora`'s unrelated defaults
  (1000 iterations) instead of the documented recipe.

## Known methodology gap: precision mismatch with the serving path

`docs/MODEL_CARD.md` commits to serving a **4-bit converted local MLX model**
(`backend/app/model.py`'s `MLXFormulaModel` loads from a local path, with
`model_id = "Qwen/Qwen3-0.6B-4bit"` as its display label). This evaluation harness
instead loads the **full-precision** `Qwen/Qwen3-0.6B` directly from Hugging Face,
because (a) `Qwen/Qwen3-0.6B-4bit` is not a real, resolvable HF repo -- the correct
4-bit MLX weights live at `mlx-community/Qwen3-0.6B-4bit` -- and (b) the LoRA adapter
here is trained against the full-precision base (`ml/scripts/train.py`'s fixed
recipe), so evaluating it against a differently-quantized checkpoint would not be a
like-for-like comparison either. Per this plan's own rule that "the eval mirrors the
serving path exactly, or the numbers don't describe the product," these numbers
describe full-precision `Qwen/Qwen3-0.6B` inference, not yet the shipped 4-bit
deployment path. Closing this gap requires converting `Qwen/Qwen3-0.6B` to a local
4-bit MLX model (`mlx_lm.convert`), training/evaluating consistently against that
converted checkpoint, and updating `backend/app/model.py`'s `model_id` to match.

## Next steps to get a real benchmark number

1. Either get SpreadNaLa access from the author, or find a differently-licensed
   formula-generation dataset, and record it in `artifacts/datasets/sources.json`.
2. Convert `Qwen/Qwen3-0.6B` to a local 4-bit MLX checkpoint and re-point
   `ml/scripts/train.py`/`evaluate.py` and `backend/app/model.py` at it, closing the
   precision-mismatch gap noted above.
3. Re-run `make reproduce` -- the harness logic itself is already correct and needs
   no further changes, only real data and the converted checkpoint.
