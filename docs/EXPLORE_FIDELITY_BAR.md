# Explore Editorial — Fidelity Bar & QA Process

**Why:** "it runs / tsc clean / no console errors" is NOT the bar. The bar is: each live
screen matches its LOCKED MOCKUP, weight-for-weight, token-for-token, copy-for-copy.
Every screen must be scored against the mockup before it's shown to Brad.

## Ground truth (the mockups are law)
- Outpatient: ~/Desktop/Explore-01..09 (scratchpad/explore-0N-*.html)
- ED / Inpatient / Nursing: ~/Desktop/Explore-{Setting}-{Screen} (scratchpad/{ed,ip,nursing}-*.html)

## Per-screen rubric — ALL 7 must pass
1. **Structure** — same sections, order, columns, spacing rhythm as the mockup. No extra/missing blocks.
2. **Type weights** — Abridge display for headings + big money; uppercase labels extrabold(800);
   body/subtext regular #5E534A; input values 700; muted #5E534A / faint #786C5E / label #2E2822 exact.
   NOTHING over-bolded (demoted signals left-col = regular muted, not bold).
3. **Color** — page #FDFCFA, cards #FDFBF8, hairline #DED5C8; coral #EA2C00 ONLY for money + primary actions.
4. **Components** — toggles/switches, quick-fill chips (rounded-[8px] outline), inputs (rounded-[11px]),
   cards (rounded-[20px]) match the mockup's radii/padding/shape. No stray pill buttons.
5. **Copy** — matches the mockup wording; plain English; NO jargon ("pts/provider" is banned, say "members");
   NO em dashes; conditional never causal.
6. **Content** — correct drivers per setting (e.g. NO Scribe on Outpatient Workforce); every $ === engine
   (computeAllDriverValues); no clunky derived-looking fields or double subtexts.
7. **Chrome** — header has Back control + 9 dots (correct one lit) + Data request; footer CTA coral.

## The loop (run per screen × setting)
1. Drive the live flow with Playwright (scratchpad/drive-explore.mjs <setting>), screenshot the screen.
2. Put the screen's locked mockup PNG next to the live screenshot.
3. Score 1-7; log EVERY deviation (however small).
4. Fix — prefer shared-component fixes (header, EdValueScreenKit, plans repeater) so one fix cascades.
5. Re-screenshot; confirm the deviation is gone.
6. Mark PASS only when all 7 pass. A screen is not "done" until it passes.

## Coverage
All 9 screens across all 4 settings. Most drift lives in shared kit (header, value card, plans repeater),
so fix those once, then re-audit each setting's screens. Report a per-screen PASS/FAIL scorecard.
