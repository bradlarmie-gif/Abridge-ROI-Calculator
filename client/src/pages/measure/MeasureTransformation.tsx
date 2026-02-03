import { useMemo } from "react";
import { ArrowRight, ArrowLeft, TrendingUp, Clock, FileText, Heart } from "lucide-react";
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

function TransformationCard({ 
  icon: Icon,
  title,
  beforeValue,
  afterValue,
  beforeLabel,
  afterLabel,
  changeText,
  insight,
  delay = 0,
}: {
  icon: typeof TrendingUp;
  title: string;
  beforeValue: string;
  afterValue: string;
  beforeLabel?: string;
  afterLabel?: string;
  changeText: string;
  insight: string;
  delay?: number;
}) {
  const beforeNum = parseFloat(beforeValue) || 0;
  const afterNum = parseFloat(afterValue) || 0;
  const maxVal = Math.max(beforeNum, afterNum, 0.1);
  const beforeWidth = (beforeNum / maxVal) * 100;
  const afterWidth = (afterNum / maxVal) * 100;

  return (
    <motion.div
      className="bg-white rounded-xl border border-[#E5E7EB] p-5"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#E85A2C]" />
        </div>
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>

      {/* Before/After Bars */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#888888] w-12 uppercase tracking-wide">Before</span>
          <div className="flex-1 h-7 bg-[#F5F0EB] rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-[#888888] rounded-lg flex items-center justify-end px-3"
              initial={{ width: 0 }}
              animate={{ width: `${beforeWidth}%` }}
              transition={{ delay: delay + 0.3, duration: 0.6 }}
            >
              <span className="text-xs font-bold text-white">{beforeValue}{beforeLabel}</span>
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#E85A2C] w-12 uppercase tracking-wide">After</span>
          <div className="flex-1 h-7 bg-[#FFF5F2] rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-[#E85A2C] rounded-lg flex items-center justify-end px-3"
              initial={{ width: 0 }}
              animate={{ width: `${afterWidth}%` }}
              transition={{ delay: delay + 0.5, duration: 0.6 }}
            >
              <span className="text-xs font-bold text-white">{afterValue}{afterLabel}</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Change Badge */}
      <div className="flex items-center justify-between">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF5F2] border border-[#E85A2C]/20 rounded-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.7, duration: 0.3 }}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#E85A2C]" />
          <span className="text-xs font-bold text-[#E85A2C]">{changeText}</span>
        </motion.div>
        <p className="text-xs text-[#888888] italic">{insight}</p>
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
  const workLifeSaved = Math.max(0, state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith);

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === 3 ? "bg-[#E85A2C] scale-125" : step < 3 ? "bg-[#E85A2C]/40" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
            WHAT CHANGED
          </h1>
          <p className="text-base text-[#6B7280]">
            Same providers. Same patients. Different outcomes.
          </p>
        </motion.div>

        {/* Context Stats */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-5 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="border-l-4 border-[#E85A2C] pl-3">
            <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.providers}</p>
            <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">providers</p>
          </div>
          <div className="border-l-4 border-[#E85A2C] pl-3">
            <p className="text-2xl md:text-3xl font-bold text-black">{formatNumber(state.deployment.totalEncounters)}</p>
            <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">encounters</p>
          </div>
          <div className="border-l-4 border-[#E85A2C] pl-3">
            <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.utilizationRate}%</p>
            <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">utilization</p>
          </div>
          <div className="border-l-4 border-[#E85A2C] pl-3">
            <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.monthsOnAbridge}mo</p>
            <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">on Abridge</p>
          </div>
        </motion.div>

        {/* Transformation Cards */}
        <div className="grid gap-4 mb-8">
          <TransformationCard
            icon={Clock}
            title="Documentation Time"
            beforeValue={state.timeEfficiency.timeInNotesWithout.toString()}
            afterValue={state.timeEfficiency.timeInNotesWith.toString()}
            beforeLabel=" min"
            afterLabel=" min"
            changeText={`${timeReclaimed} min saved per note`}
            insight="Less time charting, more time caring"
            delay={0.2}
          />

          <TransformationCard
            icon={FileText}
            title="Revenue Capture"
            beforeValue={state.documentationQuality.wrvuWithout.toFixed(2)}
            afterValue={state.documentationQuality.wrvuWith.toFixed(2)}
            beforeLabel=" wRVU"
            afterLabel=" wRVU"
            changeText={`${formatPercent(results.wrvuDeltaPercent, true)} per encounter`}
            insight="Complexity captured, not missed"
            delay={0.35}
          />

          <TransformationCard
            icon={TrendingUp}
            title="Same-Day Closure"
            beforeValue={state.timeEfficiency.sameDayClosureWithout.toString()}
            afterValue={state.timeEfficiency.sameDayClosureWith.toString()}
            beforeLabel="%"
            afterLabel="%"
            changeText={`+${results.sameDayClosureDelta} percentage points`}
            insight="Notes closed before going home"
            delay={0.5}
          />

          {workLifeSaved > 0 && (
            <TransformationCard
              icon={Heart}
              title="Work-Life Balance"
              beforeValue={state.timeEfficiency.workOutsideWithout.toFixed(1)}
              afterValue={state.timeEfficiency.workOutsideWith.toFixed(1)}
              beforeLabel=" hrs/day"
              afterLabel=" hrs/day"
              changeText={`${workLifeSaved.toFixed(1)} hours back per day`}
              insight="Providers going home on time"
              delay={0.65}
            />
          )}
        </div>

        {/* Transition Text */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-[#6B7280] text-base">
            Now let's translate this into impact.
          </p>
        </motion.div>

        {/* Navigation */}
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Button
            onClick={onNext}
            className="h-11 px-6 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-semibold rounded-full gap-2"
            data-testid="button-see-impact"
          >
            See the Impact
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
