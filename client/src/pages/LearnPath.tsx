import { useState, useEffect } from "react";
import {
  MethodologyFramework,
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
type LearnScreen = "framework" | "home" | "outpatient" | "ed" | "inpatient" | "nursing";

export type { LearnScreen };

export default function LearnPath({ onBack, onStartCalculator, initialScreen }: LearnPathProps) {
  const [currentScreen, setCurrentScreen] = useState<LearnScreen>(initialScreen || "framework");

  // Scroll to top on every screen change (mobile fix)
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [currentScreen]);

  const handleSelectSetting = (setting: CareSettingType) => {
    setCurrentScreen(setting);
  };

  const handleBackToHome = () => {
    setCurrentScreen("framework");
  };

  const handleNavigateToSetting = (setting: string) => {
    setCurrentScreen(setting as LearnScreen);
  };

  // Render the appropriate methodology page based on current screen
  switch (currentScreen) {
    case "outpatient":
      return <MethodologyOutpatient onBack={handleBackToHome} onHome={onBack} onNavigateToSetting={handleNavigateToSetting} onBuildModel={() => onStartCalculator?.("outpatient")} />;
    case "ed":
      return <MethodologyED onBack={handleBackToHome} onHome={onBack} onNavigateToSetting={handleNavigateToSetting} onBuildModel={() => onStartCalculator?.("ed")} />;
    case "inpatient":
      return <MethodologyInpatient onBack={handleBackToHome} onHome={onBack} onNavigateToSetting={handleNavigateToSetting} onBuildModel={() => onStartCalculator?.("inpatient")} />;
    case "nursing":
      return <MethodologyNursing onBack={handleBackToHome} onHome={onBack} onNavigateToSetting={handleNavigateToSetting} onBuildModel={() => onStartCalculator?.("nursing")} />;
    case "framework":
    case "home":
    default:
      return (
        <MethodologyFramework
          onBack={onBack}
          onSelectSetting={handleSelectSetting}
        />
      );
  }
}
