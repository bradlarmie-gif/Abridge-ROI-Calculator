import { useMemo } from "react";
import { ArrowRight, ArrowUpRight, Clock, FileText, TrendingUp, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatPercent,
  formatNumber,
} from "@/lib/measureCalculator";

interface MeasureTransformationProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

function ComparisonCard({ 
  icon: Icon,
  title,
  beforeValue,
  afterValue,
  beforeLabel,
  afterLabel,
  deltaText,
  insight,
  delay = 0,
}: {
  icon: typeof Clock;
  title: string;
  beforeValue: number;
  afterValue: number;
  beforeLabel: string;
  afterLabel: string;
  deltaText: string;
  insight: string;
  delay?: number;
}) {
  const maxVal = Math.max(beforeValue, afterValue, 0.1);
  const beforeWidth = Math.max((beforeValue / maxVal) * 100, 5);
  const afterWidth = Math.max((afterValue / maxVal) * 100, 5);

  return (
    <motion.div
      className="bg-white rounded-lg border border-[#E5E5E5] p-5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#E85A2C]" />
        </div>
        <h3 className="text-base font-semibold text-black">{title}</h3>
      </div>

      {/* Before/After Bars */}
      <div className="space-y-2 mb-4">
        {/* Before Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#888888] w-14 uppercase tracking-[1px]">Before</span>
          <div className="flex-1 h-8 bg-[#F5F5F5] rounded overflow-hidden relative">
            <motion.div 
              className="h-full bg-[#D1D5DB] rounded flex items-center px-3"
              initial={{ width: 0 }}
              animate={{ width: `${beforeWidth}%` }}
              transition={{ delay: delay + 0.2, duration: 0.5, ease: "easeOut" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
              {beforeLabel}
            </span>
          </div>
        </div>

        {/* After Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#888888] w-14 uppercase tracking-[1px]">After</span>
          <div className="flex-1 h-8 bg-[#FFF5F2] rounded overflow-hidden relative">
            <motion.div 
              className="h-full bg-[#E85A2C] rounded flex items-center px-3"
              initial={{ width: 0 }}
              animate={{ width: `${afterWidth}%` }}
              transition={{ delay: delay + 0.3, duration: 0.5, ease: "easeOut" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
              {afterLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Delta and Insight */}
      <div className="flex items-center justify-between">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.3 }}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-black" />
          <span className="text-[13px] font-medium text-black">{deltaText}</span>
        </motion.div>
        <p className="text-sm text-[#666666] italic">{insight}</p>
      </div>
    </motion.div>
  );
}

export default function MeasureTransformation({ 
  state, 
  onNext, 
  onBack,
  onHome,
}: MeasureTransformationProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);

  const timeReclaimed = Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith);
  const pajamaTimeSaved = Math.max(0, state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={5}
        stepName="What Changed"
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
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            What Changed
          </h1>
          <p className="text-base text-[#888888]">
            Same providers. Same patients. Different outcomes.
          </p>
        </motion.div>

        {/* Context Stats Bar */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-l-4 border-[#E85A2C] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.providers}</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Providers</p>
            </div>
            <div className="border-l-4 border-[#E85A2C] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{formatNumber(state.deployment.totalEncounters)}</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Encounters</p>
            </div>
            <div className="border-l-4 border-[#E85A2C] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.utilizationRate}%</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Utilization</p>
            </div>
            <div className="border-l-4 border-[#E85A2C] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.monthsOnAbridge}mo</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">On Abridge</p>
            </div>
          </div>
        </motion.div>

        {/* Comparison Cards */}
        <div className="space-y-4 mb-8">
          <ComparisonCard
            icon={Clock}
            title="Documentation Time"
            beforeValue={state.timeEfficiency.timeInNotesWithout}
            afterValue={state.timeEfficiency.timeInNotesWith}
            beforeLabel={`${state.timeEfficiency.timeInNotesWithout} min`}
            afterLabel={`${state.timeEfficiency.timeInNotesWith} min`}
            deltaText={`${timeReclaimed} min saved per note`}
            insight="Less time charting, more time caring"
            delay={0.15}
          />

          <ComparisonCard
            icon={FileText}
            title="Revenue Capture"
            beforeValue={state.documentationQuality.wrvuWithout}
            afterValue={state.documentationQuality.wrvuWith}
            beforeLabel={state.documentationQuality.wrvuWithout.toFixed(2)}
            afterLabel={state.documentationQuality.wrvuWith.toFixed(2)}
            deltaText={`${formatPercent(results.wrvuDeltaPercent, true)} per encounter`}
            insight="Complexity captured, not missed"
            delay={0.25}
          />

          <ComparisonCard
            icon={TrendingUp}
            title="Same-Day Closure"
            beforeValue={state.timeEfficiency.sameDayClosureWithout}
            afterValue={state.timeEfficiency.sameDayClosureWith}
            beforeLabel={`${state.timeEfficiency.sameDayClosureWithout}%`}
            afterLabel={`${state.timeEfficiency.sameDayClosureWith}%`}
            deltaText={`+${results.sameDayClosureDelta} percentage points`}
            insight="Notes closed before going home"
            delay={0.35}
          />

          <ComparisonCard
            icon={Heart}
            title="Work-Life Balance"
            beforeValue={state.timeEfficiency.workOutsideWithout}
            afterValue={state.timeEfficiency.workOutsideWith}
            beforeLabel={`${state.timeEfficiency.workOutsideWithout.toFixed(1)} hrs`}
            afterLabel={`${state.timeEfficiency.workOutsideWith.toFixed(1)} hrs`}
            deltaText={`${pajamaTimeSaved.toFixed(1)} hours back per day`}
            insight="Evenings reclaimed"
            delay={0.45}
          />
        </div>

        {/* Transition Text */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-base text-[#666666] italic">
            Now let's see what that's worth.
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-see-value"
          >
            See the Value
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
