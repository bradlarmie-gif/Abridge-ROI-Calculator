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
    1: 'Not yet captured',
    2: 'Informally tracked',
    3: 'Actively managed',
    4: 'Systematically deployed',
  },
  revenue: {
    1: 'Not connected',
    2: 'Some improvement',
    3: 'Actively managed',
    4: 'Revenue infrastructure',
  },
  workforce: {
    1: 'Surveys only',
    2: 'Scores improved',
    3: 'Burden measured',
    4: 'Retention connected',
  },
  risk: {
    1: 'Not connected',
    2: 'Note completeness',
    3: 'Audit ready',
    4: 'Future ready',
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
  if (domain === 'capacity') {
    const base: Record<number, number> = { 1: 15, 2: 35, 3: 65, 4: 90 };
    const b = base[level] || 0;
    if (level === 2) {
      const redeployment = (inputs.redeployment as number) || 20;
      return Math.round(b + (redeployment / 100) * 20);
    }
    if (level === 3) {
      const monthlyOT = (inputs.monthlyOT as number) || 0;
      const monthlyPatients = (inputs.monthlyPatients as number) || 0;
      const inputScore = Math.min(20, Math.round((monthlyOT + monthlyPatients * 200) / 1000));
      return Math.min(85, b + inputScore);
    }
    return b;
  }
  if (domain === 'revenue') {
    return ({ 1: 10, 2: 30, 3: 62, 4: 88 } as Record<number, number>)[level] || 0;
  }
  if (domain === 'workforce') {
    return ({ 1: 20, 2: 40, 3: 65, 4: 85 } as Record<number, number>)[level] || 0;
  }
  return ({ 1: 15, 2: 38, 3: 62, 4: 90 } as Record<number, number>)[level] || 0;
}

export function computeCapacityFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  timeSavings: number,
): DomainFeedback {
  const totalCapacityValue = providers * 2000 * (4.0 - timeSavings) / 60 * 150 * 0.25;
  const totalHours = Math.round(providers * 2000 * (4.0 - timeSavings) / 60);
  const fte = (totalHours / 2080).toFixed(1);

  if (level === 1) {
    return {
      label: 'Estimated undeployed capacity value',
      value: Math.round(totalCapacityValue),
      context: `At your scale, undeployed recovered time represents an estimated ${totalHours.toLocaleString()} hours annually \u2014 ${fte} FTE of clinical capacity currently evaporating.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  if (level === 2) {
    const redeployment = (inputs.redeployment as number) || 20;
    const captured = Math.round(totalCapacityValue * (redeployment / 100));
    const gap = Math.round(totalCapacityValue - captured);
    return {
      label: 'Estimated undeployed capacity value',
      value: Math.max(0, gap),
      context: `At ${redeployment}% redeployment, approximately ${formatDollar(captured)} is being captured. ${formatDollar(gap)} remains undeployed annually.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  if (level === 3) {
    const monthlyOT = (inputs.monthlyOT as number) || 0;
    const monthlyPatients = (inputs.monthlyPatients as number) || 0;
    const annualOT = monthlyOT * 12;
    const annualBacklog = monthlyPatients * 200 * 12;
    const total = annualOT + annualBacklog;
    const nextLayer = Math.max(0, Math.round(totalCapacityValue - total));
    return {
      label: 'Estimated remaining capacity opportunity',
      value: nextLayer,
      context: `You're capturing the efficiency layer. Systematic capacity deployment could add an estimated ${formatDollar(nextLayer)} annually.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  const additionalPatients = (inputs.additionalPatients as number) || 0;
  const revenuePerVisit = (inputs.revenuePerVisit as number) || 200;
  const annualValue = Math.round(additionalPatients * revenuePerVisit * 12);
  return {
    label: 'Estimated capacity deployment value',
    value: annualValue,
    context: `Strong activation. Your capacity deployment is generating an estimated ${formatDollar(annualValue)} annually.`,
    footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
  };
}

export function computeRevenueFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  annualEncounters: number,
  utilization: number,
): DomainFeedback {
  const util = utilization / 100;
  if (level === 1) {
    const denialLeakage = annualEncounters * 0.07 * 0.35 * 0.30 * 250;
    const codingLeakage = annualEncounters * util * 0.015 * 33;
    const hccLeakage = annualEncounters * util * 0.12 * 25;
    const total = Math.round(denialLeakage + codingLeakage + hccLeakage);
    const low = formatDollar(Math.round(total * 0.7));
    const high = formatDollar(Math.round(total * 1.3));
    return {
      label: 'Estimated revenue leakage',
      value: total,
      context: `At your encounter volume, documentation-driven revenue leakage is estimated at ${low}\u2013${high} annually across denials, undercoding, and HCC capture.`,
      footnote: 'Based on industry benchmarks for denial, coding, and HCC rates',
    };
  }
  if (level === 2) {
    const denialRate = (inputs.denialRate as number) || 7;
    const docDenialCost = annualEncounters * util * (denialRate / 100) * 0.35 * 250;
    const benchmarkCost = annualEncounters * util * 0.04 * 0.35 * 250;
    const gap = Math.max(0, Math.round(docDenialCost - benchmarkCost));
    return {
      label: 'Estimated denial gap',
      value: gap,
      context: `At ${denialRate}% denial rate, documentation-related denials are costing approximately ${formatDollar(gap)} more than benchmark annually.`,
      footnote: 'Benchmark denial rate: 4%',
    };
  }
  if (level === 3) {
    const hccValue = Math.round(annualEncounters * util * 0.12 * 25);
    const codingValue = Math.round(annualEncounters * util * 0.015 * 33);
    const remainingGap = hccValue + codingValue;
    return {
      label: 'Estimated remaining revenue opportunity',
      value: remainingGap,
      context: `Denial management is active. Remaining opportunity in HCC capture and E/M accuracy: estimated ${formatDollar(remainingGap)} annually.`,
      footnote: 'Based on industry HCC and coding benchmarks',
    };
  }
  const wrvuImprovement = (inputs.wrvuImprovement as number) || 0;
  const hccImprovement = (inputs.hccImprovement as number) || 0;
  const wrvuValue = annualEncounters * util * (wrvuImprovement / 100) * 1.5 * 33;
  const hccValue = annualEncounters * util * 0.30 * (hccImprovement / 100) * 1200;
  const total = Math.round(wrvuValue + hccValue);
  return {
    label: 'Estimated revenue activation value',
    value: total,
    context: `Strong revenue activation. Documentation intelligence is generating an estimated ${formatDollar(total)} in annual revenue integrity.`,
    footnote: 'Based on wRVU and HCC improvement rates provided',
  };
}

export function computeWorkforceFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
): DomainFeedback {
  if (level === 1) {
    const afterHours = (inputs.afterHours as number) || 3;
    const annualBurden = Math.round(afterHours * providers * 52);
    const retentionLiability = Math.round(providers * 0.08 * 0.25 * 400000);
    return {
      label: 'Estimated retention liability',
      value: retentionLiability,
      context: `At ${afterHours} hrs/week, your providers carry ${annualBurden.toLocaleString()} hours of after-hours burden annually. Estimated retention liability: ${formatDollar(retentionLiability)}`,
      footnote: 'Based on $400K average physician replacement cost',
    };
  }
  if (level === 2) {
    const turnoverRate = (inputs.turnoverRate as number) || 8;
    const turnoverCost = providers * (turnoverRate / 100) * 400000;
    const docAttributable = Math.round(turnoverCost * 0.25);
    return {
      label: 'Estimated documentation-attributable turnover cost',
      value: docAttributable,
      context: `At ${turnoverRate}% turnover, documentation-attributable departures represent approximately ${formatDollar(docAttributable)} in annual replacement cost.`,
      footnote: 'Documentation burden attributed to 25% of physician turnover',
    };
  }
  if (level === 3) {
    const turnoverRate = (inputs.turnoverRate as number) || 8;
    const remainingLiability = Math.round(providers * (turnoverRate / 100) * 0.20 * 400000);
    return {
      label: 'Estimated remaining workforce exposure',
      value: remainingLiability,
      context: `Meaningful progress. Remaining after-hours burden still represents ${formatDollar(remainingLiability)} in workforce stability exposure.`,
      footnote: 'Based on $400K average physician replacement cost',
    };
  }
  const turnoverReduction = (inputs.turnoverReduction as number) || 0;
  const otSavings = (inputs.otSavings as number) || 0;
  const turnoverSavings = Math.round(providers * (turnoverReduction / 100) * 400000);
  const total = turnoverSavings + (otSavings * 12);
  return {
    label: 'Estimated workforce stability value',
    value: total,
    context: `Strong workforce activation. Documentation intelligence is generating ${formatDollar(total)} in workforce stability value annually.`,
    footnote: 'Based on turnover savings and OT/agency spend reduction',
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
    const defensibility = (inputs.defensibility as string) || 'Medium';
    const multiplier: Record<string, number> = { Low: 0.012, Medium: 0.007, High: 0.003 };
    const annualRevenue = annualEncounters * 200;
    const exposure = Math.round(annualRevenue * (multiplier[defensibility] || 0.007));
    return {
      label: 'Estimated compliance exposure',
      value: exposure,
      context: `Organizations at this defensibility level carry an estimated ${formatDollar(exposure)} in annual audit and quality reporting exposure \u2014 plus structural limitations on automation readiness.`,
      footnote: 'Based on industry audit exposure benchmarks',
    };
  }
  if (level === 2) {
    const auditReady = (inputs.auditReady as number) || 50;
    const gap = 100 - auditReady;
    const exposureValue = Math.round(annualEncounters * util * (gap / 100) * 15);
    return {
      label: 'Estimated compliance exposure',
      value: exposureValue,
      context: `At ${auditReady}% audit readiness, your compliance exposure is approximately ${formatDollar(exposureValue)} annually. Automation readiness remains the larger long-term gap.`,
      footnote: 'Based on per-encounter audit exposure rate',
    };
  }
  if (level === 3) {
    const queryRate = (inputs.queryRate as number) || 15;
    const queryCost = (inputs.queryCost as number) || 45;
    const cdiCost = (annualEncounters / 1000) * queryRate * queryCost;
    const benchmarkCost = (annualEncounters / 1000) * 8 * queryCost;
    const gap = Math.max(0, Math.round(cdiCost - benchmarkCost));
    return {
      label: 'Estimated CDI gap',
      value: gap,
      context: `Solid risk posture. Primary remaining exposure is automation readiness \u2014 the structured data foundation for your next-generation initiatives.`,
      footnote: 'CDI benchmark: 8 queries per 1,000 encounters',
    };
  }
  const initiatives = (inputs.initiatives as string) || '1\u20132';
  const initiativeMultiplier: Record<string, number> = { '1\u20132': 1, '3\u20135': 2.5, '5+': 4 };
  const foundationValue = Math.round(annualEncounters * 0.002 * (initiativeMultiplier[initiatives] || 1) * 1000);
  return {
    label: 'Estimated infrastructure foundation value',
    value: foundationValue,
    context: `Your documentation infrastructure is actively building the foundation for ${initiatives} planned initiatives. This is the highest-leverage infrastructure investment in your roadmap.`,
    footnote: 'Based on initiative count and encounter volume',
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
