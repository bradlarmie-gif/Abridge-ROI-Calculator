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
    1: 'Time Recovered. No Decision Made About It.',
    2: 'Total Recovery Quantified. Opportunity Identified.',
    3: 'Capacity Redeployed Into Patient Access.',
    4: 'Capacity Drives Staffing and Growth Decisions.',
  },
  revenue: {
    1: 'Revenue Cycle Has Not Been Asked.',
    2: 'Revenue Cycle Is Investigating.',
    3: 'Revenue Impact Measured and Attributed.',
    4: 'Documentation Quality Is a Managed Revenue Input.',
  },
  workforce: {
    1: 'Providers Report Less After-Hours Work. Not Measured Yet.',
    2: 'Burden Reduction Measured and Validated.',
    3: 'Retention Risk Calculated Against Burden Reduction.',
    4: 'Labor Spend Is Structurally Declining.',
  },
  risk: {
    1: 'Documentation Quality Improved. Exposure Still Invisible.',
    2: 'Documentation Quality Is Being Monitored.',
    3: 'Documentation Quality Is Closing Revenue and Compliance Gaps.',
    4: 'Documentation Is a Governed Strategic Asset.',
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
  value: number | null;
  hasValue: boolean;
  context: string;
  formula: string;
  footnote: string;
  headlineMetric?: string;
  costOfWaiting?: string;
}

export const SCORE_MAP: Record<ActivationLevel, number> = { 1: 6, 2: 12, 3: 19, 4: 25 };

export function computeDomainScore(domain: Domain, level: ActivationLevel, inputs: Record<string, number | string>): number {
  const base = SCORE_MAP[level] || 0;
  if (domain === 'workforce' && (level === 3 || level === 4)) {
    if (level === 3) {
      const turnoverRate = inputs.turnoverRate as number | undefined;
      const replacementCost = inputs.replacementCost as number | undefined;
      if (!turnoverRate || turnoverRate <= 0 || !replacementCost || replacementCost <= 0) {
        return 12;
      }
    }
    if (level === 4) {
      const agencyReduction = inputs.agencyReduction as number | undefined;
      if (!agencyReduction || agencyReduction <= 0) {
        return 15;
      }
    }
  }
  return base;
}

export function computeCapacityFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  documentedEncounters: number,
  revenuePerVisit: number,
  providerRate: number,
): DomainFeedback {
  const timeSaved = inputs.timeSaved as number | undefined;
  const hasTimeSaved = timeSaved !== undefined && timeSaved > 0;
  const unmeasuredChecked = inputs.unmeasuredTime === 'true';

  if (level === 1) {
    if (!hasTimeSaved && !unmeasuredChecked) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Time savings not yet measured. Enter estimated time saved per encounter, or check "I haven\'t measured this" to continue.',
        formula: '',
        footnote: '',
      };
    }
    const ts = hasTimeSaved ? timeSaved! : 0;
    const recoveredHours = Math.round(documentedEncounters * ts / 60);
    const fte = (recoveredHours / 2080).toFixed(1);
    const potentialAt20 = Math.round(recoveredHours * providerRate * 0.20);
    const monthlyCost = Math.round(potentialAt20 / 12);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours recovered. $0 captured.`,
      context: `Your providers are recovering an estimated ${recoveredHours.toLocaleString()} hours annually — ${fte} FTE equivalent. None of this time is being structurally redeployed. Schedules and panel sizes are unchanged.\n\nAt ${formatDollar(providerRate)}/hr with even 20% redeployment, that's ${formatDollar(potentialAt20)}/year your organization is currently not capturing.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}\n[redeployment] = 0% — no decision made`,
      footnote: 'Redeployment = 0%. No dollar value claimed at this level — time is recovered but not yet deployed.',
      costOfWaiting: `Every month at this level costs you ${formatDollar(monthlyCost)}.`,
    };
  }

  if (level === 2) {
    const ts = (inputs.timeSaved as number) || 0;
    const aggregated = inputs.capacityAggregated as string | undefined;
    if (!hasTimeSaved && !unmeasuredChecked) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter time saved per encounter to see your recovered capacity.',
        formula: '',
        footnote: '',
      };
    }
    const calculatedHours = Math.round(documentedEncounters * ts / 60);
    const recoveredHours = aggregated === 'yes' && (inputs.confirmedHours as number) > 0
      ? (inputs.confirmedHours as number)
      : calculatedHours;
    const fte = (recoveredHours / 2080).toFixed(1);
    const opportunityLow = Math.round(recoveredHours * providerRate * 0.20);
    const opportunityHigh = Math.round(recoveredHours * providerRate * 0.35);
    const monthlyLow = Math.round(opportunityLow / 12);
    const monthlyHigh = Math.round(opportunityHigh / 12);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours quantified. ${formatDollar(opportunityLow)}–${formatDollar(opportunityHigh)} in reachable value.`,
      context: `Your organization has quantified ${recoveredHours.toLocaleString()} recovered hours annually (${fte} FTE equivalent). The number exists. The question is whether your organization has decided what to do with it.\n\nOrganizations that present this number to leadership and schedule an operational response capture value within 60–90 days. Organizations that don't are still at this level 12 months later.`,
      formula: `[recoveredHours] = ${documentedEncounters.toLocaleString()} × ${ts} min / 60 = ${calculatedHours.toLocaleString()}${aggregated === 'yes' ? `\n[confirmedHours] = ${recoveredHours.toLocaleString()} (organization-confirmed)` : ''}\n[FTE] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}\n[opportunityLow] = ${recoveredHours.toLocaleString()} × ${formatDollar(providerRate)} × 20% = ${formatDollar(opportunityLow)}\n[opportunityHigh] = ${recoveredHours.toLocaleString()} × ${formatDollar(providerRate)} × 35% = ${formatDollar(opportunityHigh)}`,
      footnote: 'Dollar value: $0 — time is quantified but not yet deployed through operational changes.',
      costOfWaiting: `Each month without an operational decision = ${formatDollar(monthlyLow)}–${formatDollar(monthlyHigh)} in unrealized capacity value.`,
    };
  }

  if (level === 3) {
    const additionalPatients = inputs.additionalPatientsPerMonth as number | undefined;
    if (!additionalPatients || additionalPatients <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter additional patients seen per provider per month to calculate capacity impact.',
        formula: '',
        footnote: '',
      };
    }
    const redesignedProviders = (inputs.redesignedProviders as number) > 0 ? (inputs.redesignedProviders as number) : providers;
    const annualAdditionalVisits = additionalPatients * redesignedProviders * 12;
    const capacityValue = Math.round(annualAdditionalVisits * revenuePerVisit);
    const monthlyCost = Math.round(capacityValue / 12);
    return {
      label: 'Estimated Impact',
      value: capacityValue,
      hasValue: true,
      context: `${formatDollar(capacityValue)} in new patient revenue annually. This is recovered capacity converting into real access — patients who couldn't get in before, now seen.\n\nAt ${additionalPatients} additional patients per provider per month across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''}, that's ${annualAdditionalVisits.toLocaleString()} new encounters per year.`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 12 = ${annualAdditionalVisits.toLocaleString()}\n[capacityValue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(capacityValue)}`,
      footnote: 'Revenue per visit inherited from baseline inputs.',
      costOfWaiting: `Each month before full schedule redesign = ${formatDollar(monthlyCost)} in unrealized patient revenue.`,
    };
  }

  const CAPACITY_PLANNING_LABELS = [
    'Avoided or deferred new hires',
    'Absorbed patient volume growth without adding FTEs',
    'Redeployed providers to underserved panels or new sites',
    'Factored into annual FTE / staffing model',
    'Used in business case for new service lines or locations',
  ];
  const planningCsv = inputs.capacityPlanningAreas as string | undefined;
  const fteAvoided = inputs.fteAvoided as number | undefined;
  const annualCostPerFte = (inputs.annualCostPerFte as number) || 350000;
  const checkedSet = new Set((planningCsv || '').split(',').filter(Boolean));
  const checkedLabels = CAPACITY_PLANNING_LABELS.filter((_, i) => checkedSet.has(String(i)));
  const uncheckedLabels = CAPACITY_PLANNING_LABELS.filter((_, i) => !checkedSet.has(String(i)));
  const planCount = checkedLabels.length;

  if (planCount === 0 && (!fteAvoided || fteAvoided <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Select how recovered capacity is being used in planning to see your assessment.',
      formula: '',
      footnote: '',
    };
  }

  if (planCount > 0 && (!fteAvoided || fteAvoided <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${planCount} planning area${planCount > 1 ? 's' : ''} connected`,
      context: `Recovered capacity is a variable in ${planCount} workforce planning area${planCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}\n\nEnter FTEs avoided or deferred to calculate impact.${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  const capacityValue = Math.round((fteAvoided || 0) * annualCostPerFte);
  return {
    label: 'Estimated Impact',
    value: capacityValue,
    hasValue: true,
    headlineMetric: `${formatDollar(capacityValue)} in avoided hiring cost`,
    context: `This is the level where ambient AI stops being a documentation tool and becomes a workforce strategy. ${fteAvoided} FTE of recovered capacity, modeled into your staffing plan, is ${formatDollar(capacityValue)} you didn't spend on recruitment, onboarding, and salary — this year alone.\n\n${planCount > 0 ? `Connected to ${planCount} planning area${planCount > 1 ? 's' : ''}: ${checkedLabels.join(', ')}` : ''}${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
    formula: `[avoidedHireCost] = ${fteAvoided} FTE × ${formatDollar(annualCostPerFte)} / FTE = ${formatDollar(capacityValue)}`,
    footnote: 'Fully-loaded physician FTE cost including salary, benefits, and recruitment.',
  };
}

export function computeRevenueFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  documentedEncounters: number,
  revenuePerVisit: number,
  conversionFactor: number = 33,
): DomainFeedback {
  if (level === 1) {
    const denialExposure = Math.round(documentedEncounters * revenuePerVisit * 0.04);
    const wrvuOpportunity = Math.round(documentedEncounters * 0.10 * conversionFactor);
    const monthlyDenial = Math.round(denialExposure / 12);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${formatDollar(denialExposure)} in annual denial exposure. ${formatDollar(wrvuOpportunity)} in potential wRVU uplift. Nobody has looked at either.`,
      context: `Your revenue cycle is operating as if documentation didn't change — because no one told them it did. This is the most common and most expensive blind spot in ambient AI deployments.\n\nOrganizations that connect revenue cycle to documentation quality within 90 days of deployment identify measurable impact before the first contract renewal.`,
      formula: `[denialExposure] = ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × 4% avg denial rate = ${formatDollar(denialExposure)}\n[wrvuOpportunity] = ${documentedEncounters.toLocaleString()} × 0.10 wRVU × $${conversionFactor} = ${formatDollar(wrvuOpportunity)}`,
      footnote: 'Denial rate: 4% national average. wRVU uplift: 0.10 conservative estimate per encounter.',
      costOfWaiting: `${formatDollar(monthlyDenial)} in monthly denial exposure unmonitored.`,
    };
  }

  if (level === 2) {
    const INVESTIGATION_AREAS = [
      'CDI query volume before vs. after',
      'ICD-10 coding specificity',
      'HCC/risk adjustment capture rates',
      'Claim denial rates related to documentation',
      'wRVU per encounter trends',
      'Collections per encounter',
    ];
    const { checked } = parseCheckedItems(inputs.investigationAreas as string, INVESTIGATION_AREAS);
    const count = checked.length;

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select what your revenue cycle team is analyzing to see projected impact range.',
        formula: '',
        footnote: '',
      };
    }

    const areaRanges: Record<string, [number, number]> = {
      'CDI query volume before vs. after': [Math.round(documentedEncounters * 150 / 1000), Math.round(documentedEncounters * 400 / 1000)],
      'ICD-10 coding specificity': [Math.round(0.1 * documentedEncounters * conversionFactor), Math.round(0.3 * documentedEncounters * conversionFactor)],
      'HCC/risk adjustment capture rates': [Math.round(documentedEncounters * 0.30 * 150), Math.round(documentedEncounters * 0.30 * 400)],
      'Claim denial rates related to documentation': [Math.round(documentedEncounters * revenuePerVisit * 0.01), Math.round(documentedEncounters * revenuePerVisit * 0.01)],
      'wRVU per encounter trends': [Math.round(0.1 * documentedEncounters * conversionFactor), Math.round(0.3 * documentedEncounters * conversionFactor)],
      'Collections per encounter': [Math.round(documentedEncounters * revenuePerVisit * 0.01), Math.round(documentedEncounters * revenuePerVisit * 0.03)],
    };

    let totalLow = 0;
    let totalHigh = 0;
    for (const area of checked) {
      const range = areaRanges[area];
      if (range) {
        totalLow += range[0];
        totalHigh += range[1];
      }
    }
    const monthlyLow = Math.round(totalLow / 12);
    const monthlyHigh = Math.round(totalHigh / 12);

    const checkedLabels = checked.map(shortLabel).join(', ');
    const duration = inputs.investigationDuration as string | undefined;
    const durationNote = duration === '90plus' ? '\n\nThis analysis has been running for 90+ days. Organizations that complete analysis and act on findings within 90 days typically move to Level 3 within a single quarter.' : '';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `Analysis in progress. Potential impact: ${formatDollar(totalLow)}–${formatDollar(totalHigh)} annually.`,
      context: `The analysis is running. Based on what your team is looking at, the potential impact ranges from ${formatDollar(totalLow)} to ${formatDollar(totalHigh)}.\n\nAreas under investigation: ${checkedLabels}${durationNote}`,
      formula: checked.map(area => {
        const range = areaRanges[area];
        return range ? `[${shortLabel(area)}] = ${formatDollar(range[0])}–${formatDollar(range[1])}` : '';
      }).filter(Boolean).join('\n'),
      footnote: 'Ranges based on industry benchmarks for each analysis area.',
      costOfWaiting: `Each additional month of analysis without action = ${formatDollar(monthlyLow)}–${formatDollar(monthlyHigh)} in unrealized revenue.`,
    };
  }

  if (level === 3) {
    const metricType = inputs.revenueMetricType as string | undefined;
    if (!metricType) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select what you measured to see your revenue impact calculation.',
        formula: '',
        footnote: '',
      };
    }

    if (metricType === 'wrvu') {
      const wrvuDelta = inputs.measuredWrvuDelta as number | undefined;
      if (!wrvuDelta || wrvuDelta <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          context: 'Enter your measured wRVU change per encounter to calculate revenue impact.',
          formula: '',
          footnote: '',
        };
      }
      const revenueImpact = Math.round(wrvuDelta * documentedEncounters * conversionFactor);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `Your measured wRVU change of ${wrvuDelta} per encounter across ${documentedEncounters.toLocaleString()} documented encounters represents an estimated ${formatDollar(revenueImpact)} in annual revenue impact.\n\nBased on your organization's measured data. No attribution discount applied to user-measured values.`,
        formula: `[revenueImpact] = ${wrvuDelta} wRVU \u00d7 ${documentedEncounters.toLocaleString()} encounters \u00d7 $${conversionFactor} (CMS conversion factor) = ${formatDollar(revenueImpact)}`,
        footnote: `Conversion factor: $${conversionFactor} (CMS). Adjustable in baseline advanced settings. Based on your measured data. No attribution discount applied to user-measured values.`,
      };
    }

    if (metricType === 'collections') {
      const collectionsDelta = inputs.measuredCollectionsDelta as number | undefined;
      if (!collectionsDelta || collectionsDelta <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          context: 'Enter your measured collections change per encounter to calculate revenue impact.',
          formula: '',
          footnote: '',
        };
      }
      const revenueImpact = Math.round(collectionsDelta * documentedEncounters);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `Your measured collections increase of ${formatDollar(collectionsDelta)} per encounter across ${documentedEncounters.toLocaleString()} documented encounters represents ${formatDollar(revenueImpact)} in annual revenue impact.\n\nBased on your organization's measured data.`,
        formula: `[revenueImpact] = ${formatDollar(collectionsDelta)} \u00d7 ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
      };
    }

    if (metricType === 'revenue_pct') {
      const revenuePct = inputs.measuredRevenuePct as number | undefined;
      if (!revenuePct || revenuePct <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          context: 'Enter your measured revenue change percentage to calculate impact.',
          formula: '',
          footnote: '',
        };
      }
      const revenueImpact = Math.round(documentedEncounters * revenuePerVisit * (revenuePct / 100));
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `Your measured ${revenuePct}% revenue improvement across ${documentedEncounters.toLocaleString()} documented encounters at ${formatDollar(revenuePerVisit)}/visit represents ${formatDollar(revenueImpact)} in annual revenue impact.\n\nBased on your organization's measured data.`,
        formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} encounters \u00d7 ${formatDollar(revenuePerVisit)} \u00d7 ${revenuePct}% = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
      };
    }

    if (metricType === 'denial_rate') {
      const denialBefore = inputs.denialRateBefore as number | undefined;
      const denialAfter = inputs.denialRateAfter as number | undefined;

      if (!denialBefore || denialBefore <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          context: 'Enter your denial rate before and after ambient deployment to calculate impact.',
          formula: '',
          footnote: '',
        };
      }

      const denialDelta = (denialBefore || 0) - (denialAfter || 0);
      if (denialDelta <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'No denial rate improvement detected',
          context: `Your denial rate after (${denialAfter || 0}%) is not lower than before (${denialBefore}%). Enter the rates to see the impact of documentation-driven denial reduction.`,
          formula: '',
          footnote: '',
        };
      }

      const denialSavings = Math.round((denialDelta / 100) * documentedEncounters * revenuePerVisit);
      return {
        label: 'Estimated Impact',
        value: denialSavings,
        hasValue: true,
        context: `Your documentation-related denial rate decreased from ${denialBefore}% to ${denialAfter}% — a ${denialDelta.toFixed(1)} percentage point improvement.\n\nThis is a number your organization can stand behind — before/after analysis, documented and attributed.\n\nBased on your organization's measured data.`,
        formula: `[denialSavings] = (${denialBefore}% - ${denialAfter}%) × ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} = ${formatDollar(denialSavings)}`,
        footnote: 'Based on your organization\'s measured data.',
        costOfWaiting: `You were leaving ${formatDollar(denialSavings)} on the table every year before this analysis.`,
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Select what you measured to see your revenue impact calculation.',
      formula: '',
      footnote: '',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.revenueIntegrations as string, REVENUE_INTEGRATIONS);
  const recognizedRevenue = inputs.recognizedRevenue as number | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');

  if (count === 0 && (!recognizedRevenue || recognizedRevenue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Select how documentation quality is integrated into revenue cycle operations to see your assessment.',
      formula: '',
      footnote: '',
    };
  }

  if (count > 0 && (!recognizedRevenue || recognizedRevenue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} integration${count > 1 ? 's' : ''} active`,
      context: `Documentation quality is integrated into ${count} revenue cycle operation${count > 1 ? 's' : ''}:\n${checkedLabels}\n\nEnter your organization's attributed annual revenue to calculate impact. If this number doesn't exist yet, that's the next step \u2014 formalizing the attribution.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  return {
    label: 'Estimated Impact',
    value: recognizedRevenue || 0,
    hasValue: true,
    context: `Documentation quality is integrated into ${count} revenue cycle operation${count > 1 ? 's' : ''}:\n${checkedLabels}\n\nYour organization formally attributes ${formatDollar(recognizedRevenue || 0)} in annual revenue to documentation quality improvements.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
    formula: '',
    footnote: '',
  };
}

const SURVEY_FINDING_LABELS = [
  'Reduced documentation burden reported',
  'Improved work-life balance reported',
  'Improved satisfaction with documentation workflow',
  'Increased likelihood to stay / reduced intent to leave',
  'More time with patients reported',
];

export function computeWorkforceFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  providerRate: number,
): DomainFeedback {
  if (level === 1) {
    const afterHoursReduction = inputs.afterHoursReduction as number | undefined;
    if (!afterHoursReduction || afterHoursReduction <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter estimated after-hours documentation reduction to calculate workforce impact.',
        formula: '',
        footnote: '',
      };
    }
    const burdenHours = Math.round(afterHoursReduction * providers * 52);
    const burdenValue = Math.round(burdenHours * providerRate);
    const replacementCost = 350000;
    const turnoverProxyPct = Math.min(afterHoursReduction * 15, 50);
    const atRiskProviders = Math.round(providers * turnoverProxyPct / 100 * 10) / 10;
    const retentionExposure = Math.round(atRiskProviders * replacementCost);
    return {
      label: 'Estimated Impact',
      value: burdenValue,
      hasValue: true,
      headlineMetric: `${afterHoursReduction} hrs/wk × ${providers} providers = ${formatDollar(burdenValue)} in physician time returned annually.`,
      context: `${burdenHours.toLocaleString()} hours of after-hours documentation burden eliminated annually.\n\nProviders averaging ${afterHoursReduction}+ hrs of after-hours charting per week are ${turnoverProxyPct}% more likely to report burnout symptoms associated with near-term departure intent. At ${formatDollar(replacementCost)} replacement cost, that's ${formatDollar(retentionExposure)} in retention exposure this reduction is starting to protect.`,
      formula: `[burdenHours] = ${afterHoursReduction} × ${providers} × 52 = ${burdenHours.toLocaleString()}\n[burdenValue] = ${burdenHours.toLocaleString()} × ${formatDollar(providerRate)} = ${formatDollar(burdenValue)}\n[turnoverProxy] = ${afterHoursReduction} hrs × 15% risk/hr = ${turnoverProxyPct}% elevated risk`,
      footnote: 'Turnover risk proxy based on AAMC data: documentation burden is a top-3 driver of physician burnout.',
    };
  }

  if (level === 2) {
    const minutesSaved = inputs.editTimeSaved as number | undefined;
    const confirmedAfterHours = inputs.confirmedAfterHoursReduction as number | undefined;
    const surveyType = inputs.surveyType as string | undefined;
    const surveyFindingsStr = inputs.surveyFindings as string | undefined;
    const checkedFindings = surveyFindingsStr ? surveyFindingsStr.split(',').map(Number) : [];
    const checkedCount = checkedFindings.length;
    const checkedLabels = checkedFindings.map(i => SURVEY_FINDING_LABELS[i]).filter(Boolean);

    if (!minutesSaved || minutesSaved <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter minutes saved per provider per day to calculate in-clinic burden reduction.',
        formula: '',
        footnote: '',
      };
    }

    const clinicSavedHours = Math.round(minutesSaved * providers * 250 / 60);
    const clinicValue = Math.round(clinicSavedHours * providerRate);

    const afterHoursValue = confirmedAfterHours && confirmedAfterHours > 0
      ? Math.round(confirmedAfterHours * providers * 52 * providerRate)
      : 0;
    const afterHoursHours = confirmedAfterHours && confirmedAfterHours > 0
      ? Math.round(confirmedAfterHours * providers * 52)
      : 0;

    const totalValue = clinicValue + afterHoursValue;

    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only. Operational data shows burden reduction — clinician voice would validate and strengthen this finding.'
        : '';

    const burdenScoreBefore = inputs.burdenScoreBefore as number | undefined;
    const burdenScoreAfter = inputs.burdenScoreAfter as number | undefined;
    const burnoutNarrative = burdenScoreBefore && burdenScoreAfter && burdenScoreBefore > burdenScoreAfter
      ? `\n\nDocumentation burden score improved from ${burdenScoreBefore}/10 to ${burdenScoreAfter}/10. Each 1-point improvement correlates with ~8% reduction in near-term departure intent.`
      : '';

    const afterHoursLine = afterHoursValue > 0
      ? `After-hours: ${confirmedAfterHours} hrs/wk × ${providers} × 52 = ${afterHoursHours.toLocaleString()} hours (${formatDollar(afterHoursValue)})\n`
      : '';

    return {
      label: 'Estimated Impact',
      value: totalValue,
      hasValue: true,
      headlineMetric: `${formatDollar(totalValue)} in total measured workforce value${afterHoursValue > 0 ? ' — after-hours and in-clinic combined' : ''}.`,
      context: `This is no longer anecdote — it's data. Your providers are getting measurable time back every day.\n\n${afterHoursValue > 0 ? `After-hours: ${formatDollar(afterHoursValue)}\n` : ''}In-clinic editing: ${formatDollar(clinicValue)}${surveyNarrative}${burnoutNarrative}`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × 250 days / 60 = ${clinicSavedHours.toLocaleString()}\n[clinicValue] = ${clinicSavedHours.toLocaleString()} × ${formatDollar(providerRate)} = ${formatDollar(clinicValue)}${afterHoursValue > 0 ? `\n[afterHoursValue] = ${confirmedAfterHours} × ${providers} × 52 × ${formatDollar(providerRate)} = ${formatDollar(afterHoursValue)}` : ''}\n[total] = ${formatDollar(totalValue)}`,
      footnote: '',
    };
  }

  if (level === 3) {
    const turnoverRate = inputs.turnoverRate as number | undefined;
    const replacementCost = inputs.replacementCost as number | undefined;
    const docBurdenShare = (inputs.docBurdenShare as number) || 0;
    if (!turnoverRate || !replacementCost || turnoverRate <= 0 || replacementCost <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter annual turnover rate and replacement cost to calculate retention exposure.',
        formula: '',
        footnote: '',
      };
    }
    const totalTurnover = providers * (turnoverRate / 100);
    const totalCost = Math.round(totalTurnover * replacementCost);
    const docDrivenCost = docBurdenShare > 0 ? Math.round(totalCost * (docBurdenShare / 100)) : 0;

    const afterHoursReduced = (inputs.afterHoursReduction as number) || (inputs.confirmedAfterHoursReduction as number) || 0;
    const riskReductionRate = afterHoursReduced > 0 ? Math.min(afterHoursReduced * 0.075, 0.30) : 0;
    const protectedValue = docDrivenCost > 0 ? Math.round(docDrivenCost * riskReductionRate) : 0;

    const docShareLine = docBurdenShare > 0
      ? `\n\nDocumentation burden drives an estimated ${formatDollar(docDrivenCost)} of that.`
      : '\n\nEnter the portion of turnover driven by documentation burden to see the attributable exposure.';
    const protectedLine = protectedValue > 0
      ? `\n\nAmbient AI's burden reduction is protecting an estimated ${formatDollar(protectedValue)} of that exposure annually — and growing as utilization increases.`
      : '';

    return {
      label: 'Estimated Impact',
      value: totalCost,
      hasValue: true,
      headlineMetric: `${formatDollar(totalCost)} in annual physician turnover cost.`,
      context: `At ${turnoverRate}% turnover across ${providers} providers, your organization expects approximately ${totalTurnover.toFixed(1)} departure(s) per year. At ${formatDollar(replacementCost)} per replacement, total annual turnover cost is ${formatDollar(totalCost)}.${docShareLine}${protectedLine}`,
      formula: `[annualDepartures] = ${providers} × ${turnoverRate}% = ${totalTurnover.toFixed(1)}\n[totalCost] = ${totalTurnover.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}${docBurdenShare > 0 ? `\n[docDriven] = ${formatDollar(totalCost)} × ${docBurdenShare}% = ${formatDollar(docDrivenCost)}` : ''}${protectedValue > 0 ? `\n[protected] = ${formatDollar(docDrivenCost)} × ${(riskReductionRate * 100).toFixed(0)}% = ${formatDollar(protectedValue)}` : ''}`,
      footnote: 'Based on your inputs, AAMC turnover data, and burden-reduction correlation estimates.',
    };
  }

  const agencyReduction = inputs.agencyReduction as number | undefined;
  if (!agencyReduction || agencyReduction <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Enter monthly agency or locum spend reduction to calculate labor cost impact.',
      formula: '',
      footnote: '',
    };
  }
  const monthsSustained = (inputs.monthsSustained as number) || 0;
  const annualSavings = Math.round(agencyReduction * 12);
  const cumulativeSavings = monthsSustained > 0 ? Math.round(agencyReduction * monthsSustained) : 0;
  const cumulativeLine = cumulativeSavings > 0
    ? `\n\nYou've already avoided ${formatDollar(cumulativeSavings)} in agency spend over ${monthsSustained} month${monthsSustained !== 1 ? 's' : ''}. On current trajectory, that's ${formatDollar(annualSavings)} annually.`
    : '';
  return {
    label: 'Estimated Impact',
    value: annualSavings,
    hasValue: true,
    headlineMetric: `${formatDollar(annualSavings)} in annual labor spend reduction.${cumulativeSavings > 0 ? ` ${formatDollar(cumulativeSavings)} already realized.` : ''}`,
    context: `This is the level where ambient AI shows up in the CFO's P&L — not as a cost line, but as a cost reduction. Agency and locum dependency is structurally lower. That compounds.${cumulativeLine}`,
    formula: `[annualSavings] = ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualSavings)}${cumulativeSavings > 0 ? `\n[cumulative] = ${formatDollar(agencyReduction)} × ${monthsSustained} months = ${formatDollar(cumulativeSavings)}` : ''}`,
    footnote: '',
  };
}

const QUALITY_ATTRIBUTES = [
  'Note completeness (all relevant elements captured)',
  'Diagnostic specificity (ICD-10 precision)',
  'HCC / risk adjustment alignment',
  'Quality measure documentation (HEDIS, MIPS gaps)',
  'Compliance defensibility (audit-readiness)',
];

const DOWNSTREAM_WORKFLOWS = [
  'CDI query volume reduced (fewer queries because notes are more complete)',
  'Coding accuracy improved (fewer rejections, faster turnaround)',
  'Quality measure capture improved (HEDIS, MIPS, Stars gap closure)',
  'Prior authorization documentation streamlined',
  'Chart abstraction time reduced (registries, research, reporting)',
  'Risk adjustment / HCC capture improved',
];

const STRATEGIC_INTEGRATIONS = [
  'Payer contract negotiations (documentation supports rate/quality arguments)',
  'Value-based care program design (documentation feeds quality metrics)',
  'Compliance / audit governance (documentation quality is a governed metric)',
  'Clinical documentation review (documentation completeness tracked as part of risk oversight)',
  'Workforce / FTE modeling (documentation efficiency informs staffing)',
];

const REVENUE_SIGNALS = [
  'Fewer CDI queries (notes are more complete upfront)',
  'More specific diagnosis coding (ICD-10 specificity improved)',
  'Improved HCC / risk adjustment capture',
  'Fewer claim denials related to documentation',
  'Faster coding turnaround (less back-and-forth)',
];

const REVENUE_INTEGRATIONS = [
  'Ongoing wRVU or collections monitoring linked to documentation',
  'CDI workflow incorporates ambient documentation review',
  'Denial management tracks documentation-related root causes',
  'Revenue cycle dashboards include documentation quality metrics',
  'Payer negotiations reference documentation-driven outcomes',
];

export { QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, STRATEGIC_INTEGRATIONS, REVENUE_SIGNALS, REVENUE_INTEGRATIONS };

function parseCheckedItems(csv: string | undefined, allItems: string[]): { checked: string[]; unchecked: string[] } {
  if (!csv) return { checked: [], unchecked: [...allItems] };
  const checkedSet = new Set(csv.split(',').filter(Boolean));
  const checked = allItems.filter((_, i) => checkedSet.has(String(i)));
  const unchecked = allItems.filter((_, i) => !checkedSet.has(String(i)));
  return { checked, unchecked };
}

function shortLabel(item: string): string {
  const paren = item.indexOf('(');
  return paren > 0 ? item.substring(0, paren).trim() : item;
}

export function computeRiskFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  documentedEncounters: number = 0,
  revenuePerVisit: number = 200,
): DomainFeedback {
  if (level === 1) {
    const vbcPct = (inputs.riskVbcPct as number) ?? 0;
    const denialExposure = Math.round(documentedEncounters * revenuePerVisit * 0.04);
    const hccExposure = Math.round(documentedEncounters * (vbcPct / 100) * 200);
    const qualityExposure = Math.round(documentedEncounters * 0.04 * 100);
    const totalExposure = denialExposure + hccExposure + qualityExposure;
    const monthlyExposure = Math.round(totalExposure / 12);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${formatDollar(totalExposure)} in combined annual risk exposure — invisible.`,
      context: `Your documentation quality may have improved — but three risk exposures remain unaddressed downstream.\n\nDenial exposure: ${formatDollar(denialExposure)} annually (${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × 4% avg denial rate).\n\n${vbcPct > 0 ? `HCC / risk adjustment undercapture: ${formatDollar(hccExposure)} (${documentedEncounters.toLocaleString()} encounters × ${vbcPct}% VBC panel × $200/member).\n\n` : ''}Quality measure gaps: ${formatDollar(qualityExposure)} (${documentedEncounters.toLocaleString()} encounters × 4% gap rate × $100/gap).\n\nTotal unaddressed exposure: ${formatDollar(totalExposure)} annually.`,
      formula: `[denialExposure] = ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} × 4% = ${formatDollar(denialExposure)}\n[hccExposure] = ${documentedEncounters.toLocaleString()} × ${vbcPct}% VBC × $200 = ${formatDollar(hccExposure)}\n[qualityExposure] = ${documentedEncounters.toLocaleString()} × 4% × $100 = ${formatDollar(qualityExposure)}`,
      footnote: 'Denial rate: 4% national average (MGMA). HCC uplift: $200/member conservative estimate. Quality gap impact: $100/encounter. These are exposure estimates, not confirmed losses — the point is that no one is measuring them.',
      costOfWaiting: `Every month without a documentation quality strategy = ${formatDollar(monthlyExposure)} in unmanaged risk.`,
    };
  }

  if (level === 2) {
    const approach = inputs.monitoringApproach as string | undefined;
    if (!approach) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Not yet entered',
        context: 'Select how your organization is monitoring documentation quality to see your assessment.',
        formula: '',
        footnote: '',
      };
    }
    if (approach === 'not_yet') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Not yet entered',
        context: 'Documentation quality monitoring hasn\'t started yet. If no one is reviewing documentation attributes — even informally — your organization may be at Level 1 for this domain.\n\nThe single most important next step is establishing any form of documentation quality review.\n\nOrganizations that begin systematic monitoring have reported 15–30% improvement in documentation completeness and specificity. Based on aggregated deployment experience.',
        formula: '',
        footnote: '',
      };
    }
    if (approach === 'spot_checks') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Informal monitoring active',
        context: 'Your organization is informally reviewing documentation quality through spot checks and anecdotal feedback. This is a meaningful step — but informal processes don\'t scale and can\'t drive organizational strategy.\n\nConsider formalizing a review cadence and measurement framework to move toward Level 3.\n\nOrganizations with formalized monitoring have reported measurable improvements in documentation completeness, coding specificity, and audit readiness. Based on aggregated deployment experience.',
        formula: '',
        footnote: '',
      };
    }
    const { checked, unchecked } = parseCheckedItems(inputs.qualityAttributes as string, QUALITY_ATTRIBUTES);
    const count = checked.length;
    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Systematic tracking',
        context: 'You indicated systematic tracking — select which documentation attributes are being tracked.',
        formula: '',
        footnote: '',
      };
    }
    const trackedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const untrackedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');
    const gapRate = inputs.chartGapRate as number | undefined;
    const trackingMultiplier = approach === 'systematic' ? 1.0 : 0.5;

    if (gapRate && gapRate > 0) {
      const gapRevenue = Math.round(documentedEncounters * (gapRate / 100) * 75 * trackingMultiplier);
      return {
        label: 'Estimated Impact',
        value: gapRevenue,
        hasValue: true,
        headlineMetric: `${count} of 5 quality dimensions tracked. ${formatDollar(gapRevenue)} in gap-driven revenue opportunity.`,
        context: `Your organization is systematically tracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}\n\n${gapRate}% of reviewed charts have documentation gaps — that's ${formatDollar(gapRevenue)} in recoverable value per year at $75 per gap encounter.${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}`,
        formula: `[gapRevenue] = ${documentedEncounters.toLocaleString()} × ${gapRate}% × $75 × ${trackingMultiplier} multiplier = ${formatDollar(gapRevenue)}`,
        footnote: `Tracking multiplier: ${trackingMultiplier} (${approach === 'systematic' ? 'systematic' : 'spot check'}).`,
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 5 quality dimensions tracked`,
      context: `Your organization is systematically tracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}\n\nEnter your chart documentation gap rate to calculate the revenue opportunity.`,
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const { checked, unchecked } = parseCheckedItems(inputs.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS);
    const count = checked.length;
    const checkedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const uncheckedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select which downstream workflows have been impacted to see your assessment.',
        formula: '',
        footnote: '',
      };
    }

    const workflowValues: { name: string; value: number; formula: string }[] = [];

    if (checked.some(c => c.includes('CDI'))) {
      const before = (inputs.cdiQueriesBefore as number) || 0;
      const after = (inputs.cdiQueriesAfter as number) || 0;
      if (before > after) {
        const val = Math.round((before - after) * 25 * 12);
        workflowValues.push({ name: 'CDI query reduction', value: val, formula: `(${before} - ${after}) × $25 × 12 = ${formatDollar(val)}` });
      }
    }
    if (checked.some(c => c.includes('Coding'))) {
      const before = (inputs.riskDenialBefore as number) || 0;
      const after = (inputs.riskDenialAfter as number) || 0;
      if (before > after) {
        const val = Math.round((before - after) / 100 * documentedEncounters * revenuePerVisit);
        workflowValues.push({ name: 'Denial reduction', value: val, formula: `(${before}% - ${after}%) × ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(val)}` });
      }
    }
    if (checked.some(c => c.includes('Quality'))) {
      const gapsClosed = (inputs.qualityGapsClosed as number) || 0;
      if (gapsClosed > 0) {
        const val = Math.round(gapsClosed * 12 * 100);
        workflowValues.push({ name: 'Quality gap closure', value: val, formula: `${gapsClosed} gaps/mo × 12 × $100 = ${formatDollar(val)}` });
      }
    }
    if (checked.some(c => c.includes('Prior'))) {
      const before = (inputs.priorAuthBefore as number) || 0;
      const after = (inputs.priorAuthAfter as number) || 0;
      if (after > before) {
        const val = Math.round((after - before) / 100 * documentedEncounters * 15);
        workflowValues.push({ name: 'Prior auth improvement', value: val, formula: `(${after}% - ${before}%) × ${documentedEncounters.toLocaleString()} × $15 = ${formatDollar(val)}` });
      }
    }
    if (checked.some(c => c.includes('abstraction'))) {
      const hoursSaved = (inputs.abstractionHoursSaved as number) || 0;
      if (hoursSaved > 0) {
        const val = Math.round(hoursSaved * 12 * 50);
        workflowValues.push({ name: 'Abstraction time', value: val, formula: `${hoursSaved} hrs/mo × 12 × $50 = ${formatDollar(val)}` });
      }
    }
    if (checked.some(c => c.includes('Risk adjustment') || c.includes('HCC'))) {
      const rafChange = (inputs.rafChange as number) || 0;
      const vbcMembers = (inputs.vbcMembers as number) || 0;
      const capitationRate = (inputs.capitationRate as number) || 0;
      if (rafChange > 0 && vbcMembers > 0 && capitationRate > 0) {
        const val = Math.round(rafChange * vbcMembers * capitationRate);
        workflowValues.push({ name: 'HCC/RAF capture', value: val, formula: `${rafChange} RAF × ${vbcMembers.toLocaleString()} members × ${formatDollar(capitationRate)} = ${formatDollar(val)}` });
      }
    }

    const totalValue = workflowValues.reduce((sum, w) => sum + w.value, 0);

    if (totalValue === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} downstream workflow${count > 1 ? 's' : ''} connected`,
        context: `Your documentation infrastructure is driving improvement across ${count} downstream workflow${count > 1 ? 's' : ''}:\n${checkedList}\n\nEnter before/after metrics for each connected workflow to calculate dollar impact.${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
        formula: '',
        footnote: '',
      };
    }

    const formulaLines = workflowValues.map(w => `[${w.name}] = ${w.formula}`).join('\n');
    return {
      label: 'Estimated Impact',
      value: totalValue,
      hasValue: true,
      headlineMetric: `${formatDollar(totalValue)} in measured operational value across ${count} workflow${count > 1 ? 's' : ''}.`,
      context: `Your documentation infrastructure is driving measurable improvement:\n\n${workflowValues.map(w => `${w.name}: ${formatDollar(w.value)}`).join('\n')}${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
      formula: formulaLines,
      footnote: '',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.strategicIntegrations as string, STRATEGIC_INTEGRATIONS);
  const strategicValue = inputs.strategicValue as number | undefined;
  const executiveOwner = inputs.executiveOwner as string | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');

  const ownerLine = executiveOwner === 'yes'
    ? `\n\nA named executive owns documentation quality strategy${inputs.executiveOwnerRole ? ` (${inputs.executiveOwnerRole})` : ''} — this is the strongest signal of strategic maturity.`
    : executiveOwner === 'no'
      ? '\n\nNo named executive owner yet. Organizations with executive accountability for documentation quality see 2–3× faster value realization.'
      : '';

  if (count === 0 && (!strategicValue || strategicValue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Select where documentation quality factors into organizational strategy to see your assessment.',
      formula: '',
      footnote: '',
    };
  }

  if (count > 0 && (!strategicValue || strategicValue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} strategic integration${count > 1 ? 's' : ''}`,
      context: `Your organization treats documentation as a strategic data asset across ${count} governance area${count > 1 ? 's' : ''}:\n${checkedLabels}${ownerLine}\n\nEnter the recognized annual strategic value to quantify this level.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  return {
    label: 'Estimated Impact',
    value: strategicValue || 0,
    hasValue: true,
    headlineMetric: `${formatDollar(strategicValue || 0)} in recognized annual strategic value.`,
    context: `Your organization treats documentation as a strategic data asset across ${count} governance area${count > 1 ? 's' : ''}:\n${checkedLabels}${ownerLine}${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
    formula: '',
    footnote: '',
  };
}

export function computeGapForDomain(
  domain: Domain,
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  annualEncounters: number,
  utilization: number,
  revenuePerVisit: number,
  providerRate: number,
  conversionFactor: number = 33,
): { value: number; hasValue: boolean } {
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  let feedback: DomainFeedback;
  switch (domain) {
    case 'capacity':
      feedback = computeCapacityFeedback(level, inputs, providers, documentedEncounters, revenuePerVisit, providerRate);
      break;
    case 'revenue':
      feedback = computeRevenueFeedback(level, inputs, documentedEncounters, revenuePerVisit, conversionFactor);
      break;
    case 'workforce':
      feedback = computeWorkforceFeedback(level, inputs, providers, providerRate);
      break;
    case 'risk':
      feedback = computeRiskFeedback(level, inputs, documentedEncounters, revenuePerVisit);
      break;
  }
  return { value: feedback.value || 0, hasValue: feedback.hasValue };
}

export function scoreToActivationLevel(_domain: Domain, score: number): ActivationLevel {
  if (score >= 25) return 4;
  if (score >= 19) return 3;
  if (score >= 12) return 2;
  if (score >= 6) return 1;
  return 1;
}
