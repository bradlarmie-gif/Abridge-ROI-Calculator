import { describe, it, expect } from "vitest";
import {
  computeMultiGoalContributions,
  defaultLeverValues,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import type { AttainState, AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import type { Commitment, GoalOwner } from "@/pages/attain/steps/StepCommit";
import { buildAttainPdfData, AttainPDFDocument } from "@/lib/attain/attain-pdf";

/**
 * Reconciliation guardrail for the Attain "Download PDF" export.
 *
 * Mirrors `exploreNarrativePdfReconciliation.test.ts` / `nursingPdfReconciliation.test.ts`:
 * the PDF must never show a headline dollar figure that was computed a
 * different way than the app's own engine (`computeMultiGoalContributions`,
 * the same function `AttainFlow.tsx` calls to build `combined`/`target`).
 *
 * Strategy: build a synthetic plan (setting/goals/baseline/lever values),
 * call the engine directly to get the real combined contribution margin,
 * then (1) assert `buildAttainPdfData`'s own headline field matches it
 * exactly, and (2) render the actual `<AttainPDFDocument>` element tree,
 * walk it for printed text, and reconcile the PRINTED "$xxxK"-style figure
 * back to a number within tolerance — so a future change that hardcodes or
 * re-derives the hero number a different way breaks this test.
 */

// react-pdf primitives are string-typed elements ("DOCUMENT"/"PAGE"/"TEXT"/…);
// custom presentation components are plain functions (no hooks used in this
// PDF). Recursively invoke them so render-time logic actually executes and
// every printed string is collected — same technique as
// `appRationalizationPdfSmoke.test.tsx`.
function collectText(node: unknown, out: string[]): void {
  if (node == null || node === false || node === true) return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return;
  }
  const el = node as { type?: unknown; props?: { children?: unknown } };
  if (!el.type) return;
  if (typeof el.type === "function") {
    collectText((el.type as (p: unknown) => unknown)(el.props ?? {}), out);
    return;
  }
  collectText(el.props?.children, out);
}

/** Reverses `formatCompact`-style PDF text ("$760K", "$1.2M", "$4,300") back
 * into a number, so the printed hero figure can be reconciled against the
 * engine's raw dollar value. */
function parseCompactDollar(text: string): number {
  const m = text.match(/\$([\d,.]+)\s*(K|M|B)?/i);
  if (!m) throw new Error(`parseCompactDollar: no dollar figure found in "${text}"`);
  const n = Number(m[1].replace(/,/g, ""));
  const suffix = m[2]?.toUpperCase();
  if (suffix === "B") return n * 1_000_000_000;
  if (suffix === "M") return n * 1_000_000;
  if (suffix === "K") return n * 1_000;
  return n;
}

function tolerance(value: number): number {
  return Math.max(50, Math.abs(value) * 0.01);
}

const baseState: AttainState = {
  setting: "outpatient",
  goal: "access",
  scope: { unitCount: 40, serviceLines: ["Cardiology"] },
  ambitionKey: "typical",
  monthsElapsed: 6,
  totalMonths: 9,
  progressRatio: 0.9,
};

const baseline: AttainBaseline = {
  providers: 40,
  annualEncounters: 40 * 3_500,
  utilizationPct: 70,
};

function accessValues(): LeverValues {
  return {
    ...defaultLeverValues("access", "outpatient"),
    accessProviders: 30,
    accessMargin: 220,
    accessFreedShare: 55,
    accessDemandBacklog: 1_900,
    accessDemandSameDayPct: 15,
    accessDemandNoShowPct: 10,
    accessDemandNewReferrals: 120,
  };
}

function revenueValues(): LeverValues {
  return {
    ...defaultLeverValues("revenue", "outpatient"),
    revenueHccRecapture: 5,
    revenueHccNetNew: 4,
    revenueHccValuePerHcc: 3_200,
    revenueEmLift: 6,
    revenueEmConversionFactor: 45,
    revenueDenialsPreventable: 40,
    revenueDenialsAvgClaimValue: 1_800,
  };
}

const target: GoalTargetResult = { count: 0, margin: 0, label: "" };
const attainment: AttainmentResult = { pct: 61, onPacePct: 65, marginToDate: 0 };
const commitments: Record<string, Commitment> = {};
const goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>> = {
  access: { name: "Dr. A. Rivera", title: "CMO" },
};

describe("Attain PDF reconciliation — engine math vs. printed headline", () => {
  it("single priority (access): PDF data headline matches the engine's combined margin exactly", () => {
    const goals: GoalId[] = ["access"];
    const valuesByGoal = { access: accessValues() };
    const combined = computeMultiGoalContributions(goals, "outpatient", baseline, valuesByGoal, 50);

    const data = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: combined.combinedMargin, count: combined.combinedCount },
      attainment,
      valuesByGoal,
      combined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      orgName: "Meridian Health System",
    });

    expect(combined.combinedMargin).toBeGreaterThan(0);
    expect(data.combinedMargin).toBe(combined.combinedMargin);
  });

  it("single priority (access): the rendered PDF's headline dollar figure reconciles to the engine total", () => {
    const goals: GoalId[] = ["access"];
    const valuesByGoal = { access: accessValues() };
    const combined = computeMultiGoalContributions(goals, "outpatient", baseline, valuesByGoal, 50);

    const data = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: combined.combinedMargin, count: combined.combinedCount },
      attainment,
      valuesByGoal,
      combined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      orgName: "Meridian Health System",
    });

    const out: string[] = [];
    collectText(AttainPDFDocument({ data }), out);
    const text = out.join(" | ");

    // The cover's headline hero figure is printed as its own compact dollar
    // token (data.combinedMarginLabel, e.g. "$493K") — assert it is present
    // verbatim, then reconcile it back to a number against the engine.
    expect(text).toContain(data.combinedMarginLabel);
    const printed = parseCompactDollar(data.combinedMarginLabel);
    const diff = Math.abs(printed - combined.combinedMargin);
    expect(
      diff <= tolerance(combined.combinedMargin),
      `Attain PDF headline no longer reconciles to the engine:\n` +
        `  printed:  ${data.combinedMarginLabel} (${printed})\n` +
        `  engine:   ${combined.combinedMargin}\n` +
        `  abs diff: ${diff}`,
    ).toBe(true);
  });

  it("billion-scale plan: the printed headline is a normal-looking '$X.XXB' figure, not a 4+ digit number in front of 'M', and still reconciles to the engine", () => {
    // A huge baseline (deliberately unrealistic, matching the matrix stress
    // test's "very LARGE dollar figures" case) pushes the combined margin
    // past $1B — `formatCompact`'s billions branch exists so this prints
    // "$X.XXB", not the "$1150.6M"-style 4-digit-before-the-suffix figure
    // that shipped before this fix.
    const hugeBaseline: AttainBaseline = { providers: 2_000, annualEncounters: 2_000 * 5_200, utilizationPct: 95 };
    const goals: GoalId[] = ["access"];
    const valuesByGoal = {
      access: {
        ...defaultLeverValues("access", "outpatient"),
        accessProviders: 2_000,
        accessMargin: 2_000,
        accessFreedShare: 100,
        accessDemandBacklog: 10_000,
        accessDemandSameDayPct: 100,
        accessDemandNoShowPct: 100,
        accessDemandNewReferrals: 1_000,
      },
    };
    const combined = computeMultiGoalContributions(goals, "outpatient", hugeBaseline, valuesByGoal, 50);
    expect(combined.combinedMargin).toBeGreaterThan(1_000_000_000); // sanity: this fixture really is billion-scale

    const data = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: combined.combinedMargin, count: combined.combinedCount },
      attainment,
      valuesByGoal,
      combined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      orgName: "Meridian Health System",
    });

    expect(data.combinedMarginLabel).toMatch(/^\$\d+(\.\d{1,2})?B$/);

    const out: string[] = [];
    collectText(AttainPDFDocument({ data }), out);
    const text = out.join(" | ");
    expect(text).toContain(data.combinedMarginLabel);

    const printed = parseCompactDollar(data.combinedMarginLabel);
    const diff = Math.abs(printed - combined.combinedMargin);
    expect(
      diff <= tolerance(combined.combinedMargin),
      `Attain PDF billion-scale headline no longer reconciles:\n` +
        `  printed:  ${data.combinedMarginLabel} (${printed})\n` +
        `  engine:   ${combined.combinedMargin}\n` +
        `  abs diff: ${diff}`,
    ).toBe(true);
  });

  it("multi-priority (access + revenue): combined margin is the exact sum of each goal's own engine total, and the PDF renders a section per priority", () => {
    const goals: GoalId[] = ["access", "revenue"];
    const valuesByGoal = { access: accessValues(), revenue: revenueValues() };
    const combined = computeMultiGoalContributions(goals, "outpatient", baseline, valuesByGoal, 50);

    const accessOnly = computeMultiGoalContributions(["access"], "outpatient", baseline, valuesByGoal, 50);
    const revenueOnly = computeMultiGoalContributions(["revenue"], "outpatient", baseline, valuesByGoal, 50);
    // access/revenue never share a mechanism (only access+retention do), so
    // the combined total must be an exact, unscaled sum of the two.
    expect(combined.combinedMargin).toBeCloseTo(accessOnly.combinedMargin + revenueOnly.combinedMargin, 5);

    const data = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: combined.combinedMargin, count: combined.combinedCount },
      attainment,
      valuesByGoal,
      combined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      orgName: "Meridian Health System",
    });

    expect(data.combinedMargin).toBe(combined.combinedMargin);
    expect(data.priorities).toHaveLength(2);
    expect(data.priorities.map((p) => p.goal)).toEqual(["access", "revenue"]);
    // Each priority's own margin must sum back to the combined headline —
    // the multi-priority breakdown can never silently drift from the total
    // it is supposed to be breaking down.
    const prioritySum = data.priorities.reduce((sum, p) => sum + p.margin, 0);
    expect(prioritySum).toBeCloseTo(data.combinedMargin, 2);

    const out: string[] = [];
    collectText(AttainPDFDocument({ data }), out);
    const text = out.join(" | ");
    expect(text).toContain("Patient Access");
    expect(text).toContain("Revenue Capture");
  });

  it("realization: prints an 'Attributed at N% realization' footnote on a priority's Starting Point page only when that priority's rate is below 100, and the headline stays the already-realized figure", () => {
    const goals: GoalId[] = ["access"];
    const valuesByGoal = { access: accessValues() };

    const fullCombined = computeMultiGoalContributions(goals, "outpatient", baseline, valuesByGoal, 50, { access: 100 });
    const partialCombined = computeMultiGoalContributions(goals, "outpatient", baseline, valuesByGoal, 50, { access: 70 });
    // Sanity: realization actually changed the number this test depends on.
    expect(partialCombined.combinedMargin).toBeCloseTo(fullCombined.combinedMargin * 0.7, 0);

    const fullData = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: fullCombined.combinedMargin, count: fullCombined.combinedCount },
      attainment,
      valuesByGoal,
      combined: fullCombined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      realizationByGoal: { access: 100 },
      orgName: "Meridian Health System",
    });
    const partialData = buildAttainPdfData({
      state: baseState,
      setting: "outpatient",
      goals,
      target: { ...target, margin: partialCombined.combinedMargin, count: partialCombined.combinedCount },
      attainment,
      valuesByGoal,
      combined: partialCombined,
      commitments,
      goalOwnerByPriority,
      freedTimeSplit: 50,
      realizationByGoal: { access: 70 },
      orgName: "Meridian Health System",
    });

    // The headline is already the realized figure - no separate scaling
    // needed inside the PDF, it just reads combined straight through.
    expect(partialData.combinedMargin).toBeCloseTo(fullData.combinedMargin * 0.7, 0);
    expect(partialData.priorities[0].realizationPct).toBe(70);
    expect(fullData.priorities[0].realizationPct).toBe(100);

    const fullOut: string[] = [];
    collectText(AttainPDFDocument({ data: fullData }), fullOut);
    const fullText = fullOut.join(" | ");
    expect(fullText).not.toContain("realization");

    const partialOut: string[] = [];
    collectText(AttainPDFDocument({ data: partialData }), partialOut);
    const partialText = partialOut.join(" | ");
    expect(partialText).toContain("Attributed at 70% realization");
  });

  it("degrades gracefully when a priority has no setting/goal content (e.g. an unsupported combination)", () => {
    const goals: GoalId[] = ["access"];
    const valuesByGoal = { access: accessValues() };
    const combined = computeMultiGoalContributions(goals, "nursing", {}, valuesByGoal, 50);

    // nursing has no "access" content in the catalog (see CONTENT in
    // attainGoals.ts) — the PDF must not throw, it must just omit the
    // per-setting narrative copy for that priority.
    expect(() =>
      buildAttainPdfData({
        state: { ...baseState, setting: "nursing" },
        setting: "nursing",
        goals,
        target: { ...target, margin: combined.combinedMargin, count: combined.combinedCount },
        attainment,
        valuesByGoal,
        combined,
        commitments,
        goalOwnerByPriority: {},
        freedTimeSplit: 50,
        orgName: "Test Health System",
      }),
    ).not.toThrow();
  });
});
