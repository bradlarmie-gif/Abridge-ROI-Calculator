import { describe, it, expect } from "vitest";
import { convertMeasureToForecast } from "@/lib/measureToForecast";
import { DEFAULT_MEASURE_STATE, type MeasureState } from "@/lib/measureCalculator";

function makeMeasure(overrides: Partial<MeasureState> = {}): MeasureState {
  return {
    ...DEFAULT_MEASURE_STATE,
    careSetting: "outpatient",
    activeCareSettings: ["outpatient"],
    deployment: {
      ...DEFAULT_MEASURE_STATE.deployment,
      organizationName: "Acme Health",
      providers: 100,
      liveProviders: 100,
      mruProviders: 80,
      totalProviders: 120,
      totalEncounters: 500_000,
      abridgeEncounters: 300_000,
      utilizationRate: 60,
      monthsOnAbridge: 9,
      annualContractValue: 500_000,
    },
    ...overrides,
  };
}

describe("convertMeasureToForecast", () => {
  it("seeds partner identity, encounters, and care settings from Measure state", () => {
    const m = makeMeasure();
    const f = convertMeasureToForecast(m);

    expect(f.partnerName).toBe("Acme Health");
    expect(f.importSource.type).toBe("measure");
    expect(f.totalOrgEncountersLTM).toBe(500_000);
    expect(f.abridgeEncountersLTM).toBe(300_000);
    expect(f.activeUsersToday).toBe(100);
    expect(f.provisionedSeats).toBe(120);
    expect(f.careSettings).toEqual(["outpatient"]);
  });

  it("creates a workforce time-savings driver when documentation time drops", () => {
    const m = makeMeasure({
      timeEfficiency: {
        ...DEFAULT_MEASURE_STATE.timeEfficiency,
        timeInNotesWithout: 10,
        timeInNotesWith: 6,
      },
    });
    const f = convertMeasureToForecast(m);
    const workforce = f.valueDrivers.find((d) => d.id === "drv-workforce-time");
    expect(workforce).toBeDefined();
    expect(workforce!.domain).toBe("workforce");
    expect(workforce!.scalingUnit).toBe("perEncounter");
    expect(workforce!.source).toBe("measure");
    expect(workforce!.projectedDelta).toBeGreaterThan(0);
    expect(workforce!.onset).toBe("immediate");
  });

  it("creates a wRVU revenue driver for non-inpatient settings only", () => {
    const m = makeMeasure({
      documentationQuality: {
        ...DEFAULT_MEASURE_STATE.documentationQuality,
        wrvuWithout: 1.4,
        wrvuWith: 1.7,
      },
    });
    const f = convertMeasureToForecast(m);
    const rev = f.valueDrivers.find((d) => d.id === "drv-revenue-wrvu");
    expect(rev).toBeDefined();
    expect(rev!.projectedDelta).toBeCloseTo(0.3 * m.calibration.conversionFactor, 1);
    expect(rev!.onset).toBe("delayed");

    const inpatient = convertMeasureToForecast(
      makeMeasure({
        careSetting: "inpatient",
        activeCareSettings: ["inpatient"],
        documentationQuality: {
          ...DEFAULT_MEASURE_STATE.documentationQuality,
          wrvuWithout: 1.4,
          wrvuWith: 1.7,
        },
      }),
    );
    expect(inpatient.valueDrivers.find((d) => d.id === "drv-revenue-wrvu")).toBeUndefined();
  });

  it("does not double-count E/M lift on top of wRVU lift (same coding dollars)", () => {
    // Both measured: wRVU wins, E/M is suppressed so the same revenue isn't booked twice.
    const both = convertMeasureToForecast(
      makeMeasure({
        documentationQuality: {
          ...DEFAULT_MEASURE_STATE.documentationQuality,
          wrvuWithout: 1.4,
          wrvuWith: 1.7,
          emLevelWithout: 3.0,
          emLevelWith: 3.4,
        },
      }),
    );
    expect(both.valueDrivers.find((d) => d.id === "drv-revenue-wrvu")).toBeDefined();
    expect(both.valueDrivers.find((d) => d.id === "drv-revenue-em")).toBeUndefined();

    // E/M only (no wRVU measured): E/M is seeded as the fallback.
    const emOnly = convertMeasureToForecast(
      makeMeasure({
        documentationQuality: {
          ...DEFAULT_MEASURE_STATE.documentationQuality,
          emLevelWithout: 3.0,
          emLevelWith: 3.4,
        },
      }),
    );
    expect(emOnly.valueDrivers.find((d) => d.id === "drv-revenue-em")).toBeDefined();
  });

  it("dollarizes OP/ED denials with the tunable calibration claim value, not a literal", () => {
    const m = makeMeasure({
      calibration: { ...DEFAULT_MEASURE_STATE.calibration, avgClaimValue: 900 },
      outpatientMetrics: { initialDenialRate: { before: 10, after: 6 } } as any,
    });
    const f = convertMeasureToForecast(m);
    const denial = f.valueDrivers.find((d) => d.id === "drv-revenue-denials");
    expect(denial).toBeDefined();
    // 4-point drop × $900/claim ÷ 100 = $36/encounter, and it flows to calibration.
    expect(denial!.projectedDelta).toBeCloseTo((4 / 100) * 900, 1);
    expect(f.calibration.avgClaimValue).toBe(900);
  });

  it("creates a CMI quality driver only for inpatient", () => {
    const m = makeMeasure({
      careSetting: "inpatient",
      activeCareSettings: ["inpatient"],
      settingData: { inpatient: { cmi_before: 1.6, cmi_after: 1.65, vm_cmiPointValue: 1500 } },
    });
    const f = convertMeasureToForecast(m);
    const q = f.valueDrivers.find((d) => d.id === "drv-quality-cmi");
    expect(q).toBeDefined();
    expect(q!.domain).toBe("quality");
    expect(q!.projectedDelta).toBeCloseTo(0.05 * 1500, 1);
  });

  it("returns no drivers when no measured deltas exist", () => {
    const f = convertMeasureToForecast(makeMeasure());
    expect(f.valueDrivers).toEqual([]);
  });

  it("sets encounter-share curve from the Measure baseline ratio", () => {
    const m = makeMeasure({
      deployment: {
        ...DEFAULT_MEASURE_STATE.deployment,
        organizationName: "X",
        totalEncounters: 1_000_000,
        abridgeEncounters: 400_000,
      },
    });
    const f = convertMeasureToForecast(m);
    expect(f.encounterShareCurve.values.every((v) => Math.abs(v - 40) < 0.01)).toBe(true);
  });
});
