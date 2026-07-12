# Design Decisions

The engineering story behind FormulaForge — why it's built this way, not just what it does.

## Why a 0.6B model

FormulaForge is local-first: spreadsheets never leave the machine, which means
inference has to run on whatever unified memory a laptop has, not a GPU cluster.
Qwen3-0.6B fits that budget with room to spare (peak memory measured at ~1.3 GB — see
[EVAL_REPORT.md](EVAL_REPORT.md)) and returns a proposal in under a second on Apple
Silicon. A bigger model would generate better formulas in isolation, but it would
also break the "runs on your laptop, no API key, no upload" premise the whole product
is built on. The size constraint isn't a limitation to apologize for — it's the
reason the deterministic validator exists at all: a small model will be wrong often
enough that trusting its output directly isn't an option, which forced the actual
design decision below.

## Why validator-over-trust

The model's output is never shown to the user directly — every proposed formula is
parsed, checked against an allowlist of supported functions, checked for missing or
circular cell references, and evaluated against the actual visible cell values before
it's returned (`backend/app/evaluator.py`). This isn't a safety bolt-on; it's the
product. An LLM proposing Excel formulas is, structurally, an untrusted-input
problem — the same category as parsing user-uploaded files — and the fix is the same
category of solution: a deterministic checker that either accepts or rejects,
with no path for the model to bypass it. The eval report's failure appendix shows why
this matters concretely: on the one `generate`-task failure recorded, both the base
and fine-tuned model predicted `=SUM(B2,C2)` where the ground truth was
`=SUM(B2:C2)` — different syntax, same result. The validator correctly scored that
as `execution_success: true` while `canonical_exact_match` correctly scored it
`false`. Trusting the model's raw text would have meant either rejecting a formula
that actually works, or accepting one blind; validating its *behavior* against the
real cell values sidesteps that entirely.

## Why a single-slot inference queue

Unified memory on Apple Silicon is shared between the OS, the browser, and the model.
Running two inferences concurrently doesn't parallelize meaningfully on this
hardware — it just doubles memory pressure and risks OOM or heavy swapping mid-request.
`FormulaService` serializes every generation through an `asyncio.Semaphore(1)`
(`backend/app/service.py`), so requests queue rather than compete. On a single-user,
local-first product this costs nothing in practice (nobody is issuing concurrent
requests to their own laptop) and removes an entire class of memory-pressure bugs.

## Why abstention is a first-class outcome

`ResultStatus` has three states, not two: `valid`, `invalid`, and `abstained` — a
model timeout, an unparseable response, or an empty prediction all resolve to
`abstained` rather than being forced into a wrong answer. A model that says "I don't
know" in a recognizable way is more useful than one that always produces *something*,
because the caller can act on the distinction. The eval run recorded zero
abstentions and zero malformed JSON on its two test examples — too small a sample to
claim the abstention path is well-calibrated, but the failure modes that did occur
(a syntactically-different-but-equivalent formula, and a repair task where the model
left the formula unchanged) are exactly the kind of "plausible but not quite right"
output that this project's core bet is built around: the model doesn't need to be
right, it needs to be checked.

## Why a fixed training recipe with a predeclared retry

The training recipe — Qwen3-0.6B base, LoRA rank 8, last 8 layers, batch size 1,
gradient accumulation 8, max sequence length 1024, learning rate 1e-5, seed 42, ≤3
epochs, with exactly one predeclared retry at lr 5e-6 — is fixed before looking at
results, and documented as fixed. This is pre-registration discipline borrowed from
experimental science: with a two-person team and a 2-example smoke-test dataset
([EVAL_REPORT.md](EVAL_REPORT.md)), the temptation to keep tweaking hyperparameters
until a number looks good is real, and it produces numbers that describe the
tuning process, not the model. Declaring the recipe and the one allowed retry ahead
of time removes that degree of freedom.

## Why the eval mirrors the serving path exactly

A benchmark number is only meaningful if it describes what actually ships. The eval
report is explicit about a gap here rather than hiding it: `docs/MODEL_CARD.md`
commits to serving a 4-bit converted local MLX model, but the evaluation harness
currently loads the full-precision `Qwen/Qwen3-0.6B` from Hugging Face, because the
4-bit path (`mlx-community/Qwen3-0.6B-4bit`) wasn't yet wired up when this run was
made and the LoRA adapter is trained against the full-precision base. Reporting a
number from a differently-quantized model than the one that ships would be reporting
a number about a different product. That gap is tracked as an open next step, not
papered over with an approximate claim.

## What didn't work / what surprised us

**The base and fine-tuned models produced byte-identical predictions.** This isn't a
bug — 3 LoRA iterations over a 2-example dataset is nowhere near enough signal to
move a 0.6B model's weights in any observable way, and the fixed recipe's `iters: 3`
is calibrated for a real ~5,000-example dataset, not this smoke test. Running the
pipeline end-to-end on 2 rows validated that the *code paths* work — the adapter
trains, saves, loads, and generates — but it says nothing about whether LoRA
fine-tuning actually helps on this task. That question is still open.

**All three benchmark datasets originally planned for this project turned out to be
unusable once actually checked**, not before: NL2Formula has no LICENSE file on
GitHub; FoRepBench's containing repo explicitly whitelists a specific list of
benchmark folders that doesn't include it, and its data is self-described as scraped
from open forums with no stated rights; SpreadNaLa is MIT-licensed but ships no data,
requiring a manual request to the author. This wasn't caught in planning — it surfaced
during Phase 2 when the pipeline actually tried to fetch the data — and it's the
reason the current numbers come from a 2-row smoke-test set instead of a real
benchmark. The lesson: license status has to be verified by reading the actual
LICENSE file in the actual repo, not assumed from a dataset's reputation or a paper's
citation.

**Two implementation bugs surfaced only by running the real pipeline against pinned
dependency versions, not by reading the code.** `backend/app/model.py` passed
`temp=0.0` directly to `mlx_lm.generate()`, but the pinned `mlx-lm` version requires a
`sampler=` callable instead and raised `TypeError` on every call. Separately,
`ml/scripts/train.py` passed a `--lora-rank` flag that doesn't exist in the installed
`mlx_lm.lora` CLI, and never actually passed `--iters`, `--grad-accumulation-steps`,
or `--max-seq-length` despite declaring them in its own config — meaning a "fixed
recipe" run would have silently fallen back to `mlx_lm.lora`'s unrelated defaults
(1000 iterations) instead of the documented recipe. Both were caught only because
`make reproduce` actually executes the full pipeline rather than mocking the training
step; a design doc or a code review would not have caught either one.
