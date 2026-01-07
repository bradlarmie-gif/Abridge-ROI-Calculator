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
  Check,
  Clock,
  FileText,
  ArrowLeft,
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

type Page = "orientation" | "setting" | "priorities" | "model-setup";

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
    currentPage === "priorities" || currentPage === "model-setup";
  const step2Active = currentPage === "priorities";
  const step2Completed = currentPage === "model-setup";
  const step3Active = currentPage === "model-setup";

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
        label="Model Setup"
        isActive={step3Active}
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
  const [minutesSaved, setMinutesSaved] = useState<number | null>(4); // Default to Typical (4 min)
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [showCustomMinutesInput, setShowCustomMinutesInput] = useState(false);
  const customMinutesInputRef = useRef<HTMLInputElement>(null);

  // Value Realization step state
  const [timeRealizationRate, setTimeRealizationRate] = useState<number | null>(55); // Default to Typical (55%)
  
  // Documentation lever sensitivity states (only shown if lever is selected)
  const [wrvuSensitivity, setWrvuSensitivity] = useState<number | null>(5); // Default to Typical (5%)
  const [hccSensitivity, setHccSensitivity] = useState<number | null>(0.7); // Default to Typical (0.7%)
  const [denialsSensitivity, setDenialsSensitivity] = useState<number | null>(5); // Default to Typical (5%)

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
    setModelSetupStep(1);
    setCurrentPage("model-setup");
  };

  const handleBackToPage2 = () => {
    setCurrentPage("priorities");
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
                    className="inline-flex items-center justify-center gap-3 px-16 py-5 rounded-2xl font-semibold text-base md:text-lg bg-[#F03319] text-white hover:bg-[#D92E17] transition-all duration-200 shadow-md hover:shadow-lg"
                    data-testid="button-start"
                  >
                    Build ROI Case
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
                  Workflow patterns, documentation burden, and potential time
                  savings vary by setting.
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
                    Select to continue
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

        {/* PAGE 3 — BASELINE ASSUMPTIONS */}
        {currentPage === "model-setup" && selectedSetting && (
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
            <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
              <div>
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
                    Adoption
                  </h2>
                  <p className="text-lg text-neutral-600 leading-relaxed">
                    These inputs shape your ROI model.
                  </p>
                </div>

                {/* Mini-wizard step indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {([1, 2, 3] as const).map((step) => (
                    <button
                      key={step}
                      onClick={() => setModelSetupStep(step)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        modelSetupStep === step
                          ? "bg-[#F03319] text-white"
                          : modelSetupStep > step
                            ? "bg-neutral-200 text-neutral-700"
                            : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                        {modelSetupStep > step ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          step
                        )}
                      </span>
                      {step === 1 && "Adoption"}
                      {step === 2 && "Value Realization"}
                      {step === 3 && "Investment"}
                    </button>
                  ))}
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
                                ? "bg-[#F03319] text-white"
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
                                ? "bg-[#F03319] text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                            data-testid="chip-util-expected"
                          >
                            <div className="flex flex-col items-center">
                              <span>Expected (65%)</span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                Steady adoption with enablement
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => setUtilizationPercent(80)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              utilizationPercent === 80
                                ? "bg-[#F03319] text-white"
                                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                            data-testid="chip-util-high"
                          >
                            <div className="flex flex-col items-center">
                              <span>High (80%)</span>
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
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-7">
                    <div className="text-sm font-semibold text-neutral-900">
                      Value realization
                    </div>
                    <div className="mt-1 text-sm text-neutral-600">
                      Typical defaults are applied based on observed deployments. Adjust only if your environment differs.
                    </div>

                    {/* Two sections grid */}
                    <div className="mt-6 grid md:grid-cols-2 gap-6">
                      {/* Time Mechanics Section */}
                      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-5">
                        <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          Time Mechanics
                        </div>

                        <div className="mt-3">
                          <div className="text-sm font-semibold text-neutral-900">
                            Minutes returned per encounter
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMinutesSaved(2);
                                setCustomMinutes(null);
                                setShowCustomMinutesInput(false);
                              }}
                              className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                minutesSaved === 2 && customMinutes === null
                                  ? "border-neutral-900 bg-neutral-900 text-white"
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
                                  ? "border-neutral-900 bg-neutral-900 text-white"
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
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                              }`}
                              data-testid="chip-minutes-6"
                            >
                              Upper bound (6 min)
                            </button>
                            {!showCustomMinutesInput ? (
                              <button
                                type="button"
                                onClick={() => setShowCustomMinutesInput(true)}
                                className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                  customMinutes !== null
                                    ? "border-neutral-900 bg-neutral-900 text-white"
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
                          <div className="mt-2 text-xs text-neutral-500">
                            Observed defaults from live deployments. Use Custom if you have internal time study data.
                          </div>

                          <div className="mt-5 border-t border-neutral-200 pt-4">
                            <div className="text-sm font-semibold text-neutral-900">
                              Realization factor
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setTimeRealizationRate(45)}
                                className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                  timeRealizationRate === 45
                                    ? "border-neutral-900 bg-neutral-900 text-white"
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
                                    ? "border-neutral-900 bg-neutral-900 text-white"
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
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                }`}
                                data-testid="chip-realization-65"
                              >
                                Upper bound (65%)
                              </button>
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">
                              Portion of returned time that converts into usable capacity (varies by scheduling, staffing, and demand).
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Documentation Mechanics Section */}
                      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-5">
                        <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                          Documentation Mechanics
                        </div>

                        <div className="mt-3">
                          {/* Level of Service - always shown if wrvu lever selected */}
                          {hasWrvuSelected && (
                            <div>
                              <div className="text-sm font-semibold text-neutral-900">
                                Level-of-service alignment
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setWrvuSensitivity(3)}
                                  className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                    wrvuSensitivity === 3
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
                                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                  data-testid="chip-wrvu-7"
                                >
                                  Upper bound (7%)
                                </button>
                              </div>
                              <div className="mt-2 text-xs text-neutral-500">
                                Derived from documentation review patterns: percent of visits billed at the level actually delivered.
                              </div>
                            </div>
                          )}

                          {/* HCC / RAF Lift */}
                          {hasHccSelected && (
                            <div className={hasWrvuSelected ? "mt-5 border-t border-neutral-200 pt-4" : ""}>
                              <div className="text-sm font-semibold text-neutral-900">
                                HCC / RAF lift
                              </div>
                              <div className="mt-1 text-xs text-neutral-600">
                                Relative RAF score improvement.
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setHccSensitivity(0.3)}
                                  className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                    hccSensitivity === 0.3
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
                                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                  data-testid="chip-hcc-12"
                                >
                                  Upper bound (1.2%)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Denial Reduction */}
                          {hasDenialsSelected && (
                            <div className={(hasWrvuSelected || hasHccSelected) ? "mt-5 border-t border-neutral-200 pt-4" : ""}>
                              <div className="text-sm font-semibold text-neutral-900">
                                Denial rate reduction
                              </div>
                              <div className="mt-1 text-xs text-neutral-600">
                                Reduction in documentation-related denials.
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDenialsSensitivity(2)}
                                  className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition border ${
                                    denialsSensitivity === 2
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
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
                                      ? "border-neutral-900 bg-neutral-900 text-white"
                                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                  }`}
                                  data-testid="chip-denials-8"
                                >
                                  Upper bound (8%)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Placeholder for additional documentation drivers */}
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

                          {hasAnyDocumentationLever && (
                            <div className="mt-5 rounded-xl border border-dashed border-neutral-200 bg-white p-4">
                              <div className="text-xs font-semibold text-neutral-600">
                                Additional documentation drivers
                              </div>
                              <div className="mt-1 text-xs text-neutral-500">
                                Enable more drivers on the Results page (e.g., denials, HCC). This model will include only what you select.
                              </div>
                            </div>
                          )}
                        </div>
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
                                  ? "bg-[#F03319] text-white"
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
                                  ? "bg-[#F03319] text-white"
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
                                    ? "bg-[#F03319] text-white"
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

                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => setModelSetupStep(2)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-neutral-700 hover:bg-neutral-100 transition-all"
                        data-testid="button-step3-back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        onClick={handleFinalSubmit}
                        disabled={!canContinuePage3}
                        className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
                          canContinuePage3
                            ? "bg-[#F03319] text-white hover:bg-[#d62d16] shadow-md hover:shadow-lg"
                            : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                        }`}
                        data-testid="button-see-results"
                      >
                        View ROI Model
                        <ChevronRight className="h-4 w-4" />
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
                        {/* Configuration section */}
                        <div className="py-2 space-y-2">
                          <div className="text-xs font-semibold text-neutral-500">
                            Configuration
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
                        </div>

                        {/* System output section */}
                        <div className="py-2 space-y-2">
                          <div className="text-xs font-semibold text-neutral-500">
                            System output
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Eligible encounters</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {eligibleEncounters !== null ? eligibleEncounters.toLocaleString() : "—"}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-neutral-600">Encounters affected</div>
                            <div className="text-sm font-semibold text-neutral-900 tabular-nums">
                              {eligibleEncounters !== null ? eligibleEncounters.toLocaleString() : "—"}
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

                        {/* Documentation assumptions section */}
                        {hasAnyDocumentationLever && (
                          <div className="py-2 space-y-2">
                            <div className="text-xs font-semibold text-neutral-500">
                              Documentation assumptions
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
                            <div className="text-xs font-semibold text-neutral-500 mt-1">
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

            {/* Summary Panel - Mobile for Page 3 */}
            <div className="lg:hidden mt-8 space-y-4">
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
                  Model Inputs
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Providers</span>
                    <span className="font-medium text-neutral-900">
                      {effectiveClinicians > 0 ? effectiveClinicians : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Encounters</span>
                    <span className="font-medium text-neutral-900">
                      {effectiveEncounters > 0
                        ? effectiveEncounters.toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Utilization</span>
                    <span className="font-medium text-neutral-900">
                      {utilizationPercent !== null
                        ? `${utilizationPercent}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">
                      Eligible encounters
                    </span>
                    <span className="font-medium text-neutral-900">
                      {eligibleEncounters !== null
                        ? eligibleEncounters.toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Minutes saved</span>
                    <span className="font-medium text-neutral-900">
                      {effectiveMinutesSaved !== null
                        ? `${effectiveMinutesSaved} min`
                        : "—"}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 mt-3">
                    {implementationEnabled && implementationFee !== null && (
                      <div className="flex justify-between mb-2">
                        <span className="text-neutral-600">
                          Implementation fee
                        </span>
                        <span className="font-medium text-neutral-900">
                          ${implementationFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        Annual subscription cost
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {annualSubscriptionCost !== null
                          ? `$${annualSubscriptionCost.toLocaleString()}`
                          : "—"}
                      </span>
                    </div>
                    {year1TotalCost !== null && (
                      <div className="flex justify-between mt-2 pt-2 border-t border-neutral-200">
                        <span className="text-neutral-600">
                          Year 1 total cost
                        </span>
                        <span className="font-bold text-neutral-900">
                          ${year1TotalCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Saved Box - Mobile */}
              {totalMinutesSaved !== null && totalHoursSaved !== null && (
                <div className="bg-[#F03319] rounded-xl shadow-sm p-6">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
                    Time Saved
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/90">Total minutes saved</span>
                      <span className="font-semibold text-white">
                        {totalMinutesSaved.toLocaleString()} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/90">Total hours saved</span>
                      <span className="font-semibold text-white">
                        {totalHoursSaved.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        })}{" "}
                        hrs
                      </span>
                    </div>
                    {/* Realized time (when realization rate is set) */}
                    {realizedMinutesSaved !== null && realizedHoursSaved !== null && (
                      <>
                        <div className="border-t border-white/30 pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="text-white/90">
                              Realized minutes ({timeRealizationRate}%)
                            </span>
                            <span className="font-semibold text-white">
                              {realizedMinutesSaved.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })} min
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/90">Realized hours</span>
                          <span className="font-bold text-white">
                            {realizedHoursSaved.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 1,
                            })}{" "}
                            hrs
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
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

      {/* Sticky Bottom Bar — Mobile Only, Page 3 Step 3 Only */}
      {currentPage === "model-setup" && modelSetupStep === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg lg:hidden">
          <div className="px-6 py-4">
            <button
              type="button"
              disabled={!canContinuePage3}
              onClick={handleFinalSubmit}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                canContinuePage3
                  ? "bg-[#F03319] text-white hover:bg-[#d62d16] shadow-md"
                  : "opacity-40 bg-neutral-300 text-neutral-500 cursor-not-allowed"
              }`}
              data-testid="button-see-results-mobile"
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
