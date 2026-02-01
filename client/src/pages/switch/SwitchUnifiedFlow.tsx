import { useState, useCallback } from "react";
import SwitchPathSelection from "./SwitchPathSelection";
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

type FlowPhase = "path-selection" | "ambient-flow" | "scribe-assessment" | "scribe-analysis";

export default function SwitchUnifiedFlow({ onBack, onBackToJourney, onExploreAmbientAI }: SwitchUnifiedFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>("path-selection");
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  
  const [ambientInputs, setAmbientInputs] = useState<SwitchInputs>({
    solution: "ambient-ai" as SolutionType,
    providers: 0,
    annualEncounters: 0,
    currentCostPerProvider: 200,
    utilization: 0,
    timeSavedPerEncounter: 0,
    wrvuLift: 0,
    satisfaction: 0,
    afterHoursPerWeek: 0,
  });

  const [scribeInputs, setScribeInputs] = useState<ScribeInputs>({
    scribeCount: 0,
    scribeCostPerHour: 0,
    scribeHoursPerWeek: 0,
    providersWithScribes: 0,
    totalProviders: 0,
    annualEncounters: 0,
    minutesPerEncounter: 10,
  });

  const handleSelectPath = (path: "ambient-ai" | "human-scribes") => {
    if (path === "ambient-ai") {
      setPhase("ambient-flow");
    } else {
      setPhase("scribe-assessment");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAmbientInputsChange = (newInputs: React.SetStateAction<SwitchInputs>) => {
    setAmbientInputs(prev => {
      const updated = typeof newInputs === 'function' ? newInputs(prev) : newInputs;
      return updated;
    });
  };

  const handleScribeNext = () => {
    setShowLoadingOverlay(true);
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    setPhase("scribe-analysis");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackToPathSelection = () => {
    setPhase("path-selection");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromScribeAnalysis = () => {
    setPhase("scribe-assessment");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageContent = () => {
    switch (phase) {
      case "path-selection":
        return (
          <SwitchPathSelection
            onSelectPath={handleSelectPath}
            onBack={onBack}
          />
        );
      
      case "ambient-flow":
        return (
          <AmbientNarrativeFlow
            inputs={ambientInputs}
            setInputs={handleAmbientInputsChange}
            onBack={handleBackToPathSelection}
            onBackToJourney={onBackToJourney}
            onNavigateToExplore={onExploreAmbientAI}
          />
        );
      
      case "scribe-assessment":
        return (
          <ScribeAssessment
            inputs={scribeInputs}
            setInputs={setScribeInputs}
            onNext={handleScribeNext}
            onBack={handleBackToPathSelection}
            onBackToJourney={onBackToJourney}
          />
        );
      
      case "scribe-analysis":
        return (
          <ScribeFullAnalysis
            inputs={scribeInputs}
            onBack={handleBackFromScribeAnalysis}
            onBackToJourney={onBackToJourney}
            onExploreAmbientAI={onExploreAmbientAI}
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
      <PageTransition pageKey={`switch-${phase}`}>
        {getPageContent()}
      </PageTransition>
    </>
  );
}
