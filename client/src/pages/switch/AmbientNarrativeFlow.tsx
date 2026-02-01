import { useState, useCallback, useMemo } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { BrandedLoadingOverlay } from "@/components/BrandedLoadingOverlay";
import { 
  calculateSwitchGap, 
  type SwitchInputs 
} from "@/lib/switchGapCalculator";
import StepWhereYouAre from "./narrative-steps/StepWhereYouAre";
import StepTheGap from "./narrative-steps/StepTheGap";
import StepWhyThisHappens from "./narrative-steps/StepWhyThisHappens";
import StepWhatGoodLooksLike from "./narrative-steps/StepWhatGoodLooksLike";
import StepTheMath from "./narrative-steps/StepTheMath";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const STEPS = [
  { id: 1, name: "Where You Are", shortName: "Input" },
  { id: 2, name: "The Gap", shortName: "Gap" },
  { id: 3, name: "What Good Looks Like", shortName: "Proof" },
  { id: 4, name: "The Math", shortName: "Math" },
  { id: 5, name: "What It Takes", shortName: "How" },
  { id: 6, name: "The Invitation", shortName: "Next" },
];

export default function AmbientNarrativeFlow({
  inputs,
  setInputs,
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: AmbientNarrativeFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  const canProceedFromStep1 = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0 &&
    (inputs.utilization > 0 || inputs.timeSavedPerEncounter > 0 || inputs.wrvuLift > 0 || inputs.satisfaction > 0);

  const goToStep = (step: number) => {
    if (step < 1 || step > 6) return;
    if (step > currentStep && !canProceedFromStep1 && currentStep === 1) return;
    
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromStep1) return;
    
    // Show loading overlay before the final step
    if (currentStep === 5) {
      setShowLoadingOverlay(true);
    } else {
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.add(currentStep);
        return newSet;
      });
      goToStep(currentStep + 1);
    }
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(5);
      return newSet;
    });
    setCurrentStep(6);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      goToStep(currentStep - 1);
    }
  };

  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center mb-6 md:mb-8 overflow-x-auto px-2">
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.has(step.id);
        const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1);
        
        return (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <button
              onClick={() => isAccessible && goToStep(step.id)}
              disabled={!isAccessible}
              className={`flex items-center justify-center gap-1 min-w-[28px] md:min-w-auto px-2 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                isActive 
                  ? "bg-[#EA2C00] text-white" 
                  : isCompleted 
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : isAccessible
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-slate-50 text-slate-400 cursor-not-allowed"
              }`}
              data-testid={`step-indicator-${step.id}`}
            >
              {isCompleted && !isActive ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center text-xs font-semibold">
                  {step.id}
                </span>
              )}
              <span className="hidden md:inline">{step.shortName}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`w-5 md:w-8 h-0.5 flex-shrink-0 ${
                completedSteps.has(step.id) ? "bg-emerald-300" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    const commonProps = {
      inputs,
      updateInput,
      calculations,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return (
          <StepWhereYouAre 
            {...commonProps} 
            canProceed={canProceedFromStep1}
            onNavigateToExplore={onNavigateToExplore}
          />
        );
      case 2:
        return <StepTheGap {...commonProps} />;
      case 3:
        return <StepWhatGoodLooksLike {...commonProps} />;
      case 4:
        return <StepTheMath {...commonProps} />;
      case 5:
        return <StepWhyThisHappens {...commonProps} />;
      case 6:
        return (
          <StepTheInvitation 
            {...commonProps} 
            onBackToJourney={onBackToJourney}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <BrandedLoadingOverlay 
        isVisible={showLoadingOverlay} 
        onComplete={handleLoadingComplete}
      />
      <div className="min-h-screen bg-[#f8fafc]">
        <UnifiedHeader 
          pathType="switch"
          currentStep={currentStep} 
          totalSteps={6}
          stepName={STEPS[currentStep - 1]?.name || ""}
          onBack={handleBack}
          onHome={onBackToJourney}
        />
        <UnifiedHeaderSpacer />

        <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16">
          {renderProgressIndicator()}
          
          <PageTransition pageKey={`narrative-step-${currentStep}`}>
            {renderStep()}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
