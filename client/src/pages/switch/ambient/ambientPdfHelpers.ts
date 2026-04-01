import type { Domain } from "./domainCalculations";

export const parseDomainInputs = (json: string): Record<string, number | string> => {
  try { return JSON.parse(json); } catch { return {}; }
};

const ACCESS_OUTCOME_OPTIONS = [
  'Panel size increased',
  'New patient slots opened',
  'Same-day/urgent access expanded',
  'Referral-to-visit time reduced',
  'Third-next-available improved',
  'No-show backfill utilized',
];

const QUALITY_ATTRIBUTES_LABELS = [
  'Completeness', 'Specificity', 'Quality measures', 'Compliance', 'HCC / RAF accuracy',
];

const STRATEGIC_INTEGRATIONS_LABELS = [
  'Quality program design', 'Value-based care', 'Compliance governance', 'AI and automation readiness', 'Payer strategy', 'Clinical research',
];

const REVENUE_INTEGRATIONS_LABELS = [
  'Specialty-level revenue analysis', 'CDI strategy', 'Payer negotiations', 'Proactive denial prevention', 'Financial planning line item', 'Shared doc-to-revenue view',
];

const OBSERVATION_AREAS_LABELS = [
  'wRVU trending up', 'Coding specificity improving', 'Denial rates trending down', 'Collections trending up', 'CDI queries decreasing', 'Coder productivity improving',
];

const SURVEY_FINDINGS_LABELS = [
  'Reduced documentation burden', 'Better work-life balance', 'Less after-hours charting', 'Higher job satisfaction', 'Would recommend to peers',
];

function resolveChecklist(csv: string | undefined, labels: string[]): string[] {
  if (!csv) return [];
  return csv.split(',').filter(Boolean).map(i => labels[parseInt(i)] || '').filter(Boolean);
}

function fmtDollar(n: number): string {
  if (!n) return '';
  return `$${n.toLocaleString()}`;
}

export function buildUserInputsSummary(domain: Domain, level: number, raw: Record<string, number | string>): Record<string, string> {
  const out: Record<string, string> = {};

  if (domain === 'capacity') {
    if (raw.timeSaved) out['Time saved per encounter'] = `${raw.timeSaved} min`;
    if (level === 2) {
      const usageCsv = (raw.capacityTimeUsage as string) || '';
      const usageIndices = usageCsv.split(',').filter(Boolean);
      if (usageIndices.length > 0) {
        out['Active uses of recovered time'] = `${usageIndices.length} selected`;
      }
    }
    if (level === 3) {
      if (raw.additionalPatientsPerMonth) out['Additional patients/provider/month'] = `${raw.additionalPatientsPerMonth}`;
      if (raw.capacityAccessConfidence) out['Data confidence'] = String(raw.capacityAccessConfidence).charAt(0).toUpperCase() + String(raw.capacityAccessConfidence).slice(1);
      if (raw.redesignedProviders) out['Providers in redesign'] = `${raw.redesignedProviders}`;
    }
    if (level === 4) {
      const outcomes = resolveChecklist(raw.accessOutcomes as string, ACCESS_OUTCOME_OPTIONS);
      if (outcomes.length) out['Access outcomes tracked'] = outcomes.join(', ');
      if (raw.additionalPatientsPerMonth) out['Additional patients/provider/month'] = `${raw.additionalPatientsPerMonth}`;
    }
  }

  if (domain === 'revenue') {
    if (level === 1) {
      if (raw.revenueCycleEngaged) out['Revenue cycle engagement'] = raw.revenueCycleEngaged === 'yes' ? 'Formally engaged' : raw.revenueCycleEngaged === 'informal' ? 'Conversations started' : 'Not yet';
      if (raw.emComplexity) out['E&M complexity'] = String(raw.emComplexity) === 'mostly_l3' ? 'Mostly Level 3' : String(raw.emComplexity) === 'mix_l3_l4' ? 'Mix of Level 3–4' : String(raw.emComplexity) === 'mostly_l4_l5' ? 'Mostly Level 4–5' : 'Unsure';
    }
    if (level === 2) {
      const areas = resolveChecklist(raw.observedMovement as string, OBSERVATION_AREAS_LABELS);
      if (areas.length) out['Areas showing movement'] = areas.join(', ');
      if (raw.estimatedWrvuL2) out['Estimated wRVU improvement'] = `${raw.estimatedWrvuL2} per encounter`;
      if (raw.l2Confidence) out['Confidence level'] = String(raw.l2Confidence).charAt(0).toUpperCase() + String(raw.l2Confidence).slice(1);
    }
    if (level === 3) {
      if (raw.revenueMetricType) out['Metric measured'] = String(raw.revenueMetricType);
      if (raw.measuredWrvuDelta) out['Measured wRVU delta'] = `+${raw.measuredWrvuDelta}`;
      if (raw.measuredCollectionsDelta) out['Collections delta'] = fmtDollar(Number(raw.measuredCollectionsDelta));
      if (raw.measuredDenialReduction) out['Denial rate reduction'] = `${raw.measuredDenialReduction}%`;
    }
    if (level === 4) {
      const areas = resolveChecklist(raw.revenueIntegrations as string, REVENUE_INTEGRATIONS_LABELS);
      if (areas.length) out['Strategic integrations'] = areas.join(', ');
      if (raw.recognizedRevenue) out['Attributed annual revenue'] = fmtDollar(Number(raw.recognizedRevenue));
    }
  }

  if (domain === 'workforce') {
    if (level === 1) {
      if (raw.editTimeSaved) out['In-clinic time saved'] = `${raw.editTimeSaved} min/day`;
      if (raw.surveyType) out['Survey approach'] = String(raw.surveyType);
      const findings = resolveChecklist(raw.surveyFindings as string, SURVEY_FINDINGS_LABELS);
      if (findings.length) out['Survey findings'] = findings.join(', ');
    }
    if (level === 2) {
      const BEHAVIORAL_CHANGE_SHORT = [
        'After-hours time reduced',
        'Leaving on time',
        'Lunch breaks resumed',
        'Work-outside-of-work reduced',
        'Weekend catch-up reduced',
        'Notes completed before leaving',
        'More present at home',
      ];
      const behaviors = resolveChecklist(raw.observedBehaviors as string, BEHAVIORAL_CHANGE_SHORT);
      if (behaviors.length) out['Behavioral changes'] = behaviors.join(', ');
      if (raw.afterHoursReduction) out['After-hours reduction'] = `${raw.afterHoursReduction} hrs/week`;
    }
    if (level === 3) {
      if (raw.beforeTurnoverRate) out['Turnover rate before Abridge'] = `${raw.beforeTurnoverRate}%`;
      if (raw.afterTurnoverRate) out['Turnover rate with Abridge'] = `${raw.afterTurnoverRate}%`;
      if (raw.replacementCost) out['Replacement cost per provider'] = fmtDollar(Number(raw.replacementCost));
    }
    if (level === 4) {
      const WORKFORCE_STRATEGY_SHORT = [
        'Recruitment and hiring',
        'Retention program design',
        'Time-to-fill tracking',
        'Provider experience strategy',
        'Staffing model decisions',
        'Agency/locum spend management',
      ];
      const WORKFORCE_OUTCOME_SHORT = [
        'Turnover rate decreased',
        'Time-to-fill decreased',
        'Agency/locum reliance decreased',
        'Provider satisfaction improved',
        'Recruitment acceptance improved',
      ];
      const strategies = resolveChecklist(raw.workforceStrategies as string, WORKFORCE_STRATEGY_SHORT);
      if (strategies.length) out['Strategic integrations'] = strategies.join(', ');
      if (raw.workforceOutcomesStatus) {
        const statusLabels: Record<string, string> = { not_yet: 'Not yet measured', anecdotal: 'Anecdotal only', yes: 'Measurable outcomes confirmed' };
        out['Outcomes status'] = statusLabels[String(raw.workforceOutcomesStatus)] || String(raw.workforceOutcomesStatus);
      }
      const outcomes = resolveChecklist(raw.workforceOutcomes as string, WORKFORCE_OUTCOME_SHORT);
      if (outcomes.length) out['Measured outcomes'] = outcomes.join(', ');
      if (raw.agencyReduction) out['Monthly agency/locum reduction'] = fmtDollar(Number(raw.agencyReduction));
      if (raw.timeFillReduction) out['Monthly vacancy/time-to-fill savings'] = fmtDollar(Number(raw.timeFillReduction));
    }
  }

  if (domain === 'risk') {
    if (level === 1) {
      out['Status'] = 'Quality improving — downstream not yet connected';
    }
    if (level === 2) {
      const attrs = resolveChecklist(raw.qualityAttributes as string, QUALITY_ATTRIBUTES_LABELS);
      if (attrs.length) out['Quality attributes tracked'] = attrs.join(', ');
    }
    if (level === 3) {
      if (raw.financialPathway) {
        const pathLabels: Record<string, string> = { mips: 'MIPS / quality measures', denials: 'Denial rate reduction', none_yet: 'No pathway connected yet' };
        out['Financial pathway'] = pathLabels[String(raw.financialPathway)] || String(raw.financialPathway);
      }
      if (raw.financialPathway === 'mips' && raw.mipsScoreImprovement) out['MIPS score improvement'] = `${raw.mipsScoreImprovement} points`;
      if (raw.financialPathway === 'denials' && raw.denialReductionPct) out['Denial rate reduction'] = `${raw.denialReductionPct}%`;
    }
    if (level === 4) {
      const si = resolveChecklist(raw.strategicIntegrations as string, STRATEGIC_INTEGRATIONS_LABELS);
      if (si.length) out['Strategic areas'] = si.join(', ');
      if (raw.executiveOwner) out['Executive owner'] = raw.executiveOwner === 'yes' ? 'Yes' : 'Not yet';
      if (raw.strategicValue && raw.noConfirmedStrategicValue !== 'true') out['Strategic value'] = fmtDollar(Number(raw.strategicValue));
    }
  }

  return out;
}
