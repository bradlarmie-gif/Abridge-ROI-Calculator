import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import {
  defaultInputs,
  type RoiInputs,
  type LeverId,
  leverLabels,
  leverDescriptions,
  leverShortNames,
} from "@/lib/roi-types";
import {
  calculateRoi,
  formatCurrency,
} from "@/lib/roi-calculator";
import { ExpansionCalculator } from "@/components/expansion";
import type { ExpansionResults, ExpansionInputs } from "@/components/expansion";
import { NewCareSettingFlow } from "@/components/expansion/NewCareSettingFlow";
import type { CombinedDeploymentModel } from "@/components/expansion/newCareSettingCalculations";
import {
  CARE_SETTING_LABELS,
  type CareSettingType,
} from "@/lib/SETTING_CONFIG";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExportModal, type ExportType } from "@/components/ExportModal";
import type { ScenarioData } from "@/lib/pdf-generator";
import { EditableCalcRow, CalcRow, CalcStep } from "@/components/EditableCalcRow";
import {
  ArrowLeft,
  Plus,
  Search,
  TrendingUp,
  FileText,
  Check,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  Clock,
  DollarSign,
  UserMinus,
  Heart,
  FileX,
  Lightbulb,
  RotateCcw,
  Download,
  Mail,
  Loader2,
  Trash2,
  Sliders,
  Settings,
  Target,
  Building2,
  ClipboardList,
  LayoutGrid,
  ArrowRight,
  ExternalLink,
  BarChart3,
  Stethoscope,
  AlertCircle,
  AlertTriangle,
  ChevronUp,
  Zap,
  HeartPulse,
  GitCompareArrows,
  Scale,
  Info,
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  seedInputs?: Partial<RoiInputs>;
  onBack: () => void;
}

type TabId = "summary" | "detailed" | "scenarios" | "export";

// Scenario type definition
type ScenarioType = "expand" | "drivers" | "setting";

interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  createdAt: Date;
  providers: number;
  encounters: number;
  utilizationRate: number;
  // Advanced inputs
  maPopulationPct: number;
  newPatientPct: number;
  specialtyPct: number;
  revenuePerVisitOverride: number | null;
  visitLengthOverride: number | null;
  // Calculated results
  totalBenefit: number;
  investment: number;
  netGain: number;
  roiMultiple: number;
  driverValues: Record<LeverId, number>;
}

// Driver icons mapping
const DRIVER_ICONS: Partial<Record<LeverId, typeof Clock>> = {
  patientAccess: Clock,
  wrvu: DollarSign,
  workforce: UserMinus,
  hcc: Heart,
  denials: FileX,
  overtime: Calendar,
  edThroughput: Zap,
  edLevelOfService: BarChart3,
  edDenialReduction: FileX,
  edRetention: HeartPulse,
};

const DRIVER_COLORS: Partial<Record<LeverId, string>> = {
  patientAccess: "#3B82F6", // Blue
  wrvu: "#8B5CF6", // Purple
  workforce: "#10B981", // Green
  hcc: "#F97316", // Orange
  denials: "#14B8A6", // Teal
  overtime: "#EF4444", // Red
  edThroughput: "#6366F1", // Indigo
  edLevelOfService: "#8B5CF6", // Purple
  edDenialReduction: "#14B8A6", // Teal
  edRetention: "#10B981", // Green
};

const DRIVER_ESTIMATES: Partial<Record<LeverId, { min: number; max: number; subtitle: string }>> = {
  patientAccess: { min: 150000, max: 200000, subtitle: "Returns visit-time documentation minutes back to patient capacity" },
  wrvu: { min: 200000, max: 260000, subtitle: "Improves coding support by capturing clinical reasoning" },
  workforce: { min: 50000, max: 120000, subtitle: "Lower burnout and turnover by reducing admin burden" },
  overtime: { min: 100000, max: 180000, subtitle: "Reduce premium labor costs from documentation backlog" },
  hcc: { min: 180000, max: 400000, subtitle: "Improve RAF scores through complete documentation" },
  denials: { min: 70000, max: 150000, subtitle: "Reduce claims denied due to documentation issues" },
  edThroughput: { min: 200000, max: 350000, subtitle: "Reduce LWBS rates by completing documentation faster during shift" },
  edLevelOfService: { min: 200000, max: 400000, subtitle: "Capture accurate E/M levels despite time-pressured environment" },
  edDenialReduction: { min: 250000, max: 500000, subtitle: "Prevent denials from incomplete ED documentation" },
  edRetention: { min: 800000, max: 1500000, subtitle: "Reduce ED clinician burnout and turnover" },
};

export default function RoiCalculator({
  selectedSettings,
  selectedLevers,
  seedInputs,
  onBack,
}: RoiCalculatorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false);
  const [selectedNewDrivers, setSelectedNewDrivers] = useState<Set<LeverId>>(new Set());
  
  // Detailed breakdown state
  const [expandedDriver, setExpandedDriver] = useState<LeverId | null>(null);
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, number | string>>({});
  const [removedDriverToast, setRemovedDriverToast] = useState<string | null>(null);
  const removedToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Toast for inline edits
  const { toast } = useToast();
  
  // Track customized values (different from posture defaults)
  const [customizedValues, setCustomizedValues] = useState<Set<string>>(new Set());

  // Scenario Builder state
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<string | null>(null);
  const [showBaselineDetails, setShowBaselineDetails] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Scenario form state
  const [scenarioForm, setScenarioForm] = useState({
    name: "",
    providers: 0,
    encounters: 0,
    utilizationRate: 70,
    maPopulationPct: 15,
    newPatientPct: 30,
    specialtyPct: 40,
    revenuePerVisitOverride: null as number | null,
    visitLengthOverride: null as number | null,
  });

  // Export form state
  const [exportForm, setExportForm] = useState({
    documentTitle: "",
    organizationName: "",
    preparedBy: "",
    customNotes: "",
  });
  const [exportContentSelections, setExportContentSelections] = useState({
    valueDriverDetails: true,
    methodology: true,
    modelInputs: true,
    scenarios: true,
    appendix: false,
  });
  const [exportDriverSelections, setExportDriverSelections] = useState<Set<LeverId>>(new Set());
  const [exportScenarioSelections, setExportScenarioSelections] = useState<Set<string>>(new Set());
  const [driverSectionExpanded, setDriverSectionExpanded] = useState(false);
  const [scenarioSectionExpanded, setScenarioSectionExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // New Export Modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('baseline');
  const [exportScenario, setExportScenario] = useState<ScenarioData | undefined>(undefined);
  const [exportScenarios, setExportScenarios] = useState<ScenarioData[]>([]);
  
  // Scenario comparison selection
  const [selectedScenariosForCompare, setSelectedScenariosForCompare] = useState<Set<string>>(new Set());
  const [scenarioTypeModal, setScenarioTypeModal] = useState<ScenarioType | null>(null);
  const [currentScenarioType, setCurrentScenarioType] = useState<ScenarioType>("expand");
  const [pdfSuccess, setPdfSuccess] = useState(false);
  
  // Expand Providers full-page flow state
  const [showExpandProviders, setShowExpandProviders] = useState(false);
  const [showExpansionWizard, setShowExpansionWizard] = useState(false);
  const [expandProvidersMode, setExpandProvidersMode] = useState<"quick" | "advanced">("quick");
  const [encounterScalingMode, setEncounterScalingMode] = useState<"proportional" | "custom">("proportional");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  
  // Expansion calculator pricing state
  const [expansionPricingModel, setExpansionPricingModel] = useState<"per-provider" | "enterprise">("per-provider");
  const [enterpriseAnnualCost, setEnterpriseAnnualCost] = useState<number | null>(null);
  const [targetProviders, setTargetProviders] = useState<number>(0); // Will be synced with inputs.numberOfProviders
  
  // Volume discount helper
  const getVolumeDiscount = (providers: number) => {
    if (providers >= 250) return 0.30;
    if (providers >= 150) return 0.25;
    if (providers >= 100) return 0.20;
    if (providers >= 75) return 0.15;
    if (providers >= 50) return 0.10;
    return 0;
  };
  
  // Advanced mode additional fields
  const [providerBreakdown, setProviderBreakdown] = useState([
    { type: "Primary Care Physicians", count: 40, encountersPerYear: 1800, avgWrvu: 1.2 },
    { type: "Specialists", count: 35, encountersPerYear: 1200, avgWrvu: 2.1 },
    { type: "NPs / PAs", count: 25, encountersPerYear: 1500, avgWrvu: 0.85 },
  ]);
  const [adoptionTimeline, setAdoptionTimeline] = useState<string>("q3_2025");
  const [financialParams, setFinancialParams] = useState({
    revenuePerVisit: 200,
    revenuePerWrvu: 40,
    providerReplacementCost: 250000,
    maPopulationPct: 15,
    benchmarkPmpm: 1000,
    turnoverRate: 5,
    denialRate: 5,
  });

  // Add Strategic Drivers full-page flow state
  const [showAddDrivers, setShowAddDrivers] = useState(false);
  const [scenarioDriverSelections, setScenarioDriverSelections] = useState<Set<LeverId>>(new Set());
  const [expandedDriverMethodology, setExpandedDriverMethodology] = useState<LeverId | null>(null);
  const [driverAdjustments, setDriverAdjustments] = useState<Partial<Record<LeverId, Record<string, number>>>>({
    hcc: { maPopulationPct: 15, benchmarkPmpm: 1000, recaptureRate: 50 },
    denials: { denialRate: 5, preventionRate: 50 },
    overtime: { afterHoursPct: 20, premiumRate: 145 },
    patientAccess: {},
    workforce: {},
    wrvu: {},
  });
  // Raw input values for proper text editing (allows empty/partial values during typing)
  const [rawInputValues, setRawInputValues] = useState<Record<string, string>>({});
  const [driversScenarioName, setDriversScenarioName] = useState("");

  // New Care Setting full-page flow state
  const [showNewCareSetting, setShowNewCareSetting] = useState(false);
  const [selectedNewCareSetting, setSelectedNewCareSetting] = useState<"ed" | "nursing" | null>(null);
  const [careSettingScenarioName, setCareSettingScenarioName] = useState("");
  const [careSettingConfig, setCareSettingConfig] = useState({
    providers: 40,
    encountersPerProvider: 2000,
    customEncounters: 80000,
    encounterMode: "calculated" as "calculated" | "custom",
    utilizationRate: 65,
  });
  const [careSettingDrivers, setCareSettingDrivers] = useState<Set<LeverId>>(new Set<LeverId>(["patientAccess", "wrvu", "denials"]));
  const [careSettingDriverAdjustments, setCareSettingDriverAdjustments] = useState<Partial<Record<LeverId, Record<string, number>>>>({
    patientAccess: { minutesSaved: 12 },
    wrvu: { baselineWrvu: 2.8, qualityLift: 6, revenuePerWrvu: 45 },
    denials: { denialRate: 6, preventionRate: 55 },
    overtime: { afterHoursPct: 30, premiumRate: 160 },
    hcc: {},
    workforce: {},
    edThroughput: { minutesSaved: 20, lwbsImprovement: 0.5 },
    edLevelOfService: { baselineWrvu: 2.6, qualityLift: 5, revenuePerWrvu: 34 },
    edDenialReduction: { denialRate: 12, preventionRate: 40 },
    edRetention: { burnoutReduction: 25, costPerDeparture: 350000 },
  });
  const [expandedCareSettingDriver, setExpandedCareSettingDriver] = useState<LeverId | null>(null);

  // Scenario Comparison View state
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);

  // Competitor Comparison state
  const [showCompetitorComparison, setShowCompetitorComparison] = useState(false);
  const [competitorStep, setCompetitorStep] = useState<1 | 2 | 3>(1); // 1=selection, 2=deployment, 3=value comparison
  const [selectedCompetitor, setSelectedCompetitor] = useState<{
    name: string;
    type: "ambient" | "human" | "custom";
  } | null>(null);
  // Human scribe inputs
  const [scribeCount, setScribeCount] = useState<number>(5);
  const [scribeHourlyRate, setScribeHourlyRate] = useState<number>(25);
  const [scribeHoursPerWeek, setScribeHoursPerWeek] = useState<number>(40);
  const [scribeReductionPercent, setScribeReductionPercent] = useState<number>(75);
  // Ambient competitor inputs
  const [competitorCostPerProvider, setCompetitorCostPerProvider] = useState<number>(150);
  const [competitorProviderCount, setCompetitorProviderCount] = useState<number | "">(100);
  const [competitorUtilization, setCompetitorUtilization] = useState<number>(50);
  const [competitorTimeSaved, setCompetitorTimeSaved] = useState<number>(1.5);
  // Competitor scenario name
  const [competitorScenarioName, setCompetitorScenarioName] = useState("");
  // Competitor value drivers state (legacy - kept for backward compatibility)
  const [competitorDrivers, setCompetitorDrivers] = useState<{
    patientAccess: { enabled: boolean; value: number; metric: "visits" | "direct" };
    accurateService: { enabled: boolean; wrvuUplift: number; wrvuRate: number };
    clinicianRetention: { enabled: boolean; departuresPrevented: number; replacementCost: number };
    overtimeSavings: { enabled: boolean; hoursReduced: number; premiumRate: number };
    denialReduction: { enabled: boolean; denialsPrevented: number; avgDenialValue: number };
  }>({
    patientAccess: { enabled: false, value: 0, metric: "visits" },
    accurateService: { enabled: false, wrvuUplift: 0, wrvuRate: 40 },
    clinicianRetention: { enabled: false, departuresPrevented: 0, replacementCost: 250000 },
    overtimeSavings: { enabled: false, hoursReduced: 0, premiumRate: 145 },
    denialReduction: { enabled: false, denialsPrevented: 0, avgDenialValue: 500 },
  });
  
  // NEW: Per-provider comparison inputs for Step 3 "Apples to Apples"
  const [compDriverInputs, setCompDriverInputs] = useState<{
    access: { visitsPerProvider: number; revenuePerVisit: number; expanded: boolean; skipped: boolean };
    los: { wrvuUpliftPerProvider: number; wrvuRate: number; expanded: boolean; skipped: boolean };
    overtime: { hoursPerProvider: number; premiumRate: number; expanded: boolean; skipped: boolean };
  }>({
    access: { visitsPerProvider: 0, revenuePerVisit: 200, expanded: true, skipped: false },
    los: { wrvuUpliftPerProvider: 0, wrvuRate: 40, expanded: false, skipped: false },
    overtime: { hoursPerProvider: 0, premiumRate: 145, expanded: false, skipped: false },
  });
  
  // Initialize inputs from seed with a setter for dynamic updates
  const [inputs, setInputs] = useState<RoiInputs>(() => {
    const initial: RoiInputs = JSON.parse(JSON.stringify(defaultInputs));
    if (seedInputs) {
      Object.assign(initial, seedInputs);
      if (seedInputs.levers) {
        initial.levers = { ...initial.levers, ...seedInputs.levers };
      }
    }
    const allLeverIds: LeverId[] = ["patientAccess", "overtime", "workforce", "wrvu", "denials", "hcc"];
    allLeverIds.forEach((id) => {
      const seeded = seedInputs?.levers?.[id];
      initial.levers[id] = typeof seeded === "boolean" ? seeded : selectedLevers.some((l) => l.leverId === id && l.active);
    });
    return initial;
  });

  // Calculate results
  const results = useMemo(() => calculateRoi(inputs), [inputs]);

  // Driver values directly from calculateRoi results (already filtered by inputs.levers)
  const driverValues = useMemo(() => {
    const values: Record<LeverId, number> = {
      patientAccess: 0,
      overtime: 0,
      workforce: 0,
      wrvu: 0,
      denials: 0,
      hcc: 0,
      edThroughput: 0,
      edLevelOfService: 0,
      edDenialReduction: 0,
      edRetention: 0,
      rnDocTime: 0,
      rnCommunication: 0,
      rnSafetyReduction: 0,
      rnDiagnosisSeverity: 0,
    };
    results.levers.forEach((lever) => {
      // Only include if the lever is enabled in inputs
      if (lever.enabled) {
        values[lever.id] = lever.value;
      }
    });
    return values;
  }, [results]);

  // Abridge benchmark constants (from 200+ health system deployments)
  const ABRIDGE_BENCHMARKS = {
    access: {
      conservative: 60,
      typical: 120,
      optimistic: 200,
      unit: "visits/provider/year",
    },
    los: {
      conservative: 50,
      typical: 125,
      optimistic: 200,
      unit: "wRVUs/provider/year",
    },
    overtime: {
      conservative: 35,
      typical: 65,
      optimistic: 95,
      unit: "hours/provider/year",
    },
  };
  
  // Calculate per-driver deltas for comparison
  const calculateDriverDelta = (driver: "access" | "los" | "overtime") => {
    const providers = typeof competitorProviderCount === "number" ? competitorProviderCount : inputs.numberOfProviders;
    const benchmark = ABRIDGE_BENCHMARKS[driver].typical;
    const isSkipped = compDriverInputs[driver].skipped;
    
    if (driver === "access") {
      const userValue = isSkipped ? 0 : compDriverInputs.access.visitsPerProvider;
      const rate = compDriverInputs.access.revenuePerVisit;
      const deltaPerProvider = isSkipped ? benchmark : (benchmark - userValue);
      const userValuePerProvider = userValue * rate;
      const abridgeValuePerProvider = benchmark * rate;
      const deltaValuePerProvider = deltaPerProvider * rate;
      return {
        userMetric: userValue,
        abridgeMetric: benchmark,
        deltaMetric: deltaPerProvider,
        userValuePerProvider,
        abridgeValuePerProvider,
        deltaValuePerProvider,
        userTotal: userValuePerProvider * providers,
        abridgeTotal: abridgeValuePerProvider * providers,
        deltaTotal: isSkipped ? 0 : deltaValuePerProvider * providers,
        unit: "visits",
        rate,
        rateLabel: "/visit",
        providers,
        skipped: isSkipped,
      };
    } else if (driver === "los") {
      const userValue = isSkipped ? 0 : compDriverInputs.los.wrvuUpliftPerProvider;
      const rate = compDriverInputs.los.wrvuRate;
      const deltaPerProvider = isSkipped ? benchmark : (benchmark - userValue);
      const userValuePerProvider = userValue * rate;
      const abridgeValuePerProvider = benchmark * rate;
      const deltaValuePerProvider = deltaPerProvider * rate;
      return {
        userMetric: userValue,
        abridgeMetric: benchmark,
        deltaMetric: deltaPerProvider,
        userValuePerProvider,
        abridgeValuePerProvider,
        deltaValuePerProvider,
        userTotal: userValuePerProvider * providers,
        abridgeTotal: abridgeValuePerProvider * providers,
        deltaTotal: isSkipped ? 0 : deltaValuePerProvider * providers,
        unit: "wRVUs",
        rate,
        rateLabel: "/wRVU",
        providers,
        skipped: isSkipped,
      };
    } else {
      const userValue = isSkipped ? 0 : compDriverInputs.overtime.hoursPerProvider;
      const rate = compDriverInputs.overtime.premiumRate;
      const deltaPerProvider = isSkipped ? benchmark : (benchmark - userValue);
      const userValuePerProvider = userValue * rate;
      const abridgeValuePerProvider = benchmark * rate;
      const deltaValuePerProvider = deltaPerProvider * rate;
      return {
        userMetric: userValue,
        abridgeMetric: benchmark,
        deltaMetric: deltaPerProvider,
        userValuePerProvider,
        abridgeValuePerProvider,
        deltaValuePerProvider,
        userTotal: userValuePerProvider * providers,
        abridgeTotal: abridgeValuePerProvider * providers,
        deltaTotal: isSkipped ? 0 : deltaValuePerProvider * providers,
        unit: "hours",
        rate,
        rateLabel: "/hr",
        providers,
        skipped: isSkipped,
      };
    }
  };

  // Calculate total comparison across all drivers (for competitor comparison)
  const totalComparison = useMemo(() => {
    const accessDelta = calculateDriverDelta("access");
    const losDelta = calculateDriverDelta("los");
    const overtimeDelta = calculateDriverDelta("overtime");
    
    const grandTotal = accessDelta.deltaTotal + losDelta.deltaTotal + overtimeDelta.deltaTotal;
    
    return {
      access: accessDelta,
      los: losDelta,
      overtime: overtimeDelta,
      grandTotal,
    };
  }, [compDriverInputs, competitorProviderCount, inputs.numberOfProviders]);

  // Total annual benefit from calculateRoi (authoritative source)
  const totalAnnualBenefit = results.totalAnnualBenefit;

  // Annual investment from calculateRoi (authoritative source)
  const annualInvestment = results.annualAbridgeCost;

  // Net annual gain and ROI from calculateRoi (authoritative source)
  const netAnnualGain = results.netValueCreated;
  const roiMultiple = results.roiMultiple;

  // Get care setting label
  const careSettingLabel = selectedSettings.length > 0 
    ? CARE_SETTING_LABELS[selectedSettings[0]] 
    : "Outpatient";

  // Calculate Abridge-documented encounters
  const abridgeDocumentedEncounters = Math.round(
    inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100)
  );

  // All available driver IDs (constant, never changes)
  const allDriverIds: LeverId[] = useMemo(() => ["patientAccess", "workforce", "overtime", "wrvu", "denials", "hcc"], []);
  
  // Enabled drivers (from inputs.levers) - memoized to prevent infinite re-renders
  const enabledDriverIds = useMemo(() => 
    allDriverIds.filter((id) => inputs.levers[id]),
    [allDriverIds, inputs.levers]
  );
  
  // Drivers not yet enabled (for the modal)
  const availableDrivers = useMemo(() => 
    allDriverIds.filter((id) => !inputs.levers[id]),
    [allDriverIds, inputs.levers]
  );
  
  // Capacity & Labor drivers
  const capacityLaborIds: LeverId[] = ["patientAccess", "workforce", "overtime"];
  const revenueRiskIds: LeverId[] = ["wrvu", "denials", "hcc"];

  // Track which drivers user has explicitly deselected
  const [userDeselectedDrivers, setUserDeselectedDrivers] = useState<Set<LeverId>>(new Set());
  const [userDeselectedScenarios, setUserDeselectedScenarios] = useState<Set<string>>(new Set());

  // Computed: drivers for export = enabled minus user deselections
  const driversForExport = useMemo(() => {
    return enabledDriverIds.filter((id) => !userDeselectedDrivers.has(id));
  }, [enabledDriverIds, userDeselectedDrivers]);

  // Computed: scenarios for export = all minus user deselections
  const scenariosForExport = useMemo(() => {
    return scenarios.filter((s) => !userDeselectedScenarios.has(s.id));
  }, [scenarios, userDeselectedScenarios]);

  // Sync exportDriverSelections with computed driversForExport
  useEffect(() => {
    setExportDriverSelections(new Set(driversForExport));
  }, [driversForExport]);

  // Sync exportScenarioSelections with computed scenariosForExport
  useEffect(() => {
    setExportScenarioSelections(new Set(scenariosForExport.map((s) => s.id)));
  }, [scenariosForExport]);

  // Sync targetProviders with inputs.numberOfProviders when showExpandProviders opens
  useEffect(() => {
    if (showExpandProviders && targetProviders === 0) {
      setTargetProviders(inputs.numberOfProviders);
    }
  }, [showExpandProviders, inputs.numberOfProviders, targetProviders]);

  // Scroll to top on mount and when major navigation states change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  
  // Scroll to top when navigating between major views/wizards
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [showExpandProviders, showExpansionWizard, showAddDrivers, showNewCareSettingFlow, showCompetitorComparison, competitorStep, activeTab]);

  // Expansion calculation memo
  const expansionCalculation = useMemo(() => {
    const baselineProviders = inputs.numberOfProviders;
    const baselineEncounters = inputs.annualOutpatientEncounters;
    const costPerProviderMonthly = inputs.monthlyCostPerProvider || 225; // Use correct property name with fallback
    
    // Can't calculate if targetProviders is not greater than baseline
    if (targetProviders <= baselineProviders) {
      return null;
    }
    
    // Scaling ratios
    const providerRatio = targetProviders / baselineProviders;
    const encounterRatio = providerRatio; // Assumes same encounters per provider
    
    // Scenario calculations
    const scenarioEncounters = Math.round(baselineEncounters * encounterRatio);
    
    // Cost calculation based on pricing model
    let scenarioCost: number;
    let effectiveCostPerProvider: number;
    let volumeDiscount = 0;
    
    if (expansionPricingModel === "per-provider") {
      scenarioCost = targetProviders * costPerProviderMonthly * 12;
      effectiveCostPerProvider = costPerProviderMonthly;
    } else {
      // Enterprise pricing
      if (enterpriseAnnualCost && enterpriseAnnualCost > 0) {
        scenarioCost = enterpriseAnnualCost;
        effectiveCostPerProvider = scenarioCost / (targetProviders * 12);
      } else {
        // Auto-calculate with volume discount
        volumeDiscount = getVolumeDiscount(targetProviders);
        effectiveCostPerProvider = costPerProviderMonthly * (1 - volumeDiscount);
        scenarioCost = targetProviders * effectiveCostPerProvider * 12;
      }
    }
    
    // Benefits scale differently based on driver type
    // Only scale drivers that are actually enabled
    const scalingLogic: Record<LeverId, number> = {
      patientAccess: encounterRatio,  // Scales with volume
      workforce: providerRatio,       // Scales with provider count
      wrvu: encounterRatio,           // Scales with volume
      overtime: providerRatio * 0.9,  // Slight efficiency gains at scale
      denials: encounterRatio,        // Scales with volume
      hcc: encounterRatio,            // Scales with volume
      edThroughput: encounterRatio,
      edLevelOfService: encounterRatio,
      edDenialReduction: encounterRatio,
      edRetention: providerRatio,
      rnDocTime: providerRatio,
      rnCommunication: providerRatio,
      rnSafetyReduction: providerRatio,
      rnDiagnosisSeverity: providerRatio,
    };
    
    // Calculate scenario benefits - only for enabled drivers
    const scenarioBenefits: Partial<Record<LeverId, number>> = {};
    let scenarioTotalBenefit = 0;
    
    enabledDriverIds.forEach((driverId) => {
      const baselineValue = driverValues[driverId] || 0;
      const scalingFactor = scalingLogic[driverId] || providerRatio;
      const scenarioValue = Math.round(baselineValue * scalingFactor);
      scenarioBenefits[driverId] = scenarioValue;
      scenarioTotalBenefit += scenarioValue;
    });
    
    const scenarioNetGain = scenarioTotalBenefit - scenarioCost;
    const scenarioROI = scenarioCost > 0 ? scenarioTotalBenefit / scenarioCost : 0;
    
    // Baseline calculations - use authoritative values from results
    const baselineCost = annualInvestment; // Use annualAbridgeCost from calculateRoi
    const baselineBenefit = totalAnnualBenefit;
    const baselineNetGain = netAnnualGain;
    const baselineROI = roiMultiple;
    
    // Incremental analysis (the key!)
    const incrementalProviders = targetProviders - baselineProviders;
    const incrementalCost = scenarioCost - baselineCost;
    const incrementalBenefit = scenarioTotalBenefit - baselineBenefit;
    const incrementalNetGain = incrementalBenefit - incrementalCost;
    const incrementalROI = incrementalCost > 0 ? incrementalBenefit / incrementalCost : 0;
    
    return {
      baseline: {
        providers: baselineProviders,
        encounters: baselineEncounters,
        cost: baselineCost,
        benefit: baselineBenefit,
        netGain: baselineNetGain,
        roi: baselineROI,
        activeDrivers: enabledDriverIds,
      },
      scenario: {
        providers: targetProviders,
        encounters: scenarioEncounters,
        cost: scenarioCost,
        costPerProvider: effectiveCostPerProvider,
        benefit: scenarioTotalBenefit,
        benefits: scenarioBenefits,
        netGain: scenarioNetGain,
        roi: scenarioROI,
        volumeDiscount,
      },
      incremental: {
        providers: incrementalProviders,
        encounters: scenarioEncounters - baselineEncounters,
        cost: incrementalCost,
        benefit: incrementalBenefit,
        netGain: incrementalNetGain,
        roi: incrementalROI,
      },
    };
  }, [targetProviders, expansionPricingModel, enterpriseAnnualCost, inputs.numberOfProviders, inputs.annualOutpatientEncounters, inputs.monthlyCostPerProvider, driverValues, totalAnnualBenefit, enabledDriverIds, annualInvestment, netAnnualGain, roiMultiple]);

  // Helper: Convert internal Scenario to ScenarioData for PDF export
  const convertScenarioToExportData = useCallback((scenario: Scenario): ScenarioData => {
    const scenarioInputs: RoiInputs = JSON.parse(JSON.stringify(inputs));
    scenarioInputs.numberOfProviders = scenario.providers;
    scenarioInputs.annualOutpatientEncounters = scenario.encounters;
    scenarioInputs.abridgeUtilizationPct = scenario.utilizationRate;
    const scenarioResults = calculateRoi(scenarioInputs);
    return {
      id: scenario.id,
      name: scenario.name,
      type: scenario.type === 'expand' ? 'expand_providers' : 
            scenario.type === 'drivers' ? 'add_drivers' : 'new_care_setting',
      description: `${scenario.providers} providers, ${scenario.encounters.toLocaleString()} encounters, ${scenario.utilizationRate}% utilization`,
      inputs: scenarioInputs,
      results: scenarioResults,
    };
  }, [inputs]);

  // Export handlers
  const openBaselineExport = useCallback(() => {
    setExportType('baseline');
    setExportScenario(undefined);
    setExportScenarios([]);
    setExportModalOpen(true);
  }, []);

  const openScenarioExport = useCallback((scenario: Scenario) => {
    setExportType('scenario');
    setExportScenario(convertScenarioToExportData(scenario));
    setExportScenarios([]);
    setExportModalOpen(true);
  }, [convertScenarioToExportData]);

  const openComparisonExport = useCallback((scenarioList: Scenario[]) => {
    setExportType('comparison');
    setExportScenario(undefined);
    setExportScenarios(scenarioList.map(convertScenarioToExportData));
    setExportModalOpen(true);
  }, [convertScenarioToExportData]);

  // Handle adding new drivers - update inputs.levers so calculateRoi recomputes
  const handleAddDrivers = () => {
    setInputs((prev) => {
      const newLevers = { ...prev.levers };
      selectedNewDrivers.forEach((id) => {
        newLevers[id] = true;
      });
      return { ...prev, levers: newLevers };
    });
    
    setSelectedNewDrivers(new Set());
    setAddDriverModalOpen(false);
  };

  // Toggle driver selection in modal
  const toggleNewDriver = (id: LeverId) => {
    const newSet = new Set(selectedNewDrivers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNewDrivers(newSet);
  };

  // Helper: toggle expanded driver (accordion behavior)
  const toggleDriverExpansion = (id: LeverId) => {
    if (expandedDriver === id) {
      setExpandedDriver(null);
    } else {
      setExpandedDriver(id);
      // Reset local adjustments when expanding a new card
      setLocalAdjustments({});
    }
  };

  // Helper: Calculate driver value with adjustments applied
  const calculateAdjustedDriverValue = useCallback((driverId: LeverId, adjustments: Partial<Record<LeverId, Record<string, number>>>): number => {
    // Create temp inputs with the driver enabled and adjustments applied
    const tempInputs = JSON.parse(JSON.stringify(inputs));
    tempInputs.levers[driverId] = true;
    
    // Apply adjustments based on driver type - use nullish coalescing to allow zero values
    if (driverId === "hcc" && adjustments.hcc) {
      tempInputs.hcc.pctMedicareAdvantage = adjustments.hcc.maPopulationPct ?? tempInputs.hcc.pctMedicareAdvantage;
      tempInputs.hcc.pmpmBenchmark = adjustments.hcc.benchmarkPmpm ?? tempInputs.hcc.pmpmBenchmark;
      if (adjustments.hcc.recaptureRate !== undefined) {
        tempInputs.hcc.pctMissedConditionsRecaptured = adjustments.hcc.recaptureRate;
      }
    }
    if (driverId === "denials" && adjustments.denials) {
      tempInputs.denials.baselineDenialRate = adjustments.denials.denialRate ?? tempInputs.denials.baselineDenialRate;
      if (adjustments.denials.preventionRate !== undefined) {
        tempInputs.denials.pctDocDenialsRecovered = adjustments.denials.preventionRate;
      }
    }
    if (driverId === "overtime" && adjustments.overtime) {
      tempInputs.overtime.pctAfterHours = adjustments.overtime.afterHoursPct ?? tempInputs.overtime.pctAfterHours;
      tempInputs.overtime.blendedOvertimeRate = adjustments.overtime.premiumRate ?? tempInputs.overtime.blendedOvertimeRate;
    }
    
    const tempResults = calculateRoi(tempInputs);
    return tempResults.levers.find(l => l.id === driverId)?.value || 0;
  }, [inputs]);

  // Helper: Calculate new care setting ROI using authoritative calculateRoi
  const calculateCareSettingRoi = useCallback(() => {
    if (!selectedNewCareSetting) {
      return { totalBenefit: 0, investment: 0, netGain: 0, roi: 0, driverValues: {} as Record<LeverId, number> };
    }
    
    // Build RoiInputs for the new care setting
    const encounters = careSettingConfig.encounterMode === "calculated"
      ? careSettingConfig.providers * careSettingConfig.encountersPerProvider
      : careSettingConfig.customEncounters;
    
    // Clone default inputs and apply care setting configuration
    const careSettingInputs: RoiInputs = JSON.parse(JSON.stringify(defaultInputs));
    careSettingInputs.numberOfProviders = careSettingConfig.providers;
    careSettingInputs.annualOutpatientEncounters = encounters;
    careSettingInputs.abridgeUtilizationPct = careSettingConfig.utilizationRate;
    
    // Apply pricing - ED uses same as Outpatient, Nursing uses placeholder
    if (selectedNewCareSetting === "nursing") {
      careSettingInputs.monthlyCostPerProvider = 100; // Placeholder nursing pricing
    } else {
      careSettingInputs.monthlyCostPerProvider = inputs.monthlyCostPerProvider;
    }
    
    // Enable selected drivers
    Object.keys(careSettingInputs.levers).forEach(key => {
      careSettingInputs.levers[key as LeverId] = careSettingDrivers.has(key as LeverId);
    });
    
    // Handle ED-specific calculations
    if (selectedNewCareSetting === "ed") {
      careSettingInputs.ed = {
        totalClinicians: careSettingConfig.providers,
        shiftsPerClinicianPerYear: 200,
        baselineDocMinutesPerShift: 75,
        minutesSavedPerShift: careSettingDriverAdjustments.edThroughput?.minutesSaved ?? 20,
        totalEdEncounters: encounters,
        baselineLwbsRate: 3.0,
        lwbsImprovementPct: careSettingDriverAdjustments.edThroughput?.lwbsImprovement ?? 0.5,
        pctRecoveredTreatedAndReleased: 81,
        pctRecoveredAdmitted: 19,
        contributionMarginPerEncounter: 250,
        contributionMarginPerAdmission: 2000,
        baselineWrvuPerVisit: careSettingDriverAdjustments.edLevelOfService?.baselineWrvu ?? 2.6,
        wrvuConversionFactor: careSettingDriverAdjustments.edLevelOfService?.revenuePerWrvu ?? 34,
        wrvuImprovementPct: careSettingDriverAdjustments.edLevelOfService?.qualityLift ?? 5,
        netCollectibleRevenue: encounters * 250,
        baselineDenialRate: careSettingDriverAdjustments.edDenialReduction?.denialRate ?? 12,
        pctDenialsFromDocumentation: 32,
        pctDocDenialsRecovered: careSettingDriverAdjustments.edDenialReduction?.preventionRate ?? 40,
        baselineAttritionRate: 5,
        pctTurnoverFromBurnout: 31,
        pctBurnoutReduction: careSettingDriverAdjustments.edRetention?.burnoutReduction ?? 25,
        costPerDeparture: careSettingDriverAdjustments.edRetention?.costPerDeparture ?? 350000,
      };
      
      // Call calculateRoi with ED setting
      const careSettingResults = calculateRoi(careSettingInputs, "ed");
      
      // Extract ED driver values
      const newDriverValues: Record<LeverId, number> = {
        patientAccess: 0, overtime: 0, workforce: 0, wrvu: 0, denials: 0, hcc: 0,
        edThroughput: 0, edLevelOfService: 0, edDenialReduction: 0, edRetention: 0,
        rnDocTime: 0, rnCommunication: 0, rnSafetyReduction: 0, rnDiagnosisSeverity: 0,
      };
      careSettingResults.levers.forEach(lever => {
        if (lever.enabled) {
          newDriverValues[lever.id] = lever.value;
        }
      });
      
      return {
        totalBenefit: careSettingResults.totalAnnualBenefit,
        investment: careSettingResults.annualAbridgeCost,
        netGain: careSettingResults.netValueCreated,
        roi: careSettingResults.roiMultiple,
        driverValues: newDriverValues,
        encounters,
      };
    }
    
    // Apply driver-specific adjustments for outpatient/nursing
    if (careSettingDrivers.has("wrvu") && careSettingDriverAdjustments.wrvu) {
      careSettingInputs.wrvu.pctIncreaseWrvuPerEncounter = careSettingDriverAdjustments.wrvu.qualityLift ?? 6;
      careSettingInputs.wrvu.wrvuConversionFactor = careSettingDriverAdjustments.wrvu.revenuePerWrvu ?? 45;
      careSettingInputs.baselineWrvuPerEncounter = careSettingDriverAdjustments.wrvu.baselineWrvu ?? 2.8;
    }
    if (careSettingDrivers.has("denials") && careSettingDriverAdjustments.denials) {
      careSettingInputs.denials.baselineDenialRate = careSettingDriverAdjustments.denials.denialRate ?? 6;
      careSettingInputs.denials.pctDocDenialsRecovered = careSettingDriverAdjustments.denials.preventionRate ?? 55;
    }
    if (careSettingDrivers.has("overtime") && careSettingDriverAdjustments.overtime) {
      careSettingInputs.overtime.pctAfterHours = careSettingDriverAdjustments.overtime.afterHoursPct ?? 30;
      careSettingInputs.overtime.blendedOvertimeRate = careSettingDriverAdjustments.overtime.premiumRate ?? 160;
    }
    if (careSettingDrivers.has("patientAccess") && careSettingDriverAdjustments.patientAccess) {
      careSettingInputs.minutesSavedPerEncounter = careSettingDriverAdjustments.patientAccess.minutesSaved ?? 12;
    }
    
    // Call authoritative calculateRoi
    const careSettingResults = calculateRoi(careSettingInputs);
    
    // Extract driver values
    const newDriverValues: Record<LeverId, number> = {
      patientAccess: 0, overtime: 0, workforce: 0, wrvu: 0, denials: 0, hcc: 0,
      edThroughput: 0, edLevelOfService: 0, edDenialReduction: 0, edRetention: 0,
      rnDocTime: 0, rnCommunication: 0, rnSafetyReduction: 0, rnDiagnosisSeverity: 0,
    };
    careSettingResults.levers.forEach(lever => {
      if (lever.enabled) {
        newDriverValues[lever.id] = lever.value;
      }
    });
    
    return {
      totalBenefit: careSettingResults.totalAnnualBenefit,
      investment: careSettingResults.annualAbridgeCost,
      netGain: careSettingResults.netValueCreated,
      roi: careSettingResults.roiMultiple,
      driverValues: newDriverValues,
      encounters,
    };
  }, [selectedNewCareSetting, careSettingConfig, careSettingDrivers, careSettingDriverAdjustments, inputs.monthlyCostPerProvider]);

  // Helper: get local value or fallback to model
  const getLocalOrModel = (key: string, modelValue: number): number | string => {
    const localVal = localAdjustments[key];
    if (localVal === undefined) return modelValue;
    return localVal;
  };
  
  // Helper: get numeric value for calculations (treats empty string as 0)
  const getNumericValue = (key: string, modelValue: number): number => {
    const localVal = localAdjustments[key];
    if (localVal === undefined) return modelValue;
    if (localVal === '' || typeof localVal === 'string') return parseFloat(localVal as string) || 0;
    return localVal;
  };

  // Helper: reset local adjustments
  const resetLocalAdjustments = () => {
    setLocalAdjustments({});
  };

  // Helper: remove a driver from the model
  const removeDriver = (driverId: LeverId) => {
    setInputs((prev) => ({
      ...prev,
      levers: {
        ...prev.levers,
        [driverId]: false,
      },
    }));
    setExpandedDriver(null);
    setRemovedDriverToast(leverLabels[driverId]);
    // Clear any existing timeout to prevent stale dismissals
    if (removedToastTimeoutRef.current) {
      clearTimeout(removedToastTimeoutRef.current);
    }
    // Auto-dismiss toast after 5 seconds
    removedToastTimeoutRef.current = setTimeout(() => setRemovedDriverToast(null), 5000);
  };

  // Helper: apply local adjustments to model
  const applyAdjustments = (driverId: LeverId, updates: Record<string, unknown>) => {
    setInputs((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)) as RoiInputs;
      Object.entries(updates).forEach(([key, value]) => {
        if (key === "patientAccess" && typeof value === "object" && value !== null) {
          updated.patientAccess = { ...prev.patientAccess, ...(value as object) };
        } else if (key === "overtime" && typeof value === "object" && value !== null) {
          updated.overtime = { ...prev.overtime, ...(value as object) };
        } else if (key === "workforce" && typeof value === "object" && value !== null) {
          updated.workforce = { ...prev.workforce, ...(value as object) };
        } else if (key === "wrvu" && typeof value === "object" && value !== null) {
          updated.wrvu = { ...prev.wrvu, ...(value as object) };
        } else if (key === "denials" && typeof value === "object" && value !== null) {
          updated.denials = { ...prev.denials, ...(value as object) };
        } else if (key === "hcc" && typeof value === "object" && value !== null) {
          updated.hcc = { ...prev.hcc, ...(value as object) };
        } else if (key === "baselineWrvuPerEncounter" && typeof value === "number") {
          updated.baselineWrvuPerEncounter = value;
        }
      });
      return updated;
    });
    setLocalAdjustments({});
  };

  // Helper: inline save for a single value - updates input and shows toast
  const saveInlineValue = useCallback((
    driverName: string, 
    fieldKey: string, 
    newValue: number, 
    updateFn: (prev: RoiInputs) => RoiInputs
  ) => {
    setInputs(updateFn);
    setCustomizedValues((prev) => new Set<string>([...Array.from(prev), fieldKey]));
    toast({
      title: `${driverName} updated`,
      description: `Value saved successfully`,
      duration: 3000,
    });
  }, [toast]);

  // Impact calculation helpers for each driver
  const calculatePatientAccessImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "minutesSavedPerEncounter") testInputs.minutesSavedPerEncounter = newValue;
    else if (field === "pctTimeToNewVisits") testInputs.patientAccess.pctTimeToNewVisits = newValue;
    else if (field === "avgVisitDurationMinutes") testInputs.patientAccess.avgVisitDurationMinutes = newValue;
    else if (field === "avgNetRevenuePerVisit") testInputs.patientAccess.avgNetRevenuePerVisit = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "patientAccess")?.value ?? 0;
    const currentTotal = driverValues.patientAccess;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.patientAccess]);

  const calculateWrvuImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "baselineWrvuPerEncounter") testInputs.baselineWrvuPerEncounter = newValue;
    else if (field === "pctIncreaseWrvuPerEncounter") testInputs.wrvu.pctIncreaseWrvuPerEncounter = newValue;
    else if (field === "wrvuConversionFactor") testInputs.wrvu.wrvuConversionFactor = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "wrvu")?.value ?? 0;
    const currentTotal = driverValues.wrvu;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.wrvu]);

  const calculateWorkforceImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "baselineAttritionRate") testInputs.workforce.baselineAttritionRate = newValue;
    else if (field === "pctBurnoutExitsAvoided") testInputs.workforce.pctBurnoutExitsAvoided = newValue;
    else if (field === "costPerDeparture") testInputs.workforce.costPerDeparture = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "workforce")?.value ?? 0;
    const currentTotal = driverValues.workforce;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.workforce]);

  const calculateHccImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "pctMedicareAdvantage") testInputs.hcc.pctMedicareAdvantage = newValue;
    else if (field === "pmpmBenchmark") testInputs.hcc.pmpmBenchmark = newValue;
    else if (field === "pctMissedConditionsRecaptured") testInputs.hcc.pctMissedConditionsRecaptured = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "hcc")?.value ?? 0;
    const currentTotal = driverValues.hcc;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.hcc]);

  const calculateDenialsImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "baselineDenialRate") testInputs.denials.baselineDenialRate = newValue;
    else if (field === "pctDocDenialsRecovered") testInputs.denials.pctDocDenialsRecovered = newValue;
    else if (field === "avgRevenuePerEncounter") testInputs.denials.avgRevenuePerEncounter = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "denials")?.value ?? 0;
    const currentTotal = driverValues.denials;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.denials]);

  const calculateOvertimeImpact = useCallback((field: string, newValue: number) => {
    const testInputs = JSON.parse(JSON.stringify(inputs)) as RoiInputs;
    if (field === "pctOvertimeReduced") testInputs.overtime.pctOvertimeReduced = newValue;
    else if (field === "blendedOvertimeRate") testInputs.overtime.blendedOvertimeRate = newValue;
    
    const testResults = calculateRoi(testInputs);
    const newTotal = testResults.levers.find(l => l.id === "overtime")?.value ?? 0;
    const currentTotal = driverValues.overtime;
    const delta = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (delta / currentTotal) * 100 : 0;
    
    return { newTotal, delta, percentChange };
  }, [inputs, driverValues.overtime]);

  // Scenario Builder functions
  const initScenarioForm = (scenario?: Scenario) => {
    if (scenario) {
      setScenarioForm({
        name: scenario.name,
        providers: scenario.providers,
        encounters: scenario.encounters,
        utilizationRate: scenario.utilizationRate,
        maPopulationPct: scenario.maPopulationPct,
        newPatientPct: scenario.newPatientPct,
        specialtyPct: scenario.specialtyPct,
        revenuePerVisitOverride: scenario.revenuePerVisitOverride,
        visitLengthOverride: scenario.visitLengthOverride,
      });
      setEditingScenarioId(scenario.id);
    } else {
      setScenarioForm({
        name: "",
        providers: inputs.numberOfProviders,
        encounters: inputs.annualOutpatientEncounters,
        utilizationRate: inputs.abridgeUtilizationPct,
        maPopulationPct: 15,
        newPatientPct: 30,
        specialtyPct: 40,
        revenuePerVisitOverride: null,
        visitLengthOverride: null,
      });
      setEditingScenarioId(null);
    }
    setAdvancedOpen(false);
  };

  const calculateScenarioResults = (form: typeof scenarioForm) => {
    // Build scenario-specific inputs by cloning current inputs
    const scenarioInputs: RoiInputs = JSON.parse(JSON.stringify(inputs));
    
    // Apply basic inputs
    scenarioInputs.numberOfProviders = form.providers;
    scenarioInputs.annualOutpatientEncounters = form.encounters;
    scenarioInputs.abridgeUtilizationPct = form.utilizationRate;
    
    // Update dependent fields that scale with providers/encounters
    // Workforce: providerCount should match scenario providers
    scenarioInputs.workforce.providerCount = form.providers;
    
    // Scale totalMedicareAdvantagePatients proportionally to encounters
    const encounterRatio = form.encounters / inputs.annualOutpatientEncounters;
    scenarioInputs.totalMedicareAdvantagePatients = Math.round(inputs.totalMedicareAdvantagePatients * encounterRatio);
    
    // Denials avgRevenuePerEncounter doesn't need scaling - it's per-encounter already
    
    // Apply advanced inputs - visit length
    if (form.visitLengthOverride !== null) {
      scenarioInputs.patientAccess.avgVisitDurationMinutes = form.visitLengthOverride;
    }
    
    // Apply advanced inputs - revenue per visit
    if (form.revenuePerVisitOverride !== null) {
      scenarioInputs.patientAccess.avgNetRevenuePerVisit = form.revenuePerVisitOverride;
    }
    
    // Apply specialty mix to baseline wRVU
    const baselineWrvuFromMix = (form.specialtyPct / 100) * 1.9 + ((100 - form.specialtyPct) / 100) * 1.6;
    // Adjust for new patient percentage
    const newPatientAdjustment = ((form.newPatientPct - 30) / 100) * 0.3; // +/- 0.3 for 10% change
    scenarioInputs.baselineWrvuPerEncounter = baselineWrvuFromMix + newPatientAdjustment;
    
    // Apply MA population to HCC (override the MA percentage)
    scenarioInputs.hcc.pctMedicareAdvantage = form.maPopulationPct;
    
    // Run calculations
    const scenarioResults = calculateRoi(scenarioInputs);
    
    // Extract driver values
    const scenarioDriverValues: Record<LeverId, number> = {
      patientAccess: 0,
      wrvu: 0,
      workforce: 0,
      hcc: 0,
      denials: 0,
      overtime: 0,
      edThroughput: 0,
      edLevelOfService: 0,
      edDenialReduction: 0,
      edRetention: 0,
      rnDocTime: 0,
      rnCommunication: 0,
      rnSafetyReduction: 0,
      rnDiagnosisSeverity: 0,
    };
    scenarioResults.levers.forEach((lever) => {
      scenarioDriverValues[lever.id as LeverId] = lever.value;
    });
    
    return {
      totalBenefit: scenarioResults.totalAnnualBenefit,
      investment: scenarioResults.annualAbridgeCost,
      netGain: scenarioResults.netValueCreated,
      roiMultiple: scenarioResults.roiMultiple,
      driverValues: scenarioDriverValues,
    };
  };

  const handleCalculateScenario = () => {
    const name = scenarioForm.name.trim() || `Scenario ${scenarios.length + 1}`;
    const results = calculateScenarioResults(scenarioForm);
    
    // Find existing scenario for createdAt preservation
    const existingScenario = editingScenarioId ? scenarios.find(s => s.id === editingScenarioId) : null;
    
    const newScenario: Scenario = {
      id: editingScenarioId || Date.now().toString(),
      name,
      type: existingScenario?.type || currentScenarioType,
      createdAt: existingScenario?.createdAt || new Date(),
      providers: scenarioForm.providers,
      encounters: scenarioForm.encounters,
      utilizationRate: scenarioForm.utilizationRate,
      maPopulationPct: scenarioForm.maPopulationPct,
      newPatientPct: scenarioForm.newPatientPct,
      specialtyPct: scenarioForm.specialtyPct,
      revenuePerVisitOverride: scenarioForm.revenuePerVisitOverride,
      visitLengthOverride: scenarioForm.visitLengthOverride,
      ...results,
    };
    
    if (editingScenarioId) {
      setScenarios((prev) => prev.map((s) => (s.id === editingScenarioId ? newScenario : s)));
    } else {
      setScenarios((prev) => [newScenario, ...prev]);
    }
    
    setShowScenarioForm(false);
    setShowComparison(newScenario.id);
    setEditingScenarioId(null);
  };
  
  // Toggle scenario selection for comparison
  const toggleScenarioSelection = (scenarioId: string) => {
    setSelectedScenariosForCompare((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scenarioId)) {
        newSet.delete(scenarioId);
      } else if (newSet.size < 3) {
        newSet.add(scenarioId);
      }
      return newSet;
    });
  };
  
  // Get scenario type icon
  const getScenarioTypeIcon = (type: ScenarioType) => {
    switch (type) {
      case "expand": return TrendingUp;
      case "drivers": return Target;
      case "setting": return Building2;
      default: return TrendingUp;
    }
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (showComparison === id) {
      setShowComparison(null);
    }
  };

  // Scenario preview calculations
  const scenarioPreview = useMemo(() => {
    const eligibleEncounters = Math.round(scenarioForm.encounters * (scenarioForm.utilizationRate / 100));
    const baselineEligible = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
    const changeFromBaseline = baselineEligible > 0 ? ((eligibleEncounters - baselineEligible) / baselineEligible) * 100 : 0;
    return { eligibleEncounters, changeFromBaseline };
  }, [scenarioForm.encounters, scenarioForm.utilizationRate, inputs.annualOutpatientEncounters, inputs.abridgeUtilizationPct]);

  // Blended wRVU calculation for display
  const blendedWrvuPreview = useMemo(() => {
    const base = (scenarioForm.specialtyPct / 100) * 1.9 + ((100 - scenarioForm.specialtyPct) / 100) * 1.6;
    const adjustment = ((scenarioForm.newPatientPct - 30) / 100) * 0.3;
    return base + adjustment;
  }, [scenarioForm.specialtyPct, scenarioForm.newPatientPct]);

  // Calculation helpers for detailed breakdown
  const encountersWithAbridge = inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100);
  const totalHoursReclaimed = (encountersWithAbridge * inputs.minutesSavedPerEncounter) / 60;

  // Tab definitions
  const tabs: { id: TabId; label: string }[] = [
    { id: "summary", label: "Summary View" },
    { id: "detailed", label: "Detailed Breakdown" },
    { id: "scenarios", label: "Scenario Builder" },
    { id: "export", label: "Export Summary" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] relative">
      {/* Background patterns */}
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="fixed top-[-5%] right-[-5%] w-[700px] md:w-[1000px] lg:w-[1200px] pointer-events-none opacity-[0.015]"
        style={{ zIndex: 0 }}
      />
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="fixed bottom-[-5%] left-[-5%] w-[600px] md:w-[900px] lg:w-[1000px] pointer-events-none opacity-[0.01] rotate-180"
        style={{ zIndex: 0 }}
      />
      {/* Header */}
      <header className="relative z-20 bg-white border-b border-neutral-200">
        <div className="w-full px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col gap-1 cursor-pointer" onClick={onBack} data-testid="logo-home">
              <span className="text-[18px] md:text-[20px] font-bold text-[#F03319] tracking-tight leading-none uppercase">
                ABRIDGE
              </span>
              <span className="text-[14px] md:text-[15px] font-semibold text-[#111827] tracking-tight leading-none">
                ROI Calculator
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F03319]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "summary" && (
          <div className="space-y-8">
            {/* YOUR ROI MODEL - Headline Results */}
            <section
              className="bg-white rounded-2xl border border-neutral-200/60 p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
              data-testid="section-roi-headline"
            >
              <div className="mb-6">
                <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-2">
                  Your ROI Model
                </h2>
                <p className="text-sm text-neutral-600">
                  Based on <span className="font-semibold text-neutral-900">{inputs.numberOfProviders.toLocaleString()} providers</span>, <span className="font-semibold text-neutral-900">{abridgeDocumentedEncounters.toLocaleString()} Abridge-documented encounters</span>
                </p>
                <p className="text-sm text-neutral-500">
                  {careSettingLabel} care setting
                </p>
              </div>

              {/* Main Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Net Annual Gain */}
                <div className="text-center md:text-left">
                  <div className="text-4xl md:text-5xl font-bold text-[#0E9F6E] font-mono tracking-tight" data-testid="metric-net-gain">
                    {formatCurrency(netAnnualGain)}
                  </div>
                  <div className="text-sm text-neutral-500 mt-2">
                    Net Annual Gain
                  </div>
                </div>

                {/* ROI Multiple */}
                <div className="text-center md:text-left">
                  <div className="text-4xl md:text-5xl font-bold text-neutral-900 font-mono tracking-tight" data-testid="metric-roi">
                    {roiMultiple.toFixed(2)}x
                  </div>
                  <div className="text-sm text-neutral-500 mt-2">
                    Return on Investment
                  </div>
                </div>
              </div>

              {/* Supporting Details */}
              <div className="flex flex-col sm:flex-row gap-6 pt-6 border-t border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Total Annual Benefit</div>
                    <div className="text-lg font-bold text-neutral-900 font-mono" data-testid="metric-total-benefit">
                      {formatCurrency(totalAnnualBenefit)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-neutral-600" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Annual Investment</div>
                    <div className="text-lg font-bold text-neutral-900 font-mono" data-testid="metric-annual-investment">
                      {formatCurrency(annualInvestment)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* WHERE YOUR VALUE COMES FROM */}
            <section
              className="bg-white rounded-2xl border border-neutral-200/60 p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
              data-testid="section-value-breakdown"
            >
              <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-6">
                Where Your Value Comes From
              </h2>

              {enabledDriverIds.length > 0 ? (
                <div className="space-y-8">
                  {/* CAPACITY & LABOR Category */}
                  {(() => {
                    const capacityDrivers: LeverId[] = ["patientAccess", "workforce", "overtime"];
                    const activeCapacityDrivers = enabledDriverIds.filter(id => capacityDrivers.includes(id));
                    const capacityTotal = activeCapacityDrivers.reduce((sum, id) => sum + driverValues[id], 0);
                    
                    if (activeCapacityDrivers.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                            Capacity & Labor
                          </span>
                        </div>
                        <div className="space-y-3">
                          {activeCapacityDrivers.map((id) => {
                            const value = driverValues[id];
                            const DriverIcon = DRIVER_ICONS[id];
                            
                            // Generate calculation snippet based on driver - mirrors calculateRoi formulas
                            let calcSnippet = "";
                            if (id === "patientAccess") {
                              const reinvestedHours = totalHoursReclaimed * (inputs.patientAccess.pctTimeToNewVisits / 100);
                              const addedVisits = Math.round(reinvestedHours / (inputs.patientAccess.avgVisitDurationMinutes / 60));
                              calcSnippet = `${addedVisits.toLocaleString()} incremental visits × ${formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit)}/visit`;
                            } else if (id === "workforce") {
                              const departuresAvoided = Math.round(inputs.numberOfProviders * (inputs.workforce.baselineAttritionRate / 100) * (inputs.workforce.pctAttritionLinkedToBurnout / 100) * (inputs.workforce.pctBurnoutExitsAvoided / 100));
                              calcSnippet = `${departuresAvoided} departures avoided × ${formatCurrency(inputs.workforce.costPerDeparture)} replacement cost`;
                            } else if (id === "overtime") {
                              const afterHoursReclaimed = totalHoursReclaimed * (inputs.overtime.pctAfterHours / 100);
                              const overtimeReduced = Math.round(afterHoursReclaimed * (inputs.overtime.pctOvertimeReduced / 100));
                              calcSnippet = `${overtimeReduced.toLocaleString()} overtime hours reduced × ${formatCurrency(inputs.overtime.blendedOvertimeRate)}/hr`;
                            }
                            
                            // One-line description
                            const descriptions: Partial<Record<LeverId, string>> = {
                              patientAccess: "Time returned → visit capacity",
                              workforce: "Reduced turnover from lower admin burden",
                              overtime: "Reduced premium labor from documentation backlog",
                              wrvu: "Accurate wRVU capture from better documentation",
                              hcc: "Improved RAF scores from complete documentation",
                              denials: "Fewer denials from complete documentation",
                            };
                            
                            return (
                              <div
                                key={id}
                                className="bg-white border border-neutral-200/60 rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
                                data-testid={`driver-card-summary-${id}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ backgroundColor: `${DRIVER_COLORS[id]}15` }}
                                    >
                                      {DriverIcon && (
                                        <DriverIcon
                                          className="h-4 w-4"
                                          style={{ color: DRIVER_COLORS[id] }}
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-base font-semibold text-neutral-900">
                                        {leverLabels[id]}
                                      </div>
                                      <div className="text-sm text-neutral-500 mt-0.5">
                                        {descriptions[id]}
                                      </div>
                                      <div className="text-sm text-[#9CA3AF] mt-1 font-mono" style={{ lineHeight: 1.5 }}>
                                        {calcSnippet}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-lg font-semibold text-green-600 font-mono shrink-0">
                                    {formatCurrency(value)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* REVENUE & RISK Category */}
                  {(() => {
                    const revenueDrivers: LeverId[] = ["wrvu", "hcc", "denials"];
                    const activeRevenueDrivers = enabledDriverIds.filter(id => revenueDrivers.includes(id));
                    const revenueTotal = activeRevenueDrivers.reduce((sum, id) => sum + driverValues[id], 0);
                    
                    if (activeRevenueDrivers.length === 0) return null;
                    
                    return (
                      <div>
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                            Revenue & Risk
                          </span>
                        </div>
                        <div className="space-y-3">
                          {activeRevenueDrivers.map((id) => {
                            const value = driverValues[id];
                            const DriverIcon = DRIVER_ICONS[id];
                            
                            // Generate calculation snippet based on driver - mirrors calculateRoi formulas
                            let calcSnippet = "";
                            if (id === "wrvu") {
                              const incrementalWrvuPerEncounter = inputs.baselineWrvuPerEncounter * (inputs.wrvu.pctIncreaseWrvuPerEncounter / 100);
                              const totalIncrementalWrvus = Math.round(incrementalWrvuPerEncounter * encountersWithAbridge);
                              calcSnippet = `${totalIncrementalWrvus.toLocaleString()} incremental wRVUs × ${formatCurrency(inputs.wrvu.wrvuConversionFactor)}/wRVU`;
                            } else if (id === "hcc") {
                              const maPatients = Math.round((encountersWithAbridge / 2.5) * (inputs.hcc.pctMedicareAdvantage / 100));
                              const totalConditions = maPatients * inputs.hcc.avgConditionsPerMember;
                              const missedConditions = totalConditions * (inputs.hcc.pctConditionsMissed / 100);
                              const recapturedConditions = missedConditions * (inputs.hcc.pctMissedConditionsRecaptured / 100);
                              const newConditions = totalConditions * (inputs.hcc.pctNewConditionsIdentified / 100);
                              const totalImproved = recapturedConditions + newConditions;
                              const rawRafPointsGained = totalImproved * inputs.hcc.rafGainPerCondition;
                              const rawRafChange = maPatients > 0 ? rawRafPointsGained / maPatients : 0;
                              const adjustedRafChange = rawRafChange * (1 - inputs.hcc.rafRealizationHaircut / 100);
                              calcSnippet = `${maPatients.toLocaleString()} MA patients × ${(adjustedRafChange * 100).toFixed(2)}% RAF lift × ${formatCurrency(inputs.hcc.pmpmBenchmark)}/PMPM × 12 mo`;
                            } else if (id === "denials") {
                              const netRevenue = encountersWithAbridge * inputs.denials.avgRevenuePerEncounter;
                              const docDenialRevenue = Math.round(netRevenue * (inputs.denials.baselineDenialRate / 100) * (inputs.denials.pctDenialsFromDocumentation / 100));
                              calcSnippet = `${formatCurrency(docDenialRevenue)} doc-related denials × ${inputs.denials.pctDocDenialsRecovered}% recovered`;
                            }
                            
                            // One-line description
                            const descriptions: Partial<Record<LeverId, string>> = {
                              patientAccess: "Time returned → visit capacity",
                              workforce: "Reduced turnover from lower admin burden",
                              overtime: "Reduced premium labor from documentation backlog",
                              wrvu: "Accurate wRVU capture from better documentation",
                              hcc: "Improved RAF scores from complete documentation",
                              denials: "Fewer denials from complete documentation",
                            };
                            
                            return (
                              <div
                                key={id}
                                className="bg-white border border-neutral-200/60 rounded-lg p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
                                data-testid={`driver-card-summary-${id}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ backgroundColor: `${DRIVER_COLORS[id]}15` }}
                                    >
                                      {DriverIcon && (
                                        <DriverIcon
                                          className="h-4 w-4"
                                          style={{ color: DRIVER_COLORS[id] }}
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-base font-semibold text-neutral-900">
                                        {leverLabels[id]}
                                      </div>
                                      <div className="text-sm text-neutral-500 mt-0.5">
                                        {descriptions[id]}
                                      </div>
                                      <div className="text-sm text-[#9CA3AF] mt-1 font-mono" style={{ lineHeight: 1.5 }}>
                                        {calcSnippet}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-lg font-semibold text-green-600 font-mono shrink-0">
                                    {formatCurrency(value)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  <p>No drivers selected. Add drivers to see your value breakdown.</p>
                </div>
              )}
            </section>

            {/* EXPLORE YOUR MODEL */}
            <section data-testid="section-explore-model">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-6">
                Explore Your Model
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Deep Dive - Purple/Indigo for analysis */}
                <button
                  onClick={() => setActiveTab("detailed")}
                  className="group bg-white rounded-lg border border-neutral-200/60 p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#7C3AED] transform hover:scale-[1.01] transition-all duration-200 ease-out cursor-pointer"
                  data-testid="card-deep-dive"
                >
                  <div className="w-10 h-10 rounded-full bg-[#EDE9FE] flex items-center justify-center mb-3 group-hover:bg-[#DDD6FE] transition-colors">
                    <Search className="h-5 w-5 text-[#7C3AED]" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    Deep Dive
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Review calculations and adjust assumptions
                  </p>
                </button>

                {/* Card 2: Model Scenarios - Teal/Emerald for growth */}
                <button
                  onClick={() => setActiveTab("scenarios")}
                  className="group bg-white rounded-lg border border-neutral-200/60 p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#059669] transform hover:scale-[1.01] transition-all duration-200 ease-out cursor-pointer"
                  data-testid="card-scenarios"
                >
                  <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center mb-3 group-hover:bg-[#A7F3D0] transition-colors">
                    <TrendingUp className="h-5 w-5 text-[#059669]" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    Model Scenarios
                  </h3>
                  <p className="text-sm text-neutral-500">
                    See what expansion could look like
                  </p>
                </button>

                {/* Card 3: Export PDF - Abridge Red for action */}
                <button
                  onClick={() => setActiveTab("export")}
                  className="group bg-white rounded-lg border border-neutral-200/60 p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#F03319] transform hover:scale-[1.01] transition-all duration-200 ease-out cursor-pointer"
                  data-testid="card-export"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FEE2E2] flex items-center justify-center mb-3 group-hover:bg-[#FECACA] transition-colors">
                    <Download className="h-5 w-5 text-[#F03319]" />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">
                    Export PDF
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Create executive summary for leadership
                  </p>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-2">
                    Driver Deep Dive
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Review calculations and adjust assumptions to refine your model
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAddDriverModalOpen(true)}
                  className="gap-2 shrink-0"
                  data-testid="button-add-driver-detailed"
                >
                  <Plus className="h-4 w-4" />
                  Add Driver
                </Button>
              </div>
            </div>

            {/* Removed driver toast */}
            {removedDriverToast && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  {removedDriverToast} removed. You can add it back with the "Add Driver" button above.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemovedDriverToast(null)}
                  className="text-amber-600"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Driver Cards */}
            <div className="space-y-4">
              {enabledDriverIds.map((driverId) => {
                const DriverIcon = DRIVER_ICONS[driverId];
                const driverValue = driverValues[driverId];
                const isExpanded = expandedDriver === driverId;

                return (
                  <div
                    key={driverId}
                    className="group bg-white rounded-xl border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#E8532F] transform hover:scale-[1.01] overflow-hidden transition-all duration-200 ease-out cursor-pointer"
                    data-testid={`driver-card-${driverId}`}
                  >
                    {/* Collapsed Header (always visible) */}
                    <button
                      onClick={() => toggleDriverExpansion(driverId)}
                      className="w-full flex items-center justify-between p-6 group-hover:bg-neutral-50/50 transition-colors"
                      data-testid={`button-expand-${driverId}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${DRIVER_COLORS[driverId]}15` }}
                        >
                          {DriverIcon && (
                            <DriverIcon
                              className="h-5 w-5"
                              style={{ color: DRIVER_COLORS[driverId] }}
                            />
                          )}
                        </div>
                        <span className="text-base font-semibold text-neutral-900">
                          {leverLabels[driverId]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-neutral-900 font-mono">
                          {formatCurrency(driverValue)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-neutral-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-neutral-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 p-6 space-y-8">
                        {/* PATIENT ACCESS */}
                        {driverId === "patientAccess" && (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Time Returned */}
                              <CalcStep stepNumber={1} title="Time Returned">
                                <EditableCalcRow
                                  label="Minutes saved per encounter"
                                  value={inputs.minutesSavedPerEncounter}
                                  unit="min"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("minutesSavedPerEncounter")}
                                  typicalRange={{ min: 2, max: 4 }}
                                  postureName="Typical"
                                  driverName="Patient Access"
                                  onSave={(newValue) => saveInlineValue(
                                    "Patient Access", 
                                    "minutesSavedPerEncounter", 
                                    newValue,
                                    (prev) => ({ ...prev, minutesSavedPerEncounter: newValue })
                                  )}
                                  calculateImpact={(newValue) => calculatePatientAccessImpact("minutesSavedPerEncounter", newValue)}
                                />
                                <CalcRow label="Annual Abridge-documented encounters" value={encountersWithAbridge.toLocaleString()} />
                                <CalcRow label="Total hours returned" value={`${totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} isResult={true} />
                              </CalcStep>

                              {/* Step 2: Realized Capacity */}
                              <CalcStep stepNumber={2} title="Realized Capacity" note="Not all time converts to new visits due to scheduling, staffing, and demand constraints.">
                                <CalcRow label="Total hours returned" value={`${totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} />
                                <EditableCalcRow
                                  label="Realization factor"
                                  value={inputs.patientAccess.pctTimeToNewVisits}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctTimeToNewVisits")}
                                  typicalRange={{ min: 10, max: 35 }}
                                  postureName="Typical"
                                  driverName="Patient Access"
                                  onSave={(newValue) => saveInlineValue(
                                    "Patient Access", 
                                    "pctTimeToNewVisits", 
                                    newValue,
                                    (prev) => ({ ...prev, patientAccess: { ...prev.patientAccess, pctTimeToNewVisits: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculatePatientAccessImpact("pctTimeToNewVisits", newValue)}
                                />
                                <CalcRow label="Usable hours" value={`${(totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} isResult={true} />
                              </CalcStep>

                              {/* Step 3: New Visit Capacity */}
                              <CalcStep stepNumber={3} title="New Visit Capacity">
                                <CalcRow label="Usable hours" value={(totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <EditableCalcRow
                                  label="Average visit duration"
                                  value={inputs.patientAccess.avgVisitDurationMinutes}
                                  unit="min"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("avgVisitDurationMinutes")}
                                  typicalRange={{ min: 20, max: 45 }}
                                  postureName="Typical"
                                  driverName="Patient Access"
                                  onSave={(newValue) => saveInlineValue(
                                    "Patient Access", 
                                    "avgVisitDurationMinutes", 
                                    newValue,
                                    (prev) => ({ ...prev, patientAccess: { ...prev.patientAccess, avgVisitDurationMinutes: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculatePatientAccessImpact("avgVisitDurationMinutes", newValue)}
                                />
                                <CalcRow label="Additional visits possible" value={`${((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (inputs.patientAccess.avgVisitDurationMinutes / 60)).toLocaleString(undefined, { maximumFractionDigits: 0 })} visits`} isResult={true} />
                              </CalcStep>

                              {/* Step 4: Revenue Impact */}
                              <CalcStep stepNumber={4} title="Revenue Impact" isLast={true}>
                                <CalcRow label="Additional visits" value={((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (inputs.patientAccess.avgVisitDurationMinutes / 60)).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <EditableCalcRow
                                  label="Net revenue per visit"
                                  value={inputs.patientAccess.avgNetRevenuePerVisit}
                                  prefix="$"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("avgNetRevenuePerVisit")}
                                  typicalRange={{ min: 150, max: 350 }}
                                  postureName="Typical"
                                  driverName="Patient Access"
                                  onSave={(newValue) => saveInlineValue(
                                    "Patient Access", 
                                    "avgNetRevenuePerVisit", 
                                    newValue,
                                    (prev) => ({ ...prev, patientAccess: { ...prev.patientAccess, avgNetRevenuePerVisit: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculatePatientAccessImpact("avgNetRevenuePerVisit", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("patientAccess")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-patientAccess"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        )}

                        {/* LEVEL OF SERVICE (wRVU) */}
                        {driverId === "wrvu" && (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Baseline wRVU Performance */}
                              <CalcStep stepNumber={1} title="Baseline wRVU Performance">
                                <CalcRow label="Annual Abridge-documented encounters" value={encountersWithAbridge.toLocaleString()} />
                                <EditableCalcRow
                                  label="Baseline wRVU per encounter"
                                  value={inputs.baselineWrvuPerEncounter}
                                  isEditable={true}
                                  isCustomized={customizedValues.has("baselineWrvuPerEncounter")}
                                  typicalRange={{ min: 1.0, max: 2.5 }}
                                  postureName="Typical"
                                  driverName="Level of Service"
                                  onSave={(newValue) => saveInlineValue(
                                    "Level of Service", 
                                    "baselineWrvuPerEncounter", 
                                    newValue,
                                    (prev) => ({ ...prev, baselineWrvuPerEncounter: newValue })
                                  )}
                                  calculateImpact={(newValue) => calculateWrvuImpact("baselineWrvuPerEncounter", newValue)}
                                />
                                <CalcRow label="Current annual wRVUs" value={`${(encountersWithAbridge * inputs.baselineWrvuPerEncounter).toLocaleString(undefined, { maximumFractionDigits: 0 })} wRVUs`} isResult={true} />
                              </CalcStep>

                              {/* Step 2: Documentation Quality Lift */}
                              <CalcStep stepNumber={2} title="Documentation Quality Lift">
                                <EditableCalcRow
                                  label="wRVU improvement"
                                  value={inputs.wrvu.pctIncreaseWrvuPerEncounter}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctIncreaseWrvuPerEncounter")}
                                  typicalRange={{ min: 3, max: 7 }}
                                  postureName="Typical"
                                  driverName="Level of Service"
                                  onSave={(newValue) => saveInlineValue(
                                    "Level of Service", 
                                    "pctIncreaseWrvuPerEncounter", 
                                    newValue,
                                    (prev) => ({ ...prev, wrvu: { ...prev.wrvu, pctIncreaseWrvuPerEncounter: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateWrvuImpact("pctIncreaseWrvuPerEncounter", newValue)}
                                />
                              </CalcStep>

                              {/* Step 3: Additional wRVUs Captured */}
                              <CalcStep stepNumber={3} title="Additional wRVUs Captured">
                                <CalcRow label="Current annual wRVUs" value={(encountersWithAbridge * inputs.baselineWrvuPerEncounter).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <CalcRow label="× Documentation lift" value={`${inputs.wrvu.pctIncreaseWrvuPerEncounter}%`} />
                                <CalcRow label="Additional wRVUs captured" value={`${(encountersWithAbridge * inputs.baselineWrvuPerEncounter * inputs.wrvu.pctIncreaseWrvuPerEncounter / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} wRVUs`} isResult={true} />
                              </CalcStep>

                              {/* Step 4: Revenue Impact */}
                              <CalcStep stepNumber={4} title="Revenue Impact" isLast={true} note="Actual reimbursement varies by payer mix and contracted rates.">
                                <CalcRow label="Additional wRVUs captured" value={(encountersWithAbridge * inputs.baselineWrvuPerEncounter * inputs.wrvu.pctIncreaseWrvuPerEncounter / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <EditableCalcRow
                                  label="Revenue per wRVU"
                                  value={inputs.wrvu.wrvuConversionFactor}
                                  prefix="$"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("wrvuConversionFactor")}
                                  typicalRange={{ min: 36, max: 80 }}
                                  postureName="Typical"
                                  driverName="Level of Service"
                                  onSave={(newValue) => saveInlineValue(
                                    "Level of Service", 
                                    "wrvuConversionFactor", 
                                    newValue,
                                    (prev) => ({ ...prev, wrvu: { ...prev.wrvu, wrvuConversionFactor: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateWrvuImpact("wrvuConversionFactor", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("wrvu")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-wrvu"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        )}

                        {/* CLINICIAN RETENTION (workforce) */}
                        {driverId === "workforce" && (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Baseline Turnover */}
                              <CalcStep stepNumber={1} title="Baseline Turnover">
                                <CalcRow label="Total providers" value={inputs.workforce.providerCount} />
                                <EditableCalcRow
                                  label="Annual turnover rate"
                                  value={inputs.workforce.baselineAttritionRate}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("baselineAttritionRate")}
                                  typicalRange={{ min: 5, max: 15 }}
                                  postureName="Typical"
                                  driverName="Clinician Retention"
                                  onSave={(newValue) => saveInlineValue(
                                    "Clinician Retention", 
                                    "baselineAttritionRate", 
                                    newValue,
                                    (prev) => ({ ...prev, workforce: { ...prev.workforce, baselineAttritionRate: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateWorkforceImpact("baselineAttritionRate", newValue)}
                                />
                                <CalcRow label="Expected departures" value={`${(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100).toFixed(1)} providers/year`} isResult={true} />
                              </CalcStep>

                              {/* Step 2: Abridge Impact */}
                              <CalcStep stepNumber={2} title="Abridge Impact">
                                <CalcRow label="Expected departures" value={(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100).toFixed(1)} />
                                <CalcRow label="% due to burnout/workload" value={`${inputs.workforce.pctAttritionLinkedToBurnout}%`} />
                                <EditableCalcRow
                                  label="% preventable with Abridge"
                                  value={inputs.workforce.pctBurnoutExitsAvoided}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctBurnoutExitsAvoided")}
                                  typicalRange={{ min: 10, max: 30 }}
                                  postureName="Typical"
                                  driverName="Clinician Retention"
                                  onSave={(newValue) => saveInlineValue(
                                    "Clinician Retention", 
                                    "pctBurnoutExitsAvoided", 
                                    newValue,
                                    (prev) => ({ ...prev, workforce: { ...prev.workforce, pctBurnoutExitsAvoided: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateWorkforceImpact("pctBurnoutExitsAvoided", newValue)}
                                />
                                <CalcRow label="Departures avoided" value={`${(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100 * inputs.workforce.pctAttritionLinkedToBurnout / 100 * inputs.workforce.pctBurnoutExitsAvoided / 100).toFixed(2)} per year`} isResult={true} />
                              </CalcStep>

                              {/* Step 3: Cost Savings */}
                              <CalcStep stepNumber={3} title="Cost Savings" isLast={true} note="Impact timeline: Retention improvements typically measurable at 12+ months as turnover is an annual metric.">
                                <CalcRow label="Departures avoided" value={(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100 * inputs.workforce.pctAttritionLinkedToBurnout / 100 * inputs.workforce.pctBurnoutExitsAvoided / 100).toFixed(2)} />
                                <EditableCalcRow
                                  label="Replacement cost per provider"
                                  value={inputs.workforce.costPerDeparture}
                                  prefix="$"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("costPerDeparture")}
                                  typicalRange={{ min: 200000, max: 500000 }}
                                  postureName="Typical"
                                  driverName="Clinician Retention"
                                  onSave={(newValue) => saveInlineValue(
                                    "Clinician Retention", 
                                    "costPerDeparture", 
                                    newValue,
                                    (prev) => ({ ...prev, workforce: { ...prev.workforce, costPerDeparture: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateWorkforceImpact("costPerDeparture", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("workforce")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-workforce"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        )}

                        {/* HCC & CHRONIC CONDITION CAPTURE */}
                        {driverId === "hcc" && (() => {
                          // Compute MA patients from eligible encounters
                          const uniquePatients = Math.round(encountersWithAbridge / 2.5);
                          const impactedMaPatients = Math.round(uniquePatients * (inputs.hcc.pctMedicareAdvantage / 100));
                          return (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Identify MA Patient Population */}
                              <CalcStep stepNumber={1} title="Identify MA Patient Population">
                                <CalcRow label="Total annual encounters" value={encountersWithAbridge.toLocaleString()} />
                                <CalcRow label="Average visits per unique patient" value="2.5 visits/year" />
                                <CalcRow label="Total unique patients" value={uniquePatients.toLocaleString()} />
                                <EditableCalcRow
                                  label="% Medicare Advantage"
                                  value={inputs.hcc.pctMedicareAdvantage}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctMedicareAdvantage")}
                                  typicalRange={{ min: 10, max: 50 }}
                                  postureName="Typical"
                                  driverName="HCC Capture"
                                  onSave={(newValue) => saveInlineValue(
                                    "HCC Capture", 
                                    "pctMedicareAdvantage", 
                                    newValue,
                                    (prev) => ({ ...prev, hcc: { ...prev.hcc, pctMedicareAdvantage: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateHccImpact("pctMedicareAdvantage", newValue)}
                                />
                                <CalcRow label="Unique MA patients" value={`${impactedMaPatients.toLocaleString()} patients`} isResult={true} />
                              </CalcStep>

                              {/* Step 2: Diagnostic Documentation Gap */}
                              <CalcStep stepNumber={2} title="Diagnostic Documentation Gap">
                                <CalcRow label="Chronic conditions per MA patient" value={inputs.hcc.avgConditionsPerMember} />
                                <CalcRow label="Expected total HCC-eligible conditions" value={(impactedMaPatients * inputs.hcc.avgConditionsPerMember).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <CalcRow label="Documentation gap" value={`${inputs.hcc.pctConditionsMissed}%`} />
                                <CalcRow label="Conditions missed annually" value={(impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} isResult={true} />
                              </CalcStep>

                              {/* Step 3: Abridge Recapture */}
                              <CalcStep stepNumber={3} title="Abridge Recapture">
                                <CalcRow label="Conditions missed annually" value={(impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <EditableCalcRow
                                  label="Abridge recapture rate"
                                  value={inputs.hcc.pctMissedConditionsRecaptured}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctMissedConditionsRecaptured")}
                                  typicalRange={{ min: 20, max: 50 }}
                                  postureName="Typical"
                                  driverName="HCC Capture"
                                  onSave={(newValue) => saveInlineValue(
                                    "HCC Capture", 
                                    "pctMissedConditionsRecaptured", 
                                    newValue,
                                    (prev) => ({ ...prev, hcc: { ...prev.hcc, pctMissedConditionsRecaptured: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateHccImpact("pctMissedConditionsRecaptured", newValue)}
                                />
                                <CalcRow label="New conditions documented" value={`${(impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100 * inputs.hcc.pctMissedConditionsRecaptured / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} conditions`} isResult={true} />
                              </CalcStep>

                              {/* Step 4: RAF Score Impact */}
                              <CalcStep stepNumber={4} title="RAF Score Impact">
                                <CalcRow label="Average RAF weight per condition" value={inputs.hcc.rafGainPerCondition} />
                                <CalcRow label="Realization factor" value={`${100 - inputs.hcc.rafRealizationHaircut}%`} />
                              </CalcStep>

                              {/* Step 5: Revenue Impact */}
                              <CalcStep stepNumber={5} title="Revenue Impact" isLast={true}>
                                <CalcRow label="Unique MA patients" value={impactedMaPatients.toLocaleString()} />
                                <EditableCalcRow
                                  label="Benchmark PMPM"
                                  value={inputs.hcc.pmpmBenchmark}
                                  prefix="$"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pmpmBenchmark")}
                                  typicalRange={{ min: 900, max: 1400 }}
                                  postureName="Typical"
                                  driverName="HCC Capture"
                                  onSave={(newValue) => saveInlineValue(
                                    "HCC Capture", 
                                    "pmpmBenchmark", 
                                    newValue,
                                    (prev) => ({ ...prev, hcc: { ...prev.hcc, pmpmBenchmark: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateHccImpact("pmpmBenchmark", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("hcc")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-hcc"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        );})()}

                        {/* DENIAL REDUCTION */}
                        {driverId === "denials" && (() => {
                          // Compute net collectible revenue from eligible encounters
                          const netCollectibleRevenue = encountersWithAbridge * inputs.denials.avgRevenuePerEncounter;
                          return (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Baseline Denials */}
                              <CalcStep stepNumber={1} title="Baseline Denials">
                                <CalcRow label="Abridge-documented encounters" value={encountersWithAbridge.toLocaleString()} />
                                <EditableCalcRow
                                  label="Average revenue per encounter"
                                  value={inputs.denials.avgRevenuePerEncounter}
                                  prefix="$"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("avgRevenuePerEncounter")}
                                  typicalRange={{ min: 150, max: 400 }}
                                  postureName="Typical"
                                  driverName="Denial Reduction"
                                  onSave={(newValue) => saveInlineValue(
                                    "Denial Reduction", 
                                    "avgRevenuePerEncounter", 
                                    newValue,
                                    (prev) => ({ ...prev, denials: { ...prev.denials, avgRevenuePerEncounter: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateDenialsImpact("avgRevenuePerEncounter", newValue)}
                                />
                                <CalcRow label="Total annual revenue" value={formatCurrency(netCollectibleRevenue)} />
                                <EditableCalcRow
                                  label="Baseline denial rate"
                                  value={inputs.denials.baselineDenialRate}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("baselineDenialRate")}
                                  typicalRange={{ min: 3, max: 12 }}
                                  postureName="Typical"
                                  driverName="Denial Reduction"
                                  onSave={(newValue) => saveInlineValue(
                                    "Denial Reduction", 
                                    "baselineDenialRate", 
                                    newValue,
                                    (prev) => ({ ...prev, denials: { ...prev.denials, baselineDenialRate: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateDenialsImpact("baselineDenialRate", newValue)}
                                />
                                <CalcRow label="Revenue denied annually" value={formatCurrency(netCollectibleRevenue * inputs.denials.baselineDenialRate / 100)} isResult={true} />
                              </CalcStep>

                              {/* Step 2: Documentation-Related */}
                              <CalcStep stepNumber={2} title="Documentation-Related" note="These are denials attributed to insufficient or unclear documentation—often unrecoverable due to lack of medical necessity support.">
                                <CalcRow label="Revenue denied annually" value={formatCurrency(netCollectibleRevenue * inputs.denials.baselineDenialRate / 100)} />
                                <CalcRow label="% documentation-related" value={`${inputs.denials.pctDenialsFromDocumentation}%`} />
                                <CalcRow label="Documentation-driven denials" value={formatCurrency(netCollectibleRevenue * inputs.denials.baselineDenialRate / 100 * inputs.denials.pctDenialsFromDocumentation / 100)} isResult={true} />
                              </CalcStep>

                              {/* Step 3: Abridge Prevention */}
                              <CalcStep stepNumber={3} title="Abridge Prevention" isLast={true}>
                                <CalcRow label="Documentation-driven denials" value={formatCurrency(netCollectibleRevenue * inputs.denials.baselineDenialRate / 100 * inputs.denials.pctDenialsFromDocumentation / 100)} />
                                <EditableCalcRow
                                  label="% preventable with real-time docs"
                                  value={inputs.denials.pctDocDenialsRecovered}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctDocDenialsRecovered")}
                                  typicalRange={{ min: 30, max: 60 }}
                                  postureName="Typical"
                                  driverName="Denial Reduction"
                                  onSave={(newValue) => saveInlineValue(
                                    "Denial Reduction", 
                                    "pctDocDenialsRecovered", 
                                    newValue,
                                    (prev) => ({ ...prev, denials: { ...prev.denials, pctDocDenialsRecovered: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateDenialsImpact("pctDocDenialsRecovered", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("denials")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-denials"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        );})()}

                        {/* OVERTIME COST AVOIDANCE */}
                        {driverId === "overtime" && (() => {
                          // Compute after-hours time
                          const afterHoursReclaimed = totalHoursReclaimed * (inputs.overtime.pctAfterHours / 100);
                          const overtimeHoursReduced = afterHoursReclaimed * (inputs.overtime.pctOvertimeReduced / 100);
                          return (
                          <>
                            {/* Section 1: How We Calculated This - with inline editing */}
                            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-6 mb-8">
                              <h3 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                                How We Calculated This
                              </h3>
                              
                              {/* Step 1: Hours Returned */}
                              <CalcStep stepNumber={1} title="Hours Returned">
                                <CalcRow label="Minutes saved per encounter" value={`${inputs.minutesSavedPerEncounter} min`} />
                                <CalcRow label="Documented encounters" value={encountersWithAbridge.toLocaleString()} />
                                <CalcRow label="Total hours returned" value={`${totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} isResult={true} />
                              </CalcStep>

                              {/* Step 2: After-Hours Reduction */}
                              <CalcStep stepNumber={2} title="After-Hours Reduction">
                                <CalcRow label="Total hours returned" value={`${totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} />
                                <CalcRow label="% after-hours documentation" value={`${inputs.overtime.pctAfterHours}%`} />
                                <EditableCalcRow
                                  label="% converted to OT avoidance"
                                  value={inputs.overtime.pctOvertimeReduced}
                                  unit="%"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("pctOvertimeReduced")}
                                  typicalRange={{ min: 10, max: 50 }}
                                  postureName="Typical"
                                  driverName="Overtime Savings"
                                  onSave={(newValue) => saveInlineValue(
                                    "Overtime Savings", 
                                    "pctOvertimeReduced", 
                                    newValue,
                                    (prev) => ({ ...prev, overtime: { ...prev.overtime, pctOvertimeReduced: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateOvertimeImpact("pctOvertimeReduced", newValue)}
                                />
                                <CalcRow label="Premium labor hours avoided" value={`${overtimeHoursReduced.toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs`} isResult={true} />
                              </CalcStep>

                              {/* Step 3: Cost Savings */}
                              <CalcStep stepNumber={3} title="Cost Savings" isLast={true}>
                                <CalcRow label="Premium hours avoided" value={overtimeHoursReduced.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
                                <EditableCalcRow
                                  label="Blended premium rate"
                                  value={inputs.overtime.blendedOvertimeRate}
                                  prefix="$"
                                  unit="/hr"
                                  isEditable={true}
                                  isCustomized={customizedValues.has("blendedOvertimeRate")}
                                  typicalRange={{ min: 75, max: 150 }}
                                  postureName="Typical"
                                  driverName="Overtime Savings"
                                  onSave={(newValue) => saveInlineValue(
                                    "Overtime Savings", 
                                    "blendedOvertimeRate", 
                                    newValue,
                                    (prev) => ({ ...prev, overtime: { ...prev.overtime, blendedOvertimeRate: newValue } })
                                  )}
                                  calculateImpact={(newValue) => calculateOvertimeImpact("blendedOvertimeRate", newValue)}
                                />
                                <CalcRow label="Annual value" value={formatCurrency(driverValue)} isResult={true} isFinal={true} />
                              </CalcStep>
                            </div>

                            {/* Helper note */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800">
                                Click [Edit] next to any value to adjust. Changes update all calculations in real-time.
                              </p>
                            </div>

                            {/* Remove Driver */}
                            <div className="border-t border-neutral-100 pt-6 mt-6">
                              <Button
                                variant="ghost"
                                onClick={() => removeDriver("overtime")}
                                className="gap-2 text-neutral-500 hover:text-red-600"
                                data-testid="button-remove-overtime"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove This Driver
                              </Button>
                            </div>
                          </>
                        );})()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state if no drivers */}
            {enabledDriverIds.length === 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center">
                <Search className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  No Drivers Selected
                </h3>
                <p className="text-neutral-500">
                  Add drivers from the Summary View to see detailed calculations
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "scenarios" && (
          <div className="space-y-6">
            {/* EXPANSION WIZARD FULL-PAGE VIEW */}
            {showExpansionWizard ? (
              <ExpansionCalculator
                careSetting={selectedSettings[0] || "outpatient"}
                inputs={inputs}
                results={{
                  annualAbridgeCost: annualInvestment,
                  roiMultiple: roiMultiple,
                  totalAnnualBenefit: totalAnnualBenefit,
                  netValueCreated: netAnnualGain,
                  totalProviderHoursReclaimed: totalHoursReclaimed,
                  postWrvuPerEncounter: 0,
                  newEffectiveDenialRate: 0,
                  levers: enabledDriverIds.map(id => ({
                    id,
                    label: leverLabels[id],
                    value: driverValues[id] || 0,
                    enabled: true,
                    description: leverDescriptions[id],
                    category: "time" as const,
                  })),
                }}
                onBack={() => setShowExpansionWizard(false)}
                onSave={(expansionResults, expansionInputs) => {
                  const newScenario: Scenario = {
                    id: Date.now().toString(),
                    name: `Expand to ${expansionInputs.targetProviders} Providers`,
                    type: "expand",
                    createdAt: new Date(),
                    providers: expansionInputs.targetProviders,
                    encounters: Math.round(expansionInputs.targetProviders * (inputs.annualOutpatientEncounters / inputs.numberOfProviders)),
                    utilizationRate: inputs.abridgeUtilizationPct,
                    maPopulationPct: inputs.hcc.pctMedicareAdvantage || 15,
                    newPatientPct: 30,
                    specialtyPct: 40,
                    revenuePerVisitOverride: null,
                    visitLengthOverride: null,
                    totalBenefit: expansionResults.year2.totalBenefit,
                    investment: expansionResults.year2.totalCost,
                    netGain: expansionResults.year2.netGain,
                    roiMultiple: expansionResults.year2.roi,
                    driverValues: driverValues,
                  };
                  setScenarios(prev => [...prev, newScenario]);
                  setShowExpansionWizard(false);
                  toast({
                    title: "Expansion scenario saved",
                    description: `"${newScenario.name}" has been created with 3-year projections`,
                  });
                }}
              />
            ) : showExpandProviders ? (
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => {
                    setShowExpandProviders(false);
                    setTargetProviders(inputs.numberOfProviders);
                    setExpansionPricingModel("per-provider");
                    setEnterpriseAnnualCost(null);
                  }}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-scenario-builder"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h1 className="text-[32px] font-semibold text-[#111827] mb-2">Expansion Calculator</h1>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Model the ROI of expanding Abridge to more providers
                  </p>
                  
                  {/* Baseline reference box */}
                  <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[14px] text-[#6B7280] font-medium">Your current deployment:</span>
                    <div className="flex items-center gap-3 text-[14px]">
                      <span className="text-[#111827] font-medium">{inputs.numberOfProviders} providers</span>
                      <span className="text-[#D1D5DB]">•</span>
                      <span className="text-[#111827] font-medium">{inputs.annualOutpatientEncounters.toLocaleString()} encounters/year</span>
                      <span className="text-[#D1D5DB]">•</span>
                      <span className="text-[#111827] font-medium">{formatCurrency(netAnnualGain)} net gain</span>
                      <span className="text-[#D1D5DB]">•</span>
                      <span className="text-[#111827] font-medium">{roiMultiple.toFixed(1)}x ROI</span>
                    </div>
                  </div>
                  
                  {/* Active Drivers Notice */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-[#6B7280]">Active value drivers:</span>
                    {enabledDriverIds.map((driverId) => (
                      <span
                        key={driverId}
                        className="px-2 py-1 bg-[#F3F4F6] text-[#374151] text-[12px] font-medium rounded"
                        title={leverLabels[driverId]}
                      >
                        {leverLabels[driverId]}
                      </span>
                    ))}
                    {enabledDriverIds.length === 0 && (
                      <span className="text-[13px] text-[#9CA3AF] italic">No drivers enabled</span>
                    )}
                  </div>
                </div>
                
                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
                  {/* LEFT COLUMN: Inputs */}
                  <div className="space-y-6">
                    
                    {/* Provider Count - Primary Input */}
                    <div className="bg-white border-2 border-[#E8532F] rounded-xl p-6 shadow-[0_4px_12px_rgba(232,83,47,0.1)]">
                      <label className="block text-[15px] font-semibold text-[#111827] mb-4">
                        How many providers do you want to expand to?
                      </label>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={rawInputValues["target_providers"] ?? String(targetProviders)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*$/.test(val)) {
                              setRawInputValues(prev => ({ ...prev, "target_providers": val }));
                              if (val !== "" && !isNaN(Number(val))) {
                                setTargetProviders(parseInt(val) || inputs.numberOfProviders);
                              }
                            }
                          }}
                          onBlur={() => {
                            const val = rawInputValues["target_providers"];
                            if (val === "" || val === undefined) {
                              setTargetProviders(inputs.numberOfProviders);
                            }
                            setRawInputValues(prev => {
                              const next = { ...prev };
                              delete next["target_providers"];
                              return next;
                            });
                          }}
                          className="flex-1 min-w-[120px] text-[24px] font-semibold text-center py-3 px-4 border-2 border-[#E5E7EB] rounded-lg focus:border-[#E8532F] focus:outline-none"
                          data-testid="input-target-providers"
                        />
                        <span className="text-[14px] text-[#6B7280] font-medium whitespace-nowrap">providers</span>
                      </div>
                      
                      <input
                        type="range"
                        value={targetProviders}
                        onChange={(e) => setTargetProviders(parseInt(e.target.value))}
                        min={inputs.numberOfProviders}
                        max={Math.max(inputs.numberOfProviders * 3, 200)}
                        step={5}
                        className="w-full h-2 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#E8532F] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #E8532F 0%, #E8532F ${((targetProviders - inputs.numberOfProviders) / (Math.max(inputs.numberOfProviders * 3, 200) - inputs.numberOfProviders)) * 100}%, #E5E7EB ${((targetProviders - inputs.numberOfProviders) / (Math.max(inputs.numberOfProviders * 3, 200) - inputs.numberOfProviders)) * 100}%, #E5E7EB 100%)`
                        }}
                        data-testid="slider-target-providers"
                      />
                      
                      <div className="flex justify-between items-center mt-2 text-[12px] text-[#6B7280]">
                        <span>{inputs.numberOfProviders}</span>
                        <span className="text-[#E8532F] font-semibold text-[14px]">
                          {targetProviders}
                          {targetProviders > inputs.numberOfProviders && (
                            <span className="ml-1 px-2 py-0.5 bg-[#E8532F]/10 rounded-full text-[12px]">
                              +{targetProviders - inputs.numberOfProviders}
                            </span>
                          )}
                        </span>
                        <span>{Math.max(inputs.numberOfProviders * 3, 200)}</span>
                      </div>
                    </div>
                    
                    {/* Pricing Model Toggle */}
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                      <label className="block text-[15px] font-semibold text-[#111827] mb-4">
                        Pricing model
                      </label>
                      
                      <div className="grid grid-cols-2 gap-2 p-1 bg-[#F9FAFB] rounded-lg">
                        <button
                          onClick={() => setExpansionPricingModel("per-provider")}
                          className={`p-4 rounded-md transition-all ${
                            expansionPricingModel === "per-provider"
                              ? "bg-white border border-[#E5E7EB] shadow-sm"
                              : "hover:bg-white/50"
                          }`}
                          data-testid="toggle-per-provider"
                        >
                          <div className="text-left">
                            <span className="text-[14px] font-bold text-[#111827]">Per Provider</span>
                            <p className="text-[12px] text-[#6B7280] mt-0.5">${inputs.monthlyCostPerProvider}/provider/month</p>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setExpansionPricingModel("enterprise")}
                          className={`p-4 rounded-md transition-all ${
                            expansionPricingModel === "enterprise"
                              ? "bg-white border border-[#E5E7EB] shadow-sm"
                              : "hover:bg-white/50"
                          }`}
                          data-testid="toggle-enterprise"
                        >
                          <div className="text-left">
                            <span className="text-[14px] font-bold text-[#111827]">Enterprise Annual</span>
                            <p className="text-[12px] text-[#6B7280] mt-0.5">Volume discounts</p>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    {/* Enterprise Pricing Input (conditional) */}
                    {expansionPricingModel === "enterprise" && (
                      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                        <label className="block text-[15px] font-semibold text-[#111827] mb-4">
                          Custom enterprise pricing (optional)
                        </label>
                        
                        <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden">
                          <span className="px-3 py-3 bg-[#F9FAFB] text-[#6B7280] border-r border-[#E5E7EB]">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Enter annual contract value"
                            value={rawInputValues["enterprise_cost"] ?? (enterpriseAnnualCost !== null ? String(enterpriseAnnualCost) : "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                setRawInputValues(prev => ({ ...prev, "enterprise_cost": val }));
                                if (val !== "" && !isNaN(Number(val))) {
                                  setEnterpriseAnnualCost(parseFloat(val) || null);
                                } else if (val === "") {
                                  setEnterpriseAnnualCost(null);
                                }
                              }
                            }}
                            onBlur={() => {
                              setRawInputValues(prev => {
                                const next = { ...prev };
                                delete next["enterprise_cost"];
                                return next;
                              });
                            }}
                            className="flex-1 py-3 px-3 text-[16px] focus:outline-none"
                            data-testid="input-enterprise-cost"
                          />
                          <span className="px-3 py-3 bg-[#F9FAFB] text-[#6B7280] border-l border-[#E5E7EB]">/year</span>
                        </div>
                        
                        {expansionCalculation && expansionCalculation.scenario.volumeDiscount > 0 && !enterpriseAnnualCost && (
                          <div className="mt-4 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg">
                            <span className="inline-block px-2 py-1 bg-[#059669] text-white text-[12px] font-bold rounded mb-2">
                              {(expansionCalculation.scenario.volumeDiscount * 100).toFixed(0)}% volume discount applied
                            </span>
                            <p className="text-[13px] text-[#047857]">
                              Standard pricing: {formatCurrency(targetProviders * inputs.monthlyCostPerProvider * 12)}/year<br />
                              Your price: {formatCurrency(expansionCalculation.scenario.cost)}/year
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Advanced Settings (collapsible) */}
                    <details className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                      <summary className="p-6 cursor-pointer text-[15px] font-semibold text-[#111827] hover:bg-[#F9FAFB]">
                        Advanced settings
                      </summary>
                      <div className="px-6 pb-6 border-t border-[#E5E7EB]">
                        <div className="pt-4">
                          <label className="block text-[14px] text-[#6B7280] mb-2">
                            Expected utilization for new providers
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="40"
                              max="90"
                              value={scenarioForm.utilizationRate}
                              onChange={(e) => setScenarioForm({ ...scenarioForm, utilizationRate: parseInt(e.target.value) })}
                              className="flex-1 h-2 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer"
                              data-testid="slider-utilization"
                            />
                            <span className="text-[16px] font-bold text-[#111827] w-12">{scenarioForm.utilizationRate}%</span>
                          </div>
                          <p className="mt-2 text-[12px] text-[#6B7280]">
                            New deployments typically start at 40-50% and mature to 75-90%
                          </p>
                        </div>
                      </div>
                    </details>
                    
                  </div>
                  
                  {/* RIGHT COLUMN: Results Panel */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 space-y-6">
                    
                    {!expansionCalculation ? (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 text-[#D1D5DB] mx-auto mb-4" />
                        <p className="text-[16px] text-[#6B7280]">
                          Increase the provider count above your current deployment to see expansion ROI
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Hero Metric: Expansion ROI */}
                        <div className="text-center p-6 bg-gradient-to-br from-[#FEF2F2] to-[#FFF7ED] rounded-xl border border-[#FECACA]">
                          <p className="text-[14px] text-[#6B7280] font-medium mb-2">Expansion ROI</p>
                          <p className="text-[48px] font-bold text-[#E8532F]">
                            {expansionCalculation.incremental.roi.toFixed(1)}x
                          </p>
                          <p className="text-[14px] text-[#6B7280] mt-2">
                            Adding {expansionCalculation.incremental.providers} providers generates{' '}
                            <span className="font-bold text-[#059669]">{formatCurrency(expansionCalculation.incremental.netGain)}</span> in additional annual value
                          </p>
                        </div>
                        
                        {/* Quick Comparison Table */}
                        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                          <div className="grid grid-cols-4 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[13px] font-bold text-[#6B7280]">
                            <div className="p-3"></div>
                            <div className="p-3 text-center">Current</div>
                            <div className="p-3 text-center bg-[#E8532F]/5 text-[#E8532F]">Expanded</div>
                            <div className="p-3 text-center">Change</div>
                          </div>
                          
                          <div className="grid grid-cols-4 border-b border-[#E5E7EB] text-[14px]">
                            <div className="p-3 text-[#6B7280]">Providers</div>
                            <div className="p-3 text-center text-[#111827]">{expansionCalculation.baseline.providers}</div>
                            <div className="p-3 text-center bg-[#E8532F]/5 font-bold text-[#111827]">{expansionCalculation.scenario.providers}</div>
                            <div className="p-3 text-center text-[#059669] font-medium">+{expansionCalculation.incremental.providers}</div>
                          </div>
                          
                          <div className="grid grid-cols-4 border-b border-[#E5E7EB] text-[14px]">
                            <div className="p-3 text-[#6B7280]">Annual Investment</div>
                            <div className="p-3 text-center text-[#111827]">{formatCurrency(expansionCalculation.baseline.cost)}</div>
                            <div className="p-3 text-center bg-[#E8532F]/5 font-bold text-[#111827]">{formatCurrency(expansionCalculation.scenario.cost)}</div>
                            <div className="p-3 text-center text-[#6B7280]">{formatCurrency(expansionCalculation.incremental.cost)}</div>
                          </div>
                          
                          <div className="grid grid-cols-4 border-b border-[#E5E7EB] text-[14px]">
                            <div className="p-3 text-[#6B7280]">Annual Benefit</div>
                            <div className="p-3 text-center text-[#111827]">{formatCurrency(expansionCalculation.baseline.benefit)}</div>
                            <div className="p-3 text-center bg-[#E8532F]/5 font-bold text-[#111827]">{formatCurrency(expansionCalculation.scenario.benefit)}</div>
                            <div className="p-3 text-center text-[#059669] font-medium">+{formatCurrency(expansionCalculation.incremental.benefit)}</div>
                          </div>
                          
                          <div className="grid grid-cols-4 border-b border-[#E5E7EB] text-[14px] font-bold bg-[#F9FAFB]">
                            <div className="p-3 text-[#111827]">Net Gain</div>
                            <div className="p-3 text-center text-[#111827]">{formatCurrency(expansionCalculation.baseline.netGain)}</div>
                            <div className="p-3 text-center bg-[#E8532F]/10 text-[#059669]">{formatCurrency(expansionCalculation.scenario.netGain)}</div>
                            <div className="p-3 text-center text-[#059669]">+{formatCurrency(expansionCalculation.incremental.netGain)}</div>
                          </div>
                          
                          <div className="grid grid-cols-4 text-[14px] font-bold bg-[#F9FAFB]">
                            <div className="p-3 text-[#111827]">ROI</div>
                            <div className="p-3 text-center text-[#111827]">{expansionCalculation.baseline.roi.toFixed(1)}x</div>
                            <div className="p-3 text-center bg-[#E8532F]/10 text-[#059669]">{expansionCalculation.scenario.roi.toFixed(1)}x</div>
                            <div className="p-3 text-center">
                              {expansionCalculation.scenario.roi >= expansionCalculation.baseline.roi ? (
                                <span className="text-[#059669]">+{(expansionCalculation.scenario.roi - expansionCalculation.baseline.roi).toFixed(1)}x</span>
                              ) : (
                                <span className="text-[#6B7280]">{(expansionCalculation.scenario.roi - expansionCalculation.baseline.roi).toFixed(1)}x</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Key Insight */}
                        <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                          <div className="flex items-start gap-3">
                            <Lightbulb className="h-5 w-5 text-[#1E40AF] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[14px] font-bold text-[#1E40AF] mb-1">Key Insight</p>
                              <p className="text-[14px] text-[#1E40AF]">
                                {expansionCalculation.incremental.roi >= expansionCalculation.baseline.roi ? (
                                  <>
                                    Strong expansion economics: Your incremental ROI ({expansionCalculation.incremental.roi.toFixed(1)}x)
                                    {expansionCalculation.incremental.roi > expansionCalculation.baseline.roi ? ' exceeds ' : ' matches '}
                                    your baseline ROI ({expansionCalculation.baseline.roi.toFixed(1)}x).
                                    {expansionPricingModel === 'enterprise' && expansionCalculation.scenario.volumeDiscount > 0 && (
                                      <> Volume discounts make this expansion even more attractive, saving {formatCurrency(targetProviders * inputs.monthlyCostPerProvider * 12 - expansionCalculation.scenario.cost)}/year vs. standard pricing.</>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    While incremental ROI ({expansionCalculation.incremental.roi.toFixed(1)}x) is slightly lower than baseline
                                    ({expansionCalculation.baseline.roi.toFixed(1)}x), you still generate <span className="font-bold">{formatCurrency(expansionCalculation.incremental.netGain)}</span> in
                                    additional annual value with positive returns.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* 3-Year Projection */}
                        <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                          <h4 className="text-[14px] font-bold text-[#111827] mb-4">3-Year Value</h4>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center flex-1">
                              <p className="text-[12px] text-[#6B7280] mb-1">Current (3-year)</p>
                              <p className="text-[18px] font-bold text-[#111827]">{formatCurrency(expansionCalculation.baseline.netGain * 3)}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-[#D1D5DB] shrink-0" />
                            <div className="text-center flex-1 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg">
                              <p className="text-[12px] text-[#059669] mb-1">Expanded (3-year)</p>
                              <p className="text-[18px] font-bold text-[#059669]">{formatCurrency(expansionCalculation.scenario.netGain * 3)}</p>
                            </div>
                          </div>
                          <p className="text-[14px] text-center text-[#6B7280] mt-4">
                            Additional 3-year value: <span className="font-bold text-[#059669]">{formatCurrency(expansionCalculation.incremental.netGain * 3)}</span>
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => setTargetProviders(inputs.numberOfProviders)}
                            className="flex-1 py-3 px-4 border border-[#E5E7EB] rounded-lg text-[14px] font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                            data-testid="button-reset-expansion"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => {
                              const newScenario: Scenario = {
                                id: `exp-${Date.now()}`,
                                name: scenarioForm.name || `Expand to ${targetProviders} providers`,
                                type: "expand",
                                providers: targetProviders,
                                encounters: expansionCalculation.scenario.encounters,
                                utilizationRate: scenarioForm.utilizationRate,
                                createdAt: new Date(),
                                maPopulationPct: inputs.hcc.pctMedicareAdvantage,
                                newPatientPct: inputs.patientAccess.pctTimeToNewVisits,
                                specialtyPct: 0,
                                revenuePerVisitOverride: null,
                                visitLengthOverride: null,
                                totalBenefit: expansionCalculation.scenario.benefit,
                                investment: expansionCalculation.scenario.cost,
                                netGain: expansionCalculation.scenario.netGain,
                                roiMultiple: expansionCalculation.scenario.roi,
                                driverValues: driverValues,
                              };
                              setScenarios([...scenarios, newScenario]);
                              setShowExpandProviders(false);
                              setTargetProviders(inputs.numberOfProviders);
                              setExpansionPricingModel("per-provider");
                              setEnterpriseAnnualCost(null);
                            }}
                            className="flex-1 py-3 px-4 bg-[#E8532F] text-white rounded-lg text-[14px] font-medium hover:bg-[#D14426] transition-colors"
                            data-testid="button-save-expansion"
                          >
                            Save Scenario
                          </button>
                        </div>
                      </>
                    )}
                    
                  </div>
                </div>
              </div>
            ) : showAddDrivers ? (
              /* ADD STRATEGIC DRIVERS FULL-PAGE VIEW */
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => setShowAddDrivers(false)}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-from-drivers"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                    Add Strategic Drivers
                  </h2>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Enable additional value streams without adding users
                  </p>
                  
                  {/* Baseline reference box */}
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-[#6B7280]" />
                    <span className="text-[14px] text-[#6B7280]">
                      Your baseline: {inputs.numberOfProviders} providers | {enabledDriverIds.length} active drivers | {formatCurrency(netAnnualGain)} net gain | {roiMultiple.toFixed(1)}x ROI
                    </span>
                  </div>
                  
                  {/* Dynamic Insight box based on context */}
                  <div className="mt-3 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-[#1E40AF] shrink-0" />
                    <p className="text-[14px] text-[#1E40AF]">
                      {(() => {
                        const selectedCount = scenarioDriverSelections.size;
                        const addedValue = Array.from(scenarioDriverSelections).reduce((sum, id) => 
                          sum + calculateAdjustedDriverValue(id, driverAdjustments), 0);
                        const newTotalBenefit = totalAnnualBenefit + addedValue;
                        const newRoi = newTotalBenefit / annualInvestment;
                        const roiPctIncrease = ((newRoi - roiMultiple) / roiMultiple * 100).toFixed(0);
                        
                        if (selectedCount === 0) {
                          return `Adding drivers increases value without increasing investment. Select from ${availableDrivers.length} available drivers to model expanded value capture.`;
                        }
                        if (selectedCount === 1) {
                          const driverId = Array.from(scenarioDriverSelections)[0];
                          const driverValue = calculateAdjustedDriverValue(driverId, driverAdjustments);
                          const pctOfTotal = ((driverValue / newTotalBenefit) * 100).toFixed(0);
                          return `Adding ${leverLabels[driverId]} increases your ROI from ${roiMultiple.toFixed(1)}x to ${newRoi.toFixed(1)}x without any additional investment. This driver alone adds ${formatCurrency(driverValue)} (${pctOfTotal}% of total value).`;
                        }
                        if (selectedCount === 2) {
                          let maxVal = 0;
                          let maxId: LeverId = Array.from(scenarioDriverSelections)[0];
                          scenarioDriverSelections.forEach(id => {
                            const val = calculateAdjustedDriverValue(id, driverAdjustments);
                            if (val > maxVal) { maxVal = val; maxId = id; }
                          });
                          return `Adding these ${selectedCount} drivers increases your ROI from ${roiMultiple.toFixed(1)}x to ${newRoi.toFixed(1)}x (+${roiPctIncrease}%) without any additional investment. ${leverLabels[maxId]} contributes the most at ${formatCurrency(maxVal)}.`;
                        }
                        // 3+ drivers
                        let maxVal = 0;
                        let maxId: LeverId = Array.from(scenarioDriverSelections)[0];
                        scenarioDriverSelections.forEach(id => {
                          const val = calculateAdjustedDriverValue(id, driverAdjustments);
                          if (val > maxVal) { maxVal = val; maxId = id; }
                        });
                        const pctOfNew = ((maxVal / addedValue) * 100).toFixed(0);
                        return `Adding these ${selectedCount} drivers increases your ROI from ${roiMultiple.toFixed(1)}x to ${newRoi.toFixed(1)}x (+${roiPctIncrease}%) without any additional investment. ${leverLabels[maxId]} alone adds ${formatCurrency(maxVal)} (${pctOfNew}% of new value).`;
                      })()}
                    </p>
                  </div>
                </div>
                
                {/* Two-column layout for desktop */}
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left column - Input form */}
                  <div className="flex-1 lg:max-w-[60%] space-y-6">
                    {/* Scenario Name */}
                    <div>
                      <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-3">
                        Scenario Name
                      </label>
                      <input
                        type="text"
                        value={driversScenarioName}
                        onChange={(e) => setDriversScenarioName(e.target.value)}
                        placeholder={scenarioDriverSelections.size > 0 ? `Add ${Array.from(scenarioDriverSelections).map(id => leverShortNames[id]).join(" + ")}` : "Add new drivers..."}
                        className="w-full p-4 text-[16px] border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#E8532F]/20 focus:border-[#E8532F]"
                        data-testid="input-drivers-scenario-name"
                      />
                      <p className="text-[13px] text-[#6B7280] mt-2">Give this scenario a descriptive name</p>
                    </div>
                    
                    {/* CURRENTLY ACTIVE DRIVERS (Locked) */}
                    {enabledDriverIds.length > 0 && (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                            Currently Active
                          </h3>
                          <p className="text-[14px] text-[#6B7280]">These drivers are in your baseline model</p>
                        </div>
                        
                        <div className="space-y-3">
                          {enabledDriverIds.map((id) => {
                            const DriverIcon = DRIVER_ICONS[id];
                            return (
                              <div
                                key={id}
                                className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg opacity-90"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <Check className="h-5 w-5 text-[#059669]" />
                                    <div>
                                      <div className="text-[16px] font-bold text-[#111827]">{leverLabels[id]}</div>
                                      <div className="text-[14px] text-[#6B7280]">{leverDescriptions[id]}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[16px] font-bold text-[#059669]">{formatCurrency(driverValues[id])}</span>
                                    <span className="px-2 py-1 bg-[#E5E7EB] text-[11px] font-medium text-[#6B7280] uppercase rounded">
                                      Locked
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <p className="text-[14px] font-bold text-[#111827] mt-4">
                          Current total: {formatCurrency(totalAnnualBenefit)} annually
                        </p>
                      </div>
                    )}
                    
                    {/* AVAILABLE TO ADD */}
                    {availableDrivers.length > 0 ? (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                            Available to Add
                          </h3>
                          <p className="text-[14px] text-[#6B7280]">Select drivers to include in this scenario</p>
                        </div>
                        
                        <div className="space-y-4">
                          {availableDrivers.map((id) => {
                            const DriverIcon = DRIVER_ICONS[id];
                            const isSelected = scenarioDriverSelections.has(id);
                            const isMethodologyExpanded = expandedDriverMethodology === id;
                            
                            // Calculate estimated value for this driver with adjustments
                            const driverValue = calculateAdjustedDriverValue(id, driverAdjustments);
                            
                            // Get relevance info for each driver
                            const getRelevanceInfo = (driverId: LeverId) => {
                              switch(driverId) {
                                case "hcc":
                                  return {
                                    text: "This driver is valuable if you have Medicare Advantage patients. Higher MA population = higher impact.",
                                    currentValue: `Your MA population: ${inputs.hcc.pctMedicareAdvantage || 15}%`
                                  };
                                case "denials":
                                  return {
                                    text: "This driver is valuable if you experience claim denials due to incomplete or unclear documentation.",
                                    currentValue: `Your denial rate: ${inputs.denials.baselineDenialRate || 5}%`
                                  };
                                case "overtime":
                                  return {
                                    text: "This driver is valuable if providers document after hours or you use locum coverage.",
                                    currentValue: `Premium rate: $${inputs.overtime.blendedOvertimeRate || 145}/hr`
                                  };
                                default:
                                  return { text: "Enable this driver to capture additional value.", currentValue: "" };
                              }
                            };
                            
                            const relevance = getRelevanceInfo(id);
                            
                            return (
                              <div
                                key={id}
                                onClick={() => {
                                  const newSet = new Set(scenarioDriverSelections);
                                  if (newSet.has(id)) {
                                    newSet.delete(id);
                                  } else {
                                    newSet.add(id);
                                  }
                                  setScenarioDriverSelections(newSet);
                                }}
                                className={`p-5 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? "border-2 border-[#E8532F] bg-[rgba(232,83,47,0.02)] shadow-[inset_4px_0_0_#E8532F]" 
                                    : "border-[#E5E7EB] hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                }`}
                                data-testid={`card-driver-${id}`}
                              >
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      isSelected ? "bg-[#E8532F] border-[#E8532F]" : "border-[#E5E7EB]"
                                    }`}>
                                      {isSelected && <Check className="h-4 w-4 text-white" />}
                                    </div>
                                    <div>
                                      <div className="text-[16px] font-bold text-[#111827]">{leverLabels[id]}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[18px] font-bold text-[#059669]">+{formatCurrency(driverValue)}</span>
                                    {/* ROI Impact Preview */}
                                    <div className="text-[12px] text-[#6B7280] mt-1">
                                      {(() => {
                                        const currentSelectedValue = Array.from(scenarioDriverSelections)
                                          .filter(selId => selId !== id)
                                          .reduce((sum, selId) => sum + calculateAdjustedDriverValue(selId, driverAdjustments), 0);
                                        const newTotalWithThis = totalAnnualBenefit + currentSelectedValue + driverValue;
                                        const newRoi = newTotalWithThis / annualInvestment;
                                        const pctContribution = ((driverValue / newTotalWithThis) * 100).toFixed(0);
                                        return (
                                          <>
                                            <span className="text-[#059669] font-medium">→ {newRoi.toFixed(1)}x ROI</span>
                                            <span className="ml-2 text-[#9CA3AF]">({pctContribution}% of total)</span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Description */}
                                <p className="text-[14px] text-[#6B7280] leading-relaxed ml-9 mb-4">
                                  {leverDescriptions[id]}
                                </p>
                                
                                {/* Divider */}
                                <div className="border-t border-[#E5E7EB] my-4 -mx-5 px-5" />
                                
                                {/* Relevance Check */}
                                <div className="ml-9">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-[#1E40AF]" />
                                    <span className="text-[13px] font-bold text-[#1E40AF]">RELEVANCE CHECK</span>
                                  </div>
                                  <p className="text-[14px] text-[#6B7280] mb-1">{relevance.text}</p>
                                  {relevance.currentValue && (
                                    <p className="text-[14px] text-[#111827]">{relevance.currentValue} (can adjust below)</p>
                                  )}
                                </div>
                                
                                {/* Divider */}
                                <div className="border-t border-[#E5E7EB] my-4 -mx-5 px-5" />
                                
                                {/* View calculation methodology */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDriverMethodology(isMethodologyExpanded ? null : id);
                                  }}
                                  className="ml-9 text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                                  data-testid={`link-methodology-${id}`}
                                >
                                  {isMethodologyExpanded ? (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Hide calculation methodology
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="h-4 w-4" />
                                      View calculation methodology
                                    </>
                                  )}
                                </button>
                                
                                {/* Expanded methodology */}
                                {isMethodologyExpanded && (
                                  <div 
                                    className="mt-4 ml-9 p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                                      How We Calculate This
                                    </p>
                                    
                                    {id === "hcc" && (
                                      <div className="space-y-4 text-[14px]">
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 1: Identify MA Patient Population</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Eligible encounters</span><span className="text-[#111827] tabular-nums">{abridgeDocumentedEncounters.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Average visits per patient</span><span className="text-[#111827] tabular-nums">2.5</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Unique patients</span><span className="text-[#111827] tabular-nums">{Math.round(abridgeDocumentedEncounters / 2.5).toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">% Medicare Advantage</span><span className="text-[#111827] tabular-nums">{inputs.hcc.pctMedicareAdvantage || 15}%</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Unique MA patients</span><span className="text-[#E8532F] tabular-nums font-medium">{Math.round((abridgeDocumentedEncounters / 2.5) * ((inputs.hcc.pctMedicareAdvantage || 15) / 100)).toLocaleString()} patients</span></div>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 2: Revenue Impact</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">RAF improvement per patient</span><span className="text-[#111827] tabular-nums">0.09</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Benchmark PMPM</span><span className="text-[#111827] tabular-nums">{formatCurrency(inputs.hcc.pmpmBenchmark || 1000)}</span></div>
                                            <div className="flex justify-between font-bold"><span className="text-[#111827]">Annual value</span><span className="text-[#E8532F] tabular-nums">{formatCurrency(driverValue)}</span></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {id === "denials" && (
                                      <div className="space-y-4 text-[14px]">
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 1: Calculate At-Risk Revenue</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Eligible encounters</span><span className="text-[#111827] tabular-nums">{abridgeDocumentedEncounters.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Revenue per visit</span><span className="text-[#111827] tabular-nums">{formatCurrency(inputs.denials.avgRevenuePerEncounter || 200)}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Total revenue</span><span className="text-[#111827] tabular-nums">{formatCurrency(abridgeDocumentedEncounters * (inputs.denials.avgRevenuePerEncounter || 200))}</span></div>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 2: Calculate Savings</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Denial rate</span><span className="text-[#111827] tabular-nums">{inputs.denials.baselineDenialRate || 5}%</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">% documentation-related</span><span className="text-[#111827] tabular-nums">30%</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Prevention rate</span><span className="text-[#111827] tabular-nums">50%</span></div>
                                            <div className="flex justify-between font-bold"><span className="text-[#111827]">Annual value</span><span className="text-[#E8532F] tabular-nums">{formatCurrency(driverValue)}</span></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {id === "overtime" && (
                                      <div className="space-y-4 text-[14px]">
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 1: Calculate Time Saved</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Eligible encounters</span><span className="text-[#111827] tabular-nums">{abridgeDocumentedEncounters.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Minutes saved per visit</span><span className="text-[#111827] tabular-nums">{inputs.minutesSavedPerEncounter || 8}</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Total hours saved</span><span className="text-[#111827] tabular-nums">{Math.round((abridgeDocumentedEncounters * (inputs.minutesSavedPerEncounter || 8)) / 60).toLocaleString()}</span></div>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-2">Step 2: Calculate Premium Savings</p>
                                          <div className="space-y-1">
                                            <div className="flex justify-between"><span className="text-[#6B7280]">% after-hours work</span><span className="text-[#111827] tabular-nums">{inputs.overtime.pctAfterHours || 20}%</span></div>
                                            <div className="flex justify-between"><span className="text-[#6B7280]">Premium rate</span><span className="text-[#111827] tabular-nums">{formatCurrency(inputs.overtime.blendedOvertimeRate || 145)}/hr</span></div>
                                            <div className="flex justify-between font-bold"><span className="text-[#111827]">Annual value</span><span className="text-[#E8532F] tabular-nums">{formatCurrency(driverValue)}</span></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {!["hcc", "denials", "overtime"].includes(id) && (
                                      <p className="text-[14px] text-[#6B7280]">
                                        Calculation methodology for {leverLabels[id]} is based on standard industry benchmarks and your organization's specific inputs.
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Adjustment inputs when selected */}
                                {isSelected && (
                                  <div 
                                    className="mt-4 ml-9 p-5 bg-[#FFFBF5] border border-[#E5E7EB] rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <p className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                                      Adjust for Your Organization
                                    </p>
                                    
                                    {id === "hcc" && (
                                      <div className="space-y-4">
                                        <div>
                                          <div className="flex justify-between mb-2">
                                            <span className="text-[14px] text-[#111827]">Medicare Advantage population</span>
                                            <span className="text-[14px] font-medium text-[#111827]">{driverAdjustments.hcc?.maPopulationPct || 15}%</span>
                                          </div>
                                          <Slider
                                            value={[driverAdjustments.hcc?.maPopulationPct || 15]}
                                            onValueChange={([val]) => setDriverAdjustments(prev => ({
                                              ...prev,
                                              hcc: { ...prev.hcc, maPopulationPct: val }
                                            }))}
                                            min={5}
                                            max={60}
                                            step={1}
                                            className="w-full"
                                          />
                                          <p className="text-[13px] text-[#6B7280] mt-1">Baseline: 15% | Your region may differ</p>
                                        </div>
                                        <div>
                                          <label className="text-[14px] text-[#111827] block mb-2">Benchmark PMPM (your county)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={rawInputValues["hcc_benchmarkPmpm"] ?? String(driverAdjustments.hcc?.benchmarkPmpm || 1000)}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                                  setRawInputValues(prev => ({ ...prev, "hcc_benchmarkPmpm": val }));
                                                  if (val !== "" && !isNaN(Number(val))) {
                                                    setDriverAdjustments(prev => ({
                                                      ...prev,
                                                      hcc: { ...prev.hcc, benchmarkPmpm: Number(val) }
                                                    }));
                                                  }
                                                }
                                              }}
                                              onBlur={() => {
                                                const val = rawInputValues["hcc_benchmarkPmpm"];
                                                if (val === "" || val === undefined || isNaN(Number(val))) {
                                                  setDriverAdjustments(prev => ({
                                                    ...prev,
                                                    hcc: { ...prev.hcc, benchmarkPmpm: 1000 }
                                                  }));
                                                }
                                                setRawInputValues(prev => {
                                                  const next = { ...prev };
                                                  delete next["hcc_benchmarkPmpm"];
                                                  return next;
                                                });
                                              }}
                                              className="w-full pl-7 p-3 border border-[#E5E7EB] rounded-lg"
                                            />
                                          </div>
                                          <p className="text-[13px] text-[#6B7280] mt-1">Baseline: $1,000</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {id === "denials" && (
                                      <div className="space-y-4">
                                        <div>
                                          <div className="flex justify-between mb-2">
                                            <span className="text-[14px] text-[#111827]">Denial rate</span>
                                            <span className="text-[14px] font-medium text-[#111827]">{driverAdjustments.denials?.denialRate || 5}%</span>
                                          </div>
                                          <Slider
                                            value={[driverAdjustments.denials?.denialRate || 5]}
                                            onValueChange={([val]) => setDriverAdjustments(prev => ({
                                              ...prev,
                                              denials: { ...prev.denials, denialRate: val }
                                            }))}
                                            min={1}
                                            max={20}
                                            step={0.5}
                                            className="w-full"
                                          />
                                          <p className="text-[13px] text-[#6B7280] mt-1">Typical range: 3-10%</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {id === "overtime" && (
                                      <div className="space-y-4">
                                        <div>
                                          <div className="flex justify-between mb-2">
                                            <span className="text-[14px] text-[#111827]">After-hours documentation %</span>
                                            <span className="text-[14px] font-medium text-[#111827]">{driverAdjustments.overtime?.afterHoursPct || 20}%</span>
                                          </div>
                                          <Slider
                                            value={[driverAdjustments.overtime?.afterHoursPct || 20]}
                                            onValueChange={([val]) => setDriverAdjustments(prev => ({
                                              ...prev,
                                              overtime: { ...prev.overtime, afterHoursPct: val }
                                            }))}
                                            min={5}
                                            max={50}
                                            step={1}
                                            className="w-full"
                                          />
                                          <p className="text-[13px] text-[#6B7280] mt-1">Typical range: 15-30%</p>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="text-[14px] text-[#111827]">Premium rate ($/hr)</label>
                                            <span className="text-[12px] text-[#6B7280] px-2 py-0.5 bg-[#F3F4F6] rounded">Baseline: $145/hr</span>
                                          </div>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={rawInputValues["overtime_premiumRate"] ?? String(driverAdjustments.overtime?.premiumRate || 145)}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                                  setRawInputValues(prev => ({ ...prev, "overtime_premiumRate": val }));
                                                  if (val !== "" && !isNaN(Number(val))) {
                                                    setDriverAdjustments(prev => ({
                                                      ...prev,
                                                      overtime: { ...prev.overtime, premiumRate: Number(val) }
                                                    }));
                                                  }
                                                }
                                              }}
                                              onBlur={() => {
                                                const val = rawInputValues["overtime_premiumRate"];
                                                if (val === "" || val === undefined || isNaN(Number(val))) {
                                                  setDriverAdjustments(prev => ({
                                                    ...prev,
                                                    overtime: { ...prev.overtime, premiumRate: 145 }
                                                  }));
                                                }
                                                setRawInputValues(prev => {
                                                  const next = { ...prev };
                                                  delete next["overtime_premiumRate"];
                                                  return next;
                                                });
                                              }}
                                              className={`w-full pl-7 p-3 border rounded-lg ${
                                                Math.abs((driverAdjustments.overtime?.premiumRate || 145) - 145) > 50 
                                                  ? "border-[#F59E0B] bg-[#FFFBEB]" 
                                                  : "border-[#E5E7EB]"
                                              }`}
                                            />
                                          </div>
                                          {/* Validation hint when significantly different */}
                                          {Math.abs((driverAdjustments.overtime?.premiumRate || 145) - 145) > 50 && (
                                            <div className="mt-2 p-2 bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-lg flex items-center gap-2">
                                              <Info className="h-4 w-4 text-[#F59E0B] shrink-0" />
                                              <span className="text-[12px] text-[#92400E]">
                                                {((driverAdjustments.overtime?.premiumRate || 145) - 145) / 145 * 100 > 0 ? "Higher" : "Lower"} than typical by {Math.abs(Math.round(((driverAdjustments.overtime?.premiumRate || 145) - 145) / 145 * 100))}%. Is this correct for your organization?
                                              </span>
                                            </div>
                                          )}
                                          <p className="text-[12px] text-[#9CA3AF] mt-1">Typical range: $100-$200/hr</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-center">
                        <Check className="h-8 w-8 text-[#059669] mx-auto mb-3" />
                        <p className="text-[16px] font-bold text-[#111827] mb-2">All value drivers are already active</p>
                        <p className="text-[14px] text-[#6B7280]">
                          Try "Expand Providers" to model growth, or adjust assumptions in Detailed Breakdown.
                        </p>
                      </div>
                    )}
                    
                    {/* Footer actions */}
                    <div className="border-t border-[#E5E7EB] pt-6 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddDrivers(false)}
                        data-testid="button-cancel-drivers"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={scenarioDriverSelections.size === 0 || !driversScenarioName.trim()}
                        onClick={() => {
                          // Calculate total value with new drivers using adjustments
                          let scenarioTotalBenefit = totalAnnualBenefit;
                          const scenarioDriverValues: Record<LeverId, number> = { ...driverValues };
                          
                          scenarioDriverSelections.forEach(id => {
                            const adjustedVal = calculateAdjustedDriverValue(id, driverAdjustments);
                            scenarioDriverValues[id] = adjustedVal;
                            scenarioTotalBenefit += adjustedVal;
                          });
                          
                          const newScenario: Scenario = {
                            id: Date.now().toString(),
                            name: driversScenarioName.trim() || `Add ${Array.from(scenarioDriverSelections).map(id => leverShortNames[id]).join(" + ")}`,
                            type: "drivers",
                            createdAt: new Date(),
                            providers: inputs.numberOfProviders,
                            encounters: inputs.annualOutpatientEncounters,
                            utilizationRate: inputs.abridgeUtilizationPct,
                            maPopulationPct: inputs.hcc.pctMedicareAdvantage || 15,
                            driverValues: scenarioDriverValues,
                            newPatientPct: 30,
                            specialtyPct: 40,
                            revenuePerVisitOverride: null,
                            visitLengthOverride: null,
                            totalBenefit: scenarioTotalBenefit,
                            investment: annualInvestment,
                            netGain: scenarioTotalBenefit - annualInvestment,
                            roiMultiple: scenarioTotalBenefit / annualInvestment,
                          };
                          
                          setScenarios(prev => [...prev, newScenario]);
                          setShowAddDrivers(false);
                          toast({
                            title: "Scenario saved",
                            description: `"${newScenario.name}" has been created`,
                          });
                        }}
                        className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                        data-testid="button-save-drivers-scenario"
                      >
                        Save Scenario
                      </Button>
                    </div>
                  </div>
                  
                  {/* Right column - Preview Panel */}
                  <div className="lg:w-[40%]">
                    <div className="lg:sticky lg:top-6">
                      {/* Mobile toggle */}
                      <div className="lg:hidden mb-4">
                        <button
                          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                          className="w-full p-4 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-between"
                        >
                          <span className="text-[14px] font-bold text-[#111827]">Preview</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-[#059669]">
                              +{formatCurrency((() => {
                                let addedValue = 0;
                                scenarioDriverSelections.forEach(id => {
                                  addedValue += calculateAdjustedDriverValue(id, driverAdjustments);
                                });
                                return addedValue;
                              })())}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-[#6B7280] transition-transform ${mobilePreviewOpen ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                      </div>
                      
                      <div className={`${mobilePreviewOpen ? "block" : "hidden"} lg:block`}>
                        <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                          <div className="mb-4">
                            <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                              Scenario Preview
                            </h3>
                            <p className="text-[13px] text-[#6B7280]">Updates in real-time</p>
                          </div>
                          
                          {/* Comparison table header */}
                          <div className="grid grid-cols-4 gap-2 text-[12px] font-bold text-[#6B7280] uppercase mb-3">
                            <div></div>
                            <div className="text-right">Baseline</div>
                            <div className="text-right">Scenario</div>
                            <div className="text-right">Change</div>
                          </div>
                          
                          {/* Deployment (unchanged) */}
                          <div className="mb-4">
                            <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Deployment (unchanged)</div>
                            <div className="space-y-2">
                              <div className="grid grid-cols-4 gap-2 text-[14px]">
                                <div className="text-[#6B7280]">Providers</div>
                                <div className="text-right text-[#111827]">{inputs.numberOfProviders}</div>
                                <div className="text-right font-bold text-[#111827]">{inputs.numberOfProviders}</div>
                                <div className="text-right text-[#6B7280]">—</div>
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-[14px]">
                                <div className="text-[#6B7280]">Encounters</div>
                                <div className="text-right text-[#111827]">{inputs.annualOutpatientEncounters.toLocaleString()}</div>
                                <div className="text-right font-bold text-[#111827]">{inputs.annualOutpatientEncounters.toLocaleString()}</div>
                                <div className="text-right text-[#6B7280]">—</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-[#E5E7EB] my-4" />
                          
                          {/* Active Drivers */}
                          <div className="mb-4">
                            <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Active Drivers</div>
                            <div className="space-y-2">
                              {enabledDriverIds.map(id => (
                                <div key={id} className="grid grid-cols-4 gap-2 text-[14px]" title={leverLabels[id]}>
                                  <div className="text-[#6B7280] truncate" title={leverLabels[id]}>{leverShortNames[id]}</div>
                                  <div className="text-right text-[#111827]">{formatCurrency(driverValues[id])}</div>
                                  <div className="text-right font-bold text-[#111827]">{formatCurrency(driverValues[id])}</div>
                                  <div className="text-right text-[#6B7280]">—</div>
                                </div>
                              ))}
                              {Array.from(scenarioDriverSelections).map(id => {
                                const adjustedDriverValue = calculateAdjustedDriverValue(id, driverAdjustments);
                                return (
                                  <div key={id} className="grid grid-cols-4 gap-2 text-[14px]" title={leverLabels[id]}>
                                    <div className="text-[#6B7280] truncate" title={leverLabels[id]}>{leverShortNames[id]}</div>
                                    <div className="text-right text-[#6B7280]">—</div>
                                    <div className="text-right font-bold text-[#059669]">{formatCurrency(adjustedDriverValue)}</div>
                                    <div className="text-right">
                                      <span className="px-1.5 py-0.5 bg-[#059669] text-[12px] font-bold text-white uppercase rounded animate-pulse">
                                        NEW
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="border-t border-[#E5E7EB] my-4" />
                          
                          {/* Summary */}
                          {(() => {
                            let scenarioTotalBenefit = totalAnnualBenefit;
                            scenarioDriverSelections.forEach(id => {
                              scenarioTotalBenefit += calculateAdjustedDriverValue(id, driverAdjustments);
                            });
                            const scenarioNetGain = scenarioTotalBenefit - annualInvestment;
                            const scenarioRoi = scenarioTotalBenefit / annualInvestment;
                            
                            return (
                              <>
                                <div className="mb-4">
                                  <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Summary</div>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Total Benefit</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(totalAnnualBenefit)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(scenarioTotalBenefit)}</div>
                                      <div className={`text-right ${scenarioTotalBenefit > totalAnnualBenefit ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        {scenarioTotalBenefit > totalAnnualBenefit ? `+${(((scenarioTotalBenefit - totalAnnualBenefit) / totalAnnualBenefit) * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Investment</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(annualInvestment)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(annualInvestment)}</div>
                                      <div className="text-right text-[#6B7280]">—</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[16px] bg-[#F9FAFB] -mx-6 px-6 py-2">
                                      <div className="font-bold text-[#111827]">Net Gain</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(netAnnualGain)}</div>
                                      <div className="text-right font-bold text-[#059669]">{formatCurrency(scenarioNetGain)}</div>
                                      <div className={`text-right font-bold ${scenarioNetGain > netAnnualGain ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        {scenarioNetGain > netAnnualGain ? `+${(((scenarioNetGain - netAnnualGain) / netAnnualGain) * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">ROI</div>
                                      <div className="text-right text-[#111827]">{roiMultiple.toFixed(1)}x</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioRoi.toFixed(1)}x</div>
                                      <div className={`text-right ${scenarioRoi > roiMultiple ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        {scenarioRoi > roiMultiple ? `+${(((scenarioRoi - roiMultiple) / roiMultiple) * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border-t border-[#E5E7EB] my-4" />
                                
                                {/* Value Breakdown Stacked Bar */}
                                {(enabledDriverIds.length > 0 || scenarioDriverSelections.size > 0) && (
                                  <div className="mb-4">
                                    <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Value Breakdown</div>
                                    
                                    {/* Stacked bar */}
                                    <div className="flex h-8 rounded-lg overflow-hidden mb-3">
                                      {(() => {
                                        // Combine baseline and new drivers
                                        const allDrivers: { id: LeverId; value: number; isNew: boolean }[] = [];
                                        enabledDriverIds.forEach(id => {
                                          allDrivers.push({ id, value: driverValues[id], isNew: false });
                                        });
                                        Array.from(scenarioDriverSelections).forEach(id => {
                                          allDrivers.push({ id, value: calculateAdjustedDriverValue(id, driverAdjustments), isNew: true });
                                        });
                                        
                                        const colors = [
                                          "bg-gradient-to-r from-[#ef4444] to-[#dc2626]",
                                          "bg-gradient-to-r from-[#f59e0b] to-[#d97706]",
                                          "bg-gradient-to-r from-[#10b981] to-[#059669]",
                                          "bg-gradient-to-r from-[#3b82f6] to-[#2563eb]",
                                          "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed]",
                                          "bg-gradient-to-r from-[#ec4899] to-[#db2777]",
                                        ];
                                        
                                        return allDrivers.map((driver, index) => {
                                          const pct = (driver.value / scenarioTotalBenefit) * 100;
                                          return (
                                            <div
                                              key={driver.id}
                                              className={`${colors[index % colors.length]} flex items-center justify-center transition-all hover:brightness-110 ${driver.isNew ? "ring-2 ring-white ring-inset" : ""}`}
                                              style={{ width: `${pct}%` }}
                                              title={`${leverLabels[driver.id]}: ${formatCurrency(driver.value)} (${pct.toFixed(1)}%)`}
                                            >
                                              {pct > 12 && (
                                                <span className="text-[11px] font-bold text-white truncate px-1">
                                                  {leverShortNames[driver.id]}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="space-y-1">
                                      {(() => {
                                        const allDrivers: { id: LeverId; value: number; isNew: boolean }[] = [];
                                        enabledDriverIds.forEach(id => {
                                          allDrivers.push({ id, value: driverValues[id], isNew: false });
                                        });
                                        Array.from(scenarioDriverSelections).forEach(id => {
                                          allDrivers.push({ id, value: calculateAdjustedDriverValue(id, driverAdjustments), isNew: true });
                                        });
                                        
                                        const colors = [
                                          "bg-[#ef4444]",
                                          "bg-[#f59e0b]",
                                          "bg-[#10b981]",
                                          "bg-[#3b82f6]",
                                          "bg-[#8b5cf6]",
                                          "bg-[#ec4899]",
                                        ];
                                        
                                        return allDrivers.map((driver, index) => {
                                          const pct = (driver.value / scenarioTotalBenefit) * 100;
                                          return (
                                            <div key={driver.id} className="flex items-center justify-between text-[12px]" title={leverLabels[driver.id]}>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded ${colors[index % colors.length]}`} />
                                                <span className="text-[#6B7280]" title={leverLabels[driver.id]}>{leverShortNames[driver.id]}</span>
                                                {driver.isNew && (
                                                  <span className="px-1 py-0.5 bg-[#059669] text-[9px] font-bold text-white uppercase rounded animate-pulse">NEW</span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[#111827] font-medium">${(driver.value / 1000).toFixed(0)}K</span>
                                                <span className="text-[#9CA3AF]">({pct.toFixed(0)}%)</span>
                                              </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="border-t border-[#E5E7EB] my-4" />
                                
                                {/* 3-Year Projection */}
                                <div className="mb-4">
                                  <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">3-Year Projection</div>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Total Value</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(totalAnnualBenefit * 3)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(scenarioTotalBenefit * 3)}</div>
                                      <div className={`text-right ${scenarioTotalBenefit > totalAnnualBenefit ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        {scenarioTotalBenefit > totalAnnualBenefit ? `+${(((scenarioTotalBenefit - totalAnnualBenefit) / totalAnnualBenefit) * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Net 3-Year</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(netAnnualGain * 3)}</div>
                                      <div className="text-right font-bold text-[#059669]">{formatCurrency(scenarioNetGain * 3)}</div>
                                      <div className={`text-right font-bold ${scenarioNetGain > netAnnualGain ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        {scenarioNetGain > netAnnualGain ? `+${(((scenarioNetGain - netAnnualGain) / netAnnualGain) * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Key Insight */}
                                {scenarioDriverSelections.size > 0 && (
                                  <div className="mt-4 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                                      <div>
                                        <p className="text-[13px] font-bold text-[#1E40AF] mb-1">Key Insight</p>
                                        <p className="text-[14px] text-[#1E40AF]">
                                          Adding {scenarioDriverSelections.size === 1 ? "this driver" : `these ${scenarioDriverSelections.size} drivers`} increases your ROI from {roiMultiple.toFixed(1)}x to {scenarioRoi.toFixed(1)}x without any additional investment.
                                          {scenarioDriverSelections.size > 0 && (() => {
                                            let maxVal = 0;
                                            let maxId: LeverId = "hcc";
                                            scenarioDriverSelections.forEach(id => {
                                              const val = calculateAdjustedDriverValue(id, driverAdjustments);
                                              if (val > maxVal) {
                                                maxVal = val;
                                                maxId = id;
                                              }
                                            });
                                            const addedValue = scenarioTotalBenefit - totalAnnualBenefit;
                                            return scenarioDriverSelections.size > 1 ? ` ${leverLabels[maxId]} alone adds ${formatCurrency(maxVal)} (${((maxVal / addedValue) * 100).toFixed(0)}% of new value).` : "";
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : showNewCareSetting ? (
              /* NEW CARE SETTING FLOW - COMPONENT-BASED */
              <NewCareSettingFlow
                baseline={{
                  providers: inputs.numberOfProviders,
                  encounters: inputs.annualOutpatientEncounters,
                  utilization: inputs.abridgeUtilizationPct / 100,
                  costPerProviderMonth: inputs.monthlyCostPerProvider,
                  annualCost: annualInvestment,
                  totalBenefit: totalAnnualBenefit,
                  netGain: netAnnualGain,
                  roi: roiMultiple,
                  benefits: Object.fromEntries(
                    results.levers
                      .filter((lever: { enabled: boolean; id: string; value: number }) => lever.enabled)
                      .map((lever: { id: string; value: number }) => [lever.id, lever.value])
                  ),
                  activeDrivers: results.levers.filter((lever: { enabled: boolean; id: string }) => lever.enabled).map((lever: { id: string }) => lever.id),
                  careSetting: careSettingLabel,
                }}
                onBack={() => setShowNewCareSetting(false)}
                onSave={(scenario) => {
                  const newScenario: Scenario = {
                    id: `scenario-${Date.now()}`,
                    name: scenario.name,
                    type: scenario.type as ScenarioType,
                    createdAt: new Date(),
                    providers: scenario.model.combined.providers,
                    encounters: scenario.model.combined.encounters,
                    utilizationRate: inputs.abridgeUtilizationPct,
                    maPopulationPct: inputs.pctMedicareAdvantage,
                    newPatientPct: inputs.pctNewPatients,
                    specialtyPct: 0,
                    revenuePerVisitOverride: null,
                    visitLengthOverride: null,
                    totalBenefit: scenario.model.combined.benefit,
                    investment: scenario.model.combined.cost,
                    netGain: scenario.model.combined.netGain,
                    roiMultiple: scenario.model.combined.roi,
                    driverValues: {} as Record<LeverId, number>,
                  };
                  setScenarios(prev => [...prev, newScenario]);
                  setShowNewCareSetting(false);
                  toast({
                    title: "Scenario saved",
                    description: `${scenario.name} has been added to your scenarios.`,
                  });
                }}
              />
            ) : showScenarioComparison ? (
              /* SCENARIO COMPARISON VIEW */
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => setShowScenarioComparison(false)}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-from-comparison"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                    Compare Scenarios
                  </h2>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Side-by-side analysis of your expansion options
                  </p>
                  
                  {/* Info box */}
                  <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                    <p className="text-[14px] text-[#1E40AF]">
                      Compare up to 3 scenarios to evaluate trade-offs. Your baseline model is shown for reference.
                    </p>
                  </div>
                </div>
                
                {/* Scenario Selector */}
                <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                  <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                    Select Scenarios to Compare
                  </h3>
                  <p className="text-[14px] text-[#6B7280] mb-4">
                    Choose 1-3 scenarios (baseline always included)
                  </p>
                  
                  {/* Baseline card (always selected) */}
                  <div className="p-4 bg-white border-2 border-[#E8532F] rounded-lg mb-3 bg-[rgba(232,83,47,0.02)]">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-[#E8532F] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[#111827]">Current Model (Baseline)</span>
                          <span className="px-2 py-0.5 bg-[#F3F4F6] text-[11px] text-[#6B7280] uppercase rounded">Required</span>
                        </div>
                        <p className="text-[13px] text-[#6B7280] mt-1">
                          {inputs.numberOfProviders} providers | {formatCurrency(netAnnualGain)} net gain | {roiMultiple.toFixed(1)}x ROI
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scenario cards */}
                  {scenarios.map((scenario) => {
                    const isSelected = selectedScenariosForCompare.has(scenario.id);
                    const maxReached = selectedScenariosForCompare.size >= 3 && !isSelected;
                    const ScenarioIcon = getScenarioTypeIcon(scenario.type);
                    
                    return (
                      <div
                        key={scenario.id}
                        onClick={() => !maxReached && toggleScenarioSelection(scenario.id)}
                        className={`p-4 bg-white border rounded-lg mb-3 cursor-pointer transition-all ${
                          isSelected 
                            ? "border-2 border-[#E8532F] bg-[rgba(232,83,47,0.02)]" 
                            : maxReached 
                              ? "border-[#E5E7EB] opacity-60 cursor-not-allowed"
                              : "border-[#E5E7EB] hover:border-[#E8532F]"
                        }`}
                        data-testid={`compare-selector-${scenario.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                            isSelected ? "bg-[#E8532F] border-[#E8532F]" : "border-[#E5E7EB]"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <ScenarioIcon className="h-4 w-4 text-[#6B7280]" />
                              <span className="text-[14px] font-bold text-[#111827]">{scenario.name}</span>
                            </div>
                            <p className="text-[13px] text-[#6B7280] mt-1">
                              {scenario.providers} providers | {formatCurrency(scenario.netGain)} net gain | {scenario.roiMultiple.toFixed(1)}x ROI
                            </p>
                            {maxReached && (
                              <p className="text-[13px] text-[#6B7280] italic mt-1">
                                Maximum 3 scenarios - deselect one to add this
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <p className="text-[13px] text-[#6B7280] mt-4">
                    {selectedScenariosForCompare.size} of 3 selected
                  </p>
                </div>
                
                {/* Detailed Comparison Table */}
                {selectedScenariosForCompare.size >= 1 && (() => {
                  const selectedScenarios = scenarios.filter(s => selectedScenariosForCompare.has(s.id));
                  const baselineNetGain = netAnnualGain;
                  const baselineRoi = roiMultiple;
                  const baselineBenefit = totalAnnualBenefit;
                  const baselineInvestment = annualInvestment;
                  
                  // Helper for safe percentage calculation
                  const safePercentChange = (newVal: number, baseVal: number): string | null => {
                    if (baseVal === 0 || !isFinite(baseVal)) return null;
                    const change = ((newVal - baseVal) / Math.abs(baseVal)) * 100;
                    if (!isFinite(change)) return null;
                    return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
                  };
                  
                  // Find best values with safe guards
                  const allNetGains = [baselineNetGain, ...selectedScenarios.map(s => s.netGain)].filter(v => isFinite(v));
                  const allRois = [baselineRoi, ...selectedScenarios.map(s => s.roiMultiple)].filter(v => isFinite(v));
                  const maxNetGain = allNetGains.length > 0 ? Math.max(...allNetGains) : 1;
                  const maxRoi = allRois.length > 0 ? Math.max(...allRois) : 1;
                  
                  // Safe chart width calculation using absolute values for proper scaling
                  const safeChartWidth = (value: number, maxValue: number): number => {
                    if (!isFinite(maxValue) || !isFinite(value)) return 0;
                    // Use absolute values for scaling to handle negative scenarios
                    const absMax = Math.max(Math.abs(maxValue), ...allNetGains.map(Math.abs), ...allRois.map(Math.abs));
                    if (absMax === 0) return 50; // Equal widths when all values are 0
                    return Math.min(100, Math.max(5, (Math.abs(value) / absMax) * 100));
                  };
                  
                  return (
                    <>
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                        <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                          Detailed Comparison
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[600px]">
                            <thead>
                              <tr className="border-b-2 border-[#E5E7EB]">
                                <th className="text-left py-3 pr-4 text-[14px] font-bold text-[#6B7280]"></th>
                                <th className="text-right py-3 px-4 text-[14px] font-bold text-[#111827] uppercase bg-[rgba(0,0,0,0.02)]">
                                  Baseline
                                </th>
                                {selectedScenarios.map((s, i) => (
                                  <th key={s.id} className="text-right py-3 px-4 text-[14px] font-bold text-[#111827] uppercase">
                                    {s.name.length > 20 ? s.name.substring(0, 20) + "..." : s.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Deployment Section */}
                              <tr>
                                <td colSpan={2 + selectedScenarios.length} className="pt-6 pb-2">
                                  <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">Deployment</span>
                                </td>
                              </tr>
                              <tr className="border-t border-[#E5E7EB]">
                                <td className="py-2 pr-4 text-[14px] text-[#6B7280]">Providers</td>
                                <td className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.02)]">
                                  {inputs.numberOfProviders}
                                </td>
                                {selectedScenarios.map(s => {
                                  const pctChange = safePercentChange(s.providers, inputs.numberOfProviders);
                                  return (
                                    <td key={s.id} className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums">
                                      {s.providers}
                                      {pctChange && (
                                        <span className={`ml-2 text-[12px] ${s.providers > inputs.numberOfProviders ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                          {pctChange}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="border-t border-[#E5E7EB]">
                                <td className="py-2 pr-4 text-[14px] text-[#6B7280]">Encounters</td>
                                <td className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.02)]">
                                  {inputs.annualOutpatientEncounters.toLocaleString()}
                                </td>
                                {selectedScenarios.map(s => (
                                  <td key={s.id} className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums">
                                    {s.encounters.toLocaleString()}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-t border-[#E5E7EB]">
                                <td className="py-2 pr-4 text-[14px] text-[#6B7280]">Utilization</td>
                                <td className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.02)]">
                                  {inputs.abridgeUtilizationPct}%
                                </td>
                                {selectedScenarios.map(s => (
                                  <td key={s.id} className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums">
                                    {s.utilizationRate}%
                                  </td>
                                ))}
                              </tr>
                              
                              {/* Active Drivers Section */}
                              <tr>
                                <td colSpan={2 + selectedScenarios.length} className="pt-6 pb-2">
                                  <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">Active Drivers</span>
                                </td>
                              </tr>
                              {(["patientAccess", "wrvu", "workforce", "hcc", "denials", "overtime"] as LeverId[]).map(driverId => (
                                <tr key={driverId} className="border-t border-[#E5E7EB]">
                                  <td className="py-2 pr-4 text-[14px] text-[#6B7280]">{leverLabels[driverId]}</td>
                                  <td className="py-2 px-4 text-[14px] text-right bg-[rgba(0,0,0,0.02)]">
                                    {inputs.levers[driverId] ? (
                                      <Check className="h-4 w-4 text-[#059669] inline" />
                                    ) : (
                                      <span className="text-[#9CA3AF]">—</span>
                                    )}
                                  </td>
                                  {selectedScenarios.map(s => (
                                    <td key={s.id} className="py-2 px-4 text-[14px] text-right">
                                      {(s.driverValues[driverId] || 0) > 0 ? (
                                        <Check className="h-4 w-4 text-[#059669] inline" />
                                      ) : (
                                        <span className="text-[#9CA3AF]">—</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              
                              {/* Financial Summary Section */}
                              <tr>
                                <td colSpan={2 + selectedScenarios.length} className="pt-6 pb-2">
                                  <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">Financial Summary</span>
                                </td>
                              </tr>
                              <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                                <td className="py-3 pr-4 text-[14px] font-bold text-[#111827]">Total Benefit</td>
                                <td className="py-3 px-4 text-[14px] font-bold text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.04)]">
                                  {formatCurrency(baselineBenefit)}
                                </td>
                                {selectedScenarios.map(s => {
                                  const pctChange = safePercentChange(s.totalBenefit, baselineBenefit);
                                  return (
                                    <td key={s.id} className="py-3 px-4 text-[14px] font-bold text-[#111827] text-right tabular-nums">
                                      {formatCurrency(s.totalBenefit)}
                                      {pctChange && (
                                        <span className={`block text-[12px] ${s.totalBenefit > baselineBenefit ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                          {pctChange}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                                <td className="py-3 pr-4 text-[14px] font-bold text-[#111827]">Investment</td>
                                <td className="py-3 px-4 text-[14px] font-bold text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.04)]">
                                  {formatCurrency(baselineInvestment)}
                                </td>
                                {selectedScenarios.map(s => {
                                  const pctChange = safePercentChange(s.investment, baselineInvestment);
                                  return (
                                    <td key={s.id} className="py-3 px-4 text-[14px] font-bold text-[#111827] text-right tabular-nums">
                                      {formatCurrency(s.investment)}
                                      {pctChange && (
                                        <span className={`block text-[12px] ${s.investment > baselineInvestment ? "text-[#DC2626]" : "text-[#059669]"}`}>
                                          {pctChange}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                                <td className="py-3 pr-4 text-[14px] font-bold text-[#111827]">Net Annual Gain</td>
                                <td className={`py-3 px-4 text-[14px] font-bold text-right tabular-nums bg-[rgba(0,0,0,0.04)] ${baselineNetGain === maxNetGain ? "text-[#059669]" : "text-[#111827]"}`}>
                                  {formatCurrency(baselineNetGain)}
                                </td>
                                {selectedScenarios.map(s => {
                                  const pctChange = safePercentChange(s.netGain, baselineNetGain);
                                  const isBest = s.netGain === maxNetGain;
                                  return (
                                    <td key={s.id} className={`py-3 px-4 text-[14px] font-bold text-right tabular-nums ${isBest ? "text-[#059669] bg-[rgba(5,150,105,0.08)]" : "text-[#111827]"}`}>
                                      {formatCurrency(s.netGain)}
                                      {pctChange && (
                                        <span className={`block text-[12px] ${s.netGain > baselineNetGain ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                          {pctChange}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                                <td className="py-3 pr-4 text-[14px] font-bold text-[#111827]">ROI</td>
                                <td className={`py-3 px-4 text-[14px] font-bold text-right tabular-nums bg-[rgba(0,0,0,0.04)] ${baselineRoi === maxRoi ? "text-[#059669]" : "text-[#111827]"}`}>
                                  {baselineRoi.toFixed(1)}x
                                </td>
                                {selectedScenarios.map(s => {
                                  const pctChange = safePercentChange(s.roiMultiple, baselineRoi);
                                  const isBest = s.roiMultiple === maxRoi;
                                  return (
                                    <td key={s.id} className={`py-3 px-4 text-[14px] font-bold text-right tabular-nums ${isBest ? "text-[#059669] bg-[rgba(5,150,105,0.08)]" : "text-[#111827]"}`}>
                                      {s.roiMultiple.toFixed(1)}x
                                      {pctChange && (
                                        <span className={`block text-[12px] ${s.roiMultiple > baselineRoi ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                          {pctChange}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                              
                              {/* 3-Year Projection */}
                              <tr>
                                <td colSpan={2 + selectedScenarios.length} className="pt-6 pb-2">
                                  <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">3-Year Projection</span>
                                </td>
                              </tr>
                              <tr className="border-t border-[#E5E7EB]">
                                <td className="py-2 pr-4 text-[14px] text-[#6B7280]">Total Value</td>
                                <td className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums bg-[rgba(0,0,0,0.02)]">
                                  {formatCurrency(baselineBenefit * 3)}
                                </td>
                                {selectedScenarios.map(s => (
                                  <td key={s.id} className="py-2 px-4 text-[14px] text-[#111827] text-right tabular-nums">
                                    {formatCurrency(s.totalBenefit * 3)}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-t border-[#E5E7EB]">
                                <td className="py-2 pr-4 text-[14px] text-[#6B7280]">Net 3-Year Gain</td>
                                <td className="py-2 px-4 text-[14px] font-bold text-[#059669] text-right tabular-nums bg-[rgba(0,0,0,0.02)]">
                                  {formatCurrency(baselineNetGain * 3)}
                                </td>
                                {selectedScenarios.map(s => (
                                  <td key={s.id} className="py-2 px-4 text-[14px] font-bold text-[#059669] text-right tabular-nums">
                                    {formatCurrency(s.netGain * 3)}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {/* Visual Comparison Charts */}
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                        <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                          Visual Comparison
                        </h3>
                        
                        {/* Net Annual Gain Chart */}
                        <div className="mb-8">
                          <h4 className="text-[14px] font-bold text-[#111827] mb-4">Net Annual Gain</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <span className="text-[14px] text-[#111827] w-32 truncate">Baseline</span>
                              <div className="flex-1 h-6 bg-[#E5E7EB] rounded overflow-hidden">
                                <div 
                                  className={`h-full rounded transition-all duration-300 ${baselineNetGain === maxNetGain ? "bg-[#059669]" : "bg-[#E8532F]"}`}
                                  style={{ width: `${safeChartWidth(baselineNetGain, maxNetGain)}%` }}
                                />
                              </div>
                              <span className="text-[16px] font-bold text-[#111827] w-28 text-right">{formatCurrency(baselineNetGain)}</span>
                            </div>
                            {selectedScenarios.map(s => (
                              <div key={s.id} className="flex items-center gap-4">
                                <span className="text-[14px] text-[#111827] w-32 truncate">{s.name.length > 15 ? s.name.substring(0, 15) + "..." : s.name}</span>
                                <div className="flex-1 h-6 bg-[#E5E7EB] rounded overflow-hidden">
                                  <div 
                                    className={`h-full rounded transition-all duration-300 ${s.netGain === maxNetGain ? "bg-[#059669]" : "bg-[#E8532F]"}`}
                                    style={{ width: `${safeChartWidth(s.netGain, maxNetGain)}%` }}
                                  />
                                </div>
                                <span className="text-[16px] font-bold text-[#111827] w-28 text-right">{formatCurrency(s.netGain)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* ROI Chart */}
                        <div>
                          <h4 className="text-[14px] font-bold text-[#111827] mb-4">Return on Investment</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <span className="text-[14px] text-[#111827] w-32 truncate">Baseline</span>
                              <div className="flex-1 h-6 bg-[#E5E7EB] rounded overflow-hidden">
                                <div 
                                  className={`h-full rounded transition-all duration-300 ${baselineRoi === maxRoi ? "bg-[#059669]" : "bg-[#E8532F]"}`}
                                  style={{ width: `${safeChartWidth(baselineRoi, maxRoi)}%` }}
                                />
                              </div>
                              <span className="text-[16px] font-bold text-[#111827] w-16 text-right">{baselineRoi.toFixed(1)}x</span>
                            </div>
                            {selectedScenarios.map(s => (
                              <div key={s.id} className="flex items-center gap-4">
                                <span className="text-[14px] text-[#111827] w-32 truncate">{s.name.length > 15 ? s.name.substring(0, 15) + "..." : s.name}</span>
                                <div className="flex-1 h-6 bg-[#E5E7EB] rounded overflow-hidden">
                                  <div 
                                    className={`h-full rounded transition-all duration-300 ${s.roiMultiple === maxRoi ? "bg-[#059669]" : "bg-[#E8532F]"}`}
                                    style={{ width: `${safeChartWidth(s.roiMultiple, maxRoi)}%` }}
                                  />
                                </div>
                                <span className="text-[16px] font-bold text-[#111827] w-16 text-right">{s.roiMultiple.toFixed(1)}x</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Key Insights */}
                      <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                        <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-6">
                          Key Insights
                        </h3>
                        
                        <div className="space-y-4">
                          {/* Highest Value Insight */}
                          {(() => {
                            const highestGain = selectedScenarios.reduce((max, s) => s.netGain > max.netGain ? s : max, selectedScenarios[0]);
                            if (!highestGain || highestGain.netGain <= baselineNetGain) return null;
                            const changeVsBaseline = safePercentChange(highestGain.netGain, baselineNetGain);
                            return (
                              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg">
                                <div className="flex items-start gap-3">
                                  <TrendingUp className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[13px] font-bold text-[#059669] mb-1">Highest Value</p>
                                    <p className="text-[14px] text-[#166534]">
                                      "{highestGain.name}" delivers the highest absolute value at {formatCurrency(highestGain.netGain)} net annual gain{changeVsBaseline ? ` (${changeVsBaseline} over baseline)` : ""}.
                                      {highestGain.investment > baselineInvestment && ` This requires ${formatCurrency(highestGain.investment - baselineInvestment)} additional investment.`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Best ROI Insight */}
                          {(() => {
                            const bestRoi = selectedScenarios.reduce((max, s) => s.roiMultiple > max.roiMultiple ? s : max, selectedScenarios[0]);
                            if (!bestRoi || bestRoi.roiMultiple <= baselineRoi) return null;
                            const roiImprovement = safePercentChange(bestRoi.roiMultiple, baselineRoi);
                            return (
                              <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                                <div className="flex items-start gap-3">
                                  <BarChart3 className="h-5 w-5 text-[#1E40AF] mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[13px] font-bold text-[#1E40AF] mb-1">Best ROI</p>
                                    <p className="text-[14px] text-[#1E40AF]">
                                      "{bestRoi.name}" has the best ROI at {bestRoi.roiMultiple.toFixed(1)}x{roiImprovement ? ` (${roiImprovement} improvement)` : ""}.
                                      {bestRoi.investment === baselineInvestment && " This adds value with zero additional investment."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Recommendation */}
                          <div className="p-4 bg-[#FFFBF5] border border-[#FDE68A] rounded-lg">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="h-5 w-5 text-[#92400E] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[13px] font-bold text-[#92400E] mb-1">Recommendation</p>
                                <p className="text-[14px] text-[#92400E]">
                                  {selectedScenarios.length === 1 
                                    ? (() => {
                                        const improvementPct = safePercentChange(selectedScenarios[0].netGain, baselineNetGain);
                                        return improvementPct 
                                          ? `"${selectedScenarios[0].name}" shows a ${improvementPct} change in net gain. Consider adding more scenarios to compare alternatives.`
                                          : `"${selectedScenarios[0].name}" shows a change in net gain. Consider adding more scenarios to compare alternatives.`;
                                      })()
                                    : `Compare the trade-offs between maximizing absolute value vs. ROI efficiency. Higher ROI scenarios often require less investment but may yield lower total value.`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowScenarioComparison(false)}
                          data-testid="button-done-comparison"
                        >
                          Done
                        </Button>
                        <Button
                          onClick={() => {
                            toast({
                              title: "Export feature coming soon",
                              description: "PDF export will be available in a future update",
                            });
                          }}
                          className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                          data-testid="button-export-comparison"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Export for Presentation
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : showCompetitorComparison ? (
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => setShowCompetitorComparison(false)}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-competitor"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                    Competitor Comparison
                  </h2>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Compare ROI of switching from your current solution to Abridge
                  </p>
                  
                  {/* Baseline reference box */}
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-[#6B7280]" />
                    <span className="text-[14px] text-[#6B7280]">
                      Your Abridge baseline: {inputs.numberOfProviders} providers | {inputs.annualOutpatientEncounters.toLocaleString()} encounters | {formatCurrency(netAnnualGain)} net gain
                    </span>
                  </div>
                </div>
                
                {/* Step 1: Competitor Selection */}
                {competitorStep === 1 && (
                  <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-[18px] font-bold text-[#111827] mb-4">
                      What solution are you currently using?
                    </h3>
                    
                    {/* Competitor Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {[
                        { name: "DAX (Nuance)", type: "ambient" as const, icon: "🎙️" },
                        { name: "Suki", type: "ambient" as const, icon: "🤖" },
                        { name: "Ambience Healthcare", type: "ambient" as const, icon: "💡" },
                        { name: "Nabla", type: "ambient" as const, icon: "📝" },
                        { name: "Human Scribe", type: "human" as const, icon: "👤" },
                        { name: "Other AI Solution", type: "custom" as const, icon: "⚙️" },
                      ].map((competitor) => (
                        <button
                          key={competitor.name}
                          onClick={() => setSelectedCompetitor({ name: competitor.name, type: competitor.type })}
                          className={`p-4 border rounded-lg text-left transition-all ${
                            selectedCompetitor?.name === competitor.name
                              ? "border-[#E8532F] bg-[#E8532F]/5 ring-2 ring-[#E8532F]/20"
                              : "border-[#E5E7EB] hover:border-[#E8532F]/50"
                          }`}
                          data-testid={`button-competitor-${competitor.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="text-2xl mb-2">{competitor.icon}</div>
                          <div className="font-semibold text-[#111827]">{competitor.name}</div>
                          <div className="text-[13px] text-[#6B7280]">
                            {competitor.type === "human" ? "In-person documentation" : "Ambient AI"}
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Conditional Input Forms based on competitor type */}
                    {selectedCompetitor && (
                      <div className="border-t border-[#E5E7EB] pt-6">
                        <h4 className="text-[16px] font-bold text-[#111827] mb-4">
                          Tell us about your current {selectedCompetitor.name} usage
                        </h4>
                        
                        {/* Human Scribe Inputs */}
                        {selectedCompetitor.type === "human" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Number of Scribes</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={rawInputValues["scribeCount"] ?? String(scribeCount)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "scribeCount": val }));
                                      if (val !== "" && !isNaN(Number(val))) setScribeCount(parseInt(val) || 0);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (rawInputValues["scribeCount"] === "" || rawInputValues["scribeCount"] === undefined) setScribeCount(5);
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["scribeCount"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-scribe-count"
                                />
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Average Hourly Rate ($)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={rawInputValues["scribeHourlyRate"] ?? String(scribeHourlyRate)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "scribeHourlyRate": val }));
                                      if (val !== "" && !isNaN(Number(val))) setScribeHourlyRate(parseInt(val) || 0);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (rawInputValues["scribeHourlyRate"] === "" || rawInputValues["scribeHourlyRate"] === undefined) setScribeHourlyRate(25);
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["scribeHourlyRate"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-scribe-hourly-rate"
                                />
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Hours per Week (per scribe)</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={rawInputValues["scribeHoursPerWeek"] ?? String(scribeHoursPerWeek)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "scribeHoursPerWeek": val }));
                                      if (val !== "" && !isNaN(Number(val))) setScribeHoursPerWeek(parseInt(val) || 0);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (rawInputValues["scribeHoursPerWeek"] === "" || rawInputValues["scribeHoursPerWeek"] === undefined) setScribeHoursPerWeek(40);
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["scribeHoursPerWeek"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-scribe-hours"
                                />
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Expected Reduction with Abridge (%)</label>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[scribeReductionPercent]}
                                    onValueChange={([val]) => setScribeReductionPercent(val)}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="flex-1"
                                    data-testid="slider-scribe-reduction"
                                  />
                                  <span className="text-[16px] font-mono w-12 text-right">{scribeReductionPercent}%</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Scribe cost calculation preview */}
                            <div className="mt-4 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-[13px] text-[#6B7280]">Current Annual Scribe Cost</div>
                                  <div className="text-[20px] font-bold text-[#111827] font-mono">
                                    {formatCurrency(scribeCount * scribeHourlyRate * scribeHoursPerWeek * 52 * 1.3)}
                                  </div>
                                  <div className="text-[12px] text-[#9CA3AF]">Includes 30% burden rate</div>
                                </div>
                                <div>
                                  <div className="text-[13px] text-[#6B7280]">Projected Savings with Abridge</div>
                                  <div className="text-[20px] font-bold text-[#059669] font-mono">
                                    {formatCurrency((scribeCount * scribeHourlyRate * scribeHoursPerWeek * 52 * 1.3) * (scribeReductionPercent / 100))}
                                  </div>
                                  <div className="text-[12px] text-[#9CA3AF]">Based on {scribeReductionPercent}% reduction</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Ambient AI Competitor Inputs */}
                        {(selectedCompetitor.type === "ambient" || selectedCompetitor.type === "custom") && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Monthly Cost per Provider ($)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={rawInputValues["competitorCost"] ?? String(competitorCostPerProvider)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "competitorCost": val }));
                                      if (val !== "" && !isNaN(Number(val))) setCompetitorCostPerProvider(parseInt(val) || 0);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (rawInputValues["competitorCost"] === "" || rawInputValues["competitorCost"] === undefined) setCompetitorCostPerProvider(200);
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["competitorCost"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-competitor-cost"
                                />
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Providers Using {selectedCompetitor.name}</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={rawInputValues["competitorProviders"] ?? (competitorProviderCount === "" ? "" : String(competitorProviderCount))}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "competitorProviders": val }));
                                      if (val !== "") setCompetitorProviderCount(parseInt(val) || 0);
                                      else setCompetitorProviderCount("");
                                    }
                                  }}
                                  onBlur={() => {
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["competitorProviders"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-competitor-providers"
                                />
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Current Utilization Rate (%)</label>
                                <div className="flex items-center gap-3">
                                  <Slider
                                    value={[competitorUtilization]}
                                    onValueChange={([val]) => setCompetitorUtilization(val)}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="flex-1"
                                    data-testid="slider-competitor-utilization"
                                  />
                                  <span className="text-[16px] font-mono w-12 text-right">{competitorUtilization}%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[14px] text-[#6B7280] mb-2">Time Saved per Encounter (min)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={rawInputValues["competitorTimeSaved"] ?? String(competitorTimeSaved)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                      setRawInputValues(prev => ({ ...prev, "competitorTimeSaved": val }));
                                      if (val !== "" && !isNaN(Number(val))) setCompetitorTimeSaved(parseFloat(val) || 0);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (rawInputValues["competitorTimeSaved"] === "" || rawInputValues["competitorTimeSaved"] === undefined) setCompetitorTimeSaved(8);
                                    setRawInputValues(prev => { const next = { ...prev }; delete next["competitorTimeSaved"]; return next; });
                                  }}
                                  className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-competitor-time-saved"
                                />
                              </div>
                            </div>
                            
                            {/* Competitor cost calculation preview */}
                            <div className="mt-4 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-[13px] text-[#6B7280]">Current Annual {selectedCompetitor.name} Cost</div>
                                  <div className="text-[20px] font-bold text-[#111827] font-mono">
                                    {formatCurrency(competitorCostPerProvider * (typeof competitorProviderCount === "number" ? competitorProviderCount : 0) * 12)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[13px] text-[#6B7280]">Current Utilization</div>
                                  <div className="text-[20px] font-bold text-[#111827] font-mono">
                                    {competitorUtilization}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Continue Button */}
                    <div className="flex justify-end pt-6 border-t border-[#E5E7EB] mt-6">
                      <Button
                        onClick={() => setCompetitorStep(2)}
                        disabled={!selectedCompetitor}
                        className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                        data-testid="button-continue-comparison"
                      >
                        Continue to Deployment Info
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Deployment Summary */}
                {competitorStep === 2 && selectedCompetitor && (
                  <div className="space-y-6">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#059669] text-white text-[12px] font-bold">1</span>
                        <span className="ml-2 text-[13px] text-[#6B7280]">Competitor</span>
                      </div>
                      <div className="h-px flex-1 bg-[#E5E7EB] mx-2" />
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E8532F] text-white text-[12px] font-bold">2</span>
                        <span className="ml-2 text-[13px] text-[#111827] font-medium">Deployment</span>
                      </div>
                      <div className="h-px flex-1 bg-[#E5E7EB] mx-2" />
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E5E7EB] text-[#9CA3AF] text-[12px] font-bold">3</span>
                        <span className="ml-2 text-[13px] text-[#9CA3AF]">Value Comparison</span>
                      </div>
                    </div>
                    
                    {/* Deployment Summary Card */}
                    <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                      <h3 className="text-[18px] font-bold text-[#111827] mb-4">
                        Confirm Your {selectedCompetitor.name} Deployment
                      </h3>
                      
                      {/* Two-column summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Current Solution */}
                        <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Scale className="h-5 w-5 text-[#6B7280]" />
                            <span className="text-[14px] font-bold text-[#111827]">Current: {selectedCompetitor.name}</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-[13px] text-[#6B7280]">Providers</span>
                              <span className="text-[14px] font-mono text-[#111827]">
                                {typeof competitorProviderCount === "number" ? competitorProviderCount : inputs.numberOfProviders}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[13px] text-[#6B7280]">Utilization</span>
                              <span className="text-[14px] font-mono text-[#111827]">{competitorUtilization}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[13px] text-[#6B7280]">Time Saved / Encounter</span>
                              <span className="text-[14px] font-mono text-[#111827]">
                                {selectedCompetitor.type === "human" ? "N/A" : `${competitorTimeSaved} min`}
                              </span>
                            </div>
                            <div className="pt-3 border-t border-[#E5E7EB]">
                              <div className="flex justify-between">
                                <span className="text-[13px] font-medium text-[#6B7280]">Annual Cost</span>
                                <span className="text-[16px] font-bold font-mono text-[#111827]">
                                  {selectedCompetitor.type === "human" 
                                    ? formatCurrency(scribeCount * scribeHourlyRate * scribeHoursPerWeek * 52 * 1.3)
                                    : formatCurrency(competitorCostPerProvider * (typeof competitorProviderCount === "number" ? competitorProviderCount : 0) * 12)
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Abridge Comparison */}
                        <div className="p-4 bg-[#E8532F]/5 border border-[#E8532F]/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <img src={abridgeLogo} alt="Abridge" className="h-5" />
                            <span className="text-[14px] font-bold text-[#E8532F]">Switch to: Abridge</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-[13px] text-[#6B7280]">Providers</span>
                              <span className="text-[14px] font-mono text-[#111827]">{typeof competitorProviderCount === "number" ? competitorProviderCount : inputs.numberOfProviders}</span>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-[13px] text-[#6B7280]">Utilization</span>
                              <div className="text-right">
                                <span className="text-[14px] font-mono text-[#111827]">65%</span>
                                <p className="text-[11px] text-[#E8532F]">Typical Abridge customer</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-start">
                              <span className="text-[13px] text-[#6B7280]">Time Saved / Encounter</span>
                              <div className="text-right">
                                <span className="text-[14px] font-mono text-[#111827]">2.5 min</span>
                                <p className="text-[11px] text-[#E8532F]">Typical Abridge customer</p>
                              </div>
                            </div>
                            <div className="pt-3 border-t border-[#E8532F]/20">
                              <div className="flex justify-between">
                                <span className="text-[13px] font-medium text-[#6B7280]">Annual Investment</span>
                                <span className="text-[16px] font-bold font-mono text-[#111827]">
                                  {formatCurrency(results.annualAbridgeCost)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Cost difference callout */}
                      {(() => {
                        const competitorCost = selectedCompetitor.type === "human"
                          ? scribeCount * scribeHourlyRate * scribeHoursPerWeek * 52 * 1.3
                          : competitorCostPerProvider * (typeof competitorProviderCount === "number" ? competitorProviderCount : 0) * 12;
                        const costDiff = competitorCost - results.annualAbridgeCost;
                        if (Math.abs(costDiff) > 0) {
                          return (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${costDiff > 0 ? "bg-[#059669]/10" : "bg-[#DC2626]/10"}`}>
                              {costDiff > 0 ? (
                                <TrendingUp className="h-4 w-4 text-[#059669]" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                              )}
                              <span className={`text-[13px] font-medium ${costDiff > 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                {costDiff > 0 
                                  ? `Abridge costs ${formatCurrency(costDiff)} less per year`
                                  : `Abridge costs ${formatCurrency(Math.abs(costDiff))} more per year`
                                }
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    
                    {/* What's Next Box */}
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-4 w-4 text-[#6B7280] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[14px] font-medium text-[#111827] mb-1">What's Next</p>
                          <p className="text-[13px] text-[#6B7280]">
                            In the next step, you'll compare value drivers side-by-side. Enter what {selectedCompetitor.name} delivers per provider, 
                            and we'll show how Abridge compares based on data from 200+ health system deployments.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
                      <Button
                        variant="outline"
                        onClick={() => setCompetitorStep(1)}
                        data-testid="button-back-to-selection"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button
                        onClick={() => setCompetitorStep(3)}
                        className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                        data-testid="button-continue-to-value"
                      >
                        Continue to Value Comparison
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Value Driver Comparison - "Apples to Apples" */}
                {competitorStep === 3 && selectedCompetitor && (
                  <div className="space-y-6">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#059669] text-white text-[12px] font-bold">1</span>
                        <span className="ml-2 text-[13px] text-[#6B7280]">Competitor</span>
                      </div>
                      <div className="h-px flex-1 bg-[#E5E7EB] mx-2" />
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#059669] text-white text-[12px] font-bold">2</span>
                        <span className="ml-2 text-[13px] text-[#6B7280]">Deployment</span>
                      </div>
                      <div className="h-px flex-1 bg-[#E5E7EB] mx-2" />
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#E8532F] text-white text-[12px] font-bold">3</span>
                        <span className="ml-2 text-[13px] text-[#111827] font-medium">Value Comparison</span>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                      <h3 className="text-[18px] font-bold text-[#111827] mb-2">
                        Compare Value Drivers
                      </h3>
                      <p className="text-[14px] text-[#6B7280] mb-6">
                        Enter what {selectedCompetitor.name} delivers <strong>per provider</strong>. We'll compare to Abridge benchmarks from 200+ health system deployments.
                      </p>
                      
                      {/* Driver Comparison Cards */}
                      <div className="space-y-4">
                        {/* Patient Access Card */}
                        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                          <button
                            onClick={() => setCompDriverInputs(prev => ({
                              ...prev,
                              access: { ...prev.access, expanded: !prev.access.expanded }
                            }))}
                            className="w-full p-4 bg-[#F9FAFB] flex items-center justify-between text-left hover:bg-[#F3F4F6] transition-colors"
                            data-testid="button-expand-access"
                          >
                            <div className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-[#6B7280]" />
                              <div>
                                <div className="text-[14px] font-bold text-[#111827]">Patient Access</div>
                                <p className="text-[12px] text-[#6B7280]">Additional visits enabled by time savings</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {totalComparison.access.deltaTotal > 0 && (
                                <span className="text-[14px] font-bold text-[#059669] font-mono">
                                  +{formatCurrency(totalComparison.access.deltaTotal)}
                                </span>
                              )}
                              <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${compDriverInputs.access.expanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          
                          {compDriverInputs.access.expanded && (
                            <div className="p-4 border-t border-[#E5E7EB] space-y-4">
                              {/* Skip Checkbox */}
                              <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-skip-access">
                                <input
                                  type="checkbox"
                                  checked={compDriverInputs.access.skipped}
                                  onChange={(e) => setCompDriverInputs(prev => ({
                                    ...prev,
                                    access: { ...prev.access, skipped: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#E8532F] focus:ring-[#E8532F]"
                                />
                                <span className="text-[13px] text-[#6B7280]">{selectedCompetitor.name} doesn't track this metric</span>
                              </label>
                              
                              {compDriverInputs.access.skipped ? (
                                <div className="p-3 bg-[#F9FAFB] rounded-lg text-center">
                                  <p className="text-[13px] text-[#6B7280]">This driver will be excluded from the comparison.</p>
                                </div>
                              ) : (
                              <>
                              {/* User Input */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">
                                    {selectedCompetitor.name}: Additional visits/provider/year
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_access_visits"] ?? (compDriverInputs.access.visitsPerProvider || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_access_visits": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          access: { ...prev.access, visitsPerProvider: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_access_visits"]; return next; })}
                                    placeholder="e.g., 60"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-access-visits"
                                  />
                                  <p className="text-[11px] text-[#9CA3AF] mt-1">If unknown, try 0-60 visits/provider</p>
                                </div>
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">Revenue per visit ($)</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_access_rate"] ?? (compDriverInputs.access.revenuePerVisit || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_access_rate": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          access: { ...prev.access, revenuePerVisit: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_access_rate"]; return next; })}
                                    placeholder="200"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-access-rate"
                                  />
                                </div>
                              </div>
                              
                              {/* Benchmark Range Visual */}
                              <div className="p-3 bg-[#F9FAFB] rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[12px] font-medium text-[#6B7280]">Abridge Benchmark Range</span>
                                  <span className="text-[12px] text-[#6B7280]">{ABRIDGE_BENCHMARKS.access.unit}</span>
                                </div>
                                <div className="relative h-8 bg-gradient-to-r from-[#E5E7EB] via-[#059669]/30 to-[#059669]/60 rounded-full">
                                  {/* Conservative marker */}
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "0%" }}>
                                    <div className="h-full w-px bg-[#6B7280]/50" />
                                    <span className="text-[10px] text-[#6B7280] mt-1">{ABRIDGE_BENCHMARKS.access.conservative}</span>
                                  </div>
                                  {/* Typical marker */}
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "50%" }}>
                                    <div className="h-full w-0.5 bg-[#059669]" />
                                    <span className="text-[10px] font-bold text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.access.typical}</span>
                                  </div>
                                  {/* Optimistic marker */}
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "100%", transform: "translateX(-100%)" }}>
                                    <div className="h-full w-px bg-[#059669]" />
                                    <span className="text-[10px] text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.access.optimistic}</span>
                                  </div>
                                  {/* User value marker */}
                                  {compDriverInputs.access.visitsPerProvider > 0 && (
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#111827] border-2 border-white shadow-md"
                                      style={{ left: `${Math.min(100, (compDriverInputs.access.visitsPerProvider / ABRIDGE_BENCHMARKS.access.optimistic) * 100)}%`, transform: "translate(-50%, -50%)" }}
                                    />
                                  )}
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-[#6B7280]">Conservative</span>
                                  <span className="text-[10px] text-[#6B7280]">Optimistic</span>
                                </div>
                              </div>
                              
                              {/* Comparison Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                  <thead>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <th className="text-left py-2 text-[#6B7280] font-medium"></th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Per Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Value/Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Total ({totalComparison.access.providers} prov)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <td className="py-2 text-[#111827]">{selectedCompetitor.name}</td>
                                      <td className="py-2 text-right font-mono">{totalComparison.access.userMetric} visits</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.access.userValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.access.userTotal)}</td>
                                    </tr>
                                    <tr className="border-b border-[#E5E7EB] bg-[#E8532F]/5">
                                      <td className="py-2 text-[#E8532F] font-medium">Abridge (typical)</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{totalComparison.access.abridgeMetric} visits</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.access.abridgeValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.access.abridgeTotal)}</td>
                                    </tr>
                                    <tr className="bg-[#059669]/5">
                                      <td className="py-2 text-[#059669] font-bold">Delta</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{totalComparison.access.deltaMetric} visits</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.access.deltaValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.access.deltaTotal)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Insight Box */}
                              {totalComparison.access.deltaTotal > 0 && (
                                <div className="p-3 bg-[#059669]/10 border border-[#059669]/20 rounded-lg flex items-start gap-2">
                                  <Zap className="h-4 w-4 text-[#059669] mt-0.5 shrink-0" />
                                  <p className="text-[13px] text-[#059669]">
                                    Switching to Abridge could unlock <strong>{formatCurrency(totalComparison.access.deltaTotal)}</strong> in additional patient access value annually.
                                  </p>
                                </div>
                              )}
                              </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Level of Service (wRVU) Card */}
                        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                          <button
                            onClick={() => setCompDriverInputs(prev => ({
                              ...prev,
                              los: { ...prev.los, expanded: !prev.los.expanded }
                            }))}
                            className="w-full p-4 bg-[#F9FAFB] flex items-center justify-between text-left hover:bg-[#F3F4F6] transition-colors"
                            data-testid="button-expand-los"
                          >
                            <div className="flex items-center gap-3">
                              <TrendingUp className="h-5 w-5 text-[#6B7280]" />
                              <div>
                                <div className="text-[14px] font-bold text-[#111827]">Accurate Level of Service</div>
                                <p className="text-[12px] text-[#6B7280]">wRVU capture from better documentation</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {totalComparison.los.deltaTotal > 0 && (
                                <span className="text-[14px] font-bold text-[#059669] font-mono">
                                  +{formatCurrency(totalComparison.los.deltaTotal)}
                                </span>
                              )}
                              <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${compDriverInputs.los.expanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          
                          {compDriverInputs.los.expanded && (
                            <div className="p-4 border-t border-[#E5E7EB] space-y-4">
                              {/* Skip Checkbox */}
                              <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-skip-los">
                                <input
                                  type="checkbox"
                                  checked={compDriverInputs.los.skipped}
                                  onChange={(e) => setCompDriverInputs(prev => ({
                                    ...prev,
                                    los: { ...prev.los, skipped: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#E8532F] focus:ring-[#E8532F]"
                                />
                                <span className="text-[13px] text-[#6B7280]">{selectedCompetitor.name} doesn't track this metric</span>
                              </label>
                              
                              {compDriverInputs.los.skipped ? (
                                <div className="p-3 bg-[#F9FAFB] rounded-lg text-center">
                                  <p className="text-[13px] text-[#6B7280]">This driver will be excluded from the comparison.</p>
                                </div>
                              ) : (
                              <>
                              {/* User Input */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">
                                    {selectedCompetitor.name}: wRVU uplift/provider/year
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_los_wrvu"] ?? (compDriverInputs.los.wrvuUpliftPerProvider || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_los_wrvu": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          los: { ...prev.los, wrvuUpliftPerProvider: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_los_wrvu"]; return next; })}
                                    placeholder="e.g., 50"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-los-wrvu"
                                  />
                                  <p className="text-[11px] text-[#9CA3AF] mt-1">If unknown, try 0-50 wRVUs/provider</p>
                                </div>
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">Your wRVU Rate ($/wRVU)</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_los_rate"] ?? (compDriverInputs.los.wrvuRate || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_los_rate": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          los: { ...prev.los, wrvuRate: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_los_rate"]; return next; })}
                                    placeholder="40"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-los-rate"
                                  />
                                </div>
                              </div>
                              
                              {/* Benchmark Range Visual */}
                              <div className="p-3 bg-[#F9FAFB] rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[12px] font-medium text-[#6B7280]">Abridge Benchmark Range</span>
                                  <span className="text-[12px] text-[#6B7280]">{ABRIDGE_BENCHMARKS.los.unit}</span>
                                </div>
                                <div className="relative h-8 bg-gradient-to-r from-[#E5E7EB] via-[#059669]/30 to-[#059669]/60 rounded-full">
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "0%" }}>
                                    <div className="h-full w-px bg-[#6B7280]/50" />
                                    <span className="text-[10px] text-[#6B7280] mt-1">{ABRIDGE_BENCHMARKS.los.conservative}</span>
                                  </div>
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "50%" }}>
                                    <div className="h-full w-0.5 bg-[#059669]" />
                                    <span className="text-[10px] font-bold text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.los.typical}</span>
                                  </div>
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "100%", transform: "translateX(-100%)" }}>
                                    <div className="h-full w-px bg-[#059669]" />
                                    <span className="text-[10px] text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.los.optimistic}</span>
                                  </div>
                                  {compDriverInputs.los.wrvuUpliftPerProvider > 0 && (
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#111827] border-2 border-white shadow-md"
                                      style={{ left: `${Math.min(100, (compDriverInputs.los.wrvuUpliftPerProvider / ABRIDGE_BENCHMARKS.los.optimistic) * 100)}%`, transform: "translate(-50%, -50%)" }}
                                    />
                                  )}
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-[#6B7280]">Conservative</span>
                                  <span className="text-[10px] text-[#6B7280]">Optimistic</span>
                                </div>
                              </div>
                              
                              {/* Comparison Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                  <thead>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <th className="text-left py-2 text-[#6B7280] font-medium"></th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Per Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Value/Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Total ({totalComparison.los.providers} prov)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <td className="py-2 text-[#111827]">{selectedCompetitor.name}</td>
                                      <td className="py-2 text-right font-mono">{totalComparison.los.userMetric} wRVUs</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.los.userValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.los.userTotal)}</td>
                                    </tr>
                                    <tr className="border-b border-[#E5E7EB] bg-[#E8532F]/5">
                                      <td className="py-2 text-[#E8532F] font-medium">Abridge (typical)</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{totalComparison.los.abridgeMetric} wRVUs</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.los.abridgeValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.los.abridgeTotal)}</td>
                                    </tr>
                                    <tr className="bg-[#059669]/5">
                                      <td className="py-2 text-[#059669] font-bold">Delta</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{totalComparison.los.deltaMetric} wRVUs</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.los.deltaValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.los.deltaTotal)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Insight Box */}
                              {totalComparison.los.deltaTotal > 0 && (
                                <div className="p-3 bg-[#059669]/10 border border-[#059669]/20 rounded-lg flex items-start gap-2">
                                  <Zap className="h-4 w-4 text-[#059669] mt-0.5 shrink-0" />
                                  <p className="text-[13px] text-[#059669]">
                                    Abridge's more complete documentation could capture <strong>{formatCurrency(totalComparison.los.deltaTotal)}</strong> in additional wRVU revenue.
                                  </p>
                                </div>
                              )}
                              </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Overtime Savings Card */}
                        <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                          <button
                            onClick={() => setCompDriverInputs(prev => ({
                              ...prev,
                              overtime: { ...prev.overtime, expanded: !prev.overtime.expanded }
                            }))}
                            className="w-full p-4 bg-[#F9FAFB] flex items-center justify-between text-left hover:bg-[#F3F4F6] transition-colors"
                            data-testid="button-expand-overtime"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-[#6B7280]" />
                              <div>
                                <div className="text-[14px] font-bold text-[#111827]">Overtime & Locum Savings</div>
                                <p className="text-[12px] text-[#6B7280]">Reduced premium labor hours</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {totalComparison.overtime.deltaTotal > 0 && (
                                <span className="text-[14px] font-bold text-[#059669] font-mono">
                                  +{formatCurrency(totalComparison.overtime.deltaTotal)}
                                </span>
                              )}
                              <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${compDriverInputs.overtime.expanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          
                          {compDriverInputs.overtime.expanded && (
                            <div className="p-4 border-t border-[#E5E7EB] space-y-4">
                              {/* Skip Checkbox */}
                              <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-skip-overtime">
                                <input
                                  type="checkbox"
                                  checked={compDriverInputs.overtime.skipped}
                                  onChange={(e) => setCompDriverInputs(prev => ({
                                    ...prev,
                                    overtime: { ...prev.overtime, skipped: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#E8532F] focus:ring-[#E8532F]"
                                />
                                <span className="text-[13px] text-[#6B7280]">{selectedCompetitor.name} doesn't track this metric</span>
                              </label>
                              
                              {compDriverInputs.overtime.skipped ? (
                                <div className="p-3 bg-[#F9FAFB] rounded-lg text-center">
                                  <p className="text-[13px] text-[#6B7280]">This driver will be excluded from the comparison.</p>
                                </div>
                              ) : (
                              <>
                              {/* User Input */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">
                                    {selectedCompetitor.name}: Hours saved/provider/year
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_ot_hours"] ?? (compDriverInputs.overtime.hoursPerProvider || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_ot_hours": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          overtime: { ...prev.overtime, hoursPerProvider: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_ot_hours"]; return next; })}
                                    placeholder="e.g., 35"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-ot-hours"
                                  />
                                  <p className="text-[11px] text-[#9CA3AF] mt-1">If unknown, try 0-35 hours/provider</p>
                                </div>
                                <div>
                                  <label className="block text-[13px] text-[#6B7280] mb-1">Premium Rate ($/hour)</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={rawInputValues["comp_ot_rate"] ?? (compDriverInputs.overtime.premiumRate || "")}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "" || /^[0-9]*$/.test(val)) {
                                        setRawInputValues(prev => ({ ...prev, "comp_ot_rate": val }));
                                        setCompDriverInputs(prev => ({
                                          ...prev,
                                          overtime: { ...prev.overtime, premiumRate: parseInt(val) || 0 }
                                        }));
                                      }
                                    }}
                                    onBlur={() => setRawInputValues(prev => { const next = { ...prev }; delete next["comp_ot_rate"]; return next; })}
                                    placeholder="145"
                                    className="w-full h-10 px-3 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                    data-testid="input-comp-ot-rate"
                                  />
                                </div>
                              </div>
                              
                              {/* Benchmark Range Visual */}
                              <div className="p-3 bg-[#F9FAFB] rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[12px] font-medium text-[#6B7280]">Abridge Benchmark Range</span>
                                  <span className="text-[12px] text-[#6B7280]">{ABRIDGE_BENCHMARKS.overtime.unit}</span>
                                </div>
                                <div className="relative h-8 bg-gradient-to-r from-[#E5E7EB] via-[#059669]/30 to-[#059669]/60 rounded-full">
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "0%" }}>
                                    <div className="h-full w-px bg-[#6B7280]/50" />
                                    <span className="text-[10px] text-[#6B7280] mt-1">{ABRIDGE_BENCHMARKS.overtime.conservative}</span>
                                  </div>
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "50%" }}>
                                    <div className="h-full w-0.5 bg-[#059669]" />
                                    <span className="text-[10px] font-bold text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.overtime.typical}</span>
                                  </div>
                                  <div className="absolute top-0 h-full flex flex-col items-center" style={{ left: "100%", transform: "translateX(-100%)" }}>
                                    <div className="h-full w-px bg-[#059669]" />
                                    <span className="text-[10px] text-[#059669] mt-1">{ABRIDGE_BENCHMARKS.overtime.optimistic}</span>
                                  </div>
                                  {compDriverInputs.overtime.hoursPerProvider > 0 && (
                                    <div 
                                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#111827] border-2 border-white shadow-md"
                                      style={{ left: `${Math.min(100, (compDriverInputs.overtime.hoursPerProvider / ABRIDGE_BENCHMARKS.overtime.optimistic) * 100)}%`, transform: "translate(-50%, -50%)" }}
                                    />
                                  )}
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[10px] text-[#6B7280]">Conservative</span>
                                  <span className="text-[10px] text-[#6B7280]">Optimistic</span>
                                </div>
                              </div>
                              
                              {/* Comparison Table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-[13px]">
                                  <thead>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <th className="text-left py-2 text-[#6B7280] font-medium"></th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Per Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Value/Provider</th>
                                      <th className="text-right py-2 text-[#6B7280] font-medium">Total ({totalComparison.overtime.providers} prov)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b border-[#E5E7EB]">
                                      <td className="py-2 text-[#111827]">{selectedCompetitor.name}</td>
                                      <td className="py-2 text-right font-mono">{totalComparison.overtime.userMetric} hrs</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.overtime.userValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono">{formatCurrency(totalComparison.overtime.userTotal)}</td>
                                    </tr>
                                    <tr className="border-b border-[#E5E7EB] bg-[#E8532F]/5">
                                      <td className="py-2 text-[#E8532F] font-medium">Abridge (typical)</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{totalComparison.overtime.abridgeMetric} hrs</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.overtime.abridgeValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#E8532F]">{formatCurrency(totalComparison.overtime.abridgeTotal)}</td>
                                    </tr>
                                    <tr className="bg-[#059669]/5">
                                      <td className="py-2 text-[#059669] font-bold">Delta</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{totalComparison.overtime.deltaMetric} hrs</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.overtime.deltaValuePerProvider)}</td>
                                      <td className="py-2 text-right font-mono text-[#059669] font-bold">+{formatCurrency(totalComparison.overtime.deltaTotal)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Insight Box */}
                              {totalComparison.overtime.deltaTotal > 0 && (
                                <div className="p-3 bg-[#059669]/10 border border-[#059669]/20 rounded-lg flex items-start gap-2">
                                  <Zap className="h-4 w-4 text-[#059669] mt-0.5 shrink-0" />
                                  <p className="text-[13px] text-[#059669]">
                                    Faster documentation with Abridge could save <strong>{formatCurrency(totalComparison.overtime.deltaTotal)}</strong> in overtime and locum costs.
                                  </p>
                                </div>
                              )}
                              </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Final Summary */}
                    <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                      <h3 className="text-[18px] font-bold text-[#111827] mb-4">
                        Total Opportunity
                      </h3>
                      
                      {/* Hero Metric */}
                      <div className="text-center p-6 bg-[#059669]/10 border border-[#059669]/20 rounded-lg mb-6">
                        <div className="text-[14px] text-[#059669] mb-1">Additional Annual Value with Abridge</div>
                        <div className="text-[48px] font-bold text-[#059669] font-mono">
                          {totalComparison.grandTotal > 0 ? "+" : ""}{formatCurrency(totalComparison.grandTotal)}
                        </div>
                        <p className="text-[13px] text-[#6B7280] mt-2">
                          Based on {typeof competitorProviderCount === "number" ? competitorProviderCount : inputs.numberOfProviders} providers switching from {selectedCompetitor.name}
                        </p>
                      </div>
                      
                      {/* Breakdown Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-[#E5E7EB]">
                              <th className="text-left py-2 text-[#6B7280] font-medium">Value Driver</th>
                              <th className="text-right py-2 text-[#6B7280] font-medium">{selectedCompetitor.name}</th>
                              <th className="text-right py-2 text-[#E8532F] font-medium">Abridge</th>
                              <th className="text-right py-2 text-[#059669] font-medium">Delta</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className={`border-b border-[#E5E7EB] ${compDriverInputs.access.skipped ? "opacity-50" : ""}`}>
                              <td className="py-2 text-[#111827]">
                                Patient Access
                                {compDriverInputs.access.skipped && <span className="ml-2 text-[11px] text-[#9CA3AF]">(Skipped)</span>}
                              </td>
                              <td className="py-2 text-right font-mono">{compDriverInputs.access.skipped ? "—" : formatCurrency(totalComparison.access.userTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#E8532F]">{compDriverInputs.access.skipped ? "—" : formatCurrency(totalComparison.access.abridgeTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#059669] font-bold">{compDriverInputs.access.skipped ? "—" : `+${formatCurrency(totalComparison.access.deltaTotal)}`}</td>
                            </tr>
                            <tr className={`border-b border-[#E5E7EB] ${compDriverInputs.los.skipped ? "opacity-50" : ""}`}>
                              <td className="py-2 text-[#111827]">
                                Level of Service
                                {compDriverInputs.los.skipped && <span className="ml-2 text-[11px] text-[#9CA3AF]">(Skipped)</span>}
                              </td>
                              <td className="py-2 text-right font-mono">{compDriverInputs.los.skipped ? "—" : formatCurrency(totalComparison.los.userTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#E8532F]">{compDriverInputs.los.skipped ? "—" : formatCurrency(totalComparison.los.abridgeTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#059669] font-bold">{compDriverInputs.los.skipped ? "—" : `+${formatCurrency(totalComparison.los.deltaTotal)}`}</td>
                            </tr>
                            <tr className={`border-b border-[#E5E7EB] ${compDriverInputs.overtime.skipped ? "opacity-50" : ""}`}>
                              <td className="py-2 text-[#111827]">
                                Overtime Savings
                                {compDriverInputs.overtime.skipped && <span className="ml-2 text-[11px] text-[#9CA3AF]">(Skipped)</span>}
                              </td>
                              <td className="py-2 text-right font-mono">{compDriverInputs.overtime.skipped ? "—" : formatCurrency(totalComparison.overtime.userTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#E8532F]">{compDriverInputs.overtime.skipped ? "—" : formatCurrency(totalComparison.overtime.abridgeTotal)}</td>
                              <td className="py-2 text-right font-mono text-[#059669] font-bold">{compDriverInputs.overtime.skipped ? "—" : `+${formatCurrency(totalComparison.overtime.deltaTotal)}`}</td>
                            </tr>
                            <tr className="bg-[#F9FAFB]">
                              <td className="py-3 font-bold text-[#111827]">Total</td>
                              <td className="py-3 text-right font-mono font-bold">
                                {formatCurrency(
                                  (compDriverInputs.access.skipped ? 0 : totalComparison.access.userTotal) + 
                                  (compDriverInputs.los.skipped ? 0 : totalComparison.los.userTotal) + 
                                  (compDriverInputs.overtime.skipped ? 0 : totalComparison.overtime.userTotal)
                                )}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-[#E8532F]">
                                {formatCurrency(
                                  (compDriverInputs.access.skipped ? 0 : totalComparison.access.abridgeTotal) + 
                                  (compDriverInputs.los.skipped ? 0 : totalComparison.los.abridgeTotal) + 
                                  (compDriverInputs.overtime.skipped ? 0 : totalComparison.overtime.abridgeTotal)
                                )}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-[#059669]">
                                +{formatCurrency(totalComparison.grandTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* How We Calculated This - Confidence Section */}
                      <div className="mt-6 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-[#6B7280] mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-[14px] font-bold text-[#111827] mb-2">How We Calculated This</h4>
                            <div className="space-y-2 text-[13px] text-[#6B7280]">
                              <p>
                                <strong>Abridge benchmarks</strong> are derived from 200+ health system deployments across diverse specialties and care settings.
                              </p>
                              <p>
                                <strong>Your inputs</strong> ({[
                                  !compDriverInputs.access.skipped && "Patient Access",
                                  !compDriverInputs.los.skipped && "Level of Service", 
                                  !compDriverInputs.overtime.skipped && "Overtime"
                                ].filter(Boolean).join(", ") || "None"}) were compared against Abridge's typical performance.
                              </p>
                              {(compDriverInputs.access.skipped || compDriverInputs.los.skipped || compDriverInputs.overtime.skipped) && (
                                <p>
                                  <strong>Skipped drivers</strong> ({[
                                    compDriverInputs.access.skipped && "Patient Access",
                                    compDriverInputs.los.skipped && "Level of Service",
                                    compDriverInputs.overtime.skipped && "Overtime"
                                  ].filter(Boolean).join(", ")}) were excluded because your current vendor doesn't track these metrics.
                                </p>
                              )}
                              <p className="text-[12px] text-[#9CA3AF] mt-2">
                                Actual results vary by organization size, specialty mix, and implementation maturity.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Scenario Name Input */}
                    <div>
                      <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                        Scenario Name
                      </label>
                      <input
                        type="text"
                        value={competitorScenarioName}
                        onChange={(e) => setCompetitorScenarioName(e.target.value)}
                        placeholder={`Switch from ${selectedCompetitor.name} to Abridge`}
                        className="w-full max-w-md h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] text-[#111827] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                        data-testid="input-competitor-scenario-name"
                      />
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
                      <Button
                        variant="outline"
                        onClick={() => setCompetitorStep(2)}
                        data-testid="button-back-to-deployment"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowCompetitorComparison(false)}
                          data-testid="button-cancel-competitor"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const newScenario: Scenario = {
                              id: `competitor-${Date.now()}`,
                              name: competitorScenarioName || `Switch from ${selectedCompetitor.name}`,
                              type: "expand",
                              createdAt: new Date(),
                              providers: inputs.numberOfProviders,
                              encounters: inputs.annualOutpatientEncounters,
                              utilizationRate: inputs.abridgeUtilizationPct,
                              maPopulationPct: inputs.hcc.pctMedicareAdvantage,
                              newPatientPct: 20,
                              specialtyPct: 100,
                              revenuePerVisitOverride: null,
                              visitLengthOverride: null,
                              investment: results.annualAbridgeCost,
                              totalBenefit: totalComparison.access.abridgeTotal + totalComparison.los.abridgeTotal + totalComparison.overtime.abridgeTotal,
                              netGain: totalComparison.grandTotal,
                              roiMultiple: results.roiMultiple,
                              driverValues: Object.fromEntries(results.levers.map(l => [l.id, l.value])) as Record<LeverId, number>,
                            };
                            setScenarios([...scenarios, newScenario]);
                            setShowCompetitorComparison(false);
                            setCompetitorStep(1);
                            toast({
                              title: "Scenario created",
                              description: `"${newScenario.name}" has been added to your scenarios.`,
                            });
                          }}
                          className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                          data-testid="button-save-competitor-scenario"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Save as Scenario
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
            <>
            {/* Header */}
            <div>
              <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                Scenario Builder
              </h2>
              <p className="text-[16px] text-[#6B7280]">
                Model expansion opportunities and see the financial impact
              </p>
              
              {/* Info box */}
              <div className="mt-4 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-[#6B7280] mt-0.5 shrink-0" />
                <p className="text-[14px] text-[#6B7280]">
                  Use scenarios to explore "what if" questions without changing your baseline model. Compare options side-by-side.
                </p>
              </div>
            </div>

            {/* YOUR CURRENT MODEL (Baseline Card) */}
            <div>
              <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                Your Current Model
              </h3>
              
              <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                {/* Care setting + baseline badge */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-[#059669]" />
                    <span className="text-[18px] font-bold text-[#111827]">{careSettingLabel}</span>
                  </div>
                  <span className="px-2 py-1 bg-[#F3F4F6] text-[12px] font-medium text-[#6B7280] uppercase rounded">
                    Baseline
                  </span>
                </div>
                
                {/* Divider */}
                <div className="border-t border-[#E5E7EB] my-4" />
                
                {/* Deployment section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">Deployment</span>
                  </div>
                  <p className="text-[14px] text-[#111827]">
                    {inputs.numberOfProviders} providers
                    <span className="mx-2 text-[#E5E7EB]">|</span>
                    {inputs.annualOutpatientEncounters.toLocaleString()} encounters
                    <span className="mx-2 text-[#E5E7EB]">|</span>
                    {inputs.abridgeUtilizationPct}% utilization
                  </p>
                </div>
                
                {/* Value Drivers section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-[0.05em]">Value Drivers</span>
                  </div>
                  <p className="text-[14px] text-[#111827]">
                    {enabledDriverIds.map((id, idx) => (
                      <span key={id}>
                        {leverLabels[id]}
                        {idx < enabledDriverIds.length - 1 && <span className="mx-2">•</span>}
                      </span>
                    ))}
                  </p>
                </div>
                
                {/* Divider */}
                <div className="border-t border-[#E5E7EB] my-4" />
                
                {/* Results */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#6B7280]">Net Annual Gain</span>
                    <span className="text-[18px] font-bold text-[#059669] tabular-nums">{formatCurrency(netAnnualGain)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#6B7280]">Return on Investment</span>
                    <span className="text-[18px] font-bold text-[#111827] tabular-nums">{roiMultiple.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#6B7280]">3-Year Total Value</span>
                    <span className="text-[18px] font-bold text-[#111827] tabular-nums">{formatCurrency(netAnnualGain * 3)}</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-[#E5E7EB] my-4" />
                
                {/* View Full Breakdown link */}
                <button
                  onClick={() => setActiveTab("summary")}
                  className="flex items-center gap-1 text-[14px] text-[#E8532F] hover:underline"
                  data-testid="link-view-breakdown"
                >
                  View Full Breakdown
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* BUILD AN EXPANSION SCENARIO */}
            <div className="mt-12">
              <h3 className="text-[16px] font-bold text-[#111827] mb-1">
                Build an Expansion Scenario
              </h3>
              <p className="text-[14px] text-[#6B7280] mb-6">
                What would you like to model?
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Expand Providers Card */}
                <div
                  className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center"
                  data-testid="card-expand-providers"
                >
                  <TrendingUp className="h-8 w-8 text-[#6B7280] mx-auto mb-4" />
                  <h4 className="text-[16px] font-bold text-[#111827] mb-4">Expand Providers</h4>
                  <div className="border-t border-[#E5E7EB] my-4" />
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Add more users to your current deployment
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        initScenarioForm();
                        setCurrentScenarioType("expand");
                        setExpandProvidersMode("quick");
                        setEncounterScalingMode("proportional");
                        setShowExpandProviders(true);
                      }}
                      className="w-full py-2 px-3 text-[13px] border border-[#E5E7EB] rounded-lg hover:border-[#E8532F] hover:bg-[#FEF2F0] transition-colors"
                      data-testid="button-quick-expansion"
                    >
                      Quick Calculator
                    </button>
                    <button
                      onClick={() => {
                        setShowExpansionWizard(true);
                      }}
                      className="w-full py-2 px-3 text-[13px] bg-[#E8532F] text-white rounded-lg hover:bg-[#D14729] transition-colors flex items-center justify-center gap-2"
                      data-testid="button-full-wizard"
                    >
                      <Zap className="h-4 w-4" />
                      Full Wizard
                    </button>
                  </div>
                </div>
                
                {/* Add Strategic Drivers Card */}
                <button
                  onClick={() => {
                    setScenarioDriverSelections(new Set());
                    setExpandedDriverMethodology(null);
                    setDriversScenarioName("");
                    setCurrentScenarioType("drivers");
                    setShowAddDrivers(true);
                  }}
                  className="group bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                  data-testid="card-add-drivers"
                >
                  <Target className="h-8 w-8 text-[#6B7280] mx-auto mb-4" />
                  <h4 className="text-[16px] font-bold text-[#111827] mb-4">Add Strategic Drivers</h4>
                  <div className="border-t border-[#E5E7EB] my-4" />
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Enable new value streams without adding users
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] text-[#E8532F] group-hover:underline">
                    Start <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
                
                {/* New Care Setting Card */}
                <button
                  onClick={() => {
                    setSelectedNewCareSetting(null);
                    setCareSettingScenarioName("");
                    setCareSettingConfig({
                      providers: 20,
                      encountersPerProvider: 5000,
                      customEncounters: 100000,
                      encounterMode: "calculated",
                      utilizationRate: 70,
                    });
                    setCareSettingDrivers(new Set<LeverId>(["patientAccess", "wrvu", "denials"]));
                    setExpandedCareSettingDriver(null);
                    setShowNewCareSetting(true);
                  }}
                  className="group bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                  data-testid="card-new-setting"
                >
                  <Building2 className="h-8 w-8 text-[#6B7280] mx-auto mb-4" />
                  <h4 className="text-[16px] font-bold text-[#111827] mb-4">New Care Setting</h4>
                  <div className="border-t border-[#E5E7EB] my-4" />
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Deploy in ED, Nursing, or Inpatient
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] text-[#E8532F] group-hover:underline">
                    Start <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
                
                {/* Competitor Comparison Card */}
                <button
                  onClick={() => {
                    setSelectedCompetitor(null);
                    setCompetitorStep(1);
                    setCompetitorScenarioName("");
                    setCompetitorDrivers({
                      patientAccess: { enabled: false, value: 0, metric: "visits" },
                      accurateService: { enabled: false, wrvuUplift: 0, wrvuRate: 40 },
                      clinicianRetention: { enabled: false, departuresPrevented: 0, replacementCost: 250000 },
                      overtimeSavings: { enabled: false, hoursReduced: 0, premiumRate: 145 },
                      denialReduction: { enabled: false, denialsPrevented: 0, avgDenialValue: 500 },
                    });
                    setCompetitorProviderCount(inputs.numberOfProviders);
                    setShowCompetitorComparison(true);
                  }}
                  className="group bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                  data-testid="card-competitor-comparison"
                >
                  <GitCompareArrows className="h-8 w-8 text-[#6B7280] mx-auto mb-4" />
                  <h4 className="text-[16px] font-bold text-[#111827] mb-4">Competitor Comparison</h4>
                  <div className="border-t border-[#E5E7EB] my-4" />
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Compare ROI vs. current solution
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] text-[#E8532F] group-hover:underline">
                    Start <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Coming Soon Modal */}
            <Dialog open={scenarioTypeModal !== null} onOpenChange={(open) => !open && setScenarioTypeModal(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {scenarioTypeModal === "drivers" ? "Add Strategic Drivers" : "New Care Setting"}
                  </DialogTitle>
                  <DialogDescription>
                    This feature is coming soon. For now, you can use "Expand Providers" to model different deployment configurations.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={() => setScenarioTypeModal(null)} data-testid="button-close-modal">
                    Got it
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* YOUR SCENARIOS */}
            <div className="mt-12">
              <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                Your Scenarios
              </h3>
              
              {/* Empty state */}
              {scenarios.length === 0 && !showScenarioForm && (
                <div className="bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-lg p-8 text-center">
                  <ClipboardList className="h-6 w-6 text-[#6B7280] mx-auto mb-3" />
                  <h4 className="text-[14px] font-semibold text-[#6B7280] mb-2">No scenarios yet</h4>
                  <p className="text-[14px] text-[#6B7280] max-w-md mx-auto">
                    Create your first scenario above to explore expansion opportunities. Scenarios let you model "what if" questions without changing your baseline model.
                  </p>
                </div>
              )}
              
              {/* Scenario Cards */}
              {scenarios.map((scenario) => {
                const ScenarioIcon = getScenarioTypeIcon(scenario.type);
                const baselineChange = netAnnualGain > 0 ? ((scenario.netGain - netAnnualGain) / netAnnualGain) * 100 : 0;
                const isSelected = selectedScenariosForCompare.has(scenario.id);
                
                return (
                  <div
                    key={scenario.id}
                    className={`bg-white border rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-4 ${
                      isSelected ? "border-[#E8532F] bg-[rgba(232,83,47,0.02)]" : "border-[#E5E7EB]"
                    }`}
                  >
                    {/* Header row with checkbox */}
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleScenarioSelection(scenario.id)}
                        className="mt-1"
                        data-testid={`checkbox-scenario-${scenario.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ScenarioIcon className="h-4 w-4 text-[#6B7280]" />
                          <span className="text-[16px] font-bold text-[#111827]">{scenario.name}</span>
                        </div>
                        <p className="text-[13px] text-[#9CA3AF]">
                          Created: {scenario.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Metrics row */}
                    <p className="text-[14px] text-[#6B7280] mb-3">
                      {scenario.providers} providers
                      <span className="mx-2 text-[#E5E7EB]">|</span>
                      {scenario.encounters.toLocaleString()} encounters
                      <span className="mx-2 text-[#E5E7EB]">|</span>
                      {scenario.utilizationRate}% utilization
                    </p>
                    
                    {/* Divider */}
                    <div className="border-t border-[#E5E7EB] my-3" />
                    
                    {/* Results row */}
                    <div className="flex items-center gap-6 mb-3">
                      <div>
                        <span className="text-[14px] text-[#6B7280]">Net Annual Gain</span>
                        <span className="ml-2 text-[18px] font-bold text-[#059669]">{formatCurrency(scenario.netGain)}</span>
                        <span className={`ml-2 text-[14px] ${baselineChange >= 0 ? "text-[#059669]" : "text-[#DC2626]"}`}>
                          {baselineChange >= 0 ? "+" : ""}{baselineChange.toFixed(0)}% vs baseline
                        </span>
                      </div>
                      <div>
                        <span className="text-[14px] text-[#6B7280]">ROI</span>
                        <span className="ml-2 text-[18px] font-bold text-[#111827]">{scenario.roiMultiple.toFixed(1)}x</span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowComparison(scenario.id)}
                        className="text-[13px] text-[#E8532F] hover:underline"
                        data-testid={`button-view-${scenario.id}`}
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          initScenarioForm(scenario);
                          setCurrentScenarioType(scenario.type);
                          setShowScenarioForm(true);
                        }}
                        className="text-[13px] text-[#6B7280] hover:underline"
                        data-testid={`button-edit-${scenario.id}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleScenarioSelection(scenario.id)}
                        className="text-[13px] text-[#6B7280] hover:underline"
                        data-testid={`button-compare-${scenario.id}`}
                      >
                        Compare
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="text-[13px] text-[#DC2626] hover:underline"
                        data-testid={`button-delete-${scenario.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Compare button section */}
              {scenarios.length >= 2 && (
                <div className="border-t border-[#E5E7EB] pt-6 mt-6">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => {
                        if (selectedScenariosForCompare.size >= 1) {
                          setShowScenarioComparison(true);
                        }
                      }}
                      disabled={selectedScenariosForCompare.size < 1}
                      className="bg-[#111827] hover:bg-[#E8532F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-compare-selected"
                    >
                      Compare Selected Scenarios
                    </Button>
                    <p className="text-[13px] text-[#6B7280]">
                      {selectedScenariosForCompare.size === 0
                        ? "Select 2-3 scenarios above to compare side-by-side"
                        : selectedScenariosForCompare.size === 1
                        ? "Select 1 more scenario to compare"
                        : `${selectedScenariosForCompare.size} scenarios selected`}
                    </p>
                  </div>
                  {selectedScenariosForCompare.size >= 3 && (
                    <p className="text-[13px] text-amber-600 mt-2">
                      Maximum 3 scenarios for comparison. Deselect one to choose another.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Comparison View (if showing) */}
            {showComparison && (() => {
              const scenario = scenarios.find((s) => s.id === showComparison);
              if (!scenario) return null;
              
              const providerChange = ((scenario.providers - inputs.numberOfProviders) / inputs.numberOfProviders) * 100;
              const encounterChange = ((scenario.encounters - inputs.annualOutpatientEncounters) / inputs.annualOutpatientEncounters) * 100;
              const benefitChange = ((scenario.totalBenefit - totalAnnualBenefit) / totalAnnualBenefit) * 100;
              
              return (
                <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                      Scenario Comparison
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComparison(null)}
                      data-testid="button-close-comparison"
                    >
                      Close
                    </Button>
                  </div>

                  {/* Side-by-side table */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Baseline Column */}
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-4">
                        Current Model (Baseline)
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-neutral-500 uppercase mb-1">Configuration</p>
                          <p className="text-sm font-medium">{inputs.numberOfProviders} providers</p>
                          <p className="text-sm font-medium">{inputs.annualOutpatientEncounters.toLocaleString()} encounters</p>
                          <p className="text-sm font-medium">{inputs.abridgeUtilizationPct}% utilization</p>
                        </div>
                        
                        <div className="border-t border-neutral-200 pt-4">
                          <p className="text-xs text-neutral-500 uppercase mb-2">Value Drivers</p>
                          <div className="space-y-2">
                            {enabledDriverIds.map((id) => (
                              <div key={id} className="flex items-center justify-between gap-2">
                                <span className="text-sm text-neutral-600">{leverLabels[id]}</span>
                                <span className="text-sm font-mono">{formatCurrency(driverValues[id])}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="border-t border-neutral-200 pt-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold">Total Benefit</span>
                            <span className="text-sm font-mono font-bold">{formatCurrency(totalAnnualBenefit)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm text-neutral-500">Investment</span>
                            <span className="text-sm font-mono text-neutral-500">{formatCurrency(annualInvestment)}/year</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200">
                            <span className="text-sm font-bold">Net Gain</span>
                            <span className="text-sm font-mono font-bold text-green-600">{formatCurrency(netAnnualGain)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-neutral-500">ROI</span>
                            <span className="text-sm font-mono font-bold">{roiMultiple.toFixed(1)}x</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scenario Column */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-4">
                        {scenario.name}
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-neutral-500 uppercase mb-1">Configuration</p>
                          <p className="text-sm font-medium">
                            {scenario.providers} providers
                            <span className={`ml-2 text-xs ${providerChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({providerChange >= 0 ? '+' : ''}{providerChange.toFixed(0)}%)
                            </span>
                          </p>
                          <p className="text-sm font-medium">
                            {scenario.encounters.toLocaleString()} encounters
                            <span className={`ml-2 text-xs ${encounterChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({encounterChange >= 0 ? '+' : ''}{encounterChange.toFixed(0)}%)
                            </span>
                          </p>
                          <p className="text-sm font-medium">{scenario.utilizationRate}% utilization</p>
                          
                          {/* Advanced inputs if used */}
                          {(scenario.maPopulationPct !== 15 || scenario.specialtyPct !== 40 || scenario.newPatientPct !== 30) && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                              {scenario.maPopulationPct !== 15 && (
                                <p className="text-xs text-blue-600">{scenario.maPopulationPct}% MA population</p>
                              )}
                              {scenario.specialtyPct !== 40 && (
                                <p className="text-xs text-blue-600">{scenario.specialtyPct}% specialty mix</p>
                              )}
                              {scenario.newPatientPct !== 30 && (
                                <p className="text-xs text-blue-600">{scenario.newPatientPct}% new patients</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="border-t border-blue-200 pt-4">
                          <p className="text-xs text-neutral-500 uppercase mb-2">Value Drivers</p>
                          <div className="space-y-2">
                            {enabledDriverIds.map((id) => {
                              const baseValue = driverValues[id];
                              const scenarioValue = scenario.driverValues[id];
                              const change = baseValue > 0 ? ((scenarioValue - baseValue) / baseValue) * 100 : 0;
                              return (
                                <div key={id} className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-neutral-600">{leverLabels[id]}</span>
                                  <span className="text-sm font-mono">
                                    {formatCurrency(scenarioValue)}
                                    <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({change >= 0 ? '+' : ''}{change.toFixed(0)}%)
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="border-t border-blue-200 pt-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold">Total Benefit</span>
                            <span className="text-sm font-mono font-bold">
                              {formatCurrency(scenario.totalBenefit)}
                              <span className={`ml-1 text-xs ${benefitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({benefitChange >= 0 ? '+' : ''}{benefitChange.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm text-neutral-500">Investment</span>
                            <span className="text-sm font-mono text-neutral-500">{formatCurrency(scenario.investment)}/year</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-200">
                            <span className="text-sm font-bold">Net Gain</span>
                            <span className="text-sm font-mono font-bold text-green-600">{formatCurrency(scenario.netGain)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-neutral-500">ROI</span>
                            <span className="text-sm font-mono font-bold">{scenario.roiMultiple.toFixed(1)}x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Insight */}
                  <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="text-sm font-bold text-amber-800 mb-2">Key Insight</h4>
                    <p className="text-sm text-amber-700">
                      Expanding to {scenario.providers} providers (from {inputs.numberOfProviders}) with {scenario.utilizationRate}% utilization generates {(scenario.totalBenefit / totalAnnualBenefit).toFixed(1)}x more value while maintaining strong ROI ({scenario.roiMultiple.toFixed(1)}x).
                      {scenario.maPopulationPct > 20 && inputs.levers.hcc && ` Higher Medicare Advantage population (${scenario.maPopulationPct}%) increases HCC Capture value.`}
                      {scenario.utilizationRate - inputs.abridgeUtilizationPct > 10 && ` Increased utilization (${scenario.utilizationRate}% vs ${inputs.abridgeUtilizationPct}%) improves value realization across all drivers.`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        initScenarioForm();
                        setCurrentScenarioType("expand");
                        setShowScenarioForm(true);
                        setShowComparison(null);
                      }}
                      data-testid="button-create-another"
                    >
                      Create Another Scenario
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Scenario Form */}
            {showScenarioForm && (
              <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-2">
                  {editingScenarioId ? "Edit Scenario" : "New Scenario"}
                </h3>

                {/* Scenario Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Scenario name
                  </label>
                  <Input
                    value={scenarioForm.name}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, name: e.target.value })}
                    placeholder="e.g., Expansion to 100 providers"
                    className="max-w-md"
                    data-testid="input-scenario-name"
                  />
                </div>

                {/* Deployment Configuration */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
                    Deployment Configuration
                  </h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Model a different configuration of your Abridge deployment. Adjust the fundamentals and optionally add specificity with advanced inputs.
                  </p>

                  <div className="space-y-6">
                    {/* Providers */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Providers in scope
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={rawInputValues["modal_providers"] ?? String(scenarioForm.providers)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^[0-9]*$/.test(val)) {
                            setRawInputValues(prev => ({ ...prev, "modal_providers": val }));
                            if (val !== "" && !isNaN(Number(val))) setScenarioForm({ ...scenarioForm, providers: parseInt(val) || 0 });
                          }
                        }}
                        onBlur={() => {
                          if (rawInputValues["modal_providers"] === "" || rawInputValues["modal_providers"] === undefined) setScenarioForm({ ...scenarioForm, providers: inputs.numberOfProviders });
                          setRawInputValues(prev => { const next = { ...prev }; delete next["modal_providers"]; return next; });
                        }}
                        placeholder="e.g., 100"
                        className="w-40"
                        data-testid="input-scenario-providers"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        Model: Expand to more departments, locations, or specialties
                      </p>
                      <p className="text-xs text-neutral-400">Currently: {inputs.numberOfProviders} providers</p>
                    </div>

                    {/* Annual Encounters */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Annual encounters
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={rawInputValues["modal_encounters"] ?? String(scenarioForm.encounters)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*$/.test(val)) {
                              setRawInputValues(prev => ({ ...prev, "modal_encounters": val }));
                              if (val !== "" && !isNaN(Number(val))) setScenarioForm({ ...scenarioForm, encounters: parseInt(val) || 0 });
                            }
                          }}
                          onBlur={() => {
                            if (rawInputValues["modal_encounters"] === "" || rawInputValues["modal_encounters"] === undefined) setScenarioForm({ ...scenarioForm, encounters: inputs.annualOutpatientEncounters });
                            setRawInputValues(prev => { const next = { ...prev }; delete next["modal_encounters"]; return next; });
                          }}
                          placeholder="e.g., 200,000"
                          className="w-48"
                          data-testid="input-scenario-encounters"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (inputs.numberOfProviders > 0) {
                              const scaledEncounters = Math.round((scenarioForm.providers / inputs.numberOfProviders) * inputs.annualOutpatientEncounters);
                              setScenarioForm({ ...scenarioForm, encounters: scaledEncounters });
                            }
                          }}
                          className="text-xs"
                          data-testid="button-calc-encounters"
                        >
                          Calculate from providers
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Scales with providers, or enter custom volume if you know it
                      </p>
                      <p className="text-xs text-neutral-400">Currently: {inputs.annualOutpatientEncounters.toLocaleString()} encounters</p>
                    </div>

                    {/* Utilization Rate */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        Utilization rate
                      </label>
                      <div className="flex items-center gap-4 max-w-md">
                        <Slider
                          value={[scenarioForm.utilizationRate]}
                          onValueChange={([val]) => setScenarioForm({ ...scenarioForm, utilizationRate: val })}
                          min={40}
                          max={90}
                          step={5}
                          className="flex-1"
                          data-testid="slider-scenario-utilization"
                        />
                        <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                          {scenarioForm.utilizationRate}%
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Higher utilization as the team becomes more familiar with Abridge
                      </p>
                      <p className="text-xs text-neutral-400">Currently: {inputs.abridgeUtilizationPct}%</p>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-6">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-3">
                    Scenario Preview
                  </h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>
                      {scenarioForm.providers} providers (was {inputs.numberOfProviders})
                    </p>
                    <p>
                      {scenarioForm.encounters.toLocaleString()} encounters (was {inputs.annualOutpatientEncounters.toLocaleString()})
                    </p>
                    <p>
                      {scenarioForm.utilizationRate}% utilization (was {inputs.abridgeUtilizationPct}%)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm font-medium text-blue-800">
                      Eligible encounters: {scenarioPreview.eligibleEncounters.toLocaleString()}
                    </p>
                    <p className={`text-sm ${scenarioPreview.changeFromBaseline >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Change from baseline: {scenarioPreview.changeFromBaseline >= 0 ? '+' : ''}{scenarioPreview.changeFromBaseline.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Advanced Section (Collapsible) */}
                <div className="border border-neutral-200 rounded-xl mb-6">
                  <button
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                    className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-neutral-50 transition-colors"
                    data-testid="button-toggle-advanced"
                  >
                    <div>
                      <span className="text-sm font-semibold text-neutral-900">
                        Advanced: Add Specificity (Optional)
                      </span>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Add organization-specific details to increase precision
                      </p>
                    </div>
                    {advancedOpen ? (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>

                  {advancedOpen && (
                    <div className="p-4 pt-0 space-y-6">
                      <p className="text-sm text-neutral-500 mb-4">
                        These inputs adjust the baseline assumptions for THIS scenario only. They don't change your current model.
                      </p>

                      {/* MA Population */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          Medicare Advantage population
                        </label>
                        <div className="flex items-center gap-4 max-w-md">
                          <Slider
                            value={[scenarioForm.maPopulationPct]}
                            onValueChange={([val]) => setScenarioForm({ ...scenarioForm, maPopulationPct: val })}
                            min={5}
                            max={50}
                            step={5}
                            className="flex-1"
                            data-testid="slider-ma-population"
                          />
                          <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                            {scenarioForm.maPopulationPct}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Percentage of patients in MA plans</p>
                        <p className="text-xs text-neutral-400">Impacts: HCC Capture driver value</p>
                        {!inputs.levers.hcc && scenarioForm.maPopulationPct > 20 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Increasing MA % above 20% may make HCC Capture relevant - you can add it later
                          </p>
                        )}
                      </div>

                      {/* New Patient Percentage */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          New patient percentage
                        </label>
                        <div className="flex items-center gap-4 max-w-md">
                          <Slider
                            value={[scenarioForm.newPatientPct]}
                            onValueChange={([val]) => setScenarioForm({ ...scenarioForm, newPatientPct: val })}
                            min={10}
                            max={60}
                            step={5}
                            className="flex-1"
                            data-testid="slider-new-patient"
                          />
                          <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                            {scenarioForm.newPatientPct}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Percentage of encounters that are new patients (vs established)</p>
                        <p className="text-xs text-neutral-400">Typical range: 20-40%</p>
                      </div>

                      {/* Specialty Mix */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          Specialty care percentage
                        </label>
                        <div className="flex items-center gap-4 max-w-md">
                          <Slider
                            value={[scenarioForm.specialtyPct]}
                            onValueChange={([val]) => setScenarioForm({ ...scenarioForm, specialtyPct: val })}
                            min={0}
                            max={100}
                            step={10}
                            className="flex-1"
                            data-testid="slider-specialty"
                          />
                          <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                            {scenarioForm.specialtyPct}%
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Percentage of providers who are specialty (vs primary care)</p>
                        <p className="text-xs text-neutral-400">
                          Blended wRVU: {blendedWrvuPreview.toFixed(2)}
                        </p>
                      </div>

                      {/* Revenue Override */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          Average revenue per visit (optional override)
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">$</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={rawInputValues["modal_revenueOverride"] ?? (scenarioForm.revenuePerVisitOverride ?? "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                setRawInputValues(prev => ({ ...prev, "modal_revenueOverride": val }));
                                setScenarioForm({ 
                                  ...scenarioForm, 
                                  revenuePerVisitOverride: val !== "" && !isNaN(Number(val)) ? parseFloat(val) : null 
                                });
                              }
                            }}
                            onBlur={() => {
                              setRawInputValues(prev => { const next = { ...prev }; delete next["modal_revenueOverride"]; return next; });
                            }}
                            placeholder={inputs.patientAccess.avgNetRevenuePerVisit.toString()}
                            className="w-32"
                            data-testid="input-revenue-override"
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Leave blank to use baseline (${inputs.patientAccess.avgNetRevenuePerVisit})</p>
                      </div>

                      {/* Visit Length Override */}
                      <div>
                        <label className="block text-sm font-semibold text-neutral-900 mb-2">
                          Average visit length (optional override)
                        </label>
                        <div className="flex items-center gap-4 max-w-md">
                          <Slider
                            value={[scenarioForm.visitLengthOverride ?? inputs.patientAccess.avgVisitDurationMinutes]}
                            onValueChange={([val]) => setScenarioForm({ ...scenarioForm, visitLengthOverride: val })}
                            min={20}
                            max={60}
                            step={5}
                            className="flex-1"
                            data-testid="slider-visit-length"
                          />
                          <span className="text-sm font-mono text-neutral-900 w-16 text-right">
                            {scenarioForm.visitLengthOverride ?? inputs.patientAccess.avgVisitDurationMinutes} min
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Currently in baseline: {inputs.patientAccess.avgVisitDurationMinutes} minutes</p>
                      </div>

                      {/* Info callout */}
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-700">
                          Advanced inputs apply ONLY to this scenario. Your baseline model remains unchanged. These help model expansions into different specialties, populations, or care settings.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowScenarioForm(false);
                      setEditingScenarioId(null);
                    }}
                    data-testid="button-cancel-scenario"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCalculateScenario}
                    disabled={scenarioForm.providers <= 0 || scenarioForm.encounters <= 0}
                    className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                    data-testid="button-calculate-scenario"
                  >
                    Calculate Scenario
                  </Button>
                </div>
              </div>
            )}
            
            {/* Mobile fixed bottom comparison bar */}
            {selectedScenariosForCompare.size >= 1 && (
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-[#6B7280]">
                    {selectedScenariosForCompare.size} scenario{selectedScenariosForCompare.size > 1 ? "s" : ""} selected
                  </span>
                  <Button
                    onClick={() => {
                      if (selectedScenariosForCompare.size >= 1) {
                        setShowScenarioComparison(true);
                      }
                    }}
                    disabled={selectedScenariosForCompare.size < 1}
                    className="bg-[#111827] hover:bg-[#E8532F] text-white disabled:opacity-50"
                    data-testid="button-compare-mobile"
                  >
                    Compare Now
                  </Button>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {activeTab === "export" && (
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <h2 className="text-sm font-bold text-[#F03319] uppercase tracking-wide mb-1">
                EXECUTIVE SUMMARY EXPORT
              </h2>
              <p className="text-neutral-500">
                Create a professional business case document for leadership review
              </p>
            </div>

            {/* Section 1: Document Settings */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                Document Details
              </h3>

              <div className="space-y-6 max-w-xl">
                {/* Document Title */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    Document title
                  </label>
                  <Input
                    value={exportForm.documentTitle}
                    onChange={(e) => setExportForm({ ...exportForm, documentTitle: e.target.value })}
                    placeholder={`Abridge ROI Analysis - ${careSettingLabel} Deployment`}
                    data-testid="input-export-title"
                  />
                  <p className="text-xs text-neutral-500 mt-1">This will appear on the cover page</p>
                </div>

                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    Organization name <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <Input
                    value={exportForm.organizationName}
                    onChange={(e) => setExportForm({ ...exportForm, organizationName: e.target.value })}
                    placeholder="Leave blank or enter your organization"
                    data-testid="input-export-org"
                  />
                  <p className="text-xs text-neutral-500 mt-1">If provided, appears on cover page</p>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    Date
                  </label>
                  <Input
                    type="text"
                    value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    readOnly
                    className="bg-neutral-50"
                    data-testid="input-export-date"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Document preparation date</p>
                </div>

                {/* Prepared By */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    Prepared by <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <Input
                    value={exportForm.preparedBy}
                    onChange={(e) => setExportForm({ ...exportForm, preparedBy: e.target.value })}
                    placeholder="Your name or department"
                    data-testid="input-export-preparedby"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Attribution for the analysis</p>
                </div>
              </div>
            </div>

            {/* Section 2: Content Selection */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-2">
                What to Include
              </h3>
              <p className="text-sm text-neutral-500 mb-6">
                Choose which sections to include in your PDF
              </p>

              <div className="space-y-4">
                {/* Executive Summary (always included) */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <Checkbox checked disabled className="mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">Executive Summary</div>
                    <p className="text-sm text-neutral-500">1-page overview with headline metrics, value breakdown, and key drivers</p>
                    <Badge variant="outline" className="mt-2 text-xs">Always included</Badge>
                  </div>
                </div>

                {/* Value Driver Details */}
                <div className="rounded-xl border border-neutral-200 overflow-hidden">
                  <label className="flex items-start gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                    <Checkbox
                      checked={exportContentSelections.valueDriverDetails}
                      onCheckedChange={(checked) => {
                        setExportContentSelections({ ...exportContentSelections, valueDriverDetails: !!checked });
                        // Reset driver deselections when re-enabling section (cleaner UX)
                        if (checked) {
                          setUserDeselectedDrivers(new Set());
                        }
                      }}
                      className="mt-0.5"
                      data-testid="checkbox-value-drivers"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-neutral-900">Value Driver Details</div>
                      <p className="text-sm text-neutral-500">Full calculations and methodology for each selected driver</p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDriverSectionExpanded(!driverSectionExpanded);
                        }}
                        className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1"
                        data-testid="button-expand-drivers"
                      >
                        {driverSectionExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {enabledDriverIds.length} drivers selected
                      </button>
                    </div>
                  </label>
                  
                  {driverSectionExpanded && exportContentSelections.valueDriverDetails && (
                    <div className="px-4 pb-4 space-y-2 border-t border-neutral-100 pt-3">
                      {enabledDriverIds.map((id) => (
                        <label key={id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={!userDeselectedDrivers.has(id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(userDeselectedDrivers);
                              if (checked) {
                                newSet.delete(id); // Re-include driver
                              } else {
                                newSet.add(id); // Mark as deselected
                              }
                              setUserDeselectedDrivers(newSet);
                            }}
                            data-testid={`checkbox-driver-${id}`}
                          />
                          <span className="text-sm text-neutral-700">{leverLabels[id]}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Methodology & Assumptions */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <Checkbox
                    checked={exportContentSelections.methodology}
                    onCheckedChange={(checked) => setExportContentSelections({ ...exportContentSelections, methodology: !!checked })}
                    className="mt-0.5"
                    data-testid="checkbox-methodology"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">Methodology & Assumptions</div>
                    <p className="text-sm text-neutral-500">How we calculated ROI, key assumptions, and data sources</p>
                    <p className="text-xs text-neutral-400 mt-1">Includes: calculation approach, posture selection, and assumption transparency</p>
                  </div>
                </label>

                {/* Model Inputs */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <Checkbox
                    checked={exportContentSelections.modelInputs}
                    onCheckedChange={(checked) => setExportContentSelections({ ...exportContentSelections, modelInputs: !!checked })}
                    className="mt-0.5"
                    data-testid="checkbox-model-inputs"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">Model Inputs</div>
                    <p className="text-sm text-neutral-500">Your organization's specific inputs (providers, encounters, utilization, etc.)</p>
                  </div>
                </label>

                {/* Scenario Comparisons */}
                {scenarios.length > 0 ? (
                  <div className="rounded-xl border border-neutral-200 overflow-hidden">
                    <label className="flex items-start gap-3 p-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                      <Checkbox
                        checked={exportContentSelections.scenarios}
                        onCheckedChange={(checked) => {
                          setExportContentSelections({ ...exportContentSelections, scenarios: !!checked });
                          // Reset scenario deselections when re-enabling section (cleaner UX)
                          if (checked) {
                            setUserDeselectedScenarios(new Set());
                          }
                        }}
                        className="mt-0.5"
                        data-testid="checkbox-scenarios"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-neutral-900">Scenario Comparisons</div>
                        <p className="text-sm text-neutral-500">Side-by-side comparison of different deployment configurations</p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setScenarioSectionExpanded(!scenarioSectionExpanded);
                          }}
                          className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1"
                          data-testid="button-expand-scenarios"
                        >
                          {scenarioSectionExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          Select scenarios to include
                        </button>
                      </div>
                    </label>
                    
                    {scenarioSectionExpanded && exportContentSelections.scenarios && (
                      <div className="px-4 pb-4 space-y-2 border-t border-neutral-100 pt-3">
                        {scenarios.map((scenario) => (
                          <label key={scenario.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={!userDeselectedScenarios.has(scenario.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(userDeselectedScenarios);
                                if (checked) {
                                  newSet.delete(scenario.id); // Re-include scenario
                                } else {
                                  newSet.add(scenario.id); // Mark as deselected
                                }
                                setUserDeselectedScenarios(newSet);
                              }}
                              data-testid={`checkbox-scenario-${scenario.id}`}
                            />
                            <span className="text-sm text-neutral-700">{scenario.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                    <p className="text-sm text-neutral-500">
                      No scenarios created yet. Go to Scenario Builder to create comparisons.
                    </p>
                  </div>
                )}

                {/* Appendix */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <Checkbox
                    checked={exportContentSelections.appendix}
                    onCheckedChange={(checked) => setExportContentSelections({ ...exportContentSelections, appendix: !!checked })}
                    className="mt-0.5"
                    data-testid="checkbox-appendix"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-neutral-900">Appendix: All Available Drivers</div>
                    <p className="text-sm text-neutral-500">Include calculation details for drivers NOT selected in your model</p>
                    <p className="text-xs text-neutral-400 mt-1">Educational reference showing what other value drivers exist</p>
                  </div>
                </label>
              </div>

              {/* Page estimate */}
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-600">
                  Your PDF will include:{" "}
                  <span className="font-semibold">
                    {(() => {
                      let sections = 2; // Cover + Executive Summary
                      let pages = 2;
                      if (exportContentSelections.valueDriverDetails) {
                        sections++;
                        pages += driversForExport.length * 0.75;
                      }
                      if (exportContentSelections.methodology) {
                        sections++;
                        pages += 1;
                      }
                      if (exportContentSelections.modelInputs) {
                        sections++;
                        pages += 0.5;
                      }
                      if (exportContentSelections.scenarios && scenariosForExport.length > 0) {
                        sections++;
                        pages += scenariosForExport.length;
                      }
                      if (exportContentSelections.appendix) {
                        sections++;
                        pages += 1.5;
                      }
                      return `${sections} sections, approximately ${Math.ceil(pages)}-${Math.ceil(pages + 1)} pages`;
                    })()}
                  </span>
                </p>
              </div>
            </div>

            {/* Section 3: Custom Notes */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-2">
                Custom Notes <span className="font-normal text-neutral-400">(Optional)</span>
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                Add context, talking points, or background for your leadership team. These notes will appear in the Executive Summary section.
              </p>

              <Textarea
                value={exportForm.customNotes}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) {
                    setExportForm({ ...exportForm, customNotes: e.target.value });
                  }
                }}
                placeholder="Example: This analysis models a phased Abridge deployment starting with our cardiology and primary care departments (40 providers). Based on early adoption metrics, we project expansion to 100 providers. The expansion scenario reflects this growth plan with expected utilization improvements and inclusion of our Medicare Advantage population for HCC capture."
                className="min-h-[160px]"
                data-testid="textarea-custom-notes"
              />
              <p className="text-xs text-neutral-500 mt-2">
                {exportForm.customNotes.length} / 1000 characters
              </p>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700">
                  Use this space to:
                </p>
                <ul className="text-xs text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Provide organizational context</li>
                  <li>Highlight key priorities or constraints</li>
                  <li>Add next steps or recommendations</li>
                  <li>Reference internal initiatives or strategic goals</li>
                </ul>
              </div>
            </div>

            {/* Section 4: Preview & Download */}
            <div className="bg-white rounded-2xl border border-neutral-200/60 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-2">
                Preview
              </h3>
              <p className="text-sm text-neutral-500 mb-6">
                Your PDF will be structured as follows:
              </p>

              {/* Document Structure Outline */}
              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6 font-mono text-sm">
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-4">
                  Document Structure
                </div>

                <div className="space-y-4 text-neutral-700">
                  <div>
                    <div className="font-semibold">Page 1: Cover Page</div>
                    <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                      <li>Document title</li>
                      {exportForm.organizationName && <li>Organization name</li>}
                      <li>Date</li>
                      {exportForm.preparedBy && <li>Prepared by</li>}
                    </ul>
                  </div>

                  <div>
                    <div className="font-semibold">Page 2: Executive Summary</div>
                    <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                      <li>Model overview</li>
                      <li>Financial results</li>
                      <li>Value breakdown</li>
                      <li>Key drivers summary</li>
                      {exportForm.customNotes && <li>Custom notes</li>}
                    </ul>
                  </div>

                  {exportContentSelections.valueDriverDetails && driversForExport.length > 0 && (
                    <div>
                      <div className="font-semibold">Pages 3-{2 + Math.ceil(driversForExport.length * 0.75)}: Value Driver Details</div>
                      <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                        {driversForExport.map((id) => (
                          <li key={id}>{leverLabels[id]}</li>
                        ))}
                        <li>Calculation for each</li>
                        <li>Key assumptions</li>
                      </ul>
                    </div>
                  )}

                  {exportContentSelections.methodology && (
                    <div>
                      <div className="font-semibold">Methodology & Assumptions</div>
                      <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                        <li>Calculation approach</li>
                        <li>Posture selection rationale</li>
                        <li>Data sources</li>
                        <li>How to use this analysis</li>
                      </ul>
                    </div>
                  )}

                  {exportContentSelections.modelInputs && (
                    <div>
                      <div className="font-semibold">Model Inputs</div>
                      <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                        <li>Your organization's inputs</li>
                        <li>Configuration summary</li>
                      </ul>
                    </div>
                  )}

                  {exportContentSelections.scenarios && scenariosForExport.length > 0 && (
                    <div>
                      <div className="font-semibold">Scenario Comparisons</div>
                      <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                        {scenariosForExport.map((s) => (
                          <li key={s.id}>{s.name}</li>
                        ))}
                        <li>Side-by-side analysis</li>
                        <li>Key insights</li>
                      </ul>
                    </div>
                  )}

                  {exportContentSelections.appendix && (
                    <div>
                      <div className="font-semibold">Appendix</div>
                      <ul className="ml-4 text-neutral-500 text-xs mt-1 space-y-0.5">
                        <li>Additional available drivers</li>
                        <li>Calculation references</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-600">
                <span>
                  Estimated length:{" "}
                  <span className="font-semibold">
                    {(() => {
                      let pages = 2;
                      if (exportContentSelections.valueDriverDetails) pages += enabledDriverIds.length * 0.75;
                      if (exportContentSelections.methodology) pages += 1;
                      if (exportContentSelections.modelInputs) pages += 0.5;
                      if (exportContentSelections.scenarios && scenarios.length > 0) pages += scenarios.length;
                      if (exportContentSelections.appendix) pages += 1.5;
                      return `${Math.ceil(pages)}-${Math.ceil(pages + 1)} pages`;
                    })()}
                  </span>
                </span>
                <span>File format: <span className="font-semibold">PDF</span></span>
                <span>File size: <span className="font-semibold">~50-150 KB</span></span>
              </div>

              {/* Download Button */}
              <div className="mt-8 space-y-4">
                <Button
                  size="lg"
                  onClick={() => openBaselineExport()}
                  className="w-full bg-[#F03319] hover:bg-[#D92D16] text-white gap-2"
                  data-testid="button-download-pdf"
                >
                  <Download className="h-5 w-5" />
                  Generate PDF
                </Button>

                {/* Email button (coming soon) */}
                <Button
                  variant="outline"
                  size="lg"
                  disabled
                  className="w-full gap-2 opacity-50"
                  data-testid="button-email-pdf"
                >
                  <Mail className="h-5 w-5" />
                  Email PDF
                  <Badge variant="secondary" className="ml-2 text-xs">Coming soon</Badge>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Driver Modal */}
      <Dialog open={addDriverModalOpen} onOpenChange={setAddDriverModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Value Driver</DialogTitle>
            <DialogDescription>
              Select additional drivers to include in your model:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Capacity & Labor Section */}
            {availableDrivers.some((id) => capacityLaborIds.includes(id)) && (
              <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3">
                  Capacity & Labor
                </h3>
                <div className="space-y-3">
                  {availableDrivers
                    .filter((id) => capacityLaborIds.includes(id))
                    .map((id) => (
                      <label
                        key={id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
                        data-testid={`modal-driver-${id}`}
                      >
                        <Checkbox
                          checked={selectedNewDrivers.has(id)}
                          onCheckedChange={() => toggleNewDriver(id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900">
                            {leverLabels[id]}
                          </div>
                          <div className="text-sm text-neutral-500 mt-0.5">
                            {DRIVER_ESTIMATES[id]?.subtitle}
                          </div>
                          <div className="text-sm text-neutral-400 mt-1">
                            Est. value: {formatCurrency(DRIVER_ESTIMATES[id]?.min ?? 0)}-{formatCurrency(DRIVER_ESTIMATES[id]?.max ?? 0)} ({inputs.numberOfProviders} providers)
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {/* Revenue & Risk Section */}
            {availableDrivers.some((id) => revenueRiskIds.includes(id)) && (
              <div>
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3">
                  Revenue & Risk
                </h3>
                <div className="space-y-3">
                  {availableDrivers
                    .filter((id) => revenueRiskIds.includes(id))
                    .map((id) => (
                      <label
                        key={id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition-colors"
                        data-testid={`modal-driver-${id}`}
                      >
                        <Checkbox
                          checked={selectedNewDrivers.has(id)}
                          onCheckedChange={() => toggleNewDriver(id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900">
                            {leverLabels[id]}
                          </div>
                          <div className="text-sm text-neutral-500 mt-0.5">
                            {DRIVER_ESTIMATES[id]?.subtitle}
                          </div>
                          <div className="text-sm text-neutral-400 mt-1">
                            Est. value: {formatCurrency(DRIVER_ESTIMATES[id]?.min ?? 0)}-{formatCurrency(DRIVER_ESTIMATES[id]?.max ?? 0)}
                          </div>
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedNewDrivers(new Set());
                setAddDriverModalOpen(false);
              }}
              data-testid="button-modal-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDrivers}
              disabled={selectedNewDrivers.size === 0}
              className="bg-[#F03319] hover:bg-[#D92D16] text-white"
              data-testid="button-modal-add"
            >
              Add Selected Drivers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        exportType={exportType}
        inputs={inputs}
        results={results}
        enabledDrivers={enabledDriverIds}
        driverValues={driverValues}
        careSettingLabel={careSettingLabel}
        scenario={exportScenario}
        scenarios={exportScenarios}
      />
    </div>
  );
}
