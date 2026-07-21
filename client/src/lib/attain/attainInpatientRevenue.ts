import type { AttainBaseline, LeverContribution, LeverContributionsResult, LeverValues } from "./attainLevers";
import { computeAllDriverValues, computeAllDriverCalcSummaries } from "@/lib/exploreDriverCalcs";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

/**
 * Attain — INPATIENT REVENUE decision chain engine.
 *
 * Inpatient revenue runs on a DIFFERENT mechanism than outpatient/ED revenue
 * (`attainRevenue.ts`): inpatient reimbursement is DRG-weight / case-mix
 * based (one bundled payment per admission, driven by the highest-acuity
 * diagnosis set that documentation supports), not visit-level E/M coding.
 * There is no wRVU, no HCC panel, no per-visit conversion factor here — the
 * whole mechanism is "did the documentation carry enough specificity for
 * coding to assign the DRG (and CC/MCC) the admission actually earned."
 *
 * Like outpatient/ED revenue, this is not one mechanism, it is THREE
 * genuinely distinct paths a partner chooses among (one or more):
 *
 *   1. Case Mix / DRG Accuracy (CC/MCC capture) — a comorbidity or
 *      complication that IS being managed but is under-specified in the
 *      note gets the admission grouped at a lower DRG weight than it
 *      earned. Priced as at-risk admissions × capture improvement × the
 *      DRG weight lift × the base payment per case — the exact
 *      `ipDrg` formula in `exploreDriverCalcs.ts`. UNIT NOTE: the capture
 *      improvement (`ipDrgCapture`) is a % SHARE OF THE AT-RISK SUBSET newly
 *      captured, not a percentage-point move on the hospital's overall
 *      CC/MCC capture rate (62% → 72% in the industry-benchmark sense) - see
 *      `ipDrgCountFormula`'s wording and `IpDrgChain`'s own comment below.
 *      All three paths below now display this share consistently as "%",
 *      matching CDI's and Obs's own units (previously DRG alone showed
 *      "pp", which read as a headline-capture-rate point move it is not).
 *   2. CDI Query Efficiency — the real Abridge lever here is FEWER QUERIES
 *      NEEDED in the first place: a complete ambient note carries the
 *      specificity a physician query would otherwise have to chase, so CDI
 *      staff spend less time generating and following up queries at all.
 *      This is query-VOLUME reduction / CDI-staff efficiency, not "closing
 *      a query before discharge faster" - a query that still gets generated
 *      and later closed still cost the CDI team the time to generate and
 *      chase it. Priced as queries generated × the volume-reduction rate
 *      this plan targets × the ADMINISTRATIVE cost avoided per query no
 *      longer needed — the exact `ipCdi` formula. DOUBLE-COUNT GUARD: the
 *      cost-per-query price here is admin/CDI-staff time ONLY and must
 *      EXCLUDE the DRG reimbursement itself - that dollar is already booked
 *      in path 1 above whenever DRG is also selected. `computeIpCdiChain`
 *      clamps the price to `MAX_IP_CDI_COST_PER_QUERY` for exactly this
 *      reason (see that constant's own comment), and the UI shows an
 *      explicit note whenever both DRG and CDI are chosen together.
 *   3. Observation / IP Status Defense — a status downgrade driven by
 *      under-specified severity-of-illness documentation is a genuinely
 *      separate claim from a DRG-weight gap: it is the whole admission
 *      moving from inpatient to observation, not a lower weight within the
 *      same claim type. Priced as downgrades × the preventable share ×
 *      the revenue delta per case — the exact `ipObsDefense` formula.
 *
 * Same discipline as every other bespoke chain (Access/Revenue-outpatient/
 * Workforce/Quality/ED-access): each path's own decisions are gated in
 * order (the baseline rate is descriptive context, the improvement/
 * reduction/preventable-share decision is the real gate at realityStart 0,
 * price multiplies in last), so a dollar figure never appears before the
 * decisions behind it are real. The three paths are NOT jointly dependent
 * on each other (a captured DRG weight, an avoided query, and a defended
 * IP stay are three different claims), so their dollar contributions are
 * computed independently and simply SUMMED. DRG and CDI price the SAME
 * underlying documentation-completeness improvement from two different
 * angles (the weight it earns vs the admin time it saves chasing the
 * query), which is exactly why the double-count guard above exists - see
 * `MAX_IP_CDI_COST_PER_QUERY`. DRG and Obs also draw from the same eligible-
 * admissions pool but are genuinely different CLAIM EVENTS (a weight change
 * vs a status change on possibly the same admission), which is why they
 * simply sum with no such guard needed.
 *
 * SCOPE: this module only ever runs for setting === "inpatient". Outpatient
 * and ED revenue keep their own three-path chain in `attainRevenue.ts`,
 * untouched — see that module's header and `leversFor`/
 * `computeLeverContributions`'s dispatch in `attainLevers.ts`.
 *
 * Reconciliation: every path's engine value is read straight off
 * `computeAllDriverValues` (`drgAccuracy`, `cdiQueryReduction`,
 * `obsDefense`), fed a synthesized `ExploreState` built from this chain's
 * own decisions plus the partner's Starting-point baseline — never a
 * second, hand-rolled formula that could drift from the Explore engine.
 * All three paths' `*Realization` fields are fixed at 100% here (not
 * exposed as a partner decision), same convention `attainRevenue.ts` and
 * `attainEdAccess.ts` use: the realization knob models a haircut
 * (RAC/PEPPER audit adjustment, bed availability, payer mix) that is the
 * same kind of honesty-cap this chain's own gated decisions already are, so
 * folding it in on top would double-discount the same risk.
 */

// ────────────────────────────────────────────────────────────────────────
// Shared local helpers (deliberately not imported from attainRevenue.ts /
// attainLevers.ts, to keep this chain a self-contained, independently
// reasoned-about module — same convention every other chain module uses).
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

/** Real admissions-per-hospitalist from the partner's own Scope baseline, or
 * the inpatient-specific illustrative fallback (matches `defaultBaseline("inpatient")`
 * in attainLevers.ts: 400 admissions/hospitalist/yr) while the baseline is
 * still empty. */
function perProviderEncounters(baseline: AttainBaseline, fallback = 400): number {
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  return providers > 0 && encounters > 0 ? encounters / providers : fallback;
}

function utilizationFraction(baseline: AttainBaseline, fallbackPct = 100): number {
  const pct = baseline.utilizationPct ?? fallbackPct;
  return Math.min(1, Math.max(0, pct / 100));
}

/** Eligible admissions in scope, shared by all three paths since they all
 * price the same inpatient population — hospitalists × admissions/
 * hospitalist × utilization, straight off the partner's own baseline. */
function eligibleAdmissions(baseline: AttainBaseline): number {
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const perUnit = perProviderEncounters(baseline);
  const util = utilizationFraction(baseline);
  return Math.round(providers * perUnit * util);
}

function mkState(): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "inpatient",
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

const NO_MOVE_FORMULA = "Move this decision above reality to see the math.";

// ────────────────────────────────────────────────────────────────────────
// Path identity — the three choices on the path chooser.
// ────────────────────────────────────────────────────────────────────────

export const IP_REVENUE_PATH_LABELS = {
  drg: "Case Mix / DRG Accuracy",
  cdi: "CDI Query Efficiency",
  obs: "Observation / IP Status Defense",
} as const;

export type IpRevenuePathId = keyof typeof IP_REVENUE_PATH_LABELS;

export const IP_REVENUE_PATH_IDS: IpRevenuePathId[] = ["drg", "cdi", "obs"];

export function selectedIpRevenuePaths(values: LeverValues): IpRevenuePathId[] {
  const raw = asLines(values.ipRevenuePaths);
  return IP_REVENUE_PATH_IDS.filter((id) => raw.includes(IP_REVENUE_PATH_LABELS[id]));
}

// ────────────────────────────────────────────────────────────────────────
// PATH 1 — Case Mix / DRG Accuracy (CC/MCC capture)
// ────────────────────────────────────────────────────────────────────────

/** Benchmark at-risk rate, matching the live engine's own default
 * (`DEFAULT_EXPLORE_STATE.docQualityInputs.ipDrgAtRiskRate`). */
export const DEFAULT_IP_DRG_AT_RISK_RATE = 18;
/** Benchmark average DRG weight lift per captured case, matching the live
 * engine's own default (`ipDrgWeightIncrease`). */
export const DEFAULT_IP_DRG_WEIGHT_INCREASE = 0.3;
/** Benchmark base DRG payment per case, matching the live engine's own
 * default (`ipDrgBasePayment`). */
export const DEFAULT_IP_DRG_BASE_PAYMENT = 6_000;

export interface IpDrgChain {
  eligibleEncounters: number;
  atRiskRate: number;
  atRisk: number;
  /** The gate — the SHARE OF THE AT-RISK SUBSET (`atRisk`, not the full
   * eligible-admissions pool) this plan commits to newly capturing,
   * realityStart 0. Doing nothing new captures nothing. UNIT NOTE: this is
   * a plain "%" of the at-risk pool, e.g. "10% of at-risk admissions newly
   * captured" - it is NOT a percentage-point move on the hospital's overall
   * CC/MCC capture rate (the 62% → 72% industry-benchmark framing the
   * narrative content cites is a different, broader metric describing
   * today's state, not what this slider directly moves). Displayed as "%"
   * everywhere (D2 slider, THE MATH, Commit), matching CDI's and Obs's own
   * unit, not "pp". */
  capturePct: number;
  capturedCases: number;
  weightIncrease: number;
  basePayment: number;
  /** The first (and only) dollar figure this path produces. */
  value: number;
}

/** `atRiskRate` is real, editable, descriptive context (today's fact,
 * defaults to the engine benchmark); `capturePct` is the genuine decision
 * (realityStart 0, no default masking it); `weightIncrease`/`basePayment`
 * are price, multiplied in last. Reconciles exactly to `exploreDriverCalcs.ts`'s
 * `ipDrg` block: atRisk × pct × weightIncrease × basePayment. */
export function computeIpDrgChain(baseline: AttainBaseline, values: LeverValues): IpDrgChain {
  const eligibleEncounters = eligibleAdmissions(baseline);

  const atRiskRateRaw = asNum(values.ipDrgAtRiskRate);
  const atRiskRate = atRiskRateRaw > 0 ? clampPct(atRiskRateRaw) : DEFAULT_IP_DRG_AT_RISK_RATE;
  const atRisk = eligibleEncounters * (atRiskRate / 100);

  const capturePct = clampPct(Math.max(0, asNum(values.ipDrgCapture)));
  const capturedCases = atRisk * (capturePct / 100);

  const weightIncreaseRaw = asNum(values.ipDrgWeightIncrease);
  const weightIncrease = weightIncreaseRaw > 0 ? weightIncreaseRaw : DEFAULT_IP_DRG_WEIGHT_INCREASE;

  const basePaymentRaw = asNum(values.ipDrgBasePayment);
  const basePayment = basePaymentRaw > 0 ? basePaymentRaw : DEFAULT_IP_DRG_BASE_PAYMENT;

  const value = Math.round(capturedCases * weightIncrease * basePayment);

  return { eligibleEncounters, atRiskRate, atRisk, capturePct, capturedCases, weightIncrease, basePayment, value };
}

/** D2's count-only derivation (no price yet) - mirrors the outpatient
 * chain's discipline of deriving a count before any dollar exists. */
export function ipDrgCountFormula(chain: IpDrgChain): string {
  if (chain.capturedCases <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.atRisk)} at-risk admissions × ${fmtInt(chain.capturePct)}% of the at-risk pool newly captured = ${fmtInt(chain.capturedCases)} additional captured cases.`;
}

/** The payoff formula - the first (and only) place a dollar appears in this
 * path, reconciling exactly to Explore's `drgAccuracy` driver. */
export function ipDrgPayoffFormula(chain: IpDrgChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.capturedCases)} captured cases × ${chain.weightIncrease} avg DRG weight increase × $${fmtInt(chain.basePayment)}/case = ~${fmtMoneyCompact(chain.value)}.`;
}

// ────────────────────────────────────────────────────────────────────────
// PATH 2 — CDI Query Efficiency
// ────────────────────────────────────────────────────────────────────────

/** Benchmark query rate, matching the live engine's own default
 * (`ipCdiQueryRate`). */
export const DEFAULT_IP_CDI_QUERY_RATE = 30;
/** Benchmark administrative cost avoided per query no longer needed,
 * matching the live engine's own default (`ipCdiCostPerQuery`). */
export const DEFAULT_IP_CDI_COST_PER_QUERY = 50;
/** DOUBLE-COUNT GUARD (I3, premium audit): this price is CDI-staff/admin
 * time only (generating, tracking, and following up a query) - it must
 * EXCLUDE the DRG reimbursement the closed query may go on to earn, because
 * that dollar is already booked whole in path 1's DRG chain above whenever
 * DRG is also selected. A real admin-cost-per-query benchmark is well under
 * $200 (specialist review time, not a claim payment); this ceiling makes
 * the double-count structurally hard to create by accident rather than
 * relying on the $50 default alone to keep a partner from re-pricing a
 * query at DRG-reimbursement-sized dollars ($400-500+). See the UI's own
 * explicit note when both DRG and CDI are chosen together
 * (`InpatientRevenueDecisionChain.tsx`). */
export const MAX_IP_CDI_COST_PER_QUERY = 200;

export interface IpCdiChain {
  eligibleEncounters: number;
  queryRate: number;
  queries: number;
  /** The gate — the QUERY-VOLUME REDUCTION this plan commits to: the share
   * of today's queries that never need to be generated in the first place
   * because the ambient note already carries the specificity a query would
   * otherwise chase, above today's zero. */
  reductionPct: number;
  /** Queries no longer needed - avoided at the source, not "closed faster
   * before discharge" (a query that still gets generated still costs CDI
   * staff time to chase and answer, whether or not it closes in time). */
  avoided: number;
  /** Administrative cost avoided per query no longer needed - CDI-staff
   * time only. Clamped to `MAX_IP_CDI_COST_PER_QUERY`; see that constant's
   * comment for the double-count guard this enforces against the DRG
   * path's reimbursement dollar. */
  costPerQuery: number;
  value: number;
}

/** `queryRate` is descriptive context; `reductionPct` is the genuine
 * decision (realityStart 0); `costPerQuery` is admin-cost price, clamped to
 * `MAX_IP_CDI_COST_PER_QUERY` (double-count guard, see that constant's
 * comment). Reconciles exactly to `exploreDriverCalcs.ts`'s `ipCdi` block:
 * queries × pct × costPerQuery. */
export function computeIpCdiChain(baseline: AttainBaseline, values: LeverValues): IpCdiChain {
  const eligibleEncounters = eligibleAdmissions(baseline);

  const queryRateRaw = asNum(values.ipCdiQueryRate);
  const queryRate = queryRateRaw > 0 ? clampPct(queryRateRaw) : DEFAULT_IP_CDI_QUERY_RATE;
  const queries = eligibleEncounters * (queryRate / 100);

  const reductionPct = clampPct(Math.max(0, asNum(values.ipCdiReduction)));
  const avoided = queries * (reductionPct / 100);

  const costPerQueryRaw = asNum(values.ipCdiCostPerQuery);
  const costPerQuery = Math.min(
    MAX_IP_CDI_COST_PER_QUERY,
    costPerQueryRaw > 0 ? costPerQueryRaw : DEFAULT_IP_CDI_COST_PER_QUERY,
  );

  const value = Math.round(avoided * costPerQuery);

  return { eligibleEncounters, queryRate, queries, reductionPct, avoided, costPerQuery, value };
}

export function ipCdiCountFormula(chain: IpCdiChain): string {
  if (chain.avoided <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.queries)} CDI queries generated today × ${fmtInt(chain.reductionPct)}% fewer needed = ${fmtInt(chain.avoided)} queries avoided.`;
}

export function ipCdiPayoffFormula(chain: IpCdiChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.avoided)} queries avoided × $${fmtInt(chain.costPerQuery)}/query admin cost = ~${fmtMoneyCompact(chain.value)}.`;
}

// ────────────────────────────────────────────────────────────────────────
// PATH 3 — Observation / IP Status Defense
// ────────────────────────────────────────────────────────────────────────

/** Benchmark observation downgrade/denial rate, matching the live engine's
 * own default (`ipObsDefenseDenialRate`). */
export const DEFAULT_IP_OBS_DENIAL_RATE = 5;
/** Benchmark revenue delta per defended case, matching the live engine's own
 * default (`ipObsDefenseRevenueDelta`). */
export const DEFAULT_IP_OBS_REVENUE_DELTA = 5_000;

export interface IpObsChain {
  eligibleEncounters: number;
  denialRate: number;
  downgrades: number;
  /** The gate — the preventable share this plan commits to, above today's
   * zero. */
  preventablePct: number;
  preventable: number;
  revenueDelta: number;
  value: number;
}

/** `denialRate` is descriptive context; `preventablePct` is the genuine
 * decision (realityStart 0); `revenueDelta` is price. Reconciles exactly to
 * `exploreDriverCalcs.ts`'s `ipObsDefense` block: downgrades ×
 * revenueDelta × preventable. */
export function computeIpObsChain(baseline: AttainBaseline, values: LeverValues): IpObsChain {
  const eligibleEncounters = eligibleAdmissions(baseline);

  const denialRateRaw = asNum(values.ipObsDenialRate);
  const denialRate = denialRateRaw > 0 ? clampPct(denialRateRaw) : DEFAULT_IP_OBS_DENIAL_RATE;
  const downgrades = eligibleEncounters * (denialRate / 100);

  const preventablePct = clampPct(Math.max(0, asNum(values.ipObsPreventable)));
  const preventable = downgrades * (preventablePct / 100);

  const revenueDeltaRaw = asNum(values.ipObsRevenueDelta);
  const revenueDelta = revenueDeltaRaw > 0 ? revenueDeltaRaw : DEFAULT_IP_OBS_REVENUE_DELTA;

  const value = Math.round(preventable * revenueDelta);

  return { eligibleEncounters, denialRate, downgrades, preventablePct, preventable, revenueDelta, value };
}

export function ipObsCountFormula(chain: IpObsChain): string {
  if (chain.preventable <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.downgrades)} observation downgrades × ${fmtInt(chain.preventablePct)}% preventable = ${fmtInt(chain.preventable)} defended cases.`;
}

export function ipObsPayoffFormula(chain: IpObsChain): string {
  if (chain.value <= 0) return NO_MOVE_FORMULA;
  return `${fmtInt(chain.preventable)} defended cases × $${fmtInt(chain.revenueDelta)}/case delta = ~${fmtMoneyCompact(chain.value)}.`;
}

// ────────────────────────────────────────────────────────────────────────
// Orchestrator — the three paths, gated by selection, summed.
// ────────────────────────────────────────────────────────────────────────

export interface IpRevenueChainResult {
  paths: IpRevenuePathId[];
  drg?: { chain: IpDrgChain; countFormula: string; payoffFormula: string };
  cdi?: { chain: IpCdiChain; countFormula: string; payoffFormula: string };
  obs?: { chain: IpObsChain; countFormula: string; payoffFormula: string };
  totalValue: number;
}

export function computeIpRevenueChain(baseline: AttainBaseline, values: LeverValues): IpRevenueChainResult {
  const paths = selectedIpRevenuePaths(values);
  const result: IpRevenueChainResult = { paths, totalValue: 0 };

  if (paths.includes("drg")) {
    const chain = computeIpDrgChain(baseline, values);
    result.drg = { chain, countFormula: ipDrgCountFormula(chain), payoffFormula: ipDrgPayoffFormula(chain) };
    result.totalValue += chain.value;
  }
  if (paths.includes("cdi")) {
    const chain = computeIpCdiChain(baseline, values);
    result.cdi = { chain, countFormula: ipCdiCountFormula(chain), payoffFormula: ipCdiPayoffFormula(chain) };
    result.totalValue += chain.value;
  }
  if (paths.includes("obs")) {
    const chain = computeIpObsChain(baseline, values);
    result.obs = { chain, countFormula: ipObsCountFormula(chain), payoffFormula: ipObsPayoffFormula(chain) };
    result.totalValue += chain.value;
  }
  return result;
}

/**
 * Reconciliation helper — the exact `ExploreState` this chain's decisions
 * correspond to, for tests to feed straight into `computeAllDriverValues`
 * and prove the two can never disagree (see attainInpatientRevenue.test.ts).
 * Not used by the app itself, same convention `attainRevenue.ts` /
 * `attainEdAccess.ts` use.
 */
export function exploreStateForIpRevenueReconciliation(baseline: AttainBaseline, values: LeverValues): ExploreState {
  const chain = computeIpRevenueChain(baseline, values);
  const providers = Math.max(0, Math.round(baseline.providers ?? 0));
  const state = mkState();
  state.numberOfProviders = providers;
  state.annualEncounters = eligibleAdmissions(baseline);
  state.utilizationPercent = 100; // eligibleAdmissions already applied utilization

  const dq = state.docQualityInputs as any;

  if (chain.drg) {
    dq.ipDrgEnabled = true;
    dq.ipDrgScenario = "custom";
    dq.ipDrgCustomPercent = chain.drg.chain.capturePct;
    dq.ipDrgAtRiskRate = chain.drg.chain.atRiskRate;
    dq.ipDrgWeightIncrease = chain.drg.chain.weightIncrease;
    dq.ipDrgBasePayment = chain.drg.chain.basePayment;
    dq.ipDrgRealization = 100; // this chain has no realization knob - see module header
  }
  if (chain.cdi) {
    dq.ipCdiEnabled = true;
    dq.ipCdiScenario = "custom";
    dq.ipCdiCustomPercent = chain.cdi.chain.reductionPct;
    dq.ipCdiQueryRate = chain.cdi.chain.queryRate;
    dq.ipCdiCostPerQuery = chain.cdi.chain.costPerQuery;
    dq.ipCdiRealization = 100; // ditto
  }
  if (chain.obs) {
    dq.ipObsDefenseEnabled = true;
    dq.ipObsDefensePreventableScenario = "custom";
    dq.ipObsDefenseCustomPercent = chain.obs.chain.preventablePct;
    dq.ipObsDefenseDenialRate = chain.obs.chain.denialRate;
    dq.ipObsDefenseRevenueDelta = chain.obs.chain.revenueDelta;
    dq.ipObsDefenseRealization = 100; // ditto
  }

  return state;
}

export { computeAllDriverValues, computeAllDriverCalcSummaries };

// ────────────────────────────────────────────────────────────────────────
// Compatibility adapter — LeverContributionsResult shape
// ────────────────────────────────────────────────────────────────────────

/** Every inpatient-revenue "row" this chain surfaces to the generic Commit/
 * Plan bookkeeping. Kept in sync with `IP_REVENUE_LEVERS` in
 * attainLevers.ts — each id here must match an `IP_REVENUE_LEVERS[].id`.
 * Path SCOPE choice (`ipRevenuePaths`) is, like outpatient revenue's
 * `revenuePaths`, UI-only scope state — not separately tracked as its own
 * committable decision. */
export const IP_REVENUE_LEVER_IDS = [
  "ipDrgAtRiskRate",
  "ipDrgCapture",
  "ipDrgWeightIncrease",
  "ipDrgBasePayment",
  "ipCdiQueryRate",
  "ipCdiReduction",
  "ipCdiCostPerQuery",
  "ipObsDenialRate",
  "ipObsPreventable",
  "ipObsRevenueDelta",
] as const;

/**
 * Adapts the three-path chain into the same `LeverContributionsResult` shape
 * every other goal's `computeLeverContributions` returns. Each path's own
 * gate decision (`ipDrgCapture`/`ipCdiReduction`/`ipObsPreventable`) carries
 * that path's WHOLE dollar - the three never blend into one row, since they
 * are genuinely separate claims. Every descriptive/price row (at-risk rate,
 * weight increase, base payment, query rate, cost per query, denial rate,
 * revenue delta) carries `marginalMargin: 0`, the same "structural
 * bookkeeping row" convention `attainEdAccess.ts`'s D1-D3 context rows and
 * `attainRevenue.ts`'s price rows already use - a benchmark or scope fact
 * is not itself a separable dollar.
 */
export function computeIpRevenueContributions(baseline: AttainBaseline, values: LeverValues): LeverContributionsResult {
  const chain = computeIpRevenueChain(baseline, values);

  const rows: { id: string; count: number; margin: number; formula: string }[] = [
    {
      id: "ipDrgAtRiskRate",
      count: chain.drg ? Math.round(chain.drg.chain.atRisk) : 0,
      margin: 0,
      formula: chain.drg?.countFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipDrgCapture",
      count: chain.drg ? Math.round(chain.drg.chain.capturedCases) : 0,
      margin: chain.drg?.chain.value ?? 0,
      formula: chain.drg?.payoffFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipDrgWeightIncrease",
      count: 0,
      margin: 0,
      formula: chain.drg ? `${chain.drg.chain.weightIncrease} avg DRG weight increase, applied to every captured case above.` : NO_MOVE_FORMULA,
    },
    {
      id: "ipDrgBasePayment",
      count: 0,
      margin: 0,
      formula: chain.drg ? `$${fmtInt(chain.drg.chain.basePayment)} base DRG payment per case, applied to the weight lift above.` : NO_MOVE_FORMULA,
    },
    {
      id: "ipCdiQueryRate",
      count: chain.cdi ? Math.round(chain.cdi.chain.queries) : 0,
      margin: 0,
      formula: chain.cdi?.countFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipCdiReduction",
      count: chain.cdi ? Math.round(chain.cdi.chain.avoided) : 0,
      margin: chain.cdi?.chain.value ?? 0,
      formula: chain.cdi?.payoffFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipCdiCostPerQuery",
      count: 0,
      margin: 0,
      formula: chain.cdi ? `$${fmtInt(chain.cdi.chain.costPerQuery)} admin cost avoided per query no longer needed, applied to the queries avoided above.` : NO_MOVE_FORMULA,
    },
    {
      id: "ipObsDenialRate",
      count: chain.obs ? Math.round(chain.obs.chain.downgrades) : 0,
      margin: 0,
      formula: chain.obs?.countFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipObsPreventable",
      count: chain.obs ? Math.round(chain.obs.chain.preventable) : 0,
      margin: chain.obs?.chain.value ?? 0,
      formula: chain.obs?.payoffFormula ?? NO_MOVE_FORMULA,
    },
    {
      id: "ipObsRevenueDelta",
      count: 0,
      margin: 0,
      formula: chain.obs ? `$${fmtInt(chain.obs.chain.revenueDelta)} revenue delta per defended case, applied to the prevented downgrades above.` : NO_MOVE_FORMULA,
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
