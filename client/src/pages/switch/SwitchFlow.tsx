import SwitchUnifiedFlow from "./SwitchUnifiedFlow";

interface SwitchFlowProps {
  onBackToJourney?: () => void;
}

export function SwitchFlow({ onBackToJourney }: SwitchFlowProps) {
  const goBackToJourney = () => onBackToJourney?.();

  return (
    <SwitchUnifiedFlow
      onBack={goBackToJourney}
      onBackToJourney={goBackToJourney}
    />
  );
}
