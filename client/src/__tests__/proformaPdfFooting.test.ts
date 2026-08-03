import { describe, it, expect } from "vitest";
import { buildProformaPdfData } from "@/components/proforma/ProformaPDFExport";
import {
  type ProformaSettingSnapshot,
  type ProformaConfig,
  type ProformaDriver,
  DEFAULT_PROFORMA_CONFIG,
} from "@/pages/proforma/proformaTypes";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

// Guards the PDF financial summary against the footing bug where per-setting
// rows used a displacement/quality-inclusive basis while the Total row used the
// clinical basis (revenue + capacity + workforce). The two must reconcile, and
// no single-year setting figure may exceed that setting's at-scale run-rate.

function makeSetting(
  careSetting: ProformaSettingSnapshot["careSetting"],
  drivers: ProformaDriver[],
  overrides: Partial<ProformaSettingSnapshot> = {},
): ProformaSettingSnapshot {
  const quad = (q: string) => drivers.filter((d) => d.quadrant === q).reduce((s, d) => s + d.value, 0);
  return {
    id: `s-${careSetting}`,
    careSetting,
    label: careSetting,
    providerCount: 40,
    fullScaleProviders: 120,
    fullScaleUtilization: 80,
    encounters: 200_000,
    utilizationPercent: 80,
    annualValue: drivers.reduce((s, d) => s + d.value, 0),
    timeValue: 0,
    docValue: 0,
    retentionValue: 0,
    totalHoursSaved: 20_000,
    drivers,
    costPerUnit: 250,
    pricingModel: "perUnit",
    implementationFee: 0,
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

// A realistic two-setting deal that includes displacement + quality value, the
// two buckets the clinical basis must EXCLUDE. Quality comes from a Quality-
// quadrant driver; displacement comes from costOffsets (retired tooling), never
// from a driver. If either leaks into a per-setting or ramp figure, the
// reconciliation below breaks.
const OUTPATIENT = makeSetting("outpatient", [
  { id: "wrvu", name: "wRVU capture", value: 412_000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
  { id: "hcc", name: "HCC recapture", value: 319_000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
  { id: "patientAccess", name: "Patient access", value: 549_000, quadrant: "Capacity", onset: "delayed", category: "time" },
  { id: "providerWellbeing", name: "Provider wellbeing", value: 180_000, quadrant: "Workforce", onset: "delayed", category: "retention" },
  { id: "nursingHapi", name: "Safety signal", value: 90_000, quadrant: "Quality", onset: "delayed", category: "quality" },
], { costOffsets: [{ annualSpend: 240_000, displacementPct: 50, transitionMonths: 3 }] });
const ED = makeSetting("ed", [
  { id: "wrvu", name: "E/M level coding", value: 240_000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
  { id: "edLwbs", name: "Throughput & LWBS", value: 260_000, quadrant: "Capacity", onset: "delayed", category: "time" },
  { id: "providerWellbeing", name: "Provider wellbeing", value: 50_000, quadrant: "Workforce", onset: "delayed", category: "retention" },
], { id: "s-ed", goLiveMonth: 4, fullScaleProviders: 110, providerCount: 80, encounters: 264_000 });

const config: ProformaConfig = { ...DEFAULT_PROFORMA_CONFIG };

describe("proforma PDF financial summary foots", () => {
  const data = buildProformaPdfData([OUTPATIENT, ED], config, "Test Health", "July 2026");

  it("each year: per-setting values sum to the Total value row", () => {
    for (const y of data.years) {
      const perSettingSum = y.perSetting.reduce((a, p) => a + p.value, 0);
      expect(Math.abs(perSettingSum - y.total)).toBeLessThanOrEqual(10);
    }
  });

  it("each year: revenue + capacity + workforce == Total value", () => {
    for (const y of data.years) {
      const domainSum = y.revenue + y.capacity + y.workforce;
      expect(Math.abs(domainSum - y.total)).toBeLessThanOrEqual(10);
    }
  });

  it("the detail ramp reconciles with the per-setting summary rows, year by year", () => {
    for (const s of data.settings) {
      for (const r of s.ramp) {
        const summaryCell = data.years[r.year - 1]?.perSetting.find((p) => p.id === s.id)?.value ?? 0;
        expect(Math.abs(r.value - summaryCell)).toBeLessThanOrEqual(10);
      }
    }
  });

  it("no yearly setting figure exceeds that setting's at-scale run-rate", () => {
    for (const s of data.settings) {
      for (const r of s.ramp) {
        // small tolerance for rounding; a year can equal but never exceed run-rate
        expect(r.value).toBeLessThanOrEqual(s.atScaleValue + 2_000);
      }
    }
  });

  it("clinical basis excludes displacement and quality (settings sum < gross value)", () => {
    // Outpatient carries $120K displacement + $90K quality that must NOT appear
    // in the clinical at-scale figure.
    const op = data.settings.find((s) => s.id === "s-outpatient")!;
    expect(op.atScaleValue).toBe(412_000 + 319_000 + 549_000 + 180_000);
  });
});
