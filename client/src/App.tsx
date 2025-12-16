import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ObjectiveSelectionScreen, { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import RoiCalculator from "@/pages/RoiCalculator";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

function App() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedSettings: [],
    selectedLevers: [],
  });

  const handleSelectionComplete = (selectedSettings: CareSettingType[], selectedLevers: SelectedLever[]) => {
    setSelectionState({ selectedSettings, selectedLevers });
    setShowCalculator(true);
  };

  const handleBack = () => {
    setShowCalculator(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {showCalculator && selectionState.selectedSettings.length > 0 ? (
          <RoiCalculator
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            onBack={handleBack}
          />
        ) : (
          <ObjectiveSelectionScreen 
            onComplete={handleSelectionComplete}
            initialSelectedSettings={selectionState.selectedSettings}
            initialSelectedLevers={selectionState.selectedLevers}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
