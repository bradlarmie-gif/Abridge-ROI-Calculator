# Switch Economics — vendor displacement (cost takeout)

**Date:** 2026-06-22
**Status:** Design — pending review (rev 2, simplified)
**Owner:** Brad

## Problem & goal

Buyers keep asking: *"I already pay for [scribes / a competing ambient vendor / dictation /
a search tool]. What's my **net** cost if Abridge absorbs that and I stop paying for it?"*

Reframe Abridge from net-new spend to **cost takeout** — the most CFO-credible value we have,
because it's hard dollars already on the budget. `Net = Abridge gross − what you stop paying.`

## Strategic framing

Abridge is moving from "AI scribe" → "clinical intelligence platform" (clinical-trial
matching, etc.). As it absorbs more adjacent jobs, more incumbent spend becomes displaceable.
So the category list is **data-driven and easy to grow** — adding one is a config change.

## The key insight: the engine already exists

Displacement is already built and proven in Explore + Proforma. We extend it; we do **not**
build a parallel model (that's the dual-source bug we keep hitting).

In `proformaTypes.ts` / `proformaCalculations.ts`, **per care setting**:

```ts
interface CostOffset {
  id; label;
  annualSpend: number;       // their current spend on the displaced item
  displacementPct: number;   // % Abridge takes off the table — partial is the norm
  transitionMonths: number;  // ramp — fully custom, set whatever the deal needs
}
// displacedAnnual = round(annualSpend × displacementPct / 100), ramped over transitionMonths,
// already aggregated into the model's displacementValue.
```

This is exactly the `$`-anchored, partial, contract-agnostic, per-setting model we want.
`displacementPct` = the dynamic lever; `annualSpend` = source of truth (survives any contract
structure); `transitionMonths` = custom ramp.

## What we're actually building (small)

1. **Category dropdown** on the existing per-setting cost-offset row. Add an optional
   `category?` to `CostOffset` (additive — existing offsets keep working). Categories come from
   a config list (`displacementCategories.ts`) so they grow with the platform:

   | id | Label | basis hint |
   |----|-------|-----------|
   | `scribes` | Medical scribes (in-person / virtual) | per provider / yr |
   | `ambientAi` | Competing ambient AI (DAX, Suki, Nabla, Ambience) | per provider / mo |
   | `dictation` | Dictation / speech-to-text (Dragon Medical) | per provider / yr |
   | `transcription` | Transcription services (outsourced/offshore) | per encounter / flat |
   | `cdiCoding` | Third-party CDI / coding tooling | flat / per encounter |
   | `clinicalEvidence` | Clinical evidence & search | per provider / yr or flat |
   | *(custom)* | + Add your own | freeform |

   Basis is a **hint only** — no fabricated default dollars; the rep enters the real spend
   (blank placeholder until they do). Custom row = freeform label + spend + %.

2. **Editable transition months** on each offset (already in the type; just expose the input).

3. **Net-cost "Switch Economics" view** — a roll-up of the per-setting displacement into one
   before→after story:

   ```
   What you pay today        →   Abridge            →   Net
   ─────────────────             ────────               ─────
   Scribes      $2.4M            Gross   $3.0M           $0.6M / yr net
   Dictation    $0.3M            − displaced $2.7M       "90% of Abridge is covered by
   Evidence     $0.0M                                     spend you already make"
   ─────────────                                          payback accelerates
   Displaceable $2.7M
   ```

   Headline flips from "Abridge costs $X" → **net cost** + "% of Abridge covered" + payback
   impact. Lives where the per-setting settings already live (the proforma), as a roll-up —
   not rebuilt inside Compare Pricing's separate engine.

4. **Partial-impact view** — net cost at **40% / 60% / 80%**, plus a **"+ custom" level** the
   rep can add. Reuses the sensitivity-band pattern from ProformaPresent. This is the
   "move fast when pushed into a corner" affordance: partial displacement still reads as a real
   dent, not all-or-nothing.

## Conservatism (non-negotiable)

- No fabricated default spend — blank until the rep enters the real figure.
- Default displacement well under 100%; partial is expected.

## States

- No displacement entered → net = gross (graceful, nothing claimed).
- Spend entered, 0% displaced → no offset.
- Transition ramp → displaced $ ramps over the custom `transitionMonths`.

## Out of scope (v1)

- Auto-pulling real vendor price benchmarks (bases stay hints only).
- Rebuilding Compare Pricing's deal A/B/C engine — untouched; this rides the proforma's
  existing per-setting displacement. (Whether Compare Pricing is later retired/folded is a
  separate call.)

## Resolved decisions

1. **Per care setting** (matches the existing `CostOffset`). ✓
2. **Transition months: fully custom** per offset. ✓
3. **Partial-impact view: 40/60/80 + a custom level.** ✓
4. **Strategic callout: cut** (overcomplicated; a real paid line goes in the math, nothing
   special needed). ✓

## One thing to confirm

Placement of the net-cost view: build it as a **roll-up in the proforma** (simplest — the
per-setting offsets and displacement math already live there), rather than inside the separate
Compare Pricing tool. Confirm that's fine, or say if you still want it surfaced under Forecast.

## Testing

- Unit: shared `displacedAnnual` (partial %, 0%, 100%, ramp).
- Guard: per-setting offset and the net-cost roll-up produce the same displaced-$ (one engine).
- Existing Explore/Proforma offset behavior unchanged (additive `category`).
