import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type DocQualityInputs } from "./ExploreFlow";

interface ExploreDocQualityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type ScenarioLevel = 'conservative' | 'typical' | 'aggressive';

export default function ExploreDocQuality({
  state,
  updateState,
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

  // wRVU Calculation
  const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
  const wrvuLiftPerVisit = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
  const totalAdditionalWrvus = eligibleEncounters * wrvuLiftPerVisit;
  const wrvuRevenueGross = totalAdditionalWrvus * docQualityInputs.conversionFactor;
  const wrvuRevenueNet = wrvuRevenueGross * (docQualityInputs.wrvuRealization / 100);

  // HCC Calculation
  const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
  const maPatients = state.numberOfProviders * docQualityInputs.panelSize * (docQualityInputs.maPercent / 100);
  const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
  const recapturedPatients = gapPatients * (recapturePercent / 100);
  const totalHccsRecaptured = recapturedPatients * docQualityInputs.avgHccs;
  const rafValue = totalHccsRecaptured * docQualityInputs.rafImpact * docQualityInputs.annualPayment;
  const hccRevenueNet = rafValue * (docQualityInputs.hccRealization / 100);

  // Denials Calculation
  const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
  const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
  const unappealableDenials = totalDenials * (docQualityInputs.unappealableRate / 100);
  const preventedDenials = unappealableDenials * (preventionPercent / 100);
  const denialsRevenueGross = preventedDenials * docQualityInputs.avgClaimValue;
  const denialsRevenueNet = denialsRevenueGross * (docQualityInputs.denialsRealization / 100);

  const totalDocValue = (docQualityInputs.wrvuEnabled ? wrvuRevenueNet : 0) + 
                        (docQualityInputs.hccEnabled ? hccRevenueNet : 0) + 
                        (docQualityInputs.denialsEnabled ? denialsRevenueNet : 0);

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

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

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= 5 ? "bg-[#E85A2C]" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            Documentation Quality
          </h1>
          <p className="text-base text-[#888888]">
            Better documentation creates downstream revenue. Select the drivers that apply to your organization.
          </p>
        </motion.div>

        {/* wRVU Improvement */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => updateDocInputs({ wrvuEnabled: !docQualityInputs.wrvuEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.wrvuEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-wrvu"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">wRVU Improvement</p>
                <p className="text-sm text-[#888888]">Capture the complexity you're already delivering</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.wrvuEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
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
                            ? "border-[#E85A2C] bg-white"
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
                        <span className="font-bold text-[#E85A2C]">{formatCurrency(Math.round(wrvuRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* HCC Capture */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => updateDocInputs({ hccEnabled: !docQualityInputs.hccEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.hccEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-hcc"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">HCC Capture</p>
                <p className="text-sm text-[#888888]">Recapture missed diagnoses for MA population</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.hccEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-4">
                    For Medicare Advantage populations, better documentation captures more HCCs.
                  </p>

                  <p className="text-sm font-medium text-black mb-2">Recapture target:</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ hccScenario: level })}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          docQualityInputs.hccScenario === level
                            ? "border-[#E85A2C] bg-white"
                            : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
                        }`}
                      >
                        <p className="font-medium text-black capitalize">{level}</p>
                        <p className="text-sm text-[#888888]">{hccScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-semibold text-black">Annual HCC Value</span>
                      <span className="font-bold text-[#E85A2C]">{formatCurrency(Math.round(hccRevenueNet))}</span>
                    </div>
                    <p className="text-xs text-[#888888]">
                      Based on {state.numberOfProviders} providers, {docQualityInputs.panelSize} panel size, {docQualityInputs.maPercent}% MA, {docQualityInputs.gapRate}% gap rate, {docQualityInputs.hccRealization}% realization
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Denial Prevention */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => updateDocInputs({ denialsEnabled: !docQualityInputs.denialsEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              docQualityInputs.denialsEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-denials"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Denial Prevention</p>
                <p className="text-sm text-[#888888]">Reduce unappealable denials with better documentation</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                docQualityInputs.denialsEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
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
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-4">
                    Better documentation prevents denials that can't be appealed.
                  </p>

                  <p className="text-sm font-medium text-black mb-2">Prevention target:</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ denialsScenario: level })}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          docQualityInputs.denialsScenario === level
                            ? "border-[#E85A2C] bg-white"
                            : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
                        }`}
                      >
                        <p className="font-medium text-black capitalize">{level}</p>
                        <p className="text-sm text-[#888888]">{denialsScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-semibold text-black">Annual Denial Prevention Value</span>
                      <span className="font-bold text-[#E85A2C]">{formatCurrency(Math.round(denialsRevenueNet))}</span>
                    </div>
                    <p className="text-xs text-[#888888]">
                      Based on {docQualityInputs.denialRate}% denial rate, {docQualityInputs.unappealableRate}% unappealable, ${docQualityInputs.avgClaimValue} avg claim, {docQualityInputs.denialsRealization}% realization
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Documentation Value Summary */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
            Documentation Value Summary
          </p>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-[#666666]">wRVU Improvement:</span>
              <span className="font-semibold text-black">
                {docQualityInputs.wrvuEnabled ? formatCurrency(Math.round(wrvuRevenueNet)) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">HCC Capture:</span>
              <span className="font-semibold text-black">
                {docQualityInputs.hccEnabled ? formatCurrency(Math.round(hccRevenueNet)) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Denial Prevention:</span>
              <span className="font-semibold text-black">
                {docQualityInputs.denialsEnabled ? formatCurrency(Math.round(denialsRevenueNet)) : '—'}
              </span>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E5] my-3" />

          <div className="flex justify-between">
            <span className="font-semibold text-black">Total Documentation Value</span>
            <span className="text-xl font-bold text-[#E85A2C]">{formatCurrency(Math.round(totalDocValue))}</span>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Investment
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
