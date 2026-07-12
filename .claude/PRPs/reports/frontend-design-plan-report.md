# Implementation Report: FormulaForge Frontend Redesign ("The Verified Instrument")

## Summary

Implemented `docs/FRONTEND_DESIGN_PLAN.md` end to end on branch
`feat/frontend-verified-instrument`: token-based design system, Geist
Sans/Mono, decomposed and restyled `FormulaWorkspace` with a new verification
ledger, a left-aligned hero with an R3F grid/glyph scene (static fallback +
reduced-motion aware), header, "How it proves it" and evidence-strip sections,
footer, and a motion/accessibility polish pass.

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Foundation (fonts, tokens, deps) | Complete | Geist via `next/font`-compatible `geist` package; `globals.css` rewritten as the §2 token system; Tailwind config extended; shadcn-style Select/Dialog/Tooltip hand-authored on Radix primitives (no CLI available) |
| 2 | Decompose `FormulaWorkspace` | Complete | `components/workspace/{UploadZone,SheetControls,ModeSwitch,InstructionField,GridPreview,VerificationLedger}.tsx` + `useFormulaWorkspace` hook holding state verbatim |
| 3 | Workspace restyle + verification ledger | Complete | Ledger stages derived from the real `FormulaResponse` (no streaming API exists) via a pure, unit-tested `lib/ledger.ts::computeLedgerStages` |
| 4 | Hero + header + sections + R3F scene | Complete | See "Deviations" for the R3F scene testing caveat |
| 5 | Polish pass | Complete | Motion timing, focus-visible ring, responsive audit (see caveat below), `MotionConfig reducedMotion="user"` added globally |
| 6 | Verification | Complete | Unit tests updated for intentional copy changes, e2e passes, typecheck/build clean |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis (`tsc --noEmit`) | Pass | Zero errors |
| Unit Tests (vitest) | Pass | 10/10, 2 tests updated for deliberate copy changes (empty-state grid copy, stub-model disclosure now lives in the ledger metadata instead of a top banner per §3.3) |
| Build (`next build`) | Pass | Route `/`: 395 kB first-load JS (includes the R3F/three.js chunk, which loads lazily via `next/dynamic({ssr:false})` and is not part of the initial paint — see caveat) |
| E2E (Playwright) | Pass | `e2e/workspace.spec.ts` |
| Edge Cases | Partial | See caveats below |

## Files Changed

Created: `components/{Header,Hero,HowItProves,EvidenceStrip,Footer,MotionProvider}.tsx`,
`components/hero/{HeroScene,HeroCanvas,HeroCanvasLoader}.tsx`,
`components/ui/{select,dialog,tooltip,text-effect}.tsx`,
`components/workspace/{UploadZone,SheetControls,ModeSwitch,InstructionField,GridPreview,VerificationLedger,useFormulaWorkspace}.tsx`,
`lib/{ledger,utils}.ts`, `public/media/demo.mp4`.

Updated: `app/{globals.css,layout.tsx,page.tsx}`, `components/FormulaWorkspace.tsx`,
`tailwind.config.ts`, `vitest.config.ts` (added `esbuild.jsx: "automatic"` — a
pre-existing gap in the test config that only worked before because every
`.tsx` file manually imported `React`), `tests/FormulaWorkspace.test.tsx`,
`package.json`/`package-lock.json` (new deps per plan §5 shopping list plus
Radix primitives + `clsx`/`tailwind-merge`/`class-variance-authority` for the
shadcn-style components).

## Deviations from Plan

1. **shadcn/ui CLI not run** — no interactive CLI available in this
   environment. Hand-authored `Select`/`Dialog`/`Tooltip` directly on
   `@radix-ui/react-*` primitives (which is what the shadcn CLI itself
   generates), restyled with our tokens. Functionally equivalent to the
   plan's "copy-in, restyle" instruction.
2. **motion-primitives not installed as a package** — it isn't a real npm
   package (copy-paste source per its own docs). Authored a small
   `TextEffect` component in its spirit. First version did per-character
   spans; switched to a whole-string blur-up (**explicitly allowed by the
   plan**: "TextEffect per-character *or* a simple blur-up") after
   confirming per-character splitting broke `getByText` assertions in RTL.
3. **Verification ledger staging is response-driven, not stream-driven** —
   the backend API (`lib/api.ts`) returns one `FormulaResponse`, there is no
   incremental pipeline-stage endpoint. Stage pass/fail/abstain state is
   computed from the real response (`status`, `validation_errors`) via
   `lib/ledger.ts`, then revealed with a staggered animation. This satisfies
   "each flipping ... driven by the actual response" without inventing a
   fake streaming API.

## Issues Encountered (and fixed)

- **`vitest.config.ts` had no JSX runtime configured** — pre-existing gap,
  invisible before because the old component always imported `React`
  explicitly. Fixed by adding `esbuild.jsx: "automatic"`.
- **`setState` inside a Three.js `useFrame` loop** in the hero scene's pulse
  animation — real anti-pattern, fixed to mutate the line material via a ref
  instead of triggering a React re-render every animation frame.
- **`HeroCanvas`'s `pageVisible` state didn't read the initial
  `document.visibilityState`** on mount, only reacted to the `visibilitychange`
  event — fixed to initialize correctly.
- **Stale `next start`/`next dev` processes from earlier in this session**
  caused a spurious "chunk load failed / 400 Bad Request" e2e failure by
  serving an old build's HTML against a new build's chunk manifest. Root
  cause was session hygiene (multiple background servers left running), not
  application code; confirmed via `lsof -ti:3000` and a clean restart.

## Known Caveats / Not Independently Verified

This session's browser automation tooling had environment-level constraints
that limited how much of §6/§8 I could empirically confirm rather than infer
from code review:

- **The R3F hero scene's live rendering (drift, pulse, parallax) could not
  be visually confirmed.** The automated browser tab in this session reports
  `document.hidden === true` persistently (confirmed via a raw
  `requestAnimationFrame` test: 0 ticks in 2s), which is a tab-backgrounding
  characteristic of the tooling, not the app — but it means I could not watch
  the canvas actually animate. Code review confirms standard R3F/drei
  patterns (camera, lighting, `<Line>`/`<Text>`, `useFrame`), and the static
  CSS-grid fallback (for `prefers-reduced-motion`/no-WebGL) was visually
  confirmed. **Recommend a manual check in a real foregrounded browser tab
  before shipping.**
- **True responsive breakpoints (320/768/1024/1440) could not be screenshotted.**
  Both available browser tools reported a fixed ~1710px viewport regardless
  of resize requests. I did a manual audit of every fixed-width/grid-template
  utility instead and fixed two real overflow risks defensively (`SheetControls`'s
  `grid-cols-[1fr_130px]` → `minmax(0,1fr)_130px` + `min-w-0`/`truncate`;
  `Header`'s nav lost a `whitespace-nowrap` that could force overflow at
  320px). **Recommend a manual resize check before shipping.**
- **Keyboard-only Tab-order walkthrough could not be driven live** — the
  `computer` tool's Tab key didn't produce focus events in this backgrounded
  tab (consistent with the rAF finding above). Relied on code review instead:
  all interactive elements are semantic (`<a>`, `<button>`, `<input>`,
  `<textarea>`, Radix `Select`/`Dialog` which are keyboard-accessible by
  construction), the dropzone root has `tabIndex={0}` (confirmed via DOM
  snapshot), and the global `:focus-visible` ring covers everything that
  doesn't define its own. **Recommend a manual keyboard walkthrough before
  shipping.**
- **No formal Lighthouse run** — the one available Lighthouse-capable tool
  (chrome-devtools plugin) hit unrelated 400s on static asset requests in
  this session's proxy, making its numbers unreliable. Bundle-size proxy:
  `next build` reports 395 kB first-load JS for `/`, which includes the
  lazily-loaded three.js/R3F chunk (confirmed genuinely code-split via
  `next/dynamic({ssr:false})` — `app/page-*.js` itself is only ~28 kB).
  **Recommend running Lighthouse against the Vercel preview once deployed.**
- **No Vercel preview deployed** — deploying is a "publish" action requiring
  explicit user confirmation per my operating rules; not done in this
  session.

## Tests Written / Updated

| Test File | Change |
|---|---|
| `lib/ledger.ts` | New pure function, exercised indirectly via `VerificationLedger` render assertions in `tests/FormulaWorkspace.test.tsx` |
| `tests/FormulaWorkspace.test.tsx` | Updated empty-state copy assertion; replaced the top-banner stub-model test with one asserting the disclosure now lives in the ledger metadata after a generate call |
| `e2e/workspace.spec.ts` | Unchanged — copy it asserts on (`Drop an .xlsx workbook`) was preserved verbatim |

## Next Steps

- [ ] Manual verification of the three caveats above in a real browser
- [ ] Code review via `/code-review`
- [ ] Run Lighthouse against a deployed preview
- [ ] Create PR via `/prp-pr` (or ask before deploying/pushing)
