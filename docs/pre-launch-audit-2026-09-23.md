# Pre-launch audit — 23 September 2026

Scope: the live surface only, audited to the **self-serve** bar, on the reasoning
that a seller can talk over a broken empty state and a health-system finance lead
alone with the tool cannot.

Everything in "Fixed" is committed, verified, and green. Everything in "Your call"
is a real finding I deliberately did not act on, with the reason. Everything in
"Not done" is a gap I am naming rather than leaving you to discover.

---

## The one-paragraph version

The math was never the problem, and it still isn't — it is genuinely strong and
survived every check. The problems were in the layers nothing was testing:
**interaction, the test harness itself, and copy**. The most serious single
finding is that most of the existing QA apparatus had been silently dead since the
IA changed: the entire e2e suite (28/28 red), two of layout-smoke's guards, and —
worst — the screenshot tool, which was photographing the wrong screens and
reporting it as a soft note, so those galleries were reviewed as if they were real.
Two customer-facing defects would have shipped: a volume under 1,000 silently not
reaching the model, and 22 of 528 driver combinations bleeding content off the
bottom of a PDF page.

---

## Fixed

Ranked by what would have hurt most in front of a customer.

### 1. A volume under 1,000 updated the box and nothing else
`client/src/pages/explore/editorial/EdPractice.tsx`, and the same shape in
`ExploreOpportunity.tsx`.

`handleTotalEncountersChange` only wrote to state when the typed total was ≥1000:

```js
setTotalEncountersInput(numValue);
if (numValue >= 1000) { updateState({ annualEncounters: numValue, ... }); }
```

Two ways that bites, both silent:

- A small program enters 800 discharges. The box reads 800, `annualEncounters`
  stays 0, and every revenue driver sits greyed out behind *"Enter annual
  discharges to see this driver"* — next to a box plainly showing a number.
- Worse: someone types 14,000, then corrects it down to 800. The box reads 800.
  **The model keeps computing on 14,000.** Nothing on screen disagrees.

The threshold existed to stop the Total/Per-provider toggle flipping mid-typing.
Transient intermediate values are harmless; discarding the final one is not.
Guarded by `volumeInputWritesState.test.ts`, negative-controlled.

*Found by the interaction sweep, not by reading code: three revenue screens
reported zero inputs because the drivers were gated on a volume the harness had
entered and the app had thrown away.*

### 2. 22 of 528 driver combinations bled content off a PDF page
`client/src/components/explore/ExploreEditorialPdf.tsx`. All nursing, all page 02,
the footer note spilling 4.7 to 37.8px past the bottom edge.

Three compounding causes, each a separate fix:

- **The page budgets were inverted.** `BUDGET_FIRST` was 880 and `BUDGET_CONT` 845,
  but the first page carries the eyebrow, headline and lead, so it has *less* room,
  not more. Measured: 807 vs 880.
- **The rebalance pass ignored the budgets entirely.** It spread atoms evenly for
  visual balance, and the last page absorbed the remainder plus the synthesis bar
  with no check at all.
- **The height estimates ran optimistic.** The synthesis bar was estimated at 52px
  against a real 72; muted domains 72 vs 75; every driver card ~5px light, which
  compounds across a page of them. An optimistic estimate silently overflows,
  because the packer fits atoms it believes are smaller than they are.

Now 528/528 green. The harness that found this had never run: it was orphaned from
any npm script and pinned to port 5173, which is not the port this repo uses.

### 3. Both screenshot tools were photographing the wrong screens
`scripts/visual-sweep.mjs`.

This is the finding I'd want you to take most seriously about the process, rather
than the product. `arEnter` clicked an "Open Financial" CTA that the hub redesign
removed, and `attainFunnel` clicked "Open Strategy"/"Open Planning" likewise. Both
went through helpers that swallow failures. So a gallery labelled
`apprat-consolidation` contained a picture of the hub, and both Attain working
screens were never captured at all — and the tool reported this as a *soft note*
while the summary line said the sweep was clean.

The gallery is what a human reviews for aesthetic defects. Sending that review to
the wrong screen while reading as coverage is worse than having no gallery.

Navigation now goes through a `mustClick` that throws with the failing selector
and step; any drive error is a hard failure; a failed capture is kept and labelled
`⚠ WRONG SCREEN`. Confirmed working — the Attain flow is now genuinely captured for
the first time.

### 4. The e2e suite was 28/28 red and had been for weeks
All five specs navigated via `card-explore` / `card-forecast` / `card-switch`,
testids that exist only on the retired `JourneySelector`.

Rewritten against the live IA — and retargeted rather than merely repointed, since
three of the five aimed at surfaces that are no longer part of the product:

| was | now |
|---|---|
| `forecast-paths` (Compare Pricing, retired) | `financial-tools` — the three live non-Explore tools |
| `measure-path` (via JourneySelector) | kept, entering via the `?data_receipt=` deep link, which is Measure's one live entry |
| `switch-paths` | deleted; `switch` has one navigateTo, on JourneySelector, and no deep link |
| `responsive` (duplicated Explore) | refocused on breadth: every hub and tool at four widths |
| `explore-paths` (retired inner testids too) | rewritten for the editorial flow, 4 settings × 2 viewports |

**66 tests passing.** New: `hub.spec.ts` (the first screen every user sees had no
coverage of any kind), `accessibility.spec.ts`, `resilience.spec.ts`.

### 5. A failed PDF export handed the customer a fictional health system
Five of six export sites wrote their localStorage snapshot inside
`try { … } catch { /* ignore */ }` and opened the print tab regardless. Each print
route falls back to SAMPLE data when the key is absent. So a write failure —
Safari private mode, ITP eviction, a quota error — produced a beautifully rendered
PDF of a fictional health system with fabricated numbers, handed to a customer by
a seller who saw no error.

Now goes through `stashAndOpenPdf`, which writes, **reads the value back** (a write
that throws is not the only way to lose data), and throws instead of opening.

### 6. Four clicks from the hub into the entire retired IA
`hub → The Numbers → Explore → "Data request" → Back` landed in the legacy
`JourneySelector`, and from there Measure, Switch, legacy Attain and the Forecast
mode selector — none of which is on the launch surface.

It stayed invisible because one of the two call sites used single quotes:
`navigateTo('journey')`. Every grep for the double-quoted form missed it,
including the one behind the comment asserting it was unreachable. The guard is
quote-agnostic on purpose.

### 7. 226 copy-guardrail violations across the live surface
The rules were already good. Their **scope** was the defect: seven test files each
hardcoded a few directories, so a surface got linted only if somebody remembered to
add it to a glob. Nobody did for the hub or the four Case story pages.

- **218 em dashes** across 40 live files, rewritten individually rather than
  sed'd — an em dash is a comma, a colon, a full stop or a parenthetical depending
  on the sentence, and the wrong choice reads worse than the dash did.
- **2 genuine over-claims**, which is the finding that justifies the rule existing:
  *"the share of your medical-necessity denials cleaner documentation actually
  prevents"* asserts prevention in the present tense in Abridge's voice. Now *"the
  share you expect cleaner documentation to prevent."*
- 2 imperative "Ensure" phrasings.

`liveCopyGuardrails.test.ts` now takes its file list from the import graph, so a
screen is linted the day it becomes reachable.

Three scanner corrections, each because the rule was catching the wrong thing:
negated guarantees are disclaimers, not claims; a lone grey "—" standing in for an
unentered value is a UI glyph, not prose; and *"the overtime that charting causes"*
points at the problem, which is the debunk the copy doctrine wants us to be
specific about, not an over-claim.

### 8. Findings from the fresh-eye review that were unambiguous
Three adversarial reviewers who did not build the work went over the gallery. Of
what they found, these were clear-cut enough to just fix:

- **Coming-soon rows rendered a full chevron affordance** in the same position as
  live rows, just paler. A self-serve user clicks and gets nothing. Chevron removed;
  the greyed title plus the pill is the signal.
- **The Plan PDF printed `— → target` 21 times** across three pages of a document
  headed THE COMMITMENT. The empty state printed the literal word "target", which
  reads as unfinished software where a blank would read as "to be set".
- **The Plan PDF's owner cards printed their own title twice**, 20px apart, as the
  first thing on three consecutive pages (the eyebrow and the title both resolve to
  "Abridge + your champion" for an Abridge-owned outcome).
- **Two PDFs stacked two footers**, putting the ABRIDGE wordmark twice inside a 20px
  band — the closing page rendered its own footer inside a `<Page>` that already
  emits the running one.
- **The Ambient Documentation story announced itself as "The Value Methodology."**
  Care Signals, CDS and Pre-Bill each pass their own product name to the shared
  header; Ambient took the default, so the flagship row on The Case opened a page
  whose rail named a different thing than the row you clicked. Its hub-row
  description also didn't follow the "How…" pattern the other four use.

---

## Your call — real findings I did not act on

These are all judgement calls where I'd be guessing at your intent, or where the
fix is a design decision rather than a correction.

### A. Measure is reachable in production, but not from the hub
It has exactly one live entry: a partner opens a `?data_receipt=` link and clicks
"Load in calculator". So it is on the launch surface whether or not that was the
plan. I kept its e2e coverage and pointed it at that entry. **Decide whether that
is intended.** If it isn't, the fix is one line; if it is, Measure deserves the
same audit pass the rest of the app just got.

### B. `clearSession()` has no caller
Attain plans persist in localStorage under partner names, with no idle timeout.
For an enterprise deploying this to health systems, that's a privacy question, not
a bug — someone should decide the retention policy rather than have me pick one.

### C. The reviewers' aesthetic findings

**Update: items 1, 3, 4 and 7 below were fixed in a follow-up pass** (commits
`7a652b6f`, `db414b3f`). What follows keeps the original numbering; the ones
still open are 2, 5 and 6.
Three reviewers produced roughly 80 findings between them. I fixed the unambiguous
ones (above). The rest are genuinely yours, and several are substantial. The
highest-value clusters:

1. ~~**A 52px coral `$0 / yr` is the loudest thing on every Explore value screen**~~ **DONE.**
   before any driver is switched on — 1.8× the size of the page headline. This
   matches your own documented rule ("never lead with a giant coral Design") almost
   exactly, so I'd guess you want it muted-grey-until-real, but it's a visual call
   on four live screens and I didn't want to make it unilaterally.
2. **"Continue" moves up to 260px vertically between care settings** on the same
   step. PARTLY DONE: a floor on the grid brings three of the four settings
   within 18px. ED still sits ~130px lower because it genuinely carries more
   drivers. Closing it properly means a sticky action bar, which changes the
   feel of the flow — your call.
3. **Coral is doing decorative work almost everywhere**, against the money-and-
   active-states-only rule. One reviewer counted eight non-money coral uses on a
   single Case page. Worth one pass with a single rule enforced.
4. ~~**Three affordances that lie**~~ **DONE** — and the App Rat one turned out
   to be worse than reported: the drawer behind it shipped grey skeleton
   placeholder bars as content. Details:: "expand any driver to see the math" over rows
   with no expand handle; "click any tool to compare it" on a diagram with no
   tools; "Turn on the drivers that apply" on a screen with zero toggles.
5. **The proforma cash-flow chart scales positives and negatives against different
   extremes**, so the trough is always pinned to the floor regardless of value. A
   reviewer measured it as implying a ~$1.1M funding hole where the facing table
   says ~$180K. I traced it to `yFor()` in `ProformaEditorialPdf.tsx` and it
   reproduces, but fixing a chart's scale is a design change and the surrounding
   numbers are all correct, so it's yours.
6. **Explore PDF p4/p5 are 32% and 19% ink**, with the document's grand total
   stranded alone above 546px of nothing. Merging them is a layout call.
7. ~~**Legal**~~ **DONE, and widened.** Worked from a systematic scan rather
   than the sample, which found more: all EIGHT Plan chain titles (not three),
   22 causal claims across the PDFs and screens, and four "Abridge reduces"
   equation labels. Two new guardrail rules now hold the line — `causal-claim`,
   which keys off sentence SHAPE rather than a verb list, and an em-dash rule
   that catches the `\u2014` escape form (20 of those were hiding in two files).
   Original finding: three Plan PDF page titles assert outcomes as fact — "How Safety
   Events Fall", "How Retention Holds", "How Overtime Comes Down" — along with a
   cluster of causal verbs ("lifts", "raise", "reopens", "reduces", "protects").
   These are exactly the pattern the guardrails exist to prevent, but they sit in
   *headings and data labels* rather than prose, so the lint doesn't reach them and
   rewriting them changes the documents' voice. **I'd treat this as the highest-
   priority item on this list.**

The three full reviews are long and specific (file, region, measured pixel values,
suggested fix). Ask and I'll paste any of them in full.

### D. An axe accessibility pass
I wrote a dependency-free baseline instead, targeting the specific risk: the hub's
rows are not `<button>`s but hand-rolled `role="button"` + `tabIndex` + `onKeyDown`,
so Tab reachability, Enter *and* Space, the focus ring and the accessible name are
all things somebody had to remember. **All 13 tests pass** — it was built correctly,
and coming-soon rows are properly out of the tab order.

For breadth you want axe, which needs a new devDependency. That seemed worth asking
about rather than adding mid-audit.

---

## Not done — named gaps

- **`scripts/capture-screenshots.ts` is still stale.** It navigates by the retired
  testids like everything else did. It is an orphaned dev utility wired to no npm
  script, so it fails loudly when run rather than lying, which is why it's last.
- **`client/src/pages/attain/pdf/AttainPdfDoc.tsx` is parked as `.tsx.bak`.** It was
  untracked, imported by nothing, and imported a function that doesn't exist, so it
  broke `tsc` for the whole repo. I renamed rather than deleted it — it's yours to
  decide on. A copy is also in the session scratchpad.
- **Attain and Measure got shallower coverage than the Financial tools.** Attain now
  has a real screenshot and Measure has an e2e walk, but neither got the
  input-by-input treatment Explore did.
- **No visual regression baseline.** The gallery is generated fresh each run and
  compared by a human. Diffing against committed baselines would catch drift
  automatically, but it needs a baseline commit and a review of every intentional
  change, which is a bigger commitment than a night.

---

## What's green

```
tsc                 clean
vitest              892 tests, 84 files
playwright          66 tests
layout:smoke        all PDF routes, hub routes, scroll-reset guard
fuzz:pdf            528/528 combos, no bleed
sweep:interaction   154 numeric inputs, every keystroke, focus never dropped
sweep:geometry      no clipped inputs, header centring holds (0.0px drift
                    across two states), every step opens at the top
visual:sweep        43 screenshots, auto-checks clean
build               clean
```

Every new guard was negative-controlled: the bug was reintroduced, the guard was
confirmed to fail, and the code was restored. A guard that has never failed is not
known to work.

## One thing that is still true and worth repeating

None of this is live. It is all on `main`; your Replit still needs a pull and a
redeploy.
