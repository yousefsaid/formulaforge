import { execFileSync } from "node:child_process";
// The FastAPI schema is the contract source. Start `make api`, then run this command.
execFileSync(
  "npx",
  [
    "openapi-typescript",
    "http://127.0.0.1:8000/openapi.json",
    "-o",
    "lib/openapi.generated.ts",
  ],
  { stdio: "inherit" },
);
