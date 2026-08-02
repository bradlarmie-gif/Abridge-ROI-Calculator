# Attain (attainv2) — Integrity & Premium Audit

Attain is **one plan rendered across many surfaces** — the Align/Plan/Strategy/
Progress chapters of the live funnel, the fast multi-category preview, and two
PDFs (the `?attainpdf=1` HTML proof and the real `@react-pdf` "Export PDF"). The
math is robust. Attain breaks at the **seams**, the same way the proforma does:

- the same dollar shown on the screen and re-derived in the PDF that disagree;
- a cell that exists in the model but no funnel path can reach (an **orphan**),
  which still leaks into the preview and the PDF leave-behind;
- a GoalId that resolves to a different cell on the screen than in the export;
- copy that names a driver the engine does not actually read.

Every real defect the audits found was a seam: the orphaned "Inpatient Capacity"
cell, the PDF frozen at "0% realized", and the revenue walk claiming an entered
count drives a number the engine sizes off total volume.

**The seam principle:** a figure or a label shown in more than one place must
come from ONE source. Attain enforces this with a single `categoryForGoal`
(GoalId→category, setting-aware) that both `AttainFlowV2.cellsFor` and
`attainPdfData.buildFromSnapshot` import, a single `fmt$` (`lib/attain/attainFormat.ts`)
every screen and PDF share, and a `buildFromSnapshot` the PDF lays out without
ever re-deriving a dollar.

---

## 1. Automated harness (permanent — runs on every change)

```
npx vitest run attain
```

That pattern runs the whole Attain harness:

- **`attainReachability.test.ts`** — every `ATTAIN_MATRIX` cell must be reachable
  via `SETTING_GOAL_MATRIX[setting] → categoryForGoal(setting, goal) → cell.category`.
  Fails loudly on an orphan (this is the guard that would have caught the
  half-wired Inpatient Capacity cell). Also asserts the funnel and the PDF resolve
  GoalId→category through the *same* `categoryForGoal` (reference identity + a
  per-combination behavioral check), so screen and download can never drift.
- **`attainPdfReview.test.ts`** — a snapshot with a logged review populates
  `data.review` (attainment %, realized $ > 0) and per-category `realized`, so the
  export reflects progress; a snapshot with no reviews stays on the honest kickoff
  "0% / measurement begins at go-live" page.
- **`attain-pdf.test.ts`** — `buildFromSnapshot` builds a complete, finite,
  NaN-free `PdfData` for every setting; correct entered/goal cells; null (not
  throw) on bad input.
- **`attainReactPdfReconciliation.test.ts`** — the SEAM guard: the PDF's headline
  total and every per-category value equal the SAME engine (`engineValueInPlay`)
  the on-screen experience renders, single- and multi-lever.
- **`attain-vocab.test.ts`** — vocabulary fits each setting (nurses aren't
  "providers", no DRG in the ED, etc.), reading the RESOLVED heading.
- **`attain-engine.test.ts`** — the engine adapter (scaled encounters, stance,
  per-lever driver keys) is finite and monotone.
- **`attainReactPdfRender.test.ts` / `attainPdfRender.test.ts`** — both PDFs
  actually render for every setting without throwing.
- **`attain-serialize.test.ts`** — snapshot round-trips through storage.

**Extending it:** any objective, repeatable thing the adversarial pass below finds
gets promoted here so it can never regress — a new reachability constraint, a new
seam, a new copy guardrail.

---

## 2. Adversarial review (periodic — judgment, before milestones)

The harness can't judge domain-fit, premium feel, or a broken empty state. Drive
the real funnel at `?attainv2=1` (and the PDFs at `?attainpdf=1` /
`?attainpdf=review`), permuting:

> Care setting (Outpatient, ED, Inpatient, Nursing) × every goal combination on
> the Vision step × single- and multi-lever revenue frames × the full chapter walk
> (Align → Plan → Strategy → Progress) × logging 0, 1, and 2+ quarterly reviews ×
> the fast preview `?multipreview=1&setting=…`.
>
> For each, verify:
> 1. **Seam reconciliation** — the value-in-play on the dark scoreboard equals the
>    per-category and total dollars on Strategy, and equals the exported PDF's
>    headline and per-category bars, to the dollar. Realized-to-date on Progress
>    equals the PDF review scoreboard once a review is logged.
> 2. **Reachability** — every category the preview/PDF shows is one the build-a-plan
>    funnel can actually produce (no orphan teaser). Every goal offered on Vision
>    lands on the right cell.
> 3. **No broken states** — no `$NaN`, no white screen; the empty value panel reads
>    as intentional ("Set the scope…"); proof-only Retention shows "Tracked as
>    proof, not a dollar", never a phantom dollar; fat-fingered economics/baseline
>    inputs are clamped and never render as "$172800.0M".
> 4. **Domain + terminology** — read each setting as that customer: nursing says
>    "nurses"/"shifts"/"bedside", inpatient says "hospitalists"/"discharges"/"DRG",
>    ED says "LWBS"/"door-to-provider"; section kickers fit (ED = "the zone or
>    shift", Nursing = "the units", Outpatient = "the specialties").
> 5. **Copy + legal** — no em dashes; no "Abridge <verb>" causal claims; a discovery
>    beat must not claim an entered number "is the base we size from" if the engine
>    sizes off total volume; realization/attribution labeled consistently.
>
> Reproduce every finding. Return a ranked list (blocker/major/minor/nit) with the
> exact surface, the triggering input, the mismatch, and a fix. Be honest — if a
> class is clean, say so.

---

**The discipline:** the screen⇄PDF dollar seam and Progress math are already
tight; keep them that way by adding any new numeric surface to
`attainReactPdfReconciliation.test.ts`, and any new cell/goal to
`attainReachability.test.ts`, the moment it ships — not after a rep demos an
orphan in the field.

## Layout guard (all tools)

The vitest harness is blind to rendered layout — run the layout smoke after ANY
layout/responsive change (needs the dev server on :5199):

```
npm run layout:smoke
```

It drives all 15 app surfaces (proforma Build/Case/Present, Explore + each
care setting, every Attain preview, the Forecast hub, and App Rationalization
with a tool added) at desktop widths PLUS a dense narrow sweep (960->560px in
40px steps). It fails on horizontal overflow, a wrapped/squished top bar, or a
text input whose value is clipped. The dense sweep matters: a flex field only
clips inside a ~40px band, so two discrete widths straddle and miss it (that is
exactly how the header AND the offset/vendor name clips shipped on a green suite).
