import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ObjectiveSelectionScreen from "@/pages/ObjectiveSelectionScreen";
import RoiCalculator from "@/pages/RoiCalculator";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";

interface CalculatorState {
  setting: CareSettingType;
  selectedLevers: string[];
}

function App() {
  const [calculatorState, setCalculatorState] = useState<CalculatorState | null>(null);

  const handleSelectionComplete = (setting: CareSettingType, selectedLevers: string[]) => {
    setCalculatorState({ setting, selectedLevers });
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
            setting={calculatorState.setting}
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
