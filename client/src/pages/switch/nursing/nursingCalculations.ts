import type { NursingInputs, PathwayKey, PathwayResult } from "./nursingTypes";

export function derivePatientDays(inputs: NursingInputs): number {
  return Math.round(inputs.staffedBeds * (inputs.bedOccupancy / 100) * 365);
}

export function deriveShiftsPerYear(inputs: NursingInputs): number {
  return Math.round(inputs.nurseFTEs * 365 * (2 / 3));
}

export function totalDocMinPerShift(inputs: NursingInputs): number {
  return inputs.docTimeFlowsheets + inputs.docTimeCare + inputs.docTimeHandoff + inputs.docTimeOther;
}

const PATHWAY_BURDEN_MAP: Record<PathwayKey, string[]> = {
  overtime: ["overtime_late", "ot_budget"],
  retention: ["engagement_surveys", "experienced_frustration", "exit_interviews"],
  agency: ["agency_reliance"],
  bedside: ["bedside_time"],
  quality: ["flowsheet_completeness", "handoff_quality", "onboarding_struggle"],
};

const PATHWAY_LABELS: Record<PathwayKey, string> = {
  overtime: "Overtime & Schedule Adherence",
  retention: "Nurse Retention",
  agency: "Agency & Travel Nurse Reliance",
  bedside: "Time at the Bedside",
  quality: "Documentation Quality & Compliance",
};

export { PATHWAY_LABELS };

function getBurdenRelevanceScore(pathway: PathwayKey, indicators: string[]): number {
  const mapped = PATHWAY_BURDEN_MAP[pathway];
  return mapped.filter(id => indicators.includes(id)).length;
}

function getPathwayResponseRelevance(pathway: PathwayKey, inputs: NursingInputs): "positive" | "neutral" | "negative" | "none" {
  switch (pathway) {
    case "overtime":
      if (inputs.otRelevance === "yes") return "positive";
      if (inputs.otRelevance === "somewhat") return "neutral";
      if (inputs.otRelevance === "not_really") return "negative";
      return "none";
    case "retention":
      if (inputs.retentionRelevance === "yes") return "positive";
      if (inputs.retentionRelevance === "anecdotally") return "neutral";
      if (inputs.retentionRelevance === "not_tracked") return "negative";
      return "none";
    case "agency":
      if (inputs.agencyReliance === "significant" || inputs.agencyReliance === "moderate") return "positive";
      if (inputs.agencyReliance === "minimal") return "neutral";
      if (inputs.agencyReliance === "no") return "negative";
      return "none";
    case "bedside":
      if (inputs.bedsidePriority === "key_initiative") return "positive";
      if (inputs.bedsidePriority === "talk_about") return "neutral";
      if (inputs.bedsidePriority === "not_focus") return "negative";
      return "none";
    case "quality":
      if (inputs.qualityConcern === "yes") return "positive";
      if (inputs.qualityConcern === "somewhat") return "neutral";
      if (inputs.qualityConcern === "not_significant") return "negative";
      return "none";
  }
}

export function computePathwayRelevance(pathway: PathwayKey, inputs: NursingInputs): "high" | "moderate" | "low" {
  const burdenScore = getBurdenRelevanceScore(pathway, inputs.burdenIndicators);
  const response = getPathwayResponseRelevance(pathway, inputs);

  if (burdenScore > 0 && (response === "positive" || response === "neutral")) return "high";
  if (burdenScore > 0 || response === "positive") return "moderate";
  if (response === "neutral") return "moderate";
  if (response === "negative") return "low";
  return "low";
}

export function computeDataAvailable(pathway: PathwayKey, inputs: NursingInputs): "yes" | "some" | "limited" | "no" {
  switch (pathway) {
    case "overtime": {
      if (inputs.otMinPerShift > 0 && inputs.otRelevance) return "yes";
      if (inputs.otRelevance) return "some";
      return "no";
    }
    case "retention": {
      if (inputs.turnoverRate > 0 && inputs.retentionRelevance) return "yes";
      if (inputs.retentionRelevance || inputs.turnoverRate > 0) return "some";
      return "no";
    }
    case "agency": {
      if (inputs.agencyMonthlySpend > 0 && inputs.agencyReliance) return "yes";
      if (inputs.agencyReliance) return "some";
      return "no";
    }
    case "bedside": {
      if (inputs.bedsidePriority && inputs.bedsideTracking) return "some";
      if (inputs.bedsidePriority) return "limited";
      return "no";
    }
    case "quality": {
      if (inputs.qualityConcern) return "limited";
      return "no";
    }
  }
}

export function computeAllPathways(inputs: NursingInputs): PathwayResult[] {
  const keys: PathwayKey[] = ["overtime", "retention", "agency", "bedside", "quality"];
  const results: PathwayResult[] = keys.map(key => ({
    key,
    label: PATHWAY_LABELS[key],
    relevance: computePathwayRelevance(key, inputs),
    dataAvailable: computeDataAvailable(key, inputs),
  }));

  const order: Record<string, number> = { high: 0, moderate: 1, low: 2 };
  results.sort((a, b) => order[a.relevance] - order[b.relevance]);

  return results;
}

export function computeRetentionCost(inputs: NursingInputs): number {
  if (inputs.turnoverRate <= 0 || inputs.nurseFTEs <= 0) return 0;
  const departures = Math.round(inputs.nurseFTEs * (inputs.turnoverRate / 100));
  return departures * 50000;
}

export function computeOvertimeNarrative(inputs: NursingInputs): string {
  if (inputs.otMinPerShift > 0 && inputs.nurseFTEs > 0) {
    const shiftsPerYear = deriveShiftsPerYear(inputs);
    const annualOTHours = Math.round((inputs.otMinPerShift * shiftsPerYear) / 60);
    return `At ${inputs.otMinPerShift} minutes of documentation-driven overtime per shift across ${shiftsPerYear.toLocaleString()} shifts per year, your organization is accumulating approximately ${annualOTHours.toLocaleString()} overtime hours annually from end-of-shift charting alone.`;
  }
  return "If documentation time per shift were reduced, a portion of that time would come directly off end-of-shift overtime. The size of the impact depends on how much of your current OT is documentation-driven.";
}

export function computeRetentionNarrative(inputs: NursingInputs): string {
  if (inputs.turnoverRate > 0 && inputs.nurseFTEs > 0) {
    const departures = Math.round(inputs.nurseFTEs * (inputs.turnoverRate / 100));
    const cost = computeRetentionCost(inputs);
    return `At ${inputs.turnoverRate}% turnover with ${inputs.nurseFTEs} nurse FTEs, your organization sees approximately ${departures} departures annually — representing roughly $${(cost / 1000).toFixed(0)}K in replacement costs using the $50K midpoint (NSI range: $40K–$65K). The portion connected to documentation burden is what a deeper conversation would explore.`;
  }
  return "Turnover at your scale represents significant replacement costs. The portion connected to documentation burden is what we'd explore together. Even a modest impact on retention has an outsized financial effect.";
}

export function computeAgencyNarrative(inputs: NursingInputs): string {
  if (inputs.agencyMonthlySpend > 0) {
    const annual = inputs.agencyMonthlySpend * 12;
    return `At $${inputs.agencyMonthlySpend.toLocaleString()}/month in agency and travel nurse spend ($${(annual / 1000).toFixed(0)}K annually), even a modest retention-driven reduction could be meaningful. Agency reliance is often a downstream symptom of retention challenges — if documentation burden reduction contributes to better retention over 6–12 months, the effect on agency spend could be substantial.`;
  }
  return "Agency reliance is a symptom of retention challenges. If documentation burden reduction contributes to better retention over time, the downstream effect on agency spend could be substantial.";
}

export function computeBedsideNarrative(inputs: NursingInputs): string {
  const docMin = totalDocMinPerShift(inputs);
  if (docMin > 0 && inputs.nurseFTEs > 0) {
    const potentialMinSaved = Math.round(docMin * 0.15);
    const annualHours = Math.round((potentialMinSaved * deriveShiftsPerYear(inputs)) / 60);
    return `If documentation time per shift were reduced by even ${potentialMinSaved} minutes (15% of current ${docMin} min), that time could return to direct patient care. Across ${inputs.nurseFTEs} nurses over a year, that's approximately ${annualHours.toLocaleString()} additional bedside hours.`;
  }
  return "If documentation time per shift were reduced, that time could return to direct patient care. The connection to patient experience, safety, and quality outcomes is well-established.";
}

export function generateSummaryNarrative(pathways: PathwayResult[], inputs: NursingInputs): string {
  const high = pathways.filter(p => p.relevance === "high");
  const moderate = pathways.filter(p => p.relevance === "moderate");
  const noData = pathways.filter(p => p.dataAvailable === "no" || p.dataAvailable === "limited");

  let text = "";
  if (high.length > 0) {
    const names = high.map(p => p.label.toLowerCase().replace(/ & /g, " and "));
    text += `Your organization's documentation burden is most likely to create measurable value through ${names.join(" and ")}. ${high.length === 1 ? "This is your primary pathway." : "These are your primary pathways."} `;
  } else if (moderate.length > 0) {
    text += "Several pathways show moderate relevance based on your burden profile. ";
  } else {
    text += "Based on your responses, documentation burden appears manageable across most pathways. ";
  }

  if (noData.length > 0 && noData.length < pathways.length) {
    const unmeasured = noData.slice(0, 2).map(p => p.label.toLowerCase().replace(/ & /g, " and "));
    text += `${unmeasured.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" and ")} ${noData.length === 1 ? "hasn't" : "haven't"} been measured yet — establishing metrics here would strengthen the case. `;
  }

  if (moderate.length > 0 && high.length > 0) {
    const modNames = moderate.slice(0, 2).map(p => p.label.toLowerCase().replace(/ & /g, " and "));
    text += `${modNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" and ")} ${moderate.length === 1 ? "shows" : "show"} moderate relevance and could see impact over time. `;
  }

  text += "When you're ready to explore specific numbers, these pathways will be the focus of a deeper ROI conversation.";
  return text;
}

export function formatDollar(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
}
