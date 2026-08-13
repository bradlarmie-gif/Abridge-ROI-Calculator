import type { ValueDomain } from "../types";
import { DOMAIN_COLORS_LC, DOMAIN_BADGE_CLASS_LC } from "@/lib/domainColors";

export { SCENARIO_COLORS, SCENARIO_DASHES } from "@/pages/proforma/proformaTypes";

export const ABRIDGE_RED = "#EA2C00";

// One app-wide domain palette (lib/domainColors) — light coral family, warm grey
// for the proof/Quality layer. Replaces the old green/blue/orange/purple set.
export const DOMAIN_COLORS: Record<ValueDomain, string> = DOMAIN_COLORS_LC as Record<ValueDomain, string>;

export const DOMAIN_BADGE_CLASS: Record<ValueDomain, string> = DOMAIN_BADGE_CLASS_LC as Record<ValueDomain, string>;

export const SCALING_UNIT_LABELS: Record<string, string> = {
  perEncounter: "Per Encounter",
  perActiveUser: "Per Active User / month",
  perBed: "Per Bed / month",
  annualFlat: "Annual Flat",
};

export const ONSET_LABELS: Record<string, string> = {
  immediate: "Immediate (M2)",
  delayed: "Delayed (M5)",
  phased: "Phased (M6)",
  longTerm: "Long term (M15)",
};

export function confidenceLabelFor(pct: number): string {
  if (pct >= 90) return "Financially documented";
  if (pct >= 70) return "Based on measured outcomes";
  if (pct >= 40) return "Directional estimate";
  return "Benchmark estimate";
}
