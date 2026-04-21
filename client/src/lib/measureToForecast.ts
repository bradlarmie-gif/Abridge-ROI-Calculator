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

/**
 * Convert a measured baseline (Measure path) into a seeded ForecastState ready
 * for the Forecast Baseline screen. Drivers are tagged source: "measure" so the
 * Baseline screen renders the "from Measure" badge.
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

  // Workforce — time saved on documentation (50% allocation to OT savings)
  const minSaved = Math.max(
    0,
    m.timeEfficiency.timeInNotesWithout - m.timeEfficiency.timeInNotesWith,
  );
  if (minSaved > 0 && adoptedEnc > 0) {
    const dollarsPerEnc = (minSaved / 60) * m.calibration.otHourlyRate * 0.5;
    drivers.push({
      id: "drv-workforce-time",
      label: "Time saved on documentation",
      domain: "workforce",
      category: "time",
      scalingUnit: "perEncounter",
      projectedDelta: round2(dollarsPerEnc),
      measuredDelta: round2(dollarsPerEnc),
      confidence: 75,
      realizationPct: 80,
      onset: "immediate",
      source: "measure",
    });
  }

  // Revenue — wRVU lift (skip inpatient where CMI is the proxy)
  const primarySetting = (m.careSetting || careSettings[0] || "outpatient") as string;
  const isInpatient = primarySetting === "inpatient";
  const wrvuDelta = m.documentationQuality.wrvuWith - m.documentationQuality.wrvuWithout;
  if (wrvuDelta > 0 && !isInpatient && adoptedEnc > 0) {
    const dollarsPerEnc = wrvuDelta * m.calibration.conversionFactor;
    drivers.push({
      id: "drv-revenue-wrvu",
      label: "wRVU lift per encounter",
      domain: "revenue",
      category: "documentation",
      scalingUnit: "perEncounter",
      projectedDelta: round2(dollarsPerEnc),
      measuredDelta: round2(dollarsPerEnc),
      confidence: 70,
      realizationPct: 75,
      onset: "delayed",
      source: "measure",
    });
  }

  // Capacity / throughput — outpatient + ED only
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
        projectedDelta: round2(dollarsPerEnc),
        measuredDelta: round2(dollarsPerEnc),
        confidence: 60,
        realizationPct: 70,
        onset: "delayed",
        source: "measure",
      });
    }
  }

  // Quality — CMI lift for inpatient
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
        projectedDelta: round2(cmiDelta * cmiPointValue),
        measuredDelta: round2(cmiDelta * cmiPointValue),
        confidence: 70,
        realizationPct: 75,
        onset: "phased",
        source: "measure",
      });
    }
  }

  // Workforce / long-term — provider retention signal
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
    const annualPerUser = 0.03 * 150_000;
    const perUserMonthly = annualPerUser / 12;
    drivers.push({
      id: "drv-workforce-retention",
      label: "Provider retention lift",
      domain: "workforce",
      category: "retention",
      scalingUnit: "perActiveUser",
      projectedDelta: round2(perUserMonthly),
      confidence: 50,
      realizationPct: 60,
      onset: "longTerm",
      source: "measure",
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
