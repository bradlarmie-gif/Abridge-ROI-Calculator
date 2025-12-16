import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ObjectiveSelectionScreen, { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import RoiCalculator from "@/pages/RoiCalculator";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";

interface CalculatorState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

function App() {
  const [calculatorState, setCalculatorState] = useState<CalculatorState | null>(null);

  const handleSelectionComplete = (selectedSettings: CareSettingType[], selectedLevers: SelectedLever[]) => {
    setCalculatorState({ selectedSettings, selectedLevers });
  };

  const handleBack = () => {
    setCalculatorState(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {calculatorState ? (
          <RoiCalculator
            selectedSettings={calculatorState.selectedSettings}
            selectedLevers={calculatorState.selectedLevers}
            onBack={handleBack}
          />
        ) : (
          <ObjectiveSelectionScreen onComplete={handleSelectionComplete} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
