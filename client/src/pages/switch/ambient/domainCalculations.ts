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
    1: 'Time Recovering',
    2: 'Quantified',
    3: 'Deployed',
    4: 'Workforce Impact',
  },
  revenue: {
    1: 'Disconnected',
    2: 'Under Investigation',
    3: 'Impact Measured',
    4: 'Managed & Integrated',
  },
  workforce: {
    1: 'Time Is Returning',
    2: 'Burden Measured',
    3: 'Retention Modeled',
    4: 'Labor Line Impact',
  },
  risk: {
    1: 'Notes Improving',
    2: 'Actively Monitored',
    3: 'Downstream Connected',
    4: 'Operationally Embedded',
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
        nextLevelTeaser: 'Level 2 aggregates these hours for leadership review.',
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
        nextLevelTeaser: 'Level 2 aggregates these hours for leadership review.',
      };
    }
    const fte = (recoveredHours / ANNUAL_HOURS).toFixed(1);
    const redeployValue = Math.round(recoveredHours * providerRate * 0.20);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${recoveredHours.toLocaleString()} hours returned annually`,
      context: `${providers.toLocaleString()} providers document ${documentedEncounters.toLocaleString()} encounters annually. At ${ts} minutes returned per encounter, that is ${recoveredHours.toLocaleString()} hours — ${fte} FTE equivalent.\n\nAt 20% redeployment, that is ${formatDollar(redeployValue)} in recoverable capacity value. Based on 20% redeployment scenario at your provider rate of $${providerRate.toLocaleString()}/hr.`,
      formula: `[hours] = ${documentedEncounters.toLocaleString()} documented encounters × ${ts} min / 60 = ${recoveredHours.toLocaleString()}\n[FTE equivalent] = ${recoveredHours.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} (${CLINICAL_DAYS} clinical days × 8 hrs) = ${fte}\n[redeployment opportunity] = ${recoveredHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 20% = ${formatDollar(redeployValue)}`,
      footnote: 'Recovered hours represent available capacity. Financial value depends on how this time is allocated at higher maturity levels.',
      nextLevelTeaser: 'Level 2 aggregates these hours for leadership review.',
    };
  }

  if (level === 2) {
    const ts = (inputs.timeSaved as number) || 0;
    if (!hasTimeSaved && !unmeasuredChecked) {
      const benchLow = Math.round(documentedEncounters * 2 / 60);
      const benchHigh = Math.round(documentedEncounters * 3 / 60);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${benchLow.toLocaleString()}–${benchHigh.toLocaleString()} hours recoverable annually`,
        context: `Enter time saved per encounter to quantify recovered capacity. At this encounter volume, the benchmark range is ${benchLow.toLocaleString()}–${benchHigh.toLocaleString()} hours annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 allocates recovered hours to patient access or scheduling.',
      };
    }
    const aggregated = inputs.capacityAggregated as string | undefined;
    const leadershipDecision = inputs.capacityLeadershipDecision as string | undefined;
    let decisionStatus = 'pending';
    if (aggregated === 'yes' && leadershipDecision === 'yes') {
      decisionStatus = 'confirmed';
    } else if (aggregated === 'yes' && leadershipDecision === 'partial') {
      decisionStatus = 'in progress';
    }

    const weeklyHoursRecovered = inputs.weeklyHoursRecovered as number | undefined;
    const schedulingChanges = inputs.schedulingChangesExplored as string | undefined;
    const additionalSlots = inputs.additionalSlotsPerWeek as number | undefined;

    let weeklyContext = '';
    let weeklyFormula = '';
    let displayHours = 0;
    let displayFte = '0.0';
    if (weeklyHoursRecovered && weeklyHoursRecovered > 0) {
      const annualFromWeekly = Math.round(weeklyHoursRecovered * CLINICAL_WEEKS);
      displayHours = annualFromWeekly;
      displayFte = (annualFromWeekly / ANNUAL_HOURS).toFixed(1);
      weeklyContext = `Your team reports ${weeklyHoursRecovered} hours recovered per week — ${annualFromWeekly.toLocaleString()} hours annualized (${CLINICAL_WEEKS} clinical weeks). That is ${displayFte} FTE equivalent.`;
      weeklyFormula = `[annualRecoveredHours] = ${weeklyHoursRecovered} hrs/week × ${CLINICAL_WEEKS} weeks = ${annualFromWeekly.toLocaleString()}\n[FTE equivalent] = ${annualFromWeekly.toLocaleString()} ÷ ${ANNUAL_HOURS.toLocaleString()} (${CLINICAL_DAYS} clinical days × 8 hrs) = ${displayFte}`;
    }

    let schedulingContext = '';
    let slotsFormula = '';
    if (schedulingChanges === 'piloting') {
      schedulingContext = '\n\nScheduling changes are being piloted.';
    } else if (schedulingChanges === 'planning') {
      schedulingContext = '\n\nScheduling changes are in the planning phase.';
    } else if (schedulingChanges === 'not_yet') {
      schedulingContext = '\n\nNo scheduling or template changes explored yet.';
    }

    if ((schedulingChanges === 'piloting' || schedulingChanges === 'planning') && additionalSlots && additionalSlots > 0) {
      const annualSlots = Math.round(additionalSlots * CLINICAL_WEEKS);
      const slotRevenue = Math.round(annualSlots * revenuePerVisit);
      schedulingContext += ` At ${additionalSlots} additional slots/week, that's ${annualSlots.toLocaleString()} incremental encounters annually — worth an estimated ${formatDollar(slotRevenue)}.`;
      slotsFormula = `\n[slotsRevenue] = ${additionalSlots} slots/week × ${CLINICAL_WEEKS} weeks × ${formatDollar(revenuePerVisit)}/visit = ${formatDollar(slotRevenue)}`;
    }

    const redeployLow = displayHours > 0 ? Math.round(displayHours * providerRate * 0.20) : 0;
    const redeployHigh = displayHours > 0 ? Math.round(displayHours * providerRate * 0.35) : 0;
    const redeployContext = displayHours > 0
      ? `\n\nOpportunity range: ${formatDollar(redeployLow)}–${formatDollar(redeployHigh)} annually. 20% = early-stage redeployment, 35% = organizations with intentional scheduling changes.`
      : '';
    const redeployFormula = displayHours > 0
      ? `\n[redeployment low] = ${displayHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 20% = ${formatDollar(redeployLow)}\n[redeployment high] = ${displayHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 35% = ${formatDollar(redeployHigh)}`
      : '';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: displayHours > 0 ? `${displayHours.toLocaleString()} hours quantified. Decision ${decisionStatus}.` : `Decision ${decisionStatus}. Enter weekly hours to quantify.`,
      context: `${weeklyContext}${redeployContext}${schedulingContext}`,
      formula: `${weeklyFormula}${redeployFormula}${slotsFormula}`,
      footnote: '',
      nextLevelTeaser: 'Level 3 allocates recovered hours to patient access or scheduling.',
    };
  }

  if (level === 3) {
    const additionalPatients = inputs.additionalPatientsPerMonth as number | undefined;
    if (!additionalPatients || additionalPatients <= 0) {
      const lowPatients = providers * 3 * 12;
      const highPatients = providers * 8 * 12;
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${lowPatients.toLocaleString()}–${highPatients.toLocaleString()} additional patients annually`,
        context: `Benchmark: organizations that restructure scheduling around ambient see 3–8 additional patients per provider per month. At ${providers.toLocaleString()} providers, that is ${lowPatients.toLocaleString()}–${highPatients.toLocaleString()} additional patients annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 incorporates capacity changes into workforce planning.',
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
      context: `${additionalPatients} additional patient${additionalPatients !== 1 ? 's' : ''} per provider per month across ${redesignedProviders} provider${redesignedProviders !== 1 ? 's' : ''} = ${annualAdditionalVisits.toLocaleString()} new encounters annually at ${formatDollar(revenuePerVisit)} per visit.`,
      formula: `[annualVisits] = ${additionalPatients} patients/mo × ${redesignedProviders} providers × 11 clinical months = ${annualAdditionalVisits.toLocaleString()}\n[accessRevenue] = ${annualAdditionalVisits.toLocaleString()} × ${formatDollar(revenuePerVisit)} = ${formatDollar(accessRevenue)}`,
      footnote: 'Uses 11 clinical months (230 working days ÷ ~21 working days/month). Revenue per visit from your baseline inputs.',
      nextLevelTeaser: 'Level 4 incorporates capacity changes into workforce planning.',
      warningBanner: isAspirational ? 'Planning scenario — based on your stated target, not confirmed scheduling data. Treat as a goal, not an actuals figure.' : undefined,
    };
  }

  const CAPACITY_PLANNING_LABELS = [
    'Avoided or deferred new hires',
    'Absorbed volume without adding FTEs',
    'Redeployed providers',
    'In the annual staffing model',
    'In a service line business case',
  ];
  const planningCsv = inputs.capacityPlanningAreas as string | undefined;
  const fteAvoided = inputs.fteAvoided as number | undefined;
  const annualCostPerFte = (inputs.annualCostPerFte as number) || 0;
  const checkedSet = new Set((planningCsv || '').split(',').filter(Boolean));
  const checkedLabels = CAPACITY_PLANNING_LABELS.filter((_, i) => checkedSet.has(String(i)));
  const uncheckedLabels = CAPACITY_PLANNING_LABELS.filter((_, i) => !checkedSet.has(String(i)));
  const planCount = checkedLabels.length;

  if (planCount === 0 && (!fteAvoided || fteAvoided <= 0)) {
    const avoidedLow = 350000;
    const avoidedHigh = 900000;
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${formatDollar(avoidedLow)}–${formatDollar(avoidedHigh)} in avoided annual cost`,
      context: `At ${providers.toLocaleString()} providers, 1–2 avoided FTEs represents ${formatDollar(avoidedLow)}–${formatDollar(avoidedHigh)} in avoided annual cost, fully loaded. Select workforce planning areas and enter FTEs avoided to calculate.`,
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
    context: `${fteAvoided} FTE × ${formatDollar(annualCostPerFte)} fully-loaded cost = ${formatDollar(capacityValue)} per year in avoided workforce cost.${planCount > 0 ? `\n\nConnected to ${planCount} planning area${planCount > 1 ? 's' : ''}: ${checkedLabels.join(', ')}` : ''}${uncheckedLabels.length > 0 ? `\n\nNot yet connected: ${uncheckedLabels.join(', ')}` : ''}`,
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
    const emComplexity = inputs.emComplexity as string | undefined;
    const docDeficiencyRate = inputs.docDeficiencyRate as number | undefined;
    const hasDeficiencyData = docDeficiencyRate !== undefined && docDeficiencyRate > 0;
    const hasComplexityData = emComplexity && emComplexity !== 'unsure';

    if (hasDeficiencyData || hasComplexityData) {
      const upliftPerEncounter = emComplexity === 'mostly_l3' ? 8 : emComplexity === 'mix_l3_l4' ? 5 : emComplexity === 'mostly_l4_l5' ? 3 : 5;
      const deficiencyMultiplier = hasDeficiencyData ? Math.min(docDeficiencyRate! / 10, 2.0) : 1.0;
      const estimatedOpportunityLow = Math.round(documentedEncounters * upliftPerEncounter * 0.5 * deficiencyMultiplier);
      const estimatedOpportunityHigh = Math.round(documentedEncounters * upliftPerEncounter * 1.5 * deficiencyMultiplier);

      const complexityNote = emComplexity === 'mostly_l3'
        ? 'With predominantly Level 3 visits, there is significant opportunity for more specific documentation to support higher-complexity coding.'
        : emComplexity === 'mix_l3_l4'
          ? 'A mix of Level 3–4 visits suggests moderate coding accuracy opportunity from improved documentation specificity.'
          : emComplexity === 'mostly_l4_l5'
            ? 'With higher-complexity visits, the opportunity shifts toward reducing denials and improving specificity rather than level shifts.'
            : '';

      const deficiencyNote = hasDeficiencyData
        ? `\n\nYour ${docDeficiencyRate}% query rate ${docDeficiencyRate! > 12 ? 'is above' : docDeficiencyRate! < 8 ? 'is below' : 'is within'} the industry average (8–12%). ${docDeficiencyRate! > 12 ? 'This elevated rate suggests substantial recoverable value from better documentation.' : docDeficiencyRate! < 8 ? 'A lower rate suggests your documentation is relatively strong — opportunity is in specificity improvements.' : 'Typical rate — ambient documentation improvements should have a meaningful impact.'}`
        : '';

      let contextParts: string[] = [];
      if (complexityNote) contextParts.push(complexityNote);
      if (deficiencyNote) contextParts.push(deficiencyNote.trim());
      contextParts.push(`At ${documentedEncounters.toLocaleString()} encounters, documentation improvements could generate ${formatDollar(estimatedOpportunityLow)}–${formatDollar(estimatedOpportunityHigh)} annually.`);

      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${formatDollar(estimatedOpportunityLow)}–${formatDollar(estimatedOpportunityHigh)} estimated revenue opportunity`,
        context: contextParts.join('\n\n'),
        formula: `[estimatedRange] = ${documentedEncounters.toLocaleString()} encounters × $${upliftPerEncounter} uplift × deficiency factor (${deficiencyMultiplier.toFixed(1)})`,
        footnote: 'Estimate based on E&M complexity profile and documentation deficiency rate. Actual impact requires revenue cycle analysis.',
        nextLevelTeaser: 'Level 2 involves active analysis of coding and denial trends.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${documentedEncounters.toLocaleString()} encounters — revenue cycle not yet engaged.`,
      context: `Documentation specificity has improved across ${documentedEncounters.toLocaleString()} encounters. Revenue impact has not been analyzed. Enter E&M complexity data or deficiency rates to estimate the opportunity.`,
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Level 2 involves active analysis of coding and denial trends.',
    };
  }

  if (level === 2) {
    const INVESTIGATION_AREAS = [
      'wRVU per encounter trends',
      'Coding specificity / ICD-10 distribution',
      'Denial rates tied to documentation',
      'Collections before vs. after',
      'CDI query volume',
      'Coder productivity',
    ];
    const { checked } = parseCheckedItems(inputs.investigationAreas as string, INVESTIGATION_AREAS);
    const count = checked.length;
    const codingSpecificityImprovement = inputs.codingSpecificityImprovement as number | undefined;
    const currentDenialRate = inputs.currentDenialRate as number | undefined;
    const hasCodingData = codingSpecificityImprovement !== undefined && codingSpecificityImprovement > 0;
    const hasDenialData = currentDenialRate !== undefined && currentDenialRate > 0;

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Analysis not yet started.',
        context: `Your revenue cycle is actively investigating. Select the areas being analyzed. Financial impact will be quantified when before/after measurement is available (Level 3).`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 requires before/after measurement data.',
      };
    }

    const checkedLabels = checked.map(shortLabel).join(', ');
    const duration = inputs.investigationDuration as string | undefined;
    const durationNote = duration === '90plus' ? '\n\nAnalysis is 90+ days in — sufficient for before/after comparison at Level 3.' : '';

    let investigationContext = `Revenue cycle is analyzing: ${checkedLabels}.`;
    if (hasCodingData) {
      investigationContext += `\n\nEstimated coding specificity improvement: ${codingSpecificityImprovement}%.`;
    }
    if (hasDenialData) {
      investigationContext += `\n\nCurrent denial rate: ${currentDenialRate}%.`;
    }
    investigationContext += durationNote;
    investigationContext += '\n\nFinancial impact will be quantified when before/after measurement is available (Level 3).';

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `Analysis underway across ${count} area${count !== 1 ? 's' : ''}.`,
      context: investigationContext,
      formula: '',
      footnote: 'Dollar value available at Level 3 when before/after data is entered.',
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
        context: `Select what was measured to calculate the revenue impact. Abridge deployment benchmark at this encounter volume: $150K–$500K annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
      };
    }

    if (metricType === 'wrvu') {
      const wrvuDelta = inputs.measuredWrvuDelta as number | undefined;
      if (!wrvuDelta || wrvuDelta <= 0) {
        const benchValue = Math.round(documentedEncounters * 0.1 * conversionFactor / 1000) * 1000;
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured wRVU change to calculate.',
          context: `Enter your measured wRVU change per encounter. Abridge benchmark: a 0.1 wRVU improvement per encounter is approximately ${formatDollar(benchValue)} annually.`,
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
        };
      }
      const revenueImpact = Math.round(wrvuDelta * documentedEncounters * conversionFactor);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `${wrvuDelta} wRVU improvement per encounter across ${documentedEncounters.toLocaleString()} documented encounters = ${formatDollar(revenueImpact)} in annual revenue.`,
        formula: `[revenueImpact] = ${wrvuDelta} wRVU × ${documentedEncounters.toLocaleString()} encounters × $${conversionFactor} (CMS conversion factor) = ${formatDollar(revenueImpact)}`,
        footnote: `CMS conversion factor: $${conversionFactor}. Adjustable in baseline settings.`,
        nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
      };
    }

    if (metricType === 'collections') {
      const collectionsDelta = inputs.measuredCollectionsDelta as number | undefined;
      if (!collectionsDelta || collectionsDelta <= 0) {
        const benchLow = Math.round(documentedEncounters * 3);
        const benchHigh = Math.round(documentedEncounters * 10);
        return {
          label: 'Estimated Impact',
          value: null,
          hasValue: false,
          headlineMetric: 'Enter measured collections change to calculate.',
          context: `Enter your measured collections change per encounter. Abridge benchmark: $3–$10 per encounter = ${formatDollar(benchLow)}–${formatDollar(benchHigh)} annually.`,
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
        };
      }
      const revenueImpact = Math.round(collectionsDelta * documentedEncounters);
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `${formatDollar(collectionsDelta)} increase in collections per encounter across ${documentedEncounters.toLocaleString()} documented encounters = ${formatDollar(revenueImpact)} annually.`,
        formula: `[revenueImpact] = ${formatDollar(collectionsDelta)} × ${documentedEncounters.toLocaleString()} encounters = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
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
          context: `Enter your measured revenue change percentage. Abridge benchmark: 1–4% improvement.`,
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
        };
      }
      const revenueImpact = Math.round(documentedEncounters * revenuePerVisit * (revenuePct / 100));
      return {
        label: 'Estimated Impact',
        value: revenueImpact,
        hasValue: true,
        context: `${revenuePct}% revenue improvement across ${documentedEncounters.toLocaleString()} encounters at ${formatDollar(revenuePerVisit)}/visit = ${formatDollar(revenueImpact)} annually.`,
        formula: `[revenueImpact] = ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} × ${revenuePct}% = ${formatDollar(revenueImpact)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
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
          headlineMetric: 'Enter denial rate data to calculate.',
          context: `Enter your denial rate before and after ambient. Abridge benchmark: 5–15% denial rate reduction.`,
          formula: '',
          footnote: '',
          nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
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
        context: `Denial rate: ${denialBefore}% → ${denialAfter}%. ${denialDelta.toFixed(1)} point improvement across ${documentedEncounters.toLocaleString()} encounters.`,
        formula: `[denialSavings] = (${denialBefore}% - ${denialAfter}%) × ${documentedEncounters.toLocaleString()} encounters × ${formatDollar(revenuePerVisit)} = ${formatDollar(denialSavings)}`,
        footnote: 'Based on your organization\'s measured data.',
        nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Select measurement type to calculate.',
      context: `Select what was measured to calculate the revenue impact. Abridge deployment benchmark at this encounter volume: $150K–$500K annually.`,
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Level 4 integrates revenue tracking into ongoing operations.',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.revenueIntegrations as string, REVENUE_INTEGRATIONS);
  const recognizedRevenue = inputs.recognizedRevenue as number | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');

  const noConfirmedRevenue = inputs.noConfirmedRevenue === 'true';

  if (count === 0 && (!recognizedRevenue || recognizedRevenue <= 0) && !noConfirmedRevenue) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Enter annually attributed revenue to calculate.',
      context: `Abridge deployment benchmark for full revenue cycle integration at ${documentedEncounters.toLocaleString()} encounters: $200K–$600K annually. Enter your confirmed figure.`,
      formula: '',
      footnote: '',
    };
  }

  if (noConfirmedRevenue && (!recognizedRevenue || recognizedRevenue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Enter annually attributed revenue to calculate.',
      context: `Abridge deployment benchmark at ${documentedEncounters.toLocaleString()} encounters with revenue cycle integration: $200K–$600K annually. Planning figure, not confirmed.`,
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
    context: `${formatDollar(recognizedRevenue || 0)} in annual revenue attributed to documentation quality improvements across ${count} integrated area${count !== 1 ? 's' : ''}: ${checkedLabels}.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
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
    const totalHoursReturned = Math.round(effectiveHrs * providers * 52);
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${totalHoursReturned.toLocaleString()} after-hours hours returned annually`,
      context: `${providers.toLocaleString()} providers × ${effectiveHrs} hrs/week × 52 weeks = ${totalHoursReturned.toLocaleString()} hours of after-hours documentation time returned annually.`,
      formula: `[burdenHours] = ${effectiveHrs} × ${providers} × 52 = ${totalHoursReturned.toLocaleString()}`,
      footnote: 'Uses 52 weeks. For clinical weeks only, adjust to 46–48.',
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
      const lowHrs = Math.round(providers * 10 * 250 / 60);
      const highHrs = Math.round(providers * 20 * 250 / 60);
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
      ? Math.round(confirmedAfterHours * providers * 52)
      : 0;

    const hasSurveyData = surveyType === 'structured' && checkedCount > 0;
    const surveyNarrative = hasSurveyData
      ? `\n\nYour clinician survey validates ${checkedCount} area(s) of provider-reported improvement:\n${checkedLabels.map(l => `• ${l}`).join('\n')}`
      : surveyType === 'not_yet' || surveyType === 'informal' || !surveyType
        ? '\n\nProvider survey not yet conducted or informal only.'
        : '';

    const burdenScoreBefore = inputs.burdenScoreBefore as number | undefined;
    const burdenScoreAfter = inputs.burdenScoreAfter as number | undefined;
    const burnoutNarrative = burdenScoreBefore && burdenScoreAfter && burdenScoreBefore > burdenScoreAfter
      ? `\n\nDocumentation burden score improved from ${burdenScoreBefore}/10 to ${burdenScoreAfter}/10.`
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
      context: `In-clinic documentation time returned: ${clinicSavedHours.toLocaleString()} hours annually (${minutesSaved} min/provider/day × ${providers} providers × 230 clinical days).${confirmedAfterHours && confirmedAfterHours > 0 ? `\n\nAfter-hours time returned: ${afterHoursHours.toLocaleString()} hours annually.` : ''}${surveyNarrative}${burnoutNarrative}`,
      formula: `[clinicHours] = ${minutesSaved} min × ${providers} × 230 / 60 = ${clinicSavedHours.toLocaleString()}${afterHoursHours > 0 ? `\n[afterHoursHours] = ${confirmedAfterHours} × ${providers} × 52 = ${afterHoursHours.toLocaleString()}` : ''}`,
      footnote: '230 clinical working days. Dollar value appears at Level 3 when turnover data is entered.',
      nextLevelTeaser: 'Level 3 models turnover costs with documentation burden as a factor.',
    };
  }

  if (level === 3) {
    const turnoverRate = inputs.turnoverRate as number | undefined;
    const replacementCost = inputs.replacementCost as number | undefined;
    const docBurdenShare = (inputs.docBurdenShare as number) || 0;
    if (!turnoverRate || !replacementCost || turnoverRate <= 0 || replacementCost <= 0) {
      const lowDepartures = providers * 0.06;
      const highDepartures = providers * 0.08;
      const exposureLow = Math.round(lowDepartures * 0.20 * 350000);
      const exposureHigh = Math.round(highDepartures * 0.20 * 350000);
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Enter turnover data to calculate exposure.',
        context: `National physician turnover: 6–8% annually. At ${providers.toLocaleString()} providers, approximately ${Math.round(lowDepartures)}–${Math.round(highDepartures)} departures per year. At 20% documentation-driven and $350K replacement cost, exposure is ${formatDollar(exposureLow)}–${formatDollar(exposureHigh)} annually.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 measures agency and locum spend reduction.',
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
      nextLevelTeaser: 'Level 4 measures agency and locum spend reduction.',
    };
  }

  const agencyReduction = inputs.agencyReduction as number | undefined;
  if (!agencyReduction || agencyReduction <= 0) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Enter monthly spend reduction to calculate.',
      context: `Benchmark: $5K–$30K per month in agency and locum spend reduction. At ${providers.toLocaleString()} providers, that is $60K–$360K annually.`,
      formula: '',
      footnote: '',
    };
  }
  const annualSavings = Math.round(agencyReduction * 12);
  return {
    label: 'Estimated Impact',
    value: annualSavings,
    hasValue: true,
    headlineMetric: `${formatDollar(annualSavings)} in annual labor spend reduction.`,
    context: `${formatDollar(agencyReduction)} per month in agency and locum spend reduction = ${formatDollar(annualSavings)} annually.`,
    formula: `[annualSavings] = ${formatDollar(agencyReduction)} × 12 = ${formatDollar(annualSavings)}`,
    footnote: '',
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
  'CDI query volume reduced',
  'Coding accuracy improved',
  'Prior auth approvals improved',
  'Quality measure performance',
  'Chart abstraction faster',
  'HCC / risk adjustment capture',
];

const STRATEGIC_INTEGRATIONS = [
  'Compliance and audit governance',
  'Quality program strategy',
  'Clinical documentation review',
  'Payer contract negotiations',
  'Value-based care design',
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
  'CDI workflow includes ambient review',
  'Denial management tracks documentation',
  'Dashboards include documentation metrics',
  'Payer negotiations reference it',
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
    const downstreamConnected = inputs.qualityDownstreamConnected as string | undefined;
    const downstreamAreaStr = inputs.qualityDownstreamArea as string | undefined;
    const areaCount = downstreamAreaStr ? downstreamAreaStr.split(',').filter(Boolean).length : 0;

    const chartCompletionRate = inputs.chartCompletionRate as number | undefined;
    const codingAccuracy = inputs.codingAccuracy as number | undefined;
    const hasChartCompletion = chartCompletionRate !== undefined && chartCompletionRate > 0;
    const hasCodingAccuracy = codingAccuracy !== undefined && codingAccuracy > 0;

    let qualityNarrative = '';
    let estimatedValue: number | null = null;
    let formulaStr = '';

    if (hasChartCompletion || hasCodingAccuracy) {
      const parts: string[] = [];
      const formulaParts: string[] = [];

      if (hasChartCompletion) {
        const completionGap = Math.max(0, 95 - chartCompletionRate!);
        parts.push(`Chart completion rate: ${chartCompletionRate}%${completionGap > 0 ? ` (${completionGap} points below 95% target)` : ' (at or above target)'}.`);
        if (completionGap > 0) {
          const incompletePct = (100 - chartCompletionRate!) / 100;
          const incompleteCharts = Math.round(documentedEncounters * incompletePct);
          const recoveryEstimate = Math.round(incompleteCharts * revenuePerVisit * 0.03);
          parts.push(`${incompleteCharts.toLocaleString()} charts annually with completion gaps — estimated ${formatDollar(recoveryEstimate)} in recoverable value from improved completeness.`);
          formulaParts.push(`[incompleteCharts] = ${documentedEncounters.toLocaleString()} × ${(incompletePct * 100).toFixed(0)}% = ${incompleteCharts.toLocaleString()}\n[completenessValue] = ${incompleteCharts.toLocaleString()} × ${formatDollar(revenuePerVisit)} × 3% recovery = ${formatDollar(recoveryEstimate)}`);
          estimatedValue = (estimatedValue || 0) + recoveryEstimate;
        }
      }

      if (hasCodingAccuracy) {
        const accuracyGap = Math.max(0, 92 - codingAccuracy!);
        parts.push(`Coding accuracy: ${codingAccuracy}%${accuracyGap > 0 ? ` (${accuracyGap} points below 92% benchmark)` : ' (at or above benchmark)'}.`);
        if (accuracyGap > 0) {
          const inaccuratePct = (100 - codingAccuracy!) / 100;
          const inaccurateCharts = Math.round(documentedEncounters * inaccuratePct);
          const codingRecovery = Math.round(inaccurateCharts * revenuePerVisit * 0.05);
          parts.push(`${inaccurateCharts.toLocaleString()} charts with potential coding inaccuracies — estimated ${formatDollar(codingRecovery)} in revenue at risk from coding errors.`);
          formulaParts.push(`[inaccurateCharts] = ${documentedEncounters.toLocaleString()} × ${(inaccuratePct * 100).toFixed(0)}% = ${inaccurateCharts.toLocaleString()}\n[codingRisk] = ${inaccurateCharts.toLocaleString()} × ${formatDollar(revenuePerVisit)} × 5% impact = ${formatDollar(codingRecovery)}`);
          estimatedValue = (estimatedValue || 0) + codingRecovery;
        }
      }

      qualityNarrative = `\n\n${parts.join('\n')}`;
      formulaStr = formulaParts.join('\n');
    }

    const statusText = downstreamConnected === 'yes'
      ? (areaCount > 0 ? `${areaCount} downstream area${areaCount !== 1 ? 's' : ''} engaged.` : 'At least one downstream team is formally engaged.')
      : downstreamConnected === 'informal'
        ? 'Downstream teams are informally aware.'
        : 'Downstream connection not yet started.';

    const headlineMetric = estimatedValue && estimatedValue > 0
      ? `${formatDollar(estimatedValue)} estimated quality improvement opportunity`
      : `${documentedEncounters.toLocaleString()} encounters with improved documentation.`;

    return {
      label: 'Estimated Impact',
      value: estimatedValue,
      hasValue: estimatedValue !== null && estimatedValue > 0,
      headlineMetric,
      context: `${documentedEncounters.toLocaleString()} encounters with improved documentation. ${statusText}${qualityNarrative}`,
      formula: formulaStr,
      footnote: estimatedValue && estimatedValue > 0 ? 'Estimated opportunity based on gap between current rates and industry benchmarks. Actual recoverable value depends on payer mix and clinical context.' : '',
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
        headlineMetric: 'Select monitoring approach to continue.',
        context: `${documentedEncounters.toLocaleString()} encounters annually. Select how documentation quality is being tracked.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
      };
    }
    if (approach === 'not_yet') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'No formal quality tracking in place.',
        context: `${documentedEncounters.toLocaleString()} encounters annually. No formal documentation quality monitoring established.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
      };
    }
    if (approach === 'spot_checks') {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Informal quality review in place.',
        context: `${documentedEncounters.toLocaleString()} encounters annually. Informal spot checks are surfacing issues. Systematic tracking would make patterns measurable.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
      };
    }
    const { checked, unchecked } = parseCheckedItems(inputs.qualityAttributes as string, QUALITY_ATTRIBUTES);
    const count = checked.length;

    const complianceAuditPassRate = inputs.complianceAuditPassRate as number | undefined;
    const daysToChartClosure = inputs.daysToChartClosure as number | undefined;
    const hasCompliance = complianceAuditPassRate !== undefined && complianceAuditPassRate > 0;
    const hasChartClosure = daysToChartClosure !== undefined && daysToChartClosure > 0;

    let l2MetricParts: string[] = [];

    if (hasCompliance) {
      const complianceGap = Math.max(0, 90 - complianceAuditPassRate!);
      l2MetricParts.push(`Compliance audit pass rate: ${complianceAuditPassRate}%${complianceGap > 0 ? ` (${complianceGap} points below 90% target)` : ' (at or above target)'}.`);
    }

    if (hasChartClosure) {
      const closureGap = Math.max(0, daysToChartClosure! - 3);
      l2MetricParts.push(`Average days to chart closure: ${daysToChartClosure} day${daysToChartClosure !== 1 ? 's' : ''}${closureGap > 0 ? ` (${closureGap} day${closureGap !== 1 ? 's' : ''} above best practice of <3)` : ' (at or below best practice)'}.`);
    }

    const l2Narrative = l2MetricParts.length > 0 ? `\n\n${l2MetricParts.join('\n')}` : '';

    if (count === 0) {
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: 'Quality monitoring approach identified.',
        context: `Systematic tracking is active. Select which documentation attributes are being tracked.\n\nNo financial estimate at this level — the value is in establishing measurement.${l2Narrative}`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
      };
    }
    const trackedList = checked.map(c => `• ${shortLabel(c)}`).join('\n');
    const untrackedList = unchecked.map(c => `• ${shortLabel(c)}`).join('\n');
    const gapRate = inputs.chartGapRate as number | undefined;

    if (gapRate && gapRate > 0) {
      const chartsWithGaps = Math.round(documentedEncounters * (gapRate / 100));
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} of 5 quality dimensions tracked. ${chartsWithGaps.toLocaleString()} charts with gaps identified annually.`,
        context: `Quality monitoring approach identified. No financial estimate at this level — the value is in establishing measurement.\n\nTracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}\n\n${chartsWithGaps.toLocaleString()} charts with documentation gaps annually (${gapRate}% gap rate).${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}${l2Narrative}`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
      };
    }

    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} of 5 quality dimensions tracked`,
      context: `Quality monitoring approach identified. No financial estimate at this level — the value is in establishing measurement.\n\nTracking ${count} documentation quality attribute${count > 1 ? 's' : ''}:\n${trackedList}${unchecked.length > 0 ? `\n\nNot yet tracked:\n${untrackedList}` : ''}\n\nEnter chart documentation gap rate to calculate volume of charts with gaps.${l2Narrative}`,
      formula: '',
      footnote: '',
      nextLevelTeaser: 'Level 3 connects documentation quality to a downstream workflow.',
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
        headlineMetric: 'Select connected workflows to calculate.',
        context: `Select which downstream workflows have shown measurable change. Benchmark at ${documentedEncounters.toLocaleString()} encounters: $100K–$400K in downstream value.`,
        formula: '',
        footnote: '',
        nextLevelTeaser: 'Level 4 embeds documentation quality into governance and strategy.',
      };
    }

    const workflowValues: { name: string; value: number; formula: string }[] = [];

    if (checked.some(c => c.includes('CDI'))) {
      const before = (inputs.cdiQueriesBefore as number) || 0;
      const after = (inputs.cdiQueriesAfter as number) || 0;
      const costPerQuery = (inputs.cdiCostPerQuery as number) || 25;
      if (before > after) {
        const val = Math.round((before - after) * costPerQuery * 12);
        workflowValues.push({ name: 'CDI query reduction', value: val, formula: `(${before} - ${after}) × $${costPerQuery} × 12 = ${formatDollar(val)}` });
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
      const qualityGapValue = (inputs.qualityGapValue as number) || 100;
      if (gapsClosed > 0) {
        const val = Math.round(gapsClosed * 12 * qualityGapValue);
        workflowValues.push({ name: 'Quality gap closure', value: val, formula: `${gapsClosed} gaps/mo × 12 × $${qualityGapValue} = ${formatDollar(val)}` });
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
      const checkedNames = checked.map(c => shortLabel(c)).join(', ');
      return {
        label: 'Estimated Impact',
        value: null,
        hasValue: false,
        headlineMetric: `${count} downstream workflow${count > 1 ? 's' : ''} connected`,
        context: `Connected to ${count} downstream workflow${count > 1 ? 's' : ''}: ${checkedNames}.\n\nEnter before/after metrics for each connected workflow to calculate impact.${unchecked.length > 0 ? `\n\nNot yet connected:\n${uncheckedList}` : ''}`,
        formula: '',
        footnote: '',
      };
    }

    const formulaLines = workflowValues.map(w => `[${w.name}] = ${w.formula}`).join('\n');
    const uncheckedNames = unchecked.map(c => shortLabel(c)).join(', ');
    return {
      label: 'Estimated Impact',
      value: totalValue,
      hasValue: true,
      headlineMetric: `${formatDollar(totalValue)} in measured downstream improvement across ${count} workflow${count > 1 ? 's' : ''}.`,
      context: `Measured downstream improvements:\n\n${workflowValues.map(w => `${w.name}: ${formatDollar(w.value)}`).join('\n')}${unchecked.length > 0 ? `\n\nNot yet connected: ${uncheckedNames}` : ''}`,
      formula: formulaLines,
      footnote: '',
      nextLevelTeaser: 'Level 4 embeds documentation quality into governance and strategy.',
    };
  }

  const { checked, unchecked } = parseCheckedItems(inputs.strategicIntegrations as string, STRATEGIC_INTEGRATIONS);
  const strategicValue = inputs.strategicValue as number | undefined;
  const executiveOwner = inputs.executiveOwner as string | undefined;
  const count = checked.length;
  const checkedLabels = checked.map(shortLabel).join(', ');
  const uncheckedLabels = unchecked.map(shortLabel).join(', ');

  const ownerLine = executiveOwner === 'yes'
    ? `\n\nNamed executive owner${inputs.executiveOwnerRole ? ` (${inputs.executiveOwnerRole})` : ''} for documentation quality strategy.`
    : executiveOwner === 'no'
      ? '\n\nNo named executive owner for documentation quality.'
      : '';

  const noConfirmedStrategicValue = inputs.noConfirmedStrategicValue === 'true';

  if (count === 0 && (!strategicValue || strategicValue <= 0) && !noConfirmedStrategicValue) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Enter strategic value to calculate.',
      context: `At this level, documentation quality is embedded in organizational strategy. Enter the strategic value your organization attributes to documentation quality programs.`,
      formula: '',
      footnote: '',
    };
  }

  if (noConfirmedStrategicValue && (!strategicValue || strategicValue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: 'Enter strategic value to calculate.',
      context: `At ${documentedEncounters.toLocaleString()} encounters, documentation quality programs typically generate value across compliance, quality reporting, and contract performance. Enter your organization's confirmed strategic value.`,
      formula: '',
      footnote: '',
    };
  }

  if (count > 0 && (!strategicValue || strategicValue <= 0)) {
    return {
      label: 'Estimated Impact',
      value: null,
      hasValue: false,
      headlineMetric: `${count} strategic area${count > 1 ? 's' : ''} connected`,
      context: `Documentation quality is embedded in ${count} strategic area${count > 1 ? 's' : ''}: ${checkedLabels}.${ownerLine}\n\nEnter the strategic value your organization attributes to documentation quality to complete this level.${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
      formula: '',
      footnote: '',
    };
  }

  return {
    label: 'Estimated Impact',
    value: strategicValue || 0,
    hasValue: true,
    headlineMetric: `${formatDollar(strategicValue || 0)} in recognized annual strategic value.`,
    context: `Documentation quality embedded in ${count} strategic area${count > 1 ? 's' : ''}: ${checkedLabels}.${ownerLine}\n\n${strategicValue && strategicValue > 0 ? `${formatDollar(strategicValue)} in annual strategic value attributed to documentation quality.` : 'Enter the strategic value your organization attributes to documentation quality.'}${unchecked.length > 0 ? `\n\nNot yet integrated: ${uncheckedLabels}` : ''}`,
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
  if (score >= 4) return 1;
  return 1;
}
