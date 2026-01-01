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

interface ObjectiveSelectionScreenProps {
  onComplete: (
    selectedSettings: CareSettingType[],
    selectedLevers: SelectedLever[],
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
          Model Summary
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
  const [enterpriseProviders, setEnterpriseProviders] = useState<number | "">(
    "",
  );
  const [enterpriseEncounters, setEnterpriseEncounters] = useState<number | "">(
    "",
  );
  const [isEnterpriseExpanded, setIsEnterpriseExpanded] = useState(false);

  // Adoption step state
  const [utilizationPercent, setUtilizationPercent] = useState<number | null>(
    null,
  );
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [showCustomMinutesInput, setShowCustomMinutesInput] = useState(false);
  const customMinutesInputRef = useRef<HTMLInputElement>(null);

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

  // Estimated encounters from enterprise (informational only, not used in calculations)
  const estimatedEncountersFromEnterprise = useMemo(() => {
    const providers =
      typeof cliniciansInScope === "number" ? cliniciansInScope : 0;
    const entProviders =
      typeof enterpriseProviders === "number" ? enterpriseProviders : 0;
    const entEncounters =
      typeof enterpriseEncounters === "number" ? enterpriseEncounters : 0;

    if (providers > 0 && entProviders > 0 && entEncounters > 0) {
      return Math.round((providers / entProviders) * entEncounters);
    }
    return null;
  }, [cliniciansInScope, enterpriseProviders, enterpriseEncounters]);

  // Canonical values for calculations (parse empty string as 0 for validation)
  const effectiveClinicians =
    typeof cliniciansInScope === "number" ? cliniciansInScope : 0;
  const effectiveEncounters =
    typeof annualEncountersInScope === "number" ? annualEncountersInScope : 0;

  // Effective minutes saved (custom or preset)
  const effectiveMinutesSaved = customMinutes ?? minutesSaved;

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

    onComplete([selectedSetting], levers);
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
      <header className="relative z-20 bg-white/90 backdrop-blur-sm border-b border-neutral-200/50">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight relative inline-block">
              ROI Calculator
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F03319]" />
            </h1>
            <p className="text-xs text-neutral-500 mt-1">by Abridge</p>
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
              <div className="w-full bg-neutral-50/95 backdrop-blur-md border border-neutral-200/70 rounded-3xl px-10 py-12 md:px-16 md:py-14 shadow-[0_24px_64px_-40px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
                <div className="mx-auto mb-5 h-0.5 w-32 rounded-full bg-[#F03319] opacity-80" />
                <h2 className="text-3xl md:text-4xl lg:text-[52px] font-medium text-neutral-900 leading-[1.08] tracking-tight">
                  Let&apos;s walk through how Abridge creates value in your care
                  setting.
                </h2>
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleContinueToPage1}
                    className="inline-flex items-center justify-center gap-3 px-16 py-5 rounded-2xl font-semibold text-base md:text-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                    data-testid="button-start"
                  >
                    Get started
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
                        Each setting has different documentation demands and
                        workflow bottlenecks
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-base text-neutral-700">
                      <Check className="w-5 h-5 text-[#F03319] flex-shrink-0 mt-0.5" />
                      <span>
                        Operational efficiency and financial impact differ
                        across environments
                      </span>
                    </li>
                    <li className="flex items-start gap-3 text-base text-neutral-700">
                      <Check className="w-5 h-5 text-[#F03319] flex-shrink-0 mt-0.5" />
                      <span>
                        This choice anchors the assumptions used throughout the
                        model
                      </span>
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
                    Select one to continue
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
                <button
                  onClick={handleBackToPage1}
                  className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
                  data-testid="button-back-to-setting"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div className="mb-8">
                  <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-3">
                    Strategic Priorities
                  </h2>
                  <p className="text-lg text-neutral-600 leading-relaxed">
                    What outcomes matter most right now?
                  </p>
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
                    Baseline Assumptions
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
                      {step === 1 && "Baseline"}
                      {step === 2 && "Adoption"}
                      {step === 3 && "Pricing"}
                    </button>
                  ))}
                </div>

                {/* Step 1: Baseline */}
                {modelSetupStep === 1 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
                    <div className="space-y-6">
                      {/* Providers in scope - Required */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Providers in scope{" "}
                          <span className="text-[#F03319]">*</span>
                        </label>
                        <input
                          type="number"
                          value={cliniciansInScope}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCliniciansInScope(
                              val === "" ? "" : Math.max(0, parseInt(val) || 0),
                            );
                          }}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                          data-testid="input-clinicians"
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                          Number of providers who will use Abridge
                        </p>
                      </div>

                      {/* Annual outpatient encounters (in scope) - Required */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Annual outpatient encounters (in scope){" "}
                          <span className="text-[#F03319]">*</span>
                        </label>
                        <input
                          type="number"
                          value={annualEncountersInScope}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnnualEncountersInScope(
                              val === "" ? "" : Math.max(0, parseInt(val) || 0),
                            );
                          }}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                          data-testid="input-encounters"
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                          Total annual encounters for providers in scope
                        </p>
                      </div>

                      {/* Optional enterprise context - Expandable */}
                      <div className="border-t border-neutral-100 pt-6">
                        <button
                          type="button"
                          onClick={() =>
                            setIsEnterpriseExpanded(!isEnterpriseExpanded)
                          }
                          className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isEnterpriseExpanded ? "rotate-90" : ""}`}
                          />
                          Optional — Enterprise Context
                        </button>

                        {isEnterpriseExpanded && (
                          <div className="mt-4 space-y-5 pl-6 border-l-2 border-neutral-100">
                            {/* Enterprise providers */}
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Enterprise Providers
                              </label>
                              <input
                                type="number"
                                value={enterpriseProviders}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEnterpriseProviders(
                                    val === ""
                                      ? ""
                                      : Math.max(0, parseInt(val) || 0),
                                  );
                                }}
                                placeholder="Total providers in organization"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                                data-testid="input-enterprise-providers"
                              />
                            </div>

                            {/* Enterprise annual outpatient encounters */}
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Enterprise annual outpatient encounters
                              </label>
                              <input
                                type="number"
                                value={enterpriseEncounters}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEnterpriseEncounters(
                                    val === ""
                                      ? ""
                                      : Math.max(0, parseInt(val) || 0),
                                  );
                                }}
                                placeholder="Total annual encounters"
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                                data-testid="input-enterprise-encounters"
                              />
                            </div>

                            {/* Estimated encounters - informational only */}
                            {estimatedEncountersFromEnterprise !== null && (
                              <div className="p-3 bg-neutral-50 rounded-lg">
                                <p className="text-sm text-neutral-600">
                                  Estimated encounters in scope:{" "}
                                  <span className="font-semibold text-neutral-900">
                                    {estimatedEncountersFromEnterprise.toLocaleString()}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
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
                        Next: Adoption
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Adoption */}
                {modelSetupStep === 2 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
                    <p className="text-sm text-neutral-600 mb-6">
                      Adoption determines how many eligible encounters use
                      Abridge.
                    </p>
                    <div className="space-y-8">
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
                            Early (50%)
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
                            Expected (65%)
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
                            High (80%)
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                          Percentage of eligible encounters where Abridge is
                          used
                        </p>
                      </div>

                      {/* Minutes Saved */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Minutes saved per encounter
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[2, 4, 6].map((val) => (
                            <button
                              key={val}
                              onClick={() => {
                                setMinutesSaved(val);
                                setCustomMinutes(null);
                                setShowCustomMinutesInput(false);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                minutesSaved === val && customMinutes === null
                                  ? "bg-[#F03319] text-white"
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              }`}
                              data-testid={`chip-minutes-${val}`}
                            >
                              {val} min
                            </button>
                          ))}
                          {!showCustomMinutesInput ? (
                            <button
                              onClick={() => setShowCustomMinutesInput(true)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                customMinutes !== null
                                  ? "bg-[#F03319] text-white"
                                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                              }`}
                              data-testid="chip-minutes-custom"
                            >
                              {customMinutes !== null
                                ? `${customMinutes} min`
                                : "Custom…"}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                ref={customMinutesInputRef}
                                type="number"
                                placeholder="Custom"
                                value={customMinutes ?? ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val > 0) {
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
                                className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319]"
                                data-testid="input-custom-minutes"
                              />
                              <span className="text-sm text-neutral-500">
                                min
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                          Average documentation time saved per encounter
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row sm:justify-between gap-3">
                      <button
                        onClick={() => setModelSetupStep(1)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-neutral-700 hover:bg-neutral-100 transition-all"
                        data-testid="button-step2-back"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        onClick={() => setModelSetupStep(3)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-neutral-900 text-white hover:bg-neutral-800 transition-all"
                        data-testid="button-step2-next"
                      >
                        Next: Pricing
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Pricing */}
                {modelSetupStep === 3 && (
                  <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
                    <h3 className="text-xl font-semibold text-neutral-900 mb-6">
                      Pricing
                    </h3>

                    <div className="space-y-6">
                      {/* Pricing Model Section */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Pricing model
                        </label>
                        {pricingModel === null && (
                          <p className="text-sm text-neutral-600 mb-3">
                            Choose how you price Abridge to calculate cost.
                          </p>
                        )}
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
                                  type="number"
                                  placeholder="Years"
                                  value={contractYears ?? ""}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val > 0) {
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
                                  className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319]"
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
                              type="number"
                              value={perClinicianCost ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPerClinicianCost(
                                  val === ""
                                    ? null
                                    : Math.max(0, parseInt(val) || 0),
                                );
                              }}
                              placeholder="Enter amount"
                              className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                              data-testid="input-per-clinician-cost"
                            />
                          </div>
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
                              type="number"
                              value={enterpriseAnnualCost ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEnterpriseAnnualCost(
                                  val === ""
                                    ? null
                                    : Math.max(0, parseInt(val) || 0),
                                );
                              }}
                              placeholder="Enter annual amount"
                              className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                              data-testid="input-enterprise-cost"
                            />
                          </div>
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
                                  type="number"
                                  value={implementationFee ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setImplementationFee(
                                      val === ""
                                        ? null
                                        : Math.max(0, parseInt(val) || 0),
                                    );
                                  }}
                                  placeholder="Enter one-time fee"
                                  className="w-full pl-8 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#F03319]/20 focus:border-[#F03319] transition-all"
                                  data-testid="input-implementation-fee"
                                />
                              </div>
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
              <div className="hidden lg:block">
                <div className="sticky top-8">
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
                        <span className="text-neutral-600">Minutes saved</span>
                        <span className="font-medium text-neutral-900">
                          {effectiveMinutesSaved !== null
                            ? `${effectiveMinutesSaved} min`
                            : "—"}
                        </span>
                      </div>
                      <div className="border-t border-neutral-200 pt-3 mt-3">
                        {implementationEnabled &&
                          implementationFee !== null && (
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
                            Annual subscription
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
                </div>
              </div>
            </div>

            {/* Summary Panel - Mobile for Page 3 */}
            <div className="lg:hidden mt-8">
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
                        Annual subscription
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
