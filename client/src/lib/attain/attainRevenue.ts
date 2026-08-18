import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { realizedValue, formulaWithRealization } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState, type HccPlan } from "@/pages/explore/ExploreFlow";
import type { AttainSetting } from "./attainTypes";

/**
 * Attain — REVENUE decision chain engine.
 *
 * Revenue is not one mechanism, it is THREE genuinely distinct paths a
 * partner chooses among (one or more, per the product owner's spec):
 *
 *   1. Risk Adjustment (HCC capture) — outpatient only, the richest path.
 *      Recaptured HCCs (conditions documented before that dropped off) and
 *      suspected/net-new HCCs (conditions ambient surfaces for the first
 *      time) are two genuinely separate, non-overlapping terms in the same
 *      engine formula (see `computeAllDriverValues`'s `hccCapture`), so
 *      this chain prices them as two exact, additive sub-totals rather than
 *      one blended number — "where the value comes from" is not a guess.
 *   2. E/M Level Accuracy — the wRVU lift, priced at a partner-entered
 *      conversion factor. This IS the wRVU mechanism (there is no separate
 *      "act on documented complexity" lever elsewhere), so it can never be
 *      double-booked against itself.
 *   3. Medical Necessity Denials — a genuinely additive, separate claims
 *      mechanism (a denied claim and a captured HCC/wRVU are not the same
 *      dollar), priced from the partner's own denial rate, how much of it
 *      is preventable, and average claim value.
 *
 * Unlike Access (one MIN-gated chain), these three paths are NOT jointly
 * dependent on each other — HCC capture, coding-level accuracy, and denial
 * prevention are different claims/encounters in the real world, so their
 * dollar contributions are computed independently and simply SUMMED. Each
 * path's own decisions ARE gated in order (population/scope before
 * rate/lift before price before the payoff), mirroring Access's discipline
 * that a dollar figure never appears before the decisions behind it are
 * real — see each path's own chain runner below.
 *
 * SCOPE: this module only ever runs for outpatient/ED. Inpatient revenue
 * (DRG accuracy / CDI query reduction / obs status defense) is a different
 * mechanism entirely and is left untouched on its original flat-lever model
 * in `attainLevers.ts` (`REVENUE_IP_LEVERS` / `ipRevenueChannel`) — see
 * `leversFor` and `computeLeverContributions`'s branch for the switch.
 *
 * Reconciliation: every path's engine value is read straight off
 * `computeAllDriverValues` (`hccCapture`, `wrvu`/`edEmLevel`,
 * `denialPrevention`), fed a synthesized `ExploreState` built from this
 * chain's own decisions plus the partner's Starting-point baseline — never
 * a second, hand-rolled formula that could drift from the Explore engine.
 * All three paths' `*Realization` fields are fixed at 100% here (not
 * exposed as a partner decision) so the printed "the math" line always
 * matches the literal factors the product spec calls out (population ×
 * rate × price, current wRVU × lift × conversion factor × encounters,
 * denial rate × preventable % × claim value) with no hidden haircut — a
 * deliberate simplification, documented here once rather than on every
 * formula string.
 */

// ────────────────────────────────────────────────────────────────────────
// Shared local helpers (deliberately not imported from attainLevers.ts /
// attainAccess.ts, to keep this chain a self-contained, independently
// reasoned-about module — same convention attainAccess.ts uses).
// ────────────────────────────────────────────────────────────────────────

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function perProviderEncounters(baseline: AttainBaseline, fallback: number): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  return providers > 0 && encounters > 0 ? encounters / providers : fallback;
}
// Falls back to 70% - the same "typical" utilization `defaultBaseline`
// documents app-wide (attainLevers.ts), not an optimistic 100% - so a blank
// Scope step never silently assumes every provider runs at full capacity.
function utilizationFraction(baseline: AttainBaseline, fallbackPct = 70): number {
  const pct = baseline.utilizationPct ?? fallbackPct;
  return Math.min(1, Math.max(0, pct / 100));
}

function mkState(setting: AttainSetting): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: setting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

const NO_MOVE_FORMULA = "Set the numbers above and the math appears here.";

// ────────────────────────────────────────────────────────────────────────
// Path identity — the three choices on the path chooser.
// ────────────────────────────────────────────────────────────────────────

export const REVENUE_PATH_LABELS = {
  hcc: "Risk Adjustment",
  em: "E/M Level Accuracy",
  denials: "Medical Necessity Denials",
} as const;

export type RevenuePathId = keyof typeof REVENUE_PATH_LABELS;

export const REVENUE_PATH_IDS: RevenuePathId[] = ["hcc", "em", "denials"];

/** Which paths a setting actually supports — outpatient gets all three, ED
 * reuses E/M + Denials (no risk-adjustment panel math for an ED encounter),
 * inpatient never reaches this module at all (its own model, untouched). */
export function pathsAvailableFor(setting: AttainSetting): RevenuePathId[] {
  if (setting === "ed") return ["em", "denials"];
  if (setting === "outpatient") return ["hcc", "em", "denials"];
  return [];
}

export function selectedPaths(values: LeverValues): RevenuePathId[] {
  const raw = asLines(values.revenuePaths);
  return REVENUE_PATH_IDS.filter((id) => raw.includes(REVENUE_PATH_LABELS[id]));
}

// ────────────────────────────────────────────────────────────────────────
// PATH 1 — Risk Adjustment (HCC capture), outpatient only
// ────────────────────────────────────────────────────────────────────────

export const HCC_POPULATIONS: { name: string; planType: HccPlan["planType"] }[] = [
  { name: "Medicare Advantage", planType: "medicare_advantage" },
  { name: "Medicaid MCO", planType: "medicaid_mco" },
  { name: "ACA / Exchange", planType: "aca_marketplace" },
];

/** Benchmark patients-per-provider (panel size), one per population,
 * editable — matches the illustrative defaults Explore's own hccPlans
 * model ships with for Medicare Advantage. */
export const DEFAULT_HCC_PANEL_SIZE: Record<string, number> = {
  "Medicare Advantage": 300,
  "Medicaid MCO": 250,
  "ACA / Exchange": 180,
};
export const DEFAULT_GAP_RATE = 65;
export const DEFAULT_CURRENT_RECAPTURE_RATE = 65;
export const DEFAULT_AVG_HCCS = 0.5;
export const DEFAULT_AVG_NET_NEW_CONDITIONS = 1.2;
export const DEFAULT_VALUE_PER_HCC = 1500;

export function selectedPopulations(values: LeverValues): string[] {
  return asLines(values.revenueHccPopulations);
}
export function hccPanelSizeFor(population: string, values: LeverValues): number {
  const raw = values[`revenueHccPanel__${population}`];
  if (typeof raw === "number" && raw > 0) return raw;
  return DEFAULT_HCC_PANEL_SIZE[population] ?? 200;
}
export function hccValuePerHcc(values: LeverValues): number {
  const raw = asNum(values.revenueHccValuePerHcc);
  return raw > 0 ? raw : DEFAULT_VALUE_PER_HCC;
}

export interface RevenueHccScope {
  populations: { name: string; planType: HccPlan["planType"]; panelSize: number; patients: number }[];
  providers: number;
  totalPatients: number;
}

/** D1: which population(s) are in scope, and how many patients each one
 * represents (providers in the partner's own Starting-point baseline ×
 * that population's own panel size) — no dollar yet, just real scope. */
export function computeHccScope(baseline: AttainBaseline, values: LeverValues): RevenueHccScope {
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const names = selectedPopulations(values);
  const populations = names.map((name) => {
    const preset = HCC_POPULATIONS.find((p) => p.name === name);
    const panelSize = hccPanelSizeFor(name, values);
    return { name, planType: preset?.planType ?? ("custom" as HccPlan["planType"]), panelSize, patients: providers * panelSize };
  });
  const totalPatients = populations.reduce((sum, p) => sum + p.patients, 0);
  return { populations, providers, totalPatients };
}

export interface RevenueHccRecapture {
  gapRate: number;
  currentRecaptureRate: number;
  upliftPp: number;
  effectiveUpliftPp: number;
  avgHccs: number;
  gapPatients: number;
  recapturedHccs: number;
}

/** D2: recaptured HCCs — conditions documented before that dropped off.
 * `upliftPp` is the partner's actual COMMITMENT (realityStart 0, so doing
 * nothing new recaptures nothing); `gapRate`/`currentRecaptureRate`/
 * `avgHccs` are descriptive inputs about today's plan, editable but not
 * gating (same convention as Access's D2 blended-margin default). */
export function computeHccRecapture(scope: RevenueHccScope, values: LeverValues): RevenueHccRecapture {
  const gapRateRaw = asNum(values.revenueHccGapRate);
  const gapRate = clampPct(gapRateRaw > 0 ? gapRateRaw : DEFAULT_GAP_RATE);
  const currentRaw = asNum(values.revenueHccCurrentRecapture);
  const currentRecaptureRate = clampPct(currentRaw > 0 ? currentRaw : DEFAULT_CURRENT_RECAPTURE_RATE);
  const upliftPp = Math.max(0, asNum(values.revenueHccRecapture));
  const effectiveUpliftPp = Math.min(upliftPp, Math.max(0, 90 - currentRecaptureRate));
  const avgHccsRaw = asNum(values.revenueHccAvgHccs);
  const avgHccs = avgHccsRaw > 0 ? avgHccsRaw : DEFAULT_AVG_HCCS;

  let gapPatients = 0;
  let recapturedHccs = 0;
  for (const pop of scope.populations) {
    const gapPts = pop.patients * (gapRate / 100);
    gapPatients += gapPts;
    recapturedHccs += gapPts * (effectiveUpliftPp / 100) * avgHccs;
  }
  return { gapRate, currentRecaptureRate, upliftPp, effectiveUpliftPp, avgHccs, gapPatients, recapturedHccs };
}

export interface RevenueHccNetNew {
  discoveryRate: number;
  avgNetNewConditions: number;
  discoveredPatients: number;
  netNewHccs: number;
}

/** D3: suspected / net-new HCCs — conditions ambient surfaces for the
 * first time, never coded before. Discovery rate is the gate
 * (realityStart 0); avg conditions per discovered patient is descriptive. */
export function computeHccNetNew(scope: RevenueHccScope, values: LeverValues): RevenueHccNetNew {
  const discoveryRate = clampPct(Math.max(0, asNum(values.revenueHccNetNew)));
  const avgRaw = asNum(values.revenueHccAvgNetNewConditions);
  const avgNetNewConditions = avgRaw > 0 ? avgRaw : DEFAULT_AVG_NET_NEW_CONDITIONS;

  let discoveredPatients = 0;
  let netNewHccs = 0;
  for (const pop of scope.populations) {
    const discovered = pop.patients * (discoveryRate / 100);
    discoveredPatients += discovered;
    netNewHccs += discovered * avgNetNewConditions;
  }
  return { discoveryRate, avgNetNewConditions, discoveredPatients, netNewHccs };
}

export interface RevenueHccPayoff {
  /** D2's exact share of the dollar — recapture and net-new sum as two
   * separate, non-overlapping terms in the underlying engine formula, so
   * this split is exact, not an estimate. */
  recaptureValue: number;
  netNewValue: number;
  value: number;
  valuePerHcc: number;
}

/** D5: the payoff. recapture$ + netNew$, each an exact partition of the
 * combined engine formula (see the module header), never smeared evenly
 * across the chain the way Access must attribute its single MIN-gated
 * dollar to one binding row. */
export function computeHccPayoff(recapture: RevenueHccRecapture, netNew: RevenueHccNetNew, valuePerHcc: number): RevenueHccPayoff {
  const recaptureValue = Math.round(recapture.recapturedHccs * valuePerHcc);
  const netNewValue = Math.round(netNew.netNewHccs * valuePerHcc);
  return { recaptureValue, netNewValue, value: recaptureValue + netNewValue, valuePerHcc };
}

export interface RevenueHccChainResult {
  scope: RevenueHccScope;
  recapture: RevenueHccRecapture;
  netNew: RevenueHccNetNew;
  payoff: RevenueHccPayoff;
  formulas: { recapture: string; netNew: string; payoff: string };
}

/** Builds the exact `HccPlan[]` this chain's decisions correspond to, one
 * plan per selected population, sharing every rate/price decision (the
 * partner prices risk adjustment once, not once per population) — used
 * both to run the real engine (`computeAllDriverValues`) for reconciliation
 * tests and, indirectly, to derive this chain's own numbers with the exact
 * same factors, so the two can never disagree. */
export function buildHccPlans(scope: RevenueHccScope, recapture: RevenueHccRecapture, netNew: RevenueHccNetNew, valuePerHcc: number): HccPlan[] {
  return scope.populations.map((pop, i) => ({
    id: `attain-hcc-${i}`,
    planType: pop.planType,
    name: pop.name,
    panelSize: pop.panelSize,
    valuePerHcc,
    gapRate: recapture.gapRate,
    currentRecaptureRate: recapture.currentRecaptureRate,
    uplift: "custom",
    upliftCustomPp: recapture.upliftPp,
    netNewEnabled: netNew.discoveryRate > 0,
    netNewDiscoveryRate: netNew.discoveryRate,
    netNewAvgConditions: netNew.avgNetNewConditions,
  }));
}

export function computeHccChain(baseline: AttainBaseline, values: LeverValues): RevenueHccChainResult {
  const scope = computeHccScope(baseline, values);
  const recapture = computeHccRecapture(scope, values);
  const netNew = computeHccNetNew(scope, values);
  const valuePerHcc = hccValuePerHcc(values);
  const payoff = computeHccPayoff(recapture, netNew, valuePerHcc);

  // D2/D3 stay COUNT-only (no dollar, no valuePerHcc) - same discipline as
  // Access's D3/D4 MathBoxes, which derive visits, never a dollar, before
  // the chain's own D5-equivalent. Price only ever multiplies in below.
  const recaptureFormula = recapture.recapturedHccs > 0
    ? `${fmtInt(recapture.gapPatients)} gap patients × ${fmtInt(recapture.effectiveUpliftPp)}pp recapture uplift (${fmtInt(recapture.currentRecaptureRate)}%→${fmtInt(recapture.currentRecaptureRate + recapture.effectiveUpliftPp)}%) × ${recapture.avgHccs} avg HCCs = ${fmtInt(recapture.recapturedHccs)} recaptured HCCs.`
    : NO_MOVE_FORMULA;
  const netNewFormula = netNew.netNewHccs > 0
    ? `${fmtInt(netNew.discoveredPatients)} newly discovered patients × ${netNew.avgNetNewConditions} conditions/patient = ${fmtInt(netNew.netNewHccs)} net-new HCCs.`
    : NO_MOVE_FORMULA;
  const payoffFormula = payoff.value > 0
    ? `${fmtInt(recapture.recapturedHccs)} recaptured + ${fmtInt(netNew.netNewHccs)} net-new = ${fmtInt(recapture.recapturedHccs + netNew.netNewHccs)} HCCs × $${fmtInt(valuePerHcc)}/HCC = ~${fmtMoneyCompact(payoff.recaptureValue)} recaptured + ~${fmtMoneyCompact(payoff.netNewValue)} net new = ~${fmtMoneyCompact(payoff.value)}.`
    : NO_MOVE_FORMULA;

  return { scope, recapture, netNew, payoff, formulas: { recapture: recaptureFormula, netNew: netNewFormula, payoff: payoffFormula } };
}

// ────────────────────────────────────────────────────────────────────────
// PATH 2 — E/M Level Accuracy (wRVU), outpatient + ED
// ────────────────────────────────────────────────────────────────────────

export const DEFAULT_CURRENT_WRVU = 1.8;
export const DEFAULT_CONVERSION_FACTOR = 33;

// Outpatient E/M grounding + diagnosis defaults (the owner-approved
// question sequence, 2026-07-22). These size or scope the path; the one
// gate that turns them into a dollar is the capture commitment
// (`revenueEmLift`, reinterpreted here as "the share of the
// documentation-caused gap you commit to close", realityStart 0).
export const DEFAULT_EM_EMPLOYED_SHARE = 100; // % of providers on productivity / wRVU pay
export const DEFAULT_EM_VISIT_SHARE = 100; // % of visits that are office / E&M visits
export const DEFAULT_EM_DOC_CAUSED_SHARE = 20; // % of E/M visits whose claim goes out below the care delivered because the note fell short
export const DEFAULT_EM_WRVU_GAIN = 0.4; // avg wRVU recovered when one of those claims is corrected to the supported level

export interface RevenueEmChain {
  currentWrvu: number;
  liftPct: number;
  conversionFactor: number;
  eligibleEncounters: number;
  wrvusCaptured: number;
  value: number;
  /** Outpatient-only grounding + diagnosis rungs (ED leaves these at their
   * neutral values and prices off the raw wRVU lift instead). */
  isOutpatient: boolean;
  employedSharePct: number;
  visitSharePct: number;
  docCausedSharePct: number;
  /** The ceiling count: E/M visits whose claim goes out below the care
   * delivered because the note fell short. Abridge can only move this pool. */
  docCausedVisits: number;
  /** The commitment: share of that documentation-caused pool you close. */
  capturePct: number;
  correctedVisits: number;
  wrvuGain: number;
}

/**
 * The outpatient/ED E/M path. Both settings run the SAME four-beat ladder
 * conversation and reconcile to Explore's `wrvu`/`edEmLevel` driver (eligible
 * encounters × current wRVU × lift × conversion factor). The one thing that
 * differs is the GROUND question each setting asks:
 *
 *  - OUTPATIENT (the ladder exemplar). GROUND: what share of providers are
 *    employed / on productivity pay (wRVU gains only accrue there) and what
 *    share of visits are office / E&M visits (that scopes the volume).
 *  - ED. GROUND: what share of ED visits are billable E/M visits (ED
 *    providers, so there is no productivity-pay gate; employed share is fixed
 *    at 100 and never asked). The DIAGNOSE beat is worded for the ED but is
 *    the same mechanism: on those ED visits, how often does the claim go out
 *    below the acuity actually delivered because the note did not capture it.
 *
 * DIAGNOSE (both): the documentation-caused share of those visits whose claim
 * goes out below the care/acuity actually delivered, the ceiling Abridge can
 * move. COMMIT (both): the share of that pool you close (`revenueEmLift`,
 * realityStart 0). The captured wRVUs are correctedVisits × wRVU recovered per
 * corrected claim, and the effective lift-vs-average is derived from that so
 * the engine reconciliation is exact for both settings.
 */
export function computeEmChain(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): RevenueEmChain {
  const isED = setting === "ed";
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const perUnit = perProviderEncounters(baseline, isED ? 1_800 : 3_500);
  const util = utilizationFraction(baseline);
  const baseEligible = Math.round(providers * perUnit * util);

  const currentWrvuRaw = asNum(values.revenueEmCurrentWrvu);
  const currentWrvu = currentWrvuRaw > 0 ? currentWrvuRaw : DEFAULT_CURRENT_WRVU;
  const conversionFactorRaw = asNum(values.revenueEmConversionFactor);
  const conversionFactor = conversionFactorRaw > 0 ? conversionFactorRaw : DEFAULT_CONVERSION_FACTOR;

  // GROUND. Outpatient asks employed share AND office/E&M visit share; ED asks
  // only the billable-E/M-visit share (no productivity-pay gate for ED
  // providers), so employed share is fixed at 100 and never surfaced.
  const employedRaw = asNum(values.revenueEmEmployedShare);
  const employedSharePct = isED ? 100 : clampPct(employedRaw > 0 ? employedRaw : DEFAULT_EM_EMPLOYED_SHARE);
  const visitRaw = asNum(values.revenueEmVisitShare);
  const visitSharePct = clampPct(visitRaw > 0 ? visitRaw : DEFAULT_EM_VISIT_SHARE);
  const docCausedRaw = asNum(values.revenueEmDocCausedShare);
  const docCausedSharePct = clampPct(docCausedRaw > 0 ? docCausedRaw : DEFAULT_EM_DOC_CAUSED_SHARE);
  const wrvuGainRaw = asNum(values.revenueEmWrvuGain);
  const wrvuGain = wrvuGainRaw > 0 ? wrvuGainRaw : DEFAULT_EM_WRVU_GAIN;
  // The one gate (realityStart 0): the share of the documentation-caused
  // pool you commit to close. Nothing captured until you commit to it.
  const capturePct = clampPct(Math.max(0, asNum(values.revenueEmLift)));

  const eligibleEncounters = Math.round(baseEligible * (employedSharePct / 100) * (visitSharePct / 100));
  const docCausedVisits = eligibleEncounters * (docCausedSharePct / 100);
  const correctedVisits = docCausedVisits * (capturePct / 100);
  const wrvusCaptured = correctedVisits * wrvuGain;
  // Back out the effective lift-vs-average so the reconciliation ExploreState
  // (annualEncounters = eligibleEncounters, wrvuCustomPercent = liftPct)
  // reproduces this exact wRVU total off the Explore engine (`wrvu` for
  // outpatient, `edEmLevel` for ED, identical formula).
  const liftPct = eligibleEncounters > 0 && currentWrvu > 0 ? (wrvusCaptured / (eligibleEncounters * currentWrvu)) * 100 : 0;
  const value = Math.round(wrvusCaptured * conversionFactor);

  return {
    currentWrvu, liftPct, conversionFactor, eligibleEncounters, wrvusCaptured, value,
    isOutpatient: !isED, employedSharePct, visitSharePct, docCausedSharePct,
    docCausedVisits, capturePct, correctedVisits, wrvuGain,
  };
}

/** D2's count-only derivation (no price yet) - "how many extra wRVUs this
 * capture recovers", mirroring Access's D3/D4 discipline of deriving a count
 * before any dollar exists. Both outpatient and ED run the same
 * documentation-caused derivation, so the wording is shared. */
export function emCountFormula(chain: RevenueEmChain): string {
  if (chain.wrvusCaptured <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.docCausedVisits)} claims a year go out below the care delivered × ${fmtInt(chain.capturePct)}% closed × ${chain.wrvuGain} wRVU recovered each = ${Math.round(chain.wrvusCaptured).toLocaleString()} wRVUs captured.`;
}

/** The payoff formula - the first (and only) place a dollar appears in
 * this path, reconciling exactly to Explore's `wrvu`/`edEmLevel` driver. */
export function emFormula(chain: RevenueEmChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.docCausedVisits)} documentation-caused claims × ${fmtInt(chain.capturePct)}% closed × ${chain.wrvuGain} wRVU each × $${fmtInt(chain.conversionFactor)}/wRVU = ~${fmtMoneyCompact(chain.value)}.`;
}

// ────────────────────────────────────────────────────────────────────────
// PATH 3 — Medical Necessity Denials, outpatient + ED
//
// MARGIN NOTE: Access prices a NEW visit at contribution margin, not gross
// charges, because a new visit carries new variable cost (staff time,
// supplies) that has to be netted out before the dollar is honest. A
// prevented denial is a DIFFERENT economic event: the care was already
// delivered before the claim was ever denied, so there is no new
// incremental cost to net out - the only thing at stake is whether the
// claim that already-rendered care earns gets PAID. Booking a prevented
// denial at the average CLAIM value (not a margin-per-claim) is therefore
// the economically correct frame here, not a lapse from the app's
// margin-not-charges discipline - see `revenueDenialsAvgClaimValue`'s lever
// help in attainLevers.ts for the partner-facing version of this same
// justification. This also reconciles exactly to Explore's own
// `denialPrevention` driver, which prices the identical way.
// ────────────────────────────────────────────────────────────────────────

export const DEFAULT_DENIAL_RATE = 3;
export const DEFAULT_AVG_CLAIM_VALUE = 800;

export interface RevenueDenialsChain {
  denialRate: number;
  preventablePct: number;
  avgClaimValue: number;
  eligibleEncounters: number;
  deniedEncounters: number;
  prevented: number;
  value: number;
}

/** `preventablePct` is the gate (realityStart 0); `denialRate` and
 * `avgClaimValue` are real, editable descriptive/pricing inputs. Priced at
 * the full average CLAIM value, not a contribution margin - see the module
 * section header just above for why that is the economically correct frame
 * for an already-delivered, already-denied claim (no new variable cost to
 * net out), not an inconsistency with Access's margin-per-visit pricing. */
export function computeDenialsChain(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): RevenueDenialsChain {
  const isED = setting === "ed";
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const perUnit = perProviderEncounters(baseline, isED ? 1_800 : 3_500);
  const util = utilizationFraction(baseline);
  const eligibleEncounters = Math.round(providers * perUnit * util);

  const denialRateRaw = asNum(values.revenueDenialsRate);
  const denialRate = denialRateRaw > 0 ? denialRateRaw : DEFAULT_DENIAL_RATE;
  const preventablePct = clampPct(Math.max(0, asNum(values.revenueDenialsPreventable)));
  const avgClaimValueRaw = asNum(values.revenueDenialsAvgClaimValue);
  const avgClaimValue = avgClaimValueRaw > 0 ? avgClaimValueRaw : DEFAULT_AVG_CLAIM_VALUE;

  const deniedEncounters = eligibleEncounters * (denialRate / 100);
  const prevented = deniedEncounters * (preventablePct / 100);
  const value = Math.round(prevented * avgClaimValue);

  return { denialRate, preventablePct, avgClaimValue, eligibleEncounters, deniedEncounters, prevented, value };
}

/** D2's count-only derivation (no price yet). */
export function denialsCountFormula(chain: RevenueDenialsChain): string {
  if (chain.prevented <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.eligibleEncounters)} eligible encounters × ${chain.denialRate}% medical-necessity denial rate × ${fmtInt(chain.preventablePct)}% preventable = ${Math.round(chain.prevented).toLocaleString()} denials prevented.`;
}

/** The payoff formula - the first (and only) place a dollar appears in
 * this path. */
export function denialsFormula(chain: RevenueDenialsChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.eligibleEncounters)} eligible encounters × ${chain.denialRate}% medical-necessity denial rate × ${fmtInt(chain.preventablePct)}% preventable × $${fmtInt(chain.avgClaimValue)}/claim = ~${fmtMoneyCompact(chain.value)}.`;
}

// ────────────────────────────────────────────────────────────────────────
// Orchestrator — the three paths, gated by selection + setting, summed.
// ────────────────────────────────────────────────────────────────────────

export interface RevenueChainResult {
  paths: RevenuePathId[];
  hcc?: RevenueHccChainResult;
  em?: { chain: RevenueEmChain; formula: string };
  denials?: { chain: RevenueDenialsChain; formula: string };
  totalValue: number;
}

export function computeRevenueChain(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): RevenueChainResult {
  const available = new Set(pathsAvailableFor(setting));
  const paths = selectedPaths(values).filter((p) => available.has(p));
  const result: RevenueChainResult = { paths, totalValue: 0 };

  if (paths.includes("hcc")) {
    const hcc = computeHccChain(baseline, values);
    result.hcc = hcc;
    result.totalValue += hcc.payoff.value;
  }
  if (paths.includes("em")) {
    const chain = computeEmChain(baseline, setting, values);
    result.em = { chain, formula: emFormula(chain) };
    result.totalValue += chain.value;
  }
  if (paths.includes("denials")) {
    const chain = computeDenialsChain(baseline, setting, values);
    result.denials = { chain, formula: denialsFormula(chain) };
    result.totalValue += chain.value;
  }
  return result;
}

/**
 * Reconciliation helper — the exact `ExploreState` this chain's decisions
 * correspond to, for tests to feed straight into `computeAllDriverValues`
 * and prove the two can never disagree (see attainRevenue.test.ts). Not
 * used by the app itself (the chain functions above already derive their
 * own numbers), only by tests, so it lives here rather than duplicated in
 * the test file.
 */
export function exploreStateForReconciliation(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): ExploreState {
  const chain = computeRevenueChain(baseline, setting, values);
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const state = mkState(setting);
  state.numberOfProviders = providers;

  if (chain.hcc) {
    const plans = buildHccPlans(chain.hcc.scope, chain.hcc.recapture, chain.hcc.netNew, chain.hcc.payoff.valuePerHcc);
    (state.docQualityInputs as any).hccEnabled = true;
    (state.docQualityInputs as any).hccPlans = plans;
    (state.docQualityInputs as any).avgHccs = chain.hcc.recapture.avgHccs;
    (state.docQualityInputs as any).hccRealization = 100;
  }
  if (chain.em) {
    state.annualEncounters = chain.em.chain.eligibleEncounters;
    state.utilizationPercent = 100;
    (state.docQualityInputs as any).wrvuEnabled = true;
    (state.docQualityInputs as any).wrvuScenario = "custom";
    (state.docQualityInputs as any).wrvuCustomPercent = chain.em.chain.liftPct;
    (state.docQualityInputs as any).currentWrvu = chain.em.chain.currentWrvu;
    (state.docQualityInputs as any).conversionFactor = chain.em.chain.conversionFactor;
    (state.docQualityInputs as any).wrvuRealization = 100;
  }
  if (chain.denials) {
    state.annualEncounters = chain.denials.chain.eligibleEncounters;
    state.utilizationPercent = 100;
    (state.docQualityInputs as any).denialsEnabled = true;
    (state.docQualityInputs as any).denialsScenario = "custom";
    (state.docQualityInputs as any).denialsCustomPercent = chain.denials.chain.preventablePct;
    (state.docQualityInputs as any).medNecessityDenialRate = chain.denials.chain.denialRate;
    (state.docQualityInputs as any).avgClaimValue = chain.denials.chain.avgClaimValue;
    (state.docQualityInputs as any).denialsRealization = 100;
  }
  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every revenue "row" this chain surfaces to the generic Commit/Plan
 * bookkeeping (outpatient/ED only — see `REVENUE_IP_LEVERS` in
 * attainLevers.ts for inpatient's own, unrelated catalog). Population/path
 * SCOPE choices (`revenuePaths`, `revenueHccPopulations`) are, like
 * Access's `accessLines`/`accessEnterprise`, UI-only scope state — not
 * separately tracked as their own committable decision. */
export const REVENUE_LEVER_IDS = [
  "revenueHccRecapture",
  "revenueHccNetNew",
  "revenueHccValuePerHcc",
  "revenueEmLift",
  "revenueEmConversionFactor",
  "revenueDenialsPreventable",
  "revenueDenialsAvgClaimValue",
] as const;

/**
 * Adapts the three-path chain into the same `LeverContributionsResult`
 * shape every other goal's `computeLeverContributions` returns. Unlike
 * Access (one dollar attributed to a single binding row), HCC's recapture
 * and net-new rows each carry their OWN exact dollar (see
 * `computeHccPayoff`'s header), and E/M's / Denials' single row each carry
 * their path's whole dollar — every "price" row (value/HCC, conversion
 * factor, avg claim value) carries 0, the same convention Access's own
 * margin-per-visit row already uses, since price is a multiplier shared
 * across a volume, not its own separable dollar.
 */
export function computeRevenueContributions(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): LeverContributionsResult {
  const chain = computeRevenueChain(baseline, setting, values);

  const rows: { id: string; count: number; margin: number; formula: string }[] = [
    {
      id: "revenueHccRecapture",
      count: chain.hcc ? Math.round(chain.hcc.recapture.recapturedHccs) : 0,
      margin: chain.hcc?.payoff.recaptureValue ?? 0,
      formula: chain.hcc?.formulas.recapture ?? NO_MOVE_FORMULA,
    },
    {
      id: "revenueHccNetNew",
      count: chain.hcc ? Math.round(chain.hcc.netNew.netNewHccs) : 0,
      margin: chain.hcc?.payoff.netNewValue ?? 0,
      formula: chain.hcc?.formulas.netNew ?? NO_MOVE_FORMULA,
    },
    {
      id: "revenueHccValuePerHcc",
      count: 0,
      margin: 0,
      formula: chain.hcc ? `$${fmtInt(chain.hcc.payoff.valuePerHcc)} booked per captured HCC, applied to every recaptured and net-new condition above.` : NO_MOVE_FORMULA,
    },
    {
      id: "revenueEmLift",
      count: chain.em ? Math.round(chain.em.chain.wrvusCaptured) : 0,
      margin: chain.em?.chain.value ?? 0,
      formula: chain.em?.formula ?? NO_MOVE_FORMULA,
    },
    {
      id: "revenueEmConversionFactor",
      count: 0,
      margin: 0,
      formula: chain.em ? `$${fmtInt(chain.em.chain.conversionFactor)} booked per captured wRVU, applied to the lift above.` : NO_MOVE_FORMULA,
    },
    {
      id: "revenueDenialsPreventable",
      count: chain.denials ? Math.round(chain.denials.chain.prevented) : 0,
      margin: chain.denials?.chain.value ?? 0,
      formula: chain.denials?.formula ?? NO_MOVE_FORMULA,
    },
    {
      id: "revenueDenialsAvgClaimValue",
      count: 0,
      margin: 0,
      formula: chain.denials ? `$${fmtInt(chain.denials.chain.avgClaimValue)} protected per prevented denial, applied to the rate above.` : NO_MOVE_FORMULA,
    },
  ];

  const marginSum = rows.reduce((sum, r) => sum + Math.max(0, r.margin), 0);
  const perLever: LeverContribution[] = rows.map((r) => ({
    id: r.id,
    marginalMargin: r.margin,
    marginalCount: r.count,
    pctOfTotal: marginSum > 0 ? Math.max(0, r.margin) / marginSum : 0,
    formula: r.formula,
  }));

  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  return { perLever, totalMargin: chain.totalValue, totalCount };
}

// ────────────────────────────────────────────────────────────────────────
// THE SHARED REVENUE LADDER — the converging, multi-path analog of the
// access / retention ladders (accessLadder.tsx).
//
// Access and Retention are ONE lever with ONE gated payoff. Revenue is
// different in SHAPE: it is one lever (complete, specific documentation at
// the point of care) feeding SEVERAL parallel payoffs that then CONVERGE
// into one captured-revenue prize. So the shared model here is a set of
// per-path sub-ladders, each running the same four-beat conversation
// (GROUND the reality -> DIAGNOSE the documentation-caused ceiling Abridge
// can move -> name WHO ACTS -> the number falls out), plus the one converged
// prize that sums them. Build the case assembles it (editable rungs) and
// Planning reads it back (the spine on the hook); both render from this one
// derivation so they can never drift.
//
// Every number reconciles to the engine: each path's `value` is exactly its
// own `computeHccChain`/`computeEmChain`/`computeDenialsChain` payoff (which
// in turn reconcile to `computeAllDriverValues`), scaled once by this
// priority's realization percent so the per-path dollars match Build <->
// Planning and sum to the same converged prize the side panel shows.
// ────────────────────────────────────────────────────────────────────────

export interface RevenuePathLadder {
  id: RevenuePathId;
  label: string;
  /** Beat 1, GROUND: the operational fact that sizes or scopes the path. */
  groundLabel: string;
  groundValue: string;
  groundSet: boolean;
  /** Beat 2, DIAGNOSE: the documentation-caused ceiling Abridge can move,
   * separated from what Abridge cannot touch. The load-bearing rung. */
  ceilingLabel: string;
  ceilingCount: number;
  ceilingUnit: string;
  /** What actually converts out of that ceiling once the plan commits. */
  capturedLabel: string;
  capturedCount: number;
  capturedUnit: string;
  /** Beat 3, WHO ACTS: the partner-owned team that has to move. */
  whoActs: string;
  /** Beat 4, THE NUMBER: the realized dollar and its transparent math. */
  priceLabel: string;
  value: number;
  formula: string;
  hasValue: boolean;
}

export interface RevenueLadderModel {
  paths: RevenuePathLadder[];
  /** The one converged prize: every selected path summed, each an honestly
   * distinct claim pool, never double-counted. */
  convergedPrize: number;
  anyPathSelected: boolean;
}

const REVENUE_PATH_WHO_ACTS: Record<RevenuePathId, string> = {
  hcc: "Risk adjustment / coding team",
  em: "Providers and the coding team",
  denials: "Medical Necessity Denials / billing team",
};

/** Who has to act on the E/M path, worded for the setting: ED names the ED
 * providers explicitly so the owner reads true on the ED plan. */
function emWhoActs(setting: AttainSetting): string {
  return setting === "ed" ? "ED providers and the coding team" : REVENUE_PATH_WHO_ACTS.em;
}

/**
 * Derives the shared, converging revenue ladder. `realizationPct` scales
 * every path's dollar (and the converged prize) exactly once, the same way
 * `applyRealization` scales the engine result the side panel reads, so Build
 * the case (which passes its own live slider) and Planning (which passes the
 * factor implied by the combined engine result) show identical per-path
 * dollars and the same converged prize.
 */
export function deriveRevenueLadder(
  baseline: AttainBaseline,
  setting: AttainSetting,
  values: LeverValues,
  realizationPct = 100,
): RevenueLadderModel {
  const chain = computeRevenueChain(baseline, setting, values);
  const paths: RevenuePathLadder[] = [];

  if (chain.hcc) {
    const { scope, recapture, netNew, payoff } = chain.hcc;
    const gapConditions = recapture.gapPatients * recapture.avgHccs;
    const capturedConditions = recapture.recapturedHccs + netNew.netNewHccs;
    const value = Math.round(realizedValue(payoff.value, realizationPct));
    paths.push({
      id: "hcc",
      label: REVENUE_PATH_LABELS.hcc,
      groundLabel: "Risk-based patients in scope",
      groundValue: scope.totalPatients > 0 ? `${fmtInt(scope.totalPatients)} patients` : "Not set yet",
      groundSet: scope.totalPatients > 0,
      ceilingLabel: "Conditions your patients have that never reach the claim",
      ceilingCount: gapConditions,
      ceilingUnit: "conditions / yr",
      capturedLabel: "Conditions captured back onto the claim",
      capturedCount: capturedConditions,
      capturedUnit: "conditions / yr",
      whoActs: REVENUE_PATH_WHO_ACTS.hcc,
      priceLabel: `$${fmtInt(payoff.valuePerHcc)} / condition`,
      value,
      formula: value > 0 ? formulaWithRealization(chain.hcc.formulas.payoff, realizationPct, value) : chain.hcc.formulas.payoff,
      hasValue: value > 0,
    });
  }

  if (chain.em) {
    const c = chain.em.chain;
    const isED = setting === "ed";
    const value = Math.round(realizedValue(c.value, realizationPct));
    paths.push({
      id: "em",
      label: REVENUE_PATH_LABELS.em,
      groundLabel: isED ? "ED visits that carry an E/M level" : "Office / E&M visits in scope",
      groundValue: c.eligibleEncounters > 0 ? `${fmtInt(c.eligibleEncounters)} visits / yr` : "Not set yet",
      groundSet: c.eligibleEncounters > 0,
      ceilingLabel: isED
        ? "Claims going out below the acuity delivered, because the note fell short"
        : "Claims going out below the care delivered, because the note fell short",
      ceilingCount: c.docCausedVisits,
      ceilingUnit: "claims / yr",
      capturedLabel: isED ? "Claims corrected to the acuity you delivered" : "Claims corrected to the level you supported",
      capturedCount: c.correctedVisits,
      capturedUnit: "claims / yr",
      whoActs: emWhoActs(setting),
      priceLabel: `${c.wrvuGain} wRVU × $${fmtInt(c.conversionFactor)} / wRVU`,
      value,
      formula: value > 0 ? formulaWithRealization(chain.em.formula, realizationPct, value) : chain.em.formula,
      hasValue: value > 0,
    });
  }

  if (chain.denials) {
    const c = chain.denials.chain;
    const isED = setting === "ed";
    const value = Math.round(realizedValue(c.value, realizationPct));
    paths.push({
      id: "denials",
      label: REVENUE_PATH_LABELS.denials,
      groundLabel: isED ? "ED medical-necessity denials a year" : "Medical-necessity denials a year",
      groundValue: c.deniedEncounters > 0 ? `${fmtInt(c.deniedEncounters)} denials / yr` : "Not set yet",
      groundSet: c.deniedEncounters > 0,
      ceilingLabel: "Denials a complete note can reduce, not payer rules or authorization",
      ceilingCount: c.deniedEncounters,
      ceilingUnit: "denials / yr",
      capturedLabel: "Denials prevented with complete documentation",
      capturedCount: c.prevented,
      capturedUnit: "denials / yr",
      whoActs: REVENUE_PATH_WHO_ACTS.denials,
      priceLabel: `$${fmtInt(c.avgClaimValue)} / claim`,
      value,
      formula: value > 0 ? formulaWithRealization(chain.denials.formula, realizationPct, value) : chain.denials.formula,
      hasValue: value > 0,
    });
  }

  const convergedPrize = paths.reduce((sum, p) => sum + p.value, 0);
  return { paths, convergedPrize, anyPathSelected: chain.paths.length > 0 };
}
