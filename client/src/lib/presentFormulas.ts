import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";
import type { ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";

/**
 * Per-driver "show the math" formula strings for the Present view, derived so
 * they RECONCILE to the dollar shown.
 *
 * The proforma scales each driver's value to the full deployment by a provider
 * factor (fullScaleProviders / pilot). Per-unit rates are scale-invariant, so
 * we reproduce the engine's calc-summary at the full-scale volume: the formula
 * then describes the at-scale numbers and multiplies out to the at-scale value
 * the row displays (same fidelity as the Explore driver cards). Drivers without
 * a clean single formula (direct cost inputs, bundled retention, custom items)
 * are intentionally omitted — better no formula than one that doesn't tie out.
 */

// proforma driver id  →  engine calc-summary key
export function summaryKeyFor(driverId: string, careSetting: string): string | undefined {
  const isED = careSetting === "ed";
  const map: Record<string, string> = {
    patientAccess: "patientAccess",
    edLwbs: "lwbsRecovery",
    edAdmission: "admissionCapture",
    nursingOt: "nursingOvertime",
    scribeCost: "scribeCostReduction",
    wrvu: isED ? "edEmLevel" : "wrvu",
    hcc: "hccCapture",
    denials: "denialPrevention",
    ipDrg: "drgAccuracy",
    ipObsDefense: "obsDefense",
    nursingHapi: "nursingHapi",
    nursingFalls: "nursingFalls",
    nursingCauti: "nursingCauti",
    nursingClabsi: "nursingClabsi",
    nursingSepsis: "nursingSepsis",
    // incrementalStaffing is intentionally NOT mapped: like nursingAgency /
    // physicianLocumAgency, its dollar base (ipStaffingCurrentSpend) is a raw
    // current-spend input `scaledExploreStateFor` does not scale by the provider
    // factor, so a re-derived formula would print the pilot-level spend next to
    // a full-scale-scaled driver value and fail to tie out. No formula beats a
    // wrong one (see the "direct cost inputs" note above).
  };
  // Clinician retention === providerWellbeing for OP/ED (same generic turnover
  // fields, same formula). NOT mapped for inpatient (proforma uses generic
  // turnover fields while the engine's IP wellbeing uses IP-specific fields, so
  // it can diverge) or nursing (the value bundles retention + agency).
  if (careSetting === "outpatient" || isED) map.retention = "providerWellbeing";
  return map[driverId];
}

function scaleFactor(setting: ProformaSettingSnapshot): number {
  const pilot = setting.providerCount || 0;
  const full = setting.fullScaleProviders || 0;
  return full > 0 && pilot > 0 && full > pilot ? full / pilot : 1;
}

/**
 * The explore state re-scaled to the full deployment, plus the matching
 * total-hours-saved. Exported for the reconciliation guard test.
 */
export function scaledExploreStateFor(setting: ProformaSettingSnapshot): { state: ExploreState; hours: number } {
  const base = setting.fullExploreState;
  const f = scaleFactor(setting);
  const hours = Math.round((setting.totalHoursSaved || 0) * f);
  if (f === 1) return { state: base, hours };
  const td = base.timeDriverInputs;
  return {
    state: {
      ...base,
      numberOfProviders: setting.fullScaleProviders,
      annualEncounters: Math.round(base.annualEncounters * f),
      nursingStaffedBeds: Math.round((base.nursingStaffedBeds || 0) * f),
      timeDriverInputs: {
        ...td,
        accessProviders: td.accessProviders ? Math.round(td.accessProviders * f) : td.accessProviders,
      },
    } as ExploreState,
    hours,
  };
}

/** proforma driver id → at-scale formula string (only for drivers that have one). */
export function computeSettingDriverFormulas(setting: ProformaSettingSnapshot): Record<string, string> {
  if (!setting.fullExploreState) return {};
  const { state, hours } = scaledExploreStateFor(setting);
  const summaries = computeAllDriverCalcSummaries(state, hours);
  const out: Record<string, string> = {};
  for (const driver of setting.drivers) {
    const key = summaryKeyFor(driver.id, setting.careSetting);
    if (key && summaries[key]) out[driver.id] = summaries[key];
  }
  return out;
}
