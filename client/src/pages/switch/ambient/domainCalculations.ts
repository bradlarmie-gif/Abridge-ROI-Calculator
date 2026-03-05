import { formatDollar } from "./ambientCalculator";

export type Domain = 'capacity' | 'revenue' | 'workforce' | 'risk';
export type ActivationLevel = 1 | 2 | 3 | 4;

export const DOMAIN_ORDER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  capacity: 'Capacity',
  revenue: 'Revenue',
  workforce: 'Workforce',
  risk: 'Quality',
};

export const ACTIVATION_LABELS: Record<Domain, Record<ActivationLevel, string>> = {
  capacity: {
    1: 'Documentation Recovery Established',
    2: 'Recovery Quantified and Escalated',
    3: 'Capacity Deployed Into Patient Access',
    4: 'Workforce Architecture Impact',
  },
  revenue: {
    1: 'Revenue Cycle Hasn\'t Been Brought In Yet.',
    2: 'The Analysis Is Underway.',
    3: 'The Impact Has Been Measured.',
    4: 'Documentation Quality Is Built Into Revenue Cycle Operations.',
  },
  workforce: {
    1: 'After-Hours Burden Is Being Reduced.',
    2: 'Burden Reduction Is Measured.',
    3: 'Retention Impact Is Being Tracked.',
    4: 'Labor Costs Are Reflecting the Difference.',
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
  nextLevelTeaser?: string;
  warningBanner?: string;
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
  _providerRate: number,
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
        context: 'Enter minutes returned per documented encounter, or check the benchmark box to continue.',
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
      headlineMetric: `${recoveredHours.toLocaleString()} hours returned annually`,
      context: `Your ${providers.toLocaleString()} providers document ${documentedEncounters.toLocaleString()} encounters annually. At ${ts} minutes returned per encounter, that's ${recoveredHours.toLocaleString()} hours — ${fte} FTE equivalent.\n\nThis is the raw material. Whether it becomes revenue, avoided cost, or clinician sustainability depends on what your organization decides to do with it.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE equivalent] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}`,
      footnote: 'Time recovery is the foundation. Value is determined by where this time goes — which is what Levels 2–4 measure.',
      nextLevelTeaser: 'Level 2 — Is this number in front of your leadership with a plan attached to it?',
    };
  }

  if (level === 2) {
    const ts = (inputs.timeSaved as number) || 0;
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
    const recoveredHours = Math.round(documentedEncounters * ts / 60);
    const fte = (recoveredHours / 2080).toFixed(1);
    const aggregated = inputs.capacityAggregated as string | undefined;
    const leadershipDecision = inputs.capacityLeadershipDecision as string | undefined;
    let decisionStatus = 'pending';
    if (aggregated === 'yes' && leadershipDecision === 'yes') {
      decisionStatus = 'confirmed';
    } else if (aggregated === 'yes' && leadershipDecision === 'partial') {
      decisionStatus = 'in progress';
    }
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours quantified. Decision ${decisionStatus}.`,
      context: `Your organization has quantified ${recoveredHours.toLocaleString()} hours of recovered capacity annually — ${fte} FTE equivalent.\n\nThe operational question is timing: organizations that bring this number to leadership with a recommended use tend to move from quantification to deployment within a single quarter.`,
      formula: `[recoveredHours] = ${documentedEncounters.toLocaleString()} × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE equivalent] = ${recoveredHours.toLocaleString()} / 2,080 = ${fte}`,
      footnote: 'A dollar value appears at Level 3, when recovered capacity is directed toward a specific operational outcome.',
      nextLevelTeaser: 'Level 3 — This becomes a dollar value when the hours have a destination: more patients seen.',
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
    const annualAdditionalVisits = additionalPatients * redesignedProviders * 11;
    const accessRevenue = Math.round(annualAdditionalVisits * revenuePerVisit);
    const confidence = inputs.capacityAccessConfidence as string | undefined;
    const isAspirational = confidence === 'aspirational';
    return {
      label: 'Estimated Impact',
      value: accessRevenue,
      hasValue: true,
      headlineMetric: `${formatDollar(accessRevenue)} in access revenue annually`,
      context: `Recovered time has a destination — and that destination generates revenue.\n\n${additionalPatients} additional patient${additionalPatients !== 1 ? 's' : ''} per provider per month, across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''}, is ${annualAdditionalVisits.toLocaleString()} new encounters annually at ${formatDollar(revenuePerVisit)} per visit.`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 11 clinical months = ${annualAdditionalVisits.toLocaleString()}\n[accessRevenue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}`,
      footnote: 'Uses 11 clinical months (230 working days ÷ ~21 working days/month). Revenue per visit from your baseline inputs.',
      nextLevelTeaser: 'Level 4 — Is ambient changing whether you need to hire at all?',
      warningBanner: isAspirational ? 'Planning scenario — based on your stated target, not confirmed scheduling data. Treat as a goal, not an actuals figure.' : undefined,
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
  const annualCostPerFte = (inputs.annualCostPerFte as number) || 0;
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
    headlineMetric: `${formatDollar(capacityValue)} in avoided workforce cost`,
    context: `This is your most durable capacity value — not revenue you might earn, but a cost your organization did not incur because ambient-enabled capacity made the hire unnecessary.\n\n${fteAvoided} FTE × ${formatDollar(annualCostPerFte)} fully-loaded cost = ${formatDollar(capacityValue)} per year.${planCount > 0 ? `\n\nConnected to ${planCount} planning area${planCount > 1 ? 's' : ''}: ${checkedLabels.join(', ')}` : ''}${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
    formula: `[avoidedWorkforceCost] = ${fteAvoided} FTE × ${formatDollar(annualCostPerFte)} / FTE = ${formatDollar(capacityValue)}`,
    footnote: 'Fully-loaded cost includes salary, benefits, malpractice, and recruitment. AMGA benchmark: $350K–$450K per outpatient physician FTE.',
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
      headlineMetric: `${documentedEncounters.toLocaleString()} encounters documented annually. The revenue cycle impact is not yet measured.`,
      context: `When ambient and revenue cycle aren't connected, any improvement in coding accuracy or reimbursement goes unmeasured — not because it isn't happening, but because no one is looking.\n\nBringing revenue cycle into the ambient conversation is the first step. Organizations that do this tend to have a quantified impact figure before their first contract renewal.`,
      formula: '',
      footnote: 'Revenue impact is measured at Level 3, when your organization has before/after data to work with.',
      nextLevelTeaser: 'Level 2 opens when your revenue cycle team is actively analyzing the connection.',
    };
  }

  if (level === 2) {
    const INVESTIGATION_AREAS = [
      'wRVU per encounter trends',
      'ICD-10 coding specificity and code level distribution',
      'Claim denial rates related to documentation quality',
      'Collections per encounter before vs. after ambient',
      'CDI query volume before vs. after',
      'Coder productivity and turnaround time',
    ];
    const { checked } = parseCheckedItems(inputs.investigationAreas as string, INVESTIGATION_AREAS);
    const count = checked.length;

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select what\'s being analyzed.',
        context: 'Select what your revenue cycle team is analyzing to see your assessment.',
        formula: '',
        footnote: '',
      };
    }

    const checkedLabels = checked.map(shortLabel).join(', ');
    const duration = inputs.investigationDuration as string | undefined;
    const durationNote = duration === '90plus' ? '\n\nAt 90+ days, the analysis is mature enough to produce a confirmed figure — Level 3 is the natural next step.' : '';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `Analysis underway across ${count} area${count !== 1 ? 's' : ''}.`,
      context: `Your revenue cycle team is actively examining the relationship between documentation quality and ${checkedLabels}.\n\nThe faster this analysis produces a before/after number, the faster your organization has something concrete to build on.${durationNote}`,
      formula: '',
      footnote: 'A dollar value appears at Level 3, when your organization has before/after data to work with.',
      nextLevelTeaser: 'Level 3 is where the analysis becomes a number — one your CFO can work with.',
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
        context: `A ${wrvuDelta} wRVU improvement per encounter, across ${documentedEncounters.toLocaleString()} documented encounters, represents ${formatDollar(revenueImpact)} in annual revenue — sourced entirely from your organization's measured data.`,
        formula: `[revenueImpact] = ${wrvuDelta} wRVU × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} (CMS conversion factor) = ${formatDollar(revenueImpact)}`,
        footnote: `CMS conversion factor: $${conversionFactor}. Adjustable in baseline settings.`,
        nextLevelTeaser: 'Level 4 is where this becomes a managed input — built into dashboards, CDI workflows, and revenue cycle operations.',
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
        context: `A ${formatDollar(collectionsDelta)} increase in collections per encounter, across ${documentedEncounters.toLocaleString()} documented encounters, is ${formatDollar(revenueImpact)} annually — based on your organization's data.`,
        formula: `[revenueImpact] = ${formatDollar(collectionsDelta)} × ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 is where this becomes a managed input — built into dashboards, CDI workflows, and revenue cycle operations.',
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
        context: `A ${revenuePct}% revenue improvement across ${documentedEncounters.toLocaleString()} encounters at ${formatDollar(revenuePerVisit)}/visit is ${formatDollar(revenueImpact)} annually — based on your organization's measured data.`,
        formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × ${revenuePct}% = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 is where this becomes a managed input — built into dashboards, CDI workflows, and revenue cycle operations.',
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
        context: `Documentation-related denial rate: ${denialBefore}% → ${denialAfter}%. A ${denialDelta.toFixed(1)} point improvement across ${documentedEncounters.toLocaleString()} encounters.\n\nThis is your organization's data — before and after, attributed and auditable.`,
        formula: `[denialSavings] = (${denialBefore}% - ${denialAfter}%) × ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} = ${formatDollar(denialSavings)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 is where this becomes a managed input — built into dashboards, CDI workflows, and revenue cycle operations.',
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
      headlineMetric: `${count} integration${count !== 1 ? 's' : ''} active.`,
      context: `Your revenue cycle and documentation quality are formally connected across ${count} area${count !== 1 ? 's' : ''}. Enter the revenue your organization has formally attributed to complete this level.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  return {
    label: 'Estimated Impact',
    value: recognizedRevenue || 0,
    hasValue: true,
    context: `Your organization formally attributes ${formatDollar(recognizedRevenue || 0)} in annual revenue to documentation quality improvements — across ${count} integrated area${count !== 1 ? 's' : ''}: ${checkedLabels}.\n\nThis is the number that belongs in your ambient strategic narrative.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
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
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${burdenHours.toLocaleString()} hours returned to providers annually — outside clinical hours.`,
      context: `Across ${providers} providers, ambient is returning an estimated ${burdenHours.toLocaleString()} hours of after-hours documentation time annually — time that was previously spent charting outside of clinical hours.\n\nFor providers, this is one of the most immediate and personal impacts of ambient. It shows up at home, on evenings, on weekends. Tracking it is the first step to understanding what it means for sustainability and retention.`,
      formula: `[burdenHours] = ${afterHoursReduction} × ${providers} × 52 = ${burdenHours.toLocaleString()}`,
      footnote: 'Uses 52 weeks. For clinical weeks only, adjust to 46–48.',
      nextLevelTeaser: 'Level 2 — when in-clinic burden is measured alongside after-hours, the full picture of provider relief comes into focus.',
    };
  }

  if (level === 2) {
    const minutesSaved = inputs.editTimeSaved as number | undefined;
    const confirmedAfterHours = (inputs.confirmedAfterHoursReduction as number | undefined) || (inputs.afterHoursReduction as number | undefined);
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

    const clinicSavedHours = Math.round(minutesSaved * providers * 230 / 60);

    const afterHoursHours = confirmedAfterHours && confirmedAfterHours > 0
      ? Math.round(confirmedAfterHours * providers * 52)
      : 0;

    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only. Operational data shows burden reduction — clinician voice would validate and strengthen this finding.'
        : '';

    const burdenScoreBefore = inputs.burdenScoreBefore as number | undefined;
    const burdenScoreAfter = inputs.burdenScoreAfter as number | undefined;
    const burnoutNarrative = burdenScoreBefore && burdenScoreAfter && burdenScoreBefore > burdenScoreAfter
      ? `\n\nDocumentation burden score improved from ${burdenScoreBefore}/10 to ${burdenScoreAfter}/10.`
      : '';

    const totalHours = clinicSavedHours + afterHoursHours;
    const fteEquiv = Math.round(totalHours / 2080 * 10) / 10;

    const headlineMetric = afterHoursHours > 0
      ? `${clinicSavedHours.toLocaleString()} in-clinic hours + ${afterHoursHours.toLocaleString()} after-hours hours recovered annually — ${fteEquiv} FTE equivalent of provider time.`
      : `${clinicSavedHours.toLocaleString()} in-clinic hours recovered annually across ${providers} providers.`;

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric,
      context: `Your providers are getting measurable time back — inside the visit and after it.\n\nIn-clinic documentation time returned: ${clinicSavedHours.toLocaleString()} hours annually (${minutesSaved} min/provider/day × ${providers} providers × 230 clinical days).${confirmedAfterHours && confirmedAfterHours > 0 ? `\n\nAfter-hours time returned: ${afterHoursHours.toLocaleString()} hours annually.` : ''}${surveyNarrative}${burnoutNarrative}`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × 230 / 60 = ${clinicSavedHours.toLocaleString()}${afterHoursHours > 0 ? `\n[afterHoursHours] = ${confirmedAfterHours} × ${providers} × 52 = ${afterHoursHours.toLocaleString()}` : ''}`,
      footnote: '230 clinical working days. Time returned is shown in hours — dollar value appears at Level 3 when turnover data is entered.',
      nextLevelTeaser: 'Level 3 — when turnover data is in the picture, burden reduction connects to a retention value your CHRO can work with.',
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

    const hasDocShare = docBurdenShare > 0 && docDrivenCost > 0;

    const headlineMetric = hasDocShare
      ? `${formatDollar(docDrivenCost)} in documentation-attributable turnover exposure.`
      : `${totalTurnover.toFixed(1)} projected departure${totalTurnover !== 1 ? 's' : ''} per year. Enter documentation burden share to see attributable exposure.`;

    return {
      label: 'Estimated Impact',
      value: hasDocShare ? docDrivenCost : null,
      hasValue: hasDocShare,
      headlineMetric,
      context: `At ${turnoverRate}% annual turnover across ${providers} providers, your organization sees approximately ${totalTurnover.toFixed(1)} departure${totalTurnover !== 1 ? 's' : ''} per year.\n\nAt ${formatDollar(replacementCost)} replacement cost per provider, total turnover cost is ${formatDollar(totalCost)} annually.\n\n${hasDocShare ? `Of that, your estimate of ${docBurdenShare}% attributable to documentation burden represents ${formatDollar(docDrivenCost)} — the portion ambient retention improvement works directly against.` : 'Enter the share of turnover you attribute to documentation burden to see the portion ambient can influence.'}`,
      formula: `[annualDepartures] = ${providers} × ${turnoverRate}% = ${totalTurnover.toFixed(1)}\n[totalCost] = ${totalTurnover.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}${hasDocShare ? `\n[docDriven] = ${formatDollar(totalCost)} × ${docBurdenShare}% = ${formatDollar(docDrivenCost)}` : ''}`,
      footnote: 'All inputs are your organization\'s data. No external correlation estimates applied.',
      nextLevelTeaser: 'Level 4 — when agency and locum spend start to reflect the difference, it shows up directly in the P&L.',
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
  return {
    label: 'Estimated Impact',
    value: annualSavings,
    hasValue: true,
    headlineMetric: `${formatDollar(annualSavings)} in annual labor spend reduction.${cumulativeSavings > 0 ? ` ${formatDollar(cumulativeSavings)} already realized.` : ''}`,
    context: `Agency and locum spend is one of the most visible labor cost lines in a health system. When it decreases — and the decrease is attributable to improved provider retention — that's ambient showing up directly in your P&L.\n\n${cumulativeSavings > 0 ? `Your organization has already avoided ${formatDollar(cumulativeSavings)} in agency spend over ${monthsSustained} month${monthsSustained !== 1 ? 's' : ''}. At this rate, that's ${formatDollar(annualSavings)} annually.` : ''}`,
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
    const estimate = Math.round(documentedEncounters * revenuePerVisit * 0.008 * count);
    return {
      label: 'Estimated Impact',
      value: estimate,
      hasValue: true,
      headlineMetric: `${formatDollar(estimate)} estimated strategic value`,
      context: `Your organization treats documentation as a strategic data asset across ${count} governance area${count > 1 ? 's' : ''}:\n${checkedLabels}${ownerLine}\n\nThis is an estimate based on 0.8% of encounter revenue per strategic integration. Enter your confirmed recognized annual strategic value to replace this estimate.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: `[estimate] = ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} × 0.8% × ${count} integration${count > 1 ? 's' : ''} = ${formatDollar(estimate)}`,
      footnote: 'Estimate based on 0.8% of encounter revenue per governance integration. Replace with your confirmed number for precision.',
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
