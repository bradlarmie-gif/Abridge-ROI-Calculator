export interface ScribeInputs {
  scribeCount: number;
  scribeCostPerHour: number;
  scribeHoursPerWeek: number;
  providersWithScribes: number;
  totalProviders: number;
  annualEncounters: number;
}

export interface ScribeCalculations {
  coveragePercent: number;
  providersWithoutSupport: number;
  totalScribeCost: number;
  costPerProviderCovered: number;
  scribeRatio: number;
  scribesNeededForFullCoverage: number;
  fullScribeCost: number;
  costToScale: number;
  abridgeCost: number;
  savingsVsFullScribe: number;
  encountersPerProvider: number;
  unsupportedDocTimeHours: number;
  pajamaTimeHours: number;
  opportunityCost: number;
  abridgeValueCreated: number;
}

export const SCRIBE_ASSUMPTIONS = {
  scribeToProviderRatio: 1.5,
  weeksPerYear: 50,
  minutesPerEncounterWithoutScribe: 12,
  pajamaTimePercent: 0.4,
  providerHourlyRate: 150,
  abridgeCostPerProvider: 6000,
  abridgeTimeSavedPerEncounter: 4,
  abridgeUtilization: 0.75,
  abridgeWrvuLift: 0.05,
  wrvuDollarValue: 33,
  wrvuAttribution: 0.5,
};

export function calculateScribeGap(inputs: ScribeInputs): ScribeCalculations {
  const scribeCount = Math.max(0, inputs.scribeCount);
  const scribeCostPerHour = Math.max(0, inputs.scribeCostPerHour);
  const scribeHoursPerWeek = Math.max(0, inputs.scribeHoursPerWeek);
  const totalProviders = Math.max(1, inputs.totalProviders);
  const providersWithScribes = Math.min(Math.max(0, inputs.providersWithScribes), totalProviders);
  const annualEncounters = Math.max(0, inputs.annualEncounters);

  const coveragePercent = Math.round((providersWithScribes / totalProviders) * 100);

  const providersWithoutSupport = totalProviders - providersWithScribes;

  const scribeRatio = scribeCount > 0
    ? providersWithScribes / scribeCount
    : SCRIBE_ASSUMPTIONS.scribeToProviderRatio;

  const totalScribeCost = scribeCount * scribeCostPerHour * scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;

  const costPerProviderCovered = providersWithScribes > 0
    ? Math.round(totalScribeCost / providersWithScribes)
    : 0;

  const scribesNeededForFullCoverage = Math.ceil(totalProviders / scribeRatio);
  const fullScribeCost = scribesNeededForFullCoverage * scribeCostPerHour * scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;

  const costToScale = Math.max(0, fullScribeCost - totalScribeCost);

  const abridgeCost = totalProviders * SCRIBE_ASSUMPTIONS.abridgeCostPerProvider;
  const savingsVsFullScribe = Math.max(0, fullScribeCost - abridgeCost);

  const encountersPerProvider = totalProviders > 0
    ? Math.round(annualEncounters / totalProviders)
    : 0;

  const unsupportedEncounters = totalProviders > 0
    ? Math.round(annualEncounters * (providersWithoutSupport / totalProviders))
    : 0;

  const unsupportedDocTimeHours = Math.round(
    (unsupportedEncounters * SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe) / 60
  );

  const pajamaTimeHours = Math.round(unsupportedDocTimeHours * SCRIBE_ASSUMPTIONS.pajamaTimePercent);

  const opportunityCost = unsupportedDocTimeHours * SCRIBE_ASSUMPTIONS.providerHourlyRate;

  const abridgeEncounters = Math.round(annualEncounters * SCRIBE_ASSUMPTIONS.abridgeUtilization);
  const timeSavedValue = (abridgeEncounters * SCRIBE_ASSUMPTIONS.abridgeTimeSavedPerEncounter / 60) 
    * SCRIBE_ASSUMPTIONS.providerHourlyRate * 0.2;
  const wrvuValue = abridgeEncounters * SCRIBE_ASSUMPTIONS.abridgeWrvuLift 
    * SCRIBE_ASSUMPTIONS.wrvuDollarValue * SCRIBE_ASSUMPTIONS.wrvuAttribution;
  const abridgeValueCreated = Math.round(timeSavedValue + wrvuValue);

  return {
    coveragePercent,
    providersWithoutSupport,
    totalScribeCost,
    costPerProviderCovered,
    scribeRatio,
    scribesNeededForFullCoverage,
    fullScribeCost,
    costToScale,
    abridgeCost,
    savingsVsFullScribe,
    encountersPerProvider,
    unsupportedDocTimeHours,
    pajamaTimeHours,
    opportunityCost,
    abridgeValueCreated,
  };
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function getScalingDataPoints(inputs: ScribeInputs, calculations: ScribeCalculations) {
  const points = [];
  const costPerScribe = inputs.scribeCostPerHour * inputs.scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;
  
  for (let coverage = 0; coverage <= 100; coverage += 10) {
    const providersAtCoverage = Math.round(inputs.totalProviders * (coverage / 100));
    const scribesNeeded = Math.ceil(providersAtCoverage / calculations.scribeRatio);
    const scribeCostAtCoverage = scribesNeeded * costPerScribe;
    const abridgeCostAtCoverage = providersAtCoverage * SCRIBE_ASSUMPTIONS.abridgeCostPerProvider;
    
    points.push({
      coverage,
      scribeCost: scribeCostAtCoverage,
      abridgeCost: abridgeCostAtCoverage,
    });
  }
  
  return points;
}
