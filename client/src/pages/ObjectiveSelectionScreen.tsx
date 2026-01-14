import { useState, useMemo, useRef, useEffect } from "react";
import { BackgroundShape } from "@/components/BackgroundShape";
import { LiveReceipt } from "@/components/LiveReceipt";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";
import {
  CARE_SETTING_LABELS,
  getLeversByCategory,
  SETTING_CONFIG,
  type CareSettingType,
  type AllSettingType,
  type LeverConfig,
  type LeverCategory,
} from "@/lib/SETTING_CONFIG";
import { formatNumber, parseFormattedNumber } from "@/lib/roi-calculator";
import {
  Stethoscope,
  Siren,
  HeartPulse,
  Building2,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
  FileText,
  ArrowLeft,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Info,
  Lightbulb,
  Target,
  Calculator,
  Settings,
  BarChart3,
  ArrowRight,
  Sliders,
  Zap,
  FileX,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SelectedLever {
  settingId: CareSettingType;
  leverId: string;
  active: boolean;
}

import { type RoiInputs } from "@/lib/roi-types";

interface ObjectiveSelectionScreenProps {
  onComplete: (
    selectedSettings: CareSettingType[],
    selectedLevers: SelectedLever[],
    seedInputs?: Partial<RoiInputs>,
  ) => void;
  initialSelectedSettings?: CareSettingType[];
  initialSelectedLevers?: SelectedLever[];
}

const SETTING_ICONS: Record<AllSettingType, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Siren,
  nursing: HeartPulse,
  inpatient: Building2,
};

const CATEGORY_ICONS: Record<LeverCategory, typeof Clock> = {
  time: Clock,
  documentation: FileText,
};

const CATEGORY_SUBTITLES: Record<LeverCategory, string> = {
  time: "Workforce efficiency and utilization",
  documentation: "Clinical and financial accuracy",
};

const LEVER_ICONS: Record<string, typeof Users> = {
  patientAccess: Users,
  overtime: Clock,
  workforce: Users,
  retention: HeartPulse,
  wrvu: BarChart3,
  hcc: Building2,
  denials: AlertTriangle,
  hccCapture: Building2,
  denialReduction: AlertTriangle,
  edThroughput: Zap,
  edStaffingEfficiency: Clock,
  edRetention: HeartPulse,
  edLevelOfService: BarChart3,
  edDocCompliance: FileText,
  rnDocTime: Clock,
  rnCommunication: Users,
  rnSafetyReduction: AlertTriangle,
  rnDiagnosisSeverity: Building2,
};

const LEVER_KEY_METRICS: Record<string, string> = {
  patientAccess: "New visits enabled",
  overtime: "Premium labor hours avoided",
  workforce: "Staff hours reclaimed",
  retention: "Provider departures avoided",
  wrvu: "wRVU capture improvement",
  hcc: "RAF score lift",
  denials: "Documentation-related denials prevented",
  hccCapture: "RAF score lift",
  denialReduction: "Documentation-related denials prevented",
  edThroughput: "Additional patients per day",
  edStaffingEfficiency: "Staff hours saved",
  edRetention: "Staff departures avoided",
  edLevelOfService: "wRVU capture improvement",
  edDocCompliance: "Documentation compliance rate",
  rnDocTime: "Documentation time saved",
  rnCommunication: "Handoff efficiency improvement",
  rnSafetyReduction: "Safety events prevented",
  rnDiagnosisSeverity: "DRG accuracy improvement",
};

const ALL_SETTINGS: AllSettingType[] = [
  "outpatient",
  "ed",
  "nursing",
  "inpatient",
];

type Page = "orientation" | "setting" | "priorities" | "value-blueprint" | "model-setup";

// Value posture presets for Step 2 (moved outside component to avoid recreation each render)
type ValuePosture = "conservative" | "typical" | "aggressive" | "custom";

const POSTURE_PRESETS: Record<Exclude<ValuePosture, "custom">, { minutes: number; realization: number; wrvu: number }> = {
  conservative: { minutes: 2, realization: 10, wrvu: 3 },
  typical: { minutes: 2.5, realization: 20, wrvu: 5 },
  aggressive: { minutes: 4, realization: 30, wrvu: 7 },
};

// Reference scenario defaults for Value Methodology
const REFERENCE_SCENARIO = {
  providers: 40,
  annualVisits: 80000,
  adoptionPercent: 65,
  get documentedEncounters() {
    return Math.round(this.annualVisits * (this.adoptionPercent / 100));
  },
};

// Value driver content for the Blueprint page
interface DriverContent {
  id: string;
  label: string;
  icon: typeof Clock;
  theory: string;
  calculationSteps: {
    title: string;
    steps: { label: string; value: string; note?: string }[];
  }[];
  keyVariables: string[];
  rangeData: { conservative: string; typical: string; aggressive?: string };
  referenceValue: number;
}

const DRIVER_CONTENT: Record<string, DriverContent> = {
  patientAccess: {
    id: "patientAccess",
    label: "Patient Access",
    icon: Users,
    theory: "When providers spend less time on documentation, that time can partially convert into seeing more patients—reducing access bottlenecks and wait times. This value assumes patient demand exists to fill additional capacity.",
    calculationSteps: [
      {
        title: "STEP 1: TIME RETURNED",
        steps: [
          { label: "Minutes saved per encounter", value: "2.5 min", note: "(typical)" },
          { label: "Documented encounters", value: "52,000" },
          { label: "Hours returned annually", value: "2,167 hrs" },
        ],
      },
      {
        title: "STEP 2: REALIZED CAPACITY",
        steps: [
          { label: "Not all time becomes new visits", value: "", note: "(admin, rest, etc)" },
          { label: "Realization factor", value: "20%", note: "(typical)" },
          { label: "Usable hours", value: "433 hrs" },
        ],
      },
      {
        title: "STEP 3: NEW VISIT CAPACITY",
        steps: [
          { label: "Usable hours", value: "433" },
          { label: "Avg visit duration", value: "30 min" },
          { label: "Additional visits possible", value: "866 visits" },
          { label: "Assumes sufficient patient demand to fill additional capacity", value: "", note: "warning" },
        ],
      },
      {
        title: "STEP 4: REVENUE IMPACT",
        steps: [
          { label: "Additional visits", value: "866" },
          { label: "Net revenue per visit", value: "$200" },
          { label: "Annual value", value: "$173,200" },
        ],
      },
    ],
    keyVariables: ["Provider count", "Visit volume", "Revenue per visit", "Capacity conversion %"],
    rangeData: { conservative: "$80k-120k", typical: "$150k-200k" },
    referenceValue: 173200,
  },
  wrvu: {
    id: "wrvu",
    label: "Accurate Level of Service",
    icon: BarChart3,
    theory: "Better real-time documentation captures the full complexity of care delivered—supporting accurate work RVU (wRVU) documentation and E/M coding. More complete documentation allows coding to reflect the work actually performed, improving reimbursement accuracy.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE wRVU PERFORMANCE",
        steps: [
          { label: "Annual Abridge-documented encounters", value: "52,000" },
          { label: "Baseline wRVU per encounter", value: "1.75", note: "(typical outpatient)" },
          { label: "Current annual wRVUs", value: "91,000 wRVUs" },
        ],
      },
      {
        title: "STEP 2: DOCUMENTATION QUALITY LIFT",
        steps: [
          { label: "wRVU improvement with better documentation", value: "5%", note: "(typical)" },
        ],
      },
      {
        title: "STEP 3: ADDITIONAL wRVUs CAPTURED",
        steps: [
          { label: "Current annual wRVUs", value: "91,000" },
          { label: "× Documentation lift", value: "5%" },
          { label: "Additional wRVUs captured", value: "4,550 wRVUs" },
        ],
      },
      {
        title: "STEP 4: REVENUE IMPACT",
        steps: [
          { label: "Additional wRVUs captured", value: "4,550" },
          { label: "Average revenue per wRVU", value: "$50", note: "(blended: Medicare ~$36-40, Commercial ~$50-80)" },
          { label: "Annual value", value: "$227,500" },
          { label: "Actual reimbursement varies by payer mix and contracted rates. This uses a blended average.", value: "", note: "warning" },
        ],
      },
    ],
    keyVariables: ["Visit volume", "Baseline wRVU per encounter", "Documentation quality lift %", "Revenue per wRVU"],
    rangeData: { conservative: "2% lift ($91,000)", typical: "5% lift ($227,500)", aggressive: "8% lift ($364,000)" },
    referenceValue: 227500,
  },
  overtime: {
    id: "overtime",
    label: "Overtime & Locum Cost Avoidance",
    icon: Clock,
    theory: "Documentation backlog drives premium labor costs (overtime, locums). Reducing documentation time decreases reliance on premium labor.",
    calculationSteps: [
      {
        title: "STEP 1: HOURS RETURNED",
        steps: [
          { label: "Minutes saved per encounter", value: "2.5 min" },
          { label: "Documented encounters", value: "52,000" },
          { label: "Total hours returned", value: "2,167 hrs" },
        ],
      },
      {
        title: "STEP 2: AFTER-HOURS REDUCTION",
        steps: [
          { label: "Total hours returned", value: "2,167 hrs" },
          { label: "% after-hours documentation", value: "20%", note: "(typical)" },
          { label: "Premium labor hours avoided", value: "433 hrs" },
        ],
      },
      {
        title: "STEP 3: COST SAVINGS",
        steps: [
          { label: "Premium hours avoided", value: "433" },
          { label: "Blended premium rate", value: "$145-250/hr" },
          { label: "Annual value", value: "$185,000" },
        ],
      },
    ],
    keyVariables: ["Hours returned", "% after-hours work", "Overtime rates", "Locum rates"],
    rangeData: { conservative: "$100k-180k", typical: "$180k-300k" },
    referenceValue: 185000,
  },
  workforce: {
    id: "workforce",
    label: "Clinician Retention",
    icon: HeartPulse,
    theory: "Administrative burden, particularly documentation, drives clinician burnout and turnover. Reducing documentation time improves work-life balance and retention. Note: Retention impact is a longer-term metric, typically measurable after 12+ months.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE TURNOVER",
        steps: [
          { label: "Total providers", value: "40" },
          { label: "Annual turnover rate", value: "5%", note: "(typical)" },
          { label: "Expected departures", value: "2.0 providers/year" },
        ],
      },
      {
        title: "STEP 2: ABRIDGE IMPACT",
        steps: [
          { label: "Expected departures", value: "2.0" },
          { label: "% due to burnout/workload", value: "40%" },
          { label: "% preventable with Abridge", value: "40%", note: "(typical)" },
          { label: "Departures avoided", value: "0.32 per year" },
        ],
      },
      {
        title: "STEP 3: COST SAVINGS",
        steps: [
          { label: "Departures avoided", value: "0.32" },
          { label: "Replacement cost per provider", value: "$250,000" },
          { label: "Annual value", value: "$80,000" },
          { label: "Impact timeline: Retention improvements typically measurable at 12+ months as turnover is an annual metric.", value: "", note: "info" },
        ],
      },
    ],
    keyVariables: ["Provider count", "Current turnover rate", "% attributable to burnout", "Replacement cost"],
    rangeData: { conservative: "$50k-80k", typical: "$80k-120k" },
    referenceValue: 80000,
  },
  hcc: {
    id: "hcc",
    label: "HCC & Chronic Condition Capture",
    icon: Target,
    theory: "For Medicare Advantage patients, complete documentation of chronic conditions drives Risk Adjustment Factor (RAF) scores, which determine per-member-per-month (PMPM) capitated payments to health plans.",
    calculationSteps: [
      {
        title: "STEP 1: IDENTIFY MA PATIENT POPULATION",
        steps: [
          { label: "Total annual encounters", value: "52,000" },
          { label: "Average visits per unique patient", value: "2.5 visits/year" },
          { label: "Total unique patients", value: "20,800" },
          { label: "% Medicare Advantage", value: "15%", note: "(typical outpatient)" },
          { label: "Unique MA patients", value: "3,120 patients" },
        ],
      },
      {
        title: "STEP 2: BASELINE RAF SCORE",
        steps: [
          { label: "Average MA member RAF score", value: "1.0", note: "(national average)" },
        ],
      },
      {
        title: "STEP 3: DIAGNOSTIC DOCUMENTATION GAP",
        steps: [
          { label: "Chronic conditions per MA patient", value: "2.5", note: "(typical)" },
          { label: "Expected total HCC-eligible conditions", value: "7,800" },
          { label: "Current documentation capture rate", value: "70%" },
          { label: "Conditions currently documented", value: "5,460" },
          { label: "Documentation gap", value: "30%" },
          { label: "Conditions missed annually", value: "2,340" },
        ],
      },
      {
        title: "STEP 4: ABRIDGE RECAPTURE",
        steps: [
          { label: "Conditions missed annually", value: "2,340" },
          { label: "Abridge recapture rate", value: "50%", note: "(typical)" },
          { label: "New conditions documented", value: "1,170 conditions" },
        ],
      },
      {
        title: "STEP 5: RAF SCORE IMPACT",
        steps: [
          { label: "New conditions documented", value: "1,170" },
          { label: "Average RAF weight per condition", value: "0.25", note: "(HCC blended)" },
          { label: "Total RAF points added", value: "292.5 points" },
          { label: "Average RAF increase per patient", value: "0.09" },
        ],
      },
      {
        title: "STEP 6: REVENUE IMPACT",
        steps: [
          { label: "Unique MA patients", value: "3,120" },
          { label: "Average RAF increase per patient", value: "0.09" },
          { label: "Benchmark PMPM", value: "$1,000", note: "(county-specific)" },
          { label: "Incremental revenue per patient/year", value: "$1,080" },
          { label: "Annual value", value: "$337,000" },
        ],
      },
    ],
    keyVariables: ["% MA patients", "Conditions per member", "Documentation gap %", "Recapture rate", "PMPM benchmark"],
    rangeData: { conservative: "$150k-200k (10% MA)", typical: "$300k-400k (15% MA)", aggressive: "$600k-800k (30% MA)" },
    referenceValue: 337000,
  },
  denials: {
    id: "denials",
    label: "Denial Reduction",
    icon: DollarSign,
    theory: "Incomplete documentation is a leading cause of claim denials, particularly denials deemed unrecoverable due to insufficient medical necessity support. Real-time, complete documentation reduces denial rates by capturing clinical rationale as care is delivered.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE DENIALS",
        steps: [
          { label: "Total annual revenue", value: "$10,400,000" },
          { label: "Baseline denial rate", value: "5%", note: "(typical)" },
          { label: "Revenue denied annually", value: "$520,000" },
        ],
      },
      {
        title: "STEP 2: DOCUMENTATION-RELATED",
        steps: [
          { label: "Revenue denied annually", value: "$520,000" },
          { label: "% documentation-related", value: "30%" },
          { label: "Documentation-driven denials", value: "$156,000" },
          { label: "These are denials attributed to insufficient or unclear documentation—often unrecoverable due to lack of medical necessity support.", value: "", note: "explanatory" },
        ],
      },
      {
        title: "STEP 3: ABRIDGE PREVENTION",
        steps: [
          { label: "Documentation-driven denials", value: "$156,000" },
          { label: "% preventable with real-time docs", value: "66%", note: "(typical)" },
          { label: "Annual value", value: "$103,000" },
        ],
      },
    ],
    keyVariables: ["Annual revenue", "Baseline denial rate", "% documentation-related", "Prevention rate"],
    rangeData: { conservative: "$70k-100k (5-6%)", typical: "$100k-150k (8-10% high-complexity)" },
    referenceValue: 103000,
  },
  edThroughput: {
    id: "edThroughput",
    label: "Patient Throughput (LWBS Reduction)",
    icon: Zap,
    theory: "In the ED, faster documentation during shift enables clinicians to see waiting patients instead of catching up on charts. This reduces Left Without Being Seen (LWBS) rates and captures patients who would otherwise leave. Each prevented LWBS represents both revenue capture and quality improvement.",
    calculationSteps: [
      {
        title: "STEP 1: TIME SAVED",
        steps: [
          { label: "ED Clinicians", value: "40" },
          { label: "Shifts per clinician/year", value: "200", note: "(typical)" },
          { label: "Minutes saved per shift", value: "20 min", note: "(typical)" },
          { label: "Annual hours reclaimed", value: "2,667 hrs" },
        ],
      },
      {
        title: "STEP 2: LWBS IMPROVEMENT",
        steps: [
          { label: "Total ED encounters", value: "80,000" },
          { label: "Baseline LWBS rate", value: "3.0%", note: "(national avg: 2-4%)" },
          { label: "LWBS improvement", value: "0.5%", note: "(percentage points)" },
          { label: "Post-Abridge LWBS rate", value: "2.5%" },
          { label: "Additional patients treated", value: "400 patients" },
        ],
      },
      {
        title: "STEP 3: REVENUE IMPACT",
        steps: [
          { label: "Patients treated and released (81%)", value: "324", note: "(typical ED mix)" },
          { label: "Contribution margin per encounter", value: "$250", note: "(typical)" },
          { label: "Regular encounter value", value: "$81,000" },
          { label: "Patients admitted (19%)", value: "76" },
          { label: "Contribution margin per admission", value: "$2,000", note: "(typical)" },
          { label: "Admission value", value: "$152,000" },
          { label: "Total annual value", value: "$233,000" },
        ],
      },
    ],
    keyVariables: ["Shifts per year", "Minutes saved per shift", "LWBS improvement %", "Contribution margins"],
    rangeData: { conservative: "$150k-200k", typical: "$200k-300k", aggressive: "$300k-400k" },
    referenceValue: 233000,
  },
  edLevelOfService: {
    id: "edLevelOfService",
    label: "Level-of-Service Accuracy",
    icon: BarChart3,
    theory: "Time pressure in the ED often results in under-documentation and lost wRVUs. Real-time ambient documentation captures clinical complexity without adding post-shift burden, improving E/M level accuracy and wRVU capture despite the fast-paced environment.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE PERFORMANCE",
        steps: [
          { label: "Annual ED visits (Abridge-documented)", value: "52,000" },
          { label: "Baseline wRVU per visit", value: "2.60", note: "(typical ED)" },
          { label: "Current annual wRVUs", value: "135,200 wRVUs" },
        ],
      },
      {
        title: "STEP 2: DOCUMENTATION QUALITY LIFT",
        steps: [
          { label: "wRVU improvement from complete docs", value: "5%", note: "(typical)" },
          { label: "Additional wRVUs captured", value: "6,760 wRVUs" },
        ],
      },
      {
        title: "STEP 3: REVENUE IMPACT",
        steps: [
          { label: "Additional wRVUs", value: "6,760" },
          { label: "ED wRVU conversion factor", value: "$34", note: "(blended rate)" },
          { label: "Annual value", value: "$229,840" },
        ],
      },
    ],
    keyVariables: ["Baseline ED wRVU", "Quality lift %", "wRVU conversion factor"],
    rangeData: { conservative: "$150k-200k", typical: "$200k-300k", aggressive: "$300k-400k" },
    referenceValue: 229840,
  },
  edDenialReduction: {
    id: "edDenialReduction",
    label: "Documentation-Related Denials",
    icon: FileX,
    theory: "ED documentation under time pressure is a leading cause of denials. Complete, real-time documentation reduces denials for medical necessity, level of service, and insufficient supporting details—claims that are often unrecoverable once denied.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE DENIALS",
        steps: [
          { label: "Net collectible ED revenue", value: "$20M" },
          { label: "Baseline denial rate", value: "12%", note: "(ED avg: 10-15%)" },
          { label: "Revenue denied annually", value: "$2.4M" },
        ],
      },
      {
        title: "STEP 2: DOCUMENTATION-RELATED",
        steps: [
          { label: "% denials from documentation", value: "32%", note: "(typical)" },
          { label: "Documentation-driven denials", value: "$768,000" },
        ],
      },
      {
        title: "STEP 3: RECOVERY POTENTIAL",
        steps: [
          { label: "% recoverable with better docs", value: "40%", note: "(typical)" },
          { label: "Annual value", value: "$307,200" },
        ],
      },
    ],
    keyVariables: ["ED revenue", "Denial rate", "% doc-related", "Recovery rate"],
    rangeData: { conservative: "$200k-300k", typical: "$300k-400k", aggressive: "$400k-550k" },
    referenceValue: 307200,
  },
  edRetention: {
    id: "edRetention",
    label: "Workforce Retention",
    icon: HeartPulse,
    theory: "ED clinicians face extreme burnout from shift work plus after-shift charting burden. Reducing documentation time during and after shifts directly addresses a major burnout driver, reducing turnover and recruitment costs.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE TURNOVER",
        steps: [
          { label: "Total ED clinicians", value: "40" },
          { label: "Annual attrition rate", value: "5%", note: "(typical)" },
          { label: "Expected departures", value: "2/year" },
        ],
      },
      {
        title: "STEP 2: BURNOUT ATTRIBUTION",
        steps: [
          { label: "% turnover from burnout", value: "31%", note: "(research avg)" },
          { label: "Burnout-driven departures", value: "0.62/year" },
        ],
      },
      {
        title: "STEP 3: ABRIDGE IMPACT",
        steps: [
          { label: "% burnout reduction", value: "45%", note: "(typical)" },
          { label: "Departures avoided", value: "0.28/year" },
        ],
      },
      {
        title: "STEP 4: COST SAVINGS",
        steps: [
          { label: "Cost per ED departure", value: "$350,000", note: "(typical)" },
          { label: "Annual value", value: "$98,000" },
        ],
      },
    ],
    keyVariables: ["Clinician count", "Attrition rate", "Burnout %", "Replacement cost"],
    rangeData: { conservative: "$50k-100k", typical: "$80k-150k", aggressive: "$150k-250k" },
    referenceValue: 98000,
  },
};

function StepIndicator({
  stepNumber,
  label,
  isActive,
  isCompleted,
}: {
  stepNumber: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
          isCompleted
            ? "bg-white border-2 border-neutral-300 text-neutral-500"
            : isActive
              ? "bg-[#F03319] text-white"
              : "bg-neutral-200 text-neutral-400"
        }`}
      >
        {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
      </div>
      <span
        className={`text-sm font-medium transition-colors duration-200 ${
          isActive
            ? "text-neutral-800"
            : isCompleted
              ? "text-neutral-500"
              : "text-neutral-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function Stepper({ currentPage }: { currentPage: Page }) {
  const step1Active = currentPage === "setting";
  const step1Completed =
    currentPage === "priorities" || currentPage === "value-blueprint" || currentPage === "model-setup";
  const step2Active = currentPage === "priorities";
  const step2Completed = currentPage === "value-blueprint" || currentPage === "model-setup";
  const step3Active = currentPage === "value-blueprint";
  const step3Completed = currentPage === "model-setup";
  const step4Active = currentPage === "model-setup";

  return (
    <div className="flex items-center gap-3">
      <StepIndicator
        stepNumber={1}
        label="Care Setting"
        isActive={step1Active}
        isCompleted={step1Completed}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator
        stepNumber={2}
        label="Strategic Priorities"
        isActive={step2Active}
        isCompleted={step2Completed}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator
        stepNumber={3}
        label="Value Methodology"
        isActive={step3Active}
        isCompleted={step3Completed}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator
        stepNumber={4}
        label="Model Setup"
        isActive={step4Active}
        isCompleted={false}
      />
    </div>
  );
}

const SETTING_DESCRIPTIONS: Record<string, string> = {
  outpatient: "Primary care, specialty visits, clinics",
  ed: "High-volume, fast-paced encounters",
  nursing: "Bedside documentation, care coordination",
  inpatient: "Hospital admissions, rounding",
};

const SETTING_DRIVERS: Record<string, string[]> = {
  outpatient: ["Patient access expansion", "Level of service accuracy", "Clinician retention"],
  ed: ["Patient throughput", "Patient capture", "Denial reduction"],
  nursing: ["Time savings", "Overtime reduction", "Documentation quality"],
  inpatient: [],
};

const SETTING_FOOTERS: Record<string, { iconType: "trending" | "zap" | "users" | null; text: string }> = {
  outpatient: { iconType: "trending", text: "Most common for initial ROI modeling" },
  ed: { iconType: "zap", text: "High-impact documentation workflows" },
  nursing: { iconType: "users", text: "Workforce-focused value drivers" },
  inpatient: { iconType: null, text: "" },
};

function CareSettingRow({
  icon: Icon,
  label,
  settingKey,
  selected,
  disabled,
  onClick,
}: {
  icon: typeof Stethoscope;
  label: string;
  settingKey: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const description = SETTING_DESCRIPTIONS[settingKey] || "";
  const drivers = SETTING_DRIVERS[settingKey] || [];
  const footer = SETTING_FOOTERS[settingKey];

  const buttonContent = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full text-left p-6 transition-all duration-200 ease-out ${
        disabled
          ? "cursor-not-allowed bg-white border border-dashed border-[#D1D5DB] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          : selected
            ? "bg-[#FFF7F5] border border-[#E8532F]/30 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            : "bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:border-[#E8532F] cursor-pointer"
      }`}
      data-testid={`setting-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {selected && (
        <div className="absolute right-5 top-5">
          <Check className="w-5 h-5 text-[#F03319]" />
        </div>
      )}
      
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
          selected
            ? "bg-[#F03319]/10"
            : disabled
              ? "bg-neutral-100"
              : "bg-neutral-100 group-hover:bg-neutral-200"
        }`}
      >
        <Icon
          className={`w-6 h-6 ${selected ? "text-[#F03319]" : disabled ? "text-neutral-400" : "text-neutral-600"}`}
        />
      </div>
      
      <div className="pr-8">
        <span
          className={`text-lg font-semibold block ${
            selected
              ? "text-[#111827]"
              : disabled
                ? "text-neutral-400"
                : "text-[#111827]"
          }`}
        >
          {label}
        </span>
        <p className={`text-sm mt-1 ${disabled ? "text-neutral-400" : "text-[#6B7280]"}`}>
          {description}
        </p>
      </div>
      
      {!disabled && drivers.length > 0 && (
        <>
          <div className="border-t border-[#E5E7EB] my-4" />
          <div>
            <p className="text-[13px] font-medium text-[#6B7280] mb-2">Typical drivers:</p>
            <div className="space-y-1">
              {drivers.map((driver, idx) => (
                <p key={idx} className="text-[13px] text-[#6B7280] leading-relaxed">• {driver}</p>
              ))}
            </div>
          </div>
        </>
      )}
      
      {disabled && (
        <p className="text-[13px] text-[#9CA3AF] italic mt-4">In development</p>
      )}
      
      {!disabled && footer && footer.text && (
        <p className="text-[13px] text-[#6B7280] mt-4 flex items-center gap-1.5">
          {footer.iconType === "trending" && <TrendingUp className="w-3.5 h-3.5" />}
          {footer.iconType === "zap" && <Zap className="w-3.5 h-3.5" />}
          {footer.iconType === "users" && <Users className="w-3.5 h-3.5" />}
          {footer.text}
        </p>
      )}
    </button>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="pointer-events-auto cursor-not-allowed">
            {buttonContent}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-[#111827] text-white text-[13px] px-3 py-2 rounded-md border-0"
        >
          Inpatient calculator in development
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}

function PriorityCard({
  lever,
  isSelected,
  onToggle,
}: {
  lever: LeverConfig;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const LeverIcon = LEVER_ICONS[lever.id] || FileText;
  const keyMetric = LEVER_KEY_METRICS[lever.id];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`group relative w-full text-left cursor-pointer rounded-lg transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E8532F]/25 ${
        isSelected
          ? "bg-white border border-[#E8532F] shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
          : "bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#E8532F]"
      }`}
      data-testid={`priority-card-${lever.id}`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E8532F] rounded-l-lg" />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
              isSelected ? "bg-[#E8532F]/10" : "bg-neutral-100"
            }`}>
              <LeverIcon className={`w-5 h-5 ${isSelected ? "text-[#E8532F]" : "text-neutral-600"}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-base font-medium text-[#111827] leading-snug">
                {lever.label}
              </h4>
              <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                {lever.description}
              </p>
              {keyMetric && (
                <p className="mt-2 text-[13px] text-[#6B7280] italic">
                  Key metric: {keyMetric}
                </p>
              )}
            </div>
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className={`flex-shrink-0 mt-1 ${isSelected ? "border-[#E8532F] data-[state=checked]:bg-[#E8532F]" : ""}`}
            data-testid={`checkbox-${lever.id}`}
          />
        </div>
      </div>
    </div>
  );
}

function ModelSummaryPanel({
  selectedSetting,
  selectedLeverIds,
  onContinue,
  canContinue,
  showCta,
}: {
  selectedSetting: CareSettingType | null;
  selectedLeverIds: Set<string>;
  onContinue?: () => void;
  canContinue?: boolean;
  showCta?: boolean;
}) {
  const selectedLevers = useMemo(() => {
    if (!selectedSetting) return [];
    const levers = SETTING_CONFIG[selectedSetting];
    return levers.filter((lever: LeverConfig) =>
      selectedLeverIds.has(lever.id),
    );
  }, [selectedSetting, selectedLeverIds]);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-5">
          Your Selections
        </h3>

        {!selectedSetting ? (
          <p className="text-sm text-neutral-500 leading-relaxed">
            Your selections will appear here as you build your model.
          </p>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-1.5 font-medium">
                Care Setting
              </p>
              <p className="text-sm font-semibold text-neutral-900">
                {CARE_SETTING_LABELS[selectedSetting]}
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-3 font-medium">
                Selected Priorities
              </p>
              {selectedLevers.length === 0 ? (
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Choose the drivers that align with your priorities.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {selectedLevers.map((lever: LeverConfig) => (
                      <li
                        key={lever.id}
                        className="flex items-start gap-2.5 text-sm text-neutral-800"
                      >
                        <Check className="w-4 h-4 text-[#F03319] flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{lever.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-neutral-500 mt-4 pt-4 border-t border-neutral-100">
                    {selectedLevers.length} of{" "}
                    {SETTING_CONFIG[selectedSetting].length} included
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCta && onContinue && (
        <div className="border-t border-neutral-200 bg-neutral-50/50 px-5 py-4">
          <button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              canContinue
                ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm hover:shadow"
                : "opacity-40 bg-neutral-900 text-white cursor-not-allowed"
            }`}
            data-testid="button-continue-to-calculator-desktop"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ObjectiveSelectionScreen({
  onComplete,
  initialSelectedSettings = [],
  initialSelectedLevers = [],
}: ObjectiveSelectionScreenProps) {
  // If returning from calculator with existing selections, go directly to priorities page
  const [currentPage, setCurrentPage] = useState<Page>(
    initialSelectedSettings.length > 0 && initialSelectedLevers.length > 0
      ? "priorities"
      : "orientation"
  );
  const [selectedSetting, setSelectedSetting] =
    useState<CareSettingType | null>(
      initialSelectedSettings.length > 0 ? initialSelectedSettings[0] : null,
    );
  const [selectedLeverIds, setSelectedLeverIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    initialSelectedLevers.forEach((lever) => ids.add(lever.leverId));
    return ids;
  });

  // ============================================
  // Value Methodology State
  // ============================================
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());

  // ============================================
  // Model Setup State
  // ============================================
  const [modelSetupStep, setModelSetupStep] = useState<1 | 2 | 3>(1);

  // Baseline step state - using number | "" to allow empty field while typing
  const [cliniciansInScope, setCliniciansInScope] = useState<number | "">("");
  const [annualEncountersInScope, setAnnualEncountersInScope] = useState<
    number | ""
  >("");

  // Adoption step state
  const [utilizationPercent, setUtilizationPercent] = useState<number | null>(
    65,
  );
  const [whyMattersExpanded, setWhyMattersExpanded] = useState(false);
  const [comparePosturesExpanded, setComparePosturesExpanded] = useState(false);
  const [fineTuneExpanded, setFineTuneExpanded] = useState(false);
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null); // No default - user must select
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [showCustomMinutesInput, setShowCustomMinutesInput] = useState(false);
  const customMinutesInputRef = useRef<HTMLInputElement>(null);

  // Value Realization step state
  const [timeRealizationRate, setTimeRealizationRate] = useState<number | null>(null); // No default - user must select
  
  // Documentation lever sensitivity states (only shown if lever is selected)
  const [wrvuSensitivity, setWrvuSensitivity] = useState<number | null>(null); // No default - user must select
  const [hccSensitivity, setHccSensitivity] = useState<number | null>(null); // No default - user must select
  const [denialsSensitivity, setDenialsSensitivity] = useState<number | null>(null); // No default - user must select

  // ============================================
  // Fine-Tune Assumptions State (per driver)
  // ============================================
  
  // Patient Access - org-specific inputs
  const [ftPatientAccessVisitDuration, setFtPatientAccessVisitDuration] = useState<number>(30);
  const [ftPatientAccessRevenuePerVisit, setFtPatientAccessRevenuePerVisit] = useState<number>(200);
  
  // Accurate Level of Service - org-specific inputs
  const [ftWrvuBaseline, setFtWrvuBaseline] = useState<number>(1.75);
  const [ftWrvuRevenuePerUnit, setFtWrvuRevenuePerUnit] = useState<number>(40);
  
  // Clinician Retention - org-specific inputs
  const [ftRetentionTurnoverRate, setFtRetentionTurnoverRate] = useState<number>(5);
  const [ftRetentionReplacementCost, setFtRetentionReplacementCost] = useState<number>(250000);
  
  // HCC Capture - org-specific inputs
  const [ftHccMedicareAdvantage, setFtHccMedicareAdvantage] = useState<number>(15);
  const [ftHccBenchmarkPmpm, setFtHccBenchmarkPmpm] = useState<number>(1000);
  // HCC posture-driven: recapture rate (handled separately)
  const [ftHccRecaptureRate, setFtHccRecaptureRate] = useState<number | null>(null);
  
  // Denial Reduction - org-specific inputs
  const [ftDenialBaselineRate, setFtDenialBaselineRate] = useState<number>(5);
  // Denial posture-driven: prevention rate (handled separately)
  const [ftDenialPreventionRate, setFtDenialPreventionRate] = useState<number | null>(null);
  
  // Overtime - org-specific inputs
  const [ftOvertimePremiumRate, setFtOvertimePremiumRate] = useState<number>(145);
  // Overtime posture-driven: after-hours reduction (handled separately)
  const [ftOvertimeAfterHoursReduction, setFtOvertimeAfterHoursReduction] = useState<number | null>(null);

  // Value posture state and edit accordion tracking
  const [valuePosture, setValuePosture] = useState<ValuePosture | null>(null);
  const [editingAssumption, setEditingAssumption] = useState<string | null>(null);
  
  // Track the last non-custom posture for comparison purposes
  const [lastNonCustomPosture, setLastNonCustomPosture] = useState<"conservative" | "typical" | "aggressive">("typical");
  
  // Reset all confirmation modal state
  const [showResetAllModal, setShowResetAllModal] = useState(false);

  // Extended posture presets for additional drivers (aligned with POSTURE_PRESETS)
  const FINE_TUNE_EXTRA_POSTURE_VALUES = {
    conservative: {
      hccRecaptureRate: 40,
      denialPreventionRate: 50,
      overtimeReduction: 15,
      retentionPrevention: 30,
    },
    typical: {
      hccRecaptureRate: 50,
      denialPreventionRate: 66,
      overtimeReduction: 20,
      retentionPrevention: 40,
    },
    aggressive: {
      hccRecaptureRate: 60,
      denialPreventionRate: 80,
      overtimeReduction: 30,
      retentionPrevention: 50,
    },
  };

  // Apply posture to all posture-driven assumptions (uses authoritative POSTURE_PRESETS)
  const applyPosture = (posture: "conservative" | "typical" | "aggressive") => {
    const preset = POSTURE_PRESETS[posture];
    const extraPreset = FINE_TUNE_EXTRA_POSTURE_VALUES[posture];
    
    // Core posture-driven values from POSTURE_PRESETS (authoritative source)
    setMinutesSaved(preset.minutes);
    setCustomMinutes(null);
    setShowCustomMinutesInput(false);
    setTimeRealizationRate(preset.realization);
    setWrvuSensitivity(preset.wrvu);
    
    // Additional posture-driven values for other drivers
    setFtHccRecaptureRate(extraPreset.hccRecaptureRate);
    setFtDenialPreventionRate(extraPreset.denialPreventionRate);
    setFtOvertimeAfterHoursReduction(extraPreset.overtimeReduction);
    
    setValuePosture(posture);
    setLastNonCustomPosture(posture); // Track for customization comparisons
    setEditingAssumption(null);
  };

  // Get current retention prevention percentage based on posture
  const getRetentionPreventionPct = () => {
    if (valuePosture === "conservative") return 30;
    if (valuePosture === "aggressive") return 50;
    return 40; // typical
  };

  // Track customizations from current posture defaults
  // Uses lastNonCustomPosture to track what the user originally selected
  const customizations = useMemo(() => {
    const preset = POSTURE_PRESETS[lastNonCustomPosture];
    const extraPreset = FINE_TUNE_EXTRA_POSTURE_VALUES[lastNonCustomPosture];
    
    const changes: { driver: string; input: string; oldValue: string; newValue: string }[] = [];
    
    // Patient Access: Minutes saved
    const currentMinutes = customMinutes ?? minutesSaved;
    if (currentMinutes !== null && currentMinutes !== preset.minutes) {
      changes.push({
        driver: "Patient Access",
        input: "Minutes saved",
        oldValue: `${preset.minutes} min`,
        newValue: `${currentMinutes} min`
      });
    }
    
    // Patient Access: Realization factor
    if (timeRealizationRate !== null && timeRealizationRate !== preset.realization) {
      changes.push({
        driver: "Patient Access",
        input: "Realization factor",
        oldValue: `${preset.realization}%`,
        newValue: `${timeRealizationRate}%`
      });
    }
    
    // Patient Access: Visit duration (default 30)
    if (ftPatientAccessVisitDuration !== 30) {
      changes.push({
        driver: "Patient Access",
        input: "Visit duration",
        oldValue: "30 min",
        newValue: `${ftPatientAccessVisitDuration} min`
      });
    }
    
    // Patient Access: Revenue per visit (default 200)
    if (ftPatientAccessRevenuePerVisit !== 200) {
      changes.push({
        driver: "Patient Access",
        input: "Revenue per visit",
        oldValue: "$200",
        newValue: `$${ftPatientAccessRevenuePerVisit.toLocaleString()}`
      });
    }
    
    // Level of Service: wRVU lift
    if (wrvuSensitivity !== null && wrvuSensitivity !== preset.wrvu) {
      changes.push({
        driver: "Level of Service",
        input: "Documentation lift",
        oldValue: `${preset.wrvu}%`,
        newValue: `${wrvuSensitivity}%`
      });
    }
    
    // Level of Service: Baseline wRVU (default 1.75)
    if (ftWrvuBaseline !== null && ftWrvuBaseline !== 1.75) {
      changes.push({
        driver: "Level of Service",
        input: "Baseline wRVU",
        oldValue: "1.75",
        newValue: `${ftWrvuBaseline}`
      });
    }
    
    // Level of Service: Revenue per wRVU (default 40)
    if (ftWrvuRevenuePerUnit !== 40) {
      changes.push({
        driver: "Level of Service",
        input: "Revenue per wRVU",
        oldValue: "$40",
        newValue: `$${ftWrvuRevenuePerUnit}`
      });
    }
    
    // Clinician Retention: Turnover rate (default 5)
    if (ftRetentionTurnoverRate !== 5) {
      changes.push({
        driver: "Clinician Retention",
        input: "Turnover rate",
        oldValue: "5%",
        newValue: `${ftRetentionTurnoverRate}%`
      });
    }
    
    // Clinician Retention: Replacement cost (default 250000)
    if (ftRetentionReplacementCost !== 250000) {
      changes.push({
        driver: "Clinician Retention",
        input: "Replacement cost",
        oldValue: "$250,000",
        newValue: `$${ftRetentionReplacementCost.toLocaleString()}`
      });
    }
    
    // HCC Capture: MA population (default 15)
    if (ftHccMedicareAdvantage !== 15) {
      changes.push({
        driver: "HCC Capture",
        input: "MA population",
        oldValue: "15%",
        newValue: `${ftHccMedicareAdvantage}%`
      });
    }
    
    // HCC Capture: Recapture rate
    if (ftHccRecaptureRate !== null && ftHccRecaptureRate !== extraPreset.hccRecaptureRate) {
      changes.push({
        driver: "HCC Capture",
        input: "Recapture rate",
        oldValue: `${extraPreset.hccRecaptureRate}%`,
        newValue: `${ftHccRecaptureRate}%`
      });
    }
    
    // HCC Capture: Benchmark PMPM (default 1000)
    if (ftHccBenchmarkPmpm !== 1000) {
      changes.push({
        driver: "HCC Capture",
        input: "Benchmark PMPM",
        oldValue: "$1,000",
        newValue: `$${ftHccBenchmarkPmpm.toLocaleString()}`
      });
    }
    
    // Denial Reduction: Baseline rate (default 5)
    if (ftDenialBaselineRate !== 5) {
      changes.push({
        driver: "Denial Reduction",
        input: "Baseline rate",
        oldValue: "5%",
        newValue: `${ftDenialBaselineRate}%`
      });
    }
    
    // Denial Reduction: Prevention rate
    if (ftDenialPreventionRate !== null && ftDenialPreventionRate !== extraPreset.denialPreventionRate) {
      changes.push({
        driver: "Denial Reduction",
        input: "Prevention rate",
        oldValue: `${extraPreset.denialPreventionRate}%`,
        newValue: `${ftDenialPreventionRate}%`
      });
    }
    
    // Overtime: After-hours reduction
    if (ftOvertimeAfterHoursReduction !== null && ftOvertimeAfterHoursReduction !== extraPreset.overtimeReduction) {
      changes.push({
        driver: "Overtime Cost",
        input: "After-hours reduction",
        oldValue: `${extraPreset.overtimeReduction}%`,
        newValue: `${ftOvertimeAfterHoursReduction}%`
      });
    }
    
    // Overtime: Premium rate (default 145)
    if (ftOvertimePremiumRate !== 145) {
      changes.push({
        driver: "Overtime Cost",
        input: "Premium rate",
        oldValue: "$145/hr",
        newValue: `$${ftOvertimePremiumRate}/hr`
      });
    }
    
    return changes;
  }, [
    lastNonCustomPosture, customMinutes, minutesSaved, timeRealizationRate, wrvuSensitivity,
    ftPatientAccessVisitDuration, ftPatientAccessRevenuePerVisit, ftWrvuBaseline, ftWrvuRevenuePerUnit,
    ftRetentionTurnoverRate, ftRetentionReplacementCost, ftHccMedicareAdvantage, ftHccRecaptureRate,
    ftHccBenchmarkPmpm, ftDenialBaselineRate, ftDenialPreventionRate, ftOvertimeAfterHoursReduction,
    ftOvertimePremiumRate, FINE_TUNE_EXTRA_POSTURE_VALUES
  ]);

  // Reset all to typical defaults
  const handleResetAllToTypical = () => {
    applyPosture("typical");
    // Reset org-specific values to defaults
    setFtPatientAccessVisitDuration(30);
    setFtPatientAccessRevenuePerVisit(200);
    setFtWrvuBaseline(1.75);
    setFtWrvuRevenuePerUnit(40);
    setFtRetentionTurnoverRate(5);
    setFtRetentionReplacementCost(250000);
    setFtHccMedicareAdvantage(15);
    setFtHccBenchmarkPmpm(1000);
    setFtDenialBaselineRate(5);
    setFtOvertimePremiumRate(145);
    setShowResetAllModal(false);
  };

  // Pricing step state
  const [pricingModel, setPricingModel] = useState<
    "per-clinician" | "enterprise" | null
  >(null);
  const [perClinicianCost, setPerClinicianCost] = useState<number | null>(null);
  const [enterpriseAnnualCost, setEnterpriseAnnualCost] = useState<
    number | null
  >(null);
  const [contractYears, setContractYears] = useState<number | null>(null);
  const [showCustomYears, setShowCustomYears] = useState(false);
  const [implementationEnabled, setImplementationEnabled] = useState(false);
  const [implementationFee, setImplementationFee] = useState<number | null>(
    null,
  );

  // Auto-focus the custom minutes input when it becomes visible
  useEffect(() => {
    if (showCustomMinutesInput) {
      customMinutesInputRef.current?.focus();
    }
  }, [showCustomMinutesInput]);

  // Scroll to top when page or step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, modelSetupStep]);

  // ============================================
  // Derived values (must come after state declarations)
  // ============================================

  // Canonical values for calculations (parse empty string as 0 for validation)
  const effectiveClinicians =
    typeof cliniciansInScope === "number" ? cliniciansInScope : 0;
  const effectiveEncounters =
    typeof annualEncountersInScope === "number" ? annualEncountersInScope : 0;

  // Effective minutes saved (custom or preset)
  const effectiveMinutesSaved = customMinutes ?? minutesSaved;

  // Eligible encounters (utilization × encounters)
  const eligibleEncounters = useMemo(() => {
    if (utilizationPercent !== null && effectiveEncounters > 0) {
      return Math.round((utilizationPercent / 100) * effectiveEncounters);
    }
    return null;
  }, [utilizationPercent, effectiveEncounters]);

  // Total minutes saved and total hours saved
  const totalMinutesSaved = useMemo(() => {
    if (
      effectiveMinutesSaved !== null &&
      utilizationPercent !== null &&
      effectiveEncounters > 0
    ) {
      return (
        effectiveMinutesSaved * (utilizationPercent / 100) * effectiveEncounters
      );
    }
    return null;
  }, [effectiveMinutesSaved, utilizationPercent, effectiveEncounters]);

  const totalHoursSaved = useMemo(() => {
    if (totalMinutesSaved !== null) {
      return totalMinutesSaved / 60;
    }
    return null;
  }, [totalMinutesSaved]);

  // Realized minutes saved (total minutes × time realization rate)
  const realizedMinutesSaved = useMemo(() => {
    if (totalMinutesSaved !== null && timeRealizationRate !== null) {
      return totalMinutesSaved * (timeRealizationRate / 100);
    }
    return null;
  }, [totalMinutesSaved, timeRealizationRate]);

  const realizedHoursSaved = useMemo(() => {
    if (realizedMinutesSaved !== null) {
      return realizedMinutesSaved / 60;
    }
    return null;
  }, [realizedMinutesSaved]);

  // Check which documentation levers are selected
  const hasWrvuSelected = selectedLeverIds.has("wrvu") || selectedLeverIds.has("edLevelOfService");
  const hasHccSelected = selectedLeverIds.has("hcc");
  const hasDenialsSelected = selectedLeverIds.has("denials");
  const hasAnyDocumentationLever = hasWrvuSelected || hasHccSelected || hasDenialsSelected;

  // Detect if current values match a posture or are custom
  const detectedPosture = useMemo((): ValuePosture | null => {
    const currentMinutes = customMinutes ?? minutesSaved;
    const currentRealization = timeRealizationRate;
    const currentWrvu = wrvuSensitivity;
    
    if (currentMinutes === null || currentRealization === null) {
      return null;
    }
    
    for (const [posture, preset] of Object.entries(POSTURE_PRESETS)) {
      if (
        currentMinutes === preset.minutes &&
        currentRealization === preset.realization &&
        (currentWrvu === preset.wrvu || !hasWrvuSelected)
      ) {
        return posture as ValuePosture;
      }
    }
    return "custom";
  }, [minutesSaved, customMinutes, timeRealizationRate, wrvuSensitivity, hasWrvuSelected]);

  // Annual subscription cost
  const annualSubscriptionCost = useMemo(() => {
    if (pricingModel === "per-clinician") {
      if (effectiveClinicians > 0 && perClinicianCost !== null) {
        return effectiveClinicians * perClinicianCost * 12;
      }
    } else if (pricingModel === "enterprise") {
      if (enterpriseAnnualCost !== null) {
        return enterpriseAnnualCost;
      }
    }
    return null;
  }, [
    pricingModel,
    effectiveClinicians,
    perClinicianCost,
    enterpriseAnnualCost,
  ]);

  // Implementation cost
  const implementationCost = useMemo(() => {
    if (implementationEnabled && implementationFee !== null) {
      return implementationFee;
    }
    return null;
  }, [implementationEnabled, implementationFee]);

  // Year 1 total cost (only if implementation is enabled)
  const year1TotalCost = useMemo(() => {
    if (
      implementationEnabled &&
      annualSubscriptionCost !== null &&
      implementationFee !== null
    ) {
      return annualSubscriptionCost + implementationFee;
    }
    return null;
  }, [implementationEnabled, annualSubscriptionCost, implementationFee]);

  // Lifetime subscription = annual cost × contract term + implementation fee (if enabled)
  const lifetimeSubscription = useMemo(() => {
    if (annualSubscriptionCost === null || contractYears === null) {
      return null;
    }
    const base = annualSubscriptionCost * contractYears;
    if (implementationEnabled && implementationFee !== null) {
      return base + implementationFee;
    }
    return base;
  }, [annualSubscriptionCost, contractYears, implementationEnabled, implementationFee]);

  // Levers by category for Page 2
  const leversByCategory = useMemo(() => {
    if (!selectedSetting) return null;
    return getLeversByCategory(selectedSetting);
  }, [selectedSetting]);

  // ============================================
  // DYNAMIC DRIVER VALUE CALCULATIONS
  // These recalculate whenever ANY input changes
  // ============================================
  
  // Helper function to calculate driver values for a specific posture
  // FOLLOWS USER SPEC FORMULAS EXACTLY
  const calculateDriverValues = useMemo(() => {
    return (posture: "conservative" | "typical" | "aggressive" | "current") => {
      // Get eligible encounters (use default 65% if utilization not set)
      const util = utilizationPercent ?? 65;
      const eligibleEncounters = effectiveEncounters > 0
        ? Math.round((util / 100) * effectiveEncounters)
        : 0;
      
      // Get posture-specific values or current values
      const getPostureValues = () => {
        if (posture === "current") {
          return {
            minutesSaved: effectiveMinutesSaved ?? POSTURE_PRESETS.typical.minutes,
            realizationRate: timeRealizationRate ?? POSTURE_PRESETS.typical.realization,
            wrvuLift: wrvuSensitivity ?? POSTURE_PRESETS.typical.wrvu,
            hccRecapture: ftHccRecaptureRate ?? FINE_TUNE_EXTRA_POSTURE_VALUES.typical.hccRecaptureRate,
            denialPrevention: ftDenialPreventionRate ?? FINE_TUNE_EXTRA_POSTURE_VALUES.typical.denialPreventionRate,
            overtimeReduction: ftOvertimeAfterHoursReduction ?? FINE_TUNE_EXTRA_POSTURE_VALUES.typical.overtimeReduction,
            retentionPrevention: getRetentionPreventionPct(),
          };
        }
        const preset = POSTURE_PRESETS[posture];
        const extraPreset = FINE_TUNE_EXTRA_POSTURE_VALUES[posture];
        return {
          minutesSaved: preset.minutes,
          realizationRate: preset.realization,
          wrvuLift: preset.wrvu,
          hccRecapture: extraPreset.hccRecaptureRate,
          denialPrevention: extraPreset.denialPreventionRate,
          overtimeReduction: extraPreset.overtimeReduction,
          retentionPrevention: extraPreset.retentionPrevention,
        };
      };
      
      const pv = getPostureValues();
      
      // PATIENT ACCESS CALCULATION (per user spec)
      // Formula: total_minutes → usable_hours → new_visits → revenue
      const calcPatientAccess = () => {
        // Step 1: Time returned
        const totalMinutes = pv.minutesSaved * eligibleEncounters;
        const totalHours = totalMinutes / 60;
        // Step 2: Realized capacity (apply realization factor)
        const usableHours = totalHours * (pv.realizationRate / 100);
        const usableMinutes = usableHours * 60;
        // Step 3: New visit capacity
        const newVisits = usableMinutes / ftPatientAccessVisitDuration;
        // Step 4: Revenue impact
        return Math.round(newVisits * ftPatientAccessRevenuePerVisit);
      };
      
      // ACCURATE LEVEL OF SERVICE (wRVU) CALCULATION (per user spec)
      const calcWrvu = () => {
        // Step 1: Current wRVUs
        const currentWrvus = eligibleEncounters * ftWrvuBaseline;
        // Step 2 & 3: Documentation quality lift
        const additionalWrvus = currentWrvus * (pv.wrvuLift / 100);
        // Step 4: Revenue impact
        return Math.round(additionalWrvus * ftWrvuRevenuePerUnit);
      };
      
      // CLINICIAN RETENTION CALCULATION (per user spec)
      // Uses providers directly, not encounters
      const calcRetention = () => {
        const providers = effectiveClinicians > 0 ? effectiveClinicians : 40; // default to reference
        // Step 1: Baseline turnover
        const expectedDepartures = providers * (ftRetentionTurnoverRate / 100);
        // Step 2: Abridge impact (40% burnout attribution is FIXED)
        const burnoutDepartures = expectedDepartures * 0.40;
        const departuresAvoided = burnoutDepartures * (pv.retentionPrevention / 100);
        // Step 3: Cost savings
        return Math.round(departuresAvoided * ftRetentionReplacementCost);
      };
      
      // HCC & CHRONIC CONDITION CAPTURE CALCULATION (per user spec)
      const calcHcc = () => {
        // Step 1: Identify MA patient population
        const visitsPerPatient = 2.5; // FIXED
        const uniquePatients = eligibleEncounters / visitsPerPatient;
        const maPatients = uniquePatients * (ftHccMedicareAdvantage / 100);
        
        // Fixed assumptions per spec
        const conditionsPerPatient = 2.5; // FIXED
        const docGapRate = 0.30; // 30% FIXED
        const rafWeight = 0.25; // FIXED
        
        // Step 3: Diagnostic documentation gap
        const expectedConditions = maPatients * conditionsPerPatient;
        const conditionsMissed = expectedConditions * docGapRate;
        
        // Step 4: Abridge recapture
        const conditionsRecaptured = conditionsMissed * (pv.hccRecapture / 100);
        const totalRafPoints = conditionsRecaptured * rafWeight;
        
        // Step 5: Revenue impact
        const rafIncreasePerPatient = maPatients > 0 ? totalRafPoints / maPatients : 0;
        const annualBaseline = ftHccBenchmarkPmpm * 12;
        const incrementalPerPatient = annualBaseline * rafIncreasePerPatient;
        return Math.round(maPatients * incrementalPerPatient);
      };
      
      // DENIAL REDUCTION CALCULATION (per user spec)
      const calcDenials = () => {
        // Use revenue per encounter for total revenue base
        const totalRevenue = eligibleEncounters * ftPatientAccessRevenuePerVisit;
        const revenueDenied = totalRevenue * (ftDenialBaselineRate / 100);
        const docRelatedPercent = 0.30; // 30% FIXED
        const docDenials = revenueDenied * docRelatedPercent;
        return Math.round(docDenials * (pv.denialPrevention / 100));
      };
      
      // OVERTIME & LOCUM COST AVOIDANCE CALCULATION (matches roi-calculator.ts)
      // Formula: total_hours × pctAfterHours% × overtime_reduction% × premium_rate
      const calcOvertime = () => {
        const totalMinutes = pv.minutesSaved * eligibleEncounters;
        const totalHours = totalMinutes / 60;
        // Only after-hours time contributes to overtime savings (default 25%)
        const pctAfterHours = 25;
        const afterHoursReclaimed = totalHours * (pctAfterHours / 100);
        // Apply overtime reduction percentage
        const premiumHoursAvoided = afterHoursReclaimed * (pv.overtimeReduction / 100);
        return Math.round(premiumHoursAvoided * ftOvertimePremiumRate);
      };
      
      return {
        patientAccess: calcPatientAccess(),
        wrvu: calcWrvu(),
        workforce: calcRetention(),
        hcc: calcHcc(),
        denials: calcDenials(),
        overtime: calcOvertime(),
      };
    };
  }, [
    effectiveEncounters,
    utilizationPercent,
    effectiveClinicians,
    effectiveMinutesSaved,
    timeRealizationRate,
    wrvuSensitivity,
    ftPatientAccessVisitDuration,
    ftPatientAccessRevenuePerVisit,
    ftWrvuBaseline,
    ftWrvuRevenuePerUnit,
    ftRetentionTurnoverRate,
    ftRetentionReplacementCost,
    ftHccMedicareAdvantage,
    ftHccBenchmarkPmpm,
    ftHccRecaptureRate,
    ftDenialBaselineRate,
    ftDenialPreventionRate,
    ftOvertimeAfterHoursReduction,
    ftOvertimePremiumRate,
  ]);
  
  // Current driver values (using current posture/inputs)
  const currentDriverValues = useMemo(() => {
    return calculateDriverValues("current");
  }, [calculateDriverValues]);
  
  // Posture-specific driver values for comparison table
  const conservativeDriverValues = useMemo(() => calculateDriverValues("conservative"), [calculateDriverValues]);
  const typicalDriverValues = useMemo(() => calculateDriverValues("typical"), [calculateDriverValues]);
  const aggressiveDriverValues = useMemo(() => calculateDriverValues("aggressive"), [calculateDriverValues]);
  
  // Total value for selected drivers using current posture
  const totalProjectedValue = useMemo(() => {
    return Array.from(selectedLeverIds).reduce((sum, leverId) => {
      const value = currentDriverValues[leverId as keyof typeof currentDriverValues];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
  }, [selectedLeverIds, currentDriverValues]);
  
  // Get driver value for a specific posture
  const getDriverValueForPosture = (leverId: string, posture: "conservative" | "typical" | "aggressive") => {
    const values = posture === "conservative" ? conservativeDriverValues
      : posture === "aggressive" ? aggressiveDriverValues
      : typicalDriverValues;
    return values[leverId as keyof typeof values] || 0;
  };
  
  // Get total for a posture (selected drivers only)
  const getTotalForPosture = (posture: "conservative" | "typical" | "aggressive") => {
    const values = posture === "conservative" ? conservativeDriverValues
      : posture === "aggressive" ? aggressiveDriverValues
      : typicalDriverValues;
    return Array.from(selectedLeverIds).reduce((sum, leverId) => {
      const value = values[leverId as keyof typeof values];
      return sum + (typeof value === "number" ? value : 0);
    }, 0);
  };

  // ============================================
  // Handlers
  // ============================================
  const handleSettingSelect = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      return;
    }
    if (selectedSetting === setting) {
      setSelectedSetting(null);
      setSelectedLeverIds(new Set());
    } else {
      setSelectedSetting(setting);
      setSelectedLeverIds(new Set());
    }
  };

  const handleContinueToPage1 = () => {
    setCurrentPage("setting");
  };

  const handleContinueToPage2 = () => {
    if (!selectedSetting) return;
    setCurrentPage("priorities");
  };

  const handleBackToPage1 = () => {
    setCurrentPage("setting");
  };

  const handleContinueToPage3 = () => {
    if (!selectedSetting || selectedLeverIds.size === 0) return;
    setCurrentPage("value-blueprint");
  };

  const handleBackToPage2 = () => {
    setCurrentPage("priorities");
  };

  const handleContinueToPage4 = () => {
    if (!selectedSetting || selectedLeverIds.size === 0) return;
    setModelSetupStep(1);
    setCurrentPage("model-setup");
  };

  const handleBackToPage3 = () => {
    setCurrentPage("value-blueprint");
  };

  const handleLeverToggle = (leverId: string) => {
    setSelectedLeverIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leverId)) {
        newSet.delete(leverId);
      } else {
        newSet.add(leverId);
      }
      return newSet;
    });
  };

  const handleFinalSubmit = () => {
    if (!selectedSetting || selectedLeverIds.size === 0) {
      return;
    }

    const levers: SelectedLever[] = Array.from(selectedLeverIds).map(
      (leverId) => ({
        settingId: selectedSetting,
        leverId,
        active: true,
      }),
    );

    // Build the seedInputs object with all collected data including Fine-Tune values
    const seedInputs: Partial<RoiInputs> = {
      numberOfProviders: effectiveClinicians,
      annualOutpatientEncounters: effectiveEncounters,
      abridgeUtilizationPct: utilizationPercent ?? 70,
      minutesSavedPerEncounter: effectiveMinutesSaved ?? 2.5,
      monthlyCostPerProvider:
        pricingModel === "per-clinician" ? (perClinicianCost ?? 0) : 0,
      implementationCostYear1: implementationEnabled
        ? (implementationFee ?? 0)
        : 0,
      baselineWrvuPerEncounter: ftWrvuBaseline,
      // Patient Access fine-tune values
      patientAccess: {
        pctTimeToNewVisits: timeRealizationRate ?? 20,
        avgVisitDurationMinutes: ftPatientAccessVisitDuration,
        avgNetRevenuePerVisit: ftPatientAccessRevenuePerVisit,
      },
      // wRVU fine-tune values
      wrvu: {
        wrvuConversionFactor: ftWrvuRevenuePerUnit,
        pctIncreaseWrvuPerEncounter: wrvuSensitivity ?? 5,
      },
      // Workforce (Clinician Retention) fine-tune values
      workforce: {
        providerCount: effectiveClinicians,
        baselineAttritionRate: ftRetentionTurnoverRate,
        pctAttritionLinkedToBurnout: 40, // Fixed
        pctBurnoutExitsAvoided: getRetentionPreventionPct(),
        costPerDeparture: ftRetentionReplacementCost,
      },
      // HCC Capture fine-tune values
      hcc: {
        pctMedicareAdvantage: ftHccMedicareAdvantage,
        avgConditionsPerMember: 2.5,
        pctConditionsMissed: 30,
        pctMissedConditionsRecaptured: ftHccRecaptureRate ?? 50,
        pctNewConditionsIdentified: 5,
        rafGainPerCondition: 0.25,
        rafRealizationHaircut: 70,
        pmpmBenchmark: ftHccBenchmarkPmpm,
      },
      // Denial Reduction fine-tune values
      denials: {
        avgRevenuePerEncounter: ftPatientAccessRevenuePerVisit,
        baselineDenialRate: ftDenialBaselineRate,
        pctDenialsRecoveredAfterRework: 60,
        pctDenialsFromDocumentation: 30,
        pctDocDenialsRecovered: ftDenialPreventionRate ?? 66,
      },
      // Overtime fine-tune values
      overtime: {
        pctOvertimeReduced: ftOvertimeAfterHoursReduction ?? 20,
        blendedOvertimeRate: ftOvertimePremiumRate,
        pctAfterHours: 25,
      },
    };

    // If enterprise pricing, convert to monthly per-provider equivalent
    if (
      pricingModel === "enterprise" &&
      enterpriseAnnualCost !== null &&
      effectiveClinicians > 0
    ) {
      seedInputs.monthlyCostPerProvider =
        enterpriseAnnualCost / (effectiveClinicians * 12);
    }

    onComplete([selectedSetting], levers, seedInputs);
  };

  // ============================================
  // Validation flags
  // ============================================
  const canContinuePage1 = selectedSetting !== null;
  const canContinuePage2 =
    selectedSetting !== null && selectedLeverIds.size > 0;
  const canContinuePage3 =
    effectiveClinicians > 0 &&
    effectiveEncounters > 0 &&
    utilizationPercent !== null &&
    effectiveMinutesSaved !== null &&
    pricingModel !== null &&
    annualSubscriptionCost !== null &&
    (!implementationEnabled ||
      (implementationFee !== null && implementationFee > 0));

  // Step completion flags for pill navigation (all required info on that step is filled)
  const isStep1Complete =
    effectiveClinicians > 0 &&
    effectiveEncounters > 0 &&
    utilizationPercent !== null;

  const isStep2Complete =
    effectiveMinutesSaved !== null &&
    timeRealizationRate !== null &&
    (!hasWrvuSelected || wrvuSensitivity !== null) &&
    (!hasHccSelected || hccSensitivity !== null) &&
    (!hasDenialsSelected || denialsSensitivity !== null);

  const isStep3Complete =
    pricingModel !== null &&
    annualSubscriptionCost !== null &&
    (!implementationEnabled ||
      (implementationFee !== null && implementationFee > 0));

  // ============================================
  // Render helpers
  // ============================================
  const renderCategorySection = (
    category: LeverCategory,
    levers: LeverConfig[],
    isFirst: boolean,
  ) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];
    const categoryLabel =
      category === "time" ? "Capacity & Labor" : "Revenue & Risk";
    const categorySubtitle = CATEGORY_SUBTITLES[category];

    return (
      <div key={category} className={isFirst ? "mt-8" : "mt-12"}>
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon className="h-4 w-4 text-[#111827]" />
            <span className="text-sm font-semibold text-[#111827] uppercase tracking-[0.05em]">
              {categoryLabel}
            </span>
          </div>
          <p className="text-sm text-[#6B7280] italic">{categorySubtitle}</p>
          <div className="border-b border-[#E5E7EB] mt-3" />
        </div>
        <div className="space-y-3">
          {levers.map((lever) => (
            <PriorityCard
              key={lever.id}
              lever={lever}
              isSelected={selectedLeverIds.has(lever.id)}
              onToggle={() => handleLeverToggle(lever.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative font-sans bg-gradient-to-b from-neutral-50 via-white to-neutral-50">
      <BackgroundShape />

      {/* Header */}
      <header className="relative z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="w-full px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex flex-col gap-1 cursor-pointer" onClick={() => setCurrentPage("orientation")} data-testid="logo-home">
            <span className="text-[18px] md:text-[20px] font-bold text-[#F03319] tracking-tight leading-none uppercase">
              ABRIDGE
            </span>
            <span className="text-[14px] md:text-[15px] font-semibold text-[#111827] tracking-tight leading-none">
              ROI Calculator
            </span>
          </div>

          {currentPage !== "orientation" && (
            <div className="hidden md:block">
              <Stepper currentPage={currentPage} />
            </div>
          )}
        </div>

        {currentPage !== "orientation" && (
          <div className="md:hidden border-t border-neutral-100 py-3.5 px-6">
            <Stepper currentPage={currentPage} />
          </div>
        )}
      </header>

      {/* Content */}
      <div
        className={`relative z-10 flex-1 overflow-y-auto ${currentPage === "orientation" ? "" : "pb-28"}`}
      >
        {/* PAGE 0 — ORIENTATION */}
        {currentPage === "orientation" && (
          <div className="relative min-h-full">
            <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-center py-20 md:py-28 relative z-10">
              <div className="w-full max-w-3xl text-center">
                <div className="landing-animate-card w-full bg-white border border-neutral-200/60 rounded-2xl md:rounded-3xl px-8 py-12 md:px-16 md:py-16 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                  <h2 className="landing-animate-headline text-[32px] md:text-[40px] lg:text-[48px] font-bold text-[#111827] tracking-[-0.02em]">
                    <span className="block leading-[1.2]">
                      Model the impact of
                    </span>
                    <span className="block mt-1 leading-[1.2]">
                      ambient documentation
                    </span>
                  </h2>
                  
                  <p className="landing-animate-subtitle-1 mt-6 text-base md:text-lg text-[#6B7280] leading-relaxed max-w-[540px] mx-auto">
                    Understand where the value actually comes from.
                  </p>

                  <div className="landing-animate-button mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={handleContinueToPage1}
                      className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-base border-2 border-[#E8532F] text-[#E8532F] bg-transparent hover:bg-[#E8532F] hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(232,83,47,0.25)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(232,83,47,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8532F] focus-visible:ring-offset-2"
                      data-testid="button-start"
                    >
                      Build ROI Model
                      <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                  
                  <p className="landing-animate-trust mt-5 text-[13px] text-[#9CA3AF] tracking-[0.02em]">
                    Used by 200+ health system partners
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 1 — CARE SETTING */}
        {currentPage === "setting" && (
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
            <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-6">
              Select a care setting
            </h2>
            
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
              <p className="text-lg font-semibold text-[#111827] mb-2">Build a model for your organization</p>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Each care setting has unique documentation workflows, encounter patterns, and value drivers. Your selection determines the baseline assumptions throughout this calculator.
              </p>
              <p className="text-[13px] text-[#6B7280] mt-4 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Based on data from 200+ health system partners
              </p>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-5 py-4 mb-8 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[#1E40AF] mb-3">Why care setting matters</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#1E40AF]">Workflows differ by setting—so ROI drivers differ too. <em>Example:</em> Emergency departments prioritize throughput; outpatient prioritizes patient access.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#1E40AF]">This sets the assumptions used throughout the model.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#1E40AF]">You'll get a tailored output you can share.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
              <div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                    Available Care Settings
                  </h3>
                  <p className="text-sm text-[#6B7280]">
                    Choose the environment that matches your organization
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_SETTINGS.map((setting) => {
                    const isInpatient = setting === "inpatient";
                    return (
                      <CareSettingRow
                        key={setting}
                        icon={SETTING_ICONS[setting]}
                        label={CARE_SETTING_LABELS[setting]}
                        settingKey={setting}
                        selected={selectedSetting === setting}
                        disabled={isInpatient}
                        onClick={() => handleSettingSelect(setting)}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="sticky top-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#E5E7EB]">
                    <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-[0.05em]">
                      Your Selection
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                      Care Setting
                    </p>
                    {selectedSetting ? (
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-[#111827]">
                          {CARE_SETTING_LABELS[selectedSetting]}
                        </span>
                        <Check className="w-5 h-5 text-[#E8532F]" />
                      </div>
                    ) : (
                      <p className="text-sm text-[#9CA3AF] italic">No setting selected</p>
                    )}
                    
                    {selectedSetting && SETTING_DRIVERS[selectedSetting] && SETTING_DRIVERS[selectedSetting].length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-[#6B7280] mb-2">Typical drivers:</p>
                        <ul className="space-y-1 text-[13px] text-[#6B7280] leading-relaxed">
                          {SETTING_DRIVERS[selectedSetting].map((driver, idx) => (
                            <li key={idx}>• {driver}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-[#E5E7EB] px-6 py-5">
                    <button
                      type="button"
                      disabled={!canContinuePage1}
                      onClick={handleContinueToPage2}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        canContinuePage1
                          ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm hover:shadow"
                          : "opacity-40 bg-neutral-900 text-white cursor-not-allowed"
                      }`}
                      data-testid="button-continue-to-priorities"
                    >
                      Continue
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile sticky bottom bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_8px_rgba(0,0,0,0.1)] px-4 py-4 z-50">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#6B7280]">
                  {selectedSetting ? (
                    <span className="text-[#111827] font-medium">{CARE_SETTING_LABELS[selectedSetting]} selected</span>
                  ) : (
                    "Select a care setting"
                  )}
                </span>
                <button
                  type="button"
                  disabled={!canContinuePage1}
                  onClick={handleContinueToPage2}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    canContinuePage1
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "opacity-40 bg-neutral-900 text-white cursor-not-allowed"
                  }`}
                  data-testid="button-continue-to-priorities-mobile"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2 — STRATEGIC PRIORITIES */}
        {currentPage === "priorities" && selectedSetting && (
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
            <button
              onClick={handleBackToPage1}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70 mb-6"
              data-testid="button-back-to-setting"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-6">
              Strategic Priorities
            </h2>
            
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
              <p className="text-lg font-semibold text-[#111827] mb-2">What outcomes matter most right now?</p>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Select 2-6 strategic priorities. These will shape your ROI model and determine which value drivers we analyze in detail.
              </p>
              <p className="text-[13px] text-[#6B7280] mt-4 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Based on proven methodologies from 200+ health system partners
              </p>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-5 py-4 mb-8 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[#1E40AF] mb-2">Selecting your priorities</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#1E40AF]">Most organizations select 2-3 drivers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-[#1E40AF]">You'll see detailed calculations for each selected driver in the next step.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">
              <div>
                {leversByCategory && (
                  <div>
                    {renderCategorySection("time", leversByCategory.time, true)}
                    {renderCategorySection(
                      "documentation",
                      leversByCategory.documentation,
                      false,
                    )}
                  </div>
                )}
              </div>
              
              <div className="hidden lg:block">
                <div className="sticky top-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#E5E7EB]">
                    <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-[0.05em]">
                      Your Selections
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-5 pb-5 border-b border-[#E5E7EB]">
                      <p className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                        Care Setting
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-medium text-[#111827]">
                          {CARE_SETTING_LABELS[selectedSetting]}
                        </span>
                        <Check className="w-4 h-4 text-[#E8532F]" />
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                        Strategic Priorities
                      </p>
                      <p className="text-[13px] text-[#6B7280] mb-4">Select 2-6 drivers</p>
                      
                      {selectedLeverIds.size < 2 ? (
                        <p className="text-sm text-[#6B7280] leading-relaxed">
                          Choose at least 2 drivers to continue
                        </p>
                      ) : (
                        <>
                          <ul className="space-y-2 mb-4">
                            {Array.from(selectedLeverIds).map((leverId) => {
                              const lever = SETTING_CONFIG[selectedSetting]?.find((l: LeverConfig) => l.id === leverId);
                              if (!lever) return null;
                              return (
                                <li key={leverId} className="flex items-center gap-2 text-sm text-[#111827]">
                                  <Check className="w-4 h-4 text-[#E8532F] flex-shrink-0" />
                                  <span>{lever.label}</span>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="text-[13px] text-[#6B7280]">
                            {selectedLeverIds.size} of 6 selected
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-[#E5E7EB] px-6 py-5">
                    <button
                      type="button"
                      disabled={!canContinuePage2}
                      onClick={handleContinueToPage3}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        canContinuePage2
                          ? "bg-[#111827] text-white hover:bg-[#E8532F]"
                          : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                      }`}
                      data-testid="button-continue-to-blueprint"
                    >
                      Continue
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile sticky bottom bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] shadow-[0_-2px_8px_rgba(0,0,0,0.1)] px-4 py-4 z-50">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#6B7280]">
                  {selectedLeverIds.size > 0 ? (
                    <span className="text-[#111827] font-medium">{selectedLeverIds.size} driver{selectedLeverIds.size !== 1 ? 's' : ''} selected</span>
                  ) : (
                    "Select at least 2 drivers"
                  )}
                </span>
                <button
                  type="button"
                  disabled={!canContinuePage2}
                  onClick={handleContinueToPage3}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    canContinuePage2
                      ? "bg-[#111827] text-white hover:bg-[#E8532F]"
                      : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                  }`}
                  data-testid="button-continue-to-blueprint-mobile"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3 — VALUE BLUEPRINT */}
        {currentPage === "value-blueprint" && selectedSetting && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16 pb-32">
            <div className="max-w-4xl">
              <button
                onClick={handleBackToPage2}
                className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
                data-testid="button-back-to-priorities"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-4">
                  Value Methodology
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  This reference scenario shows potential value for a typical mid-sized practice. Review how each driver creates value, then customize with your specific numbers in the next step.
                </p>
              </div>

              {/* Reference Scenario Section */}
              <section className="mb-10">
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Reference Scenario</h3>
                    <p className="text-sm text-neutral-500">Typical mid-sized outpatient practice</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 flex-shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="text-center sm:text-left min-w-0">
                        <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{REFERENCE_SCENARIO.providers}</div>
                        <div className="text-[10px] sm:text-xs text-neutral-500">providers</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-50 flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="text-center sm:text-left min-w-0">
                        <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{formatNumber(REFERENCE_SCENARIO.annualVisits)}</div>
                        <div className="text-[10px] sm:text-xs text-neutral-500">annual visits</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-50 flex-shrink-0">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="text-center sm:text-left min-w-0">
                        <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{REFERENCE_SCENARIO.adoptionPercent}%</div>
                        <div className="text-[10px] sm:text-xs text-neutral-500">adoption</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                    <Calculator className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-600">This creates:</span>
                    <span className="text-base font-semibold text-neutral-900">
                      ~{formatNumber(REFERENCE_SCENARIO.documentedEncounters)} Abridge-documented encounters/year
                    </span>
                  </div>
                </div>
              </section>

              {/* Value Drivers Section */}
              <section className="mb-10">
                <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                  Your Selected Value Drivers
                </h3>
                
                <div className="space-y-4">
                  {Array.from(selectedLeverIds).map((leverId) => {
                    const driver = DRIVER_CONTENT[leverId];
                    if (!driver) return null;
                    
                    const DriverIcon = driver.icon;
                    const isExpanded = expandedDrivers.has(leverId);
                    
                    return (
                      <div 
                        key={leverId}
                        className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedDrivers(prev => {
                              const next = new Set(prev);
                              if (next.has(leverId)) {
                                next.delete(leverId);
                              } else {
                                next.add(leverId);
                              }
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
                          data-testid={`driver-toggle-${leverId}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FFF5F3]">
                              <DriverIcon className="w-5 h-5 text-[#F03319]" />
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">{driver.label}</div>
                              <div className="text-sm text-neutral-500">
                                Reference value: <span className="font-mono font-medium text-green-600">${formatNumber(driver.referenceValue)}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-neutral-100">
                            {/* The Theory */}
                            <div className="mt-5 mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-neutral-700">The Theory</span>
                              </div>
                              <p className="text-sm text-neutral-600 leading-relaxed pl-6">
                                {driver.theory}
                              </p>
                            </div>
                            
                            {/* How We Calculate It */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Calculator className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-neutral-700">How We Calculate It</span>
                              </div>
                              <div className="space-y-4 pl-6">
                                {driver.calculationSteps.map((step, idx) => (
                                  <div key={idx} className="bg-slate-50 rounded-lg p-4">
                                    <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">{step.title}</div>
                                    <div className="space-y-1">
                                      {step.steps.map((s, sIdx) => {
                                        if (s.note === "warning") {
                                          return (
                                            <div key={sIdx} className="mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                                              <span className="text-xs text-amber-800 flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                                {s.label}
                                              </span>
                                            </div>
                                          );
                                        }
                                        if (s.note === "info") {
                                          return (
                                            <div key={sIdx} className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                                              <span className="text-xs text-blue-800 flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                                {s.label}
                                              </span>
                                            </div>
                                          );
                                        }
                                        if (s.note === "explanatory") {
                                          return (
                                            <div key={sIdx} className="mt-1 text-xs text-neutral-500 italic">
                                              {s.label}
                                            </div>
                                          );
                                        }
                                        return (
                                          <div key={sIdx} className="flex items-center justify-between text-sm">
                                            <span className="text-neutral-600">{s.label}</span>
                                            <span className="font-mono text-neutral-900">
                                              {s.value}
                                              {s.note && <span className="text-[#F03319]/70 text-xs ml-1">{s.note}</span>}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Key Variables */}
                            <div className="mb-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-4 h-4 text-neutral-500" />
                                <span className="text-sm font-semibold text-neutral-700">Key Variables You'll Customize</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-6">
                                {driver.keyVariables.map((v, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-neutral-100 rounded-full text-xs text-neutral-600">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {/* Range Across Customers */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-semibold text-neutral-700">Range Across Customers</span>
                              </div>
                              <div className="flex gap-4 pl-6 text-sm">
                                <span className="text-neutral-600">Conservative: <span className="font-medium">{driver.rangeData.conservative}</span></span>
                                <span className="text-neutral-600">Typical: <span className="font-medium">{driver.rangeData.typical}</span></span>
                                {driver.rangeData.aggressive && (
                                  <span className="text-neutral-600">Aggressive: <span className="font-medium">{driver.rangeData.aggressive}</span></span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Combined Impact Summary */}
              <section className="mb-10">
                <div className="rounded-xl bg-white border border-neutral-200 p-6">
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                    Combined Impact (Reference Scenario)
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {Array.from(selectedLeverIds).map((leverId) => {
                      const driver = DRIVER_CONTENT[leverId];
                      if (!driver) return null;
                      return (
                        <div key={leverId} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-700">{driver.label}</span>
                          <span className="font-mono font-medium text-neutral-900">${formatNumber(driver.referenceValue)}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-neutral-900">Total Annual Benefit</span>
                      <span className="text-2xl font-bold text-green-600 font-mono">
                        ${formatNumber(
                          Array.from(selectedLeverIds).reduce((sum, leverId) => {
                            const driver = DRIVER_CONTENT[leverId];
                            return sum + (driver?.referenceValue || 0);
                          }, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Callout box */}
                <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    This is before accounting for investment costs. Next, you'll input your specifics to see YOUR numbers.
                  </p>
                </div>
              </section>

              {/* Important to Know Warning */}
              <section className="mb-6">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-2">Important to Know</h4>
                      <p className="text-sm text-amber-800 mb-3">
                        These calculations use typical assumptions from 200+ health system partners.
                      </p>
                      <p className="text-sm text-amber-800 mb-2 font-medium">
                        Important limitations:
                      </p>
                      <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc mb-3">
                        <li>We don't have access to your specific payer contracts, reimbursement rates, or financial systems</li>
                        <li>Revenue assumptions use blended averages—your actual rates may vary</li>
                        <li>Capacity value assumes patient demand exists to fill additional appointment slots</li>
                        <li>Long-term metrics (retention) may require 12+ months to measure</li>
                      </ul>
                      <p className="text-sm text-amber-800 font-medium">
                        The formulas stay the same—only YOUR numbers change. Adjust assumptions to reflect your organization's reality.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* PAGE 4 — BASELINE ASSUMPTIONS */}
        {currentPage === "model-setup" && selectedSetting && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
            <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
              <div>
                <button
                  onClick={handleBackToPage3}
                  className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
                  data-testid="button-back-to-blueprint"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="mb-10">
                  <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-4">
                    Baseline Assumptions
                  </h2>
                  <p className="text-lg text-neutral-600 leading-relaxed">
                    These inputs shape your ROI model.
                  </p>
                </div>

                {/* Mini-wizard step indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {([1, 2, 3] as const).map((step) => {
                    const isComplete = step === 1 ? isStep1Complete : step === 2 ? isStep2Complete : isStep3Complete;
                    const isActive = modelSetupStep === step;
                    
                    return (
                      <button
                        key={step}
                        onClick={() => setModelSetupStep(step)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          isActive
                            ? "bg-[#FFF5F3] text-[#F03319] ring-1 ring-[#F03319]/20"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isActive ? "bg-[#F03319]/10 text-[#F03319]" : isComplete ? "bg-neutral-300" : "bg-neutral-200"
                        }`}>
                          {isComplete && !isActive ? (
                            <Check className="w-3 h-3 text-neutral-600" />
                          ) : (
                            step
                          )}
                        </span>
                        {step === 1 && "Adoption"}
                        {step === 2 && "Value Realization"}
                        {step === 3 && "Investment"}
                      </button>
                    );
                  })}
                </div>

                {/* Step 1: Adoption */}
                {modelSetupStep === 1 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
                    <div className="space-y-6">
                      {/* Blueprint Context Callout */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800">
                            The Blueprint showed a reference scenario. Now input YOUR organization's actual numbers to see your specific ROI.
                          </p>
                        </div>
                      </div>

                      {/* Providers in scope - Required */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Providers (in scope){" "}
                          <span className="text-[#F03319]">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cliniciansInScope === "" ? "" : formatNumber(cliniciansInScope)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setCliniciansInScope("");
                            } else {
                              setCliniciansInScope(Math.max(0, parseFormattedNumber(val)));
                            }
                          }}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all font-mono"
                          data-testid="input-clinicians"
                          placeholder="e.g., 50"
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                          Number of providers who will use Abridge. This is the foundation of your ROI model.
                        </p>
                      </div>

                      {/* Annual outpatient encounters (in scope) - Required */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Annual outpatient encounters (in scope){" "}
                          <span className="text-[#F03319]">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={annualEncountersInScope === "" ? "" : formatNumber(annualEncountersInScope)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setAnnualEncountersInScope("");
                            } else {
                              setAnnualEncountersInScope(Math.max(0, parseFormattedNumber(val)));
                            }
                          }}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all font-mono"
                          data-testid="input-encounters"
                          placeholder="e.g., 100,000"
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                          Total annual patient encounters for the providers in scope. This drives encounter-based ROI calculations.
                        </p>
                      </div>

                      {/* Utilization Rate */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Utilization rate:{" "}
                          <span className="text-base text-[#F03319] font-semibold">
                            {utilizationPercent !== null
                              ? `${utilizationPercent}%`
                              : "—"}
                          </span>
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={utilizationPercent ?? 50}
                          onChange={(e) =>
                            setUtilizationPercent(parseInt(e.target.value))
                          }
                          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#F03319]"
                          data-testid="slider-utilization"
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => setUtilizationPercent(50)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              utilizationPercent === 50
                                ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                            data-testid="chip-util-conservative"
                          >
                            <div className="flex flex-col items-center">
                              <span>Early (50%)</span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                Pilot / phased rollout
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => setUtilizationPercent(65)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              utilizationPercent === 65
                                ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                            data-testid="chip-util-expected"
                          >
                            <div className="flex flex-col items-center">
                              <span>Typical (65%)</span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                Steady adoption with enablement
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => setUtilizationPercent(80)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              utilizationPercent === 80
                                ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                            data-testid="chip-util-high"
                          >
                            <div className="flex flex-col items-center">
                              <span>Aggressive (80%)</span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                Mature deployment
                              </span>
                            </div>
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                          Percentage of encounters where Abridge is actively used for documentation.
                        </p>

                        {/* Why this matters - Expandable */}
                        <button
                          onClick={() => setWhyMattersExpanded(!whyMattersExpanded)}
                          className="flex items-center gap-2 mt-3 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                          data-testid="button-why-matters-toggle"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${whyMattersExpanded ? "rotate-90" : ""}`} />
                          <span className="font-medium">Why this matters</span>
                        </button>
                        {whyMattersExpanded && (
                          <div className="mt-3 pl-6 border-l-2 border-neutral-200">
                            <p className="text-sm text-neutral-600 mb-3">
                              This determines how many encounters will actually be documented with Abridge—which drives all value calculations.
                            </p>
                            <div className="bg-neutral-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                                <BarChart3 className="w-4 h-4" />
                                Based on 200+ health system rollouts:
                              </div>
                              <ul className="text-sm text-neutral-600 space-y-1 ml-6">
                                <li>Month 1-3: 40-50%</li>
                                <li>Month 4-6: 60-70%</li>
                                <li>Month 7+: 70-85%</li>
                              </ul>
                            </div>
                            <p className="text-xs text-neutral-500 italic mt-3">
                              Your organization's actual adoption may vary based on training, workflow integration, and clinician engagement.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Live Calculation Summary - Only show when both fields have values */}
                      {effectiveClinicians > 0 && effectiveEncounters > 0 && (
                        <div 
                          className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in fade-in duration-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-emerald-700" />
                            <span className="text-sm font-semibold text-emerald-800">YOUR SCENARIO</span>
                          </div>
                          <div className="text-sm text-emerald-700">
                            <span className="font-mono">{formatNumber(effectiveClinicians)}</span> providers{" "}
                            <span className="text-emerald-500 mx-1">×</span>{" "}
                            <span className="font-mono">{formatNumber(effectiveEncounters)}</span> encounters{" "}
                            <span className="text-emerald-500 mx-1">×</span>{" "}
                            <span className="font-mono">{utilizationPercent ?? 0}%</span> utilization
                          </div>
                          <div className="mt-2 pt-2 border-t border-emerald-200">
                            <span className="text-emerald-700">=</span>{" "}
                            <span className="font-semibold text-emerald-800 font-mono text-lg">
                              {formatNumber(Math.round(effectiveEncounters * ((utilizationPercent ?? 0) / 100)))}
                            </span>{" "}
                            <span className="text-emerald-700">Abridge-documented encounters per year</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                      {(effectiveClinicians === 0 || effectiveEncounters === 0) && (
                        <p className="text-sm text-[#F03319]">
                          {effectiveClinicians === 0 && effectiveEncounters === 0
                            ? "Please enter number of providers and annual encounters"
                            : effectiveClinicians === 0
                            ? "Please enter number of providers"
                            : "Please enter annual encounters"}
                        </p>
                      )}
                      <div className="ml-auto">
                        <button
                          onClick={() => setModelSetupStep(2)}
                          disabled={
                            effectiveClinicians === 0 || effectiveEncounters === 0
                          }
                          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                            effectiveClinicians > 0 && effectiveEncounters > 0
                              ? "bg-neutral-900 text-white hover:bg-neutral-800"
                              : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                          }`}
                          data-testid="button-step1-next"
                        >
                          Next: Value Realization
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Value Realization */}
                {modelSetupStep === 2 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
                    {/* Context Callout */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">In the Blueprint</span>, we showed typical assumptions for each driver. Now choose how conservatively or aggressively to apply them to YOUR scenario.
                        </p>
                      </div>
                    </div>

                    {/* Value Posture Header */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-base font-semibold text-neutral-900">
                          Value posture
                        </div>
                        {detectedPosture === "custom" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-600 mb-4">
                        How aggressively should this model assume value realization? Choose the posture that best matches your rollout confidence.
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyPosture("conservative")}
                          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                            detectedPosture === "conservative"
                              ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                          data-testid="posture-conservative"
                        >
                          Conservative
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPosture("typical")}
                          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                            detectedPosture === "typical"
                              ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                          data-testid="posture-typical"
                        >
                          Typical
                          <span className="ml-1.5 text-xs text-neutral-500">(Recommended)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPosture("aggressive")}
                          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                            detectedPosture === "aggressive"
                              ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                          data-testid="posture-aggressive"
                        >
                          Aggressive
                        </button>
                      </div>
                    </div>

                    {/* Posture Preview Card */}
                    {detectedPosture && (
                      <div className="border border-neutral-200 rounded-xl p-5 mb-6 bg-neutral-50/50" data-testid="posture-preview-card">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                            {detectedPosture.toUpperCase()} POSTURE
                          </span>
                        </div>
                        <p className="text-sm text-[#6B7280] mb-1">
                          {detectedPosture === "conservative" && "Best for: Risk-averse modeling, board presentation"}
                          {detectedPosture === "typical" && "Best for: Initial business case, balanced approach"}
                          {detectedPosture === "aggressive" && "Best for: Aspirational planning, optimal adoption"}
                          {detectedPosture === "custom" && "Custom assumptions based on your fine-tuned inputs"}
                        </p>
                        <p className="text-[13px] text-[#6B7280] mb-4">
                          {detectedPosture === "custom" 
                            ? `Customized from ${lastNonCustomPosture.charAt(0).toUpperCase() + lastNonCustomPosture.slice(1)} posture`
                            : "Based on: Median performance from 200+ health system partners"
                          }
                        </p>
                        
                        {/* Dynamic driver values */}
                        <div className="text-xs font-medium text-neutral-700 mb-2">
                          Your value drivers:
                        </div>
                        <div className="space-y-3">
                          {Array.from(selectedLeverIds).map((leverId) => {
                            const driverContent = DRIVER_CONTENT[leverId];
                            if (!driverContent) return null;
                            const dynamicValue = currentDriverValues[leverId as keyof typeof currentDriverValues] || 0;
                            return (
                              <div key={leverId} className="flex items-start justify-between gap-3 bg-white rounded-lg p-3 border border-neutral-100" data-testid={`driver-preview-${leverId}`}>
                                <div className="flex items-start gap-2">
                                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="text-sm font-medium text-neutral-800">{driverContent.label}</div>
                                    <div className="text-[13px] text-[#6B7280] mt-0.5 ml-5">
                                      {leverId === "patientAccess" && `Minutes saved: ${effectiveMinutesSaved || 2.5} per encounter`}
                                      {leverId === "wrvu" && `Documentation lift: ${wrvuSensitivity || 5}%`}
                                      {leverId === "overtime" && `After-hours reduction: ${ftOvertimeAfterHoursReduction || 20}%`}
                                      {leverId === "workforce" && `Turnover reduction via burnout relief`}
                                      {leverId === "hcc" && `Recapture rate: ${ftHccRecaptureRate || 50}%`}
                                      {leverId === "denials" && `Prevention rate: ${ftDenialPreventionRate || 66}%`}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-emerald-700 font-mono whitespace-nowrap" data-testid={`value-${leverId}`}>
                                  ${formatNumber(dynamicValue)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-neutral-900">TOTAL PROJECTED VALUE:</span>
                            <span className="text-lg font-bold text-emerald-700 font-mono" data-testid="total-projected-value">
                              ${formatNumber(totalProjectedValue)}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#6B7280] mt-1 italic">(Before investment costs)</p>
                          <div className="flex items-start gap-1.5 mt-3">
                            <Lightbulb className="w-3.5 h-3.5 text-[#6B7280] mt-0.5 flex-shrink-0" />
                            <p className="text-[13px] text-[#6B7280]">Calculated from your inputs and posture settings.</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setComparePosturesExpanded(!comparePosturesExpanded)}
                          className="mt-4 text-sm font-medium text-[#E8532F] hover:text-[#d14a28] flex items-center gap-1 transition-all"
                          data-testid="button-compare-postures"
                        >
                          <span className={`text-[#E8532F] transition-transform duration-200 ${comparePosturesExpanded ? "rotate-90" : ""}`}>›</span>
                          Compare All Postures
                        </button>

                        {/* Compare Postures Table */}
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-out ${
                            comparePosturesExpanded ? "max-h-[800px] opacity-100 mt-4" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[#E5E7EB]">
                                  <th className="text-left py-2 pr-4 text-sm font-medium text-[#6B7280]">Driver</th>
                                  <th className={`text-right py-2 px-3 text-sm font-medium ${detectedPosture === "conservative" ? "text-[#111827] bg-[#F9FAFB]" : "text-[#6B7280]"}`}>Conservative</th>
                                  <th className={`text-right py-2 px-3 text-sm font-medium ${detectedPosture === "typical" ? "text-[#111827] bg-[#F9FAFB]" : "text-[#6B7280]"}`}>Typical</th>
                                  <th className={`text-right py-2 px-3 text-sm font-medium ${detectedPosture === "aggressive" ? "text-[#111827] bg-[#F9FAFB]" : "text-[#6B7280]"}`}>Aggressive</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from(selectedLeverIds).map((leverId) => {
                                  const content = DRIVER_CONTENT[leverId];
                                  if (!content) return null;
                                  return (
                                    <tr key={leverId}>
                                      <td className="py-2 pr-4 text-sm font-medium text-[#111827]">{content.label}</td>
                                      <td className={`py-2 px-3 text-right text-sm tabular-nums ${detectedPosture === "conservative" ? "bg-[#F9FAFB] text-[#111827] font-medium" : "text-[#111827]"}`}>${formatNumber(getDriverValueForPosture(leverId, "conservative"))}</td>
                                      <td className={`py-2 px-3 text-right text-sm tabular-nums ${detectedPosture === "typical" ? "bg-[#F9FAFB] text-[#111827] font-medium" : "text-[#111827]"}`}>${formatNumber(getDriverValueForPosture(leverId, "typical"))}</td>
                                      <td className={`py-2 px-3 text-right text-sm tabular-nums ${detectedPosture === "aggressive" ? "bg-[#F9FAFB] text-[#111827] font-medium" : "text-[#111827]"}`}>${formatNumber(getDriverValueForPosture(leverId, "aggressive"))}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="border-t border-[#E5E7EB]">
                                  <td className="py-2 pr-4 text-[15px] font-bold text-[#111827]">TOTAL</td>
                                  <td className={`py-2 px-3 text-right text-[15px] font-bold tabular-nums ${detectedPosture === "conservative" ? "bg-[#F9FAFB] text-emerald-700" : "text-[#111827]"}`}>
                                    ${formatNumber(getTotalForPosture("conservative"))}
                                  </td>
                                  <td className={`py-2 px-3 text-right text-[15px] font-bold tabular-nums ${detectedPosture === "typical" ? "bg-[#F9FAFB] text-emerald-700" : "text-[#111827]"}`}>
                                    ${formatNumber(getTotalForPosture("typical"))}
                                  </td>
                                  <td className={`py-2 px-3 text-right text-[15px] font-bold tabular-nums ${detectedPosture === "aggressive" ? "bg-[#F9FAFB] text-emerald-700" : "text-[#111827]"}`}>
                                    ${formatNumber(getTotalForPosture("aggressive"))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            
                            {/* Key Assumption Differences */}
                            <div className="mt-4 pt-3 border-t border-[#E5E7EB]">
                              <p className="text-[13px] font-medium text-[#6B7280] mb-2">Key assumption differences:</p>
                              <div className="grid grid-cols-4 gap-2 text-[13px] text-[#6B7280]">
                                <div></div>
                                <div className={`text-right ${detectedPosture === "conservative" ? "font-medium text-[#111827]" : ""}`}>Conservative</div>
                                <div className={`text-right ${detectedPosture === "typical" ? "font-medium text-[#111827]" : ""}`}>Typical</div>
                                <div className={`text-right ${detectedPosture === "aggressive" ? "font-medium text-[#111827]" : ""}`}>Aggressive</div>
                                
                                {selectedLeverIds.has("patientAccess") && (
                                  <>
                                    <div>• Minutes saved</div>
                                    <div className="text-right tabular-nums">2.0 min</div>
                                    <div className="text-right tabular-nums">2.5 min</div>
                                    <div className="text-right tabular-nums">4.0 min</div>
                                  </>
                                )}
                                {(selectedLeverIds.has("patientAccess") || selectedLeverIds.has("overtime")) && (
                                  <>
                                    <div>• Realization factor</div>
                                    <div className="text-right tabular-nums">10%</div>
                                    <div className="text-right tabular-nums">20%</div>
                                    <div className="text-right tabular-nums">30%</div>
                                  </>
                                )}
                                {selectedLeverIds.has("wrvu") && (
                                  <>
                                    <div>• Doc quality lift</div>
                                    <div className="text-right tabular-nums">3%</div>
                                    <div className="text-right tabular-nums">5%</div>
                                    <div className="text-right tabular-nums">7%</div>
                                  </>
                                )}
                                {selectedLeverIds.has("hcc") && (
                                  <>
                                    <div>• Recapture rate</div>
                                    <div className="text-right tabular-nums">40%</div>
                                    <div className="text-right tabular-nums">50%</div>
                                    <div className="text-right tabular-nums">60%</div>
                                  </>
                                )}
                                {selectedLeverIds.has("denials") && (
                                  <>
                                    <div>• Denial prevention</div>
                                    <div className="text-right tabular-nums">50%</div>
                                    <div className="text-right tabular-nums">66%</div>
                                    <div className="text-right tabular-nums">80%</div>
                                  </>
                                )}
                                {selectedLeverIds.has("overtime") && (
                                  <>
                                    <div>• After-hours reduction</div>
                                    <div className="text-right tabular-nums">15%</div>
                                    <div className="text-right tabular-nums">20%</div>
                                    <div className="text-right tabular-nums">30%</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fine-Tune Assumptions Section */}
                    <div className="border-2 border-[#F03319]/20 bg-gradient-to-r from-[#FFF7F5] to-white rounded-xl mb-6 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setFineTuneExpanded(!fineTuneExpanded)}
                        className="w-full flex items-center justify-between p-4 text-left"
                        data-testid="button-fine-tune-toggle"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[#F03319]/10 transition-transform ${fineTuneExpanded ? "rotate-0" : ""}`}>
                            <Sliders className="w-4 h-4 text-[#F03319]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#F03319]">FINE-TUNE ASSUMPTIONS</span>
                              <span className="text-xs px-2 py-0.5 bg-[#F03319]/10 text-[#F03319] rounded-full font-medium">Optional</span>
                            </div>
                            <p className="text-xs text-neutral-600 mt-0.5">
                              Want more control? Adjust the key assumptions that drive your selected value drivers.
                            </p>
                          </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-[#F03319] transition-transform ${fineTuneExpanded ? "" : "-rotate-90"}`} />
                      </button>
                      
                      {fineTuneExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-800">
                                <span className="font-medium">Note:</span> Changing these overrides your posture selection
                              </p>
                            </div>
                          </div>

                          {/* Customization Summary - only show if there are changes */}
                          {customizations.length > 0 && (
                            <div className="bg-[#F5F3EF] border border-[#E8E4DB] rounded-lg p-4 mb-6">
                              <p className="text-sm font-bold text-neutral-800">
                                Your customizations: <span className="text-[#E8532F]">{customizations.length} change{customizations.length > 1 ? "s" : ""}</span> from {lastNonCustomPosture.charAt(0).toUpperCase() + lastNonCustomPosture.slice(1)} posture
                              </p>
                              <div className="mt-2 space-y-1">
                                {customizations.map((change, idx) => (
                                  <p key={idx} className="text-[13px] text-neutral-700 leading-relaxed tabular-nums">
                                    • {change.driver}: {change.input} ({change.oldValue} → {change.newValue})
                                  </p>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowResetAllModal(true)}
                                className="mt-3 text-sm text-[#E8532F] hover:underline cursor-pointer"
                                data-testid="button-reset-all"
                              >
                                [Reset All to Typical]
                              </button>
                            </div>
                          )}

                          {/* Fine-tune inputs - grouped by category */}
                          <div className="space-y-8">
                            {/* CAPACITY & LABOR Category */}
                            {(selectedLeverIds.has("patientAccess") || selectedLeverIds.has("workforce") || selectedLeverIds.has("overtime")) && (
                              <div>
                                <div className="flex items-center gap-3 mb-4">
                                  <span className="text-sm font-semibold uppercase tracking-wider text-[#6B7280]">Capacity & Labor</span>
                                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                                </div>
                                <div className="space-y-4">
                                  {/* Patient Access Fine-tune */}
                                  {selectedLeverIds.has("patientAccess") && (
                              <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-patientAccess">
                                <div className="text-sm font-semibold text-neutral-900 mb-3">Patient Access</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Minutes saved per encounter</label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={customMinutes !== null ? customMinutes : (minutesSaved ?? "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                          setMinutesSaved(null as any);
                                          setCustomMinutes(null);
                                        } else {
                                          const num = parseFloat(val);
                                          if (!isNaN(num)) {
                                            setMinutesSaved(num);
                                            setCustomMinutes(num);
                                          }
                                        }
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
                                          setMinutesSaved(POSTURE_PRESETS.typical.minutes);
                                          setCustomMinutes(POSTURE_PRESETS.typical.minutes);
                                        }
                                      }}
                                      className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                      data-testid="input-ft-minutes-saved"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 1.5-4 min | Blueprint reference: 2.5 min</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Capacity realization factor</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={timeRealizationRate ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setTimeRealizationRate(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setTimeRealizationRate(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setTimeRealizationRate(POSTURE_PRESETS.typical.realization);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-realization-rate"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 10-35% | Blueprint reference: 20%</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      Portion of time saved that converts to new visits
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Average visit duration</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftPatientAccessVisitDuration ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtPatientAccessVisitDuration(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtPatientAccessVisitDuration(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtPatientAccessVisitDuration(30);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-visit-duration"
                                      />
                                      <span className="text-sm text-neutral-500">min</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 20-45 min | Blueprint reference: 30 min</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Revenue per visit</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-neutral-500">$</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftPatientAccessRevenuePerVisit ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtPatientAccessRevenuePerVisit(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtPatientAccessRevenuePerVisit(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtPatientAccessRevenuePerVisit(200);
                                          }
                                        }}
                                        className="w-28 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-revenue-per-visit"
                                      />
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: $150-350 | Blueprint reference: $200</p>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => { 
                                    setMinutesSaved(POSTURE_PRESETS.typical.minutes); 
                                    setCustomMinutes(null);
                                    setTimeRealizationRate(POSTURE_PRESETS.typical.realization); 
                                    setFtPatientAccessVisitDuration(30);
                                    setFtPatientAccessRevenuePerVisit(200);
                                  }}
                                  className="mt-3 text-xs text-[#F03319] hover:underline"
                                  data-testid="button-reset-patientAccess"
                                >
                                  [Reset to Typical Defaults]
                                </button>
                                  </div>
                                  )}

                                  {/* Clinician Retention Fine-tune - moved into Capacity & Labor */}
                                  {selectedLeverIds.has("workforce") && (
                                    <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-workforce">
                                      <div className="text-sm font-semibold text-neutral-900 mb-3">Clinician Retention</div>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-neutral-600">Annual turnover rate</label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={ftRetentionTurnoverRate ?? ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  setFtRetentionTurnoverRate(null as any);
                                                } else {
                                                  const num = parseFloat(val);
                                                  if (!isNaN(num)) setFtRetentionTurnoverRate(num);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
                                                  setFtRetentionTurnoverRate(5);
                                                }
                                              }}
                                              className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                              data-testid="input-ft-turnover-rate"
                                            />
                                            <span className="text-sm text-neutral-500">%</span>
                                          </div>
                                          <p className="text-xs text-neutral-500 mt-1">Typical range: 4-8% | Blueprint reference: 5%</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-neutral-600">Replacement cost per provider</label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-neutral-500">$</span>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              value={ftRetentionReplacementCost ?? ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  setFtRetentionReplacementCost(null as any);
                                                } else {
                                                  const num = parseInt(val.replace(/,/g, ""));
                                                  if (!isNaN(num)) setFtRetentionReplacementCost(num);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value === "" || isNaN(parseInt(e.target.value.replace(/,/g, "")))) {
                                                  setFtRetentionReplacementCost(250000);
                                                }
                                              }}
                                              className="w-36 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                              data-testid="input-ft-replacement-cost"
                                            />
                                          </div>
                                          <p className="text-xs text-neutral-500 mt-1">Typical range: $200k-350k | Blueprint reference: $250,000</p>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-neutral-600">Abridge prevention effectiveness</label>
                                        <div className="flex items-center gap-2 mt-1">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={getRetentionPreventionPct()}
                                            disabled
                                            className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono bg-neutral-50 text-neutral-500"
                                            data-testid="input-ft-prevention-effectiveness"
                                          />
                                          <span className="text-sm text-neutral-500">%</span>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-1">Typical range: 30-50% | Blueprint reference: 40%</p>
                                        <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                          <Info className="w-3 h-3" />
                                          % of burnout-driven turnover prevented (set by posture)
                                        </p>
                                      </div>
                                      <p className="text-xs text-neutral-400 italic mt-2">Hidden assumption: 40% of turnover is burnout-related</p>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          setFtRetentionTurnoverRate(5);
                                          setFtRetentionReplacementCost(250000);
                                        }}
                                        className="mt-3 text-xs text-[#F03319] hover:underline"
                                        data-testid="button-reset-workforce"
                                      >
                                        [Reset to Typical Defaults]
                                      </button>
                                    </div>
                                  )}

                                  {/* Overtime Cost Avoidance Fine-tune - moved into Capacity & Labor */}
                                  {selectedLeverIds.has("overtime") && (
                                    <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-overtime">
                                      <div className="text-sm font-semibold text-neutral-900 mb-3">Overtime & Locum Cost Avoidance</div>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-neutral-600">After-hours documentation reduction</label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              value={ftOvertimeAfterHoursReduction ?? ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  setFtOvertimeAfterHoursReduction(null as any);
                                                } else {
                                                  const num = parseInt(val);
                                                  if (!isNaN(num)) setFtOvertimeAfterHoursReduction(num);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                                  setFtOvertimeAfterHoursReduction(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.overtimeReduction);
                                                }
                                              }}
                                              className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                              data-testid="input-ft-overtime-reduction"
                                            />
                                            <span className="text-sm text-neutral-500">%</span>
                                          </div>
                                          <p className="text-xs text-neutral-500 mt-1">Typical range: 15-30% | Blueprint reference: 20%</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-neutral-600">Blended premium labor rate</label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-neutral-500">$</span>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              value={ftOvertimePremiumRate ?? ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  setFtOvertimePremiumRate(null as any);
                                                } else {
                                                  const num = parseInt(val);
                                                  if (!isNaN(num)) setFtOvertimePremiumRate(num);
                                                }
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                                  setFtOvertimePremiumRate(145);
                                                }
                                              }}
                                              className="w-28 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                              data-testid="input-ft-premium-rate"
                                            />
                                            <span className="text-sm text-neutral-500">/hr</span>
                                          </div>
                                          <p className="text-xs text-neutral-500 mt-1">Typical range: $100-250/hr | Blueprint reference: $145</p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-neutral-600">Minutes saved per encounter</label>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono bg-neutral-50 text-neutral-500 w-28">{effectiveMinutesSaved ?? 2.5} min</span>
                                          </div>
                                          <p className="text-xs text-neutral-400 mt-1 italic">(Inherited from Patient Access)</p>
                                        </div>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          setFtOvertimeAfterHoursReduction(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.overtimeReduction);
                                          setFtOvertimePremiumRate(145);
                                        }}
                                        className="mt-3 text-xs text-[#F03319] hover:underline"
                                        data-testid="button-reset-overtime"
                                      >
                                        [Reset to Typical Defaults]
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* REVENUE & RISK Category */}
                            {(selectedLeverIds.has("wrvu") || selectedLeverIds.has("hcc") || selectedLeverIds.has("hccCapture") || selectedLeverIds.has("denials") || selectedLeverIds.has("denialReduction")) && (
                              <div>
                                <div className="flex items-center gap-3 mb-4">
                                  <span className="text-sm font-semibold uppercase tracking-wider text-[#6B7280]">Revenue & Risk</span>
                                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                                </div>
                                <div className="space-y-4">
                                  {/* Level of Service Fine-tune */}
                                  {selectedLeverIds.has("wrvu") && (
                              <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-wrvu">
                                <div className="text-sm font-semibold text-neutral-900 mb-3">Accurate Level of Service</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Baseline wRVU per encounter</label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={ftWrvuBaseline ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                          setFtWrvuBaseline(null as any);
                                        } else {
                                          const num = parseFloat(val);
                                          if (!isNaN(num)) setFtWrvuBaseline(num);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
                                          setFtWrvuBaseline(1.75);
                                        }
                                      }}
                                      className="w-full mt-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                      data-testid="input-ft-baseline-wrvu"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 1.3-3.4 | Blueprint reference: 1.75</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Documentation quality lift</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={wrvuSensitivity ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setWrvuSensitivity(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setWrvuSensitivity(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setWrvuSensitivity(POSTURE_PRESETS.typical.wrvu);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-wrvu-lift"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 2-8% | Blueprint reference: 5%</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      wRVU improvement from complete documentation
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Revenue per wRVU</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-neutral-500">$</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftWrvuRevenuePerUnit ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtWrvuRevenuePerUnit(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtWrvuRevenuePerUnit(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtWrvuRevenuePerUnit(50);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-revenue-wrvu"
                                      />
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: $25-75 | Blueprint reference: $50</p>
                                  </div>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setFtWrvuBaseline(1.75);
                                    setWrvuSensitivity(POSTURE_PRESETS.typical.wrvu);
                                    setFtWrvuRevenuePerUnit(40);
                                  }}
                                  className="mt-3 text-xs text-[#F03319] hover:underline"
                                  data-testid="button-reset-wrvu"
                                >
                                  [Reset to Typical Defaults]
                                </button>
                              </div>
                            )}

                                  {/* HCC Capture Fine-tune */}
                                  {(selectedLeverIds.has("hccCapture") || selectedLeverIds.has("hcc")) && (
                              <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-hccCapture">
                                <div className="text-sm font-semibold text-neutral-900 mb-3">HCC & Chronic Condition Capture</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Medicare Advantage population</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftHccMedicareAdvantage ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtHccMedicareAdvantage(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtHccMedicareAdvantage(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtHccMedicareAdvantage(15);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-medicare-advantage"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 5-40% | Blueprint reference: 15%</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Condition recapture rate</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftHccRecaptureRate ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtHccRecaptureRate(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtHccRecaptureRate(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtHccRecaptureRate(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.hccRecaptureRate);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-recapture-rate"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 40-60% | Blueprint reference: 50%</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      % of missed HCC conditions documented with Abridge
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Benchmark PMPM</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-neutral-500">$</span>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftHccBenchmarkPmpm ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtHccBenchmarkPmpm(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtHccBenchmarkPmpm(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtHccBenchmarkPmpm(1000);
                                          }
                                        }}
                                        className="w-28 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-benchmark-pmpm"
                                      />
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: $800-1,500 | Blueprint reference: $1,000</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      County-specific MA capitated payment
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-neutral-400 italic mt-2">Hidden assumptions: 2.5 visits/patient/year, 2.5 conditions/patient, 30% documentation gap, 0.25 RAF weight per condition</p>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setFtHccMedicareAdvantage(15);
                                    setFtHccRecaptureRate(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.hccRecaptureRate);
                                    setFtHccBenchmarkPmpm(1000);
                                  }}
                                  className="mt-3 text-xs text-[#F03319] hover:underline"
                                  data-testid="button-reset-hccCapture"
                                >
                                  [Reset to Typical Defaults]
                                </button>
                              </div>
                            )}

                                  {/* Denial Reduction Fine-tune */}
                                  {(selectedLeverIds.has("denialReduction") || selectedLeverIds.has("denials")) && (
                              <div className="border border-neutral-200 rounded-lg p-4 bg-white" data-testid="finetune-denialReduction">
                                <div className="text-sm font-semibold text-neutral-900 mb-3">Denial Reduction</div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Baseline denial rate</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={ftDenialBaselineRate ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtDenialBaselineRate(null as any);
                                          } else {
                                            const num = parseFloat(val);
                                            if (!isNaN(num)) setFtDenialBaselineRate(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
                                            setFtDenialBaselineRate(5);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-denial-rate"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 3-8% | Blueprint reference: 5%</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Prevention rate</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        value={ftDenialPreventionRate ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setFtDenialPreventionRate(null as any);
                                          } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) setFtDenialPreventionRate(num);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === "" || isNaN(parseInt(e.target.value))) {
                                            setFtDenialPreventionRate(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.denialPreventionRate);
                                          }
                                        }}
                                        className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono"
                                        data-testid="input-ft-denial-prevention"
                                      />
                                      <span className="text-sm text-neutral-500">%</span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">Typical range: 50-80% | Blueprint reference: 66%</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <Info className="w-3 h-3" />
                                      % of doc-related denials prevented with complete notes
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-neutral-600">Revenue per visit</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-neutral-500">$</span>
                                      <span className="px-3 py-2 border border-neutral-200 rounded-lg text-sm font-mono bg-neutral-50 text-neutral-500 w-28">{ftPatientAccessRevenuePerVisit}</span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1 italic">(Inherited from Patient Access)</p>
                                  </div>
                                </div>
                                <p className="text-xs text-neutral-400 italic mt-2">Hidden assumption: 30% of denials are documentation-related</p>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setFtDenialBaselineRate(5);
                                    setFtDenialPreventionRate(FINE_TUNE_EXTRA_POSTURE_VALUES.typical.denialPreventionRate);
                                  }}
                                  className="mt-3 text-xs text-[#F03319] hover:underline"
                                  data-testid="button-reset-denialReduction"
                                >
                                  [Reset to Typical Defaults]
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="mt-8 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setModelSetupStep(1)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                        data-testid="button-step2-back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelSetupStep(3)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800"
                        data-testid="button-step2-next"
                      >
                        Next: Investment
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Investment */}
                {modelSetupStep === 3 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
                    {/* Context Callout - uses dynamic totalProjectedValue */}
                    <div className="mb-6 p-4 bg-amber-50/60 border border-amber-200 rounded-xl" data-testid="investment-context-callout">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-900">
                          You've modeled <span className="font-semibold font-mono">~${formatNumber(totalProjectedValue)}</span> in annual value. Now let's account for what this investment costs.
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-neutral-600 mb-6">
                      How is this investment shaped?
                    </p>
                    <div className="space-y-6">
                      {/* Investment Model Section */}
                      <div>
                        <div className="space-y-3">
                          <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all">
                            <input
                              type="radio"
                              name="pricing"
                              checked={pricingModel === "per-clinician"}
                              onChange={() => setPricingModel("per-clinician")}
                              className="w-4 h-4 mt-1 text-[#F03319] focus:ring-[#F03319]"
                              data-testid="radio-per-clinician"
                            />
                            <div>
                              <span className="font-medium text-neutral-900">
                                Per clinician / month
                              </span>
                              <p className="text-sm text-neutral-600 mt-0.5">
                                Pay based on number of providers
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">
                                Most flexible for phased rollouts
                              </p>
                            </div>
                          </label>
                          <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all">
                            <input
                              type="radio"
                              name="pricing"
                              checked={pricingModel === "enterprise"}
                              onChange={() => setPricingModel("enterprise")}
                              className="w-4 h-4 mt-1 text-[#F03319] focus:ring-[#F03319]"
                              data-testid="radio-enterprise"
                            />
                            <div>
                              <span className="font-medium text-neutral-900">
                                Enterprise annual
                              </span>
                              <p className="text-sm text-neutral-600 mt-0.5">
                                Fixed annual contract
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">
                                Often includes volume discounts
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Contract Term Section */}
                      {pricingModel !== null && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-3">
                            Contract term
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setContractYears(2);
                                setShowCustomYears(false);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                contractYears === 2 && !showCustomYears
                                  ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              }`}
                              data-testid="chip-years-2"
                            >
                              2 yrs
                            </button>
                            <button
                              onClick={() => {
                                setContractYears(3);
                                setShowCustomYears(false);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                contractYears === 3 && !showCustomYears
                                  ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              }`}
                              data-testid="chip-years-3"
                            >
                              3 yrs
                            </button>
                            {!showCustomYears ? (
                              <button
                                onClick={() => setShowCustomYears(true)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  showCustomYears &&
                                  contractYears !== 2 &&
                                  contractYears !== 3
                                    ? "bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                }`}
                                data-testid="chip-years-custom"
                              >
                                Custom
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Years"
                                  value={contractYears ?? ""}
                                  onChange={(e) => {
                                    const val = parseFormattedNumber(e.target.value);
                                    if (val > 0) {
                                      setContractYears(val);
                                    } else if (e.target.value === "") {
                                      setContractYears(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (contractYears === null) {
                                      setShowCustomYears(false);
                                    }
                                  }}
                                  className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] font-mono"
                                  data-testid="input-custom-years"
                                />
                                <span className="text-sm text-neutral-500">
                                  yrs
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cost Inputs */}
                      {pricingModel === "per-clinician" && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Cost per clinician / month
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={perClinicianCost !== null ? formatNumber(perClinicianCost) : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPerClinicianCost(
                                  val === ""
                                    ? null
                                    : Math.max(0, parseFormattedNumber(val)),
                                );
                              }}
                              placeholder="Enter amount"
                              className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all font-mono"
                              data-testid="input-per-clinician-cost"
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-2">
                            Monthly subscription cost per licensed provider
                          </p>
                          <p className="text-xs text-neutral-400 mt-1 italic">
                            Tip: Enterprise contracts often have lower per-provider pricing
                          </p>
                          {perClinicianCost !== null && effectiveClinicians > 0 && (
                            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100" data-testid="live-calculation-box">
                              <div className="text-xs font-semibold text-neutral-700 mb-2">Your calculation:</div>
                              <p className="text-sm text-neutral-800 font-mono">
                                <span className="text-neutral-600">{effectiveClinicians.toLocaleString()}</span> providers 
                                <span className="text-neutral-400 mx-1">x</span> 
                                <span className="text-neutral-600">${formatNumber(perClinicianCost)}</span>/month 
                                <span className="text-neutral-400 mx-1">x</span> 
                                <span className="text-neutral-600">12</span> months 
                                <span className="text-neutral-400 mx-1">=</span> 
                                <span className="font-semibold text-neutral-900">${formatNumber(effectiveClinicians * perClinicianCost * 12)}</span>/year
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {pricingModel === "enterprise" && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Enterprise annual cost
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={enterpriseAnnualCost !== null ? formatNumber(enterpriseAnnualCost) : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEnterpriseAnnualCost(
                                  val === ""
                                    ? null
                                    : Math.max(0, parseFormattedNumber(val)),
                                );
                              }}
                              placeholder="Enter annual amount"
                              className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all font-mono"
                              data-testid="input-enterprise-cost"
                            />
                          </div>
                          <p className="text-xs text-neutral-500 mt-1.5">
                            Total annual subscription for enterprise-wide deployment.
                          </p>
                        </div>
                      )}

                      {/* Implementation Fee Section */}
                      {pricingModel !== null && (
                        <div className="border-t border-neutral-100 pt-6">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={implementationEnabled}
                              onChange={(e) =>
                                setImplementationEnabled(e.target.checked)
                              }
                              className="w-4 h-4 text-[#F03319] focus:ring-[#F03319] rounded"
                              data-testid="checkbox-implementation"
                            />
                            <div>
                              <span className="text-sm font-medium text-neutral-700">
                                Add implementation fee (one-time)
                              </span>
                            </div>
                          </label>

                          {implementationEnabled && (
                            <div className="mt-4 ml-7">
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Implementation fee
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                                  $
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={implementationFee !== null ? formatNumber(implementationFee) : ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setImplementationFee(
                                      val === ""
                                        ? null
                                        : Math.max(0, parseFormattedNumber(val)),
                                    );
                                  }}
                                  placeholder="Enter one-time fee"
                                  className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all font-mono"
                                  data-testid="input-implementation-fee"
                                />
                              </div>
                              <p className="text-xs text-neutral-500 mt-1.5">
                                One-time setup and integration cost.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Multi-Year Projection Table - uses dynamic totalProjectedValue */}
                      {contractYears !== null && (pricingModel === "per-clinician" ? perClinicianCost !== null : enterpriseAnnualCost !== null) && (
                        (() => {
                          const annualValue = totalProjectedValue; // Dynamic calculation
                          const annualCost = pricingModel === "per-clinician" 
                            ? effectiveClinicians * (perClinicianCost || 0) * 12 
                            : (enterpriseAnnualCost || 0);
                          const implFee = implementationEnabled ? (implementationFee || 0) : 0;
                          const years = contractYears || 2;
                          const yearsArray = Array.from({ length: years }, (_, i) => i + 1);
                          const totalValue = annualValue * years;
                          const totalCost = (annualCost * years) + implFee;
                          const totalNet = totalValue - totalCost;
                          const cumulativeRoi = totalCost > 0 ? (totalNet / totalCost) : 0;
                          const monthlyNet = annualValue - annualCost;
                          // Calculate payback: null means not achieved (negative net), otherwise months to break even
                          const paybackMonths = monthlyNet > 0 ? Math.ceil((annualCost + implFee) / (monthlyNet / 12)) : null;

                          return (
                            <div className="border-t border-neutral-100 pt-6" data-testid="multi-year-projection">
                              <div className="text-sm font-semibold text-neutral-900 mb-4 uppercase tracking-wide">
                                {years} YEAR VIEW:
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm" data-testid="projection-table">
                                  <thead>
                                    <tr className="border-b border-neutral-200">
                                      <th className="text-left py-2 pr-4 font-medium text-neutral-600"></th>
                                      {yearsArray.map((year) => (
                                        <th key={year} className="text-right py-2 px-3 font-medium text-neutral-600">
                                          Year {year}
                                        </th>
                                      ))}
                                      <th className="text-right py-2 pl-3 font-bold text-neutral-900">
                                        TOTAL
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="bg-emerald-50/50">
                                      <td className="py-2.5 pr-4 text-neutral-700">Value</td>
                                      {yearsArray.map((year) => (
                                        <td key={year} className="text-right py-2.5 px-3 font-mono text-emerald-700">
                                          ${formatNumber(annualValue)}
                                        </td>
                                      ))}
                                      <td className="text-right py-2.5 pl-3 font-mono font-semibold text-emerald-800">
                                        ${formatNumber(totalValue)}
                                      </td>
                                    </tr>
                                    <tr className="bg-neutral-50/50">
                                      <td className="py-2.5 pr-4 text-neutral-700">
                                        Cost{implFee > 0 && <span className="text-xs text-neutral-500 ml-1">(Year 1 incl. impl.)</span>}
                                      </td>
                                      {yearsArray.map((year) => (
                                        <td key={year} className="text-right py-2.5 px-3 font-mono text-neutral-600">
                                          ${formatNumber(year === 1 ? annualCost + implFee : annualCost)}
                                        </td>
                                      ))}
                                      <td className="text-right py-2.5 pl-3 font-mono font-semibold text-neutral-700">
                                        ${formatNumber(totalCost)}
                                      </td>
                                    </tr>
                                    <tr className="border-t-2 border-neutral-300">
                                      <td className="py-2.5 pr-4 font-semibold text-neutral-900">Net</td>
                                      {yearsArray.map((year) => {
                                        const yearCost = year === 1 ? annualCost + implFee : annualCost;
                                        const yearNet = annualValue - yearCost;
                                        return (
                                          <td key={year} className={`text-right py-2.5 px-3 font-mono font-semibold ${yearNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                            ${formatNumber(yearNet)}
                                          </td>
                                        );
                                      })}
                                      <td className={`text-right py-2.5 pl-3 font-mono font-bold ${totalNet >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                                        ${formatNumber(totalNet)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100" data-testid="time-to-value">
                                <h4 className="text-sm font-semibold text-neutral-800 mb-3">Time to value</h4>
                                <p className="text-sm text-neutral-600 mb-2">Impact timeline varies by driver:</p>
                                <ul className="space-y-1.5 text-sm text-neutral-600 mb-3">
                                  <li className="flex items-start gap-2">
                                    <span className="text-neutral-400 mt-0.5">•</span>
                                    <span><span className="font-medium">Operational drivers</span> (Patient Access, Overtime): 3-6 months</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-neutral-400 mt-0.5">•</span>
                                    <span><span className="font-medium">Documentation drivers</span> (Level of Service, Denials): 2-4 months</span>
                                  </li>
                                  <li className="flex items-start gap-2">
                                    <span className="text-neutral-400 mt-0.5">•</span>
                                    <span><span className="font-medium">Long-term drivers</span> (Retention, HCC): 12+ months</span>
                                  </li>
                                </ul>
                                <div className="flex items-start gap-2 pt-2 border-t border-blue-100">
                                  <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <p className="text-xs text-neutral-500 italic">Full value realization typically occurs at 12-18 months as utilization matures.</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Footer with Completion Section */}
                    <div className="mt-8">
                      <button
                        onClick={() => setModelSetupStep(2)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900 mb-6"
                        data-testid="button-step3-back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                      
                    </div>
                  </div>
                )}
              </div>

              {/* Live Receipt Sidebar - Desktop & Mobile */}
              <LiveReceipt
                providers={effectiveClinicians}
                annualEncounters={effectiveEncounters}
                utilizationPercent={utilizationPercent}
                eligibleEncounters={eligibleEncounters}
                minutesSaved={effectiveMinutesSaved}
                realizationRate={timeRealizationRate}
                totalHoursSaved={totalHoursSaved}
                realizedHoursSaved={realizedHoursSaved}
                wrvuLift={wrvuSensitivity}
                baselineWrvu={ftWrvuBaseline}
                selectedLeverIds={selectedLeverIds}
                currentDriverValues={currentDriverValues}
                totalProjectedValue={totalProjectedValue}
                annualSubscriptionCost={annualSubscriptionCost}
                implementationFee={implementationFee}
                implementationEnabled={implementationEnabled}
                contractYears={contractYears}
                year1TotalCost={year1TotalCost}
                lifetimeSubscription={lifetimeSubscription}
                currentPosture={valuePosture}
                modelSetupStep={modelSetupStep}
                ftPatientAccessVisitDuration={ftPatientAccessVisitDuration}
                ftPatientAccessRevenuePerVisit={ftPatientAccessRevenuePerVisit}
                ftWrvuRevenuePerUnit={ftWrvuRevenuePerUnit}
                ftRetentionReplacementCost={ftRetentionReplacementCost}
                ftHccBenchmarkPmpm={ftHccBenchmarkPmpm}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar — Mobile Only, Page 2 Only */}
      {currentPage === "priorities" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg lg:hidden">
          <div className="px-6 py-4">
            <button
              type="button"
              disabled={!canContinuePage2}
              onClick={handleContinueToPage3}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                canContinuePage2
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
                  : "opacity-40 bg-neutral-900 text-white cursor-not-allowed"
              }`}
              data-testid="button-continue-to-model-setup-mobile"
            >
              Continue
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar — Page 3 (Value Methodology) */}
      {currentPage === "value-blueprint" && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg">
          <div className="max-w-[1200px] mx-auto px-6 py-4">
            <button
              type="button"
              disabled={!canContinuePage2}
              onClick={handleContinueToPage4}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                canContinuePage2
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
                  : "opacity-40 bg-neutral-900 text-white cursor-not-allowed"
              }`}
              data-testid="button-continue-to-model-setup"
            >
              Continue
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar — Page 4 Step 3 Only */}
      {currentPage === "model-setup" && modelSetupStep === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg">
          <div className="max-w-[1200px] mx-auto px-6 py-4">
            <button
              type="button"
              disabled={!canContinuePage3}
              onClick={handleFinalSubmit}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                canContinuePage3
                  ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
                  : "opacity-40 bg-neutral-300 text-neutral-500 cursor-not-allowed"
              }`}
              data-testid="button-see-results"
            >
              View ROI Model
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reset All Confirmation Modal */}
      <AlertDialog open={showResetAllModal} onOpenChange={setShowResetAllModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all customizations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all {customizations.length} input{customizations.length !== 1 ? "s" : ""} to Typical posture defaults. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-reset-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAllToTypical}
              className="bg-[#E8532F] hover:bg-[#D14827] text-white"
              data-testid="button-reset-confirm"
            >
              Reset to Typical
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
