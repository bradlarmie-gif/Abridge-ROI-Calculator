import { useState } from "react";
import { ArrowRight, ArrowLeft, Users, Zap, Settings, AlertTriangle, Clock, Check } from "lucide-react";
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
    id: "adoption",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    accentColor: "blue",
    title: "Adoption Friction",
    subtitle: "The human element",
    description: "Even the best technology fails without proper change management. Providers are creatures of habit — and old workflows die hard.",
    symptoms: [
      { id: "forget", text: "Providers forget to start recording" },
      { id: "inconsistent", text: "Inconsistent usage across departments" },
      { id: "workarounds", text: "Workarounds that bypass the system" },
      { id: "training", text: "Training that didn't stick" }
    ]
  },
  {
    id: "technology",
    icon: Zap,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    accentColor: "amber",
    title: "Technology Ceiling",
    subtitle: "The product itself",
    description: "Not all ambient AI is created equal. Some solutions hit a ceiling on accuracy, specialty support, or EHR integration.",
    symptoms: [
      { id: "editing", text: "Notes require significant editing" },
      { id: "specialty", text: "Missing specialty-specific terminology" },
      { id: "complex", text: "Poor handling of complex visits" },
      { id: "integration", text: "Integration issues with your EHR" }
    ]
  },
  {
    id: "implementation",
    icon: Settings,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    accentColor: "purple",
    title: "Implementation Gaps",
    subtitle: "The rollout",
    description: "A rushed or incomplete implementation leaves value on the table. Without proper setup, even great technology underperforms.",
    symptoms: [
      { id: "templates", text: "Generic templates, not customized" },
      { id: "optimization", text: "No ongoing optimization" },
      { id: "sponsorship", text: "Lack of executive sponsorship" },
      { id: "metrics", text: "Missing performance metrics" }
    ]
  },
  {
    id: "fatigue",
    icon: Clock,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    accentColor: "rose",
    title: "Provider Fatigue",
    subtitle: "The burnout factor",
    description: "When providers are already exhausted, learning new technology feels like one more burden. Adoption suffers — and so does ROI.",
    symptoms: [
      { id: "changes", text: "Too many changes at once" },
      { id: "chore", text: "Documentation still feels like a chore" },
      { id: "wins", text: "No visible wins to celebrate" },
      { id: "support", text: "Support feels distant or slow" }
    ]
  }
];

export default function StepWhyThisHappens({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhyThisHappensProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(symptomId)) {
        next.delete(symptomId);
      } else {
        next.add(symptomId);
      }
      return next;
    });
  };

  const totalSelected = selectedSymptoms.size;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          Why This Happens
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          You're not alone. Most organizations experience the same patterns.
          <br className="hidden md:block" />
          <span className="text-[#374151]">Tap any that feel familiar.</span>
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-[#111827]">The uncomfortable truth</span>
        </div>
        <p className="text-[#6B7280]">
          Buying ambient AI is easy. <span className="font-medium text-[#111827]">Getting full value from it is hard.</span> 
          The gap you're seeing isn't a failure — it's a pattern.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DIAGNOSTIC_CARDS.map((card) => {
          const cardSelectedCount = card.symptoms.filter(s => selectedSymptoms.has(s.id)).length;
          const hasSelections = cardSelectedCount > 0;
          
          return (
            <div 
              key={card.id}
              className={`bg-white rounded-xl border p-5 transition-all duration-200 ${
                hasSelections 
                  ? 'border-slate-300 shadow-md' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111827]">{card.title}</h3>
                    <p className="text-xs text-[#6B7280]">{card.subtitle}</p>
                  </div>
                </div>
                {hasSelections && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full">
                    <Check className="w-3 h-3 text-slate-600" />
                    <span className="text-xs font-medium text-slate-600">{cardSelectedCount}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-[#6B7280] mb-4">
                {card.description}
              </p>
              
              <div className="space-y-2">
                {card.symptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.has(symptom.id);
                  return (
                    <button
                      key={symptom.id}
                      onClick={() => toggleSymptom(symptom.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150 ${
                        isSelected 
                          ? 'bg-slate-100 border border-slate-300' 
                          : 'bg-slate-50 border border-transparent hover:bg-slate-100 hover:border-slate-200'
                      }`}
                      data-testid={`symptom-${symptom.id}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-white border-2 border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <span className={`text-sm ${isSelected ? 'text-[#111827] font-medium' : 'text-[#6B7280]'}`}>
                        {symptom.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {totalSelected > 0 && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold">{totalSelected}</span>
            </div>
            <div>
              <p className="font-medium">
                {totalSelected === 1 
                  ? "You identified 1 pattern that resonates." 
                  : `You identified ${totalSelected} patterns that resonate.`
                }
              </p>
              <p className="text-sm text-slate-300">
                This is valuable self-awareness. The next step is understanding what's possible.
              </p>
            </div>
          </div>
        </div>
      )}

      {totalSelected === 0 && (
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-6 border border-slate-200">
          <p className="text-center text-[#374151]">
            <span className="font-semibold">Here's what this adds up to:</span> organizations are leaving 
            <span className="font-bold text-[#EA2C00]"> 30-50% of potential value </span>
            on the table — year after year.
          </p>
        </div>
      )}

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
