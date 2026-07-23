import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import StepMultiMeasurementPlan, { type MeasurementGoal } from "@/pages/attain/steps/StepMultiMeasurementPlan";
import StepAttainment from "@/pages/attain/steps/StepAttainment";
import { deriveMeasurementModelFor } from "@/pages/attain/steps/MeasurementPlanSurface";
import { DEFAULT_ATTAIN_STATE } from "@/lib/attain/attainTypes";
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
import {
  qualityAlignToLeverValues,
  K_EVENTS,
  K_WHO,
  K_GATE,
  K_CHANGE,
  K_PROOF,
  CLINICAL_EVENT_IDS,
  HCAHPS_ID,
  QUALITY_CONVERSIONS,
} from "@/lib/attain/qualityAlign";
import { fmtMoneyCompact } from "@/pages/attain/steps/accessLadder";
import { DEFAULT_PLAN_CADENCE } from "@/pages/attain/steps/StepCommit";
import type { AlignConfig, AlignContext } from "@/lib/attain/alignFramework";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { AttainSetting } from "@/lib/attain/attainTypes";

/** A fully-committed quality plan: every clinical event + HCAHPS selected, the
 * honest gate at "earlier" (full credit), and every named conversion
 * committed - the real Align RAW-CHOICE shape (`qualityAlignEvents`,
 * `qualityAlignGate__<id>`, `qualityAlignChange__<id>`, ...) merged with the
 * engine fields `qualityAlignToLeverValues` derives from it, exactly the way
 * `attainMeasurementQuality.test.ts`'s own `alignValues` helper does. Quality's
 * COUNT (harm events prevented) only resolves off this raw-choice shape - the
 * lower-level engine-only shape (intervention ids alone) leaves `chosenEvents`
 * empty and the count reads as "count pending", so this fixture is required
 * for the count-leads assertions below to be real. */
function fullQualityValues(baseline: AttainBaseline, setting: AttainSetting): LeverValues {
  const ctx: AlignContext = { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 };
  const choices: LeverValues = {
    [K_EVENTS]: [...CLINICAL_EVENT_IDS, HCAHPS_ID],
    [K_WHO]: ["all"],
    [K_PROOF]: ["rate", "compliance", "hcahps"],
  };
  for (const id of CLINICAL_EVENT_IDS) {
    choices[`${K_GATE}__${id}`] = ["earlier"];
    choices[`${K_CHANGE}__${id}`] = QUALITY_CONVERSIONS[id].map((c) => c.id);
  }
  choices[`${K_CHANGE}__${HCAHPS_ID}`] = QUALITY_CONVERSIONS[HCAHPS_ID].map((c) => c.id);
  return { ...choices, ...qualityAlignToLeverValues(choices, ctx) };
}

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

describe("multi-goal Plan header — quality's soft dollar is never folded into the hard contribution-margin total", () => {
  // Nursing legally pairs quality + retention (see SETTING_GOAL_MATRIX) - the
  // same real-world combo attainLevers.test.ts's own multi-goal quality tests
  // use. Quality is fully committed so its soft dollar is genuinely nonzero;
  // if the header still summed it into "contribution margin", this fixture
  // would catch it.
  const setting: AttainSetting = "nursing";
  const baseline = defaultBaseline(setting);
  const retentionVals = mergedValues(workforceAlignConfig, baseline, setting);
  const qualityVals = fullQualityValues(baseline, setting);
  const goals: MeasurementGoal[] = ["retention", "quality"];
  const valuesByGoal = { retention: retentionVals, quality: qualityVals };
  const combined = computeMultiGoalContributions(goals, setting, baseline, valuesByGoal, 50);
  const qualityMargin = combined.byGoal.quality?.totalMargin ?? 0;
  const hardMargin = combined.combinedMargin - qualityMargin;

  it("the fixture is real: quality contributes a genuine nonzero soft dollar, distinct from the hard total", () => {
    expect(qualityMargin).toBeGreaterThan(0);
    expect(hardMargin).toBeLessThan(combined.combinedMargin);
    // Guards the DOM assertion below from being a false positive if the two
    // figures ever happened to format to the same compact string.
    expect(fmtMoneyCompact(hardMargin)).not.toBe(fmtMoneyCompact(combined.combinedMargin));
  });

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

  it("the header's contribution-margin figure is the HARD margin (retention only), not the full combinedMargin", () => {
    expect(html).toContain('data-testid="text-multi-plan-combined-prize"');
    expect(html).toContain(fmtMoneyCompact(hardMargin));
  });

  it("quality's count + soft dollar render in their own labeled block, never claimed as contribution margin", () => {
    expect(html).toContain('data-testid="text-multi-plan-quality-soft"');
    expect(html).toContain('data-testid="text-multi-plan-quality-soft-count"');
    expect(html).toContain('data-testid="text-multi-plan-quality-soft-dollar"');
    expect(html).toContain("not contribution margin");
    // The soft block leads with a COUNT (harm events), not a dollar sign.
    const model = deriveMeasurementModelFor("quality", setting, baseline, qualityVals, combined, 1);
    // A real count, e.g. "~12 harm events / yr" - never the "count pending"
    // placeholder, which would mean this fixture failed to register any
    // chosen event (the bug this test is guarding against).
    expect(model.safetyHeadline?.heroValue).toMatch(/harm events \/ yr/);
    expect(html).toContain(model.safetyHeadline!.heroValue);
  });
});

describe("Attainment hub — a quality-only plan leads with the COUNT, soft dollar stays out of any hard total (QA fix)", () => {
  const setting: AttainSetting = "nursing";
  const baseline = defaultBaseline(setting);
  const qualityVals = fullQualityValues(baseline, setting);
  const goals: MeasurementGoal[] = ["quality"];
  const valuesByGoal = { quality: qualityVals };
  const combined = computeMultiGoalContributions([...goals], setting, baseline, valuesByGoal, 100);
  const qualityMargin = combined.byGoal.quality?.totalMargin ?? 0;
  const qualityCount = combined.byGoal.quality?.totalCount ?? 0;
  const model = deriveMeasurementModelFor("quality", setting, baseline, qualityVals, combined, 1);

  it("fixture is real: quality carries a genuine nonzero soft dollar and a real harm-events count", () => {
    expect(qualityMargin).toBeGreaterThan(0);
    expect(qualityCount).toBeGreaterThan(0);
    expect(model.safetyHeadline?.heroValue).toMatch(/harm events \/ yr/);
  });

  const props = {
    state: { ...DEFAULT_ATTAIN_STATE, setting, goal: "quality", scope: { unitCount: 180, serviceLines: [] }, totalMonths: 9, monthsElapsed: 3 },
    setting,
    goals: [...goals],
    baseline,
    planning: {} as AttainPlanning,
    target: { count: qualityCount, margin: qualityMargin, label: "harm events prevented" },
    attainment: { pct: 0, onPacePct: 0, marginToDate: 0 },
    valuesByGoal,
    combined,
    commitments: {},
    goalOwnerByPriority: {},
    planCadence: DEFAULT_PLAN_CADENCE,
    freedTimeSplit: 100,
    realizationByGoal: {},
    progressEntries: {},
    onLogProgressUpdate: noop,
    onMonthsElapsedChange: noop,
    stepNumber: 5,
    onSave: async () => null,
  };
  const html = renderToStaticMarkup(createElement(StepAttainment as never, props as never));

  it("the outcome headline leads with the harm-events COUNT, never the soft dollar as a 'combined margin'", () => {
    expect(html).toContain('data-testid="text-attain-glance-outcome"');
    // The lead line is the safety count itself (e.g. "~22 harm events / yr"),
    // not a dollar dressed up as a hard contribution-margin total.
    expect(html).toContain(model.safetyHeadline!.heroValue);
    expect(html).not.toContain("Combined contribution margin");
    expect(html).not.toContain("Combined margin");
  });

  it("the soft dollar renders in its own clearly-labeled block, and the hard total excludes it entirely", () => {
    expect(html).toContain('data-testid="text-attain-glance-quality-soft"');
    expect(html).toContain("Safety value, not contribution margin");
    // The hard contribution margin for a quality-only plan is target.margin minus
    // quality's soft dollar == 0: the soft dollar is never folded into a hard total.
    expect(combined.combinedMargin - qualityMargin).toBeCloseTo(0, 6);
  });
});
