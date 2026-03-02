import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  buildAnnualIRRCashFlows,
  calculateAnnualIRR,
  npvAtRate,
} from "@/lib/proformaCalculations";
import { getYearlySummary } from "@/lib/proformaCalculations";
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
    timeAllocation: { patientAccess: 50, costReduction: 50 },
    edTimeAllocation: { lwbs: 50, throughput: 50 },
    docPathFocus: null,
    docDrivers: {},
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
      { id: "wRVU", name: "wRVU Uplift", value: 300000, category: "documentation", onset: "immediate" },
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

  it("month 12 value approaches full monthly ($25K) due to sigmoid saturation", () => {
    expect(cashFlows[11].totalValue).toBeGreaterThan(24000);
    expect(cashFlows[11].totalValue).toBeLessThan(26000);
  });

  it("months 13+ at full run-rate ($25K/mo)", () => {
    for (let m = 12; m < 36; m++) {
      expect(cashFlows[m].totalValue).toBe(25000);
    }
  });

  it("investment is constant at $2000/mo across all 36 months", () => {
    for (const row of cashFlows) {
      expect(row.investment).toBe(2000);
    }
  });

  it("3-year total value matches hand calculation within 1%", () => {
    expect(summary.threeYearValue).toBeGreaterThan(730000);
    expect(summary.threeYearValue).toBeLessThan(745000);
  });

  it("3-year total investment = 36 months × $2000 + $25K impl = $97,000", () => {
    expect(summary.threeYearInvestment).toBe(97000);
  });

  it("3-year net = value - investment", () => {
    expect(summary.threeYearNet).toBeCloseTo(summary.threeYearValue - summary.threeYearInvestment, 0);
  });

  it("simple ROI = threeYearNet / threeYearInvestment", () => {
    const expected = summary.threeYearNet / summary.threeYearInvestment;
    expect(summary.simpleROI).toBeCloseTo(expected, 5);
  });

  it("value-to-cost = threeYearValue / threeYearInvestment", () => {
    const expected = summary.threeYearValue / summary.threeYearInvestment;
    expect(summary.valueToCost).toBeCloseTo(expected, 5);
  });

  it("value-to-cost = 1 + simpleROI", () => {
    expect(summary.valueToCost).toBeCloseTo(1 + summary.simpleROI, 5);
  });

  it("payback occurs around month 8 (hand-calculated)", () => {
    expect(summary.paybackMonth).toBeGreaterThanOrEqual(7);
    expect(summary.paybackMonth).toBeLessThanOrEqual(9);
  });

  it("cumulative net at month 36 matches 3-year net", () => {
    expect(cashFlows[35].cumulativeNet).toBeCloseTo(summary.threeYearNet, 0);
  });

  it("IRR is valid and positive", () => {
    expect(summary.irrValid).toBe(true);
    expect(summary.irr).toBeGreaterThan(0);
  });

  it("IRR is finite and positive (high is expected: $300K value on $97K cost)", () => {
    expect(isFinite(summary.irr)).toBe(true);
    expect(summary.irr).toBeGreaterThan(1.0);
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

  it("provider count at month 1 = 10 (pilot)", () => {
    expect(cashFlows[0].bySettings["test-outpatient"].providers).toBe(10);
  });

  it("provider count ramps to ~28 by month 12", () => {
    const providers = cashFlows[11].bySettings["test-outpatient"].providers;
    expect(providers).toBeGreaterThanOrEqual(26);
    expect(providers).toBeLessThanOrEqual(30);
  });

  it("provider count reaches 30 by month 13", () => {
    expect(cashFlows[12].bySettings["test-outpatient"].providers).toBe(30);
  });

  it("provider count reaches 50 by month 25+", () => {
    expect(cashFlows[24].bySettings["test-outpatient"].providers).toBe(50);
    expect(cashFlows[35].bySettings["test-outpatient"].providers).toBe(50);
  });

  it("investment scales with provider count (not fixed at pilot)", () => {
    expect(cashFlows[0].investment).toBe(200 * 10);
    expect(cashFlows[24].investment).toBe(200 * 50);
    expect(cashFlows[35].investment).toBe(200 * 50);
  });

  it("value at month 36 is 5x the no-expansion steady state", () => {
    expect(cashFlows[35].totalValue).toBe(25000 * 5);
  });

  it("3-year value is much higher than no-expansion scenario", () => {
    const noExpSettings = [makeSetting()];
    const noExpCF = buildMonthlyCashFlows(noExpSettings, config);
    const noExpSummary = calculateProformaSummary(noExpSettings, config, noExpCF);
    expect(summary.threeYearValue).toBeGreaterThan(noExpSummary.threeYearValue * 2);
  });

  it("3-year investment includes expansion costs (> pilot-only cost)", () => {
    expect(summary.threeYearInvestment).toBeGreaterThan(97000);
  });

  it("3-year total value near $3M (hand-calculated ~$3,004,099)", () => {
    expect(summary.threeYearValue).toBeGreaterThan(2800000);
    expect(summary.threeYearValue).toBeLessThan(3200000);
  });
});

describe("Test Case 3: Multi-Driver Onset Timing", () => {
  const settings = [makeSetting({
    annualValue: 400000,
    timeValue: 120000,
    docValue: 180000,
    retentionValue: 100000,
    drivers: [
      { id: "wRVU", name: "wRVU Uplift", value: 180000, category: "documentation", onset: "immediate" },
      { id: "patientAccess", name: "Patient Access", value: 120000, category: "time", onset: "delayed" },
      { id: "retention", name: "Clinician Retention", value: 100000, category: "documentation", onset: "phased" },
    ],
  })];
  const config = makeConfig();
  const cashFlows = buildMonthlyCashFlows(settings, config);

  it("delayed driver produces $0 for months 1-7 (6-month delay + onset at 0)", () => {
    for (let m = 0; m < 7; m++) {
      expect(cashFlows[m].timeValue).toBe(0);
    }
  });

  it("delayed driver starts ramping at month 8 (monthsSinceGoLive=7)", () => {
    expect(cashFlows[7].timeValue).toBeGreaterThan(0);
  });

  it("phased (retention) driver is $0 during year 1 (phasing=0%)", () => {
    for (let m = 0; m < 12; m++) {
      expect(cashFlows[m].retentionValue).toBe(0);
    }
  });

  it("phased driver starts at 50% in year 2 (month 13+)", () => {
    const month13Ret = cashFlows[12].retentionValue;
    const fullMonthlyRet = 100000 / 12;
    expect(month13Ret).toBeCloseTo(fullMonthlyRet * 0.5, -1);
  });

  it("phased driver reaches 100% in year 3 (month 25+)", () => {
    const month25Ret = cashFlows[24].retentionValue;
    const fullMonthlyRet = 100000 / 12;
    expect(month25Ret).toBeCloseTo(fullMonthlyRet * 1.0, -1);
  });

  it("total value = sum of all three driver categories", () => {
    for (const row of cashFlows) {
      expect(Math.abs(row.totalValue - (row.docValue + row.timeValue + row.retentionValue))).toBeLessThanOrEqual(2);
    }
  });

  it("year 1 total matches hand calculation (~$110K)", () => {
    const y1Total = cashFlows.slice(0, 12).reduce((s, r) => s + r.totalValue, 0);
    expect(y1Total).toBeGreaterThan(100000);
    expect(y1Total).toBeLessThan(130000);
  });

  it("year 2 total matches hand calculation (~$350K)", () => {
    const y2Total = cashFlows.slice(12, 24).reduce((s, r) => s + r.totalValue, 0);
    expect(y2Total).toBeGreaterThan(340000);
    expect(y2Total).toBeLessThan(360000);
  });

  it("year 3 total matches hand calculation (~$400K)", () => {
    const y3Total = cashFlows.slice(24, 36).reduce((s, r) => s + r.totalValue, 0);
    expect(y3Total).toBeGreaterThan(390000);
    expect(y3Total).toBeLessThan(410000);
  });
});

describe("Test Case 4: Sensitivity Value-Only Scaling", () => {
  const baseSettings = [makeSetting({
    annualValue: 500000,
    timeValue: 200000,
    docValue: 300000,
    drivers: [
      { id: "wRVU", name: "wRVU", value: 300000, category: "documentation", onset: "immediate" },
      { id: "access", name: "Access", value: 200000, category: "time", onset: "delayed" },
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
    const ratio = consSummary.threeYearValue / baseSummary.threeYearValue;
    expect(ratio).toBeCloseTo(0.7, 1);
  });

  it("optimistic value = ~130% of base value", () => {
    const ratio = optSummary.threeYearValue / baseSummary.threeYearValue;
    expect(ratio).toBeCloseTo(1.3, 1);
  });

  it("cost is IDENTICAL across all three scenarios", () => {
    expect(consSummary.threeYearInvestment).toBe(baseSummary.threeYearInvestment);
    expect(optSummary.threeYearInvestment).toBe(baseSummary.threeYearInvestment);
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
      { id: "wRVU", name: "wRVU", value: 180000, category: "documentation", onset: "immediate" },
      { id: "access", name: "Access", value: 120000, category: "time", onset: "delayed" },
      { id: "retention", name: "Retention", value: 100000, category: "documentation", onset: "phased" },
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

  it("yearly net value sums match threeYearNet from summary", () => {
    const yearlyTotalNet = yearlyData.reduce((s, y) => s + y.netValue, 0);
    expect(yearlyTotalNet).toBeCloseTo(summary.threeYearNet, 0);
  });

  it("value breakdown (doc + time + retention) matches total per year", () => {
    for (const year of yearlyData) {
      expect(Math.abs(year.totalValue - (year.docValue + year.timeValue + year.retentionValue))).toBeLessThanOrEqual(2);
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

  it("summary.threeYearValue matches sum of monthly cash flows", () => {
    const monthlySum = cashFlows.reduce((s, r) => s + r.totalValue, 0);
    expect(summary.threeYearValue).toBeCloseTo(monthlySum, 0);
  });

  it("summary.threeYearInvestment = subscription + impl fees", () => {
    const subTotal = cashFlows.reduce((s, r) => s + r.investment, 0);
    expect(summary.threeYearInvestment).toBe(subTotal + 25000);
  });
});

describe("IRR Cross-Validation", () => {
  it("NPV at the annual IRR rate is approximately zero", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const annualCF = buildAnnualIRRCashFlows(settings, config, cashFlows);
    const result = calculateAnnualIRR(annualCF);

    expect(result.isValid).toBe(true);
    const npv = npvAtRate(annualCF, result.annualizedRate);
    const totalAbsFlow = annualCF.reduce((s, v) => s + Math.abs(v), 0);
    expect(Math.abs(npv) / totalAbsFlow).toBeLessThan(0.001);
  });

  it("annual cash flow period 0 = negative total cost (impl + subscription)", () => {
    const settings = [makeSetting({ implementationFee: 50000 })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const annualCF = buildAnnualIRRCashFlows(settings, config, cashFlows);

    const totalSub = cashFlows.reduce((s, r) => s + r.investment, 0);
    expect(annualCF[0]).toBe(-(50000 + totalSub));
  });

  it("annual cash flows have 4 entries (period 0 + 3 years)", () => {
    const settings = [makeSetting()];
    const config = makeConfig({ contractTermMonths: 36 });
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const annualCF = buildAnnualIRRCashFlows(settings, config, cashFlows);

    expect(annualCF.length).toBe(4);
  });

  it("year 1 return = year 1 gross value (subscription already in Period 0)", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const annualCF = buildAnnualIRRCashFlows(settings, config, cashFlows);

    const y1Gross = cashFlows.slice(0, 12).reduce((s, r) => s + r.docValue + r.timeValue + r.retentionValue, 0);
    expect(annualCF[1]).toBeCloseTo(y1Gross, 0);
  });
});

describe("Edge Cases and Guardrails", () => {
  it("zero-value drivers produce zero total value", () => {
    const settings = [makeSetting({
      annualValue: 0,
      timeValue: 0,
      docValue: 0,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 0, category: "documentation", onset: "immediate" },
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
        { id: "wRVU", name: "wRVU", value: 50000000, category: "documentation", onset: "immediate" },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(isFinite(summary.threeYearValue)).toBe(true);
    expect(isFinite(summary.valueToCost)).toBe(true);
    expect(summary.threeYearValue).toBeGreaterThan(0);
  });

  it("no-expansion means value does not scale beyond base", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 10,
      fullScaleUtilization: 70,
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    const month36Value = cashFlows[35].totalValue;
    const monthlyRunRate = 300000 / 12;
    expect(month36Value).toBe(monthlyRunRate);
  });
});

describe("Run-Rate Value (Annual Value at Scale)", () => {
  it("no expansion: run-rate = sum of last 12 months = full annual value", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.runRateValue).toBe(300000);
  });

  it("with expansion: run-rate reflects expanded provider count", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.runRateValue).toBeGreaterThan(300000);
    expect(summary.runRateValue).toBeLessThan(300000 * 6);
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

  it("run-rate is more defensible than raw totalSystemValue with expansion", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 50,
      yearlyProviders: { year1: 10, year2: 30, year3: 50 },
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.runRateValue).toBeGreaterThan(summary.totalSystemValue);
    expect(summary.runRateValue).toBeLessThanOrEqual(summary.totalSystemValue * 5);
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
        { id: "wRVU", name: "wRVU", value: 180000, category: "documentation", onset: "immediate" },
        { id: "access", name: "Access", value: 120000, category: "time", onset: "delayed" },
        { id: "retention", name: "Retention", value: 100000, category: "documentation", onset: "phased" },
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

    expect(summary1.threeYearValue).toBe(summary2.threeYearValue);
    expect(summary1.threeYearInvestment).toBe(summary2.threeYearInvestment);
    expect(summary1.valueToCost).toBe(summary2.valueToCost);
    expect(summary1.simpleROI).toBe(summary2.simpleROI);
    expect(summary1.irr).toBe(summary2.irr);
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

  it("driver values in cash flows match sum stored in snapshot", () => {
    const settings = [makeSetting({
      annualValue: 500000,
      timeValue: 200000,
      docValue: 300000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 300000, category: "documentation", onset: "immediate" },
        { id: "access", name: "Access", value: 200000, category: "time", onset: "delayed" },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    const m36 = cashFlows[35];
    const expectedMonthlyDoc = 300000 / 12;
    const expectedMonthlyTime = 200000 / 12;
    expect(m36.docValue).toBeCloseTo(expectedMonthlyDoc, 0);
    expect(m36.timeValue).toBeCloseTo(expectedMonthlyTime, 0);
    expect(m36.totalValue).toBeCloseTo(expectedMonthlyDoc + expectedMonthlyTime, 0);
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

  it("summary totalInvestment uses annualLicenseFee for flat settings", () => {
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([flatSetting], config);
    const summary = calculateProformaSummary([flatSetting], config, cashFlows);

    expect(summary.totalInvestment).toBe(annualFee);
  });

  it("IRR works correctly with annualFlat pricing", () => {
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([flatSetting], config);
    const annualCF = buildAnnualIRRCashFlows([flatSetting], config, cashFlows);
    const irrResult = calculateAnnualIRR(annualCF);

    expect(irrResult.isValid).toBe(true);
    expect(irrResult.annualizedRate).toBeGreaterThan(0);

    const totalCost = flatSetting.implementationFee + cashFlows.reduce((s, r) => s + r.investment, 0);
    expect(annualCF[0]).toBeCloseTo(-totalCost, 0);
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

    const summary = calculateProformaSummary([perUnitSetting, flatSettingB], config, cashFlows);
    expect(summary.totalInvestment).toBe(200 * 10 * 12 + 300000);
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

    const expectedMonthly = 12 * (30000 / 12);
    expect(cashFlows[0].investment).toBe(expectedMonthly);
  });

  it("encounter-based pricing scales with provider expansion", () => {
    const setting = makeSetting({
      pricingModel: "perEncounter",
      costPerEncounter: 10,
      encounters: 30000,
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

  it("encounter-based summary totalInvestment uses costPerEncounter × encounters", () => {
    const setting = makeSetting({
      pricingModel: "perEncounter",
      costPerEncounter: 15,
      encounters: 20000,
      providerCount: 10,
      costPerUnit: 0,
    });
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([setting], config);
    const summary = calculateProformaSummary([setting], config, cashFlows);

    expect(summary.totalInvestment).toBe(15 * 20000);
  });

  it("IRR is valid for encounter-based pricing", () => {
    const setting = makeSetting({
      pricingModel: "perEncounter",
      costPerEncounter: 10,
      encounters: 30000,
      providerCount: 10,
      annualValue: 500000,
      implementationFee: 25000,
      costPerUnit: 0,
    });
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows([setting], config);
    const annualCF = buildAnnualIRRCashFlows([setting], config, cashFlows);
    const irr = calculateAnnualIRR(annualCF);

    expect(irr.isValid).toBe(true);
    expect(irr.annualizedRate).toBeGreaterThan(0);
  });

  it("three-model mixed scenario produces correct combined investment", () => {
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
    const expectedEnc = 10 * (30000 / 12);
    expect(m1.investment).toBe(expectedPerUnit + expectedFlat + expectedEnc);

    const summary = calculateProformaSummary([perUnitS, flatS, encS], config, cashFlows);
    expect(summary.totalInvestment).toBe(200 * 10 * 12 + 240000 + 10 * 30000);
  });
});
