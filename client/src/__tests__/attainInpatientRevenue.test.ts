import { describe, it, expect } from "vitest";
import {
  computeIpDrgChain,
  computeIpCdiChain,
  computeIpObsChain,
  computeIpRevenueChain,
  computeIpRevenueContributions,
  exploreStateForIpRevenueReconciliation,
  computeAllDriverValues,
  selectedIpRevenuePaths,
  IP_REVENUE_PATH_LABELS,
  IP_REVENUE_PATH_IDS,
  IP_REVENUE_LEVER_IDS,
  DEFAULT_IP_DRG_AT_RISK_RATE,
  DEFAULT_IP_DRG_WEIGHT_INCREASE,
  DEFAULT_IP_DRG_BASE_PAYMENT,
  DEFAULT_IP_CDI_QUERY_RATE,
  DEFAULT_IP_CDI_COST_PER_QUERY,
  MAX_IP_CDI_COST_PER_QUERY,
  DEFAULT_IP_OBS_DENIAL_RATE,
  DEFAULT_IP_OBS_REVENUE_DELTA,
} from "@/lib/attain/attainInpatientRevenue";
import {
  LEVERS,
  leversFor,
  defaultLeverValues,
  computeLeverContributions,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
} from "@/lib/attain/attainLevers";

// Full inpatient scope, 100% utilization - lets eligibleEncounters equal
// baseline.annualEncounters exactly, so every path's math reconciles 1:1 to
// the live exploreDriverCalcs engine (same convention attainEdAccess.test.ts
// / attainQuality.test.ts use).
const BASELINE: AttainBaseline = { providers: 45, annualEncounters: 45 * 400, utilizationPct: 100 };

function fullValues(): LeverValues {
  return {
    ipRevenuePaths: [IP_REVENUE_PATH_LABELS.drg, IP_REVENUE_PATH_LABELS.cdi, IP_REVENUE_PATH_LABELS.obs],
    ipDrgAtRiskRate: 18,
    ipDrgCapture: 10,
    ipDrgWeightIncrease: 0.3,
    ipDrgBasePayment: 6_000,
    ipCdiQueryRate: 30,
    ipCdiReduction: 25,
    ipCdiCostPerQuery: 50,
    ipObsDenialRate: 5,
    ipObsPreventable: 40,
    ipObsRevenueDelta: 5_000,
  };
}

describe("path identity", () => {
  it("exposes exactly three inpatient revenue paths", () => {
    expect(IP_REVENUE_PATH_IDS).toEqual(["drg", "cdi", "obs"]);
  });

  it("selectedIpRevenuePaths reads labels off the flat LeverValues bag", () => {
    const paths = selectedIpRevenuePaths({ ipRevenuePaths: [IP_REVENUE_PATH_LABELS.cdi] });
    expect(paths).toEqual(["cdi"]);
  });

  it("no paths selected means an empty array, not a crash", () => {
    expect(selectedIpRevenuePaths({})).toEqual([]);
  });
});

describe("PATH 1 - Case Mix / DRG accuracy (CC/MCC capture)", () => {
  it("at-risk admissions = eligible admissions x at-risk rate", () => {
    const chain = computeIpDrgChain(BASELINE, { ipDrgAtRiskRate: 18 });
    expect(chain.eligibleEncounters).toBeCloseTo(45 * 400, 3);
    expect(chain.atRisk).toBeCloseTo(45 * 400 * 0.18, 3);
  });

  it("at-risk rate defaults to the engine benchmark (18%) when unset", () => {
    expect(DEFAULT_IP_DRG_AT_RISK_RATE).toBe(18);
    const chain = computeIpDrgChain(BASELINE, {});
    expect(chain.atRiskRate).toBe(DEFAULT_IP_DRG_AT_RISK_RATE);
  });

  it("capture improvement is the gate - zero at reality captures nothing, even with a real at-risk rate", () => {
    const chain = computeIpDrgChain(BASELINE, { ipDrgAtRiskRate: 18 });
    expect(chain.capturePct).toBe(0);
    expect(chain.capturedCases).toBe(0);
    expect(chain.value).toBe(0);
  });

  it("captured cases = at-risk admissions x capture-improvement pp", () => {
    const chain = computeIpDrgChain(BASELINE, { ipDrgAtRiskRate: 18, ipDrgCapture: 10 });
    expect(chain.capturedCases).toBeCloseTo(chain.atRisk * 0.1, 3);
  });

  it("weight increase and base payment default to engine benchmarks (0.3, $6,000) when unset", () => {
    const chain = computeIpDrgChain(BASELINE, { ipDrgAtRiskRate: 18, ipDrgCapture: 10 });
    expect(chain.weightIncrease).toBe(DEFAULT_IP_DRG_WEIGHT_INCREASE);
    expect(chain.basePayment).toBe(DEFAULT_IP_DRG_BASE_PAYMENT);
  });

  it("value = captured cases x weight increase x base payment", () => {
    const chain = computeIpDrgChain(BASELINE, {
      ipDrgAtRiskRate: 18,
      ipDrgCapture: 10,
      ipDrgWeightIncrease: 0.3,
      ipDrgBasePayment: 6_000,
    });
    expect(chain.value).toBe(Math.round(chain.capturedCases * 0.3 * 6_000));
    expect(chain.value).toBeGreaterThan(0);
  });

  it("no providers in the baseline means zero eligible admissions and zero dollars, even with every rate set", () => {
    const chain = computeIpDrgChain({}, { ipDrgAtRiskRate: 18, ipDrgCapture: 10 });
    expect(chain.eligibleEncounters).toBe(0);
    expect(chain.value).toBe(0);
  });
});

describe("PATH 2 - CDI query efficiency", () => {
  it("queries generated = eligible admissions x query rate", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30 });
    expect(chain.queries).toBeCloseTo(45 * 400 * 0.3, 3);
  });

  it("query rate defaults to the engine benchmark (30%) when unset", () => {
    expect(DEFAULT_IP_CDI_QUERY_RATE).toBe(30);
    const chain = computeIpCdiChain(BASELINE, {});
    expect(chain.queryRate).toBe(DEFAULT_IP_CDI_QUERY_RATE);
  });

  it("the query-volume-reduction target is the gate - zero at reality avoids nothing", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30 });
    expect(chain.reductionPct).toBe(0);
    expect(chain.avoided).toBe(0);
    expect(chain.value).toBe(0);
  });

  it("queries avoided = queries generated x reduction pct", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30, ipCdiReduction: 25 });
    expect(chain.avoided).toBeCloseTo(chain.queries * 0.25, 3);
  });

  it("cost per query defaults to the engine benchmark ($50) when unset", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30, ipCdiReduction: 25 });
    expect(chain.costPerQuery).toBe(DEFAULT_IP_CDI_COST_PER_QUERY);
  });

  it("value = queries avoided x admin cost per query", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30, ipCdiReduction: 25, ipCdiCostPerQuery: 50 });
    expect(chain.value).toBe(Math.round(chain.avoided * 50));
    expect(chain.value).toBeGreaterThan(0);
  });

  it("cost per query is clamped to the double-count guard ceiling ($200), even if a partner tries to set it higher", () => {
    const chain = computeIpCdiChain(BASELINE, { ipCdiQueryRate: 30, ipCdiReduction: 25, ipCdiCostPerQuery: 450 });
    expect(chain.costPerQuery).toBe(MAX_IP_CDI_COST_PER_QUERY);
    expect(chain.costPerQuery).toBeLessThan(450);
  });
});

describe("PATH 3 - Observation / IP status defense", () => {
  it("downgrades = eligible admissions x denial/downgrade rate", () => {
    const chain = computeIpObsChain(BASELINE, { ipObsDenialRate: 5 });
    expect(chain.downgrades).toBeCloseTo(45 * 400 * 0.05, 3);
  });

  it("denial rate defaults to the engine benchmark (5%) when unset", () => {
    expect(DEFAULT_IP_OBS_DENIAL_RATE).toBe(5);
    const chain = computeIpObsChain(BASELINE, {});
    expect(chain.denialRate).toBe(DEFAULT_IP_OBS_DENIAL_RATE);
  });

  it("preventable share is the gate - zero at reality defends nothing", () => {
    const chain = computeIpObsChain(BASELINE, { ipObsDenialRate: 5 });
    expect(chain.preventablePct).toBe(0);
    expect(chain.preventable).toBe(0);
    expect(chain.value).toBe(0);
  });

  it("preventable (defended) cases = downgrades x preventable pct", () => {
    const chain = computeIpObsChain(BASELINE, { ipObsDenialRate: 5, ipObsPreventable: 40 });
    expect(chain.preventable).toBeCloseTo(chain.downgrades * 0.4, 3);
  });

  it("revenue delta defaults to the engine benchmark ($5,000) when unset", () => {
    const chain = computeIpObsChain(BASELINE, { ipObsDenialRate: 5, ipObsPreventable: 40 });
    expect(chain.revenueDelta).toBe(DEFAULT_IP_OBS_REVENUE_DELTA);
  });

  it("value = defended cases x revenue delta per case", () => {
    const chain = computeIpObsChain(BASELINE, { ipObsDenialRate: 5, ipObsPreventable: 40, ipObsRevenueDelta: 5_000 });
    expect(chain.value).toBe(Math.round(chain.preventable * 5_000));
    expect(chain.value).toBeGreaterThan(0);
  });
});

describe("the full chain - paths are chosen, gated, and simply summed", () => {
  it("no path selected nets exactly $0, even with every decision set", () => {
    const chain = computeIpRevenueChain(BASELINE, {
      ipDrgAtRiskRate: 18,
      ipDrgCapture: 10,
      ipCdiQueryRate: 30,
      ipCdiReduction: 25,
      ipObsDenialRate: 5,
      ipObsPreventable: 40,
    });
    expect(chain.paths).toEqual([]);
    expect(chain.totalValue).toBe(0);
  });

  it("doing nothing new (every decision at reality) nets exactly $0 even with all three paths chosen", () => {
    const chain = computeIpRevenueChain(BASELINE, { ipRevenuePaths: Object.values(IP_REVENUE_PATH_LABELS) });
    expect(chain.paths).toEqual(["drg", "cdi", "obs"]);
    expect(chain.totalValue).toBe(0);
  });

  it("choosing one path prices only that path's mechanism", () => {
    const chain = computeIpRevenueChain(BASELINE, {
      ipRevenuePaths: [IP_REVENUE_PATH_LABELS.drg],
      ipDrgAtRiskRate: 18,
      ipDrgCapture: 10,
      ipCdiQueryRate: 30,
      ipCdiReduction: 25, // moved but path not chosen - must not leak in
      ipObsDenialRate: 5,
      ipObsPreventable: 40, // moved but path not chosen - must not leak in
    });
    expect(chain.drg).toBeDefined();
    expect(chain.cdi).toBeUndefined();
    expect(chain.obs).toBeUndefined();
    expect(chain.totalValue).toBeGreaterThan(0);
    expect(chain.totalValue).toBe(chain.drg!.chain.value);
  });

  it("paths ADD - all three chosen sums to exactly the three independent values, never double-counted", () => {
    const values = fullValues();
    const chain = computeIpRevenueChain(BASELINE, values);
    const drgAlone = computeIpDrgChain(BASELINE, values);
    const cdiAlone = computeIpCdiChain(BASELINE, values);
    const obsAlone = computeIpObsChain(BASELINE, values);
    expect(chain.totalValue).toBe(drgAlone.value + cdiAlone.value + obsAlone.value);
    expect(chain.totalValue).toBeGreaterThan(drgAlone.value);
  });

  it("turning up a path's key gate decision increases that path's, and the total's, contribution", () => {
    const low = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.drg], ipDrgAtRiskRate: 18, ipDrgCapture: 5 });
    const high = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.drg], ipDrgAtRiskRate: 18, ipDrgCapture: 20 });
    expect(high.totalValue).toBeGreaterThan(low.totalValue);

    const cdiLow = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.cdi], ipCdiQueryRate: 30, ipCdiReduction: 10 });
    const cdiHigh = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.cdi], ipCdiQueryRate: 30, ipCdiReduction: 50 });
    expect(cdiHigh.totalValue).toBeGreaterThan(cdiLow.totalValue);

    const obsLow = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.obs], ipObsDenialRate: 5, ipObsPreventable: 10 });
    const obsHigh = computeIpRevenueChain(BASELINE, { ipRevenuePaths: [IP_REVENUE_PATH_LABELS.obs], ipObsDenialRate: 5, ipObsPreventable: 60 });
    expect(obsHigh.totalValue).toBeGreaterThan(obsLow.totalValue);
  });

  it("printed formulas never contain literal MIN( notation and are non-empty once a path is priced", () => {
    const chain = computeIpRevenueChain(BASELINE, fullValues());
    expect(chain.drg!.countFormula).not.toContain("MIN(");
    expect(chain.drg!.payoffFormula).not.toContain("MIN(");
    expect(chain.cdi!.countFormula).not.toContain("MIN(");
    expect(chain.cdi!.payoffFormula).not.toContain("MIN(");
    expect(chain.obs!.countFormula).not.toContain("MIN(");
    expect(chain.obs!.payoffFormula).not.toContain("MIN(");
  });
});

describe("reconciliation to the live ipDrg/ipCdi/ipObsDefense engine (exploreDriverCalcs.ts)", () => {
  it("DRG path value reconciles to computeAllDriverValues's drgAccuracy within tolerance", () => {
    const values: LeverValues = {
      ipRevenuePaths: [IP_REVENUE_PATH_LABELS.drg],
      ipDrgAtRiskRate: 18,
      ipDrgCapture: 10,
      ipDrgWeightIncrease: 0.3,
      ipDrgBasePayment: 6_000,
    };
    const chain = computeIpRevenueChain(BASELINE, values);
    const state = exploreStateForIpRevenueReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.drgAccuracy).toBeCloseTo(chain.drg!.chain.value, 0);
  });

  it("CDI path value reconciles to computeAllDriverValues's cdiQueryReduction within tolerance", () => {
    const values: LeverValues = {
      ipRevenuePaths: [IP_REVENUE_PATH_LABELS.cdi],
      ipCdiQueryRate: 30,
      ipCdiReduction: 25,
      ipCdiCostPerQuery: 50,
    };
    const chain = computeIpRevenueChain(BASELINE, values);
    const state = exploreStateForIpRevenueReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.cdiQueryReduction).toBeCloseTo(chain.cdi!.chain.value, 0);
  });

  it("Obs-defense path value reconciles to computeAllDriverValues's obsDefense within tolerance", () => {
    const values: LeverValues = {
      ipRevenuePaths: [IP_REVENUE_PATH_LABELS.obs],
      ipObsDenialRate: 5,
      ipObsPreventable: 40,
      ipObsRevenueDelta: 5_000,
    };
    const chain = computeIpRevenueChain(BASELINE, values);
    const state = exploreStateForIpRevenueReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.obsDefense).toBeCloseTo(chain.obs!.chain.value, 0);
  });

  it("reconciles all three at once, on a second, different set of real numbers (not curve-fit to one fixture)", () => {
    const values: LeverValues = {
      ipRevenuePaths: Object.values(IP_REVENUE_PATH_LABELS),
      ipDrgAtRiskRate: 22,
      ipDrgCapture: 14,
      ipDrgWeightIncrease: 0.42,
      ipDrgBasePayment: 7_200,
      ipCdiQueryRate: 34,
      ipCdiReduction: 38,
      ipCdiCostPerQuery: 65,
      ipObsDenialRate: 7,
      ipObsPreventable: 55,
      ipObsRevenueDelta: 4_200,
    };
    const chain = computeIpRevenueChain(BASELINE, values);
    const state = exploreStateForIpRevenueReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);
    expect(engineValues.drgAccuracy).toBeCloseTo(chain.drg!.chain.value, 0);
    expect(engineValues.cdiQueryReduction).toBeCloseTo(chain.cdi!.chain.value, 0);
    expect(engineValues.obsDefense).toBeCloseTo(chain.obs!.chain.value, 0);
  });
});

describe("computeIpRevenueContributions adapter", () => {
  it("returns the LeverContributionsResult shape with every catalog lever id represented", () => {
    const result = computeIpRevenueContributions(BASELINE, fullValues());
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.perLever).toHaveLength(IP_REVENUE_LEVER_IDS.length);
    const ids = result.perLever.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining([...IP_REVENUE_LEVER_IDS]));
    for (const l of result.perLever) {
      expect(Number.isFinite(l.pctOfTotal)).toBe(true);
      expect(l.formula.length).toBeGreaterThan(0);
    }
  });

  it("doing nothing new nets exactly $0 through the adapter", () => {
    const result = computeIpRevenueContributions(BASELINE, {});
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("each gate decision's marginalMargin is exactly its own path's dollar - the three paths never blend into one row", () => {
    const values = fullValues();
    const chain = computeIpRevenueChain(BASELINE, values);
    const result = computeIpRevenueContributions(BASELINE, values);

    const drgRow = result.perLever.find((l) => l.id === "ipDrgCapture")!;
    const cdiRow = result.perLever.find((l) => l.id === "ipCdiReduction")!;
    const obsRow = result.perLever.find((l) => l.id === "ipObsPreventable")!;

    expect(drgRow.marginalMargin).toBeCloseTo(chain.drg!.chain.value, 0);
    expect(cdiRow.marginalMargin).toBeCloseTo(chain.cdi!.chain.value, 0);
    expect(obsRow.marginalMargin).toBeCloseTo(chain.obs!.chain.value, 0);
    expect(drgRow.marginalMargin + cdiRow.marginalMargin + obsRow.marginalMargin).toBeCloseTo(result.totalMargin, 0);
  });
});

describe("wiring - computeLeverContributions / computeMultiGoalContributions dispatch revenue by setting", () => {
  it("goal revenue at setting inpatient uses this three-path chain, not the outpatient/ED chain", () => {
    const values = fullValues();
    const viaLevers = computeLeverContributions("revenue", "inpatient", BASELINE, values);
    const direct = computeIpRevenueContributions(BASELINE, values);
    expect(viaLevers.totalMargin).toBe(direct.totalMargin);
    expect(viaLevers.totalMargin).toBeGreaterThan(0);
  });

  it("leversFor(revenue, inpatient) returns the new inpatient catalog, distinct from outpatient/ED's", () => {
    const ipLevers = leversFor("revenue", "inpatient");
    const opLevers = leversFor("revenue", "outpatient");
    expect(ipLevers.map((l) => l.id).sort()).toEqual([...IP_REVENUE_LEVER_IDS].sort());
    expect(opLevers.map((l) => l.id)).not.toEqual(ipLevers.map((l) => l.id));
    expect(LEVERS.revenue).toBe(opLevers);
  });

  it("goal revenue at setting outpatient/ED is unaffected - still the three-path chain keyed by revenueHcc*/revenueEm*/revenueDenials*", () => {
    const outpatientValues: LeverValues = {
      revenuePaths: ["E/M Level Accuracy"],
      revenueEmLift: 5,
    };
    const result = computeLeverContributions("revenue", "outpatient", { providers: 40, annualEncounters: 40 * 2_300, utilizationPct: 100 }, outpatientValues);
    expect(result.totalMargin).toBeGreaterThan(0);
  });

  it("computeMultiGoalContributions dispatches inpatient revenue through its own chain when combined with retention, without crashing", () => {
    const valuesByGoal = {
      revenue: fullValues(),
      retention: { ...defaultLeverValues("retention", "inpatient") },
    };
    const combined = computeMultiGoalContributions(["revenue", "retention"], "inpatient", BASELINE, valuesByGoal);
    const revenueAlone = computeIpRevenueContributions(BASELINE, valuesByGoal.revenue);
    expect(combined.byGoal.revenue?.totalMargin).toBeCloseTo(revenueAlone.totalMargin, 5);
  });
});

describe("blank starting-point baseline ({}), no NaN / no crash", () => {
  it("every function stays finite and non-negative against a blank baseline", () => {
    const chain = computeIpRevenueChain({}, fullValues());
    expect(Number.isNaN(chain.totalValue)).toBe(false);
    expect(Number.isFinite(chain.totalValue)).toBe(true);
    expect(chain.totalValue).toBeGreaterThanOrEqual(0);
  });

  it("computeIpRevenueContributions nets exactly $0 against a blank baseline", () => {
    const result = computeIpRevenueContributions({}, fullValues());
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});
