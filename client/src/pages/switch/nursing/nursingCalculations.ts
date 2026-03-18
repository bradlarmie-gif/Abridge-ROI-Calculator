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
  return Math.round(baseline.nurseFTEs * 173);
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
  const annualAgency = hasAgency && inputs.agencyMonthlySpend > 0
    ? inputs.agencyMonthlySpend * 12
    : 0;
  return { shiftsPerYear, annualAgency, hasDocOT, hasAgency };
}

export function getOTNarrative(inputs: StaffingCostsInputs, baseline: NursingBaselineInputs): string {
  if (!inputs.costPressures.includes(0) || inputs.otMinPerShift <= 0) return '';
  const shiftsPerYear = deriveShiftsPerYear(baseline);
  switch (inputs.otFrequency) {
    case 'occasionally':
      return `Documentation-driven OT happens periodically at your organization. At ${inputs.otMinPerShift} minutes per affected shift, the aggregate impact depends on frequency and scale across your ${fmt(shiftsPerYear)} annual shifts.`;
    case 'frequently':
      return `Documentation-driven OT is a regular occurrence across your units. At ${inputs.otMinPerShift} minutes per affected shift, the cumulative hours across a meaningful portion of ${fmt(shiftsPerYear)} annual shifts are significant.`;
    case 'almost_always':
      return `Documentation-driven OT is the norm at your organization. At ${inputs.otMinPerShift} minutes across the majority of ${fmt(shiftsPerYear)} annual shifts, this represents a substantial volume of overtime hours.`;
    default:
      return `End-of-shift documentation is contributing approximately ${inputs.otMinPerShift} minutes of overtime per nurse per shift on shifts where it occurs.`;
  }
}

export function computeBedsideImpact(inputs: BedsidePresenceInputs, baseline: NursingBaselineInputs) {
  const annualDocHours = inputs.docHoursPerShift > 0
    ? Math.round(inputs.docHoursPerShift * baseline.nurseFTEs * 173)
    : 0;
  return { annualDocHours };
}

export const RESEARCH_NOTE = 'Industry data referenced from NSI Nursing Solutions, ANA, and AMN Healthcare workforce surveys. Specific citations available on request.';

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
        situation = `Your organization replaces approximately ${fmt(departures)} nurses per year at ${fmtDollar(r.replacementCost)} each — ${fmtDollar(totalCost)} in annual turnover cost at your organization.`;
        if (r.interventions.length > 0) {
          const labels = r.interventions.map(i => RETENTION_INTERVENTIONS[i]).filter(Boolean);
          situation += ` You're pursuing ${r.interventions.length} intervention${r.interventions.length > 1 ? 's' : ''} including ${labels.slice(0, 2).join(' and ').toLowerCase()}.`;
        }
        sidebarLine = `${fmtDollar(totalCost)} at your org`;
      } else {
        situation = 'Nurse retention was identified as a priority. Enter your turnover rate and replacement cost to see your organizational picture.';
        sidebarLine = 'Data needed';
      }
      return {
        priority,
        situation,
        connection: 'Published nursing workforce research consistently identifies documentation burden as a top contributor to nurse dissatisfaction and turnover (ANA, NSI, AMN Healthcare surveys). Your organization identified ' + (r.interventions.length > 0 ? `${r.interventions.length} turnover driver${r.interventions.length > 1 ? 's' : ''} including ${r.interventions.map(i => RETENTION_INTERVENTIONS[i]).filter(Boolean).slice(0, 2).join(' and ').toLowerCase()}` : 'retention as a priority') + '.',
        sidebarLine,
      };
    }

    case 'staffingCosts': {
      const s = inputs.staffingCosts;
      const { annualAgency, hasDocOT, hasAgency } = computeStaffingImpact(s, baseline);
      const otNarrative = getOTNarrative(s, baseline);
      let situation = '';
      const parts: string[] = [];
      if (otNarrative) {
        parts.push(otNarrative);
      }
      if (hasAgency && s.agencyMonthlySpend > 0) {
        parts.push(`Monthly agency spend is ${fmtDollar(s.agencyMonthlySpend)} (${fmtDollar(annualAgency)} annually)`);
      }
      situation = parts.length > 0 ? parts.join('. ') + '.' : 'Staffing costs were identified as a priority. Enter details to see your organizational picture.';
      let sidebarLine = '';
      const sidebarParts: string[] = [];
      if (hasDocOT && s.otMinPerShift > 0) sidebarParts.push(`${s.otMinPerShift} min OT/shift`);
      if (annualAgency > 0) sidebarParts.push(`${fmtDollar(annualAgency)} agency`);
      sidebarLine = sidebarParts.length > 0 ? sidebarParts.join(' + ') : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Published time-and-motion studies consistently show end-of-shift documentation as a driver of nursing overtime (KLAS, ANA). Agency reliance connects indirectly through retention — published workforce data shows that when nurses stay longer, staffing gaps shrink (NSI Nursing Solutions).',
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
        connection: 'Published research from ANA and AMN Healthcare workforce surveys consistently identifies documentation burden as a primary driver of nursing burnout and job dissatisfaction. When nurses identify documentation as a frustration, it becomes one of the clearest intervention points for improving the work environment.',
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
        situation = 'Bedside presence was identified as a priority. Enter your estimated documentation hours per shift to see your organizational picture.';
      }
      const sidebarLine = annualDocHours > 0 ? `${fmt(annualDocHours)} doc hrs/yr` : 'Data needed';
      return {
        priority,
        situation,
        connection: 'Published time-and-motion studies report nurses spending 2-3 hours per shift on documentation (KLAS). Time redirected from documentation to the bedside is time redirected to patients.',
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
        connection: 'Research on nursing documentation quality consistently links documentation completeness and consistency to care continuity and compliance outcomes. Structured documentation reduces variability at the point of care.',
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
        connection: 'Structured, complete documentation is the foundation for clinical AI, quality reporting, and data-driven practice. Published research on nursing informatics maturity consistently identifies documentation infrastructure as a prerequisite for advanced analytics and AI readiness.',
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
    if (inputs.staffingCosts.otFrequency) count++;
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

export interface FramingOption {
  title: string;
  body: string;
  audience: string;
}

export function generateFocusNarrative(
  selected: NursingPriority[],
  inputs: AllPriorityInputs,
  baseline: NursingBaselineInputs,
): { situation: string; framingOptions: FramingOption[]; evaluation: string[] } {
  const strong = selected.filter(p => STRONG_PRIORITIES.includes(p));
  const titles = selected.map(p => PRIORITY_CONFIGS.find(c => c.id === p)!.title.toLowerCase());
  const situation = `Your nursing program is focused on ${titles.join(', ')}. Documentation burden connects to ${selected.length > 1 ? 'all of these' : 'this'} — but not ${selected.length > 1 ? 'in the same way or on the same timeline' : 'in isolation'}.`;

  const framingOptions: FramingOption[] = [];
  const evaluation: string[] = [
    'Does it meaningfully reduce documentation time during and after the shift?',
  ];

  if (selected.includes('wellbeing')) {
    const w = inputs.wellbeing;
    let body = '';
    if (w.surveyStatus === 'structured' && w.surveyFindings.length > 0) {
      body = 'Your survey data shows documentation is a top concern for your nurses. This framing resonates because it directly addresses what nurses are telling you is a problem. It\'s immediate and tangible.';
    } else if (w.pressures.length > 0) {
      body = 'Wellbeing pressure is visible in your organization. This framing resonates with nursing leadership and frontline nurses because it addresses the daily experience of the work.';
    } else {
      body = 'Nurse wellbeing is a priority for your organization. Framing an investment around workload relief and the daily nursing experience is immediate and tangible.';
    }
    framingOptions.push({
      title: 'Wellbeing and Workload Relief',
      body,
      audience: 'CNO, nursing councils, frontline leaders',
    });
    evaluation.push('Will nurses actually feel the difference in their daily workflow?');
  }

  if (selected.includes('staffingCosts')) {
    const s = inputs.staffingCosts;
    const otNarrative = getOTNarrative(s, baseline);
    let body = '';
    if (otNarrative) {
      body = `${otNarrative} This framing provides a measurable near-term financial metric.`;
    } else if (s.costPressures.length > 0) {
      body = 'Your organization identified staffing cost pressure. Connecting documentation time savings to specific cost drivers — particularly overtime — creates the most measurable near-term case.';
    } else {
      body = 'Staffing costs are a priority. Framing documentation technology around measurable cost reduction provides a near-term financial metric.';
    }
    framingOptions.push({
      title: 'Financial: Overtime Reduction',
      body,
      audience: 'VP of Operations, finance committee',
    });
    evaluation.push('Can we measure the impact on overtime within 60-90 days?');
  }

  if (selected.includes('retention')) {
    const r = inputs.retention;
    const { totalCost } = computeRetentionImpact(r, baseline);
    let body = '';
    if (totalCost > 0) {
      body = `Your turnover rate represents ${fmtDollar(totalCost)} in annual cost at your organization. Published workforce research identifies documentation burden as one factor in nursing turnover (NSI, ANA). This framing positions the investment as a workforce strategy. The retention impact builds over time — typically 6-12 months, not 30 days.`;
    } else {
      body = 'Retention is a priority for your organization. Published workforce research identifies documentation burden as one factor in nursing turnover. This framing positions the investment as a longer-term workforce strategy — typically 6-12 months for measurable impact.';
    }
    framingOptions.push({
      title: 'Strategic: Retention and Workforce Stability',
      body,
      audience: 'CHRO, executive leadership',
    });
    evaluation.push('Does it position us to address retention over the longer term?');
  }

  if (selected.includes('bedsidePresence')) {
    const { annualDocHours } = computeBedsideImpact(inputs.bedsidePresence, baseline);
    let body = '';
    if (annualDocHours > 0) {
      body = `Your organization spends approximately ${fmt(annualDocHours)} hours annually on nursing documentation. Time redirected from documentation to direct patient care is emotionally compelling — even if it's harder to dollarize.`;
    } else {
      body = 'Bedside presence is a priority. Time redirected from documentation to direct patient care resonates with patient experience and quality teams.';
    }
    framingOptions.push({
      title: 'Patient Experience: Bedside Time',
      body,
      audience: 'CNO, patient experience leadership, quality committee',
    });
  }

  if (strong.length === 0) {
    return {
      situation: `Your nursing program is focused on ${titles.join(' and ')}. Documentation burden reduction supports ${selected.length > 1 ? 'these goals' : 'this goal'} by creating the structured, complete documentation foundation ${selected.length > 1 ? 'these initiatives' : 'this initiative'} require${selected.length > 1 ? '' : 's'}. However, the financial case for documentation technology is typically stronger when paired with a more immediate priority like retention, staffing costs, or wellbeing.`,
      framingOptions: [{
        title: 'Consider a financial anchor',
        body: 'If documentation technology investment needs a near-term financial justification, consider whether retention or staffing cost pressures — even if they aren\'t your top strategic priority today — could provide the financial anchor for a business case that also advances your other goals.',
        audience: 'Executive leadership, finance committee',
      }],
      evaluation,
    };
  }

  return { situation, framingOptions, evaluation };
}
