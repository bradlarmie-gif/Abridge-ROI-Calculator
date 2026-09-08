# Audit gates — Self Service ROI Tool

Repo-specific companion to the general `audit` skill. Read this first on a deep pass.

## What this app is

No salesperson. The flow forks on **who is asking**, because that decides the
question, and headcount does not:

- **One provider** (often someone whose organisation makes them pay for Abridge
  out of their own pocket) gets ONE screen: their week, their coding, what they
  would do with the time back, and what they pay. Everything moves live. They
  are paying, so this walk does answer the money question, in their terms.
  `pages/forecast/SoloRoi.tsx`.
- **A practice** gets the five-step walk: care setting, goals, your numbers,
  what changes, your number, and a PDF they can forward.

Either way there is no Abridge rep and no impact-analysis data pull, and every
figure is one they typed.

That audience is the source of most of the defect classes below.

## Gate commands (all must be green before "done")

```bash
npx tsc --noEmit                # types
npx vitest run                  # 117 tests
npm run build                   # tsx script/build.ts
npx playwright test             # 28 e2e, desktop + iPhone 12
node scripts/layout-smoke.mjs   # needs the dev server on :5210
node scripts/visual-sweep.mjs   # then REVIEW the gallery, do not just run it
```

Dev server:

```bash
DATABASE_URL="postgresql://dev:dev@localhost:5432/dev" PORT=5210 npm run dev
```

`server/index.ts` carries an uncommitted local macOS listen patch (127.0.0.1, no
`reusePort`). Never commit it.

## Standing guards, and why each exists

Every one of these was written after a real defect got through. Each has a
negative control: **plant a violation, watch it fail, restore.** A guard you have
not seen fail is not a guard.

| Guard | Catches |
|---|---|
| `quickRoiCopyGuardrails` | em dashes, guarantee/causal absolutes, **rep vocabulary** (partner, impact analysis, data pull), **realization jargon**, **harm-prevention claims**, **vendor benchmark claims** ("what we typically see"), **inputs pre-anchored with an invented figure** |
| `soloModel` | dollars attributed to a provider who cannot receive them; the same hour spent twice; a return multiple on someone else's money |
| `settingDomainFit` | a noun hardcoded for one setting and reused on the other three |
| `roiCalculatorNoRawNumber` | raw `type="number"` inputs that cannot be cleared |
| `quickRoiPdfReconciliation` | PDF total drifting from the engine; raw float leaks in rendered HTML |
| `layout-smoke` | overflow, wrapped headers, clipped input values, PDF bleed/NaN, scroll not resetting between steps |
| e2e typing guards | characters dropped or focus lost while typing; the tab count disagreeing with the cards on screen; a solo practice offered team-scale levers |
| e2e one-provider guards | a field arriving pre-filled; money shown before the pay question; the pin scrolling away; a salaried reader shown a multiple or a figure "in your pocket" |

**`scanFiles` silently skips files it cannot read.** A guardrail pointed at a
deleted path passes while checking nothing, which is exactly how the previous
per-tool guardrails rotted. Every guard here asserts its files exist first.

**Not scanned on purpose:** `lib/exploreDrivers.ts`. It reads like copy but only
its driver ids and quadrant mapping are consumed; verified by dumping the
rendered text of every screen in every setting and finding zero matches.

## Defect classes this repo keeps producing

- **A figure nobody measured, sitting in an input.** `placeholder="6.3"` then
  `placeholder="5.2"` on "how long does a note take now" and "and with
  Abridge" put a 1.1-minute saving on screen as a finding, and it was the
  anchor for the largest number on the page. A placeholder may describe the
  shape of the answer ("e.g., 70"); it may never assert one. Guarded.
- **A caveat applied to half the money.** The one-provider screen said plainly
  that a coding lift only reaches a doctor paid on productivity, then put up
  dollars from "extra patients a week" with no such caveat and rolled both into
  one total and one multiple. Both have the same fate. When a disclosure
  applies to a mechanism, check every driver that shares that mechanism, not
  the one you were looking at.
- **The same figure three times.** The practice path's per-tab dollar summaries
  and the one-provider verdict panel both restated what the pinned total was
  already showing. Rule: **the pin carries what is accumulating, the panel at
  the bottom carries only the judgment on it.** A figure earns one home.
- **A zero posing as an answer.** "0 hrs a year still yours" next to a coral
  dash, on an untouched screen. Empty states say what is missing; they do not
  render arithmetic on nothing. See the no-fake-data rule.
- **A guard that never looked at the file.** `SoloRoi.tsx` was absent from the
  copy guardrail's `FILES` for its whole life, which is how a vendor benchmark
  claim reached the screen. When you add a screen, add it to the guard in the
  same commit.
- **The sweep cannot see what it does not visit.** `visual-sweep.mjs` never
  drove the one-provider walk, so a full rebuild of that screen could ship with
  no eyeball on the result. Three states are now captured, because how they are
  paid changes what the page says.

## Known traps in this repo

- **A global CSS rule outranks your class.** `index.css` carries a global
  `input[type="range"]` block (specificity 0,1,1) that beat `.roi-slider` (0,1,0),
  so the slider styling loaded and did nothing. Qualify as
  `input[type="range"].roi-slider`. Probe `getComputedStyle`, do not theorise
  from the JSX.
- **The shared `<Input>` ships `md:text-sm`.** That is a different tailwind
  variant than `text-[19px]`, so merge keeps both and the responsive one wins
  from `md` up: every typed figure rendered at 14px on desktop. Pin the same
  variant (`md:text-[19px]`).
- **Entrance transitions cause false positives.** A screenshot taken before the
  stagger settles shows a Continue button in a pale state that looks disabled.
  Wait ~2s, or assert with `isDisabled()`, before reporting it.
- **An input must never be unmounted by the state it drives.** The price field
  sat inside a `priced ? (...) : (...)` ternary, so the first digit flipped the
  branch, React tore down the subtree, and a price of "2" against $396K printed
  a 76,953x return. Same class: a deferred select-on-focus landing after the
  first keystroke ate the first character of every numeric field. Neither is
  visible in a screenshot. **Type into every field, one character at a time,
  before calling an input screen clean.**
- **Hiding a driver must also stop it counting.** The payer-model answer and the
  ED dependency both hide cards; each has an effect that switches the hidden
  driver off, or a card the practice cannot see keeps adding dollars.
- **`npm run build` while Playwright's static server is up** leaves it serving a
  stale `dist`, so a fix looks like a failure. Kill the listener on :5055 and
  rebuild before trusting an e2e result.

## Reconciliation rule

Any dollar shown twice must tie out: **screen ⇄ engine ⇄ PDF.** The PDF has a
reconciliation test; run it whenever value math changes. A number that looks
wrong is usually a **basis mismatch** (cautious vs full realization, per-visit vs
per-admission), not a typo. Trace the basis first.

The answer is a **range**: the low figure applies the calibrated realization
haircuts, the high figure applies none. Both the screen and the PDF must show
the same two numbers.

## Claims doctrine (this app ships to doctors; Legal reads it)

- Never assert Abridge **prevents** clinical harm. The care team acts; the
  documentation supports them. Any avoided-harm share keeps the team as subject
  and is labelled as the practice's own judgement.
- Never say a figure was **measured**. Nothing here was measured.
- Lift only, margin not charges, realization applied, result in a defensible
  band. Conservatism is a judgement, not a computation: check the output band at
  a tiny practice and a huge one.
- An account-specific scale input (panel size, staffed beds) starts **blank**.
  A formula-derived default is still fabricated data.

## Preview routes

- `/` — the app
- `?quickroipdf=1` — the PDF print route (`&print=1` opens Save as PDF)

Verify the PDF with a real Chrome render, not just the HTML: Chrome drops
background fills at print time unless `print-color-adjust: exact` is set, which
is why the composition bar once arrived as grey numbers in white space.
