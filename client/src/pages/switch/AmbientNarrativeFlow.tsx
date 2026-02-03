import { useState, useCallback, useMemo } from "react";
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
    <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.has(step.id);
        
        return (
          <button
            key={step.id}
            onClick={() => (isCompleted || step.id <= currentStep) && goToStep(step.id)}
            disabled={step.id > currentStep && !isCompleted}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isActive 
                ? "bg-[#EA2C00] scale-125" 
                : isCompleted 
                  ? "bg-[#EA2C00]/40 hover:bg-[#EA2C00]/60"
                  : "bg-[#D1D5DB] cursor-not-allowed"
            }`}
            data-testid={`step-indicator-${step.id}`}
            aria-label={`Step ${step.id}: ${step.name}`}
          />
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
      <div className="min-h-screen bg-white">
        <UnifiedHeader 
          pathType="switch"
          currentStep={currentStep} 
          totalSteps={6}
          stepName={STEPS[currentStep - 1]?.name || ""}
          onBack={handleBack}
          onHome={onBackToJourney}
        />
        <UnifiedHeaderSpacer />

        <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16">
          <PageTransition pageKey={`narrative-step-${currentStep}`}>
            {renderStep()}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
