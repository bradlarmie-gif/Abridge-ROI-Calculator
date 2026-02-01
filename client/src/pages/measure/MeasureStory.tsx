import { useMemo, useState } from "react";
import { Download, Clock, FileText, TrendingUp, Users, ChevronDown, ChevronUp, ArrowRight, Sparkles, DollarSign, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";
import { generateMeasurePDF } from "@/components/measure/MeasurePDFExport";

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureStory({ state, onBack, onHome }: MeasureStoryProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);
  const [whatIfProviders, setWhatIfProviders] = useState(state.deployment.providers * 2);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateMeasurePDF(state);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };


  // Calculate documentation value range (conservative to optimistic)
  // Conservative: 50% attribution, Optimistic: 75% attribution
  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const docValueConservative = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.5;
  const docValueOptimistic = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.75;

  // "What If" projections
  const projectedEncounters = Math.round((state.deployment.abridgeEncounters / state.deployment.providers) * whatIfProviders);
  const projectedHours = Math.round(results.totalHoursSaved * (whatIfProviders / state.deployment.providers));
  const projectedDocValueLow = docValueConservative * (whatIfProviders / state.deployment.providers);
  const projectedDocValueHigh = docValueOptimistic * (whatIfProviders / state.deployment.providers);

  // Time value projection (use their allocation patterns)
  const projectedTimeValue = results.timeReallocatedTotal * (whatIfProviders / state.deployment.providers);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={4}
        stepName="Your Value Story"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Hero - The Story So Far */}
        <motion.div 
          className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200 p-8 md:p-12 mb-10 relative overflow-hidden shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#EA2C00]/5 to-[#F07B5F]/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10">
            <motion.p 
              className="text-sm font-semibold text-[#EA2C00] tracking-wide uppercase mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Your Story So Far
            </motion.p>

            <motion.h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              In {state.deployment.monthsOnAbridge} months, your {state.deployment.providers} providers
              <br />
              <span className="bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] bg-clip-text text-transparent">
                reclaimed {formatNumber(Math.round(results.totalHoursSaved))} hours.
              </span>
            </motion.h1>

            <motion.p 
              className="text-lg text-slate-600 max-w-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              That's {results.qualityHoursPerWeek.toFixed(1)} hours per week per provider—time that used to disappear into documentation.
            </motion.p>
          </div>
        </motion.div>

        {/* Dual Timeline: Now vs Future */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* LEFT: Your Story So Far */}
          <motion.div 
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-bold text-slate-900">What You've Built</h2>
            </div>

            <div className="space-y-5">
              {/* Time Benefits */}
              <div className="border-l-4 border-emerald-400 pl-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Time Benefits</p>
                <p className="text-2xl font-bold text-slate-900">{formatNumber(Math.round(results.totalHoursSaved))} hours</p>
                <p className="text-sm text-slate-600">reclaimed from documentation</p>
                
                <div className="mt-3 space-y-2 text-sm">
                  {state.allocation.hardSavingsPercent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Hard Savings ({state.allocation.hardSavingsPercent}%)</span>
                      <span className="font-semibold text-emerald-600">{formatCurrency(results.hardSavingsValue)}</span>
                    </div>
                  )}
                  {state.allocation.capacityPercent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Capacity ({state.allocation.capacityPercent}%)</span>
                      <span className="font-semibold text-[#EA2C00]">{formatCurrency(results.capacityValue)}</span>
                    </div>
                  )}
                  {state.allocation.qualityOfLifePercent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Quality of Life ({state.allocation.qualityOfLifePercent}%)</span>
                      <span className="font-semibold text-amber-600">{results.qualityHoursPerWeek.toFixed(1)}h/wk</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documentation Benefits */}
              <div className="border-l-4 border-[#EA2C00]/60 pl-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Documentation Benefits</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}
                </p>
                <p className="text-sm text-slate-600">potential revenue from wRVU lift</p>
                
                <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                  <p className="font-medium text-slate-700 mb-1">The range reflects attribution uncertainty</p>
                  <p>+{wrvuDelta.toFixed(2)} wRVU/encounter × {formatNumber(state.deployment.abridgeEncounters)} encounters × ${state.calibration.conversionFactor} CF</p>
                  <p className="mt-1 italic">Conservative (50%) to optimistic (75%) attribution</p>
                </div>
              </div>

              {/* Provider Experience Signal */}
              <div className="border-l-4 border-amber-400 pl-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Provider Experience</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{state.timeEfficiency.sameDayClosureWith}%</p>
                  <p className="text-sm text-emerald-600 font-medium">+{results.sameDayClosureDelta} pts</p>
                </div>
                <p className="text-sm text-slate-600">same-day chart closure</p>
                <p className="text-xs text-slate-500 mt-2">
                  Work outside hours: {state.timeEfficiency.workOutsideWith}h (down from {state.timeEfficiency.workOutsideWithout}h)
                </p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: The Path Ahead */}
          <motion.div 
            className="bg-gradient-to-br from-[#EA2C00]/5 to-[#F07B5F]/10 rounded-2xl border border-[#EA2C00]/20 p-6 shadow-lg"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#EA2C00]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#EA2C00]" />
              </div>
              <h2 className="font-bold text-slate-900">The Path Ahead</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              What if you extended this to more providers?
            </p>

            {/* Provider selector */}
            <div className="bg-white/60 rounded-xl p-4 mb-5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                Projected deployment
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={state.deployment.providers}
                  max={state.deployment.providers * 5}
                  step={10}
                  value={whatIfProviders}
                  onChange={(e) => setWhatIfProviders(Number(e.target.value))}
                  className="flex-1 accent-[#EA2C00]"
                  data-testid="slider-what-if-providers"
                />
                <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-2 border border-slate-200">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-900 min-w-[60px] text-center">{whatIfProviders}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Currently: {state.deployment.providers} providers
              </p>
            </div>

            {/* Projections */}
            <div className="space-y-4">
              <motion.div 
                className="bg-white/80 rounded-xl p-4"
                key={whatIfProviders}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Projected Time Value</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-[#EA2C00] mb-1">
                  {formatNumber(projectedHours)} hours
                </p>
                <p className="text-sm text-slate-600">
                  {formatCurrency(projectedTimeValue)} in time value
                </p>
              </motion.div>

              <motion.div 
                className="bg-white/80 rounded-xl p-4"
                key={`doc-${whatIfProviders}`}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Projected Documentation Value</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">
                  {formatCurrency(projectedDocValueLow)} – {formatCurrency(projectedDocValueHigh)}
                </p>
                <p className="text-sm text-slate-600">
                  across {formatNumber(projectedEncounters)} encounters
                </p>
              </motion.div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      The harder-to-quantify impact
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Each provider going home on time is a provider who stays. At scale, this is your retention strategy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* The Takeaway */}
        <motion.div 
          className="bg-slate-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#EA2C00]/20 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#F07B5F]" />
              <span className="text-sm font-semibold text-[#F07B5F] uppercase tracking-wide">The Takeaway</span>
            </div>
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6">
              You didn't just buy software. You gave your providers back{' '}
              <span className="text-[#F07B5F] font-bold">{results.qualityHoursPerWeek.toFixed(1)} hours a week</span>—and 
              the documentation improved, not despite the time savings, but because of them.
            </p>
            <p className="text-slate-400">
              That's the Abridge effect: better notes, faster, and providers who can finally go home.
            </p>
          </div>
        </motion.div>

        {/* Export Section */}
        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="font-bold text-slate-900 mb-3">Share This Story</h3>
          <p className="text-sm text-slate-600 mb-5">
            Export a polished summary to share with leadership.
          </p>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto h-12 px-6 bg-[#EA2C00] hover:bg-[#EA2C00]/90 disabled:opacity-70"
            data-testid="button-export"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </motion.div>

        {/* Methodology */}
        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={() => setMethodologyExpanded(!methodologyExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            data-testid="button-methodology"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Methodology & Assumptions</span>
            </div>
            {methodologyExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {methodologyExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 text-sm text-slate-600 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Time Savings</p>
                    <p>
                      Calculated from the difference in time-in-notes ({state.timeEfficiency.timeInNotesWithout} min without → {state.timeEfficiency.timeInNotesWith} min with Abridge) 
                      multiplied by {formatNumber(state.deployment.abridgeEncounters)} Abridge encounters.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Documentation Value (Range)</p>
                    <p>
                      Based on wRVU differential (+{wrvuDelta.toFixed(2)}/encounter) × Medicare conversion factor (${state.calibration.conversionFactor}). 
                      The range reflects 50-75% attribution to Abridge, acknowledging that other factors may contribute.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Projections</p>
                    <p>
                      "What If" projections assume linear scaling. Actual results may vary based on specialty mix, 
                      payer mix, and adoption patterns.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="pb-8">
          <Button
            variant="outline"
            onClick={onHome}
            className="w-full h-12 text-base font-medium border-2"
            data-testid="button-home"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
