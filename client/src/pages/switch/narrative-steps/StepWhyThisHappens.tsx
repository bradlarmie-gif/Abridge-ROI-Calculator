import { ArrowRight, ArrowLeft, Users, Zap, Settings, AlertTriangle, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
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

const DIAGNOSTIC_CARDS = [
  {
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Adoption Friction",
    subtitle: "The human element",
    description: "Even the best technology fails without proper change management. Providers are creatures of habit — and old workflows die hard.",
    symptoms: [
      "Providers forget to start recording",
      "Inconsistent usage across departments",
      "Workarounds that bypass the system",
      "Training that didn't stick"
    ]
  },
  {
    icon: Zap,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Technology Ceiling",
    subtitle: "The product itself",
    description: "Not all ambient AI is created equal. Some solutions hit a ceiling on accuracy, specialty support, or EHR integration that limits their potential.",
    symptoms: [
      "Notes require significant editing",
      "Missing specialty-specific terminology",
      "Poor handling of complex visits",
      "Integration issues with your EHR"
    ]
  },
  {
    icon: Settings,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Implementation Gaps",
    subtitle: "The rollout",
    description: "A rushed or incomplete implementation leaves value on the table. Without proper setup, even great technology underperforms.",
    symptoms: [
      "Generic templates, not customized",
      "No ongoing optimization",
      "Lack of executive sponsorship",
      "Missing performance metrics"
    ]
  },
  {
    icon: Clock,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    title: "Provider Fatigue",
    subtitle: "The burnout factor",
    description: "When providers are already exhausted, learning new technology feels like one more burden. Adoption suffers — and so does ROI.",
    symptoms: [
      "Too many changes at once",
      "Documentation still feels like a chore",
      "No visible wins to celebrate",
      "Support feels distant or slow"
    ]
  }
];

export default function StepWhyThisHappens({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhyThisHappensProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          Why This Happens
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          You're not alone. Most organizations using ambient AI 
          <br className="hidden md:block" />
          experience the same patterns.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-[#111827]">The uncomfortable truth</span>
        </div>
        <p className="text-[#6B7280]">
          Buying ambient AI is easy. <span className="font-medium text-[#111827]">Getting full value from it is hard.</span> 
          The gap you're seeing isn't a failure — it's a pattern. The question is whether you accept it or close it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DIAGNOSTIC_CARDS.map((card, index) => (
          <div 
            key={card.title}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <h3 className="font-bold text-[#111827]">{card.title}</h3>
                <p className="text-xs text-[#6B7280]">{card.subtitle}</p>
              </div>
            </div>
            
            <p className="text-sm text-[#6B7280] mb-4">
              {card.description}
            </p>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#374151] uppercase tracking-wide">Common symptoms:</p>
              <ul className="space-y-1">
                {card.symptoms.map((symptom, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#6B7280]">
                    <TrendingDown className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                    {symptom}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-6 border border-slate-200">
        <p className="text-center text-[#374151]">
          <span className="font-semibold">Here's what this adds up to:</span> organizations are leaving 
          <span className="font-bold text-[#EA2C00]"> 30-50% of potential value </span>
          on the table — year after year.
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
          What Good Looks Like
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
