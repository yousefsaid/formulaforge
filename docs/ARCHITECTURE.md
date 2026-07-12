# Architecture

```text
Browser → Next.js workspace → FastAPI → bounded inference queue → FormulaModel (MLX or fake)
                              ↘ in-memory .xlsx normalizer → deterministic validator/evaluator
```

The FastAPI OpenAPI schema is the API contract. `frontend/lib/api.ts` mirrors it and `npm run generate:api` refreshes generated schema types from the running service. The model is loaded once by the app lifespan; downloads and training never occur on startup. Requests are cache-keyed from normalized context plus adapter version and serialized through a queue of one to protect unified memory.

The workbook boundary is deliberately narrow: `.xlsx` only, no persistence, 2 MB input, 20 MB uncompressed archive, 10 sheets, and 5,000 non-empty cells. The validator rejects cross-sheet/external links, unsupported functions, missing references, target-cell cycles, and failed evaluation. This makes the product useful as a guarded assistant rather than an opaque workbook executor.
