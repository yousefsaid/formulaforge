# FormulaForge

A local-first Excel formula copilot — a fine-tuned 0.6B model proposes formulas, a
deterministic evaluator verifies every one before you see it.

[![CI](https://github.com/yousefsaid/formulaforge/actions/workflows/ci.yml/badge.svg)](https://github.com/yousefsaid/formulaforge/actions/workflows/ci.yml)
&nbsp;·&nbsp;[Live demo](#) _(link goes here once Phase 3 hosted demo ships)_

![Demo](docs/media/demo.gif)
_(demo GIF goes here once Phase 3 recording ships)_

## Why this exists

**Privacy.** Spreadsheets never leave the machine. Inference, validation, and preview all
run locally — nothing about the workbook's contents is sent anywhere.

**Trust, not vibes.** Language models hallucinate. FormulaForge treats every model output
as untrusted input: a deterministic validator/evaluator checks syntax, supported
functions, cell references, and execution before a formula is ever shown, and abstention
is a first-class outcome when the model can't produce something verifiable.

**Constraint as engineering.** A 0.6B model running on Apple Silicon unified memory is a
hard budget, not an accident. The single-slot inference queue, the fixed LoRA recipe, and
the narrow workbook boundary are all direct consequences of taking that constraint
seriously instead of hiding it.

## Architecture

```mermaid
flowchart LR
  A[Browser · Next.js] --> B[FastAPI]
  B --> C[Bounded inference queue]
  C --> D[Qwen3-0.6B · MLX + LoRA]
  B --> E[In-memory .xlsx normalizer]
  D --> F[Deterministic validator/evaluator]
  E --> F
  F --> A
```

## Results

The three benchmark datasets this project intended to use turned out to be blocked
when actually checked — two have no usable license, and the third requires emailing
the author for access (see [artifacts/datasets/sources.json](artifacts/datasets/sources.json)).
The numbers below are a **pipeline smoke test** run against the repo's tiny in-repo
seed set, not a benchmark claim — they prove the base-vs-LoRA harness runs correctly
end-to-end, and every number traces to a JSON artifact in `artifacts/reports/`. See
[docs/EVAL_REPORT.md](docs/EVAL_REPORT.md) for the full breakdown and failure
analysis.

| Metric | Base | Adapted |
|---|---|---|
| Canonical exact match | 0.0 | 0.0 |
| Execution success | 1.0 | 1.0 |
| Abstention rate | 0.0 | 0.0 |
| Median latency | 747 ms | 1,110 ms |

Base and adapted produced byte-identical predictions on this run — expected, since 3
LoRA iterations over 2 examples is far too little signal to move the model at all.
A real benchmark-quality result requires re-running this same, already-working
pipeline against a properly licensed dataset.

## Quick start

```bash
make setup
make api
make web
```

The API listens on `127.0.0.1:8000`; the web app listens on `localhost:3000`. Model
conversion, training, and evaluation are deliberately separate from server startup:

```bash
make baseline  # records untouched Qwen3-0.6B metrics
make train     # MLX-LM LoRA (rank 8, final 8 layers)
make evaluate  # produces artifacts/reports and docs/EVAL_REPORT.md
```

## Safety boundary

Uploads stay in memory and are never saved. Only `.xlsx` files up to 2 MB are accepted.
Macro files, encrypted workbooks, external links, excess archive expansion, excess
sheets/cells, unsupported formulas, ambiguous sheets, circular references, and evaluation
failures are rejected or abstained from. v1 supports arithmetic, comparisons,
references/ranges, and `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `SUMIF`,
`COUNTIF`, `INDEX`, `MATCH`, and `VLOOKUP`.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Model card](docs/MODEL_CARD.md)
- [Data card](docs/DATA_CARD.md)
- [Evaluation report](docs/EVAL_REPORT.md)
- [Demo walkthrough](docs/DEMO.md)
