import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "./ExploreFlow";

interface ExploreInvestmentProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  timeValue: number;
  docValue: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreInvestment({
  state,
  updateState,
  totalHoursSaved,
  timeValue,
  docValue,
  onNext,
  onBack,
  onHome,
}: ExploreInvestmentProps) {
  const isNursing = state.careSetting === 'nursing';
  const totalValue = timeValue + docValue;

  const annualInvestment = useMemo(() => {
    if (isNursing && state.pricingModel === 'perProvider') {
      return state.nursingStaffedBeds * state.costPerProvider * 12;
    }
    if (state.pricingModel === 'perProvider') {
      return state.numberOfProviders * state.costPerProvider * 12;
    }
    return state.annualLicenseFee;
  }, [isNursing, state.pricingModel, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee]);

  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  const valuePerProvider = state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0;

  const nursingCareQualityPotential = useMemo(() => {
    if (!isNursing) return 0;
    const { docQualityInputs } = state;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    let total = 0;
    if (docQualityInputs.nursingHapiEnabled) {
      const hapIs = (patientDays / 1000) * docQualityInputs.nursingHapiRate;
      total += hapIs * (docQualityInputs.nursingHapiPreventionRate / 100) * docQualityInputs.nursingHapiCost;
    }
    if (docQualityInputs.nursingFallsEnabled) {
      const falls = (patientDays / 1000) * docQualityInputs.nursingFallsRate;
      total += falls * (docQualityInputs.nursingFallsPreventionRate / 100) * docQualityInputs.nursingFallsCost;
    }
    return Math.round(total);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  const valuePerBed = state.nursingStaffedBeds > 0 ? Math.round(totalValue / state.nursingStaffedBeds) : 0;
  const investmentPerBed = state.nursingStaffedBeds > 0 ? Math.round(annualInvestment / state.nursingStaffedBeds) : 0;
  const netPerBed = valuePerBed - investmentPerBed;

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={6}
        totalSteps={7}
        stepName="Investment"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">
            {/* Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
                Your Investment
              </h1>
              <p className="text-base text-[#888888]">
                Enter your pricing to see the complete picture.
              </p>
            </motion.div>

        {/* Pricing Model */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
            Pricing Model
          </p>
          <div className="h-px bg-[#E5E5E5] mb-4" />

          <div className="space-y-3 mb-5">
            {/* Per Provider/Bed */}
            <button
              onClick={() => updateState({ pricingModel: 'perProvider' })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.pricingModel === 'perProvider'
                  ? "bg-white border-l-4 border-[#EA2C00]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-pricing-provider"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  state.pricingModel === 'perProvider' ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                }`}>
                  {state.pricingModel === 'perProvider' && (
                    <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-black">{isNursing ? 'Per Bed / Month' : 'Per Provider / Month'}</p>
                  <p className="text-sm text-[#888888]">{isNursing ? 'Pay per staffed bed. Scale up or down as needed.' : 'Pay per active provider. Scale up or down as needed.'}</p>
                </div>
              </div>
            </button>

            {/* Annual License */}
            <button
              onClick={() => updateState({ pricingModel: 'annual' })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.pricingModel === 'annual'
                  ? "bg-white border-l-4 border-[#EA2C00]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-pricing-annual"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  state.pricingModel === 'annual' ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                }`}>
                  {state.pricingModel === 'annual' && (
                    <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-black">Annual License</p>
                  <p className="text-sm text-[#888888]">Fixed annual fee for your deployment.</p>
                </div>
              </div>
            </button>
          </div>

          {/* Pricing Input */}
          {state.pricingModel === 'perProvider' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm text-black">{isNursing ? 'Cost per staffed bed per month' : 'Cost per provider per month'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                  <FormattedNumberInput
                    value={state.costPerProvider}
                    onChange={(v: number) => updateState({ costPerProvider: v })}
                    className="h-11 bg-white pl-7 pr-16"
                    data-testid="input-cost-per-provider"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">/month</span>
                </div>
              </div>
              <p className="text-sm text-[#888888]">
                {isNursing 
                  ? <>{formatNumber(state.nursingStaffedBeds)} beds × ${formatNumber(state.costPerProvider)}/mo × 12 = <strong className="text-black">{formatCurrency(annualInvestment)}/year</strong></>
                  : <>{formatNumber(state.numberOfProviders)} providers × ${formatNumber(state.costPerProvider)}/mo × 12 = <strong className="text-black">{formatCurrency(annualInvestment)}/year</strong></>
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm text-black">Annual license fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={state.annualLicenseFee}
                  onChange={(v: number) => updateState({ annualLicenseFee: v })}
                  className="h-11 bg-white pl-7 pr-14"
                  data-testid="input-annual-license"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">/year</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Implementation Fee */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
            Implementation Fee (Optional)
          </p>
          <div className="h-px bg-[#E5E5E5] mb-4" />

          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={state.includeImplementation}
              onChange={(e) => updateState({ includeImplementation: e.target.checked })}
              className="w-5 h-5 rounded border-[#D1D5DB] accent-black focus:ring-black"
              data-testid="checkbox-implementation"
            />
            <span className="text-sm text-black">Add implementation fee</span>
          </label>

          {state.includeImplementation && (
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={state.implementationFee}
                  onChange={(v: number) => updateState({ implementationFee: v })}
                  className="h-11 bg-white pl-7 pr-20"
                  data-testid="input-implementation"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">one-time</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex justify-center lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            View Full Summary
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
                  Your Model
                </p>
                <p className="text-sm text-[#888888] mt-1">Complete value summary</p>
              </div>

              {/* Value Breakdown */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888888]">{isNursing ? 'Annual Value' : 'Time Savings'}</span>
                  <span className="text-sm font-semibold text-white">{formatCurrency(totalValue)}</span>
                </div>
                {!isNursing && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#888888]">Doc Quality</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(docValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">Total Value</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(totalValue)}</span>
                    </div>
                  </>
                )}
                {isNursing && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#888888]">Time Savings</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(timeValue)}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Investment */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888888]">Your Investment</span>
                  <span className="text-sm font-semibold text-white">-{formatCurrency(annualInvestment)}</span>
                </div>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Net Value Hero */}
              <div className="bg-[#2A2A2A] rounded-lg p-4 text-center mb-4">
                <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
                  Net Annual Value
                </p>
                <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                  {netAnnualValue >= 0 ? '+' : ''}{formatCurrency(netAnnualValue)}
                </p>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* ROI Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888888]">Return on Investment</span>
                  <span className="text-xl font-bold text-white">{roi.toFixed(1)}×</span>
                </div>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Per-Bed Metrics (Nursing) or Per-Provider Metrics */}
              {isNursing ? (
                <>
                  <div className="mb-3">
                    <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">Value Per Bed</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#2A2A2A] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{formatCurrency(valuePerBed)}</p>
                      <p className="text-xs text-[#888888]">/bed/yr</p>
                    </div>
                    <div className="bg-[#2A2A2A] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-white">{formatCurrency(investmentPerBed)}</p>
                      <p className="text-xs text-[#888888]">/bed/yr</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#888888] text-center mb-4">
                    Net: <span className="text-white font-semibold">{formatCurrency(netPerBed)}</span> per bed per year
                  </p>
                  <div className="h-px bg-[#333333] my-4" />
                  {nursingCareQualityPotential > 0 && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-[#888888]">+ Potential Care Quality</span>
                        <span className="text-sm font-semibold text-[#EA2C00]">{formatCurrency(nursingCareQualityPotential)}</span>
                      </div>
                      <p className="text-xs text-[#666666] mb-4">(shown separately)</p>
                      <div className="h-px bg-[#333333] my-4" />
                    </>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
                    <p className="text-xs text-[#888888]">ROI</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
                    <p className="text-xs text-[#888888]">hours saved</p>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
                data-testid="button-panel-continue"
              >
                View Full Summary
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
