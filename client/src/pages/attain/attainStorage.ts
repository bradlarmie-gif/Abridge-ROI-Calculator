/**
 * Attain plan persistence. The whole in-session plan (funnel choices + every Align/Plan
 * answer + readings + the review log) is autosaved to localStorage and restored on load,
 * so a partner's plan survives refresh and accumulates across quarterly reviews.
 *
 * A partner holds ONE plan per care setting: "Utah Health · Nursing" and
 * "Utah Health · ED" are separate saved conversations, so building out a new
 * setting never overwrites another. Keyed by `slug(partner)::setting`. Legacy
 * single-slot plans (keyed by name alone) are read as a fallback and migrated
 * forward on the next save. Sets/nested-Sets are serialized to arrays.
 */

import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { DiscoveryAnswers } from "@/lib/attain/discovery";
import type { PlanBuildState } from "./planning/PlanBuildExperience";

const NS = "attain:plan:v1:";           // saved plans, keyed by `slug(partner)::setting`
const ACTIVE = "attain:plan:v1:active"; // which plan id to resume on refresh
const SEP = "::";
const slug = (name: string) => (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
const planId = (partner: string, setting: string) => `${slug(partner)}${SEP}${setting}`;

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

/** One partner's plan for a specific care setting (null if none). Falls back to
 * a legacy single-slot plan when its setting matches, so plans saved before the
 * per-setting split still resume. */
export function loadPlan(name: string, setting: string): AttainSnapshot | null {
  if (!name.trim()) return null;
  const composite = read(NS + planId(name, setting));
  if (composite) return composite;
  const legacy = read(NS + slug(name)); // pre per-setting split
  return legacy?.setting === setting ? legacy : null;
}

/** Every care-setting plan saved under this partner, most-recently-worked first.
 * De-duplicates a legacy single-slot plan against its per-setting equivalent. */
export function savedSettingsForPartner(name: string): { setting: string; snapshot: AttainSnapshot }[] {
  if (typeof window === "undefined" || !name.trim()) return [];
  const s = slug(name);
  const prefix = NS + s + SEP;
  const bySetting = new Map<string, AttainSnapshot>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const snap = read(key);
      if (snap?.setting) bySetting.set(snap.setting, snap);
    }
    const legacy = read(NS + s); // legacy single-slot plan, no separator
    if (legacy?.setting && !bySetting.has(legacy.setting)) bySetting.set(legacy.setting, legacy);
  } catch { /* no-op */ }
  return Array.from(bySetting.values())
    .map((snap) => ({ setting: snap.setting as string, snapshot: snap }))
    .sort((a, b) => (b.snapshot.savedAt ?? 0) - (a.snapshot.savedAt ?? 0));
}

/** The plan to resume on refresh (the last one worked on). Used by the PDF too. */
export function loadSnapshot(): AttainSnapshot | null {
  try {
    if (typeof window === "undefined") return null;
    const active = window.localStorage.getItem(ACTIVE);
    return active ? read(NS + active) : null;
  } catch { return null; }
}

/** Save keyed by partner + setting, and mark it the active plan. Migrates a
 * legacy single-slot plan for the same setting forward (removes it once the
 * per-setting key is written) so it never lingers as a duplicate. */
export function saveSnapshot(s: AttainSnapshot): void {
  try {
    // never write a hollow plan (no partner or no setting chosen) — that's how resume-by-name
    // got clobbered: an empty snapshot overwriting the real one.
    if (typeof window === "undefined" || !s.partner?.trim() || !s.setting) return;
    const id = planId(s.partner, s.setting);
    window.localStorage.setItem(NS + id, JSON.stringify({ ...s, savedAt: Date.now() }));
    window.localStorage.setItem(ACTIVE, id);
    const legacyKey = NS + slug(s.partner);
    const legacy = read(legacyKey);
    if (legacy?.setting === s.setting) window.localStorage.removeItem(legacyKey);
  } catch { /* quota / private mode — silently no-op */ }
}

/** Clear one partner+setting plan (defaults to the active one) and forget the
 * active pointer. Only removes a legacy single-slot plan when its setting
 * matches, so start-over on one setting never wipes another. */
export function clearSnapshot(partner?: string, setting?: string): void {
  try {
    if (typeof window === "undefined") return;
    const id = partner && setting ? planId(partner, setting) : window.localStorage.getItem(ACTIVE);
    if (id) window.localStorage.removeItem(NS + id);
    if (partner && setting) {
      const legacyKey = NS + slug(partner);
      const legacy = read(legacyKey);
      if (legacy?.setting === setting) window.localStorage.removeItem(legacyKey);
    }
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
