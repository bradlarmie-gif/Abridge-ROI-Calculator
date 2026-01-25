import { useState, useMemo } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import {
  type CareSettingType,
  CARE_SETTING_LABELS,
} from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";
import {
  ArrowLeft,
  ChevronRight,
  Info,
  Activity,
  Star,
  Check,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface BaselineInfo {
  providers: number;
  encounters: number;
  utilizationRate: number;
  eligibleEncounters: number;
  // Nursing-specific
  nursingStaffedBeds?: number;
  nursingFTEs?: number;
  nursingUnitType?: "med-surg" | "icu" | "mixed";
  nursingDocEventsPerBedPerYear?: number;
  nursingOccupancyRate?: number;
}

interface BaselineSetupProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
  onComplete: (baseline: BaselineInfo) => void;
  initialBaseline?: BaselineInfo | null;
  onBackToJourney?: () => void;
  seedInputs?: Partial<RoiInputs>;
}

export default function BaselineSetup({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
  initialBaseline,
  onBackToJourney,
  seedInputs = {},
}: BaselineSetupProps) {
  const primarySetting = selectedSettings[0] || "outpatient";
  const isNursingSetting = primarySetting === "nursing";
  const isEDSetting = primarySetting === "ed";
  const isInpatientSetting = primarySetting === "inpatient";

  // State for provider/encounter inputs - start with seed values, then initialBaseline, then empty
  const [providers, setProviders] = useState<number | "">(
    initialBaseline?.providers || seedInputs?.numberOfProviders || ""
  );
  const [encounters, setEncounters] = useState<number | "">(
    initialBaseline?.encounters || seedInputs?.annualOutpatientEncounters || ""
  );
  const [utilizationRate, setUtilizationRate] = useState(initialBaseline?.utilizationRate || 65);

  // Nursing-specific state
  const [staffedBeds, setStaffedBeds] = useState(initialBaseline?.nursingStaffedBeds || "");
  const [nurseFTEs, setNurseFTEs] = useState(initialBaseline?.nursingFTEs || "");
  const [unitType, setUnitType] = useState<"med-surg" | "icu" | "mixed">(initialBaseline?.nursingUnitType || "med-surg");
  const [occupancyRate, setOccupancyRate] = useState<number>(85);
  const [eventsPerPatientDay, setEventsPerPatientDay] = useState<number | "">(initialBaseline?.nursingDocEventsPerBedPerYear || 3);

  // Compute derived values
  const numericEventsPerPatientDay = typeof eventsPerPatientDay === "number" ? eventsPerPatientDay : 3;
  const numericEncounters = typeof encounters === "number" ? encounters : 0;
  const numericProviders = typeof providers === "number" ? providers : 0;
  const numericStaffedBeds = typeof staffedBeds === "number" ? staffedBeds : 0;
  const numericNurseFTEs = typeof nurseFTEs === "number" ? nurseFTEs : 0;
  
  // Calculate patient days and documentation events for nursing
  const patientDays = Math.round(numericStaffedBeds * (occupancyRate / 100) * 365);
  const documentationEvents = isNursingSetting ? patientDays * numericEventsPerPatientDay : numericEncounters;
  
  const eligibleEncounters = useMemo(() => {
    if (isNursingSetting) {
      return Math.round(documentationEvents * (utilizationRate / 100));
    }
    return Math.round(numericEncounters * (utilizationRate / 100));
  }, [isNursingSetting, documentationEvents, numericEncounters, utilizationRate]);

  const handleContinue = () => {
    const baseline: BaselineInfo = {
      providers: numericProviders,
      encounters: numericEncounters,
      utilizationRate,
      eligibleEncounters,
    };

    if (isNursingSetting) {
      baseline.nursingStaffedBeds = numericStaffedBeds;
      baseline.nursingFTEs = numericNurseFTEs;
      baseline.nursingUnitType = unitType;
      baseline.nursingDocEventsPerBedPerYear = numericEventsPerPatientDay;
      baseline.nursingOccupancyRate = occupancyRate;
    }

    onComplete(baseline);
  };

  const canContinue = isNursingSetting 
    ? numericStaffedBeds > 0 && numericNurseFTEs > 0 && numericEventsPerPatientDay > 0
    : numericProviders > 0 && numericEncounters > 0;

  // Get setting-specific labels
  const getProviderLabel = () => {
    if (isInpatientSetting) return "hospitalists";
    if (isEDSetting) return "ED physicians";
    return "providers";
  };
  
  const getEncounterLabel = () => {
    if (isInpatientSetting) return "admissions";
    return "encounters";
  };

  // Utilization options - consistent across all settings
  const utilizationOptions = [
    { value: 50, label: "Conservative" }, 
    { value: 65, label: "Typical" }, 
    { value: 80, label: "Aggressive" }
  ];

  const typicalUtilization = utilizationOptions[1].value;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <UnifiedHeader
        pathType="explore"
        currentStep={3}
        totalSteps={6}
        stepName="Your Organization"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <div className="py-6 sm:py-8 md:py-12">
        {/* Centered Page Header */}
        <div className="text-center max-w-[700px] mx-auto px-4 md:px-6 mb-8 sm:mb-12 md:mb-16">
          <div className="inline-block text-[11px] md:text-[13px] font-semibold text-[#EA2C00] uppercase tracking-[0.1em] bg-[rgba(234,44,0,0.08)] px-2.5 md:px-3 py-1 md:py-1.5 rounded-md mb-4 md:mb-6">
            Step 3 of 6
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[48px] font-bold text-[#111827] leading-[1.1] tracking-[-0.02em] mb-3 md:mb-4">
            Size your opportunity
          </h1>
          <p className="text-sm md:text-[17px] leading-relaxed text-[#6B7280]">
            We'll use your deployment scope to calculate your addressable market—the foundation for your ROI model.
          </p>
        </div>

        {/* Single Column Form */}
        <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-12">
          
          {/* Section 1: Deployment Scope */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl md:rounded-2xl p-5 md:p-8 lg:p-10 mb-6 md:mb-8">
            <div className="flex items-start gap-3 md:gap-5 mb-6 md:mb-8">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#EA2C00] text-white flex items-center justify-center text-sm md:text-[17px] font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-[#111827] mb-1">
                  Deployment Scope
                </h2>
                <p className="text-sm md:text-[15px] text-[#6B7280]">
                  This could be a pilot or full deployment
                </p>
              </div>
            </div>

            {isNursingSetting ? (
              /* Nursing-specific inputs */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    How many staffed beds are in scope?
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[220px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p>Total staffed beds in this deployment. This is how Abridge Nursing is billed.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={staffedBeds === "" ? "" : staffedBeds.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setStaffedBeds(val === "" ? "" : parseInt(val, 10));
                      }}
                      placeholder="e.g., 200"
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-staffed-beds"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      beds
                    </span>
                  </div>
                  <p className="text-[14px] text-[#9CA3AF] mt-2">
                    This is your billing unit for Abridge Nursing
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    How many nurse FTEs support these beds?
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[220px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p>Full-time equivalent nurses. Used to calculate labor savings.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={nurseFTEs === "" ? "" : nurseFTEs.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNurseFTEs(val === "" ? "" : parseInt(val, 10));
                      }}
                      placeholder="e.g., 300"
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-nurse-ftes"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      FTEs
                    </span>
                  </div>
                  <p className="text-[14px] text-[#9CA3AF] mt-2">
                    ~1.5 FTEs per bed is typical for med-surg, higher for ICU
                  </p>
                </div>

                {/* Occupancy Rate */}
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    Average bed occupancy rate
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[220px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p>Your average daily bed occupancy. Used to calculate patient days per year.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={occupancyRate}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          setOccupancyRate(val);
                        }
                      }}
                      placeholder="e.g., 85"
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-occupancy-rate"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[14px] text-[#9CA3AF] mt-2">
                    Most hospitals run 75-90% occupancy
                  </p>
                </div>

                {/* Events per Patient Day */}
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    Doc events per patient day
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[320px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p className="font-medium mb-2">What counts as a documentation event?</p>
                        <p className="text-[#D1D5DB] text-[12px] mb-2">
                          Any patient interaction requiring a structured note in your EMR:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="text-emerald-400">
                            <p>✓ Shift assessments</p>
                            <p>✓ Admission/discharge notes</p>
                            <p>✓ Procedure documentation</p>
                            <p>✓ PRN medication notes</p>
                          </div>
                          <div className="text-red-400">
                            <p>✗ Individual vital signs</p>
                            <p>✗ Single flowsheet clicks</p>
                            <p>✗ MAR checkboxes alone</p>
                            <p>✗ Care plan reviews</p>
                          </div>
                        </div>
                        <p className="text-[#9CA3AF] text-[11px] mt-2 italic">
                          Think: "How many times does a nurse open a documentation template per patient per day?"
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={eventsPerPatientDay === "" ? "" : eventsPerPatientDay.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEventsPerPatientDay(val === "" ? "" : parseInt(val, 10));
                      }}
                      placeholder="e.g., 3"
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-events-per-patient-day"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      events/day
                    </span>
                  </div>
                  
                  {/* Preset buttons */}
                  <div className="mt-3">
                    <p className="text-[13px] text-[#6B7280] mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Typical ranges:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEventsPerPatientDay(2)}
                        className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                          eventsPerPatientDay === 2
                            ? "border-[#EA2C00] bg-[rgba(234,44,0,0.05)] text-[#EA2C00]"
                            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#EA2C00] hover:text-[#EA2C00] bg-white"
                        }`}
                        data-testid="preset-light"
                      >
                        Light: 2/day
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventsPerPatientDay(3)}
                        className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                          eventsPerPatientDay === 3
                            ? "border-[#EA2C00] bg-[rgba(234,44,0,0.05)] text-[#EA2C00]"
                            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#EA2C00] hover:text-[#EA2C00] bg-white"
                        }`}
                        data-testid="preset-typical"
                      >
                        Typical: 3/day
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventsPerPatientDay(5)}
                        className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                          eventsPerPatientDay === 5
                            ? "border-[#EA2C00] bg-[rgba(234,44,0,0.05)] text-[#EA2C00]"
                            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#EA2C00] hover:text-[#EA2C00] bg-white"
                        }`}
                        data-testid="preset-heavy"
                      >
                        Heavy: 5/day
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unit Type */}
                <div className="md:col-span-2">
                  <label className="text-[15px] font-semibold text-[#111827] mb-3 block">
                    What type of unit(s)?
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {(["med-surg", "icu", "mixed"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setUnitType(type)}
                        className={`px-5 py-3 rounded-xl border-2 text-[15px] font-medium transition-all ${
                          unitType === type
                            ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)] text-[#EA2C00]"
                            : "border-[#E5E7EB] text-[#6B7280] hover:border-[#EA2C00] bg-white"
                        }`}
                        data-testid={`unit-type-${type}`}
                      >
                        {type === "med-surg" && "Med-Surg"}
                        {type === "icu" && "ICU/Critical Care"}
                        {type === "mixed" && "Mixed"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Standard provider/encounter inputs */
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    How many {getProviderLabel()} are in scope?
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[220px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p>Total {getProviderLabel()} who will use Abridge. Start with a pilot or full deployment.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={providers === "" ? "" : providers.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setProviders(val === "" ? "" : parseInt(val, 10));
                      }}
                      placeholder={isInpatientSetting ? "e.g., 20" : isEDSetting ? "e.g., 25" : "e.g., 50"}
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-providers"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      {getProviderLabel()}
                    </span>
                  </div>
                  <p className="text-[14px] text-[#9CA3AF] mt-2">
                    {isInpatientSetting
                      ? "Include all hospitalists who will use Abridge"
                      : isEDSetting 
                        ? "Include attendings and mid-levels who will use Abridge" 
                        : "This is your starting point. Could be a pilot or full deployment."}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[15px] font-semibold text-[#111827] mb-3">
                    Annual {getEncounterLabel()} for these {getProviderLabel()}?
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="text-[#9CA3AF] cursor-help hover:text-[#6B7280] transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="bg-[#1F2937] text-white border-none shadow-lg max-w-[220px] text-[13px] leading-relaxed px-3 py-2"
                      >
                        <p>Total {getEncounterLabel()} per year. This drives all ROI calculations.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={encounters === "" ? "" : encounters.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEncounters(val === "" ? "" : parseInt(val, 10));
                      }}
                      placeholder={isInpatientSetting ? "e.g., 8,000" : isEDSetting ? "e.g., 45,000" : "e.g., 100,000"}
                      className="w-full px-5 py-4 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] transition-all"
                      data-testid="input-encounters"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-[#9CA3AF] font-medium pointer-events-none">
                      {getEncounterLabel()}/year
                    </span>
                  </div>
                  <p className="text-[14px] text-[#9CA3AF] mt-2">
                    {isInpatientSetting
                      ? "~400/hospitalist is typical for a hospitalist program"
                      : isEDSetting 
                        ? "~1,800/physician is typical for a community ED"
                        : "~2,000/provider is typical for primary care, ~1,500 for specialty"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Expected Utilization */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl md:rounded-2xl p-5 md:p-8 lg:p-10 mb-6 md:mb-8">
            <div className="flex items-start gap-3 md:gap-5 mb-6 md:mb-8">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#EA2C00] text-white flex items-center justify-center text-sm md:text-[17px] font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-[#111827] mb-1">
                  Expected Utilization
                </h2>
                <p className="text-sm md:text-[15px] text-[#6B7280]">
                  What percentage of {isNursingSetting ? "documentation events" : getEncounterLabel()} will use Abridge?
                </p>
              </div>
            </div>

            <p className="text-sm md:text-[17px] font-medium text-[#374151] mb-4 md:mb-6">Choose your adoption scenario:</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6">
              {utilizationOptions.map((option, idx) => {
                const isSelected = utilizationRate === option.value;
                const isRecommended = idx === 1; // Middle option is recommended
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setUtilizationRate(option.value)}
                    className={`relative text-left p-5 md:p-6 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)] shadow-[0_4px_16px_rgba(234,44,0,0.12)]"
                        : isRecommended
                          ? "border-[#EA2C00] bg-white hover:-translate-y-1 hover:shadow-lg"
                          : "border-[#E5E7EB] bg-white hover:border-[#EA2C00] hover:-translate-y-1 hover:shadow-lg"
                    }`}
                    data-testid={`utilization-${option.value}`}
                  >
                    <div className="mb-3">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-[#111827]">{option.label}</h3>
                        <span className="text-xl font-bold text-[#374151]">{option.value}%</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#6B7280] mb-3">
                      {option.label === "Conservative" && "Cautious rollout or optional use"}
                      {option.label === "Typical" && "Standard deployment with provider choice"}
                      {option.label === "Aggressive" && "Mandated use or mature adoption"}
                    </p>
                    <div className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-md ${
                      isRecommended 
                        ? "bg-[rgba(234,44,0,0.1)] text-[#EA2C00]" 
                        : "bg-[#F3F4F6] text-[#6B7280]"
                    }`}>
                      {isRecommended && <Star className="w-3.5 h-3.5" />}
                      {option.label === "Conservative" && "Lower risk estimate"}
                      {option.label === "Typical" && "Recommended"}
                      {option.label === "Aggressive" && "High adoption target"}
                    </div>
                    
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-2 p-4 bg-[#F9FAFB] rounded-lg">
              <Info className="w-4 h-4 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#6B7280]">
                Not sure? Start with <strong>Typical ({typicalUtilization}%)</strong> — you can adjust later. Most organizations reach 70-80% at full scale.
              </p>
            </div>
          </div>

          {/* Baseline Result Hero */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-8 md:p-10 mb-10">
            <div className="flex items-center gap-2.5 mb-6">
              <Activity className="w-6 h-6 text-emerald-600" />
              <span className="text-[13px] font-semibold text-emerald-600 uppercase tracking-[0.1em]">Your Baseline</span>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl md:text-6xl font-bold text-emerald-700 mb-2 font-mono">
                {eligibleEncounters.toLocaleString()}
              </div>
              <p className="text-lg font-medium text-emerald-700">
                eligible {isNursingSetting ? "documentation events" : getEncounterLabel()} per year
              </p>
            </div>

            {/* Formula Breakdown */}
            {isNursingSetting ? (
              <div className="p-6 bg-white/60 rounded-xl mb-6 space-y-4">
                {/* Step 1: Patient Days Calculation */}
                <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">
                      {numericStaffedBeds.toLocaleString()}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">beds</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">×</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">
                      {occupancyRate}%
                    </div>
                    <div className="text-[12px] text-[#6B7280]">occupancy</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">×</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">365</div>
                    <div className="text-[12px] text-[#6B7280]">days</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">=</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-emerald-600">
                      {patientDays.toLocaleString()}
                    </div>
                    <div className="text-[12px] text-emerald-600 font-medium">patient days</div>
                  </div>
                </div>
                
                {/* Step 2: Eligible Events Calculation */}
                <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap pt-3 border-t border-emerald-200">
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">
                      {patientDays.toLocaleString()}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">patient days</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">×</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">
                      {numericEventsPerPatientDay}
                    </div>
                    <div className="text-[12px] text-[#6B7280]">events/day</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">×</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-[#111827]">{utilizationRate}%</div>
                    <div className="text-[12px] text-[#6B7280]">utilization</div>
                  </div>
                  <span className="text-xl text-[#9CA3AF] font-light">=</span>
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold text-emerald-600">
                      {eligibleEncounters.toLocaleString()}
                    </div>
                    <div className="text-[12px] text-emerald-600 font-medium">eligible events</div>
                  </div>
                </div>
                
                {/* Implied FTEs Context */}
                <div className="text-center p-3 bg-emerald-50/50 rounded-lg text-[13px] text-[#6B7280] italic">
                  <Info className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  This accounts for ~{Math.round(numericStaffedBeds * 1.5).toLocaleString()} nurse FTEs
                  ({(1.5).toFixed(1)} FTEs per bed staffing ratio)
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap p-6 bg-white/60 rounded-xl mb-6">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-[#111827]">
                    {numericProviders.toLocaleString()}
                  </div>
                  <div className="text-[13px] text-[#6B7280]">{getProviderLabel()}</div>
                </div>
                <span className="text-2xl text-[#9CA3AF] font-light">×</span>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-[#111827]">
                    {numericEncounters.toLocaleString()}
                  </div>
                  <div className="text-[13px] text-[#6B7280]">{getEncounterLabel()}</div>
                </div>
                <span className="text-2xl text-[#9CA3AF] font-light">×</span>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-[#111827]">{utilizationRate}%</div>
                  <div className="text-[13px] text-[#6B7280]">utilization</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Check className="w-5 h-5" />
              <p className="text-[15px] font-medium">Everything below builds from this number</p>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl font-semibold text-[17px] transition-all duration-200 ${
              canContinue
                ? "bg-[#EA2C00] text-white hover:bg-[#d12700] shadow-md hover:shadow-lg hover:-translate-y-0.5"
                : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
            }`}
            data-testid="button-continue-drivers"
          >
            Continue to Value Drivers
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
