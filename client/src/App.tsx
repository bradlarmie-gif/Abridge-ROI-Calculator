import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import { queryClient } from "./lib/queryClient";

import ObjectiveSelectionScreen, {
  type SelectedLever,
} from "@/pages/ObjectiveSelectionScreen";
import RoiCalculator from "@/pages/RoiCalculator";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

export default function App() {
  const [showCalculator, setShowCalculator] = useState(false);

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedSettings: [],
    selectedLevers: [],
  });

  const [seedInputs, setSeedInputs] = useState<Partial<RoiInputs>>({});

  /**
   * Supports either:
   * onComplete(selectedSettings, selectedLevers)
   * OR
   * onComplete(selectedSettings, selectedLevers, seedInputs)
   */
  const handleSelectionComplete = (
    selectedSettings: CareSettingType[],
    selectedLevers: SelectedLever[],
    seed: Partial<RoiInputs> = {},
  ) => {
    setSelectionState({ selectedSettings, selectedLevers });
    setSeedInputs(seed);
    setShowCalculator(true);
  };

  const handleBack = () => {
    setShowCalculator(false);
  };

  const hasSelection = selectionState.selectedSettings.length > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />

        {showCalculator && hasSelection ? (
          <RoiCalculator
            selectedSettings={selectionState.selectedSettings}
            selectedLevers={selectionState.selectedLevers}
            seedInputs={seedInputs}
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
