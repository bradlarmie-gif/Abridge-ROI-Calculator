import SwitchUnifiedFlow from "./SwitchUnifiedFlow";

interface SwitchFlowProps {
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export function SwitchFlow({ onBackToJourney, onExploreAmbientAI }: SwitchFlowProps) {
  const goBackToJourney = () => onBackToJourney?.();

  return (
    <SwitchUnifiedFlow
      onBack={goBackToJourney}
      onBackToJourney={goBackToJourney}
      onExploreAmbientAI={onExploreAmbientAI}
    />
  );
}
