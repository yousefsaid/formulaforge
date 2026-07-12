# FormulaForge Portfolio Upgrade Plan (v2)

> Execution guide for turning this repo into a portfolio-grade project. Written to be
> self-contained: follow it top-to-bottom without needing the conversation that produced it.
> Do phases in order. Do not start a phase until the previous phase's acceptance criteria pass.
>
> **v2 changes vs. v1:** code readability moved from optional Phase 4 into Phase 1 (reviewers
> read source before they run anything); hosted demo promoted from "optional stretch" to a core
> Phase 3 task (recruiters click links, they don't clone repos); design-decisions writeup made
> mandatory in Phase 4 (the narrative is what demonstrates engineering judgment); added LICENSE,
> `make reproduce`, and explicit non-negotiable constraints per phase.

## Project context (read first)

FormulaForge is a **local-first Excel formula copilot**:

- `backend/` — FastAPI app (Python, uv, pytest, ruff, mypy). Key modules:
  `app/main.py` (routes), `app/service.py` (orchestration), `app/model.py` (MLX model or
  fake model), `app/evaluator.py` (deterministic formula validator/evaluator),
  `app/workbooks.py` (in-memory .xlsx normalizer), `app/contracts.py` (Pydantic schemas),
  `app/cache.py`, `app/prompting.py`.
- `frontend/` — Next.js + TypeScript + Tailwind. One main component
  `components/FormulaWorkspace.tsx`, API client `lib/api.ts`, vitest unit tests,
  Playwright e2e in `e2e/`.
- `ml/` — training/eval scaffolding. `scripts/train.py` wraps `mlx_lm.lora` with a fixed
  recipe (Qwen3-0.6B, LoRA rank 8, last 8 layers, lr 1e-5, seed 42).
  `scripts/evaluate.py` is currently a STUB that writes zeroed metrics.
  `scripts/prepare_data.py` normalizes benchmark data. `data/seed_examples.jsonl` is a
  smoke-test dataset only — never use it for benchmark claims.
- `docs/` — ARCHITECTURE.md, MODEL_CARD.md, DATA_CARD.md, EVAL_REPORT.md (currently says
  "no benchmark claim yet"), DEMO.md.
- `Makefile` — `setup`, `test`, `lint`, `baseline`, `train`, `evaluate`, `api`, `web`.

## Non-negotiable architectural constraints (apply to every phase)

1. **Model output is never trusted.** Every generated formula passes the deterministic
   validator/evaluator (`backend/app/evaluator.py`) before being shown or downloaded.
   No code path may bypass it.
2. **The safety boundary is a feature, not a limitation.** 2 MB .xlsx cap, 20 MB
   uncompressed cap, 10 sheets / 5,000 cells, in-memory only (no persistence), v1
   function allowlist, abstention as a first-class outcome, gated download. Never weaken
   any of these to make a demo or a metric look better.
3. **Measured or absent.** No metric, benchmark number, or dataset property may appear in
   any doc unless it was produced by an actual run and exists as a JSON artifact in
   `artifacts/reports/`. A well-documented negative result is acceptable output.
4. **Single-slot inference queue stays.** Requests are serialized through a queue of one
   to protect unified memory. Do not parallelize inference.
5. **The fixed training recipe is part of the story.** Qwen3-0.6B, LoRA rank 8, last 8
   layers, lr 1e-5, seed 42, ≤3 epochs; one predeclared retry at lr 5e-6. No other tuning.
6. **The FastAPI OpenAPI schema is the API contract.** Frontend types mirror it via
   `npm run generate:api`; never hand-drift the two.

The single most valuable deliverable is **Phase 2: real base-vs-fine-tuned eval numbers**.
Everything else is packaging.

---

## Phase 1 — Ship it as a real, readable GitHub repo (~3–4 h)

Reviewers open source files before they run anything. This phase makes the repo public,
green, and readable.

### 1.1 Code readability pass (moved up from old Phase 4)

Many files pack multiple statements per line with semicolons (e.g. `ml/scripts/evaluate.py`,
`frontend/components/FormulaWorkspace.tsx`). This reads as generated/sloppy code to anyone
who opens a file — fix it **before** the repo goes public:

- Reformat backend + ml to one statement per line; run `ruff format` (or black) and keep
  `ruff check` + `mypy` green.
- Run prettier over the frontend.
- **No behavior changes.** Verify with `make test && make lint` before and after.

### 1.2 Git init, LICENSE, first commits

```bash
cd /Users/yousefsaid/Documents/llm-project
git init -b main
```

- Check `.gitignore` covers: `node_modules/`, `.next/`, `__pycache__/`, `.pytest_cache/`,
  `.ruff_cache/`, `.mypy_cache/`, `.venv/`, `artifacts/`, `*.tsbuildinfo`. Add any missing.
- Add an MIT `LICENSE` file (a public repo without a license reads as unfinished).
- Commit in logical chunks with conventional-commit messages (no AI attribution), e.g.:
  - `chore: project scaffolding, Makefile, gitignore, license`
  - `feat: FastAPI backend with deterministic formula validator`
  - `feat: Next.js formula workspace frontend`
  - `feat: MLX LoRA training and evaluation scaffolding`
  - `docs: architecture, model card, data card, eval report`
- Create the GitHub repo (suggested name `formulaforge`) and push:

```bash
gh repo create formulaforge --public --source . --push
```

Ask the user before making the repo public.

### 1.3 CI with GitHub Actions

Create `.github/workflows/ci.yml` with two jobs:

- **backend**: ubuntu-latest, install uv (`astral-sh/setup-uv`), then
  `uv sync --project backend --extra dev`, `ruff check`, `mypy app`, `pytest -q`
  (run from `backend/`). Note: MLX does not run on Linux CI — tests must pass with the
  fake model. If any test imports `mlx` unconditionally, guard the import or skip that
  test on non-Darwin (`pytest.mark.skipif(sys.platform != "darwin", ...)`).
- **frontend**: ubuntu-latest, Node 20, `npm ci`, `npm run lint`, `npm run typecheck`,
  `npm test -- --run`. Playwright e2e only if it works headless against a mocked API;
  otherwise leave e2e out of CI rather than shipping a red badge.

Add the CI badge to the top of README.md.

### 1.4 README rewrite

Rewrite `README.md` in this order:

1. Project name + one-line pitch: "A local-first Excel formula copilot — a fine-tuned
   0.6B model proposes formulas, a deterministic evaluator verifies every one before you
   see it."
2. CI badge (+ hosted-demo link placeholder, filled in Phase 3).
3. Hero GIF/screenshot placeholder (`docs/media/demo.gif` — filled in Phase 3).
4. "Why this exists" — 3 short paragraphs: privacy (spreadsheets never leave the machine),
   trust (validator, not vibes), constraint as engineering (0.6B model on unified memory).
5. Mermaid architecture diagram (adapt from `docs/ARCHITECTURE.md`):

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

6. Results table (placeholder until Phase 2, then paste real numbers).
7. Quick start (keep existing `make` commands).
8. Safety boundary section (keep existing content).
9. Links to docs/.

### Phase 1 non-negotiables

- Readability pass must not change behavior — the same tests pass before and after.
- CI must be green before the badge goes in the README; never ship a red badge.
- No metrics in the README yet (global constraint 3: measured or absent).

**Acceptance criteria for Phase 1:** repo on GitHub, CI green on main, README has badge +
diagram + pitch, LICENSE present, no multi-statement-per-line files remain in
`backend/app/`, `ml/scripts/`, or `frontend/components/`. `make test` and `make lint`
pass locally.

---

## Phase 2 — Real evaluation numbers (~6–10 h, the core deliverable)

Goal: replace the stub `ml/scripts/evaluate.py` with a real harness, run base vs.
LoRA-fine-tuned Qwen3-0.6B, and publish an honest comparison in `docs/EVAL_REPORT.md`.

**Hard rule:** never fabricate or estimate a metric. Every number in EVAL_REPORT.md must
come from a JSON file in `artifacts/reports/` produced by an actual run. If a step fails,
document the failure honestly — the model card already commits to shipping the base model
and reporting a negative result if LoRA doesn't help. A well-reported negative result is
acceptable output for this phase.

### 2.1 Dataset preparation

Per `docs/DATA_CARD.md`, intended sources: NL2Formula (github.com/timetub/NL2Formula),
SpreadNaLa (github.com/sebschu/SpreadNaLa), FoRepBench
(microsoft/prose-benchmarks/FoRepBench).

1. Check each repo's license before use. Record revision, license, SHA-256, retrieval
   date, and transformation command in `artifacts/datasets/sources.json`. Do NOT commit
   the datasets themselves.
2. Extend `ml/scripts/prepare_data.py` to: normalize (whitespace, formula case,
   separators, sheet names, cell refs), drop malformed/duplicate rows, filter to the v1
   function allowlist (`SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, SUMIF, COUNTIF, INDEX,
   MATCH, VLOOKUP` + arithmetic/comparison/references), split by workbook identity with
   seed 42 into train/val/test (80/10/10). Target ≤5,000 train examples. Keep SpreadNaLa
   held out entirely as an external generalization set.
3. Output format must match what `mlx_lm.lora --data` expects (`train.jsonl`,
   `valid.jsonl`, `test.jsonl` with a `"text"` field, prompt+completion concatenated
   using the same prompt template as `backend/app/prompting.py`).

### 2.2 Real evaluate.py

Rewrite `ml/scripts/evaluate.py` (keep the CLI: `--model base|adapted`; add
`--dataset PATH` and `--limit N` for smoke runs). For each test example:

1. Build the prompt exactly as the backend does (import from `backend/app/prompting.py`
   if importable; otherwise mirror it and add a test asserting the two stay in sync).
2. Generate with MLX (temperature 0, thinking disabled, 128-token cap — same as
   `backend/app/model.py`). For `--model adapted`, pass the adapter path.
3. Parse: accept exactly one JSON object containing a formula, else count as
   malformed/abstention per the existing contract.
4. Score with the deterministic evaluator (`backend/app/evaluator.py`) against the
   example's workbook context.

Metrics to compute (all already named in EVAL_REPORT.md): canonical exact match,
syntactic validity, supported-function rate, reference validity, execution success,
repair success (repair examples only), abstention rate, median/p95 latency, peak memory
(via `mlx.core.metal.get_peak_memory()` if available, else psutil), tokens/second.
Add bootstrap 95% CIs (resample examples 1,000×) for exact match and execution success.
Write per-example predictions AND the summary to
`artifacts/reports/{base|adapted}-evaluation.json`.

### 2.3 Reproducibility target

Add `make reproduce` to the Makefile: one command that runs
`prepare_data → baseline → train → evaluate` end-to-end from documented sources.
"One command reproduces every number in the report" is a headline claim for the README —
and it keeps the report honest by construction. Record the exact environment in the
report JSONs (`uv.lock` hash, mlx/mlx_lm versions, machine/chip).

### 2.4 Run the experiment

```bash
make baseline    # base model eval — do this FIRST
make train       # LoRA per the fixed recipe in ml/scripts/train.py
make evaluate    # adapted model eval
```

Recipe discipline (from MODEL_CARD.md): if the adapter is NOT non-inferior to base on
execution accuracy, one predeclared retry at lr 5e-6 is allowed; otherwise ship base and
report the negative result. Do not tune anything else — the fixed recipe is part of the
story.

### 2.5 Write the report

Update `docs/EVAL_REPORT.md` from the JSON artifacts only:

- Base vs. adapted table for every metric, with CIs.
- Breakdowns by task type, source dataset, formula function, formula length.
- Failure appendix: manually classify ≥25 failures into: hallucinated columns, wrong
  ranges, absolute-reference errors, unsupported functions, plausible-but-wrong,
  malformed JSON, over-abstention. Include 2–3 verbatim examples per category.
- Copy the headline table into README's results section.

### Phase 2 non-negotiables

- Measured or absent — every published number traces to a JSON artifact (global 3).
- Eval prompt/decoding must exactly match the serving path (`prompting.py`, temp 0,
  128-token cap), or the numbers don't describe the product.
- Fixed recipe only; one predeclared retry (global 5).
- Dataset licenses verified and provenance recorded before any training run.
- `make baseline` runs before `make train` — the comparison is meaningless otherwise.

**Acceptance criteria for Phase 2:** both report JSONs exist in `artifacts/reports/`;
EVAL_REPORT.md numbers match them exactly; README shows the headline comparison;
sources.json documents dataset provenance; `make reproduce` runs the full pipeline.

---

## Phase 3 — Demo assets + hosted demo (~3–5 h)

Recruiters click links; they rarely clone repos. This phase produces the two things a
reviewer actually experiences: a GIF and a URL.

### 3.1 Recorded demo

1. Record a 60–90 s demo following `docs/DEMO.md` (upload sheet → generate → show
   validation + preview value + latency → repair mode → rejected-workbook case →
   gated download). Use QuickTime or `ffmpeg`.
2. Convert to GIF: `ffmpeg -i demo.mov -vf "fps=10,scale=960:-1" docs/media/demo.gif`
   (keep under ~10 MB; if larger, trim or reduce fps). Also keep the mp4 for the
   portfolio site.
3. Embed the GIF at the top of README. Add 2–3 static screenshots to `docs/media/`.

### 3.2 Hosted demo (promoted from optional to core)

Deploy a clickable demo so a reviewer can try the product in 10 seconds:

- Deploy the Next.js frontend to Vercel with the API in fake-model mode
  (`backend/app/model.py` already supports the fake path). Host the FastAPI backend on
  a free tier (Fly.io/Render/Railway) in fake-model mode, or — if simpler — port the
  fake-model + validator path to a Next.js API route so everything lives on Vercel.
  The deterministic validator/evaluator MUST still run server-side either way; the
  hosted demo demonstrates the full trust pipeline, just with a stub generator.
- Banner in the hosted UI and a README note: "Hosted demo uses a stub model; real
  inference runs locally on Apple Silicon — see the eval report for measured quality."
  Honesty about this is itself a portfolio signal.
- Ask the user before deploying anything.
- Timebox: if hosting the validator path takes more than ~3 h, ship frontend-only with
  mocked API responses and label it clearly as a UI walkthrough.

### Phase 3 non-negotiables

- The hosted demo must not weaken the safety boundary (same size caps, allowlist,
  in-memory only, gated download) — global 2.
- The stub model must be clearly labeled everywhere it appears; never let a viewer
  believe stub output is fine-tuned-model output (global 3 applied to the demo).
- No uploaded spreadsheets may be persisted server-side on the hosted demo.

**Acceptance criteria:** README opens with a working GIF; mp4 saved for the portfolio;
a public URL in the README serves the labeled demo end-to-end.

---

## Phase 4 — The narrative + depth (~4–6 h)

The writeup is what separates "built a thing" from "understood the problem." 4.1 is
mandatory; 4.2–4.3 are optional stretch.

### 4.1 Design-decisions writeup (mandatory)

Write `docs/DESIGN_DECISIONS.md` — the engineering story, 1–2 paragraphs per decision:

- Why a 0.6B model (privacy, unified-memory budget, latency; constraint as engineering).
- Why validator-over-trust (LLM output as untrusted input; deterministic verification
  as the product's core, not a bolt-on).
- Why a single-slot inference queue (unified memory pressure on Apple Silicon).
- Why abstention is a first-class outcome (calibrated refusal beats confident nonsense).
- Why a fixed training recipe with a predeclared retry (pre-registration discipline;
  avoiding metric shopping).
- Why the eval mirrors the serving path exactly (numbers must describe the product).
- What didn't work / what surprised you — filled from real Phase 2 findings. This
  section is disproportionately valuable in interviews; do not skip it.

Link it prominently from the README. If you have a portfolio site or blog, adapt this
doc into a post titled around the strongest finding (e.g. "Fine-tuning a 0.6B model to
write Excel formulas — honestly evaluated").

### 4.2 Frontend depth (optional)

- Richer grid preview (proper table instead of 36 cells).
- Real modified-workbook download behind the confirm step (currently an `alert()` stub) —
  generate the workbook server-side in memory, never persist it.

### 4.3 Test coverage (optional)

- Frontend tests for error/abstention states; backend tests for the cache and queue.
- Target 80%+ where practical.

### Phase 4 non-negotiables

- The writeup may only cite Phase 2 artifacts for any quantitative claim (global 3).
- 4.2's download feature keeps the gated-confirm step and in-memory-only handling
  (globals 1–2).

**Acceptance criteria:** DESIGN_DECISIONS.md exists, is linked from README, and contains
a "what didn't work" section grounded in the actual eval run.

---

## Rules for the executing agent

- Never invent metrics, results, or dataset properties. Measured or absent.
- Never weaken the safety boundary (file size caps, allowlist, in-memory-only, gated
  download) for convenience.
- Run `make test && make lint` after every change set; fix before moving on.
- Commit per completed step with conventional-commit messages; push after each phase.
- If MLX/training/dataset steps fail on the current machine, stop and report the exact
  error rather than substituting fake results.
- Ask the user before: making the GitHub repo public, deploying anything, or deviating
  from the fixed training recipe.
