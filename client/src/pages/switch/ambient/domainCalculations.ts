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
    2: 'Access Decision Made',
    3: 'Access Measured',
    4: 'Access Impact Tracked',
  },
  revenue: {
    1: 'Not Yet Analyzed',
    2: 'Directional Signal',
    3: 'Impact Measured',
    4: 'Documentation as a Revenue Lever',
  },
  workforce: {
    1: 'Time Is Returning',
    2: 'Burden Measured',
    3: 'Retention Modeled',
    4: 'Workforce Strategically Managed',
  },
  risk: {
    1: 'Improvement Untracked',
    2: 'Actively Monitored',
    3: 'Downstream Connected',
    4: 'Documentation as a Strategic Asset',
  },
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

export const SCORE_MAP: Record<ActivationLevel, number> = { 1: 4, 2: 12, 3: 19, 4: 25 };

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
  providerRate: number,
): DomainFeedback {
  const timeSaved = inputs.timeSaved as number | undefined;
  const hasTimeSaved = timeSaved !== undefined && timeSaved > 0;
  const unmeasuredChecked = inputs.unmeasuredTime === 'true';

  if (level === 1) {
    if (!hasTimeSaved && !unmeasuredChecked) {
      const benchLow = Math.round(documentedEncounters * 2 / 60);
      const benchHigh = Math.round(documentedEncounters * 3 / 60);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${benchLow.toLocaleString()}–${benchHigh.toLocaleString()} hours recoverable annually`,
        context: `At ${documentedEncounters.toLocaleString()} encounters, 2–3 minutes returned per encounter yields ${benchLow.toLocaleString()}–${benchHigh.toLocaleString()} hours annually. Enter your observed value or use the benchmark.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 2 aggregates these hours for leadership review and operational decisions.',
      };
    }
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
    const stage = (inputs.accessDecisionStage as string) || '';

    const stageNarratives: Record<string, string> = {
      evaluating: 'Your organization is evaluating whether recovered time can be converted to patient access. No structural changes have been made yet.',
      planning: 'Leadership is planning how to convert recovered time into patient access. Scheduling or template changes are being scoped.',
      piloting: 'Your organization is piloting access changes — scheduling adjustments or template redesigns are underway in a subset of providers.',
      implementing: 'Access redesign is being implemented across the deployment. Scheduling changes are rolling out broadly.',
    };

    const stageLabel = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : 'Not selected';
    const narrative = stageNarratives[stage] || 'Select where your organization stands on converting recovered time to patient access.';
    const hoursContext = recoveredHrs > 0 ? `\n\n${recoveredHrs.toLocaleString()} hours (${fte2} FTE) recovered annually across ${providers.toLocaleString()} providers.` : '';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: stage ? `Access decision: ${stageLabel}` : 'Select your access decision stage',
      context: `${narrative}${hoursContext}\n\n$0 deployed. The value at this level is the decision itself — not dollars.`,
      formula: recoveredHrs > 0 ? `[hours] = ${documentedEncounters.toLocaleString()} encounters × ${ts} min / 60 = ${recoveredHrs.toLocaleString()}\n[FTE] = ${recoveredHrs.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} = ${fte2}` : '',
      footnote: '',
      nextLevelTeaser: 'Organizations with structured access redesign report 3–8 additional patients/provider/month.',
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
    const isAspirational = confidence === 'aspirational';
    const isMeasured = confidence === 'measured';

    const headlineMetric = isMeasured
      ? `${formatDollar(accessRevenue)} in access revenue annually`
      : isAspirational
        ? `${formatDollar(accessRevenue)} access revenue target`
        : `${formatDollar(accessRevenue)} in access revenue annually (estimated)`;

    const confidenceFraming = isMeasured
      ? 'Based on your confirmed scheduling data.'
      : isAspirational
        ? 'This is a planning target, not confirmed data.'
        : 'Based on your organization\'s estimate. Validate with scheduling data to confirm.';

    return {
      label: 'Estimated Impact',
      value: accessRevenue,
      hasValue: true,
      headlineMetric,
      context: `${additionalPatients} additional patient${additionalPatients !== 1 ? 's' : ''} per provider per month across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''} = ${annualAdditionalVisits.toLocaleString()} new encounters annually at ${formatDollar(revenuePerVisit)} per visit.\n\n${confidenceFraming}`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 11 clinical months = ${annualAdditionalVisits.toLocaleString()}\n[accessRevenue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}`,
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
      context: `Your organization is tracking ${outcomeCount} downstream access outcome${outcomeCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}\n\nEnter confirmed additional patients per provider per month to calculate access revenue.${uncheckedLabels.length > 0 ? `\n\nNot yet tracked: ${uncheckedLabels.join(', ')}` : ''}`,
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
    context: `${outcomeCount} access outcome${outcomeCount > 1 ? 's' : ''} tracked\n\n${l4Patients} additional patients/provider/month × ${l4Providers} providers × 11 clinical months = ${annualVisits.toLocaleString()} visits.\nDirect access: ${annualVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}${outcomeCount > 0 ? `\n\nYour organization is tracking ${outcomeCount} downstream access outcome${outcomeCount > 1 ? 's' : ''}:\n${checkedLabels.join(', ')}` : ''}${uncheckedLabels.length > 0 ? `\n\nNot yet tracked: ${uncheckedLabels.join(', ')}` : ''}${downstreamNarrative}`,
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
      headlineMetric: 'Not yet analyzed.',
      context: `Documentation specificity has improved across ${documentedEncounters.toLocaleString()} encounters. No one has analyzed whether this is affecting coding, collections, or reimbursement.`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 2 involves observing trends in coding, denials, and collections.',
    };
  }

  if (level === 2) {
    const { checked } = parseCheckedItems(inputs.observedMovement as string, REVENUE_SIGNALS);
    const count = checked.length;
    const directionalEstimate = inputs.directionalEstimate as string | undefined;

    const ESTIMATE_RANGES: Record<string, { lowPct: number; highPct: number; label: string }> = {
      'under_1': { lowPct: 0.005, highPct: 0.01, label: 'Under 1%' },
      '1_3': { lowPct: 0.01, highPct: 0.03, label: '1–3%' },
      '3_5': { lowPct: 0.03, highPct: 0.05, label: '3–5%' },
      '5_plus': { lowPct: 0.05, highPct: 0.07, label: '5%+' },
    };

    const checkedLabels = checked.map(shortLabel).join(', ');

    if (directionalEstimate && directionalEstimate !== 'not_sure' && ESTIMATE_RANGES[directionalEstimate]) {
      const range = ESTIMATE_RANGES[directionalEstimate];
      const lowEstimate = Math.round(documentedEncounters * revenuePerVisit * range.lowPct);
      const highEstimate = Math.round(documentedEncounters * revenuePerVisit * range.highPct);

      let context = `Your organization estimates ${range.label} of encounter revenue is being affected by documentation improvements.\n\nAt ${documentedEncounters.toLocaleString()} documented encounters × ${formatDollar(revenuePerVisit)} per visit:\n${(range.lowPct * 100).toFixed(1)}% = ${formatDollar(lowEstimate)}\n${(range.highPct * 100).toFixed(1)}% = ${formatDollar(highEstimate)}\n\nThis is your team's directional estimate based on trending data. A formal before/after analysis (Level 3) would validate this figure.`;
      if (count > 0) {
        context += `\n\n${count} area${count !== 1 ? 's' : ''} showing movement:\n${checkedLabels}`;
      }

      return {
        label: 'Estimated Impact',
        value: highEstimate,
        hasValue: true,
        headlineMetric: `${formatDollar(lowEstimate)}–${formatDollar(highEstimate)} directional estimate`,
        context,
        formula: `[lowEstimate] = ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} × ${(range.lowPct * 100).toFixed(1)}% = ${formatDollar(lowEstimate)}\n[highEstimate] = ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} × ${(range.highPct * 100).toFixed(1)}% = ${formatDollar(highEstimate)}`,
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Organizations with before/after measurement have reported 2–7% revenue improvement.',
      };
    }

    if (count > 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} area${count !== 1 ? 's' : ''} showing movement`,
        context: `Your organization has observed changes in ${count} area${count !== 1 ? 's' : ''}:\n${checkedLabels}\n\nMovement is visible but the impact hasn't been estimated yet. A formal before/after analysis (Level 3) would quantify it.`,
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Organizations with before/after measurement have reported 2–7% revenue improvement.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select observed areas and estimate impact.',
      context: 'Select the areas where your organization has observed movement, and provide a directional estimate of the revenue impact.',
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Level 3 requires before/after measurement data.',
    };
  }

  if (level === 3) {
    const metricType = inputs.revenueMetricType as string | undefined;
    if (!metricType) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select measurement type to calculate.',
        context: 'Select what was measured to calculate the revenue impact. Based on aggregated deployment experience.',
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'wrvu') {
      const wrvuDelta = inputs.measuredWrvuDelta as number | undefined;
      if (!wrvuDelta || wrvuDelta <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured wRVU change to calculate.',
          context: 'Enter your measured wRVU change per encounter. Abridge benchmark: 0.05–0.15 wRVU per encounter. Based on aggregated deployment experience.',
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const revenueImpact = Math.round(wrvuDelta * documentedEncounters * conversionFactor);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `${wrvuDelta} wRVU × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} conversion factor = ${formatDollar(revenueImpact)}\n\nBased on your organization's measured data.\nNo attribution discount applied to user-measured values.`,
        formula: `[revenueImpact] = ${wrvuDelta} × ${documentedEncounters.toLocaleString()} × $${conversionFactor} = ${formatDollar(revenueImpact)}`,
        footnote: `CMS conversion factor from your baseline inputs.\nEstimates based on your inputs. Individual results vary.`,
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'collections') {
      const collectionsDelta = inputs.measuredCollectionsDelta as number | undefined;
      if (!collectionsDelta || collectionsDelta <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured collections change to calculate.',
          context: 'Enter your measured collections change per encounter. Organizations at this level have reported $3–$10 increase per encounter. Based on aggregated deployment experience.',
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const revenueImpact = Math.round(collectionsDelta * documentedEncounters);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `${formatDollar(collectionsDelta)} per encounter × ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(revenueImpact)}\n\nBased on your organization's measured data.\nNo attribution discount applied to user-measured values.`,
        formula: `[revenueImpact] = ${formatDollar(collectionsDelta)} × ${documentedEncounters.toLocaleString()} = ${formatDollar(revenueImpact)}`,
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'revenue_pct') {
      const revenuePct = inputs.measuredRevenuePct as number | undefined;
      if (!revenuePct || revenuePct <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured revenue change to calculate.',
          context: 'Enter your measured revenue change percentage. Organizations at this level have reported 2–7% improvement. Based on aggregated deployment experience.',
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const revenueImpact = Math.round(documentedEncounters * revenuePerVisit * (revenuePct / 100));
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `${revenuePct}% × ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} = ${formatDollar(revenueImpact)}\n\nBased on your organization's measured data.\nNo attribution discount applied to user-measured values.`,
        formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} × ${formatDollar(revenuePerVisit)} × ${revenuePct}% = ${formatDollar(revenueImpact)}`,
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'denial_rate') {
      const denialPct = inputs.measuredDenialReduction as number | undefined;

      if (!denialPct || denialPct <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured denial rate reduction to calculate.',
          context: 'Enter your measured denial rate reduction percentage. Organizations at this level have reported 5–15% reduction in documentation-related denials. Based on aggregated deployment experience.',
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }

      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `Denial rate reduced ${denialPct}%`,
        context: `Your documentation-related denial rate decreased by ${denialPct}%.\n\nTo estimate dollar impact, multiply your average monthly documentation-related denial volume by the reduction percentage and your average denial value.\n\nBased on your organization's measured data.`,
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 integrates documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select measurement type to calculate.',
      context: 'Select what was measured to calculate the revenue impact. Based on aggregated deployment experience.',
      formula: '',
      footnote: '',
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
    if (unchecked.length > 0) {
      context += `\n\nNot yet integrated:\n${uncheckedLabels}`;
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
      context += `\n\nNo confirmed revenue attribution yet. Abridge deployment benchmark at ${documentedEncounters.toLocaleString()} encounters with revenue cycle integration: $200K–$600K annually. This can serve as a planning estimate until formal attribution is available.`;
    } else {
      context += `\n\nEnter your attributed annual revenue when available. Organizations at this level typically have a figure that revenue cycle and finance leadership reference in planning.`;
    }
    if (unchecked.length > 0) {
      context += `\n\nNot yet integrated:\n${uncheckedLabels}`;
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
    context: `Abridge deployment benchmark at ${documentedEncounters.toLocaleString()} encounters with revenue cycle integration: $200K–$600K annually. This can serve as a working estimate.`,
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
    const defaultHrs = 2.0;
    const effectiveHrs = (afterHoursReduction && afterHoursReduction > 0) ? afterHoursReduction : defaultHrs;
    const totalHoursReturned = Math.round(effectiveHrs * providers * CLINICAL_WEEKS);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${totalHoursReturned.toLocaleString()} after-hours hours returned annually`,
      context: `${providers.toLocaleString()} providers × ${effectiveHrs} hrs/week × ${CLINICAL_WEEKS} clinical weeks = ${totalHoursReturned.toLocaleString()} hours of after-hours documentation time returned annually.\n\nResearch consistently identifies documentation burden as a leading contributor to physician burnout and intent to leave (Shanafelt et al., 2022; Melnick et al., 2020).`,
      formula: `[burdenHours] = ${effectiveHrs} × ${providers} × ${CLINICAL_WEEKS} = ${totalHoursReturned.toLocaleString()}`,
      footnote: `Annualized using ${CLINICAL_WEEKS} clinical weeks (${CLINICAL_DAYS} working days). After-hours time is self-reported and may vary by specialty and EHR workflow.`,
      nextLevelTeaser: 'Level 2 adds in-clinic time savings and provider survey data.',
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
      const lowHrs = Math.round(providers * 10 * CLINICAL_DAYS / 60);
      const highHrs = Math.round(providers * 20 * CLINICAL_DAYS / 60);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter in-clinic time savings to calculate.',
        context: `Benchmark: 10–20 minutes per provider per day of in-clinic burden reduction. At ${providers.toLocaleString()} providers, that is ${lowHrs.toLocaleString()}–${highHrs.toLocaleString()} hours annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 models turnover costs with documentation burden as a factor.',
      };
    }

    const clinicSavedHours = Math.round(minutesSaved * providers * CLINICAL_DAYS / 60);

    const afterHoursHours = confirmedAfterHours && confirmedAfterHours > 0
      ? Math.round(confirmedAfterHours * providers * CLINICAL_WEEKS)
      : 0;

    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only.'
        : '';

    const totalHours = clinicSavedHours + afterHoursHours;
    const fteEquiv = Math.round(totalHours / ANNUAL_HOURS * 10) / 10;

    const headlineMetric = afterHoursHours > 0
      ? `${clinicSavedHours.toLocaleString()} in-clinic hours + ${afterHoursHours.toLocaleString()} after-hours hours recovered annually — ${fteEquiv} FTE equivalent of provider time.`
      : `${clinicSavedHours.toLocaleString()} in-clinic hours recovered annually across ${providers} providers.`;

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric,
      context: `In-clinic documentation time returned: ${clinicSavedHours.toLocaleString()} hours annually (${minutesSaved} min/provider/day × ${providers} providers × 230 clinical days).${confirmedAfterHours && confirmedAfterHours > 0 ? `\n\nAfter-hours time returned: ${afterHoursHours.toLocaleString()} hours annually.` : ''}${surveyNarrative}`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × ${CLINICAL_DAYS} / 60 = ${clinicSavedHours.toLocaleString()}${afterHoursHours > 0 ? `\n[afterHoursHours] = ${confirmedAfterHours} × ${providers} × ${CLINICAL_WEEKS} = ${afterHoursHours.toLocaleString()}` : ''}`,
      footnote: '230 clinical working days. Dollar value appears at Level 3 when turnover data is entered.',
      nextLevelTeaser: 'Level 3 models turnover costs with documentation burden as a factor.',
    };
  }

  if (level === 3) {
    const turnoverRate = inputs.turnoverRate as number | undefined;
    const replacementCostRaw = inputs.replacementCost as number | undefined;
    const replacementCost = (replacementCostRaw && replacementCostRaw > 0) ? replacementCostRaw : 350000;
    const docBurdenShare = (inputs.docBurdenShare as number) || 0;
    if (!turnoverRate || turnoverRate <= 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter turnover data to calculate exposure.',
        context: `Enter your turnover rate and replacement cost to see estimated retention exposure.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 connects burden reduction to workforce strategy — recruitment, retention programs, staffing decisions.',
      };
    }
    const totalTurnover = providers * (turnoverRate / 100);
    const totalCost = Math.round(totalTurnover * replacementCost);
    const docDrivenCost = docBurdenShare > 0 ? Math.round(totalCost * (docBurdenShare / 100)) : 0;

    const hasDocShare = docBurdenShare > 0 && docDrivenCost > 0;
    const replacementLabel = replacementCost === 350000
      ? `Using AMGA benchmark midpoint: ${formatDollar(replacementCost)}`
      : `Based on your input: ${formatDollar(replacementCost)}`;

    const headlineMetric = hasDocShare
      ? `${formatDollar(docDrivenCost)} in documentation-attributable turnover exposure.`
      : `${totalTurnover.toFixed(1)} projected departure${totalTurnover !== 1 ? 's' : ''} per year. Enter documentation burden share to see attributable exposure.`;

    return {
      label: 'Estimated Impact',
      value: hasDocShare ? docDrivenCost : null,
      hasValue: hasDocShare,
      headlineMetric,
      context: `At ${turnoverRate}% annual turnover across ${providers} providers, your organization sees approximately ${totalTurnover.toFixed(1)} departure${totalTurnover !== 1 ? 's' : ''} per year.\n\nReplacement cost: ${replacementLabel}. Total turnover cost is ${formatDollar(totalCost)} annually.\n\n${hasDocShare ? `Of that, your estimate of ${docBurdenShare}% attributable to documentation burden represents ${formatDollar(docDrivenCost)} — the portion potentially attributable to documentation burden reduction.` : 'Enter the share of turnover you attribute to documentation burden to see the portion potentially attributable to documentation burden reduction.'}`,
      formula: `[annualDepartures] = ${providers} × ${turnoverRate}% = ${totalTurnover.toFixed(1)}\n[totalCost] = ${totalTurnover.toFixed(1)} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}${hasDocShare ? `\n[docDriven] = ${formatDollar(totalCost)} × ${docBurdenShare}% = ${formatDollar(docDrivenCost)}` : ''}`,
      footnote: 'All inputs are your organization\'s data. No external correlation estimates applied.',
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

  if (strategyCount === 0 && agencyReduction <= 0) {
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
  if (uncheckedStrategies.length > 0) {
    contextParts += `\n\nNot yet integrated:\n${uncheckedStrategies.map(s => `• ${s.split(' — ')[0]}`).join('\n')}`;
  }

  return {
    label: 'Estimated Impact',
    value: hasAgency ? annualAgencySavings : null,
    hasValue: hasAgency,
    headlineMetric: headlineParts.join('\n'),
    context: contextParts,
    formula: hasAgency ? `[annualAgencySavings] = ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualAgencySavings)}` : '',
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
  'Value-based care — documentation supports risk stratification and population health initiatives',
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
): DomainFeedback {
  if (level === 1) {
    const downstreamConnected = inputs.qualityDownstreamConnected as string | undefined;

    const statusText = downstreamConnected === 'yes'
      ? 'One downstream team is formally engaged.'
      : downstreamConnected === 'informal'
        ? 'Informal conversations have started with downstream teams.'
        : 'Downstream connection not yet started. The value of improved documentation depends on whether coding, quality reporting, compliance, and other teams can see and use the improvement.';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${documentedEncounters.toLocaleString()} encounters with improved documentation.`,
      context: `${documentedEncounters.toLocaleString()} encounters with improved documentation.\n\n${statusText}`,
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
        headlineMetric: 'Quality monitoring not yet formalized.',
        context: 'Select how documentation quality metrics are being tracked.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }
    if (approach === 'not_yet') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Quality monitoring not yet formalized.',
        context: 'Without measurement, the value of improved documentation remains invisible to the organization.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }
    if (approach === 'spot_checks') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Quality monitoring not yet formalized.',
        context: 'Informal monitoring is a start. Establishing structured tracking creates the baseline needed to measure downstream impact.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }
    const { checked, unchecked } = parseCheckedItems(inputs.qualityAttributes as string, QUALITY_ATTRIBUTES);
    const count = checked.length;

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Structured tracking active.',
        context: 'Your organization is systematically tracking documentation quality. Select which attributes are being tracked.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
      };
    }
    const trackedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const untrackedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 5 quality dimensions tracked`,
      context: `Your organization is systematically tracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Level 3 connects documentation quality to downstream programs and workflows.',
    };
  }

  if (level === 3) {
    const { checked, unchecked } = parseCheckedItems(inputs.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS);
    const count = checked.length;
    const checkedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const uncheckedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');
    const depth = inputs.qualityMeasurementDepth as string | undefined;
    const noDownstreamValue = inputs.noDownstreamValue === 'true';
    const downstreamValue = noDownstreamValue ? 0 : ((inputs.downstreamValue as number) || 0);

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select connected downstream areas.',
        context: 'Select which downstream areas have been connected to documentation quality improvements.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    const depthText = depth === 'measured'
      ? 'Measured data is available.'
      : depth === 'partial'
        ? 'Some areas have measured data.'
        : depth === 'qualitative'
          ? 'Impact is visible but not yet quantified.'
          : '';

    if (downstreamValue > 0) {
      return {
        label: 'Estimated Impact',
        value: downstreamValue,
        hasValue: true,
        headlineMetric: `${formatDollar(downstreamValue)} in downstream quality value`,
        context: `Documentation quality is driving ${formatDollar(downstreamValue)} in annual value across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${depthText ? `\n\n${depthText}` : ''}${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
        formula: `[annualValue] = ${formatDollar(downstreamValue)} (organization estimate)`,
        footnote: 'Based on your organization\'s estimate. Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Level 4 embeds documentation quality into quality programs, value-based care, compliance, and AI readiness.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} downstream area${count > 1 ? 's' : ''} connected`,
      context: `Documentation quality is driving improvement across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${depthText ? `\n\n${depthText}` : ''}${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
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

  const ownerLine = executiveOwner === 'yes'
    ? '\n\nExecutive owner: Yes'
    : executiveOwner === 'no'
      ? '\n\nExecutive owner: Not yet'
      : '';

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
      context: `Documentation quality informs organizational strategy across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${ownerLine}\n\nYour organization attributes ${formatDollar(strategicValue)} in annual value to documentation quality programs.${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
      formula: `[strategicValue] = ${formatDollar(strategicValue)} (organization estimate)`,
      footnote: 'Estimates based on your inputs. Individual results vary.',
    };
  }

  return {
    label: 'Estimated Impact',
    value: null,
    hasValue: false,
    headlineMetric: `${count} strategic area${count > 1 ? 's' : ''} connected`,
    context: `Documentation quality informs organizational strategy across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${ownerLine}\n\nStrategic value not yet quantified. Organizations at this level typically identify significant value across quality, compliance, and VBC programs when they formalize attribution.${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
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
  if (score >= 4) return 1;
  return 1;
}
