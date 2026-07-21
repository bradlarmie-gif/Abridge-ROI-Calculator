import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
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

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

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

export interface RevenueEmChain {
  currentWrvu: number;
  liftPct: number;
  conversionFactor: number;
  eligibleEncounters: number;
  wrvusCaptured: number;
  value: number;
}

/**
 * D1-D3 + payoff, all in one function since E/M has no separate "scope"
 * step (its scope IS the Starting-point baseline's providers/encounters).
 * `liftPct` is the gate (realityStart 0); `currentWrvu` and
 * `conversionFactor` are real, editable, but not themselves gating (same
 * "descriptive default" convention as the HCC path and Access's D2).
 */
export function computeEmChain(baseline: AttainBaseline, setting: AttainSetting, values: LeverValues): RevenueEmChain {
  const isED = setting === "ed";
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const perUnit = perProviderEncounters(baseline, isED ? 1_800 : 3_500);
  const util = utilizationFraction(baseline);
  const eligibleEncounters = Math.round(providers * perUnit * util);

  const currentWrvuRaw = asNum(values.revenueEmCurrentWrvu);
  const currentWrvu = currentWrvuRaw > 0 ? currentWrvuRaw : DEFAULT_CURRENT_WRVU;
  const liftPct = Math.max(0, asNum(values.revenueEmLift));
  const conversionFactorRaw = asNum(values.revenueEmConversionFactor);
  const conversionFactor = conversionFactorRaw > 0 ? conversionFactorRaw : DEFAULT_CONVERSION_FACTOR;

  const lift = (currentWrvu * liftPct) / 100;
  const wrvusCaptured = eligibleEncounters * lift;
  const value = Math.round(wrvusCaptured * conversionFactor);

  return { currentWrvu, liftPct, conversionFactor, eligibleEncounters, wrvusCaptured, value };
}

/** D2's count-only derivation (no price yet) - "how many extra wRVUs this
 * lift captures", mirroring Access's D3/D4 discipline of deriving a count
 * before any dollar exists. */
export function emCountFormula(chain: RevenueEmChain): string {
  if (chain.wrvusCaptured <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.eligibleEncounters)} eligible encounters × ${chain.currentWrvu} current wRVU × ${fmtInt(chain.liftPct)}% lift = ${Math.round(chain.wrvusCaptured).toLocaleString()} extra wRVUs captured.`;
}

/** The payoff formula - the first (and only) place a dollar appears in
 * this path, reconciling exactly to Explore's `wrvu`/`edEmLevel` driver:
 * current wRVU × lift × conversion factor × eligible encounters. */
export function emFormula(chain: RevenueEmChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.eligibleEncounters)} eligible encounters × ${chain.currentWrvu} current wRVU × ${fmtInt(chain.liftPct)}% lift × $${fmtInt(chain.conversionFactor)}/wRVU = ~${fmtMoneyCompact(chain.value)}.`;
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
