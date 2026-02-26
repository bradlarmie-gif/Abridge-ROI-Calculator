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
    2: 'Measured, Not Redesigned',
    3: 'Access Redesigned',
    4: 'Capacity Modeled into Workforce Planning',
  },
  revenue: {
    1: 'Documentation Neutral',
    2: 'Anecdotal Coding Lift',
    3: 'Measured Yield Integrity',
    4: 'Financial Governance Embedded',
  },
  workforce: {
    1: 'Pajama Time Reduced',
    2: 'In-Clinic Burden Reduced',
    3: 'Turnover Risk Managed',
    4: 'Labor Volatility Strategically Reduced',
  },
  risk: {
    1: 'Better Notes, Same Infrastructure',
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

export function computeDomainScore(domain: Domain, level: ActivationLevel, _inputs: Record<string, number | string>): number {
  const baseScores: Record<Domain, Record<number, number>> = {
    capacity: { 1: 15, 2: 35, 3: 65, 4: 90 },
    revenue: { 1: 10, 2: 30, 3: 62, 4: 88 },
    workforce: { 1: 20, 2: 40, 3: 65, 4: 85 },
    risk: { 1: 15, 2: 38, 3: 62, 4: 90 },
  };
  return baseScores[domain]?.[level] || 0;
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
      context: `Your organization has quantified ${recoveredHours.toLocaleString()} recovered hours annually (${fte} FTE equivalent). This time is measured but not yet converted to additional access or volume. No scheduling or template changes have been implemented.\n\nThe gap between measurement and action is where most organizations stall.\n\nAbridge customers who move from measurement to redesign (Level 3) typically capture ${benchmarkValue} in annual capacity value.`,
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
    const annualAdditionalVisits = additionalPatients * providers * 12;
    const capacityValue = Math.round(annualAdditionalVisits * revenuePerVisit);
    return {
      label: 'Estimated Impact',
      value: capacityValue,
      hasValue: true,
      context: `Your access redesign is generating ${annualAdditionalVisits.toLocaleString()} additional visits annually across ${providers} providers — estimated at ${formatDollar(capacityValue)}.`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${providers} providers × 12 = ${annualAdditionalVisits.toLocaleString()}\n[capacityValue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(capacityValue)}`,
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
): DomainFeedback {
  if (level === 1) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'You have not yet measured the revenue impact of documentation changes. Revenue cycle is operating on whatever documentation gives them — but no one is tracking whether ambient documentation is changing what gets coded or billed.',
      formula: '',
      footnote: 'Abridge customers who measure documentation-driven yield typically identify 0.5–2% improvement in the first year.',
    };
  }

  if (level === 2) {
    const yieldDelta = inputs.yieldImprovement as number | undefined;
    if (!yieldDelta || yieldDelta <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter estimated yield improvement to calculate directional revenue impact.',
        formula: '',
        footnote: '',
      };
    }
    const revenueImpact = Math.round(documentedEncounters * revenuePerVisit * (yieldDelta / 100));
    return {
      label: 'Estimated Impact',
      value: revenueImpact,
      hasValue: true,
      context: `At an estimated ${yieldDelta}% yield improvement, documentation-driven revenue impact is approximately ${formatDollar(revenueImpact)} annually. This is directional — based on your team's observation, not independent measurement.`,
      formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × ${yieldDelta}% = ${formatDollar(revenueImpact)}`,
      footnote: 'Directional modeling. Not independently verified.',
    };
  }

  if (level === 3) {
    const yieldLift = inputs.measuredYieldLift as number | undefined;
    if (!yieldLift || yieldLift <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Enter measured yield lift to calculate verified revenue impact.',
        formula: '',
        footnote: '',
      };
    }
    const revenueImpact = Math.round(documentedEncounters * revenuePerVisit * (yieldLift / 100));
    return {
      label: 'Estimated Impact',
      value: revenueImpact,
      hasValue: true,
      context: `Your measured ${yieldLift}% yield improvement represents ${formatDollar(revenueImpact)} in verified annual revenue impact. Based on your organization's own data.`,
      formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × ${yieldLift}% = ${formatDollar(revenueImpact)}`,
      footnote: 'Verified by organizational measurement.',
    };
  }

  const recognizedRevenue = inputs.recognizedRevenue as number | undefined;
  if (!recognizedRevenue || recognizedRevenue <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Enter the recognized revenue change tied to documentation improvements.',
      formula: '',
      footnote: '',
    };
  }
  return {
    label: 'Estimated Impact',
    value: recognizedRevenue,
    hasValue: true,
    context: `Your organization has recognized ${formatDollar(recognizedRevenue)} in documentation-driven revenue impact through financial governance.`,
    formula: 'Recognized revenue as reported in financial governance.',
    footnote: '',
  };
}

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
      headlineMetric: `${burdenHours.toLocaleString()} hours eliminated`,
      context: `${afterHoursReduction} hrs/week across ${providers} providers = ${burdenHours.toLocaleString()} hours of after-hours burden eliminated annually. That's ${hoursPerProvider.toLocaleString()} hours per provider per year returned to personal time.`,
      formula: `[burdenHours] = ${afterHoursReduction} hrs/wk × ${providers} providers × 52 weeks = ${burdenHours.toLocaleString()}\n[hoursPerProvider] = ${afterHoursReduction} × 52 = ${hoursPerProvider}\nBurden-equivalent value: ${formatDollar(burdenValue)} at ${formatDollar(providerRate)}/hr`,
      footnote: 'Hours is the headline metric. Dollar value shown as burden-equivalent context.',
    };
  }

  if (level === 2) {
    const minutesSaved = inputs.editTimeSaved as number | undefined;
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
    const adminRate = 100;
    const savedHours = Math.round(minutesSaved * providers * 250 / 60);
    const burdenValue = Math.round(savedHours * adminRate);
    return {
      label: 'Estimated Impact',
      value: burdenValue,
      hasValue: true,
      headlineMetric: `${savedHours.toLocaleString()} hours eliminated`,
      context: `${minutesSaved} min/day across ${providers} providers = ${savedHours.toLocaleString()} hours of in-clinic administrative burden eliminated annually.`,
      formula: `[savedHours] = ${minutesSaved} min/day × ${providers} providers × 250 days / 60 = ${savedHours.toLocaleString()}\nBurden-equivalent value: ${formatDollar(burdenValue)} at $100/hr administrative rate`,
      footnote: 'Administrative rate used for in-clinic burden calculation.',
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
        context: 'Enter annual turnover rate and replacement cost to calculate turnover exposure.',
        formula: '',
        footnote: '',
      };
    }
    const atRiskProviders = providers * (turnoverRate / 100);
    const burdenAttributable = atRiskProviders * 0.25;
    const turnoverExposure = Math.round(burdenAttributable * replacementCost);
    return {
      label: 'Estimated Impact',
      value: turnoverExposure,
      hasValue: true,
      context: `At ${turnoverRate}% turnover across ${providers} providers, approximately ${burdenAttributable.toFixed(1)} departure(s) per year may be attributable to documentation burden. At ${formatDollar(replacementCost)} per replacement, this represents ${formatDollar(turnoverExposure)} in annual turnover exposure.`,
      formula: `[atRiskProviders] = ${providers} × ${turnoverRate}% = ${atRiskProviders.toFixed(1)}\n[burdenAttributable] = ${atRiskProviders.toFixed(1)} × 25% = ${burdenAttributable.toFixed(1)}\n[turnoverExposure] = ${burdenAttributable.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(turnoverExposure)}`,
      footnote: 'Attribution: ~25% of physician turnover attributed to administrative burden (AMA/AAMC industry estimates).',
    };
  }

  const agencyReduction = inputs.agencyReduction as number | undefined;
  const overtimeReduction = inputs.overtimeReduction as number | undefined;
  const hasAgency = agencyReduction !== undefined && agencyReduction > 0;
  const hasOvertime = overtimeReduction !== undefined && overtimeReduction > 0;
  if (!hasAgency && !hasOvertime) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      context: 'Enter monthly agency spend avoided and/or overtime reduction to calculate labor volatility impact.',
      formula: '',
      footnote: '',
    };
  }
  const monthly = (agencyReduction || 0) + (overtimeReduction || 0);
  const annualSavings = Math.round(monthly * 12);
  return {
    label: 'Estimated Impact',
    value: annualSavings,
    hasValue: true,
    context: `Your organization is reducing labor volatility by an estimated ${formatDollar(annualSavings)} annually through reduced agency and overtime spend.`,
    formula: `[annualSavings] = (${formatDollar(agencyReduction || 0)} agency + ${formatDollar(overtimeReduction || 0)} overtime) × 12 = ${formatDollar(annualSavings)}`,
    footnote: 'Agency spend avoided + overtime reduction × 12 months.',
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
  'Risk management / malpractice review (documentation defensibility is tracked)',
  'Workforce / FTE modeling (documentation efficiency informs staffing)',
];

export { QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, STRATEGIC_INTEGRATIONS };

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
        headlineMetric: '—',
        context: 'Documentation quality monitoring hasn\'t started. This means your organization has no baseline for measuring what improved documentation is worth downstream. This is the single most important next step.\n\nAbridge customers who begin systematic monitoring typically discover 15–30% improvement in documentation completeness and specificity.',
        formula: '',
        footnote: '',
      };
    }
    if (approach === 'spot_checks') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Informal monitoring',
        context: 'Your organization is informally reviewing documentation quality. This is a start — but spot checks don\'t scale and can\'t drive organizational strategy. Consider formalizing a review cadence and measurement framework.\n\nAbridge customers who formalize monitoring review 500–2,000 encounters/month for documentation quality.',
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
    const trackedList = checked.map(shortLabel).join(', ');
    const untrackedList = unchecked.map(shortLabel).join(', ');
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 5 quality dimensions tracked`,
      context: `Your organization is systematically tracking ${count} documentation quality attribute${count > 1 ? 's' : ''}. This positions you to connect documentation improvements to downstream value.\n\nTracked: ${trackedList}${unchecked.length > 0 ? `\n\nNot yet tracked: ${untrackedList}` : ''}\n\nOrganizations tracking 4+ attributes are positioned to move to Level 3 — connecting documentation quality to downstream operational workflows.`,
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const { checked, unchecked } = parseCheckedItems(inputs.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS);
    const hoursSaved = inputs.workflowHoursSaved as number | undefined;
    const count = checked.length;
    const checkedLabels = checked.map(shortLabel).join(', ');
    const uncheckedLabels = unchecked.map(shortLabel).join(', ');

    if (count === 0 && (!hoursSaved || hoursSaved <= 0)) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        context: 'Select which downstream workflows have been impacted and enter hours saved to calculate operational impact.',
        formula: '',
        footnote: '',
      };
    }

    if (count > 0 && (!hoursSaved || hoursSaved <= 0)) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} workflow${count > 1 ? 's' : ''} connected`,
        context: `Your documentation infrastructure is connected to ${count} downstream workflow${count > 1 ? 's' : ''}:\n${checkedLabels}\n\nEnter estimated hours saved to calculate operational impact.${unchecked.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels}` : ''}`,
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
      context: `Your documentation infrastructure is driving measurable efficiency across ${count} downstream workflow${count > 1 ? 's' : ''}:\n${checkedLabels}\n\n${annualHours.toLocaleString()} hours recaptured annually — valued at ${formatDollar(annualSavings)}.${unchecked.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels}` : ''}`,
      formula: `[annualHours] = ${hoursSaved} × 12 = ${annualHours}\n[annualSavings] = ${annualHours} × $75/hr = ${formatDollar(annualSavings)}`,
      footnote: 'Rate: $75/hr blended abstraction/administrative rate.',
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
): { value: number; hasValue: boolean } {
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  let feedback: DomainFeedback;
  switch (domain) {
    case 'capacity':
      feedback = computeCapacityFeedback(level, inputs, providers, documentedEncounters, revenuePerVisit, providerRate);
      break;
    case 'revenue':
      feedback = computeRevenueFeedback(level, inputs, documentedEncounters, revenuePerVisit);
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
