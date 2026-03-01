import { useState } from "react";
import { Users, Settings, Zap, TrendingUp, ChevronDown, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { 
  ABRIDGE_BENCHMARKS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";

interface StepWhyThisHappensProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface PriorityArea {
  id: string;
  label: string;
  yourValue: string;
  benchmarkValue: string;
  score: number;
  status: "on-track" | "watch" | "priority";
  recommendation: string;
}

export default function StepWhyThisHappens({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhyThisHappensProps) {
  const [openPattern, setOpenPattern] = useState<string | null>(null);

  const areas: PriorityArea[] = [
    {
      id: "utilization",
      label: "Adoption",
      yourValue: `${inputs.utilization}%`,
      benchmarkValue: `${ABRIDGE_BENCHMARKS.utilization}%`,
      score: calculations.utilizationScore,
      status: calculations.utilizationScore >= 85 ? "on-track" : calculations.utilizationScore >= 60 ? "watch" : "priority",
      recommendation: calculations.utilizationScore >= 85
        ? "Your adoption is strong. Focus on sustaining it with ongoing reinforcement."
        : calculations.utilizationScore >= 60
        ? "Adoption is progressing but hasn't reached critical mass. Targeted change management and provider champions typically close this gap."
        : "Low adoption is the most common and most fixable gap. It usually reflects workflow friction, not provider resistance.",
    },
    {
      id: "net-efficiency",
      label: "Net Efficiency",
      yourValue: `+${calculations.currentNetImpact.toFixed(1)} min`,
      benchmarkValue: `+${calculations.benchmarkNetImpact.toFixed(1)} min`,
      score: calculations.efficiencyScore,
      status: calculations.efficiencyScore >= 85 ? "on-track" : calculations.efficiencyScore >= 60 ? "watch" : "priority",
      recommendation: calculations.efficiencyScore >= 85
        ? "Your net time savings are near the top. Small workflow refinements can push further."
        : calculations.efficiencyScore >= 60
        ? "Edit time is eroding your gross savings. Specialty-specific note templates and prompt tuning typically reduce editing significantly."
        : "High edit time is consuming most of your time savings. This usually means notes need better structure, not just generation.",
    },
    {
      id: "doc-completeness",
      label: "Note Acceptance",
      yourValue: `${inputs.docCompleteness}%`,
      benchmarkValue: `${ABRIDGE_BENCHMARKS.docCompleteness}%`,
      score: calculations.docCompletenessScore,
      status: calculations.docCompletenessScore >= 85 ? "on-track" : calculations.docCompletenessScore >= 60 ? "watch" : "priority",
      recommendation: calculations.docCompletenessScore >= 85
        ? "Note acceptance is strong — providers trust the AI output. Continue monitoring for specialty-specific gaps."
        : calculations.docCompletenessScore >= 60
        ? "Providers are editing notes more than expected. This usually means the AI is missing clinical details or not matching provider style."
        : "Low note acceptance means providers are rewriting most of the AI output. This erodes time savings and signals the AI isn't matching clinical workflow.",
    },
    {
      id: "coding-impact",
      label: "Coding Impact",
      yourValue: `+${inputs.wrvuLift}%`,
      benchmarkValue: `+${ABRIDGE_BENCHMARKS.wrvuLift}%`,
      score: Math.min(100, Math.round((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)),
      status: Math.min(100, Math.round((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)) >= 85 ? "on-track" : Math.min(100, Math.round((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)) >= 60 ? "watch" : "priority",
      recommendation: Math.min(100, Math.round((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)) >= 85
        ? "wRVU lift is healthy. Keep monitoring for consistency across specialties."
        : Math.min(100, Math.round((inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)) >= 60
        ? "There's coding upside being left on the table. Better documentation completeness typically lifts wRVU capture without any behavior change."
        : "Low wRVU lift usually traces back to documentation gaps. When notes don't capture complexity, codes don't reflect the work performed.",
    },
    {
      id: "satisfaction",
      label: "Provider Satisfaction",
      yourValue: `${inputs.satisfaction}%`,
      benchmarkValue: `${ABRIDGE_BENCHMARKS.satisfaction}%`,
      score: calculations.satisfactionScore,
      status: calculations.satisfactionScore >= 85 ? "on-track" : calculations.satisfactionScore >= 60 ? "watch" : "priority",
      recommendation: calculations.satisfactionScore >= 85
        ? "Providers are bought in. This is your strongest foundation for sustained adoption."
        : calculations.satisfactionScore >= 60
        ? "Satisfaction is moderate but not self-sustaining. Below 70%, adoption tends to erode over time without intervention."
        : "Low satisfaction is a leading indicator. If providers don't trust the output, they stop using the tool — regardless of leadership mandates.",
    },
    {
      id: "after-hours",
      label: "After-Hours Charting",
      yourValue: `${inputs.afterHoursPerWeek} hrs/wk`,
      benchmarkValue: `${ABRIDGE_BENCHMARKS.afterHoursPerWeek} hrs/wk`,
      score: calculations.afterHoursScore,
      status: calculations.afterHoursScore >= 85 ? "on-track" : calculations.afterHoursScore >= 60 ? "watch" : "priority",
      recommendation: calculations.afterHoursScore >= 85
        ? "Pajama time is well controlled. Your providers are getting their evenings back."
        : calculations.afterHoursScore >= 60
        ? "Some charting is still bleeding into personal time. This is a retention and burnout signal worth watching."
        : "Significant after-hours charting persists. This is the dimension providers feel most personally — and the one most correlated with burnout and turnover.",
    },
  ];

  const sorted = [...areas].sort((a, b) => a.score - b.score);
  const priorityCount = sorted.filter(a => a.status === "priority").length;
  const watchCount = sorted.filter(a => a.status === "watch").length;
  const onTrackCount = sorted.filter(a => a.status === "on-track").length;

  const statusConfig = {
    "priority": { icon: AlertCircle, color: "text-[#EA2C00]", bg: "bg-[#FFF5F2]", border: "border-[#EA2C00]/20", label: "Priority", dotColor: "bg-[#EA2C00]" },
    "watch": { icon: AlertTriangle, color: "text-[#D97706]", bg: "bg-[#FFFBEB]", border: "border-[#D97706]/20", label: "Watch", dotColor: "bg-[#D97706]" },
    "on-track": { icon: CheckCircle2, color: "text-[#059669]", bg: "bg-[#ECFDF5]", border: "border-[#059669]/20", label: "On Track", dotColor: "bg-[#059669]" },
  };

  const patterns = [
    {
      id: "adoption",
      icon: Users,
      number: "01",
      title: "The Adoption Challenge",
      subtitle: "Why technology alone fails",
      challenge: "Without intentional change management, providers revert to old habits within weeks. Technology alone doesn't change behavior.",
      whatWorks: ["Dedicated success partners", "Provider champions program", "Behavioral design expertise"],
    },
    {
      id: "optimization",
      icon: Settings,
      number: "02",
      title: "The Set-It-and-Forget-It Trap",
      subtitle: "Why value erodes over time",
      challenge: "AI implementations that aren't actively managed see declining utilization over 6-12 months. Initial enthusiasm fades.",
      whatWorks: ["Continuous optimization cycles", "Quarterly business reviews", "Real-time utilization alerts"],
    },
    {
      id: "customization",
      icon: Zap,
      number: "03",
      title: "The One-Size-Fits-All Problem",
      subtitle: "Why generic solutions fail",
      challenge: "Primary care, cardiology, and surgery have completely different documentation needs. Generic AI misses nuances.",
      whatWorks: ["Specialty-specific templates", "Workflow customization", "EHR-specific integrations"],
    },
    {
      id: "leadership",
      icon: TrendingUp,
      number: "04",
      title: "The Missing Executive Sponsor",
      subtitle: "Why initiatives lose momentum",
      challenge: "Without visible leadership support, AI initiatives become \"another IT project\" and lose organizational priority.",
      whatWorks: ["Executive alignment playbook", "ROI dashboards for leadership", "Peer network connections"],
    },
  ];

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          What It Takes
        </h1>
        <p className="text-base text-[#888888] leading-relaxed">
          Where to focus — and what separates high performers from the rest.
        </p>
      </div>

      <section data-testid="priority-areas-section">
        <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-4">YOUR PRIORITY AREAS</p>

        <div className="bg-[#F5F0EB] rounded-xl p-5 mb-5 border border-[#E8E0D8]">
          <div className="flex items-center gap-6 flex-wrap">
            {priorityCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />
                <span className="text-sm font-semibold text-[#1A1A1A]">{priorityCount} Priority</span>
              </div>
            )}
            {watchCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span className="text-sm font-semibold text-[#1A1A1A]">{watchCount} Watch</span>
              </div>
            )}
            {onTrackCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                <span className="text-sm font-semibold text-[#1A1A1A]">{onTrackCount} On Track</span>
              </div>
            )}
          </div>
          <p className="text-sm text-[#666666] mt-3">
            Based on your inputs, ranked by distance from benchmark.
          </p>
        </div>

        <div className="space-y-3">
          {sorted.map((area) => {
            const config = statusConfig[area.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={area.id}
                className={`rounded-xl border ${config.border} bg-white p-5`}
                data-testid={`priority-area-${area.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <StatusIcon className={`w-4.5 h-4.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#1A1A1A] text-sm">{area.label}</h3>
                        <span className={`text-[12px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#999999]">
                        <span>You: <span className="font-semibold text-[#1A1A1A]">{area.yourValue}</span></span>
                        <span className="text-[#CCCCCC]">/</span>
                        <span>Bench: <span className="font-semibold text-[#666666]">{area.benchmarkValue}</span></span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-[#F0F0F0] rounded-full mt-2 mb-3">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, area.score)}%`,
                          backgroundColor: area.status === "on-track" ? "#059669" : area.status === "watch" ? "#D97706" : "#EA2C00",
                        }}
                      />
                    </div>

                    <p className="text-sm text-[#666666] leading-relaxed">{area.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-[#E5E7EB]" />

      <section data-testid="performance-patterns-section">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-[#999999] uppercase tracking-wider">WHAT DRIVES PERFORMANCE</p>
          <p className="text-xs text-[#999999]">{openPattern ? "1" : "0"} of 4 patterns explored</p>
        </div>
        <p className="text-sm text-[#666666] mb-5">
          The implementations that succeed share four patterns. The ones that struggle are missing at least one.
        </p>

        <div className="space-y-3">
          {patterns.map((pattern) => {
            const Icon = pattern.icon;
            const isOpen = openPattern === pattern.id;
            return (
              <div
                key={pattern.id}
                className="rounded-xl border border-[#E5E7EB] bg-white overflow-visible"
                data-testid={`pattern-${pattern.id}`}
              >
                <button
                  onClick={() => setOpenPattern(isOpen ? null : pattern.id)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                  data-testid={`button-pattern-${pattern.id}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#EA2C00] uppercase tracking-wider mb-0.5">PATTERN {pattern.number}</p>
                    <h3 className="font-bold text-[#1A1A1A] text-[15px]">{pattern.title}</h3>
                    <p className="text-xs text-[#999999]">{pattern.subtitle}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#999999] flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#F5F0EB] rounded-lg p-4">
                        <p className="text-[12px] font-bold text-[#999999] uppercase tracking-wider mb-2">THE CHALLENGE</p>
                        <p className="text-sm text-[#333333] leading-relaxed">{pattern.challenge}</p>
                      </div>
                      <div className="bg-[#FFF5F2] rounded-lg p-4">
                        <p className="text-[12px] font-bold text-[#EA2C00] uppercase tracking-wider mb-2">WHAT WE'VE SEEN WORK</p>
                        <ul className="space-y-2">
                          {pattern.whatWorks.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-[#333333]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="The Opportunity" />
    </div>
  );
}
