import { useState, useCallback } from "react";
import SwitchAssessment from "./SwitchAssessment";
import SwitchFullAnalysis from "./SwitchFullAnalysis";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [solutionType, setSolutionType] = useState<SolutionType>("ambient-ai");
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

  const goNext = () => {
    setShowLoadingOverlay(true);
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    setCurrentStep(2);
    window.scrollTo(0, 0);
  }, []);

  const goBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep(1);
      window.scrollTo(0, 0);
    }
  };

  // Determine which component to render
  const getPageContent = () => {
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
