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
  initialScreen?: LearnScreen;
}

type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
type LearnScreen = "home" | "outpatient" | "ed" | "inpatient" | "nursing";

export type { LearnScreen };

export default function LearnPath({ onBack, initialScreen }: LearnPathProps) {
  const [currentScreen, setCurrentScreen] = useState<LearnScreen>(initialScreen || "home");

  const handleSelectSetting = (setting: CareSettingType) => {
    setCurrentScreen(setting);
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  const handleNavigateToSetting = (setting: string) => {
    setCurrentScreen(setting as LearnScreen);
  };

  // Render the appropriate methodology page based on current screen
  switch (currentScreen) {
    case "outpatient":
      return <MethodologyOutpatient onBack={handleBackToHome} onNavigateToSetting={handleNavigateToSetting} />;
    case "ed":
      return <MethodologyED onBack={handleBackToHome} onNavigateToSetting={handleNavigateToSetting} />;
    case "inpatient":
      return <MethodologyInpatient onBack={handleBackToHome} onNavigateToSetting={handleNavigateToSetting} />;
    case "nursing":
      return <MethodologyNursing onBack={handleBackToHome} onNavigateToSetting={handleNavigateToSetting} />;
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
