import type { RoiInputs, LeverId } from '../roi-types';
import { leverLabels, leverDescriptions } from '../roi-types';
import type { DriverExplanation, AssumptionItem, ModelSnapshot } from './pdfTypes';

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function generateDriverExplanation(
  driverId: LeverId,
  inputs: RoiInputs,
  driverValue: number
): DriverExplanation {
  const encountersWithAbridge = Math.round(
    inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100)
  );
  const totalHoursReclaimed = (inputs.minutesSavedPerEncounter * encountersWithAbridge) / 60;

  const explanations: Record<LeverId, () => DriverExplanation> = {
    patientAccess: () => {
      const minutesSaved = inputs.minutesSavedPerEncounter;
      const totalMinutes = minutesSaved * encountersWithAbridge;
      const hoursReturned = totalMinutes / 60;
      const realizationPct = inputs.patientAccess.pctTimeToNewVisits;
      const usableHours = hoursReturned * (realizationPct / 100);
      const visitDuration = inputs.patientAccess.avgVisitDurationMinutes;
      const additionalVisits = (usableHours * 60) / visitDuration;
      const revenuePerVisit = inputs.patientAccess.avgNetRevenuePerVisit;

      return {
        title: leverLabels.patientAccess,
        problem: "Documentation is one of healthcare's most persistent operational burdens. Providers spend an average of 2 hours on documentation for every hour of direct patient care. This administrative burden directly limits the number of patients providers can see.",
        solution: "Abridge's ambient documentation returns time to clinical care by automating note generation during patient encounters. This reclaimed time can be converted into additional patient visits, improving access while generating incremental revenue.",
        mathSteps: [
          `Time Saved: ${formatNumber(encountersWithAbridge)} encounters × ${minutesSaved} min = ${formatNumber(totalMinutes)} minutes`,
          `Hours Returned: ${formatNumber(totalMinutes)} ÷ 60 = ${formatNumber(hoursReturned)} hours/year`,
          `Usable Capacity: ${formatNumber(hoursReturned)} hours × ${realizationPct}% realization = ${formatNumber(usableHours)} hours`,
          `Additional Visits: ${formatNumber(usableHours)} hours × 60 ÷ ${visitDuration} min = ${formatNumber(additionalVisits)} visits`,
          `Revenue Impact: ${formatNumber(additionalVisits)} visits × $${revenuePerVisit} = ${formatCurrency(driverValue)}`,
        ],
        meaning: `Your providers save an average of ${minutesSaved} minutes per encounter. With ${formatNumber(encountersWithAbridge)} Abridge-documented encounters, that's ${formatNumber(hoursReturned)} hours returned to clinical care annually.`,
        whyItMatters: "Every additional visit serves a patient who is currently waiting for care. In most markets, demand exceeds supply - these aren't hypothetical visits, they're real patients who can now be seen.",
        assumptions: [
          {
            label: 'Minutes Saved',
            value: `${minutesSaved} min/encounter`,
            description: 'Average documentation time reduction per encounter',
            validation: 'Based on Abridge implementation data across 200+ health systems',
            industryRange: '7-15 minutes typical range',
          },
          {
            label: 'Capacity Realization',
            value: `${realizationPct}%`,
            description: 'Percentage of saved time converted to patient visits',
            validation: 'Not all saved time becomes visits - accounts for scheduling, breaks, quality improvement',
            industryRange: '40-60% typical range',
          },
          {
            label: 'Revenue per Visit',
            value: `$${revenuePerVisit}`,
            description: 'Net collectible revenue after denials and adjustments',
            validation: 'Review actual collections from practice management system',
            industryRange: '$150-350 typical for outpatient',
          },
        ],
        validationGuidance: 'Validate by comparing to current schedule utilization and waitlist depth. If you have significant appointment availability, reduce the realization factor.',
      };
    },

    workforce: () => {
      const providers = inputs.workforce.providerCount;
      const turnoverRate = inputs.workforce.baselineAttritionRate;
      const expectedDepartures = providers * (turnoverRate / 100);
      const burnoutAttribution = inputs.workforce.pctAttritionLinkedToBurnout;
      const burnoutDepartures = expectedDepartures * (burnoutAttribution / 100);
      const abridgePrevention = inputs.workforce.pctBurnoutExitsAvoided;
      const departuresAvoided = burnoutDepartures * (abridgePrevention / 100);
      const costPerDeparture = inputs.workforce.costPerDeparture;

      return {
        title: leverLabels.workforce,
        problem: "Provider turnover costs health systems $500,000-$1,500,000 per departure when accounting for recruiting, onboarding, coverage costs, and lost revenue. Documentation burden is consistently cited as a top driver of burnout and turnover.",
        solution: "By reducing documentation burden, Abridge directly addresses a primary driver of provider burnout. Happier providers stay longer, reducing the enormous costs associated with physician and APP turnover.",
        mathSteps: [
          `Expected Turnover: ${providers} providers × ${turnoverRate}% = ${expectedDepartures.toFixed(1)} departures/year`,
          `Burnout-Related: ${expectedDepartures.toFixed(1)} × ${burnoutAttribution}% = ${burnoutDepartures.toFixed(2)} burnout departures`,
          `Preventable: ${burnoutDepartures.toFixed(2)} × ${abridgePrevention}% = ${departuresAvoided.toFixed(2)} avoided`,
          `Savings: ${departuresAvoided.toFixed(2)} × $${formatNumber(costPerDeparture)} = ${formatCurrency(driverValue)}`,
        ],
        meaning: `With ${providers} providers and typical turnover patterns, Abridge helps retain approximately ${departuresAvoided.toFixed(1)} providers annually who would otherwise leave due to burnout.`,
        whyItMatters: "Provider recruitment is increasingly difficult. Each departure creates patient access gaps, colleague burden, and substantial direct costs. Retention investment has compounding returns.",
        assumptions: [
          {
            label: 'Baseline Turnover',
            value: `${turnoverRate}%`,
            description: 'Annual provider attrition rate',
            validation: 'Compare to your actual 3-year average turnover',
            industryRange: '6-12% for employed physicians',
          },
          {
            label: 'Burnout Attribution',
            value: `${burnoutAttribution}%`,
            description: 'Percentage of departures driven by burnout',
            validation: 'Based on exit interview data and JAMA workforce studies',
            industryRange: '25-50% per academic research',
          },
          {
            label: 'Replacement Cost',
            value: formatCurrency(costPerDeparture),
            description: 'Total cost to replace a departing provider',
            validation: 'Include recruiting, signing bonus, onboarding, lost revenue during vacancy',
            industryRange: '$500K-$1.5M depending on specialty',
          },
        ],
        validationGuidance: 'Request historical turnover data and exit interview themes. If documentation burden is frequently cited, the burnout attribution may be conservative.',
      };
    },

    wrvu: () => {
      const baselineWrvu = inputs.baselineWrvuPerEncounter;
      const currentWrvus = encountersWithAbridge * baselineWrvu;
      const improvementPct = inputs.wrvu.pctIncreaseWrvuPerEncounter;
      const additionalWrvus = currentWrvus * (improvementPct / 100);
      const revenuePerWrvu = inputs.wrvu.wrvuConversionFactor;

      return {
        title: leverLabels.wrvu,
        problem: "Providers often under-code due to time pressure and documentation gaps. When rushing through notes, they may not capture the full complexity of care delivered, leaving revenue on the table.",
        solution: "Abridge's comprehensive, real-time documentation captures clinical detail that supports appropriate E&M coding. Better documentation = more accurate (and often higher) wRVU capture.",
        mathSteps: [
          `Current wRVUs: ${formatNumber(encountersWithAbridge)} encounters × ${baselineWrvu.toFixed(2)} = ${formatNumber(currentWrvus)} wRVUs`,
          `Improvement: ${improvementPct}% lift from better documentation`,
          `Additional wRVUs: ${formatNumber(currentWrvus)} × ${improvementPct}% = ${formatNumber(additionalWrvus)} wRVUs`,
          `Revenue: ${formatNumber(additionalWrvus)} × $${revenuePerWrvu} = ${formatCurrency(driverValue)}`,
        ],
        meaning: `Better documentation enables your coders to capture the true complexity of care. A ${improvementPct}% improvement across ${formatNumber(encountersWithAbridge)} encounters adds ${formatNumber(additionalWrvus)} wRVUs annually.`,
        whyItMatters: "When documentation supports the complexity of care actually delivered, you capture revenue you've already earned.",
        assumptions: [
          {
            label: 'Baseline wRVU',
            value: `${baselineWrvu.toFixed(2)}`,
            description: 'Current average wRVU per encounter',
            validation: 'Pull from practice management system by specialty',
            industryRange: '1.2-2.5 depending on specialty mix',
          },
          {
            label: 'wRVU Improvement',
            value: `${improvementPct}%`,
            description: 'Expected increase from better documentation',
            validation: 'Conservative estimate based on coding gap analyses',
            industryRange: '3-8% typical improvement',
          },
          {
            label: 'Conversion Factor',
            value: `$${revenuePerWrvu}`,
            description: 'Revenue per wRVU (blended payer mix)',
            validation: 'Calculate from total professional revenue ÷ total wRVUs',
            industryRange: '$38-55 typical range',
          },
        ],
        validationGuidance: 'Review a sample of current notes vs. Abridge notes with your coding team. They can estimate realistic improvement potential.',
      };
    },

    hcc: () => {
      const uniquePatients = Math.round(encountersWithAbridge / 2.5);
      const maPct = inputs.hcc.pctMedicareAdvantage;
      const maPatients = Math.round(uniquePatients * (maPct / 100));
      const conditionsPerMember = inputs.hcc.avgConditionsPerMember;
      const totalConditions = maPatients * conditionsPerMember;
      const missedPct = inputs.hcc.pctConditionsMissed;
      const missedConditions = totalConditions * (missedPct / 100);
      const recapturePct = inputs.hcc.pctMissedConditionsRecaptured;
      const recaptured = missedConditions * (recapturePct / 100);

      return {
        title: leverLabels.hcc,
        problem: "Medicare Advantage plans adjust payments based on documented diagnoses (HCC codes). Many chronic conditions go undocumented visit-to-visit, leading to understated patient complexity and reduced capitated payments.",
        solution: "Abridge surfaces relevant historical diagnoses during encounters, prompting providers to address and document chronic conditions. This closes the 'diagnostic gap' that costs health systems millions annually.",
        mathSteps: [
          `Unique MA Patients: ${formatNumber(encountersWithAbridge)} encounters ÷ 2.5 visits/patient × ${maPct}% = ${formatNumber(maPatients)}`,
          `Total Conditions: ${formatNumber(maPatients)} patients × ${conditionsPerMember} conditions = ${formatNumber(totalConditions)}`,
          `Documentation Gap: ${formatNumber(totalConditions)} × ${missedPct}% missed = ${formatNumber(missedConditions)} undocumented`,
          `Recaptured: ${formatNumber(missedConditions)} × ${recapturePct}% = ${formatNumber(recaptured)} conditions documented`,
          `Revenue Impact: RAF score improvement × PMPM × 12 months = ${formatCurrency(driverValue)}`,
        ],
        meaning: `With ${formatNumber(maPatients)} Medicare Advantage patients and typical diagnostic gaps, Abridge helps capture approximately ${formatNumber(recaptured)} chronic conditions that would otherwise go undocumented.`,
        whyItMatters: "Each documented HCC condition improves RAF scores and increases capitated payment. This isn't adding diagnoses - it's documenting conditions that are clinically present but administratively invisible.",
        assumptions: [
          {
            label: 'MA Population',
            value: `${maPct}%`,
            description: 'Percentage of patients on Medicare Advantage',
            validation: 'Pull from payer mix report',
            industryRange: '20-50% depending on market',
          },
          {
            label: 'Avg Conditions',
            value: `${conditionsPerMember}`,
            description: 'Average HCC conditions per MA member',
            validation: 'Review current RAF data from MA plans',
            industryRange: '2.5-4.5 typical for primary care',
          },
          {
            label: 'Gap Rate',
            value: `${missedPct}%`,
            description: 'Percentage of conditions not documented annually',
            validation: 'Compare prior year diagnoses to current year capture',
            industryRange: '15-30% industry average gap',
          },
        ],
        validationGuidance: 'Request a "suspect conditions" report from your MA plans. This shows conditions documented in prior years but not yet recaptured this year.',
      };
    },

    denials: () => {
      const avgRevenue = inputs.denials.avgRevenuePerEncounter;
      const totalRevenue = encountersWithAbridge * avgRevenue;
      const denialRate = inputs.denials.baselineDenialRate;
      const deniedAmount = totalRevenue * (denialRate / 100);
      const docPct = inputs.denials.pctDenialsFromDocumentation;
      const docDenials = deniedAmount * (docPct / 100);
      const preventPct = inputs.denials.pctDocDenialsRecovered;

      return {
        title: leverLabels.denials,
        problem: "Claims denials cost the average health system 2-5% of net revenue. A significant portion of denials stem from documentation issues - missing information, inadequate medical necessity, or unclear clinical rationale.",
        solution: "Abridge creates comprehensive, real-time documentation that captures the clinical reasoning payers need. Complete notes = fewer denial triggers.",
        mathSteps: [
          `Revenue Base: ${formatNumber(encountersWithAbridge)} encounters × $${avgRevenue} = ${formatCurrency(totalRevenue)}`,
          `Baseline Denials: ${formatCurrency(totalRevenue)} × ${denialRate}% = ${formatCurrency(deniedAmount)}`,
          `Doc-Related: ${formatCurrency(deniedAmount)} × ${docPct}% = ${formatCurrency(docDenials)}`,
          `Prevented: ${formatCurrency(docDenials)} × ${preventPct}% = ${formatCurrency(driverValue)}`,
        ],
        meaning: `Documentation-related denials cost your practice approximately ${formatCurrency(docDenials)} annually. With better upfront documentation, ${formatPercent(preventPct)} of these can be prevented.`,
        whyItMatters: "Denial prevention is more valuable than denial management. Each avoided denial saves not just the revenue at risk, but the administrative cost of appeals (averaging $25-45 per claim).",
        assumptions: [
          {
            label: 'Denial Rate',
            value: `${denialRate}%`,
            description: 'Baseline claims denial rate',
            validation: 'Pull from revenue cycle reports',
            industryRange: '5-12% industry average',
          },
          {
            label: 'Doc-Related',
            value: `${docPct}%`,
            description: 'Percentage of denials from documentation issues',
            validation: 'Categorize denial reasons from recent data',
            industryRange: '25-45% of all denials',
          },
          {
            label: 'Prevention Rate',
            value: `${preventPct}%`,
            description: 'Documentation denials preventable with Abridge',
            validation: 'Conservative estimate based on implementation data',
            industryRange: '40-70% improvement typical',
          },
        ],
        validationGuidance: 'Review denial reason codes. Categories like "incomplete documentation", "medical necessity", and "clinical information" are addressable with better notes.',
      };
    },

    overtime: () => {
      const afterHoursPct = inputs.overtime.pctAfterHours;
      const afterHours = totalHoursReclaimed * (afterHoursPct / 100);
      const otReductionPct = inputs.overtime.pctOvertimeReduced;
      const otAvoided = afterHours * (otReductionPct / 100);
      const otRate = inputs.overtime.blendedOvertimeRate;

      return {
        title: leverLabels.overtime,
        problem: "Providers completing documentation outside clinical hours accumulate overtime costs while degrading work-life balance. 'Pajama time' documentation is a major driver of burnout and represents direct cost to the organization.",
        solution: "When documentation is completed in real-time during encounters, after-hours 'catch-up' work decreases. This reduces overtime costs and improves provider satisfaction.",
        mathSteps: [
          `Hours Reclaimed: ${formatNumber(totalHoursReclaimed)} total hours saved`,
          `After-Hours: ${formatNumber(totalHoursReclaimed)} × ${afterHoursPct}% = ${formatNumber(afterHours)} hours`,
          `OT Avoided: ${formatNumber(afterHours)} × ${otReductionPct}% = ${formatNumber(otAvoided)} hours`,
          `Savings: ${formatNumber(otAvoided)} hours × $${otRate}/hr = ${formatCurrency(driverValue)}`,
        ],
        meaning: `Of the ${formatNumber(totalHoursReclaimed)} hours saved, approximately ${formatNumber(afterHours)} would have occurred after hours. Eliminating ${formatPercent(otReductionPct)} of this after-hours work saves ${formatNumber(otAvoided)} overtime hours.`,
        whyItMatters: "Overtime isn't just a cost - it's a symptom of unsustainable workload. Reducing after-hours documentation improves provider wellbeing and reduces turnover risk.",
        assumptions: [
          {
            label: 'After-Hours %',
            value: `${afterHoursPct}%`,
            description: 'Percentage of documentation done outside clinic hours',
            validation: 'Survey providers or review EHR login times',
            industryRange: '20-40% typical for employed providers',
          },
          {
            label: 'OT Reduction',
            value: `${otReductionPct}%`,
            description: 'After-hours time eliminated with real-time documentation',
            validation: 'Based on Abridge implementation data',
            industryRange: '60-90% reduction typical',
          },
          {
            label: 'OT Rate',
            value: `$${otRate}/hr`,
            description: 'Blended overtime hourly rate',
            validation: 'Calculate from payroll data including benefits',
            industryRange: '$75-200/hr depending on provider type',
          },
        ],
        validationGuidance: 'Check EHR audit logs for after-hours login patterns. This directly validates the after-hours percentage assumption.',
      };
    },
  };

  return explanations[driverId]();
}

export function generateExecutiveSummaryContent(model: ModelSnapshot): {
  headline: string;
  context: string;
  keyFindings: string[];
  recommendation: string;
} {
  const { results, enabledDrivers, careSettingLabel } = model;
  const roiMultiple = results.roiMultiple;
  const netGain = results.netValueCreated;

  return {
    headline: `Abridge implementation in ${careSettingLabel} is projected to generate ${formatCurrency(results.totalAnnualBenefit)} in annual value, representing a ${roiMultiple.toFixed(1)}x return on investment.`,
    context: `This analysis models the financial impact of deploying Abridge ambient documentation across ${model.inputs.numberOfProviders} providers with ${formatNumber(model.inputs.annualOutpatientEncounters)} annual encounters at ${model.inputs.abridgeUtilizationPct}% utilization rate.`,
    keyFindings: [
      `Total Annual Benefit: ${formatCurrency(results.totalAnnualBenefit)}`,
      `Annual Investment: ${formatCurrency(results.annualAbridgeCost)}`,
      `Net Annual Value Created: ${formatCurrency(netGain)}`,
      `ROI Multiple: ${roiMultiple.toFixed(1)}x`,
      `Value Drivers Analyzed: ${enabledDrivers.length} (${enabledDrivers.map(d => leverLabels[d]).join(', ')})`,
    ],
    recommendation: netGain > 0
      ? `Based on this analysis, Abridge implementation is projected to be a net-positive investment with significant ROI. The ${formatCurrency(netGain)} in annual net value represents real financial improvement through ${enabledDrivers.length} distinct value creation pathways.`
      : `While the projected benefits are substantial, further optimization of implementation parameters may be needed to achieve a positive ROI.`,
  };
}

export function generateFilename(
  exportType: 'baseline' | 'scenario' | 'comparison',
  organizationName?: string,
  scenarioName?: string
): string {
  const date = new Date().toISOString().split('T')[0];
  const sanitizedOrg = (organizationName || 'Organization').replace(/[^a-zA-Z0-9]/g, '_');

  switch (exportType) {
    case 'baseline':
      return `Abridge_ROI_Model_${sanitizedOrg}_${date}.pdf`;
    case 'scenario':
      const sanitizedScenario = (scenarioName || 'Scenario').replace(/[^a-zA-Z0-9]/g, '_');
      return `Abridge_ROI_${sanitizedScenario}_${sanitizedOrg}_${date}.pdf`;
    case 'comparison':
      return `Abridge_ROI_Comparison_${sanitizedOrg}_${date}.pdf`;
    default:
      return `Abridge_ROI_Export_${date}.pdf`;
  }
}
