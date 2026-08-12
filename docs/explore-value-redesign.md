# Explore value + investment redesign

Kills the "flat" (nine isolated resetting boxes, no accumulation, no viz). Turns the four value
steps + the investment page into ONE model that visibly assembles as you co-build it, across all
four care settings. **A re-skin over the existing engine — no new math.** Approved scope: the four
value steps (Capacity / Workforce / Revenue / Quality) + Investment, all four settings. Not the
Care Setting / Practice / Time Savings steps (kept as-is for now).

## The spine

1. **Persistent "your model so far" rail** — a shared right-column component on every value step +
   investment. It shows the running model: a coral-tint stacked bar by domain + a count-up total +
   ROI vs investment, and it GROWS as drivers turn on. Prior domains show as already-built
   ("from step 4"), the current one as "building now." Same rail, carried across steps, so by the
   end the model is already assembled.
2. **Alive drivers with footing editable arithmetic** — each driver card, when on, shows THE MATH
   open by default (collapsible via a chevron): the equation that builds its number, every factor a
   cell, **grey = carried from an earlier step, coral underline = editable here**, and the result
   is what the engine returns. Off = a calm invite, not grey-dead.
3. **Tracked, not counted** — domains/drivers that carry no dollar (per PROOF_LAYER) render as a
   "tracked, not counted" row in the rail and a tracked treatment on the screen, never a $0 bar.

## Non-negotiables (from the audit skill / Brad's taste)

- It must FOOT: the displayed arithmetic equals the engine value. We render the engine's factors;
  we never invent a parallel number. Reconciliation tests guard screen ⇄ engine ⇄ PDF.
- Money is the **realized** share, not gross (labels say so, e.g. "Realized / HCC").
- One baseline per equation row; kill decorative labels; trim captions; calm over busy.
- Numbers stay conservative; a gentle note if ROI runs past ~7×, never a hard cap.
- Drivers still default OFF (co-build motion, Brad's design). The rail accumulates as you turn them
  on, so the flow is never a dead/negative default in the actual motion.

## Per-setting counted vs tracked (from `lib/proofLayer.ts` — do not reinvent)

| Setting | Capacity | Workforce | Revenue | Quality |
|---|---|---|---|---|
| Outpatient | $ | $ | $ | tracked |
| ED | $ | $ | $ | tracked |
| Inpatient | **tracked** (shows in Revenue) | $ | $ | tracked |
| Nursing | $ | $ | **tracked** | $ (harm avoidance) |

The rail's stacked bar only includes `$` domains; tracked domains render as a tracked row beneath.
`isProofDomain(setting, domain)` is the single source.

## Components

- **`ValueRail`** (new, shared): props `{ state, totalHoursSaved, careSetting, activeDomain, investment? }`.
  Reads `computeExploreTotals(state, totalHoursSaved).valueByQuadrant` for the domain dollars and
  `PROOF_LAYER[careSetting]` for tracked domains. Renders total (count-up), coral-tint stacked bar
  over the counted domains, a row per domain (dollar or "tracked, not counted"), and — when
  `investment` is passed (investment page) — the net + ROI. No math of its own; pure presentation of
  engine output. Coral-tint palette for the stack (money = coral family), deepest → lightest by
  QUADRANT_ORDER.
- **Card-kit upgrade** — `EdValueScreenKit` (`ValueCard`/`OffCard`/`BuildStrip`) and `EdMoneyCard`
  (`MoneyCard`/`BuildStrip`): replace the current `BuildStrip` ledger with an **`EquationStrip`**
  that renders the same `MoneyBuild.factors` as a bottom-aligned, footing equation (factor × factor
  × … = result), grey/coral per factor, open by default with a chevron to collapse. `MoneyBuild`
  gains an optional `carried?: boolean` per factor (grey vs coral). HCC keeps its `PlansRepeater`,
  each plan an equation that foots (lives × HCCs/patient × realized $/HCC × recapture-improvement +
  optional net-new), rolling to the driver total. No engine change.
- **Screens**: EdCapacity / EdWorkforce / EdRevenue / EdQuality / EdInvestment gain the `ValueRail`
  in the right column (sticky), and use the upgraded kit. Setting branches already exist; each
  setting's tracked domain renders the tracked treatment + tracked rail row.
- **EdInvestment**: the rail becomes the assembled total; investment subtracts; net + ROI shown
  in-rail. Providers/beds already locked read-only (done).

## PROGRESS (resume here)

DONE (branch `explore-value-redesign`): spec; `ValueRail.tsx`; `BuildStrip` upgraded to footing
equation (EdMoneyCard, used by both kits); `EdCapacity` wired to two columns + rail. Pattern
validated on Outpatient Capacity.

**Per-screen wiring recipe** (apply to EdWorkforce, EdRevenue, EdQuality, EdInvestment, for every
setting — the screens already branch by setting, so one edit covers all four settings):
1. `import ValueRail from "./ValueRail";`
2. Keep the eyebrow/h1/intro full-width. Wrap the driver/content block in:
   `<div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-x-10 gap-y-8 items-start"><div className="min-w-0"> …existing content… </div><ValueRail state={state} totalHoursSaved={totalHoursSaved} activeDomain="Workforce|Revenue|Quality" /></div>`
3. Keep `<Foot onNext={onNext} />` full-width below the grid.
4. EdInvestment: pass `investment={annualInvestment}` and NO `activeDomain`; the rail becomes the
   payoff (net + ROI). Its existing right-hand "what it returns" panel is replaced by the rail.
5. The driver-math upgrade needs no per-screen change — it rides on the shared BuildStrip.

TODO: Outpatient Workforce/Revenue/Quality/Investment; then ED, Inpatient, Nursing (all four
screens each); verify (tsc/vitest/build/layout:smoke + reconcile + screenshot every setting); merge
to main; report.

## Build order

1. `ValueRail` + `EquationStrip` (+ `MoneyBuild.carried`), taste-locked on the mock's bar.
2. Outpatient: all 4 value screens + investment wired to the rail + upgraded cards. Reconcile.
3. ED, Inpatient, Nursing: apply the same, each with its own drivers + tracked domain.
4. Verify: tsc + full vitest + build + layout:smoke; reconcile each setting screen ⇄ engine ⇄ PDF;
   screenshot every value step + investment for all 4 settings; audit-lens review; push; report.

## Guards

Keep green + extend: `exploreNarrativePdfReconciliation`, `nursingPdfReconciliation`,
`exploreEditorialPdfFooting`, `exploreMathIntegrity`. The rail reads the same `computeExploreTotals`
the PDF/model use, so a value shown on the rail is the value in the PDF by construction.
