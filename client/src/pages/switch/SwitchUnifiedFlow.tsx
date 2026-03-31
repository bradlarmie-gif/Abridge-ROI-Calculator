import { useState, useCallback, useEffect } from "react";
import SwitchPathSelection from "./SwitchPathSelection";
import ScribeAssessment from "./ScribeAssessment";
import ScribeFullAnalysis from "./ScribeFullAnalysis";
import AmbientNarrativeFlow from "./AmbientNarrativeFlow";
import NursingAssessmentFlow from "./nursing/NursingAssessmentFlow";
import { type ScribeInputs } from "@/lib/scribeGapCalculator";
import { PageTransition } from "@/components/PageTransition";
import { CinematicTransition } from "@/components/CinematicTransition";
import { AssessmentProvider } from "@/lib/assessment";

interface SwitchUnifiedFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

type FlowPhase = "path-selection" | "ambient-flow" | "scribe-assessment" | "scribe-analysis" | "nursing-flow";

export default function SwitchUnifiedFlow({ onBack, onBackToJourney, onExploreAmbientAI }: SwitchUnifiedFlowProps) {
  const [phase, setPhase] = useState<FlowPhase>("path-selection");
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [phase]);

  const [scribeInputs, setScribeInputs] = useState<ScribeInputs>({
    scribeCount: 0,
    scribeCostPerHour: 0,
    scribeHoursPerWeek: 0,
    providersWithScribes: 0,
    totalProviders: 0,
    annualEncounters: 0,
    minutesPerEncounter: 0,
    turnoverRate: 0,
    trainingCostPerScribe: 5000,
  });

  const handleSelectPath = (path: "ambient-ai" | "human-scribes" | "nursing") => {
    if (path === "ambient-ai") {
      setPhase("ambient-flow");
    } else if (path === "nursing") {
      setPhase("nursing-flow");
    } else {
      setPhase("scribe-assessment");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScribeNext = () => {
    setShowLoadingOverlay(true);
  };

  const handleTransitionMidpoint = useCallback(() => {
    setPhase("scribe-analysis");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setShowLoadingOverlay(false);
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
            onBackToJourney={onBackToJourney}
          />
        );
      
      case "ambient-flow":
        return (
          <AssessmentProvider>
            <AmbientNarrativeFlow
              onBack={handleBackToPathSelection}
              onBackToJourney={onBackToJourney}
              onNavigateToExplore={onExploreAmbientAI}
            />
          </AssessmentProvider>
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

      case "nursing-flow":
        return (
          <NursingAssessmentFlow
            onBack={handleBackToPathSelection}
            onBackToJourney={onBackToJourney}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <CinematicTransition 
        isVisible={showLoadingOverlay} 
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
      <PageTransition pageKey={`switch-${phase}`}>
        {getPageContent()}
      </PageTransition>
    </>
  );
}
