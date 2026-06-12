export interface ScribeInputs {
  scribeCount: number;
  scribeCostPerHour: number;
  scribeHoursPerWeek: number;
  providersWithScribes: number;
  totalProviders: number;
  annualEncounters: number;
  minutesPerEncounter: number;
  turnoverRate: number;
  trainingCostPerScribe: number;
}

export interface ScribeCalculations {
  coveragePercent: number;
  providersWithoutSupport: number;
  totalScribeCost: number;
  scribeRatio: number;
  scalingRatio: number;
  scribesNeededForFullCoverage: number;
  additionalScribesNeeded: number;
  fullScribeCost: number;
  costToScale: number;
  encountersPerProvider: number;
  unsupportedDocTimeHours: number;
  pajamaTimeHours: number;
  docTimePerUnsupportedProvider: number;
  scribeSalaryAnnual: number;
  // True cost (single source of truth — consumed by ScribeFullAnalysis + the PDF)
  annualTurnoverCost: number;
  managementOverhead: number;
  totalHiddenCosts: number;
  trueTotalCost: number;
  trueCostPerProvider: number;
  hiddenCostPercent: number;
  scaleMultiplier: number;
  fullCoverageTrueCost: number;
  scribeReplacements: number;
}

export const SCRIBE_ASSUMPTIONS = {
  scribeToProviderRatio: 1.5,
  weeksPerYear: 50,
  minutesPerEncounterDefault: 10,
  pajamaTimePercent: 0.25,
  turnoverRateDefault: 40,
  trainingCostDefault: 5000,
  managementOverheadPercent: 0.15,
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

  // The honest current ratio (providers per scribe) — shown as "today" state.
  const scribeRatio = scribeCount > 0
    ? Math.round((providersWithScribes / scribeCount) * 10) / 10
    : SCRIBE_ASSUMPTIONS.scribeToProviderRatio;

  // For the full-coverage projection we never assume staffing richer than the
  // industry default (1.5 providers/scribe). This keeps scaling costs realistic
  // for generously-staffed programs and guards against a divide-by-zero when
  // providersWithScribes is 0 (scribeRatio === 0).
  const scalingRatio = Math.max(scribeRatio, SCRIBE_ASSUMPTIONS.scribeToProviderRatio);

  const scribeSalaryAnnual = scribeCostPerHour * scribeHoursPerWeek * SCRIBE_ASSUMPTIONS.weeksPerYear;
  const totalScribeCost = scribeCount * scribeSalaryAnnual;

  const scribesNeededForFullCoverage = Math.ceil(totalProviders / scalingRatio);
  const additionalScribesNeeded = Math.max(0, scribesNeededForFullCoverage - scribeCount);
  const fullScribeCost = scribesNeededForFullCoverage * scribeSalaryAnnual;

  const costToScale = Math.max(0, fullScribeCost - totalScribeCost);

  const encountersPerProvider = totalProviders > 0
    ? Math.round(annualEncounters / totalProviders)
    : 0;

  const unsupportedEncounters = totalProviders > 0
    ? Math.round(annualEncounters * (providersWithoutSupport / totalProviders))
    : 0;

  const minutesPerEncounter = inputs.minutesPerEncounter > 0
    ? inputs.minutesPerEncounter
    : SCRIBE_ASSUMPTIONS.minutesPerEncounterDefault;

  const unsupportedDocTimeHours = Math.round(
    (unsupportedEncounters * minutesPerEncounter) / 60
  );

  const pajamaTimeHours = Math.round(unsupportedDocTimeHours * SCRIBE_ASSUMPTIONS.pajamaTimePercent);

  const docTimePerUnsupportedProvider = providersWithoutSupport > 0
    ? Math.round(unsupportedDocTimeHours / providersWithoutSupport)
    : 0;

  // ── True cost (turnover + management overhead on top of direct salary) ──
  const turnoverRate = (inputs.turnoverRate > 0 ? inputs.turnoverRate : SCRIBE_ASSUMPTIONS.turnoverRateDefault) / 100;
  const trainingCostPerScribe = inputs.trainingCostPerScribe > 0
    ? inputs.trainingCostPerScribe
    : SCRIBE_ASSUMPTIONS.trainingCostDefault;
  const scribeReplacements = Math.round(scribeCount * turnoverRate);
  const annualTurnoverCost = Math.round(scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(totalScribeCost * SCRIBE_ASSUMPTIONS.managementOverheadPercent);
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = totalScribeCost + totalHiddenCosts;
  const trueCostPerProvider = providersWithScribes > 0
    ? Math.round(trueTotalCost / providersWithScribes)
    : 0;
  const hiddenCostPercent = totalScribeCost > 0
    ? Math.round((totalHiddenCosts / totalScribeCost) * 100)
    : 0;
  const scaleMultiplier = totalScribeCost > 0
    ? Math.round((fullScribeCost / totalScribeCost) * 10) / 10
    : 1;
  const fullCoverageTrueCost = Math.round(fullScribeCost * (1 + hiddenCostPercent / 100));

  return {
    coveragePercent,
    providersWithoutSupport,
    totalScribeCost,
    scribeRatio,
    scalingRatio,
    scribesNeededForFullCoverage,
    additionalScribesNeeded,
    fullScribeCost,
    costToScale,
    encountersPerProvider,
    unsupportedDocTimeHours,
    pajamaTimeHours,
    docTimePerUnsupportedProvider,
    scribeSalaryAnnual,
    annualTurnoverCost,
    managementOverhead,
    totalHiddenCosts,
    trueTotalCost,
    trueCostPerProvider,
    hiddenCostPercent,
    scaleMultiplier,
    fullCoverageTrueCost,
    scribeReplacements,
  };
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    const k = Math.round(value / 1000);
    // Avoid "$1000K" at the rounding boundary — roll up to millions.
    if (Math.abs(k) >= 1000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${k}K`;
  }
  return `$${value.toLocaleString()}`;
}
