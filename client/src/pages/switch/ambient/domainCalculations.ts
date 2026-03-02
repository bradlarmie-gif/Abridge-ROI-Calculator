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
    1: 'Time Recovered. Nothing Done With It.',
    2: 'Measured, Not Redesigned',
    3: 'Access Redesigned',
    4: 'Capacity Modeled into Workforce Planning',
  },
  revenue: {
    1: 'Revenue Cycle Unaware',
    2: 'Anecdotal Revenue Signal',
    3: 'Impact Measured',
    4: 'Revenue Cycle Integration',
  },
  workforce: {
    1: 'After-Hours Burden Reduced',
    2: 'Burden Measured and Validated',
    3: 'Retention Risk Quantified',
    4: 'Labor Spend Structurally Reduced',
  },
  risk: {
    1: 'Quality Improved. Exposure Unmeasured.',
    2: 'Active Quality Monitoring',
    3: 'Downstream Systems Connected',
    4: 'Documentation as Strategic Data Asset',
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
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hrs recovered (${fte} FTE)`,
      context: `Your providers are recovering an estimated ${recoveredHours.toLocaleString()} hours annually — ${fte} FTE equivalent. None of this time is being structurally redeployed. Schedules and panel sizes are unchanged.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}`,
      footnote: 'Redeployment = 0%. No dollar value claimed at this level — time is recovered but not yet deployed.',
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
    const benchmarkValue = formatDollar(Math.round(5 * providers * 12 * revenuePerVisit));
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours quantified — $0 deployed`,
      context: `Your organization has quantified ${recoveredHours.toLocaleString()} recovered hours annually (${fte} FTE equivalent). This time is measured but not yet converted to additional access or volume. No scheduling or template changes have been implemented.\n\nThe gap between measurement and action is where most organizations stall.\n\nOrganizations who move from measurement to redesign (Level 3) typically capture ${benchmarkValue} in annual capacity value.`,
      formula: `[recoveredHours] = ${documentedEncounters.toLocaleString()} × ${ts} min / 60 = ${calculatedHours.toLocaleString()}${aggregated === 'yes' ? `\n[confirmedHours] = ${recoveredHours.toLocaleString()} (organization-confirmed)` : ''}\n[FTE] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}`,
      footnote: 'Dollar value: $0 — time is quantified but not yet deployed through operational changes.',
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
    return {
      label: 'Estimated Impact',
      value: capacityValue,
      hasValue: true,
      context: `Your access redesign is generating ${annualAdditionalVisits.toLocaleString()} additional visits annually across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''} with redesigned schedules — estimated at ${formatDollar(capacityValue)}.`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 12 = ${annualAdditionalVisits.toLocaleString()}\n[capacityValue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(capacityValue)}`,
      footnote: 'Revenue per visit inherited from baseline inputs.',
    };
  }

  const CAPACITY_PLANNING_LABELS = [
    'Avoided or deferred new hires',
    'Redeployed providers to underserved panels or new sites',
    'Absorbed patient volume growth without adding FTEs',
    'Factored into annual FTE / staffing models',
    'Used in business case for new service lines or locations',
  ];
  const planningCsv = inputs.capacityPlanningAreas as string | undefined;
  const fteAvoided = inputs.fteAvoided as number | undefined;
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
      context: `Recovered capacity is a variable in ${planCount} workforce planning area${planCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}\n\nEnter estimated FTEs avoided or redeployed to calculate impact.${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  const capacityValue = Math.round((fteAvoided || 0) * providerRate * 2080);
  return {
    label: 'Estimated Impact',
    value: capacityValue,
    hasValue: true,
    context: `Recovered capacity is a variable in ${planCount} workforce planning area${planCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}\n\n${fteAvoided} FTE equivalent in avoided hiring or redeployment — valued at ${formatDollar(capacityValue)} annually.${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
    formula: `[capacityValue] = ${fteAvoided} FTE × ${formatDollar(providerRate)}/hr × 2,080 hrs = ${formatDollar(capacityValue)}`,
    footnote: 'This represents hiring cost avoided or redeployed provider capacity, not additional visit revenue.',
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
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Your revenue cycle has not yet evaluated how ambient documentation is affecting coding, billing, or collections. This is the most common starting point — and the biggest blind spot.\n\nEvery encounter generates documentation that determines how it gets coded, what gets billed, and whether it gets paid. If no one is looking at whether that documentation changed, the revenue impact is invisible.\n\nOrganizations who connect revenue cycle to documentation quality typically identify measurable impact within 90 days of analysis.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 2) {
    const { checked, unchecked } = parseCheckedItems(inputs.revenueSignals as string, REVENUE_SIGNALS);
    const noneObserved = inputs.revenueNoneObserved === 'true';
    const count = checked.length;

    if (noneObserved) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Not yet entered',
        context: 'Your revenue cycle hasn\'t observed documentation-driven changes yet. This may mean the impact isn\'t there — or it may mean no one has asked. Consider connecting your CDI or coding team with ambient documentation data to look for signals.',
        formula: '',
        footnote: '',
      };
    }

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select which revenue signals your organization has observed, or indicate that none have been observed yet.',
        formula: '',
        footnote: '',
      };
    }

    const checkedLabels = checked.map(shortLabel).join(', ');
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} revenue signal${count > 1 ? 's' : ''} observed`,
      context: `Your revenue cycle has observed ${count} area${count > 1 ? 's' : ''} where documentation changes may be affecting revenue:\n${checkedLabels}\n\nThese signals haven\'t been formally measured — but they indicate that documentation quality is flowing downstream. The next step is isolating the impact.\n\nOrganizations who formalize measurement of these signals have reported 1\u20133% improvement in coding yield.`,
      formula: '',
      footnote: '',
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
      const denialReduction = inputs.measuredDenialReduction as number | undefined;

      if (!denialReduction || denialReduction <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          context: 'Enter your measured denial rate reduction to see impact.',
          formula: '',
          footnote: '',
        };
      }

      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `Denial rate reduced ${denialReduction}%`,
        context: `Your documentation-related denial rate has decreased by ${denialReduction}%.\n\nTo estimate dollar impact: multiply your average monthly documentation-related denials by the reduction percentage, then by average denial value, then by 12.\n\nExample: 50 denials/mo × ${denialReduction}% × $500 avg value × 12 = ${formatDollar(Math.round(50 * (denialReduction / 100) * 500 * 12))}/year.\n\nBased on your organization's measured data.`,
        formula: '',
        footnote: '',
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
    const hoursPerProvider = Math.round(afterHoursReduction * 52);
    const burdenValue = Math.round(burdenHours * providerRate);
    return {
      label: 'Estimated Impact',
      value: burdenValue,
      hasValue: true,
      headlineMetric: `${burdenHours.toLocaleString()} hours reclaimed annually`,
      context: `${afterHoursReduction} hrs/week across ${providers} providers = ${burdenHours.toLocaleString()} hours of after-hours documentation burden eliminated annually.\n\nThat's ${hoursPerProvider.toLocaleString()} hours per provider per year returned to personal time.`,
      formula: `[burdenHours] = ${afterHoursReduction} × ${providers} × 52 = ${burdenHours.toLocaleString()}\n[hoursPerProvider] = ${afterHoursReduction} × 52 = ${hoursPerProvider}`,
      footnote: '',
    };
  }

  if (level === 2) {
    const minutesSaved = inputs.editTimeSaved as number | undefined;
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
    const savedHours = Math.round(minutesSaved * providers * 230 / 60);
    const annualPerProvider = Math.round(minutesSaved * 230 / 60);
    const burdenValue = Math.round(savedHours * providerRate);

    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only. Operational data shows burden reduction — clinician voice would validate and strengthen this finding.'
        : '';

    return {
      label: 'Estimated Impact',
      value: burdenValue,
      hasValue: true,
      headlineMetric: hasSurveyData
        ? `${savedHours.toLocaleString()} hours reclaimed · ${checkedCount} survey finding(s)`
        : `${savedHours.toLocaleString()} hours reclaimed annually`,
      context: `${minutesSaved} min/day across ${providers} providers = ${savedHours.toLocaleString()} hours of in-clinic documentation burden eliminated annually.\n\nThat's ${annualPerProvider.toLocaleString()} hours per provider per year redirected from documentation editing to patient care.${surveyNarrative}`,
      formula: `[savedHours] = ${minutesSaved} × ${providers} × 230 / 60 = ${savedHours.toLocaleString()}\n[annualPerProvider] = ${minutesSaved} × 230 / 60 = ${annualPerProvider}`,
      footnote: '',
    };
  }

  if (level === 3) {
    const turnoverRate = inputs.turnoverRate as number | undefined;
    const replacementCost = inputs.replacementCost as number | undefined;
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
    return {
      label: 'Estimated Impact',
      value: totalCost,
      hasValue: true,
      headlineMetric: `${formatDollar(totalCost)} in annual retention exposure`,
      context: `At ${turnoverRate}% turnover across ${providers} providers, your organization expects approximately ${totalTurnover.toFixed(1)} departure(s) per year. At ${formatDollar(replacementCost)} per replacement, total annual turnover cost is ${formatDollar(totalCost)}.\n\nIndustry research suggests administrative burden is a contributing factor in physician turnover. The portion of this exposure addressable through documentation burden reduction represents a significant retention opportunity.`,
      formula: `[totalTurnover] = ${providers} × ${turnoverRate}% = ${totalTurnover.toFixed(1)}\n[totalCost] = ${totalTurnover.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}`,
      footnote: 'Based on your inputs and published industry research. Estimates are directional. Individual results vary.',
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
  const annualSavings = Math.round(agencyReduction * 12);
  return {
    label: 'Estimated Impact',
    value: annualSavings,
    hasValue: true,
    headlineMetric: `${formatDollar(annualSavings)} annually`,
    context: `Your organization has reduced agency and locum spend by an estimated ${formatDollar(agencyReduction)}/month — ${formatDollar(annualSavings)} annually.\n\nThis is the financial proof that documentation burden reduction is translating to structural workforce cost improvement.`,
    formula: `[annualSavings] = ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualSavings)}`,
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
): DomainFeedback {
  if (level === 1) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Your documentation quality has improved — but nothing downstream has changed to leverage it. Quality reporting, CDI workflows, coding processes, and compliance reviews are operating the same way they did before deployment.\n\nThe foundation is there. The question is whether your organization is building on it.',
      formula: '',
      footnote: '',
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
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 5 quality dimensions tracked`,
      context: `Your organization is systematically tracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}\n\nOrganizations tracking 4+ attributes are well-positioned to connect documentation quality to downstream workflows (Level 3).`,
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const { checked, unchecked } = parseCheckedItems(inputs.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS);
    const hoursSaved = inputs.workflowHoursSaved as number | undefined;
    const count = checked.length;
    const checkedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const uncheckedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');

    if (count === 0 && (!hoursSaved || hoursSaved <= 0)) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select which downstream workflows have been impacted to see your assessment.',
        formula: '',
        footnote: '',
      };
    }

    if (count > 0 && (!hoursSaved || hoursSaved <= 0)) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: true,
        headlineMetric: `${count} downstream workflow${count > 1 ? 's' : ''} connected`,
        context: `Your documentation infrastructure is driving improvement across ${count} downstream workflow${count > 1 ? 's' : ''}:\n${checkedList}${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}\n\nThe workflows you haven't connected represent untapped operational value from your documentation foundation.` : ''}`,
        formula: '',
        footnote: '',
      };
    }

    const annualHours = (hoursSaved || 0) * 12;
    const annualSavings = Math.round(annualHours * 75);
    return {
      label: 'Estimated Impact',
      value: annualSavings,
      hasValue: true,
      headlineMetric: `${formatDollar(annualSavings)} in operational value`,
      context: `Your documentation infrastructure is driving improvement across ${count} downstream workflow${count > 1 ? 's' : ''}:\n${checkedList}\n\n${annualHours.toLocaleString()} hours recaptured annually — valued at ${formatDollar(annualSavings)}.${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
      formula: `[annualHours] = ${hoursSaved} × 12 = ${annualHours}\n[annualSavings] = ${annualHours} × $75/hr = ${formatDollar(annualSavings)}\nRate: $75/hr blended abstraction/administrative rate.`,
      footnote: '',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.strategicIntegrations as string, STRATEGIC_INTEGRATIONS);
  const strategicValue = inputs.strategicValue as number | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');

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
      context: `Your organization treats documentation as a strategic data asset across ${count} governance area${count > 1 ? 's' : ''}:\n${checkedLabels}\n\nThis is the highest level of documentation infrastructure maturity. Quantified impact not yet estimated — but strategic integration drives compounding value across the organization.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  return {
    label: 'Estimated Impact',
    value: strategicValue || 0,
    hasValue: true,
    context: `Your organization treats documentation as a strategic data asset across ${count} governance area${count > 1 ? 's' : ''}:\n${checkedLabels}\n\nEstimated annual strategic value: ${formatDollar(strategicValue || 0)}${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
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
      feedback = computeRiskFeedback(level, inputs);
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
