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
} from "@/lib/roi-types";
import {
  calculateRoi,
  formatCurrency,
} from "@/lib/roi-calculator";
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
  ChevronUp,
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
const DRIVER_ICONS: Record<LeverId, typeof Clock> = {
  patientAccess: Clock,
  wrvu: DollarSign,
  workforce: UserMinus,
  hcc: Heart,
  denials: FileX,
  overtime: Calendar,
};

const DRIVER_COLORS: Record<LeverId, string> = {
  patientAccess: "#3B82F6", // Blue
  wrvu: "#8B5CF6", // Purple
  workforce: "#10B981", // Green
  hcc: "#F97316", // Orange
  denials: "#14B8A6", // Teal
  overtime: "#EF4444", // Red
};

const DRIVER_ESTIMATES: Record<LeverId, { min: number; max: number; subtitle: string }> = {
  patientAccess: { min: 150000, max: 200000, subtitle: "Returns visit-time documentation minutes back to patient capacity" },
  wrvu: { min: 200000, max: 260000, subtitle: "Improves coding support by capturing clinical reasoning" },
  workforce: { min: 50000, max: 120000, subtitle: "Lower burnout and turnover by reducing admin burden" },
  overtime: { min: 100000, max: 180000, subtitle: "Reduce premium labor costs from documentation backlog" },
  hcc: { min: 180000, max: 400000, subtitle: "Improve RAF scores through complete documentation" },
  denials: { min: 70000, max: 150000, subtitle: "Reduce claims denied due to documentation issues" },
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
  const [expandProvidersMode, setExpandProvidersMode] = useState<"quick" | "advanced">("quick");
  const [encounterScalingMode, setEncounterScalingMode] = useState<"proportional" | "custom">("proportional");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  
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
  const [driverAdjustments, setDriverAdjustments] = useState<Record<LeverId, Record<string, number>>>({
    hcc: { maPopulationPct: 15, benchmarkPmpm: 1000, recaptureRate: 50 },
    denials: { denialRate: 5, preventionRate: 50 },
    overtime: { afterHoursPct: 20, premiumRate: 145 },
    patientAccess: {},
    workforce: {},
    wrvu: {},
  });
  const [driversScenarioName, setDriversScenarioName] = useState("");

  // New Care Setting full-page flow state
  const [showNewCareSetting, setShowNewCareSetting] = useState(false);
  const [selectedNewCareSetting, setSelectedNewCareSetting] = useState<"ed" | "nursing" | null>(null);
  const [careSettingScenarioName, setCareSettingScenarioName] = useState("");
  const [careSettingConfig, setCareSettingConfig] = useState({
    providers: 20,
    encountersPerProvider: 5000,
    customEncounters: 100000,
    encounterMode: "calculated" as "calculated" | "custom",
    utilizationRate: 70,
  });
  const [careSettingDrivers, setCareSettingDrivers] = useState<Set<LeverId>>(new Set<LeverId>(["patientAccess", "wrvu", "denials"]));
  const [careSettingDriverAdjustments, setCareSettingDriverAdjustments] = useState<Record<LeverId, Record<string, number>>>({
    patientAccess: { minutesSaved: 12 },
    wrvu: { baselineWrvu: 2.8, qualityLift: 6, revenuePerWrvu: 45 },
    denials: { denialRate: 6, preventionRate: 55 },
    overtime: { afterHoursPct: 30, premiumRate: 160 },
    hcc: {},
    workforce: {},
  });
  const [expandedCareSettingDriver, setExpandedCareSettingDriver] = useState<LeverId | null>(null);

  // Scenario Comparison View state
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);

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
    };
    results.levers.forEach((lever) => {
      // Only include if the lever is enabled in inputs
      if (lever.enabled) {
        values[lever.id] = lever.value;
      }
    });
    return values;
  }, [results]);

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
  const calculateAdjustedDriverValue = useCallback((driverId: LeverId, adjustments: Record<LeverId, Record<string, number>>): number => {
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
    
    // Apply driver-specific adjustments
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
      patientAccess: 0, overtime: 0, workforce: 0, wrvu: 0, denials: 0, hcc: 0
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
            <div className="flex flex-col gap-2 cursor-pointer" onClick={onBack} data-testid="logo-home">
              <img 
                src={abridgeLogo} 
                alt="Abridge" 
                className="h-9 md:h-10 w-auto" 
              />
              <span className="text-[16px] md:text-[18px] font-semibold text-[#111827] tracking-tight leading-none">
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
                  <div className="text-4xl md:text-5xl font-bold text-[#F03319] font-mono tracking-tight" data-testid="metric-net-gain">
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
                            const descriptions: Record<LeverId, string> = {
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
                                      <DriverIcon
                                        className="h-4 w-4"
                                        style={{ color: DRIVER_COLORS[id] }}
                                      />
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
                            const descriptions: Record<LeverId, string> = {
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
                                      <DriverIcon
                                        className="h-4 w-4"
                                        style={{ color: DRIVER_COLORS[id] }}
                                      />
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
                          <DriverIcon
                            className="h-5 w-5"
                            style={{ color: DRIVER_COLORS[driverId] }}
                          />
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
            {/* EXPAND PROVIDERS FULL-PAGE VIEW */}
            {showExpandProviders ? (
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => setShowExpandProviders(false)}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-scenario-builder"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                    Expand Providers
                  </h2>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Model what happens when you add more users to your deployment
                  </p>
                  
                  {/* Baseline reference box */}
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-[#6B7280]" />
                    <span className="text-[14px] text-[#6B7280]">
                      Your baseline: {inputs.numberOfProviders} providers | {inputs.annualOutpatientEncounters.toLocaleString()} encounters | {formatCurrency(netAnnualGain)} net gain
                    </span>
                  </div>
                </div>
                
                {/* Two-column layout for desktop */}
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left column - Input form */}
                  <div className="flex-1 lg:max-w-[60%] space-y-6">
                    {/* Mode Toggle */}
                    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-1 flex">
                      <button
                        onClick={() => setExpandProvidersMode("quick")}
                        className={`flex-1 p-4 rounded-md transition-all ${
                          expandProvidersMode === "quick"
                            ? "bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
                            : "bg-transparent hover:bg-white/50"
                        }`}
                        data-testid="toggle-quick-mode"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {expandProvidersMode === "quick" && <span className="text-[#E8532F]">●</span>}
                          <span className="text-[14px] font-bold text-[#111827]">Quick Mode</span>
                        </div>
                        <p className="text-[13px] text-[#6B7280]">Fast estimate with typical assumptions</p>
                      </button>
                      <button
                        onClick={() => setExpandProvidersMode("advanced")}
                        className={`flex-1 p-4 rounded-md transition-all ${
                          expandProvidersMode === "advanced"
                            ? "bg-white border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
                            : "bg-transparent hover:bg-white/50"
                        }`}
                        data-testid="toggle-advanced-mode"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {expandProvidersMode === "advanced" && <span className="text-[#E8532F]">●</span>}
                          <span className="text-[14px] font-bold text-[#111827]">Advanced Mode</span>
                        </div>
                        <p className="text-[13px] text-[#6B7280]">Organization-specific inputs for precision</p>
                      </button>
                    </div>
                    
                    {/* Scenario Name */}
                    <div>
                      <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-3">
                        Scenario Name
                      </label>
                      <input
                        type="text"
                        value={scenarioForm.name}
                        onChange={(e) => setScenarioForm({ ...scenarioForm, name: e.target.value })}
                        placeholder={`Expand to ${Math.round(inputs.numberOfProviders * 1.5)} providers`}
                        className="w-full h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] text-[#111827] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                        data-testid="input-scenario-name"
                      />
                      <p className="mt-1.5 text-[13px] text-[#6B7280]">Give this scenario a descriptive name</p>
                    </div>
                    
                    <div className="border-t border-[#E5E7EB]" />
                    
                    {/* Deployment Size */}
                    <div>
                      <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                        Deployment Size
                      </h3>
                      
                      {/* Providers in scope */}
                      <div className="mb-6">
                        <label className="block text-[14px] text-[#111827] mb-2">Providers in scope</label>
                        <input
                          type="number"
                          value={scenarioForm.providers}
                          onChange={(e) => {
                            const newProviders = parseInt(e.target.value) || 0;
                            const encountersPerProvider = inputs.annualOutpatientEncounters / inputs.numberOfProviders;
                            setScenarioForm({ 
                              ...scenarioForm, 
                              providers: newProviders,
                              encounters: encounterScalingMode === "proportional" 
                                ? Math.round(newProviders * encountersPerProvider)
                                : scenarioForm.encounters
                            });
                          }}
                          className="w-[200px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] text-[#111827] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                          data-testid="input-providers"
                        />
                        {scenarioForm.providers > 0 && inputs.numberOfProviders > 0 && (
                          <p className="mt-1.5 text-[13px]">
                            <span className="text-[#6B7280]">Currently: {inputs.numberOfProviders} providers </span>
                            <span className={scenarioForm.providers >= inputs.numberOfProviders ? "text-[#059669]" : "text-[#DC2626]"}>
                              ({scenarioForm.providers >= inputs.numberOfProviders ? "+" : ""}
                              {(((scenarioForm.providers - inputs.numberOfProviders) / inputs.numberOfProviders) * 100).toFixed(0)}% change)
                            </span>
                          </p>
                        )}
                      </div>
                      
                      {/* Annual encounters */}
                      <div>
                        <label className="block text-[14px] text-[#111827] mb-3">Annual encounters</label>
                        
                        {/* Scale proportionally option */}
                        <div className="mb-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="encounterScaling"
                              checked={encounterScalingMode === "proportional"}
                              onChange={() => {
                                setEncounterScalingMode("proportional");
                                const encountersPerProvider = inputs.annualOutpatientEncounters / inputs.numberOfProviders;
                                setScenarioForm({
                                  ...scenarioForm,
                                  encounters: Math.round(scenarioForm.providers * encountersPerProvider)
                                });
                              }}
                              className="mt-1 h-[18px] w-[18px] accent-[#E8532F]"
                              data-testid="radio-proportional"
                            />
                            <div>
                              <span className="text-[14px] text-[#111827]">Scale proportionally from baseline</span>
                              <p className="text-[14px] text-[#111827] mt-1">
                                {scenarioForm.providers} providers × {Math.round(inputs.annualOutpatientEncounters / inputs.numberOfProviders).toLocaleString()} encounters/provider = <span className="font-bold">{scenarioForm.encounters.toLocaleString()}</span>
                              </p>
                            </div>
                          </label>
                        </div>
                        
                        {/* Custom volume option */}
                        <div>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="encounterScaling"
                              checked={encounterScalingMode === "custom"}
                              onChange={() => setEncounterScalingMode("custom")}
                              className="mt-1 h-[18px] w-[18px] accent-[#E8532F]"
                              data-testid="radio-custom"
                            />
                            <div className="flex-1">
                              <span className="text-[14px] text-[#111827]">Enter custom volume</span>
                              <input
                                type="number"
                                value={scenarioForm.encounters}
                                onChange={(e) => setScenarioForm({ ...scenarioForm, encounters: parseInt(e.target.value) || 0 })}
                                disabled={encounterScalingMode !== "custom"}
                                className="w-[200px] h-11 px-3 mt-2 border border-[#E5E7EB] rounded-md text-[16px] text-[#111827] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                                data-testid="input-custom-encounters"
                              />
                              <p className="mt-1.5 text-[13px] text-[#6B7280]">Use if you have specific volume projections</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-[#E5E7EB]" />
                    
                    {/* Utilization Projection */}
                    <div>
                      <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                        Utilization Projection
                      </h3>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[14px] text-[#111827]">Expected utilization rate</label>
                          <span className="text-[18px] font-bold text-[#111827]">{scenarioForm.utilizationRate}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={scenarioForm.utilizationRate}
                          onChange={(e) => setScenarioForm({ ...scenarioForm, utilizationRate: parseInt(e.target.value) })}
                          className="w-full h-1 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#E8532F] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                          style={{
                            background: `linear-gradient(to right, #E8532F 0%, #E8532F ${scenarioForm.utilizationRate}%, #E5E7EB ${scenarioForm.utilizationRate}%, #E5E7EB 100%)`
                          }}
                          data-testid="slider-utilization"
                        />
                        <p className="mt-2 text-[13px] text-[#6B7280]">
                          {inputs.abridgeUtilizationPct}% (current) → {scenarioForm.utilizationRate}% (projected)
                        </p>
                      </div>
                      
                      {/* Utilization tips */}
                      <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                          <div className="text-[13px] text-[#1E40AF]">
                            <p className="mb-2">Utilization typically increases as teams mature:</p>
                            <ul className="space-y-1">
                              <li>• Pilot (0-3 mo): 40-50%</li>
                              <li>• Early (3-6 mo): 50-65%</li>
                              <li>• Mature (6-12 mo): 65-80%</li>
                              <li>• Optimized (12+ mo): 75-90%</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* ADVANCED MODE ADDITIONAL INPUTS */}
                    {expandProvidersMode === "advanced" && (
                      <>
                        <div className="border-t border-[#E5E7EB]" />
                        
                        {/* Provider Breakdown */}
                        <div>
                          <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                            Provider Breakdown
                          </h3>
                          <p className="text-[13px] text-[#6B7280] mb-4">Break down by provider type for more accurate calculations</p>
                          
                          <div className="bg-white border border-neutral-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                            {providerBreakdown.map((provider, index) => (
                              <div key={index}>
                                {index > 0 && <div className="border-t border-[#E5E7EB] my-4" />}
                                <div className="mb-2">
                                  <span className="text-[14px] font-bold text-[#111827]">{provider.type}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <label className="text-[13px] text-[#6B7280]">Count:</label>
                                    <input
                                      type="number"
                                      value={provider.count}
                                      onChange={(e) => {
                                        const newBreakdown = [...providerBreakdown];
                                        newBreakdown[index].count = parseInt(e.target.value) || 0;
                                        setProviderBreakdown(newBreakdown);
                                        const totalProviders = newBreakdown.reduce((sum, p) => sum + p.count, 0);
                                        setScenarioForm({ ...scenarioForm, providers: totalProviders });
                                      }}
                                      className="w-[80px] h-9 px-2 ml-2 border border-[#E5E7EB] rounded-md text-[14px] focus:border-[#E8532F] focus:ring-[2px] focus:ring-[#E8532F]/10 focus:outline-none"
                                      data-testid={`input-provider-count-${index}`}
                                    />
                                  </div>
                                </div>
                                <p className="mt-1 text-[13px] text-[#6B7280]">
                                  Avg encounters/year: {provider.encountersPerYear.toLocaleString()} | Avg wRVU: {provider.avgWrvu}
                                </p>
                              </div>
                            ))}
                            
                            <button
                              onClick={() => {
                                setProviderBreakdown([
                                  ...providerBreakdown,
                                  { type: `Provider Type ${providerBreakdown.length + 1}`, count: 0, encountersPerYear: 1500, avgWrvu: 1.0 }
                                ]);
                              }}
                              className="mt-4 text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                              data-testid="button-add-provider-type"
                            >
                              <Plus className="h-4 w-4" /> Add Provider Type
                            </button>
                            
                            <div className="mt-4 pt-4 border-t border-[#E5E7EB] bg-[#F9FAFB] -mx-5 -mb-5 px-5 py-3 rounded-b-lg">
                              <div className="flex flex-wrap gap-6 text-[14px]">
                                <span>Total: <span className="font-bold">{providerBreakdown.reduce((sum, p) => sum + p.count, 0)} providers</span></span>
                                <span>Calculated encounters: <span className="font-bold">{providerBreakdown.reduce((sum, p) => sum + (p.count * p.encountersPerYear), 0).toLocaleString()}</span></span>
                                <span>Blended wRVU: <span className="font-bold">
                                  {(providerBreakdown.reduce((sum, p) => sum + (p.count * p.avgWrvu), 0) / Math.max(1, providerBreakdown.reduce((sum, p) => sum + p.count, 0))).toFixed(2)}
                                </span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-[#E5E7EB]" />
                        
                        {/* Financial Parameters */}
                        <div>
                          <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                            Financial Parameters
                          </h3>
                          <p className="text-[13px] text-[#6B7280] mb-4">Override with your organization's actual values</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Revenue per visit</label>
                              <div className="flex items-center">
                                <span className="text-[16px] text-[#6B7280] mr-1">$</span>
                                <input
                                  type="number"
                                  value={financialParams.revenuePerVisit}
                                  onChange={(e) => setFinancialParams({ ...financialParams, revenuePerVisit: parseInt(e.target.value) || 0 })}
                                  className="w-[160px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-revenue-per-visit"
                                />
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Baseline: $200 | Typical range: $150-350</p>
                            </div>
                            
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Revenue per wRVU</label>
                              <div className="flex items-center">
                                <span className="text-[16px] text-[#6B7280] mr-1">$</span>
                                <input
                                  type="number"
                                  value={financialParams.revenuePerWrvu}
                                  onChange={(e) => setFinancialParams({ ...financialParams, revenuePerWrvu: parseInt(e.target.value) || 0 })}
                                  className="w-[160px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-revenue-per-wrvu"
                                />
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Baseline: $40 | Typical range: $30-80</p>
                            </div>
                            
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Provider replacement cost</label>
                              <div className="flex items-center">
                                <span className="text-[16px] text-[#6B7280] mr-1">$</span>
                                <input
                                  type="number"
                                  value={financialParams.providerReplacementCost}
                                  onChange={(e) => setFinancialParams({ ...financialParams, providerReplacementCost: parseInt(e.target.value) || 0 })}
                                  className="w-[160px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-replacement-cost"
                                />
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Baseline: $250,000 | Typical range: $200k-400k</p>
                            </div>
                            
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Medicare Advantage population</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={financialParams.maPopulationPct}
                                  onChange={(e) => setFinancialParams({ ...financialParams, maPopulationPct: parseInt(e.target.value) })}
                                  className="flex-1 h-1 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#E8532F] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm"
                                  style={{
                                    background: `linear-gradient(to right, #E8532F 0%, #E8532F ${financialParams.maPopulationPct}%, #E5E7EB ${financialParams.maPopulationPct}%, #E5E7EB 100%)`
                                  }}
                                  data-testid="slider-ma-population"
                                />
                                <span className="text-[16px] font-bold text-[#111827] w-12 text-right">{financialParams.maPopulationPct}%</span>
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Affects HCC Capture calculations</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t border-[#E5E7EB]" />
                        
                        {/* Current Performance */}
                        <div>
                          <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-2">
                            Current Performance
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Your actual turnover rate</label>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={financialParams.turnoverRate}
                                  onChange={(e) => setFinancialParams({ ...financialParams, turnoverRate: parseInt(e.target.value) || 0 })}
                                  className="w-[80px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-turnover-rate"
                                />
                                <span className="text-[16px] text-[#6B7280] ml-1">%</span>
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Baseline: 5% | National average: 6-8%</p>
                            </div>
                            
                            <div>
                              <label className="block text-[14px] text-[#111827] mb-2">Your actual denial rate</label>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={financialParams.denialRate}
                                  onChange={(e) => setFinancialParams({ ...financialParams, denialRate: parseInt(e.target.value) || 0 })}
                                  className="w-[80px] h-11 px-3 border border-[#E5E7EB] rounded-md text-[16px] focus:border-[#E8532F] focus:ring-[3px] focus:ring-[#E8532F]/10 focus:outline-none"
                                  data-testid="input-denial-rate"
                                />
                                <span className="text-[16px] text-[#6B7280] ml-1">%</span>
                              </div>
                              <p className="mt-1 text-[13px] text-[#6B7280]">Baseline: 5% | Industry average: 5-10%</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Footer Actions */}
                    <div className="border-t border-[#E5E7EB] pt-6">
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowExpandProviders(false)}
                          className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                          data-testid="button-cancel-scenario"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            handleCalculateScenario();
                            setShowExpandProviders(false);
                            toast({
                              title: "Scenario saved",
                              description: scenarioForm.name || `Scenario ${scenarios.length + 1}`,
                            });
                          }}
                          disabled={!scenarioForm.name && scenarioForm.providers === inputs.numberOfProviders}
                          className="bg-[#E8532F] hover:bg-[#D4471F] text-white disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]"
                          data-testid="button-save-scenario"
                        >
                          Save Scenario
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column - Preview Panel (sticky on desktop) */}
                  <div className="lg:w-[40%]">
                    <div className="lg:sticky lg:top-6">
                      {/* Mobile toggle for preview */}
                      <button
                        onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                        className="lg:hidden w-full mb-4 p-4 bg-white border border-neutral-200/60 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] flex items-center justify-between"
                        data-testid="button-toggle-preview"
                      >
                        <span className="text-[14px] text-[#111827]">
                          Net Gain: <span className="font-bold text-[#059669]">{formatCurrency((() => {
                            const scenarioResults = calculateScenarioResults(scenarioForm);
                            return scenarioResults.netGain;
                          })())}</span>
                        </span>
                        <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${mobilePreviewOpen ? "rotate-180" : ""}`} />
                      </button>
                      
                      {/* Preview Panel Content */}
                      <div className={`${mobilePreviewOpen ? "block" : "hidden"} lg:block`}>
                        <div className="mb-2">
                          <h3 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em]">Scenario Preview</h3>
                          <p className="text-[13px] text-[#6B7280]">Updates in real-time</p>
                        </div>
                        
                        <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                          {/* Comparison table */}
                          {(() => {
                            const scenarioResults = calculateScenarioResults(scenarioForm);
                            const baselineEligible = Math.round(inputs.annualOutpatientEncounters * inputs.abridgeUtilizationPct / 100);
                            const scenarioEligible = Math.round(scenarioForm.encounters * scenarioForm.utilizationRate / 100);
                            
                            return (
                              <>
                                {/* Header row */}
                                <div className="grid grid-cols-4 gap-2 mb-4 text-[12px] text-[#6B7280] uppercase">
                                  <div></div>
                                  <div className="text-right">Baseline</div>
                                  <div className="text-right">Scenario</div>
                                  <div className="text-right">Change</div>
                                </div>
                                
                                {/* Deployment section */}
                                <div className="mb-4">
                                  <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Deployment</div>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Providers</div>
                                      <div className="text-right text-[#111827]">{inputs.numberOfProviders}</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioForm.providers}</div>
                                      <div className={`text-right ${scenarioForm.providers >= inputs.numberOfProviders ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioForm.providers >= inputs.numberOfProviders ? "+" : ""}
                                        {(((scenarioForm.providers - inputs.numberOfProviders) / Math.max(1, inputs.numberOfProviders)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Encounters</div>
                                      <div className="text-right text-[#111827]">{inputs.annualOutpatientEncounters.toLocaleString()}</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioForm.encounters.toLocaleString()}</div>
                                      <div className={`text-right ${scenarioForm.encounters >= inputs.annualOutpatientEncounters ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioForm.encounters >= inputs.annualOutpatientEncounters ? "+" : ""}
                                        {(((scenarioForm.encounters - inputs.annualOutpatientEncounters) / Math.max(1, inputs.annualOutpatientEncounters)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Utilization</div>
                                      <div className="text-right text-[#111827]">{inputs.abridgeUtilizationPct}%</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioForm.utilizationRate}%</div>
                                      <div className={`text-right ${scenarioForm.utilizationRate >= inputs.abridgeUtilizationPct ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioForm.utilizationRate >= inputs.abridgeUtilizationPct ? "+" : ""}
                                        {scenarioForm.utilizationRate - inputs.abridgeUtilizationPct} pts
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Eligible</div>
                                      <div className="text-right text-[#111827]">{baselineEligible.toLocaleString()}</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioEligible.toLocaleString()}</div>
                                      <div className={`text-right ${scenarioEligible >= baselineEligible ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioEligible >= baselineEligible ? "+" : ""}
                                        {(((scenarioEligible - baselineEligible) / Math.max(1, baselineEligible)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border-t border-[#E5E7EB] my-4" />
                                
                                {/* Summary section */}
                                <div>
                                  <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Summary</div>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Total Benefit</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(totalAnnualBenefit)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(scenarioResults.totalBenefit)}</div>
                                      <div className={`text-right ${scenarioResults.totalBenefit >= totalAnnualBenefit ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.totalBenefit >= totalAnnualBenefit ? "+" : ""}
                                        {(((scenarioResults.totalBenefit - totalAnnualBenefit) / Math.max(1, totalAnnualBenefit)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Investment</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(annualInvestment)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(scenarioResults.investment)}</div>
                                      <div className={`text-right ${scenarioResults.investment >= annualInvestment ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.investment >= annualInvestment ? "+" : ""}
                                        {(((scenarioResults.investment - annualInvestment) / Math.max(1, annualInvestment)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[16px] bg-[#F9FAFB] -mx-6 px-6 py-2">
                                      <div className="font-bold text-[#111827]">Net Gain</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(netAnnualGain)}</div>
                                      <div className="text-right font-bold text-[#059669]">{formatCurrency(scenarioResults.netGain)}</div>
                                      <div className={`text-right font-bold ${scenarioResults.netGain >= netAnnualGain ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.netGain >= netAnnualGain ? "+" : ""}
                                        {(((scenarioResults.netGain - netAnnualGain) / Math.max(1, netAnnualGain)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">ROI</div>
                                      <div className="text-right text-[#111827]">{roiMultiple.toFixed(1)}x</div>
                                      <div className="text-right font-bold text-[#111827]">{scenarioResults.roiMultiple.toFixed(1)}x</div>
                                      <div className={`text-right ${scenarioResults.roiMultiple >= roiMultiple ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.roiMultiple >= roiMultiple ? "+" : ""}
                                        {(((scenarioResults.roiMultiple - roiMultiple) / Math.max(0.1, roiMultiple)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border-t border-[#E5E7EB] my-4" />
                                
                                {/* 3-Year Projection */}
                                <div>
                                  <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">3-Year Projection</div>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Total Value</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(totalAnnualBenefit * 3)}</div>
                                      <div className="text-right font-bold text-[#111827]">{formatCurrency(scenarioResults.totalBenefit * 3)}</div>
                                      <div className={`text-right ${scenarioResults.totalBenefit >= totalAnnualBenefit ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.totalBenefit >= totalAnnualBenefit ? "+" : ""}
                                        {(((scenarioResults.totalBenefit - totalAnnualBenefit) / Math.max(1, totalAnnualBenefit)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-[14px]">
                                      <div className="text-[#6B7280]">Net 3-Year</div>
                                      <div className="text-right text-[#111827]">{formatCurrency(netAnnualGain * 3)}</div>
                                      <div className="text-right font-bold text-[#059669]">{formatCurrency(scenarioResults.netGain * 3)}</div>
                                      <div className={`text-right ${scenarioResults.netGain >= netAnnualGain ? "text-[#059669]" : "text-[#DC2626]"}`}>
                                        {scenarioResults.netGain >= netAnnualGain ? "+" : ""}
                                        {(((scenarioResults.netGain - netAnnualGain) / Math.max(1, netAnnualGain)) * 100).toFixed(0)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        {/* Key Insight */}
                        <div className="mt-4 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[13px] font-bold text-[#1E40AF] mb-1">Key Insight</p>
                              <p className="text-[14px] text-[#1E40AF]">
                                {(() => {
                                  const scenarioResults = calculateScenarioResults(scenarioForm);
                                  const additionalValue = scenarioResults.netGain - netAnnualGain;
                                  const percentChange = netAnnualGain > 0 ? ((additionalValue / netAnnualGain) * 100).toFixed(0) : 0;
                                  return `Expanding to ${scenarioForm.providers} providers would generate an additional ${formatCurrency(additionalValue)} in annual value (${additionalValue >= 0 ? "+" : ""}${percentChange}% over your current model).`;
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  
                  {/* Insight box */}
                  <div className="mt-3 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-[#1E40AF] shrink-0" />
                    <p className="text-[14px] text-[#1E40AF]">
                      Adding drivers increases value without increasing investment. This often dramatically improves ROI.
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
                        placeholder={scenarioDriverSelections.size > 0 ? `Add ${Array.from(scenarioDriverSelections).map(id => leverLabels[id].split(" ")[0]).join(" + ")}` : "Add new drivers..."}
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
                                  <span className="text-[18px] font-bold text-[#059669]">+{formatCurrency(driverValue)}</span>
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
                                              type="number"
                                              value={driverAdjustments.hcc?.benchmarkPmpm || 1000}
                                              onChange={(e) => setDriverAdjustments(prev => ({
                                                ...prev,
                                                hcc: { ...prev.hcc, benchmarkPmpm: Number(e.target.value) }
                                              }))}
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
                                          <label className="text-[14px] text-[#111827] block mb-2">Premium rate ($/hr)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
                                            <input
                                              type="number"
                                              value={driverAdjustments.overtime?.premiumRate || 145}
                                              onChange={(e) => setDriverAdjustments(prev => ({
                                                ...prev,
                                                overtime: { ...prev.overtime, premiumRate: Number(e.target.value) }
                                              }))}
                                              className="w-full pl-7 p-3 border border-[#E5E7EB] rounded-lg"
                                            />
                                          </div>
                                          <p className="text-[13px] text-[#6B7280] mt-1">Baseline: $145/hr</p>
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
                            name: driversScenarioName.trim() || `Add ${Array.from(scenarioDriverSelections).map(id => leverLabels[id].split(" ")[0]).join(" + ")}`,
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
                                <div key={id} className="grid grid-cols-4 gap-2 text-[14px]">
                                  <div className="text-[#6B7280] truncate">{leverLabels[id].split(" ")[0]}</div>
                                  <div className="text-right text-[#111827]">{formatCurrency(driverValues[id])}</div>
                                  <div className="text-right font-bold text-[#111827]">{formatCurrency(driverValues[id])}</div>
                                  <div className="text-right text-[#6B7280]">—</div>
                                </div>
                              ))}
                              {Array.from(scenarioDriverSelections).map(id => {
                                const adjustedDriverValue = calculateAdjustedDriverValue(id, driverAdjustments);
                                return (
                                  <div key={id} className="grid grid-cols-4 gap-2 text-[14px]">
                                    <div className="text-[#6B7280] truncate">{leverLabels[id].split(" ")[0]}</div>
                                    <div className="text-right text-[#6B7280]">—</div>
                                    <div className="text-right font-bold text-[#059669]">{formatCurrency(adjustedDriverValue)}</div>
                                    <div className="text-right">
                                      <span className="px-1.5 py-0.5 bg-[#ECFDF5] text-[12px] font-bold text-[#059669] uppercase rounded">
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
              /* NEW CARE SETTING FULL-PAGE VIEW */
              <div className="space-y-6">
                {/* Back navigation */}
                <button
                  onClick={() => setShowNewCareSetting(false)}
                  className="text-[14px] text-[#E8532F] hover:underline flex items-center gap-1"
                  data-testid="button-back-from-care-setting"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Scenario Builder
                </button>
                
                {/* Page header */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#E8532F] uppercase tracking-[0.05em] mb-1">
                    New Care Setting
                  </h2>
                  <p className="text-[16px] text-[#6B7280] mb-4">
                    Model expansion into Emergency Department or Nursing
                  </p>
                  
                  {/* Current deployment box */}
                  <div className="p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="h-5 w-5 text-[#6B7280]" />
                      <span className="text-[14px] font-bold text-[#6B7280]">Your current deployment</span>
                    </div>
                    <p className="text-[14px] text-[#111827] mb-3">
                      {careSettingLabel}: {inputs.numberOfProviders} providers | {formatCurrency(netAnnualGain)} net gain | {roiMultiple.toFixed(1)}x ROI
                    </p>
                    <p className="text-[14px] text-[#6B7280]">
                      Adding a new care setting creates a combined deployment with separate configurations but unified ROI view.
                    </p>
                  </div>
                </div>
                
                {/* Two-column layout */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left column - Input Form */}
                  <div className="lg:w-[60%] space-y-6">
                    {/* CARE SETTING SELECTION */}
                    <div>
                      <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
                        Select Care Setting to Add
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Emergency Department Card */}
                        <div
                          onClick={() => {
                            setSelectedNewCareSetting("ed");
                            setCareSettingConfig(prev => ({
                              ...prev,
                              providers: 20,
                              encountersPerProvider: 5000,
                              customEncounters: 100000,
                              utilizationRate: 70,
                            }));
                            setCareSettingDrivers(new Set<LeverId>(["patientAccess", "wrvu", "denials"]));
                          }}
                          className={`p-6 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedNewCareSetting === "ed"
                              ? "border-2 border-[#E8532F] bg-[rgba(232,83,47,0.02)] border-l-4"
                              : "border-[#E5E7EB] hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                          }`}
                          data-testid="card-select-ed"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedNewCareSetting === "ed" ? "border-[#E8532F] bg-[#E8532F]" : "border-[#E5E7EB]"
                            }`}>
                              {selectedNewCareSetting === "ed" && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Stethoscope className="h-6 w-6 text-[#6B7280]" />
                                <span className="text-[18px] font-bold text-[#111827]">Emergency Department</span>
                              </div>
                              <p className="text-[14px] text-[#6B7280] mb-4">High-volume, fast-paced encounters</p>
                              
                              <div className="border-t border-[#E5E7EB] pt-4 mb-4">
                                <p className="text-[13px] font-bold text-[#6B7280] mb-2">Typical ED characteristics:</p>
                                <ul className="text-[14px] text-[#6B7280] space-y-1 leading-relaxed">
                                  <li>• 3,000-8,000 encounters per provider per year</li>
                                  <li>• Average wRVU: 2.4-3.2 per encounter</li>
                                  <li>• Higher denial risk due to time pressure</li>
                                  <li>• Significant after-hours documentation burden</li>
                                </ul>
                              </div>
                              
                              <div className="mb-4">
                                <p className="text-[13px] font-bold text-[#6B7280] mb-2">Recommended drivers:</p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Patient Throughput
                                  </div>
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Level of Service Accuracy
                                  </div>
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Denial Reduction
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-[14px] text-[#6B7280]">
                                Pricing: <span className="font-bold">Same as Outpatient</span> ({formatCurrency(inputs.monthlyCostPerProvider)}/provider/month)
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Nursing Card */}
                        <div
                          onClick={() => {
                            setSelectedNewCareSetting("nursing");
                            setCareSettingConfig(prev => ({
                              ...prev,
                              providers: 50,
                              encountersPerProvider: 1500,
                              customEncounters: 75000,
                              utilizationRate: 60,
                            }));
                            setCareSettingDrivers(new Set<LeverId>(["patientAccess", "overtime"]));
                          }}
                          className={`p-6 bg-white border rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedNewCareSetting === "nursing"
                              ? "border-2 border-[#E8532F] bg-[rgba(232,83,47,0.02)] border-l-4"
                              : "border-[#E5E7EB] hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                          }`}
                          data-testid="card-select-nursing"
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              selectedNewCareSetting === "nursing" ? "border-[#E8532F] bg-[#E8532F]" : "border-[#E5E7EB]"
                            }`}>
                              {selectedNewCareSetting === "nursing" && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Heart className="h-6 w-6 text-[#6B7280]" />
                                <span className="text-[18px] font-bold text-[#111827]">Nursing</span>
                              </div>
                              <p className="text-[14px] text-[#6B7280] mb-4">Bedside documentation, care coordination</p>
                              
                              <div className="border-t border-[#E5E7EB] pt-4 mb-4">
                                <p className="text-[13px] font-bold text-[#6B7280] mb-2">Typical Nursing characteristics:</p>
                                <ul className="text-[14px] text-[#6B7280] space-y-1 leading-relaxed">
                                  <li>• Different encounter patterns than physician settings</li>
                                  <li>• Focus on time savings and documentation quality</li>
                                  <li>• Significant overtime reduction opportunity</li>
                                </ul>
                              </div>
                              
                              <div className="mb-4">
                                <p className="text-[13px] font-bold text-[#6B7280] mb-2">Recommended drivers:</p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Time Savings
                                  </div>
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Overtime Reduction
                                  </div>
                                  <div className="flex items-center gap-2 text-[14px] text-[#111827]">
                                    <Check className="h-4 w-4 text-[#059669]" /> Documentation Quality
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-[14px] text-[#6B7280]">
                                Pricing: <span className="font-bold">Different structure</span> (contact for details)
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Inpatient Card (Coming Soon) */}
                        <div
                          className="p-6 bg-white border border-dashed border-[#E5E7EB] rounded-lg opacity-60 cursor-not-allowed"
                          data-testid="card-select-inpatient-disabled"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-5 h-5 rounded-full border-2 border-[#E5E7EB] shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Building2 className="h-6 w-6 text-[#6B7280]" />
                                <span className="text-[18px] font-bold text-[#111827]">Inpatient</span>
                                <span className="px-2 py-0.5 bg-[#F3F4F6] text-[11px] font-medium text-[#6B7280] uppercase rounded">
                                  Coming Soon
                                </span>
                              </div>
                              <p className="text-[14px] text-[#6B7280] mb-2">Hospital admissions, rounding, discharge</p>
                              <p className="text-[14px] text-[#6B7280]">In development - not yet available for modeling</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* CONFIGURATION SECTION (shown after selection) */}
                    {selectedNewCareSetting && (
                      <div className="space-y-6">
                        <div className="border-t border-[#E5E7EB] pt-6">
                          <h3 className="text-[16px] font-bold text-[#111827] mb-6">
                            Configure {selectedNewCareSetting === "ed" ? "Emergency Department" : "Nursing"}
                          </h3>
                          
                          {/* Nursing pricing note */}
                          {selectedNewCareSetting === "nursing" && (
                            <div className="mb-6 p-4 bg-[#FEF3C7] border border-[#F59E0B] rounded-lg">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[14px] font-bold text-[#92400E] mb-1">Pricing Note</p>
                                  <p className="text-[14px] text-[#92400E]">
                                    Nursing has a different pricing structure than physician settings. This scenario will show estimated value only. Contact your Abridge representative for specific pricing.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Scenario Name */}
                          <div className="mb-6">
                            <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-3">
                              Scenario Name
                            </label>
                            <input
                              type="text"
                              value={careSettingScenarioName}
                              onChange={(e) => setCareSettingScenarioName(e.target.value)}
                              placeholder={`Add ${selectedNewCareSetting === "ed" ? "Emergency Department" : "Nursing"} (${careSettingConfig.providers} providers)`}
                              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#E8532F]/20 focus:border-[#E8532F]"
                              data-testid="input-care-setting-scenario-name"
                            />
                            <p className="mt-2 text-[13px] text-[#6B7280]">Auto-updates based on your configuration</p>
                          </div>
                          
                          {/* Deployment Size */}
                          <div className="mb-6">
                            <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-3">
                              Deployment Size
                            </label>
                            
                            <div className="space-y-4">
                              {/* Providers */}
                              <div>
                                <label className="block text-[14px] text-[#111827] mb-2">
                                  {selectedNewCareSetting === "ed" ? "ED providers in scope" : "Nurses in scope"}
                                </label>
                                <input
                                  type="number"
                                  value={careSettingConfig.providers}
                                  onChange={(e) => setCareSettingConfig(prev => ({
                                    ...prev,
                                    providers: parseInt(e.target.value) || 0,
                                    customEncounters: (parseInt(e.target.value) || 0) * prev.encountersPerProvider,
                                  }))}
                                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#E8532F]/20 focus:border-[#E8532F]"
                                  data-testid="input-care-setting-providers"
                                />
                                <p className="mt-2 text-[13px] text-[#6B7280]">
                                  {selectedNewCareSetting === "ed" ? "Number of ED physicians and APPs" : "Number of nurses to deploy"}
                                </p>
                              </div>
                              
                              {/* Encounters */}
                              <div>
                                <label className="block text-[14px] text-[#111827] mb-2">
                                  Annual {selectedNewCareSetting === "ed" ? "ED" : "nursing"} encounters
                                </label>
                                
                                <div className="space-y-3">
                                  <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={careSettingConfig.encounterMode === "calculated"}
                                      onChange={() => setCareSettingConfig(prev => ({
                                        ...prev,
                                        encounterMode: "calculated",
                                        customEncounters: prev.providers * prev.encountersPerProvider,
                                      }))}
                                      className="mt-1 w-4 h-4 text-[#E8532F] focus:ring-[#E8532F]"
                                    />
                                    <div>
                                      <span className="text-[14px] text-[#111827]">Calculate from provider count</span>
                                      <p className="text-[13px] text-[#6B7280]">
                                        {careSettingConfig.providers} providers × {careSettingConfig.encountersPerProvider.toLocaleString()} encounters/provider = {(careSettingConfig.providers * careSettingConfig.encountersPerProvider).toLocaleString()}
                                      </p>
                                    </div>
                                  </label>
                                  
                                  <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={careSettingConfig.encounterMode === "custom"}
                                      onChange={() => setCareSettingConfig(prev => ({
                                        ...prev,
                                        encounterMode: "custom",
                                      }))}
                                      className="mt-1 w-4 h-4 text-[#E8532F] focus:ring-[#E8532F]"
                                    />
                                    <div className="flex-1">
                                      <span className="text-[14px] text-[#111827]">Enter custom volume</span>
                                      <input
                                        type="number"
                                        value={careSettingConfig.customEncounters}
                                        onChange={(e) => setCareSettingConfig(prev => ({
                                          ...prev,
                                          customEncounters: parseInt(e.target.value) || 0,
                                        }))}
                                        disabled={careSettingConfig.encounterMode !== "custom"}
                                        className="mt-2 w-full px-4 py-3 border border-[#E5E7EB] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#E8532F]/20 focus:border-[#E8532F] disabled:bg-[#F9FAFB] disabled:cursor-not-allowed"
                                        data-testid="input-care-setting-custom-encounters"
                                      />
                                    </div>
                                  </label>
                                </div>
                                
                                {selectedNewCareSetting === "ed" && (
                                  <div className="mt-3 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-start gap-2">
                                    <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                                    <p className="text-[13px] text-[#1E40AF]">
                                      ED providers typically see 3,000-8,000 encounters/year (higher than outpatient due to shift-based coverage)
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Utilization Rate */}
                              <div>
                                <label className="block text-[14px] text-[#111827] mb-2">
                                  Expected utilization rate
                                </label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={careSettingConfig.utilizationRate}
                                    onChange={(e) => setCareSettingConfig(prev => ({
                                      ...prev,
                                      utilizationRate: parseInt(e.target.value),
                                    }))}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                    data-testid="slider-care-setting-utilization"
                                  />
                                  <span className="text-[14px] font-bold text-[#111827] w-12 text-right">{careSettingConfig.utilizationRate}%</span>
                                </div>
                                <p className="mt-2 text-[13px] text-[#6B7280]">
                                  {selectedNewCareSetting === "ed" 
                                    ? "ED adoption often starts higher due to standardized workflows"
                                    : "Nursing adoption typically ramps up over 3-6 months"
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Value Drivers */}
                          <div className="mb-6">
                            <label className="block text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-3">
                              Value Drivers for {selectedNewCareSetting === "ed" ? "ED" : "Nursing"}
                            </label>
                            <p className="text-[14px] text-[#6B7280] mb-4">
                              Pre-selected based on {selectedNewCareSetting === "ed" ? "ED" : "Nursing"} workflows (adjust if needed):
                            </p>
                            
                            <div className="space-y-3">
                              {(selectedNewCareSetting === "ed" 
                                ? ["patientAccess", "wrvu", "denials", "overtime"] as LeverId[]
                                : ["patientAccess", "overtime", "workforce"] as LeverId[]
                              ).map((driverId) => {
                                const isSelected = careSettingDrivers.has(driverId);
                                const isExpanded = expandedCareSettingDriver === driverId;
                                
                                // Calculate driver value for this care setting
                                const encounters = careSettingConfig.encounterMode === "calculated"
                                  ? careSettingConfig.providers * careSettingConfig.encountersPerProvider
                                  : careSettingConfig.customEncounters;
                                const eligibleEncounters = encounters * (careSettingConfig.utilizationRate / 100);
                                
                                // Simplified driver value calculation for preview
                                let driverValue = 0;
                                if (driverId === "patientAccess") {
                                  const minutesSaved = (careSettingDriverAdjustments.patientAccess?.minutesSaved || 12);
                                  const hoursSaved = (eligibleEncounters * minutesSaved) / 60;
                                  const newVisitHours = hoursSaved * 0.3;
                                  driverValue = newVisitHours * 0.5 * 200;
                                } else if (driverId === "wrvu") {
                                  const baseWrvu = (careSettingDriverAdjustments.wrvu?.baselineWrvu || 2.8);
                                  const lift = (careSettingDriverAdjustments.wrvu?.qualityLift || 6) / 100;
                                  const revenue = (careSettingDriverAdjustments.wrvu?.revenuePerWrvu || 45);
                                  driverValue = eligibleEncounters * baseWrvu * lift * revenue;
                                } else if (driverId === "denials") {
                                  const denialRate = (careSettingDriverAdjustments.denials?.denialRate || 6) / 100;
                                  const prevention = (careSettingDriverAdjustments.denials?.preventionRate || 55) / 100;
                                  const avgRevenue = 350;
                                  driverValue = eligibleEncounters * avgRevenue * denialRate * prevention;
                                } else if (driverId === "overtime") {
                                  const hoursSaved = (eligibleEncounters * 12) / 60;
                                  const afterHoursPct = (careSettingDriverAdjustments.overtime?.afterHoursPct || 30) / 100;
                                  const rate = (careSettingDriverAdjustments.overtime?.premiumRate || 160);
                                  driverValue = hoursSaved * afterHoursPct * rate * 0.5;
                                } else if (driverId === "workforce") {
                                  driverValue = careSettingConfig.providers * 5000 * 0.05;
                                }
                                
                                return (
                                  <div
                                    key={driverId}
                                    className={`p-4 bg-white border rounded-lg transition-all duration-200 ${
                                      isSelected ? "border-[#E8532F] bg-[rgba(232,83,47,0.02)]" : "border-[#E5E7EB]"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <label className="flex items-start gap-3 cursor-pointer flex-1">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            const newSet = new Set(careSettingDrivers);
                                            if (newSet.has(driverId)) {
                                              newSet.delete(driverId);
                                            } else {
                                              newSet.add(driverId);
                                            }
                                            setCareSettingDrivers(newSet);
                                          }}
                                          className="mt-1 w-4 h-4 text-[#E8532F] focus:ring-[#E8532F] rounded"
                                        />
                                        <div>
                                          <span className="text-[14px] font-bold text-[#111827]">{leverLabels[driverId]}</span>
                                          <p className="text-[13px] text-[#6B7280] mt-1">
                                            {driverId === "patientAccess" && "Time returned enables faster patient flow"}
                                            {driverId === "wrvu" && (selectedNewCareSetting === "ed" ? "ED wRVU capture from complete documentation" : "Improved documentation quality")}
                                            {driverId === "denials" && (selectedNewCareSetting === "ed" ? "Prevent ED-specific documentation denials" : "Reduce documentation-related denials")}
                                            {driverId === "overtime" && "Reduce after-hours documentation"}
                                            {driverId === "workforce" && "Reduce burnout and turnover"}
                                          </p>
                                        </div>
                                      </label>
                                      <span className={`text-[14px] font-bold ${isSelected ? "text-[#059669]" : "text-[#6B7280]"}`}>
                                        +{formatCurrency(isSelected ? driverValue : 0)}
                                      </span>
                                    </div>
                                    
                                    {isSelected && (
                                      <button
                                        onClick={() => setExpandedCareSettingDriver(isExpanded ? null : driverId)}
                                        className="mt-3 text-[13px] text-[#E8532F] hover:underline flex items-center gap-1"
                                      >
                                        Adjust assumptions {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                      </button>
                                    )}
                                    
                                    {isSelected && isExpanded && (
                                      <div className="mt-3 p-4 bg-[#FFFBF5] border border-[#E5E7EB] rounded-lg">
                                        <p className="text-[13px] font-bold text-[#6B7280] uppercase mb-3">
                                          {selectedNewCareSetting === "ed" ? "ED" : "Nursing"}-Specific Assumptions
                                        </p>
                                        
                                        {driverId === "wrvu" && (
                                          <div className="space-y-4">
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Baseline wRVU per {selectedNewCareSetting === "ed" ? "ED" : ""} encounter</label>
                                              <input
                                                type="number"
                                                step="0.1"
                                                value={careSettingDriverAdjustments.wrvu?.baselineWrvu || 2.8}
                                                onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                  ...prev,
                                                  wrvu: { ...prev.wrvu, baselineWrvu: parseFloat(e.target.value) || 2.8 }
                                                }))}
                                                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg text-[14px]"
                                              />
                                              <p className="mt-1 text-[13px] text-[#6B7280]">ED typical range: 2.4-3.2 | Outpatient baseline: 1.75</p>
                                            </div>
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Documentation quality lift</label>
                                              <div className="flex items-center gap-4">
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="15"
                                                  value={careSettingDriverAdjustments.wrvu?.qualityLift || 6}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    wrvu: { ...prev.wrvu, qualityLift: parseInt(e.target.value) }
                                                  }))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                                />
                                                <span className="text-[14px] font-bold w-10 text-right">{careSettingDriverAdjustments.wrvu?.qualityLift || 6}%</span>
                                              </div>
                                              <p className="mt-1 text-[13px] text-[#6B7280]">ED often sees higher lift due to time-pressured docs. Typical range: 4-10%</p>
                                            </div>
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Revenue per wRVU</label>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[14px] text-[#6B7280]">$</span>
                                                <input
                                                  type="number"
                                                  value={careSettingDriverAdjustments.wrvu?.revenuePerWrvu || 45}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    wrvu: { ...prev.wrvu, revenuePerWrvu: parseInt(e.target.value) || 45 }
                                                  }))}
                                                  className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg text-[14px]"
                                                />
                                              </div>
                                              <p className="mt-1 text-[13px] text-[#6B7280]">Use your organization's ED conversion factor. Typical range: $35-60</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {driverId === "denials" && (
                                          <div className="space-y-4">
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Baseline denial rate</label>
                                              <div className="flex items-center gap-4">
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="15"
                                                  value={careSettingDriverAdjustments.denials?.denialRate || 6}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    denials: { ...prev.denials, denialRate: parseInt(e.target.value) }
                                                  }))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                                />
                                                <span className="text-[14px] font-bold w-10 text-right">{careSettingDriverAdjustments.denials?.denialRate || 6}%</span>
                                              </div>
                                              <p className="mt-1 text-[13px] text-[#6B7280]">ED typically has 5-8% denial rate due to time pressure</p>
                                            </div>
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Expected prevention rate</label>
                                              <div className="flex items-center gap-4">
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="100"
                                                  value={careSettingDriverAdjustments.denials?.preventionRate || 55}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    denials: { ...prev.denials, preventionRate: parseInt(e.target.value) }
                                                  }))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                                />
                                                <span className="text-[14px] font-bold w-10 text-right">{careSettingDriverAdjustments.denials?.preventionRate || 55}%</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {driverId === "overtime" && (
                                          <div className="space-y-4">
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">After-hours documentation percentage</label>
                                              <div className="flex items-center gap-4">
                                                <input
                                                  type="range"
                                                  min="0"
                                                  max="50"
                                                  value={careSettingDriverAdjustments.overtime?.afterHoursPct || 30}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    overtime: { ...prev.overtime, afterHoursPct: parseInt(e.target.value) }
                                                  }))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                                />
                                                <span className="text-[14px] font-bold w-10 text-right">{careSettingDriverAdjustments.overtime?.afterHoursPct || 30}%</span>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Premium rate ($/hour)</label>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[14px] text-[#6B7280]">$</span>
                                                <input
                                                  type="number"
                                                  value={careSettingDriverAdjustments.overtime?.premiumRate || 160}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    overtime: { ...prev.overtime, premiumRate: parseInt(e.target.value) || 160 }
                                                  }))}
                                                  className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg text-[14px]"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {driverId === "patientAccess" && (
                                          <div className="space-y-4">
                                            <div>
                                              <label className="block text-[14px] text-[#111827] mb-2">Minutes saved per encounter</label>
                                              <div className="flex items-center gap-4">
                                                <input
                                                  type="range"
                                                  min="5"
                                                  max="20"
                                                  value={careSettingDriverAdjustments.patientAccess?.minutesSaved || 12}
                                                  onChange={(e) => setCareSettingDriverAdjustments(prev => ({
                                                    ...prev,
                                                    patientAccess: { ...prev.patientAccess, minutesSaved: parseInt(e.target.value) }
                                                  }))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#E8532F]"
                                                />
                                                <span className="text-[14px] font-bold w-10 text-right">{careSettingDriverAdjustments.patientAccess?.minutesSaved || 12} min</span>
                                              </div>
                                              <p className="mt-1 text-[13px] text-[#6B7280]">ED typical: 10-15 min saved per encounter</p>
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
                        </div>
                        
                        {/* Footer actions */}
                        <div className="border-t border-[#E5E7EB] pt-6 flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowNewCareSetting(false)}
                            data-testid="button-cancel-care-setting"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={careSettingDrivers.size === 0}
                            onClick={() => {
                              // Use authoritative calculateCareSettingRoi helper
                              const csRoi = calculateCareSettingRoi();
                              
                              // Combined totals
                              const combinedBenefit = totalAnnualBenefit + csRoi.totalBenefit;
                              const combinedInvestment = annualInvestment + csRoi.investment;
                              const encounters = careSettingConfig.encounterMode === "calculated"
                                ? careSettingConfig.providers * careSettingConfig.encountersPerProvider
                                : careSettingConfig.customEncounters;
                              
                              const newScenario: Scenario = {
                                id: Date.now().toString(),
                                name: careSettingScenarioName.trim() || `Add ${selectedNewCareSetting === "ed" ? "Emergency Department" : "Nursing"} (${careSettingConfig.providers} ${selectedNewCareSetting === "ed" ? "providers" : "nurses"})`,
                                type: "setting",
                                createdAt: new Date(),
                                providers: inputs.numberOfProviders + careSettingConfig.providers,
                                encounters: inputs.annualOutpatientEncounters + encounters,
                                utilizationRate: inputs.abridgeUtilizationPct,
                                maPopulationPct: inputs.hcc.pctMedicareAdvantage || 15,
                                driverValues: { ...driverValues, ...csRoi.driverValues },
                                newPatientPct: 30,
                                specialtyPct: 40,
                                revenuePerVisitOverride: null,
                                visitLengthOverride: null,
                                totalBenefit: combinedBenefit,
                                investment: combinedInvestment,
                                netGain: combinedBenefit - combinedInvestment,
                                roiMultiple: combinedBenefit / combinedInvestment,
                              };
                              
                              setScenarios(prev => [...prev, newScenario]);
                              setShowNewCareSetting(false);
                              toast({
                                title: "Scenario saved",
                                description: `"${newScenario.name}" has been created`,
                              });
                            }}
                            className="bg-[#E8532F] hover:bg-[#D14729] text-white"
                            data-testid="button-save-care-setting-scenario"
                          >
                            Save Scenario
                          </Button>
                        </div>
                      </div>
                    )}
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
                          <span className="text-[14px] font-bold text-[#111827]">Combined Preview</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-[#059669]">
                              {(() => {
                                if (!selectedNewCareSetting) return formatCurrency(netAnnualGain);
                                const csRoi = calculateCareSettingRoi();
                                return formatCurrency(netAnnualGain + csRoi.netGain);
                              })()}
                            </span>
                            <ChevronDown className={`h-4 w-4 text-[#6B7280] transition-transform ${mobilePreviewOpen ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                      </div>
                      
                      <div className={`${mobilePreviewOpen ? "block" : "hidden"} lg:block`}>
                        <div className="bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
                          <div className="mb-4">
                            <h3 className="text-[14px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-1">
                              Combined Preview
                            </h3>
                            <p className="text-[13px] text-[#6B7280]">Current + new care setting</p>
                          </div>
                          
                          {!selectedNewCareSetting ? (
                            <div className="text-center py-8 text-[#6B7280]">
                              <Building2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                              <p className="text-[14px]">Select a care setting to see combined preview</p>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                // Use authoritative calculateCareSettingRoi helper
                                const csRoi = calculateCareSettingRoi();
                                const encounters = careSettingConfig.encounterMode === "calculated"
                                  ? careSettingConfig.providers * careSettingConfig.encountersPerProvider
                                  : careSettingConfig.customEncounters;
                                
                                const combinedBenefit = totalAnnualBenefit + csRoi.totalBenefit;
                                const combinedInvestment = annualInvestment + csRoi.investment;
                                const combinedNetGain = combinedBenefit - combinedInvestment;
                                const combinedRoi = combinedBenefit / combinedInvestment;
                                
                                return (
                                  <>
                                    {/* Current deployment */}
                                    <div className="mb-4">
                                      <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">{careSettingLabel} (Current)</div>
                                      <div className="space-y-1 text-[14px]">
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Providers</span>
                                          <span className="text-[#111827]">{inputs.numberOfProviders}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Net Gain</span>
                                          <span className="text-[#111827]">{formatCurrency(netAnnualGain)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-[24px] text-center text-[#6B7280] my-2">+</div>
                                    
                                    {/* New care setting */}
                                    <div className="mb-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] font-bold text-[#6B7280] uppercase">
                                          {selectedNewCareSetting === "ed" ? "Emergency Department" : "Nursing"}
                                        </span>
                                        <span className="px-1.5 py-0.5 bg-[#ECFDF5] text-[11px] font-bold text-[#059669] uppercase rounded">
                                          NEW
                                        </span>
                                      </div>
                                      <div className="space-y-1 text-[14px]">
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">{selectedNewCareSetting === "ed" ? "Providers" : "Nurses"}</span>
                                          <span className="text-[#059669] font-bold">+{careSettingConfig.providers}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Encounters</span>
                                          <span className="text-[#059669] font-bold">+{encounters.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Value</span>
                                          <span className="text-[#059669] font-bold">+{formatCurrency(csRoi.totalBenefit)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="border-t border-[#E5E7EB] my-4" />
                                    
                                    {/* Combined totals */}
                                    <div className="mb-4">
                                      <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Combined Totals</div>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-[14px]">
                                          <span className="text-[#6B7280]">Total Providers</span>
                                          <span className="font-bold text-[#111827]">{inputs.numberOfProviders + careSettingConfig.providers}</span>
                                        </div>
                                        <div className="flex justify-between text-[14px]">
                                          <span className="text-[#6B7280]">Total Benefit</span>
                                          <span className="font-bold text-[#111827]">{formatCurrency(combinedBenefit)}</span>
                                        </div>
                                        <div className="flex justify-between text-[14px]">
                                          <span className="text-[#6B7280]">Total Investment</span>
                                          <span className="font-bold text-[#111827]">{formatCurrency(combinedInvestment)}</span>
                                        </div>
                                        <div className="flex justify-between text-[16px] bg-[#F9FAFB] -mx-6 px-6 py-2">
                                          <span className="font-bold text-[#111827]">Net Gain</span>
                                          <span className="font-bold text-[#059669]">{formatCurrency(combinedNetGain)}</span>
                                        </div>
                                        <div className="flex justify-between text-[14px]">
                                          <span className="text-[#6B7280]">Combined ROI</span>
                                          <span className="font-bold text-[#111827]">{combinedRoi.toFixed(1)}x</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="border-t border-[#E5E7EB] my-4" />
                                    
                                    {/* 3-Year Projection */}
                                    <div className="mb-4">
                                      <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">3-Year Projection</div>
                                      <div className="space-y-1 text-[14px]">
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Total Value</span>
                                          <span className="font-bold text-[#111827]">{formatCurrency(combinedBenefit * 3)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-[#6B7280]">Net 3-Year</span>
                                          <span className="font-bold text-[#059669]">{formatCurrency(combinedNetGain * 3)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Key Insight */}
                                    <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                                      <div className="flex items-start gap-2">
                                        <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
                                        <div>
                                          <p className="text-[13px] font-bold text-[#1E40AF] mb-1">Key Insight</p>
                                          <p className="text-[14px] text-[#1E40AF]">
                                            Adding {selectedNewCareSetting === "ed" ? "Emergency Department" : "Nursing"} increases your total deployment to {inputs.numberOfProviders + careSettingConfig.providers} users with a combined ROI of {combinedRoi.toFixed(1)}x.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Expand Providers Card */}
                <button
                  onClick={() => {
                    initScenarioForm();
                    setCurrentScenarioType("expand");
                    setExpandProvidersMode("quick");
                    setEncounterScalingMode("proportional");
                    setShowExpandProviders(true);
                  }}
                  className="group bg-white border border-neutral-200/60 rounded-lg p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] text-center hover:border-[#E8532F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                  data-testid="card-expand-providers"
                >
                  <TrendingUp className="h-8 w-8 text-[#6B7280] mx-auto mb-4" />
                  <h4 className="text-[16px] font-bold text-[#111827] mb-4">Expand Providers</h4>
                  <div className="border-t border-[#E5E7EB] my-4" />
                  <p className="text-[14px] text-[#6B7280] leading-relaxed mb-4">
                    Add more users to your current deployment
                  </p>
                  <span className="inline-flex items-center gap-1 text-[14px] text-[#E8532F] group-hover:underline">
                    Start <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
                
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
                        type="number"
                        value={scenarioForm.providers}
                        onChange={(e) => setScenarioForm({ ...scenarioForm, providers: parseInt(e.target.value) || 0 })}
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
                          type="number"
                          value={scenarioForm.encounters}
                          onChange={(e) => setScenarioForm({ ...scenarioForm, encounters: parseInt(e.target.value) || 0 })}
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
                            type="number"
                            value={scenarioForm.revenuePerVisitOverride ?? ""}
                            onChange={(e) => setScenarioForm({ 
                              ...scenarioForm, 
                              revenuePerVisitOverride: e.target.value ? parseFloat(e.target.value) : null 
                            })}
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
                            {DRIVER_ESTIMATES[id].subtitle}
                          </div>
                          <div className="text-sm text-neutral-400 mt-1">
                            Est. value: {formatCurrency(DRIVER_ESTIMATES[id].min)}-{formatCurrency(DRIVER_ESTIMATES[id].max)} ({inputs.numberOfProviders} providers)
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
                            {DRIVER_ESTIMATES[id].subtitle}
                          </div>
                          <div className="text-sm text-neutral-400 mt-1">
                            Est. value: {formatCurrency(DRIVER_ESTIMATES[id].min)}-{formatCurrency(DRIVER_ESTIMATES[id].max)}
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
