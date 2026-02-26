import type {
  NursingPriority,
  NursingBaselineInputs,
  PriorityConnection,
  ConnectionBar,
  PathwayClassification,
  PathwayRole,
} from './nursingTypes';
import { PRIORITY_CONFIGS } from './nursingTypes';

export function derivePatientDays(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.staffedBeds * (baseline.bedOccupancy / 100) * 365);
}

export function deriveShiftsPerYear(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.nurseFTEs * 260);
}

export function deriveBedsideHoursRecovered(baseline: NursingBaselineInputs): number {
  const shifts = deriveShiftsPerYear(baseline);
  return Math.round((17.5 * shifts) / 60);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function buildConnection(
  priority: NursingPriority,
  baseline: NursingBaselineInputs,
): PriorityConnection {
  const shifts = deriveShiftsPerYear(baseline);
  const bedsideHours = deriveBedsideHoursRecovered(baseline);

  switch (priority) {
    case 'retention':
      return {
        priority,
        headline: 'Keep Our Nurses → Strong Connection',
        howItConnects:
          'Documentation burden is one of the most frequently cited sources of nursing frustration and burnout. Burnout is the leading driver of voluntary turnover. Reducing the time nurses spend on flowsheets directly addresses one of the root causes of attrition.',
        whatResearchSays:
          'Nurses spend 2–3 hours per shift on documentation. Documentation burden consistently ranks in the top 3 drivers of nursing burnout across published surveys.',
        whatItMeansForROI:
          `When retention is your primary goal, the ROI model should focus on turnover cost avoidance — not on dollarizing every minute saved. A focused retention case at your scale could look like:\n\n${formatNumber(baseline.nurseFTEs)} nurses × [X]% turnover × $[Y] replacement cost = $[total] in annual turnover cost\n\nEven a modest improvement in retention — 1–2 fewer departures per year — changes the math significantly.`,
        bars: [{ label: '', strength: 'direct', filled: 12, total: 12 }],
      };

    case 'laborCosts':
      return {
        priority,
        headline: 'Control Labor Costs → Direct for OT, Indirect for Agency',
        howItConnects:
          'If end-of-shift charting is driving overtime, reducing documentation time directly reduces OT. If agency spend is driven by turnover, the connection is indirect — reduced burden → better retention → less agency need. That second pathway is real but takes 6–12 months.',
        whatItMeansForROI:
          'Be specific about which labor cost you\'re solving. OT reduction from documentation? That\'s direct and measurable in 30–60 days. Agency reduction from better retention? That\'s a longer-term case.\n\nThe ROI model should focus on the labor cost driver that\'s most directly connected to documentation time. Trying to model both in one business case dilutes the story.',
        bars: [
          { label: 'Overtime', strength: 'direct', filled: 12, total: 12 },
          { label: 'Agency spend', strength: 'indirect', filled: 6, total: 12 },
        ],
      };

    case 'burnout':
      return {
        priority,
        headline: 'Reduce Burnout → Strong Connection',
        howItConnects:
          'Documentation is one of the most controllable drivers of nursing workload. Unlike patient acuity or staffing ratios — which are hard to change quickly — documentation time can be reduced through technology. Giving nurses 15–20 minutes back per shift is tangible relief.',
        whatItMeansForROI:
          'Burnout itself is hard to dollarize. But the consequences of burnout are not: turnover, sick time, disengagement, medical errors. The ROI model should connect burnout reduction to the downstream consequence your organization cares about most.\n\nIf it\'s turnover → model the retention pathway.\nIf it\'s patient safety → model the quality pathway.\nIf it\'s just "our nurses need relief" → the case may be more about workforce strategy than financial ROI.',
        bars: [
          { label: '', strength: 'direct', filled: 12, total: 12 },
        ],
      };

    case 'bedsideTime':
      return {
        priority,
        headline: 'Get Nurses Back to the Bedside → Direct Connection, Hard to Dollarize',
        howItConnects:
          `Every minute saved on documentation is a minute that could go to direct patient care. At ${formatNumber(baseline.nurseFTEs)} nurses and 260 shifts per year, even 15 minutes per shift = ${formatNumber(bedsideHours)} hours back at the bedside annually.`,
        whatItMeansForROI:
          'This is the most emotionally compelling case and the hardest to turn into a dollar figure. Bedside time doesn\'t directly generate revenue in nursing. Its value shows up in patient experience (HCAHPS), safety outcomes, and nurse satisfaction — all of which are real but harder to attribute.\n\nIf bedside time is your primary motivation, the business case may need to be built around the strategic value to nursing practice and patient experience — supported by financial pathways like retention or OT, not led by them.',
        bars: [
          { label: '', strength: 'direct', filled: 12, total: 12 },
          { label: 'Financial case', strength: 'indirect', filled: 6, total: 12 },
        ],
      };

    case 'docQuality':
      return {
        priority,
        headline: 'Improve Documentation Quality → Moderate Connection',
        howItConnects:
          'Ambient documentation can improve flowsheet completeness and consistency by structuring the documentation process. But quality improvement also depends on clinical practice, workflow design, and governance — not just the tool.',
        whatItMeansForROI:
          'Documentation quality is harder to tie directly to financial outcomes. Its value shows up in audit readiness, survey preparedness, and reduced rework — but quantifying those requires measurement that most organizations haven\'t done yet.\n\nIf documentation quality is a priority, the business case is about risk reduction and compliance posture rather than financial return. It\'s a strong supporting argument but rarely the lead story in an ROI model.',
        bars: [
          { label: '', strength: 'moderate', filled: 8, total: 12 },
        ],
      };

    case 'future':
      return {
        priority,
        headline: 'Prepare for the Future → Foundational, Not Immediate ROI',
        howItConnects:
          'Structured, complete nursing documentation is the foundation for everything coming next in clinical AI: predictive models, automated quality reporting, decision support, care planning intelligence. You can\'t build on documentation that isn\'t there.',
        whatItMeansForROI:
          'This is a strategic infrastructure argument, not a short-term financial case. It\'s powerful for organizations that are thinking 2–3 years ahead — but it won\'t carry an ROI model on its own.\n\nUse this as a strategic layer on top of a more immediate pathway (retention, OT, bedside time).',
        bars: [
          { label: '', strength: 'direct', filled: 10, total: 12 },
          { label: 'Immediate financial ROI', strength: 'strategic', filled: 4, total: 12 },
        ],
      };
  }
}

const PRIORITY_STRENGTH: Record<NursingPriority, 'strong' | 'moderate' | 'strategic'> = {
  retention: 'strong',
  laborCosts: 'strong',
  burnout: 'strong',
  bedsideTime: 'moderate',
  docQuality: 'moderate',
  future: 'strategic',
};

const PATHWAY_LABELS: Record<NursingPriority, string> = {
  retention: 'Retention (turnover cost avoidance)',
  laborCosts: 'OT / Agency (labor cost reduction)',
  burnout: 'Retention (via burnout reduction)',
  bedsideTime: 'Bedside time (direct care hours)',
  docQuality: 'Documentation quality (compliance & risk)',
  future: 'Infrastructure (strategic foundation)',
};

export function classifyPathways(
  selected: NursingPriority[],
  baseline: NursingBaselineInputs,
): PathwayClassification[] {
  const all = PRIORITY_CONFIGS.map(c => c.id);
  const result: PathwayClassification[] = [];

  const selectedStrong = selected.filter(p => PRIORITY_STRENGTH[p] === 'strong');
  const selectedModerate = selected.filter(p => PRIORITY_STRENGTH[p] === 'moderate');
  const selectedStrategic = selected.filter(p => PRIORITY_STRENGTH[p] === 'strategic');

  for (const p of all) {
    if (!selected.includes(p)) {
      result.push({
        priority: p,
        role: 'notSelected',
        label: PATHWAY_LABELS[p],
        narrative: `Not selected as a current priority.`,
      });
      continue;
    }

    let role: PathwayRole;
    let narrative: string;
    const strength = PRIORITY_STRENGTH[p];

    if (strength === 'strong') {
      role = 'primary';
      narrative = buildPrimaryNarrative(p, baseline);
    } else if (strength === 'moderate') {
      if (selectedStrong.length > 0) {
        role = 'supporting';
        narrative = buildSupportingNarrative(p, baseline);
      } else {
        role = 'primary';
        narrative = buildPrimaryNarrative(p, baseline);
      }
    } else {
      if (selectedStrong.length > 0 || selectedModerate.length > 0) {
        role = 'supporting';
        narrative = buildSupportingNarrative(p, baseline);
      } else {
        role = 'primary';
        narrative = buildPrimaryNarrative(p, baseline);
      }
    }

    result.push({ priority: p, role, label: PATHWAY_LABELS[p], narrative });
  }

  result.sort((a, b) => {
    const order: Record<PathwayRole, number> = { primary: 0, supporting: 1, notSelected: 2 };
    return order[a.role] - order[b.role];
  });

  return result;
}

function buildPrimaryNarrative(p: NursingPriority, baseline: NursingBaselineInputs): string {
  const shifts = deriveShiftsPerYear(baseline);
  const bedsideHours = deriveBedsideHoursRecovered(baseline);
  switch (p) {
    case 'retention':
      return `Reducing documentation frustration addresses a root cause of nursing burnout and turnover. At your scale of ${formatNumber(baseline.nurseFTEs)} nurses, even a modest improvement in retention changes the financial equation significantly.`;
    case 'laborCosts':
      return `If end-of-shift charting is contributing to OT, reducing documentation time directly reduces OT costs. This is measurable within 30–60 days. Agency spend driven by turnover is an indirect but real longer-term pathway.`;
    case 'burnout':
      return `Documentation is one of the most controllable sources of nursing workload. Giving nurses 15–20 minutes back per shift across ${formatNumber(shifts)} annual shifts is tangible relief that connects to retention and safety outcomes.`;
    case 'bedsideTime':
      return `At your scale, reducing documentation time by 15–20 minutes per shift could return approximately ${formatNumber(bedsideHours)} hours annually to direct patient care. Powerful for patient experience and nurse satisfaction.`;
    case 'docQuality':
      return `Structured, consistent flowsheet documentation through ambient technology addresses completeness and consistency at the point of care — before gaps reach compliance review.`;
    case 'future':
      return `Structured, complete nursing documentation is the foundation for predictive models, automated quality reporting, and decision support. This is a strategic infrastructure investment.`;
  }
}

function buildSupportingNarrative(p: NursingPriority, baseline: NursingBaselineInputs): string {
  const bedsideHours = deriveBedsideHoursRecovered(baseline);
  switch (p) {
    case 'bedsideTime':
      return `${formatNumber(bedsideHours)} hours annually returned to direct care. Powerful for nursing leadership and patient experience — but hard to dollarize on its own.`;
    case 'docQuality':
      return `Supports compliance and survey readiness. Valuable as a strategic argument alongside the financial case.`;
    case 'future':
      return `Strategic foundation for clinical AI and data-driven nursing practice. Strengthens the long-term case but won't carry an ROI model alone.`;
    default:
      return buildPrimaryNarrative(p, baseline);
  }
}

export function generatePrimaryPathwaySummary(selected: NursingPriority[]): string {
  const strong = selected.filter(p => PRIORITY_STRENGTH[p] === 'strong');
  const moderate = selected.filter(p => PRIORITY_STRENGTH[p] === 'moderate');
  const strategic = selected.filter(p => PRIORITY_STRENGTH[p] === 'strategic');

  if (strong.length === 0 && moderate.length === 0 && strategic.length === 0) {
    return 'Select your priorities to see your recommended investment pathway.';
  }

  if (strong.length > 0) {
    const labels = strong.map(p => {
      switch (p) {
        case 'retention': return 'Retention';
        case 'laborCosts': return 'OT Reduction';
        case 'burnout': return 'Burnout Relief → Retention';
        default: return '';
      }
    }).filter(Boolean);
    return labels.join(' + ');
  }

  if (moderate.length > 0) {
    const labels = moderate.map(p => {
      switch (p) {
        case 'bedsideTime': return 'Bedside Time';
        case 'docQuality': return 'Documentation Quality';
        default: return '';
      }
    }).filter(Boolean);
    return labels.join(' + ');
  }

  return 'Strategic Infrastructure';
}

export function generateAlignmentNarrative(
  selected: NursingPriority[],
  baseline: NursingBaselineInputs,
): string {
  const strong = selected.filter(p => PRIORITY_STRENGTH[p] === 'strong');

  if (strong.length === 0) {
    return 'Your priorities are important but harder to build a traditional financial ROI case around. Consider whether a retention or labor cost pathway could serve as the financial anchor, with your primary priorities as supporting arguments.';
  }

  const parts: string[] = [];
  if (selected.includes('retention')) {
    parts.push(`Retention: reducing documentation frustration addresses a root cause of nursing burnout and turnover. At your scale of ${formatNumber(baseline.nurseFTEs)} nurses, this is a significant annual exposure.`);
  }
  if (selected.includes('laborCosts')) {
    parts.push('Overtime: if end-of-shift charting is contributing to OT, reducing documentation time directly reduces OT costs. This is measurable within 30–60 days.');
  }
  if (selected.includes('burnout')) {
    parts.push('Burnout: documentation is one of the most controllable sources of workload strain. The ROI connects through its downstream consequences — turnover, sick time, and safety incidents.');
  }

  return parts.join('\n\n');
}

export function getRecommendedFocus(selected: NursingPriority[]): string[] {
  const focus: string[] = [];
  const strong = selected.filter(p => PRIORITY_STRENGTH[p] === 'strong');
  const supporting = selected.filter(p => PRIORITY_STRENGTH[p] !== 'strong');

  if (selected.includes('retention') || selected.includes('burnout')) {
    focus.push('Retention impact (turnover cost avoidance)');
  }
  if (selected.includes('laborCosts')) {
    focus.push('OT reduction (direct documentation time savings)');
  }
  if (focus.length === 0 && selected.includes('bedsideTime')) {
    focus.push('Bedside time recovery (direct care hours)');
  }
  if (focus.length === 0 && selected.includes('docQuality')) {
    focus.push('Documentation quality (compliance & risk reduction)');
  }
  if (focus.length === 0 && selected.includes('future')) {
    focus.push('Strategic infrastructure (data-driven nursing)');
  }
  if (supporting.length > 0 && focus.length > 0) {
    const labels = supporting.map(p => {
      switch (p) {
        case 'bedsideTime': return 'Bedside time';
        case 'docQuality': return 'Documentation quality';
        case 'future': return 'Future readiness';
        case 'burnout': return 'Burnout relief';
        default: return '';
      }
    }).filter(Boolean);
    if (labels.length > 0) {
      focus.push(`Supporting: ${labels.join(', ')}`);
    }
  }

  return focus;
}
