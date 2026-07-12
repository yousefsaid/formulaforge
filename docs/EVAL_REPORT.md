# Evaluation Report

Status: evaluation framework installed; no benchmark claim has been made yet.

Run `make baseline`, provision the approved datasets, run `make train`, then run `make evaluate`. Results are stored as machine-readable JSON in `artifacts/reports/` and this document should be updated from those exact files. The report must compare base and adapter by task type, source, formula function, formula length, and include bootstrap confidence intervals.

Required metrics: canonical exact match, syntax validity, allowed-function rate, reference validity, execution success, repair success, abstention rate, median/p95 latency, peak memory, and tokens per second. The failure appendix must manually classify at least 25 failures across hallucinated columns, wrong ranges, absolute-reference errors, unsupported functions, plausible-but-wrong formulas, malformed JSON, and over-abstention.

Until those measured outputs exist, the honest conclusion is that FormulaForge’s deterministic safety path has test coverage, while model-quality claims remain unmeasured.
