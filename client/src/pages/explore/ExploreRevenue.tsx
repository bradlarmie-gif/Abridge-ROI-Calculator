import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { computeRevenueBreakdown, type PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import { type ExploreState } from "./ExploreFlow";

interface ExploreRevenueProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  priorQuadrants?: PriorQuadrantEntry[];
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreRevenue({ state, updateState, priorQuadrants = [], onNext, onBack, onHome }: ExploreRevenueProps) {
  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const breakdown = useMemo(() => computeRevenueBreakdown(state, 0), [state]);
  const quadrantAnnualTotal = breakdown.quadrantAnnualTotal;
  const oneTimeBenefitsTotal = breakdown.oneTimeBenefitsTotal;
  const runningTotal = priorQuadrants.reduce((s, p) => s + p.value, 0) + quadrantAnnualTotal;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={6}
        totalSteps={9}
        stepName="Revenue"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-[700px]">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
                Build Your Model
              </p>
              <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight">
                Revenue
              </h1>
              <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto px-2 mb-8">
                Revenue drivers and inputs land here in the next sprint.
              </p>
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full lg:hidden"
                data-testid="button-continue-revenue"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel */}
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Revenue Value</p>
              <p className="text-sm text-white/50 mb-4">From this quadrant</p>

              {(state.otherFinancialBenefits ?? []).filter(b => b.quadrant === 'Revenue').length > 0 ? (
                <div className="space-y-2 mb-4">
                  {(state.otherFinancialBenefits ?? [])
                    .filter(b => b.quadrant === 'Revenue')
                    .map(b => (
                      <div key={b.id} className="flex justify-between items-center">
                        <span className="text-sm text-[#888888] truncate">{b.label || 'Other benefit'}</span>
                        <span className="text-sm text-white">
                          {formatCurrency(b.amount)}
                          <span className="text-xs text-white/40 ml-1">{b.type === 'oneTime' ? 'Y1' : '/yr'}</span>
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-white/50 mb-4">No revenue drivers wired yet.</p>
              )}

              <div className="h-px bg-[#333333] my-4" />

              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Quadrant Total</p>
              <p className="text-2xl font-bold text-[#EA2C00]" data-testid="text-quadrant-total">{formatCurrency(quadrantAnnualTotal)}</p>
              <p className="text-xs text-white/50 mt-1">Annual recurring</p>
              {oneTimeBenefitsTotal > 0 && (
                <p className="text-xs text-white/70 mt-1" data-testid="text-quadrant-onetime">+ {formatCurrency(oneTimeBenefitsTotal)} one-time (Y1 only)</p>
              )}

              {priorQuadrants.length > 0 && (
                <>
                  <div className="h-px bg-[#333333] my-4" />
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">Progress So Far</p>
                  <div className="space-y-1.5 mb-3">
                    {priorQuadrants.map(p => (
                      <div key={p.key} className="flex justify-between items-center" data-testid={`prior-quadrant-${p.key}`}>
                        <span className="text-sm text-[#888888]">{p.label}</span>
                        <span className="text-sm text-white">{formatCurrency(p.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#888888]">Revenue</span>
                      <span className="text-sm text-white">{formatCurrency(quadrantAnnualTotal)}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Running Total</p>
                  <p className="text-xl font-bold text-white" data-testid="text-running-total">
                    {formatCurrency(runningTotal)}
                  </p>
                </>
              )}

              <div className="hidden lg:block mt-6">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-panel-continue"
                >
                  Continue to Quality
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
