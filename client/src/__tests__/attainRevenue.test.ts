import { describe, it, expect } from "vitest";
import {
  computeHccChain,
  computeEmChain,
  computeDenialsChain,
  computeRevenueChain,
  computeRevenueContributions,
  exploreStateForReconciliation,
  computeAllDriverValues,
  selectedPaths,
  pathsAvailableFor,
  REVENUE_PATH_LABELS,
  REVENUE_LEVER_IDS,
} from "@/lib/attain/attainRevenue";
import {
  LEVERS,
  leversFor,
  defaultLeverValues,
  computeLeverContributions,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";

const BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 2_300, utilizationPct: 100 };
const ED_BASELINE: AttainBaseline = { providers: 40, annualEncounters: 40 * 1_700, utilizationPct: 100 };

// A fully-decided HCC plan: two populations in scope, both recapture and
// net-new committed, a real price.
function hccValues(): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.hcc],
    revenueHccPopulations: ["Medicare Advantage", "Medicaid MCO"],
    revenueHccGapRate: 65,
    revenueHccCurrentRecapture: 65,
    revenueHccRecapture: 8,
    revenueHccAvgHccs: 0.5,
    revenueHccNetNew: 5,
    revenueHccAvgNetNewConditions: 1.2,
    revenueHccValuePerHcc: 1_500,
  };
}

function emValues(): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.em],
    revenueEmCurrentWrvu: 1.8,
    revenueEmLift: 6,
    revenueEmConversionFactor: 40,
  };
}

function denialsValues(): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.denials],
    revenueDenialsRate: 4,
    revenueDenialsPreventable: 50,
    revenueDenialsAvgClaimValue: 900,
  };
}

describe("path selection", () => {
  it("outpatient offers all three paths, ED offers only E/M and Denials", () => {
    expect(pathsAvailableFor("outpatient")).toEqual(["hcc", "em", "denials"]);
    expect(pathsAvailableFor("ed")).toEqual(["em", "denials"]);
    expect(pathsAvailableFor("inpatient")).toEqual([]);
  });

  it("selectedPaths reads the raw revenuePaths chip labels back to path ids", () => {
    const values: LeverValues = { revenuePaths: [REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.denials] };
    expect(selectedPaths(values)).toEqual(["hcc", "denials"]);
  });

  it("no path selected means no dollar, even with every decision dialed up", () => {
    const values: LeverValues = { ...hccValues(), ...emValues(), ...denialsValues(), revenuePaths: [] };
    const chain = computeRevenueChain(BASELINE, "outpatient", values);
    expect(chain.paths).toEqual([]);
    expect(chain.totalValue).toBe(0);
  });
});

describe("PATH 1 - Risk Adjustment (HCC)", () => {
  it("no population selected means zero patients, zero dollars, even with recapture/discovery dialed up", () => {
    const values: LeverValues = { ...hccValues(), revenueHccPopulations: [] };
    const chain = computeHccChain(BASELINE, values);
    expect(chain.scope.totalPatients).toBe(0);
    expect(chain.payoff.value).toBe(0);
  });

  it("recapture alone (no net-new) still produces a real recapture dollar", () => {
    const values: LeverValues = { ...hccValues(), revenueHccNetNew: 0 };
    const chain = computeHccChain(BASELINE, values);
    expect(chain.recapture.recapturedHccs).toBeGreaterThan(0);
    expect(chain.netNew.netNewHccs).toBe(0);
    expect(chain.payoff.recaptureValue).toBeGreaterThan(0);
    expect(chain.payoff.netNewValue).toBe(0);
    expect(chain.payoff.value).toBe(chain.payoff.recaptureValue);
  });

  it("net-new alone (no recapture commitment) still produces a real net-new dollar", () => {
    const values: LeverValues = { ...hccValues(), revenueHccRecapture: 0 };
    const chain = computeHccChain(BASELINE, values);
    expect(chain.recapture.recapturedHccs).toBe(0);
    expect(chain.netNew.netNewHccs).toBeGreaterThan(0);
    expect(chain.payoff.recaptureValue).toBe(0);
    expect(chain.payoff.netNewValue).toBeGreaterThan(0);
  });

  it("recapture AND net-new both contribute, and the payoff is the exact sum of both (no double count, no smearing)", () => {
    const chain = computeHccChain(BASELINE, hccValues());
    expect(chain.recapture.recapturedHccs).toBeGreaterThan(0);
    expect(chain.netNew.netNewHccs).toBeGreaterThan(0);
    expect(chain.payoff.recaptureValue).toBeGreaterThan(0);
    expect(chain.payoff.netNewValue).toBeGreaterThan(0);
    expect(chain.payoff.value).toBe(chain.payoff.recaptureValue + chain.payoff.netNewValue);
  });

  it("turning up the recapture uplift commitment increases recaptured HCCs and the recapture dollar", () => {
    const low = computeHccChain(BASELINE, { ...hccValues(), revenueHccRecapture: 2 });
    const high = computeHccChain(BASELINE, { ...hccValues(), revenueHccRecapture: 10 });
    expect(high.recapture.recapturedHccs).toBeGreaterThan(low.recapture.recapturedHccs);
    expect(high.payoff.recaptureValue).toBeGreaterThan(low.payoff.recaptureValue);
  });

  it("turning up the discovery rate increases net-new HCCs and the net-new dollar", () => {
    const low = computeHccChain(BASELINE, { ...hccValues(), revenueHccNetNew: 1 });
    const high = computeHccChain(BASELINE, { ...hccValues(), revenueHccNetNew: 15 });
    expect(high.netNew.netNewHccs).toBeGreaterThan(low.netNew.netNewHccs);
    expect(high.payoff.netNewValue).toBeGreaterThan(low.payoff.netNewValue);
  });

  it("reconciles to Explore's hccPlans engine math within a small tolerance", () => {
    const values = hccValues();
    const chain = computeHccChain(BASELINE, values);
    const state = exploreStateForReconciliation(BASELINE, "outpatient", { ...values, revenuePaths: [REVENUE_PATH_LABELS.hcc] });
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.hccCapture).toBeGreaterThan(0);
    // Two independent roundings (recapture + net-new rounded separately vs
    // the engine's single round(totalGross)) can differ by at most a
    // couple dollars - well under 0.5% of a six-figure HCC value.
    expect(Math.abs(chain.payoff.value - engineValues.hccCapture)).toBeLessThan(Math.max(5, engineValues.hccCapture * 0.005));
  });
});

describe("PATH 2 - E/M Level Accuracy (wRVU)", () => {
  it("zero lift means zero dollars, even with a real conversion factor and current wRVU", () => {
    const chain = computeEmChain(BASELINE, "outpatient", { ...emValues(), revenueEmLift: 0 });
    expect(chain.wrvusCaptured).toBe(0);
    expect(chain.value).toBe(0);
  });

  it("turning up the lift increases wRVUs captured and the dollar value", () => {
    const low = computeEmChain(BASELINE, "outpatient", { ...emValues(), revenueEmLift: 2 });
    const high = computeEmChain(BASELINE, "outpatient", { ...emValues(), revenueEmLift: 12 });
    expect(high.wrvusCaptured).toBeGreaterThan(low.wrvusCaptured);
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("the conversion factor entry scales the dollar value without changing the wRVUs captured", () => {
    const low = computeEmChain(BASELINE, "outpatient", { ...emValues(), revenueEmConversionFactor: 20 });
    const high = computeEmChain(BASELINE, "outpatient", { ...emValues(), revenueEmConversionFactor: 60 });
    expect(high.wrvusCaptured).toBeCloseTo(low.wrvusCaptured, 5);
    expect(high.value).toBeGreaterThan(low.value);
    expect(high.value).toBeCloseTo(low.value * 3, -1); // 60/20 = 3x
  });

  it("reconciles to Explore's wrvu engine math (outpatient) within a small tolerance", () => {
    const values = emValues();
    const chain = computeEmChain(BASELINE, "outpatient", values);
    const state = exploreStateForReconciliation(BASELINE, "outpatient", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.wrvu).toBeGreaterThan(0);
    expect(chain.value).toBeCloseTo(engineValues.wrvu, -1);
  });

  it("reconciles to Explore's edEmLevel engine math (ED) within a small tolerance", () => {
    const values = emValues();
    const chain = computeEmChain(ED_BASELINE, "ed", values);
    const state = exploreStateForReconciliation(ED_BASELINE, "ed", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.edEmLevel).toBeGreaterThan(0);
    expect(chain.value).toBeCloseTo(engineValues.edEmLevel, -1);
  });
});

describe("PATH 3 - Medical Necessity Denials", () => {
  it("zero preventable share means zero dollars, even with a real denial rate and claim value", () => {
    const chain = computeDenialsChain(BASELINE, "outpatient", { ...denialsValues(), revenueDenialsPreventable: 0 });
    expect(chain.prevented).toBe(0);
    expect(chain.value).toBe(0);
  });

  it("turning up the preventable share increases denials prevented and the dollar value", () => {
    const low = computeDenialsChain(BASELINE, "outpatient", { ...denialsValues(), revenueDenialsPreventable: 10 });
    const high = computeDenialsChain(BASELINE, "outpatient", { ...denialsValues(), revenueDenialsPreventable: 80 });
    expect(high.prevented).toBeGreaterThan(low.prevented);
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("reconciles to Explore's denialPrevention engine math within a small tolerance", () => {
    const values = denialsValues();
    const chain = computeDenialsChain(BASELINE, "outpatient", values);
    const state = exploreStateForReconciliation(BASELINE, "outpatient", values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.denialPrevention).toBeGreaterThan(0);
    expect(chain.value).toBeCloseTo(engineValues.denialPrevention, -1);
  });
});

describe("paths add, never double-count", () => {
  it("choosing all three paths on outpatient sums exactly to each path's own value", () => {
    const values: LeverValues = {
      ...hccValues(),
      ...emValues(),
      ...denialsValues(),
      revenuePaths: [REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.denials],
    };
    const chain = computeRevenueChain(BASELINE, "outpatient", values);
    const hccAlone = computeHccChain(BASELINE, values).payoff.value;
    const emAlone = computeEmChain(BASELINE, "outpatient", values).value;
    const denialsAlone = computeDenialsChain(BASELINE, "outpatient", values).value;
    expect(chain.totalValue).toBe(hccAlone + emAlone + denialsAlone);
    expect(hccAlone).toBeGreaterThan(0);
    expect(emAlone).toBeGreaterThan(0);
    expect(denialsAlone).toBeGreaterThan(0);
  });

  it("HCC is force-excluded on ED even if selected (outpatient-only mechanism)", () => {
    const values: LeverValues = { ...hccValues(), ...emValues(), revenuePaths: [REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.em] };
    const chain = computeRevenueChain(ED_BASELINE, "ed", values);
    expect(chain.paths).toEqual(["em"]);
    expect(chain.hcc).toBeUndefined();
    expect(chain.totalValue).toBe(computeEmChain(ED_BASELINE, "ed", values).value);
  });

  it("deselecting a path zeroes its contribution even though its own decisions are still dialed up", () => {
    const values: LeverValues = { ...hccValues(), ...emValues(), revenuePaths: [REVENUE_PATH_LABELS.em] };
    const chain = computeRevenueChain(BASELINE, "outpatient", values);
    expect(chain.hcc).toBeUndefined();
    expect(chain.totalValue).toBe(computeEmChain(BASELINE, "outpatient", values).value);
  });
});

describe("computeRevenueContributions (LeverContributionsResult adapter)", () => {
  it("doing nothing new (no path selected) nets exactly $0", () => {
    const result = computeRevenueContributions(BASELINE, "outpatient", {});
    expect(result.totalMargin).toBe(0);
    expect(result.perLever).toHaveLength(REVENUE_LEVER_IDS.length);
  });

  it("HCC recapture and net-new rows each carry their own exact dollar, price rows carry zero", () => {
    const result = computeRevenueContributions(BASELINE, "outpatient", hccValues());
    const recapture = result.perLever.find((p) => p.id === "revenueHccRecapture")!;
    const netNew = result.perLever.find((p) => p.id === "revenueHccNetNew")!;
    const price = result.perLever.find((p) => p.id === "revenueHccValuePerHcc")!;
    expect(recapture.marginalMargin).toBeGreaterThan(0);
    expect(netNew.marginalMargin).toBeGreaterThan(0);
    expect(price.marginalMargin).toBe(0);
    expect(result.totalMargin).toBe(recapture.marginalMargin + netNew.marginalMargin);
  });

  it("every row carries a live, non-empty formula string with no em dash", () => {
    const values: LeverValues = { ...hccValues(), ...emValues(), ...denialsValues(), revenuePaths: [REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.denials] };
    const result = computeRevenueContributions(BASELINE, "outpatient", values);
    for (const row of result.perLever) {
      expect(row.formula.length).toBeGreaterThan(0);
      expect(row.formula).not.toContain("—");
    }
  });

  it("pctOfTotal is well-formed (no divide-by-zero blowup) whether or not anything is selected", () => {
    for (const values of [{}, hccValues()]) {
      const result = computeRevenueContributions(BASELINE, "outpatient", values);
      for (const row of result.perLever) {
        expect(Number.isFinite(row.pctOfTotal)).toBe(true);
      }
    }
  });
});

describe("computeLeverContributions dispatch (attainLevers.ts integration)", () => {
  it("goal revenue at outpatient/ED delegates to the three-path chain", () => {
    const result = computeLeverContributions("revenue", "outpatient", BASELINE, hccValues());
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.perLever.map((p) => p.id).sort()).toEqual([...REVENUE_LEVER_IDS].sort());
  });

  it("LEVERS.revenue (default, non-inpatient catalog) has 7 unique ids matching REVENUE_LEVER_IDS", () => {
    const ids = LEVERS.revenue.map((l) => l.id);
    expect(new Set(ids)).toEqual(new Set(REVENUE_LEVER_IDS));
  });
});

describe("computeMultiGoalContributions with revenue (outpatient)", () => {
  it("revenue combines with retention as an independent goal (no shared freed-time hour)", () => {
    const valuesByGoal = {
      revenue: hccValues(),
      retention: { ...defaultLeverValues("retention", "outpatient"), retentionFloor: 40 },
    };
    const revenueAlone = computeLeverContributions("revenue", "outpatient", BASELINE, valuesByGoal.revenue);
    const retentionAlone = computeLeverContributions("retention", "outpatient", BASELINE, valuesByGoal.retention);
    const combined = computeMultiGoalContributions(["revenue", "retention"], "outpatient", BASELINE, valuesByGoal);
    expect(combined.combinedMargin).toBeCloseTo(revenueAlone.totalMargin + retentionAlone.totalMargin, 5);
  });
});

// ────────────────────────────────────────────────────────────────────────
// INPATIENT REGRESSION - revenue at inpatient is now its OWN, genuinely
// different three-path decision chain (`attainInpatientRevenue.ts`,
// DRG accuracy / CDI query efficiency / observation-IP status defense),
// never the outpatient/ED HCC/E-M/denials chain this file otherwise
// exercises. Full coverage of that chain lives in
// attainInpatientRevenue.test.ts; this block only proves the two never
// cross-contaminate.
// ────────────────────────────────────────────────────────────────────────
describe("inpatient revenue is a different chain, not the outpatient/ED one", () => {
  it("leversFor(revenue, inpatient) is a distinct catalog from outpatient/ED's chain catalog", () => {
    const ipLevers = leversFor("revenue", "inpatient");
    expect(leversFor("revenue", "outpatient")).toBe(LEVERS.revenue);
    expect(leversFor("revenue", "ed")).toBe(LEVERS.revenue);
    expect(ipLevers).not.toBe(LEVERS.revenue);
    expect(ipLevers.map((l) => l.id)).not.toEqual(LEVERS.revenue.map((l) => l.id));
  });

  it("doing nothing new at inpatient revenue nets exactly $0", () => {
    const ipBaseline: AttainBaseline = { providers: 45, annualEncounters: 45 * 400, utilizationPct: 100 };
    const result = computeLeverContributions("revenue", "inpatient", ipBaseline, defaultLeverValues("revenue", "inpatient"));
    expect(result.totalMargin).toBe(0);
  });
});
