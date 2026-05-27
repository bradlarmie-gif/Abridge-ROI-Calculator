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

export interface QuadrantRatios {
  capacity: number;
  workforce: number;
  revenue: number;
  quality: number;
}

export function computePricingTimeSeries(
  scenarios: PricingScenario[],
  startProviders: number,
  startEncounters: number,
  annualProviderGrowthPct: number,
  chartYears: number,
  baseAnnualValue: number,
  quadrantRatios: QuadrantRatios,
): { points: PricingTimeSeriesPoint[]; tierCrossings: TierCrossingMarker[] } {
  const points: PricingTimeSeriesPoint[] = [];
  const tierCrossings: TierCrossingMarker[] = [];

  for (let year = 1; year <= chartYears; year++) {
    const growthFactor = (1 + annualProviderGrowthPct / 100) ** (year - 1);
    const providers = Math.round(startProviders * growthFactor);
    const encounters = Math.round(startEncounters * growthFactor);
    const totalValue = Math.round(baseAnnualValue * growthFactor);
    const valueLow = Math.round(totalValue * 0.75);
    const valueHigh = Math.round(totalValue * 1.25);
    const capacityValue = Math.round(totalValue * quadrantRatios.capacity);
    const workforceValue = Math.round(totalValue * quadrantRatios.workforce);
    const revenueValue = Math.round(totalValue * quadrantRatios.revenue);
    const qualityValue = totalValue - capacityValue - workforceValue - revenueValue;

    const investments: Record<string, number> = {};
    for (const scenario of scenarios) {
      const scale = scenario.model === 'perProvider' ? providers
                  : scenario.model === 'perEncounter' ? encounters
                  : 0;
      investments[scenario.id] = computeScenarioInvestment(scenario, scale).value;
    }

    points.push({
      year,
      label: `Year ${year}`,
      providers,
      encounters,
      capacityValue,
      workforceValue,
      revenueValue,
      qualityValue,
      totalValue,
      valueLow,
      valueHigh,
      investments,
    });
  }

  // Tier crossing detection
  for (const scenario of scenarios) {
    if (scenario.model === 'annualLicense') continue;
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currPoint = points[i];
      const prevScale = scenario.model === 'perProvider' ? prevPoint.providers : prevPoint.encounters;
      const currScale = scenario.model === 'perProvider' ? currPoint.providers : currPoint.encounters;
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
