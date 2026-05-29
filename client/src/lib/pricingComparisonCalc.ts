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
  annualCost: number;
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

    // Use this year's provisioned volume; fall back to 0 if yearConfigs is short
    const cfg = deal.yearConfigs[y];
    const provisioned = cfg?.provisionedVolume ?? 0;

    let annualCost = 0;
    switch (deal.model) {
      case "perProviderMonth":
        annualCost = provisioned * escalatedUnitPrice * 12;
        break;
      case "perEncounterAnnual":
        annualCost = provisioned * escalatedUnitPrice;
        break;
      case "enterpriseFlat":
        annualCost = escalatedUnitPrice; // volume doesn't factor in
        break;
      case "platform":
        annualCost = escalatedPlatformFee + provisioned * escalatedUnitPrice;
        break;
    }

    years.push({ year: y + 1, annualCost: Math.round(annualCost) });
  }

  const totalContractCost = years.reduce((s, r) => s + r.annualCost, 0);
  const averageAnnualCost = contractYears > 0 ? totalContractCost / contractYears : 0;

  // Cost per provider / encounter: use average annual provisioned volume
  const avgProvisioned =
    deal.yearConfigs.length > 0
      ? deal.yearConfigs.slice(0, contractYears).reduce((s, c) => s + (c?.provisionedVolume ?? 0), 0) /
        Math.max(1, contractYears)
      : 0;

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

  // Value layer
  let vtcYear1: number | null = null;
  let termVtc: number | null = null;
  let annualRoiPct: number | null = null;
  let termRoiPct: number | null = null;
  let paybackMonths: number | null = null;

  const y1Cost = years[0]?.annualCost ?? 0;
  if (annualValueEstimate > 0 && y1Cost > 0) {
    vtcYear1 = annualValueEstimate / y1Cost;
    const totalValue = annualValueEstimate * contractYears;
    termVtc = totalContractCost > 0 ? totalValue / totalContractCost : null;
    annualRoiPct = ((annualValueEstimate - y1Cost) / y1Cost) * 100;
    termRoiPct =
      totalContractCost > 0
        ? ((totalValue - totalContractCost) / totalContractCost) * 100
        : null;

    let cumValue = 0;
    let cumCost = 0;
    const monthlyValue = annualValueEstimate / 12;
    for (let m = 1; m <= deal.contractTermMonths; m++) {
      const yearIdx = Math.min(Math.floor((m - 1) / 12), years.length - 1);
      const monthlyCost = (years[yearIdx]?.annualCost ?? 0) / 12;
      cumValue += monthlyValue;
      cumCost += monthlyCost;
      if (paybackMonths === null && cumValue >= cumCost) {
        paybackMonths = m;
        break;
      }
    }
  }

  return {
    dealId: deal.id,
    years,
    totalContractCost,
    averageAnnualCost,
    costPerProvider,
    costPerEncounter,
    vtcYear1,
    termVtc,
    annualRoiPct,
    termRoiPct,
    paybackMonths,
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
