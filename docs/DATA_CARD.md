# Data Card

FormulaForge’s intended sources are [NL2Formula](https://github.com/timetub/NL2Formula), [SpreadNaLa](https://github.com/sebschu/SpreadNaLa), and [FoRepBench](https://github.com/microsoft/prose-benchmarks/tree/main/FoRepBench). They are not downloaded or redistributed by this repository. Before a training run, record each upstream revision, license, SHA-256, retrieval date, and transformation command in `artifacts/datasets/sources.json`.

The preparation pipeline normalizes whitespace, formula case, separators, sheet names, and cell references; drops malformed/duplicate examples; filters to the v1 function allowlist; and groups splits by workbook/table identity with seed 42. It targets 5,000 generation examples plus all eligible repair examples, reserving 10% each for validation and internal test. SpreadNaLa remains an untouched external generalization set. The small checked-in seed dataset only smoke-tests pipeline behavior and must not be used to claim benchmark performance.

Potential limitations: natural-language intent can be underspecified; formulas may encode dataset-specific conventions; filtering biases the data toward the v1 evaluator; and benchmark licenses/terms must be independently reviewed before use.
