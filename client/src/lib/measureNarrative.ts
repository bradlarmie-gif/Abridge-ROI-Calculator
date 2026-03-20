import {
  type MeasureState,
  type EngagementContext,
  type MaturityStage,
  type DomainStatus,
  type ConfirmedValue,
  type ScenarioResult,
  formatCurrency,
  formatNumber,
  deriveEngagementContext,
  computeDomainStatus,
  calculateConfirmedValue,
  calculateScenario,
  getDefaultScenarios,
  getMonthsFromGoLive,
} from './measureCalculator';

export type MeasureScreen =
  | 'confirmed'
  | 'scenarios'
  | 'value'
  | 'opportunity'
  | 'summary';

export interface NarrativeOutput {
  headline: string;
  body: string;
  handoff: string;
}

interface NarrativeTemplate {
  headline: string;
  body: string;
  handoff: string;
}

type Phase = 1 | 2 | 3 | 4;

interface NarrativeVars {
  months: string;
  providers: string;
  encounters: string;
  hoursReclaimed: string;
  hoursPerProvider: string;
  confirmedLow: string;
  confirmedHigh: string;
  perProvider: string;
  typicalScenario: string;
  gap: string;
  currentAdoption: string;
  targetAdoption: string;
  activeDomains: string;
  settingsLabel: string;
  maturityLabel: string;
  nextMaturityLabel: string;
  phaseLabel: string;
  strongestDomain: string;
  strongestMetric: string;
  preSignalNote: string;
  revenueSignalNote: string;
  strongestDomainSentence: string;
  topGapAction: string;
  secondGapAction: string;
  expansionNote: string;
  expandNote: string;
  strategicNote: string;
  domainsNeeded: string;
  deepenValue: string;
  topNextAction: string;
  qualityMetric: string;
  timeSavingsWarning: string;
  singleDomainNote: string;
  revenueNote: string;
  expansionAddendum: string;
}

function substituteVars(template: string, vars: NarrativeVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return (vars as unknown as Record<string, string>)[key] ?? '';
  }).replace(/\s{2,}/g, ' ').trim();
}

function getDomainPriority(status: DomainStatus): number {
  switch (status) {
    case 'validated': return 4;
    case 'signaling': return 3;
    case 'baseline-only': return 2;
    case 'no-data': return 1;
    default: return 0;
  }
}

function getStrongestDomain(domainStatus: Record<string, DomainStatus>): string {
  let best = 'workforce';
  let bestPriority = 0;
  for (const [domain, status] of Object.entries(domainStatus)) {
    const p = getDomainPriority(status);
    if (p > bestPriority) { bestPriority = p; best = domain; }
  }
  return best;
}

function getStrongestMetric(state: MeasureState, domain: string): string {
  const te = state.timeEfficiency;
  const dq = state.documentationQuality;
  const dep = state.deployment;

  switch (domain) {
    case 'workforce': {
      const delta = te.timeInNotesWithout - te.timeInNotesWith;
      if (delta > 0) {
        const totalHours = (delta * dep.totalEncounters * (dep.utilizationRate / 100)) / 60;
        const months = getMonthsFromGoLive(state.goLiveDate, dep.monthsOnAbridge);
        const weeks = Math.max(1, months * 4.33);
        const perProvPerWeek = dep.providers > 0 ? totalHours / dep.providers / weeks : 0;
        return `providers averaging ${perProvPerWeek.toFixed(1)} hours back per week`;
      }
      return 'time-in-notes reduction beginning to signal';
    }
    case 'quality': {
      const emDelta = dq.emLevelWith - dq.emLevelWithout;
      if (emDelta > 0) return `+${emDelta.toFixed(2)} E/M level improvement`;
      const wrvuDelta = dq.wrvuWith - dq.wrvuWithout;
      if (wrvuDelta > 0) return `+${wrvuDelta.toFixed(2)} wRVU per encounter`;
      return 'documentation accuracy baseline establishing';
    }
    case 'revenue': {
      const wrvuDelta = dq.wrvuWith - dq.wrvuWithout;
      if (wrvuDelta > 0) return `+${wrvuDelta.toFixed(2)} wRVU per encounter across ${formatNumber(Math.round(dep.totalEncounters * dep.utilizationRate / 100))} notes`;
      return 'revenue signals building';
    }
    case 'capacity': {
      const sameDayDelta = te.sameDayClosureWith - te.sameDayClosureWithout;
      if (sameDayDelta > 0) return `+${sameDayDelta.toFixed(0)}% same-day closure improvement`;
      return 'capacity unlock expected at month 6+';
    }
    default: return '';
  }
}

function getStrongestDomainSentence(state: MeasureState, domain: string): string {
  const te = state.timeEfficiency;
  const dq = state.documentationQuality;
  const dep = state.deployment;

  switch (domain) {
    case 'quality': {
      const emDelta = dq.emLevelWith - dq.emLevelWithout;
      const enc = formatNumber(Math.round(dep.totalEncounters * dep.utilizationRate / 100));
      if (emDelta > 0) return `Documentation accuracy is the clearest signal \u2014 +${emDelta.toFixed(2)} E/M improvement across ${enc} encounters.`;
      return '';
    }
    case 'workforce': {
      const delta = te.timeInNotesWithout - te.timeInNotesWith;
      const totalHours = (delta * dep.totalEncounters * (dep.utilizationRate / 100)) / 60;
      const perProv = dep.providers > 0 ? totalHours / dep.providers : 0;
      if (delta > 0) return `Provider time is the clearest signal \u2014 ${formatNumber(Math.round(totalHours))} hours reclaimed, ${perProv.toFixed(1)} per provider.`;
      return '';
    }
    case 'revenue': {
      const wrvuDelta = dq.wrvuWith - dq.wrvuWithout;
      const enc = formatNumber(Math.round(dep.totalEncounters * dep.utilizationRate / 100));
      if (wrvuDelta > 0) return `Revenue is the clearest signal \u2014 wRVU lift of +${wrvuDelta.toFixed(2)} across ${enc} Abridge-documented encounters.`;
      return '';
    }
    case 'capacity': {
      const delta = te.timeInNotesWithout - te.timeInNotesWith;
      const totalHours = (delta * dep.totalEncounters * (dep.utilizationRate / 100)) / 60;
      const addlEncounters = Math.round(totalHours * 0.2 * (60 / (state.calibration.minutesPerVisit || 20)));
      if (addlEncounters > 0) return `Capacity is unlocking \u2014 ${formatNumber(addlEncounters)} additional encounters made possible by reclaimed time.`;
      return '';
    }
    default: return '';
  }
}

function getPreSignalNote(domainStatus: Record<string, DomainStatus>, context: EngagementContext): string {
  const preSignalDomains: string[] = [];
  const phaseThresholds: Record<string, number> = { quality: 3, workforce: 3, revenue: 3, capacity: 6 };
  for (const [domain, status] of Object.entries(domainStatus)) {
    if (status === 'no-data' || status === 'baseline-only') {
      const month = phaseThresholds[domain] ?? 6;
      if (month > context.monthsOnAbridge) {
        preSignalDomains.push(`${domain.charAt(0).toUpperCase() + domain.slice(1)} hasn't unlocked yet \u2014 signal expected at month ${month}, which is on track.`);
      }
    }
  }
  return preSignalDomains[0] || '';
}

function getRevenueSignalNote(state: MeasureState, domainStatus: Record<string, DomainStatus>): string {
  if (domainStatus.revenue === 'signaling' || domainStatus.revenue === 'validated') {
    const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
    if (wrvuDelta > 0) {
      return `Revenue is tracking: wRVU lift of +${wrvuDelta.toFixed(2)} per encounter is building toward the coding accuracy story.`;
    }
  }
  return '';
}

function getGapActions(state: MeasureState, confirmed: ConfirmedValue, typical: ScenarioResult): string[] {
  const actions: string[] = [];
  const dep = state.deployment;
  if (dep.utilizationRate < (typical.inputs.adoptionRate || 75)) {
    actions.push(`increasing adoption from ${dep.utilizationRate}% to ${typical.inputs.adoptionRate}%`);
  }
  if (dep.providers < typical.inputs.providers) {
    actions.push(`expanding from ${dep.providers} to ${typical.inputs.providers} providers`);
  }
  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  if (wrvuDelta > 0) {
    actions.push('deepening revenue capture through wRVU and coding accuracy');
  }
  if (actions.length === 0) actions.push('deepening utilization across enrolled providers');
  return actions;
}

function getSingleDomainNote(domainStatus: Record<string, DomainStatus>, months: number): string {
  const active = Object.entries(domainStatus).filter(([, s]) => s === 'signaling' || s === 'validated');
  if (active.length === 1) {
    const [domain] = active[0];
    const name = domain.charAt(0).toUpperCase() + domain.slice(1);
    const nextPhaseMonth = months < 3 ? 3 : months < 6 ? 6 : 18;
    return `With ${name} as your active signal right now, the story is focused \u2014 and that's appropriate for month ${months}. The multi-domain picture fills in at month ${nextPhaseMonth}.`;
  }
  return '';
}

function getTimeSavingsWarning(state: MeasureState): string {
  const delta = state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith;
  if (delta > 15) {
    return `\u26A0 Note: your time savings figure of ${delta} min/encounter is above the typical 6\u201310 min range \u2014 worth validating with your analytics team before presenting.`;
  }
  return '';
}

const CONFIRMED_TEMPLATES: Record<Phase, Partial<Record<MaturityStage, NarrativeTemplate>>> = {
  1: {
    unmeasured: {
      headline: "{{months}} months in, your data is establishing the baseline everything else builds on.",
      body: "Across {{encounters}} Abridge-documented encounters, your {{strongestDomain}} signal is the clearest yet \u2014 {{strongestMetric}}. This is exactly what we expect in the Documentation Fidelity phase: the foundation is setting, and the compounding hasn't started yet. {{preSignalNote}}",
      handoff: "Now let's look at what the math shows in dollar terms.",
    },
    signaling: {
      headline: "{{months}} months in, your data is establishing the baseline everything else builds on.",
      body: "Across {{encounters}} Abridge-documented encounters, your {{strongestDomain}} signal is the clearest yet \u2014 {{strongestMetric}}. This is exactly what we expect in the Documentation Fidelity phase: the foundation is setting, and the compounding hasn't started yet. {{preSignalNote}}",
      handoff: "Now let's look at what the math shows in dollar terms.",
    },
  },
  2: {
    signaling: {
      headline: "At {{months}} months, your Efficiency phase gains are showing up in the data.",
      body: "Your {{providers}} providers have recovered {{hoursReclaimed}} hours \u2014 {{hoursPerProvider}} hours each \u2014 over the deployment period. {{strongestDomainSentence}} {{revenueSignalNote}}",
      handoff: "Here's what those gains translate to in annual value.",
    },
    validated: {
      headline: "Your data across {{activeDomains}} domains is telling a consistent story.",
      body: "{{confirmedLow}}\u2013{{confirmedHigh}} per year, confirmed across {{encounters}} encounters. At {{hoursPerProvider}} hours returned per provider, your Workforce story is strong enough to take to the CHRO. {{revenueNote}}",
      handoff: "Let's look at what full adoption could add.",
    },
  },
  3: {
    signaling: {
      headline: "At {{months}} months, your {{phaseLabel}} phase data is revealing the full picture.",
      body: "{{confirmedLow}}\u2013{{confirmedHigh}} per year confirmed across {{encounters}} encounters with {{providers}} providers. {{strongestDomainSentence}} The compounding effect is visible \u2014 your per-provider value of {{perProvider}} exceeds early-phase benchmarks. {{singleDomainNote}}",
      handoff: "Here's the dollar breakdown by domain.",
    },
    validated: {
      headline: "Multi-domain validation at {{months}} months \u2014 your data tells a compelling story.",
      body: "{{activeDomains}} of 4 domains are active, confirming {{confirmedLow}}\u2013{{confirmedHigh}} per year. At {{perProvider}} per provider, the per-provider economics are strong and defensible. {{revenueSignalNote}} {{timeSavingsWarning}}",
      handoff: "Let's see the domain-by-domain value breakdown.",
    },
    strategic: {
      headline: "{{months}} months of compounding gains \u2014 this is what strategic deployment looks like.",
      body: "Your {{providers}} providers have confirmed {{confirmedLow}}\u2013{{confirmedHigh}} per year across {{activeDomains}} domains. At {{perProvider}} per provider, the investment case is self-evident. {{strongestDomainSentence}}",
      handoff: "Here's the breakdown, domain by domain.",
    },
  },
  4: {
    validated: {
      headline: "At {{months}} months with {{activeDomains}} active domains, your data supports a board-level conversation.",
      body: "{{confirmedLow}}\u2013{{confirmedHigh}} per year confirmed \u2014 {{perProvider}} per provider. The multi-domain signal means this isn't a single-metric story anymore; it's an organizational capability story. {{revenueSignalNote}}",
      handoff: "Let's put that into the financial framework.",
    },
    strategic: {
      headline: "{{months}} months. {{providers}} providers. {{activeDomains}} domains. This is embedded value.",
      body: "Your data confirms {{confirmedLow}}\u2013{{confirmedHigh}} per year \u2014 {{perProvider}} per provider. At the Strategic stage, the conversation shifts from 'is this working?' to 'where do we grow next?' {{strongestDomainSentence}}",
      handoff: "Here's the full value picture.",
    },
  },
};

const SCENARIO_TEMPLATES = {
  smallGap: {
    headline: "Your confirmed value and the Typical scenario are close \u2014 {{currentAdoption}}% adoption is doing real work.",
    body: "The {{gap}} gap to the Typical scenario closes primarily through {{topGapAction}}. At {{perProvider}} per provider, your per-provider economics are strong. {{expansionNote}}",
    handoff: "Here's where the next chapter of growth sits.",
  },
  mediumGap: {
    headline: "There's {{gap}} per year sitting between where you are and where the Typical scenario puts you.",
    body: "Your confirmed value of {{confirmedLow}}\u2013{{confirmedHigh}} reflects {{currentAdoption}}% adoption. The Typical scenario at {{targetAdoption}}% adoption adds {{gap}} \u2014 without adding a single provider. {{secondGapAction}}",
    handoff: "Let's look at how to capture that.",
  },
  largeGap: {
    headline: "The Typical scenario is {{gap}} above your confirmed value \u2014 and most of that is adoption depth, not expansion.",
    body: "Your per-provider economics are proven at {{perProvider}}. The math from {{currentAdoption}}% to {{targetAdoption}}% adoption is straightforward \u2014 {{gap}} in additional annual value from providers who already have Abridge. {{expansionAddendum}}",
    handoff: "Here's the path, domain by domain.",
  },
};

const OPPORTUNITY_TEMPLATES: Partial<Record<MaturityStage, NarrativeTemplate>> = {
  signaling: {
    headline: "You've demonstrated the model. Now it's about deepening it.",
    body: "At {{currentAdoption}}% adoption across {{providers}} providers, you're in the Signaling stage. Reaching Validated means confirming trends in {{domainsNeeded}} more domain(s) \u2014 and deepening to {{targetAdoption}}% adoption captures +{{deepenValue}} per year on its own.",
    handoff: "Let's put this into your Executive Summary.",
  },
  validated: {
    headline: "The model is validated. The question is how fast you want to scale it.",
    body: "Multi-domain confirmation puts you at Validated \u2014 the stage where renewal is a given and the conversation shifts to expansion. At {{perProvider}} per provider, each additional provider added to the program represents proven, defensible value. {{expandNote}}",
    handoff: "Here's the summary to take to your leadership.",
  },
  strategic: {
    headline: "You're in the Strategic tier \u2014 this is what embedded looks like.",
    body: "Full portfolio, multi-domain validation, {{months}} months of compounding gains. The story has moved from 'is this working?' to 'where do we grow next?' {{strategicNote}}",
    handoff: "Here's your Executive Summary.",
  },
  unmeasured: {
    headline: "You're early \u2014 the model is still establishing itself.",
    body: "At {{currentAdoption}}% adoption and {{months}} months in, the signals are beginning to form. The path to Signaling runs through consistent documentation and reaching the {{domainsNeeded}}-domain threshold.",
    handoff: "Let's see the summary so far.",
  },
};

function buildVars(state: MeasureState, context: EngagementContext, confirmed: ConfirmedValue, typical: ScenarioResult): NarrativeVars {
  const domainStatus = computeDomainStatus(state);
  const strongest = getStrongestDomain(domainStatus);
  const activeDomains = Object.values(domainStatus).filter(s => s === 'signaling' || s === 'validated').length;
  const months = context.monthsOnAbridge;
  const gapValue = Math.max(0, typical.annualValue - (confirmed.low + confirmed.high) / 2);
  const gapActions = getGapActions(state, confirmed, typical);
  const dep = state.deployment;
  const totalHours = confirmed.hoursReclaimed;
  const hoursPerProv = dep.providers > 0 ? totalHours / dep.providers : 0;
  const domainsNeeded = Math.max(0, 3 - activeDomains);
  const deepenScale = dep.utilizationRate > 0 ? (Math.min(75, dep.utilizationRate + 15) / dep.utilizationRate) - 1 : 0;
  const deepenVal = ((confirmed.low + confirmed.high) / 2) * deepenScale;
  const remainingProviders = Math.max(0, (dep.totalProviders || dep.providers) - dep.providers);
  const careSetting = state.careSetting || 'outpatient';

  return {
    months: String(months),
    providers: String(dep.providers),
    encounters: formatNumber(Math.round(dep.totalEncounters * (dep.utilizationRate / 100))),
    hoursReclaimed: formatNumber(totalHours),
    hoursPerProvider: hoursPerProv.toFixed(1),
    confirmedLow: formatCurrency(confirmed.low),
    confirmedHigh: formatCurrency(confirmed.high),
    perProvider: formatCurrency(dep.providers > 0 ? (confirmed.low + confirmed.high) / 2 / dep.providers : 0),
    typicalScenario: formatCurrency(typical.annualValue),
    gap: formatCurrency(gapValue),
    currentAdoption: String(dep.utilizationRate),
    targetAdoption: String(typical.inputs.adoptionRate),
    activeDomains: String(activeDomains),
    settingsLabel: careSetting.charAt(0).toUpperCase() + careSetting.slice(1),
    maturityLabel: context.maturityLabel,
    nextMaturityLabel: context.maturityNext,
    phaseLabel: context.phaseLabel,
    strongestDomain: strongest.charAt(0).toUpperCase() + strongest.slice(1),
    strongestMetric: getStrongestMetric(state, strongest),
    preSignalNote: getPreSignalNote(domainStatus, context),
    revenueSignalNote: getRevenueSignalNote(state, domainStatus),
    strongestDomainSentence: getStrongestDomainSentence(state, strongest),
    topGapAction: gapActions[0] || '',
    secondGapAction: gapActions[1] || '',
    expansionNote: remainingProviders > 0 ? `There are ${remainingProviders} additional providers who could join the program.` : '',
    expandNote: remainingProviders > 0 ? `${remainingProviders} additional providers are expansion-ready.` : '',
    strategicNote: activeDomains >= 3 ? 'Board-level reporting data is ready.' : '',
    domainsNeeded: String(Math.max(domainsNeeded, 1)),
    deepenValue: formatCurrency(deepenVal),
    topNextAction: gapActions[0] || 'increasing adoption depth',
    qualityMetric: getStrongestMetric(state, 'quality'),
    timeSavingsWarning: getTimeSavingsWarning(state),
    singleDomainNote: getSingleDomainNote(domainStatus, months),
    revenueNote: getRevenueSignalNote(state, domainStatus),
    expansionAddendum: remainingProviders > 0 ? `And there are ${remainingProviders} providers not yet on Abridge \u2014 that's expansion on top of depth.` : '',
  };
}

function selectConfirmedTemplate(phase: Phase, maturity: MaturityStage): NarrativeTemplate {
  const phaseTemplates = CONFIRMED_TEMPLATES[phase];
  if (phaseTemplates) {
    const exact = phaseTemplates[maturity];
    if (exact) return exact;
    const fallbackOrder: MaturityStage[] = ['signaling', 'validated', 'strategic', 'unmeasured'];
    for (const fb of fallbackOrder) {
      if (phaseTemplates[fb]) return phaseTemplates[fb]!;
    }
  }
  return CONFIRMED_TEMPLATES[1].signaling!;
}

function isDataSufficient(state: MeasureState): boolean {
  const dep = state.deployment;
  if (dep.providers <= 0) return false;
  const months = getMonthsFromGoLive(state.goLiveDate, dep.monthsOnAbridge);
  if (months <= 0) return false;
  const te = state.timeEfficiency;
  const dq = state.documentationQuality;
  const hasAnyDelta =
    (te.timeInNotesWithout - te.timeInNotesWith) !== 0 ||
    (dq.wrvuWith - dq.wrvuWithout) !== 0 ||
    (dq.emLevelWith - dq.emLevelWithout) !== 0 ||
    (te.workOutsideWithout - te.workOutsideWith) !== 0 ||
    (te.sameDayClosureWith - te.sameDayClosureWithout) !== 0 ||
    dep.totalEncounters > 0;
  return hasAnyDelta;
}

export function generateNarrative(
  screen: MeasureScreen,
  state: MeasureState,
): NarrativeOutput | null {
  if (!isDataSufficient(state)) return null;

  const context = deriveEngagementContext(state);
  const confirmed = calculateConfirmedValue(state);
  if (confirmed.low === 0 && confirmed.high === 0) return null;

  const defaults = getDefaultScenarios(state);
  const typicalInputs = state.scenarioOverrides?.typical ?? defaults.typical;
  const isCustomized = state.scenarioOverrides?.typicalCustom ?? false;
  const typical = calculateScenario(state, typicalInputs, 'typical', isCustomized);
  const vars = buildVars(state, context, confirmed, typical);
  const months = context.monthsOnAbridge;

  if (months < 2 && screen === 'confirmed') {
    return {
      headline: substituteVars("You're {{months}} months in \u2014 this is the baseline phase.", vars),
      body: substituteVars("The most valuable thing happening right now is that providers are building the habit and the note quality is establishing itself. The financial story comes next. What we're watching: {{qualityMetric}}", vars),
      handoff: "Now let's look at what the math shows in dollar terms.",
    };
  }

  let template: NarrativeTemplate;

  switch (screen) {
    case 'confirmed': {
      template = selectConfirmedTemplate(context.phase, context.maturityStage);
      break;
    }
    case 'scenarios': {
      const gapValue = Math.max(0, typical.annualValue - (confirmed.low + confirmed.high) / 2);
      if (gapValue < 200_000) template = SCENARIO_TEMPLATES.smallGap;
      else if (gapValue < 1_000_000) template = SCENARIO_TEMPLATES.mediumGap;
      else template = SCENARIO_TEMPLATES.largeGap;
      break;
    }
    case 'value': {
      template = selectConfirmedTemplate(context.phase, context.maturityStage);
      template = {
        headline: template.headline,
        body: template.body,
        handoff: "Here's the value breakdown by domain.",
      };
      break;
    }
    case 'opportunity': {
      template = OPPORTUNITY_TEMPLATES[context.maturityStage] || OPPORTUNITY_TEMPLATES.signaling!;
      break;
    }
    case 'summary': {
      template = {
        headline: "{{months}} months. {{providers}} providers. {{confirmedLow}}\u2013{{confirmedHigh}} per year confirmed.",
        body: "Your {{maturityLabel}} stage deployment spans {{settingsLabel}} and has confirmed value across {{activeDomains}} of 4 domains. The path to {{nextMaturityLabel}} runs through {{topNextAction}}.",
        handoff: '',
      };
      break;
    }
    default:
      return null;
  }

  return {
    headline: substituteVars(template.headline, vars),
    body: substituteVars(template.body, vars),
    handoff: substituteVars(template.handoff, vars),
  };
}
