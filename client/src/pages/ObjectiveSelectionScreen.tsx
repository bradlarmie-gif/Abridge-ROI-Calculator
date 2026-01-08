import { useState, useMemo, useRef, useEffect } from "react";
import { BackgroundShape } from "@/components/BackgroundShape";
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
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  conservative: { minutes: 2, realization: 45, wrvu: 3 },
  typical: { minutes: 4, realization: 55, wrvu: 5 },
  aggressive: { minutes: 6, realization: 65, wrvu: 7 },
};

// Reference scenario defaults for Value Blueprint
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
    theory: "When providers spend less time on documentation, that time can partially convert into seeing more patients—reducing access bottlenecks and wait times.",
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
    theory: "Better real-time documentation captures the full complexity of care delivered—supporting accurate work RVU (wRVU) documentation and E/M coding, which drives proper reimbursement levels.",
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
          { label: "Average revenue per wRVU", value: "$50", note: "(typical payer mix)" },
          { label: "Annual value", value: "$227,500" },
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
    theory: "Administrative burden, particularly documentation, drives clinician burnout and turnover. Reducing documentation time improves work-life balance and retention.",
    calculationSteps: [
      {
        title: "STEP 1: BASELINE TURNOVER",
        steps: [
          { label: "Total providers", value: "40" },
          { label: "Annual turnover rate", value: "8%", note: "(typical)" },
          { label: "Expected departures", value: "3.2 providers/year" },
        ],
      },
      {
        title: "STEP 2: ABRIDGE IMPACT",
        steps: [
          { label: "Expected departures", value: "3.2" },
          { label: "% due to burnout/workload", value: "40%" },
          { label: "% preventable with Abridge", value: "50%", note: "(typical)" },
          { label: "Departures avoided", value: "0.64 per year" },
        ],
      },
      {
        title: "STEP 3: COST SAVINGS",
        steps: [
          { label: "Departures avoided", value: "0.64" },
          { label: "Replacement cost per provider", value: "$250,000" },
          { label: "Annual value", value: "$160,000" },
        ],
      },
    ],
    keyVariables: ["Provider count", "Current turnover rate", "% attributable to burnout", "Replacement cost"],
    rangeData: { conservative: "$100k-150k", typical: "$160k-240k" },
    referenceValue: 160000,
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
    theory: "Incomplete documentation is a leading cause of claim denials. Real-time, complete documentation reduces denial rates and improves revenue cycle performance.",
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
        ],
      },
      {
        title: "STEP 3: ABRIDGE PREVENTION",
        steps: [
          { label: "Documentation-driven denials", value: "$156,000" },
          { label: "% preventable with real-time docs", value: "75%", note: "(typical)" },
          { label: "Annual value", value: "$117,000" },
        ],
      },
    ],
    keyVariables: ["Annual revenue", "Baseline denial rate", "% documentation-related", "Prevention rate"],
    rangeData: { conservative: "$120k-180k (5-6%)", typical: "$200k-300k (8-10% high-complexity)" },
    referenceValue: 117000,
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
        label="Value Blueprint"
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

function CareSettingRow({
  icon: Icon,
  label,
  selected,
  disabled,
  onClick,
}: {
  icon: typeof Stethoscope;
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full flex items-center gap-4 px-5 py-4 transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : selected
            ? "bg-[#FFF5F3]"
            : "hover:bg-neutral-50 cursor-pointer"
      }`}
      data-testid={`setting-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F03319]" />
      )}
      <div
        className={`flex items-center justify-center w-10 h-10 rounded transition-colors flex-shrink-0 ${
          selected
            ? "bg-[#F03319]/10"
            : disabled
              ? "bg-neutral-100"
              : "bg-neutral-100 group-hover:bg-neutral-200"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${selected ? "text-[#F03319]" : disabled ? "text-neutral-400" : "text-neutral-600"}`}
        />
      </div>
      <span
        className={`flex-1 text-left text-base font-medium ${
          selected
            ? "text-neutral-900"
            : disabled
              ? "text-neutral-400"
              : "text-neutral-800"
        }`}
      >
        {label}
      </span>
      {disabled && (
        <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-200/60 text-neutral-500 font-medium">
          Coming soon
        </span>
      )}
      {!disabled && selected && (
        <Check className="w-5 h-5 text-[#F03319] flex-shrink-0" />
      )}
    </button>
  );
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
      className={`group relative w-full text-left cursor-pointer rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F03319]/25 ${
        isSelected
          ? "bg-[#FFF7F5] ring-1 ring-[#F03319]/20 shadow-sm"
          : "bg-white/80 hover:bg-white border border-neutral-200/50 hover:border-neutral-200"
      }`}
      data-testid={`priority-card-${lever.id}`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F03319] rounded-l-2xl" />
      )}

      <div className="px-6 py-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="mt-0.5 flex-shrink-0"
            data-testid={`checkbox-${lever.id}`}
          />

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-medium text-neutral-900 leading-snug">
              {lever.label}
            </h4>
            <p className="mt-1 text-sm text-neutral-500 leading-relaxed line-clamp-1">
              {lever.description}
            </p>
          </div>
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
  const [currentPage, setCurrentPage] = useState<Page>("orientation");
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
  // Value Blueprint State
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
    null,
  );
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

  // Value posture state and edit accordion tracking
  const [valuePosture, setValuePosture] = useState<ValuePosture | null>(null);
  const [editingAssumption, setEditingAssumption] = useState<string | null>(null);

  // Apply posture to all assumptions
  const applyPosture = (posture: "conservative" | "typical" | "aggressive") => {
    const preset = POSTURE_PRESETS[posture];
    setMinutesSaved(preset.minutes);
    setCustomMinutes(null);
    setShowCustomMinutesInput(false);
    setTimeRealizationRate(preset.realization);
    setWrvuSensitivity(preset.wrvu);
    setValuePosture(posture);
    setEditingAssumption(null);
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

    // Build the seedInputs object with all collected data
    const seedInputs: Partial<RoiInputs> = {
      numberOfProviders: effectiveClinicians,
      annualOutpatientEncounters: effectiveEncounters,
      abridgeUtilizationPct: utilizationPercent ?? 70,
      minutesSavedPerEncounter: effectiveMinutesSaved ?? 4,
      monthlyCostPerProvider:
        pricingModel === "per-clinician" ? (perClinicianCost ?? 0) : 0,
      implementationCostYear1: implementationEnabled
        ? (implementationFee ?? 0)
        : 0,
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

    return (
      <div key={category} className={isFirst ? "" : "mt-8"}>
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/60">
            <CategoryIcon className="h-3.5 w-3.5 text-neutral-600" />
            <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
              {categoryLabel}
            </span>
          </div>
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
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-semibold text-neutral-900 tracking-tight">
              ROI Calculator
            </span>
            <span className="text-sm text-neutral-500 leading-tight">
              by <span className="font-semibold text-neutral-900">Abridge</span>
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
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-center py-20 md:py-28">
            <div className="w-full max-w-3xl text-center">
              <div className="w-full bg-white border border-neutral-200/70 rounded-3xl px-10 py-12 md:px-16 md:py-14 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
                <h2 className="text-3xl md:text-4xl lg:text-[44px] font-medium text-neutral-900 tracking-tight">
                  <span className="block leading-[1.15]">
                    Model the impact of
                  </span>
                  <span className="block mt-2 leading-[1.15]">
                    ambient documentation
                  </span>
                </h2>
                <p className="mt-5 text-base md:text-lg text-neutral-500 leading-relaxed">
                  Understand where the value actually comes from.
                </p>

                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleContinueToPage1}
                    className="inline-flex items-center justify-center gap-3 px-16 py-5 rounded-2xl font-semibold text-base md:text-lg bg-[#FFF5F3] text-[#F03319] ring-1 ring-[#F03319]/20 hover:bg-[#FFEBE8] transition-all duration-200 shadow-sm hover:shadow"
                    data-testid="button-start"
                  >
                    Build ROI Model
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 1 — CARE SETTING */}
        {currentPage === "setting" && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-16 md:py-20">
            <div className="grid lg:grid-cols-[1fr_520px] gap-12 lg:gap-16">
              <div className="max-w-xl">
                <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-6">
                  Select a care setting
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-10">
                  This sets baseline documentation patterns and default assumptions.
                </p>
                <div className="space-y-4 mb-8">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Why this matters
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-base text-neutral-700">
                      <Check className="w-5 h-5 text-[#F03319] flex-shrink-0 mt-0.5" />
                      <span>
                        Workflows differ by setting—so ROI drivers differ too.
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-base text-neutral-700">
                      <Check className="w-5 h-5 text-[#F03319] flex-shrink-0 mt-0.5" />
                      <span>
                        This sets the assumptions used throughout the model.
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-base text-neutral-700">
                      <Check className="w-5 h-5 text-[#F03319] flex-shrink-0 mt-0.5" />
                      <span>You'll get a tailored output you can share.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
                  <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Care setting
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1.5">
                    Choose one to set assumptions
                  </p>
                </div>
                <div className="divide-y divide-neutral-100/80">
                  {ALL_SETTINGS.map((setting) => {
                    const isInpatient = setting === "inpatient";
                    return (
                      <CareSettingRow
                        key={setting}
                        icon={SETTING_ICONS[setting]}
                        label={CARE_SETTING_LABELS[setting]}
                        selected={selectedSetting === setting}
                        disabled={isInpatient}
                        onClick={() => handleSettingSelect(setting)}
                      />
                    );
                  })}
                </div>
                <div className="border-t border-neutral-200 bg-neutral-50/50 px-6 py-5">
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
        )}

        {/* PAGE 2 — STRATEGIC PRIORITIES */}
        {currentPage === "priorities" && selectedSetting && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10 md:py-14">
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">
              <div>
                <div className="mb-10">
                  <button
                    onClick={handleBackToPage1}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
                    data-testid="button-back-to-setting"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  <div className="mt-4">
                    <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight">
                      Strategic Priorities
                    </h2>
                    <p className="mt-2 text-lg text-neutral-600 leading-relaxed">
                      What outcomes matter most right now?
                    </p>
                  </div>
                </div>

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
                <div className="sticky top-8">
                  <ModelSummaryPanel
                    selectedSetting={selectedSetting}
                    selectedLeverIds={selectedLeverIds}
                    onContinue={handleContinueToPage3}
                    canContinue={canContinuePage2}
                    showCta={true}
                  />
                </div>
              </div>
            </div>
            <div className="lg:hidden mt-8">
              <ModelSummaryPanel
                selectedSetting={selectedSetting}
                selectedLeverIds={selectedLeverIds}
                showCta={false}
              />
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
                  Value Blueprint
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  See how each driver creates value using typical assumptions from 50+ health systems.
                </p>
              </div>

              {/* Reference Scenario Section */}
              <section className="mb-10">
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Reference Scenario</h3>
                    <p className="text-sm text-neutral-500">Typical mid-sized outpatient practice</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-neutral-900 font-mono">{REFERENCE_SCENARIO.providers}</div>
                        <div className="text-xs text-neutral-500">providers</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-neutral-900 font-mono">{formatNumber(REFERENCE_SCENARIO.annualVisits)}</div>
                        <div className="text-xs text-neutral-500">annual visits</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-slate-100">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-neutral-900 font-mono">{REFERENCE_SCENARIO.adoptionPercent}%</div>
                        <div className="text-xs text-neutral-500">adoption</div>
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
                                      {step.steps.map((s, sIdx) => (
                                        <div key={sIdx} className="flex items-center justify-between text-sm">
                                          <span className="text-neutral-600">{s.label}</span>
                                          <span className="font-mono text-neutral-900">
                                            {s.value}
                                            {s.note && <span className="text-neutral-400 text-xs ml-1">({s.note})</span>}
                                          </span>
                                        </div>
                                      ))}
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
                        These calculations use typical assumptions from 50+ health systems. In the next step, you'll customize:
                      </p>
                      <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                        <li>Your organization size and volume</li>
                        <li>Your financial metrics (revenue, costs)</li>
                        <li>How conservatively to model outcomes</li>
                      </ul>
                      <p className="text-sm text-amber-800 mt-3 font-medium">
                        The formulas stay the same—only YOUR numbers change.
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
                          placeholder="e.g. 50"
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
                          placeholder="e.g. 100,000"
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
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
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
                )}

                {/* Step 2: Value Realization */}
                {modelSetupStep === 2 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8">
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

                    {/* Two columns grid */}
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                      {/* Operational Value Column */}
                      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-5 md:p-6">
                        <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase mb-1">
                          Operational Value
                        </div>
                        <p className="text-xs text-neutral-500 mb-5">
                          Time returned to clinicians that can be redeployed to capacity or reduced after-hours work.
                        </p>

                        {/* Minutes returned row */}
                        <div className="space-y-4">
                          <div className="border-b border-neutral-200 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-neutral-900">
                                  Minutes returned per encounter
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-sm font-mono font-medium text-neutral-900">
                                    {effectiveMinutesSaved !== null ? `${effectiveMinutesSaved} min` : "—"}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-xs text-neutral-500">
                                  Based on observed ambient documentation time reduction.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingAssumption(editingAssumption === "minutes" ? null : "minutes")}
                                className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4 shrink-0"
                                data-testid="edit-minutes"
                              >
                                {editingAssumption === "minutes" ? "Done" : "Edit"}
                              </button>
                            </div>

                            {/* Inline edit accordion */}
                            {editingAssumption === "minutes" && (
                              <div className="mt-4 pt-4 border-t border-neutral-200 bg-white rounded-lg p-4 -mx-1">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMinutesSaved(2);
                                      setCustomMinutes(null);
                                      setShowCustomMinutesInput(false);
                                    }}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      minutesSaved === 2 && customMinutes === null
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-minutes-2"
                                  >
                                    Conservative (2 min)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMinutesSaved(4);
                                      setCustomMinutes(null);
                                      setShowCustomMinutesInput(false);
                                    }}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      minutesSaved === 4 && customMinutes === null
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-minutes-4"
                                  >
                                    Typical (4 min)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMinutesSaved(6);
                                      setCustomMinutes(null);
                                      setShowCustomMinutesInput(false);
                                    }}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      minutesSaved === 6 && customMinutes === null
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-minutes-6"
                                  >
                                    Aggressive (6 min)
                                  </button>
                                  {!showCustomMinutesInput ? (
                                    <button
                                      type="button"
                                      onClick={() => setShowCustomMinutesInput(true)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        customMinutes !== null
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-minutes-custom"
                                    >
                                      {customMinutes !== null ? `Custom (${customMinutes} min)` : "Custom"}
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <input
                                        ref={customMinutesInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Custom"
                                        value={customMinutes ?? ""}
                                        onChange={(e) => {
                                          const val = parseFormattedNumber(e.target.value);
                                          if (val > 0) {
                                            setCustomMinutes(val);
                                            setMinutesSaved(val);
                                          } else if (e.target.value === "") {
                                            setCustomMinutes(null);
                                          }
                                        }}
                                        onBlur={() => {
                                          if (customMinutes === null) {
                                            setShowCustomMinutesInput(false);
                                          }
                                        }}
                                        className="w-20 px-3 py-1.5 border border-neutral-300 rounded-full text-sm focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900 font-mono"
                                        data-testid="input-custom-minutes"
                                      />
                                      <span className="text-sm text-neutral-500">min</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Realization factor row */}
                          <div>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-neutral-900">
                                  Realization factor
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-sm font-mono font-medium text-neutral-900">
                                    {timeRealizationRate !== null ? `${timeRealizationRate}% usable` : "—"}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-xs text-neutral-500">
                                  Portion of returned time that converts into usable capacity (scheduling, staffing, demand).
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingAssumption(editingAssumption === "realization" ? null : "realization")}
                                className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4 shrink-0"
                                data-testid="edit-realization"
                              >
                                {editingAssumption === "realization" ? "Done" : "Edit"}
                              </button>
                            </div>

                            {/* Inline edit accordion */}
                            {editingAssumption === "realization" && (
                              <div className="mt-4 pt-4 border-t border-neutral-200 bg-white rounded-lg p-4 -mx-1">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setTimeRealizationRate(45)}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      timeRealizationRate === 45
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-realization-45"
                                  >
                                    Conservative (45%)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTimeRealizationRate(55)}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      timeRealizationRate === 55
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-realization-55"
                                  >
                                    Typical (55%)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTimeRealizationRate(65)}
                                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                      timeRealizationRate === 65
                                        ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                    }`}
                                    data-testid="chip-realization-65"
                                  >
                                    Aggressive (65%)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Documentation Value Column */}
                      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-5 md:p-6">
                        <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase mb-1">
                          Documentation Value
                        </div>
                        <p className="text-xs text-neutral-500 mb-5">
                          Documentation more accurately reflects care delivered, supporting correct coding and fewer avoidable issues.
                        </p>

                        <div className="space-y-4">
                          {/* Level of Service row */}
                          {hasWrvuSelected && (
                            <div className="border-b border-neutral-200 pb-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-neutral-900">
                                    Level-of-service alignment
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-sm font-mono font-medium text-neutral-900">
                                      {wrvuSensitivity !== null ? `${wrvuSensitivity}% alignment lift` : "—"}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-neutral-500">
                                    Percent of visits billed at the level that matches documented care delivered.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssumption(editingAssumption === "wrvu" ? null : "wrvu")}
                                  className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4 shrink-0"
                                  data-testid="edit-wrvu"
                                >
                                  {editingAssumption === "wrvu" ? "Done" : "Edit"}
                                </button>
                              </div>

                              {/* Inline edit accordion */}
                              {editingAssumption === "wrvu" && (
                                <div className="mt-4 pt-4 border-t border-neutral-200 bg-white rounded-lg p-4 -mx-1">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setWrvuSensitivity(3)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        wrvuSensitivity === 3
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-wrvu-3"
                                    >
                                      Conservative (3%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWrvuSensitivity(5)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        wrvuSensitivity === 5
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-wrvu-5"
                                    >
                                      Typical (5%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setWrvuSensitivity(7)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        wrvuSensitivity === 7
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-wrvu-7"
                                    >
                                      Aggressive (7%)
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* HCC / RAF Lift row */}
                          {hasHccSelected && (
                            <div className={hasWrvuSelected ? "" : "border-b border-neutral-200 pb-4"}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-neutral-900">
                                    HCC / RAF lift
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-sm font-mono font-medium text-neutral-900">
                                      {hccSensitivity !== null ? `${hccSensitivity}% RAF improvement` : "—"}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-neutral-500">
                                    Relative RAF score improvement from better chronic condition capture.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssumption(editingAssumption === "hcc" ? null : "hcc")}
                                  className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4 shrink-0"
                                  data-testid="edit-hcc"
                                >
                                  {editingAssumption === "hcc" ? "Done" : "Edit"}
                                </button>
                              </div>

                              {editingAssumption === "hcc" && (
                                <div className="mt-4 pt-4 border-t border-neutral-200 bg-white rounded-lg p-4 -mx-1">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setHccSensitivity(0.3)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        hccSensitivity === 0.3
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-hcc-03"
                                    >
                                      Conservative (0.3%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setHccSensitivity(0.7)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        hccSensitivity === 0.7
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-hcc-07"
                                    >
                                      Typical (0.7%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setHccSensitivity(1.2)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        hccSensitivity === 1.2
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-hcc-12"
                                    >
                                      Aggressive (1.2%)
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Denial Reduction row */}
                          {hasDenialsSelected && (
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-neutral-900">
                                    Denial rate reduction
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-neutral-200 text-sm font-mono font-medium text-neutral-900">
                                      {denialsSensitivity !== null ? `${denialsSensitivity}% reduction` : "—"}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-neutral-500">
                                    Reduction in documentation-related denials.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssumption(editingAssumption === "denials" ? null : "denials")}
                                  className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4 shrink-0"
                                  data-testid="edit-denials"
                                >
                                  {editingAssumption === "denials" ? "Done" : "Edit"}
                                </button>
                              </div>

                              {editingAssumption === "denials" && (
                                <div className="mt-4 pt-4 border-t border-neutral-200 bg-white rounded-lg p-4 -mx-1">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setDenialsSensitivity(2)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        denialsSensitivity === 2
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-denials-2"
                                    >
                                      Conservative (2%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDenialsSensitivity(5)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        denialsSensitivity === 5
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-denials-5"
                                    >
                                      Typical (5%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDenialsSensitivity(8)}
                                      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                        denialsSensitivity === 8
                                          ? "border-neutral-400 bg-neutral-200 text-neutral-900 ring-1 ring-neutral-400"
                                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                      }`}
                                      data-testid="chip-denials-8"
                                    >
                                      Aggressive (8%)
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Placeholder when no documentation drivers selected */}
                          {!hasAnyDocumentationLever && (
                            <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-4">
                              <div className="text-xs font-semibold text-neutral-600">
                                No documentation drivers selected
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">
                                Enable documentation drivers on the Strategic Priorities page to configure these assumptions.
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tip about additional assumptions */}
                        {hasAnyDocumentationLever && (
                          <p className="mt-6 text-xs text-neutral-500 italic">
                            Additional assumptions can be added in the ROI model summary.
                          </p>
                        )}
                      </section>
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
                    <p className="text-sm text-neutral-600 mb-6">
                      How is this investment shaped?
                    </p>
                    <div className="space-y-6">
                      {/* Investment Model Section */}
                      <div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all">
                            <input
                              type="radio"
                              name="pricing"
                              checked={pricingModel === "per-clinician"}
                              onChange={() => setPricingModel("per-clinician")}
                              className="w-4 h-4 text-[#F03319] focus:ring-[#F03319]"
                              data-testid="radio-per-clinician"
                            />
                            <div>
                              <span className="font-medium text-neutral-900">
                                Per clinician / month
                              </span>
                              <p className="text-xs text-neutral-500 mt-0.5">
                                Pay based on number of clinicians
                              </p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-all">
                            <input
                              type="radio"
                              name="pricing"
                              checked={pricingModel === "enterprise"}
                              onChange={() => setPricingModel("enterprise")}
                              className="w-4 h-4 text-[#F03319] focus:ring-[#F03319]"
                              data-testid="radio-enterprise"
                            />
                            <div>
                              <span className="font-medium text-neutral-900">
                                Enterprise annual
                              </span>
                              <p className="text-xs text-neutral-500 mt-0.5">
                                Fixed annual contract
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
                          <p className="text-xs text-neutral-500 mt-1.5">
                            Monthly subscription cost per licensed provider.
                          </p>
                          {annualSubscriptionCost !== null && (
                            <p className="text-sm text-neutral-600 mt-3 p-3 bg-neutral-50 rounded-lg">
                              Annual cost:{" "}
                              <span className="font-semibold">
                                ${annualSubscriptionCost.toLocaleString()}
                              </span>
                              <span className="text-xs text-neutral-500 ml-1">
                                ({effectiveClinicians} × ${perClinicianCost} ×
                                12)
                              </span>
                            </p>
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
                    </div>

                    <div className="mt-8 flex justify-start">
                      <button
                        onClick={() => setModelSetupStep(2)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-neutral-700 hover:bg-neutral-100 transition-all"
                        data-testid="button-step3-back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary sidebar for Page 3 - Desktop */}
              <div className="hidden lg:block w-[360px]">
                <div className="sticky top-8">
                  <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                    <div className="p-5">
                      <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Live Receipt
                      </div>

                      <div className="mt-3 divide-y divide-neutral-200">
                        {/* Adoption section */}
                        <div className="py-2 space-y-2">
                          <div className="text-xs font-bold text-neutral-700 mb-2">
                            Adoption
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Providers</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {effectiveClinicians > 0 ? effectiveClinicians.toLocaleString() : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Annual encounters</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {effectiveEncounters > 0 ? effectiveEncounters.toLocaleString() : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Utilization</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {utilizationPercent !== null ? `${utilizationPercent}%` : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Eligible encounters</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {eligibleEncounters !== null ? eligibleEncounters.toLocaleString() : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Time Assumptions section */}
                        <div className="py-2 space-y-2">
                          <div className="text-xs font-bold text-neutral-700 mb-2">
                            Time Assumptions
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Minutes returned / encounter</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {effectiveMinutesSaved !== null ? `${effectiveMinutesSaved} min` : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Hours returned (gross)</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {totalHoursSaved !== null
                                ? totalHoursSaved.toLocaleString(undefined, { maximumFractionDigits: 1 })
                                : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Hours usable (net)</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {realizedHoursSaved !== null
                                ? realizedHoursSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Documentation Assumptions section */}
                        {hasAnyDocumentationLever && (
                          <div className="py-2 space-y-2">
                            <div className="text-xs font-bold text-neutral-700 mb-2">
                              Documentation Assumptions
                            </div>
                            {hasWrvuSelected && wrvuSensitivity !== null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-neutral-600">Level of service lift</div>
                                <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  {wrvuSensitivity}%
                                </div>
                              </div>
                            )}
                            {hasHccSelected && hccSensitivity !== null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-neutral-600">HCC / RAF lift</div>
                                <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  {hccSensitivity}%
                                </div>
                              </div>
                            )}
                            {hasDenialsSelected && denialsSensitivity !== null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-neutral-600">Denial rate reduction</div>
                                <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  {denialsSensitivity}%
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Investment info - only show on step 3 */}
                        {modelSetupStep === 3 && (annualSubscriptionCost !== null || implementationFee !== null) && (
                          <div className="py-2 space-y-2">
                            <div className="text-xs font-bold text-neutral-700 mt-1">
                              Investment
                            </div>
                            {implementationEnabled && implementationFee !== null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-neutral-600">Implementation fee</div>
                                <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  ${implementationFee.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {annualSubscriptionCost !== null && (
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-sm text-neutral-600">Annual subscription</div>
                                <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                                  ${annualSubscriptionCost.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {year1TotalCost !== null && (
                              <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200">
                                <div className="text-sm text-neutral-600">Year 1 total cost</div>
                                <div className="text-sm font-bold text-neutral-900 tabular-nums">
                                  ${year1TotalCost.toLocaleString()}
                                </div>
                              </div>
                            )}
                            {lifetimeSubscription !== null && (
                              <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200">
                                <div className="text-sm text-neutral-600">Lifetime subscription</div>
                                <div className="text-sm font-bold text-neutral-900 tabular-nums">
                                  ${lifetimeSubscription.toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
                        Tip: If a number looks high, open Results and use "Review inputs" to validate the driver math.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Receipt - Mobile for Page 3 */}
            <div className="lg:hidden mt-8">
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="p-5">
                  <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Live Receipt
                  </div>

                  <div className="mt-3 divide-y divide-neutral-200">
                    {/* Adoption section */}
                    <div className="py-2 space-y-2">
                      <div className="text-xs font-bold text-neutral-700 mb-2">
                        Adoption
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Providers</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {effectiveClinicians > 0 ? effectiveClinicians.toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Annual encounters</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {effectiveEncounters > 0 ? effectiveEncounters.toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Utilization</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {utilizationPercent !== null ? `${utilizationPercent}%` : "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Eligible encounters</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {eligibleEncounters !== null ? eligibleEncounters.toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Time Assumptions section */}
                    <div className="py-2 space-y-2">
                      <div className="text-xs font-bold text-neutral-700 mb-2">
                        Time Assumptions
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Minutes returned / encounter</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {effectiveMinutesSaved !== null ? `${effectiveMinutesSaved} min` : "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Hours returned (gross)</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {totalHoursSaved !== null
                            ? totalHoursSaved.toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : "—"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-neutral-600">Hours usable (net)</div>
                        <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {realizedHoursSaved !== null
                            ? realizedHoursSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Documentation Assumptions section */}
                    {hasAnyDocumentationLever && (
                      <div className="py-2 space-y-2">
                        <div className="text-xs font-bold text-neutral-700 mb-2">
                          Documentation Assumptions
                        </div>
                        {hasWrvuSelected && wrvuSensitivity !== null && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Level of service lift</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {wrvuSensitivity}%
                            </div>
                          </div>
                        )}
                        {hasHccSelected && hccSensitivity !== null && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">HCC / RAF lift</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {hccSensitivity}%
                            </div>
                          </div>
                        )}
                        {hasDenialsSelected && denialsSensitivity !== null && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Denial rate reduction</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {denialsSensitivity}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Investment info - only show on step 3 */}
                    {modelSetupStep === 3 && (annualSubscriptionCost !== null || implementationFee !== null) && (
                      <div className="py-2 space-y-2">
                        <div className="text-xs font-bold text-neutral-700 mb-2">
                          Investment
                        </div>
                        {implementationEnabled && implementationFee !== null && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Implementation fee</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              ${implementationFee.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {annualSubscriptionCost !== null && (
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Annual subscription</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              ${annualSubscriptionCost.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {year1TotalCost !== null && (
                          <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200">
                            <div className="text-sm text-neutral-600">Year 1 total cost</div>
                            <div className="text-sm font-bold text-neutral-900 tabular-nums">
                              ${year1TotalCost.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {lifetimeSubscription !== null && (
                          <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200">
                            <div className="text-sm text-neutral-600">Lifetime subscription</div>
                            <div className="text-sm font-bold text-neutral-900 tabular-nums">
                              ${lifetimeSubscription.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
                    Tip: If a number looks high, open Results and use "Review inputs" to validate the driver math.
                  </div>
                </div>
              </div>
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

      {/* Sticky Bottom Bar — Page 3 (Value Blueprint) */}
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

    </div>
  );
}
