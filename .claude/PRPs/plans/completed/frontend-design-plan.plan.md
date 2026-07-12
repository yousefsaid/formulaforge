# FormulaForge — Frontend Design Direction & Implementation Plan

**Audience:** the implementing model/engineer. This document is the single source of
truth for the redesign. Follow it closely; where it says "never", treat it as a hard
constraint.

**Goal:** a portfolio-grade frontend for FormulaForge — a local-first Excel formula
copilot where a small fine-tuned model proposes formulas and a deterministic
validator verifies every one. The site must read as a precision instrument built by
someone with taste, not a template or an AI-generated landing page.

---

## 1. Design direction

### Concept: "The Verified Instrument"

FormulaForge's entire story is *trust through verification* — the model proposes,
the evaluator proves. The UI should feel like a beautifully machined lab instrument:
calm, precise, quietly confident. Apple-esque in restraint (generous whitespace,
one accent color, physics-based micro-motion, obsessive typography) but with a
technical, engineering-forward character appropriate to an LLM/ML project: visible
monospace formulas, real metrics, an honest pipeline readout.

- **Purpose:** let a visitor upload a workbook, get a verified formula, and
  *understand the verification story* within 30 seconds.
- **Audience:** recruiters, engineers, and ML people skimming a portfolio. They need
  to see (a) a working product immediately and (b) evidence of engineering judgment.
- **Tone:** refined-technical. Precision over decoration. Editorial in copy, mono in
  data.
- **The memorable detail (this is the centerpiece):** the **verification ledger** —
  when a formula is generated, the response is not a chat bubble but a staged
  readout: `PROPOSED → PARSED → REFERENCES CHECKED → EXECUTED → VERIFIED` (or
  `ABSTAINED`/`REJECTED`), each stage ticking in with a subtle stagger, ending with
  the formula rendered large in monospace with its computed preview value. No other
  LLM site shows its work like this; it is the product's soul made visible.

### Explicit exclusions (hard constraints)

- **No generic top bar.** No full-width nav with logo-left/links-center/CTA-right.
  No "● Live" / "● Local only" status pill in the top right (the current one must be
  removed).
- No purple/indigo gradients, no glassmorphism cards floating over gradient blobs,
  no sparkle/✨ icons, no "Supercharge your workflow" copy, no marquee of fake logos,
  no bento-grid-of-features for its own sake, no cards inside cards.
- No dark-mode-by-default "AI product" look. Primary theme is **light**.
- No chat interface. This is a tool with one deliberate action, not a chatbot.

---

## 2. Visual system

### Color

Near-neutral porcelain base, ink text, a single restrained accent, and two semantic
verification colors. Define all as CSS custom properties in `globals.css` and map
into Tailwind via the config.

```css
:root {
  --surface-0: #fafaf8;   /* page — warm porcelain, not pure white */
  --surface-1: #ffffff;   /* raised panels */
  --surface-2: #f1f1ee;   /* inset wells (grid preview, code) */
  --ink: #1a1c1e;         /* primary text — near-black, slightly cool */
  --ink-2: #5c6167;       /* secondary text */
  --ink-3: #9a9fa5;       /* tertiary / placeholders */
  --line: #e4e4e0;        /* hairline borders */
  --accent: #2a5cff;      /* one blue. buttons, focus, links. use sparingly */
  --verified: #1a7f4e;    /* green — only for VERIFIED state */
  --abstain: #b4690e;     /* amber — abstained/invalid, never red-alarm */
  --danger: #b3362b;      /* actual errors only (rejected workbook) */
}
```

Rules: the accent appears in at most ~3 places per viewport. Verification green is
*earned* — it only ever appears when the evaluator passes a formula. Depth comes
from hairline borders + very soft shadows (`0 1px 2px rgb(0 0 0 / .04), 0 8px 24px
rgb(0 0 0 / .06)`), never heavy drop shadows.

Optional dark theme (`prefers-color-scheme`) is a stretch goal; if built, it must be
deliberate (deep warm gray `#161615`, not `#000`), not an inversion.

### Typography

Two families, both self-hosted via `next/font` (zero layout shift, no external
requests):

- **UI + display: `Geist Sans`** (Vercel, open source) — the closest open equivalent
  to SF Pro; gives the Apple-esque feel without imitating Apple.
- **Formulas, cell addresses, metrics: `Geist Mono`** — every formula, cell
  reference (`D2`), latency number, and model id renders in mono. This is the
  domain's native script and the strongest anti-generic signal.

Scale (use Tailwind arbitrary values or tokens):

- Display: `clamp(2.6rem, 1.8rem + 3.5vw, 4.5rem)`, weight 550–600, tracking
  `-0.03em`, line-height 1.02 — used once, in the hero.
- Body: 16–17px, line-height 1.6, `--ink-2` for supporting copy.
- Labels/eyebrows: 11–12px, weight 500, tracking `0.08em`, uppercase, `--ink-3`.
  (Keep the eyebrow idiom from the current design — it works — but quieter.)
- Formula display: mono, `clamp(1.25rem, 2.5vw, 1.75rem)`, weight 500.

### Space & layout

- Content max-width `1120px`, single column flow, section spacing
  `clamp(4rem, 8vw, 8rem)`.
- 8px base grid. Panels use 24–32px internal padding.
- Border radius: 10–14px on panels, 8px on inputs, full on the few pills. One radius
  language everywhere — no mixing 4px and 24px.

---

## 3. Page architecture (single page, `app/page.tsx`)

The workspace is the product and must be reachable within one scroll. Structure top
to bottom:

### 3.1 Header (not a bar)

A minimal floating header: just the wordmark ("FormulaForge" in Geist Sans 15px
weight 550, preceded by a small `ƒx` glyph in mono) top-left, and two quiet text
links top-right: `GitHub ↗` and `Design notes` (links to
`docs/DESIGN_DECISIONS.md` on GitHub). No background, no border, no pill, no CTA
button. It overlays the hero and fades its backdrop in (`backdrop-blur` + hairline
bottom border) only after scrolling past the hero.

### 3.2 Hero — product-first

Left-aligned (not centered) text block over a full-bleed R3F canvas (§4):

- Eyebrow: `LOCAL-FIRST · VERIFIED · 0.6B PARAMETERS`  (mono, tracked out)
- H1: **"Every formula, proven before you see it."** (or similar — the headline
  must state the verification mechanism, not a vibe)
- One supporting sentence: "A fine-tuned 0.6B model proposes Excel formulas; a
  deterministic evaluator executes and verifies each one on your machine.
  Spreadsheets never leave it."
- Primary action: a single button `Try it below ↓` that smooth-scrolls to the
  workspace, plus a text link `Watch the 40s demo` opening the existing
  `docs/media/demo.mp4` in a dialog.
- Below the fold-line of the hero, a single row of three **real** stats in mono
  (pulled from the eval report, clearly labeled): `747ms median latency · 12
  supported functions · 100% execution-checked`. No invented numbers. Animate them
  in with NumberFlow (§5).

### 3.3 The workspace (the centerpiece, immediately after hero)

Evolve the existing two-panel `FormulaWorkspace` rather than replacing its logic.
Same API calls, same state machine, new presentation:

- One raised `--surface-1` panel, hairline border, soft shadow, containing:
  - **Left column — controls:** drop-zone (drag-and-drop + click, via
    `react-dropzone`), then sheet select + target cell input, Generate/Repair
    segmented control (animated thumb via Motion `layoutId`), instruction textarea,
    and the submit button. Inputs styled per §2; labels 12px `--ink-2`.
  - **Right column — the sheet:** the grid preview styled like a credible
    spreadsheet: sticky mono column/row headers, `--surface-2` header cells,
    hairline gridlines, tabular-nums, the **target cell outlined in `--accent` with
    a subtle pulse** once set. Empty state: a faint grid pattern with the sentence
    "Your sheet appears here — nothing is uploaded to a server."
- **The verification ledger (below the panel, on submit):** while loading, the
  stages render as a vertical list in mono, each flipping from `○ pending` to
  `● pass` (or `▲ abstained` / `✕ rejected`) with a 120ms stagger driven by the
  actual response. Then the formula itself animates in (Motion `TextEffect`
  per-character or a simple blur-up) at display size, with preview value, model id,
  adapter version, and latency in a mono metadata row. The confirm-and-download
  button appears only in the `valid` state.
- The stub-model notice (hosted demo) becomes a quiet single line *inside* the
  ledger metadata — e.g. `model: stub (hosted demo) — real inference runs locally
  on Apple Silicon` — not a yellow banner.
- Errors render inline under the control that caused them, `--danger` text, no
  toast spam. (Sonner may be used for the download-success confirmation only.)

### 3.4 "How it proves it" — one editorial section

Three steps in a single horizontal row (stacking on mobile), numbered `01 / 02 /
03` in mono: **Propose** (the 0.6B model drafts one formula) → **Verify** (parser,
reference checker, and evaluator execute it against your sheet) → **Abstain**
(when it can't prove it, it says so). Each step is 2–3 lines of text with a small
inline mono detail (e.g. the actual rejection reasons list). No icons from icon
packs; use typographic marks (`ƒ`, `✓`, `∅`). Scroll-triggered fade+rise reveal,
once, 24px, no parallax.

### 3.5 Engineering evidence strip

A quiet section for the portfolio audience: links rendered as an index (mono,
underlined on hover) to the eval report, model card, data card, architecture doc,
and the GitHub repo — plus one honest sentence about the eval status (the README's
"pipeline smoke test, not a benchmark claim" framing). This honesty *is* the
portfolio flex; keep it.

### 3.6 Footer

One hairline rule, then: `FormulaForge — built by Yousef Said · GitHub ·
Qwen3-0.6B · MLX · Next.js`. Nothing else.

---

## 4. React Three Fiber hero scene

One 3D element, used with restraint — atmosphere, not spectacle.

**Scene:** a sparse, softly-lit 3D grid of thin lines receding in perspective — an
abstract spreadsheet plane — with ~40 small floating glyphs (`Σ ƒ = ( ) :`) as
instanced text drifting slowly. On pointer move, the camera eases 2–3° (spring,
`maath/easing.damp3`). A slow "verification pulse": every ~6s a soft accent-colored
highlight sweeps across one grid line. Colors strictly from the palette (`--line`
grid, `--ink-3` glyphs, one `--accent` pulse). It must look like graph paper coming
alive, not a synthwave tunnel.

**Implementation constraints:**

- `@react-three/fiber` + `@react-three/drei` (`Text`/`Instances`; two soft
  directional lights, no `Environment` needed). No postprocessing package; no
  bloom. Keep the whole scene < ~200 draw calls, target 60fps on an M-series
  MacBook and degrade gracefully.
- Load via `next/dynamic` with `ssr: false`; render a static CSS grid-pattern
  fallback (also used for `prefers-reduced-motion` and WebGL-unavailable). The
  canvas sits behind hero text with a porcelain gradient scrim for contrast.
- Pause the render loop when the canvas scrolls out of view (`useInView`) and on
  `document.visibilitychange`.
- Budget: this is the only place three.js appears. If it can't be made elegant,
  ship the static fallback — a bad 3D scene is worse than none.

---

## 5. Component & library shopping list

Keep the footprint small; every dependency must earn its place.

| Library | Repo | Use |
|---|---|---|
| shadcn/ui (select components only) | `shadcn-ui/ui` | Select, Dialog (demo video), Tooltip, segmented-control base. Copy-in, restyle with our tokens — never ship the default shadcn gray look. |
| Motion (Framer Motion successor) | `motiondivision/motion` | All animation: ledger stagger, segmented control `layoutId`, scroll reveals, hero text entrance. |
| Motion-Primitives (cherry-pick) | `ibelick/motion-primitives` | `TextEffect` for the formula reveal. Copy-paste the 1–2 components needed, don't adopt wholesale. |
| NumberFlow | `barvian/number-flow` | Hero stats and latency counter — the nicest number transitions available. |
| react-dropzone | `react-dropzone/react-dropzone` | Drag-and-drop workbook upload. |
| Sonner | `emilkowalski/sonner` | Single toast: "Workbook downloaded". Restyle to tokens. |
| @react-three/fiber + drei | `pmndrs/react-three-fiber`, `pmndrs/drei` | Hero scene only (§4). |
| geist | `vercel/geist-font` | Geist Sans + Geist Mono via `next/font`. |

Do **not** add: Aceternity UI, Magic UI, GSAP, Lenis/smooth-scroll, particle
libraries, chat-UI kits, lottie. (Aceternity/Magic UI are the definition of the
look we're avoiding.)

---

## 6. Motion language

- Durations 150–450ms; springs (`type: "spring", bounce: 0.15`) for interactive
  elements, ease-out curves for reveals. Nothing loops except the hero pulse.
- Motion always communicates state: ledger stages = pipeline progress; segmented
  thumb = mode; grid cell pulse = target acquired. Zero decorative confetti.
- Every animation respects `prefers-reduced-motion` (Motion's `useReducedMotion`),
  collapsing to instant opacity changes.
- Hover states: buttons darken + lift 1px; links get an underline that draws in;
  table rows get `--surface-2`. Focus-visible: 2px `--accent` ring, offset 2px, on
  every interactive element.

---

## 7. Implementation plan (phased)

Preserve throughout: all existing behavior in `lib/api.ts` and `lib/grid.ts`, the
`data-testid="workbook-input"` hook and the user-visible strings that
`tests/FormulaWorkspace.test.tsx` and `e2e/workspace.spec.ts` assert on — update
tests deliberately when copy changes, don't break them silently.

1. **Foundation** — install fonts (`next/font` + geist), rewrite `globals.css`
   as the token system in §2, extend `tailwind.config.ts` to map tokens, set up
   shadcn/ui and Motion. Delete the old inline-minified CSS. Verify `npm run
   typecheck` + `npm test` still pass.
2. **Decompose** — split `FormulaWorkspace.tsx` (200–400 lines/file per repo
   rules) into `components/workspace/{UploadZone,SheetControls,ModeSwitch,
   InstructionField,GridPreview,VerificationLedger}.tsx` + a `useFormulaWorkspace`
   hook holding the existing state logic verbatim.
3. **Workspace restyle** — build §3.3 including the verification ledger. This is
   the highest-value phase; get it fully polished before touching the hero.
4. **Hero + header + sections** — §3.1, 3.2, 3.4–3.6 with the static hero
   fallback first, then the R3F scene behind a dynamic import.
5. **Polish pass** — motion timing, focus states, responsive audit at
   320/768/1024/1440 (the grid preview scrolls inside its panel — the page must
   never scroll horizontally), copy edit.
6. **Verification** — update unit/e2e tests, run Lighthouse (targets: LCP < 2.5s,
   CLS < 0.1, JS < 300KB gzipped *excluding* the lazily-loaded three chunk),
   keyboard-only walkthrough, VoiceOver spot-check, deploy a Vercel preview, and
   compare against §8.

## 8. Review checklist (definition of done)

- [ ] First viewport communicates *verified formula generation* — a visitor could
      describe the product without scrolling.
- [ ] No generic top bar; no status pill; none of the §1 banned patterns anywhere.
- [ ] The verification ledger animates real pipeline stages and is the screenshot
      you'd put in a portfolio.
- [ ] Accent color appears ≤3 times per viewport; verified-green only on success.
- [ ] All formulas/addresses/metrics render in Geist Mono with tabular numbers.
- [ ] `prefers-reduced-motion` collapses all motion; R3F falls back to static grid.
- [ ] Keyboard path: upload → configure → generate → download works with visible
      focus throughout; grid preview keeps proper `<table>` semantics.
- [ ] Mobile (320px): panel stacks, ledger readable, no horizontal scroll.
- [ ] Existing test suites green; e2e covers the happy path against the new DOM.
- [ ] Honest copy: stub-model disclosure present; no invented metrics.
