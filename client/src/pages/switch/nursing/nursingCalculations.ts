import type { NursingDomain, NursingLevel, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import { SCORE_MAP, NURSING_DOMAIN_ORDER, NURSING_DOMAIN_LABELS, LEVEL_LABELS, WORKFORCE_TURNOVER_DRIVERS, WORKFORCE_RETENTION_INTERVENTIONS, LABOR_MANAGEMENT_INTERVENTIONS } from "./nursingTypes";

export function derivePatientDays(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.staffedBeds * (baseline.bedOccupancy / 100) * 365);
}

export function deriveShiftsPerYear(baseline: NursingBaselineInputs): number {
  return Math.round(baseline.nurseFTEs * 260);
}

export function computeDomainScore(level: NursingLevel): number {
  return SCORE_MAP[level];
}

export function computeTotalScore(domains: Record<NursingDomain, NursingDomainState>): number {
  return NURSING_DOMAIN_ORDER.reduce((sum, d) => {
    const level = domains[d].level;
    return sum + (level ? computeDomainScore(level) : 0);
  }, 0);
}

export function hasAnyDomainSelected(domains: Record<NursingDomain, NursingDomainState>): boolean {
  return NURSING_DOMAIN_ORDER.some(d => domains[d].level !== null);
}

export function getScoreLabel(score: number, domains: Record<NursingDomain, NursingDomainState>): string {
  if (!hasAnyDomainSelected(domains)) return "Not yet assessed";
  if (score <= 25) return "Early stage";
  if (score <= 50) return "Pressure identified";
  if (score <= 75) return "Actively measuring";
  return "Strategically managed";
}

export interface DomainFeedback {
  headline: string;
  context: string;
  formula: string;
  footnote: string;
}

function parseCheckedItems(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv.split(',').filter(Boolean).map(Number);
}

function formatDollar(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString()}K`;
  return `$${value.toLocaleString()}`;
}

export { formatDollar };

export function computeWorkforceFeedback(
  level: NursingLevel,
  inputs: Record<string, string | number>,
  baseline: NursingBaselineInputs,
): DomainFeedback {
  const nurseFTEs = baseline.nurseFTEs;
  const turnoverRate = (inputs.turnoverRate as number) || 0;
  const replacementCost = (inputs.replacementCost as number) || 0;

  if (level === 1) {
    return {
      headline: 'Your retention is stable',
      context: 'If your organization maintains low turnover, the value of documentation burden reduction in this domain is primarily preventive — protecting the stability you already have.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 2) {
    if (turnoverRate > 0 && replacementCost > 0) {
      const departures = Math.round(nurseFTEs * (turnoverRate / 100));
      const totalCost = departures * replacementCost;
      return {
        headline: `${formatDollar(totalCost)} in annual turnover cost`,
        context: `At ${turnoverRate}% turnover across ${nurseFTEs} nurses, your organization replaces approximately ${departures} nurses per year at ${formatDollar(replacementCost)} each.\n\nDocumentation burden is consistently cited as a contributing factor in nursing burnout and turnover. Reducing it doesn't solve retention alone — but it addresses one of the most frequently cited pain points.`,
        formula: `[departures] = ${nurseFTEs} × ${turnoverRate}% = ${departures}\n[totalCost] = ${departures} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}`,
        footnote: 'Estimates based on your inputs. Individual results vary.',
      };
    }
    return {
      headline: '—',
      context: 'Enter your turnover rate and replacement cost to see estimated annual turnover cost.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const checkedDrivers = parseCheckedItems(inputs.turnoverDrivers as string);
    const driverCount = checkedDrivers.length;
    const docBurdenChecked = checkedDrivers.includes(1);

    if (turnoverRate > 0 && replacementCost > 0) {
      const departures = Math.round(nurseFTEs * (turnoverRate / 100));
      const totalCost = departures * replacementCost;
      let driverNarrative = '';
      if (driverCount > 0) {
        const driverLabels = checkedDrivers.map(i => WORKFORCE_TURNOVER_DRIVERS[i]).filter(Boolean);
        driverNarrative = `\n\nYour organization has identified ${driverCount} factor${driverCount > 1 ? 's' : ''} driving turnover:\n${driverLabels.map(l => `• ${l}`).join('\n')}`;
        if (docBurdenChecked) {
          driverNarrative += '\n\nDocumentation burden is one of your identified turnover drivers. This is the area most directly addressable through ambient documentation for nursing.';
        } else {
          driverNarrative += '\n\nDocumentation burden wasn\'t identified as a primary driver. However, it often contributes indirectly through its effect on workload and burnout.';
        }
      }
      return {
        headline: `${formatDollar(totalCost)} in annual turnover cost`,
        context: `At ${turnoverRate}% turnover across ${nurseFTEs} nurses, your organization replaces approximately ${departures} nurses per year.${driverNarrative}`,
        formula: `[departures] = ${nurseFTEs} × ${turnoverRate}% = ${departures}\n[totalCost] = ${departures} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}`,
        footnote: driverCount > 0 ? `${driverCount} turnover driver(s) identified` : '',
      };
    }
    return {
      headline: '—',
      context: 'Enter your turnover rate and replacement cost to see estimated impact.',
      formula: '',
      footnote: '',
    };
  }

  const checkedInterventions = parseCheckedItems(inputs.retentionInterventions as string);
  const interventionCount = checkedInterventions.length;
  const docReductionChecked = checkedInterventions.includes(3);

  if (turnoverRate > 0 && replacementCost > 0) {
    const departures = Math.round(nurseFTEs * (turnoverRate / 100));
    const totalCost = departures * replacementCost;
    let interventionNarrative = '';
    if (interventionCount > 0) {
      const interventionLabels = checkedInterventions.map(i => WORKFORCE_RETENTION_INTERVENTIONS[i]).filter(Boolean);
      interventionNarrative = `\n\nYour organization has ${interventionCount} retention intervention${interventionCount > 1 ? 's' : ''} in place:\n${interventionLabels.map(l => `• ${l}`).join('\n')}`;
      if (docReductionChecked) {
        interventionNarrative += '\n\nDocumentation burden reduction is already part of your retention strategy. Ambient documentation for nursing would deepen this intervention specifically around flowsheet and assessment documentation time.';
      } else {
        interventionNarrative += '\n\nDocumentation burden reduction isn\'t currently part of your retention strategy. It\'s one of the most common nurse-reported frustrations and a practical intervention that complements your existing programs.';
      }
    }
    return {
      headline: `${formatDollar(totalCost)} in annual turnover cost`,
      context: `At ${turnoverRate}% turnover across ${nurseFTEs} nurses, your organization replaces approximately ${departures} nurses per year.${interventionNarrative}`,
      formula: `[departures] = ${nurseFTEs} × ${turnoverRate}% = ${departures}\n[totalCost] = ${departures} × ${formatDollar(replacementCost)} = ${formatDollar(totalCost)}`,
      footnote: interventionCount > 0 ? `${interventionCount} intervention(s) active` : '',
    };
  }
  return {
    headline: '—',
    context: 'Enter your turnover rate and replacement cost to see estimated impact.',
    formula: '',
    footnote: '',
  };
}

export function computeLaborCostFeedback(
  level: NursingLevel,
  inputs: Record<string, string | number>,
  baseline: NursingBaselineInputs,
): DomainFeedback {
  const nurseFTEs = baseline.nurseFTEs;
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  if (level === 1) {
    return {
      headline: 'Labor costs are stable',
      context: 'Your OT and agency usage are within budget. Documentation burden reduction in this domain would be preventive — maintaining stability rather than solving a problem.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 2) {
    const docOTFactor = inputs.docOTFactor as string;
    const otMinPerShift = (inputs.otMinPerShift as number) || 0;

    if (docOTFactor === 'yes' && otMinPerShift > 0) {
      const annualOTHours = Math.round((otMinPerShift * shiftsPerYear) / 60);
      const otCost = Math.round(annualOTHours * 55);
      return {
        headline: `${annualOTHours.toLocaleString()} OT hours from documentation`,
        context: `At ${otMinPerShift} minutes of documentation-driven overtime per shift across ${shiftsPerYear.toLocaleString()} shifts per year, your organization is accumulating approximately ${annualOTHours.toLocaleString()} overtime hours annually from end-of-shift charting.\n\nIf documentation time per shift were reduced by 15–20 minutes, a portion of that time would come directly off end-of-shift overtime.`,
        formula: `[annualOTHours] = ${otMinPerShift} min × ${shiftsPerYear.toLocaleString()} shifts / 60 = ${annualOTHours.toLocaleString()}\n[estimatedCost] = ${annualOTHours.toLocaleString()} × $55/hr (avg OT rate) ≈ ${formatDollar(otCost)}`,
        footnote: 'OT rate estimated at 1.5× average RN hourly rate.',
      };
    }
    if (docOTFactor === 'yes') {
      return {
        headline: 'Documentation contributing to OT',
        context: 'End-of-shift documentation is contributing to nursing overtime. Enter estimated OT minutes per shift to quantify the impact.',
        formula: '',
        footnote: '',
      };
    }
    if (docOTFactor === 'no') {
      return {
        headline: 'OT not documentation-driven',
        context: 'End-of-shift documentation is not a significant factor in your nursing overtime. The connection between documentation burden reduction and OT savings may be limited in your organization.',
        formula: '',
        footnote: '',
      };
    }
    return {
      headline: '—',
      context: 'Indicate whether end-of-shift documentation is contributing to overtime to see estimated impact.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const agencySpend = (inputs.agencyMonthlySpend as number) || 0;
    const agencyDriver = inputs.agencyDriver as string;

    if (agencySpend > 0) {
      const annualSpend = agencySpend * 12;
      let driverNarrative = '';
      if (agencyDriver === 'significant') {
        driverNarrative = '\n\nAgency reliance is directly tied to retention challenges. Documentation burden reduction could help address one of the root causes of turnover driving this spend.';
      } else if (agencyDriver === 'moderate') {
        driverNarrative = '\n\nAgency reliance is partly driven by retention challenges. Addressing documentation burden could reduce one contributor to the turnover cycle.';
      } else if (agencyDriver === 'minimal') {
        driverNarrative = '\n\nYour agency reliance is mostly seasonal or census-driven. The connection to documentation burden is indirect.';
      }
      return {
        headline: `${formatDollar(annualSpend)} annual agency spend`,
        context: `At ${formatDollar(agencySpend)}/month in agency and travel nurse spend (${formatDollar(annualSpend)} annually), even a modest retention-driven reduction could be meaningful.${driverNarrative}`,
        formula: `[annualSpend] = ${formatDollar(agencySpend)} × 12 = ${formatDollar(annualSpend)}`,
        footnote: '',
      };
    }
    return {
      headline: '—',
      context: 'Enter your monthly agency or travel nurse spend to see estimated annual impact.',
      formula: '',
      footnote: '',
    };
  }

  const agencySpend = (inputs.agencyMonthlySpend as number) || 0;
  const checkedInterventions = parseCheckedItems(inputs.laborInterventions as string);
  const interventionCount = checkedInterventions.length;
  const docEfficiencyChecked = checkedInterventions.includes(4);

  if (agencySpend > 0) {
    const annualSpend = agencySpend * 12;
    let narrative = `At ${formatDollar(agencySpend)}/month (${formatDollar(annualSpend)} annually) in agency spend, your organization is actively managing labor costs.`;
    if (interventionCount > 0) {
      const labels = checkedInterventions.map(i => LABOR_MANAGEMENT_INTERVENTIONS[i]).filter(Boolean);
      narrative += `\n\nYou have ${interventionCount} labor management intervention${interventionCount > 1 ? 's' : ''} in place:\n${labels.map(l => `• ${l}`).join('\n')}`;
      if (docEfficiencyChecked) {
        narrative += '\n\nDocumentation efficiency initiatives are already part of your labor strategy. Ambient documentation for nursing would deepen this initiative specifically around flowsheet documentation time.';
      } else {
        narrative += '\n\nDocumentation efficiency isn\'t currently part of your labor strategy. It could complement your existing interventions by addressing one source of overtime and inefficiency.';
      }
    }
    return {
      headline: `${formatDollar(annualSpend)} annual agency spend`,
      context: narrative,
      formula: `[annualSpend] = ${formatDollar(agencySpend)} × 12 = ${formatDollar(annualSpend)}`,
      footnote: interventionCount > 0 ? `${interventionCount} intervention(s) active` : '',
    };
  }
  return {
    headline: '—',
    context: 'Enter your monthly agency or travel nurse spend to see estimated annual impact.',
    formula: '',
    footnote: '',
  };
}

export function computeExperienceFeedback(
  level: NursingLevel,
  inputs: Record<string, string | number>,
  baseline: NursingBaselineInputs,
): DomainFeedback {
  const nurseFTEs = baseline.nurseFTEs;
  const shiftsPerYear = deriveShiftsPerYear(baseline);
  const potentialHours = Math.round((17.5 * shiftsPerYear) / 60);

  const bedsideCalc = nurseFTEs > 0
    ? `If documentation time per shift were reduced by 15–20 minutes, approximately ${potentialHours.toLocaleString()} hours annually could be redirected to direct patient care across your nursing program.`
    : 'If documentation time per shift were reduced by 15–20 minutes, significant hours annually could be redirected to direct patient care.';

  if (level === 1) {
    return {
      headline: 'Burden acknowledged, not measured',
      context: `This is the most common starting point — documentation burden is acknowledged but not formally measured.\n\n${bedsideCalc}`,
      formula: nurseFTEs > 0 ? `[potentialHours] = 17.5 min × ${shiftsPerYear.toLocaleString()} shifts / 60 = ${potentialHours.toLocaleString()} hours` : '',
      footnote: '17.5 min = midpoint of 15–20 minute reduction estimate.',
    };
  }

  if (level === 2) {
    const bedsideGoal = inputs.bedsideGoal as string;
    const burdenSurvey = inputs.burdenSurvey as string;
    let narrative = bedsideCalc;
    if (bedsideGoal) {
      const goalLabels: Record<string, string> = {
        'discussed': 'Bedside time is discussed but not formalized as a goal.',
        'leadership_priority': 'Bedside time is a nursing leadership priority.',
        'quality_goal': 'Bedside time is part of organizational quality goals.',
      };
      narrative += `\n\n${goalLabels[bedsideGoal] || ''}`;
    }
    if (burdenSurvey) {
      const surveyLabels: Record<string, string> = {
        'not_yet': 'No documentation burden survey conducted yet.',
        'informally': 'Documentation burden assessed informally.',
        'structured': 'Structured documentation burden survey completed.',
      };
      narrative += `\n${surveyLabels[burdenSurvey] || ''}`;
    }
    return {
      headline: 'Bedside time is a priority',
      context: narrative,
      formula: nurseFTEs > 0 ? `[potentialHours] = 17.5 min × ${shiftsPerYear.toLocaleString()} shifts / 60 = ${potentialHours.toLocaleString()} hours` : '',
      footnote: '',
    };
  }

  if (level === 3) {
    const checkedMetrics = parseCheckedItems(inputs.experienceMetrics as string);
    let narrative = bedsideCalc;
    if (checkedMetrics.length > 0) {
      const labels = ['Nursing satisfaction/engagement', 'Documentation time per shift', 'Bedside time/direct care hours', 'Documentation burden survey', 'HCAHPS/patient experience'];
      const selected = checkedMetrics.map(i => labels[i]).filter(Boolean);
      narrative += `\n\nYou're measuring ${checkedMetrics.length} experience metric${checkedMetrics.length > 1 ? 's' : ''}:\n${selected.map(l => `• ${l}`).join('\n')}\n\nThese measurements create the baseline for understanding the impact of documentation burden reduction.`;
    }
    return {
      headline: `${checkedMetrics.length} metric${checkedMetrics.length !== 1 ? 's' : ''} being tracked`,
      context: narrative,
      formula: nurseFTEs > 0 ? `[potentialHours] = 17.5 min × ${shiftsPerYear.toLocaleString()} shifts / 60 = ${potentialHours.toLocaleString()} hours` : '',
      footnote: '',
    };
  }

  const checkedAreas = parseCheckedItems(inputs.experienceStrategy as string);
  let narrative = bedsideCalc;
  if (checkedAreas.length > 0) {
    const labels = ['Quality program goals', 'Nursing leadership metrics', 'Magnet/pathway to excellence', 'Patient experience programs', 'Technology investment decisions'];
    const selected = checkedAreas.map(i => labels[i]).filter(Boolean);
    narrative += `\n\nNurse experience metrics factor into ${checkedAreas.length} area${checkedAreas.length > 1 ? 's' : ''} of organizational strategy:\n${selected.map(l => `• ${l}`).join('\n')}\n\nDocumentation burden reduction through ambient technology would contribute measurable data to these strategic areas.`;
  }
  return {
    headline: `${checkedAreas.length} strategic area${checkedAreas.length !== 1 ? 's' : ''} connected`,
    context: narrative,
    formula: nurseFTEs > 0 ? `[potentialHours] = 17.5 min × ${shiftsPerYear.toLocaleString()} shifts / 60 = ${potentialHours.toLocaleString()} hours` : '',
    footnote: '',
  };
}

export function computeQualityFeedback(
  level: NursingLevel,
  inputs: Record<string, string | number>,
): DomainFeedback {
  if (level === 1) {
    return {
      headline: 'Quality not formally assessed',
      context: 'Documentation quality hasn\'t been formally assessed. Flowsheet completeness and consistency vary across units and shifts. Structured, consistent documentation through ambient technology addresses completeness at the point of care.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 2) {
    const checkedGaps = parseCheckedItems(inputs.qualityGaps as string);
    if (checkedGaps.length > 0) {
      const labels = ['Flowsheet completeness varies across shifts', 'Assessment documentation is inconsistent', 'Handoff documentation quality is uneven', 'Care plan updates are frequently incomplete', 'Audit or survey findings cite documentation gaps'];
      const selected = checkedGaps.map(i => labels[i]).filter(Boolean);
      return {
        headline: `${checkedGaps.length} quality gap${checkedGaps.length !== 1 ? 's' : ''} identified`,
        context: `Your organization has identified ${checkedGaps.length} documentation quality gap${checkedGaps.length > 1 ? 's' : ''}:\n${selected.map(l => `• ${l}`).join('\n')}\n\nStructured, consistent flowsheet documentation through ambient technology addresses completeness and consistency at the point of care — before gaps reach compliance review.`,
        formula: '',
        footnote: '',
      };
    }
    return {
      headline: '—',
      context: 'Select where you\'ve identified documentation quality gaps to see assessment.',
      formula: '',
      footnote: '',
    };
  }

  if (level === 3) {
    const checkedMetrics = parseCheckedItems(inputs.qualityMetrics as string);
    if (checkedMetrics.length > 0) {
      const labels = ['Flowsheet completion rates', 'Assessment documentation compliance', 'Handoff quality metrics', 'Audit readiness scores', 'Documentation-related quality events'];
      const selected = checkedMetrics.map(i => labels[i]).filter(Boolean);
      return {
        headline: `${checkedMetrics.length} quality metric${checkedMetrics.length !== 1 ? 's' : ''} tracked`,
        context: `Your organization is tracking ${checkedMetrics.length} documentation quality metric${checkedMetrics.length > 1 ? 's' : ''}:\n${selected.map(l => `• ${l}`).join('\n')}\n\nThese metrics create the measurement framework for understanding how ambient flowsheet documentation affects quality outcomes.`,
        formula: '',
        footnote: '',
      };
    }
    return {
      headline: '—',
      context: 'Select which documentation quality metrics you\'re tracking to see assessment.',
      formula: '',
      footnote: '',
    };
  }

  const checkedGov = parseCheckedItems(inputs.qualityGovernance as string);
  if (checkedGov.length > 0) {
    const labels = ['Quality committee reporting', 'Regulatory compliance framework', 'Magnet/pathway to excellence documentation', 'Patient safety event review', 'Nursing performance metrics'];
    const selected = checkedGov.map(i => labels[i]).filter(Boolean);
    return {
      headline: `${checkedGov.length} governance area${checkedGov.length !== 1 ? 's' : ''} connected`,
      context: `Documentation quality factors into ${checkedGov.length} governance area${checkedGov.length > 1 ? 's' : ''}:\n${selected.map(l => `• ${l}`).join('\n')}\n\nAmbient flowsheet documentation would contribute consistent, structured data to these governance frameworks.`,
      formula: '',
      footnote: '',
    };
  }
  return {
    headline: '—',
    context: 'Select where documentation quality factors into governance to see assessment.',
    formula: '',
    footnote: '',
  };
}

export function computeDomainFeedback(
  domain: NursingDomain,
  level: NursingLevel,
  inputs: Record<string, string | number>,
  baseline: NursingBaselineInputs,
): DomainFeedback {
  switch (domain) {
    case 'workforce': return computeWorkforceFeedback(level, inputs, baseline);
    case 'laborCost': return computeLaborCostFeedback(level, inputs, baseline);
    case 'experience': return computeExperienceFeedback(level, inputs, baseline);
    case 'quality': return computeQualityFeedback(level, inputs);
  }
}

export function generateScoreNarrative(
  domains: Record<NursingDomain, NursingDomainState>,
  baseline: NursingBaselineInputs,
): string {
  const scored = NURSING_DOMAIN_ORDER
    .filter(d => domains[d].level !== null)
    .map(d => ({ domain: d, level: domains[d].level!, score: computeDomainScore(domains[d].level!) }));

  if (scored.length === 0) return 'Complete the domain assessments to see your narrative summary.';

  const sorted = [...scored].sort((a, b) => b.level - a.level);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  let text = `Your nursing program shows the most maturity in ${NURSING_DOMAIN_LABELS[highest.domain].toLowerCase()} (Level ${highest.level}`;
  text += ` — ${LEVEL_LABELS[highest.domain][highest.level]})`;

  if (sorted.length > 1 && lowest.domain !== highest.domain) {
    text += `, with the most opportunity in ${NURSING_DOMAIN_LABELS[lowest.domain].toLowerCase()} (Level ${lowest.level}`;
    text += ` — ${LEVEL_LABELS[lowest.domain][lowest.level]})`;
  }
  text += '.';

  const pressureDomains = scored.filter(s => s.level >= 2 && s.level <= 3);
  if (pressureDomains.length > 0) {
    text += ` ${pressureDomains.length === 1 ? 'One domain shows' : `${pressureDomains.length} domains show`} active pressure where documentation burden reduction could create meaningful impact.`;
  }

  return text;
}

export interface PriorityPathway {
  domain: NursingDomain;
  level: NursingLevel;
  levelLabel: string;
  summary: string;
}

export function computePriorityPathways(
  domains: Record<NursingDomain, NursingDomainState>,
  baseline: NursingBaselineInputs,
): PriorityPathway[] {
  const scored = NURSING_DOMAIN_ORDER
    .filter(d => domains[d].level !== null && domains[d].level! >= 2)
    .map(d => {
      const level = domains[d].level!;
      const feedback = computeDomainFeedback(d, level, domains[d].inputs, baseline);
      return {
        domain: d,
        level,
        levelLabel: LEVEL_LABELS[d][level],
        summary: feedback.context.split('\n')[0],
      };
    });

  scored.sort((a, b) => b.level - a.level);
  return scored.slice(0, 3);
}
