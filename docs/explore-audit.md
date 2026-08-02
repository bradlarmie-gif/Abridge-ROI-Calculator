# Explore (editorial) — Integrity & Premium Audit

Explore is **one model rendered across several surfaces** — the value screens,
the Investment recap, Your Model (`EdModel`), and the editorial value-model PDF
(`ExploreEditorialPdf`) — driven by a single canonical engine
(`exploreDriverCalcs`). The math is sound. It breaks at the **seams**: the same
figure shown in more than one place that disagree, and Outpatient-shaped copy
that silently breaks the other three settings.

Every issue the adversarial audits found was a seam: the PDF hardcoding
"Quality is tracked as proof" (wrong for nursing, whose proof layer is Revenue);
"0 encounters" printed for a setting scoped by beds; the ROI pill saying
"$0.00 net back" under a positive hero; a negative net rendered in celebratory
coral with a malformed "$-0.16"; and screen vs PDF disagreeing on the payback
month (real cumulative crossover vs a closed-form approximation).

Two mechanisms keep the seams honest. Run both; they do different jobs.

---

## 1. Automated harness (permanent — runs on every change)

The mechanical seams are a **test that fails before anyone sees the bug**.

```
npx vitest run exploreMathIntegrity exploreCopyGuardrails exploreEngineParity
```

**`exploreMathIntegrity.test.ts`** (model reconciliation) — fuzzes every driver
on/off combination across all four settings (528 combos) and asserts no
NaN/Infinity, quadrant sums reconcile to the total, and each printed
`calcSummary` formula multiplies back to its driver value. This is what
guarantees a "how it builds" chain reconciles to the number shown.

**`exploreEngineParity.test.ts`** — the classic and editorial screens, the PDF,
and the proforma snapshot all read the same engine; parity locks them to one
source so no surface can drift from another.

**`exploreCopyGuardrails.test.ts`** (copy + domain-fit) — scans the editorial
screens and the PDF for: em dashes; causal/guarantee absolutes
("guarantee/ensures/proven to/causes/will <increase…>"); "credited to"; and now
the **PDF domain-fit literals** that break non-Outpatient settings:

- no hardcoded `"Quality is tracked as proof"` / `"Quality · the proof running
  underneath"` — the proof caption and footer must derive from
  `proofDomainsFor()` (which reads `PROOF_LAYER[careSetting]`, the same source
  the live recap uses: nursing = Revenue, inpatient = Capacity + Quality,
  everyone else = Quality);
- no hardcoded `"four times"` downside multiple (it references the computed
  downside multiple, and is suppressed when the downside doesn't clear cost);
- the volume noun is setting-aware — nursing prints **patient-days**, never
  "Annual encounters".

**`exploreEditorialPdf.test.tsx`** (render-level behavior) renders each setting
and asserts the nursing PDF names **Revenue** (not Quality) as proof, never
prints "0 encounters", uses "Saved per shift", and that the PDF honors the real
`paybackMonth` threaded from the screen (so "When it lands" agrees on both
surfaces). Tone stays a human pass.

**Extending it:** anything objective the adversarial pass finds gets a literal
guard in `exploreCopyGuardrails` (source scan) and/or a render assertion in
`exploreEditorialPdf.test.tsx` (behavior across settings). New settings slot
into the fuzz's setting pool.

---

## 2. Adversarial review (periodic — judgment, before milestones)

The harness can't judge domain-fit nuance, premium feel, or a broken empty
state. Hand Claude the prompt below and have it drive `?explorepreview=1` (all
four settings) and the PDF at `?explorepdf=1`.

> Audit the editorial Explore flow for domain-fit, consistency, and premium
> quality. It is ONE model rendered across several surfaces — the value screens,
> the Investment recap, Your Model, and the value-model PDF — from one engine.
> Bugs live at the seams: the same figure shown in multiple places that
> disagree, and Outpatient-shaped copy that breaks the other settings.
>
> Drive every care setting alone (Outpatient, ED, Inpatient, Nursing) with
> drivers on and realistic inputs, plus the empty/default state, the zero-driver
> model, a $0-investment (no pricing) state, a NEGATIVE-net state (e.g. nursing
> at low beds), and 390px width. Generate the PDF for at least Nursing and
> Outpatient.
>
> For each, verify:
> 1. Seam reconciliation — net = total − investment; quadrant sums = total; ROI
>    multiple and $/dollar check out; the payback month is identical on the
>    screen chart and the PDF; every "how it builds" chain multiplies to the
>    value it shows; the PDF's per-setting scope/nouns match the screen.
> 2. Proof layer — the non-financial proof domain is named correctly per setting
>    on EVERY surface (nursing = Revenue, inpatient = Capacity + Quality, OP/ED =
>    Quality). The PDF footer, synthesis caption, and muted-domain copy must
>    match the live recap; none may name a domain as "proof" while the same page
>    prices it as a dollar.
> 3. Domain + terminology — read each setting as that customer: nursing says
>    "nurses"/"beds"/"shifts", never "providers"/"encounters"/"per note"; no HCC
>    in the ED; no wRVU in Inpatient; driver names fit the setting.
> 4. Broken/degenerate states — no "$0.00 net back" or "0.0×" under a positive
>    hero; a negative net reads as a loss (neutral, not celebratory coral) with
>    a real minus sign ("−$0.16", never "$-0.16"); no "× return · up from −$X";
>    no "0 encounters"; no empty section that reads as broken.
> 5. Copy + legal — no em dashes; no causal claims that Abridge
>    "makes/causes/generates/drives" an outcome; realization/attribution labeled
>    consistently; no hardcoded Outpatient figure ("four times") on another
>    setting; no placeholder data reading as real.
>
> Reproduce every finding. Return a ranked list (blocker/major/minor/nit) with
> the exact surface, the triggering input, the mismatch, and a fix. Be honest —
> if a class is clean, say so.

---

**The discipline:** anything the adversarial pass finds that is objective and
repeatable gets promoted into the harness (source-scan literal or render
assertion), so it can never regress. That's how the premium bar holds as Explore
grows.
