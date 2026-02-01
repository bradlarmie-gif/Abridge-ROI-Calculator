import { useMemo } from "react";
import { ArrowRight, TrendingUp, Clock, FileText, Heart } from "lucide-react";
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
      className="bg-white rounded-2xl border border-slate-200 p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#EA2C00]" />
        </div>
        <h3 className="text-base font-semibold text-black">{title}</h3>
      </div>

      {/* Before/After Bars */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400 w-14 uppercase tracking-wide">Before</span>
          <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-slate-300 rounded-lg flex items-center justify-end px-3"
              initial={{ width: 0 }}
              animate={{ width: `${beforeWidth}%` }}
              transition={{ delay: delay + 0.3, duration: 0.6 }}
            >
              <span className="text-xs font-bold text-slate-600">{beforeValue}{beforeLabel}</span>
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#EA2C00] w-14 uppercase tracking-wide">After</span>
          <div className="flex-1 h-8 bg-[#FFF5F2] rounded-lg overflow-hidden">
            <motion.div 
              className="h-full bg-[#EA2C00] rounded-lg flex items-center justify-end px-3"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black rounded-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.7, duration: 0.3 }}
        >
          <TrendingUp className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold text-white">{changeText}</span>
        </motion.div>
        <p className="text-xs text-slate-500 italic">{insight}</p>
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
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={5}
        stepName="The Transformation"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            What the Data Reveals
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-3">
            The Transformation
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Same providers. Same patients. <span className="text-black font-medium">Different outcomes.</span>
          </p>
        </motion.div>

        {/* Context Strip */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-200 p-5 mb-8 grid grid-cols-4 gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div>
            <p className="text-2xl font-bold text-black">{state.deployment.providers}</p>
            <p className="text-xs text-slate-500">providers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-black">{formatNumber(state.deployment.totalEncounters)}</p>
            <p className="text-xs text-slate-500">encounters</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-black">{state.deployment.utilizationRate}%</p>
            <p className="text-xs text-slate-500">utilization</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-black">{state.deployment.monthsOnAbridge}mo</p>
            <p className="text-xs text-slate-500">on Abridge</p>
          </div>
        </motion.div>

        {/* Transformation Cards */}
        <div className="grid gap-5 mb-10">
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
            changeText={`+${formatPercent(results.wrvuDeltaPercent, true)} per encounter`}
            insight="Complexity that was missed is now captured"
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

        {/* Story teaser */}
        <motion.div
          className="bg-black rounded-2xl p-6 text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-white/70 text-sm mb-2">The question now is...</p>
          <p className="text-white text-lg font-semibold">Where did all that time go?</p>
        </motion.div>

        {/* CTA */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Button
            onClick={onNext}
            className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full"
            data-testid="button-see-impact"
          >
            See the Impact
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
