import type {
  NursingPriority,
  NursingBaselineInputs,
  AllPriorityInputs,
  RetentionInputs,
  StaffingCostsInputs,
  WellbeingInputs,
  BedsidePresenceInputs,
  DocQualityInputs,
  FutureReadinessInputs,
} from './nursingTypes';
import {
  RETENTION_INTERVENTIONS,
  STAFFING_COST_PRESSURES,
  STAFFING_COST_INTERVENTIONS,
  WELLBEING_PRESSURES,
  WELLBEING_SURVEY_FINDINGS,
  DOC_QUALITY_CONCERNS,
  FUTURE_INITIATIVES,
  PRIORITY_CONFIGS,
} from './nursingTypes';

export function derivePatientDays(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.staffedBeds * (baseline.bedOccupancy / 100) * 365);
}

export function deriveShiftsPerYear(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.nurseFTEs * 260);
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtDollar(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export { fmtDollar };

export function computeRetentionImpact(inputs: RetentionInputs, baseline: NursingBaselineInputs) {
  const departures = inputs.turnoverRate > 0 ? Math.round(baseline.nurseFTEs * (inputs.turnoverRate / 100)) : 0;
  const totalCost = departures * inputs.replacementCost;
  return { departures, totalCost };
}

export function computeStaffingImpact(inputs: StaffingCostsInputs, baseline: NursingBaselineInputs) {
  const shiftsPerYear = deriveShiftsPerYear(baseline);
  const hasDocOT = inputs.costPressures.includes(0);
  const hasAgency = inputs.costPressures.includes(2);
  const annualOTHours = hasDocOT && inputs.otMinPerShift > 0
    ? Math.round((inputs.otMinPerShift * baseline.nurseFTEs * 260) / 60)
    : 0;
  const annualAgency = hasAgency && inputs.agencyMonthlySpend > 0
    ? inputs.agencyMonthlySpend * 12
    : 0;
  return { annualOTHours, annualAgency, hasDocOT, hasAgency };
}

export function computeBedsideImpact(inputs: BedsidePresenceInputs, baseline: NursingBaselineInputs) {
  const annualDocHours = inputs.docHoursPerShift > 0
    ? Math.round(inputs.docHoursPerShift * baseline.nurseFTEs * 260)
    : 0;
  return { annualDocHours };
}

export interface PrioritySummary {
  priority: NursingPriority;
  situation: string;
  connection: string;
  sidebarLine: string;
}

export function buildPrioritySummary(
  priority: NursingPriority,
  inputs: AllPriorityInputs,
  baseline: NursingBaselineInputs,
): PrioritySummary {
  switch (priority) {
    case 'retention': {
      const r = inputs.retention;
      const { departures, totalCost } = computeRetentionImpact(r, baseline);
      let situation = '';
      let sidebarLine = '';
      if (r.turnoverRate > 0 && r.replacementCost > 0) {
        situation = `Your organization replaces approximately ${fmt(departures)} nurses per year at ${fmtDollar(r.replacementCost)} each — ${fmtDollar(totalCost)} in annual turnover cost.`;
        if (r.interventions.length > 0) {
          const labels = r.interventions.map(i => RETENTION_INTERVENTIONS[i]).filter(Boolean);
          situation += ` You're pursuing ${r.interventions.length} intervention${r.interventions.length > 1 ? 's' : ''} including ${labels.slice(0, 2).join(' and ').toLowerCase()}.`;
        }
        sidebarLine = `${fmtDollar(totalCost)} exposure`;
      } else {
        situation = 'Nurse retention was identified as a priority. Enter your turnover rate and replacement cost to see the estimated impact.';
        sidebarLine = 'Data needed';
      }
      return {
        priority,
        situation,
        connection: 'Documentation time is one of the most consistent sources of nursing frustration. Reducing it doesn\'t solve retention alone, but it addresses a pain point that nurses cite in surveys and exit interviews across the industry.',
        sidebarLine,
      };
    }

    case 'staffingCosts': {
      const s = inputs.staffingCosts;
      const { annualOTHours, annualAgency, hasDocOT, hasAgency } = computeStaffingImpact(s, baseline);
      let situation = '';
      const parts: string[] = [];
      if (hasDocOT && s.otMinPerShift > 0) {
        parts.push(`End-of-shift documentation is contributing approximately ${s.otMinPerShift} minutes of overtime per nurse per shift — an estimated ${fmt(annualOTHours)} hours of documentation-driven OT annually`);
      }
      if (hasAgency && s.agencyMonthlySpend > 0) {
        parts.push(`Monthly agency spend is ${fmtDollar(s.agencyMonthlySpend)}`);
      }
      situation = parts.length > 0 ? parts.join('. ') + '.' : 'Staffing costs were identified as a priority. Enter details to see the estimated impact.';
      let sidebarLine = '';
      const sidebarParts: string[] = [];
      if (annualOTHours > 0) sidebarParts.push(`${fmt(annualOTHours)} OT hrs`);
      if (annualAgency > 0) sidebarParts.push(`${fmtDollar(annualAgency)} agency`);
      sidebarLine = sidebarParts.length > 0 ? sidebarParts.join(' + ') : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Documentation-driven overtime is one of the most directly addressable cost drivers in nursing operations. Agency reliance connects indirectly through retention — when nurses stay longer, staffing gaps shrink.',
        sidebarLine,
      };
    }

    case 'wellbeing': {
      const w = inputs.wellbeing;
      let situation = '';
      const pressureLabels = w.pressures.map(i => WELLBEING_PRESSURES[i]).filter(Boolean);
      if (pressureLabels.length > 0) {
        situation = `Wellbeing pressure is visible in ${w.pressures.length} area${w.pressures.length > 1 ? 's' : ''} including ${pressureLabels.slice(0, 2).join(' and ').toLowerCase()}.`;
      }
      if (w.surveyStatus === 'structured' && w.surveyFindings.length > 0) {
        const findingLabels = w.surveyFindings.map(i => WELLBEING_SURVEY_FINDINGS[i]).filter(Boolean);
        situation += ` Your structured survey identified ${findingLabels.slice(0, 2).join(' and ').toLowerCase()}.`;
      } else if (w.surveyStatus === 'informal') {
        situation += ' Informal pulse checks have been conducted.';
      }
      if (!situation) situation = 'Nurse wellbeing was identified as a priority. Tell us more about what this looks like at your organization.';
      let sidebarLine = '';
      const sidebarParts: string[] = [];
      if (w.pressures.length > 0) sidebarParts.push(`${w.pressures.length} pressure area${w.pressures.length > 1 ? 's' : ''}`);
      if (w.surveyStatus === 'structured') sidebarParts.push('survey');
      sidebarLine = sidebarParts.length > 0 ? sidebarParts.join(' + ') : 'Data needed';
      return {
        priority,
        situation,
        connection: 'When nurses identify documentation as a primary frustration, it becomes one of the clearest intervention points for improving the work environment.',
        sidebarLine,
      };
    }

    case 'bedsidePresence': {
      const b = inputs.bedsidePresence;
      const { annualDocHours } = computeBedsideImpact(b, baseline);
      let situation = '';
      if (b.docHoursPerShift > 0) {
        situation = `At ${b.docHoursPerShift} hours of documentation per shift across ${fmt(baseline.nurseFTEs)} nurses, your nursing program spends approximately ${fmt(annualDocHours)} hours annually on documentation.`;
      } else {
        situation = 'Bedside presence was identified as a priority. Enter your estimated documentation hours per shift to see the impact.';
      }
      const sidebarLine = annualDocHours > 0 ? `${fmt(annualDocHours)} doc hrs/yr` : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Time redirected from documentation to the bedside is time redirected to patients. Every minute saved is a minute available for direct care.',
        sidebarLine,
      };
    }

    case 'docQuality': {
      const d = inputs.docQuality;
      const concernLabels = d.concerns.map(i => DOC_QUALITY_CONCERNS[i]).filter(Boolean);
      let situation = '';
      if (concernLabels.length > 0) {
        situation = `${d.concerns.length} documentation quality concern${d.concerns.length > 1 ? 's' : ''} identified including ${concernLabels.slice(0, 2).join(' and ').toLowerCase()}.`;
      }
      if (d.measuringQuality === 'yes') {
        situation += ' Actively tracking quality metrics through audits, dashboards, or reviews.';
      } else if (d.measuringQuality === 'informal') {
        situation += ' Informal monitoring in place through spot checks and anecdotal feedback.';
      } else if (d.measuringQuality === 'no') {
        situation += ' Quality gaps identified but not yet formally measured.';
      }
      if (!situation) situation = 'Documentation quality was identified as a priority. Tell us more about what this looks like at your organization.';
      const sidebarLine = d.concerns.length > 0 ? `${d.concerns.length} concern${d.concerns.length > 1 ? 's' : ''}` : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Structured, consistent flowsheet documentation addresses completeness and consistency at the point of care — before gaps reach compliance review.',
        sidebarLine,
      };
    }

    case 'futureReadiness': {
      const f = inputs.futureReadiness;
      const initLabels = f.initiatives.map(i => FUTURE_INITIATIVES[i]).filter(Boolean);
      let situation = '';
      if (initLabels.length > 0) {
        situation = `${f.initiatives.length} strategic initiative${f.initiatives.length > 1 ? 's' : ''} in progress including ${initLabels.slice(0, 2).join(' and ').toLowerCase()}.`;
      }
      if (f.techMaturity) {
        const labels: Record<string, string> = {
          early: 'Early — still primarily paper or basic EHR workflows',
          developing: 'Developing — using EHR effectively, exploring innovation',
          advanced: 'Advanced — actively piloting new technology and AI',
          leading: 'Leading — technology is embedded in nursing strategy',
        };
        situation += ` Technology maturity: ${labels[f.techMaturity] || f.techMaturity}.`;
      }
      if (!situation) situation = 'Future readiness was identified as a priority. Tell us more about your strategic initiatives.';
      const sidebarLine = f.initiatives.length > 0 ? `${f.initiatives.length} initiative${f.initiatives.length > 1 ? 's' : ''}` : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Structured, complete documentation is the foundation for every initiative you identified. Without it, clinical AI, quality reporting, and data-driven practice can\'t reach their potential.',
        sidebarLine,
      };
    }
  }
}

export function countDataPoints(
  selected: NursingPriority[],
  inputs: AllPriorityInputs,
): number {
  let count = 0;
  if (selected.includes('retention')) {
    if (inputs.retention.turnoverRate > 0) count++;
    if (inputs.retention.replacementCost > 0) count++;
    count += inputs.retention.interventions.length;
  }
  if (selected.includes('staffingCosts')) {
    count += inputs.staffingCosts.costPressures.length;
    if (inputs.staffingCosts.otMinPerShift > 0) count++;
    if (inputs.staffingCosts.agencyMonthlySpend > 0) count++;
    count += inputs.staffingCosts.costInterventions.length;
  }
  if (selected.includes('wellbeing')) {
    count += inputs.wellbeing.pressures.length;
    if (inputs.wellbeing.surveyStatus) count++;
    count += inputs.wellbeing.surveyFindings.length;
  }
  if (selected.includes('bedsidePresence')) {
    if (inputs.bedsidePresence.bedsidePriority) count++;
    if (inputs.bedsidePresence.measuringBedside) count++;
    if (inputs.bedsidePresence.docHoursPerShift > 0) count++;
  }
  if (selected.includes('docQuality')) {
    count += inputs.docQuality.concerns.length;
    if (inputs.docQuality.measuringQuality) count++;
  }
  if (selected.includes('futureReadiness')) {
    count += inputs.futureReadiness.initiatives.length;
    if (inputs.futureReadiness.techMaturity) count++;
  }
  return count;
}

const STRONG_PRIORITIES: NursingPriority[] = ['retention', 'staffingCosts', 'wellbeing'];

export function generateFocusNarrative(
  selected: NursingPriority[],
  inputs: AllPriorityInputs,
  baseline: NursingBaselineInputs,
): { situation: string; framing: string[]; evaluation: string[] } {
  const strong = selected.filter(p => STRONG_PRIORITIES.includes(p));
  const titles = selected.map(p => PRIORITY_CONFIGS.find(c => c.id === p)!.title.toLowerCase());
  const situation = `Your nursing program is focused on ${titles.join(', ')}. Documentation burden connects to ${selected.length > 1 ? 'all of these' : 'this'} — but not ${selected.length > 1 ? 'in the same way or on the same timeline' : 'in isolation'}.`;

  const framing: string[] = [];
  const evaluation: string[] = [
    'Does it meaningfully reduce documentation time during and after the shift?',
  ];

  if (selected.includes('wellbeing')) {
    const w = inputs.wellbeing;
    if (w.surveyStatus === 'structured' && w.surveyFindings.length > 0) {
      framing.push('Lead with nurse wellbeing.\nYour survey data shows documentation is a top concern for your nurses. When you can show that a specific intervention directly addresses the thing nurses are telling you is a problem, that\'s a compelling starting point. It\'s immediate, it\'s tangible, and nurses will feel the difference.');
    } else if (w.pressures.length > 0) {
      framing.push('Lead with nurse wellbeing.\nWellbeing pressure is visible in your organization. When nurses identify documentation as a frustration, addressing it becomes one of the clearest intervention points for improving the work environment.');
    }
    evaluation.push('Will nurses actually feel the difference in their daily workflow?');
  }

  if (selected.includes('staffingCosts')) {
    const s = inputs.staffingCosts;
    const { annualOTHours } = computeStaffingImpact(s, baseline);
    if (annualOTHours > 0) {
      framing.push(`Anchor the financial case in overtime.\nEnd-of-shift documentation is contributing an estimated ${fmt(annualOTHours)} hours of OT annually at your organization. This is the most measurable near-term financial metric because the connection between documentation time and end-of-shift OT is direct.`);
      evaluation.push('Can we measure the impact on overtime within 60-90 days?');
    } else if (s.costPressures.length > 0) {
      framing.push('Anchor the financial case in staffing costs.\nYour organization identified staffing cost pressure. Connecting documentation time savings to specific cost drivers — particularly overtime — creates the most measurable near-term case.');
    }
  }

  if (selected.includes('retention')) {
    const r = inputs.retention;
    const { totalCost } = computeRetentionImpact(r, baseline);
    if (totalCost > 0) {
      framing.push(`Build the longer-term case around retention.\nYour turnover rate represents ${fmtDollar(totalCost)} in annual cost. Documentation burden is one of the factors your organization has identified. The retention impact builds over time — as workload improves, satisfaction improves, and the decision to stay becomes easier for your nurses. This is a 6-12 month story, not a 30-day story.`);
    } else {
      framing.push('Build the longer-term case around retention.\nRetention is a priority for your organization. The connection between documentation burden reduction and retention is real but builds over time — typically 6-12 months for measurable impact.');
    }
    evaluation.push('Does it position us to address retention over the longer term?');
  }

  if (selected.includes('bedsidePresence')) {
    const { annualDocHours } = computeBedsideImpact(inputs.bedsidePresence, baseline);
    if (annualDocHours > 0) {
      framing.push(`Support with bedside time.\nYour organization spends approximately ${fmt(annualDocHours)} hours annually on nursing documentation. Time redirected from documentation to direct patient care is the most emotionally compelling argument — even if it's harder to dollarize.`);
    }
  }

  if (strong.length === 0) {
    return {
      situation: `Your nursing program is focused on ${titles.join(' and ')}. Documentation burden reduction supports ${selected.length > 1 ? 'these goals' : 'this goal'} by creating the structured, complete documentation foundation ${selected.length > 1 ? 'these initiatives' : 'this initiative'} require${selected.length > 1 ? '' : 's'}. However, the financial case for documentation technology is typically stronger when paired with a more immediate priority like retention, staffing costs, or wellbeing.`,
      framing: ['If documentation technology investment needs a near-term financial justification, consider whether retention or staffing cost pressures — even if they aren\'t your top strategic priority today — could provide the financial anchor for a business case that also advances your other goals.'],
      evaluation,
    };
  }

  return { situation, framing, evaluation };
}
