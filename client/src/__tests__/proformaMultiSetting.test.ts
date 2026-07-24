import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  getYearlySummary,
  costOffsetDisplacedAmount,
  scaleSettingValue,
  mergeExploreEditIntoSetting,
} from "@/lib/proformaCalculations";
import {
  type ProformaSettingSnapshot,
  type ProformaConfig,
  type ProformaDriver,
  DEFAULT_PROFORMA_CONFIG,
} from "@/pages/proforma/proformaTypes";
import { recomputeDriverFromExploreState, buildDriverChangeUpdate } from "@/pages/proforma/ModelAssumptionDrawer";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";

/**
 * Proforma audit — multiple care settings, pricing models, and lever editing.
 * Settings are computed independently each month (only systemWideFee and banked
 * encounters are cross-setting), so the core invariant is: a setting's per-setting
 * (bySettings) numbers must be identical whether it runs alone or combined.
 */

const DEFAULT_DRIVERS: ProformaDriver[] = [
  { id: "d-cap", name: "Capacity", value: 200_000, category: "time", quadrant: "Capacity", onset: "delayed" },
  { id: "d-rev", name: "Revenue", value: 300_000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
  { id: "d-wf", name: "Workforce", value: 100_000, category: "time", quadrant: "Workforce", onset: "phased" },
];

function makeSetting(
  careSetting: ProformaSettingSnapshot["careSetting"],
  overrides: Partial<ProformaSettingSnapshot> = {},
): ProformaSettingSnapshot {
  const drivers = overrides.drivers ?? DEFAULT_DRIVERS;
  const sumDrivers = drivers.reduce((s, d) => s + d.value, 0);
  const quad = (q: string) => drivers.filter((d) => d.quadrant === q).reduce((s, d) => s + d.value, 0);
  return {
    id: `s-${careSetting}`,
    careSetting,
    label: careSetting,
    providerCount: 20,
    fullScaleProviders: 40,
    fullScaleUtilization: 85,
    encounters: 60_000,
    utilizationPercent: 85,
    annualValue: sumDrivers,
    timeValue: 0,
    docValue: 0,
    retentionValue: 0,
    totalHoursSaved: 5_000,
    drivers,
    costPerUnit: 250,
    pricingModel: "perUnit",
    implementationFee: 25_000,
    goLiveMonth: 1,
    color: "#000000",
    fullExploreState: { ...DEFAULT_EXPLORE_STATE } as ExploreState,
    capacityValue: quad("Capacity"),
    workforceValue: quad("Workforce"),
    revenueValue: quad("Revenue"),
    qualityValue: quad("Quality"),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ProformaConfig> = {}): ProformaConfig {
  return { ...DEFAULT_PROFORMA_CONFIG, ...overrides };
}

const COMBOS: Array<{ name: string; settings: ProformaSettingSnapshot[] }> = [
  {
    name: "nursing + inpatient",
    settings: [makeSetting("nursing", { id: "nursing", costPerUnit: 150 }), makeSetting("inpatient", { id: "inpatient" })],
  },
  {
    name: "inpatient + ED + outpatient",
    settings: [makeSetting("inpatient", { id: "ip" }), makeSetting("ed", { id: "ed", goLiveMonth: 4 }), makeSetting("outpatient", { id: "op", goLiveMonth: 7 })],
  },
  {
    name: "outpatient + ED",
    settings: [makeSetting("outpatient", { id: "op2" }), makeSetting("ed", { id: "ed2" })],
  },
];

describe("multi-setting independence (no cross-setting contamination)", () => {
  for (const combo of COMBOS) {
    it(`${combo.name}: each setting's per-setting numbers are identical alone vs combined`, () => {
      const config = makeConfig();
      const combined = buildMonthlyCashFlows(combo.settings, config);
      for (const setting of combo.settings) {
        const alone = buildMonthlyCashFlows([setting], config);
        const combinedSeries = combined.map((r) => r.bySettings[setting.id]);
        const aloneSeries = alone.map((r) => r.bySettings[setting.id]);
        expect(combinedSeries).toEqual(aloneSeries);
      }
    });

    it(`${combo.name}: combined totals == sum of per-setting values, and row total == sum of quadrant buckets`, () => {
      const config = makeConfig();
      const rows = buildMonthlyCashFlows(combo.settings, config);
      for (const row of rows) {
        const bucketSum = row.capacityValue + row.workforceValue + row.revenueValue + row.qualityValue + row.displacementValue;
        expect(Math.abs(row.totalValue - bucketSum)).toBeLessThanOrEqual(2);
        const perSettingValueSum = Object.values(row.bySettings).reduce((s, b) => s + b.value, 0);
        expect(Math.abs(row.totalValue - perSettingValueSum)).toBeLessThanOrEqual(2);
        const perSettingInvSum = Object.values(row.bySettings).reduce((s, b) => s + b.investment, 0);
        expect(Math.abs(row.investment - perSettingInvSum)).toBeLessThanOrEqual(2);
      }
    });
  }
});

describe("summary + yearly consistency (combined model)", () => {
  const settings = COMBOS[1].settings; // IP + ED + OP, staggered go-lives
  const config = makeConfig();
  const rows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, rows);

  it("termValue == sum of monthly total value", () => {
    expect(summary.termValue).toBe(rows.reduce((s, r) => s + r.totalValue, 0));
  });

  it("termInvestment == sum of monthly investment + implementation fees", () => {
    const subTotal = rows.reduce((s, r) => s + r.investment, 0);
    const implFees = settings.reduce((s, v) => s + v.implementationFee, 0);
    expect(summary.termInvestment).toBe(subTotal + implFees);
    expect(summary.termNet).toBe(summary.termValue - summary.termInvestment);
  });

  it("yearly summary value sums back to the term value", () => {
    const yearly = getYearlySummary(rows, settings);
    const yearlyTotal = yearly.reduce((s, y) => s + y.totalValue, 0);
    expect(Math.abs(yearlyTotal - summary.termValue)).toBeLessThanOrEqual(2);
  });
});

describe("pricing models (single setting)", () => {
  const config = makeConfig();

  it("annualFlat: flat monthly investment = fee / 12 every active month", () => {
    const s = makeSetting("outpatient", { pricingModel: "annualFlat", annualLicenseFee: 600_000 });
    const rows = buildMonthlyCashFlows([s], config);
    for (const row of rows) expect(row.investment).toBe(50_000);
  });

  it("platform: fee/12 when encounter rate is 0, more when rate > 0", () => {
    const flat = makeSetting("outpatient", { pricingModel: "platform", annualLicenseFee: 600_000, platformEncRate: 0 });
    const withEnc = makeSetting("outpatient", { pricingModel: "platform", annualLicenseFee: 600_000, platformEncRate: 5 });
    const flatRows = buildMonthlyCashFlows([flat], config);
    const encRows = buildMonthlyCashFlows([withEnc], config);
    for (const row of flatRows) expect(row.investment).toBe(50_000);
    const flatTotal = flatRows.reduce((s, r) => s + r.investment, 0);
    const encTotal = encRows.reduce((s, r) => s + r.investment, 0);
    expect(encTotal).toBeGreaterThan(flatTotal);
  });

  it("perUnit: investment scales linearly with cost per unit", () => {
    const base = makeSetting("outpatient", { pricingModel: "perUnit", costPerUnit: 200 });
    const dbl = makeSetting("outpatient", { pricingModel: "perUnit", costPerUnit: 400 });
    const baseInv = buildMonthlyCashFlows([base], config).reduce((s, r) => s + r.investment, 0);
    const dblInv = buildMonthlyCashFlows([dbl], config).reduce((s, r) => s + r.investment, 0);
    expect(dblInv).toBeCloseTo(baseInv * 2, -2);
    expect(baseInv).toBeGreaterThan(0);
  });

  it("perEncounter: investment scales linearly with cost per encounter", () => {
    const base = makeSetting("ed", { pricingModel: "perEncounter", costPerEncounter: 2 });
    const dbl = makeSetting("ed", { pricingModel: "perEncounter", costPerEncounter: 4 });
    const baseInv = buildMonthlyCashFlows([base], config).reduce((s, r) => s + r.investment, 0);
    const dblInv = buildMonthlyCashFlows([dbl], config).reduce((s, r) => s + r.investment, 0);
    expect(baseInv).toBeGreaterThan(0);
    expect(dblInv).toBeCloseTo(baseInv * 2, -2);
  });

  it("mixed pricing across settings stays independent and additive", () => {
    const settings = [
      makeSetting("nursing", { id: "n", pricingModel: "perUnit", costPerUnit: 150 }),
      makeSetting("inpatient", { id: "i", pricingModel: "annualFlat", annualLicenseFee: 600_000 }),
      makeSetting("ed", { id: "e", pricingModel: "perEncounter", costPerEncounter: 3 }),
    ];
    const combined = buildMonthlyCashFlows(settings, config);
    const combinedInv = combined.reduce((s, r) => s + r.investment, 0);
    const sumAloneInv = settings.reduce(
      (acc, s) => acc + buildMonthlyCashFlows([s], config).reduce((ss, r) => ss + r.investment, 0),
      0,
    );
    expect(Math.abs(combinedInv - sumAloneInv)).toBeLessThanOrEqual(settings.length * 36);
  });
});

describe("driver onset in a multi-setting model", () => {
  it("a long-term-only driver contributes nothing before its onset month", () => {
    // Single longTerm driver, annualValue == driver value (no residual), go-live M1.
    const longTermDriver: ProformaDriver = { id: "lt", name: "LT", value: 240_000, category: "documentation", quadrant: "Revenue", onset: "longTerm" };
    const s = makeSetting("outpatient", { id: "lt-op", drivers: [longTermDriver], annualValue: 240_000 });
    const other = makeSetting("ed", { id: "lt-ed" });
    const rows = buildMonthlyCashFlows([s, other], makeConfig());
    // longTerm onset delay = 12 months → months 1-12 (since go-live) produce $0 for that setting.
    for (let m = 0; m < 12; m++) {
      expect(rows[m].bySettings["lt-op"].revenueValue).toBe(0);
    }
    expect(rows[12].bySettings["lt-op"].revenueValue).toBeGreaterThan(0);
  });
});

describe("editing assumptions propagates to the displayed cash flows / summary", () => {
  // These mirror the exact state transformations the assumptions drawer produces
  // (handleDriverChangeWithExplore keeps annualValue == sum(drivers); onset edits
  // rewrite the driver onset; deal-term edits go through onUpdateSetting). The
  // screen re-derives via useMemo([settings, config]), so if the engine output
  // moves here, the screen moves there.
  const config = makeConfig();
  const termValue = (s: ProformaSettingSnapshot) =>
    calculateProformaSummary([s], config, buildMonthlyCashFlows([s], config)).termValue;
  const termInvestment = (s: ProformaSettingSnapshot) =>
    calculateProformaSummary([s], config, buildMonthlyCashFlows([s], config)).termInvestment;

  it("driver value edit: raising a driver raises term value", () => {
    const before = makeSetting("outpatient", { id: "e1" });
    const drivers = before.drivers.map((d) => (d.id === "d-rev" ? { ...d, value: d.value * 2 } : d));
    const after = { ...before, drivers, annualValue: drivers.reduce((s, d) => s + d.value, 0) };
    expect(termValue(after)).toBeGreaterThan(termValue(before));
  });

  it("driver onset edit: switching a driver to long-term defers its Year-1 value to $0", () => {
    const immediate = makeSetting("outpatient", {
      id: "e2",
      drivers: [{ id: "d", name: "D", value: 1_200_000, category: "documentation", quadrant: "Revenue", onset: "immediate" }],
      annualValue: 1_200_000,
    });
    const longTerm = { ...immediate, drivers: immediate.drivers.map((d) => ({ ...d, onset: "longTerm" as const })) };
    const y1 = (s: ProformaSettingSnapshot) => buildMonthlyCashFlows([s], config).slice(0, 12).reduce((sum, r) => sum + r.totalValue, 0);
    expect(y1(longTerm)).toBeLessThan(y1(immediate));
    expect(y1(longTerm)).toBe(0);
  });

  it("deal-term edit: raising cost-per-unit raises investment", () => {
    const base = makeSetting("outpatient", { id: "e3", pricingModel: "perUnit", costPerUnit: 200 });
    const edited = { ...base, costPerUnit: 400 };
    expect(termInvestment(edited)).toBeGreaterThan(termInvestment(base));
  });

  it("deal-term edit: switching pricing model changes investment but not value", () => {
    const perUnit = makeSetting("outpatient", { id: "e4", pricingModel: "perUnit", costPerUnit: 300 });
    const annualFlat = { ...perUnit, pricingModel: "annualFlat" as const, annualLicenseFee: 600_000 };
    expect(termInvestment(annualFlat)).not.toBe(termInvestment(perUnit));
    expect(termValue(annualFlat)).toBe(termValue(perUnit)); // value is independent of pricing
  });
});

describe("per-encounter pricing honors quarterly utilization", () => {
  const q = (v: number) => ({ q1: v, q2: v, q3: v, q4: v, q5: v, q6: v, q7: v, q8: v, q9: v, q10: v, q11: v, q12: v });

  it("month-1 billing uses the quarterly util, not the yearly fallback", () => {
    const s = makeSetting("outpatient", {
      id: "pe",
      pricingModel: "perEncounter",
      costPerEncounter: 2,
      providerCount: 100,
      fullScaleProviders: 100,
      encounters: 1_200_000,
      yearlyUtilization: { year1: 80, year2: 80, year3: 80 },
      quarterlyUtilization: q(50),
      goLiveMonth: 1,
    });
    const rows = buildMonthlyCashFlows([s], makeConfig());
    // annualEnc = 100 × (1,200,000/100) = 1,200,000; quarterly util 50% → 50,000/mo × $2 = $100,000
    // (the yearly fallback of 80% would wrongly give $160,000).
    expect(rows[0].bySettings["pe"].investment).toBe(100_000);
  });
});

describe("cost-offset itemization (named cost-reduction items)", () => {
  it("displaced amount = annualSpend × displacement%", () => {
    expect(costOffsetDisplacedAmount({ id: "o", label: "Scribes", annualSpend: 400_000, displacementPct: 50, transitionMonths: 1 })).toBe(200_000);
    expect(costOffsetDisplacedAmount({ id: "o", label: "Agency", annualSpend: 250_000, displacementPct: 100, transitionMonths: 1 })).toBe(250_000);
  });

  it("itemized displaced amounts reconcile to the model's full-ramp annual displacement", () => {
    const offsets = [
      { id: "o1", label: "Scribe program", annualSpend: 400_000, displacementPct: 50, transitionMonths: 1 },
      { id: "o2", label: "Agency contract", annualSpend: 250_000, displacementPct: 100, transitionMonths: 1 },
    ];
    const s = makeSetting("outpatient", { id: "co", costOffsets: offsets });
    const rows = buildMonthlyCashFlows([s], makeConfig());
    // Month 30: offsets fully ramped (transitionMonths=1). Monthly displacement × 12 ≈ Σ items.
    const annualizedFromModel = rows[29].bySettings["co"].displacementValue * 12;
    const itemizedTotal = offsets.reduce((sum, o) => sum + costOffsetDisplacedAmount(o), 0);
    expect(Math.abs(annualizedFromModel - itemizedTotal)).toBeLessThanOrEqual(itemizedTotal * 0.001 + 2);
    expect(itemizedTotal).toBe(450_000);
  });
});

describe("synthesized retention does not double-count into the residual", () => {
  it("retention-rate value lands in Workforce only, not also in the Revenue residual", () => {
    // No itemized drivers, but a retention RATE + annualValue == the synthesized
    // retention amount. The residual (annualValue - drivers) must not re-add it.
    const providerCount = 100;
    const retentionRate = 10; // %
    const replacementCost = 400_000;
    const retentionAmount = providerCount * (retentionRate / 100) * replacementCost; // 4,000,000
    const s = makeSetting("outpatient", {
      id: "ret",
      drivers: [],
      annualValue: retentionAmount,
      retentionRate,
      replacementCost,
      providerCount,
      fullScaleProviders: providerCount,
      utilizationPercent: 100,
      fullScaleUtilization: 100,
      yearlyUtilization: { year1: 100, year2: 100, year3: 100 },
      goLiveMonth: 1,
    });
    const rows = buildMonthlyCashFlows([s], makeConfig());
    // Month 30 = Year 3, retention phased to 100%, full ramp/expansion.
    const m30 = rows[29].bySettings["ret"];
    expect(m30.workforceValue).toBeGreaterThan(retentionAmount / 12 * 0.9);
    // The residual must be ~0 — NOT another ~$333k of phantom Revenue.
    expect(m30.revenueValue).toBeLessThan(retentionAmount / 12 * 0.05);
  });
});

describe("lever / assumption editing (recomputeDriverFromExploreState)", () => {
  const op = (overrides: Partial<ExploreState>): ExploreState => ({
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "outpatient",
    numberOfProviders: 100,
    annualEncounters: 200_000,
    utilizationPercent: 80,
    minutesSavedPerEncounter: 4,
    ...overrides,
  });

  it("returns -1 for an unknown driver id", () => {
    expect(recomputeDriverFromExploreState("nope", op({}))).toBe(-1);
  });

  it("wRVU value rises from conservative to aggressive scenario", () => {
    const cons = op({ docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "conservative" } });
    const aggr = op({ docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "aggressive" } });
    const cv = recomputeDriverFromExploreState("wrvu", cons);
    const av = recomputeDriverFromExploreState("wrvu", aggr);
    expect(cv).toBeGreaterThan(0);
    expect(av).toBeGreaterThan(cv);
  });

  it("denials custom % is honored (low custom < typical) across the canonical engine and recompute", () => {
    const typical = op({ docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, denialsEnabled: true, denialsScenario: "typical" } });
    const custom = op({ docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, denialsEnabled: true, denialsScenario: "custom", denialsCustomPercent: 15 } });
    // Canonical engine: custom 15% must use 15 (not a fallback) and beat-down typical 50%.
    const typEngine = computeAllDriverValues(typical, 0).denialPrevention;
    const cusEngine = computeAllDriverValues(custom, 0).denialPrevention;
    expect(cusEngine).toBeGreaterThan(0);
    expect(cusEngine).toBeLessThan(typEngine);
    // The custom 15% value must equal scaling typical (50%) down to 15/50.
    expect(cusEngine).toBe(Math.round(typEngine * (15 / 50)));
    // recomputeDriverFromExploreState (drawer path) must agree with the engine.
    expect(recomputeDriverFromExploreState("denials", custom)).toBe(cusEngine);
  });

  it("patient-access value rises with minutes saved per encounter", () => {
    const lo = op({ minutesSavedPerEncounter: 2, timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, patientAccessEnabled: true } });
    const hi = op({ minutesSavedPerEncounter: 8, timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, patientAccessEnabled: true } });
    expect(recomputeDriverFromExploreState("patientAccess", hi))
      .toBeGreaterThan(recomputeDriverFromExploreState("patientAccess", lo));
  });

  it("retention value rises with turnover rate (non-nursing)", () => {
    // wellbeing + calculateRetentionValue are the preconditions for the engine to
    // emit providerWellbeing (a retention driver only exists when they're on).
    const base = { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, wellbeingEnabled: true, calculateRetentionValue: true };
    const lo = op({ timeDriverInputs: { ...base, annualTurnoverRate: 5 } });
    const hi = op({ timeDriverInputs: { ...base, annualTurnoverRate: 15 } });
    expect(recomputeDriverFromExploreState("retention", hi))
      .toBeGreaterThan(recomputeDriverFromExploreState("retention", lo));
  });
});

describe("driver edit propagation — fullExploreState stays in sync", () => {
  const drgState: ExploreState = {
    ...DEFAULT_EXPLORE_STATE,
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, ipDrgScenario: "conservative" },
  } as ExploreState;

  it("writes the new explore state to setting.fullExploreState (not just the driver copy)", () => {
    const setting = makeSetting("inpatient", {
      drivers: [{ id: "ipDrg", name: "DRG Accuracy", value: 100_000, category: "documentation", quadrant: "Revenue", onset: "immediate" }],
      fullExploreState: drgState,
    });
    const newES: ExploreState = {
      ...drgState,
      docQualityInputs: { ...drgState.docQualityInputs, ipDrgScenario: "aggressive" },
    } as ExploreState;

    const update = buildDriverChangeUpdate(setting, "ipDrg", 175_000, newES);

    // The bug: previously only the driver's own .exploreState was updated, so the
    // drawer (which reads setting.fullExploreState) snapped its inputs back.
    expect(update.fullExploreState?.docQualityInputs?.ipDrgScenario).toBe("aggressive");
    expect(update.drivers?.find((d) => d.id === "ipDrg")?.value).toBe(175_000);
    expect(update.annualValue).toBe(175_000);
  });
});

describe("Explore round-trip preserves proforma-side edits", () => {
  it("keeps deployment + pricing, takes Explore's drivers rescaled to the proforma full-scale", () => {
    // The proforma setting the user customized: flat 1,100 ramp, custom util,
    // perUnit pricing, a cost offset, month-3 go-live.
    const old = makeSetting("ed", {
      id: "ed-keep",
      providerCount: 1100,
      fullScaleProviders: 1100,
      yearlyProviders: { year1: 1100, year2: 1100, year3: 1100 },
      yearlyUtilization: { year1: 25, year2: 50, year3: 65 },
      pricingModel: "perUnit",
      costPerUnit: 500,
      goLiveMonth: 3,
      costOffsets: [{ id: "co1", label: "Scribe program", annualSpend: 200_000, displacementPct: 80, transitionMonths: 6 }],
    });

    // What Explore rebuilds: same care setting, but Explore's own full-scale
    // (2,200) and default ramp/pricing, and updated drivers worth $4M at 2,200.
    const fresh = makeSetting("ed", {
      id: "ed-fresh",
      providerCount: 1100,
      fullScaleProviders: 2200,
      yearlyProviders: { year1: 1100, year2: 1650, year3: 2200 },
      yearlyUtilization: { year1: 60, year2: 70, year3: 80 },
      pricingModel: "annualFlat",
      annualLicenseFee: 999_000,
      goLiveMonth: 1,
      drivers: [{ id: "edLwbs", name: "LWBS Recovery", value: 4_000_000, category: "time", quadrant: "Capacity", onset: "delayed" }],
    });

    const merged = mergeExploreEditIntoSetting(old, fresh);

    // Proforma-owned deployment + commercial terms preserved:
    expect(merged.id).toBe("ed-keep");
    expect(merged.fullScaleProviders).toBe(1100);
    expect(merged.yearlyProviders).toEqual({ year1: 1100, year2: 1100, year3: 1100 });
    expect(merged.yearlyUtilization).toEqual({ year1: 25, year2: 50, year3: 65 });
    expect(merged.pricingModel).toBe("perUnit");
    expect(merged.costPerUnit).toBe(500);
    expect(merged.goLiveMonth).toBe(3);
    expect(merged.costOffsets?.[0].id).toBe("co1");

    // Explore's clinical value taken, but rescaled from 2,200 → 1,100 (half):
    expect(merged.drivers.map(d => d.id)).toEqual(["edLwbs"]);
    expect(merged.drivers[0].value).toBe(2_000_000);
    expect(merged.annualValue).toBe(2_000_000);
    expect(merged.fullExploreState).toBe(fresh.fullExploreState);
  });
});

describe("provider scaling — more providers means more value", () => {
  it("scaleSettingValue scales drivers and annualValue by the full-scale ratio", () => {
    const s = makeSetting("outpatient", { providerCount: 1000, fullScaleProviders: 2000 });
    const scaled = scaleSettingValue(s, 2200); // +10%
    expect(scaled.annualValue).toBe(Math.round(s.annualValue * 2200 / 2000));
    scaled.drivers!.forEach((d, i) => {
      expect(d.value).toBe(Math.round(s.drivers[i].value * 2200 / 2000));
    });
  });

  it("returns no change when the full-scale is unchanged", () => {
    const s = makeSetting("outpatient", { fullScaleProviders: 2000 });
    expect(scaleSettingValue(s, 2000)).toEqual({});
  });

  it("raising full-scale providers raises at-scale value but leaves ramp years ~unchanged", () => {
    const base = makeSetting("outpatient", {
      providerCount: 1000,
      fullScaleProviders: 2000,
      yearlyProviders: { year1: 1000, year2: 1500, year3: 2000 },
      yearlyUtilization: { year1: 100, year2: 100, year3: 100 },
      utilizationPercent: 100,
      fullScaleUtilization: 100,
      pricingModel: "annualFlat",
      annualLicenseFee: 0,
    });
    const config = makeConfig({ contractTermMonths: 36 });

    const yrBase = getYearlySummary(buildMonthlyCashFlows([base], config), [base]);
    const baseY2 = yrBase[1].bySettings[base.id].value;
    const baseY3 = yrBase[2].bySettings[base.id].value;

    // Raise full-scale 2000 -> 2200 and rescale value (mirrors what the drawer does).
    const grown = {
      ...base,
      ...scaleSettingValue(base, 2200),
      fullScaleProviders: 2200,
      yearlyProviders: { year1: 1000, year2: 1500, year3: 2200 },
    };
    const yrGrown = getYearlySummary(buildMonthlyCashFlows([grown], config), [grown]);
    const grownY2 = yrGrown[1].bySettings[grown.id].value;
    const grownY3 = yrGrown[2].bySettings[grown.id].value;

    // At-scale (Year 3) value grows with providers...
    expect(grownY3).toBeGreaterThan(baseY3);
    expect(grownY3 / baseY3).toBeCloseTo(2200 / 2000, 1);
    // ...while the ramp year (Year 2, same provider/util level) is essentially unchanged.
    expect(Math.abs(grownY2 - baseY2) / baseY2).toBeLessThan(0.02);
  });
});

describe("newly-tunable drivers recompute correctly", () => {
  it("ipObsDefense matches the engine and is denial-rate monotonic", () => {
    const base: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      annualEncounters: 40000,
      utilizationPercent: 80,
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        ipObsDefenseEnabled: true,
        ipObsDefensePreventableScenario: "typical",
        ipObsDefenseDenialRate: 8,
        ipObsDefenseRevenueDelta: 6000,
        ipObsDefenseRealization: 50,
      },
    };
    const recomputed = recomputeDriverFromExploreState("ipObsDefense", base);
    expect(recomputed).toBe(computeAllDriverValues(base, 0).obsDefense);
    expect(recomputed).toBeGreaterThan(0);

    const higher: ExploreState = {
      ...base,
      docQualityInputs: { ...base.docQualityInputs, ipObsDefenseDenialRate: 16 },
    };
    expect(recomputeDriverFromExploreState("ipObsDefense", higher))
      .toBeGreaterThan(recomputed);
  });

  it("scribeCost (headcount mode) matches the engine and is > 0", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        scribeCostReductionEnabled: true,
        scribeBillingMode: "position",
        scribeHeadcount: 10,
        scribePositionsEliminated: 6,
        scribeCostPerPosition: 55000,
      },
    };
    const recomputed = recomputeDriverFromExploreState("scribeCost", state);
    expect(recomputed).toBe(computeAllDriverValues(state, 0).scribeCostReduction);
    expect(recomputed).toBeGreaterThan(0);
  });

  it("costReduction returns the typed dollar amount directly", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        estimatedCostReduction: 250000,
      },
    };
    expect(recomputeDriverFromExploreState("costReduction", state)).toBe(250000);
  });
});

describe("ED wRVU scenario values (conservative 1 / typical 3 / optimistic 6)", () => {
  const edWrvu = (scenario: "conservative" | "typical" | "aggressive" | "custom"): ExploreState => ({
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "ed",
    annualEncounters: 50000,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      wrvuEnabled: true,
      wrvuScenario: scenario,
    },
  });

  it("ED aggressive uses 6% lift — value scales 6/3 vs typical", () => {
    const typical = computeAllDriverValues(edWrvu("typical"), 0).edEmLevel;
    const aggressive = computeAllDriverValues(edWrvu("aggressive"), 0).edEmLevel;
    expect(typical).toBeGreaterThan(0);
    // typical=3%, aggressive=6% — value is linear in lift %, so ratio is 2x.
    expect(aggressive).toBeCloseTo(typical * (6 / 3), -1);
  });

  it("ED conservative uses 1% lift (1/3 of typical)", () => {
    const typical = computeAllDriverValues(edWrvu("typical"), 0).edEmLevel;
    const conservative = computeAllDriverValues(edWrvu("conservative"), 0).edEmLevel;
    expect(conservative).toBeCloseTo(typical * (1 / 3), -1);
  });
});

describe("inpatient doc-quality drivers honor a persisted 'custom' scenario", () => {
  const ipBase = (overrides: Partial<ExploreState["docQualityInputs"]>): ExploreState => ({
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "inpatient",
    annualEncounters: 40000,
    utilizationPercent: 80,
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, ...overrides },
  });

  it("ipDrg custom % flows through the engine and recompute (not a fallback)", () => {
    const customState = ipBase({ ipDrgEnabled: true, ipDrgScenario: "custom", ipDrgCustomPercent: 50 });
    const typicalState = ipBase({ ipDrgEnabled: true, ipDrgScenario: "typical" }); // typical = 20
    const custom = computeAllDriverValues(customState, 0).drgAccuracy;
    const typical = computeAllDriverValues(typicalState, 0).drgAccuracy;
    expect(custom).toBeGreaterThan(0);
    // 50% custom vs 20% typical → 2.5x, proving the chosen custom % is used.
    expect(custom).toBeCloseTo(typical * (50 / 20), -1);
    // recompute path resolves the same value.
    expect(recomputeDriverFromExploreState("ipDrg", customState)).toBe(custom);
  });

  it("ipObsDefense custom % flows through the engine (not a fallback)", () => {
    const customState = ipBase({ ipObsDefenseEnabled: true, ipObsDefensePreventableScenario: "custom", ipObsDefenseCustomPercent: 80, ipObsDefenseDenialRate: 8, ipObsDefenseRevenueDelta: 6000 });
    const typicalState = ipBase({ ipObsDefenseEnabled: true, ipObsDefensePreventableScenario: "typical", ipObsDefenseDenialRate: 8, ipObsDefenseRevenueDelta: 6000 }); // typical = 40
    const custom = computeAllDriverValues(customState, 0).obsDefense;
    const typical = computeAllDriverValues(typicalState, 0).obsDefense;
    expect(custom).toBeGreaterThan(0);
    expect(custom).toBeCloseTo(typical * (80 / 40), -1);
  });
});

describe("custom onset — value starts at the chosen month", () => {
  const makeOnsetSetting = (onset: ProformaDriver["onset"], customOnsetMonths?: number) =>
    makeSetting("outpatient", {
      drivers: [{ id: "d", name: "D", value: 1_200_000, category: "time", quadrant: "Capacity", onset, customOnsetMonths }],
      yearlyUtilization: { year1: 100, year2: 100, year3: 100 },
      utilizationPercent: 100,
      fullScaleUtilization: 100,
      yearlyProviders: { year1: 40, year2: 40, year3: 40 },
      providerCount: 40,
      fullScaleProviders: 40,
      goLiveMonth: 1,
      pricingModel: "annualFlat",
      annualLicenseFee: 0,
    });

  it("defers a custom-onset driver's value until its start month, then turns on", () => {
    const rows = buildMonthlyCashFlows([makeOnsetSetting("custom", 6)], makeConfig());
    // goLive month 1 → monthsSinceGoLive = period - 1; custom start 6 means $0 until period 7.
    expect(rows.find(r => r.period === 3)!.totalValue).toBe(0);
    expect(rows.find(r => r.period === 9)!.totalValue).toBeGreaterThan(0);
  });

  it("an earlier custom start yields more Year-1 value than a later one", () => {
    const early = buildMonthlyCashFlows([makeOnsetSetting("custom", 2)], makeConfig());
    const late = buildMonthlyCashFlows([makeOnsetSetting("custom", 10)], makeConfig());
    const y1 = (rows: typeof early) => rows.filter(r => r.period <= 12).reduce((s, r) => s + r.totalValue, 0);
    expect(y1(early)).toBeGreaterThan(y1(late));
  });
});
