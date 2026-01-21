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
import InvestmentPage from "@/pages/InvestmentPage";
import SummaryCommandCenter from "@/pages/SummaryCommandCenter";
import { ExpandFlow } from "@/pages/expand";
import { SwitchFlow } from "@/pages/switch";
import LearnPath from "@/pages/LearnPath";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "journey" | "explore" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("journey");

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedSettings: [],
    selectedLevers: [],
  });

  const [seedInputs, setSeedInputs] = useState<Partial<RoiInputs>>({});
  const [valueResults, setValueResults] = useState<ValueResults | null>(null);
  const [modelResults, setModelResults] = useState<ModelResults | null>(null);
  const handleSelectionComplete = (
    selectedSettings: CareSettingType[],
    selectedLevers: SelectedLever[],
    seed: Partial<RoiInputs> = {},
  ) => {
    setSelectionState({ selectedSettings, selectedLevers });
    setSeedInputs(seed);
    setCurrentView("model-builder");
  };

  const handleValueComplete = (results: ValueResults) => {
    setValueResults(results);
    setCurrentView("investment");
  };

  const handleInvestmentComplete = (results: ModelResults) => {
    setModelResults(results);
    setCurrentView("calculator");
  };

  const handleBackToValue = () => {
    setCurrentView("model-builder");
  };

  const handleBackToExplore = () => {
    setCurrentView("explore");
  };

  const handleBackToModelBuilder = () => {
    setCurrentView("model-builder");
  };

  const handleBackToJourney = () => {
    setCurrentView("journey");
  };

  const hasSelection = selectionState.selectedSettings.length > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />

        {currentView === "journey" && (
          <JourneySelector
            onSelectExplore={() => setCurrentView("explore")}
            onSelectExpand={() => setCurrentView("expand")}
            onSelectSwitch={() => setCurrentView("switch")}
            onSelectLearn={() => setCurrentView("learn")}
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

        {currentView === "model-builder" && hasSelection && (
          <ModelBuilder
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            onBack={handleBackToExplore}
            onComplete={handleValueComplete}
            initialResults={valueResults}
          />
        )}

        {currentView === "investment" && hasSelection && valueResults && (
          <InvestmentPage
            selectedSettings={selectionState.selectedSettings}
            valueResults={valueResults}
            onBack={handleBackToValue}
            onComplete={handleInvestmentComplete}
          />
        )}

        {currentView === "calculator" && hasSelection && modelResults && (
          <SummaryCommandCenter
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            modelResults={modelResults}
            onBack={handleBackToModelBuilder}
            onEditModel={handleBackToModelBuilder}
          />
        )}

        {currentView === "expand" && (
          <ExpandFlow 
            onBackToJourney={handleBackToJourney}
            onGoToExplore={() => setCurrentView("explore")}
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
              setCurrentView("explore");
            }}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
