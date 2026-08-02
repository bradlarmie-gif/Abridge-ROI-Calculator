# New Deal Proforma — Integrity & Premium Audit

The proforma is **one model rendered across four surfaces** — Build the deal ·
The case · Present · the PDF — plus charts, scoreboards, and captions. It does
not break in the math. It breaks at the **seams**: the same figure shown in more
than one place that disagree, and input permutations (term, settings, drivers,
pricing, offsets) that break a layout or a label. Every issue we've hit — the
~$95k on/off disagreement, the 5-year table scramble, the hardcoded "3-year"
copy — was a seam.

Two mechanisms keep the seams honest. Run both; they do different jobs.

---

## 1. Automated harness (permanent — runs on every change)

The mechanical seams are a **test that fails before anyone sees the bug**. This
is the moat: it would have caught the 5-year and on/off bugs automatically.

```
npx vitest run proformaIntegrity proformaCopyGuardrails
```

**Layer 1 — `client/src/__tests__/proformaIntegrity.test.ts`** (model reconciliation)
Fuzzes contract term (1–5 yr) × setting mix × pricing model (all 4) × cost
offsets on/off × driver on/off, and for every combo asserts:
- no NaN/Infinity reaches any figure;
- the P&L/chart span equals the term (column-count seam);
- drivers → period → term reconcile;
- **Build ↔ Case seam**: the last-year run-rate Build shows equals what Case
  shows (they read different functions — must agree);
- **displacement seam**: Case's "cost displaced" equals the engine's;
- driver on/off is one source of truth (turning one off lowers value everywhere);
- doctrine: displacement never changes the clinical value or the ROI multiple.

**Layer 2 — `client/src/__tests__/proformaCopyGuardrails.test.ts`** (copy)
Scans the editorial chapters + the PDF for: em dashes, causal/guarantee
absolutes ("guarantee/ensures/proven to/causes/will <increase…>"), "credited to",
and hardcoded term literals ("3-year"/"three-year"). Tone stays a human pass.

**Extending it:** to cover Inpatient/Nursing numerically, add real
Explore-derived snapshots for them to the fuzz's setting pool (today it uses the
Outpatient + ED samples). New dimensions (e.g. banked billing, system-wide fee)
slot into the permutation loop.

---

## 2. Adversarial review (periodic — judgment, before milestones)

The harness can't judge domain-fit, premium feel, or a broken empty state. Hand
Claude the prompt below and have it drive `?proformapreview=1`.

> Audit the New Deal Proforma for consistency and premium quality. It is ONE
> model rendered across four surfaces — Build, The Case, Present, and the PDF —
> plus charts, scoreboards, and captions. Bugs live at the seams: the same figure
> shown in multiple places, and input permutations that break a layout or a label.
>
> Permute these dimensions: contract term (1,2,3,4,5 yr); each care setting alone
> (Outpatient, ED, Inpatient, Nursing) and multi-setting; every driver on and
> off; each pricing model (per provider, per encounter, annual, platform); cost
> offsets present and absent; a setting with zero value.
>
> For each combination, verify:
> 1. Seam reconciliation — value/yr, investment/yr, net/yr, displaced/yr, term
>    value/investment/net, payback month, and ROI are identical across Build, The
>    Case, Present, and the PDF. Charts and their captions derive from those same
>    figures (a ramp curve must match its "$X at scale" caption; a bar's label
>    must equal its value). No surface shows a number another contradicts.
> 2. No broken states — no NaN/Infinity/"$NaN"; no scrambled or overflowing
>    tables (column count must match the term); no empty section that reads as
>    broken; check 390px width.
> 3. Domain + terminology — read each setting as that customer: nursing says
>    "nurses" not "providers"; no HCC in the ED; per-setting nouns
>    (discharges/admissions/visits/care events) correct; driver names fit.
> 4. Copy + legal — no em dashes; no causal claims that Abridge
>    "makes/causes/generates/drives" an outcome; realization/attribution labeled
>    consistently; no placeholder data reading as real.
> 5. Term labels — nothing hardcodes "3-year"/"three years" when the term differs.
>
> Reproduce every finding (drive ?proformapreview=1 and/or the model). Return a
> ranked list (blocker/major/minor/nit) with the exact surface, the triggering
> input, the mismatch, and a fix. Be honest — if a class is clean, say so.

---

**The discipline:** anything the adversarial pass finds that is objective and
repeatable gets promoted into the harness (Layer 1 or 2), so it can never regress.
That's how the premium bar holds as the proforma grows.

## Layout guard (all tools)

The vitest harness is blind to rendered layout — run the layout smoke after ANY
layout/responsive change (needs the dev server on :5199):

```
npm run layout:smoke
```

It drives every tool at 1440/1200/1024 and fails on horizontal overflow or a
wrapped/squished top bar (the class that let the 3-line header ship on a green suite).
