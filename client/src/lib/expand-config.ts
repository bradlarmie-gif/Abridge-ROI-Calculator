import { DollarSign, Clock, FileCheck, FileText, Moon, Smile } from "lucide-react";

export type MetricId = "wrvuCapture" | "timeSavings" | "chartClosure" | "levelOfService" | "workOutsideWork" | "clinicianSatisfaction";

export interface BenchmarkRange {
  min: number;
  max: number;
  unit: string;
  whisper: string;
}

export interface MetricConfig {
  id: MetricId;
  name: string;
  description: string;
  icon: typeof DollarSign;
  iconBg: string;
  iconColor: string;
  unit: string;
  benchmarkText: string;
  isPositiveGood: boolean;
  step: number;
  benchmarkRange: BenchmarkRange;
  defaultBefore: number;
  defaultAfter: number;
}

export const METRIC_CONFIGS: Record<MetricId, MetricConfig> = {
  wrvuCapture: {
    id: "wrvuCapture",
    name: "wRVU per Encounter",
    description: "Revenue capture improvement",
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    unit: "wRVU/enc",
    benchmarkText: "Abridge customers typically see 3-9% lift",
    isPositiveGood: true,
    step: 0.01,
    benchmarkRange: {
      min: 1.8,
      max: 2.8,
      unit: "wRVU",
      whisper: "Typical range: 1.8 - 2.8 wRVU/encounter",
    },
    defaultBefore: 2.1,
    defaultAfter: 2.3,
  },
  timeSavings: {
    id: "timeSavings",
    name: "Time in Notes",
    description: "Documentation efficiency",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    unit: "min",
    benchmarkText: "Average reduction: 2-4.5 min per encounter",
    isPositiveGood: false,
    step: 0.1,
    benchmarkRange: {
      min: 2,
      max: 12,
      unit: "min",
      whisper: "Typical: 2-12 min/encounter",
    },
    defaultBefore: 10,
    defaultAfter: 2,
  },
  chartClosure: {
    id: "chartClosure",
    name: "Same-Day Chart Closure",
    description: "Revenue cycle acceleration",
    icon: FileCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    unit: "%",
    benchmarkText: "Typical improvement: 5-15 percentage points",
    isPositiveGood: true,
    step: 1,
    benchmarkRange: {
      min: 40,
      max: 95,
      unit: "%",
      whisper: "Typical: 40-95% same-day closure",
    },
    defaultBefore: 60,
    defaultAfter: 85,
  },
  levelOfService: {
    id: "levelOfService",
    name: "Average E&M Level",
    description: "Coding accuracy",
    icon: FileText,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    unit: "avg level",
    benchmarkText: "Typical increase: 0.2-0.5 levels",
    isPositiveGood: true,
    step: 0.01,
    benchmarkRange: {
      min: 3.0,
      max: 4.5,
      unit: "level",
      whisper: "Typical average: 3.0-4.5",
    },
    defaultBefore: 3.5,
    defaultAfter: 3.8,
  },
  workOutsideWork: {
    id: "workOutsideWork",
    name: "Work Outside of Work",
    description: "After-hours burden",
    icon: Moon,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    unit: "hrs/week",
    benchmarkText: "Typical reduction: 2-5 hours per week",
    isPositiveGood: false,
    step: 0.1,
    benchmarkRange: {
      min: 0,
      max: 10,
      unit: "hrs",
      whisper: "Typical: 0-10 hrs/week",
    },
    defaultBefore: 8,
    defaultAfter: 3,
  },
  clinicianSatisfaction: {
    id: "clinicianSatisfaction",
    name: "Clinician Satisfaction",
    description: "Provider experience",
    icon: Smile,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    unit: "pts",
    benchmarkText: "Average improvement: 10-20 points",
    isPositiveGood: true,
    step: 1,
    benchmarkRange: {
      min: 50,
      max: 100,
      unit: "pts",
      whisper: "Typical: 50-100 points",
    },
    defaultBefore: 65,
    defaultAfter: 85,
  },
};

export interface TermDefinition {
  term: string;
  short: string;
  full: string;
}

export const TERM_DEFINITIONS: Record<string, TermDefinition> = {
  wRVU: {
    term: "wRVU",
    short: "Work Relative Value Unit",
    full: "A measure of physician productivity based on the resources required for a service. Higher wRVU = more complex care = higher reimbursement.",
  },
  attribution: {
    term: "Attribution %",
    short: "How much credit Abridge gets",
    full: "The percentage of improvement attributed to Abridge vs. other factors. Conservative estimates use 50% attribution to account for other workflow changes.",
  },
  conversionRate: {
    term: "Conversion Rate",
    short: "Time savings → dollars",
    full: "How time saved converts to value. Patient Access assumes saved time = more patients seen. Overtime assumes saved time = reduced after-hours costs.",
  },
  utilization: {
    term: "Utilization Rate",
    short: "% of providers using Abridge",
    full: "The percentage of providers actively using Abridge for documentation. Higher utilization = more value captured across your organization.",
  },
  sameDayClosure: {
    term: "Same-Day Chart Closure",
    short: "Charts completed same day",
    full: "Percentage of patient charts completed on the same day as the visit. Faster closure = faster billing = better cash flow.",
  },
  emLevel: {
    term: "E&M Level",
    short: "Evaluation & Management code",
    full: "The complexity level (1-5) of a patient visit. Higher levels indicate more complex care and higher reimbursement. Abridge captures complexity that might otherwise be missed.",
  },
  pajamaTime: {
    term: "Pajama Time",
    short: "Work outside work hours",
    full: "Time spent on documentation after hours, at home, on weekends. This 'hidden' work contributes to burnout and reduces quality of life.",
  },
  tier1Value: {
    term: "Core Financial Value",
    short: "Direct revenue impact",
    full: "Hard dollar value from wRVU improvements. This is measurable revenue captured through better documentation that translates directly to reimbursement.",
  },
  tier2Value: {
    term: "Operational Efficiency",
    short: "Time savings value",
    full: "Value from time saved, converted through your chosen method (patient access, overtime reduction, or not monetized). Represents operational improvement.",
  },
  tier3Value: {
    term: "Strategic Indicators",
    short: "Leading success signals",
    full: "Quality of life and satisfaction improvements that predict retention, engagement, and long-term organizational health. Harder to monetize but critical for sustainability.",
  },
};

export const VALUE_CONFIG_DEFAULTS = {
  wrvuValue: 33,
  wrvuAttribution: 50,
  hourlyRate: 150,
  timeConversionMethod: "none" as "none" | "patientAccess" | "overtime",
  patientAccessConversion: 15,
  overtimeConversion: 20,
  retentionEnabled: false,
  retentionCostPerProvider: 250000,
  retentionImpactPercent: 2,
};

export const SLIDER_BOUNDS = {
  wrvuValue: { min: 20, max: 50, step: 1 },
  wrvuAttribution: { min: 25, max: 75, step: 5 },
  hourlyRate: { min: 100, max: 300, step: 10 },
  patientAccessConversion: { min: 5, max: 30, step: 1 },
  overtimeConversion: { min: 10, max: 40, step: 1 },
  retentionCostPerProvider: { min: 100000, max: 500000, step: 25000 },
  retentionImpactPercent: { min: 1, max: 5, step: 0.5 },
};
