export type PricingModel = 'perProvider' | 'perEncounter' | 'annualLicense' | 'platformFee';

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
  baseFee?: number;
}

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  perProvider: 'Per Provider / Month',
  perEncounter: 'Per Encounter',
  annualLicense: 'Annual License',
  platformFee: 'Platform Fee',
};

export const PRICING_MODEL_RATE_SUFFIX: Record<PricingModel, string> = {
  perProvider: '/provider/mo',
  perEncounter: '/encounter',
  annualLicense: '/year',
  platformFee: '/encounter',
};

export const PRICING_MODEL_SCALE_LABEL: Record<PricingModel, string> = {
  perProvider: 'providers',
  perEncounter: 'encounters',
  annualLicense: 'flat (no scale axis)',
  platformFee: 'encounters',
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
  if (scenario.model === 'platformFee') {
    const pfTier = findApplicableTier(scenario.tiers, scale);
    const encounterCost = pfTier ? scale * pfTier.rate : 0;
    const base = scenario.baseFee ?? 0;
    return { value: base + encounterCost, tier: pfTier ?? null };
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
  if (model === 'platformFee') {
    return [
      { id: `tier-${stamp}-1`, thresholdFrom: 1, thresholdTo: null, rate: 0.25 },
    ];
  }
  return [
    { id: `tier-${stamp}-1`, thresholdFrom: 0, thresholdTo: null, rate: 1500000 },
  ];
}

export interface PricingYearInput {
  providers: number;
  encounters: number;
  capacityValue: number;
  workforceValue: number;
  revenueValue: number;
  qualityValue: number;
  totalValue: number;
}

export interface PricingTimeSeriesPoint {
  year: number;
  label: string;
  providers: number;
  encounters: number;
  capacityValue: number;
  workforceValue: number;
  revenueValue: number;
  qualityValue: number;
  totalValue: number;
  valueLow: number;
  valueHigh: number;
  investments: Record<string, number>;
}

export interface TierCrossingMarker {
  scenarioId: string;
  year: number;
  providers: number;
  investment: number;
  label: string;
}

export function computePricingTimeSeries(
  scenarios: PricingScenario[],
  yearlyInputs: PricingYearInput[],
): { points: PricingTimeSeriesPoint[]; tierCrossings: TierCrossingMarker[] } {
  const points: PricingTimeSeriesPoint[] = [];
  const tierCrossings: TierCrossingMarker[] = [];

  for (let i = 0; i < yearlyInputs.length; i++) {
    const year = i + 1;
    const inp = yearlyInputs[i];
    const valueLow = Math.round(inp.totalValue * 0.75);
    const valueHigh = Math.round(inp.totalValue * 1.25);

    const investments: Record<string, number> = {};
    for (const scenario of scenarios) {
      const scale = scenario.model === 'perProvider' ? inp.providers
                  : (scenario.model === 'perEncounter' || scenario.model === 'platformFee') ? inp.encounters
                  : 0;
      investments[scenario.id] = computeScenarioInvestment(scenario, scale).value;
    }

    points.push({
      year,
      label: `Year ${year}`,
      providers: inp.providers,
      encounters: inp.encounters,
      capacityValue: inp.capacityValue,
      workforceValue: inp.workforceValue,
      revenueValue: inp.revenueValue,
      qualityValue: inp.qualityValue,
      totalValue: inp.totalValue,
      valueLow,
      valueHigh,
      investments,
    });
  }

  for (const scenario of scenarios) {
    if (scenario.model === 'annualLicense') continue;
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      const prevScale = (scenario.model === 'perProvider') ? prevPoint.providers : prevPoint.encounters;
      const currScale = (scenario.model === 'perProvider') ? currPoint.providers : currPoint.encounters;
      const prevTier = findApplicableTier(scenario.tiers, prevScale);
      const currTier = findApplicableTier(scenario.tiers, currScale);
      if (prevTier && currTier && prevTier.id !== currTier.id) {
        tierCrossings.push({
          scenarioId: scenario.id,
          year: currPoint.year,
          providers: currScale,
          investment: currPoint.investments[scenario.id] ?? 0,
          label: `Tier changes at ${currTier.thresholdFrom.toLocaleString()} ${scenario.model === 'perProvider' ? 'providers' : 'encounters'}`,
        });
      }
    }
  }

  return { points, tierCrossings };
}
