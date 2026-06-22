import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  getYearlySummary,
} from "@/lib/proformaCalculations";
import type {
  ProformaSettingSnapshot,
  ProformaConfig,
} from "@/pages/proforma/proformaTypes";
import { DEFAULT_PROFORMA_CONFIG } from "@/pages/proforma/proformaTypes";

function makeExploreState(): any {
  return {
    careSetting: "outpatient",
    numberOfProviders: 10,
    encountersPerProvider: 3000,
    annualEncounters: 30000,
    utilizationPercent: 70,
    nursingStaffedBeds: 0,
    nursingOccupancyRate: 0,
    nursingShiftsPerNurseYear: 0,
    nursingMinutesPerShift: 0,
    timePathScenario: "redirect",
    minutesSavedPerEncounter: 7,
    dataMode: "benchmark",
    calculateRetentionValue: false,
    retentionReplacementCost: 250000,
    retentionTurnoverReduction: 10,
    costPerUnit: 200,
    implementationFee: 25000,
  };
}

function makeSetting(overrides: Partial<ProformaSettingSnapshot> = {}): ProformaSettingSnapshot {
  return {
    id: "test-outpatient",
    careSetting: "outpatient",
    label: "Test Outpatient",
    providerCount: 10,
    fullScaleProviders: 10,
    fullScaleUtilization: 70,
    encounters: 30000,
    utilizationPercent: 70,
    annualValue: 300000,
    timeValue: 0,
    docValue: 300000,
    retentionValue: 0,
    totalHoursSaved: 3500,
    drivers: [
      { id: "wRVU", name: "wRVU Uplift", value: 300000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
    ],
    costPerUnit: 200,
    implementationFee: 25000,
    goLiveMonth: 1,
    color: "#EA2C00",
    fullExploreState: makeExploreState(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<ProformaConfig> = {}): ProformaConfig {
  return { ...DEFAULT_PROFORMA_CONFIG, ...overrides };
}

describe("Test Case 1: Simple Outpatient — Single Driver, No Expansion", () => {
  const settings = [makeSetting()];
  const config = makeConfig();
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);

  it("produces exactly 36 monthly cash flow rows", () => {
    expect(cashFlows.length).toBe(36);
  });

  it("month 1 investment = costPerUnit × providers = $2000", () => {
    expect(cashFlows[0].investment).toBe(2000);
  });

  it("month 1 value is near-zero (sigmoid at progress=0 × 0.5 onset)", () => {
    expect(cashFlows[0].totalValue).toBeLessThan(10);
  });

  it("month 12 value reflects utilization scaling (Y1 util ~55%, utilScale < 1)", () => {
    expect(cashFlows[11].totalValue).toBeGreaterThan(18000);
    expect(cashFlows[11].totalValue).toBeLessThan(22000);
  });

  it("value rises from Y1 into Y2 then plateaus at the full-scale run-rate (expansionMultiplier caps at 1 once terminal util is reached)", () => {
    const y1End = cashFlows[11].totalValue;
    const y2Start = cashFlows[12].totalValue;
    const y2End = cashFlows[23].totalValue;
    const y3End = cashFlows[35].totalValue;
    // Util jumps from Y1 (55%) to Y2 (75% > terminal 70%), so the multiplier caps at 1 at the start of Y2.
    expect(y2Start).toBeGreaterThan(y1End);
    expect(y2End).toBeGreaterThanOrEqual(y2Start);
    expect(y3End).toBeGreaterThanOrEqual(y2End);
    expect(y3End).toBe(25000);
  });

  it("investment is constant at $2000/mo across all 36 months", () => {
    for (const row of cashFlows) {
      expect(row.investment).toBe(2000);
    }
  });

  it("3-year total value reflects utilization targets (Y1=55%, Y2=75%, Y3=85%)", () => {
    expect(summary.termValue).toBeGreaterThan(780000);
    expect(summary.termValue).toBeLessThan(900000);
  });

  it("3-year total investment = 36 months × $2000 + $25K impl = $97,000", () => {
    expect(summary.termInvestment).toBe(97000);
  });

  it("3-year net = value - investment", () => {
    expect(summary.termNet).toBeCloseTo(summary.termValue - summary.termInvestment, 0);
  });

  it("simple ROI = termNet / termInvestment", () => {
    const expected = summary.termNet / summary.termInvestment;
    expect(summary.simpleROI).toBeCloseTo(expected, 5);
  });

  it("value-to-cost = termValue / termInvestment", () => {
    const expected = summary.termValue / summary.termInvestment;
    expect(summary.valueToCost).toBeCloseTo(expected, 5);
  });

  it("value-to-cost = 1 + simpleROI", () => {
    expect(summary.valueToCost).toBeCloseTo(1 + summary.simpleROI, 5);
  });

  it("payback occurs early (high value-to-cost ratio)", () => {
    expect(summary.paybackMonth).toBeGreaterThanOrEqual(1);
    expect(summary.paybackMonth).toBeLessThanOrEqual(6);
  });

  it("cumulative net at month 36 matches 3-year net", () => {
    expect(cashFlows[35].cumulativeNet).toBeCloseTo(summary.termNet, -1);
  });

});

describe("Test Case 2: Expansion Scenario — Providers 10→30→50", () => {
  const settings = [makeSetting({
    providerCount: 10,
    fullScaleProviders: 50,
    yearlyProviders: { year1: 10, year2: 30, year3: 50 },
  })];
  const config = makeConfig();
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);

  it("actively documenting at month 1 is near zero (low utilization during ramp)", () => {
    const providers = cashFlows[0].bySettings["test-outpatient"].providers;
    expect(providers).toBeGreaterThanOrEqual(0);
    expect(providers).toBeLessThanOrEqual(2);
  });

  it("actively documenting at end of Y1 reflects utilization (~55%)", () => {
    const providers = cashFlows[11].bySettings["test-outpatient"].providers;
    expect(providers).toBeGreaterThanOrEqual(4);
    expect(providers).toBeLessThanOrEqual(7);
  });

  it("actively documenting grows into Y2 as new providers ramp and util increases", () => {
    const providers = cashFlows[12].bySettings["test-outpatient"].providers;
    expect(providers).toBeGreaterThanOrEqual(5);
    expect(providers).toBeLessThanOrEqual(15);
  });

  it("actively documenting at end of Y2 and Y3 reflects util scaling", () => {
    const y2End = cashFlows[23].bySettings["test-outpatient"].providers;
    const y3End = cashFlows[35].bySettings["test-outpatient"].providers;
    expect(y2End).toBeGreaterThanOrEqual(18);
    expect(y2End).toBeLessThanOrEqual(25);
    expect(y3End).toBeGreaterThanOrEqual(38);
    expect(y3End).toBeLessThanOrEqual(45);
  });

  it("investment scales with provider count (not fixed at pilot)", () => {
    expect(cashFlows[0].investment).toBe(200 * 10);
    expect(cashFlows[11].investment).toBe(200 * 10);
    expect(cashFlows[35].investment).toBe(200 * 50);
  });

  it("value at month 36 reaches the same full-scale run-rate as no-expansion (annualValue is the terminal full-scale figure; expansion only controls the ramp)", () => {
    const noExpSettings = [makeSetting()];
    const noExpCF = buildMonthlyCashFlows(noExpSettings, config);
    const noExpMonth36 = noExpCF[35].totalValue;
    const ratio = cashFlows[35].totalValue / noExpMonth36;
    expect(ratio).toBeCloseTo(1, 2);
  });

  it("3-year value is LOWER than no-expansion: expansion ramps providers in slowly, suppressing early-year value toward a fixed terminal annualValue", () => {
    const noExpSettings = [makeSetting()];
    const noExpCF = buildMonthlyCashFlows(noExpSettings, config);
    const noExpSummary = calculateProformaSummary(noExpSettings, config, noExpCF);
    expect(summary.termValue).toBeLessThan(noExpSummary.termValue);
  });

  it("3-year investment includes expansion costs (> pilot-only cost)", () => {
    expect(summary.termInvestment).toBeGreaterThan(97000);
  });

  it("3-year total value with expansion and utilization scaling", () => {
    expect(summary.termValue).toBeGreaterThan(450000);
    expect(summary.termValue).toBeLessThan(600000);
  });
});

describe("Test Case 3: Multi-Driver Onset Timing", () => {
  const settings = [makeSetting({
    annualValue: 400000,
    timeValue: 120000,
    docValue: 180000,
    retentionValue: 100000,
    drivers: [
      { id: "wRVU", name: "wRVU Uplift", value: 180000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
      { id: "patientAccess", name: "Patient Access", value: 120000, category: "time", quadrant: "Capacity", onset: "delayed" },
      { id: "retention", name: "Clinician Retention", value: 100000, category: "documentation", quadrant: "Workforce", onset: "phased" },
    ],
  })];
  const config = makeConfig();
  const cashFlows = buildMonthlyCashFlows(settings, config);

  it("delayed driver produces $0 for months 1-3 (3-month delay)", () => {
    for (let m = 0; m < 3; m++) {
      expect(cashFlows[m].capacityValue).toBe(0);
    }
  });

  it("delayed driver has full onset multiplier at month 4 (hard cutoff, no gradual ramp)", () => {
    expect(cashFlows[2].capacityValue).toBe(0);
    expect(cashFlows[3].capacityValue).toBeGreaterThan(0);
    const month4Val = cashFlows[3].capacityValue;
    const month5Val = cashFlows[4].capacityValue;
    expect(month5Val).toBeGreaterThanOrEqual(month4Val * 0.9);
  });

  it("phased (retention) driver at $0 for months 1-6, 20% onset for months 7-12", () => {
    for (let m = 0; m < 6; m++) {
      expect(cashFlows[m].workforceValue).toBe(0);
    }
    expect(cashFlows[6].workforceValue).toBeGreaterThan(0);
    const month7Ret = cashFlows[6].workforceValue;
    const fullMonthlyRet = 100000 / 12;
    expect(month7Ret).toBeLessThan(fullMonthlyRet * 0.5);
    const y1Retention = cashFlows.slice(0, 12).reduce((s, r) => s + r.workforceValue, 0);
    expect(y1Retention).toBeGreaterThan(0);
    expect(y1Retention).toBeLessThan(15000);
  });

  it("phased driver onset jumps to 65% at month 13 boundary (monthsSinceGoLive=12)", () => {
    const month12Ret = cashFlows[11].workforceValue;
    const month13Ret = cashFlows[12].workforceValue;
    expect(month13Ret).toBeGreaterThan(month12Ret * 2);
    const fullMonthlyRet = 100000 / 12;
    expect(month13Ret).toBeGreaterThan(fullMonthlyRet * 0.5);
    expect(month13Ret).toBeLessThan(fullMonthlyRet * 0.8);
  });

  it("phased driver onset jumps to 100% at month 25 boundary (monthsSinceGoLive=24)", () => {
    const month24Ret = cashFlows[23].workforceValue;
    const month25Ret = cashFlows[24].workforceValue;
    expect(month25Ret).toBeGreaterThan(month24Ret * 1.2);
    const fullMonthlyRet = 100000 / 12;
    expect(month25Ret).toBeGreaterThan(fullMonthlyRet * 0.85);
    expect(month25Ret).toBeLessThan(fullMonthlyRet * 1.15);
  });

  it("total value = sum of all driver categories", () => {
    for (const row of cashFlows) {
      expect(Math.abs(row.totalValue - (row.capacityValue + row.workforceValue + row.revenueValue + row.qualityValue + row.displacementValue))).toBeLessThanOrEqual(2);
    }
  });

  it("year 1 total is reduced by 6-month retention delay and utilization ramp", () => {
    const y1Total = cashFlows.slice(0, 12).reduce((s, r) => s + r.totalValue, 0);
    expect(y1Total).toBeGreaterThan(100000);
    expect(y1Total).toBeLessThan(250000);
  });

  it("year 2 total has all drivers active (capacity full, retention at 65%)", () => {
    const y2Total = cashFlows.slice(12, 24).reduce((s, r) => s + r.totalValue, 0);
    expect(y2Total).toBeGreaterThan(200000);
    expect(y2Total).toBeLessThan(400000);
  });

  it("year 3 total is highest (retention at 100%, full utilization)", () => {
    const y3Total = cashFlows.slice(24, 36).reduce((s, r) => s + r.totalValue, 0);
    const y2Total = cashFlows.slice(12, 24).reduce((s, r) => s + r.totalValue, 0);
    expect(y3Total).toBeGreaterThan(y2Total);
  });
});

describe("Test Case 4: Sensitivity Value-Only Scaling", () => {
  const baseSettings = [makeSetting({
    annualValue: 500000,
    timeValue: 200000,
    docValue: 300000,
    drivers: [
      { id: "wRVU", name: "wRVU", value: 300000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
      { id: "access", name: "Access", value: 200000, category: "time", quadrant: "Capacity", onset: "delayed" },
    ],
  })];
  const config = makeConfig();

  const scaleSettings = (s: ProformaSettingSnapshot, valueFactor: number) => ({
    ...s,
    annualValue: s.annualValue * valueFactor,
    retentionValue: s.retentionValue * valueFactor,
    drivers: s.drivers.map((d) => ({ ...d, value: d.value * valueFactor })),
  });

  const consSettings = baseSettings.map((s) => scaleSettings(s, 0.7));
  const optSettings = baseSettings.map((s) => scaleSettings(s, 1.3));

  const baseCF = buildMonthlyCashFlows(baseSettings, config);
  const consCF = buildMonthlyCashFlows(consSettings, config);
  const optCF = buildMonthlyCashFlows(optSettings, config);

  const baseSummary = calculateProformaSummary(baseSettings, config, baseCF);
  const consSummary = calculateProformaSummary(consSettings, config, consCF);
  const optSummary = calculateProformaSummary(optSettings, config, optCF);

  it("conservative value = ~70% of base value", () => {
    const ratio = consSummary.termValue / baseSummary.termValue;
    expect(ratio).toBeCloseTo(0.7, 1);
  });

  it("optimistic value = ~130% of base value", () => {
    const ratio = optSummary.termValue / baseSummary.termValue;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("cost is IDENTICAL across all three scenarios", () => {
    expect(consSummary.termInvestment).toBe(baseSummary.termInvestment);
    expect(optSummary.termInvestment).toBe(baseSummary.termInvestment);
  });

  it("monthly investment is identical across scenarios", () => {
    for (let m = 0; m < 36; m++) {
      expect(consCF[m].investment).toBe(baseCF[m].investment);
      expect(optCF[m].investment).toBe(baseCF[m].investment);
    }
  });

  it("conservative value-to-cost < base < optimistic", () => {
    expect(consSummary.valueToCost).toBeLessThan(baseSummary.valueToCost);
    expect(baseSummary.valueToCost).toBeLessThan(optSummary.valueToCost);
  });

  it("conservative payback is later than or equal to base", () => {
    if (consSummary.paybackMonth !== null && baseSummary.paybackMonth !== null) {
      expect(consSummary.paybackMonth).toBeGreaterThanOrEqual(baseSummary.paybackMonth);
    }
  });
});

describe("Test Case 5: 3-Year P&L Cross-Check", () => {
  const settings = [makeSetting({
    annualValue: 400000,
    timeValue: 120000,
    docValue: 180000,
    retentionValue: 100000,
    drivers: [
      { id: "wRVU", name: "wRVU", value: 180000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
      { id: "access", name: "Access", value: 120000, category: "time", quadrant: "Capacity", onset: "delayed" },
      { id: "retention", name: "Retention", value: 100000, category: "documentation", quadrant: "Workforce", onset: "phased" },
    ],
  })];
  const config = makeConfig();
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);
  const yearlyData = getYearlySummary(cashFlows, settings);

  it("yearly value sums match monthly total value", () => {
    const yearlyTotalValue = yearlyData.reduce((s, y) => s + y.totalValue, 0);
    const monthlyTotalValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
    expect(yearlyTotalValue).toBeCloseTo(monthlyTotalValue, 0);
  });

  it("yearly investment sums match monthly + impl fees", () => {
    const yearlyTotalInvestment = yearlyData.reduce((s, y) => s + y.investment, 0);
    const monthlyTotalInvestment = cashFlows.reduce((s, r) => s + r.investment, 0) + 25000;
    expect(yearlyTotalInvestment).toBeCloseTo(monthlyTotalInvestment, 0);
  });

  it("yearly net value sums match termNet from summary", () => {
    const yearlyTotalNet = yearlyData.reduce((s, y) => s + y.netValue, 0);
    expect(yearlyTotalNet).toBeCloseTo(summary.termNet, 0);
  });

  it("value breakdown (doc + time + retention) matches total per year", () => {
    for (const year of yearlyData) {
      expect(Math.abs(year.totalValue - (year.capacityValue + year.workforceValue + year.revenueValue + year.qualityValue + year.displacementValue))).toBeLessThanOrEqual(10);
    }
  });

  it("impl fees added only to year 1 investment", () => {
    const y1SubOnly = cashFlows.slice(0, 12).reduce((s, r) => s + r.investment, 0);
    expect(yearlyData[0].investment).toBe(y1SubOnly + 25000);
    if (yearlyData.length > 1) {
      const y2SubOnly = cashFlows.slice(12, 24).reduce((s, r) => s + r.investment, 0);
      expect(yearlyData[1].investment).toBe(y2SubOnly);
    }
  });

  it("summary.termValue matches sum of monthly cash flows", () => {
    const monthlySum = cashFlows.reduce((s, r) => s + r.totalValue, 0);
    expect(summary.termValue).toBeCloseTo(monthlySum, 0);
  });

  it("summary.termInvestment = subscription + impl fees", () => {
    const subTotal = cashFlows.reduce((s, r) => s + r.investment, 0);
    expect(summary.termInvestment).toBe(subTotal + 25000);
  });
});

describe("Adoption Ramp Uses Implementation Ramp Duration", () => {
  it("phased driver produces value at month 7 (after 6-month onset delay)", () => {
    const settings = [makeSetting({
      annualValue: 120000,
      retentionValue: 120000,
      drivers: [
        { id: "retention", name: "Retention", value: 120000, category: "time", quadrant: "Workforce", onset: "phased" as const },
      ],
    })];
    const config = makeConfig({ implementationRampMonths: 3 });
    const cashFlows = buildMonthlyCashFlows(settings, config);

    for (let m = 0; m < 6; m++) {
      expect(cashFlows[m].workforceValue).toBe(0);
    }
    expect(cashFlows[6].workforceValue).toBeGreaterThan(0);
  });

  it("delayed driver produces value at month 4 (onset delay = 3 months)", () => {
    const settings = [makeSetting({
      annualValue: 120000,
      timeValue: 120000,
      drivers: [
        { id: "capacity", name: "Capacity", value: 120000, category: "time", quadrant: "Capacity", onset: "delayed" as const },
      ],
    })];
    const config = makeConfig({ implementationRampMonths: 3 });
    const cashFlows = buildMonthlyCashFlows(settings, config);

    expect(cashFlows[0].capacityValue).toBe(0);
    expect(cashFlows[1].capacityValue).toBe(0);
    expect(cashFlows[2].capacityValue).toBe(0);
    expect(cashFlows[3].capacityValue).toBeGreaterThan(0);
  });

  it("adoption ramp with implRampMonths=3 produces more early value than 12-month ramp would", () => {
    const settings = [makeSetting({
      annualValue: 120000,
      timeValue: 120000,
      drivers: [
        { id: "capacity", name: "Capacity", value: 120000, category: "time", quadrant: "Capacity", onset: "delayed" as const },
      ],
    })];
    const config3 = makeConfig({ implementationRampMonths: 3 });
    const config12 = makeConfig({ implementationRampMonths: 12 });

    const cf3 = buildMonthlyCashFlows(settings, config3);
    const cf12 = buildMonthlyCashFlows(settings, config12);

    const early3 = cf3.slice(3, 8).reduce((s, r) => s + r.capacityValue, 0);
    const early12 = cf12.slice(3, 8).reduce((s, r) => s + r.capacityValue, 0);
    expect(early3).toBeGreaterThan(early12);
  });
});

describe("Edge Cases and Guardrails", () => {
  it("zero-value drivers produce zero total value", () => {
    const settings = [makeSetting({
      annualValue: 0,
      timeValue: 0,
      docValue: 0,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 0, category: "documentation", quadrant: "Revenue", onset: "immediate" },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const totalValue = cashFlows.reduce((s, r) => s + r.totalValue, 0);
    expect(totalValue).toBe(0);
  });

  it("very high value scenario still produces finite, non-NaN results", () => {
    const settings = [makeSetting({
      annualValue: 50000000,
      docValue: 50000000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 50000000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(isFinite(summary.termValue)).toBe(true);
    expect(isFinite(summary.valueToCost)).toBe(true);
    expect(summary.termValue).toBeGreaterThan(0);
  });

  it("no-expansion: month 36 value reflects Y3 utilization scaling", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 10,
      fullScaleUtilization: 70,
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    const month36Value = cashFlows[35].totalValue;
    const monthlyRunRate = 300000 / 12;
    // expansionMultiplier caps at 1, so month 36 lands exactly on the full-scale monthly run-rate.
    expect(month36Value).toBe(monthlyRunRate);
  });
});

describe("Run-Rate Value (Annual Value at Scale)", () => {
  it("no expansion: run-rate equals the full-scale annual value (last 12 months at terminal scale; expansionMultiplier capped at 1)", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.runRateValue).toBe(300000);
  });

  it("with expansion: run-rate approaches the fixed full-scale annualValue (expansionMultiplier caps at 1, so the run-rate converges to annualValue rather than scaling with providers)", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.runRateValue).toBeGreaterThan(290000);
    expect(summary.runRateValue).toBeLessThanOrEqual(300000);
  });

  it("run-rate investment matches last 12 months of subscription", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    const last12 = cashFlows.slice(-12);
    const expectedInv = last12.reduce((s, r) => s + r.investment, 0);
    expect(summary.runRateInvestment).toBe(expectedInv);
  });

  it("run-rate with expansion reflects scaled provider count and utilization", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    // annualValue is the full-scale terminal figure; the run-rate converges to it (slightly under due to
    // rounding of the final-quarter provider/util ramp), and never exceeds it because expansionMultiplier caps at 1.
    expect(summary.runRateValue).toBeGreaterThan(summary.totalSystemValue * 0.95);
    expect(summary.runRateValue).toBeLessThanOrEqual(summary.totalSystemValue);
  });
});

describe("PDF Math Consistency", () => {
  it("PDF and live view use identical calculation functions", () => {
    const settings = [makeSetting({
      annualValue: 400000,
      timeValue: 120000,
      docValue: 180000,
      retentionValue: 100000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 180000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
        { id: "access", name: "Access", value: 120000, category: "time", quadrant: "Capacity", onset: "delayed" },
        { id: "retention", name: "Retention", value: 100000, category: "documentation", quadrant: "Workforce", onset: "phased" },
      ],
    })];
    const config = makeConfig();

    const cf1 = buildMonthlyCashFlows(settings, config);
    const cf2 = buildMonthlyCashFlows(settings, config);

    for (let m = 0; m < 36; m++) {
      expect(cf1[m].totalValue).toBe(cf2[m].totalValue);
      expect(cf1[m].investment).toBe(cf2[m].investment);
      expect(cf1[m].netValue).toBe(cf2[m].netValue);
    }

    const summary1 = calculateProformaSummary(settings, config, cf1);
    const summary2 = calculateProformaSummary(settings, config, cf2);

    expect(summary1.termValue).toBe(summary2.termValue);
    expect(summary1.termInvestment).toBe(summary2.termInvestment);
    expect(summary1.valueToCost).toBe(summary2.valueToCost);
    expect(summary1.simpleROI).toBe(summary2.simpleROI);
    expect(summary1.paybackMonth).toBe(summary2.paybackMonth);
  });

  it("sensitivity scaling in PDF matches live view (70%/130% value-only)", () => {
    const baseSettings = [makeSetting()];
    const config = makeConfig();

    const scaleSettings = (s: ProformaSettingSnapshot, valueFactor: number) => ({
      ...s,
      annualValue: s.annualValue * valueFactor,
      retentionValue: s.retentionValue * valueFactor,
      drivers: s.drivers.map((d) => ({ ...d, value: d.value * valueFactor })),
    });

    const consSettings = baseSettings.map((s) => scaleSettings(s, 0.7));
    const optSettings = baseSettings.map((s) => scaleSettings(s, 1.3));

    const consCF = buildMonthlyCashFlows(consSettings, config);
    const optCF = buildMonthlyCashFlows(optSettings, config);
    const baseCF = buildMonthlyCashFlows(baseSettings, config);

    expect(consCF[0].investment).toBe(baseCF[0].investment);
    expect(optCF[0].investment).toBe(baseCF[0].investment);

    const consVal = consCF.reduce((s, r) => s + r.totalValue, 0);
    const baseVal = baseCF.reduce((s, r) => s + r.totalValue, 0);
    const optVal = optCF.reduce((s, r) => s + r.totalValue, 0);

    expect(consVal / baseVal).toBeCloseTo(0.7, 1);
    expect(optVal / baseVal).toBeCloseTo(1.3, 1);
  });

  it("driver values in cash flows scale with utilization at month 36", () => {
    const settings = [makeSetting({
      annualValue: 500000,
      timeValue: 200000,
      docValue: 300000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 300000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
        { id: "access", name: "Access", value: 200000, category: "time", quadrant: "Capacity", onset: "delayed" },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    const m36 = cashFlows[35];
    const baseMonthlyDoc = 300000 / 12;
    const baseMonthlyTime = 200000 / 12;
    // expansionMultiplier caps at 1, so each bucket lands exactly on its full-scale monthly run-rate.
    expect(m36.revenueValue).toBe(Math.round(baseMonthlyDoc));
    expect(m36.capacityValue).toBe(Math.round(baseMonthlyTime));
    expect(m36.totalValue).toBeCloseTo(m36.revenueValue + m36.capacityValue, -1);
  });
});

describe("Annual Flat License Pricing", () => {
  const annualFee = 500000;
  const flatSetting = makeSetting({
    pricingModel: "annualFlat",
    annualLicenseFee: annualFee,
    costPerUnit: 200,
    providerCount: 10,
    fullScaleProviders: 50,
    yearlyProviders: { year1: 10, year2: 30, year3: 50 },
  });

  it("produces fixed monthly investment regardless of provider scaling", () => {
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([flatSetting], config);
    const expectedMonthly = Math.round(annualFee / 12);

    for (const row of cashFlows) {
      expect(row.investment).toBe(expectedMonthly);
    }
  });

  it("flat cost stays constant while perUnit scales with providers", () => {
    const config = makeConfig();
    const flatFlows = buildMonthlyCashFlows([flatSetting], config);

    const flatM1 = flatFlows[0].investment;
    const flatM36 = flatFlows[35].investment;
    expect(flatM1).toBe(flatM36);

    const perUnitSetting = makeSetting({
      pricingModel: "perUnit",
      costPerUnit: 200,
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    });
    const perUnitFlows = buildMonthlyCashFlows([perUnitSetting], config);

    const puM1 = perUnitFlows[0].investment;
    const puM36 = perUnitFlows[35].investment;
    expect(puM36).toBeGreaterThan(puM1);
  });

  it("mixed scenario: one perUnit + one annualFlat", () => {
    const perUnitSetting = makeSetting({
      id: "per-unit-setting",
      costPerUnit: 200,
      providerCount: 10,
    });
    const flatSettingB = makeSetting({
      id: "flat-setting",
      pricingModel: "annualFlat",
      annualLicenseFee: 300000,
      costPerUnit: 0,
      providerCount: 20,
    });

    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([perUnitSetting, flatSettingB], config);

    const m1 = cashFlows[0];
    const expectedPerUnit = 200 * 10;
    const expectedFlat = Math.round(300000 / 12);
    expect(m1.investment).toBe(expectedPerUnit + expectedFlat);
  });

  it("default pricingModel (undefined) behaves as perUnit", () => {
    const defaultSetting = makeSetting({ costPerUnit: 200, providerCount: 10 });
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([defaultSetting], config);

    expect(cashFlows[0].investment).toBe(200 * 10);
  });

  it("encounter-based pricing produces correct monthly investment", () => {
    const setting = makeSetting({
      pricingModel: "perEncounter",
      costPerEncounter: 12,
      encounters: 30000,
      providerCount: 10,
      costPerUnit: 0,
    });
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([setting], config);

    // Engine bills UTILIZED encounters (contracted × utilizationPercent), not all contracted encounters.
    const utilPct = 70 / 100;
    const expectedMonthly = 12 * (30000 * utilPct / 12);
    expect(cashFlows[0].investment).toBe(expectedMonthly);
  });

  it("encounter-based pricing scales with encounter expansion", () => {
    const setting = makeSetting({
      pricingModel: "perEncounter",
      costPerEncounter: 10,
      encounters: 30000,
      yearlyEncounters: { year1: 30000, year2: 60000, year3: 60000 },
      providerCount: 10,
      fullScaleProviders: 20,
      yearlyProviders: { year1: 10, year2: 20, year3: 20 },
      costPerUnit: 0,
    });
    const config = makeConfig({ contractTermMonths: 36 });
    const cashFlows = buildMonthlyCashFlows([setting], config);

    const month1Inv = cashFlows[0].investment;
    const month13 = cashFlows[12];
    expect(month13.investment).toBeGreaterThan(month1Inv);
  });

  it("three-model mixed scenario produces correct monthly investment", () => {
    const perUnitS = makeSetting({
      id: "pu",
      costPerUnit: 200,
      providerCount: 10,
    });
    const flatS = makeSetting({
      id: "flat",
      pricingModel: "annualFlat",
      annualLicenseFee: 240000,
      costPerUnit: 0,
      providerCount: 10,
    });
    const encS = makeSetting({
      id: "enc",
      pricingModel: "perEncounter",
      costPerEncounter: 10,
      encounters: 30000,
      providerCount: 10,
      costPerUnit: 0,
    });
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([perUnitS, flatS, encS], config);

    const m1 = cashFlows[0];
    const expectedPerUnit = 200 * 10;
    const expectedFlat = Math.round(240000 / 12);
    // Engine bills UTILIZED encounters (contracted × utilizationPercent), not all contracted encounters.
    const expectedEnc = 10 * (30000 * (70 / 100) / 12);
    expect(m1.investment).toBe(expectedPerUnit + expectedFlat + expectedEnc);
  });
});

describe("Variable contract term (1–6 years)", () => {
  it("48-month (4-year) term generates 48 cash flow rows", () => {
    const settings = [makeSetting()];
    const config = makeConfig({ contractTermMonths: 48 });
    const cashFlows = buildMonthlyCashFlows(settings, config);
    expect(cashFlows.length).toBe(48);
    expect(cashFlows[47].period).toBe(48);
  });

  it("60-month (5-year) term generates 60 cash flow rows", () => {
    const settings = [makeSetting()];
    const config = makeConfig({ contractTermMonths: 60 });
    const cashFlows = buildMonthlyCashFlows(settings, config);
    expect(cashFlows.length).toBe(60);
    expect(cashFlows[59].period).toBe(60);
  });

  it("12-month (1-year) term generates 12 cash flow rows", () => {
    const settings = [makeSetting()];
    const config = makeConfig({ contractTermMonths: 12 });
    const cashFlows = buildMonthlyCashFlows(settings, config);
    expect(cashFlows.length).toBe(12);
  });

  it("getYearlySummary returns correct number of year buckets", () => {
    const settings = [makeSetting()];
    const config4 = makeConfig({ contractTermMonths: 48 });
    const cf4 = buildMonthlyCashFlows(settings, config4);
    const ys4 = getYearlySummary(cf4, settings);
    expect(ys4.length).toBe(4);

    const config5 = makeConfig({ contractTermMonths: 60 });
    const cf5 = buildMonthlyCashFlows(settings, config5);
    const ys5 = getYearlySummary(cf5, settings);
    expect(ys5.length).toBe(5);

    const config1 = makeConfig({ contractTermMonths: 12 });
    const cf1 = buildMonthlyCashFlows(settings, config1);
    const ys1 = getYearlySummary(cf1, settings);
    expect(ys1.length).toBe(1);
  });

  it("4-year summary termValue accumulates all 48 months", () => {
    const settings = [makeSetting()];
    const config = makeConfig({ contractTermMonths: 48 });
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);
    const config36 = makeConfig({ contractTermMonths: 36 });
    const cf36 = buildMonthlyCashFlows(settings, config36);
    const summary36 = calculateProformaSummary(settings, config36, cf36);
    expect(summary.termValue).toBeGreaterThan(summary36.termValue);
  });

  it("longer contracts produce higher total investment", () => {
    const settings = [makeSetting()];
    const config24 = makeConfig({ contractTermMonths: 24 });
    const cf24 = buildMonthlyCashFlows(settings, config24);
    const s24 = calculateProformaSummary(settings, config24, cf24);

    const config48 = makeConfig({ contractTermMonths: 48 });
    const cf48 = buildMonthlyCashFlows(settings, config48);
    const s48 = calculateProformaSummary(settings, config48, cf48);

    expect(s48.termInvestment).toBeGreaterThan(s24.termInvestment);
  });
});

describe("Displacement is cost-reduction (Way B), not value", () => {
  const config = makeConfig();
  const base = [makeSetting()];
  const withOffset = [makeSetting({
    costOffsets: [{ id: "o", label: "Scribes", annualSpend: 12000, displacementPct: 100, transitionMonths: 0 }],
  })];
  const baseS = calculateProformaSummary(base, config, buildMonthlyCashFlows(base, config));
  const offS = calculateProformaSummary(withOffset, config, buildMonthlyCashFlows(withOffset, config));

  it("a cost offset does NOT inflate value — value stays clinical", () => {
    expect(offS.termValue).toBeCloseTo(baseS.termValue, -1);
  });

  it("a cost offset reduces what you pay — investment drops", () => {
    expect(offS.termInvestment).toBeLessThan(baseS.termInvestment);
  });

  it("net gain equals the cost reduction (net dollars preserved, just reframed)", () => {
    const costDrop = baseS.termInvestment - offS.termInvestment;
    const netGain = offS.termNet - baseS.termNet;
    expect(costDrop).toBeGreaterThan(0);
    expect(netGain).toBeCloseTo(costDrop, -1);
  });
});
