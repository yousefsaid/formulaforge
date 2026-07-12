# Model Card

FormulaForge uses `Qwen/Qwen3-0.6B`, converted to a local four-bit MLX model. It is prompted with a stable, bounded workbook-context JSON payload, thinking disabled, temperature 0, and a 128-token cap. A LoRA adapter may target the final eight transformer layers with rank 8, batch size 1, accumulation 8, maximum sequence length 1024, learning rate `1e-5`, seed 42, and at most three epochs.

The product only enables an adapter if it is non-inferior to the base model on execution accuracy. If it declines, one predeclared retry at `5e-6` is allowed; otherwise the base model ships and the negative result is reported. Model output is not trusted: only exactly one JSON object containing a formula is accepted, and generated formulas pass a separate deterministic validator.

This model is designed to assist with constrained spreadsheet formulas. It can make plausible but incorrect formulas, misunderstand business semantics, hallucinate columns, or abstain unnecessarily. Users must review a proposed formula before a workbook download is enabled.
