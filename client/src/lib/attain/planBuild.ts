/**
 * planBuild — the owner-grouping join for the rebuilt Planning experience.
 *
 * Brad's thesis: a plan is the deconstructed version of achieving an outcome —
 * the few attainable things a specific person tracks against it. So for each
 * outcome we take its value chain (the causal steps, each already carrying a
 * signal + an owner-role in GOAL_CATALOG), and GROUP the steps BY OWNER:
 * "here is who owns each step, and the metric they watch to know it's moving."
 *
 * This is a pure transform of `GOAL_CATALOG[goal].chain` (the single source of
 * the decomposition) enriched with a measurement `source` per signal. The
 * partner's typed overlay (baseline / target / real owner name / by-when) is
 * layered on top via `applyOverlay`, blank by default — never fabricated.
 *
 * It is the single source of truth the build-walk, the synthesized plan, the
 * plan PDF, and Progress all read, mirroring how discovery's `resolveResult`
 * drives its ledger + brief.
 */
import { GOAL_CATALOG, categoryForGoal, goalDisplayLabel } from "./attainGoals";
import type { AttainSetting, GoalId, ChainLink } from "./attainTypes";

/** Where a signal is measured from — the provenance a CFO trusts. */
// EHR-neutral source labels: the leave-behind ships to Epic and non-Epic systems
// alike, so a metric's source is named generically ("EHR signal" / "EHR report"),
// never a specific vendor tool.
export type MetricSource =
  | "Abridge platform"
  | "EHR signal"
  | "EHR report"
  | "Finance"
  | "HRIS";

/** The role a step's metric plays in the ladder: the leading behaviors Abridge
 * proves, the operational middle the partner runs, and the lagging outcome. */
export type StepLayer = "leading" | "operational" | "outcome";

export interface PlanStep {
  /** 1-based step number in the chain, for stable keys + ordering. */
  n: number;
  /** The causal step ("Freed time routed to access"). */
  name: string;
  /** The metric that proves this step moved ("Scheduled hours up, after-hours doc down"). */
  signal: string;
  /** Where the signal is measured from. */
  source: MetricSource;
  layer: StepLayer;
  /** The make-or-break middle links, where plans die. */
  fragile: boolean;
  isAbridge: boolean;
  /** Partner overlay (blank until they enter it). */
  baseline?: string;
  target?: string;
  byWhen?: string;
}

export interface PlanOwner {
  /** The default accountable role for this owner's steps. */
  role: string;
  /** True for the Abridge-side owner (CSM + champion) vs a partner-side owner. */
  isAbridge: boolean;
  /** The real person the partner names (blank default; never fabricated). */
  person?: string;
  /** The metrics this owner tracks (the deconstructed steps they own). */
  steps: PlanStep[];
}

export interface OutcomePlan {
  setting: AttainSetting;
  goal: GoalId;
  /** Stable category string (join key elsewhere), e.g. "Nursing Quality". */
  category: string;
  /** Customer-facing category label — setting-native (nursing retention reads
   * "Nurse Retention", not the "Provider Retention" join key). Use this for any
   * label SHOWN to the customer (PDF eyebrow, on-screen walk); never `category`. */
  displayCategory: string;
  /** The outcome being attained, in the partner's words. */
  outcomeLabel: string;
  chainTitle: string;
  /** The owner-grouped deconstruction — the heart of the plan. */
  owners: PlanOwner[];
  leadingCount: number;
  outcomeStepN: number;
}

/** The single enabling owner for the Abridge-proven leading signals. */
export const ABRIDGE_OWNER = "Abridge + your champion";

/**
 * Setting-specific step language. `GOAL_CATALOG[goal].chain` is authored per
 * GOAL (outpatient-flavored), so ED and inpatient need their own words for the
 * middle + outcome steps or the plan gives a CFO the wrong advice (an ED plan
 * must talk LWBS / door-to-provider, not "slots on the template"). Only the
 * steps that diverge are overridden; the leading adoption links are universal.
 * Grounded in the setting cells in attainCells.ts.
 */
type StepOverride = { name?: string; signal?: string; ownerRole?: string };
const SETTING_STEP_OVERRIDES: Record<string, Record<number, StepOverride>> = {
  "ed:access": {
    3: { name: "Freed charting time redeployed to the front end", signal: "Provider-in-triage hours, intake time", ownerRole: "ED operations" },
    4: { name: "The front end moves faster", signal: "Door-to-provider time falling", ownerRole: "ED charge-nurse leadership" },
    5: { name: "Patients kept from leaving", signal: "LWBS rate falling vs baseline", ownerRole: "ED front-end" },
    6: { name: "Recovered visits completed", signal: "Recovered visit volume vs baseline", ownerRole: "Joint" },
  },
  "ed:revenue": {
    3: { name: "Acuity documented at the bedside", signal: "E/M level distribution vs baseline", ownerRole: "ED coding / CDI" },
    4: { name: "Charts support the level of care", signal: "Down-coding and query rate", ownerRole: "ED physician leadership" },
    5: { name: "Claims clear on first pass", signal: "First-pass acceptance, denial rate", ownerRole: "Billing" },
    6: { name: "Captured level realized", signal: "E/M capture vs baseline", ownerRole: "Joint" },
  },
  // Outpatient is ambulatory wRVU/E&M — DRG weight is an inpatient concept and
  // must not inherit onto the outpatient outcome signal (the base signal carries
  // all three; ED and inpatient override it, outpatient did not until now).
  "outpatient:revenue": {
    6: { name: "Captured level realized", signal: "wRVU / E&M capture vs baseline", ownerRole: "Joint" },
  },
  "inpatient:capacity": {
    1: { name: "Abridge adopted", signal: "% hospitalists recording", ownerRole: ABRIDGE_OWNER },
    3: { name: "Discharge summaries land earlier", signal: "Discharge-summary turnaround", ownerRole: "Hospitalist leadership" },
    4: { name: "Discharge orders move before noon", signal: "Discharge-before-noon rate", ownerRole: "Care management" },
    5: { name: "Beds turn sooner", signal: "Bed-turn time, throughput", ownerRole: "Bed management" },
    6: { name: "Capacity used, not added", signal: "Effective bed capacity vs baseline", ownerRole: "Joint" },
    7: { name: "Avoided-cost / added throughput", signal: "Cost per patient-day, throughput value", ownerRole: "Finance" },
  },
  "inpatient:revenue": {
    1: { signal: "% hospitalists recording, % notes via Abridge" },
    3: { name: "Acuity and complications documented", signal: "CC/MCC capture rate", ownerRole: "CDI" },
    4: { name: "DRGs reflect the care delivered", signal: "Case-mix index vs baseline", ownerRole: "Hospitalist / CDI" },
    5: { name: "Queries close before the bill drops", signal: "Query turnaround, close rate", ownerRole: "CDI / providers" },
    6: { name: "Captured weight realized", signal: "DRG weight vs baseline", ownerRole: "Joint" },
  },
  // The retention chain is authored provider-flavored (link-3 signal is "Panel
  // size", a PCP concept); nursing and inpatient read it in their own terms.
  "nursing:retention": {
    1: { signal: "% nurses recording, % notes via Abridge" },
    3: { ownerRole: "Nurse managers", signal: "Assignment load / ratios, schedule stability" },
    4: { ownerRole: "Nursing ops / staffing" },
    5: { ownerRole: "Nursing leadership / CNO" },
  },
  "inpatient:retention": {
    1: { signal: "% hospitalists recording, % notes via Abridge" },
    3: { ownerRole: "Hospitalist leadership", signal: "Census / service load, schedule stability" },
  },
};

/** Setting-specific outcome titles where the shared goal title reads wrong for
 * the setting (the capacity goal title is nursing-overtime; inpatient capacity is
 * the discharge/bed-turn play). */
const SETTING_TITLE_OVERRIDES: Record<string, string> = {
  "inpatient:capacity": "What Capacity Depends On",
  "ed:access": "What Throughput Depends On",
};

/** Infer a measurement source from a chain link's role in the outcome. */
function sourceFor(link: ChainLink): MetricSource {
  const role = link.ownerRole.toLowerCase();
  const name = link.name.toLowerCase();
  const signal = link.signal.toLowerCase();
  if (link.isAbridge) {
    // Adoption is an Abridge-platform fact; the note-timeliness signals are EHR-observable.
    return /adopt|recording|using/.test(name + signal) ? "Abridge platform" : "EHR signal";
  }
  if (/margin|revenue|cost|contribution|reimburse|captured/.test(name + signal) || role.includes("finance")) {
    return "Finance";
  }
  if (/turnover|retention|departure|vacanc|agency/.test(name + signal) || /\bhr\b|people/.test(role)) {
    return "HRIS";
  }
  // Most operational mid-chain and quality/volume outcomes come from EHR
  // reporting; the final booked outcome lands in an EHR report.
  return /rate|volume|events|compliance|third-next|fill|slots|visits|admission|discharge/.test(signal)
    ? "EHR report"
    : "EHR signal";
}

/**
 * Build the owner-grouped plan for one outcome. Pure function of the static
 * catalog — the decomposition. Overlay the partner's typed values with
 * `applyOverlay`.
 */
export function buildOutcomePlan(setting: AttainSetting, goal: GoalId): OutcomePlan {
  const def = GOAL_CATALOG[goal];
  const chain = def.chain;
  const lastN = chain.length; // the booked outcome is the final link
  const overrides = SETTING_STEP_OVERRIDES[`${setting}:${goal}`] ?? {};
  const byOwner = new Map<string, PlanOwner>();

  for (const baseLink of chain) {
    // Apply the setting-specific override so ED/inpatient read in their own terms.
    const ov = overrides[baseLink.n] ?? {};
    const link = { ...baseLink, name: ov.name ?? baseLink.name, signal: ov.signal ?? baseLink.signal, ownerRole: ov.ownerRole ?? baseLink.ownerRole };
    const layer: StepLayer = link.isAbridge
      ? "leading"
      : link.n === lastN
        ? "outcome"
        : "operational";
    const step: PlanStep = {
      n: link.n,
      name: link.name,
      signal: link.signal,
      source: sourceFor(link),
      layer,
      fragile: link.fragile,
      isAbridge: link.isAbridge,
    };
    // Collapse the Abridge-side links (1-2) under ONE enabling owner so the plan
    // doesn't read as three near-identical "Abridge" rows. Partner links keep
    // their own owner-role. Group preserving first-appearance (chain) order.
    const ownerKey = link.isAbridge ? ABRIDGE_OWNER : link.ownerRole;
    const existing = byOwner.get(ownerKey);
    if (existing) existing.steps.push(step);
    else byOwner.set(ownerKey, { role: ownerKey, isAbridge: link.isAbridge, steps: [step] });
  }

  return {
    setting,
    goal,
    category: categoryForGoal(setting, goal),
    displayCategory: goalDisplayLabel(setting, goal),
    // Setting-native, like displayCategory. This used to take `def.label`, the
    // generic goal definition, which is how a nursing plan carried the label
    // "Provider Retention". It was described as an internal field and exempted
    // from the vocabulary scan on that basis — but "internal" is one render away
    // from customer-facing, and that is exactly how it surfaced.
    outcomeLabel: goalDisplayLabel(setting, goal),
    chainTitle: SETTING_TITLE_OVERRIDES[`${setting}:${goal}`] ?? def.chainTitle,
    owners: Array.from(byOwner.values()),
    leadingCount: chain.filter((l) => l.isAbridge).length,
    outcomeStepN: lastN,
  };
}

/** The vital-few owners the partner must actually name — the make-or-break
 * (fragile) owners and the outcome owner. A consultant scopes accountability to
 * these, not to every link. Excludes the shared Abridge owner. */
export function keyOwners(plan: OutcomePlan): PlanOwner[] {
  return plan.owners.filter(
    (o) => !o.isAbridge && o.steps.some((s) => s.fragile || s.layer === "outcome"),
  );
}

/** Per-step partner overlay, keyed by step n. Blank entries are ignored. */
export type PlanOverlay = Record<number, { baseline?: string; target?: string; byWhen?: string }>;
/** Per-owner-role person names the partner typed in. */
export type OwnerNames = Record<string, string>;

/** Layer the partner's typed baselines/targets/dates + real owner names onto a
 * built plan. Returns a new plan; never mutates. Missing entries stay blank. */
export function applyOverlay(plan: OutcomePlan, overlay: PlanOverlay, names: OwnerNames): OutcomePlan {
  return {
    ...plan,
    owners: plan.owners.map((o) => ({
      ...o,
      person: names[o.role] || o.person,
      steps: o.steps.map((s) => ({ ...s, ...overlay[s.n] })),
    })),
  };
}
