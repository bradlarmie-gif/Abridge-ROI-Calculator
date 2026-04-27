export type PricingModel = 'perProvider' | 'perEncounter' | 'annualLicense';

export interface PricingTier {
  id: string;
  thresholdFrom: number;
  thresholdTo: number | null;
  rate: number;
}

export interface PricingScenario {
  id: string;
  label: string;
  model: PricingModel;
  tiers: PricingTier[];
}

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  perProvider: 'Per Provider / Month',
  perEncounter: 'Per Encounter',
  annualLicense: 'Annual License',
};

export const PRICING_MODEL_RATE_SUFFIX: Record<PricingModel, string> = {
  perProvider: '/provider/mo',
  perEncounter: '/encounter',
  annualLicense: '/year',
};

export const PRICING_MODEL_SCALE_LABEL: Record<PricingModel, string> = {
  perProvider: 'providers',
  perEncounter: 'encounters',
  annualLicense: 'flat (no scale axis)',
};

export function findApplicableTier(tiers: PricingTier[], scale: number): PricingTier | null {
  for (const tier of tiers) {
    const aboveLower = scale >= tier.thresholdFrom;
    const belowUpper = tier.thresholdTo === null || scale < tier.thresholdTo;
    if (aboveLower && belowUpper) return tier;
  }
  return null;
}

export function computeScenarioInvestment(
  scenario: PricingScenario,
  scale: number,
): { value: number; tier: PricingTier | null; warning?: string } {
  if (scenario.model === 'annualLicense') {
    const tier = scenario.tiers[0];
    if (!tier) return { value: 0, tier: null, warning: 'No tier defined' };
    return { value: tier.rate, tier };
  }

  const tier = findApplicableTier(scenario.tiers, scale);
  if (!tier) {
    return { value: 0, tier: null, warning: `Scale ${scale.toLocaleString()} falls outside all defined tiers` };
  }

  if (scenario.model === 'perProvider') {
    return { value: scale * tier.rate * 12, tier };
  }
  if (scenario.model === 'perEncounter') {
    return { value: scale * tier.rate, tier };
  }
  return { value: 0, tier: null };
}

export function makeDefaultTiers(model: PricingModel): PricingTier[] {
  const stamp = Date.now();
  if (model === 'perProvider') {
    return [
      { id: `tier-${stamp}-1`, thresholdFrom: 1, thresholdTo: 100, rate: 1500 },
      { id: `tier-${stamp}-2`, thresholdFrom: 100, thresholdTo: 300, rate: 1200 },
      { id: `tier-${stamp}-3`, thresholdFrom: 300, thresholdTo: null, rate: 900 },
    ];
  }
  if (model === 'perEncounter') {
    return [
      { id: `tier-${stamp}-1`, thresholdFrom: 1, thresholdTo: 200000, rate: 0.5 },
      { id: `tier-${stamp}-2`, thresholdFrom: 200000, thresholdTo: null, rate: 0.4 },
    ];
  }
  return [
    { id: `tier-${stamp}-1`, thresholdFrom: 0, thresholdTo: null, rate: 1500000 },
  ];
}
