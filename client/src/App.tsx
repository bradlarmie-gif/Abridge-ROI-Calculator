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
import LearnPath, { type LearnScreen } from "@/pages/LearnPath";
import MeasureFlow from "@/pages/measure/MeasureFlow";
import { ExploreFlow, type ExploreState, type ExploreCareSetting, type ExplorePhase } from "@/pages/explore";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "splash" | "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn" | "measure";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

// Parse URL for deep linking (called during initialization)
type InitialDeepLink = 
  | { type: 'explore'; careSetting: ExploreCareSetting; phase: ExplorePhase }
  | { type: 'learn'; screen: LearnScreen }
  | { type: 'none' };

function getInitialDeepLink(): InitialDeepLink {
  const params = new URLSearchParams(window.location.search);
  const exploreSetting = params.get('explore');
  const pathname = window.location.pathname;
  
  // Check for explore query parameter (/?explore=outpatient)
  if (exploreSetting) {
    const validSettings: ExploreCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    if (validSettings.includes(exploreSetting as ExploreCareSetting)) {
      // Clear URL parameter immediately
      window.history.replaceState({}, '', pathname);
      return {
        type: 'explore',
        careSetting: exploreSetting as ExploreCareSetting,
        phase: 'practice'
      };
    }
  }
  
  // Check for learn paths (/learn/outpatient, /learn/ed, etc.)
  if (pathname.startsWith('/learn/')) {
    const setting = pathname.replace('/learn/', '');
    const validScreens: LearnScreen[] = ['outpatient', 'ed', 'inpatient', 'nursing', 'home'];
    if (validScreens.includes(setting as LearnScreen)) {
      window.history.replaceState({}, '', '/');
      return {
        type: 'learn',
        screen: setting as LearnScreen
      };
    }
  }
  
  return { type: 'none' };
}

// Compute initial deep link once at module load to determine initial view
const INITIAL_DEEP_LINK = getInitialDeepLink();

export default function App() {
  usePreventNumberInputScroll();
  
  // State for deep link settings
  const [exploreInitialSettings, setExploreInitialSettings] = useState<{
    careSetting?: ExploreCareSetting;
    phase?: ExplorePhase;
  }>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore') {
      return { careSetting: INITIAL_DEEP_LINK.careSetting, phase: INITIAL_DEEP_LINK.phase };
    }
    return {};
  });
  
  const [learnInitialScreen, setLearnInitialScreen] = useState<LearnScreen | undefined>(() => {
    if (INITIAL_DEEP_LINK.type === 'learn') {
      return INITIAL_DEEP_LINK.screen;
    }
    return undefined;
  });
  
  // Determine initial view based on deep link
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore') return "explore";
    if (INITIAL_DEEP_LINK.type === 'learn') return "learn";
    return "splash";
  });
  
  // Track navigation history for browser back button support
  const [viewHistory, setViewHistory] = useState<AppView[]>(["splash"]);

  // Scroll to top on every view change (global mobile fix)
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [currentView]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      // If no view in state, preserve current view (don't force splash)
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize history state
    if (!window.history.state?.view) {
      window.history.replaceState({ view: currentView }, '', window.location.href);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentView]);

  const navigateTo = useCallback((view: AppView) => {
    setCurrentView(view);
    setViewHistory(prev => [...prev, view]);
    // Push to browser history so back button works
    window.history.pushState({ view }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    
    // Patient Access: Calculate all intermediate values for PDF display
    if (state.timeAllocation.patientAccess > 0 && patientAccessValue > 0) {
      const avgVisitLength = 0.5; // 30 min per visit
      const revenuePerVisit = 200;
      const realizationRate = 0.15;
      const potentialVisits = patientAccessHours / avgVisitLength;
      const additionalVisits = Math.round(potentialVisits * realizationRate);
      
      driverResults['patientAccess'] = {
        id: 'patientAccess',
        name: 'Patient Access',
        value: patientAccessValue,
        inputs: { 
          allocatedHours: patientAccessHours,
          allocationPct: state.timeAllocation.patientAccess,
          potentialVisits: Math.round(potentialVisits),
          additionalVisits,
          revenuePerVisit,
          realizationRate: realizationRate * 100,
        },
      };
    }
    
    // Locum Cost Reduction: Calculate intermediate values
    if (state.timeAllocation.reducingLocums > 0 && locumValue > 0) {
      const locumHourlyRate = 150;
      const locumRealization = 0.60;
      const realizedHours = Math.round(locumHours * locumRealization);
      
      driverResults['overtime'] = {
        id: 'overtime',
        name: 'Locum Cost Reduction',
        value: locumValue,
        inputs: { 
          allocatedHours: locumHours,
          allocationPct: state.timeAllocation.reducingLocums,
          locumHourlyRate,
          realizedHours,
          realizationRate: locumRealization * 100,
        },
      };
    }
    
    // Clinician Retention: Calculate intermediate values matching PDF expected fields
    if (state.timeAllocation.clinicianWellbeing > 0 && retentionValue > 0) {
      const wellbeingHours = totalHoursSaved * wellbeingPct;
      const hoursPerProvider = wellbeingHours / Math.max(1, state.numberOfProviders);
      const turnoverRate = 8; // 8% baseline turnover
      const burnoutAttribution = 50; // 50% of departures are burnout-related
      const replacementCost = 250000;
      let retentionLift = 4; // MINIMAL (3-5%)
      if (hoursPerProvider >= 200) retentionLift = 27.5; // MAXIMUM (25-30%)
      else if (hoursPerProvider >= 150) retentionLift = 17.5; // SIGNIFICANT (15-20%)
      else if (hoursPerProvider >= 100) retentionLift = 10; // MODERATE (8-12%)
      
      const annualDepartures = state.numberOfProviders * (turnoverRate / 100);
      const burnoutDepartures = annualDepartures * (burnoutAttribution / 100);
      const departuresAvoided = burnoutDepartures * (retentionLift / 100);
      
      driverResults['workforce'] = {
        id: 'workforce',
        name: 'Clinician Retention',
        value: retentionValue,
        inputs: { 
          wellbeingPct: state.timeAllocation.clinicianWellbeing,
          wellbeingHours,
          hoursPerProvider: Math.round(hoursPerProvider),
          providers: state.numberOfProviders,
          turnoverRate,
          annualDepartures,
          burnoutAttribution,
          burnoutDepartures,
          retentionLift,
          departuresAvoided,
          replacementCost,
        },
      };
    }

    // wRVU: Calculate all intermediate values for PDF
    if (state.docDrivers.wrvu.enabled && wrvuValue > 0) {
      const avgWrvuPerEncounter = 1.5;
      const wrvuImprovementRate = state.docDrivers.wrvu.value;
      const conversionFactor = 33;
      const realizationRate = 75;
      const baselineWrvus = Math.round(eligibleEncounters * avgWrvuPerEncounter);
      const wrvuGain = Math.round(baselineWrvus * (wrvuImprovementRate / 100));
      
      driverResults['wrvu'] = {
        id: 'wrvu',
        name: 'Level of Service (wRVU)',
        value: wrvuValue,
        inputs: { 
          pctIncrease: wrvuImprovementRate,
          avgWrvuPerEncounter,
          baselineWrvus,
          wrvuImprovementRate,
          wrvuGain,
          conversionFactor,
          realizationRate,
        },
      };
    }
    
    // HCC not applicable for ED - matching PDF expected field names
    if (state.careSetting !== 'ed' && state.docDrivers.hcc.enabled && hccValue > 0) {
      const maPercentage = 30;
      const gapRate = 33;
      const avgMissedHccs = 1.5;
      const rafImpact = 0.4;
      const annualPayment = 12000;
      const realizationRate = 50;
      const captureRate = state.docDrivers.hcc.value; // User-configurable capture rate
      const panelSize = state.numberOfProviders * 1500;
      const patientsWithGaps = Math.round(panelSize * (maPercentage / 100) * (gapRate / 100));
      const capturedHccs = Math.round(patientsWithGaps * avgMissedHccs * (captureRate / 100));
      const rafValue = Math.round(rafImpact * annualPayment);
      
      driverResults['hcc'] = {
        id: 'hcc',
        name: 'HCC Capture',
        value: hccValue,
        inputs: { 
          pctRecaptured: captureRate,
          maPercentage,
          gapRate,
          patientsWithGaps,
          avgMissedHccs,
          captureRate,
          capturedHccs,
          rafValue,
          realizationRate,
        },
      };
    }
    
    // Denials Prevention: Calculate intermediate values matching PDF expected fields
    if (state.docDrivers.denials.enabled && denialsValue > 0) {
      const denialRate = 8; // 8% baseline denial rate
      const docRelatedPercent = 50; // 50% of denials are doc-related
      const writtenOffPercent = 45; // 45% of doc-related are written off
      const abridgeCaptureRate = state.docDrivers.denials.value; // User-configurable
      const avgClaimValue = 250;
      
      const totalDenials = Math.round(eligibleEncounters * (denialRate / 100));
      const docRelatedDenials = Math.round(totalDenials * (docRelatedPercent / 100));
      const writtenOffDenials = Math.round(docRelatedDenials * (writtenOffPercent / 100));
      const claimsRecovered = Math.round(writtenOffDenials * (abridgeCaptureRate / 100));
      
      driverResults['denials'] = {
        id: 'denials',
        name: 'Denial Prevention',
        value: denialsValue,
        inputs: { 
          pctReduced: abridgeCaptureRate,
          denialRate,
          totalDenials,
          docRelatedPercent,
          docRelatedDenials,
          writtenOffPercent,
          writtenOffDenials,
          abridgeCaptureRate,
          avgClaimValue,
          claimsRecovered,
        },
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
                  setExploreInitialSettings({}); // Clear any deep link settings
                  navigateTo("explore");
                }}
                onSelectExpand={() => navigateTo("measure")}
                onSelectSwitch={() => navigateTo("switch")}
                onSelectLearn={() => {
                  setLearnInitialScreen(undefined); // Clear deep link, start at home
                  navigateTo("learn");
                }}
              />
            )}

            {currentView === "explore" && (
              <ExploreFlow
                onBackToJourney={handleBackToJourney}
                onContinueToInvestment={handleExploreComplete}
                initialCareSetting={exploreInitialSettings.careSetting}
                initialPhase={exploreInitialSettings.phase}
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
                initialScreen={learnInitialScreen}
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
