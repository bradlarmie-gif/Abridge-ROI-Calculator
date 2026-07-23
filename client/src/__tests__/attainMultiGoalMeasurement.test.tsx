import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import StepMultiMeasurementPlan, { type MeasurementGoal } from "@/pages/attain/steps/StepMultiMeasurementPlan";
import { deriveMeasurementModelFor } from "@/pages/attain/steps/MeasurementPlanSurface";
import {
  computeMultiGoalContributions,
  defaultBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { computeAccessContributions } from "@/lib/attain/attainAccess";
import { computeWorkforceContributions } from "@/lib/attain/attainWorkforce";
import {
  measurementChosen,
  measurementOwner,
  measurementPlanningFor,
  type AttainPlanning,
} from "@/lib/attain/attainPlanning";
import { accessAlignConfig } from "@/lib/attain/accessAlign";
import { workforceAlignConfig } from "@/lib/attain/workforceAlign";
import { revenueAlignConfigFor } from "@/lib/attain/revenueAlign";
import { DEFAULT_PLAN_CADENCE } from "@/pages/attain/steps/StepCommit";
import type { AlignConfig, AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

/**
 * The stacked multi-goal Plan renders each selected goal's MEASUREMENT plan
 * (the same per-goal MeasurementPlanSurface the single-goal Plan uses), stacked
 * under one combined header, mirroring the multi-goal Align surface. Rendered to
 * static markup (the same harness the multi-goal Align render test uses); we
 * assert structure, not animated values.
 */

function fullSelections(config: AlignConfig): LeverValues {
  const sel: LeverValues = {};
  for (const q of config.questions) {
    if (q.stacksOnQuestionId) continue;
    sel[q.storeKey] = q.mode === "single" ? [q.options[0].id] : q.options.map((o) => o.id);
  }
  return sel;
}

function mergedValues(config: AlignConfig, baseline: ReturnType<typeof defaultBaseline>, setting: AttainSetting): LeverValues {
  const sel = fullSelections(config);
  const ctx: AlignContext = { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
  return { ...sel, ...config.toLeverValues(sel, ctx) };
}

const noop = () => {};

describe("StepMultiMeasurementPlan — stacked multi-goal measurement plan", () => {
  const setting: AttainSetting = "outpatient";
  const baseline = defaultBaseline(setting);
  const goals: MeasurementGoal[] = ["access", "revenue"];
  const accessVals = mergedValues(accessAlignConfig, baseline, setting);
  const revenueVals = mergedValues(revenueAlignConfigFor(setting), baseline, setting);
  const valuesByGoal = { access: accessVals, revenue: revenueVals };
  const combined = computeMultiGoalContributions([...goals], setting, baseline, valuesByGoal, 50);

  const html = renderToStaticMarkup(
    createElement(StepMultiMeasurementPlan, {
      setting,
      baseline,
      goals,
      valuesByGoal,
      combined,
      freedTimeSplit: 50,
      onChangeFreedTimeSplit: noop,
      planning: {} as AttainPlanning,
      goalOwnerByPriority: {},
      onChangeGoalOwner: noop,
      onSetChosenMetrics: noop,
      onChangeMetricField: noop,
      onChangePromiseByWhen: noop,
      onChangeCommitment: noop,
      onChangePartnerRisk: noop,
      planCadence: DEFAULT_PLAN_CADENCE,
      onChangePlanCadence: noop,
      stepNumber: 5,
    }),
  );

  it("shows one combined header, not the old phased planning header", () => {
    expect(html).toContain('data-testid="section-attain-multi-plan"');
    expect(html).toContain('data-testid="card-multi-plan-header"');
    expect(html).toContain('data-testid="text-multi-plan-combined-prize"');
    // NOT the old phased multi-planning surface.
    expect(html).not.toContain('data-testid="card-multi-planning-header"');
    expect(html).not.toContain('data-testid="section-multi-planning-priority-access"');
  });

  it("renders one MEASUREMENT-plan block per selected goal (its full chain, not a phased ladder)", () => {
    expect(html).toContain('data-testid="section-multi-plan-priority-access"');
    expect(html).toContain('data-testid="section-multi-plan-priority-revenue"');
    // Each block is a full measurement surface: its own promise + chain.
    expect(html).toContain('data-testid="card-measure-promise-access"');
    expect(html).toContain('data-testid="card-measure-promise-revenue"');
    expect(html).toContain('data-testid="section-measure-chain-access"');
    expect(html).toContain('data-testid="section-measure-chain-revenue"');
    const promiseBlocks = html.split("data-testid=\"card-measure-promise-").length - 1;
    expect(promiseBlocks).toBe(2);
  });

  it("leaves every promise date and metric owner BLANK", () => {
    // The promise date input carries no value attribute (blank).
    expect(html).toContain('data-testid="input-measure-promise-date-access"');
    expect(html).not.toMatch(/data-testid="input-measure-promise-date-access"[^>]*value="[^"]/);
    // No metric-owner input is pre-filled either.
    expect(html).not.toMatch(/data-testid="input-measure-owner-[a-z0-9-]+"[^>]*value="[^"]/);
  });
});

describe("multi-goal measurement — combined prize is the sum, counted once", () => {
  const setting: AttainSetting = "outpatient";
  const baseline = defaultBaseline(setting);
  const accessVals = mergedValues(accessAlignConfig, baseline, setting);
  const revenueVals = mergedValues(revenueAlignConfigFor(setting), baseline, setting);
  const valuesByGoal = { access: accessVals, revenue: revenueVals };
  const combined = computeMultiGoalContributions(["access", "revenue"], setting, baseline, valuesByGoal, 50);

  it("combinedMargin equals the exact sum of each goal's own margin", () => {
    const sum = (combined.byGoal.access?.totalMargin ?? 0) + (combined.byGoal.revenue?.totalMargin ?? 0);
    expect(combined.combinedMargin).toBe(sum);
  });

  it("each block's promise prize reconciles to its combined byGoal margin", () => {
    const accessModel = deriveMeasurementModelFor("access", setting, baseline, accessVals, combined, 1);
    const revenueModel = deriveMeasurementModelFor("revenue", setting, baseline, revenueVals, combined, 1);
    expect(Math.round(accessModel.prize)).toBe(Math.round(combined.byGoal.access?.totalMargin ?? 0));
    expect(Math.round(revenueModel.prize)).toBe(Math.round(combined.byGoal.revenue?.totalMargin ?? 0));
  });
});

describe("multi-goal measurement — access + retention split reconciles, no double count", () => {
  const setting: AttainSetting = "outpatient";
  const baseline = defaultBaseline(setting);
  const accessVals = mergedValues(accessAlignConfig, baseline, setting);
  const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
  const valuesByGoal = { access: accessVals, retention: retentionVals };
  const split = 50;
  const combined = computeMultiGoalContributions(["access", "retention"], setting, baseline, valuesByGoal, split);

  it("the shared freed hour is split, so the pair sums to LESS than crediting each goal the full hour", () => {
    const fullAccess = computeAccessContributions(baseline, accessVals, 1).totalMargin;
    const fullRetention = computeWorkforceContributions(baseline, setting, retentionVals, 1).totalMargin;
    // Both goals draw on the same hour, so at least one is > 0 to make the
    // double-count real, and the split total must be strictly below the naive
    // sum that would count the hour twice.
    expect(fullAccess + fullRetention).toBeGreaterThan(0);
    expect(combined.combinedMargin).toBeLessThan(fullAccess + fullRetention);
  });

  it("each block's derived prize uses its freed-hour share, and the two shares sum to the combined prize", () => {
    const accessShare = split / 100;
    const accessModel = deriveMeasurementModelFor("access", setting, baseline, accessVals, combined, accessShare);
    const retentionModel = deriveMeasurementModelFor("retention", setting, baseline, retentionVals, combined, 1 - accessShare);
    const sum = Math.round(accessModel.prize) + Math.round(retentionModel.prize);
    expect(sum).toBe(Math.round(combined.combinedMargin));
  });
});

describe("multi-goal measurement — per-goal selections persist without colliding", () => {
  it("each goal reads its own chosen metrics off measurementByGoal, even for a shared metric id", () => {
    // access and retention both expose a `minutes-saved-per-note` metric id; the
    // per-goal layer must keep the two goals' picks separate.
    const planning: AttainPlanning = {
      measurementByGoal: {
        access: { chosen: { minutes: ["freed-hours-per-provider"] }, entries: { "minutes-saved-per-note": { owner: "Dr. Access" } } },
        retention: { chosen: { charting: ["minutes-saved-per-note"] }, entries: { "minutes-saved-per-note": { owner: "Dr. Retention" } } },
      },
    };
    const accessLayer = measurementPlanningFor(planning, "access");
    const retentionLayer = measurementPlanningFor(planning, "retention");

    expect(measurementChosen(accessLayer, "minutes", ["minutes-saved-per-note"])).toEqual(["freed-hours-per-provider"]);
    expect(measurementChosen(retentionLayer, "charting", ["minutes-saved-per-note"])).toEqual(["minutes-saved-per-note"]);
    // The shared metric id resolves to each goal's OWN owner, not one clobbering
    // the other.
    expect(measurementOwner(accessLayer, "minutes-saved-per-note")).toBe("Dr. Access");
    expect(measurementOwner(retentionLayer, "minutes-saved-per-note")).toBe("Dr. Retention");
  });

  it("a single-goal plan (no goal) still reads the top-level measurement layer", () => {
    const planning: AttainPlanning = { measurement: { chosen: { minutes: ["minutes-saved-per-note"] } } };
    const layer = measurementPlanningFor(planning);
    expect(measurementChosen(layer, "minutes", [])).toEqual(["minutes-saved-per-note"]);
  });
});
