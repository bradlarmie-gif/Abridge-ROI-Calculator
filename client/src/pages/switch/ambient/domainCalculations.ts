import { formatDollar } from "./ambientCalculator";

export const CLINICAL_DAYS = 230;
export const CLINICAL_WEEKS = 46;
export const ANNUAL_HOURS = 1840;
// 230 clinical days (MGMA standard) ÷ 21.67 working days/month (260 business days ÷ 12) = 10.6 months
export const CLINICAL_MONTHS = 10.6;

export type Domain = 'capacity' | 'revenue' | 'workforce' | 'risk';
export type ActivationLevel = 1 | 2 | 3 | 4;

export const DOMAIN_ORDER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];

export const DOMAIN_LABELS: Record<Domain, string> = {
  capacity: 'Capacity',
  revenue: 'Revenue',
  workforce: 'Workforce',
  risk: 'Quality',
};

export const LEVEL_NAMES: Record<ActivationLevel, string> = {
  1: 'Unmeasured',
  2: 'Emerging',
  3: 'Demonstrated',
  4: 'Strategic Impact',
};

export const LEVEL_DESCRIPTIONS: Record<ActivationLevel, string> = {
  1: 'The value is generating. Nothing has been attributed, quantified, or connected to a cause. No baseline exists yet.',
  2: 'Early signals are visible in a subset of providers. Not yet statistically defensible at scale — but the direction is real.',
  3: 'Measurable, repeatable, defensible to a skeptic. The narrative has shifted from "we think" to "here is what this has done."',
  4: 'The organization can now do things it could not do before. Ambient AI has become a strategic asset, not just a productivity tool.',
};

export const ACTIVATION_LABELS: Record<Domain, Record<ActivationLevel, string>> = {
  capacity: {
    1: 'Time Recovered — Impact Not Yet Measured',
    2: 'Time Emerging Into Access',
    3: 'Access Expansion Demonstrated',
    4: 'Capacity as Strategic Intelligence',
  },
  revenue: {
    1: 'Documentation Improved — Revenue Impact Unmeasured',
    2: 'Revenue Signals Emerging',
    3: 'Revenue Impact Demonstrated',
    4: 'Documentation as Revenue Intelligence',
  },
  workforce: {
    1: 'Provider Relief Observed — Impact Unmeasured',
    2: 'Workforce Signals Emerging',
    3: 'Retention Impact Demonstrated',
    4: 'Provider Experience as Strategic Advantage',
  },
  risk: {
    1: 'Quality Improving — Downstream Not Yet Connected',
    2: 'Quality Signals Emerging',
    3: 'Downstream Value Demonstrated',
    4: 'Documentation as Organizational Intelligence',
  },
};


export const CAPACITY_TIME_USAGE_LABELS = [
  'Additional patient appointments being scheduled',
  'Same-day or urgent access slots opened',
  'Providers leaving earlier — less after-hours documentation time',
  'Extended visit time for complex patients',
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
      const signalsCsv = inputs.retentionSignals as string | undefined;
      const hasSignals = (signalsCsv || '').split(',').filter(Boolean).length > 0;
      if (!hasSignals) return 12;
    }
    if (level === 4) {
      const strategyCsv = inputs.workforceStrategies as string | undefined;
      const strategyCount = (strategyCsv || '').split(',').filter(Boolean).length;
      if (strategyCount === 0) return 15;
    }
  }

  // Capacity L3: aspirational confidence with no confirmation evidence is not Demonstrated — drop to L2 score
  if (domain === 'capacity' && level === 3) {
    const confidence = inputs.capacityAccessConfidence as string | undefined;
    if (confidence === 'aspirational') {
      const confirmationsCsv = inputs.capacityAccessConfirmation as string | undefined;
      const confirmationCount = (confirmationsCsv || '').split(',').filter(Boolean).length;
      if (confirmationCount === 0) return 12;
    }
  }

  // Revenue L3: estimated or aspirational confidence means the result isn't confirmed — drop to L2 score
  if (domain === 'revenue' && level === 3) {
    const confidence = inputs.revenueConfidence as string | undefined;
    if (confidence === 'estimated' || confidence === 'aspirational') return 12;
  }

  // Quality L3: if impact isn't formally attributed, it's Emerging not Demonstrated — drop to L2 score
  if (domain === 'risk' && level === 3) {
    const attribution = inputs.downstreamFormalAttribution as string | undefined;
    const depth = inputs.qualityMeasurementDepth as string | undefined;
    if (attribution === 'no' || (attribution === 'informal' && depth !== 'measured')) return 12;
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
        context: `${providers.toLocaleString()} providers, ${documentedEncounters.toLocaleString()} encounters annually. Use the industry benchmark of 2–4 minutes per encounter to estimate recovered hours.\n\nThe measurement infrastructure to count, attribute, and direct that time doesn't exist yet. That's the starting point.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Emerging: direct recovered time toward a specific outcome — access, teaching, or operational redesign.',
      };
    }
    const fte = (recoveredHours / ANNUAL_HOURS).toFixed(1);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours returned annually`,
      context: `${providers.toLocaleString()} providers, ${documentedEncounters.toLocaleString()} encounters annually. At ${ts} minutes returned per encounter, that is ${recoveredHours.toLocaleString()} hours — ${fte} FTE equivalent.\n\nTime is recovered but hasn't been counted, attributed, or directed yet. No operational decision has been made about where it goes.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE equivalent] = ${recoveredHours.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} (${CLINICAL_DAYS} clinical days × 8 hrs) = ${fte}`,
      footnote: 'Recovered hours represent available capacity. Financial value depends on how this time is allocated at higher maturity levels.',
      nextLevelTeaser: 'Emerging: direct recovered time toward a specific outcome — access, teaching, or operational redesign.',
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
        nextLevelTeaser: 'Demonstrated: measure how many additional patients are being seen with recovered time.',
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
      nextLevelTeaser: 'Demonstrated: measure how many additional patients are being seen with recovered time.',
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
        nextLevelTeaser: 'Strategic Impact: use capacity intelligence as an organizational planning input — care model design, panel growth, workforce deployment.',
      };
    }
    if (!revenuePerVisit || revenuePerVisit === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Add your average revenue per visit to calculate access revenue.',
        context: 'Enter your average revenue per visit in the baseline screen to unlock the dollar value for this domain.',
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Strategic Impact: use capacity intelligence as an organizational planning input.',
      };
    }
    const redesignedProviders = (inputs.redesignedProviders as number) > 0 ? (inputs.redesignedProviders as number) : providers;
    const annualAdditionalVisits = Math.round(additionalPatients * redesignedProviders * CLINICAL_MONTHS);
    const accessRevenue = Math.round(annualAdditionalVisits * revenuePerVisit);
    const confidence = (inputs.capacityAccessConfidence as string) || 'estimated';
    const confidenceMultiplier =
      confidence === 'measured' ? 1.0 :
      confidence === 'estimated' ? 0.80 :
      confidence === 'aspirational' ? 0.60 : 0.80;
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
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × ${CLINICAL_MONTHS} clinical months = ${annualAdditionalVisits.toLocaleString()}\n[accessRevenue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}${confidenceMultiplier < 1 ? `\n[adjusted] = ${formatDollar(accessRevenue)} × ${confidenceMultiplier} = ${formatDollar(adjustedRevenue)}` : ''}`,
      footnote: isAspirational
        ? `⚠ Your access data is marked as a planning target, not confirmed scheduling data. This figure is a planning scenario — validate with actual scheduling records before using it in leadership conversations. Uses ${CLINICAL_MONTHS} clinical months (230 clinical days ÷ 21.67 working days/month, MGMA standard). Revenue per visit uses your baseline input of ${formatDollar(revenuePerVisit)}.`
        : `Uses ${CLINICAL_MONTHS} clinical months (230 clinical days ÷ 21.67 working days/month, MGMA standard). Revenue per visit uses your baseline input of ${formatDollar(revenuePerVisit)}. If additional visits are typically shorter or lower-complexity than your average, adjust revenue per visit in your baseline settings.`,
      nextLevelTeaser: 'Strategic Impact: use capacity intelligence as an organizational planning input — care model design, panel growth, workforce deployment.',
      warningBanner: isAspirational ? 'Planning scenario — based on your stated target, not confirmed scheduling data. Treat as a goal, not an actuals figure.' : undefined,
    };
  }

  const CAPACITY_STRATEGIC_DECISION_LABELS = [
    'Care model redesign — how providers and care teams are structured',
    'Panel size optimization across specialties or sites',
    'New service line planning or market expansion',
    'Provider deployment strategy — where and how providers spend clinical time',
    'Capital planning or facility decisions informed by access demand data',
    'Workforce planning — staffing ratios or FTE decisions based on capacity data',
  ];
  const ACCESS_OUTCOME_LABELS = [
    'Panel size increased',
    'New patient slots opened',
    'Same-day/urgent access expanded',
    'Referral-to-visit time reduced',
    'Third-next-available improved',
    'No-show backfill utilized',
  ];

  const strategicDecisionsCsv = inputs.capacityStrategicDecisions as string | undefined;
  const strategicDecisionSet = new Set((strategicDecisionsCsv || '').split(',').filter(Boolean));
  const strategicDecisions = CAPACITY_STRATEGIC_DECISION_LABELS.filter((_, i) => strategicDecisionSet.has(String(i)));
  const strategicDecisionCount = strategicDecisions.length;

  const outcomesCsv = inputs.accessOutcomes as string | undefined;
  const checkedSet = new Set((outcomesCsv || '').split(',').filter(Boolean));
  const checkedLabels = ACCESS_OUTCOME_LABELS.filter((_, i) => checkedSet.has(String(i)));
  const outcomeCount = checkedLabels.length;

  const l4Patients = (inputs.additionalPatientsPerMonth as number) || 0;
  const l4Providers = (inputs.redesignedProviders as number) || providers;

  const strategicContext = strategicDecisionCount > 0
    ? `\n\nCapacity intelligence is informing ${strategicDecisionCount} organizational decision${strategicDecisionCount > 1 ? 's' : ''}:\n${strategicDecisions.map(d => `• ${d.split(' — ')[0]}`).join('\n')}`
    : '';

  if (strategicDecisionCount === 0 && outcomeCount === 0 && l4Patients <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select the organizational decisions capacity data has informed',
      context: 'At this level, capacity data has moved beyond a metric — it is informing how your organization deploys its clinical workforce and plans for growth. Select where that is happening.',
      formula: '',
      footnote: '',
    };
  }

  if (l4Patients <= 0) {
    const decisionSummary = strategicDecisionCount > 0
      ? `Capacity intelligence is informing ${strategicDecisionCount} organizational decision${strategicDecisionCount > 1 ? 's' : ''}:\n${strategicDecisions.map(d => `• ${d.split(' — ')[0]}`).join('\n')}`
      : `${outcomeCount} access outcome${outcomeCount > 1 ? 's' : ''} tracked.`;
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: strategicDecisionCount > 0 ? `Capacity data informing ${strategicDecisionCount} organizational decision${strategicDecisionCount > 1 ? 's' : ''}` : `${outcomeCount} access outcome${outcomeCount > 1 ? 's' : ''} tracked`,
      context: `${decisionSummary}\n\nEnter confirmed additional patients per provider per month to calculate access revenue.`,
      formula: '',
      footnote: '',
    };
  }

  if (!revenuePerVisit || revenuePerVisit === 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Add your average revenue per visit to calculate access revenue.',
      context: 'Enter your average revenue per visit in the baseline screen to unlock the dollar value for this domain.',
      formula: '',
      footnote: '',
    };
  }

  const annualVisits = Math.round(l4Patients * l4Providers * CLINICAL_MONTHS);
  const accessRevenue = Math.round(annualVisits * revenuePerVisit);

  return {
    label: 'Confirmed Impact',
    value: accessRevenue,
    hasValue: true,
    headlineMetric: `${formatDollar(accessRevenue)} in confirmed access revenue`,
    context: `${l4Patients} additional patients/provider/month × ${l4Providers} providers × ${CLINICAL_MONTHS} clinical months = ${annualVisits.toLocaleString()} visits × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)} annually.${outcomeCount > 0 ? `\n\nAccess outcomes tracked:\n${checkedLabels.join(', ')}` : ''}${strategicContext}\n\nThis is the confirmed access revenue floor. Every new patient also generates downstream care activity — follow-up visits, labs, imaging, referrals — that accrues to the organization over time.`,
    formula: `[annualVisits] = ${l4Patients} patients/mo × ${l4Providers} providers × ${CLINICAL_MONTHS} months = ${annualVisits.toLocaleString()}\n[accessRevenue] = ${annualVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}`,
    footnote: `Uses ${CLINICAL_MONTHS} clinical months (230 clinical days ÷ 21.67 working days/month, MGMA standard). Revenue per visit from your baseline inputs. Downstream patient activity (labs, referrals, follow-up) is not included in this figure.`,
  };
}

export function computeRevenueFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  documentedEncounters: number,
  revenuePerVisit: number,
  conversionFactor: number = 33,
  providers: number = 0,
): DomainFeedback {
  if (level === 1) {
    const emComplexity = inputs.emComplexity as string | undefined;

    const emNote =
      emComplexity === 'aware'
        ? `\n\nYour team knows E&M distribution analysis is worth doing but hasn't pulled it yet. This is typically a one-time query to your coding or analytics team — and it often surfaces $2K–$6K per provider/year in previously unattributed value.`
        : `\n\nE&M distribution has not been reviewed. If documentation specificity has improved, coding levels may have shifted — but no one has looked. This is one of the highest-ROI analyses an ambient team can request from their coders.`;

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Revenue impact not yet analyzed.',
      context: `${documentedEncounters.toLocaleString()} encounters annually. The connection between documentation quality and coding, collections, or reimbursement hasn't been investigated yet.\n\nThis is the most common gap in documentation programs. The signal is almost always there — it just hasn't been looked for.${emNote}`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Emerging: observe trends in coding, denials, and collections — direction before confirmation.',
    };

  }

  if (level === 2) {
    const { checked } = parseCheckedItems(inputs.observedMovement as string, REVENUE_SIGNALS);
    const count = checked.length;
    const checkedLabels = checked.map(shortLabel).join(', ');

    const estimatedWrvuL2 = inputs.estimatedWrvuL2 as number | undefined;
    const l2Confidence = (inputs.l2Confidence as string) || 'directional';
    const confidenceMultiplier = l2Confidence === 'partial' ? 0.70 : 0.55;
    const confidenceLabel = l2Confidence === 'partial' ? 'partial confidence' : 'directional estimate';

    if (estimatedWrvuL2 && estimatedWrvuL2 > 0) {
      const rawImpact = Math.round(estimatedWrvuL2 * documentedEncounters * conversionFactor);
      const adjustedImpact = Math.round(rawImpact * confidenceMultiplier);
      let context = `Estimated ${estimatedWrvuL2} wRVU × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} conversion factor = ${formatDollar(rawImpact)} → ${Math.round(confidenceMultiplier * 100)}% ${confidenceLabel} discount applied = ${formatDollar(adjustedImpact)}.\n\nA formal before/after analysis (Demonstrated) would validate this figure.`;
      if (count > 0) {
        context += `\n\n${count} area${count !== 1 ? 's' : ''} showing movement:\n${checkedLabels}`;
      }
      return {
        label: 'Estimated Impact',
        value: adjustedImpact,
        hasValue: true,
        headlineMetric: `${formatDollar(adjustedImpact)} directional revenue estimate`,
        context,
        formula: `[rawImpact] = ${estimatedWrvuL2} wRVU × ${documentedEncounters.toLocaleString()} × $${conversionFactor} = ${formatDollar(rawImpact)}\n[adjusted] = ${formatDollar(rawImpact)} × ${confidenceMultiplier} (${confidenceLabel}) = ${formatDollar(adjustedImpact)}`,
        footnote: 'Directional estimate — not validated by formal before/after analysis. Individual results vary.',
        nextLevelTeaser: 'Demonstrated: complete a before/after analysis to confirm this figure with formal measurement.',
      };
    }

    if (count > 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} area${count !== 1 ? 's' : ''} showing movement`,
        context: `Your organization has observed changes in ${count} area${count !== 1 ? 's' : ''}:\n${checkedLabels}\n\nEnter an estimated wRVU improvement per encounter above to calculate a directional dollar figure.`,
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Demonstrated: complete a before/after analysis to confirm this figure with formal measurement.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select observed areas and enter an estimated wRVU improvement.',
      context: 'Select the areas where your organization has observed movement, then enter an estimated wRVU improvement per encounter.',
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Demonstrated: complete a before/after analysis to confirm this figure with formal measurement.',
    };
  }

  if (level === 3) {
    const metricType = inputs.revenueMetricType as string | undefined;
    const direction = (inputs.revenueMetricDirection as string) || 'increase';
    const isDecrease = direction === 'decrease';
    const revenueConfidence = (inputs.revenueConfidence as string) || '';
    const confidenceMultiplier =
      revenueConfidence === 'measured' ? 1.0 :
      revenueConfidence === 'estimated' ? 0.80 :
      revenueConfidence === 'aspirational' ? 0.60 : 1.0;
    const confidenceNote = revenueConfidence === 'estimated'
      ? ' (20% confidence adjustment applied — data marked as estimated)'
      : revenueConfidence === 'aspirational'
      ? ' (40% confidence adjustment applied — data marked as planning target)'
      : '';

    if (!metricType) {
      return {
        label: 'Impact Measured',
        value: null, hasValue: false,
        headlineMetric: 'Select what you measured.',
        context: 'Choose the metric your organization has data on.',
        formula: '', footnote: '',
        nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
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
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      if (isDecrease) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: `wRVU per encounter decreased ${wrvuDelta}`,
          context: `A decrease in wRVU per encounter is unexpected with documentation improvement. This may indicate the analysis hasn't been isolated from other variables yet — case mix shifts, specialty changes, or payer mix could be factors.\n\nIndustry benchmark: 0.05–0.15 wRVU increase per encounter.`,
          formula: '', footnote: '',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const rawImpact = Math.round(wrvuDelta * documentedEncounters * conversionFactor);
      const revenueImpact = Math.round(rawImpact * confidenceMultiplier);
      return {
        label: 'Impact Measured',
        value: revenueImpact, hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `wRVU per encounter increased ${wrvuDelta} × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} conversion factor = ${formatDollar(rawImpact)}.${confidenceNote}\n\nBased on your organization's measurement data.`,
        formula: `[revenueImpact] = ${wrvuDelta} × ${documentedEncounters.toLocaleString()} × $${conversionFactor} = ${formatDollar(rawImpact)}${confidenceMultiplier < 1 ? `\n[adjusted] = ${formatDollar(rawImpact)} × ${confidenceMultiplier} = ${formatDollar(revenueImpact)}` : ''}`,
        footnote: `CMS conversion factor from your baseline inputs. Individual results vary.`,
        nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
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
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      if (isDecrease) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: `Collections per encounter decreased ${formatDollar(collectionsDelta)}`,
          context: `A decrease in collections per encounter warrants investigation — this may reflect payer mix changes or other variables unrelated to documentation quality.`,
          formula: '', footnote: '',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      const rawImpact = Math.round(collectionsDelta * documentedEncounters);
      const revenueImpact = Math.round(rawImpact * confidenceMultiplier);
      return {
        label: 'Impact Measured',
        value: revenueImpact, hasValue: true,
        headlineMetric: `${formatDollar(revenueImpact)} in measured revenue impact`,
        context: `${formatDollar(collectionsDelta)} increase per encounter × ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(rawImpact)}.${confidenceNote}\n\nBased on your organization's measurement data.`,
        formula: `[revenueImpact] = ${formatDollar(collectionsDelta)} × ${documentedEncounters.toLocaleString()} = ${formatDollar(rawImpact)}${confidenceMultiplier < 1 ? `\n[adjusted] = ${formatDollar(rawImpact)} × ${confidenceMultiplier} = ${formatDollar(revenueImpact)}` : ''}`,
        footnote: `Individual results vary.`,
        nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
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
          context: 'Enter your measured denial rate reduction percentage. Organizations at this level have reported 5–15% reduction in documentation-related denials.',
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }

      const monthlyDenialVolume = inputs.monthlyDenialVolume as number | undefined;
      const noDenialVolume = inputs.noDenialVolume === 'true';

      if (noDenialVolume || !monthlyDenialVolume || monthlyDenialVolume <= 0) {
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: `Denial rate reduced ${denialPct}% — enter monthly denial dollar value to calculate impact`,
          context: `Your documentation-related denial rate decreased by ${denialPct}%.\n\nTo calculate the dollar impact, enter the total dollar value of documentation-related denials per month above (not the number of denied claims). Your revenue cycle team will have this figure.`,
          formula: '',
          footnote: 'Estimates based on your inputs. Individual results vary.',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }

      const rawDenialSavings = Math.round(monthlyDenialVolume * (denialPct / 100) * 12);
      const annualDenialSavings = Math.round(rawDenialSavings * confidenceMultiplier);
      return {
        label: 'Confirmed Impact',
        value: annualDenialSavings,
        hasValue: true,
        headlineMetric: `${formatDollar(annualDenialSavings)} in annual denial reduction`,
        context: `Documentation-related denial rate reduced ${denialPct}%.\n\n${formatDollar(monthlyDenialVolume)} monthly denial volume × ${denialPct}% reduction × 12 months = ${formatDollar(rawDenialSavings)} annually.${confidenceNote}\n\nBased on your organization's measurement data.`,
        formula: `[annualDenialSavings] = ${formatDollar(monthlyDenialVolume)} × ${denialPct}% × 12 = ${formatDollar(rawDenialSavings)}${confidenceMultiplier < 1 ? `\n[adjusted] = ${formatDollar(rawDenialSavings)} × ${confidenceMultiplier} = ${formatDollar(annualDenialSavings)}` : ''}`,
        footnote: `Based on your measured denial rate reduction and your organization's monthly denial volume. Attribution note: this assumes the denial rate improvement is attributable to documentation quality changes. Isolate documentation-related denials from other denial categories in your before/after analysis for a more defensible figure.`,
        nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    if (metricType === 'hcc_capture') {
      const hccImprovement = inputs.measuredHccImprovement as number | undefined;
      if (!hccImprovement || hccImprovement <= 0) {
        return {
          label: 'Impact Measured',
          value: null, hasValue: false,
          headlineMetric: 'Enter measured HCC capture improvement to calculate.',
          context: 'Enter the percentage point improvement in HCC capture rate your organization has confirmed since deployment. Benchmark: 2–8% improvement in Year 1. Your VBC or risk adjustment team will have this figure.',
          formula: '', footnote: '',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      // HCC value: uses MA/VBC lives × avg annual payment × improvement pct if available
      // Falls back to provider-based estimate if no population data entered
      const maLives = (inputs.maLivesRevenue as number) || 0;
      const avgAnnualPayment = (inputs.avgAnnualPaymentRevenue as number) || 13000;
      if (maLives > 0) {
        const hccValue = Math.round(maLives * avgAnnualPayment * (hccImprovement / 100) * confidenceMultiplier);
        return {
          label: 'Impact Measured',
          value: hccValue, hasValue: true,
          headlineMetric: `${formatDollar(hccValue)} in HCC / risk-adjusted revenue`,
          context: `HCC capture rate improved ${hccImprovement} percentage points.\n\n${maLives.toLocaleString()} MA/VBC lives × ${formatDollar(avgAnnualPayment)} average annual payment × ${hccImprovement}% improvement = ${formatDollar(Math.round(maLives * avgAnnualPayment * hccImprovement / 100))}.${confidenceNote}\n\nBased on your organization's measurement data. Validate RAF score delta with your risk adjustment team.`,
          formula: `[hccValue] = ${maLives.toLocaleString()} lives × ${formatDollar(avgAnnualPayment)} × ${hccImprovement}% = ${formatDollar(Math.round(maLives * avgAnnualPayment * hccImprovement / 100))}${confidenceMultiplier < 1 ? `\n[adjusted] = × ${confidenceMultiplier} = ${formatDollar(hccValue)}` : ''}`,
          footnote: 'RAF-based calculation. Average annual payment varies by payer, contract, and risk score distribution. Individual results vary.',
          nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
        };
      }
      // No population data — show improvement signal with guidance to get population figure
      return {
        label: 'Impact Measured',
        value: null, hasValue: false,
        headlineMetric: `HCC capture rate improved ${hccImprovement} pp — enter MA/VBC population to calculate dollar impact`,
        context: `Your documentation-related HCC capture rate improved ${hccImprovement} percentage points.\n\nTo calculate the dollar impact, enter your Medicare Advantage or value-based care population size below. Your VBC or risk adjustment team will have this figure. Each percentage point of RAF score improvement is worth approximately $1,000–$1,500 per member per year.`,
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
      };
    }

    return {
      label: 'Impact Measured',
      value: null, hasValue: false,
      headlineMetric: 'Select measurement type to calculate.',
      context: '',
      formula: '', footnote: '',
      nextLevelTeaser: 'Strategic Impact: embed documentation intelligence into revenue strategy, payer positioning, and financial planning.',
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
      context += `\n\nNo confirmed revenue attribution yet. Derived planning estimate: ${documentedEncounters.toLocaleString()} documented encounters × 0.05–0.10 wRVU improvement × $${conversionFactor}/wRVU = ${formatDollar(Math.round(documentedEncounters * 0.05 * conversionFactor))}–${formatDollar(Math.round(documentedEncounters * 0.10 * conversionFactor))}/yr. Based on industry-observed wRVU specificity improvements from documentation enhancement. Validate with a 90-day before/after revenue cycle analysis.`;
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
    context: `Derived planning estimate: ${documentedEncounters.toLocaleString()} documented encounters × 0.05–0.10 wRVU improvement × $${conversionFactor}/wRVU = ${formatDollar(Math.round(documentedEncounters * 0.05 * conversionFactor))}–${formatDollar(Math.round(documentedEncounters * 0.10 * conversionFactor))}/yr. Based on industry-observed wRVU specificity improvements from documentation enhancement. Select an integration above and enter your organization's confirmed figure to replace this estimate.`,
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

    if (!minutesSaved || minutesSaved <= 0) {
      const lowHrs = Math.round(providers * 10 * CLINICAL_DAYS / 60);
      const highHrs = Math.round(providers * 20 * CLINICAL_DAYS / 60);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter in-clinic time savings to calculate.',
        context: `Published benchmark: 10–20 minutes per provider per day of in-clinic burden reduction (MGMA Physician Productivity data). At ${providers.toLocaleString()} providers, that is ${lowHrs.toLocaleString()}–${highHrs.toLocaleString()} hours annually.\n\nProvider relief is visible but hasn't been connected to retention, turnover, or workforce economics yet. That connection is where the value becomes defensible.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Emerging: document observable behavioral changes — after-hours patterns, note completion, time reclaimed at home.',
      };
    }

    const clinicSavedHours = Math.round(minutesSaved * providers * CLINICAL_DAYS / 60);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${clinicSavedHours.toLocaleString()} in-clinic hours recovered annually across ${providers} providers.`,
      context: `In-clinic documentation time returned: ${clinicSavedHours.toLocaleString()} hours annually (${minutesSaved} min/provider/day × ${providers} providers × ${CLINICAL_DAYS} clinical days).\n\nProvider experience and workforce impact have not been attributed or counted. No surveys, behavioral signals, or retention analysis exist yet.`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × ${CLINICAL_DAYS} / 60 = ${clinicSavedHours.toLocaleString()}`,
      footnote: `${CLINICAL_DAYS} clinical working days. Dollar value connects at Demonstrated when turnover data is entered.`,
      nextLevelTeaser: 'Emerging: document observable behavioral changes — after-hours patterns, note completion, time reclaimed at home.',
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
        nextLevelTeaser: 'Demonstrated: connect behavioral change to measured turnover rate improvement and a formal retention figure.',
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
      footnote: 'Behavioral changes are qualitative indicators. Financial value connects at Demonstrated when turnover data is entered.',
      nextLevelTeaser: 'Demonstrated: connect behavioral change to measured turnover rate improvement and a formal retention figure.',
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
        context: `Enter your turnover rate before and after deployment to calculate the financial value of improved retention. Default replacement cost: $350K (AMGA 2023 blended average — primary care typically $250–300K, medical specialists $350–450K, surgical $500–700K). Enter your organization's actual figure if known.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Strategic Impact: integrate provider experience data into workforce strategy — recruitment positioning, care model design, and board-level planning.',
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
        nextLevelTeaser: 'Strategic Impact: integrate provider experience data into workforce strategy — recruitment positioning, care model design, and board-level planning.',
      };
    }

    const departuresAvoided = providers * (rateDelta / 100);
    const departuresDisplay = Math.round(departuresAvoided);
    const retentionValue = Math.round(departuresAvoided * replacementCost);
    const replacementLabel = isDefaultReplacementCost
      ? `AMGA benchmark: ${formatDollar(replacementCost)}/physician`
      : `Your input: ${formatDollar(replacementCost)}/physician`;

    return {
      label: 'Confirmed Impact',
      value: retentionValue,
      hasValue: true,
      headlineMetric: `${formatDollar(retentionValue)} in retention value from ${rateDelta.toFixed(1)} pp improvement in physician turnover.`,
      context: `Turnover rate moved from ${beforeTurnoverRate}% to ${effectiveAfterRate}% — a ${rateDelta.toFixed(1)} percentage point improvement across ${providers} providers.\n\nDepartures avoided: ${providers} × ${rateDelta.toFixed(1)}% ≈ ${departuresDisplay} physician${departuresDisplay !== 1 ? 's' : ''}.\nReplacement cost: ${replacementLabel}.\nRetention value: ${departuresDisplay} × ${formatDollar(replacementCost)} = ${formatDollar(retentionValue)}.`,
      formula: `[departuresAvoided] = ${providers} × (${beforeTurnoverRate}% − ${effectiveAfterRate}%) = ${departuresAvoided.toFixed(2)}\n[retentionValue] = ${departuresAvoided.toFixed(2)} × ${formatDollar(replacementCost)} = ${formatDollar(retentionValue)}`,
      footnote: isDefaultReplacementCost
        ? `Replacement cost uses AMGA 2023 blended average ($350K). Ranges by specialty: primary care $250–300K, medical specialists $350–450K, surgical/procedural $500–700K. Update with your organization's actual figure for a more precise calculation. Attribution note: this calculation assumes documentation burden reduction is the primary driver of the observed turnover improvement. If concurrent retention initiatives were in place, discount accordingly.`
        : `Replacement cost based on your input. Attribution note: this calculation assumes documentation burden reduction is the primary driver of the observed turnover improvement. If concurrent retention initiatives were in place, discount accordingly.`,
      nextLevelTeaser: 'Strategic Impact: integrate provider experience data into workforce strategy — recruitment positioning, care model design, and board-level planning.',
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
      headlineMetric: 'Select where provider experience data is informing organizational strategy.',
      context: 'At this level, provider experience isn\'t just an HR metric — it\'s a competitive asset. Documentation burden data informs how your organization recruits, retains, and deploys its physicians. Select where that is happening.',
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
  'Clinical AI readiness — documentation structure supporting protocol adherence, care gap closure, or AI-driven workflows',
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
  'Clinical AI readiness — structured documentation is the data foundation for clinical AI, predictive models, automated reporting, and next-generation care workflows',
  'Value-based care — documentation supports HCC accuracy, risk stratification, population health, and VBC contract performance',
  'Quality program design — documentation data shapes HEDIS, MIPS, or Stars strategy and gap closure',
  'Compliance governance — documentation quality is a governed organizational metric with named executive ownership',
  'Payer strategy — documentation quality data informs payer negotiations, contract design, or risk corridor management',
  'Clinical research — structured documentation supports research data extraction, registry participation, or real-world evidence programs',
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
      context: `${documentedEncounters.toLocaleString()} encounters annually. The downstream connection between documentation quality and CDI, coding, quality reporting, and compliance hasn't been formally established yet.\n\nThe value is almost certainly generating — nothing has been attributed or counted.`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Emerging: establish systematic tracking of at least one documentation quality dimension.',
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
        nextLevelTeaser: 'Demonstrated: connect documentation quality to a downstream financial program — CDI, coding, MIPS, or denial reduction.',
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
        nextLevelTeaser: 'Demonstrated: connect documentation quality to a downstream financial program — CDI, coding, MIPS, or denial reduction.',
      };
    }

    const headlineMetric = approach === 'realtime'
      ? `${count} of 6 quality dimensions in real-time tracking`
      : approach === 'systematic'
        ? `${count} of 6 quality dimensions systematically tracked`
        : `${count} of 6 quality dimensions monitored (informal)`;

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric,
      context: `Documentation quality is actively monitored via ${approachLabel}.\n\nDimensions tracked:\n${trackedList}`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Demonstrated: connect documentation quality to a downstream financial program — CDI, coding, MIPS, or denial reduction.',
    };
  }

  if (level === 3) {
    const { checked } = parseCheckedItems(inputs.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS);
    const count = checked.length;
    const checkedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const depth = inputs.qualityMeasurementDepth as string | undefined;
    const noDownstreamValue = inputs.noQualityValue === 'true';
    const downstreamValue = noDownstreamValue ? 0 : ((inputs.qualityAttributedValue as number) || 0);

    const cdiQueriesBefore = (inputs.cdiQueriesBefore as number) || 0;
    const cdiQueriesAfter = (inputs.cdiQueriesAfter as number) || 0;
    const cdiQueryCost = (inputs.cdiQueryCost as number) || 100;
    const cdiQueryReduction = Math.max(0, cdiQueriesBefore - cdiQueriesAfter);
    const cdiAnnualSavings = cdiQueryReduction > 0 ? Math.round(cdiQueryReduction * cdiQueryCost * 12) : 0;

    const maLives = (inputs.maLives as number) || 0;
    const avgAnnualPayment = (inputs.avgAnnualPayment as number) || 13000;
    const hccImprovementPct = (inputs.hccImprovementPct as number) || 0;
    const hccAnnualValue = (maLives > 0 && hccImprovementPct > 0)
      ? Math.round(maLives * avgAnnualPayment * (hccImprovementPct / 100))
      : 0;

    const mipsValue = (inputs.mipsValue as number) || 0;

    const calculatedValue = cdiAnnualSavings + hccAnnualValue + mipsValue;
    const effectiveValue = downstreamValue > 0 ? downstreamValue : calculatedValue;
    const isCalculatorEstimate = downstreamValue === 0 && calculatedValue > 0;

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Select connected downstream areas.',
        context: 'Select which downstream areas have been connected to documentation quality improvements.',
        formula: '',
        footnote: 'Estimates based on your inputs. Individual results vary.',
        nextLevelTeaser: 'Strategic Impact: transform documentation quality into a governed intelligence layer — the foundation for VBC strategy and clinical AI.',
      };
    }

    const depthText = depth === 'measured'
      ? 'Measured data is available.'
      : depth === 'partial'
        ? 'Some areas have measured data.'
        : depth === 'qualitative'
          ? 'Impact is visible but not yet quantified.'
          : '';

    if (effectiveValue > 0) {
      const componentLabels = [
        cdiAnnualSavings > 0 ? 'CDI' : '',
        hccAnnualValue > 0 ? 'HCC' : '',
        mipsValue > 0 ? 'quality program' : '',
      ].filter(Boolean);

      const headlineMetric = isCalculatorEstimate
        ? `${formatDollar(effectiveValue)} in estimated ${componentLabels.join(' + ')} value`
        : `${formatDollar(effectiveValue)} in downstream quality value`;

      const calculatorLines = [
        cdiAnnualSavings > 0
          ? `CDI query reduction: ${cdiQueryReduction} fewer queries/month × ${formatDollar(cdiQueryCost)}/query × 12 = ${formatDollar(cdiAnnualSavings)} annually.`
          : '',
        hccAnnualValue > 0
          ? `HCC capture improvement: ${maLives.toLocaleString()} MA/VBC lives × ${formatDollar(avgAnnualPayment)}/year × ${hccImprovementPct}% = ${formatDollar(hccAnnualValue)} in additional risk-adjusted revenue.`
          : '',
        mipsValue > 0
          ? `MIPS / quality program value: ${formatDollar(mipsValue)} in penalty avoidance or quality incentives.`
          : '',
      ].filter(Boolean);

      const context = isCalculatorEstimate
        ? calculatorLines.join('\n') +
          `\n\nNote: This captures CDI efficiency and HCC/risk adjustment value. Documentation-driven revenue (wRVU, collections, denials) is captured separately in the Revenue domain.` +
          (count > 0 ? `\n\nConnected downstream areas:\n${checkedList}` : '') +
          (depthText ? `\n\n${depthText}` : '')
        : `Documentation quality is driving ${formatDollar(effectiveValue)} in annual value across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${depthText ? `\n\n${depthText}` : ''}`;

      const formulaLines = [
        cdiAnnualSavings > 0 ? `[cdiSavings] = ${cdiQueryReduction} queries/mo × ${formatDollar(cdiQueryCost)} × 12 = ${formatDollar(cdiAnnualSavings)}` : '',
        hccAnnualValue > 0 ? `[hccValue] = ${maLives.toLocaleString()} lives × ${formatDollar(avgAnnualPayment)} × ${hccImprovementPct}% = ${formatDollar(hccAnnualValue)}` : '',
        mipsValue > 0 ? `[mipsValue] = ${formatDollar(mipsValue)} (organization estimate)` : '',
      ].filter(Boolean);

      return {
        label: 'Estimated Impact',
        value: effectiveValue,
        hasValue: true,
        headlineMetric,
        context,
        formula: isCalculatorEstimate
          ? formulaLines.join('\n')
          : `[annualValue] = ${formatDollar(effectiveValue)} (organization estimate)`,
        footnote: isCalculatorEstimate
          ? 'Calculator estimates — validate CDI data with your CDI team, HCC improvement with actual RAF score data after 12+ months, and MIPS value with your quality team. Individual results vary.'
          : 'Based on your organization\'s estimate. Individual results vary.',
        nextLevelTeaser: 'Strategic Impact: transform documentation quality into a governed intelligence layer — the foundation for VBC strategy and clinical AI.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} downstream area${count > 1 ? 's' : ''} connected`,
      context: `Documentation quality is driving improvement across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${depthText ? `\n\n${depthText}` : ''}`,
      formula: '',
      footnote: 'Estimates based on your inputs. Individual results vary.',
      nextLevelTeaser: 'Strategic Impact: transform documentation quality into a governed intelligence layer — the foundation for VBC strategy and clinical AI.',
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
    headlineMetric: `${count} strategic area${count > 1 ? 's' : ''} — documentation is an organizational intelligence layer`,
    context: `Documentation quality is embedded in organizational strategy across ${count} area${count > 1 ? 's' : ''}:\n${checkedList}${ownerLine}\n\nThis is where ambient documentation crosses from a clinical workflow tool to an organizational intelligence layer. The data it creates — structured, continuous, longitudinal — is the foundation for value-based care performance, compliance governance, and the clinical AI applications that will define the next decade of healthcare. Organizations that reach this level aren't just getting more value from ambient AI. They are building a data asset that compounds every year the deployment runs.`,
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
      feedback = computeRevenueFeedback(level, inputs, documentedEncounters, revenuePerVisit, conversionFactor, providers);
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

// Benchmark ranges for unmeasured domains.
// Capacity & Revenue scale with documented encounters (providers × annualEncounters × utilization).
// Workforce scales with provider headcount (turnover is per-physician).
// Quality scoped to CDI only — HCC/VBC require payer mix data to calculate.
export const BENCHMARK_RANGES: Record<Domain, {
  low: (providers: number, documentedEncounters?: number, revenuePerVisit?: number) => number;
  high: (providers: number, documentedEncounters?: number, revenuePerVisit?: number) => number;
  description: string;
  source: string;
}> = {
  capacity: {
    // 1 additional patient/provider/month × CLINICAL_MONTHS × revenue per visit
    low: (providers, _de, rvp = 200) => Math.round(providers * 1 * CLINICAL_MONTHS * rvp),
    high: (providers, _de, rvp = 200) => Math.round(providers * 2 * CLINICAL_MONTHS * rvp),
    description: 'in access revenue from confirmed additional patients seen, annually',
    source: 'MGMA access improvement benchmarks',
  },
  revenue: {
    // 0.05–0.10 wRVU improvement per documented encounter × $33.06 CMS 2024 conversion factor
    low: (providers, documentedEncounters) => Math.round((documentedEncounters ?? providers * 2100) * 0.05 * 33),
    high: (providers, documentedEncounters) => Math.round((documentedEncounters ?? providers * 2100) * 0.10 * 33),
    description: 'from documentation-driven wRVU improvement, annually',
    source: 'CMS 2024 Physician Fee Schedule; ambient AI wRVU benchmarks',
  },
  workforce: {
    // 0.5–1.0% reduction in annual physician turnover × $350K AMGA replacement cost
    low: (providers) => Math.round(providers * 0.005 * 350000),
    high: (providers) => Math.round(providers * 0.010 * 350000),
    description: 'in avoided physician replacement cost, annually',
    source: 'AMGA 2023 Physician Retention & Compensation Survey',
  },
  risk: {
    // CDI only: 24–36 queries/provider/year × $150 loaded cost × 20–25% reduction
    low: (providers) => Math.round(providers * 24 * 150 * 0.20),
    high: (providers) => Math.round(providers * 36 * 150 * 0.25),
    description: 'in CDI query reduction value, annually (excludes HCC and VBC uplift)',
    source: 'HFMA CDI program benchmarks',
  },
};
