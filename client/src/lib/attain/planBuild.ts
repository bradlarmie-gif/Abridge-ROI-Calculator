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
import { GOAL_CATALOG, categoryForGoal } from "./attainGoals";
import type { AttainSetting, GoalId, ChainLink } from "./attainTypes";

/** Where a signal is measured from — the provenance a CFO trusts. */
export type MetricSource =
  | "Abridge platform"
  | "Epic Signal"
  | "Reporting Workbench"
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
  /** The outcome being attained, in the partner's words. */
  outcomeLabel: string;
  chainTitle: string;
  /** The owner-grouped deconstruction — the heart of the plan. */
  owners: PlanOwner[];
  leadingCount: number;
  outcomeStepN: number;
}

/** Infer a measurement source from a chain link's role in the outcome. */
function sourceFor(link: ChainLink): MetricSource {
  const role = link.ownerRole.toLowerCase();
  const name = link.name.toLowerCase();
  const signal = link.signal.toLowerCase();
  if (link.isAbridge) {
    // Adoption is an Abridge-platform fact; the note-timeliness signals are Epic-observable.
    return /adopt|recording|using/.test(name + signal) ? "Abridge platform" : "Epic Signal";
  }
  if (/margin|revenue|cost|contribution|reimburse|captured/.test(name + signal) || role.includes("finance")) {
    return "Finance";
  }
  if (/turnover|retention|departure|vacanc|agency/.test(name + signal) || /\bhr\b|people/.test(role)) {
    return "HRIS";
  }
  // Most operational mid-chain and quality/volume outcomes are pulled from Epic
  // reporting; the final booked outcome lands in Reporting Workbench.
  return /rate|volume|events|compliance|third-next|fill|slots|visits|admission|discharge/.test(signal)
    ? "Reporting Workbench"
    : "Epic Signal";
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
  const byOwner = new Map<string, PlanOwner>();

  for (const link of chain) {
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
    // Group by owner, preserving first-appearance order (chain order).
    const existing = byOwner.get(link.ownerRole);
    if (existing) existing.steps.push(step);
    else byOwner.set(link.ownerRole, { role: link.ownerRole, isAbridge: link.isAbridge, steps: [step] });
  }

  return {
    setting,
    goal,
    category: categoryForGoal(setting, goal),
    outcomeLabel: def.label,
    chainTitle: def.chainTitle,
    owners: Array.from(byOwner.values()),
    leadingCount: chain.filter((l) => l.isAbridge).length,
    outcomeStepN: lastN,
  };
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
