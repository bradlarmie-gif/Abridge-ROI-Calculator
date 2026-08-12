# Audit gates — ROI Calculator

Repo-specific companion to the general `audit` skill. Run these on a deep pass.

## Gate commands (must be green before "done" / push)

```bash
npx tsc --noEmit        # types (npm run check also works)
npm test                # vitest run — the full suite (currently ~749 tests)
npm run build           # tsx script/build.ts
```

Value/pricing or PDF changes additionally:

```bash
npm run layout:smoke    # renders every PDF route in print media; fails on dropped
                        # pages, content bleeding past the 816x1056 box, sideways
                        # overflow, or NaN/undefined/Infinity text
npm run visual:sweep    # screenshot gallery — interactive states + every PDF page.
                        # REVIEW the gallery with lens-2 eyes; do not just run it.
```

`npm test` before pushing is non-negotiable: green tsc + build has hidden real bugs before (a live Attain PDF $0 bug slipped tsc/build; only the suite caught it).

## Reconciliation rule

Any dollar shown in more than one place must tie out: **Align → Strategy → PDF**, and **screen ⇄ engine**. The Attain and App-Rat and Proforma PDFs each have a reconciliation test — if you change value math, run it and confirm the PDF total equals the engine sum. A number that looks wrong is usually a *basis mismatch* (marginal vs cumulative, gross vs net, with vs without one-time fees), not a typo — trace the basis.

## Preview / print routes (for eyes-on verification)

- `?explorepreview=1` — editorial Explore flow (interactive)
- `?attainv2=1` — live Attain flow
- `?proformapreview=1` — editorial proforma workbench
- `?explorepdf=1` · `?attainpdf=1` · `?proformapdf=1` · `?appratpdf=1` · `?methodpdf=1` — the PDF print routes
- Drive with playwright-core + the system Chrome at
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, deviceScaleFactor 2.
  `open <path>` a screenshot to actually look at it.

## Known pitfalls

- **Background dev servers get reaped between turns.** Run vite + the browser probe in ONE self-contained bash command (`vite & ; sleep; curl until 200; node probe`).
- **Scratchpad clone can get clobbered on an env reset** (`.git` + files wiped). Work is safe on origin/main. Recover: re-clone fresh from GitHub, then symlink node_modules to `~/Desktop/The-ROI-Calculator 2/node_modules` (avoids a full install).
- **Do not `npm run build` while a dev server runs** in sibling projects (clobbers .next in LCM; for this repo, prefer stopping vite before build to be safe).
- Guard tests to keep green + extend: `attainAlignBeatBudget` (≤8 beats), `attainOutcomeCoverage` (every picked outcome has a Plan metric), the per-PDF reconciliation tests, `attain-engine` fuzz, the copy-guardrail lints (em-dash / legal).

## Workflow

Commit to `main` and push (the user's Replit pulls from `main`). Branch first only if on a shared default and told to. End commit messages with the Co-Authored-By line.
