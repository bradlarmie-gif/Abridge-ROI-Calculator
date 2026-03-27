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
import ExploreIntakeForm from "@/pages/intake/ExploreIntakeForm";
import MeasureDataRequest from "@/pages/intake/MeasureDataRequest";
import ExploreIntakeReceipt from "@/pages/intake/ExploreIntakeReceipt";
import MeasureDataReceipt from "@/pages/intake/MeasureDataReceipt";
import { type IntakeFormPreseed, type ExploreIntakeResponse, decodeIntakePreseed, decodeIntake } from "@/lib/intakeUrlState";
import { type DataFormPreseed, type MeasureDataRequestResponse, decodeDataFormPreseed, decodeDataRequest } from "@/lib/dataRequestUrlState";
import ProformaHub from "@/pages/proforma/ProformaHub";
import ProformaView from "@/pages/proforma/ProformaView";
import type { ProformaSettingSnapshot, ProformaScenario, ProformaConfig } from "@/pages/proforma/proformaTypes";
import { DEFAULT_PROFORMA_CONFIG } from "@/pages/proforma/proformaTypes";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "splash" | "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn" | "measure" | "proforma-hub" | "proforma-view" | "explore-intake" | "measure-data-request" | "explore-intake-receipt" | "measure-data-receipt" | "partner-dead-end";

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
  | { type: 'partner_dead_end' }
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
    return { type: 'measure_data_form', preseed: decoded ?? { setting: 'outpatient' }, fingerprint: fp };
  }

  if (isPartnerSession()) {
    return { type: 'partner_dead_end' };
  }

  const exploreSetting = params.get('explore');
  if (exploreSetting) {
    const validSettings: ExploreCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    if (validSettings.includes(exploreSetting as ExploreCareSetting)) {
      window.history.replaceState({}, '', pathname);
      return { type: 'explore', careSetting: exploreSetting as ExploreCareSetting, phase: 'practice' };
    }
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
    if (INITIAL_DEEP_LINK.type === 'partner_dead_end') return "partner-dead-end";
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
  const [proformaScenarios, setProformaScenarios] = useState<ProformaScenario[]>([]);
  const [proformaConfig, setProformaConfig] = useState<ProformaConfig>(() => ({ ...DEFAULT_PROFORMA_CONFIG }));
  const [proformaAddCareSetting, setProformaAddCareSetting] = useState<ExploreCareSetting | undefined>(undefined);
  const [proformaEditExploreState, setProformaEditExploreState] = useState<ExploreState | undefined>(undefined);

  const handleAddToProforma = useCallback((snapshot: ProformaSettingSnapshot) => {
    setProformaSettings(prev => {
      const existing = prev.findIndex(s => s.careSetting === snapshot.careSetting);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = snapshot;
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

  const handleSaveScenario = useCallback((scenario: ProformaScenario) => {
    setProformaScenarios(prev => {
      const existing = prev.findIndex(s => s.id === scenario.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = scenario;
        return updated;
      }
      return [...prev, scenario].slice(0, 4);
    });
  }, []);

  const handleDeleteScenario = useCallback((id: string) => {
    setProformaScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSessionClear = useCallback(() => {
    setSelectionState({ selectedSettings: [], selectedLevers: [] });
    setSeedInputs({});
    setBaselineInfo(null);
    setValueResults(null);
    setModelResults(null);
    setExploreState(null);
    setProformaSettings([]);
    setProformaScenarios([]);
    setProformaConfig({ ...DEFAULT_PROFORMA_CONFIG });
    setProformaAddCareSetting(undefined);
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
    const docQualityPctVal = state.timeAllocation.patientExperience || 0;
    if (state.timeAllocation.clinicianWellbeing > 0 && retentionValue > 0) {
      const burdenReliefPctVal = (docQualityPctVal + state.timeAllocation.clinicianWellbeing) / 100;
      const wellbeingHours = totalHoursSaved * burdenReliefPctVal;
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
          docQualityPct: docQualityPctVal,
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
      const maPercentage = 20;
      const gapRate = 12;
      const avgMissedHccs = 0.7;
      const rafImpact = 0.15;
      const annualPayment = 10000;
      const realizationRate = 40;
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
                onContinueToInvestment={handleExploreComplete}
                initialCareSetting={proformaAddCareSetting || exploreInitialSettings.careSetting}
                initialPhase={exploreInitialSettings.phase}
                initialExploreState={proformaEditExploreState}
                onAddToProforma={handleAddToProforma}
                disabledCareSettings={proformaSettings.map(s => s.careSetting as ExploreCareSetting)}
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
              <MeasureFlow onBackToJourney={() => navigateTo("journey")} />
            )}

            {currentView === "measure-data-request" && (
              <MeasureDataRequest preseed={dataFormPreseed ?? undefined} storageFingerprint={formFingerprint} />
            )}

            {currentView === "explore-intake-receipt" && intakeReceiptData && (
              <ExploreIntakeReceipt data={intakeReceiptData} onLoadInCalculator={(data) => {
                const firstSetting = data.settings[0];
                if (firstSetting) {
                  const mapped = firstSetting as unknown as ExploreCareSetting;
                  setExploreState(prev => ({ ...prev, careSetting: mapped, phase: "opportunity" as ExplorePhase }));
                  navigateTo("explore");
                }
              }} />
            )}

            {currentView === "measure-data-receipt" && dataReceiptData && (
              <MeasureDataReceipt data={dataReceiptData} onLoadInCalculator={() => {
                navigateTo("measure");
              }} />
            )}

            {currentView === "partner-dead-end" && (
              <div className="flex items-center justify-center min-h-[60vh]" data-testid="partner-dead-end">
                <div className="text-center max-w-md mx-auto px-6">
                  <div className="w-12 h-12 rounded-full bg-[#FFF0EC] flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EA2C00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2" data-testid="text-dead-end-title">This link is incomplete</h2>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Please use the full form link provided by your Abridge partner to access the questionnaire.
                  </p>
                </div>
              </div>
            )}

            {currentView === "proforma-hub" && (
              <ProformaHub
                settings={proformaSettings}
                scenarios={proformaScenarios}
                config={proformaConfig}
                onConfigChange={setProformaConfig}
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
                onViewProforma={() => navigateTo("proforma-view")}
                onBack={() => navigateTo("journey")}
              />
            )}

            {currentView === "proforma-view" && proformaSettings.length > 0 && (
              <ProformaView
                settings={proformaSettings}
                config={proformaConfig}
                onConfigChange={setProformaConfig}
                onUpdateSetting={handleUpdateProformaSetting}
                onBack={() => navigateTo("proforma-hub")}
                onHome={() => navigateTo("journey")}
                scenarios={proformaScenarios}
                onSaveScenario={handleSaveScenario}
                onDeleteScenario={handleDeleteScenario}
              />
            )}
            </PageTransition>
          </TooltipProvider>
        </SessionSecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
