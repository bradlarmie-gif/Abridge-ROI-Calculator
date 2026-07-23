import { describe, it, expect } from "vitest";
import {
  computeMultiGoalContributions,
  defaultBaseline,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { accessAlignConfig } from "@/lib/attain/accessAlign";
import { workforceAlignConfig } from "@/lib/attain/workforceAlign";
import { capacityAlignConfig } from "@/lib/attain/capacityAlign";
import type { AlignConfig, AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

/**
 * Multi-goal Align — the stacked "Build the case" surface reconciles to the
 * engine.
 *
 * The stacked multi-goal Align (StepMultiBuildCase) renders one config-driven
 * Align block per selected goal and shows a combined header equal to the
 * engine's `combinedMargin`. These tests hold the two claims the surface makes
 * honest:
 *
 *  1. Each block's own Align proof (`config.deriveProof`) equals that goal's
 *     engine subtotal (`combined.byGoal[goal].totalMargin`), and the combined
 *     header equals the sum of those subtotals, counted once.
 *  2. When both Access and Retention are selected at outpatient/ED they share
 *     ONE freed documentation hour: the `freedTimeSplit` routes it, each
 *     block's proof reflects only its share, and the combined prize is
 *     strictly less than the naive sum of each goal crediting the full hour —
 *     so the hour is split, never double-counted. Where no shared-hour pair is
 *     present, the goals are additive with no split.
 *
 * The fixtures build each goal's stored values exactly the way the app does:
 * the raw Align selections PLUS the engine levers the config maps them to
 * (AlignStep writes both), read straight off the config's own questions so
 * they can never drift from the real store keys.
 */

/** A fully-decided NON-STACKING Align selection: the first option for every
 * single-select question, every option for each multi-select. Access,
 * Retention, and Capacity do not stack, so this is a complete, ready plan for
 * each. */
function fullSelections(config: AlignConfig): LeverValues {
  const sel: LeverValues = {};
  for (const q of config.questions) {
    if (q.stacksOnQuestionId) continue;
    sel[q.storeKey] = q.mode === "single" ? [q.options[0].id] : q.options.map((o) => o.id);
  }
  return sel;
}

/** The merged per-goal values bag the app stores: raw selections + the engine
 * levers the config maps them to. `toLeverValues` does not depend on the
 * cross-goal share, so this is built once and the share is varied only in the
 * proof context below. */
function mergedValues(config: AlignConfig, baseline: AttainBaseline, setting: AttainSetting): LeverValues {
  const sel = fullSelections(config);
  const ctx: AlignContext = { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
  return { ...sel, ...config.toLeverValues(sel, ctx) };
}

function proofValue(config: AlignConfig, values: LeverValues, baseline: AttainBaseline, setting: AttainSetting, share: number): number {
  const ctx: AlignContext = { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: share };
  return config.deriveProof(values, ctx).headlineValue;
}

describe("multi-goal Align — stacked blocks reconcile to the engine", () => {
  it("outpatient Access + Retention: each block's proof equals its engine subtotal, and the combined header is their sum counted once", () => {
    const setting: AttainSetting = "outpatient";
    const baseline = defaultBaseline(setting);
    const accessVals = mergedValues(accessAlignConfig, baseline, setting);
    const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
    const valuesByGoal = { access: accessVals, retention: retentionVals };

    const split = 50;
    const accessShare = split / 100;
    const retentionShare = 1 - accessShare;

    const combined = computeMultiGoalContributions(["access", "retention"], setting, baseline, valuesByGoal, split);

    // Both goals produce a real, nonzero number, so the reconciliation below
    // is meaningful and not a trivial 0 = 0.
    expect(combined.combinedMargin).toBeGreaterThan(0);
    expect(combined.byGoal.access!.totalMargin).toBeGreaterThan(0);
    expect(combined.byGoal.retention!.totalMargin).toBeGreaterThan(0);

    // Each block's own Align proof reconciles to that goal's engine subtotal
    // (to the dollar) with its share applied.
    const accessProof = proofValue(accessAlignConfig, accessVals, baseline, setting, accessShare);
    const retentionProof = proofValue(workforceAlignConfig, retentionVals, baseline, setting, retentionShare);
    expect(Math.abs(accessProof - combined.byGoal.access!.totalMargin)).toBeLessThan(1);
    expect(Math.abs(retentionProof - combined.byGoal.retention!.totalMargin)).toBeLessThan(1);

    // The combined header = the sum of the two subtotals, counted once (exact
    // engine invariant), and matches the sum of the two blocks' proofs.
    expect(combined.combinedMargin).toBeCloseTo(
      combined.byGoal.access!.totalMargin + combined.byGoal.retention!.totalMargin,
      5,
    );
    expect(Math.abs(combined.combinedMargin - (accessProof + retentionProof))).toBeLessThan(1);
  });

  it("Access + Retention share ONE freed hour: the split combined prize is strictly less than crediting each the full hour (no double-count)", () => {
    const setting: AttainSetting = "outpatient";
    const baseline = defaultBaseline(setting);
    const accessVals = mergedValues(accessAlignConfig, baseline, setting);
    const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
    const valuesByGoal = { access: accessVals, retention: retentionVals };

    const combined = computeMultiGoalContributions(["access", "retention"], setting, baseline, valuesByGoal, 50);

    // Each goal crediting the FULL freed hour (share = 1) — the double-booked
    // number the split exists to prevent.
    const accessFull = proofValue(accessAlignConfig, accessVals, baseline, setting, 1);
    const retentionFull = proofValue(workforceAlignConfig, retentionVals, baseline, setting, 1);
    expect(combined.combinedMargin).toBeLessThan(accessFull + retentionFull);
  });

  it("Access + Retention split extremes: routing the whole hour to one goal zeroes the other, in both the engine and the block proof", () => {
    const setting: AttainSetting = "outpatient";
    const baseline = defaultBaseline(setting);
    const accessVals = mergedValues(accessAlignConfig, baseline, setting);
    const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
    const valuesByGoal = { access: accessVals, retention: retentionVals };

    // All to access (split 100): retention gets none of the hour.
    const allAccess = computeMultiGoalContributions(["access", "retention"], setting, baseline, valuesByGoal, 100);
    expect(allAccess.byGoal.retention!.totalMargin).toBeCloseTo(0, 5);
    expect(proofValue(workforceAlignConfig, retentionVals, baseline, setting, 0)).toBeCloseTo(0, 5);

    // All to retention (split 0): access gets none of the hour.
    const allRetention = computeMultiGoalContributions(["access", "retention"], setting, baseline, valuesByGoal, 0);
    expect(allRetention.byGoal.access!.totalMargin).toBeCloseTo(0, 5);
    expect(proofValue(accessAlignConfig, accessVals, baseline, setting, 0)).toBeCloseTo(0, 5);
  });

  it("nursing Retention + Capacity (no access): additive, no split, and each block reconciles to its engine subtotal", () => {
    const setting: AttainSetting = "nursing";
    const baseline = defaultBaseline(setting);
    const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
    const capacityVals = mergedValues(capacityAlignConfig, baseline, setting);
    const valuesByGoal = { retention: retentionVals, capacity: capacityVals };

    const combined = computeMultiGoalContributions(["retention", "capacity"], setting, baseline, valuesByGoal);
    expect(combined.combinedMargin).toBeGreaterThan(0);

    // No shared-hour pair present, so both blocks carry share = 1.
    const retentionProof = proofValue(workforceAlignConfig, retentionVals, baseline, setting, 1);
    const capacityProof = proofValue(capacityAlignConfig, capacityVals, baseline, setting, 1);
    expect(Math.abs(retentionProof - combined.byGoal.retention!.totalMargin)).toBeLessThan(1);
    expect(Math.abs(capacityProof - combined.byGoal.capacity!.totalMargin)).toBeLessThan(1);

    // Combined header = sum counted once, and equals each goal computed alone
    // (genuinely additive, no split adjustment).
    expect(combined.combinedMargin).toBeCloseTo(
      combined.byGoal.retention!.totalMargin + combined.byGoal.capacity!.totalMargin,
      5,
    );
    const retentionAlone = computeMultiGoalContributions(["retention"], setting, baseline, { retention: retentionVals }).combinedMargin;
    const capacityAlone = computeMultiGoalContributions(["capacity"], setting, baseline, { capacity: capacityVals }).combinedMargin;
    expect(combined.combinedMargin).toBeCloseTo(retentionAlone + capacityAlone, 5);
  });
});
