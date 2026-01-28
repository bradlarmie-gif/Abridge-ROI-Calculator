import { ArrowRight, ArrowLeft, CheckCircle, TrendingUp, Target, Award, BarChart3, Clock, DollarSign, Smile, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ABRIDGE_BENCHMARKS, type SwitchInputs, type SwitchCalculations } from "@/lib/switchGapCalculator";

interface StepWhatGoodLooksLikeProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

const BENCHMARKS = [
  {
    icon: BarChart3,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    metric: "Utilization",
    value: `${ABRIDGE_BENCHMARKS.utilization}%`,
    label: "of encounters documented",
    context: "Not 40%. Not 60%. Mature implementations consistently hit this mark within 3-4 months."
  },
  {
    icon: Clock,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    metric: "Efficiency",
    value: `${ABRIDGE_BENCHMARKS.timeSavedAvg} min`,
    label: "saved per encounter",
    context: "Real time back in providers' days. That's 6-8 hours per provider per week at full utilization."
  },
  {
    icon: DollarSign,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    metric: "Quality",
    value: `+${ABRIDGE_BENCHMARKS.wrvuLift}%`,
    label: "wRVU lift",
    context: "Better documentation means better capture. The notes support the work you're already doing."
  },
  {
    icon: Smile,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    metric: "Satisfaction",
    value: `${ABRIDGE_BENCHMARKS.satisfaction}%`,
    label: "would recommend",
    context: "When providers love the tool, they use it. When they use it, everyone wins."
  },
  {
    icon: Moon,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    metric: "After-Hours",
    value: `-${ABRIDGE_BENCHMARKS.afterHoursReduction} hrs`,
    label: "per week",
    context: "Providers finish their notes before leaving clinic. Evenings belong to families again."
  }
];

export default function StepWhatGoodLooksLike({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhatGoodLooksLikeProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          What Good Looks Like
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          These aren't aspirational targets. They're what top performers 
          <br className="hidden md:block" />
          are actually achieving today.
        </p>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <Target className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-[#111827]">The benchmark standard</span>
        </div>
        <p className="text-[#6B7280]">
          These numbers come from organizations that got implementation right. 
          <span className="font-medium text-[#111827]"> They prove what's possible </span>
          — not in theory, but in practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BENCHMARKS.map((benchmark) => (
          <div 
            key={benchmark.metric}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg ${benchmark.iconBg} flex items-center justify-center`}>
                <benchmark.icon className={`w-5 h-5 ${benchmark.iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wide">{benchmark.metric}</p>
                <div className="text-2xl font-bold text-[#111827]">{benchmark.value}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-[#374151] mb-2">{benchmark.label}</p>
            <p className="text-xs text-[#6B7280]">{benchmark.context}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#111827] mb-2">The difference isn't the technology — it's the implementation</h3>
            <p className="text-[#6B7280] mb-4">
              Organizations hitting these benchmarks share common traits: executive sponsorship, 
              dedicated change management, continuous optimization, and technology that's genuinely 
              built for healthcare workflows.
            </p>
            <div className="flex flex-wrap gap-2">
              {["90-day onboarding", "Specialty customization", "Ongoing success support", "Real-time analytics"].map((trait) => (
                <span 
                  key={trait}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full"
                >
                  <CheckCircle className="w-3 h-3" />
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-6 text-center">
        <p className="text-lg">
          You're at <span className="font-bold text-amber-400">{calculations.realizationScore}%</span> of benchmark.
          <br />
          <span className="text-slate-300">
            That's not a failure — it's an opportunity worth <span className="font-bold text-emerald-400">{calculations.annualGap.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/year</span>.
          </span>
        </p>
      </div>

      <div className="flex justify-between items-center pt-4">
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
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
          data-testid="button-next"
        >
          See the Math
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
