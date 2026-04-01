import { formatDollar } from "./ambientCalculator";

export const CLINICAL_DAYS = 230;
export const CLINICAL_WEEKS = 46;
export const ANNUAL_HOURS = 1840;

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
    1: 'Time Recovered',
    2: 'Time Actively Used',
    3: 'Access Measured',
    4: 'Access Impact Tracked',
  },
  revenue: {
    1: 'Documentation Improved — Impact Unmeasured',
    2: 'Directional Signal',
    3: 'Impact Measured',
    4: 'Documentation as a Revenue Lever',
  },
  workforce: {
    1: 'Provider Sentiment Measured',
    2: 'Behavioral Change Visible',
    3: 'Retention Confirmed',
    4: 'Workforce Strategically Managed',
  },
  risk: {
    1: 'Quality Improving — Downstream Not Yet Connected',
    2: 'Actively Monitored',
    3: 'Downstream Connected',
    4: 'Documentation as a Strategic Asset',
  },
};


export const CAPACITY_TIME_USAGE_LABELS = [
  'Additional patient appointments being scheduled',
  'Extended visit time for complex patients',
  'Same-day or urgent access slots opened',
  'Teaching, mentoring, or supervision time',
  'Administrative or committee work',
  'Research or quality improvement projects',
];

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

export const SCORE_MAP: Record<ActivationLevel, number> = { 1: 4, 2: 12, 3: 19, 4: 25 };

export function computeDomainScore(domain: Domain, level: ActivationLevel, inputs: Record<string, number | string>): number {
  const base = SCORE_MAP[level] || 0;
  if (domain === 'workforce' && (level === 3 || level === 4)) {
    if (level === 3) {
      const beforeTurnoverRate = inputs.beforeTurnoverRate as number | undefined;
      const afterTurnoverRate = inputs.afterTurnoverRate as number | undefined;
      const hasDelta = beforeTurnoverRate && beforeTurnoverRate > 0 &&
        afterTurnoverRate !== undefined && afterTurnoverRate >= 0 && afterTurnoverRate < beforeTurnoverRate;
      if (!hasDelta) {
        return 12;
      }
    }
    if (level === 4) {
      const strategyCsv = inputs.workforceStrategies as string | undefined;
      const strategyCount = (strategyCsv || '').split(',').filter(Boolean).length;
      const agencyReduction = inputs.agencyReduction as number | undefined;
      if (strategyCount === 0 && (!agencyReduction || agencyReduction <= 0)) {
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
): DomainFeedback {
  const timeSaved = inputs.timeSaved as number | undefined;
  const hasTimeSaved = timeSaved !== undefined && timeSaved > 0;

  if (level === 1) {
    const ts = hasTimeSaved ? timeSaved! : 0;
    const recoveredHours = Math.round(documentedEncounters * ts / 60);
    if (recoveredHours === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter time saved per encounter to calculate.',
        context: `${providers.toLocaleString()} providers documenting ${documentedEncounters.toLocaleString()} encounters annually. Enter minutes saved per encounter to estimate recovered hours.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 2 aggregates these hours for leadership review and operational decisions.',
      };
    }
    const fte = (recoveredHours / ANNUAL_HOURS).toFixed(1);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours returned annually`,
      context: `${providers.toLocaleString()} providers document ${documentedEncounters.toLocaleString()} encounters annually. At ${ts} minutes returned per encounter, that is ${recoveredHours.toLocaleString()} hours — ${fte} FTE equivalent.\n\n$0 deployed. Time is recovered but no operational decision has been made about how to use it.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE equivalent] = ${recoveredHours.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} (${CLINICAL_DAYS} clinical days × 8 hrs) = ${fte}`,
      footnote: 'Recovered hours represent available capacity. Financial value depends on how this time is allocated at higher maturity levels.',
      nextLevelTeaser: 'Level 2 aggregates these hours for leadership review and operational decisions.',
    };
  }

  if (level === 2) {
    const ts = (inputs.timeSaved as number) || 0;
    const recoveredHrs = ts > 0 ? Math.round(documentedEncounters * ts / 60) : 0;
    const fte2 = recoveredHrs > 0 ? (recoveredHrs / ANNUAL_HOURS).toFixed(1) : '0.0';

    const { checked, unchecked } = parseCheckedItems(inputs.capacityTimeUsage as string, CAPACITY_TIME_USAGE_LABELS);
    const count = checked.length;
    const checkedList = checked.map(c => `• ${c}`).join('\n');
    const uncheckedList = unchecked.map(c => `• ${c}`).join('\n');

    const hoursContext = recoveredHrs > 0 ? `\n\n${recoveredHrs.toLocaleString()} hours (${fte2} FTE) recovered annually across ${providers.toLocaleString()} providers.` : '';

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select how recovered time is being used',
        context: `Select the ways your organization is actively using recovered documentation time.${hoursContext}\n\n$0 deployed. The value at this level is understanding where time goes — not dollars.`,
        formula: recoveredHrs > 0 ? `[hours] = ${documentedEncounters.toLocaleString()} encounters × ${ts} min / 60 = ${recoveredHrs.toLocaleString()}\n[FTE] = ${recoveredHrs.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} = ${fte2}` : '',
        footnote: '',
        nextLevelTeaser: 'Level 3 measures how many additional patients are seen with recovered time.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} active use${count !== 1 ? 's' : ''} of recovered time`,
      context: `Recovered time is actively being used in ${count} way${count !== 1 ? 's' : ''}:\n${checkedList}${hoursContext}\n\n$0 deployed. The value at this level is understanding where time goes — not dollars.`,
      formula: recoveredHrs > 0 ? `[hours] = ${documentedEncounters.toLocaleString()} encounters × ${ts} min / 60 = ${recoveredHrs.toLocaleString()}\n[FTE] = ${recoveredHrs.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} = ${fte2}` : '',
      footnote: '',
      nextLevelTeaser: 'Level 3 measures how many additional patients are seen with recovered time.',
    };
  }

  if (level === 3) {
    const additionalPatients = inputs.additionalPatientsPerMonth as number | undefined;
    if (!additionalPatients || additionalPatients <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter additional patients per provider per month to calculate access revenue.',
        context: '',
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 tracks downstream access outcomes — panel growth, referral conversion, same-day access — attributed to recovered time.',
      };
    }
    const redesignedProviders = (inputs.redesignedProviders as number) > 0 ? (inputs.redesignedProviders as number) : providers;
    const annualAdditionalVisits = additionalPatients * redesignedProviders * 11;
    const accessRevenue = Math.round(annualAdditionalVisits * revenuePerVisit);
    const confidence = (inputs.capacityAccessConfidence as string) || 'estimated';
    const confidenceMultiplier =
      confidence === 'measured' ? 1.0 :
      confidence === 'estimated' ? 0.7 :
      confidence === 'aspirational' ? 0.5 : 0.7;
    const adjustedRevenue = Math.round(accessRevenue * confidenceMultiplier);
    const confidenceNote = confidenceMultiplier < 1
      ? ` (${Math.round((1 - confidenceMultiplier) * 100)}% confidence adjustment applied \u2014 data marked as ${confidence})`
      : '';
    const isAspirational = confidence === 'aspirational';
    const isMeasured = confidence === 'measured';

    const headlineMetric = isMeasured
      ? `${formatDollar(adjustedRevenue)} in access revenue annually`
      : isAspirational
        ? `${formatDollar(adjustedRevenue)} access revenue target`
        : `${formatDollar(adjustedRevenue)} in access revenue annually (estimated)`;

    const confidenceFraming = isMeasured
      ? 'Based on your confirmed scheduling data.'
      : isAspirational
        ? 'This is a planning target, not confirmed data.'
        : 'Based on your organization\'s estimate. Validate with scheduling data to confirm.';

    return {
      label: 'Estimated Impact',
      value: adjustedRevenue,
      hasValue: true,
      headlineMetric,
      context: `${additionalPatients} additional patient${additionalPatients !== 1 ? 's' : ''} per provider per month across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''} = ${annualAdditionalVisits.toLocaleString()} new encounters annually at ${formatDollar(revenuePerVisit)} per visit.${confidenceNote}\n\n${confidenceFraming}`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 11 clinical months = ${annualAdditionalVisits.toLocaleString()}\n[accessRevenue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}${confidenceMultiplier < 1 ? `\n[adjusted] = ${formatDollar(accessRevenue)} × ${confidenceMultiplier} = ${formatDollar(adjustedRevenue)}` : ''}`,
      footnote: isAspirational
        ? `⚠ Your access data is marked as a planning target, not confirmed scheduling data. This figure is a planning scenario — validate with actual scheduling records before using it in leadership conversations. Uses 11 clinical months. Revenue per visit uses your baseline input of ${formatDollar(revenuePerVisit)}.`
        : `Uses 11 clinical months (230 working days ÷ ~21 working days/month). Revenue per visit uses your baseline input of ${formatDollar(revenuePerVisit)}. If additional visits are typically shorter or lower-complexity than your average, adjust revenue per visit in your baseline settings.`,
      nextLevelTeaser: 'Level 4 tracks downstream access outcomes — panel growth, referral conversion, same-day access — attributed to recovered time.',
      warningBanner: isAspirational ? 'Planning scenario — based on your stated target, not confirmed scheduling data. Treat as a goal, not an actuals figure.' : undefined,
    };
  }

  const ACCESS_OUTCOME_LABELS = [
    'Panel size increased',
    'New patient slots opened',
    'Same-day/urgent access expanded',
    'Referral-to-visit time reduced',
    'Third-next-available improved',
    'No-show backfill utilized',
  ];
  const outcomesCsv = inputs.accessOutcomes as string | undefined;
  const checkedSet = new Set((outcomesCsv || '').split(',').filter(Boolean));
  const checkedLabels = ACCESS_OUTCOME_LABELS.filter((_, i) => checkedSet.has(String(i)));
  const uncheckedLabels = ACCESS_OUTCOME_LABELS.filter((_, i) => !checkedSet.has(String(i)));
  const outcomeCount = checkedLabels.length;

  const l4Patients = (inputs.additionalPatientsPerMonth as number) || 0;
  const l4Providers = (inputs.redesignedProviders as number) || providers;

  const downstreamNarrative = '\n\nEvery additional patient entering your system also generates downstream activity — labs, imaging, referrals, follow-up visits, and procedures. The access revenue above captures the initial visit. The full system value of these patients is significantly higher.';

  if (outcomeCount === 0 && l4Patients <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select access outcomes your organization is tracking',
      context: 'Check the downstream access outcomes being measured as a result of recovered capacity, and enter confirmed additional patients per provider per month.',
      formula: '',
      footnote: '',
    };
  }

  if (outcomeCount > 0 && l4Patients <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${outcomeCount} access outcome${outcomeCount > 1 ? 's' : ''} tracked`,
      context: `Your organization is tracking ${outcomeCount} downstream access outcome${outcomeCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}\n\nEnter confirmed additional patients per provider per month to calculate access revenue.`,
      formula: '',
      footnote: '',
    };
  }

  const annualVisits = Math.round(l4Patients * l4Providers * 11);
  const accessRevenue = Math.round(annualVisits * revenuePerVisit);

  return {
    label: 'Estimated Impact',
    value: accessRevenue,
    hasValue: true,
    headlineMetric: `${formatDollar(accessRevenue)} in measured access revenue`,
    context: `${outcomeCount} access outcome${outcomeCount > 1 ? 's' : ''} tracked\n\n${l4Patients} additional patients/provider/month × ${l4Providers} providers × 11 clinical months = ${annualVisits.toLocaleString()} visits.\nDirect access: ${annualVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}${outcomeCount > 0 ? `\n\nYour organization is tracking ${outcomeCount} downstream access outcome${outcomeCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}` : ''}${downstreamNarrative}`,
    formula: `[annualVisits] = ${l4Patients} patients/mo × ${l4Providers} providers × 11 months = ${annualVisits.toLocaleString()}\n[accessRevenue] = ${annualVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}`,
    footnote: 'Uses 11 clinical months (230 working days ÷ ~21 working days/month). Revenue per visit from your baseline inputs.\nEstimates based on your inputs. Individual results vary.',
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
      headlineMetric: 'Documentation quality has improved. Revenue impact not yet analyzed.',
      context: `Documentation specificity has improved across ${documentedEncounters.toLocaleString()} encounters. No one has analyzed whether this is affecting coding, collections, or reimbursement.`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 2 involves observing trends in coding, denials, and collections.',
    };
  }

  if (level === 2) {
    const { checked } = parseCheckedItems(inputs.observedMovement as string, REVENUE_SIGNALS);
    const count = checked.length;
    const checkedLabels = checked.map(shortLabel).join(', ');

    if (count === 0) {
      return {
        label: 'Revenue Signals Observed',
        value: null,
        hasValue: false,
        headlineMetric: 'Select the revenue signals your organization has observed.',
        context: 'Check the areas where your team has seen movement since ambient documentation deployment.',
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3: A retrospective coding audit confirms the dollar value behind what you\'re seeing.',
      };
    }

    return {
      label: 'Revenue Signals Observed',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 6 revenue signals observed`,
      context: `Your organization has observed changes in ${count} area${count !== 1 ? 's' : ''}:\n${checkedLabels}\n\nThese are leading indicators — a retrospective coding audit is the typical next step to produce a confirmed number.`,
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Level 3: Run a retrospective coding audit. Most organizations find $2K–$6K per provider annually in coding and denial impact when they first run this analysis.',
    };
  }

  if (level === 3) {
    const metricType = inputs.revenueMetricType as string | undefined;
    const direction = (inputs.revenueMetricDirection as string) || 'increase';
    const isDecrease = direction === 'decrease';
    const attributionConfidence = (inputs.attributionConfidence as string) || 'medium';
    const attributionMultiplier =
      attributionConfidence === 'high' ? 0.90 :
      attributionConfidence === 'low' ? 0.50 : 0.70;
    const attributionPct = Math.round(attributionMultiplier * 100);

    if (!metricType) {
      return {
        label: 'Impact Measured',
        value: null, hasValue: false,
        headlineMetric: 'Select what you measured.',
        context: 'Choose the metric your organization has data on.',
        formula: '', footnote: '',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'wrvu') {
      const wrvuDelta = inputs.measuredWrvuDelta as number | undefined;
      if (!wrvuDelta || wrvuDelta <= 0) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: 'Enter measured wRVU change to calculate.',
          context: 'Enter your wRVU change per encounter, then select the direction.',
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      if (isDecrease) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: `wRVU per encounter decreased ${wrvuDelta}`,
          context: `A decrease in wRVU per encounter is unexpected with documentation improvement. This may indicate the analysis hasn't been isolated from other variables yet — case mix shifts, specialty changes, or payer mix could be factors.\n\nAbridge benchmark: 0.05–0.15 wRVU increase per encounter.`,
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const rawImpact = Math.round(wrvuDelta * documentedEncounters * conversionFactor);
      const revenueImpact = Math.round(rawImpact * attributionMultiplier);
      return {
        label: 'Impact Measured',
        value: revenueImpact, hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `wRVU per encounter increased ${wrvuDelta} × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} conversion factor = ${formatDollar(rawImpact)}\n\n${attributionPct}% attribution applied · ${formatDollar(revenueImpact)}/year\n\nBased on your organization's measured data.`,
        formula: `[rawImpact] = ${wrvuDelta} × ${documentedEncounters.toLocaleString()} × $${conversionFactor} = ${formatDollar(rawImpact)}\n[revenueImpact] = ${formatDollar(rawImpact)} × ${attributionPct}% = ${formatDollar(revenueImpact)}`,
        footnote: `CMS conversion factor from your baseline inputs. ${attributionPct}% attribution confidence applied. Individual results vary.`,
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'collections') {
      const collectionsDelta = inputs.measuredCollectionsDelta as number | undefined;
      if (!collectionsDelta || collectionsDelta <= 0) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: 'Enter measured collections change to calculate.',
          context: 'Enter the dollar change per encounter, then select the direction.',
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      if (isDecrease) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: `Collections per encounter decreased ${formatDollar(collectionsDelta)}`,
          context: `A decrease in collections per encounter warrants investigation — this may reflect payer mix changes or other variables unrelated to documentation quality.`,
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const rawImpact = Math.round(collectionsDelta * documentedEncounters);
      const revenueImpact = Math.round(rawImpact * attributionMultiplier);
      return {
        label: 'Impact Measured',
        value: revenueImpact, hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `${formatDollar(collectionsDelta)} increase per encounter × ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(rawImpact)}\n\n${attributionPct}% attribution applied · ${formatDollar(revenueImpact)}/year\n\nBased on your organization's measured data.`,
        formula: `[rawImpact] = ${formatDollar(collectionsDelta)} × ${documentedEncounters.toLocaleString()} = ${formatDollar(rawImpact)}\n[revenueImpact] = ${formatDollar(rawImpact)} × ${attributionPct}% = ${formatDollar(revenueImpact)}`,
        footnote: `${attributionPct}% attribution confidence applied. Individual results vary.`,
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'denial_rate') {
      const denialPct = inputs.measuredDenialReduction as number | undefined;
      const monthlyBilled = inputs.monthlyBilledAmount as number | undefined;

      if (!denialPct || denialPct <= 0) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: 'Enter denial rate change to calculate.',
          context: 'Enter the percentage point change in your documentation-related denial rate, select the direction, and optionally enter monthly billed amount for a dollar figure.',
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }

      if (isDecrease) {
        if (monthlyBilled && monthlyBilled > 0) {
          const rawRecovery = Math.round((denialPct / 100) * monthlyBilled * 12);
          const annualRecovery = Math.round(rawRecovery * attributionMultiplier);
          return {
            label: 'Impact Measured',
            value: annualRecovery, hasValue: true,
            headlineMetric: `${formatDollar(annualRecovery)} in recovered annual revenue`,
            context: `Denial rate decreased ${denialPct} percentage point${denialPct !== 1 ? 's' : ''}.\n\n${denialPct}% × ${formatDollar(monthlyBilled)} monthly billed × 12 months = ${formatDollar(rawRecovery)} annually.\n\n${attributionPct}% attribution applied · ${formatDollar(annualRecovery)}/year\n\nBased on your organization's measured data.`,
            formula: `[rawRecovery] = ${denialPct}% × ${formatDollar(monthlyBilled)} × 12 = ${formatDollar(rawRecovery)}\n[annualRecovery] = ${formatDollar(rawRecovery)} × ${attributionPct}% = ${formatDollar(annualRecovery)}`,
            footnote: `Based on total billed charges. ${attributionPct}% attribution confidence applied. Actual recovery depends on denial resolution rate. Individual results vary.`,
            nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
          };
        }
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: `Denial rate decreased ${denialPct} percentage point${denialPct !== 1 ? 's' : ''}`,
          context: `Documentation-related denial rate improved by ${denialPct}pp.\n\nTo calculate the dollar impact, enter your average monthly billed amount above.`,
          formula: '', footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }

      return {
        label: 'Impact Measured',
        value: null, hasValue: false,
        headlineMetric: `Denial rate increased ${denialPct} percentage point${denialPct !== 1 ? 's' : ''}`,
        context: `An increase in documentation-related denials is unexpected with ambient documentation deployment. This may indicate the analysis includes denial categories outside documentation quality, or other operational factors are at play. Worth isolating documentation-specific denial codes before drawing conclusions.`,
        formula: '', footnote: '',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    return {
      label: 'Impact Measured',
      value: null, hasValue: false,
      headlineMetric: 'Select measurement type to calculate.',
      context: '',
      formula: '', footnote: '',
      nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.revenueIntegrations as string, REVENUE_INTEGRATIONS);
  const recognizedRevenue = inputs.recognizedRevenue as number | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');
  const noConfirmedRevenue = inputs.noConfirmedRevenue === 'true';
  const hasRevenue = recognizedRevenue !== undefined && recognizedRevenue > 0;

  if (hasRevenue) {
    let context: string;
    if (count > 0) {
      context = `Documentation intelligence is driving revenue strategy across ${count} area${count !== 1 ? 's' : ''}:\n${checkedLabels}\n\nYour organization formally attributes ${formatDollar(recognizedRevenue!)} in annual revenue to documentation quality. This figure is incorporated into financial planning.`;
    } else {
      context = `Your organization formally attributes ${formatDollar(recognizedRevenue!)} in annual revenue to documentation quality. Select strategic integrations above to show how documentation intelligence connects to revenue operations.`;
    }
    return {
      label: 'Estimated Impact',
      value: recognizedRevenue!,
      hasValue: true,
      headlineMetric: `${formatDollar(recognizedRevenue!)} in attributed annual revenue`,
      context,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
    };
  }

  if (count > 0) {
    let context = `Documentation intelligence is driving revenue strategy across ${count} area${count !== 1 ? 's' : ''}:\n${checkedLabels}`;
    if (noConfirmedRevenue) {
      context += `\n\nNo confirmed revenue attribution yet. Planning estimate: ${providers} providers × $2K–$6K per provider/year in coding and denial impact = ${formatDollar(providers * 2000)}–${formatDollar(providers * 6000)} annually. Source: AMA/MGMA coding benchmarks and CDI program data. Enter a confirmed number when finance or revenue cycle has run the analysis.`;
    } else {
      context += `\n\nEnter your attributed annual revenue when available. Organizations at this level typically have a figure that revenue cycle and finance leadership reference in planning.`;
    }
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: noConfirmedRevenue ? `${count} strategic integration${count !== 1 ? 's' : ''} — revenue not yet confirmed` : `${count} strategic integration${count !== 1 ? 's' : ''}`,
      context,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
    };
  }

  return {
    label: 'Estimated Impact',
    value: null,
    hasValue: false,
    headlineMetric: 'Select strategic integrations and enter attributed revenue.',
    context: `Planning estimate: ${providers} providers × $2K–$6K per provider/year in coding and denial impact = ${formatDollar(providers * 2000)}–${formatDollar(providers * 6000)} annually. Source: AMA/MGMA coding benchmarks and CDI program data. Select an integration above and enter attributed revenue to replace this estimate with your actual data.`,
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
): DomainFeedback {
  if (level === 1) {
    const minutesSaved = inputs.editTimeSaved as number | undefined;
    const surveyType = inputs.surveyType as string | undefined;
    const surveyFindingsStr = inputs.surveyFindings as string | undefined;
    const checkedFindings = surveyFindingsStr ? surveyFindingsStr.split(',').map(Number) : [];
    const checkedCount = checkedFindings.length;
    const checkedLabels = checkedFindings.map(i => SURVEY_FINDING_LABELS[i]).filter(Boolean);

    if (!minutesSaved || minutesSaved <= 0) {
      const lowHrs = Math.round(providers * 10 * CLINICAL_DAYS / 60);
      const highHrs = Math.round(providers * 20 * CLINICAL_DAYS / 60);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter in-clinic time savings to calculate.',
        context: `Published benchmark: 10–20 minutes per provider per day of in-clinic burden reduction (MGMA Physician Productivity data). At ${providers.toLocaleString()} providers, that is ${lowHrs.toLocaleString()}–${highHrs.toLocaleString()} hours annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 2 captures observable behavioral changes — after-hours patterns, time at home, note completion.',
      };
    }

    const clinicSavedHours = Math.round(minutesSaved * providers * CLINICAL_DAYS / 60);
    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only.'
        : '';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${clinicSavedHours.toLocaleString()} in-clinic hours recovered annually across ${providers} providers.`,
      context: `In-clinic documentation time returned: ${clinicSavedHours.toLocaleString()} hours annually (${minutesSaved} min/provider/day × ${providers} providers × ${CLINICAL_DAYS} clinical days).${surveyNarrative}`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × ${CLINICAL_DAYS} / 60 = ${clinicSavedHours.toLocaleString()}`,
      footnote: `${CLINICAL_DAYS} clinical working days. Dollar value connects at Level 3 when turnover data is entered.`,
      nextLevelTeaser: 'Level 2 captures observable behavioral changes — after-hours patterns, time at home, note completion.',
    };
  }

  if (level === 2) {
    const BEHAVIORAL_CHANGE_LABELS = [
      'After-hours documentation time reduced',
      'Leaving clinic on time more consistently',
      'Taking lunch breaks resumed',
      'Work-outside-of-work documentation eliminated or reduced',
      'Weekend catch-up work reduced',
      'Notes completed before leaving the clinic',
      'More present at home / personal time reclaimed',
    ];

    const behaviorsCsv = inputs.observedBehaviors as string | undefined;
    const behaviorSet = new Set((behaviorsCsv || '').split(',').filter(Boolean));
    const behaviorCount = behaviorSet.size;
    const checkedBehaviorLabels = BEHAVIORAL_CHANGE_LABELS.filter((_, i) => behaviorSet.has(String(i)));
    const afterHoursReduction = inputs.afterHoursReduction as number | undefined;
    const afterHoursHours = (afterHoursReduction && afterHoursReduction > 0)
      ? Math.round(afterHoursReduction * providers * CLINICAL_WEEKS)
      : 0;

    if (behaviorCount === 0 && !afterHoursReduction) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select observable behavioral changes to document impact.',
        context: 'At this level, the story is behavioral, not just time. Providers leaving on time, taking lunch, not documenting on weekends — these are the signals that retention impact is building.',
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects behavioral change to measured turnover rate improvement.',
      };
    }

    const headlineParts: string[] = [];
    if (behaviorCount > 0) headlineParts.push(`${behaviorCount} behavioral change${behaviorCount !== 1 ? 's' : ''} documented`);
    if (afterHoursHours > 0) headlineParts.push(`${afterHoursHours.toLocaleString()} after-hours hours returned annually`);

    let contextText = '';
    if (checkedBehaviorLabels.length > 0) {
      contextText += `Observable behavioral changes documented across your provider population:\n${checkedBehaviorLabels.map(l => `• ${l}`).join('\n')}`;
    }
    if (afterHoursHours > 0) {
      contextText += `\n\nAfter-hours reduction: ${afterHoursReduction} hrs/week × ${providers} providers × ${CLINICAL_WEEKS} clinical weeks = ${afterHoursHours.toLocaleString()} hours returned annually.`;
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: headlineParts.join('\n'),
      context: contextText,
      formula: afterHoursHours > 0 ? `[afterHoursHours] = ${afterHoursReduction} × ${providers} × ${CLINICAL_WEEKS} = ${afterHoursHours.toLocaleString()}` : '',
      footnote: 'Behavioral changes are qualitative indicators. Financial value connects at Level 3 when turnover data is entered.',
      nextLevelTeaser: 'Level 3 connects behavioral change to measured turnover rate improvement.',
    };
  }

  if (level === 3) {
    const beforeTurnoverRate = inputs.beforeTurnoverRate as number | undefined;
    const afterTurnoverRate = inputs.afterTurnoverRate as number | undefined;
    const replacementCostRaw = inputs.replacementCost as number | undefined;
    const replacementCost = (replacementCostRaw && replacementCostRaw > 0) ? replacementCostRaw : 350000;
    const isDefaultReplacementCost = !replacementCostRaw || replacementCostRaw === 350000;

    if (!beforeTurnoverRate || beforeTurnoverRate <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter before and after turnover rates to calculate retention value.',
        context: `Enter your turnover rate before and after Abridge deployment to calculate the financial value of improved retention. Use the AMGA benchmark replacement cost ($350K) or your organization's actual figure.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 connects burden reduction to workforce strategy — recruitment, retention programs, staffing decisions.',
      };
    }

    const effectiveAfterRate = (afterTurnoverRate !== undefined && afterTurnoverRate >= 0) ? afterTurnoverRate : beforeTurnoverRate;
    const rateDelta = beforeTurnoverRate - effectiveAfterRate;

    if (rateDelta <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'After rate should be lower than before rate to show retention value.',
        context: `Current inputs show turnover moved from ${beforeTurnoverRate}% to ${effectiveAfterRate}%. Enter an after rate lower than the before rate to calculate the financial value of retention improvement.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 connects burden reduction to workforce strategy — recruitment, retention programs, staffing decisions.',
      };
    }

    const departuresAvoided = providers * (rateDelta / 100);
    const retentionValue = Math.round(departuresAvoided * replacementCost);
    const replacementLabel = isDefaultReplacementCost
      ? `AMGA benchmark: ${formatDollar(replacementCost)}/physician`
      : `Your input: ${formatDollar(replacementCost)}/physician`;

    return {
      label: 'Confirmed Impact',
      value: retentionValue,
      hasValue: true,
      headlineMetric: `${formatDollar(retentionValue)} in retention value from ${rateDelta.toFixed(1)} pp improvement in physician turnover.`,
      context: `Turnover rate moved from ${beforeTurnoverRate}% to ${effectiveAfterRate}% — a ${rateDelta.toFixed(1)} percentage point improvement across ${providers} providers.\n\nDepartures avoided: ${providers} × ${rateDelta.toFixed(1)}% = ${departuresAvoided.toFixed(1)} physicians.\nReplacement cost: ${replacementLabel}.\nRetention value: ${departuresAvoided.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(retentionValue)}.`,
      formula: `[departuresAvoided] = ${providers} × (${beforeTurnoverRate}% − ${effectiveAfterRate}%) = ${departuresAvoided.toFixed(1)}\n[retentionValue] = ${departuresAvoided.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(retentionValue)}`,
      footnote: isDefaultReplacementCost ? 'Replacement cost uses AMGA benchmark midpoint ($350K). Update if your organization tracks actual replacement cost.' : 'Replacement cost based on your input.',
      nextLevelTeaser: 'Level 4 connects burden reduction to workforce strategy — recruitment, retention programs, staffing decisions.',
    };
  }

  const WORKFORCE_STRATEGY_LABELS = [
    'Recruitment and hiring — ambient documentation is part of the value proposition to candidates',
    'Retention program design — burden reduction is a measured component of retention initiatives',
    'Time-to-fill tracking — positions are filling faster partly attributed to improved work environment',
    'Provider experience strategy — documentation burden metrics are tracked alongside satisfaction and engagement',
    'Staffing model decisions — documentation efficiency informs how shifts, panels, or coverage are structured',
    'Agency/locum spend actively managed against burden reduction trends',
  ];
  const WORKFORCE_OUTCOME_LABELS = [
    'Turnover rate decreased',
    'Time-to-fill for positions decreased',
    'Agency or locum reliance decreased',
    'Provider satisfaction scores improved',
    'Recruitment acceptance rates improved',
  ];

  const strategyCsv = inputs.workforceStrategies as string | undefined;
  const strategySet = new Set((strategyCsv || '').split(',').filter(Boolean));
  const checkedStrategies = WORKFORCE_STRATEGY_LABELS.filter((_, i) => strategySet.has(String(i)));
  const uncheckedStrategies = WORKFORCE_STRATEGY_LABELS.filter((_, i) => !strategySet.has(String(i)));
  const strategyCount = checkedStrategies.length;

  const outcomesStatus = (inputs.workforceOutcomesStatus as string) || '';
  const outcomesCsv = inputs.workforceOutcomes as string | undefined;
  const outcomeSet = new Set((outcomesCsv || '').split(',').filter(Boolean));
  const checkedOutcomes = WORKFORCE_OUTCOME_LABELS.filter((_, i) => outcomeSet.has(String(i)));
  const outcomeCount = checkedOutcomes.length;

  const agencyReduction = (inputs.agencyReduction as number) || 0;
  const annualAgencySavings = agencyReduction > 0 ? Math.round(agencyReduction * 12) : 0;
  const timeFillReduction = (inputs.timeFillReduction as number) || 0;
  const annualTimeFillSavings = timeFillReduction > 0 ? Math.round(timeFillReduction * 12) : 0;
  const hasTimeFill = annualTimeFillSavings > 0;
  const totalWorkforceL4Value = annualAgencySavings + annualTimeFillSavings;

  if (strategyCount === 0 && agencyReduction <= 0 && timeFillReduction <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select where documentation burden data is informing workforce strategy.',
      context: 'Ambient documentation isn\'t just reducing burden — it\'s informing how your organization approaches workforce challenges. Recruitment, retention program design, staffing models, and provider experience strategy are connected to documentation burden data.',
      formula: '',
      footnote: '',
    };
  }

  const hasAgency = annualAgencySavings > 0;
  const headlineParts: string[] = [];
  if (hasAgency) headlineParts.push(`${formatDollar(annualAgencySavings)} in agency/locum reduction`);
  if (hasTimeFill) headlineParts.push(`${formatDollar(annualTimeFillSavings)} in vacancy/time-to-fill savings`);
  if (strategyCount > 0) headlineParts.push(`${strategyCount} strategic integration${strategyCount !== 1 ? 's' : ''}`);
  if (outcomesStatus === 'yes' && outcomeCount > 0) headlineParts.push(`${outcomeCount} workforce outcome${outcomeCount !== 1 ? 's' : ''} measured`);

  let contextParts = '';
  if (strategyCount > 0) {
    contextParts += `Documentation burden reduction is informing workforce strategy across ${strategyCount} area${strategyCount !== 1 ? 's' : ''}:\n${checkedStrategies.map(s => `• ${s.split(' — ')[0]}`).join('\n')}`;
  }
  if (outcomesStatus === 'yes' && outcomeCount > 0) {
    contextParts += `\n\nMeasured workforce outcomes:\n${checkedOutcomes.map(o => `• ${o}`).join('\n')}`;
  } else if (outcomesStatus === 'anecdotal') {
    contextParts += '\n\nWorkforce outcomes are anecdotally observed but not yet formally measured.';
  } else if (!outcomesStatus || outcomesStatus === 'not_yet') {
    contextParts += '\n\nWorkforce outcomes have not yet been formally measured. Organizations at this level that track outcomes typically identify improvements in turnover rate, time-to-fill, and provider satisfaction.';
  }
  if (hasAgency) {
    contextParts += `\n\nAgency/locum reduction: ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualAgencySavings)} annually.`;
  }
  if (hasTimeFill) {
    contextParts += `\n\nVacancy/time-to-fill savings: ${formatDollar(timeFillReduction)} × 12 = ${formatDollar(annualTimeFillSavings)} annually.`;
  }
  return {
    label: 'Estimated Impact',
    value: (hasAgency || hasTimeFill) ? totalWorkforceL4Value : null,
    hasValue: hasAgency || hasTimeFill,
    headlineMetric: headlineParts.join('\n'),
    context: contextParts,
    formula: [
      hasAgency ? `[annualAgencySavings] = ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualAgencySavings)}` : '',
      hasTimeFill ? `[annualTimeFillSavings] = ${formatDollar(timeFillReduction)} × 12 = ${formatDollar(annualTimeFillSavings)}` : '',
    ].filter(Boolean).join('\n'),
    footnote: 'Estimates based on your inputs. Individual results vary.',
  };
}

const QUALITY_ATTRIBUTES = [
  'Note completeness (history, exam, assessment, plan)',
  'Diagnostic specificity (ICD-10 code level and accuracy)',
  'Quality measure documentation (HEDIS, MIPS, Stars gaps)',
  'Compliance and audit readiness',
  'HCC and risk adjustment capture (for value-based populations)',
];

const DOWNSTREAM_WORKFLOWS = [
  'CDI — fewer queries, faster turnaround, or improved capture rates',
  'Coding accuracy — specificity improvements or denial reduction',
  'Quality measures — HEDIS, MIPS, or Stars gap closure improved',
  'Prior authorization — documentation supporting faster or higher approval rates',
  'Chart abstraction — less manual effort for registries, research, or reporting',
  'Risk adjustment — HCC capture or RAF accuracy improved for VBC populations',
];

const STRATEGIC_INTEGRATIONS = [
  'Quality program design — documentation data shapes HEDIS, MIPS, or Stars strategy',
  'Value-based care — documentation supports HCC accuracy, risk stratification, and population health initiatives',
  'Compliance governance — documentation quality is a governed metric with executive oversight',
  'AI and automation readiness — structured documentation is positioned as the foundation for clinical AI, predictive models, or automated reporting',
  'Payer strategy — documentation quality data informs payer negotiations or contract design',
  'Clinical research — structured documentation supports research data extraction or registry participation',
];

const REVENUE_SIGNALS = [
  'wRVU per encounter trending upward',
  'Coding specificity improving (ICD-10 distribution shifting)',
  'Denial rates trending downward',
  'Collections per encounter trending upward',
  'CDI query volume decreasing',
  'Coder productivity improving',
];

export const REVENUE_INTEGRATIONS = [
  'Specialty-level analysis identifies where documentation has the biggest revenue impact',
  'CDI strategy is informed by ambient documentation patterns and gaps',
  'Documentation quality data supports payer contract negotiations or rate discussions',
  'Denial prevention is proactive — documentation gaps identified before claims submitted',
  'Documentation-driven revenue is a line item in financial planning and forecasting',
  'Revenue cycle, CDI, and clinical leadership have a shared view of documentation-to-revenue performance',
];

export { QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, STRATEGIC_INTEGRATIONS, REVENUE_SIGNALS };

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
  _revenuePerVisit: number = 200,
  providers: number = 0,
): DomainFeedback {
  if (level === 1) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${documentedEncounters.toLocaleString()} encounters with improved documentation.`,
      context: `${documentedEncounters.toLocaleString()} encounters with improved documentation.\n\nThe value of improved documentation depends on whether coding, quality reporting, compliance, and other teams can see and use the improvement. At this level, the quality improvement is real but the downstream connection has not been established.`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 2 establishes systematic quality tracking.',
    };
  }

  if (level === 2) {
    const approach = inputs.monitoringApproach as string | undefined;
    if (!approach) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select your monitoring approach to continue.',
        context: 'Select how rigorously documentation quality is being tracked at your organization.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }

    const { checked, unchecked } = parseCheckedItems(inputs.qualityAttributes as string, QUALITY_ATTRIBUTES);
    const count = checked.length;
    const trackedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const untrackedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');

    const approachLabel = approach === 'realtime'
      ? 'real-time dashboards or automated reporting'
      : approach === 'systematic'
        ? 'structured audits or dashboards'
        : 'spot checks and informal review';

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `Quality monitored via ${approachLabel}.`,
        context: `Your organization is actively monitoring documentation quality. Select which quality dimensions are being tracked to complete this level.`,
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }

    const headlineMetric = approach === 'realtime'
      ? `${count} of 5 quality dimensions in real-time tracking`
      : approach === 'systematic'
        ? `${count} of 5 quality dimensions systematically tracked`
        : `${count} of 5 quality dimensions monitored (informal)`;

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric,
      context: `Documentation quality is actively monitored via ${approachLabel}.\n\nDimensions tracked:\n${trackedList}`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
    };
  }

  if (level === 3) {
    const financialPathway = inputs.financialPathway as string | undefined;

    if (!financialPathway || financialPathway === 'none_yet') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: financialPathway === 'none_yet' ? 'No financial pathway connected yet' : 'Select a financial pathway',
        context: financialPathway === 'none_yet'
          ? 'Documentation quality improvements are happening, but no downstream financial mechanism has been connected yet. This is the most common gap at Level 3 — the quality is real, but the financial proof hasn\'t been built.'
          : 'Select which financial pathway documentation quality is connected to.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    if (financialPathway === 'mips') {
      const mipsScore = (inputs.mipsScoreImprovement as number) || 0;
      const MIPS_PAYMENT_PER_PROVIDER = 10000;
      const mipsPaymentDelta = mipsScore > 0 ? Math.round(mipsScore * 0.04 * MIPS_PAYMENT_PER_PROVIDER * providers) : 0;
      const hasVal = mipsPaymentDelta > 0;
      const mipsContext = hasVal
        ? `MIPS score improved by ${mipsScore} points since deployment. Each point shifts the payment adjustment by ~4% of the per-provider MIPS payment pool (${formatDollar(MIPS_PAYMENT_PER_PROVIDER)}/provider benchmark), yielding an estimated ${formatDollar(mipsPaymentDelta)} in annual payment impact across ${providers.toLocaleString()} providers.`
        : 'MIPS performance is the selected pathway. Enter your score improvement to quantify the connection.';
      return {
        label: 'Estimated Impact',
        value: hasVal ? mipsPaymentDelta : null,
        hasValue: hasVal,
        headlineMetric: hasVal ? `${formatDollar(mipsPaymentDelta)} MIPS payment impact` : 'MIPS pathway selected',
        context: `${mipsContext}\n\nMIPS payment adjustments are tied directly to documentation quality — completeness, specificity, and measure capture all affect the final score.`,
        formula: hasVal ? `[mipsPaymentDelta] = ${mipsScore} points × 4% × ${formatDollar(MIPS_PAYMENT_PER_PROVIDER)}/provider × ${providers} providers = ${formatDollar(mipsPaymentDelta)}` : '',
        footnote: 'Estimates based on your inputs. Individual results vary. MIPS payment adjustment rate is approximate.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    if (financialPathway === 'denials') {
      const annualDenialVolume = (inputs.annualDenialVolume as number) || 0;
      const denialReductionRate = (inputs.denialReductionRate as number) || 0;
      const avgDenialValue = (inputs.avgDenialValue as number) || 250;
      const existingDownstreamValue = (inputs.downstreamValue as number) || 0;

      const denialsPrevented = Math.round(annualDenialVolume * (denialReductionRate / 100));
      const denialRecovery = Math.round(denialsPrevented * avgDenialValue);
      const downstreamValue = denialRecovery > 0 ? denialRecovery : existingDownstreamValue;
      const hasVal = downstreamValue > 0;
      const usedFormula = denialRecovery > 0;

      const denialContext = usedFormula
        ? `${denialsPrevented.toLocaleString()} denials prevented × ${formatDollar(avgDenialValue)} avg value = ${formatDollar(denialRecovery)}/year\n\nFrom ${annualDenialVolume.toLocaleString()} annual documentation-related denials with a ${denialReductionRate}% reduction rate.`
        : hasVal
          ? `Measured denial prevention value: ${formatDollar(existingDownstreamValue)}/year (entered directly from CDI program, audit, or finance team).`
          : 'Enter your denial volume, reduction rate, and average value to calculate the prevention impact. Or enter a measured value directly.';
      return {
        label: 'Estimated Impact',
        value: hasVal ? downstreamValue : null,
        hasValue: hasVal,
        headlineMetric: hasVal ? `${formatDollar(downstreamValue)} denial prevention value` : 'Denial reduction pathway selected',
        context: `${denialContext}\n\nDenial prevention compounds over time: fewer recoded claims, faster payment cycles, and stronger payer relationships. Each prevented denial saves the denial value plus the $25–$50 rework cost your billing team avoids.`,
        formula: usedFormula ? `[denialsPrevented] = ${annualDenialVolume.toLocaleString()} × ${denialReductionRate}% = ${denialsPrevented.toLocaleString()}\n[denialRecovery] = ${denialsPrevented.toLocaleString()} × ${formatDollar(avgDenialValue)} = ${formatDollar(denialRecovery)}` : '',
        footnote: usedFormula
          ? `Based on your inputs. Average denial value: ${formatDollar(avgDenialValue)}.`
          : hasVal ? 'Based on your directly entered measured value.' : 'Estimates based on your inputs.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    if (financialPathway === 'hcc') {
      const additionalCodes = (inputs.hccAdditionalCodes as number) || 0;
      const revenuePerCode = (inputs.hccRevenuePerCode as number) || 1200;
      const measuredValue = (inputs.hccMeasuredValue as number) || 0;
      const calculatedValue = Math.round(additionalCodes * revenuePerCode);
      const hccValue = measuredValue > 0 ? measuredValue : calculatedValue;
      const hasVal = hccValue > 0;
      const usedFormula = calculatedValue > 0 && measuredValue === 0;
      return {
        label: 'Estimated Impact',
        value: hasVal ? hccValue : null,
        hasValue: hasVal,
        headlineMetric: hasVal ? `${formatDollar(hccValue)} in HCC capture value` : 'HCC pathway selected',
        context: hasVal
          ? usedFormula
            ? `${additionalCodes.toLocaleString()} additional HCC codes captured × ${formatDollar(revenuePerCode)}/code = ${formatDollar(hccValue)}/year.\n\nImproved documentation specificity directly increases RAF scores, translating to higher risk-adjusted payments from Medicare Advantage and value-based contracts.`
            : `Measured HCC/risk adjustment value: ${formatDollar(hccValue)}/year (entered directly from risk adjustment or finance team).\n\nImproved documentation specificity directly increases RAF scores, translating to higher risk-adjusted payments from Medicare Advantage and value-based contracts.`
          : 'Enter your HCC capture volume or a measured value to calculate risk adjustment impact.',
        formula: usedFormula ? `[hccValue] = ${additionalCodes.toLocaleString()} codes × ${formatDollar(revenuePerCode)} = ${formatDollar(hccValue)}` : '',
        footnote: 'Based on your inputs. Average revenue per HCC varies by category and payer mix. Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    if (financialPathway === 'cdi') {
      const queryReduction = (inputs.cdiQueryReduction as number) || 0;
      const costPerQuery = (inputs.cdiCostPerQuery as number) || 50;
      const measuredValue = (inputs.cdiMeasuredValue as number) || 0;
      const calculatedValue = Math.round(queryReduction * costPerQuery);
      const cdiValue = measuredValue > 0 ? measuredValue : calculatedValue;
      const hasVal = cdiValue > 0;
      const usedFormula = calculatedValue > 0 && measuredValue === 0;
      return {
        label: 'Estimated Impact',
        value: hasVal ? cdiValue : null,
        hasValue: hasVal,
        headlineMetric: hasVal ? `${formatDollar(cdiValue)} in CDI program savings` : 'CDI pathway selected',
        context: hasVal
          ? usedFormula
            ? `${queryReduction.toLocaleString()} fewer CDI queries × ${formatDollar(costPerQuery)}/query = ${formatDollar(cdiValue)}/year.\n\nWhen ambient documentation improves note specificity, CDI specialists spend less time querying physicians — reducing program cost and physician interruptions simultaneously.`
            : `Measured CDI program savings: ${formatDollar(cdiValue)}/year (entered directly from CDI program or finance team).\n\nWhen ambient documentation improves note specificity, CDI specialists spend less time querying physicians — reducing program cost and physician interruptions simultaneously.`
          : 'Enter your CDI query reduction or a measured value to calculate program savings.',
        formula: usedFormula ? `[cdiValue] = ${queryReduction.toLocaleString()} queries × ${formatDollar(costPerQuery)} = ${formatDollar(cdiValue)}` : '',
        footnote: 'Based on your inputs. Cost per CDI query includes specialist time and rework. Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select a financial pathway',
      context: 'Select which financial pathway documentation quality is connected to.',
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.strategicIntegrations as string, STRATEGIC_INTEGRATIONS);
  const noConfirmedStrategicValue = inputs.noConfirmedStrategicValue === 'true';
  const strategicValue = noConfirmedStrategicValue ? 0 : ((inputs.strategicValue as number) || 0);
  const executiveOwner = inputs.executiveOwner as string | undefined;
  const count = checked.length;
  const checkedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
  const uncheckedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');

  const boardPresented = inputs.executiveBoardPresented as string | undefined;
  const boardLine = boardPresented === 'yes' ? ' · Presented to executive committee or board: Yes' : boardPresented === 'no' ? ' · Not yet presented at board level' : '';
  const ownerLine = executiveOwner === 'yes'
    ? `\n\nNamed executive owner: Yes${boardLine}`
    : executiveOwner === 'no'
      ? `\n\nNamed executive owner: Not yet established${boardLine}`
      : boardLine ? `\n\n${boardLine.slice(3)}` : '';

  if (count === 0 && strategicValue <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select strategic areas to continue.',
      context: 'Select where documentation quality informs organizational strategy.',
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
    };
  }

  if (strategicValue > 0) {
    return {
      label: 'Estimated Impact',
      value: strategicValue,
      hasValue: true,
      headlineMetric: `${formatDollar(strategicValue)} in attributed strategic value`,
      context: `Documentation quality informs organizational strategy across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${ownerLine}\n\nYour organization attributes ${formatDollar(strategicValue)} in annual value to documentation quality programs.`,
      formula: `[strategicValue] = ${formatDollar(strategicValue)} (organization estimate)`,
      footnote: 'Estimates based on your inputs. Individual results vary.',
    };
  }

  return {
    label: 'Estimated Impact',
    value: null,
    hasValue: false,
    headlineMetric: `${count} strategic area${count > 1 ? 's' : ''} — documentation quality is an organizational asset`,
    context: `Documentation quality is embedded in organizational strategy across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${ownerLine}\n\nThis is the profile where documentation quality shifts from an operational metric to a board-level asset. The financial value lives across quality penalties avoided, VBC contract performance, compliance governance, and AI readiness — organizations at this level that formalize attribution typically find it materially significant.`,
    formula: '',
    footnote: 'Estimates based on your inputs. Individual results vary.',
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
  conversionFactor: number = 33,
): { value: number; hasValue: boolean } {
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  let feedback: DomainFeedback;
  switch (domain) {
    case 'capacity':
      feedback = computeCapacityFeedback(level, inputs, providers, documentedEncounters, revenuePerVisit);
      break;
    case 'revenue':
      feedback = computeRevenueFeedback(level, inputs, documentedEncounters, revenuePerVisit, conversionFactor);
      break;
    case 'workforce':
      feedback = computeWorkforceFeedback(level, inputs, providers);
      break;
    case 'risk':
      feedback = computeRiskFeedback(level, inputs, documentedEncounters, revenuePerVisit, providers);
      break;
  }
  return { value: feedback.value || 0, hasValue: feedback.hasValue };
}

export function scoreToActivationLevel(_domain: Domain, score: number): ActivationLevel {
  if (score >= 25) return 4;
  if (score >= 19) return 3;
  if (score >= 12) return 2;
  if (score >= 4) return 1;
  return 1;
}

// ============================================================================
// DEPLOYMENT TENURE — utilities and benchmark ranges
// ============================================================================

export type DeploymentTenure = '0-6' | '6-12' | '12-24' | '24+';

export function tenureLabel(tenure: string): string {
  const map: Record<string, string> = {
    '0-6': 'Less than 6 months',
    '6-12': '6–12 months',
    '12-24': '1–2 years',
    '24+': '2+ years',
  };
  return map[tenure] || '';
}

export function tenureMonthsMidpoint(tenure: string): number {
  const map: Record<string, number> = {
    '0-6': 3,
    '6-12': 9,
    '12-24': 18,
    '24+': 30,
  };
  return map[tenure] || 0;
}

export function tenureIsLong(tenure: string): boolean {
  return tenure === '12-24' || tenure === '24+';
}

export function tenureScoreBand(totalScore: number): 'low' | 'mid' | 'high' {
  if (totalScore <= 30) return 'low';
  if (totalScore <= 60) return 'mid';
  return 'high';
}

export function isLevelMeasured(level: number): boolean {
  return level >= 2;
}

export function getWeakestDomain(domainScores: Record<Domain, number>): Domain {
  return DOMAIN_ORDER.reduce((weakest, domain) =>
    domainScores[domain] < domainScores[weakest] ? domain : weakest
  );
}

export const BENCHMARK_RANGES: Record<Domain, {
  low: (providers: number) => number;
  high: (providers: number) => number;
  description: string;
}> = {
  capacity: {
    low: (providers: number) => Math.round(providers * 1000),
    high: (providers: number) => Math.round(providers * 3000),
    description: 'in access revenue from recovered time, annually',
  },
  revenue: {
    low: (providers: number) => Math.round(providers * 4000),
    high: (providers: number) => Math.round(providers * 12000),
    description: 'from documentation-driven coding and denial impact, annually',
  },
  workforce: {
    low: (providers: number) => Math.round(providers * 1500),
    high: (providers: number) => Math.round(providers * 4000),
    description: 'in avoided turnover and reduced burden costs, annually',
  },
  risk: {
    low: (providers: number) => Math.round(providers * 1000),
    high: (providers: number) => Math.round(providers * 3000),
    description: 'in downstream quality and compliance value, annually',
  },
};
