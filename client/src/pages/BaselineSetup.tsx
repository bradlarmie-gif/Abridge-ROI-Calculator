import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalHeader } from "@/components/GlobalHeader";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import {
  type CareSettingType,
  CARE_SETTING_LABELS,
} from "@/lib/SETTING_CONFIG";
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  DollarSign,
} from "lucide-react";

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
}

interface BaselineSetupProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
  onComplete: (baseline: BaselineInfo) => void;
  initialBaseline?: BaselineInfo | null;
  onBackToJourney?: () => void;
}

export default function BaselineSetup({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
  initialBaseline,
  onBackToJourney,
}: BaselineSetupProps) {
  const primarySetting = selectedSettings[0] || "outpatient";
  const isNursingSetting = primarySetting === "nursing";
  const isEDSetting = primarySetting === "ed";
  const isInpatientSetting = primarySetting === "inpatient";

  // State for provider/encounter inputs - start empty unless returning with data
  const [providers, setProviders] = useState<number | "">(initialBaseline?.providers || "");
  const [encounters, setEncounters] = useState<number | "">(initialBaseline?.encounters || "");
  const [utilizationRate, setUtilizationRate] = useState(initialBaseline?.utilizationRate || (isEDSetting ? 70 : isInpatientSetting ? 65 : 65));

  // Nursing-specific state
  const [staffedBeds, setStaffedBeds] = useState(initialBaseline?.nursingStaffedBeds || 200);
  const [nurseFTEs, setNurseFTEs] = useState(initialBaseline?.nursingFTEs || 300);
  const [unitType, setUnitType] = useState<"med-surg" | "icu" | "mixed">(initialBaseline?.nursingUnitType || "med-surg");

  // Compute derived values
  const documentationEventsPerFTE = 500;
  const numericEncounters = typeof encounters === "number" ? encounters : 0;
  const numericProviders = typeof providers === "number" ? providers : 0;
  const documentationEvents = isNursingSetting ? nurseFTEs * documentationEventsPerFTE : numericEncounters;
  
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
      baseline.nursingStaffedBeds = staffedBeds;
      baseline.nursingFTEs = nurseFTEs;
      baseline.nursingUnitType = unitType;
      baseline.nursingDocEventsPerBedPerYear = documentationEventsPerFTE;
    }

    onComplete(baseline);
  };

  const canContinue = isNursingSetting 
    ? staffedBeds > 0 && nurseFTEs > 0 
    : numericProviders > 0 && numericEncounters > 0;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <GlobalHeader
        pageName="Your Organization"
        currentStep={3}
        totalSteps={6}
        onLogoClick={onBackToJourney}
      />

      <div
        className="h-[72px]"
        style={{
          backgroundImage: `url(${geometricPattern})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="max-w-[800px] mx-auto px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <section className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Organization</h2>
            <p className="text-sm text-[#6B7280]">Let's start with the basics</p>
          </div>

          {isNursingSetting ? (
            /* Nursing-specific organization inputs */
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">
                  How many staffed beds are in scope?
                </label>
                <Input
                  type="number"
                  value={staffedBeds}
                  onChange={(e) => setStaffedBeds(Number(e.target.value) || 0)}
                  placeholder="e.g., 200"
                  className="w-[200px] font-mono text-lg py-3"
                  data-testid="input-staffed-beds"
                />
                <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-2">
                  <Lightbulb className="w-3.5 h-3.5" /> This is your billing unit for Abridge Nursing
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">
                  How many nurse FTEs support these beds?
                </label>
                <Input
                  type="number"
                  value={nurseFTEs}
                  onChange={(e) => setNurseFTEs(Number(e.target.value) || 0)}
                  placeholder="e.g., 300"
                  className="w-[200px] font-mono text-lg py-3"
                  data-testid="input-nurse-ftes"
                />
                <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-2">
                  <Lightbulb className="w-3.5 h-3.5" /> ~1.5 FTEs per bed is typical for med-surg. Higher for ICU (~2.5-3.0)
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">What type of unit(s)?</label>
                <p className="text-sm text-[#6B7280] mb-2">
                  Unit type affects documentation burden and staffing ratios
                </p>
                <div className="flex flex-wrap gap-3">
                  {(["med-surg", "icu", "mixed"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setUnitType(type)}
                      className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        unitType === type
                          ? "border-[#EA2C00] bg-[#FEF0EC] text-[#EA2C00]"
                          : "border-neutral-200 text-[#6B7280] hover:border-neutral-300 bg-white"
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

              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">Expected utilization rate?</label>
                <p className="text-sm text-[#6B7280] mb-3">
                  What percentage of documentation events will use Abridge?
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {([45, 60, 75] as const).map(rate => (
                    <button
                      key={rate}
                      onClick={() => setUtilizationRate(rate)}
                      className={`flex flex-col items-center px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl border transition-all flex-1 min-w-[90px] sm:min-w-[100px] ${
                        utilizationRate === rate
                          ? "border-[#EA2C00] bg-[#FEF0EC]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      data-testid={`utilization-${rate}`}
                    >
                      <span className={`text-xs font-medium mb-0.5 ${utilizationRate === rate ? "text-[#c2410c]" : "text-slate-500"}`}>
                        {rate === 45 && "Conservative"}
                        {rate === 60 && "Typical"}
                        {rate === 75 && "Aggressive"}
                      </span>
                      <span className={`text-lg sm:text-xl font-bold ${utilizationRate === rate ? "text-[#EA2C00]" : "text-slate-800"}`}>
                        {rate}%
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-3">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Not sure? Start with Typical — you can adjust later.</span>
                </p>
              </div>

              {/* YOUR BASELINE Section - Nursing */}
              <div className="mt-8 sm:mt-10 p-5 sm:p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">Your Baseline</span>
                </div>
                <div className="font-mono text-3xl sm:text-5xl font-bold text-emerald-700 mb-2">
                  {Math.round(documentationEvents * (utilizationRate / 100)).toLocaleString()}
                </div>
                <p className="text-sm sm:text-base font-medium text-emerald-700 mb-4 sm:mb-5">
                  Abridge-documented events per year
                </p>
                <div className="pt-4 sm:pt-5 border-t border-emerald-200">
                  <p className="font-mono text-xs sm:text-sm text-slate-500 tracking-tight leading-relaxed">
                    {nurseFTEs.toLocaleString()} nurse FTEs × ~500 events/FTE × {utilizationRate}%
                  </p>
                </div>
                <p className="text-sm text-emerald-600 mt-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Everything below builds from this number
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Abridge Nursing is priced per staffed bed, not per nurse.</strong>
                    <br />
                    This means your ROI scales as utilization increases.
                  </span>
                </p>
              </div>
            </div>
          ) : (
            /* Standard provider/encounter inputs */
            <div className="space-y-9">
              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">
                  {isInpatientSetting ? "How many hospitalists are in scope?" : isEDSetting ? "How many ED physicians are in scope?" : "How many providers are in scope?"}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={providers === "" ? "" : providers.toLocaleString()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setProviders(val === "" ? "" : parseInt(val, 10));
                  }}
                  placeholder={isInpatientSetting ? "e.g., 20" : isEDSetting ? "e.g., 25" : "e.g., 50"}
                  className="w-[200px] font-mono text-lg py-3"
                  data-testid="input-providers"
                />
                <p className="text-sm text-[#6B7280] mt-2">
                  {isInpatientSetting
                    ? "Include all hospitalists who will use Abridge for documentation"
                    : isEDSetting 
                      ? "Include attendings and mid-levels who will use Abridge" 
                      : "This is your starting point. Could be a pilot or full deployment."}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">
                  {isInpatientSetting 
                    ? `Annual admissions for these hospitalists?` 
                    : `Annual encounters for these ${isEDSetting ? "physicians" : "providers"}?`}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={encounters === "" ? "" : encounters.toLocaleString()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setEncounters(val === "" ? "" : parseInt(val, 10));
                  }}
                  placeholder={isInpatientSetting ? "e.g., 8,000" : isEDSetting ? "e.g., 45,000" : "e.g., 100,000"}
                  className="w-[200px] font-mono text-lg py-3"
                  data-testid="input-encounters"
                />
                <p className="text-sm text-[#6B7280] mt-2">
                  {isInpatientSetting
                    ? "~400/hospitalist is typical for a hospitalist program"
                    : isEDSetting 
                      ? "~1,800/physician is typical for a community ED"
                      : "~2,000/provider is typical for primary care, ~1,500 for specialty"}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-base font-semibold text-[#111827]">Expected utilization rate?</label>
                <p className="text-sm text-[#6B7280] mb-3">
                  {isEDSetting 
                    ? "What percentage of encounters will use Abridge?"
                    : isInpatientSetting 
                      ? "What percentage of admissions will use Abridge?"
                      : "What percentage of encounters will use Abridge?"}
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {(isEDSetting ? [55, 70, 85] as const : isInpatientSetting ? [50, 65, 80] as const : [50, 65, 80] as const).map(rate => (
                    <button
                      key={rate}
                      onClick={() => setUtilizationRate(rate)}
                      className={`flex flex-col items-center px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl border transition-all flex-1 min-w-[90px] sm:min-w-[100px] ${
                        utilizationRate === rate
                          ? "border-[#EA2C00] bg-[#FEF0EC]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      data-testid={`utilization-${rate}`}
                    >
                      <span className={`text-xs font-medium mb-0.5 ${utilizationRate === rate ? "text-[#c2410c]" : "text-slate-500"}`}>
                        {isInpatientSetting ? (
                          <>
                            {rate === 50 && "Conservative"}
                            {rate === 65 && "Typical"}
                            {rate === 80 && "Aggressive"}
                          </>
                        ) : isEDSetting ? (
                          <>
                            {rate === 55 && "Conservative"}
                            {rate === 70 && "Typical"}
                            {rate === 85 && "Aggressive"}
                          </>
                        ) : (
                          <>
                            {rate === 50 && "Conservative"}
                            {rate === 65 && "Typical"}
                            {rate === 80 && "Aggressive"}
                          </>
                        )}
                      </span>
                      <span className={`text-lg sm:text-xl font-bold ${utilizationRate === rate ? "text-[#EA2C00]" : "text-slate-800"}`}>
                        {rate}%
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-3">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Not sure? Start with Typical — you can adjust later.</span>
                </p>
              </div>

              {/* YOUR BASELINE Section */}
              <div className="mt-8 sm:mt-10 p-5 sm:p-8 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">Your Baseline</span>
                </div>
                <div className="font-mono text-3xl sm:text-5xl font-bold text-emerald-700 mb-2">
                  {eligibleEncounters.toLocaleString()}
                </div>
                <p className="text-sm sm:text-base font-medium text-emerald-700 mb-4 sm:mb-5">
                  eligible {isInpatientSetting ? "admissions" : "encounters"} per year
                </p>
                <div className="pt-4 sm:pt-5 border-t border-emerald-200">
                  <p className="font-mono text-xs sm:text-sm text-slate-500 tracking-tight leading-relaxed">
                    {providers.toLocaleString()} {isInpatientSetting ? "hospitalists" : isEDSetting ? "physicians" : "providers"} × {encounters.toLocaleString()} {isInpatientSetting ? "admissions" : "encounters"} × {utilizationRate}%
                  </p>
                </div>
                <p className="text-sm text-emerald-600 mt-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Everything below builds from this number
                </p>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="mt-10 pt-8 border-t border-neutral-200">
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full h-12 bg-[#EA2C00] hover:bg-[#d12700] border-[#EA2C00] text-white text-base font-semibold disabled:opacity-50"
              data-testid="button-continue-drivers"
            >
              Continue to Value Drivers
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
