import { formatDollar } from "./ambientCalculator";

export type Domain = 'capacity' | 'revenue' | 'workforce' | 'risk';
export type ActivationLevel = 1 | 2 | 3 | 4;

export const DOMAIN_ORDER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  capacity: 'Capacity',
  revenue: 'Revenue',
  workforce: 'Workforce',
  risk: 'Risk',
};

export const ACTIVATION_LABELS: Record<Domain, Record<ActivationLevel, string>> = {
  capacity: {
    1: 'Time Saved, Not Deployed',
    2: 'Ad Hoc Access Relief',
    3: 'Structured Access Expansion',
    4: 'Institutionalized Capacity Strategy',
  },
  revenue: {
    1: 'Documentation Neutral',
    2: 'Anecdotal Coding Lift',
    3: 'Measured Yield Integrity',
    4: 'Financial Governance Embedded',
  },
  workforce: {
    1: 'Pajama Time Reduced',
    2: 'Work Out of Work Reduced',
    3: 'Turnover Risk Managed',
    4: 'Labor Volatility Strategically Reduced',
  },
  risk: {
    1: 'Cleaner Clinical Notes',
    2: 'Audit Awareness',
    3: 'Reporting Friction Reduced',
    4: 'Governed Compliance Infrastructure',
  },
};

export const DOMAIN_WEIGHTS: Record<Domain, number> = {
  capacity: 0.30,
  revenue: 0.25,
  workforce: 0.25,
  risk: 0.20,
};

export interface DomainFeedback {
  label: string;
  value: number;
  context: string;
  footnote: string;
}

export function computeDomainScore(domain: Domain, level: ActivationLevel, inputs: Record<string, number | string>): number {
  const baseScores: Record<Domain, Record<number, number>> = {
    capacity: { 1: 15, 2: 35, 3: 65, 4: 90 },
    revenue: { 1: 10, 2: 30, 3: 62, 4: 88 },
    workforce: { 1: 20, 2: 40, 3: 65, 4: 85 },
    risk: { 1: 15, 2: 38, 3: 62, 4: 90 },
  };

  const base = baseScores[domain]?.[level] || 0;

  if (domain === 'capacity' && level === 2) {
    const redeployment = (inputs.redeployment as number) || 10;
    return Math.round(base + (redeployment / 25) * 20);
  }
  if (domain === 'capacity' && level === 3) {
    const patients = (inputs.additionalPatients as number) || 0;
    const inputScore = Math.min(20, Math.round(patients / 5));
    return Math.min(85, base + inputScore);
  }

  return base;
}

export function computeCapacityFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  timeSavings: number,
): DomainFeedback {
  const recoveredHoursPerYear = Math.round(providers * 2000 * (3.0 - timeSavings) / 60);
  const fte = (recoveredHoursPerYear / 2080).toFixed(1);

  if (level === 1) {
    return {
      label: 'Recovered time \u2014 not yet deployed',
      value: 0,
      context: `At your scale, recovered documentation time represents an estimated ${recoveredHoursPerYear.toLocaleString()} hours annually (${fte} FTE equivalent). This time reduces friction \u2014 but is not structurally creating capacity.`,
      footnote: 'Redeployment = 0%. No capacity value claimed at this level.',
    };
  }

  if (level === 2) {
    const redeployment = (inputs.redeployment as number) || 10;
    const redeployedHours = Math.round(recoveredHoursPerYear * (redeployment / 100));
    const estimatedValue = Math.round(redeployedHours * 150);
    return {
      label: 'Estimated ad hoc capacity value',
      value: estimatedValue,
      context: `At ${redeployment}% redeployment, approximately ${redeployedHours.toLocaleString()} recovered hours are translating into additional visits \u2014 estimated at ${formatDollar(estimatedValue)} annually.`,
      footnote: 'Recovered hours \u00d7 estimated redeployment %. $150/hr blended visit value.',
    };
  }

  if (level === 3) {
    const additionalPatients = (inputs.additionalPatients as number) || 0;
    const revenuePerVisit = (inputs.revenuePerVisit as number) || 200;
    const annualValue = Math.round(additionalPatients * revenuePerVisit * 12);
    return {
      label: 'Estimated structured capacity value',
      value: annualValue,
      context: `${additionalPatients} additional patients per month at ${formatDollar(revenuePerVisit)} per visit generates an estimated ${formatDollar(annualValue)} in annual capacity value.`,
      footnote: 'Patients \u00d7 revenue per visit \u00d7 12 months.',
    };
  }

  const visitGrowth = (inputs.visitGrowthPerProvider as number) || 0;
  const revenuePerVisit = (inputs.revenuePerVisit as number) || 200;
  const annualValue = Math.round(visitGrowth * providers * revenuePerVisit * 12);
  return {
    label: 'Estimated institutionalized capacity value',
    value: annualValue,
    context: `${visitGrowth} net visits per provider per month across ${providers} providers at ${formatDollar(revenuePerVisit)} per visit \u2014 estimated ${formatDollar(annualValue)} in annual capacity deployment.`,
    footnote: 'Net visit growth per provider \u00d7 providers \u00d7 revenue per visit \u00d7 12.',
  };
}

export function computeRevenueFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  annualEncounters: number,
  utilization: number,
): DomainFeedback {
  const util = utilization / 100;
  const baseRevenuePerEncounter = 200;

  if (level === 1) {
    const conservativeYield = Math.round(annualEncounters * util * baseRevenuePerEncounter * 0.005);
    return {
      label: 'Conservative baseline yield estimate',
      value: conservativeYield,
      context: `At your encounter volume, conservative documentation-driven yield is estimated at ${formatDollar(conservativeYield)} annually. This is a baseline \u2014 actual impact is not being measured.`,
      footnote: 'Conservative 0.5% baseline yield on utilized encounters. Directional only.',
    };
  }

  if (level === 2) {
    const yieldDelta = (inputs.yieldDelta as number) || 2;
    const directionalValue = Math.round(annualEncounters * util * baseRevenuePerEncounter * (yieldDelta / 100));
    return {
      label: 'Estimated directional yield impact',
      value: directionalValue,
      context: `At an estimated ${yieldDelta}% yield improvement, documentation-driven revenue impact is approximately ${formatDollar(directionalValue)} annually. This is directional modeling \u2014 not yet measured.`,
      footnote: 'Directional modeling based on estimated yield delta. Not independently verified.',
    };
  }

  if (level === 3) {
    const measuredLift = (inputs.measuredYieldLift as number) || 0;
    const measuredValue = Math.round(annualEncounters * util * baseRevenuePerEncounter * (measuredLift / 100));
    return {
      label: 'Measured yield integrity value',
      value: measuredValue,
      context: `At a measured ${measuredLift}% yield lift, documentation intelligence is generating an estimated ${formatDollar(measuredValue)} in verified annual revenue impact.`,
      footnote: 'Applied directly to exposure base using measured yield lift.',
    };
  }

  const recognizedRevenue = (inputs.recognizedRevenue as number) || 0;
  return {
    label: 'Recognized revenue impact',
    value: recognizedRevenue,
    context: recognizedRevenue > 0
      ? `${formatDollar(recognizedRevenue)} in recognized revenue change tied to documentation improvements and embedded in financial reporting.`
      : 'Enter the recognized revenue change tied to documentation improvements.',
    footnote: 'Recognized revenue impact as reported in financial governance.',
  };
}

export function computeWorkforceFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
): DomainFeedback {
  if (level === 1) {
    const afterHoursReduction = (inputs.afterHoursReduction as number) || 2;
    const annualHoursSaved = Math.round(afterHoursReduction * providers * 52);
    const hourlyRate = 150;
    const estimatedValue = Math.round(annualHoursSaved * hourlyRate);
    return {
      label: 'Estimated pajama time reduction value',
      value: estimatedValue,
      context: `${afterHoursReduction} hrs/week reduced across ${providers} providers = ${annualHoursSaved.toLocaleString()} hours of after-hours burden eliminated annually, valued at ${formatDollar(estimatedValue)}.`,
      footnote: 'After-hours reduction \u00d7 providers \u00d7 52 weeks \u00d7 $150/hr blended rate.',
    };
  }

  if (level === 2) {
    const editTimeSaved = (inputs.editTimeSaved as number) || 15;
    const annualMinutesSaved = Math.round(editTimeSaved * providers * 250);
    const annualHoursSaved = Math.round(annualMinutesSaved / 60);
    const estimatedValue = Math.round(annualHoursSaved * 100);
    return {
      label: 'Estimated edit/review time savings',
      value: estimatedValue,
      context: `${editTimeSaved} min/day reduced across ${providers} providers = ${annualHoursSaved.toLocaleString()} hours of administrative burden eliminated annually, valued at ${formatDollar(estimatedValue)}.`,
      footnote: 'Minutes saved \u00d7 providers \u00d7 250 working days, at $100/hr administrative rate.',
    };
  }

  if (level === 3) {
    const turnoverRate = (inputs.turnoverRate as number) || 8;
    const replacementCost = (inputs.replacementCost as number) || 400000;
    const docAttributable = 0.25;
    const turnoverLiability = Math.round(providers * (turnoverRate / 100) * replacementCost * docAttributable);
    return {
      label: 'Estimated documentation-attributable turnover exposure',
      value: turnoverLiability,
      context: `At ${turnoverRate}% turnover and ${formatDollar(replacementCost)} replacement cost, documentation-attributable departures represent approximately ${formatDollar(turnoverLiability)} in annual exposure.`,
      footnote: 'Documentation burden attributed to ~25% of physician turnover (industry estimate).',
    };
  }

  const agencyAvoided = (inputs.agencyAvoided as number) || 0;
  const overtimeReduction = (inputs.overtimeReduction as number) || 0;
  const annualValue = Math.round((agencyAvoided + overtimeReduction) * 12);
  return {
    label: 'Estimated labor volatility reduction',
    value: annualValue,
    context: annualValue > 0
      ? `${formatDollar(annualValue)} in annualized agency and overtime spend reduction through structural documentation intelligence.`
      : 'Enter monthly agency spend avoided and overtime reduction to calculate impact.',
    footnote: 'Agency spend avoided + overtime reduction \u00d7 12 months.',
  };
}

export function computeRiskFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  annualEncounters: number,
  utilization: number,
): DomainFeedback {
  const util = utilization / 100;

  if (level === 1) {
    const baselineExposure = Math.round(annualEncounters * util * 0.007 * 200);
    return {
      label: 'Baseline compliance exposure',
      value: baselineExposure,
      context: `At your encounter volume, baseline documentation-related compliance exposure is estimated at ${formatDollar(baselineExposure)} annually. Cleaner notes improve quality but audit posture is unchanged.`,
      footnote: 'Based on 0.7% documentation-related audit exposure rate. No inputs required.',
    };
  }

  if (level === 2) {
    const improvement = (inputs.defensibilityImprovement as number) || 10;
    const baseExposure = annualEncounters * util * 0.007 * 200;
    const reducedExposure = Math.round(baseExposure * (improvement / 100));
    const remainingExposure = Math.round(baseExposure - reducedExposure);
    return {
      label: 'Estimated exposure reduction',
      value: reducedExposure,
      context: `At ${improvement}% defensibility improvement, approximately ${formatDollar(reducedExposure)} in compliance exposure is being addressed. ${formatDollar(remainingExposure)} in estimated exposure remains.`,
      footnote: 'Baseline exposure \u00d7 estimated defensibility improvement %.',
    };
  }

  if (level === 3) {
    const reportingHours = (inputs.reportingHoursReduced as number) || 0;
    const annualSavings = Math.round(reportingHours * 12 * 75);
    return {
      label: 'Estimated reporting friction savings',
      value: annualSavings,
      context: reportingHours > 0
        ? `${reportingHours} hours/month in reduced quality reporting and chart abstraction = ${formatDollar(annualSavings)} in annual operational savings.`
        : 'Enter monthly reporting hours reduced to calculate operational savings.',
      footnote: 'Reporting hours \u00d7 12 months \u00d7 $75/hr abstraction rate.',
    };
  }

  const auditReduction = (inputs.auditFindingsReduced as number) || 0;
  const complianceExposure = (inputs.complianceExposure as number) || 0;
  const totalValue = complianceExposure > 0 ? complianceExposure : Math.round(annualEncounters * util * 0.007 * 200 * (auditReduction / 100));
  return {
    label: 'Estimated governed compliance value',
    value: totalValue,
    context: totalValue > 0
      ? `Documentation intelligence is reducing compliance exposure by an estimated ${formatDollar(totalValue)} annually through governed infrastructure.`
      : 'Enter audit findings reduced or compliance exposure estimate to calculate impact.',
    footnote: 'Based on audit findings reduction or direct compliance exposure estimate.',
  };
}

export function computeGapForDomain(
  domain: Domain,
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  annualEncounters: number,
  utilization: number,
  timeSavings: number,
): number {
  switch (domain) {
    case 'capacity': return computeCapacityFeedback(level, inputs, providers, timeSavings).value;
    case 'revenue': return computeRevenueFeedback(level, inputs, annualEncounters, utilization).value;
    case 'workforce': return computeWorkforceFeedback(level, inputs, providers).value;
    case 'risk': return computeRiskFeedback(level, inputs, annualEncounters, utilization).value;
  }
}

export function scoreToActivationLevel(domain: Domain, score: number): ActivationLevel {
  const thresholds: Record<Domain, number[]> = {
    capacity: [15, 35, 65, 90],
    revenue: [10, 30, 62, 88],
    workforce: [20, 40, 65, 85],
    risk: [15, 38, 62, 90],
  };
  const bases = thresholds[domain];
  for (let i = bases.length - 1; i >= 0; i--) {
    if (score >= bases[i] - 5) return (i + 1) as ActivationLevel;
  }
  return 1;
}
