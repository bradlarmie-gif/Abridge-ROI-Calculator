import { type MeasureState, calculateConfirmedValue } from "./measureCalculator";
import {
  type ForecastState,
  type ForecastValueDriver,
  type ForecastCareSetting,
  makeEmptyForecastState,
} from "@/pages/forecast/types";

const SETTING_MAP: Record<string, ForecastCareSetting> = {
  outpatient: "outpatient",
  ed: "ed",
  inpatient: "inpatient",
  nursing: "nursing",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type MetricRecord = Record<string, { before?: number; after?: number } | undefined>;

function findMetric(
  records: MetricRecord[],
  keys: string[],
): { before: number; after: number } | null {
  for (const rec of records) {
    if (!rec) continue;
    for (const key of keys) {
      const v = rec[key];
      if (v && typeof v.before === "number" && typeof v.after === "number") {
        return { before: v.before, after: v.after };
      }
    }
  }
  return null;
}

/**
 * Convert a measured baseline (Measure path) into a seeded ForecastState ready
 * for the Forecast Baseline screen. Drivers are tagged source: "measure" so the
 * Baseline screen renders the "from Measure" badge.
 *
 * Every driver carries a `clinicalInputs` block that preserves the raw source
 * numbers so the Driver Studio can offer live recalculation and editing.
 */
export function convertMeasureToForecast(m: MeasureState): ForecastState {
  const base = makeEmptyForecastState();
  const dep = m.deployment;
  const cv = calculateConfirmedValue(m);
  const adoptedEnc = cv.adoptedEncounters || 0;
  const totalEnc = dep.totalEncounters || 0;
  const providers = dep.providers || dep.liveProviders || 0;

  const rawSettings =
    m.activeCareSettings && m.activeCareSettings.length > 0
      ? m.activeCareSettings
      : [m.careSetting || "outpatient"];
  const careSettings = rawSettings
    .filter((s): boolean => !!s && s in SETTING_MAP)
    .map((s) => SETTING_MAP[s as keyof typeof SETTING_MAP]);

  const drivers: ForecastValueDriver[] = [];
  const otHourlyRate = m.calibration.otHourlyRate ?? 150;

  // ── Workforce — time saved on documentation (50% allocation to OT savings) ──
  const minSaved = Math.max(
    0,
    m.timeEfficiency.timeInNotesWithout - m.timeEfficiency.timeInNotesWith,
  );
  if (minSaved > 0 && adoptedEnc > 0) {
    const dollarsPerEnc = (minSaved / 60) * otHourlyRate * 0.5;
    if (dollarsPerEnc > 0) {
      drivers.push({
        id: "drv-workforce-time",
        label: "Time saved on documentation",
        domain: "workforce",
        category: "time",
        scalingUnit: "perEncounter",
        baselineValue: m.timeEfficiency.timeInNotesWithout,
        measuredValue: m.timeEfficiency.timeInNotesWith,
        conversionFactor: (otHourlyRate * 0.5) / 60,
        unitLabel: "min/encounter",
        projectedDelta: round2(dollarsPerEnc),
        measuredDelta: round2(dollarsPerEnc),
        confidence: 75,
        realizationPct: 80,
        onset: "immediate",
        source: "measure",
        clinicalInputs: {
          metricBefore: m.timeEfficiency.timeInNotesWithout,
          metricAfter: m.timeEfficiency.timeInNotesWith,
          metricUnit: "min/encounter",
          metricLabel: "Minutes in note",
          factor1Value: otHourlyRate,
          factor1Label: "OT hourly rate ($/hr)",
          allocationPct: 50,
          allocationLabel: "Allocated to cost savings",
          formulaType: "timeSavingsWorkforce",
        },
      });
    }
  }

  // ── Workforce — work-outside-hours reduction ──
  const workOutsideDelta = Math.max(
    0,
    (m.timeEfficiency.workOutsideWithout ?? 0) - (m.timeEfficiency.workOutsideWith ?? 0),
  );
  if (workOutsideDelta > 0 && providers > 0) {
    const monthlyPerUser = (workOutsideDelta * 52 * otHourlyRate) / 12;
    if (monthlyPerUser > 0) {
      drivers.push({
        id: "drv-workforce-workhours",
        label: "Work-outside-hours reduction",
        domain: "workforce",
        category: "time",
        scalingUnit: "perActiveUser",
        baselineValue: m.timeEfficiency.workOutsideWithout,
        measuredValue: m.timeEfficiency.workOutsideWith,
        unitLabel: "hrs/week",
        projectedDelta: round2(monthlyPerUser),
        measuredDelta: round2(monthlyPerUser),
        confidence: 65,
        realizationPct: 75,
        onset: "immediate",
        source: "measure",
        clinicalInputs: {
          metricBefore: m.timeEfficiency.workOutsideWithout,
          metricAfter: m.timeEfficiency.workOutsideWith,
          metricUnit: "hrs/week",
          metricLabel: "Work outside hours",
          factor1Value: otHourlyRate,
          factor1Label: "OT hourly rate ($/hr)",
          formulaType: "workOutsideHoursReduction",
        },
      });
    }
  }

  // ── Revenue — wRVU lift (skip inpatient where CMI is the proxy) ──
  const primarySetting = (m.careSetting || careSettings[0] || "outpatient") as string;
  const isInpatient = primarySetting === "inpatient";
  const wrvuDelta = m.documentationQuality.wrvuWith - m.documentationQuality.wrvuWithout;
  if (wrvuDelta > 0 && !isInpatient && adoptedEnc > 0) {
    const dollarsPerEnc = wrvuDelta * m.calibration.conversionFactor;
    if (dollarsPerEnc > 0) {
      drivers.push({
        id: "drv-revenue-wrvu",
        label: "wRVU lift per encounter",
        domain: "revenue",
        category: "documentation",
        scalingUnit: "perEncounter",
        baselineValue: m.documentationQuality.wrvuWithout,
        measuredValue: m.documentationQuality.wrvuWith,
        conversionFactor: m.calibration.conversionFactor,
        unitLabel: "wRVU/encounter",
        projectedDelta: round2(dollarsPerEnc),
        measuredDelta: round2(dollarsPerEnc),
        confidence: 70,
        realizationPct: 75,
        onset: "delayed",
        source: "measure",
        clinicalInputs: {
          metricBefore: m.documentationQuality.wrvuWithout,
          metricAfter: m.documentationQuality.wrvuWith,
          metricUnit: "wRVU/encounter",
          metricLabel: "wRVU per encounter",
          factor1Value: m.calibration.conversionFactor,
          factor1Label: "wRVU conversion factor ($/wRVU)",
          formulaType: "wrvuLift",
        },
      });
    }
  }

  // ── Revenue — E/M level improvement (non-inpatient only) ──
  const emLevelDelta =
    (m.documentationQuality.emLevelWith ?? 0) - (m.documentationQuality.emLevelWithout ?? 0);
  if (emLevelDelta > 0 && !isInpatient && adoptedEnc > 0) {
    const valuePerLevel = 15;
    const dollarsPerEnc = emLevelDelta * valuePerLevel;
    if (dollarsPerEnc > 0) {
      drivers.push({
        id: "drv-revenue-em",
        label: "E/M level improvement",
        domain: "revenue",
        category: "documentation",
        scalingUnit: "perEncounter",
        baselineValue: m.documentationQuality.emLevelWithout,
        measuredValue: m.documentationQuality.emLevelWith,
        conversionFactor: valuePerLevel,
        unitLabel: "avg E/M level",
        projectedDelta: round2(dollarsPerEnc),
        measuredDelta: round2(dollarsPerEnc),
        confidence: 65,
        realizationPct: 70,
        onset: "delayed",
        source: "measure",
        clinicalInputs: {
          metricBefore: m.documentationQuality.emLevelWithout,
          metricAfter: m.documentationQuality.emLevelWith,
          metricUnit: "avg E/M level",
          metricLabel: "E/M level",
          factor1Value: valuePerLevel,
          factor1Label: "Value per E/M level ($)",
          formulaType: "emLevelLift",
        },
      });
    }
  }

  // ── Revenue — denial / clean-claim improvement ──
  const denialMetric = findMetric(
    [
      m.outpatientMetrics as MetricRecord,
      m.edMetrics as MetricRecord,
      m.inpatientMetrics as MetricRecord,
    ],
    ["initialDenialRate", "denialRate", "cleanClaimRate"],
  );
  if (denialMetric && adoptedEnc > 0) {
    // We only seed for the lower-is-better case (denial rate). Clean-claim-rate
    // (higher is better) would invert the seeded baseline/measured order, which
    // breaks the recalculate model that assumes lower-is-better for denials.
    // Skip cleanClaimRate by checking that after < before for denial keys.
    const denialDelta = Math.max(0, denialMetric.before - denialMetric.after);
    if (denialDelta > 0) {
      const avgClaimValue = 350;
      const dollarsPerEnc = (denialDelta / 100) * avgClaimValue;
      if (dollarsPerEnc > 0) {
        drivers.push({
          id: "drv-revenue-denials",
          label: "Denial rate reduction",
          domain: "revenue",
          category: "documentation",
          scalingUnit: "perEncounter",
          baselineValue: denialMetric.before,
          measuredValue: denialMetric.after,
          conversionFactor: avgClaimValue / 100,
          unitLabel: "% denial rate",
          projectedDelta: round2(dollarsPerEnc),
          measuredDelta: round2(dollarsPerEnc),
          confidence: 60,
          realizationPct: 70,
          onset: "phased",
          source: "measure",
          clinicalInputs: {
            metricBefore: denialMetric.before,
            metricAfter: denialMetric.after,
            metricUnit: "% denial rate",
            metricLabel: "Initial denial rate",
            factor1Value: avgClaimValue,
            factor1Label: "Avg claim value ($)",
            formulaType: "denialReduction",
          },
        });
      }
    }
  }

  // ── Capacity / throughput — outpatient + ED only ──
  if (
    minSaved > 0 &&
    adoptedEnc > 0 &&
    (careSettings.includes("outpatient") || careSettings.includes("ed"))
  ) {
    const allocPct = careSettings.includes("ed") ? 0.3 : 0.2;
    const minutesPerVisit = Math.max(m.calibration.minutesPerVisit, 1);
    const visitsPerEnc = (minSaved / 60) * (60 / minutesPerVisit) * allocPct;
    const dollarsPerEnc = visitsPerEnc * m.calibration.revenuePerVisit;
    if (dollarsPerEnc > 0) {
      drivers.push({
        id: "drv-capacity-throughput",
        label: "Throughput from time saved",
        domain: "capacity",
        category: "time",
        scalingUnit: "perEncounter",
        unitLabel: "min/encounter",
        baselineValue: m.timeEfficiency.timeInNotesWithout,
        measuredValue: m.timeEfficiency.timeInNotesWith,
        projectedDelta: round2(dollarsPerEnc),
        measuredDelta: round2(dollarsPerEnc),
        confidence: 60,
        realizationPct: 70,
        onset: "delayed",
        source: "measure",
        clinicalInputs: {
          metricBefore: m.timeEfficiency.timeInNotesWithout,
          metricAfter: m.timeEfficiency.timeInNotesWith,
          metricUnit: "min/encounter",
          metricLabel: "Minutes in note",
          factor1Value: m.calibration.minutesPerVisit,
          factor1Label: "Minutes per visit",
          factor2Value: m.calibration.revenuePerVisit,
          factor2Label: "Revenue per visit ($)",
          allocationPct: Math.round(allocPct * 100),
          allocationLabel: "Allocated to new patient capacity",
          formulaType: "timeSavingsCapacity",
        },
      });
    }
  }

  // ── Quality — CMI lift for inpatient ──
  if (isInpatient) {
    const setData = m.settingData?.inpatient || {};
    const cmiDelta = Math.max(0, (setData.cmi_after ?? 0) - (setData.cmi_before ?? 0));
    if (cmiDelta > 0 && adoptedEnc > 0) {
      const cmiPointValue =
        setData.vm_cmiPointValue ?? m.calibration.conversionFactor ?? 1500;
      drivers.push({
        id: "drv-quality-cmi",
        label: "CMI improvement",
        domain: "quality",
        category: "documentation",
        scalingUnit: "perEncounter",
        baselineValue: setData.cmi_before ?? 0,
        measuredValue: setData.cmi_after ?? 0,
        conversionFactor: cmiPointValue,
        unitLabel: "CMI points",
        projectedDelta: round2(cmiDelta * cmiPointValue),
        measuredDelta: round2(cmiDelta * cmiPointValue),
        confidence: 70,
        realizationPct: 75,
        onset: "phased",
        source: "measure",
        clinicalInputs: {
          metricBefore: setData.cmi_before ?? 0,
          metricAfter: setData.cmi_after ?? 0,
          metricUnit: "CMI points",
          metricLabel: "Case-mix index",
          factor1Value: cmiPointValue,
          factor1Label: "Value per CMI point ($)",
          formulaType: "cmiLift",
        },
      });
    }
  }

  // ── Workforce — Nursing overtime reduction ──
  if (careSettings.includes("nursing")) {
    const nm = m.nursingMetrics as MetricRecord;
    const ot = nm?.overtimeHours;
    if (
      ot &&
      typeof ot.before === "number" &&
      typeof ot.after === "number" &&
      ot.before > ot.after
    ) {
      const delta = ot.before - ot.after;
      const monthlyPerBed = delta * otHourlyRate * 1.5;
      if (monthlyPerBed > 0) {
        drivers.push({
          id: "drv-nursing-overtime",
          label: "Nursing overtime reduction",
          domain: "workforce",
          category: "time",
          scalingUnit: "perBed",
          baselineValue: ot.before,
          measuredValue: ot.after,
          unitLabel: "hrs/month overtime",
          projectedDelta: round2(monthlyPerBed),
          measuredDelta: round2(monthlyPerBed),
          confidence: 65,
          realizationPct: 75,
          onset: "immediate",
          source: "measure",
          clinicalInputs: {
            metricBefore: ot.before,
            metricAfter: ot.after,
            metricUnit: "hrs/month overtime",
            metricLabel: "Overtime hours per nurse",
            factor1Value: otHourlyRate,
            factor1Label: "Nursing hourly rate ($/hr)",
            formulaType: "nursingOvertimeReduction",
          },
        });
      }
    }
  }

  // ── Workforce / long-term — provider retention signal ──
  const burnoutEntry = m.metricValues?.burnoutAssessment;
  const stayEntry = m.metricValues?.likelihoodToStay;
  const burnoutImproved =
    !!burnoutEntry &&
    burnoutEntry.before != null &&
    burnoutEntry.after != null &&
    burnoutEntry.after < burnoutEntry.before;
  const stayImproved =
    !!stayEntry &&
    stayEntry.before != null &&
    stayEntry.after != null &&
    stayEntry.after > stayEntry.before;
  if ((burnoutImproved || stayImproved) && providers > 0) {
    // 3% retention lift × $150K replacement cost, amortized monthly per active user
    const replacementCost = 150_000;
    const annualPerUser = 0.03 * replacementCost;
    const perUserMonthly = annualPerUser / 12;
    drivers.push({
      id: "drv-workforce-retention",
      label: "Provider retention lift",
      domain: "workforce",
      category: "retention",
      scalingUnit: "perActiveUser",
      projectedDelta: round2(perUserMonthly),
      measuredDelta: round2(perUserMonthly),
      confidence: 50,
      realizationPct: 60,
      onset: "longTerm",
      source: "measure",
      clinicalInputs: {
        factor1Value: replacementCost,
        factor1Label: "Replacement cost per provider ($)",
        formulaType: "retentionLift",
      },
    });
  }

  const sharePct = totalEnc > 0 ? (dep.abridgeEncounters / totalEnc) * 100 : 60;
  const quarters = Math.ceil(base.contractTermMonths / 3);

  return {
    ...base,
    partnerName: dep.organizationName || base.partnerName,
    importSource: { type: "measure", importedAt: Date.now() },
    activeUsersToday: dep.liveProviders || providers,
    provisionedSeats: dep.totalProviders || providers || dep.liveProviders || 0,
    abridgeEncountersLTM: dep.abridgeEncounters || adoptedEnc,
    totalOrgEncountersLTM: totalEnc,
    careSettings: careSettings.length > 0 ? careSettings : ["outpatient"],
    valueDrivers: drivers,
    encounterShareCurve: {
      values: Array.from({ length: quarters }, () => sharePct),
    },
  };
}
