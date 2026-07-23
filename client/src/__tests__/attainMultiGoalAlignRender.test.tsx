import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import StepMultiBuildCase from "@/pages/attain/steps/StepMultiBuildCase";
import { alignConfigFor } from "@/pages/attain/steps/AlignSurface";
import {
  computeMultiGoalContributions,
  defaultBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { accessAlignConfig } from "@/lib/attain/accessAlign";
import { revenueAlignConfigFor } from "@/lib/attain/revenueAlign";
import type { AlignConfig, AlignContext } from "@/lib/attain/alignFramework";
import type { AttainSetting } from "@/lib/attain/attainTypes";

/**
 * The stacked multi-goal Align renders one Align block per selected goal under
 * a single combined header — the multi-goal "Build the case" surface, mirroring
 * how multi-goal Planning stacks one block per priority. Rendered to static
 * markup (the same harness AttainmentCurve's tests use); we assert structure,
 * not animated values.
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

describe("StepMultiBuildCase — stacked multi-goal Align", () => {
  const setting: AttainSetting = "outpatient";
  const baseline = defaultBaseline(setting);
  const goals = ["access", "revenue"] as const;
  const accessVals = mergedValues(accessAlignConfig, baseline, setting);
  const revenueVals = mergedValues(revenueAlignConfigFor(setting), baseline, setting);
  const valuesByGoal = { access: accessVals, revenue: revenueVals };
  const combined = computeMultiGoalContributions([...goals], setting, baseline, valuesByGoal, 50);

  const html = renderToStaticMarkup(
    createElement(StepMultiBuildCase, {
      setting,
      baseline,
      goals: [...goals],
      valuesByGoal,
      combined,
      freedTimeSplit: 50,
      onChangeFreedTimeSplit: () => {},
      realizationByGoal: {},
      onChangeRealization: () => {},
      onChangeLeverValue: () => {},
      stepNumber: 4,
      totalSteps: 6,
    }),
  );

  it("shows one combined header, not a per-goal or old-ladder header", () => {
    expect(html).toContain('data-testid="section-attain-multi-align"');
    expect(html).toContain('data-testid="card-multi-align-header"');
    expect(html).toContain('data-testid="text-multi-align-combined-prize"');
    // The step title is Align, not the old "Build the case" ladder.
    expect(html).toContain("Align");
  });

  it("renders one Align block per selected goal", () => {
    expect(html).toContain('data-testid="section-multi-align-priority-access"');
    expect(html).toContain('data-testid="section-multi-align-priority-revenue"');
    expect(html).toContain('data-testid="text-multi-align-priority-title-access"');
    expect(html).toContain('data-testid="text-multi-align-priority-title-revenue"');
    // Each block is a full Align surface (AlignStep renders this section id).
    const alignSections = html.split('data-testid="section-attain-align"').length - 1;
    expect(alignSections).toBe(2);
  });

  it("resolves an Align config for every goal + setting (no goal falls back to the old ladder)", () => {
    expect(alignConfigFor("access", "outpatient")).not.toBeNull();
    expect(alignConfigFor("revenue", "outpatient")).not.toBeNull();
    expect(alignConfigFor("retention", "nursing")).not.toBeNull();
    expect(alignConfigFor("quality", "nursing")).not.toBeNull();
    expect(alignConfigFor("capacity", "nursing")).not.toBeNull();
    // ED access now has its own ED-flavored Align config on the shared AlignStep.
    expect(alignConfigFor("access", "ed")).not.toBeNull();
    expect(alignConfigFor("access", "ed")!.goal).toBe("access");
  });
});
