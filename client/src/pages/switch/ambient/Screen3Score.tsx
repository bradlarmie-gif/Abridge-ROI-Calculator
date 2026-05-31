import { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import {
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS, LEVEL_NAMES,
  scoreToActivationLevel,
  CAPACITY_TIME_USAGE_LABELS,
  QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, REVENUE_SIGNALS,
  type Domain, type ActivationLevel,
} from "./domainCalculations";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
  onNavigateToDomain?: (domain: Domain) => void;
}

type DomainKey = Domain;

function parseDomainInputs(json: unknown): Record<string, number | string> {
  try { return JSON.parse(json as string); } catch { return {}; }
}

function csvCount(csv: unknown): number {
  if (!csv) return 0;
  return String(csv).split(',').filter(Boolean).length;
}

function joinArr(arr: string[]): string {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

const SCORE_BANDS = [
  { label: 'Unmeasured', max: 16 },
  { label: 'Emerging', max: 48 },
  { label: 'Demonstrated', max: 76 },
  { label: 'Strategic Impact', max: 100 },
] as const;

const BAND_DESCRIPTIONS: Record<string, string> = {
  'Unmeasured': "No domain has a confirmed figure yet. Value is almost certainly there — the measurement infrastructure to capture it is the work ahead.",
  'Emerging': "Observable signals across multiple domains. The formal attribution work is at different stages — directional data exists, defensible numbers don't yet.",
  'Demonstrated': "At least one domain has moved from signal to proof — a calculable, attributable figure that can stand up to scrutiny.",
  'Strategic Impact': "Demonstrated value across most or all domains. Documentation intelligence has become a strategic asset — informing what this organization can compete for, serve, and sustain.",
};

function getScoreBandLabel(score: number): string {
  for (const band of SCORE_BANDS) {
    if (score <= band.max) return band.label;
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1].label;
}

const TIEBREAKER_ORDER: DomainKey[] = ['capacity', 'revenue', 'workforce', 'risk'];

const FIRST_MOVES: Record<Domain, Record<number, string>> = {
  capacity: {
    1: "The question organizations at this stage typically haven't answered internally yet: where did the recovered time go? Not tracked formally — just answered. The answer almost always exists in scheduling data.",
    2: "Access patterns are forming. The organizations that connect recovered time to a specific access outcome — slots, panel size, same-day availability — are the ones that convert directional signal to demonstrable value.",
    3: "One confirmed pathway exists. The question most organizations at this stage are working through: how far does the full access picture extend across the provider panel?",
    4: "Time recovery is a planning input, not just a metric. The work at this stage is how care model design incorporates what the deployment has already shown.",
  },
  revenue: {
    1: "The documentation-revenue relationship almost always surfaces in a retrospective analysis. Organizations that run the pre/post coding review consistently find it. The question is who owns that analysis.",
    2: "Most organizations at this stage have the underlying data — coding has shifted, collections have moved. The gap between a directional signal and a confirmed figure is almost always organizational rather than analytical. The data is already there.",
    3: "A confirmed revenue figure attributable to documentation changes opens different conversations than a trend observation. That number belongs in different rooms.",
    4: "Documentation quality has become a revenue input. The next layer is how it informs payer strategy and CDI governance — not just reporting.",
  },
  workforce: {
    1: "Provider experience rarely surfaces in formal measurement before someone looks for it. The organizations that have started here almost always found more than they expected — and the baseline data is simpler to establish than most assume.",
    2: "The organizations where behavioral signal converts to a confirmed retention figure have something in common: the conversation between clinical ops and HR has already happened. The data exists in both systems — it just hasn't been placed in the same room yet.",
    3: "A retained provider has a calculable value. The organizations that have made this calculation tend to describe it as the moment ambient stopped being a productivity tool and became a workforce strategy.",
    4: "Provider experience data is a board-level input at this stage. The work is integration — deepening how workforce intelligence informs care model decisions.",
  },
  risk: {
    1: "Documentation specificity improvements flow downstream to every system that depends on documentation — coding, CDI, quality programs, compliance. When organizations start the attribution, CDI is almost always where the first signal surfaces.",
    2: "Documentation quality changes propagate through every downstream system — CDI, coding, denials, quality programs. At this stage the signal is in multiple places. The question is which program gets the first formal attribution.",
    3: "A confirmed downstream value from documentation changes belongs in the quality strategy — not just the ambient reporting. That's the conversation this level makes possible.",
    4: "Documentation is organizational infrastructure at this stage. The layer ahead is how it positions the organization for value-based contracts and clinical AI readiness.",
  },
};


function AnimatedCounter({ target, duration = 800, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const startValue = Math.max(target - 8, 0);
  const [current, setCurrent] = useState(startValue);
  const [started, setStarted] = useState(false);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(startValue + Math.round(eased * (target - startValue)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, started, startValue]);

  return <>{current}</>;
}


const MATURITY_BANDS = [
  { label: 'Unmeasured', short: 'Unmeasured', min: 0, max: 16 },
  { label: 'Emerging', short: 'Emerging', min: 17, max: 48 },
  { label: 'Demonstrated', short: 'Demonstrated', min: 49, max: 76 },
  { label: 'Strategic Impact', short: 'Strategic', min: 77, max: 100 },
];

function scoreToVisualPct(s: number): number {
  const n = MATURITY_BANDS.length;
  const bandWidth = 100 / n;
  for (let i = 0; i < n; i++) {
    const band = MATURITY_BANDS[i];
    if (s <= band.max) {
      const posInBand = (s - band.min) / (band.max - band.min);
      return i * bandWidth + posInBand * bandWidth;
    }
  }
  return 100;
}

function MaturityArc({ score }: { score: number }) {
  const [markerReady, setMarkerReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMarkerReady(true), 700);
    return () => clearTimeout(t);
  }, []);

  const activeBandIdx = MATURITY_BANDS.findIndex(b => score <= b.max);
  const safeBandIdx = activeBandIdx < 0 ? MATURITY_BANDS.length - 1 : activeBandIdx;
  const markerPct = markerReady ? scoreToVisualPct(score) : 0;

  return (
    <div className="mb-6">
      <div className="relative mb-1.5" style={{ height: '6px' }}>
        <div className="flex gap-[2px] h-full">
          {MATURITY_BANDS.map((band, i) => {
            const isActive = i === safeBandIdx;
            const isPast = i < safeBandIdx;
            return (
              <div
                key={band.label}
                style={{
                  flex: '1 0 0',
                  height: '100%',
                  borderRadius: '2px',
                  backgroundColor: isActive
                    ? '#EA2C00'
                    : isPast
                      ? 'rgba(234,44,0,0.28)'
                      : 'rgba(255,255,255,0.07)',
                  transition: 'background-color 0.6s ease',
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md"
          style={{
            left: `${markerPct}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'left 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 0 0 3px rgba(234,44,0,0.3)',
          }}
        />
      </div>
      <div className="flex gap-[2px]">
        {MATURITY_BANDS.map((band, i) => {
          const isActive = i === safeBandIdx;
          const isPast = i < safeBandIdx;
          return (
            <div key={band.label} style={{ flex: '1 0 0', overflow: 'hidden' }}>
              <p
                className="text-[9px] uppercase tracking-[0.3px] leading-tight pt-1 truncate"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  color: isActive
                    ? 'rgba(255,255,255,0.80)'
                    : isPast
                      ? 'rgba(255,255,255,0.45)'
                      : 'rgba(255,255,255,0.30)',
                }}
              >
                {band.short}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── PERSONALIZED NARRATIVE FUNCTIONS ──

function generatePersonalizedSub(
  domainLevels: Record<Domain, number>,
  inputs: any,
  providers: number,
  annualEncounters: number,
  utilization: number,
): string {
  const tenure = inputs.deploymentTenure as string | undefined;
  const orgType = inputs.orgType as string | undefined;
  const orgTypeLabels: Record<string, string> = {
    'amc': 'Academic medical center',
    'community': 'Community hospital',
    'idn': 'Integrated delivery network',
    'physician_group': 'Physician group',
  };
  const orgTypeLabel = orgType ? orgTypeLabels[orgType] : null;
  const tenureLabels: Record<string, string> = {
    '0-6': 'Less than six months in',
    '6-12': 'Less than a year in',
    '12-24': 'One to two years in',
    '24+': 'Two-plus years in',
  };

  const confirmed = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3);
  const signal = DOMAIN_ORDER.filter(d => domainLevels[d] === 2);

  const parts: string[] = [];

  const tenureLabel = tenure ? tenureLabels[tenure] : null;
  const docEnc = annualEncounters > 0 && utilization > 0
    ? Math.round(annualEncounters * (utilization / 100))
    : 0;
  if (tenureLabel && providers > 0 && docEnc > 0) {
    const orgCtx = orgTypeLabel ? `${orgTypeLabel} — ` : '';
    parts.push(`${tenureLabel}. ${orgCtx}${providers.toLocaleString()} provider${providers !== 1 ? 's' : ''} at ${utilization}% utilization — roughly ${docEnc.toLocaleString()} documented encounters per year.`);
  } else if (tenureLabel) {
    parts.push(`${tenureLabel}.`);
  }

  const join = (arr: Domain[]) => {
    const names = arr.map(d => DOMAIN_LABELS[d]);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  };

  if (confirmed.length === 4) {
    parts.push('All four domains confirmed.');
  } else if (confirmed.length >= 2) {
    const unconfirmed = DOMAIN_ORDER.filter(d => domainLevels[d] < 3);
    parts.push(`${join(confirmed)} ${confirmed.length === 2 ? 'are' : 'are'} confirmed. ${join(unconfirmed)} ${unconfirmed.length === 1 ? "hasn't" : "haven't"} been formally examined.`);
  } else if (confirmed.length === 1) {
    parts.push(`${DOMAIN_LABELS[confirmed[0]]} is confirmed. The other three haven't been formally attributed yet.`);
  } else if (signal.length >= 2) {
    parts.push(`${join(signal)} are generating signal — nothing formally attributed yet.`);
  } else if (signal.length === 1) {
    parts.push(`${DOMAIN_LABELS[signal[0]]} is generating signal — nothing formally attributed yet.`);
  } else {
    parts.push('Four streams running — none of it formally attributed yet.');
  }

  if (confirmed.includes('revenue')) {
    const revInp = parseDomainInputs(inputs.revenueDomainInputs);
    const metricType = revInp.revenueMetricType as string | undefined;
    const metricLabels: Record<string, string> = {
      wrvu: 'wRVU lift', collections: 'Collections per encounter',
      denial_rate: 'Denial rate reduction', hcc_capture: 'HCC capture rate',
    };
    if (metricType && metricLabels[metricType]) {
      parts.push(`${metricLabels[metricType]} is the confirmed metric.`);
    }
  } else if (confirmed.includes('risk')) {
    const riskInp = parseDomainInputs(inputs.riskDomainInputs);
    const owner = riskInp.executiveOwner as string | undefined;
    const board = riskInp.executiveBoardPresented as string | undefined;
    if (owner === 'yes' && board === 'yes') {
      parts.push('Documentation quality has been to the board.');
    }
  } else if (signal.includes('workforce') || confirmed.includes('workforce')) {
    const wfInp = parseDomainInputs(inputs.workforceDomainInputs);
    const voice = wfInp.providerVoice as string | undefined;
    if (voice === 'frequently') {
      parts.push('Providers are frequently reporting impact.');
    }
  }

  return parts.join(' ');
}


function generateDomainNarrative(
  domain: Domain,
  level: number,
  inp: Record<string, number | string>,
): string {
  const n = (v: unknown) => csvCount(v);
  const str = (v: unknown) => (v as string | undefined) ?? '';
  const num = (v: unknown) => (v as number | undefined) ?? 0;
  const plural = (count: number, word: string) => `${count} ${word}${count !== 1 ? 's' : ''}`;

  switch (domain) {
    case 'capacity': {
      const signsCount = n(inp.capacityTimeSavingsSigns ?? inp.capacityTimeSigns);
      const usageCount = n(inp.capacityTimeUsage);
      const decision = str(inp.capacityTimeDecision);
      const providerBucket = str(inp.capacityProviderBucket);
      const additionalPatients = num(inp.additionalPatientsPerMonth);
      const embed = str(inp.capacityLeadershipEmbeddedness);
      const finInt = str(inp.capacityFinancialIntegration);

      if (level >= 4) {
        const embedLine = embed === 'full'
          ? 'Named executive owner — capacity data has been at the board.'
          : embed === 'owner_only'
            ? 'Named executive owner — not yet at board level.'
            : embed === 'operational'
              ? 'Tracked operationally — no named strategic owner yet.'
              : '';
        const finLine = finInt === 'yes' ? ' Embedded in the operating budget.'
          : finInt === 'in_progress' ? ' Planned for the next budget cycle.' : '';
        return (embedLine + finLine) || 'Access impact fully integrated into organizational planning.';
      }

      if (level >= 3) {
        const bucketLabels: Record<string, string> = {
          handful: 'A handful of providers',
          quarter: 'About a quarter of providers',
          half: 'About half of providers',
          most: 'More than three-quarters of providers',
          nearly_all: 'All or nearly all providers',
        };
        const bucketLabel = bucketLabels[providerBucket] ?? 'Providers';
        if (additionalPatients > 0) {
          return `${bucketLabel} — ${additionalPatients} additional patient${additionalPatients !== 1 ? 's' : ''} per provider per month.`;
        }
        return `${bucketLabel} confirmed additional patient volume.`;
      }

      if (level >= 2) {
        const decisionLines: Record<string, string> = {
          directed: 'leadership has directed where it goes.',
          discussed: 'where it goes is being discussed.',
          organic: 'providers deciding individually.',
        };
        const base = usageCount > 0
          ? `Recovered time across ${plural(usageCount, 'use')}`
          : 'Recovered time visible';
        const tail = decisionLines[decision] ? ` — ${decisionLines[decision]}` : '.';
        return base + tail;
      }

      return signsCount > 0
        ? `Documentation time savings visible — the access connection hasn't been examined yet.`
        : "Documentation time savings visible — downstream access story is ahead.";
    }

    case 'revenue': {
      const metricType = str(inp.revenueMetricType);
      const engagement = str(inp.revenueCycleEngaged);
      const alignment = str(inp.revenueLeadershipAlignment);
      const recognizedRevenue = num(inp.recognizedRevenue);
      const movementCount = n(inp.observedMovement ?? inp.downstreamObservations);
      const integrationsCount = n(inp.revenueIntegrations);
      const signalsCount = n(inp.revenueSignalsL1);

      const metricLabels: Record<string, string> = {
        wrvu: 'wRVU lift',
        collections: 'Collections per encounter',
        denial_rate: 'Denial rate reduction',
        hcc_capture: 'HCC capture rate',
      };
      const metricLabel = metricLabels[metricType] ?? '';

      const alignLines: Record<string, string> = {
        aligned: 'Revenue cycle formally aligned.',
        partial: 'Partially aligned.',
        siloed: 'Still operating separately.',
      };
      const alignLine = alignLines[alignment] ?? '';

      if (level >= 4) {
        const base = metricLabel ? `${metricLabel} confirmed and integrated.` : 'Revenue impact confirmed and integrated.';
        const intLine = integrationsCount > 0
          ? ` ${plural(integrationsCount, 'revenue strategy area')} informed by documentation quality.`
          : '';
        return base + intLine;
      }

      if (level >= 3) {
        if (metricLabel && recognizedRevenue > 0) {
          return `${metricLabel} measured — ${formatDollar(recognizedRevenue)}/yr formally attributed. ${alignLine}`.trim();
        }
        return `${metricLabel || 'Revenue impact'} measured — no confirmed annual figure yet. ${alignLine}`.trim();
      }

      if (level >= 2) {
        const engageLines: Record<string, string> = {
          yes: 'Revenue cycle formally engaged.',
          informal: 'Revenue cycle informally aware.',
        };
        const engageLine = engageLines[engagement] ?? '';
        if (metricLabel) {
          return `${metricLabel} — movement observed, not yet formally measured. ${engageLine}`.trim();
        }
        return `Movement visible in coding and collections — not yet formally attributed. ${engageLine}`.trim();
      }

      return 'Documentation-to-revenue connection not yet formally examined.';
    }

    case 'workforce': {
      const providerVoice = str(inp.providerVoice);
      const afterHoursReduction = num(inp.afterHoursReduction);
      const behaviorCount = n(inp.observedBehaviors);
      const retentionSignalCount = n(inp.retentionSignals);
      const formalReview = str(inp.retentionFormalReview);
      const beforeTurnover = num(inp.beforeTurnoverRate);
      const afterTurnover = num(inp.afterTurnoverRate);
      const leadershipLevel = str(inp.workforceLeadershipLevel);
      const strategyCount = n(inp.workforceStrategies);

      const voiceLines: Record<string, string> = {
        frequently: 'Providers frequently reporting impact.',
        occasionally: 'Providers occasionally reporting impact.',
        not_really: 'No consistent provider voice yet.',
      };
      const voiceLine = voiceLines[providerVoice] ?? '';

      if (level >= 4) {
        const lvlLines: Record<string, string> = {
          board_level: 'Provider experience data is part of board reporting.',
          executive_only: 'Executive ownership in place — not yet at board level.',
          operational: 'Tracked operationally — not elevated to executive strategy.',
        };
        const base = lvlLines[leadershipLevel] ?? 'Provider experience integrated into organizational strategy.';
        const stratLine = strategyCount > 0
          ? ` Informing ${plural(strategyCount, 'workforce strategy area')}.`
          : '';
        return base + stratLine;
      }

      if (level >= 3) {
        const reviewLines: Record<string, string> = {
          yes: `Retention data formally reviewed. ${plural(retentionSignalCount, 'signal')} connected to deployment.`,
          informal: 'Retention connection informal — not yet formally reviewed.',
          no: 'Retention signals visible — formal review hasn\'t happened yet.',
        };
        const base = reviewLines[formalReview] ?? 'Retention signals visible.';
        const turnoverLine = beforeTurnover > 0 && afterTurnover > 0
          ? ` Turnover ${beforeTurnover}% → ${afterTurnover}%.`
          : '';
        return base + turnoverLine;
      }

      if (level >= 2) {
        const base = voiceLine ? voiceLine : '';
        const behaviorLine = behaviorCount > 0
          ? ' Behavioral changes documented.'
          : '';
        const hoursLine = afterHoursReduction > 0
          ? ` ${afterHoursReduction}h/week per provider recovered after-hours.`
          : '';
        return (base + behaviorLine + hoursLine) || 'Behavioral changes documented — formal retention data ahead.';
      }

      return voiceLine || 'Early signals of provider experience improvement.';
    }

    case 'risk': {
      const monitoringApproach = str(inp.monitoringApproach);
      const qualityAttrCount = n(inp.qualityAttributes);
      const downstreamSignalCount = n(inp.downstreamSignals);
      const connectedWorkflowCount = n(inp.connectedWorkflows);
      const formalAttribution = str(inp.downstreamFormalAttribution);
      const measurementDepth = str(inp.qualityMeasurementDepth);
      const executiveOwner = str(inp.executiveOwner);
      const boardPresented = str(inp.executiveBoardPresented);
      const strategicIntegCount = n(inp.strategicIntegrations);
      const vbcContractUse = str(inp.vbcContractUse);
      const qualityImproveCount = n(inp.qualityImprovements);

      const monitoringLabels: Record<string, string> = {
        realtime: 'real-time dashboard',
        systematic: 'structured audits',
        spot_checks: 'informal spot checks',
      };

      if (level >= 4) {
        const govLine = executiveOwner === 'yes' && boardPresented === 'yes'
          ? 'Named executive owner. Documentation quality presented to board.'
          : executiveOwner === 'yes'
            ? 'Named executive owner — not yet at board level.'
            : '';
        const vbcLine = vbcContractUse === 'yes' ? ' In use for value-based contract strategy.' : '';
        const integLine = strategicIntegCount > 0
          ? ` Integrated into ${plural(strategicIntegCount, 'organizational strategy area')}.`
          : '';
        return (govLine + vbcLine + integLine) || 'Documentation quality an organizational strategic asset.';
      }

      if (level >= 3) {
        const attrLines: Record<string, string> = {
          yes: `Downstream value formally attributed. ${plural(connectedWorkflowCount, 'workflow')} connected.`,
          informal: 'Connection to downstream informally understood — not formally quantified.',
          no: 'Downstream connection not yet formally reviewed.',
        };
        const base = attrLines[formalAttribution] ?? 'Downstream connection in place.';
        const depthLine = measurementDepth === 'measured' ? ' Impact measurable.'
          : measurementDepth === 'partial' ? ' Some areas measured, others anecdotal.' : '';
        return base + depthLine;
      }

      if (level >= 2) {
        const monLabel = monitoringLabels[monitoringApproach];
        const base = monLabel
          ? `${qualityAttrCount > 0 ? `${qualityAttrCount} of 5 quality dimensions` : 'Quality dimensions'} tracked via ${monLabel}.`
          : 'Quality dimensions being monitored.';
        const signalLine = downstreamSignalCount > 0
          ? ` ${plural(downstreamSignalCount, 'downstream signal')} visible.`
          : '';
        return base + signalLine;
      }

      return qualityImproveCount > 0
        ? `${plural(qualityImproveCount, 'quality dimension')} visibly improving — downstream teams not yet connected.`
        : 'Documentation quality improving — CDI and downstream not yet connected.';
    }
  }
}


function generatePatientExperienceSub(signals: string[], status: 'strong' | 'signal' | 'gap'): string {
  if (signals.length === 0) return '';

  const signalLabels: Record<string, string> = {
    provider_present: 'providers more present in the room',
    feel_heard: 'patients saying they feel more heard',
    fewer_interruptions: 'fewer mid-exam interruptions',
    better_summaries: 'better after-visit summaries',
    satisfaction_scores: 'CAHPS or Press Ganey scores moving',
    love_story: 'a provider story from the room',
  };

  const labels = signals.map(s => signalLabels[s]).filter(Boolean);
  if (labels.length === 0) return '';

  let base = '';
  if (labels.length === 1) {
    base = `${labels[0].charAt(0).toUpperCase() + labels[0].slice(1)} — the patient dimension is present but not yet formally connected to the value story.`;
  } else if (labels.length === 2) {
    base = `${labels[0].charAt(0).toUpperCase() + labels[0].slice(1)} and ${labels[1]}. Those two together suggest the in-room experience has genuinely shifted.`;
  } else {
    base = `${labels[0].charAt(0).toUpperCase() + labels[0].slice(1)}, ${labels[1]}, and ${labels.length - 2} more — a consistent pattern across ${labels.length} signals.`;
  }

  if (signals.includes('love_story')) {
    base = base.replace(/\.$/, '') + ' A provider story from the room is the signal that\'s hardest to manufacture.';
  } else if (signals.includes('satisfaction_scores')) {
    base = base.replace(/\.$/, '') + ' CAHPS or Press Ganey movement is the strongest formal signal in this tier.';
  } else if (status === 'strong' && signals.length >= 2) {
    base = base.replace(/\.$/, '') + ' Connected to the formal value story.';
  }

  return base;
}


// Short chip labels for items selected in domain inputs
const CAPACITY_TIME_SIGNS_SHORT = [
  'Docs done before leaving',
  'After-hours time reduced',
  'More time between patients',
  'More appointment slots',
];
const BEHAVIORAL_CHANGES_SHORT = [
  'After-hours docs reduced',
  'Leaving clinic on time',
  'Lunch breaks resumed',
  'Less work-outside-work',
  'Weekend catch-up reduced',
  'Notes done before leaving',
  'Personal time reclaimed',
];
const RETENTION_SIGNALS_SHORT = [
  'Turnover rate improved',
  'Agency/locum spend down',
  'Time-to-fill improved',
  'Exit interviews shifted',
  'Recruitment acceptance up',
];

function getDomainSelectedChips(domain: Domain, level: number, inp: Record<string, number | string>): string[] {
  const csvToIndices = (csv: unknown) =>
    (csv as string || '').split(',').filter(Boolean).map(Number);
  const shortLabel = (s: string) => { const p = s.indexOf('('); return p > 0 ? s.substring(0, p).trim() : s; };

  const chips: string[] = [];

  if (domain === 'capacity') {
    if (level === 1) {
      csvToIndices(inp.capacityTimeSigns).forEach(i => {
        if (CAPACITY_TIME_SIGNS_SHORT[i]) chips.push(CAPACITY_TIME_SIGNS_SHORT[i]);
      });
    }
    if (level >= 2) {
      csvToIndices(inp.capacityTimeUsage).forEach(i => {
        if (CAPACITY_TIME_USAGE_LABELS[i]) chips.push(shortLabel(CAPACITY_TIME_USAGE_LABELS[i]));
      });
    }
  }

  if (domain === 'revenue') {
    const metricMap: Record<string, string> = { wrvu: 'wRVU lift', collections: 'Collections/encounter', denial_rate: 'Denial rate', hcc_capture: 'HCC capture' };
    const metric = inp.revenueMetricType as string;
    if (metricMap[metric]) chips.push(metricMap[metric]);
    if (level === 1 || level === 2) {
      csvToIndices(inp.revenueSignalsL1).forEach(i => {
        if (REVENUE_SIGNALS[i]) chips.push(shortLabel(REVENUE_SIGNALS[i]));
      });
    }
    const engageMap: Record<string, string> = { yes: 'Revenue cycle engaged', informal: 'Revenue cycle aware' };
    if (engageMap[inp.revenueCycleEngaged as string]) chips.push(engageMap[inp.revenueCycleEngaged as string]);
  }

  if (domain === 'workforce') {
    if (level === 1) {
      const voiceMap: Record<string, string> = { yes: 'Providers speaking up', some: 'Some provider feedback', surveys: 'Captured in surveys', not_yet: 'Not yet surfaced' };
      if (voiceMap[inp.providerVoice as string]) chips.push(voiceMap[inp.providerVoice as string]);
    }
    if (level >= 2) {
      csvToIndices(inp.observedBehaviors).forEach(i => {
        if (BEHAVIORAL_CHANGES_SHORT[i]) chips.push(BEHAVIORAL_CHANGES_SHORT[i]);
      });
    }
    if (level >= 3) {
      csvToIndices(inp.retentionSignals).forEach(i => {
        if (RETENTION_SIGNALS_SHORT[i]) chips.push(RETENTION_SIGNALS_SHORT[i]);
      });
    }
  }

  if (domain === 'risk') {
    if (level === 1) {
      csvToIndices(inp.qualityAttributes).forEach(i => {
        if (QUALITY_ATTRIBUTES[i]) chips.push(shortLabel(QUALITY_ATTRIBUTES[i]));
      });
    }
    if (level >= 2) {
      csvToIndices(inp.connectedWorkflows).forEach(i => {
        if (DOWNSTREAM_WORKFLOWS[i]) chips.push(shortLabel(DOWNSTREAM_WORKFLOWS[i]));
      });
    }
  }

  return chips;
}


// ── THE PATTERN — educational mirror ──
function generateScorePattern(
  domainLevels: Record<Domain, number>,
  tenure: string,
): string {
  const confirmed = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3);
  const signal = DOMAIN_ORDER.filter(d => domainLevels[d] === 2);
  const unchecked = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);

  const confNames = confirmed.map(d => DOMAIN_LABELS[d]);
  const sigNames = signal.map(d => DOMAIN_LABELS[d]);
  const uncheckedNames = unchecked.map(d => DOMAIN_LABELS[d]);

  const orgHome: Partial<Record<Domain, string>> = {
    capacity: 'scheduling and access management',
    revenue: 'revenue cycle',
    workforce: 'HR and operations',
    risk: 'CDI and downstream quality programs',
  };

  // All four confirmed
  if (confirmed.length === 4) {
    return "Four confirmed domains means measurement infrastructure spans clinical, financial, workforce, and quality systems simultaneously — that requires deliberate organizational investment in the measurement work itself, separate from the deployment. The question shifts: from how much value is generating to how documentation intelligence informs what the organization decides next.";
  }

  // Three confirmed
  if (confirmed.length === 3) {
    const remaining = unchecked[0] ?? signal[0];
    const remainingLabel = remaining ? DOMAIN_LABELS[remaining] : 'the remaining domain';
    return `Three confirmed domains reflects measurement maturity that requires sustained, cross-functional executive attention over time — that's not common. ${remainingLabel} is generating value; that domain's sponsor conversation is still forming.`;
  }

  // Two confirmed — specific pairs
  if (confirmed.length === 2) {
    const remaining = [...unchecked, ...signal];
    const remJoined = joinArr(remaining.map(d => DOMAIN_LABELS[d]));
    const remIs = remaining.length === 1 ? 'is' : 'are';

    if (confirmed.includes('revenue') && confirmed.includes('workforce')) {
      return `Revenue and Workforce tend to reach formal attribution together in organizations where both the CFO and CMO are active sponsors — one measuring through billing data, one through retention economics. ${remJoined} ${remIs} generating value in systems that often don't have the same named executive lens, which is why they tend to follow.`;
    }
    if (confirmed.includes('revenue') && confirmed.includes('capacity')) {
      return `Revenue and Capacity tend to confirm together in organizations where the deployment was positioned as both a financial and access solution from the start — finance had visibility into both. ${remJoined} ${remIs} generating value in different organizational systems; that analytical lens hasn't been applied there yet.`;
    }
    if (confirmed.includes('revenue') && confirmed.includes('risk')) {
      return `Revenue and Quality tend to confirm together in organizations where revenue cycle and CDI are closely aligned — both systems were already watching documentation closely. ${remJoined} ${remIs} generating value in parallel; those organizational homes haven't had the same institutional attention yet.`;
    }
    // General two-confirmed
    const confJoined = joinArr(confNames);
    return `${confJoined} are confirmed. The value across all four domains is structural and parallel — the measurement tends to be sequential because each domain has its own organizational home and its own moment when institutional attention intersects with the data. ${remJoined} ${remIs} generating value; that analytical moment is still forming.`;
  }

  // One confirmed
  if (confirmed.length === 1) {
    const conf = confirmed[0];
    const remaining = [...unchecked, ...signal];
    const remJoined = joinArr(remaining.map(d => DOMAIN_LABELS[d]));
    const remIs = remaining.length === 1 ? 'is' : 'are';

    switch (conf) {
      case 'revenue':
        return `Revenue tends to be the first domain to reach formal attribution because revenue cycle already had visibility into the underlying data before ambient — wRVU, collections, coding distribution were being tracked. ${remJoined} ${remIs} generating value in systems that don't always have the same pre-existing measurement infrastructure: scheduling for Capacity, HR for Workforce, CDI and downstream programs for Quality. Each one has its own organizational home.`;
      case 'workforce':
        return `Workforce tends to reach formal attribution when provider retention becomes a visible organizational concern — when the cost of turnover becomes concrete enough that someone runs the numbers. Revenue, Capacity, and Quality are generating value in their own organizational systems; they haven't had the same moment of urgency yet.`;
      case 'capacity':
        return `Capacity tends to reach formal attribution in organizations where access pressure was the primary presenting problem before deployment — wait times, panel constraints, same-day availability. The documentation-time connection was the most legible because there was already a language for it. The other domains are generating value in different organizational homes; they haven't had the same pre-existing vocabulary applied yet.`;
      case 'risk':
        return `Quality tends to reach formal attribution first in organizations where CDI or coding programs already had measurement infrastructure — the downstream systems were watching. Revenue, Capacity, and Workforce have been generating value in parallel; they just haven't had the same institutional lens applied yet.`;
    }
  }

  // All L2 — signal everywhere
  if (confirmed.length === 0 && signal.length === 4) {
    return "Signal across all four domains is a sign of healthy deployment adoption — the clinical patterns are real and visible. The move from signal to formal attribution is a different organizational act: it requires the measurement conversation to happen between clinical and finance, which tends to follow adoption on its own timeline.";
  }

  // Mixed L1/L2 — some signal, some not examined
  if (confirmed.length === 0 && signal.length > 0) {
    const sigJoined = joinArr(sigNames);
    const sigHas = signal.length === 1 ? 'has' : 'have';
    if (unchecked.length > 0) {
      const uncheckedHomes = unchecked.map(d => orgHome[d]).filter(Boolean).join(' and ');
      return `${sigJoined} ${sigHas} directional signal — the patterns are real and the direction is clear. ${joinArr(uncheckedNames)} ${unchecked.length === 1 ? 'is' : 'are'} generating value in ${uncheckedHomes || 'different organizational systems'} — those systems tend to surface when the relevant organizational function starts looking. Each domain has its own home and its own moment.`;
    }
    return `${sigJoined} ${sigHas} directional signal across the deployment. The patterns are real; the formal attribution step is the next organizational act — the one that converts visible movement into a number that belongs in a different set of conversations.`;
  }

  // All L1 — tenure based
  const tenureVariants: Record<string, string> = {
    '0-6': "The first six months of a deployment are predominantly about clinical adoption — getting providers comfortable, building documentation consistency, establishing workflow. The value measurement story builds on top of that foundation, which is why it follows rather than runs in parallel. The patterns are forming; the data history is getting long enough to be meaningful.",
    '6-12': "In the six-to-twelve-month window, documentation patterns are stabilizing and the longitudinal data is getting long enough for the measurement to hold up. Adoption is settling, the baseline exists, and the numbers that emerge at this stage are defensible. This is when the four value streams become readable for the first time.",
    '12-24': "Between one and two years in, documentation quality has compounded, adoption is deep, and the data history across all four domains is long enough to produce figures that hold up to scrutiny. This is typically when organizations get the most complete picture of what the deployment has actually done.",
    '24+': "Two or more years of a live deployment means the value accumulation is longitudinal — compounded changes in coding specificity, provider experience, and downstream quality over an extended period. When organizations at this tenure run the formal analysis, they're capturing something a shorter deployment can't produce.",
  };

  return tenureVariants[tenure] ?? "Four value streams running simultaneously — documentation quality improving, provider experience shifting, coding getting more specific, downstream quality changing. Each one generates differently and surfaces in different organizational systems.";
}


export default function Screen3Score({ onNext, onBack, onNavigateToDomain }: Screen3Props) {
  const { state } = useAssessment();
  const { inputs } = state;
  const [copied, setCopied] = useState(false);

  const domainScores: Record<DomainKey, number> = useMemo(() => ({
    capacity: inputs.capacityScore || 0,
    revenue: inputs.revenueScore || 0,
    workforce: inputs.workforceScore || 0,
    risk: inputs.riskScore || 0,
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const parsedDomainInputs: Record<DomainKey, Record<string, number | string>> = useMemo(() => ({
    capacity: parseDomainInputs(inputs.capacityDomainInputs),
    revenue: parseDomainInputs(inputs.revenueDomainInputs),
    workforce: parseDomainInputs(inputs.workforceDomainInputs),
    risk: parseDomainInputs(inputs.riskDomainInputs),
  }), [inputs.capacityDomainInputs, inputs.revenueDomainInputs, inputs.workforceDomainInputs, inputs.riskDomainInputs]);

  const totalScore = useMemo(() =>
    domainScores.capacity + domainScores.revenue + domainScores.workforce + domainScores.risk,
  [domainScores]);

  const scoreBandLabel = useMemo(() => getScoreBandLabel(totalScore), [totalScore]);

  const domainLevels: Record<DomainKey, number> = useMemo(() => ({
    capacity: scoreToActivationLevel('capacity', domainScores.capacity),
    revenue: scoreToActivationLevel('revenue', domainScores.revenue),
    workforce: scoreToActivationLevel('workforce', domainScores.workforce),
    risk: scoreToActivationLevel('risk', domainScores.risk),
  }), [domainScores]);

  const lowestDomain = useMemo(() => {
    const L2_PRIORITY: DomainKey[] = ['revenue', 'workforce', 'capacity', 'risk'];
    const l2Domains = L2_PRIORITY.filter(d => domainLevels[d] === 2);
    if (l2Domains.length > 0) return l2Domains[0];
    let lowest: DomainKey = TIEBREAKER_ORDER[0];
    let lowestLevel = domainLevels[lowest];
    for (const d of TIEBREAKER_ORDER) {
      if (domainLevels[d] < lowestLevel) { lowest = d; lowestLevel = domainLevels[d]; }
    }
    return lowest;
  }, [domainLevels]);

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 0;
  const tenure = (inputs.deploymentTenure as string) || '';

  const scoreStory = useMemo(() => {
    const confirmed = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3);
    const signal = DOMAIN_ORDER.filter(d => domainLevels[d] === 2);
    const unmeasured = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);

    const join = (arr: string[]) => {
      if (arr.length === 0) return '';
      if (arr.length === 1) return arr[0];
      if (arr.length === 2) return arr.join(' and ');
      return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
    };

    const confNames = confirmed.map(d => DOMAIN_LABELS[d]);
    const sigNames = signal.map(d => DOMAIN_LABELS[d]);
    const unmNames = unmeasured.map(d => DOMAIN_LABELS[d]);

    let headline = '';

    if (confirmed.length === 4) {
      headline = 'All four confirmed.';
    } else if (confirmed.length === 0 && signal.length === 0) {
      if (tenure === '24+') {
        headline = 'Two-plus years live.';
      } else if (tenure === '12-24') {
        headline = 'Deployment mature.';
      } else if (tenure === '6-12') {
        headline = 'Patterns forming.';
      } else if (providers > 0 && annualEncounters > 0 && utilization > 0) {
        const active = Math.round(annualEncounters * utilization / 100);
        headline = active >= 100 ? 'Live. Generating.' : 'Four streams. The work ahead is clear.';
      } else {
        headline = 'Four streams. None counted.';
      }
    } else if (confirmed.length === 0) {
      headline = 'Signal confirmed. The number is ahead.';
    } else if (confirmed.length === 1) {
      headline = `${confNames[0]} confirmed.`;
    } else if (confirmed.length === 2) {
      headline = 'Two of four confirmed.';
    } else if (confirmed.length === 3) {
      headline = 'Three of four confirmed.';
    } else {
      headline = `${confirmed.length} domains confirmed.`;
    }

    return { headline };
  }, [domainLevels, tenure, providers, annualEncounters, utilization]);

  const patientExperienceSignal = useMemo(() => {
    const noticeable = inputs.patientExperienceNoticeable || '';
    const formalized = inputs.patientExperienceFormalized || '';
    const signalsCsv = inputs.patientExperienceSignals || '';
    const formalData = inputs.patientExperienceFormalData || '';
    const signals = signalsCsv.split(',').filter(Boolean);
    const hasSignals = signals.length > 0 && !signals.includes('nothing_yet');

    if (!noticeable) return null;

    const SIGNAL_LABELS: Record<string, string> = {
      provider_present: 'Provider presence',
      feel_heard: 'Patients feel more heard',
      fewer_interruptions: 'Fewer interruptions',
      better_summaries: 'Better after-visit summaries',
      satisfaction_scores: 'CAHPS / Press Ganey movement',
      love_story: 'A story from the room',
    };
    const selectedLabels = signals
      .filter(s => s !== 'nothing_yet' && SIGNAL_LABELS[s])
      .map(s => SIGNAL_LABELS[s]);

    const hasFormalDataMovement = formalData === 'yes_scores' || formalData === 'yes_nps';

    if ((formalized === 'yes' || hasFormalDataMovement) && hasSignals) {
      return { status: 'strong' as const, headline: 'Connected to your value story.', signals: selectedLabels };
    }
    if (noticeable === 'frequently' && hasSignals) {
      return { status: 'signal' as const, headline: 'Patients are noticing.', signals: selectedLabels };
    }
    if (noticeable === 'occasionally' || (hasSignals && noticeable !== 'not_tracked')) {
      return { status: 'signal' as const, headline: 'Signal present, not yet captured.', signals: selectedLabels };
    }
    return { status: 'gap' as const, headline: 'Not yet connected.', signals: [] as string[] };
  }, [inputs.patientExperienceNoticeable, inputs.patientExperienceFormalized, inputs.patientExperienceSignals, inputs.patientExperienceFormalData]);

  const patternText = useMemo(() =>
    generateScorePattern(domainLevels, tenure),
  [domainLevels, tenure]);

  const lowestDomainInsight = FIRST_MOVES[lowestDomain]?.[domainLevels[lowestDomain]]
    ?? 'The domain analysis shows where the most meaningful opportunity sits.';

  const handleShare = async () => {
    const domainLines = DOMAIN_ORDER.map(d =>
      `${DOMAIN_LABELS[d]}: ${LEVEL_NAMES[domainLevels[d] as ActivationLevel]} — ${ACTIVATION_LABELS[d][domainLevels[d] as ActivationLevel]}`
    ).join('\n');
    const text = [
      'Ambient Assessment',
      `Score: ${totalScore}/100 · ${scoreBandLabel}`,
      '',
      domainLines,
      '',
      scoreStory.headline,
      '',
      `Biggest opportunity: ${DOMAIN_LABELS[lowestDomain]}`,
      '',
      'Take the assessment → https://abridge.com/assess',
    ].join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Ambient Assessment', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <>
      <div className="pb-32">

        {/* ── CARD 1: THE VERDICT ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10, duration: 0.5 }}
          className="bg-[#1A1A1A] rounded-2xl overflow-hidden mb-4"
          data-testid="card-score-hero"
        >
          <div className="px-6 sm:px-8 md:px-10 pt-8 pb-8">

            <p
              className="text-[9px] font-semibold text-white/50 uppercase tracking-[3px] mb-7"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Ambient Value Assessment
            </p>

            {/* Score number */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30, duration: 0.5 }}
              className="mb-5"
              data-testid="text-composite-score"
            >
              <div className="flex items-end gap-3">
                <span
                  className="font-abridge text-white leading-none"
                  style={{ fontSize: 'clamp(5rem, 14vw, 8rem)' }}
                >
                  <AnimatedCounter target={totalScore} duration={900} delay={300} />
                </span>
                <div className="mb-3 flex flex-col gap-1">
                  <span
                    className="text-base font-bold text-white/45 leading-none"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    /100
                  </span>
                  <span
                    className="text-[11px] font-semibold text-[#EA2C00] uppercase tracking-[2px] leading-none"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {scoreBandLabel}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Maturity arc + band description */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <MaturityArc score={totalScore} />
              {BAND_DESCRIPTIONS[scoreBandLabel] && (
                <p
                  className="text-white/50 text-xs leading-relaxed mb-0 max-w-[400px]"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                >
                  {BAND_DESCRIPTIONS[scoreBandLabel]}
                </p>
              )}
            </motion.div>

            {/* Headline + sub + rule */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.45 }}
              className="border-t border-white/[0.08] pt-7 mt-7"
            >
              <h2
                className="font-abridge uppercase text-white leading-[1.04] mb-4"
                style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)', maxWidth: '520px' }}
                data-testid="text-verdict-headline"
              >
                {scoreStory.headline}
              </h2>

              {(() => {
                const sub = generatePersonalizedSub(domainLevels, inputs, providers, annualEncounters, utilization);
                return sub ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75, duration: 0.4 }}
                    className="mb-5"
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontWeight: 400,
                      fontSize: 'clamp(0.95rem, 1.3vw, 1.05rem)',
                      lineHeight: 1.75,
                      color: 'rgba(255,255,255,0.55)',
                      maxWidth: '480px',
                    }}
                    data-testid="text-verdict-sub"
                  >
                    {sub}
                  </motion.p>
                ) : null;
              })()}

              <motion.div
                className="bg-[#EA2C00] h-[2px]"
                initial={{ width: 0 }}
                animate={{ width: 44 }}
                transition={{ delay: 0.70, duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* ── CARD 2: WHAT YOU TOLD US ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="bg-[#F5F0EB] rounded-2xl overflow-hidden mb-4"
        >
          <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-8">

            <p
              className="text-[9px] font-semibold uppercase tracking-[3px] mb-6"
              style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(234,44,0,0.75)' }}
            >
              Assessment Summary
            </p>

            <div className="flex flex-col">
              {DOMAIN_ORDER.map((domain, i) => {
                const level = domainLevels[domain] as ActivationLevel;
                const isConfirmed = level >= 3;
                const isSignal = level === 2;
                const gapVal = (inputs as any)[`${domain}Gap`] as number || 0;
                const hasVal = (inputs as any)[`${domain}HasValue`] as boolean || false;
                const narrative = generateDomainNarrative(domain, level, parsedDomainInputs[domain]);
                const chips = getDomainSelectedChips(domain, level, parsedDomainInputs[domain]).slice(0, 4);

                return (
                  <div
                    key={domain}
                    className={`py-4 ${i < DOMAIN_ORDER.length - 1 ? 'border-b border-[#1A1A1A]/[0.08]' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Level badge */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isConfirmed ? 'bg-[#EA2C00]' : isSignal ? 'bg-[#EA2C00]/[0.12]' : 'bg-[#1A1A1A]/[0.07]'
                      }`}>
                        <span
                          className={`text-[10px] font-bold leading-none ${
                            isConfirmed ? 'text-white' : isSignal ? 'text-[#EA2C00]' : 'text-[#1A1A1A]/35'
                          }`}
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          L{level}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Domain name + value */}
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div>
                            <p
                              className={`text-sm font-semibold leading-tight ${
                                isConfirmed ? 'text-[#1A1A1A]' : isSignal ? 'text-[#1A1A1A]/85' : 'text-[#1A1A1A]/65'
                              }`}
                              style={{ fontFamily: "'Manrope', sans-serif" }}
                            >
                              {DOMAIN_LABELS[domain]}
                            </p>
                            <p
                              className="text-xs text-[#1A1A1A]/50 leading-tight mt-0.5"
                              style={{ fontFamily: "'Manrope', sans-serif" }}
                            >
                              {ACTIVATION_LABELS[domain][level]}
                            </p>
                          </div>
                          {isConfirmed && hasVal && gapVal > 0 && (
                            <span
                              className="text-sm font-bold text-[#EA2C00] flex-shrink-0"
                              style={{ fontFamily: "'Manrope', sans-serif" }}
                            >
                              {formatDollar(gapVal)}/yr
                            </span>
                          )}
                        </div>

                        {/* Narrative */}
                        {narrative && (
                          <p
                            className="text-xs text-[#1A1A1A]/55 leading-relaxed mt-1.5"
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                          >
                            {narrative}
                          </p>
                        )}

                        {/* Chips */}
                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {chips.map((chip, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] rounded-full px-2.5 py-1 bg-[#1A1A1A]/[0.07] text-[#1A1A1A]/60"
                                style={{ fontFamily: "'Manrope', sans-serif" }}
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Patient Experience strip */}
            {patientExperienceSignal && (
              <div className="border-t border-[#1A1A1A]/[0.08] pt-4 mt-2">
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    patientExperienceSignal.status === 'strong' ? 'bg-[#EA2C00]' :
                    patientExperienceSignal.status === 'signal' ? 'bg-[#EA2C00]/[0.12]' : 'bg-[#1A1A1A]/[0.07]'
                  }`}>
                    <span
                      className={`text-[8px] font-bold leading-none ${
                        patientExperienceSignal.status === 'strong' ? 'text-white' :
                        patientExperienceSignal.status === 'signal' ? 'text-[#EA2C00]' : 'text-[#1A1A1A]/35'
                      }`}
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      Px
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]/65 leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                          Patient Experience
                        </p>
                        <p className="text-xs text-[#1A1A1A]/50 leading-tight mt-0.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                          {patientExperienceSignal.headline}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[1px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                          patientExperienceSignal.status === 'strong' ? 'bg-[#EA2C00]/10 text-[#EA2C00]/80' :
                          patientExperienceSignal.status === 'signal' ? 'bg-[#1A1A1A]/[0.07] text-[#1A1A1A]/50' :
                          'bg-[#1A1A1A]/[0.04] text-[#1A1A1A]/35'
                        }`}
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        {patientExperienceSignal.status === 'strong' ? 'Connected' :
                         patientExperienceSignal.status === 'signal' ? 'Signal' : 'Not tracked'}
                      </span>
                    </div>
                    {patientExperienceSignal.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {patientExperienceSignal.signals.map((sig) => (
                          <span
                            key={sig}
                            className="text-[11px] rounded-full px-2.5 py-1 bg-[#1A1A1A]/[0.07] text-[#1A1A1A]/60"
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ── CARD 3: THE PATTERN ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="bg-white rounded-2xl overflow-hidden mb-4"
        >
          <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-8">
            <p
              className="text-[9px] font-semibold uppercase tracking-[3px] mb-5"
              style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(234,44,0,0.75)' }}
            >
              The Pattern
            </p>
            <p
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(0.95rem, 1.3vw, 1.05rem)',
                lineHeight: 1.8,
                color: 'rgba(26,26,26,0.75)',
              }}
            >
              {patternText}
            </p>
          </div>
        </motion.div>

        {/* ── CARD 4: WHERE TO FOCUS NEXT ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.90, duration: 0.5 }}
          className="bg-[#1A1A1A] rounded-2xl overflow-hidden mb-6"
        >
          <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-8">
            <p
              className="text-[9px] font-semibold text-[#EA2C00] uppercase tracking-[3px] mb-5"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Where to Focus Next
            </p>

            <h3
              className="font-abridge uppercase text-white leading-none mb-2"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              {DOMAIN_LABELS[lowestDomain]}
            </h3>

            <p
              className="text-sm text-white/60 leading-snug mb-5"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
            >
              {ACTIVATION_LABELS[lowestDomain][domainLevels[lowestDomain] as ActivationLevel]}
            </p>

            <div className="w-8 h-[2px] bg-[#EA2C00] mb-5" />

            <p
              className="text-sm text-white/70 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, maxWidth: '480px' }}
            >
              {lowestDomainInsight}
            </p>
          </div>

          {/* Card footer */}
          <div className="border-t border-white/[0.07] px-6 sm:px-8 md:px-10 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/abridge-pattern.png" alt="Abridge" className="w-5 h-5 opacity-40" />
              <span className="text-[11px] text-white/40 tracking-wide" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Ambient Assessment by Abridge
              </span>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors border-none bg-transparent cursor-pointer"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {copied ? 'Copied ✓' : 'Share →'}
            </button>
          </div>
        </motion.div>

      </div>

      {/* ── STICKY CTA ── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.10, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ background: '#1A1A1A', borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="max-w-[860px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="font-abridge text-white"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', lineHeight: 1 }}
            >
              {totalScore}
            </span>
            <span className="text-xs text-white/40" style={{ fontFamily: "'Manrope', sans-serif" }}>/100</span>
            <span
              className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] ml-1"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {scoreBandLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="flex-shrink-0 bg-[#EA2C00] text-white rounded-full hover:bg-white hover:text-[#1A1A1A] transition-colors duration-200 border-none cursor-pointer"
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: '0.875rem',
              letterSpacing: '0.3px',
              padding: '0.75rem 1.75rem',
            }}
          >
            Domain Analysis →
          </button>
        </div>
      </motion.div>
    </>
  );
}
