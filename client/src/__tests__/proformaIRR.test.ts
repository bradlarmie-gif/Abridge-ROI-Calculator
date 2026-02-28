import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  buildIRRCashFlows,
  calculateIRR,
  calculateProformaSummary,
  npvAtRate,
  countSignChanges,
  calculateMIRR,
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
    annualValue: 500000,
    timeValue: 200000,
    docValue: 300000,
    retentionValue: 0,
    totalHoursSaved: 3500,
    drivers: [
      { id: "wRVU", name: "wRVU Uplift", value: 300000, category: "documentation", onset: "immediate" },
      { id: "patientAccess", name: "Patient Access", value: 200000, category: "time", onset: "delayed" },
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

describe("buildIRRCashFlows", () => {
  it("period 0 equals negative implementation fees", () => {
    const settings = [makeSetting({ implementationFee: 50000 })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);

    expect(irrCF[0]).toBe(-50000);
  });

  it("uses first month subscription as Period 0 when implementation fees are zero", () => {
    const settings = [makeSetting({ implementationFee: 0 })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);

    expect(irrCF[0]).toBeLessThan(0);
    expect(irrCF[0]).toBe(-cashFlows[0].investment);
    expect(irrCF.length).toBe(config.contractTermMonths + 1);
  });

  it("has contractTermMonths monthly flows after period 0", () => {
    const settings = [makeSetting()];
    const config36 = makeConfig({ contractTermMonths: 36 });
    const cf36 = buildMonthlyCashFlows(settings, config36);
    const irr36 = buildIRRCashFlows(settings, config36, cf36);
    expect(irr36.length).toBe(37);

    const config24 = makeConfig({ contractTermMonths: 24 });
    const cf24 = buildMonthlyCashFlows(settings, config24);
    const irr24 = buildIRRCashFlows(settings, config24, cf24);
    expect(irr24.length).toBe(25);
  });

  it("monthly flows are net (value minus subscription)", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);

    for (let i = 1; i < irrCF.length; i++) {
      const row = cashFlows[i - 1];
      const expectedNet = (row.docValue + row.timeValue + row.retentionValue) - row.investment;
      expect(irrCF[i]).toBeCloseTo(expectedNet, 0);
    }
  });

  it("has exactly 1 sign change for standard profitable case", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);

    expect(countSignChanges(irrCF)).toBe(1);
  });
});

describe("calculateIRR", () => {
  it("returns valid positive IRR for standard profitable case", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.method).toBe("irr");
    expect(result.annualizedRate).toBeGreaterThan(0);
  });

  it("NPV at calculated monthly rate is approximately zero (cross-validation)", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    const monthlyRate = Math.pow(1 + result.annualizedRate, 1 / 12) - 1;
    const npv = npvAtRate(irrCF, monthlyRate);
    const totalAbsFlow = irrCF.reduce((s, v) => s + Math.abs(v), 0);
    expect(Math.abs(npv) / totalAbsFlow).toBeLessThan(0.01);
  });

  it("returns valid positive IRR when impl fees are zero but subscription exists", () => {
    const settings = [makeSetting({ implementationFee: 0 })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeGreaterThan(0);
  });

  it("returns invalid for truly zero cash flows", () => {
    const irrCF = [0];
    const result = calculateIRR(irrCF);
    expect(result.isValid).toBe(false);
  });

  it("handles thin margins (small positive or negative IRR)", () => {
    const settings = [makeSetting({ annualValue: 30000, timeValue: 10000, docValue: 20000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 20000, category: "documentation" as const, onset: "immediate" as const },
        { id: "access", name: "Access", value: 10000, category: "time" as const, onset: "delayed" as const },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeLessThan(5);
  });

  it("returns negative IRR when total value barely exceeds subscription but not impl fee", () => {
    const settings = [makeSetting({
      annualValue: 30000, timeValue: 10000, docValue: 20000,
      costPerUnit: 200,
      implementationFee: 500000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 20000, category: "documentation" as const, onset: "immediate" as const },
        { id: "access", name: "Access", value: 10000, category: "time" as const, onset: "delayed" as const },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeLessThan(0);
  });

  it("returns invalid when all cash flows are negative (no positive periods)", () => {
    const settings = [makeSetting({
      annualValue: 15000, timeValue: 5000, docValue: 10000,
      costPerUnit: 300,
      implementationFee: 25000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 10000, category: "documentation" as const, onset: "immediate" as const },
        { id: "access", name: "Access", value: 5000, category: "time" as const, onset: "delayed" as const },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(false);
  });

  it("handles zero subscription (impl only) — very high positive IRR", () => {
    const settings = [makeSetting({ costPerUnit: 0, implementationFee: 10000,
      annualValue: 500000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 300000, category: "documentation" as const, onset: "immediate" as const },
        { id: "access", name: "Access", value: 200000, category: "time" as const, onset: "delayed" as const },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeGreaterThan(10);
  });

  it("very high ROI case converges", () => {
    const settings = [makeSetting({
      implementationFee: 5000,
      costPerUnit: 10,
      annualValue: 1000000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 600000, category: "documentation" as const, onset: "immediate" as const },
        { id: "access", name: "Access", value: 400000, category: "time" as const, onset: "delayed" as const },
      ],
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);
    const result = calculateIRR(irrCF);

    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeGreaterThan(50);
  });
});

describe("contract term affects IRR", () => {
  it("2-year and 3-year terms produce different IRR values", () => {
    const settings = [makeSetting()];
    const config24 = makeConfig({ contractTermMonths: 24 });
    const config36 = makeConfig({ contractTermMonths: 36 });

    const cf24 = buildMonthlyCashFlows(settings, config24);
    const cf36 = buildMonthlyCashFlows(settings, config36);

    const irr24 = calculateIRR(buildIRRCashFlows(settings, config24, cf24));
    const irr36 = calculateIRR(buildIRRCashFlows(settings, config36, cf36));

    expect(irr24.isValid).toBe(true);
    expect(irr36.isValid).toBe(true);
    expect(irr24.annualizedRate).not.toBeCloseTo(irr36.annualizedRate, 2);
  });
});

describe("retention phasing affects IRR", () => {
  it("higher year-1 retention phasing increases value and IRR", () => {
    const settings = [makeSetting({
      retentionValue: 100000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 200000, category: "documentation" as const, onset: "immediate" as const },
        { id: "retention", name: "Retention", value: 100000, category: "time" as const, onset: "phased" as const },
      ],
    })];

    const configLow = makeConfig({ retentionPhasing: { year1Pct: 0, year2Pct: 50, year3Pct: 100 } });
    const configHigh = makeConfig({ retentionPhasing: { year1Pct: 50, year2Pct: 75, year3Pct: 100 } });

    const cfLow = buildMonthlyCashFlows(settings, configLow);
    const cfHigh = buildMonthlyCashFlows(settings, configHigh);

    const irrLow = calculateIRR(buildIRRCashFlows(settings, configLow, cfLow));
    const irrHigh = calculateIRR(buildIRRCashFlows(settings, configHigh, cfHigh));

    expect(irrLow.isValid).toBe(true);
    expect(irrHigh.isValid).toBe(true);
    expect(irrHigh.annualizedRate).toBeGreaterThan(irrLow.annualizedRate);
  });
});

describe("multi-setting aggregation", () => {
  it("combines multiple settings correctly with staggered go-lives", () => {
    const setting1 = makeSetting({ id: "outpatient-1", goLiveMonth: 1 });
    const setting2 = makeSetting({
      id: "ed-1",
      careSetting: "ed",
      label: "ED",
      goLiveMonth: 4,
      annualValue: 300000,
      timeValue: 150000,
      docValue: 150000,
      implementationFee: 15000,
      drivers: [
        { id: "wRVU", name: "wRVU", value: 150000, category: "documentation" as const, onset: "immediate" as const },
        { id: "throughput", name: "Throughput", value: 150000, category: "time" as const, onset: "delayed" as const },
      ],
    });

    const settings = [setting1, setting2];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const irrCF = buildIRRCashFlows(settings, config, cashFlows);

    expect(irrCF[0]).toBe(-(25000 + 15000));
    expect(irrCF.length).toBe(37);

    const result = calculateIRR(irrCF);
    expect(result.isValid).toBe(true);
    expect(result.annualizedRate).toBeGreaterThan(0);

    expect(countSignChanges(irrCF)).toBe(1);
  });
});

describe("calculateProformaSummary", () => {
  it("populates all fields including irrMethod and irrValid", () => {
    const settings = [makeSetting()];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.irr).toBeGreaterThan(0);
    expect(summary.irrMethod).toBe("irr");
    expect(summary.irrValid).toBe(true);
    expect(summary.simpleROI).toBeGreaterThan(0);
    expect(summary.threeYearValue).toBeGreaterThan(0);
    expect(summary.threeYearInvestment).toBeGreaterThan(0);
    expect(summary.threeYearNet).toBeGreaterThan(0);
  });

  it("marks IRR valid when impl fees are zero but subscription exists", () => {
    const settings = [makeSetting({ implementationFee: 0 })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);
    const summary = calculateProformaSummary(settings, config, cashFlows);

    expect(summary.irrValid).toBe(true);
    expect(summary.irr).toBeGreaterThan(0);
  });
});

describe("npvAtRate", () => {
  it("NPV at rate 0 equals sum of cash flows", () => {
    const cf = [-100, 50, 50, 50];
    const npv = npvAtRate(cf, 0);
    expect(npv).toBeCloseTo(50, 5);
  });

  it("higher discount rate reduces NPV", () => {
    const cf = [-1000, 400, 400, 400];
    const npvLow = npvAtRate(cf, 0.01);
    const npvHigh = npvAtRate(cf, 0.1);
    expect(npvLow).toBeGreaterThan(npvHigh);
  });
});

describe("countSignChanges", () => {
  it("counts correctly for conventional cash flows", () => {
    expect(countSignChanges([-100, 50, 50, 50])).toBe(1);
  });

  it("counts correctly for non-conventional cash flows", () => {
    expect(countSignChanges([-100, 50, -20, 50])).toBe(3);
  });

  it("ignores near-zero values", () => {
    expect(countSignChanges([-100, 0.001, 50, 50])).toBe(1);
  });
});

describe("calculateMIRR", () => {
  it("returns a valid rate for non-conventional flows", () => {
    const cf = [-100, 50, -20, 100, 50];
    const mirr = calculateMIRR(cf);
    expect(mirr).toBeGreaterThan(-1);
    expect(isFinite(mirr)).toBe(true);
  });

  it("returns 0 when there are no negative flows", () => {
    expect(calculateMIRR([0, 50, 50])).toBe(0);
  });
});

describe("sensitivity ordering", () => {
  it("conservative IRR < base IRR < optimistic IRR", () => {
    const baseSettings = [makeSetting()];
    const config = makeConfig();

    const scaleSettings = (s: ProformaSettingSnapshot, vf: number, cf: number) => ({
      ...s,
      annualValue: s.annualValue * vf,
      retentionValue: s.retentionValue * vf,
      drivers: s.drivers.map(d => ({ ...d, value: d.value * vf })),
      costPerUnit: s.costPerUnit * cf,
    });

    const conservative = baseSettings.map(s => scaleSettings(s, 0.8, 1.1));
    const optimistic = baseSettings.map(s => scaleSettings(s, 1.2, 0.9));

    const baseCF = buildMonthlyCashFlows(baseSettings, config);
    const consCF = buildMonthlyCashFlows(conservative, config);
    const optCF = buildMonthlyCashFlows(optimistic, config);

    const baseIRR = calculateIRR(buildIRRCashFlows(baseSettings, config, baseCF));
    const consIRR = calculateIRR(buildIRRCashFlows(conservative, config, consCF));
    const optIRR = calculateIRR(buildIRRCashFlows(optimistic, config, optCF));

    expect(baseIRR.isValid).toBe(true);
    expect(consIRR.isValid).toBe(true);
    expect(optIRR.isValid).toBe(true);

    expect(consIRR.annualizedRate).toBeLessThan(baseIRR.annualizedRate);
    expect(optIRR.annualizedRate).toBeGreaterThan(baseIRR.annualizedRate);
  });
});

describe("cross-validation on all scenarios", () => {
  const scenarios: [string, ProformaSettingSnapshot[], ProformaConfig][] = [
    ["standard profitable", [makeSetting()], makeConfig()],
    ["thin margin", [makeSetting({ annualValue: 30000, timeValue: 10000, docValue: 20000, drivers: [
      { id: "d1", name: "D1", value: 20000, category: "documentation", onset: "immediate" },
      { id: "d2", name: "D2", value: 10000, category: "time", onset: "delayed" },
    ] })], makeConfig()],
    ["high ROI", [makeSetting({ implementationFee: 5000, costPerUnit: 10, annualValue: 1000000, drivers: [
      { id: "d1", name: "D1", value: 600000, category: "documentation", onset: "immediate" },
      { id: "d2", name: "D2", value: 400000, category: "time", onset: "delayed" },
    ] })], makeConfig()],
    ["2-year term", [makeSetting()], makeConfig({ contractTermMonths: 24 })],
    ["zero subscription", [makeSetting({ costPerUnit: 0, implementationFee: 10000, annualValue: 300000, drivers: [
      { id: "d1", name: "D1", value: 300000, category: "documentation", onset: "immediate" },
    ] })], makeConfig()],
    ["zero impl fee (subscription only)", [makeSetting({ implementationFee: 0 })], makeConfig()],
    ["yearly providers with expansion", [makeSetting({
      yearlyProviders: { year1: 10, year2: 50, year3: 100 },
      fullScaleProviders: 100,
    })], makeConfig()],
  ];

  for (const [name, settings, config] of scenarios) {
    it(`NPV ≈ 0 at found rate for ${name}`, () => {
      const cashFlows = buildMonthlyCashFlows(settings, config);
      const irrCF = buildIRRCashFlows(settings, config, cashFlows);
      const result = calculateIRR(irrCF);

      if (!result.isValid) return;

      const monthlyRate = Math.pow(1 + result.annualizedRate, 1 / 12) - 1;
      const npv = npvAtRate(irrCF, monthlyRate);
      const totalAbsFlow = irrCF.reduce((s, v) => s + Math.abs(v), 0);
      expect(Math.abs(npv) / totalAbsFlow).toBeLessThan(0.01);
    });
  }
});

describe("yearly provider allocation", () => {
  it("yearly providers scale investment correctly", () => {
    const settings = [makeSetting({
      yearlyProviders: { year1: 10, year2: 50, year3: 100 },
      fullScaleProviders: 100,
      costPerUnit: 200,
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    expect(cashFlows[0].investment).toBeLessThan(cashFlows[35].investment);

    const month1Inv = cashFlows[0].investment;
    const month36Inv = cashFlows[35].investment;
    expect(month36Inv / month1Inv).toBeGreaterThan(3);
  });

  it("2-year contract ramps through Y1 and Y2 provider targets", () => {
    const settings = [makeSetting({
      yearlyProviders: { year1: 10, year2: 50, year3: 100 },
      fullScaleProviders: 100,
      costPerUnit: 200,
    })];
    const config = makeConfig({ contractTermMonths: 24 });
    const cashFlows = buildMonthlyCashFlows(settings, config);

    expect(cashFlows.length).toBe(24);
    expect(cashFlows[0].investment).toBeLessThan(cashFlows[23].investment);
  });

  it("backward compatible — no yearlyProviders uses providerCount and fullScaleProviders", () => {
    const settings = [makeSetting({
      providerCount: 10,
      fullScaleProviders: 100,
    })];
    const config = makeConfig();
    const cashFlows = buildMonthlyCashFlows(settings, config);

    expect(cashFlows.length).toBe(36);
    expect(cashFlows[0].investment).toBeGreaterThan(0);
  });
});
