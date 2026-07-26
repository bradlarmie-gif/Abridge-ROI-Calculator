# Explore Value Drivers — The Shared Mental Model (Abridge)

**Purpose:** one mental model, for everyone at Abridge, of how Explore turns documentation into value:
what the drivers are, how the math is conducted, and why it's defensible. Scalable across all 4 care
settings. Calibrated to LEAD the category without overstating, and not so conservative that our
(deliberately high) pricing looks unfavorable.

---

## 1. The frame (same on every screen)
Explore models value in **4 domains**, in order: **Capacity → Workforce → Revenue → Quality.**
Each domain screen is **two tiers**:
- **THE VALUE (counts when it's on):** money drivers. Each is a toggle (nothing defaults on), leads with
  a **count** then the dollar, exposes its inputs as **editable cells**, and shows a plain-English **build line**.
- **The demoted tier (not counted · examples only):** leading **signals** (marked "ex.") → the outcomes they
  point to. MECE to the domain. Always carries a **no-double-count note.**

Two domains are deliberately **proof screens ($0 counted, on purpose)** where the money lives elsewhere:
Inpatient Capacity, Nursing Revenue, and all Outpatient/ED/Inpatient **Quality** (a timing "proof chain").
This is a credibility move: we refuse to count what would be double-counted.

## 2. The math spine (why Finance can believe it)
Two invariants make the whole model conservative-by-construction:
1. **Everything scales to Abridge-enabled volume:** `eligibleEncounters = annualEncounters × adoption%`.
   We never claim value on volume Abridge doesn't touch.
2. **Every money driver carries an explicit realization / attribution factor** (a haircut for "does it
   survive audit / would it have happened anyway"). These are visible, editable cells — not hidden fudge.

The realization spine (audit-survival ordering, conservative on the least-knowable):
wRVU realization · HCC realization · denials realization (net-of-appeals) · DRG realization ("holds on review")
· Obs realization · LWBS realization · retention impact scenario. Signals in Quality carry **$0** (no double count).

## 3. The drivers + exact math, by setting × domain
(Canonical source: `client/src/lib/exploreDriverCalcs.ts` `computeAllDriverValues`; nursing quality via
`nursingQualityCalcs.ts`. The live editorial screens DISPLAY these engine values — they do not re-derive them.)

### OUTPATIENT
- **Capacity — Patient Access ($):** `visits/wk × providers-with-room × 48 × margin/visit`, where
  `visits/wk = (freed hrs/provider/wk × reinvest%) ÷ visit-length`. Reinvest defaults 25%. Editable: providers-with-room, reinvest%, visit length, $/visit.
- **Workforce — Provider Retention ($):** `providers × turnover% × burnout-related% × retention-impact% × replacement cost`. Burnout-scoped (only the documentation-driven slice). + **Locum & Agency ($)** = retained × weeks/vacancy × weekly premium.
- **Revenue — payment fork (FFS / Risk / Both):** wRVU capture ($) = `enabled encounters × (baseline wRVU × increase%) × conversion factor × realization`. HCC capture ($) = per-plan `Σ members × recapture-lift × avg HCC × $/HCC (+ net-new) × realization`. Denials ($, cross-cutting) = `claims × med-necessity rate × scenario × avg claim × net-of-appeals`.
- **Quality — proof chain ($0):** CDI queries → care gaps → HEDIS → MA STARS. Accuracy-not-achievement.

### ED
- **Capacity ($):** LWBS Recovery = `visits × LWBS% × reduction% × downstream margin × realization`; Admission Capture = `recovered × admit% × margin × realization`.
- **Workforce ($):** Provider Retention (same burnout-scoped chain, ED replacement cost) + Locum + Scribe.
- **Revenue ($):** E&M Level Accuracy (wRVU chain, ED conversion) + Denials (net-of-appeals). No fork.
- **Quality — proof chain ($0):** core-measure doc → note completeness → SEP-1 → HCAHPS.

### INPATIENT
- **Capacity — proof ($0):** doc lag → discharge planning → discharge-summary timeliness → LOS. (No money; throughput shows up elsewhere.)
- **Workforce ($):** Provider Retention (hospitalist turnover/replacement) + Locum.
- **Revenue ($):** Case Mix Index / DRG = `at-risk discharges × scenario% × weight increase × base payment × realization ("holds on review")`; Observation/IP Status Defense = `downgrades × revenue delta × preventable% × realization`. No denials driver.
- **Quality — proof ($0):** CDI query rate → HCAHPS doctor → 30-day readmission (kept strictly conditional).

### NURSING (RN language throughout, never "provider")
- **Capacity ($):** Overtime = `OT hrs/RN/wk × reduction% × RNs × 52 × loaded wage`.
- **Workforce ($):** RN Retention = `RNs × turnover% × 40% burnout share × impact% × RN replacement`; + Travel & Agency.
- **Revenue — proof ($0):** documentation completion → CDI response → cleaner downstream coding (counted in coders' world, not here).
- **Quality ($, the marquee):** HAPI / Falls / CAUTI / CLABSI / Sepsis, each = `patient-days × event rate × prevention% × cost/event` (via `calcHapi/Falls/Cauti/Clabsi/Sepsis`). Conditional ("documentation supports prevention," never "Abridge prevents").

## 4. Calibration doctrine (leader, high price, no overstatement)
- **Ethos/Legal:** capability + conditional, never causation ("surfaces gaps that can lead to…", "when teams act"); Quality = accuracy-not-achievement, never "raises the score / earns the bonus"; no em dashes; every number traces to an editable input.
- **Logos/Finance:** count before dollars; margin not charges; realization on the least-knowable; no double count; scoped to Abridge-enabled volume.
- **Not underselling:** the levers that carry the number (recapture-rate lift, wRVU %, retention impact) sit at defensible-but-real defaults, not floor values, so the ROI stands against the price. The conservatism lives in *attribution* (realization), not in denying knowable volume.

## 5. Review findings + persona sign-off
Source: four independent per-setting audits (scratchpad/review-{outpatient,ed,inpatient,nursing}.md) + engine read.

### 5a. Scorecard (16 cells)
Reconciliation (UI $ === engine): **PASS in all 16** — no live editorial screen re-derives a headline dollar; every one reads `computeAllDriverValues` (nursing quality via `nursingQualityCalcs`). This is the single most important finding for Finance and it holds everywhere.
Legal/copy on the editorial screens: **clean** (conditional, accuracy-not-achievement on Quality, no em dashes) except the few items in 5b.
(The legacy non-preview screens still carry em dashes + thinner hedging; they get retired when the editorial flow is promoted.)

### 5b. Findings + status
FIXED this pass:
- Nursing Workforce hero said "providers" (domain-fit) → branched to RN language. [nursing]
- ED LWBS realization 80% → 50% (was ~2x overstatement vs the 40-55% band). [ed, calibration]
- Conversion factor 33 → 33.40 (cited value). [ed/op accuracy]
- (Pass-1) Quality curated chain, HCC members row, header Back, no Scribe on OP.

NEEDS YOUR DECISION (business/calibration/architecture — not mine to set):
1. **Inpatient Case Mix Index is two different formulas.** Copy + mockup promise a CMI-uplift model (~$2.94M on 18k discharges); the ENGINE runs an at-risk-rate model (~$758K, ~3.9x smaller) with no CMI input in the UI. Finance will catch this. Decision: (A) make the engine the CMI-uplift model the copy promises, or (B) rewrite the copy/mockup to the at-risk model the engine runs. Recommend A (matches how CDI/DRG value is actually pitched).
2. **Expose the realization haircuts as editable cells + normalize them.** wRVU (75%) and HCC (50%) apply realization in text but expose NO field, unlike denials/DRG/Obs. This both hides a lever (your "customization on the cells") and makes calibration invisible. Recommend: add the realization cell to wRVU + HCC, and set every realization default to one defensible mid-band so the number is neither hidden nor stacked.
3. **Two "too conservative" defaults (underselling vs our price):** OP HCC `avgHccs 0.5` + hidden 50% realization; Nursing CLABSI cost at the $20K floor of a $20-45K range + 8% prevention. Per your realization doctrine, one lever should carry the conservatism, not two. Recommend nudging the count/cost to mid-band, leaving % as the lever. (Left for you since it raises revenue numbers.)

RECOMMENDED (I can do on your go — clear, lower-stakes):
- Locum/Agency subtitle describes "actual P&L spend" but the engine computes retained × weeks × weekly premium → correct the copy (prints into the PDF). [op/ed/ip]
- IP Capacity proof: the "LOS attribution is hard" hedge got dropped into an unconditional bullet → restore the conditional. [inpatient legal]
- HCC copy "Abridge uplift / Abridge surfaces" reads slightly causal → soften to capability language. [op]
- Nursing Revenue proof-chain viz was never built (mockup had a 4-stage chain) → build it (reuse ProofChainScreen). [nursing framing]
- Consistency: unify how the demoted "signals" tier is built (3 different ways today) + drive card titles from a benefit-headline map so they can't drift from the mockups again.

### 5c. Persona sign-off (would they approve?)
- **Legal — YES, with the recommended copy fixes.** Editorial copy is conditional and accuracy-not-achievement; Quality never claims to move a score or earn a bonus. Blocking items before customer-facing: the locum "actual P&L" line, the IP LOS bullet, and softening HCC's "Abridge surfaces." (Legacy screens' em dashes are moot once editorial is promoted.)
- **Finance — YES on method, PENDING on the CMI reconcile (decision #1).** The spine is sound: scoped to Abridge-enabled volume, count-before-dollars, explicit realization, no double count, and every headline reconciles to the engine. The one thing they'd reject is the CMI name/number mismatch.
- **VP RevOps — YES.** The payment fork, the plans repeater, the toggle-nothing-on default, and the "when it lands" onset curve are exactly the guided-narrative shape a revenue leader wants; the flow adapts per setting.
- **Marketing — YES.** One editorial system, "sell the moment," leader tone. The proof screens ($0 on purpose) are a differentiated credibility play.
- **Partners — YES, once customization is complete (decision #2).** The guidance is strong, but partners will want to override the realization/attribution assumptions on wRVU and HCC; exposing those cells closes it.

### 5d. Calibration verdict (leader, high price)
The model is **conservative by construction in the right place — attribution (realization) — and honest on volume.** After this pass the outliers are: ED LWBS (was too hot, fixed) and OP HCC + Nursing CLABSI (too cold, flagged for you). Normalizing the realization band and nudging the two cold defaults is what makes the ROI stand confidently against the price without a single claim Legal would cut.
