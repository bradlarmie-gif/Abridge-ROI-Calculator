import { useState } from "react";
import {
  MethodologyHome,
  MethodologyOutpatient,
  MethodologyED,
  MethodologyInpatient,
  MethodologyNursing,
} from "./methodology";

interface LearnPathProps {
  onBack: () => void;
  onStartCalculator?: (setting: CareSettingType) => void;
}

type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
type LearnScreen = "home" | "outpatient" | "ed" | "inpatient" | "nursing";

export default function LearnPath({ onBack }: LearnPathProps) {
  const [currentScreen, setCurrentScreen] = useState<LearnScreen>("home");

  const handleSelectSetting = (setting: CareSettingType) => {
    setCurrentScreen(setting);
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  // Render the appropriate methodology page based on current screen
  switch (currentScreen) {
    case "outpatient":
      return <MethodologyOutpatient onBack={handleBackToHome} />;
    case "ed":
      return <MethodologyED onBack={handleBackToHome} />;
    case "inpatient":
      return <MethodologyInpatient onBack={handleBackToHome} />;
    case "nursing":
      return <MethodologyNursing onBack={handleBackToHome} />;
    case "home":
    default:
      return (
        <MethodologyHome
          onBack={onBack}
          onSelectSetting={handleSelectSetting}
        />
      );
  }
}
