import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  getYearlySummary,
} from "@/lib/proformaCalculations";
import {
  type ProformaSettingSnapshot,
  type ProformaConfig,
  type ProformaDriver,
  DEFAULT_PROFORMA_CONFIG,
} from "@/pages/proforma/proformaTypes";
import { recomputeDriverFromExploreState } from "@/pages/proforma/ModelAssumptionDrawer";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

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

  it("patient-access value rises with minutes saved per encounter", () => {
    const lo = op({ minutesSavedPerEncounter: 2, timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, patientAccessEnabled: true } });
    const hi = op({ minutesSavedPerEncounter: 8, timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, patientAccessEnabled: true } });
    expect(recomputeDriverFromExploreState("patientAccess", hi))
      .toBeGreaterThan(recomputeDriverFromExploreState("patientAccess", lo));
  });

  it("retention value rises with turnover rate (non-nursing)", () => {
    const lo = op({ timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, annualTurnoverRate: 5 } });
    const hi = op({ timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, annualTurnoverRate: 15 } });
    expect(recomputeDriverFromExploreState("retention", hi))
      .toBeGreaterThan(recomputeDriverFromExploreState("retention", lo));
  });
});
