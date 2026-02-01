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
    setSelectionState({ 
      selectedSettings: ['outpatient'], 
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
    
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const visitsEnabled = patientAccessHours / 0.5;
    const patientAccessValue = Math.round(visitsEnabled * 200);

    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const locumValue = Math.round(locumHours * 150);

    const wellbeingPct = state.timeAllocation.clinicianWellbeing / 100;
    const retentionValue = Math.round(state.numberOfProviders * 0.15 * wellbeingPct * 0.2 * 250000);

    let docValue = 0;
    const baseWrvu = 1.5;
    if (state.docPathFocus === 'wrvu') {
      const wrvuLift = baseWrvu * (state.wrvuPctIncrease / 100);
      docValue = Math.round(wrvuLift * eligibleEncounters * 40);
    } else if (state.docPathFocus === 'hcc') {
      const maPatients = eligibleEncounters * 0.3;
      const conditionsCaptured = maPatients * 3 * (state.hccPctRecaptured / 100);
      docValue = Math.round(conditionsCaptured * 800);
    } else if (state.docPathFocus === 'denials') {
      const denials = eligibleEncounters * 0.08;
      const denialsFromDoc = denials * 0.5;
      const denialsRecovered = denialsFromDoc * (state.denialsPctReduced / 100);
      docValue = Math.round(denialsRecovered * 250);
    }

    const totalBenefit = patientAccessValue + locumValue + retentionValue + docValue;

    const driverResults: Record<string, { id: string; name: string; value: number; inputs: Record<string, number | string | boolean> }> = {};
    
    if (state.timeAllocation.patientAccess > 0) {
      driverResults['patientAccess'] = {
        id: 'patientAccess',
        name: 'Patient Access',
        value: patientAccessValue,
        inputs: { allocatedHours: patientAccessHours },
      };
    }
    
    if (state.timeAllocation.reducingLocums > 0) {
      driverResults['overtime'] = {
        id: 'overtime',
        name: 'Locum Cost Reduction',
        value: locumValue,
        inputs: { allocatedHours: locumHours },
      };
    }
    
    if (state.timeAllocation.clinicianWellbeing > 0) {
      driverResults['workforce'] = {
        id: 'workforce',
        name: 'Clinician Retention',
        value: retentionValue,
        inputs: { wellbeingPct },
      };
    }

    if (state.docPathFocus === 'wrvu') {
      driverResults['wrvu'] = {
        id: 'wrvu',
        name: 'Level of Service (wRVU)',
        value: docValue,
        inputs: { pctIncrease: state.wrvuPctIncrease },
      };
    } else if (state.docPathFocus === 'hcc') {
      driverResults['hcc'] = {
        id: 'hcc',
        name: 'HCC Capture',
        value: docValue,
        inputs: { pctRecaptured: state.hccPctRecaptured },
      };
    } else if (state.docPathFocus === 'denials') {
      driverResults['denials'] = {
        id: 'denials',
        name: 'Denial Prevention',
        value: docValue,
        inputs: { pctReduced: state.denialsPctReduced },
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
