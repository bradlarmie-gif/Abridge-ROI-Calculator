/**
 * Attain plan persistence. The whole in-session plan (funnel choices + every Align/Plan
 * answer + readings + the review log) is autosaved to localStorage and restored on load,
 * so a partner's plan survives refresh and accumulates across quarterly reviews.
 *
 * v1: a single active plan (one slot). The partner name is carried for display + the PDF;
 * multi-partner switching keys off it later. Sets/nested-Sets are serialized to arrays.
 */

import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { DiscoveryAnswers } from "@/lib/attain/discovery";
import type { PlanBuildState } from "./planning/PlanBuildExperience";

const NS = "attain:plan:v1:";           // one saved plan per partner, keyed by name
const ACTIVE = "attain:plan:v1:active"; // which partner's plan to resume on refresh
const slug = (name: string) => (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";

// ---- serializable shapes (what actually goes to disk) ----
export type StoredAlignAnswers = { segs: string[]; choices: Record<string, string[]>; proof: string[]; unlock: string[] };
export type StoredMetric = { today: string; target: string; source: string };
export type StoredPerson = { name: string; role: string };
export type StoredCustom = { id: string; name: string; measure: string; unit: string; today: string; target: string; source: string };
export type StoredAlignInputs = { scope: string; econ: Record<string, string>; stance: number | null; custom: string };

export type AttainSnapshot = {
  partner: string;
  phase: string;            // resume the funnel where they left off
  setting: string | null;
  goals: string[];
  baseline: AttainBaseline;
  // per-category experience state (keyed by category label)
  pickedByCat: Record<string, string[]>;
  playsByCat: Record<string, Record<string, string[]>>;
  answersByCat: Record<string, StoredAlignAnswers>;
  inputsByCat: Record<string, StoredAlignInputs>;
  metricsByCat: Record<string, Record<string, StoredMetric>>;
  readingsByCat: Record<string, Record<string, string>>;
  peopleByCat: Record<string, StoredPerson[]>;
  customsByCat?: Record<string, StoredCustom[]>;  // the partner's own added metrics, per category
  cadenceByCat?: Record<string, string>;          // review cadence per category ("monthly" | "quarterly")
  alignDone?: string[];                            // categories locked in on Align
  planDone?: string[];                             // categories locked in on Plan
  chapter?: string;                                // which chapter they were last on
  catIdx?: number;                                 // which category sub-tab they were last on
  reviewLog: { label: string; attain: number }[];
  // Value Attainment Strategy (front half): the pre-ROI discovery interview
  // answers, keyed "goal:questionId" -> optionId. No numbers here. Optional so it
  // never affects the Plan/Progress mount, which ignores it.
  discovery?: DiscoveryAnswers;
  // Planning (rebuilt owner-grouped plan): owner names, per-goal targets, cadence.
  planBuild?: PlanBuildState;
  savedAt: number;
};

function read(key: string): AttainSnapshot | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AttainSnapshot) : null;
  } catch { return null; }
}

/** The plan for a given partner name (same name = same plan). */
export function loadPlanByName(name: string): AttainSnapshot | null {
  return name.trim() ? read(NS + slug(name)) : null;
}

/** The plan to resume on refresh (the last one worked on). Used by the PDF too. */
export function loadSnapshot(): AttainSnapshot | null {
  try {
    if (typeof window === "undefined") return null;
    const active = window.localStorage.getItem(ACTIVE);
    return active ? read(NS + active) : null;
  } catch { return null; }
}

/** Save keyed by partner name, and mark it the active plan. */
export function saveSnapshot(s: AttainSnapshot): void {
  try {
    // never write a hollow plan (no partner or no setting chosen) — that's how resume-by-name
    // got clobbered: an empty snapshot overwriting the real one.
    if (typeof window === "undefined" || !s.partner?.trim() || !s.setting) return;
    const k = slug(s.partner);
    window.localStorage.setItem(NS + k, JSON.stringify({ ...s, savedAt: Date.now() }));
    window.localStorage.setItem(ACTIVE, k);
  } catch { /* quota / private mode — silently no-op */ }
}

/** Clear one partner's plan (defaults to the active one) and forget the active pointer. */
export function clearSnapshot(partner?: string): void {
  try {
    if (typeof window === "undefined") return;
    const k = partner ? slug(partner) : window.localStorage.getItem(ACTIVE);
    if (k) window.localStorage.removeItem(NS + k);
    window.localStorage.removeItem(ACTIVE);
  } catch { /* no-op */ }
}

// ---- Set <-> array helpers so the live state (which uses Sets) round-trips cleanly ----
export const setToArr = (s: Set<string>): string[] => Array.from(s);
export const arrToSet = (a: string[] | undefined): Set<string> => new Set(a ?? []);
export const recSetToArr = (r: Record<string, Set<string>>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.from(v)]));
export const recArrToSet = (r: Record<string, string[]> | undefined): Record<string, Set<string>> =>
  Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [k, new Set(v)]));
