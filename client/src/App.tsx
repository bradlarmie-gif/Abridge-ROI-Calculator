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
import ForecastFlow from "@/pages/forecast/ForecastFlow";
import ForecastModeSelector from "@/pages/forecast/ForecastModeSelector";
import PricingComparisonFlow from "@/pages/forecast/PricingComparisonFlow";
import { ExploreFlow, type ExploreState, type ExploreCareSetting, type ExplorePhase } from "@/pages/explore";
import ExploreIntakeForm from "@/pages/intake/ExploreIntakeForm";
import MeasureDataRequest from "@/pages/intake/MeasureDataRequest";
import ExploreIntakeReceipt from "@/pages/intake/ExploreIntakeReceipt";
import MeasureDataReceipt from "@/pages/intake/MeasureDataReceipt";
import { type IntakeFormPreseed, type ExploreIntakeResponse, decodeIntakePreseed, decodeIntake } from "@/lib/intakeUrlState";
import { type DataFormPreseed, type MeasureDataRequestResponse, decodeDataFormPreseed, decodeDataRequest } from "@/lib/dataRequestUrlState";
import ProformaHub from "@/pages/proforma/ProformaHub";
import DataRequestBuilder from "@/pages/data-request/DataRequestBuilder";
import type { ProformaSettingSnapshot, ProformaConfig } from "@/pages/proforma/proformaTypes";
import { DEFAULT_PROFORMA_CONFIG } from "@/pages/proforma/proformaTypes";
import { mergeExploreEditIntoSetting } from "@/lib/proformaCalculations";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "splash" | "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn" | "measure" | "forecast" | "forecast-mode" | "forecast-pricing" | "proforma-hub" | "proforma-view" | "explore-intake" | "measure-data-request" | "explore-intake-receipt" | "measure-data-receipt" | "data-request-builder";

interface SelectionState {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
}

type InitialDeepLink =
  | { type: 'explore'; careSetting: ExploreCareSetting; phase: ExplorePhase }
  | { type: 'explore_intake_form'; preseed: IntakeFormPreseed; fingerprint: string }
  | { type: 'measure_data_form'; preseed: DataFormPreseed; fingerprint: string }
  | { type: 'explore_intake_receipt'; data: ExploreIntakeResponse }
  | { type: 'measure_data_receipt'; data: MeasureDataRequestResponse }
  | { type: 'learn'; screen: LearnScreen }
  | { type: 'forecast' }
  | { type: 'none' };

const PARTNER_SESSION_KEY = 'abridge_partner_session';
const PARTNER_FINGERPRINT_KEY = 'abridge_partner_fingerprint';
const PARTNER_SESSION_TS_KEY = 'abridge_partner_ts';
const PARTNER_SESSION_TTL_MS = 60 * 60 * 1000;

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function setPartnerSession(formType: 'intake' | 'data_request', fingerprint: string) {
  try {
    localStorage.setItem(PARTNER_SESSION_KEY, formType);
    localStorage.setItem(PARTNER_FINGERPRINT_KEY, fingerprint);
    localStorage.setItem(PARTNER_SESSION_TS_KEY, Date.now().toString());
  } catch { /* ignore */ }
}

function isPartnerSession(): boolean {
  try {
    const val = localStorage.getItem(PARTNER_SESSION_KEY);
    if (!val) return false;
    const ts = parseInt(localStorage.getItem(PARTNER_SESSION_TS_KEY) ?? '0', 10);
    if (Date.now() - ts > PARTNER_SESSION_TTL_MS) {
      clearPartnerSession();
      return false;
    }
    return true;
  } catch { return false; }
}

function clearPartnerSession() {
  try {
    localStorage.removeItem(PARTNER_SESSION_KEY);
    localStorage.removeItem(PARTNER_FINGERPRINT_KEY);
    localStorage.removeItem(PARTNER_SESSION_TS_KEY);
  } catch { /* ignore */ }
}

function getInitialDeepLink(): InitialDeepLink {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;

  const intakeReceiptParam = params.get('intake_receipt');
  if (intakeReceiptParam) {
    window.history.replaceState({}, '', '/');
    const data = decodeIntake(intakeReceiptParam);
    if (data) return { type: 'explore_intake_receipt', data };
  }

  const dataReceiptParam = params.get('data_receipt');
  if (dataReceiptParam) {
    window.history.replaceState({}, '', '/');
    const data = decodeDataRequest(dataReceiptParam);
    if (data) return { type: 'measure_data_receipt', data };
  }

  const intakeFormParam = params.get('intake_form');
  if (intakeFormParam) {
    const fp = simpleHash(intakeFormParam);
    setPartnerSession('intake', fp);
    const decoded = decodeIntakePreseed(intakeFormParam);
    return { type: 'explore_intake_form', preseed: decoded ?? {}, fingerprint: fp };
  }

  const dataFormParam = params.get('data_form');
  if (dataFormParam) {
    const fp = simpleHash(dataFormParam);
    setPartnerSession('data_request', fp);
    const decoded = decodeDataFormPreseed(dataFormParam);
    return { type: 'measure_data_form', preseed: decoded ?? { settings: ['outpatient'] }, fingerprint: fp };
  }

  const exploreSetting = params.get('explore');
  if (exploreSetting) {
    const validSettings: ExploreCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    if (validSettings.includes(exploreSetting as ExploreCareSetting)) {
      window.history.replaceState({}, '', pathname);
      return { type: 'explore', careSetting: exploreSetting as ExploreCareSetting, phase: 'practice' };
    }
  }

  if (pathname === '/forecast' || pathname.startsWith('/forecast/') || pathname.startsWith('/forecast?')) {
    return { type: 'forecast' };
  }

  if (pathname.startsWith('/learn/')) {
    const setting = pathname.replace('/learn/', '');
    const validScreens: LearnScreen[] = ['outpatient', 'ed', 'inpatient', 'nursing', 'home'];
    if (validScreens.includes(setting as LearnScreen)) {
      window.history.replaceState({}, '', '/');
      return { type: 'learn', screen: setting as LearnScreen };
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
  
  const [intakeFormPreseed] = useState<IntakeFormPreseed | null>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore_intake_form') return INITIAL_DEEP_LINK.preseed;
    return null;
  });
  const [dataFormPreseed] = useState<DataFormPreseed | null>(() => {
    if (INITIAL_DEEP_LINK.type === 'measure_data_form') return INITIAL_DEEP_LINK.preseed;
    return null;
  });
  const [formFingerprint] = useState<string>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore_intake_form' || INITIAL_DEEP_LINK.type === 'measure_data_form') {
      return INITIAL_DEEP_LINK.fingerprint;
    }
    return '';
  });
  const [intakeReceiptData, setIntakeReceiptData] = useState<ExploreIntakeResponse | null>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore_intake_receipt') return INITIAL_DEEP_LINK.data;
    return null;
  });
  const [dataReceiptData, setDataReceiptData] = useState<MeasureDataRequestResponse | null>(() => {
    if (INITIAL_DEEP_LINK.type === 'measure_data_receipt') return INITIAL_DEEP_LINK.data;
    return null;
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (INITIAL_DEEP_LINK.type === 'explore_intake_receipt') return "explore-intake-receipt";
    if (INITIAL_DEEP_LINK.type === 'measure_data_receipt') return "measure-data-receipt";
    if (INITIAL_DEEP_LINK.type === 'explore_intake_form') return "explore-intake";
    if (INITIAL_DEEP_LINK.type === 'measure_data_form') return "measure-data-request";
    if (INITIAL_DEEP_LINK.type === 'explore') return "explore";
    if (INITIAL_DEEP_LINK.type === 'learn') return "learn";
    if (INITIAL_DEEP_LINK.type === 'forecast') return "forecast";
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
  const [proformaSettings, setProformaSettings] = useState<ProformaSettingSnapshot[]>([]);
  const [proformaConfig, setProformaConfig] = useState<ProformaConfig>(() => ({ ...DEFAULT_PROFORMA_CONFIG }));
  const [proformaAddCareSetting, setProformaAddCareSetting] = useState<ExploreCareSetting | undefined>(undefined);
  const [proformaEditExploreState, setProformaEditExploreState] = useState<ExploreState | undefined>(undefined);
  const [measureFromForecastMode, setMeasureFromForecastMode] = useState(false);

  const handleAddToProforma = useCallback((snapshot: ProformaSettingSnapshot) => {
    setProformaSettings(prev => {
      const existing = prev.findIndex(s => s.careSetting === snapshot.careSetting);
      if (existing >= 0) {
        const updated = [...prev];
        // Editing an existing setting in Explore: keep the user's proforma-side
        // deployment & pricing edits, take only Explore's updated clinical value.
        updated[existing] = mergeExploreEditIntoSetting(prev[existing], snapshot);
        return updated;
      }
      return [...prev, snapshot];
    });
    setProformaEditExploreState(undefined);
    setProformaAddCareSetting(undefined);
    navigateTo("proforma-hub");
  }, [navigateTo]);

  const handleRemoveFromProforma = useCallback((id: string) => {
    setProformaSettings(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleUpdateProformaSetting = useCallback((id: string, updates: Partial<ProformaSettingSnapshot>) => {
    setProformaSettings(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleSessionClear = useCallback(() => {
    setSelectionState({ selectedSettings: [], selectedLevers: [] });
    setSeedInputs({});
    setBaselineInfo(null);
    setValueResults(null);
    setModelResults(null);
    setExploreState(null);
    setProformaSettings([]);
    setProformaConfig({ ...DEFAULT_PROFORMA_CONFIG });
    setProformaAddCareSetting(undefined);
    setCurrentView("splash");
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

  const handleBackToProforma = useCallback(() => {
    setProformaAddCareSetting(undefined);
    setProformaEditExploreState(undefined);
    navigateTo("proforma-hub");
  }, [navigateTo]);

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
                  setSelectionState({ selectedSettings: [], selectedLevers: [] });
                  setSeedInputs({});
                  setBaselineInfo(null);
                  setValueResults(null);
                  setModelResults(null);
                  setExploreInitialSettings({});
                  setProformaAddCareSetting(undefined);
                  setProformaEditExploreState(undefined);
                  navigateTo("explore");
                }}
                onSelectExpand={() => navigateTo("measure")}
                onSelectSwitch={() => navigateTo("switch")}
                onSelectForecast={() => navigateTo("forecast-mode")}
                onSelectLearn={() => {
                  setLearnInitialScreen(undefined);
                  navigateTo("learn");
                }}
                proformaCount={proformaSettings.length}
                onOpenProforma={() => navigateTo("proforma-hub")}
              />
            )}

            {currentView === "explore" && (
              <ExploreFlow
                onBackToJourney={handleBackToJourney}
                onBackToProforma={(proformaAddCareSetting || proformaEditExploreState) ? handleBackToProforma : undefined}
                initialCareSetting={proformaAddCareSetting || exploreInitialSettings.careSetting}
                initialPhase={exploreInitialSettings.phase}
                initialExploreState={proformaEditExploreState}
                onAddToProforma={handleAddToProforma}
                disabledCareSettings={proformaSettings.map(s => s.careSetting as ExploreCareSetting)}
                onDataRequest={() => navigateTo("data-request-builder")}
              />
            )}

            {currentView === "explore-intake" && (
              <ExploreIntakeForm preseed={intakeFormPreseed ?? undefined} storageFingerprint={formFingerprint} />
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
              <MeasureFlow onBackToJourney={() => {
                const dest = measureFromForecastMode ? "forecast-mode" : "journey";
                setMeasureFromForecastMode(false);
                navigateTo(dest);
              }} />
            )}

            {currentView === "forecast" && (
              <ForecastFlow onBackToJourney={() => navigateTo("forecast-mode")} />
            )}

            {currentView === "forecast-mode" && (
              <ForecastModeSelector
                onSelectNewDeal={() => navigateTo("proforma-hub")}
                onSelectPricingComparison={() => navigateTo("forecast-pricing")}
                onSelectPartnerModel={() => { setMeasureFromForecastMode(true); navigateTo("measure"); }}
                onHome={() => navigateTo("journey")}
              />
            )}

            {currentView === "forecast-pricing" && (
              <PricingComparisonFlow
                onBack={() => navigateTo("forecast-mode")}
                onHome={() => navigateTo("journey")}
              />
            )}

            {currentView === "measure-data-request" && (
              <MeasureDataRequest preseed={dataFormPreseed ?? undefined} storageFingerprint={formFingerprint} />
            )}

            {currentView === "explore-intake-receipt" && intakeReceiptData && (
              <ExploreIntakeReceipt data={intakeReceiptData} onLoadInCalculator={(data) => {
                const firstSetting = data.settings[0];
                if (firstSetting) {
                  setExploreInitialSettings({ careSetting: firstSetting, phase: "practice" });
                  navigateTo("explore");
                }
              }} />
            )}

            {currentView === "measure-data-receipt" && dataReceiptData && (
              <MeasureDataReceipt data={dataReceiptData} onLoadInCalculator={() => {
                navigateTo("measure");
              }} />
            )}

            {currentView === "data-request-builder" && (
              <DataRequestBuilder onBack={() => navigateTo('journey')} />
            )}

            {(currentView === "proforma-hub" || currentView === "proforma-view") && (
              <ProformaHub
                settings={proformaSettings}
                config={proformaConfig}
                onConfigChange={(newConfig) => {
                  // Clamp any setting's goLiveMonth to the new contract term - 1
                  const maxGoLive = Math.max(1, newConfig.contractTermMonths - 1);
                  setProformaSettings(prev => prev.map(s =>
                    s.goLiveMonth > maxGoLive ? { ...s, goLiveMonth: maxGoLive } : s
                  ));
                  setProformaConfig(newConfig);
                }}
                onAddSetting={(careSetting) => {
                  setProformaAddCareSetting(careSetting as ExploreCareSetting);
                  setProformaEditExploreState(undefined);
                  setExploreInitialSettings({});
                  navigateTo("explore");
                }}
                onEditSetting={(id) => {
                  const setting = proformaSettings.find(s => s.id === id);
                  if (setting) {
                    setProformaAddCareSetting(setting.careSetting as ExploreCareSetting);
                    setProformaEditExploreState(setting.fullExploreState);
                    setExploreInitialSettings({});
                    navigateTo("explore");
                  }
                }}
                onRemoveSetting={handleRemoveFromProforma}
                onUpdateSetting={handleUpdateProformaSetting}
                onHome={() => navigateTo("journey")}
                onBack={() => navigateTo("journey")}
              />
            )}
            </PageTransition>
          </TooltipProvider>
        </SessionSecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
