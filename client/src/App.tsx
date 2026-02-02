import { useState, useCallback, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionSecurityProvider } from "@/contexts/SessionSecurityContext";
import { PageTransition } from "@/components/PageTransition";

function usePreventNumberInputScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        target.blur();
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);
}

import SplashScreen from "@/pages/SplashScreen";
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
import MeasureFlow from "@/pages/measure/MeasureFlow";
import { ExploreFlow, type ExploreState } from "@/pages/explore";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "splash" | "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn" | "measure";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

export default function App() {
  usePreventNumberInputScroll();
  
  const [currentView, setCurrentView] = useState<AppView>("splash");

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedSettings: [],
    selectedLevers: [],
  });

  const [seedInputs, setSeedInputs] = useState<Partial<RoiInputs>>({});
  const [baselineInfo, setBaselineInfo] = useState<BaselineInfo | null>(null);
  const [valueResults, setValueResults] = useState<ValueResults | null>(null);
  const [modelResults, setModelResults] = useState<ModelResults | null>(null);
  const [exploreState, setExploreState] = useState<ExploreState | null>(null);

  const handleSessionClear = useCallback(() => {
    setSelectionState({ selectedSettings: [], selectedLevers: [] });
    setSeedInputs({});
    setBaselineInfo(null);
    setValueResults(null);
    setModelResults(null);
    setExploreState(null);
    setCurrentView("splash");
  }, []);

  const handleExploreComplete = useCallback((state: ExploreState) => {
    setExploreState(state);
    // Map the ExploreState careSetting to CareSettingType for selectedSettings
    const careSetting = state.careSetting === 'ed' ? 'ed' : 
                        state.careSetting === 'nursing' ? 'nursing' : 
                        state.careSetting === 'inpatient' ? 'inpatient' : 'outpatient';
    setSelectionState({ 
      selectedSettings: [careSetting] as CareSettingType[], 
      selectedLevers: [] 
    });
    setSeedInputs({
      numberOfProviders: state.numberOfProviders,
      annualOutpatientEncounters: state.annualEncounters,
      abridgeUtilizationPct: state.utilizationPercent,
      minutesSavedPerEncounter: state.minutesSavedPerEncounter,
    });
    
    const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));
    const totalHoursSaved = Math.round((eligibleEncounters * state.minutesSavedPerEncounter) / 60);
    
    // Use pre-calculated values from ExploreDocDrivers when available
    const calc = state.calculatedValues;
    
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const wellbeingPct = state.timeAllocation.clinicianWellbeing / 100;
    
    // Use pre-calculated values if available, otherwise fall back to basic calculation
    const patientAccessValue = calc?.driverBreakdown.patientAccess ?? Math.round((patientAccessHours / 0.5) * 200 * 0.15);
    const locumValue = calc?.driverBreakdown.locums ?? Math.round(locumHours * 150 * 0.60);
    const retentionValue = calc?.driverBreakdown.retention ?? Math.round(state.numberOfProviders * 0.08 * 0.04 * 250000);
    
    const wrvuValue = calc?.driverBreakdown.wrvu ?? 0;
    const hccValue = calc?.driverBreakdown.hcc ?? 0;
    const denialsValue = calc?.driverBreakdown.denials ?? 0;
    
    const docValue = wrvuValue + hccValue + denialsValue;
    const totalBenefit = patientAccessValue + locumValue + retentionValue + docValue;

    const driverResults: Record<string, { id: string; name: string; value: number; inputs: Record<string, number | string | boolean> }> = {};
    
    if (state.timeAllocation.patientAccess > 0 && patientAccessValue > 0) {
      driverResults['patientAccess'] = {
        id: 'patientAccess',
        name: 'Patient Access',
        value: patientAccessValue,
        inputs: { allocatedHours: patientAccessHours },
      };
    }
    
    if (state.timeAllocation.reducingLocums > 0 && locumValue > 0) {
      driverResults['overtime'] = {
        id: 'overtime',
        name: 'Locum Cost Reduction',
        value: locumValue,
        inputs: { allocatedHours: locumHours },
      };
    }
    
    if (state.timeAllocation.clinicianWellbeing > 0 && retentionValue > 0) {
      driverResults['workforce'] = {
        id: 'workforce',
        name: 'Clinician Retention',
        value: retentionValue,
        inputs: { wellbeingPct },
      };
    }

    if (state.docDrivers.wrvu.enabled && wrvuValue > 0) {
      driverResults['wrvu'] = {
        id: 'wrvu',
        name: 'Level of Service (wRVU)',
        value: wrvuValue,
        inputs: { pctIncrease: state.docDrivers.wrvu.value },
      };
    }
    
    // HCC not applicable for ED
    if (state.careSetting !== 'ed' && state.docDrivers.hcc.enabled && hccValue > 0) {
      driverResults['hcc'] = {
        id: 'hcc',
        name: 'HCC Capture',
        value: hccValue,
        inputs: { pctRecaptured: state.docDrivers.hcc.value },
      };
    }
    
    if (state.docDrivers.denials.enabled && denialsValue > 0) {
      driverResults['denials'] = {
        id: 'denials',
        name: 'Denial Prevention',
        value: denialsValue,
        inputs: { pctReduced: state.docDrivers.denials.value },
      };
    }

    setValueResults({
      providers: state.numberOfProviders,
      encounters: state.annualEncounters,
      utilizationRate: state.utilizationPercent,
      eligibleEncounters,
      driverResults,
      totalBenefit,
    });

    navigateTo("investment");
  }, []);

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionSecurityProvider onSessionClear={handleSessionClear}>
          <TooltipProvider>
            <Toaster />

            <PageTransition pageKey={currentView}>
            {currentView === "splash" && (
              <SplashScreen onEnter={() => navigateTo("journey")} />
            )}

            {currentView === "journey" && (
              <JourneySelector
                onSelectExplore={() => {
                  // Reset explore state to start fresh
                  setSelectionState({ selectedSettings: [], selectedLevers: [] });
                  setSeedInputs({});
                  setBaselineInfo(null);
                  setValueResults(null);
                  setModelResults(null);
                  navigateTo("explore");
                }}
                onSelectExpand={() => navigateTo("measure")}
                onSelectSwitch={() => navigateTo("switch")}
                onSelectLearn={() => navigateTo("learn")}
              />
            )}

            {currentView === "explore" && (
              <ExploreFlow
                onBackToJourney={handleBackToJourney}
                onContinueToInvestment={handleExploreComplete}
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
                seedInputs={seedInputs}
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
              <SwitchFlow 
                onBackToJourney={handleBackToJourney} 
                onExploreAmbientAI={(providers, encounters) => {
                  setSeedInputs({ 
                    numberOfProviders: providers, 
                    annualOutpatientEncounters: encounters 
                  });
                  navigateTo("explore");
                }}
              />
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

            {currentView === "measure" && (
              <MeasureFlow onBackToJourney={() => navigateTo("journey")} />
            )}
            </PageTransition>
          </TooltipProvider>
        </SessionSecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
