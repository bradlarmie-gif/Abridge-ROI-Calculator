/**
 * Attain — the moved-lever -> ALIGN-language label map.
 *
 * The live side panel's "Decisions so far" list is built from the committed
 * engine levers (so the running total and per-path dollars stay reconciled to
 * `computeAllDriverValues`, unchanged). But a lever's own catalog label is the
 * pre-Align ladder vocabulary ("Protected relief", "Freed share"), which the
 * partner never sees on the Align cards. This module translates each committed
 * lever into the language of the Align CHOICE the partner actually made, so the
 * panel narrates the plan in the same words they just clicked.
 *
 * It changes NO dollar math: it only maps a lever id to a display label. The
 * caller groups committed levers by the returned label (summing each group's
 * marginal margin) so a gated ladder reads as plain steps under one running
 * total, and a multi-path driver (revenue/quality) reads as one dollar per
 * chosen path/event — exactly the shape the panel had before, in Align words.
 *
 * Returns `undefined` when a lever has no Align mapping (ED access, which has no
 * Align config by design, and any future goal without one); the caller then
 * falls back to the lever's own catalog label, i.e. the old behavior.
 */

import { firstSelected, type AlignConfig, type AlignQuestion } from "./alignFramework";
import type { GoalId, AttainSetting } from "./attainTypes";
import type { LeverValues } from "./attainLevers";
import { workforceAlignConfig } from "./workforceAlign";
import { accessAlignConfig } from "./accessAlign";
import { capacityAlignConfig } from "./capacityAlign";
import { REVENUE_PATH_LABELS, type RevenuePathId } from "./attainRevenue";
import { IP_REVENUE_PATH_LABELS, type IpRevenuePathId } from "./attainInpatientRevenue";
import { QUALITY_INTERVENTIONS, QUALITY_EVENT_IDS, QUALITY_EVENT_LABELS } from "./attainQuality";

/** The label of the option the partner selected for a single-select question,
 * looked up straight off the config so it can never drift from the Align card. */
function selectedOptionLabel(questions: AlignQuestion[], storeKey: string, values: LeverValues): string | undefined {
  const q = questions.find((qq) => qq.storeKey === storeKey);
  if (!q) return undefined;
  const sel = firstSelected(values, storeKey);
  if (!sel) return undefined;
  return q.options.find((o) => o.id === sel)?.label;
}

/** A fixed option's label off a question (used for the multi-select demand
 * levers, where each committed lever IS one chosen demand option). */
function optionLabelById(questions: AlignQuestion[], storeKey: string, optionId: string): string | undefined {
  const q = questions.find((qq) => qq.storeKey === storeKey);
  return q?.options.find((o) => o.id === optionId)?.label;
}

// ── Retention (workforce): who / gate / burden ──────────────────────────────
function retentionLabel(values: LeverValues, leverId: string): string | undefined {
  const qs = workforceAlignConfig.questions;
  switch (leverId) {
    case "retentionProviders":
      return selectedOptionLabel(qs, "retentionAlignWho", values);
    case "retentionProtect":
      return selectedOptionLabel(qs, "retentionAlignGate", values);
    case "retentionSurveyCadence":
    case "retentionSustain":
      return selectedOptionLabel(qs, "retentionAlignBurden", values);
    default:
      return undefined;
  }
}

// ── Access (outpatient): who / gate / demand ────────────────────────────────
const ACCESS_DEMAND_LEVER_OPTION: Record<string, string> = {
  accessDemandBacklog: "backlog",
  accessDemandNewReferrals: "referrals",
  accessDemandSameDayCount: "sameday",
  accessDemandNoShowCount: "noshow",
};

function accessLabel(values: LeverValues, leverId: string): string | undefined {
  const qs = accessAlignConfig.questions;
  if (leverId === "accessProviders") return selectedOptionLabel(qs, "accessAlignWho", values);
  if (leverId === "accessFreedShare") return selectedOptionLabel(qs, "accessAlignGate", values);
  const demandOption = ACCESS_DEMAND_LEVER_OPTION[leverId];
  if (demandOption) return optionLabelById(qs, "accessAlignDemand", demandOption);
  return undefined;
}

// ── Capacity (nursing overtime): who / gate / where ─────────────────────────
function capacityLabel(values: LeverValues, leverId: string): string | undefined {
  const qs = capacityAlignConfig.questions;
  switch (leverId) {
    case "capacityNurses":
      return selectedOptionLabel(qs, "capacityAlignWho", values);
    case "capacityDocShare":
      return selectedOptionLabel(qs, "capacityAlignGate", values);
    case "capacityConversion":
      return selectedOptionLabel(qs, "capacityAlignWhere", values);
    default:
      return undefined;
  }
}

// ── Revenue: one label per chosen PATH (the path-selector Align choice) ──────
const REVENUE_LEVER_PATH: Record<string, RevenuePathId> = {
  revenueHccRecapture: "hcc",
  revenueHccNetNew: "hcc",
  revenueHccValuePerHcc: "hcc",
  revenueEmLift: "em",
  revenueEmConversionFactor: "em",
  revenueDenialsPreventable: "denials",
  revenueDenialsAvgClaimValue: "denials",
};
const IP_REVENUE_LEVER_PATH: Record<string, IpRevenuePathId> = {
  ipDrgAtRiskRate: "drg",
  ipDrgCapture: "drg",
  ipDrgWeightIncrease: "drg",
  ipDrgBasePayment: "drg",
  ipCdiQueryRate: "cdi",
  ipCdiReduction: "cdi",
  ipCdiCostPerQuery: "cdi",
  ipObsDenialRate: "obs",
  ipObsPreventable: "obs",
  ipObsRevenueDelta: "obs",
};

function revenueLabel(setting: AttainSetting, leverId: string): string | undefined {
  if (setting === "inpatient") {
    const path = IP_REVENUE_LEVER_PATH[leverId];
    return path ? IP_REVENUE_PATH_LABELS[path] : undefined;
  }
  const path = REVENUE_LEVER_PATH[leverId];
  return path ? REVENUE_PATH_LABELS[path] : undefined;
}

// ── Quality: one label per chosen harm EVENT (the events Align choice) ───────
const QUALITY_INTERVENTION_EVENT: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const eventId of QUALITY_EVENT_IDS) {
    for (const iv of QUALITY_INTERVENTIONS[eventId]) map[iv.id] = eventId;
  }
  return map;
})();

function qualityLabel(values: LeverValues, leverId: string, config: AlignConfig | null): string | undefined {
  if (leverId === "qualityBeds") return selectedOptionLabel(config?.questions ?? [], "qualityAlignWho", values);
  const eventId = QUALITY_INTERVENTION_EVENT[leverId];
  if (eventId) return QUALITY_EVENT_LABELS[eventId as keyof typeof QUALITY_EVENT_LABELS];
  return undefined;
}

/**
 * The one entry point. Given a committed lever, returns the Align-language
 * label that reflects the partner's actual choice, or `undefined` to fall back
 * to the lever's catalog label. `config` is the goal+setting's resolved Align
 * config (or null), passed in so this module never imports the page-level
 * routing and quality can read its setting-scoped questions.
 */
export function alignDecisionLabelForLever(
  goal: GoalId,
  setting: AttainSetting | undefined,
  values: LeverValues,
  leverId: string,
  config: AlignConfig | null,
): string | undefined {
  if (!setting) return undefined;
  switch (goal) {
    case "retention":
      return retentionLabel(values, leverId);
    case "access":
      return setting === "ed" ? undefined : accessLabel(values, leverId);
    case "capacity":
      return capacityLabel(values, leverId);
    case "revenue":
      return revenueLabel(setting, leverId);
    case "quality":
      return qualityLabel(values, leverId, config);
    default:
      return undefined;
  }
}
