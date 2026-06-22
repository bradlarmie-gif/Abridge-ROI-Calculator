# Switch Economics — vendor displacement in Forecast

**Date:** 2026-06-22
**Status:** Design — pending review
**Owner:** Brad

## Problem & goal

Buyers keep asking a question the calculator doesn't answer: *"I'm already paying for
[scribes / a competing ambient vendor / dictation / a search tool]. What's my **net**
cost if Abridge absorbs that and I stop paying for it?"*

Today the tool frames Abridge as net-new spend. We want to frame it as **cost takeout** —
the most CFO-credible value we have, because it's hard dollars already on this year's
budget, not projected upside. Net cost = `Abridge gross − what you stop paying`.

This evolves the existing **Compare Pricing** tool in Forecast into a **Switch Economics**
module, with vendor displacement as the anchor input. The deal-structure comparison we
already built (A/B/C) is retained but demoted to a secondary toggle.

## Strategic framing (why this matters beyond a feature)

Abridge is moving from "AI scribe" → "clinical intelligence platform" (clinical-trial
matching, etc.). Displacement is where that thesis shows up **in dollars**: as Abridge
absorbs more adjacent jobs, more incumbent spend becomes displaceable. The category list
must therefore be **data-driven and easy to grow** — adding a category as the platform
grows is a config change, not a rebuild.

## Naming

- Module (owner-facing): **Switch Economics** (working name; replaces "Compare Pricing"
  as the headline). Internal "app realization / cost reduction" is jargon — not used in UI.
- The clinical-reference category is named **"Clinical evidence & search"** (not
  UpToDate-specific; UpToDate is a partner, not a displacement target).

## Architecture — one displacement engine

The displacement model **already exists** and is proven in Explore + Proforma. We reuse it
rather than build a parallel one (this is the dual-source-of-truth trap that caused the
bugs fixed on 2026-06-22).

Existing, in `client/src/pages/proforma/proformaTypes.ts` and
`client/src/lib/proformaCalculations.ts`:

```ts
interface CostOffset {
  id: string;
  label: string;
  annualSpend: number;       // their current spend on the displaced item
  displacementPct: number;   // % of that spend Abridge takes off the table (partial!)
  transitionMonths: number;  // ramp — a contract doesn't drop to zero on day one
}
// displacedAnnual(offset) = round(offset.annualSpend * offset.displacementPct / 100)
```

This is exactly the `$`-anchored, partial, contract-agnostic model we want. The `$`
(annualSpend) is the source of truth (survives any contract structure); `displacementPct`
is the dynamic lever; `transitionMonths` handles ramp.

**Changes required:**

1. **Add a category to `CostOffset`** (additive, optional — existing offsets keep working):
   ```ts
   category?: DisplacementCategoryId; // undefined ⇒ custom "add your own"
   ```
2. **Make categories data-driven** — a config array (e.g.
   `client/src/lib/displacementCategories.ts`) so adding one is a one-line change:
   ```ts
   { id, label, defaultBasis: "perProviderYr" | "perEncounter" | "flat", hint?: string }
   ```
   No default *dollar* amounts baked in (see Conservatism). `defaultBasis`/`hint` only
   guide the rep; the rep enters the actual spend.
3. **Extract/export the shared `displacedAnnual` helper** from `proformaCalculations.ts`
   (currently a private function ~line 23) so the new Compare Pricing engine calls the
   *same* math.
4. **Compare Pricing gains displacement.** `client/src/lib/pricingComparisonCalc.ts` is a
   separate engine that does not use `CostOffset` today. Add a deal-level
   `costOffsets: CostOffset[]` to its deal model and compute:
   ```
   netAnnualCost = grossAbridgeAnnual − Σ displacedAnnual(offset)
   ```
   Reuse the shared helper so Switch Economics and the in-calculator offsets never drift.

## Displacement categories (v1)

Curated list (data-driven; order = how reps think about it):

| id | Label | Default basis | Notes |
|----|-------|---------------|-------|
| `scribes` | Medical scribes (in-person / virtual) | per provider / yr | usually the headline |
| `ambientAi` | Competing ambient AI (DAX, Suki, Nabla, Ambience) | per provider / mo | switch-from story |
| `dictation` | Dictation / speech-to-text (Dragon Medical) | per provider / yr | |
| `transcription` | Transcription services (outsourced/offshore) | per encounter / flat | |
| `cdiCoding` | Third-party CDI / coding tooling | flat / per encounter | overlaps HCC/coding value |
| `clinicalEvidence` | Clinical evidence & search (e.g. OpenEvidence, redundant reference) | per provider / yr or flat | enabled by Abridge's embedded UpToDate CDS |
| *(custom)* | + Add your own | — | freeform label + spend + % |

Designed to grow (clinical-trial matching, etc. added later as config).

## Input model (per displaced item)

- **Current annual spend** — rep enters; **blank placeholder by default, never a fabricated
  number.** The customer knows what they pay.
- **% displaced** — slider, drives **displaced $**; the $ stays directly editable (type the
  exact figure if known). Default well under 100% — partial is the norm.
- **Transition months** — optional ramp (reuses `transitionMonths`); defaults to the
  module's standard.
- *(optional helper)* **% of users/seats** — pre-fills `% displaced` **only** under per-seat
  pricing; never the source of truth, because seats ≠ dollars on a flat/tiered contract.

## Hard-dollar vs strategic split

To protect credibility (one inflated line taints the whole list):

- **In the dollar math:** only spend the customer *actually pays today*. Partial displacement
  is fine and expected.
- **Strategic callout (excluded from the $ total):** a "Consolidation & defensibility" note,
  e.g. *"Abridge becomes your evidence surface — closes the door on a separate OpenEvidence
  buy."* Lets the moat story be told without a $0-actual line in the hard-dollar total.

## Switch Economics module — UX structure

Single before/after spine as the headline:

```
What you pay today        →   Abridge            →   Net
─────────────────             ────────               ─────
Scribes      $2.4M            Gross   $3.0M           $0.6M / yr net
Dictation    $0.3M            − displaced $2.7M       "90% of Abridge is covered
Evidence     $0.0M (strategic)                         by spend you already make"
─────────────                                          Payback accelerates to N mo
Displaceable $2.7M
```

- Headline metric flips from "Abridge costs $X" → **net cost** + "% of Abridge covered by
  displacement" + payback impact.
- **Partial-impact view** (reuse the sensitivity-band pattern from ProformaPresent): net cost
  at a few displacement levels (e.g. 40% / 60% / 80%) so partial displacement reads as a real
  dent, not all-or-nothing. This is the "move fast when pushed into a corner" affordance.
- **Deal-structure A/B/C comparison** (existing Compare Pricing): retained as a secondary
  toggle inside the module, no longer the headline.

## Conservatism principles (non-negotiable)

- No fabricated default spend — blank until the rep enters the real figure.
- Default displacement well under 100%; partial is the expected case.
- The strategic/defensive story never inflates the hard-dollar total.

## States

- **No displacement entered** → module shows Abridge gross as today (graceful; net = gross).
- **Spend entered, 0% displaced** → no offset; clear that nothing is being claimed.
- **Strategic-only category (free competitor)** → shows as callout, contributes $0 to total.
- **Transition ramp** → displaced $ ramps in over `transitionMonths`, consistent with the
  existing engine.

## Out of scope (v1)

- Auto-pulling real vendor price benchmarks (defaults stay as bases/hints only).
- Unifying Compare Pricing's deal engine with the full proforma cash-flow engine (we share
  the `CostOffset` model + `displacedAnnual` helper, not the whole engine).
- Per-care-setting displacement inside Switch Economics (it's deal/org-level here; the
  per-setting offsets in the proforma remain for granular cases and use the same model).

## Open questions to confirm before build

1. Is **deal/org-level** displacement in Switch Economics right (vs per-setting)? (Assumed yes.)
2. Default **transition months** for a displaced contract (e.g. 6? 12? aligned to renewal)?
3. Which **partial levels** to show in the partial-impact view (40/60/80%? or a live slider)?
4. Should the strategic callout be **per-category** (only clinical-evidence) or a general
   "consolidation" section?

## Testing

- Unit: `displacedAnnual` (shared helper) — partial %, 0%, 100%, ramp; net cost in
  `pricingComparisonCalc` with offsets.
- Guard: a regression test that the proforma offsets and Switch Economics produce the same
  displaced-$ for the same `CostOffset` (proves one engine, no drift).
- Verify the existing Explore/Proforma offset behavior is unchanged (additive `category`).
