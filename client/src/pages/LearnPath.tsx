import { useState, useEffect } from "react";
import { MethodologyEditorialFor } from "./methodology/editorial/MethodologyEditorial";
import MethodologyContinuum from "./methodology/editorial/MethodologyContinuum";

interface LearnPathProps {
  onBack: () => void;
  onStartCalculator?: (setting: CareSettingType) => void;
  initialScreen?: LearnScreen;
}

type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
// "framework"/"home" are kept for back-compat with existing deep links; both now
// resolve to the default setting page since the dark hub has been retired.
type LearnScreen = "framework" | "home" | "continuum" | "outpatient" | "ed" | "inpatient" | "nursing";

export type { LearnScreen };

const SETTINGS: CareSettingType[] = ["outpatient", "ed", "inpatient", "nursing"];

export default function LearnPath({ onBack, onStartCalculator, initialScreen }: LearnPathProps) {
  // Land directly on a setting; the switcher moves between settings and the
  // continuum capstone. Legacy "framework"/"home" entries fall through to it.
  const resolveInitial = (s?: LearnScreen): LearnScreen =>
    s && (SETTINGS.includes(s as CareSettingType) || s === "continuum") ? s : "outpatient";
  const [currentScreen, setCurrentScreen] = useState<LearnScreen>(resolveInitial(initialScreen));

  // Scroll to top on every screen change (mobile fix)
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [currentScreen]);

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as LearnScreen);
  };

  if (currentScreen === "continuum") {
    return <MethodologyContinuum onBack={onBack} onHome={onBack} onNavigate={handleNavigate} />;
  }

  const setting = (SETTINGS.includes(currentScreen as CareSettingType) ? currentScreen : "outpatient") as CareSettingType;
  return (
    <MethodologyEditorialFor
      setting={setting}
      onBack={onBack}
      onHome={onBack}
      onNavigateToSetting={handleNavigate}
      onBuildModel={() => onStartCalculator?.(setting)}
    />
  );
}
