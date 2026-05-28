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
  'Completeness', 'Specificity', 'Quality measures', 'Compliance', 'HCC / RAF accuracy', 'Clinical AI readiness',
];

const STRATEGIC_INTEGRATIONS_LABELS = [
  'Quality program design', 'Value-based care', 'Compliance governance', 'AI and automation readiness', 'Payer strategy', 'Clinical research',
];

const REVENUE_INTEGRATIONS_LABELS = [
  'Specialty-level revenue analysis', 'CDI strategy', 'Payer negotiations', 'Proactive denial prevention', 'Financial planning line item', 'Shared doc-to-revenue view',
];

const DOWNSTREAM_WORKFLOWS_LABELS = [
  'CDI', 'Coding accuracy', 'Quality measures', 'Prior authorization', 'Chart abstraction', 'Risk adjustment',
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
    if (level === 1) {
      if (raw.capacityMeasurementStatus) {
        const msLabels: Record<string, string> = { not_yet: 'Not yet measured', informal: 'Informally confirmed', yes: 'Formally measured' };
        out['Measurement status'] = msLabels[String(raw.capacityMeasurementStatus)] || String(raw.capacityMeasurementStatus);
      }
    }
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
      if (raw.emComplexity) {
        const emLabels: Record<string, string> = { no: 'Not yet reviewed', aware: 'On radar — not yet pulled', yes: 'Pre/post distribution reviewed' };
        out['E&M distribution review'] = emLabels[String(raw.emComplexity)] || String(raw.emComplexity);
      }
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
      if (raw.monthlyDenialVolume) out['Monthly denial volume'] = fmtDollar(Number(raw.monthlyDenialVolume));
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
      if (raw.surveyType) {
        const stLabels: Record<string, string> = { not_yet: 'Not yet', informal: 'Informal pulse survey', structured: 'Structured survey' };
        out['Survey approach'] = stLabels[String(raw.surveyType)] || String(raw.surveyType);
      }
      const findings = resolveChecklist(raw.surveyFindings as string, SURVEY_FINDINGS_LABELS);
      if (findings.length) out['Survey findings'] = findings.join(', ');
      if (raw.providerContractMentioned) {
        const pcLabels: Record<string, string> = { yes: 'Yes — in recruiting/contract/exit', once_or_twice: 'Once or twice informally', no: 'Not yet captured' };
        out['Mentioned in contract/recruiting'] = pcLabels[String(raw.providerContractMentioned)] || String(raw.providerContractMentioned);
      }
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
      if (raw.beforeTurnoverRate) out['Turnover rate before deployment'] = `${raw.beforeTurnoverRate}%`;
      if (raw.afterTurnoverRate) out['Turnover rate after deployment'] = `${raw.afterTurnoverRate}%`;
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
      if (raw.qualityReportsReviewed) {
        const qrLabels: Record<string, string> = {
          no: 'No downstream connection yet',
          informal: 'Early conversations started',
          reviewing: 'Active review underway',
        };
        out['Quality connection status'] = qrLabels[String(raw.qualityReportsReviewed)] || 'Quality improving — downstream not yet connected';
      } else {
        out['Status'] = 'Quality improving — downstream not yet connected';
      }
    }
    if (level === 2) {
      const attrs = resolveChecklist(raw.qualityAttributes as string, QUALITY_ATTRIBUTES_LABELS);
      if (attrs.length) out['Quality attributes tracked'] = attrs.join(', ');
    }
    if (level === 3) {
      const workflows = resolveChecklist(raw.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS_LABELS);
      if (workflows.length) out['Connected workflows'] = workflows.join(', ');
      if (raw.qualityMeasurementDepth) {
        const depthLabels: Record<string, string> = { qualitative: 'Qualitative', partial: 'Partially measured', measured: 'Measured' };
        out['Measurement depth'] = depthLabels[String(raw.qualityMeasurementDepth)] || String(raw.qualityMeasurementDepth);
      }
      if (raw.downstreamValue && raw.noDownstreamValue !== 'true') out['Downstream value'] = fmtDollar(Number(raw.downstreamValue));
      if (raw.cdiQueriesBefore && raw.cdiQueriesAfter) {
        const reduction = Number(raw.cdiQueriesBefore) - Number(raw.cdiQueriesAfter);
        if (reduction > 0) out['CDI query reduction'] = `${reduction} fewer queries/month`;
      }
      if (raw.maLives && raw.hccImprovementPct) out['HCC improvement'] = `${raw.maLives} lives × ${raw.hccImprovementPct}%`;
      if (raw.mipsValue) out['MIPS / quality program'] = fmtDollar(Number(raw.mipsValue));
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

// Returns up to 3 specific gaps the user has NOT yet captured at their current level.
// Used in the PDF to create the "still uncaptured" take-back callout.
export function buildLevelGaps(domain: Domain, level: number, raw: Record<string, number | string>): string[] {
  const gaps: string[] = [];

  if (domain === 'capacity') {
    if (level === 1) {
      if (!raw.timeSaved) gaps.push('Time saved per encounter not yet formally measured — no pre/post baseline');
      if (!raw.measurementStatus || raw.measurementStatus === 'not_measured') {
        gaps.push('Time savings method not established — tool-assisted, reviewed, or estimated classification missing');
      }
    }
    if (level === 2) {
      const usageCount = ((raw.capacityTimeUsage as string) || '').split(',').filter(Boolean).length;
      if (usageCount === 0) gaps.push('Recovered time not yet formally committed to any specific operational use (access, extended hours, new types)');
      else if (usageCount < 2) gaps.push('Only one use of recovered time documented — additional redeployment categories worth capturing');
    }
    if (level === 3) {
      if (!raw.additionalPatientsPerMonth) gaps.push('Additional patient volume per provider/month not yet confirmed by scheduling data');
      const accessMetrics = ((raw.capacityAccessMetrics as string) || '').split(',').filter(Boolean);
      const accessLabels = ['Third-next-available', 'Average wait times', 'Panel sizes', 'Same-day slots', 'Patient volume increase'];
      const missing = accessLabels.filter((_, i) => !accessMetrics.includes(String(i)) && !accessMetrics.some(m => m.toLowerCase().includes(accessLabels[i].toLowerCase().split('-')[0])));
      if (missing.length > 0) gaps.push(`Access metrics not yet tracked: ${missing.slice(0, 3).join(', ')}`);
    }
  }

  if (domain === 'revenue') {
    if (level === 1) {
      if (!raw.revenueCycleEngaged || raw.revenueCycleEngaged === 'no') {
        gaps.push('Revenue cycle team not yet formally engaged on documentation quality changes');
      }
      if (!raw.emComplexity || raw.emComplexity === 'no' || raw.emComplexity === 'aware') {
        gaps.push('E&M level distribution not yet reviewed pre/post deployment — coding complexity shift from ambient unexamined');
      }
    }
    if (level === 2) {
      const movementCount = ((raw.observedMovement as string) || '').split(',').filter(Boolean).length;
      if (movementCount === 0) gaps.push('No specific revenue cycle movements (wRVU, denials, collections) formally identified');
      if (!raw.estimatedWrvuL2) gaps.push('wRVU improvement not yet estimated — even directional quantification missing');
    }
    if (level === 3) {
      if (!raw.measuredWrvuDelta && !raw.measuredCollectionsDelta && !raw.measuredDenialReduction) {
        gaps.push('Revenue impact not yet confirmed in billing data — no before/after dollar figure validated by revenue cycle');
      }
    }
  }

  if (domain === 'workforce') {
    if (level === 1) {
      if (!raw.surveyType || raw.surveyType === 'none') {
        gaps.push('No formal provider satisfaction survey or tracking mechanism in place — anecdotal only');
      }
      if (!raw.editTimeSaved) {
        gaps.push('In-clinic time savings not yet formally quantified per provider');
      }
    }
    if (level === 2) {
      if (!raw.afterHoursReduction) {
        gaps.push('After-hours documentation reduction not yet formally measured in hours per week');
      }
      const behaviorCount = ((raw.observedBehaviors as string) || '').split(',').filter(Boolean).length;
      if (behaviorCount === 0) gaps.push('No specific behavioral changes formally documented or tracked');
    }
    if (level === 3) {
      if (!raw.beforeTurnoverRate || !raw.afterTurnoverRate) {
        gaps.push('Turnover rate change not formally calculated — pre/post ambient comparison not captured');
      }
    }
  }

  if (domain === 'risk') {
    if (level === 1) {
      gaps.push('No downstream team (CDI, coding, quality reporting, compliance) formally engaged on documentation quality');
      gaps.push('Quality improvements not yet systematically tracked — no measurement framework established');
    }
    if (level === 2) {
      const attrIndices = ((raw.qualityAttributes as string) || '').split(',').filter(Boolean).map(Number);
      const allAttrs = ['Completeness', 'Specificity', 'Quality measures', 'Compliance', 'HCC / RAF accuracy', 'Clinical AI readiness'];
      const missing = allAttrs.filter((_, i) => !attrIndices.includes(i));
      if (missing.length > 0) gaps.push(`Quality dimensions not yet tracked: ${missing.join(', ')}`);
    }
    if (level === 3) {
      const workflowIndices = ((raw.connectedWorkflows as string) || '').split(',').filter(Boolean).map(Number);
      const allWorkflows = ['CDI', 'Coding accuracy', 'Quality measures', 'Prior authorization', 'Chart abstraction', 'Risk adjustment'];
      const missingW = allWorkflows.filter((_, i) => !workflowIndices.includes(i));
      if (missingW.length > 0 && missingW.length < 5) gaps.push(`Downstream workflows not yet connected: ${missingW.slice(0, 3).join(', ')}`);
      if (!raw.qualityAttributedValue && String(raw.noQualityValue) !== 'true') {
        gaps.push('Financial value of quality improvements not yet formally quantified');
      }
    }
  }

  return gaps.slice(0, 3);
}
