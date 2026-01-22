import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import { queryClient } from "./lib/queryClient";

import JourneySelector from "@/pages/JourneySelector";
import ObjectiveSelectionScreen, {
  type SelectedLever,
} from "@/pages/ObjectiveSelectionScreen";
import RoiCalculator from "@/pages/RoiCalculator";
import ModelBuilder, { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import BaselineSetup, { type BaselineInfo } from "@/pages/BaselineSetup";
import InvestmentPage from "@/pages/InvestmentPage";
import SummaryCommandCenter from "@/pages/SummaryCommandCenter";
import { ExpandFlow } from "@/pages/expand";
import { SwitchFlow } from "@/pages/switch";
import LearnPath from "@/pages/LearnPath";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("journey");

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedSettings: [],
    selectedLevers: [],
  });

  const [seedInputs, setSeedInputs] = useState<Partial<RoiInputs>>({});
  const [baselineInfo, setBaselineInfo] = useState<BaselineInfo | null>(null);
  const [valueResults, setValueResults] = useState<ValueResults | null>(null);
  const [modelResults, setModelResults] = useState<ModelResults | null>(null);

  const handleSelectionComplete = (
    selectedSettings: CareSettingType[],
    selectedLevers: SelectedLever[],
    seed: Partial<RoiInputs> = {},
  ) => {
    setSelectionState({ selectedSettings, selectedLevers });
    setSeedInputs(seed);
    navigateTo("baseline-setup");
  };

  const handleBaselineComplete = (baseline: BaselineInfo) => {
    setBaselineInfo(baseline);
    navigateTo("model-builder");
  };

  const handleBackToBaseline = () => {
    navigateTo("baseline-setup");
  };

  const handleValueComplete = (results: ValueResults) => {
    setValueResults(results);
    navigateTo("investment");
  };

  const handleInvestmentComplete = (results: ModelResults) => {
    setModelResults(results);
    navigateTo("calculator");
  };

  const handleBackToValue = () => {
    navigateTo("model-builder");
  };

  const handleBackToExplore = () => {
    navigateTo("explore");
  };

  const handleBackToModelBuilder = () => {
    navigateTo("model-builder");
  };

  const handleBackToInvestment = () => {
    navigateTo("investment");
  };

  const handleBackToJourney = () => {
    navigateTo("journey");
  };

  const hasSelection = selectionState.selectedSettings.length > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />

        {currentView === "journey" && (
          <JourneySelector
            onSelectExplore={() => navigateTo("explore")}
            onSelectExpand={() => navigateTo("expand")}
            onSelectSwitch={() => navigateTo("switch")}
            onSelectLearn={() => navigateTo("learn")}
          />
        )}

        {currentView === "explore" && (
          <ObjectiveSelectionScreen
            onComplete={handleSelectionComplete}
            initialSelectedSettings={selectionState.selectedSettings}
            initialSelectedLevers={selectionState.selectedLevers}
            onBackToJourney={handleBackToJourney}
          />
        )}

        {currentView === "baseline-setup" && hasSelection && (
          <BaselineSetup
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            onBack={handleBackToExplore}
            onComplete={handleBaselineComplete}
            initialBaseline={baselineInfo}
            onBackToJourney={handleBackToJourney}
          />
        )}

        {currentView === "model-builder" && hasSelection && baselineInfo && (
          <ModelBuilder
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            onBack={handleBackToBaseline}
            onComplete={handleValueComplete}
            initialResults={valueResults}
            initialBaseline={baselineInfo}
            onBackToJourney={handleBackToJourney}
          />
        )}

        {currentView === "investment" && hasSelection && valueResults && (
          <InvestmentPage
            selectedSettings={selectionState.selectedSettings}
            valueResults={valueResults}
            onBack={handleBackToValue}
            onComplete={handleInvestmentComplete}
            onBackToJourney={handleBackToJourney}
          />
        )}

        {currentView === "calculator" && hasSelection && modelResults && (
          <SummaryCommandCenter
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            modelResults={modelResults}
            onBack={handleBackToInvestment}
            onEditModel={handleBackToModelBuilder}
            onBackToJourney={handleBackToJourney}
          />
        )}

        {currentView === "expand" && (
          <ExpandFlow 
            onBackToJourney={handleBackToJourney}
            onGoToExplore={() => navigateTo("explore")}
          />
        )}

        {currentView === "switch" && (
          <SwitchFlow onBackToJourney={handleBackToJourney} />
        )}

        {currentView === "learn" && (
          <LearnPath 
            onBack={handleBackToJourney} 
            onStartCalculator={(setting) => {
              setSelectionState({ selectedSettings: [setting as CareSettingType], selectedLevers: [] });
              navigateTo("explore");
            }}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
