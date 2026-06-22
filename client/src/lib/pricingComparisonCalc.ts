export type PricingModel = "perProviderMonth" | "perEncounterAnnual" | "enterpriseFlat" | "platform";

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  perProviderMonth: "Per Provider / Month",
  perEncounterAnnual: "Per Encounter",
  enterpriseFlat: "Enterprise Flat Fee",
  platform: "Platform (Flat Fee + Per Encounter)",
};

export const PRICING_MODEL_UNIT_LABELS: Record<PricingModel, string> = {
  perProviderMonth: "/provider/mo",
  perEncounterAnnual: "/encounter",
  enterpriseFlat: "/year",
  platform: "/encounter (+ platform fee)",
};

export type OverageModel = "hardCap" | "billedPerUnit" | "included";

export const OVERAGE_MODEL_LABELS: Record<OverageModel, string> = {
  hardCap: "Hard cap — no additional charges",
  billedPerUnit: "Billed per additional unit",
  included: "Included — unlimited usage",
};

export interface DealYearConfig {
  provisionedVolume: number; // providers or encounters provisioned for this year
}

export interface DealOption {
  id: string;
  label: string;
  model: PricingModel;
  unitPrice: number;        // per-provider/month rate OR per-encounter rate
  platformFee: number;      // annual flat fee (only used when model === "platform")
  contractTermMonths: number;
  escalatorPct: number;     // annual % price escalation on unitPrice and platformFee; 0 = flat
  yearConfigs: DealYearConfig[]; // one entry per contract year
  overageModel: OverageModel;
  overageUnitPrice: number; // rate for "billedPerUnit" overage
}

export interface VolumeInputs {
  providerCount: number;
  annualEncounters: number;
  staffedBeds: number;
}

export interface DealYearResult {
  year: number;
  baseCost: number;       // cost at exactly provisioned volume
  annualCost: number;     // same as baseCost (alias kept for compat)
  platformFeePortion: number; // for platform model: the flat fee component
  volumeCostPortion: number;  // the volume × rate component
}

export interface UsageScenarioResult {
  label: string;
  utilizationPct: number;   // e.g. 75, 100, 125
  baseCost: number;         // year-1 base (provisioned)
  overageCost: number;      // extra charges if over provisioned
  totalCost: number;        // baseCost + overageCost
  overageUnits: number;     // units over provisioned (0 if under)
}

export interface DealResult {
  dealId: string;
  years: DealYearResult[];
  totalContractCost: number;
  averageAnnualCost: number;
  costPerProvider: number | null;
  costPerEncounter: number | null;
  // value layer — null when annualValueEstimate = 0
  vtcYear1: number | null;
  termVtc: number | null;
  annualRoiPct: number | null;
  termRoiPct: number | null;
  paybackMonths: number | null;
}

/**
 * The volume a deal bills against, sourced from the Organization Volume the user
 * entered once at the top. Per-year provisioned overrides take precedence when set.
 */
export function orgVolumeForModel(volumes: VolumeInputs, model: PricingModel): number {
  if (model === "perProviderMonth") return volumes.providerCount;
  if (model === "perEncounterAnnual" || model === "platform") return volumes.annualEncounters;
  return 0; // enterpriseFlat is volume-independent
}

/** Effective provisioned volume for a year: an explicit override if set, else the org volume. */
export function effectiveProvisioned(deal: DealOption, volumes: VolumeInputs, yearIdx: number): number {
  const override = deal.yearConfigs[yearIdx]?.provisionedVolume ?? 0;
  return override > 0 ? override : orgVolumeForModel(volumes, deal.model);
}

export interface ValueMetrics {
  vtcYear1: number | null;
  termVtc: number | null;
  annualRoiPct: number | null;
  termRoiPct: number | null;
  paybackMonths: number | null;
}

/**
 * Value-to-cost / ROI / payback for a cost stream. Shared by the gross deal result and the
 * net (post-displacement) view so the two never compute ROI differently. Pass the cost by
 * contract year + the total; when displacement is on, pass the NET cost stream.
 */
export function computeValueMetrics(
  costByYear: number[],
  totalCost: number,
  contractTermMonths: number,
  annualValueEstimate: number,
): ValueMetrics {
  const y1Cost = costByYear[0] ?? 0;
  if (!(annualValueEstimate > 0 && y1Cost > 0)) {
    return { vtcYear1: null, termVtc: null, annualRoiPct: null, termRoiPct: null, paybackMonths: null };
  }
  const contractYears = Math.max(1, costByYear.length);
  const totalValue = annualValueEstimate * contractYears;
  const vtcYear1 = annualValueEstimate / y1Cost;
  const termVtc = totalCost > 0 ? totalValue / totalCost : null;
  const annualRoiPct = ((annualValueEstimate - y1Cost) / y1Cost) * 100;
  const termRoiPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;

  let paybackMonths: number | null = null;
  let cumValue = 0;
  let cumCost = 0;
  const monthlyValue = annualValueEstimate / 12;
  for (let m = 1; m <= contractTermMonths; m++) {
    const yearIdx = Math.min(Math.floor((m - 1) / 12), costByYear.length - 1);
    const monthlyCost = (costByYear[yearIdx] ?? 0) / 12;
    cumValue += monthlyValue;
    cumCost += monthlyCost;
    if (cumValue >= cumCost) { paybackMonths = m; break; }
  }
  return { vtcYear1, termVtc, annualRoiPct, termRoiPct, paybackMonths };
}

export function computeDealResult(
  deal: DealOption,
  volumes: VolumeInputs,
  annualValueEstimate: number,
): DealResult {
  const contractYears = Math.max(1, Math.ceil(deal.contractTermMonths / 12));

  const years: DealYearResult[] = [];
  for (let y = 0; y < contractYears; y++) {
    const priceEscalation = Math.pow(1 + deal.escalatorPct / 100, y);
    const escalatedUnitPrice = deal.unitPrice * priceEscalation;
    const escalatedPlatformFee = deal.platformFee * priceEscalation;

    // Org volume flows in as the default; a per-year override wins if set.
    const provisioned = effectiveProvisioned(deal, volumes, y);

    let baseCost = 0;
    let platformFeePortion = 0;
    let volumeCostPortion = 0;
    switch (deal.model) {
      case "perProviderMonth":
        volumeCostPortion = provisioned * escalatedUnitPrice * 12;
        baseCost = volumeCostPortion;
        break;
      case "perEncounterAnnual":
        volumeCostPortion = provisioned * escalatedUnitPrice;
        baseCost = volumeCostPortion;
        break;
      case "enterpriseFlat":
        baseCost = escalatedUnitPrice;
        volumeCostPortion = baseCost;
        break;
      case "platform":
        platformFeePortion = escalatedPlatformFee;
        volumeCostPortion = provisioned * escalatedUnitPrice;
        baseCost = platformFeePortion + volumeCostPortion;
        break;
    }

    years.push({
      year: y + 1,
      baseCost: Math.round(baseCost),
      annualCost: Math.round(baseCost),
      platformFeePortion: Math.round(platformFeePortion),
      volumeCostPortion: Math.round(volumeCostPortion),
    });
  }

  const totalContractCost = years.reduce((s, r) => s + r.annualCost, 0);
  const averageAnnualCost = contractYears > 0 ? totalContractCost / contractYears : 0;

  // Cost per provider / encounter: use average annual effective volume (override or org).
  let avgProvisionedSum = 0;
  for (let y = 0; y < contractYears; y++) avgProvisionedSum += effectiveProvisioned(deal, volumes, y);
  const avgProvisioned = avgProvisionedSum / Math.max(1, contractYears);

  const costPerProvider =
    deal.model === "perProviderMonth" && avgProvisioned > 0
      ? totalContractCost / avgProvisioned
      : volumes.providerCount > 0 && deal.model !== "perEncounterAnnual" && deal.model !== "platform"
      ? totalContractCost / volumes.providerCount
      : null;

  const costPerEncounter =
    (deal.model === "perEncounterAnnual" || deal.model === "platform") && avgProvisioned > 0
      ? totalContractCost / (avgProvisioned * contractYears)
      : volumes.annualEncounters > 0 && deal.model === "perEncounterAnnual"
      ? totalContractCost / (volumes.annualEncounters * contractYears)
      : null;

  // Value layer — shared with the net (post-displacement) view via computeValueMetrics.
  const metrics = computeValueMetrics(
    years.map((y) => y.annualCost),
    totalContractCost,
    deal.contractTermMonths,
    annualValueEstimate,
  );

  return {
    dealId: deal.id,
    years,
    totalContractCost,
    averageAnnualCost,
    costPerProvider,
    costPerEncounter,
    ...metrics,
  };
}

export function makeDefaultDeal(label: string, id: string, defaultVolume = 0): DealOption {
  return {
    id,
    label,
    model: "perProviderMonth",
    unitPrice: 0,
    platformFee: 0,
    contractTermMonths: 36,
    escalatorPct: 0,
    yearConfigs: [
      { provisionedVolume: defaultVolume },
      { provisionedVolume: defaultVolume },
      { provisionedVolume: defaultVolume },
    ],
    overageModel: "hardCap",
    overageUnitPrice: 0,
  };
}

/**
 * Returns 3 usage scenarios for a deal based on Year 1 provisioned volume:
 * 75% utilization (under), 100% (at cap), 125% (over provisioned — overage kicks in).
 */
export function computeUsageScenarios(deal: DealOption, volumes: VolumeInputs): UsageScenarioResult[] {
  if (deal.model === "enterpriseFlat") return [];

  const y1Provisioned = effectiveProvisioned(deal, volumes, 0);
  const escalatedUnitPrice = deal.unitPrice; // year 1, no escalation
  const escalatedPlatformFee = deal.platformFee;

  const scenarios = [
    { label: "Conservative", utilizationPct: 75 },
    { label: "Typical", utilizationPct: 100 },
    { label: "Over Provisioned", utilizationPct: 125 },
  ];

  return scenarios.map(({ label, utilizationPct }) => {
    const actualVolume = y1Provisioned * (utilizationPct / 100);
    const overageUnits = Math.max(0, actualVolume - y1Provisioned);

    let baseCost = 0;
    switch (deal.model) {
      case "perProviderMonth":
        baseCost = y1Provisioned * escalatedUnitPrice * 12;
        break;
      case "perEncounterAnnual":
        baseCost = y1Provisioned * escalatedUnitPrice;
        break;
      case "platform":
        baseCost = escalatedPlatformFee + y1Provisioned * escalatedUnitPrice;
        break;
    }

    let overageCost = 0;
    if (overageUnits > 0) {
      switch (deal.overageModel) {
        case "billedPerUnit": {
          const rate = deal.overageUnitPrice > 0 ? deal.overageUnitPrice : escalatedUnitPrice;
          overageCost = deal.model === "perProviderMonth"
            ? overageUnits * rate * 12
            : overageUnits * rate;
          break;
        }
        case "hardCap":
        case "included":
          overageCost = 0;
          break;
      }
    }

    return {
      label,
      utilizationPct,
      baseCost: Math.round(baseCost),
      overageCost: Math.round(overageCost),
      totalCost: Math.round(baseCost + overageCost),
      overageUnits: Math.round(overageUnits),
    };
  });
}

// ── Vendor displacement ("switch savings") ──────────────────────────────────
// An optional bolt-on: the incumbent tech a partner retires when they move to
// Abridge. The displaced spend nets against each deal's gross cost. Mirrors the
// proforma's cost-offset model (annualSpend × displacementPct, applied over years).

export type DisplacementCategoryId =
  | "scribes" | "ambientAi" | "dictation" | "transcription" | "cdiCoding" | "clinicalEvidence" | "custom";

export interface DisplacedVendor {
  id: string;
  label: string;
  category: DisplacementCategoryId;
  annualSpend: number;      // their current spend on this tech (source of truth)
  displacementPct: number;  // 0–100; how much Abridge takes off the table (partial is the norm)
  rampYears: number;        // years over which the displacement ramps to full (1 = immediate)
}

export const DISPLACEMENT_CATEGORIES: { id: DisplacementCategoryId; label: string; hint: string }[] = [
  { id: "scribes", label: "Medical scribes", hint: "in-person / virtual" },
  { id: "ambientAi", label: "Competing ambient AI", hint: "DAX, Suki, Nabla, Ambience" },
  { id: "dictation", label: "Dictation / speech-to-text", hint: "Dragon Medical" },
  { id: "transcription", label: "Transcription services", hint: "outsourced / offshore" },
  { id: "cdiCoding", label: "Third-party CDI / coding", hint: "" },
  { id: "clinicalEvidence", label: "Clinical evidence & search", hint: "OpenEvidence, redundant reference" },
  { id: "custom", label: "Custom", hint: "" },
];

export function makeDefaultVendor(id: string): DisplacedVendor {
  return { id, label: "", category: "scribes", annualSpend: 0, displacementPct: 80, rampYears: 1 };
}

/** Annual dollars a single vendor displaces at full ramp (steady state). */
export function vendorDisplacedAnnual(v: DisplacedVendor): number {
  return Math.round((v.annualSpend || 0) * (v.displacementPct || 0) / 100);
}

/** Fraction of a vendor's displacement realized in a given (1-based) contract year. */
export function vendorRampFraction(v: DisplacedVendor, year: number): number {
  return Math.min(1, year / Math.max(1, v.rampYears || 1));
}

/** Total displaced in a given (1-based) contract year — ramps each vendor over its rampYears. */
export function displacedInYear(vendors: DisplacedVendor[], year: number): number {
  return vendors.reduce((s, v) => s + Math.round(vendorDisplacedAnnual(v) * vendorRampFraction(v, year)), 0);
}

export interface NetResult {
  displacedByYear: number[];
  totalDisplaced: number;
  netByYear: number[];
  netTotalContract: number;
  netAverageAnnual: number;
  pctCovered: number; // displaced / gross over the term, 0–100
}

/** Net a deal's gross cost by the displaced vendor spend, year by year. */
export function computeNetResult(result: DealResult, vendors: DisplacedVendor[]): NetResult {
  const displacedByYear = result.years.map((y) => displacedInYear(vendors, y.year));
  const netByYear = result.years.map((y, i) => Math.max(0, y.annualCost - displacedByYear[i]));
  const totalDisplaced = displacedByYear.reduce((a, b) => a + b, 0);
  const netTotalContract = netByYear.reduce((a, b) => a + b, 0);
  const yrs = Math.max(1, result.years.length);
  return {
    displacedByYear,
    totalDisplaced,
    netByYear,
    netTotalContract,
    netAverageAnnual: netTotalContract / yrs,
    pctCovered: result.totalContractCost > 0 ? Math.min(100, (totalDisplaced / result.totalContractCost) * 100) : 0,
  };
}

/** Ensures yearConfigs has exactly `years` entries, filling new ones with `defaultVolume`. */
export function syncYearConfigs(
  configs: DealYearConfig[],
  years: number,
  defaultVolume: number,
): DealYearConfig[] {
  const result: DealYearConfig[] = [];
  for (let i = 0; i < years; i++) {
    result.push(configs[i] ?? { provisionedVolume: defaultVolume });
  }
  return result;
}
