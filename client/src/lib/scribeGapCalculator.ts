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
  additionalScribesNeeded: number;
  fullScribeCost: number;
  costToScale: number;
  encountersPerProvider: number;
  unsupportedDocTimeHours: number;
  pajamaTimeHours: number;
  docTimePerUnsupportedProvider: number;
  scribeSalaryAnnual: number;
}

export const SCRIBE_ASSUMPTIONS = {
  scribeToProviderRatio: 1.5,
  weeksPerYear: 50,
  minutesPerEncounterWithoutScribe: 12,
  pajamaTimePercent: 0.25,
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
    ? Math.round((providersWithScribes / scribeCount) * 10) / 10
    : SCRIBE_ASSUMPTIONS.scribeToProviderRatio;

  const scribeSalaryAnnual = scribeCostPerHour * scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;
  const totalScribeCost = scribeCount * scribeSalaryAnnual;

  const costPerProviderCovered = providersWithScribes > 0
    ? Math.round(totalScribeCost / providersWithScribes)
    : 0;

  const scribesNeededForFullCoverage = Math.ceil(totalProviders / scribeRatio);
  const additionalScribesNeeded = Math.max(0, scribesNeededForFullCoverage - scribeCount);
  const fullScribeCost = scribesNeededForFullCoverage * scribeSalaryAnnual;

  const costToScale = Math.max(0, fullScribeCost - totalScribeCost);

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

  const docTimePerUnsupportedProvider = providersWithoutSupport > 0
    ? Math.round(unsupportedDocTimeHours / providersWithoutSupport)
    : 0;

  return {
    coveragePercent,
    providersWithoutSupport,
    totalScribeCost,
    costPerProviderCovered,
    scribeRatio,
    scribesNeededForFullCoverage,
    additionalScribesNeeded,
    fullScribeCost,
    costToScale,
    encountersPerProvider,
    unsupportedDocTimeHours,
    pajamaTimeHours,
    docTimePerUnsupportedProvider,
    scribeSalaryAnnual,
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
  const points: { coverage: number; scribeCost: number; currentPosition?: boolean }[] = [];
  const costPerScribe = inputs.scribeCostPerHour * inputs.scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;
  const currentCoverage = calculations.coveragePercent;
  
  // Generate points every 10% for clean axis display
  for (let coverage = 0; coverage <= 100; coverage += 10) {
    const providersAtCoverage = Math.round(inputs.totalProviders * (coverage / 100));
    const scribesNeeded = Math.ceil(providersAtCoverage / calculations.scribeRatio);
    const scribeCostAtCoverage = scribesNeeded * costPerScribe;
    
    points.push({
      coverage,
      scribeCost: scribeCostAtCoverage,
      currentPosition: coverage === currentCoverage,
    });
  }
  
  // Add current position if not already included at a 10% interval
  if (currentCoverage > 0 && currentCoverage < 100 && currentCoverage % 10 !== 0) {
    const providersAtCoverage = Math.round(inputs.totalProviders * (currentCoverage / 100));
    const scribesNeeded = Math.ceil(providersAtCoverage / calculations.scribeRatio);
    const scribeCostAtCoverage = scribesNeeded * costPerScribe;
    
    points.push({
      coverage: currentCoverage,
      scribeCost: scribeCostAtCoverage,
      currentPosition: true,
    });
    
    // Re-sort by coverage
    points.sort((a, b) => a.coverage - b.coverage);
  }
  
  return points;
}
