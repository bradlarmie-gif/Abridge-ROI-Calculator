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
import ModelBuilder, { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import BaselineSetup, { type BaselineInfo } from "@/pages/BaselineSetup";
import InvestmentPage from "@/pages/InvestmentPage";
import SummaryCommandCenter from "@/pages/SummaryCommandCenter";
import { ExpandFlow } from "@/pages/expand";
import { SwitchFlow } from "@/pages/switch";
import LearnPath, { type LearnScreen } from "@/pages/LearnPath";
import PreBillStory from "@/pages/methodology/editorial/PreBillStory";
import CdsStory from "@/pages/methodology/editorial/CdsStory";
import CareSignalsStory from "@/pages/methodology/editorial/CareSignalsStory";
import MeasureFlow from "@/pages/measure/MeasureFlow";
import ForecastFlow from "@/pages/forecast/ForecastFlow";
import MockExplore from "@/pages/explore/editorial/MockExplore"; // THROWAWAY ?exploremock=1
import ForecastModeSelector from "@/pages/forecast/ForecastModeSelector";
import QuickRoiCalculator from "@/pages/forecast/QuickRoiCalculator";
import DrgFunnelPreview from "@/pages/forecast/DrgFunnelPreview";
import AppRationalizationFlow from "@/pages/forecast/AppRationalizationFlow";
import ExploreEditorialPdfRoute from "@/components/explore/ExploreEditorialPdfRoute";
import ProformaEditorialPdfRoute from "@/components/proforma/ProformaEditorialPdfRoute";
import AppRatEditorialPdfRoute from "@/components/forecast/AppRatEditorialPdfRoute";
import QuickRoiEditorialPdfRoute from "@/components/forecast/QuickRoiEditorialPdfRoute";
import MethodologyEditorialPdfRoute from "@/components/methodology/MethodologyEditorialPdfRoute";
import PlanEditorialPdfRoute from "@/components/attain/PlanEditorialPdfRoute";
import StrategyEditorialPdfRoute from "@/components/attain/StrategyEditorialPdfRoute";
import { ExploreFlow, type ExploreState, type ExploreCareSetting, type ExplorePhase, DEFAULT_EXPLORE_STATE } from "@/pages/explore";
import { loadSnapshot } from "@/pages/attain/attainStorage";
import { resolveResult } from "@/lib/attain/discovery";
import DiscoveryBridge, { type BridgeInfo } from "@/pages/attain/valuestrategy/DiscoveryBridge";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import PlanBuildExperience from "@/pages/attain/planning/PlanBuildExperience";
import ProformaPreview from "@/pages/proforma/editorial/ProformaPreview";
import ProformaEditorialHost from "@/pages/proforma/editorial/ProformaEditorialHost";
import AttainFlowV2 from "@/pages/attain/AttainFlowV2";
import AttainPdf from "@/pages/attain/pdf/AttainPdf";
import ExploreIntakeForm from "@/pages/intake/ExploreIntakeForm";
import MeasureDataRequest from "@/pages/intake/MeasureDataRequest";
import ExploreIntakeReceipt from "@/pages/intake/ExploreIntakeReceipt";
import MeasureDataReceipt from "@/pages/intake/MeasureDataReceipt";
import { type IntakeFormPreseed, type ExploreIntakeResponse, decodeIntakePreseed, decodeIntake } from "@/lib/intakeUrlState";
import { type DataFormPreseed, type MeasureDataRequestResponse, decodeDataFormPreseed, decodeDataRequest } from "@/lib/dataRequestUrlState";
import { type AttainSaveState, decodeAttain } from "@/lib/attain/attainUrlState";
import ProformaHub from "@/pages/proforma/ProformaHub";
import DataRequestBuilder from "@/pages/data-request/DataRequestBuilder";
import ValueAttainmentHub from "@/pages/hub/ValueAttainmentHub";
import StrategyHub from "@/pages/hub/StrategyHub";
import FinancialHub from "@/pages/hub/FinancialHub";
import PlanningHub from "@/pages/hub/PlanningHub";
import MetricLibrary from "@/pages/hub/MetricLibrary";
import InpatientReviewMock from "@/pages/explore/editorial/InpatientReviewMock"; // THROWAWAY ?inpatientmock=1
import type { ProformaSettingSnapshot, ProformaConfig } from "@/pages/proforma/proformaTypes";
import { DEFAULT_PROFORMA_CONFIG } from "@/pages/proforma/proformaTypes";
import { mergeExploreEditIntoSetting } from "@/lib/proformaCalculations";

import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { type RoiInputs } from "@/lib/roi-types";

type AppView = "splash" | "journey" | "explore" | "baseline-setup" | "model-builder" | "investment" | "calculator" | "expand" | "switch" | "learn" | "measure" | "forecast" | "forecast-mode" | "forecast-roi-calc" | "proforma-hub" | "proforma-view" | "explore-intake" | "measure-data-request" | "explore-intake-receipt" | "measure-data-receipt" | "data-request-builder" | "forecast-app-rationalization" | "attain" | "hub" | "strategy-hub" | "financial-hub" | "planning-hub" | "planning" | "prebill-case" | "cds-case" | "care-signals-case" | "explore-bridge";

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
  | { type: 'attain'; saveState: AttainSaveState }
  | { type: 'hub' }
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

  // Staging flag for the Value Attainment Hub IA restructure. While on, the app
  // opens on the new three-section hub instead of the legacy journey home; the
  // legacy home stays the default when the flag is absent.
  if (params.get('hub') === '1') {
    return { type: 'hub' };
  }

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

  // Save-and-return's "open a shared link" half — see attainUrlState.ts and
  // AttainFlow.tsx's `initialSaveState` prop. The query param is stripped
  // either way (valid or not) so re-sharing the same browser tab's URL
  // never re-triggers this; an invalid/corrupt payload just falls through
  // to the checks below (effectively "start fresh" at the journey splash),
  // it never throws.
  const attainParam = params.get('attain');
  if (attainParam) {
    window.history.replaceState({}, '', pathname);
    const saveState = decodeAttain(attainParam);
    if (saveState) return { type: 'attain', saveState };
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
    const validScreens: LearnScreen[] = ['outpatient', 'ed', 'inpatient', 'nursing', 'continuum', 'overview', 'home'];
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

  // Planning rebuild (Phase A preview) — ?planbuild=1 or ?planbuild=<setting>. Safe of the live Planning path.
  if (typeof window !== "undefined") {
    const pb = new URLSearchParams(window.location.search).get("planbuild");
    if (pb) {
      const setting = (["outpatient", "ed", "inpatient", "nursing"].includes(pb) ? pb : "outpatient") as AttainSetting;
      return <PlanBuildExperience setting={setting} />;
    }
  }
  // THROWAWAY ?inpatientmock=1 / ?mock=<setting> — real Explore path pre-filled for review.
  if (typeof window !== "undefined") {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("inpatientmock") === "1" || sp.get("mock")) {
      return <InpatientReviewMock />;
    }
  }
  // Metric Library preview (?metriclibrary=1) while it's built out; the Planning
  // Metrics card stays "coming soon" until it's wired in.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("metriclibrary") === "1") {
    return <MetricLibrary />;
  }
  // THROWAWAY: ?attainpdf=1 (kickoff) or ?attainpdf=review = the full Attain PDF.
  if (typeof window !== "undefined" && ["1", "review"].includes(new URLSearchParams(window.location.search).get("attainpdf") ?? "")) {
    return <AttainPdf />;
  }
  // THROWAWAY: ?proformapreview=1 = the editorial "Build the deal" proforma workbench (engine-wired).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("proformapreview") === "1") {
    return <ProformaPreview />;
  }
  // THROWAWAY: ?explorepreview=1 = the editorial Explore flow (interactive, engine-wired).
  // Editorial-brand screens where built, else fall back to the existing interactive screen.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("explorepreview") === "1") {
    return <ExploreFlow editorial />;
  }
  // THROWAWAY: ?drgfunnelpreview=1 = the before→after DRG query-funnel prototype (not engine-wired).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("drgfunnelpreview") === "1") {
    return <DrgFunnelPreview />;
  }
  // Print route for the editorial Explore PDF (?explorepdf=1). Renders the
  // HTML-print value-model document from the snapshot stashed in localStorage.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("explorepdf") === "1") {
    return <ExploreEditorialPdfRoute />;
  }
  // Print route for the editorial proforma PDF (?proformapdf=1). Renders the
  // HTML-print financial-proforma document from the deal snapshot in localStorage.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("proformapdf") === "1") {
    return <ProformaEditorialPdfRoute />;
  }
  // THROWAWAY: ?exploremock=1 = design mockup for the "flat" Explore redesign (value-accumulation rail).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("exploremock") === "1") {
    return <MockExplore />;
  }
  // Print route for the editorial App Rationalization PDF (?appratpdf=1).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("appratpdf") === "1") {
    return <AppRatEditorialPdfRoute />;
  }
  // Print route for the editorial ROI Calculator PDF (?quickroipdf=1).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("quickroipdf") === "1") {
    return <QuickRoiEditorialPdfRoute />;
  }
  // Print route for the editorial Methodology PDF (?methodpdf=1).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("methodpdf") === "1") {
    return <MethodologyEditorialPdfRoute />;
  }
  // Print route for the editorial Value Attainment Plan PDF (?planpdf=1, or
  // ?planpdf=<setting> e.g. ?planpdf=outpatient to preview a specific setting).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("planpdf")) {
    return <PlanEditorialPdfRoute />;
  }
  // Print route for the editorial Value Attainment Strategy write-up (?strategypdf=1,
  // or ?strategypdf=<setting> to preview a specific setting from a full sample).
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("strategypdf")) {
    return <StrategyEditorialPdfRoute />;
  }

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
  const [attainSaveState] = useState<AttainSaveState | null>(() => {
    if (INITIAL_DEEP_LINK.type === 'attain') return INITIAL_DEEP_LINK.saveState;
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
    if (INITIAL_DEEP_LINK.type === 'attain') return "attain";
    if (INITIAL_DEEP_LINK.type === 'hub') return "hub";
    return "splash";
  });

  // Value Attainment Hub staging: when entered via ?hub=1, "home" and the moved
  // paths' back/home targets point at the new hub instead of the legacy journey.
  // The Value Attainment Hub is now the default home (Phase 3 flip). hubMode is
  // always on: the splash enters the hub, and every flow's back/home targets the
  // hub / its sub-hubs.
  //
  // The legacy JourneySelector ("journey") must stay unreachable. It was NOT:
  // the Data Request Builder's Back and Measure's Back both targeted it, and the
  // Data Request Builder is reachable from the Explore header on all nine steps.
  // So hub > The Numbers > Explore > Data request > Back dropped the user into
  // the whole retired IA (Measure, Switch, legacy Attain, the Forecast selector)
  // in four clicks. One of those call sites used single quotes, which is why
  // every grep for navigateTo("journey") — including the one behind this very
  // comment — reported it unreachable. Guarded now by hubJourneyUnreachable.test.
  const hubMode = true;

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
  // Discovery → ROI handoff: a seeded Explore state (setting + drivers pre-toggled)
  // built from the Value Attainment Strategy discovery brief. Distinct from the
  // proforma-edit atom so Explore behaves like a normal run (keeps the investment
  // page, backs out to the financial hub), not a proforma edit.
  const [exploreSeedState, setExploreSeedState] = useState<ExploreState | undefined>(undefined);
  // What the discovery→ROI bridge screen narrates (carried-over setting + drivers).
  const [bridgeInfo, setBridgeInfo] = useState<BridgeInfo | null>(null);
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
    setExploreSeedState(undefined); setBridgeInfo(null);
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
    navigateTo(hubMode ? "hub" : "journey");
  };

  const handleBackToProforma = useCallback(() => {
    setProformaAddCareSetting(undefined);
    setProformaEditExploreState(undefined);
    setExploreSeedState(undefined); setBridgeInfo(null);
    navigateTo("proforma-hub");
  }, [navigateTo]);

  // "Build the ROI on this" from the discovery brief: read the saved discovery,
  // map each goal's pinned lever to its Explore driver, and open editorial Explore
  // pre-set to the setting with those drivers already toggled on. Proof-plays and
  // honest-outs pin no lever, so they simply don't pre-enable a driver.
  const handleBuildRoiFromDiscovery = useCallback(() => {
    const snap = loadSnapshot();
    const setting = snap?.setting as ExploreCareSetting | undefined;
    if (!snap || !setting) { navigateTo("financial-hub"); return; }
    const answers = snap.discovery ?? {};
    const driverIds = new Set<string>();       // counted levers → toggle on
    const proofDriverIds = new Set<string>();  // proof-first drivers (retention) → toggle on in tracked mode
    const countedLabels = new Set<string>();
    const trackedLabels = new Set<string>();
    const proofLabel: Record<string, string> = { providerWellbeing: "Provider Retention", nursingRetention: "Nurse Retention", ipLengthOfStay: "Inpatient Capacity", nursingHcahps: "Patient Experience" };
    for (const g of (snap.goals ?? []) as GoalId[]) {
      const r = resolveResult(snap.setting as AttainSetting, g, answers);
      for (const lv of r?.levers ?? []) { driverIds.add(lv.driverId); countedLabels.add(lv.label); }
      // A proofDriverId is only set when a real documentation driver was named, so we
      // track it even if an honest-out was ALSO picked on a multi step (a pure honest-out
      // sets no proofDriverId, so it never lands here). Tracked mode is $0 — no over-claim.
      if (r?.proofDriverId) { proofDriverIds.add(r.proofDriverId); trackedLabels.add(proofLabel[r.proofDriverId] ?? "Tracked"); }
    }
    const SETTING_LABEL: Record<string, string> = { outpatient: "Outpatient", ed: "Emergency", inpatient: "Inpatient", nursing: "Nursing" };
    const td = { ...DEFAULT_EXPLORE_STATE.timeDriverInputs };
    const dq = { ...DEFAULT_EXPLORE_STATE.docQualityInputs };
    // Proof-first drivers land ON but stay in tracked mode (retentionMode default
    // is "tracked" → $0), so the card is visible without over-claiming a dollar.
    proofDriverIds.forEach((id) => {
      if (id === "providerWellbeing") { td.wellbeingEnabled = true; td.calculateRetentionValue = true; }
      else if (id === "nursingRetention") { td.nursingRetentionEnabled = true; }
      // Inpatient capacity stays a tracked signal (LOS attribution to ambient is hard),
      // so light up the LOS driver alongside the documentation drivers that move it.
      else if (id === "ipLengthOfStay") { td.ipLengthOfStayEnabled = true; td.ipDocumentationLagEnabled = true; td.ipDischargeGoalDocEnabled = true; }
      // Patient Experience stays a tracked HCAHPS signal (nurse-communication is
      // qualitative, $0), lit up alongside the bedside-time driver that moves it.
      else if (id === "nursingHcahps") { dq.nursingHcahpsEnabled = true; td.nursingCareTimeEnabled = true; }
    });
    driverIds.forEach((id) => {
      switch (id) {
        case "patientAccess": td.patientAccessEnabled = true; break;
        case "lwbsRecovery": td.edLwbsEnabled = true; break;
        case "admissionCapture": td.edLwbsEnabled = true; td.edThroughputEnabled = true; break;
        case "nursingOvertime": td.nursingOtEnabled = true; break;
        case "wrvu": case "edEmLevel": dq.wrvuEnabled = true; break;
        case "hccCapture": dq.hccEnabled = true; break;
        case "denialPrevention": dq.denialsEnabled = true; break;
        case "drgAccuracy": dq.ipDrgEnabled = true; break;
        case "obsDefense": dq.ipObsDefenseEnabled = true; break;
        case "nursingFalls": dq.nursingFallsEnabled = true; break;
        case "nursingSepsis": dq.nursingSepsisEnabled = true; break;
      }
    });
    const seeded: ExploreState = { ...DEFAULT_EXPLORE_STATE, careSetting: setting, timeDriverInputs: td, docQualityInputs: dq };
    setProformaAddCareSetting(undefined);
    setProformaEditExploreState(undefined);
    setExploreSeedState(seeded);
    setBridgeInfo({ partner: snap.partner ?? "", settingLabel: SETTING_LABEL[setting] ?? setting, counted: Array.from(countedLabels), tracked: Array.from(trackedLabels) });
    navigateTo("explore-bridge");
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
              <SplashScreen onEnter={() => navigateTo("hub")} />
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
                  setExploreSeedState(undefined); setBridgeInfo(null);
                  navigateTo("explore");
                }}
                onSelectExpand={() => navigateTo("measure")}
                onSelectSwitch={() => navigateTo("switch")}
                onSelectAttain={() => navigateTo("attain")}
                onSelectForecast={() => navigateTo("forecast-mode")}
                onSelectLearn={() => {
                  setLearnInitialScreen(undefined);
                  navigateTo("learn");
                }}
                proformaCount={proformaSettings.length}
                onOpenProforma={() => navigateTo("proforma-hub")}
              />
            )}

            {/* Value Attainment Hub (staged behind ?hub=1) — new three-section IA */}
            {currentView === "hub" && (
              <ValueAttainmentHub
                onSelectStrategy={() => navigateTo("strategy-hub")}
                onSelectFinancial={() => navigateTo("financial-hub")}
                onSelectPlanning={() => navigateTo("planning-hub")}
              />
            )}

            {currentView === "strategy-hub" && (
              <StrategyHub
                onHome={() => navigateTo("hub")}
                onSelectPreBill={() => navigateTo("prebill-case")}
                onSelectCds={() => navigateTo("cds-case")}
                onSelectCareSignals={() => navigateTo("care-signals-case")}
                onSelectValueStory={() => {
                  setLearnInitialScreen(undefined);
                  navigateTo("learn");
                }}
              />
            )}

            {/* Value Strategy — the Attain funnel + Align + strategy summary, then
                hands off to Planning (the plan autosaves and Planning resumes it). */}
            {/* Planning — opens on the partner "who it's for" step (never auto-assumes
                the last partner), so you pick or switch the partner + care setting first;
                settings with saved work are badged there to resume. */}
            {currentView === "planning" && (
              <AttainFlowV2
                onBuildRoi={handleBuildRoiFromDiscovery}
                onHome={() => navigateTo("hub")}
                onBackToJourney={() => navigateTo("planning-hub")}
                flowLabel="The Plan"
                experienceLabel="Build the plan"
              />
            )}

            {currentView === "financial-hub" && (
              <FinancialHub
                onHome={() => navigateTo("hub")}
                onSelectRoiCalculator={() => navigateTo("forecast-roi-calc")}
                onSelectNewDeal={() => navigateTo("proforma-hub")}
                onSelectAppRationalization={() => navigateTo("forecast-app-rationalization")}
                onSelectExplore={() => {
                  setSelectionState({ selectedSettings: [], selectedLevers: [] });
                  setSeedInputs({});
                  setBaselineInfo(null);
                  setValueResults(null);
                  setModelResults(null);
                  setExploreInitialSettings({});
                  setProformaAddCareSetting(undefined);
                  setProformaEditExploreState(undefined);
                  setExploreSeedState(undefined); setBridgeInfo(null);
                  navigateTo("explore");
                }}
              />
            )}

            {currentView === "planning-hub" && (
              <PlanningHub
                onHome={() => navigateTo("hub")}
                onOpenPlanning={() => navigateTo("planning")}
                onOpenMetrics={() => navigateTo("planning")}
              />
            )}

            {currentView === "explore-bridge" && bridgeInfo && (
              <DiscoveryBridge
                info={bridgeInfo}
                onContinue={() => navigateTo("explore")}
                onBack={() => navigateTo("strategy-hub")}
                onHome={() => navigateTo("hub")}
              />
            )}

            {currentView === "explore" && (
              <ExploreFlow
                editorial
                onBackToJourney={hubMode ? () => navigateTo("hub") : handleBackToJourney}
                onBackToProforma={(proformaAddCareSetting || proformaEditExploreState) ? handleBackToProforma : undefined}
                initialCareSetting={proformaAddCareSetting || exploreInitialSettings.careSetting}
                initialPhase={exploreInitialSettings.phase}
                initialExploreState={proformaEditExploreState ?? exploreSeedState}
                onAddToProforma={exploreSeedState ? undefined : handleAddToProforma}
                lockCareSetting={!!exploreSeedState}
                onExitToDiscovery={() => navigateTo("explore-bridge")}
                disabledCareSettings={proformaSettings.map(s => s.careSetting as ExploreCareSetting)}
                onDataRequest={() => navigateTo("data-request-builder")}
              />
            )}

            {currentView === "attain" && (
              <AttainFlowV2 onBackToJourney={handleBackToJourney} />
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

            {currentView === "prebill-case" && (
              <PreBillStory onBack={() => navigateTo("strategy-hub")} onHome={() => navigateTo("hub")} />
            )}

            {currentView === "cds-case" && (
              <CdsStory onBack={() => navigateTo("strategy-hub")} onHome={() => navigateTo("hub")} />
            )}

            {currentView === "care-signals-case" && (
              <CareSignalsStory onBack={() => navigateTo("strategy-hub")} onHome={() => navigateTo("hub")} />
            )}

            {currentView === "learn" && (
              <LearnPath
                onBack={hubMode ? () => navigateTo("strategy-hub") : handleBackToJourney}
                initialScreen={learnInitialScreen}
                onStartCalculator={(setting) => {
                  setSelectionState({ selectedSettings: [setting as CareSettingType], selectedLevers: [] });
                  navigateTo("explore");
                }}
              />
            )}

            {currentView === "measure" && (
              <MeasureFlow onBackToJourney={() => {
                const dest = measureFromForecastMode ? "forecast-mode" : hubMode ? "hub" : "journey";
                setMeasureFromForecastMode(false);
                navigateTo(dest);
              }} />
            )}

            {currentView === "forecast" && (
              <ForecastFlow onBackToJourney={() => navigateTo("forecast-mode")} />
            )}

            {currentView === "forecast-mode" && (
              <ForecastModeSelector
                onSelectRoiCalculator={() => navigateTo("forecast-roi-calc")}
                onSelectNewDeal={() => navigateTo("proforma-hub")}
                onSelectPartnerModel={() => { setMeasureFromForecastMode(true); navigateTo("measure"); }}
                onSelectAppRationalization={() => navigateTo("forecast-app-rationalization")}
                onHome={() => navigateTo(hubMode ? "hub" : "journey")}
              />
            )}

            {currentView === "forecast-roi-calc" && (
              <QuickRoiCalculator
                onBack={() => navigateTo(hubMode ? "financial-hub" : "forecast-mode")}
                onHome={() => navigateTo(hubMode ? "hub" : "journey")}
                pathLabel={hubMode ? "The Numbers" : undefined}
              />
            )}

            {currentView === "forecast-app-rationalization" && (
              <AppRationalizationFlow
                onBack={() => navigateTo(hubMode ? "financial-hub" : "forecast-mode")}
                onHome={() => navigateTo(hubMode ? "hub" : "journey")}
                pathLabel={hubMode ? "The Numbers" : undefined}
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
              <DataRequestBuilder onBack={() => navigateTo(hubMode ? "financial-hub" : "journey")} />
            )}

            {(currentView === "proforma-hub" || currentView === "proforma-view") && (
              (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("proformalegacy") === "1") ? (
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
                  onHome={() => navigateTo(hubMode ? "hub" : "journey")}
                  onBack={() => navigateTo(hubMode ? "financial-hub" : "journey")}
                />
              ) : (
                <ProformaEditorialHost
                  settings={proformaSettings}
                  config={proformaConfig}
                  onUpdateSetting={handleUpdateProformaSetting}
                  onUpdateConfig={(updates) => {
                    const newConfig = { ...proformaConfig, ...updates };
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
                  onRemoveSetting={handleRemoveFromProforma}
                  onBack={() => navigateTo(hubMode ? "financial-hub" : "journey")}
                  onHome={() => navigateTo(hubMode ? "hub" : "journey")}
                />
              )
            )}
            </PageTransition>
          </TooltipProvider>
        </SessionSecurityProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
