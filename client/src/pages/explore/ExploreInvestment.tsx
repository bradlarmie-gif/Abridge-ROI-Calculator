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
  const totalValue = timeValue + docValue;

  const annualInvestment = useMemo(() => {
    if (state.pricingModel === 'perProvider') {
      return state.numberOfProviders * state.costPerProvider * 12;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.costPerProvider, state.annualLicenseFee]);

  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  const valuePerProvider = state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0;

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

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
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
            {/* Per Provider */}
            <button
              onClick={() => updateState({ pricingModel: 'perProvider' })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.pricingModel === 'perProvider'
                  ? "bg-white border-l-4 border-[#E85A2C]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-pricing-provider"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  state.pricingModel === 'perProvider' ? 'border-[#E85A2C]' : 'border-[#D1D5DB]'
                }`}>
                  {state.pricingModel === 'perProvider' && (
                    <div className="w-2 h-2 rounded-full bg-[#E85A2C]" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-black">Per Provider / Month</p>
                  <p className="text-sm text-[#888888]">Pay per active provider. Scale up or down as needed.</p>
                </div>
              </div>
            </button>

            {/* Annual License */}
            <button
              onClick={() => updateState({ pricingModel: 'annual' })}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                state.pricingModel === 'annual'
                  ? "bg-white border-l-4 border-[#E85A2C]"
                  : "bg-white hover:bg-white/80"
              }`}
              data-testid="button-pricing-annual"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  state.pricingModel === 'annual' ? 'border-[#E85A2C]' : 'border-[#D1D5DB]'
                }`}>
                  {state.pricingModel === 'annual' && (
                    <div className="w-2 h-2 rounded-full bg-[#E85A2C]" />
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
                <label className="text-sm text-black">Cost per provider per month</label>
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
                {formatNumber(state.numberOfProviders)} providers × ${formatNumber(state.costPerProvider)}/mo × 12 = <strong className="text-black">{formatCurrency(annualInvestment)}/year</strong>
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
              className="w-5 h-5 rounded border-[#D1D5DB] text-[#E85A2C] focus:ring-[#E85A2C]"
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

        {/* Your ROI Summary */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Your ROI
          </p>

          <div className="space-y-3 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-[#666666]">Annual Value</span>
              <span className="font-semibold text-black">{formatCurrency(totalValue)}</span>
            </div>
            <p className="text-xs text-[#888888] text-right">(Time + Documentation)</p>

            <div className="flex justify-between">
              <span className="text-[#666666]">Annual Investment</span>
              <span className="font-semibold text-black">-{formatCurrency(annualInvestment)}</span>
            </div>
          </div>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <div className="mb-4">
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Net Annual Value
            </p>
            <p className="text-3xl font-bold text-[#E85A2C]">
              {formatCurrency(netAnnualValue)}
            </p>
          </div>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#888888]">ROI</p>
              <p className="text-2xl font-bold text-black">{roi.toFixed(1)}×</p>
            </div>
            <div>
              <p className="text-sm text-[#888888]">Value per Provider</p>
              <p className="text-2xl font-bold text-black">{formatCurrency(valuePerProvider)}</p>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            View Full Summary
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
