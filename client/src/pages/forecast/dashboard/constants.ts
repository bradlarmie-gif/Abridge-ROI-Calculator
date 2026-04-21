import type { ValueDomain } from "../types";

export { SCENARIO_COLORS, SCENARIO_DASHES } from "@/pages/proforma/proformaTypes";

export const ABRIDGE_RED = "#EA2C00";

export const DOMAIN_COLORS: Record<ValueDomain, string> = {
  capacity: "#16A34A", // green (billing/capacity)
  revenue: "#1E3A5F", // blue
  workforce: "#D4930A", // orange (cost/workforce)
  quality: "#7C3AED", // purple
};

export const DOMAIN_BADGE_CLASS: Record<ValueDomain, string> = {
  capacity: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revenue: "bg-blue-50 text-blue-700 border-blue-200",
  workforce: "bg-amber-50 text-amber-700 border-amber-200",
  quality: "bg-purple-50 text-purple-700 border-purple-200",
};

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
