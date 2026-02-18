// ============================================================================
// COMPUTE PILLARS — Conservative 4-Pillar ROI Model
// Converts raw assessment inputs into defensible annual value estimates.
// Each pillar applies guardrails: confidence haircuts, hard caps, and
// realization rates so the output is presentation-ready.
// ============================================================================

import type { AssessmentState } from "@/lib/assessment";
import type { SpecialtyMix, DeployIntentOption } from "@/lib/switchGapCalculator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PillarId = "capacity" | "yield" | "workforce" | "risk";

export type Confidence = "high" | "medium" | "low";

export interface PillarDetail {
  valueAnnual: number;
  score0to100: number;
  topBlockerKey: string;
  details: Record<string, number | string>;
}

export interface PillarResult {
  pillars: Record<PillarId, PillarDetail>;
  totalAnnual: number;
  total3yr: number;
  monthlyOpportunity: number;
}

// Re-export SpecialtyMix so consumers can import from one place
export type { SpecialtyMix };

// ---------------------------------------------------------------------------
// Confidence haircut — scales pillar values by data quality
// high = full credit, medium = 70%, low = 40%
// ---------------------------------------------------------------------------

const CONFIDENCE_MULTIPLIER: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

function haircut(value: number, confidence: Confidence): number {
  return Math.round(value * CONFIDENCE_MULTIPLIER[confidence]);
}

// ---------------------------------------------------------------------------
// Specialty-based defaults
// These drive visit duration, contribution per visit, and revenue per encounter.
// ---------------------------------------------------------------------------

interface SpecialtyDefaults {
  visitMinutes: number;
  contributionPerVisit: number;
  revenuePerEncounter: number;
}

const SPECIALTY_DEFAULTS: Record<SpecialtyMix, SpecialtyDefaults> = {
  "primary-care": {
    visitMinutes: 20,        // typical PCP visit length
    contributionPerVisit: 180, // lower per-visit but high volume
    revenuePerEncounter: 175,
  },
  balanced: {
    visitMinutes: 25,
    contributionPerVisit: 220,
    revenuePerEncounter: 225,
  },
  specialty: {
    visitMinutes: 30,        // longer specialty visits
    contributionPerVisit: 300, // higher-value procedures/consults
    revenuePerEncounter: 325,
  },
};

// ---------------------------------------------------------------------------
// Deploy-factor presets — what fraction of saved time turns into capacity
// "protect time" = providers keep the time (wellbeing focus)
// "grow visits"  = organization captures time as new appointments
// default        = blended assumption
// ---------------------------------------------------------------------------

type DeployIntent = "protect" | "grow" | "default";

const DEPLOY_FACTOR: Record<DeployIntent, number> = {
  protect: 0.10,  // minimal conversion — time stays with provider
  default: 0.15,  // conservative blended
  grow: 0.25,     // aggressive — most time becomes new slots
};

const INTENT_TO_DEPLOY: Record<DeployIntentOption, DeployIntent> = {
  "reduce-backlog": "grow",
  "grow-visits": "grow",
  "protect-time": "protect",
  "not-sure": "default",
};

// ---------------------------------------------------------------------------
// Infer confidence from how much data the user provided
// More filled-in fields ⇒ higher confidence
// ---------------------------------------------------------------------------

function inferConfidence(inputs: AssessmentState["inputs"]): Confidence {
  let filled = 0;
  if (inputs.utilization > 0) filled++;
  if (inputs.timeSavedPerEncounter > 0) filled++;
  if (inputs.docCompleteness > 0) filled++;
  if (inputs.wrvuLift > 0) filled++;
  if (inputs.satisfaction > 0) filled++;
  if (inputs.afterHoursPerWeek > 0) filled++;

  // 5-6 fields filled → high, 3-4 → medium, 0-2 → low
  if (filled >= 5) return "high";
  if (filled >= 3) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Derive maturity stage (1-4) from realization score, matching switchGapCalc
// ---------------------------------------------------------------------------

function deriveMaturityStage(inputs: AssessmentState["inputs"]): number {
  const benchUtil = 76;
  const benchNet = 3.5;
  const benchDoc = 80;
  const benchWrvu = 5.5;
  const benchSat = 85;
  const benchAfter = 2;

  const uScore = Math.min(100, Math.round((inputs.utilization / benchUtil) * 100));
  const net = inputs.timeSavedPerEncounter - (inputs.editTimePerEncounter || 0);
  const eScore = Math.min(100, Math.round((Math.max(0, net) / benchNet) * 100));
  const dScore = Math.min(100, Math.round(((inputs.docCompleteness || 50) / benchDoc) * 100));
  const qScore = Math.min(100, Math.round((inputs.wrvuLift / benchWrvu) * 100));
  const sScore = Math.min(100, Math.round((inputs.satisfaction / benchSat) * 100));
  const aRaw = inputs.afterHoursPerWeek <= benchAfter
    ? 100
    : Math.min(100, Math.round(((8 - inputs.afterHoursPerWeek) / (8 - benchAfter)) * 100));
  const aScore = Math.max(0, aRaw);

  const real = Math.round(
    uScore * 0.25 + eScore * 0.20 + dScore * 0.20 +
    qScore * 0.15 + sScore * 0.10 + aScore * 0.10,
  );

  if (real < 35) return 1; // Deployed
  if (real < 65) return 2; // Adopted
  if (real < 85) return 3; // Optimized
  return 4;                // Transformed
}

// ============================================================================
// PILLAR 1 — CAPACITY
// Time saved → deployable provider hours → additional visits → revenue
// ============================================================================

function computeCapacity(
  state: AssessmentState,
  confidence: Confidence,
): PillarDetail {
  const { inputs } = state;
  const spec = SPECIALTY_DEFAULTS[inputs.specialtyMix];

  // E_used = total encounters that actually flow through the AI today
  const eUsed = Math.round(inputs.annualEncounters * (inputs.utilization / 100));

  // Net minutes reclaimed per encounter (time saved minus edit overhead)
  const netMinutes = Math.max(0, inputs.timeSavedPerEncounter - (inputs.editTimePerEncounter || 0));

  // Total hours reclaimed across the org per year
  const totalHoursReclaimed = (eUsed * netMinutes) / 60;

  const deployKey = INTENT_TO_DEPLOY[inputs.deployIntent ?? "not-sure"] ?? "default";
  const deployFactor = DEPLOY_FACTOR[deployKey];
  const deployableHours = totalHoursReclaimed * deployFactor;

  // Convert deployable hours → additional visits using specialty visit duration
  const additionalVisits = Math.floor((deployableHours * 60) / spec.visitMinutes);

  // Revenue from those visits
  const rawValue = additionalVisits * spec.contributionPerVisit;

  // Apply confidence haircut
  const valueAnnual = haircut(rawValue, confidence);

  // Score: how much of the theoretical maximum capacity are we capturing?
  // Theoretical max = all encounters at benchmark utilization, benchmark net impact
  const maxEUsed = inputs.annualEncounters * 0.76;
  const maxNetMin = 3.5; // benchmark net impact
  const maxHours = (maxEUsed * maxNetMin) / 60;
  const maxDeploy = maxHours * DEPLOY_FACTOR["grow"]; // best case
  const maxVisits = (maxDeploy * 60) / spec.visitMinutes;
  const maxValue = maxVisits * spec.contributionPerVisit;
  const score0to100 = maxValue > 0
    ? Math.min(100, Math.round((rawValue / maxValue) * 100))
    : 0;

  // Top blocker: what's limiting capacity value the most?
  let topBlockerKey = "utilization";
  if (netMinutes < 2) topBlockerKey = "netTimeSaved";
  if (inputs.utilization < 40) topBlockerKey = "utilization";
  if (deployFactor <= 0.10) topBlockerKey = "deployIntent";

  return {
    valueAnnual,
    score0to100,
    topBlockerKey,
    details: {
      eUsed,
      netMinutesPerEncounter: netMinutes,
      totalHoursReclaimed: Math.round(totalHoursReclaimed),
      deployFactor,
      deployableHours: Math.round(deployableHours),
      additionalVisits,
      contributionPerVisit: spec.contributionPerVisit,
      rawValue: Math.round(rawValue),
      confidenceHaircut: CONFIDENCE_MULTIPLIER[confidence],
    },
  };
}

// ============================================================================
// PILLAR 2 — YIELD
// Better documentation → improved coding → revenue uplift per encounter
// Splits FFS (wRVU-driven) and VBC (risk-adjustment) channels
// ============================================================================

function computeYield(
  state: AssessmentState,
  confidence: Confidence,
): PillarDetail {
  const { inputs } = state;
  const spec = SPECIALTY_DEFAULTS[inputs.specialtyMix];

  const eUsed = Math.round(inputs.annualEncounters * (inputs.utilization / 100));

  // Yield lift: how much revenue per encounter improves due to better docs
  // Cap at 2% to stay conservative — even strong wRVU lift rarely exceeds this
  const rawLiftPct = Math.min(inputs.wrvuLift, 7) / 100; // wrvuLift is 0-7%
  const yieldLiftPct = Math.min(rawLiftPct, 0.02); // hard cap at 2%

  // FFS share: fraction of revenue under fee-for-service (wRVU-sensitive)
  const ffsShare = 0.70;
  const vbcShare = 1 - ffsShare;

  // FFS yield: direct revenue lift via wRVU improvement
  // Attribution rate for FFS channel is 0.6 (conservative — not all lift is causal)
  const ffsAttribution = 0.60;
  const ffsYield = eUsed * spec.revenuePerEncounter * yieldLiftPct * ffsShare * ffsAttribution;

  // VBC yield: risk-adjustment improvement from better documentation
  // Lower attribution (0.4) because RAF impact is harder to prove
  const vbcAttribution = 0.40;
  const vbcYield = eUsed * spec.revenuePerEncounter * yieldLiftPct * vbcShare * vbcAttribution;

  const rawValue = ffsYield + vbcYield;
  const valueAnnual = haircut(rawValue, confidence);

  // Score: yield realization as % of theoretical max
  // Max assumes 2% lift, 76% utilization, high attribution
  const maxEUsed = inputs.annualEncounters * 0.76;
  const maxYield = maxEUsed * spec.revenuePerEncounter * 0.02 * (ffsShare * 0.6 + vbcShare * 0.4);
  const score0to100 = maxYield > 0
    ? Math.min(100, Math.round((rawValue / maxYield) * 100))
    : 0;

  // Top blocker
  let topBlockerKey = "wrvuLift";
  if (inputs.wrvuLift >= 4 && inputs.utilization < 50) topBlockerKey = "utilization";
  if (inputs.docCompleteness < 50) topBlockerKey = "docCompleteness";

  return {
    valueAnnual,
    score0to100,
    topBlockerKey,
    details: {
      eUsed,
      revenuePerEncounter: spec.revenuePerEncounter,
      yieldLiftPct: Math.round(yieldLiftPct * 10000) / 100, // as %
      ffsShare,
      vbcShare,
      ffsAttribution,
      vbcAttribution,
      ffsYield: Math.round(ffsYield),
      vbcYield: Math.round(vbcYield),
      rawValue: Math.round(rawValue),
      confidenceHaircut: CONFIDENCE_MULTIPLIER[confidence],
    },
  };
}

// ============================================================================
// PILLAR 3 — WORKFORCE
// After-hours reduction → burnout avoidance → retention value
// Plus small turnover-risk component
// ============================================================================

function computeWorkforce(
  state: AssessmentState,
  confidence: Confidence,
): PillarDetail {
  const { inputs } = state;
  const maturityStage = deriveMaturityStage(inputs);

  // After-hours: how many weekly hours could be avoided with better docs?
  // Avoidable fraction scales with maturity: early adopters see less benefit
  const AVOIDABLE_FRACTION: Record<number, number> = {
    1: 0.15, // Deployed — docs not yet consistent, small fraction avoidable
    2: 0.30, // Adopted — moderate documentation quality
    3: 0.50, // Optimized — strong docs, more after-hours is avoidable
    4: 0.65, // Transformed — most after-hours is documentation-related
  };
  const avoidableFraction = AVOIDABLE_FRACTION[maturityStage] ?? 0.30;

  // Hours avoided per provider per year (48 working weeks)
  const avoidableHoursPerWeek = inputs.afterHoursPerWeek * avoidableFraction;
  const avoidableHoursPerYear = avoidableHoursPerWeek * 48;

  // Hourly rate derived from fully-loaded provider cost
  // currentCostPerProvider is monthly cost of the ambient solution, not salary
  // Use a default fully-loaded hourly rate
  const fullyLoadedHourlyRate = 150; // $/hr, conservative blended rate

  const afterHoursValue = inputs.providers * avoidableHoursPerYear * fullyLoadedHourlyRate;

  // Turnover risk: small additional value from reduced burnout-driven departures
  // Cap at 2 prevented departures to stay conservative
  // Replacement cost ~$400K for a physician; we use $200K as conservative
  const baseTurnoverRate = 0.06; // 6% annual physician turnover
  const burnoutShareOfTurnover = 0.40; // 40% of turnover is burnout-related
  const burnoutReductionFromDocs = maturityStage >= 3 ? 0.15 : 0.08; // how much docs help

  const expectedPrevented = inputs.providers * baseTurnoverRate * burnoutShareOfTurnover * burnoutReductionFromDocs;
  const preventedDepartures = Math.min(expectedPrevented, 2); // hard cap at 2
  const replacementCost = 200000;
  const turnoverValue = preventedDepartures * replacementCost;

  const rawValue = afterHoursValue + turnoverValue;
  const valueAnnual = haircut(rawValue, confidence);

  // Score: after-hours reduction effectiveness
  // Max = 65% avoidable at transformed stage, 8 hrs/week after-hours
  const maxAfterHoursValue = inputs.providers * (8 * 0.65 * 48) * fullyLoadedHourlyRate;
  const maxTurnoverValue = 2 * replacementCost;
  const maxValue = maxAfterHoursValue + maxTurnoverValue;
  const score0to100 = maxValue > 0
    ? Math.min(100, Math.round((rawValue / maxValue) * 100))
    : 0;

  let topBlockerKey = "afterHoursPerWeek";
  if (inputs.afterHoursPerWeek <= 1) topBlockerKey = "maturityStage";
  if (maturityStage <= 1) topBlockerKey = "maturityStage";

  return {
    valueAnnual,
    score0to100,
    topBlockerKey,
    details: {
      maturityStage,
      avoidableFraction,
      afterHoursPerWeek: inputs.afterHoursPerWeek,
      avoidableHoursPerYear: Math.round(avoidableHoursPerYear),
      fullyLoadedHourlyRate,
      afterHoursValue: Math.round(afterHoursValue),
      preventedDepartures: Math.round(preventedDepartures * 100) / 100,
      replacementCost,
      turnoverValue: Math.round(turnoverValue),
      rawValue: Math.round(rawValue),
      confidenceHaircut: CONFIDENCE_MULTIPLIER[confidence],
    },
  };
}

// ============================================================================
// PILLAR 4 — RISK
// Documentation compliance exposure → audit risk reduction + quality friction
// Hard-capped at 0.2% of gross revenue to stay defensible
// ============================================================================

function computeRisk(
  state: AssessmentState,
  confidence: Confidence,
): PillarDetail {
  const { inputs } = state;
  const spec = SPECIALTY_DEFAULTS[inputs.specialtyMix];

  // Gross revenue estimate from total encounters (not just AI-documented)
  const grossRevenue = inputs.annualEncounters * spec.revenuePerEncounter;

  // Exposure rate: based on documentation completeness (audit confidence)
  // Lower doc completeness → higher audit exposure
  // docCompleteness 0-100; we invert to get exposure risk
  const docPct = Math.max(0, Math.min(100, inputs.docCompleteness || 50));
  // At 80%+ completeness, exposure is near zero; at 0%, exposure is at maximum
  const exposureRate = Math.max(0, (80 - docPct) / 80) * 0.003; // max 0.3% at 0 completeness

  // Raw audit risk reduction value
  const auditRiskValue = grossRevenue * exposureRate;

  // Hard cap: never claim more than 0.2% of gross revenue for risk pillar
  const hardCap = grossRevenue * 0.002;
  const cappedAuditValue = Math.min(auditRiskValue, hardCap);

  // Quality friction add-on: small value from reduced rework, addenda, amendments
  // This is a fixed $/encounter estimate that scales with doc quality gap
  const qualityFrictionPerEncounter = docPct < 60 ? 2.0 : docPct < 75 ? 1.0 : 0.50;
  const eUsed = Math.round(inputs.annualEncounters * (inputs.utilization / 100));
  const qualityFrictionValue = eUsed * qualityFrictionPerEncounter;

  const rawValue = cappedAuditValue + qualityFrictionValue;
  const valueAnnual = haircut(rawValue, confidence);

  // Readiness score: how well-prepared is the org for documentation audits?
  // 100 = excellent (high completeness), 0 = high risk
  const readinessScore = Math.min(100, Math.round(docPct * 1.25)); // 80% completeness → 100 readiness

  // Score: risk mitigation as % of max possible (low completeness scenario)
  const maxExposure = grossRevenue * 0.002; // at hard cap
  const maxFriction = inputs.annualEncounters * 2.0;
  const maxValue = maxExposure + maxFriction;
  const score0to100 = maxValue > 0
    ? Math.min(100, Math.round((rawValue / maxValue) * 100))
    : 0;

  let topBlockerKey = "docCompleteness";
  if (docPct >= 75) topBlockerKey = "utilization";

  return {
    valueAnnual,
    score0to100,
    topBlockerKey,
    details: {
      grossRevenue: Math.round(grossRevenue),
      docCompleteness: docPct,
      exposureRate: Math.round(exposureRate * 10000) / 100, // as %
      auditRiskValue: Math.round(auditRiskValue),
      hardCap: Math.round(hardCap),
      cappedAuditValue: Math.round(cappedAuditValue),
      qualityFrictionPerEncounter,
      qualityFrictionValue: Math.round(qualityFrictionValue),
      rawValue: Math.round(rawValue),
      readinessScore,
      confidenceHaircut: CONFIDENCE_MULTIPLIER[confidence],
    },
  };
}

// ---------------------------------------------------------------------------
// Safe input normalization — guards against undefined or partial state
// Ensures all numeric fields default to 0 and specialtyMix defaults to "balanced"
// ---------------------------------------------------------------------------

function safeInputs(raw: AssessmentState["inputs"]): AssessmentState["inputs"] {
  return {
    solution: raw.solution ?? ("ambient-ai" as any),
    providers: raw.providers ?? 0,
    annualEncounters: raw.annualEncounters ?? 0,
    currentCostPerProvider: raw.currentCostPerProvider ?? 200,
    specialtyMix: raw.specialtyMix ?? "balanced",
    utilization: raw.utilization ?? 0,
    timeSavedPerEncounter: raw.timeSavedPerEncounter ?? 0,
    editTimePerEncounter: raw.editTimePerEncounter ?? 0,
    docCompleteness: raw.docCompleteness ?? 0,
    wrvuLift: raw.wrvuLift ?? 0,
    satisfaction: raw.satisfaction ?? 0,
    afterHoursPerWeek: raw.afterHoursPerWeek ?? 0,
    deployIntent: raw.deployIntent ?? "not-sure",
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export function computePillars(state: AssessmentState): PillarResult {
  const safe: AssessmentState = {
    ...state,
    inputs: safeInputs(state.inputs),
  };

  const confidence = inferConfidence(safe.inputs);

  const capacity = computeCapacity(safe, confidence);
  const yieldPillar = computeYield(safe, confidence);
  const workforce = computeWorkforce(safe, confidence);
  const risk = computeRisk(safe, confidence);

  const totalAnnual = capacity.valueAnnual + yieldPillar.valueAnnual +
    workforce.valueAnnual + risk.valueAnnual;

  return {
    pillars: {
      capacity,
      yield: yieldPillar,
      workforce,
      risk,
    },
    totalAnnual,
    total3yr: totalAnnual * 3,
    monthlyOpportunity: Math.round(totalAnnual / 12),
  };
}
