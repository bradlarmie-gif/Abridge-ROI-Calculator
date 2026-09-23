# Audit gates — ROI Calculator

Repo-specific companion to the general `audit` skill. Run these on a deep pass.

## Gate commands (must be green before "done" / push)

```bash
npx tsc --noEmit        # types (npm run check also works)
npm test                # vitest run - the full suite (currently 892 tests, 84 files)
npm run build           # tsx script/build.ts
```

Value/pricing or PDF changes additionally:

```bash
npm run layout:smoke    # renders every PDF route in print media; fails on dropped
                        # pages, content bleeding past the 816x1056 box, sideways
                        # overflow, NaN/undefined/Infinity text, and SPARSE body
                        # pages (>330px of dead space above the footer)
npm run visual:sweep    # screenshot gallery - interactive states + every PDF page.
                        # REVIEW the gallery with lens-2 eyes; do not just run it.
npm run fuzz:pdf        # 528-combo no-bleed fuzz on the Explore PDF
```

### Added by the pre-launch audit (2026-09-23)

```bash
npm run test:e2e          # 66 Playwright tests: hub, Explore x4 settings, the three
                          # other Financial tools, Measure via its deep link,
                          # responsiveness at 4 widths, accessibility, resilience
npm run sweep:interaction # types into all 154 live numeric inputs, one keystroke at
                          # a time, asserting focus never leaves the field
npm run sweep:geometry    # clipped inputs, centring measured in two states,
                          # scroll-reset on every step, global CSS blast radius
```

All of these need a dev server on :5199 (`npx vite --port 5199 --strictPort`),
except `test:e2e`, which builds and serves itself on :5055.

**Why the interaction sweep exists.** A bug that silently corrupted every numeric
input in the app (type `2400`, keep `400`) survived 881 green tests, a clean
typecheck and a passing build, because nothing in the repo ever typed into an
input. Math coverage does not catch interaction defects. Neither does a
screenshot.

**Why the geometry sweep exists.** Eyes lie about alignment, and a screenshot
cannot show a defect that only appears when the content on one side of a row
changes width. Anything that must read as centred is measured in two states whose
side content differs; a single measurement proves nothing.

## Scope: what counts as live

`client/src/__tests__/support/liveSurface.ts` computes the launch surface from the
real import graph rather than a hardcoded directory list. That list is how the hub
and all four Case story pages shipped with no copy linting: nobody remembered to
add them to a glob.

It is view-aware, not just import-aware. App.tsx imports every retired screen at
the top, so a naive walk claims ~250 reachable `.tsx`; excluding nine dead ROOTS
(never their subtrees, so shared components stay covered) gives 199. If you retire
a screen, add its root there. If you add one, it is covered automatically.

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
- Guard tests to keep green + extend: `attainAlignBeatBudget` (≤8 beats), `attainOutcomeCoverage` (every picked outcome has a Plan metric), the per-PDF reconciliation tests, `attain-engine` fuzz, the copy-guardrail lints (em-dash / legal), `liveCopyGuardrails` (those lints across the WHOLE live surface), `volumeInputWritesState`, `hubJourneyUnreachable`, `pdfHandoffSafety`.
- **A harness that swallows is worse than no harness.** Both of the repo's screenshot tools were silently photographing the wrong screen after the IA changed: `visual-sweep`'s navigation helpers caught their own failures and downgraded them to soft notes, so a gallery labelled `apprat-consolidation` showed the hub and got reviewed as if it were the real screen. Navigation now goes through a `mustClick` that throws, and any drive error is a hard failure. When you add a scene, use `mustClick` for the clicks that decide WHICH screen gets photographed, and `clickIf`/`clickText` only for optional flourishes.
- **PDF pagination has two opposing failure modes.** Packing a page past 1056px bleeds the footer off the bottom; spreading content too thin leaves a half-empty page. `layout:smoke` checks the second, `fuzz:pdf` checks the first, and you need BOTH green — fixing one alone will break the other. The page budgets in `ExploreEditorialPdf.tsx` are measured, not guessed, and the first page is SMALLER than a continuation page because it carries the headline and lead.

## Workflow

Commit to `main` and push (the user's Replit pulls from `main`). Branch first only if on a shared default and told to. End commit messages with the Co-Authored-By line.
