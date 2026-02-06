import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type DocQualityInputs } from "./ExploreFlow";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface ExploreDocQualityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  timeValue: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type ScenarioLevel = 'conservative' | 'typical' | 'aggressive';

export default function ExploreDocQuality({
  state,
  updateState,
  timeValue,
  onNext,
  onBack,
  onHome,
}: ExploreDocQualityProps) {
  const { docQualityInputs } = state;
  
  const updateDocInputs = (updates: Partial<DocQualityInputs>) => {
    updateState({
      docQualityInputs: { ...docQualityInputs, ...updates }
    });
  };

  const eligibleEncounters = useMemo(() => {
    return Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  }, [state.annualEncounters, state.utilizationPercent]);

  // Scenario percentages
  const wrvuScenarios: Record<ScenarioLevel, number> = { conservative: 2, typical: 5, aggressive: 7 };
  const hccScenarios: Record<ScenarioLevel, number> = { conservative: 10, typical: 15, aggressive: 25 };
  const denialsScenarios: Record<ScenarioLevel, number> = { conservative: 25, typical: 50, aggressive: 75 };
  const ipDrgProtectionScenarios: Record<ScenarioLevel, number> = { conservative: 15, typical: 20, aggressive: 25 };
  const ipCdiReductionScenarios: Record<ScenarioLevel, number> = { conservative: 15, typical: 25, aggressive: 35 };

  // wRVU Calculation
  const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
  const wrvuLiftPerVisit = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
  const totalAdditionalWrvus = eligibleEncounters * wrvuLiftPerVisit;
  const wrvuRevenueGross = totalAdditionalWrvus * docQualityInputs.conversionFactor;
  const wrvuRevenueNet = wrvuRevenueGross * (docQualityInputs.wrvuRealization / 100);

  // HCC Calculation
  const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
  const totalPatients = state.numberOfProviders * docQualityInputs.panelSize;
  const maPatients = totalPatients * (docQualityInputs.maPercent / 100);
  const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
  const totalRecaptureOpportunity = gapPatients * docQualityInputs.avgHccs;
  const hccsDocumented = totalRecaptureOpportunity * (recapturePercent / 100);
  const hccGrossValue = hccsDocumented * docQualityInputs.rafImpact * docQualityInputs.annualPayment;
  const hccRevenueNet = hccGrossValue * (docQualityInputs.hccRealization / 100);

  // Denials Calculation
  const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
  const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
  const unappealableDenials = totalDenials * (docQualityInputs.unappealableRate / 100);
  const preventedDenials = unappealableDenials * (preventionPercent / 100);
  const denialsRevenueGross = preventedDenials * docQualityInputs.avgClaimValue;
  const denialsRevenueNet = denialsRevenueGross * (docQualityInputs.denialsRealization / 100);

  // Inpatient: DRG Accuracy Calculation
  const ipDrgProtectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
  const ipAdmissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
  const ipAdmissionsProtected = ipAdmissionsAtRisk * (ipDrgProtectionPercent / 100);
  const ipDrgGrossValue = ipAdmissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;
  const ipDrgNetValue = ipDrgGrossValue * (docQualityInputs.ipDrgRealization / 100);

  // Inpatient: CDI Query Reduction Calculation
  const ipCdiReductionPercent = ipCdiReductionScenarios[docQualityInputs.ipCdiScenario];
  const ipTotalQueries = eligibleEncounters * (docQualityInputs.ipCdiQueryRate / 100);
  const ipQueriesAvoided = ipTotalQueries * (ipCdiReductionPercent / 100);
  const ipCdiSavingsValue = ipQueriesAvoided * docQualityInputs.ipCdiCostPerQuery;

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  // Care setting-specific configuration
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const showHCC = !isED && !isInpatient && !isNursing; // Only show HCC for Outpatient

  // Nursing: Patient Days calculation
  const nursingPatientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  // Nursing: HAPI Prevention calculation (potential value)
  const nursingHapiValue = useMemo(() => {
    const hapisPerYear = (nursingPatientDays / 1000) * docQualityInputs.nursingHapiRate;
    const hapisPrevented = hapisPerYear * (docQualityInputs.nursingHapiPreventionRate / 100);
    return Math.round(hapisPrevented * docQualityInputs.nursingHapiCost);
  }, [nursingPatientDays, docQualityInputs.nursingHapiRate, docQualityInputs.nursingHapiPreventionRate, docQualityInputs.nursingHapiCost]);

  // Nursing: Falls Prevention calculation (potential value)
  const nursingFallsValue = useMemo(() => {
    const fallsPerYear = (nursingPatientDays / 1000) * docQualityInputs.nursingFallsRate;
    const fallsPrevented = fallsPerYear * (docQualityInputs.nursingFallsPreventionRate / 100);
    return Math.round(fallsPrevented * docQualityInputs.nursingFallsCost);
  }, [nursingPatientDays, docQualityInputs.nursingFallsRate, docQualityInputs.nursingFallsPreventionRate, docQualityInputs.nursingFallsCost]);

  // Nursing: Total Care Quality Potential (separate from hard value)
  const nursingCareQualityPotential = useMemo(() => {
    return (docQualityInputs.nursingHapiEnabled ? nursingHapiValue : 0) + 
           (docQualityInputs.nursingFallsEnabled ? nursingFallsValue : 0);
  }, [docQualityInputs.nursingHapiEnabled, docQualityInputs.nursingFallsEnabled, nursingHapiValue, nursingFallsValue]);

  // Calculate total based on care setting
  const totalDocValue = useMemo(() => {
    if (isInpatient) {
      // Inpatient: DRG Accuracy + CDI Query Reduction
      return (docQualityInputs.ipDrgEnabled ? ipDrgNetValue : 0) + 
             (docQualityInputs.ipCdiEnabled ? ipCdiSavingsValue : 0);
    }
    if (isNursing) {
      // Nursing: Return 0 for doc quality (all care quality is "potential" and shown separately)
      return 0;
    }
    // Other settings: wRVU + HCC (if applicable) + Denials
    return (docQualityInputs.wrvuEnabled ? wrvuRevenueNet : 0) + 
           (showHCC && docQualityInputs.hccEnabled ? hccRevenueNet : 0) + 
           (docQualityInputs.denialsEnabled ? denialsRevenueNet : 0);
  }, [isInpatient, isNursing, docQualityInputs, ipDrgNetValue, ipCdiSavingsValue, wrvuRevenueNet, hccRevenueNet, denialsRevenueNet, showHCC]);

  const docConfig = {
    outpatient: {
      pageTitle: 'Documentation Quality',
      pageSubtitle: 'Better documentation creates downstream revenue. Select the drivers that apply to your organization.',
      driver1Title: 'wRVU Improvement',
      driver1Subtitle: 'Capture the complexity you\'re already delivering',
      driver2Title: 'HCC Capture',
      driver2Subtitle: 'Recapture missed diagnoses for MA population',
      driver3Title: 'Denial Prevention',
      driver3Subtitle: 'Reduce documentation-related claim denials',
    },
    ed: {
      pageTitle: 'Documentation Quality',
      pageSubtitle: 'Complete documentation supports accurate coding and faster reimbursement.',
      driver1Title: 'E&M Level Accuracy',
      driver1Subtitle: 'Capture the true complexity of ED visits',
      driver2Title: '', // No HCC for ED
      driver2Subtitle: '',
      driver3Title: 'Denial Prevention',
      driver3Subtitle: 'Reduce documentation-related claim denials',
    },
    inpatient: {
      pageTitle: 'Documentation Quality',
      pageSubtitle: 'Complete documentation drives revenue integrity.',
      driver1Title: 'DRG Accuracy',
      driver1Subtitle: "Capture clinical complexity that's discussed but not documented",
      driver2Title: 'CDI Query Reduction',
      driver2Subtitle: 'Fewer queries when documentation is complete upfront',
      driver3Title: '', // Denials handled within DRG Accuracy
      driver3Subtitle: '',
    },
    nursing: {
      pageTitle: 'Care Quality',
      pageSubtitle: 'Complete nursing documentation supports better outcomes and reduces adverse events.',
      driver1Title: 'Care Plan Quality',
      driver1Subtitle: 'Comprehensive care plans improve patient outcomes',
      driver2Title: 'Falls Prevention',
      driver2Subtitle: 'Better documentation supports fall risk assessment',
      driver3Title: 'HAPI Prevention',
      driver3Subtitle: 'Pressure injury documentation and prevention',
    },
  };

  const config = docConfig[state.careSetting || 'outpatient'];

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={7}
        stepName="Documentation Quality"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">
        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
            {config.pageTitle}
          </h1>
          <p className="text-base text-[#888888]">
            {config.pageSubtitle}
          </p>
        </motion.div>

        {/* Outpatient/ED: How to Use This */}
        {!isInpatient && !isNursing && (
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="card-how-to-use-doc-quality"
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            HOW TO USE THIS
          </p>
          <div className="h-px bg-[#D1D5DB] mb-6" />
          <p className="text-sm text-black leading-relaxed" data-testid="text-doc-quality-intro">
            {isED
              ? "Better documentation captures the clinical complexity you\u2019re already delivering. In high-volume ED settings, notes often understate acuity\u2014especially during surges. Select the drivers that apply to your department and adjust scenarios to match your confidence level."
              : "Better documentation creates downstream revenue by capturing the complexity you\u2019re already delivering. Select the drivers that apply to your organization, adjust the scenarios to match your confidence level, and edit any assumption directly."
            }
          </p>
          <p className="text-xs text-[#888888] mt-3">
            All calculations include conservative realization rates. Click into any driver to see and edit the full math.
          </p>
        </motion.div>
        )}

        {/* Nursing: Care Quality Potential Section */}
        {isNursing && (
        <>
        {/* Intro Box - Explaining Potential Value */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            How to Use This Section
          </p>
          <p className="text-sm text-black leading-relaxed">
            The link between documentation and outcomes is <strong>indirect</strong>—we don't cause 
            fewer falls, we enable the visibility that helps prevent them.
          </p>
          <p className="text-sm text-[#888888] mt-2">
            We show these as <strong>potential value</strong> because clinical practice matters more 
            than documentation alone. This value is real, just harder to attribute directly to Abridge.
          </p>
        </motion.div>

        {/* Potential Value Drivers Container */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Care Quality Potential
            </p>
            <div className="h-px bg-[#D1D5DB] mb-6" />
          </div>

          {/* HAPI Prevention - Potential Value */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 rounded-t-lg text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingHapiEnabled 
                  ? "bg-white border-[#EA2C00]/30" 
                  : "bg-white/70 hover:bg-white border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">HAPI Prevention</p>
                    <span className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide bg-[#EA2C00]/10 px-2 py-0.5 rounded">Potential</span>
                  </div>
                  <p className="text-sm text-[#888888]">Real-time documentation enables earlier intervention</p>
                </div>
                <button
                  onClick={() => updateDocInputs({ nursingHapiEnabled: !docQualityInputs.nursingHapiEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.nursingHapiEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-nursing-hapi"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.nursingHapiEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingHapiEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
                    <p className="text-sm text-black mb-6">
                      HAPIs happen when assessments are missed or interventions are delayed. Real-time 
                      documentation ensures skin assessments, turning schedules, and risk factors are 
                      captured as they're observed—enabling earlier intervention.
                    </p>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current HAPI Volume</p>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Patient Days/Year</label>
                        <div className="h-12 bg-[#F5F0EB] rounded-lg flex items-center px-3">
                          <span className="font-semibold text-black">
                            {formatNumber(Math.round(state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365))}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">HAPI Rate (per 1,000)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={docQualityInputs.nursingHapiRate}
                            onChange={(e) => updateDocInputs({ nursingHapiRate: Number(e.target.value) })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 text-black"
                            data-testid="input-nursing-hapi-rate"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">National: 2-5%</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">HAPIs/Year</label>
                        <div className="h-12 bg-[#F5F0EB] rounded-lg flex items-center px-3">
                          <span className="font-semibold text-black">
                            {formatNumber(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Prevention Rate</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={docQualityInputs.nursingHapiPreventionRate}
                            onChange={(e) => updateDocInputs({ nursingHapiPreventionRate: Number(e.target.value) })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-black"
                            data-testid="input-nursing-hapi-prevention-rate"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                        </div>
                        <p className="text-xs text-[#888888]">5% is conservative</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Cost per HAPI</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10">$</span>
                          <FormattedNumberInput
                            value={docQualityInputs.nursingHapiCost}
                            onChange={(val) => updateDocInputs({ nursingHapiCost: val })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg pl-7 pr-3 text-black"
                            data-testid="input-nursing-hapi-cost"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">CMS: $20k-$70k</p>
                      </div>
                    </div>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#666666]">HAPIs/year × Prevention rate</span>
                          <span className="font-semibold text-black">
                            {((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate * (docQualityInputs.nursingHapiPreventionRate / 100)).toFixed(1)} prevented
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">× Cost per HAPI</span>
                          <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingHapiCost)}</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between">
                          <span className="text-[#666666] font-medium">Potential HAPI Value</span>
                          <span className="font-bold text-[#EA2C00]">
                            {formatCurrency(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate * (docQualityInputs.nursingHapiPreventionRate / 100) * docQualityInputs.nursingHapiCost))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-[#FFF8F0] rounded-lg border border-[#EA2C00]/20">
                      <p className="text-xs text-[#666666] italic">
                        This is <strong>potential</strong> value. Not all HAPIs are documentation-preventable. 
                        5% represents cases where real-time assessment documentation would have triggered earlier intervention.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Falls Prevention - Potential Value */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 rounded-t-lg text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingFallsEnabled 
                  ? "bg-white border-[#EA2C00]/30" 
                  : "bg-white/70 hover:bg-white border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">Falls Prevention</p>
                    <span className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide bg-[#EA2C00]/10 px-2 py-0.5 rounded">Potential</span>
                  </div>
                  <p className="text-sm text-[#888888]">Better visibility enables faster intervention</p>
                </div>
                <button
                  onClick={() => updateDocInputs({ nursingFallsEnabled: !docQualityInputs.nursingFallsEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.nursingFallsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-nursing-falls"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.nursingFallsEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingFallsEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
                    <p className="text-sm text-black mb-6">
                      Falls often happen when risk factors aren't visible or communicated in real-time. 
                      When nurses document assessments as they observe them, high-risk patients get 
                      the attention they need faster.
                    </p>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Falls Rate (per 1,000 patient days)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={docQualityInputs.nursingFallsRate}
                          onChange={(e) => updateDocInputs({ nursingFallsRate: Number(e.target.value) })}
                          className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 text-black"
                          data-testid="input-nursing-falls-rate"
                        />
                        <p className="text-xs text-[#888888]">National: 3-5 per 1,000</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Cost per Fall</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10">$</span>
                          <FormattedNumberInput
                            value={docQualityInputs.nursingFallsCost}
                            onChange={(val) => updateDocInputs({ nursingFallsCost: val })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg pl-7 pr-3 text-black"
                            data-testid="input-nursing-falls-cost"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">Avg: $6,500</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-6">
                      <label className="text-sm text-[#888888]">Prevention Rate</label>
                      <div className="relative w-48">
                        <input
                          type="number"
                          value={docQualityInputs.nursingFallsPreventionRate}
                          onChange={(e) => updateDocInputs({ nursingFallsPreventionRate: Number(e.target.value) })}
                          className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-black"
                          data-testid="input-nursing-falls-prevention-rate"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                      <p className="text-xs text-[#888888]">5% is conservative—represents documentation-preventable falls</p>
                    </div>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Patient days × Falls rate / 1,000</span>
                          <span className="font-semibold text-black">
                            {Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate)} falls/year
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">× Prevention rate</span>
                          <span className="font-semibold text-black">{docQualityInputs.nursingFallsPreventionRate}%</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between">
                          <span className="text-[#666666]">= Falls prevented</span>
                          <span className="font-semibold text-black">
                            {((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate * (docQualityInputs.nursingFallsPreventionRate / 100)).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">× Cost per fall</span>
                          <span className="font-semibold text-black">{formatCurrency(docQualityInputs.nursingFallsCost)}</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between">
                          <span className="text-[#666666] font-medium">Potential Falls Value</span>
                          <span className="font-bold text-[#EA2C00]">
                            {formatCurrency(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate * (docQualityInputs.nursingFallsPreventionRate / 100) * docQualityInputs.nursingFallsCost))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Patient Experience (HCAHPS) - Qualitative Only */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 rounded-t-lg text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingHcahpsEnabled 
                  ? "bg-white border-[#EA2C00]/30" 
                  : "bg-white/70 hover:bg-white border-transparent"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">Patient Experience (HCAHPS)</p>
                    <span className="text-xs font-medium text-[#888888] uppercase tracking-wide bg-[#F5F0EB] px-2 py-0.5 rounded">Qualitative</span>
                  </div>
                  <p className="text-sm text-[#888888]">More bedside time correlates with better satisfaction</p>
                </div>
                <button
                  onClick={() => updateDocInputs({ nursingHcahpsEnabled: !docQualityInputs.nursingHcahpsEnabled })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.nursingHcahpsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-nursing-hcahps"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.nursingHcahpsEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingHcahpsEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Connection</p>
                    <p className="text-sm text-black mb-6">
                      When nurses spend less time on documentation, they spend more time with patients. 
                      Research consistently shows bedside time correlates with patient satisfaction.
                    </p>

                    <div className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-6">
                      <p className="text-4xl font-bold text-[#EA2C00]">
                        {state.numberOfProviders > 0 ? ((state.nursingMinutesPerShift * state.nursingShiftsPerNurseYear / 60 / 52) * 0.75).toFixed(1) : '—'}
                      </p>
                      <p className="text-lg font-medium text-black mt-1">hours at bedside</p>
                      <p className="text-sm text-[#666666] mt-1">per nurse per week</p>
                    </div>

                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">We Don't Calculate This</p>
                    <p className="text-sm text-[#666666] mb-4">
                      HCAHPS scores are influenced by dozens of factors—wait times, pain management, 
                      communication, environment, and more. We can't credibly attribute HCAHPS improvement 
                      to documentation alone.
                    </p>

                    <div className="p-4 bg-[#E8F4F8] rounded-lg border-l-4 border-[#0094D9]">
                      <p className="text-sm text-[#333333]">
                        <strong>But consider:</strong> Hospitals in the top quartile of HCAHPS receive 
                        ~2% higher reimbursement through Value-Based Purchasing. Even small improvements matter.
                      </p>
                    </div>

                    <p className="text-sm text-[#888888] italic mt-4">
                      Track HCAHPS as a leading indicator after implementation.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </>
        )}

        {/* Inpatient: DRG Accuracy */}
        {isInpatient && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => updateDocInputs({ ipDrgEnabled: !docQualityInputs.ipDrgEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.ipDrgEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-drg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.ipDrgEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  docQualityInputs.ipDrgEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {docQualityInputs.ipDrgEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-6 md:p-8">
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
                    Documentation gaps cost you twice—first at coding, then at audit. Abridge captures the clinical conversations that close these gaps.
                  </p>

                  {/* STEP 1: YOUR DOCUMENTATION OPPORTUNITY */}
                  <div className="mb-10">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 1: Your Documentation Opportunity
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">How often does CDI identify documentation opportunities?</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Eligible Admissions</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">CDI Opportunity Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              value={docQualityInputs.ipDrgAtRiskRate}
                              onChange={(e) => updateDocInputs({ ipDrgAtRiskRate: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold"
                              data-testid="input-drg-at-risk"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsAtRisk))} admissions with documentation opportunities</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        Your benchmark: If CDI queries 30% of admissions, you have at least 30% with documentation gaps. 25% is moderate.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: THE GAP ABRIDGE CLOSES */}
                  <div className="mb-10">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 2: The Gap Abridge Closes
                    </p>
                    <p className="text-[13px] text-[#666666] mb-2">
                      Not all gaps are the same. Abridge specifically captures "discussed but not documented"—clinical reasoning that happened verbally but didn't make the note.
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">What portion of your documentation gaps are verbal-to-written gaps?</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateDocInputs({ ipDrgScenario: level })}
                          className={`p-4 rounded-lg border transition-all text-center ${
                            docQualityInputs.ipDrgScenario === level
                              ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                              : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                          }`}
                          data-testid={`button-drg-${level}`}
                        >
                          <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipDrgScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                            {level === 'aggressive' ? 'Optimistic' : level}
                          </p>
                          <p className="font-semibold text-lg">{ipDrgProtectionScenarios[level]}%</p>
                        </button>
                      ))}
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4 text-center mb-4">
                      <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipAdmissionsAtRisk))} × {ipDrgProtectionPercent}% = </span>
                      <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))} admissions where Abridge captures what was missed</span>
                    </div>
                    <div className="text-[13px] text-[#888888] space-y-1">
                      <p><strong>Conservative:</strong> Only clear verbal discussions</p>
                      <p><strong>Typical:</strong> Includes clinical reasoning that supports specificity</p>
                      <p><strong>Optimistic:</strong> Strong adoption, comprehensive capture</p>
                    </div>
                  </div>

                  {/* STEP 3: REVENUE IMPACT */}
                  <div className="mb-10">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 3: Revenue Impact
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">When a missed CC/MCC is captured, DRG weight increases.</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5 mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions Captured</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Avg DRG Weight Lift</label>
                          <input
                            type="number"
                            step="0.1"
                            value={docQualityInputs.ipDrgWeightIncrease}
                            onChange={(e) => updateDocInputs({ ipDrgWeightIncrease: parseFloat(e.target.value) || 0 })}
                            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold"
                            data-testid="input-drg-weight"
                          />
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Base DRG Payment</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]">$</span>
                            <input
                              type="number"
                              step="100"
                              value={docQualityInputs.ipDrgBasePayment}
                              onChange={(e) => updateDocInputs({ ipDrgBasePayment: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold"
                              data-testid="input-drg-base"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))} gross value</span>
                      </div>
                    </div>

                    {/* Benchmark Table */}
                    <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 mb-4">
                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2 flex items-center gap-2">
                        <span>📊</span> Common Documentation Gaps
                      </p>
                      <p className="text-[13px] text-[#666666] mb-3">
                        These conditions are frequently discussed but under-documented. When captured, they change DRG assignment.
                      </p>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Acute respiratory failure</span>
                          <span className="text-black">+0.3 to +0.5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Sepsis / Severe sepsis</span>
                          <span className="text-black">+0.4 to +0.6</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Malnutrition</span>
                          <span className="text-black">+0.2 to +0.4</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Acute encephalopathy</span>
                          <span className="text-black">+0.3 to +0.5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Acute kidney injury</span>
                          <span className="text-black">+0.1 to +0.3</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        0.4 is a blended average across common missed CCs/MCCs.
                      </p>
                    </div>
                  </div>

                  {/* STEP 4: WHAT YOU CAN COUNT ON */}
                  <div className="mb-8">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 4: What You Can Count On
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">Not all captured documentation changes the final code.</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="5"
                              value={docQualityInputs.ipDrgRealization}
                              onChange={(e) => updateDocInputs({ ipDrgRealization: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold"
                              data-testid="input-drg-realization"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgNetValue))} net</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        33% is a conservative realization rate that accounts for audit risk, coder judgment, and cases where documentation doesn't change final DRG.
                      </p>
                    </div>
                  </div>

                  {/* Final Value */}
                  <div className="border-t border-[#E5E5E5] pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-black">Annual DRG Value</span>
                      <span className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(Math.round(ipDrgNetValue))}</span>
                    </div>
                    <p className="text-[13px] text-[#888888] flex items-start gap-2">
                      <span>⚠️</span>
                      <span>Validate with your CDI team. They know your case mix and current gap rates better than any benchmark.</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Inpatient: CDI Query Reduction */}
        {isInpatient && (
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => updateDocInputs({ ipCdiEnabled: !docQualityInputs.ipCdiEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.ipCdiEnabled 
                ? "bg-white" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-cdi"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.ipCdiEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  docQualityInputs.ipCdiEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {docQualityInputs.ipCdiEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-6 md:p-8">
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
                    When Abridge captures clinical conversations, many queries become unnecessary—freeing CDI to focus on complex cases.
                  </p>

                  {/* STEP 1: CURRENT QUERY VOLUME */}
                  <div className="mb-10">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 1: Current Query Volume
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Query Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="5"
                              value={docQualityInputs.ipCdiQueryRate}
                              onChange={(e) => updateDocInputs({ ipCdiQueryRate: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold"
                              data-testid="input-cdi-query-rate"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(ipTotalQueries))} queries/year</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        CDI query rates typically range 20-40%. 30% is average.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: QUERIES AVOIDED */}
                  <div className="mb-10">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 2: Queries Avoided
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateDocInputs({ ipCdiScenario: level })}
                          className={`p-4 rounded-lg border transition-all text-center ${
                            docQualityInputs.ipCdiScenario === level
                              ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                              : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                          }`}
                          data-testid={`button-cdi-${level}`}
                        >
                          <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipCdiScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                            {level === 'aggressive' ? 'Optimistic' : level}
                          </p>
                          <p className="font-semibold text-lg">{ipCdiReductionScenarios[level]}%</p>
                        </button>
                      ))}
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4 text-center">
                      <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipTotalQueries))} × {ipCdiReductionPercent}% = </span>
                      <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))} queries avoided</span>
                    </div>
                  </div>

                  {/* STEP 3: SAVINGS */}
                  <div className="mb-8">
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 3: Savings
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Queries Avoided</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Cost per Query</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
                            <FormattedNumberInput
                              value={docQualityInputs.ipCdiCostPerQuery}
                              onChange={(val) => updateDocInputs({ ipCdiCostPerQuery: val })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold"
                              data-testid="input-cdi-cost"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipCdiSavingsValue))}</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        Fully loaded cost per query: $50-$100. We use $50 conservatively.
                      </p>
                    </div>
                  </div>

                  {/* Final Value */}
                  <div className="border-t border-[#E5E5E5] pt-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black">Annual CDI Savings</span>
                      <span className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(Math.round(ipCdiSavingsValue))}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Revenue Drivers Container - Outpatient/ED */}
        {!isInpatient && !isNursing && (
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="card-revenue-drivers"
        >
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              REVENUE DRIVERS
            </p>
            <div className="h-px bg-[#D1D5DB]" />
          </div>

        {/* wRVU Improvement */}
        <div className="space-y-0">
          <button
            onClick={() => updateDocInputs({ wrvuEnabled: !docQualityInputs.wrvuEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.wrvuEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white border-transparent"
            }`}
            data-testid="toggle-wrvu"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.wrvuEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  docQualityInputs.wrvuEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {docQualityInputs.wrvuEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-black mb-4">
                    When notes fully reflect visit complexity, E/M levels often code higher. 
                    Industry data shows 2-7% wRVU lift from better documentation.
                  </p>

                  <p className="text-sm font-medium text-black mb-2">Choose your scenario:</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ wrvuScenario: level })}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          docQualityInputs.wrvuScenario === level
                            ? "border-[#EA2C00] bg-white"
                            : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
                        }`}
                      >
                        <p className="font-medium text-black capitalize">{level}</p>
                        <p className="text-sm text-[#888888]">{wrvuScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
                      <span className="text-xs text-[#888888]">Click values to edit</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Eligible encounters</span>
                        <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">Current avg wRVU/visit</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={docQualityInputs.currentWrvu}
                            onChange={(e) => updateDocInputs({ currentWrvu: parseFloat(e.target.value) || 0 })}
                            className="w-16 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                          <span className="text-[#888888]">wRVU</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Documentation improvement</span>
                        <span className="font-semibold text-black">{wrvuLiftPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= wRVU lift per visit</span>
                        <span className="font-semibold text-black">{wrvuLiftPerVisit.toFixed(3)} wRVU</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Total additional wRVUs</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(totalAdditionalWrvus))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Conversion factor</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[#888888]">$</span>
                          <input
                            type="number"
                            value={docQualityInputs.conversionFactor}
                            onChange={(e) => updateDocInputs({ conversionFactor: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Realization rate</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.wrvuRealization}
                            onChange={(e) => updateDocInputs({ wrvuRealization: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-black">Annual wRVU Value</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(Math.round(wrvuRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HCC Capture - Only show for Outpatient */}
        {showHCC && (
        <div className="space-y-0">
          <button
            onClick={() => updateDocInputs({ hccEnabled: !docQualityInputs.hccEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.hccEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white border-transparent"
            }`}
            data-testid="toggle-hcc"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">HCC Capture</p>
                <p className="text-sm text-[#888888]">Recapture missed diagnoses for MA population</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.hccEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  docQualityInputs.hccEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {docQualityInputs.hccEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    For Medicare Advantage populations, better documentation captures more HCCs. 
                    Risk adjustment pays based on documented conditions—many MA patients have 
                    documentation gaps where conditions were discussed but not captured.
                  </p>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <p className="text-sm font-medium text-black mb-3">Recapture target:</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ hccScenario: level })}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          docQualityInputs.hccScenario === level
                            ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                            : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                        }`}
                        data-testid={`button-hcc-${level}`}
                      >
                        <p className={`text-xs capitalize mb-1 ${docQualityInputs.hccScenario === level ? 'text-white/80' : ''}`}>{level}</p>
                        <p className="font-semibold">{hccScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
                      <span className="text-xs text-[#888888]">Click values to edit</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Providers</span>
                        <span className="text-black">{formatNumber(state.numberOfProviders)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Panel size per provider</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.panelSize}
                            onChange={(e) => updateDocInputs({ panelSize: parseFloat(e.target.value) || 0 })}
                            className="w-20 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-panel-size"
                          />
                          <span className="text-[#888888]">pts</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Total patients</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(totalPatients))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Medicare Advantage %</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.maPercent}
                            onChange={(e) => updateDocInputs({ maPercent: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-ma-percent"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= MA patient panel</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(maPatients))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Documentation gap rate</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.gapRate}
                            onChange={(e) => updateDocInputs({ gapRate: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-gap-rate"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Patients with gaps</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(gapPatients))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Avg missed HCCs per patient</span>
                        <input
                          type="number"
                          step="0.1"
                          value={docQualityInputs.avgHccs}
                          onChange={(e) => updateDocInputs({ avgHccs: parseFloat(e.target.value) || 0 })}
                          className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          data-testid="input-avg-hccs"
                        />
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Total recapture opportunity</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(totalRecaptureOpportunity))} HCCs</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Your recapture target</span>
                        <span className="text-black">{recapturePercent}%</span>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= HCCs you'll document</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(hccsDocumented))} HCCs</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× RAF impact per HCC</span>
                        <input
                          type="number"
                          step="0.1"
                          value={docQualityInputs.rafImpact}
                          onChange={(e) => updateDocInputs({ rafImpact: parseFloat(e.target.value) || 0 })}
                          className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          data-testid="input-raf-impact"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Annual payment per RAF</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[#888888]">$</span>
                          <input
                            type="number"
                            value={docQualityInputs.annualPayment}
                            onChange={(e) => updateDocInputs({ annualPayment: parseFloat(e.target.value) || 0 })}
                            className="w-20 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-annual-payment"
                          />
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Gross value</span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(hccGrossValue))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[#666666]">× Realization rate</span>
                          <p className="text-xs text-[#888888]">(RADV audits, payment delays, rejections)</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.hccRealization}
                            onChange={(e) => updateDocInputs({ hccRealization: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-hcc-realization"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#888888] my-2" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-black">Annual HCC Value</span>
                        <span className="text-[#EA2C00]">{formatCurrency(Math.round(hccRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Denial Prevention */}
        <div className="space-y-0">
          <button
            onClick={() => updateDocInputs({ denialsEnabled: !docQualityInputs.denialsEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.denialsEnabled 
                ? "bg-white" 
                : "bg-white/70 hover:bg-white border-transparent"
            }`}
            data-testid="toggle-denials"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">{config.driver3Title}</p>
                <p className="text-sm text-[#888888]">{config.driver3Subtitle}</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.denialsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  docQualityInputs.denialsEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {docQualityInputs.denialsEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    Documentation gaps drive 30-40% of denials that cannot be appealed—permanent revenue loss. 
                    Abridge captures clinical reasoning and medical necessity in real-time, preventing denials before they occur.
                  </p>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <p className="text-sm font-medium text-black mb-3">Prevention target:</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ denialsScenario: level })}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          docQualityInputs.denialsScenario === level
                            ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                            : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                        }`}
                        data-testid={`button-denials-${level}`}
                      >
                        <p className={`text-xs capitalize mb-1 ${docQualityInputs.denialsScenario === level ? 'text-white/80' : ''}`}>{level}</p>
                        <p className="font-semibold">{denialsScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
                      <span className="text-xs text-[#888888]">Click values to edit</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Eligible encounters</span>
                        <span className="text-black">{formatNumber(eligibleEncounters)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Baseline denial rate</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.denialRate}
                            onChange={(e) => updateDocInputs({ denialRate: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-denial-rate"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Total denials</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(totalDenials))} claims</span>
                      </div>

                      {/* Denial Breakdown */}
                      <div className="bg-white/50 rounded p-3 my-2">
                        <p className="text-xs font-medium text-[#666666] mb-2">Denial breakdown:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[#888888]">├─</span>
                            <span className="text-[#666666]">Appealable ({100 - docQualityInputs.unappealableRate}%):</span>
                            <span className="text-black">{formatNumber(Math.round(totalDenials - unappealableDenials))}</span>
                            <span className="text-[#888888]">— Recovered through appeals</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#888888]">└─</span>
                            <span className="text-[#666666]">Unappealable ({docQualityInputs.unappealableRate}%):</span>
                            <span className="font-semibold text-black">{formatNumber(Math.round(unappealableDenials))}</span>
                            <span className="text-[#888888]">— Abridge prevents these</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">Unappealable rate</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.unappealableRate}
                            onChange={(e) => updateDocInputs({ unappealableRate: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-unappealable-rate"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Unrecoverable denials</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(unappealableDenials))} claims</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Your prevention target</span>
                        <span className="text-black">{preventionPercent}%</span>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Denials prevented</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(preventedDenials))} claims</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Avg denied claim value</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[#888888]">$</span>
                          <input
                            type="number"
                            value={docQualityInputs.avgClaimValue}
                            onChange={(e) => updateDocInputs({ avgClaimValue: parseFloat(e.target.value) || 0 })}
                            className="w-16 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-claim-value"
                          />
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between">
                        <span className="text-[#666666]">= Gross value</span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(denialsRevenueGross))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[#666666]">× Realization rate</span>
                          <p className="text-xs text-[#888888]">(collection timing, adjustments)</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.denialsRealization}
                            onChange={(e) => updateDocInputs({ denialsRealization: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-denials-realization"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#888888] my-2" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-black">Annual Denial Prevention Value</span>
                        <span className="text-[#EA2C00]">{formatCurrency(Math.round(denialsRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </motion.div>
        )}

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex justify-center lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Investment
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
          </div>

          {/* Right Panel - Desktop Only */}
          <motion.div
            className="hidden lg:block w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 sticky top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
                  Documentation Value
                </p>
                <p className="text-sm text-[#888888] mt-1">Your model so far</p>
              </div>

              {/* Time Savings Line */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-[#888888]">Time Savings</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(timeValue)}</span>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Documentation Drivers - Care Setting Specific */}
              <div className="space-y-3">
                {/* Nursing-specific drivers */}
                {isNursing ? (
                  <>
                    <div>
                      <p className="text-[10px] font-medium text-[#666666] uppercase tracking-wide mb-2">Care Quality Potential</p>
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-dashed ${docQualityInputs.nursingHapiEnabled ? 'border-[#EA2C00] bg-[#EA2C00]/20' : 'border-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HAPI Prevention</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.nursingHapiEnabled ? 'text-[#EA2C00]/80' : 'text-[#666666]'}`}>
                          {docQualityInputs.nursingHapiEnabled ? formatCurrency(nursingHapiValue) : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-dashed ${docQualityInputs.nursingFallsEnabled ? 'border-[#EA2C00] bg-[#EA2C00]/20' : 'border-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Falls Prevention</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.nursingFallsEnabled ? 'text-[#EA2C00]/80' : 'text-[#666666]'}`}>
                          {docQualityInputs.nursingFallsEnabled ? formatCurrency(nursingFallsValue) : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingHcahpsEnabled ? 'bg-[#666666]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HCAHPS</span>
                        </div>
                        <span className="text-xs font-medium text-[#666666]">
                          {docQualityInputs.nursingHcahpsEnabled ? 'Qualitative' : '—'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isInpatient ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.ipDrgEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">DRG Accuracy</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.ipDrgEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.ipDrgEnabled ? formatCurrency(Math.round(ipDrgNetValue)) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.ipCdiEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">CDI Queries</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.ipCdiEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.ipCdiEnabled ? formatCurrency(Math.round(ipCdiSavingsValue)) : '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.wrvuEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">{isED ? 'E&M Accuracy' : 'wRVU'}</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.wrvuEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.wrvuEnabled ? formatCurrency(Math.round(wrvuRevenueNet)) : '—'}
                      </span>
                    </div>

                    {/* Only show HCC for Outpatient */}
                    {showHCC && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${docQualityInputs.hccEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HCC</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.hccEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {docQualityInputs.hccEnabled ? formatCurrency(Math.round(hccRevenueNet)) : '—'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.denialsEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">{isED ? 'Denial Prevention' : 'Denials'}</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.denialsEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.denialsEnabled ? formatCurrency(Math.round(denialsRevenueNet)) : '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Projected Annual Value - Special for Nursing */}
              {isNursing ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
                      Time Savings Value
                    </p>
                    <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                      {formatCurrency(Math.round(timeValue))}
                    </p>
                    <p className="text-xs text-[#666666] mt-1">Hard value from efficiency gains</p>
                  </div>

                  {nursingCareQualityPotential > 0 && (
                    <>
                      <div className="h-px bg-[#333333] my-4" />
                      <div className="text-center mb-4 p-3 border border-dashed border-[#EA2C00]/30 rounded-lg bg-[#EA2C00]/5">
                        <p className="text-[10px] font-medium text-[#EA2C00]/80 uppercase tracking-[1.5px] mb-1">
                          + Potential Value
                        </p>
                        <p className="text-xl font-bold text-[#EA2C00]/80">
                          {formatCurrency(Math.round(nursingCareQualityPotential))}
                        </p>
                        <p className="text-[10px] text-[#666666] mt-1">Harder to attribute to documentation</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
                    Projected Annual Value
                  </p>
                  <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                    {formatCurrency(Math.round(timeValue + totalDocValue))}
                  </p>
                </div>
              )}

              <p className="text-xs text-[#666666] italic mb-4">
                {isNursing 
                  ? 'Time savings are conservative. Potential value requires clinical practice changes.'
                  : 'All values include conservative realization rates for defensible estimates.'
                }
              </p>

              <div className="h-px bg-[#333333] my-4" />

              {/* Continue Button */}
              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
                data-testid="button-panel-continue"
              >
                Continue to Investment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
