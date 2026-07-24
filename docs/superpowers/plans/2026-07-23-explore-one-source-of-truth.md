# Explore Path — One Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every displayed number in the Explore path derive from the one canonical engine (`computeAllDriverValues` / `computeAllDriverCalcSummaries`), so cards, quadrant screens, and the Explore→Proforma handoff can never drift from the headline — the same guarantee we already gave the proforma.

**Architecture:** The engine in `client/src/lib/exploreDriverCalcs.ts` is canonical and stays untouched (except that its scenario constants are already exported). Every consumer becomes a *reader*: driver cards call the engine for their displayed total, `exploreQuadrantValues` imports the exported constants (and delegates where clean), and `ExploreModel.handleAddToProforma` iterates the engine output by `EXPLORE_DRIVERS` quadrant instead of hand-building. Reconciliation tests lock each surface to the engine so this can't recur.

**Tech Stack:** React 18 + TypeScript strict + Vite + Vitest.

## Global Constraints

- Preserve on-screen visuals exactly — change only the *source* of a displayed number, never layout/copy.
- After EVERY task: `npx tsc --noEmit -p tsconfig.json` (0 errors), `npx vitest run` (green), `npm run build` (succeeds).
- Do NOT touch the Switch path (`client/src/lib/switchGapCalculator.ts`, `client/src/pages/switch/**`, `SwitchPath.tsx`) or `ModelBuilder.tsx` — out of scope.
- Keep physician and nursing scenario sources separate (`retentionScenarios.ts`).
- Single-source constants already exported — import, never re-copy: from `retentionScenarios.ts` (`physicianRetentionRates`, `nursingRetentionRates`, `PHYSICIAN_RETENTION_SCENARIOS`, `NURSING_RETENTION_SCENARIOS`) and from `exploreDriverCalcs.ts` (`HCC_UPLIFT_SCENARIOS`, `IP_DRG_PROTECT_SCENARIOS`, `IP_CDI_SCENARIOS`, `IP_OBS_PREVENTABLE_SCENARIOS`, `wrvuScenariosFor`, `denialsScenariosFor`).
- Work in the worktree `/private/tmp/claude-501/-Users-brad/926eabfa-9fc7-4c7d-afc2-bd8edd5da9d9/scratchpad/roi-main-wt` (detached at origin/main); publish each commit with `git push origin HEAD:main`.
- Env cannot render the app; correctness is proven by reconciliation tests, visuals verified by the user on Replit.

---

## File Structure

- `client/src/lib/exploreDriverCalcs.ts` — canonical engine (READ-ONLY here; constants already exported). Owns `computeAllDriverValues`, `computeAllDriverCalcSummaries`, `computeExploreTotals`.
- `client/src/components/explore/drivers/*Calc.tsx` — driver cards. Each becomes a reader: displayed total = `computeAllDriverValues(state, totalHoursSaved)[engineKey]`; keep input controls + qualitative breakdown copy.
- `client/src/lib/exploreQuadrantValues.ts` — quadrant screen totals. Import the exported constants; delegate Revenue/Quality to the engine where it doesn't change on-screen numbers.
- `client/src/pages/explore/ExploreModel.tsx` — `handleAddToProforma` + inline `useMemo`s. Rewrite the snapshot to iterate the engine output by driver.
- `client/src/pages/explore/ExploreFlow.tsx` — `timeValue`/`docValue` parallel computation → tie to `computeExploreTotals`.
- `client/src/lib/exploreDrivers.ts` — `EXPLORE_DRIVERS` registry + `ExploreCalcComponentProps` (props already include `state` + `totalHoursSaved`). May gain a `engineKey` field if a card's driver id ≠ engine result key.
- Tests (new/extended): `client/src/__tests__/exploreCardReconciliation.test.ts` (new), `exploreEngineParity.test.ts` (extend), `exploreSnapshotParity.test.ts` (new), `exploreDriverCoverage.test.ts` (new).

**Driver id → engine result key map** (needed throughout; a card's registry `id` is not always the engine key):

| registry id | engine key |
|---|---|
| patientAccess | patientAccess |
| edLwbs | lwbsRecovery |
| edAdmission | admissionCapture |
| wrvu | wrvu (OP) / edEmLevel (ED) |
| hccCapture | hccCapture |
| denials | denialPrevention |
| ipDrg | drgAccuracy |
| ipCdi | cdiQueryReduction |
| ipObsDefense | obsDefense |
| providerWellbeing | providerWellbeing |
| physicianLocumAgency | physicianLocumAgency |
| nursingRetention | nursingRetention |
| nursingAgency | nursingAgency |
| nursingOt | nursingOvertime |
| scribeCostReduction | scribeCostReduction |
| nursingHapi/Falls/Cauti/Clabsi/Sepsis | same |

(Confirm each against `computeAllDriverValues` result keys and `EXPLORE_DRIVERS` ids while implementing; centralize this map in Task 1.)

---

## Task 1: Shared driver-id→engine-key resolver + card reconciliation guard (RED)

**Files:**
- Create: `client/src/lib/exploreDriverKeys.ts`
- Create (test): `client/src/__tests__/exploreCardReconciliation.test.ts`

**Interfaces:**
- Produces: `engineKeyForDriver(driverId: string, careSetting: string): string` — maps a registry id to the `computeAllDriverValues` result key (handles wrvu→edEmLevel for ED).

- [ ] **Step 1: Write the resolver**

```ts
// client/src/lib/exploreDriverKeys.ts
export function engineKeyForDriver(driverId: string, careSetting: string): string {
  if (driverId === "wrvu") return careSetting === "ed" ? "edEmLevel" : "wrvu";
  const map: Record<string, string> = {
    edLwbs: "lwbsRecovery",
    edAdmission: "admissionCapture",
    ipDrg: "drgAccuracy",
    ipCdi: "cdiQueryReduction",
    ipObsDefense: "obsDefense",
    nursingOt: "nursingOvertime",
    // identity keys (patientAccess, hccCapture, denials, providerWellbeing,
    // physicianLocumAgency, nursingRetention, nursingAgency, scribeCostReduction,
    // nursingHapi/Falls/Cauti/Clabsi/Sepsis) fall through to the id itself.
  };
  return map[driverId] ?? driverId;
}
```

- [ ] **Step 2: Write the guard test (will FAIL until cards are readers)**

Build a synthetic `ExploreState` per care setting with every driver in that setting enabled + realistic inputs, render each card (`@testing-library/react`), and assert the card's displayed total equals `computeAllDriverValues(state, hours)[engineKeyForDriver(id, setting)]`. Because cards render prose + inputs, assert on the card's value element by `data-testid` — **add `data-testid={`driver-total-${driverId}`}` to the element each card shows its dollar total in** (Task 2 adds these as it converts each card).

```ts
// client/src/__tests__/exploreCardReconciliation.test.ts (skeleton — fill enabled-driver
// fixtures per setting from DEFAULT_EXPLORE_STATE, mirroring proformaDriverFormulaSteps.test.ts)
import { render, screen } from "@testing-library/react";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { EXPLORE_DRIVERS } from "@/lib/exploreDrivers";
// helper: render a card, read `driver-total-${id}`, parse $ → number
```

- [ ] **Step 3: Run — expect FAIL** (`npx vitest run exploreCardReconciliation`) until Task 2 lands. Commit the resolver + a `.todo`/skipped test so the suite stays green:

```bash
git add client/src/lib/exploreDriverKeys.ts client/src/__tests__/exploreCardReconciliation.test.ts
git commit -m "test(explore): driver-id→engine-key resolver + card reconciliation guard (skipped)"
```
(Mark the assertions `it.skip` here; un-skip per-card in Task 2 so the suite is green after every commit.)

---

## Task 2: Convert each driver card to read the engine value (per-card, un-skip its guard)

**Files (one card per commit — 15 cards):** `client/src/components/explore/drivers/{PatientAccess,LwbsRecovery,AdmissionCapture,Wrvu,HccCapture,DenialPrevention,ProviderWellbeing,PhysicianLocumAgency,ScribeCostReduction,NursingRetention,NursingAgency,NursingOvertime,NursingHapi,NursingFalls,NursingCauti,NursingClabsi,NursingSepsis}Calc.tsx`

**Interfaces:**
- Consumes: `computeAllDriverValues`, `engineKeyForDriver`. Cards already receive `state` + `totalHoursSaved` via `ExploreCalcComponentProps`.

Per card, the pattern (keep ALL input controls and qualitative copy; only the displayed **total** changes source):

- [ ] **Step 1** — add the engine read at the top of the component:
```ts
const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("<driverId>", state.careSetting)] ?? 0;
```
- [ ] **Step 2** — replace the locally re-derived total the card displays with `value`, and tag it: `<span data-testid={`driver-total-<driverId>`}>{formatCurrency(value)}</span>`. Leave intermediate/illustrative breakdown lines as-is (they're qualitative). For nursing-quality cards, delete the inline `(patientDays/1000)×rate×…` re-implementation and show `value`. For `PatientAccessCalc`, this removes the double-rounding divergence for free.
- [ ] **Step 3** — un-skip that card's assertion in `exploreCardReconciliation.test.ts`.
- [ ] **Step 4** — `npx tsc --noEmit && npx vitest run exploreCardReconciliation && npm run build`.
- [ ] **Step 5** — commit: `git commit -m "refactor(explore): <Card> reads the engine value"`.

Repeat for all cards. (`PhysicianLocumAgencyCalc` already had its IP fields fixed in Tier 1; converting it to read the engine makes that guarantee structural.)

---

## Task 3: exploreQuadrantValues — import shared constants + parity tests (extend exploreEngineParity)

**Files:**
- Modify: `client/src/lib/exploreQuadrantValues.ts`
- Modify (test): `client/src/__tests__/exploreEngineParity.test.ts`

- [ ] **Step 1** — In `exploreEngineParity.test.ts`, add cases asserting `exploreQuadrantValues` Revenue/Quality equals `computeAllDriverValues` for **inpatient DRG, CDI, ObsDefense** and **outpatient HCC** (currently untested). Run — these should PASS today (values match) but lock the behavior.
- [ ] **Step 2** — Replace the hand-copied maps in `exploreQuadrantValues.ts` (`{3,5,10}` HCC, `{15,20,25}` DRG, `{15,25,35}` CDI, `{25,40,55}` Obs) with imports of `HCC_UPLIFT_SCENARIOS`, `IP_DRG_PROTECT_SCENARIOS`, `IP_CDI_SCENARIOS`, `IP_OBS_PREVENTABLE_SCENARIOS`. Delegate the nursing-quality re-derivation to `nursingQualityCalcs` helpers (import them) instead of inline math. Fix the sepsis `Math.max(0,…)` clamp to match the helper.
- [ ] **Step 3** — `npx tsc --noEmit && npx vitest run exploreEngineParity && npm run build`. Parity tests still green (proves no on-screen number moved).
- [ ] **Step 4** — commit: `git commit -m "refactor(explore): quadrant values import shared constants + delegate nursing quality; add IP/HCC parity guards"`.

---

## Task 4: Snapshot parity — ExploreModel handoff iterates the engine

**Files:**
- Modify: `client/src/pages/explore/ExploreModel.tsx` (`handleAddToProforma` + the inline per-driver `useMemo`s it consumes)
- Modify: `client/src/pages/explore/ExploreFlow.tsx` (`timeValue`/`docValue`)
- Create (test): `client/src/__tests__/exploreSnapshotParity.test.ts`

- [ ] **Step 1: Write the parity test (RED)** — for all four settings, assert `sum(handleAddToProforma(...).drivers.map(d=>d.value)) === computeExploreTotals(state, hours).totalAnnualValue` (within $1 rounding), and `timeValue === efficiencyValue`, `docValue === documentationValue`. This FAILS today (physicianLocumAgency omitted; IP retention generic fields).
- [ ] **Step 2: Make the snapshot iterate the engine** — build the `drivers` list by walking `EXPLORE_DRIVERS` for the active setting, taking `value = allDriverValues[engineKeyForDriver(d.id, setting)]` for each enabled driver (this automatically includes `physicianLocumAgency` and uses the engine's ip*-aware retention). Delete the redundant inline `useMemo`s (`wrvuValue`, `hccValue`, `denialsValue`, `ipDrgValue`, `ipObsDefenseValue`, `edLwbsValue`, `edAdmissionCaptureValue`, `nursingOtValue`, `nursingRetentionValue`) once nothing references them. Repoint `ExploreFlow` `timeValue`/`docValue` to `computeExploreTotals(...).efficiencyValue`/`documentationValue`.
- [ ] **Step 3** — `npx tsc --noEmit && npx vitest run && npm run build`. Snapshot-parity test now GREEN.
- [ ] **Step 4** — commit: `git commit -m "fix(explore): proforma snapshot + timeValue/docValue iterate the engine (fixes physicianLocumAgency omission + IP retention fields)"`.

---

## Task 5: Coverage-invariant test — every engine key maps to exactly one registered driver

**Files:**
- Create (test): `client/src/__tests__/exploreDriverCoverage.test.ts`

- [ ] **Step 1** — Assert: for a maximal `ExploreState` (all drivers enabled across settings), every key `computeAllDriverValues` emits corresponds to exactly one `EXPLORE_DRIVERS` entry whose `settings` includes that care setting, and vice-versa (every quantified registered driver produces an engine key). This is the guard that catches "computed but never summed" orphans (the `cdiQueryReduction` class).
- [ ] **Step 2: Run — resolve any orphan it flags.** If `cdiQueryReduction` (or another key) has no registered driver, decide with the product owner: either register the driver (add an `EXPLORE_DRIVERS` entry) or gate the engine emission. Do NOT silently pass — the test must reflect the real registry. (Expected: this surfaces `cdiQueryReduction` as IP-only/unregistered; register it or scope it.)
- [ ] **Step 3** — `npx tsc --noEmit && npx vitest run && npm run build`.
- [ ] **Step 4** — commit: `git commit -m "test(explore): coverage-invariant — every engine key maps to one registered driver"`.

---

## Self-Review

- **Spec coverage:** cards→engine (Tasks 1–2), quadrant constants+parity (Task 3), snapshot+timeValue/docValue parity (Task 4), coverage invariant (Task 5). All four required guards present. ✅
- **Constraints:** every task ends in tsc+vitest+build; no Switch/ModelBuilder edits; constants imported not copied; visuals unchanged (only value source). ✅
- **Type consistency:** `engineKeyForDriver(id, careSetting)` used identically in Tasks 1/2/4; `data-testid={`driver-total-${id}`}` naming consistent between Task 2 (adds) and Task 1 (reads). ✅
- **Open risk to verify during execution:** confirm the exact set of `*Calc.tsx` files and each card's current "total" element before editing; confirm every registry `id` vs engine key in the map (Task 1) against the real files. The plan says "read the file first" at each card.
