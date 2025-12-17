import { useState, useMemo } from "react";
import { CareSettingCard } from "@/components/CareSettingCard";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  CARE_SETTING_LABELS,
  CATEGORY_LABELS,
  SETTING_CONFIG,
  getLeversByCategory,
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
} from "lucide-react";

export interface SelectedLever {
  settingId: CareSettingType;
  leverId: string;
  active: boolean;
}

interface ObjectiveSelectionScreenProps {
  onComplete: (selectedSettings: CareSettingType[], selectedLevers: SelectedLever[]) => void;
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

const ALL_SETTINGS: AllSettingType[] = ["outpatient", "ed", "nursing", "inpatient"];

const LEVER_DRIVER_SUMMARIES: Record<string, string> = {
  patientAccess: "visits per provider per day and downstream revenue.",
  overtime: "overtime spend and locum hours.",
  workforce: "avoided replacement and recruiting costs.",
  hcc: "risk-adjusted revenue and panel funding.",
  wrvu: "wRVUs and per-visit reimbursement.",
  denials: "fewer write-offs and rework on denied claims.",
  edPatientAccess: "ED throughput and patients who leave without being seen.",
  edProviderRetention: "ED clinician turnover and staffing stability.",
  edScribeSavings: "scribe utilization and cost efficiency.",
  edDocumentationQuality: "coding accuracy and care transition quality.",
  edDenialSavings: "ED denial rates and revenue recovery.",
  rnLaborEfficiency: "nursing overtime and shift end times.",
  rnRetention: "nursing turnover and staff sustainability.",
  rnSafetyEvents: "patient safety documentation and early warning capture.",
  rnDrgSeverity: "severity documentation and case mix accuracy.",
};

function StepIndicator({ 
  stepNumber, 
  label, 
  isActive, 
  isCompleted 
}: { 
  stepNumber: number; 
  label: string; 
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium
          transition-all duration-200
          ${isCompleted 
            ? 'bg-[#F03319] text-white' 
            : isActive 
              ? 'bg-[#F03319] text-white' 
              : 'bg-neutral-200 text-neutral-500'
          }
        `}
      >
        {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
      </div>
      <span 
        className={`
          text-sm font-medium transition-colors duration-200
          ${isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-400'}
        `}
      >
        {label}
      </span>
    </div>
  );
}

function Stepper({ 
  selectedSetting, 
  selectedLeverId 
}: { 
  selectedSetting: CareSettingType | null; 
  selectedLeverId: string | null;
}) {
  const step1Complete = selectedSetting !== null;
  const step2Complete = selectedLeverId !== null;
  
  return (
    <div className="flex items-center justify-center gap-8 py-4">
      <StepIndicator 
        stepNumber={1} 
        label="Care Setting" 
        isActive={!step1Complete}
        isCompleted={step1Complete}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={2} 
        label="ROI Priority" 
        isActive={step1Complete && !step2Complete}
        isCompleted={step2Complete}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={3} 
        label="Calculator" 
        isActive={step1Complete && step2Complete}
        isCompleted={false}
      />
    </div>
  );
}

function PriorityCard({
  lever,
  isSelected,
  onSelect,
}: {
  lever: LeverConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const driverSummary = LEVER_DRIVER_SUMMARIES[lever.id] || "business outcomes and efficiency.";
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        w-full p-5 rounded-xl bg-white transition-all duration-200 text-left cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(240,51,25,0.5)]
        ${isSelected 
          ? "border-2 shadow-md" 
          : "border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300"
        }
      `}
      style={{ borderColor: isSelected ? '#F03319' : undefined }}
      data-testid={`priority-card-${lever.id}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className={`
            w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
            flex items-center justify-center transition-all duration-200
            ${isSelected 
              ? 'border-[#F03319] bg-[#F03319]' 
              : 'border-neutral-300 bg-white'
            }
          `}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-black text-base">
            {lever.label}
          </h4>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            {lever.description}
          </p>
          <p className="text-sm mt-2">
            <span className="font-semibold text-neutral-800">This lever drives:</span>{' '}
            <span className="text-neutral-600">{driverSummary}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ObjectiveSelectionScreen({
  onComplete,
  initialSelectedSettings = [],
  initialSelectedLevers = [],
}: ObjectiveSelectionScreenProps) {
  const [selectedSetting, setSelectedSetting] = useState<CareSettingType | null>(
    initialSelectedSettings.length > 0 ? initialSelectedSettings[0] : null
  );
  const [selectedLeverId, setSelectedLeverId] = useState<string | null>(() => {
    if (initialSelectedLevers.length > 0) {
      return initialSelectedLevers[0].leverId;
    }
    return null;
  });

  const leversByCategory = useMemo(() => {
    if (!selectedSetting) return null;
    return getLeversByCategory(selectedSetting);
  }, [selectedSetting]);

  const handleSettingSelect = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      return;
    }
    setSelectedSetting(setting);
    setSelectedLeverId(null);
  };

  const handleLeverSelect = (leverId: string) => {
    setSelectedLeverId(leverId);
  };

  const handleContinue = () => {
    if (!selectedSetting || !selectedLeverId) {
      return;
    }
    
    const lever: SelectedLever = {
      settingId: selectedSetting,
      leverId: selectedLeverId,
      active: true,
    };
    
    onComplete([selectedSetting], [lever]);
  };

  const canContinue = selectedSetting !== null && selectedLeverId !== null;

  const renderCategorySection = (category: LeverCategory, levers: LeverConfig[]) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];
    const categoryLabel = category === 'time' ? 'Capacity & Labor' : 'Revenue & Risk';

    return (
      <div key={category} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500 uppercase tracking-wide">
          <CategoryIcon className="h-4 w-4" />
          {categoryLabel}
        </div>
        <div className="space-y-3">
          {levers.map((lever) => (
            <PriorityCard
              key={lever.id}
              lever={lever}
              isSelected={selectedLeverId === lever.id}
              onSelect={() => handleLeverSelect(lever.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <BackgroundShape />
      
      <div className="relative z-10 flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto pt-10 pb-6 px-6">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="leading-tight">
                <h1 className="text-3xl font-semibold" style={{ color: '#111111' }}>
                  The ROI Calculator
                </h1>
                <p className="text-lg font-semibold" style={{ color: '#F03319' }}>
                  by Abridge
                </p>
              </div>
              <p className="text-sm text-neutral-600 pt-2">
                Build a focused ROI story in three simple steps.
              </p>
            </div>

            <Stepper selectedSetting={selectedSetting} selectedLeverId={selectedLeverId} />

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Step 1 - Choose your care setting
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Pick where you want to measure impact first. You can always come back and run another setting.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                {ALL_SETTINGS.map((setting) => {
                  const isInpatient = setting === "inpatient";
                  return (
                    <CareSettingCard
                      key={setting}
                      icon={SETTING_ICONS[setting]}
                      title={CARE_SETTING_LABELS[setting]}
                      selected={selectedSetting === setting}
                      disabled={isInpatient}
                      onClick={() => handleSettingSelect(setting)}
                    />
                  );
                })}
              </div>

              {!selectedSetting && (
                <p className="text-xs text-neutral-500 italic">
                  You'll choose your ROI priority next.
                </p>
              )}
            </div>

            <div 
              className={`
                space-y-5 transition-opacity duration-300
                ${selectedSetting ? 'opacity-100' : 'opacity-40 pointer-events-none'}
              `}
            >
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Step 2 - Choose your ROI priority
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  For the clearest story, model one priority at a time. You can rerun the calculator for additional priorities.
                </p>
              </div>

              {!selectedSetting && (
                <p className="text-sm text-neutral-500 py-4">
                  Choose a setting above to see relevant priorities.
                </p>
              )}

              {selectedSetting && leversByCategory && (
                <div className="space-y-6">
                  {renderCategorySection("time", leversByCategory.time)}
                  {renderCategorySection("documentation", leversByCategory.documentation)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-1.5">
        {canContinue && (
          <p className="text-sm text-neutral-500">
            Ready when you are.
          </p>
        )}
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className={`
            inline-flex items-center justify-center gap-2 px-6 py-2.5 
            rounded-lg border font-medium text-base
            transition-all duration-200
            ${canContinue
              ? 'bg-black border-black text-[#FAFAF8] cursor-pointer hover:bg-neutral-800'
              : 'opacity-50 bg-white border-neutral-300 text-neutral-400 cursor-not-allowed'
            }
          `}
          data-testid="button-continue"
        >
          Continue to calculator
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
