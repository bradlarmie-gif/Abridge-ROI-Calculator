import { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, Mic, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import ScribeAssessment from "./ScribeAssessment";
import ScribeFullAnalysis from "./ScribeFullAnalysis";
import AmbientNarrativeFlow from "./AmbientNarrativeFlow";
import { type SwitchInputs, type SolutionType } from "@/lib/switchGapCalculator";
import { type ScribeInputs } from "@/lib/scribeGapCalculator";
import { PageTransition } from "@/components/PageTransition";
import { BrandedLoadingOverlay } from "@/components/BrandedLoadingOverlay";

interface SwitchUnifiedFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export default function SwitchUnifiedFlow({ onBack, onBackToJourney, onExploreAmbientAI }: SwitchUnifiedFlowProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = solution selection
  const [solutionType, setSolutionType] = useState<SolutionType | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  
  // Start with empty dimension values - customer fills in their actual numbers
  const [ambientInputs, setAmbientInputs] = useState<SwitchInputs>({
    solution: "ambient-ai" as SolutionType,
    providers: 0,
    annualEncounters: 0,
    currentCostPerProvider: 200,
    utilization: 0,  // Empty start - will show placeholder
    timeSavedPerEncounter: 0,  // Empty start
    wrvuLift: 0,  // Empty start
    satisfaction: 0,  // Empty start
    afterHoursPerWeek: 0,  // Empty start - hours/week documenting after clinic
  });

  const [scribeInputs, setScribeInputs] = useState<ScribeInputs>({
    scribeCount: 10,
    scribeCostPerHour: 25,
    scribeHoursPerWeek: 40,
    providersWithScribes: 15,
    totalProviders: 200,
    annualEncounters: 400000,
  });

  const handleAmbientInputsChange = (newInputs: React.SetStateAction<SwitchInputs>) => {
    setAmbientInputs(prev => {
      const updated = typeof newInputs === 'function' ? newInputs(prev) : newInputs;
      if (updated.solution !== solutionType) {
        setSolutionType(updated.solution);
      }
      return updated;
    });
  };

  const goToAssessment = () => {
    if (!solutionType) return;
    setCurrentStep(1);
    window.scrollTo(0, 0);
  };

  const goNext = () => {
    setShowLoadingOverlay(true);
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    setCurrentStep(2);
    window.scrollTo(0, 0);
  }, []);

  const goBack = () => {
    if (currentStep === 0) {
      onBack();
    } else if (currentStep === 1) {
      setCurrentStep(0);
      window.scrollTo(0, 0);
    } else {
      setCurrentStep(1);
      window.scrollTo(0, 0);
    }
  };

  // Solution selection screen
  const renderSolutionSelection = () => (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={1}
        totalSteps={2}
        stepName="Select Solution"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-2xl mx-auto px-6 py-6 md:py-8 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            What solution are you using today?
          </h1>
          <p className="text-slate-500">
            We'll show you what you might be leaving on the table.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => setSolutionType("ambient-ai")}
            className={`w-full p-5 rounded-xl border-2 transition-all text-left relative ${
              solutionType === "ambient-ai"
                ? "border-slate-800 bg-white shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            data-testid="button-solution-ambient-ai"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  solutionType === "ambient-ai"
                    ? "bg-slate-800/10 text-slate-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Ambient AI</h3>
                <p className="text-sm text-slate-500 mt-0.5">Currently using DAX, Ambience, Suki, or similar</p>
              </div>
              {solutionType === "ambient-ai" && (
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => setSolutionType("human-scribes")}
            className={`w-full p-5 rounded-xl border-2 transition-all text-left relative ${
              solutionType === "human-scribes"
                ? "border-slate-800 bg-white shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
            data-testid="button-solution-human-scribes"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  solutionType === "human-scribes"
                    ? "bg-slate-800/10 text-slate-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">Human Scribes</h3>
                <p className="text-sm text-slate-500 mt-0.5">In-person or virtual scribes</p>
              </div>
              {solutionType === "human-scribes" && (
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            size="lg"
            onClick={goToAssessment}
            disabled={!solutionType}
            className={solutionType ? "bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2" : "gap-2"}
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );

  // Determine which component to render
  const getPageContent = () => {
    // Step 0: Solution Selection
    if (currentStep === 0) {
      return renderSolutionSelection();
    }

    // Scribe path: Keep the original 2-step flow
    if (solutionType === "human-scribes") {
      if (currentStep === 2) {
        return (
          <ScribeFullAnalysis
            inputs={scribeInputs}
            onBack={goBack}
            onBackToJourney={onBackToJourney}
            onExploreAmbientAI={onExploreAmbientAI}
          />
        );
      }
      return (
        <ScribeAssessment
          inputs={scribeInputs}
          setInputs={setScribeInputs}
          onNext={goNext}
          onBack={goBack}
          onBackToJourney={onBackToJourney}
        />
      );
    }

    // Ambient AI path: Use the new 6-step narrative flow
    return (
      <AmbientNarrativeFlow
        inputs={ambientInputs}
        setInputs={handleAmbientInputsChange}
        onBack={goBack}
        onBackToJourney={onBackToJourney}
        onNavigateToExplore={onExploreAmbientAI}
      />
    );
  };

  // Create a unique key for page transitions
  const pageKey = `switch-${solutionType}-step-${currentStep}`;

  return (
    <>
      <BrandedLoadingOverlay 
        isVisible={showLoadingOverlay} 
        onComplete={handleLoadingComplete}
      />
      <PageTransition pageKey={pageKey}>
        {getPageContent()}
      </PageTransition>
    </>
  );
}
