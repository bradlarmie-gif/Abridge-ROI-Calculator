import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  seedInputs?: Partial<RoiInputs>;
  onBack: () => void;
}

type TabId = "summary" | "detailed" | "scenarios" | "export";

// Scenario type definition
interface Scenario {
  id: string;
  name: string;
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
  workforce: { min: 160000, max: 240000, subtitle: "Lower burnout and turnover by reducing admin burden" },
  overtime: { min: 100000, max: 180000, subtitle: "Reduce premium labor costs from documentation backlog" },
  hcc: { min: 180000, max: 400000, subtitle: "Improve RAF scores through complete documentation" },
  denials: { min: 120000, max: 180000, subtitle: "Reduce claims denied due to documentation issues" },
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
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, number>>({});

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

  // All available driver IDs
  const allDriverIds: LeverId[] = ["patientAccess", "workforce", "overtime", "wrvu", "denials", "hcc"];
  
  // Enabled drivers (from inputs.levers)
  const enabledDriverIds = allDriverIds.filter((id) => inputs.levers[id]);
  
  // Drivers not yet enabled (for the modal)
  const availableDrivers = allDriverIds.filter((id) => !inputs.levers[id]);
  
  // Capacity & Labor drivers
  const capacityLaborIds: LeverId[] = ["patientAccess", "workforce", "overtime"];
  const revenueRiskIds: LeverId[] = ["wrvu", "denials", "hcc"];

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

  // Helper: get local value or fallback to model
  const getLocalOrModel = (key: string, modelValue: number) => {
    return localAdjustments[key] ?? modelValue;
  };

  // Helper: reset local adjustments
  const resetLocalAdjustments = () => {
    setLocalAdjustments({});
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
    
    // Scale denials netCollectibleRevenue proportionally to encounters
    scenarioInputs.denials.netCollectibleRevenue = Math.round(inputs.denials.netCollectibleRevenue * encounterRatio);
    
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
    
    // Apply MA population to HCC (scale impactedMaPatients proportionally)
    const maPatientsRatio = form.maPopulationPct / 15; // 15% is default
    scenarioInputs.hcc.impactedMaPatients = Math.round(inputs.hcc.impactedMaPatients * maPatientsRatio * encounterRatio);
    
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
    
    const newScenario: Scenario = {
      id: editingScenarioId || Date.now().toString(),
      name,
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
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  Results Dashboard
                </h1>
                <p className="text-sm text-neutral-500">
                  Your ROI model is ready
                </p>
              </div>
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
              className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm"
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

            {/* VALUE BREAKDOWN */}
            <section
              className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm"
              data-testid="section-value-breakdown"
            >
              <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-6">
                Value Breakdown
              </h2>

              {/* Stacked Bar Chart */}
              {enabledDriverIds.length > 0 ? (
                <>
                  <div className="h-12 rounded-lg overflow-hidden flex mb-6" data-testid="chart-stacked-bar">
                    {enabledDriverIds.map((id) => {
                      const value = driverValues[id];
                      const percentage = totalAnnualBenefit > 0 ? (value / totalAnnualBenefit) * 100 : 0;
                      if (percentage <= 0) return null;
                      return (
                        <div
                          key={id}
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: DRIVER_COLORS[id],
                          }}
                          title={`${leverLabels[id]}: ${formatCurrency(value)} (${percentage.toFixed(0)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Driver List */}
                  <div className="space-y-4 mb-6">
                    {enabledDriverIds.map((id) => {
                      const value = driverValues[id];
                      const percentage = totalAnnualBenefit > 0 ? (value / totalAnnualBenefit) * 100 : 0;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between py-2"
                          data-testid={`driver-row-${id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-sm shrink-0"
                              style={{ backgroundColor: DRIVER_COLORS[id] }}
                            />
                            <span className="text-sm font-medium text-neutral-900">
                              {leverLabels[id]}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-mono text-neutral-900">
                              {formatCurrency(value)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                        Total Annual Benefit
                      </span>
                      <span className="text-lg font-bold font-mono text-neutral-900">
                        {formatCurrency(totalAnnualBenefit)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  <p>No drivers selected. Add drivers to see your value breakdown.</p>
                </div>
              )}

              {/* Add Another Driver Button */}
              {availableDrivers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setAddDriverModalOpen(true)}
                    data-testid="button-add-driver"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Driver
                  </Button>
                </div>
              )}
            </section>

            {/* WHAT'S NEXT */}
            <section data-testid="section-whats-next">
              <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-6">
                What's Next?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Deep Dive */}
                <button
                  onClick={() => setActiveTab("detailed")}
                  className="group bg-white rounded-2xl border border-neutral-200 p-6 text-left hover:shadow-md transition-all"
                  data-testid="card-deep-dive"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mb-2">
                    Deep Dive into Drivers
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Review calculations & adjust assumptions
                  </p>
                </button>

                {/* Card 2: Growth Scenarios */}
                <button
                  onClick={() => setActiveTab("scenarios")}
                  className="group bg-white rounded-2xl border border-neutral-200 p-6 text-left hover:shadow-md transition-all"
                  data-testid="card-scenarios"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mb-2">
                    Model Growth Scenarios
                  </h3>
                  <p className="text-sm text-neutral-500">
                    See what expansion looks like
                  </p>
                </button>

                {/* Card 3: Download Summary */}
                <button
                  onClick={() => setActiveTab("export")}
                  className="group bg-white rounded-2xl border border-neutral-200 p-6 text-left hover:shadow-md transition-all"
                  data-testid="card-export"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mb-2">
                    Download Summary
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Create executive PDF
                  </p>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "detailed" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
              <h2 className="text-xs font-bold text-[#F03319] uppercase tracking-wide mb-2">
                Driver Deep Dive
              </h2>
              <p className="text-sm text-neutral-600">
                Review calculations and adjust assumptions based on your organization's specifics
              </p>
            </div>

            {/* Driver Cards */}
            <div className="space-y-4">
              {enabledDriverIds.map((driverId) => {
                const DriverIcon = DRIVER_ICONS[driverId];
                const driverValue = driverValues[driverId];
                const isExpanded = expandedDriver === driverId;

                return (
                  <div
                    key={driverId}
                    className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden transition-all duration-300"
                    data-testid={`driver-card-${driverId}`}
                  >
                    {/* Collapsed Header (always visible) */}
                    <button
                      onClick={() => toggleDriverExpansion(driverId)}
                      className="w-full flex items-center justify-between p-6 hover:bg-neutral-50 transition-colors"
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
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Time Returned</span>
                                  <div className="text-neutral-700">
                                    {inputs.minutesSavedPerEncounter} min × {encountersWithAbridge.toLocaleString()} encounters = <span className="text-[#F03319] font-semibold">{totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hours</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Realized Capacity</span>
                                  <div className="text-neutral-700">
                                    {totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hours × {inputs.patientAccess.pctTimeToNewVisits}% realization = <span className="text-[#F03319] font-semibold">{(totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} usable hours</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: New Visit Capacity</span>
                                  <div className="text-neutral-700">
                                    {(totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} hours ÷ {inputs.patientAccess.avgVisitDurationMinutes} min per visit = <span className="text-[#F03319] font-semibold">{((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (inputs.patientAccess.avgVisitDurationMinutes / 60)).toLocaleString(undefined, { maximumFractionDigits: 0 })} new visits</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 4: Revenue Impact</span>
                                  <div className="text-neutral-700">
                                    {((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (inputs.patientAccess.avgVisitDurationMinutes / 60)).toLocaleString(undefined, { maximumFractionDigits: 0 })} visits × ${inputs.patientAccess.avgNetRevenuePerVisit} = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: Average visit length */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Average visit length
                                  </label>
                                  <div className="flex items-center gap-4 mb-2">
                                    <Slider
                                      value={[getLocalOrModel("avgVisitDurationMinutes", inputs.patientAccess.avgVisitDurationMinutes)]}
                                      onValueChange={([val]) => setLocalAdjustments((prev) => ({ ...prev, avgVisitDurationMinutes: val }))}
                                      min={20}
                                      max={45}
                                      step={1}
                                      className="flex-1"
                                      data-testid="slider-visit-length"
                                    />
                                    <span className="text-sm font-mono text-neutral-900 w-16 text-right">
                                      {getLocalOrModel("avgVisitDurationMinutes", inputs.patientAccess.avgVisitDurationMinutes)} min
                                    </span>
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our visits are longer"</p>
                                    <p>Impact: Longer visits means fewer new visit slots</p>
                                    {localAdjustments.avgVisitDurationMinutes !== undefined && (
                                      <p className="text-[#F03319] font-semibold">
                                        New value: {formatCurrency(
                                          ((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (localAdjustments.avgVisitDurationMinutes / 60)) * getLocalOrModel("avgNetRevenuePerVisit", inputs.patientAccess.avgNetRevenuePerVisit)
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Input 2: Revenue per visit */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Revenue per visit
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("avgNetRevenuePerVisit", inputs.patientAccess.avgNetRevenuePerVisit)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, avgNetRevenuePerVisit: parseFloat(e.target.value) || 0 }))}
                                      className="w-32 font-mono"
                                      data-testid="input-revenue-per-visit"
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our reimbursement is different"</p>
                                    <p>What this is: Net collectible revenue per completed visit</p>
                                    {localAdjustments.avgNetRevenuePerVisit !== undefined && (
                                      <p className="text-[#F03319] font-semibold">
                                        New value: {formatCurrency(
                                          ((totalHoursReclaimed * inputs.patientAccess.pctTimeToNewVisits / 100) / (getLocalOrModel("avgVisitDurationMinutes", inputs.patientAccess.avgVisitDurationMinutes) / 60)) * localAdjustments.avgNetRevenuePerVisit
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? These are organization-specific and leadership may have different assumptions
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-patientAccess"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("patientAccess", {
                                    patientAccess: {
                                      ...inputs.patientAccess,
                                      avgVisitDurationMinutes: getLocalOrModel("avgVisitDurationMinutes", inputs.patientAccess.avgVisitDurationMinutes),
                                      avgNetRevenuePerVisit: getLocalOrModel("avgNetRevenuePerVisit", inputs.patientAccess.avgNetRevenuePerVisit),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-patientAccess"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* LEVEL OF SERVICE (wRVU) */}
                        {driverId === "wrvu" && (
                          <>
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Baseline wRVU Performance</span>
                                  <div className="text-neutral-700">
                                    {encountersWithAbridge.toLocaleString()} encounters × {inputs.baselineWrvuPerEncounter} wRVU = <span className="text-[#F03319] font-semibold">{(encountersWithAbridge * inputs.baselineWrvuPerEncounter).toLocaleString(undefined, { maximumFractionDigits: 0 })} current wRVUs</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Documentation Quality Lift</span>
                                  <div className="text-neutral-700">
                                    <span className="text-[#F03319] font-semibold">{inputs.wrvu.pctIncreaseWrvuPerEncounter}% improvement</span> (typical)
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: Additional wRVUs</span>
                                  <div className="text-neutral-700">
                                    {(encountersWithAbridge * inputs.baselineWrvuPerEncounter).toLocaleString(undefined, { maximumFractionDigits: 0 })} × {inputs.wrvu.pctIncreaseWrvuPerEncounter}% = <span className="text-[#F03319] font-semibold">{(encountersWithAbridge * inputs.baselineWrvuPerEncounter * inputs.wrvu.pctIncreaseWrvuPerEncounter / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} additional wRVUs</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 4: Revenue Impact</span>
                                  <div className="text-neutral-700">
                                    {(encountersWithAbridge * inputs.baselineWrvuPerEncounter * inputs.wrvu.pctIncreaseWrvuPerEncounter / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} wRVUs × ${inputs.wrvu.wrvuConversionFactor} = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: Baseline wRVU per encounter */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Baseline wRVU per encounter
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={getLocalOrModel("baselineWrvuPerEncounter", inputs.baselineWrvuPerEncounter)}
                                    onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, baselineWrvuPerEncounter: parseFloat(e.target.value) || 0 }))}
                                    className="w-32 font-mono"
                                    data-testid="input-baseline-wrvu"
                                  />
                                  <div className="text-xs text-neutral-500 space-y-1 mt-2">
                                    <p>Common pushback: "Our complexity is different"</p>
                                    <p>What this is: Current average work RVU per visit</p>
                                    <p>Tip: Check your MGMA data or billing reports</p>
                                  </div>
                                </div>

                                {/* Input 2: Revenue per wRVU */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Revenue per wRVU
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("wrvuConversionFactor", inputs.wrvu.wrvuConversionFactor)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, wrvuConversionFactor: parseFloat(e.target.value) || 0 }))}
                                      className="w-32 font-mono"
                                      data-testid="input-wrvu-conversion"
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our payer mix is different"</p>
                                    <p>What this is: Blended average across all payers</p>
                                    <p>Tip: Medicare is approx $36-40, Commercial is approx $50-80</p>
                                  </div>
                                </div>

                                {/* Real-time preview */}
                                {(localAdjustments.baselineWrvuPerEncounter !== undefined || localAdjustments.wrvuConversionFactor !== undefined) && (
                                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-sm font-semibold text-green-800">
                                      New value: {formatCurrency(
                                        encountersWithAbridge * 
                                        getLocalOrModel("baselineWrvuPerEncounter", inputs.baselineWrvuPerEncounter) * 
                                        (inputs.wrvu.pctIncreaseWrvuPerEncounter / 100) * 
                                        getLocalOrModel("wrvuConversionFactor", inputs.wrvu.wrvuConversionFactor)
                                      )}
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                      vs. current: {formatCurrency(driverValue)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? Payer mix and case complexity vary
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-wrvu"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("wrvu", {
                                    baselineWrvuPerEncounter: getLocalOrModel("baselineWrvuPerEncounter", inputs.baselineWrvuPerEncounter),
                                    wrvu: {
                                      ...inputs.wrvu,
                                      wrvuConversionFactor: getLocalOrModel("wrvuConversionFactor", inputs.wrvu.wrvuConversionFactor),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-wrvu"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* CLINICIAN RETENTION (workforce) */}
                        {driverId === "workforce" && (
                          <>
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Baseline Turnover</span>
                                  <div className="text-neutral-700">
                                    {inputs.workforce.providerCount} providers × {inputs.workforce.baselineAttritionRate}% turnover = <span className="text-[#F03319] font-semibold">{(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100).toFixed(1)} expected departures/year</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Abridge Impact</span>
                                  <div className="text-neutral-700">
                                    {(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100).toFixed(1)} departures × {inputs.workforce.pctAttritionLinkedToBurnout}% burnout-linked × {inputs.workforce.pctBurnoutExitsAvoided}% preventable = <span className="text-[#F03319] font-semibold">{(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100 * inputs.workforce.pctAttritionLinkedToBurnout / 100 * inputs.workforce.pctBurnoutExitsAvoided / 100).toFixed(2)} departures avoided</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: Cost Savings</span>
                                  <div className="text-neutral-700">
                                    {(inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100 * inputs.workforce.pctAttritionLinkedToBurnout / 100 * inputs.workforce.pctBurnoutExitsAvoided / 100).toFixed(2)} avoided × ${inputs.workforce.costPerDeparture.toLocaleString()} = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: Annual turnover rate */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Annual turnover rate
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("baselineAttritionRate", inputs.workforce.baselineAttritionRate)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, baselineAttritionRate: parseFloat(e.target.value) || 0 }))}
                                      className="w-24 font-mono"
                                      data-testid="input-turnover-rate"
                                    />
                                    <span className="text-neutral-500">%</span>
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our turnover is higher/lower"</p>
                                    <p>What this is: Percentage of providers who leave annually</p>
                                  </div>
                                </div>

                                {/* Input 2: Replacement cost per provider */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Replacement cost per provider
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("costPerDeparture", inputs.workforce.costPerDeparture)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, costPerDeparture: parseFloat(e.target.value) || 0 }))}
                                      className="w-40 font-mono"
                                      data-testid="input-replacement-cost"
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our replacement costs differ"</p>
                                    <p>What this is: Total cost to recruit, onboard, and ramp a new provider</p>
                                    <p>Tip: Includes recruiting, training, lost productivity, coverage costs</p>
                                  </div>
                                </div>

                                {/* Real-time preview */}
                                {(localAdjustments.baselineAttritionRate !== undefined || localAdjustments.costPerDeparture !== undefined) && (() => {
                                  const attrRate = getLocalOrModel("baselineAttritionRate", inputs.workforce.baselineAttritionRate);
                                  const cost = getLocalOrModel("costPerDeparture", inputs.workforce.costPerDeparture);
                                  const departures = inputs.workforce.providerCount * (attrRate / 100);
                                  const burnoutDep = departures * (inputs.workforce.pctAttritionLinkedToBurnout / 100);
                                  const avoided = burnoutDep * (inputs.workforce.pctBurnoutExitsAvoided / 100);
                                  const newValue = avoided * cost;
                                  return (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-sm font-semibold text-green-800">
                                        New value: {formatCurrency(newValue)}
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        vs. current: {formatCurrency(driverValue)}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? Turnover rates and replacement costs vary by organization and specialty
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-workforce"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("workforce", {
                                    workforce: {
                                      ...inputs.workforce,
                                      baselineAttritionRate: getLocalOrModel("baselineAttritionRate", inputs.workforce.baselineAttritionRate),
                                      costPerDeparture: getLocalOrModel("costPerDeparture", inputs.workforce.costPerDeparture),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-workforce"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* HCC & CHRONIC CONDITION CAPTURE */}
                        {driverId === "hcc" && (
                          <>
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Identify MA Population</span>
                                  <div className="text-neutral-700">
                                    <span className="text-[#F03319] font-semibold">{inputs.hcc.impactedMaPatients.toLocaleString()} MA patients</span> in scope
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Diagnostic Gap</span>
                                  <div className="text-neutral-700">
                                    {inputs.hcc.impactedMaPatients.toLocaleString()} × {inputs.hcc.avgConditionsPerMember} conditions × {inputs.hcc.pctConditionsMissed}% gap = <span className="text-[#F03319] font-semibold">{(inputs.hcc.impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} conditions missed</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: Abridge Recapture</span>
                                  <div className="text-neutral-700">
                                    {(inputs.hcc.impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} missed × {inputs.hcc.pctMissedConditionsRecaptured}% recapture = <span className="text-[#F03319] font-semibold">{(inputs.hcc.impactedMaPatients * inputs.hcc.avgConditionsPerMember * inputs.hcc.pctConditionsMissed / 100 * inputs.hcc.pctMissedConditionsRecaptured / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} documented</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 4: RAF Score Impact</span>
                                  <div className="text-neutral-700">
                                    Conditions × {inputs.hcc.rafGainPerCondition} RAF weight × {100 - inputs.hcc.rafRealizationHaircut}% realization
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 5: Revenue Impact</span>
                                  <div className="text-neutral-700">
                                    RAF impact × ${inputs.hcc.pmpmBenchmark}/PMPM × 12 months = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: MA patients */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Medicare Advantage patients
                                  </label>
                                  <Input
                                    type="number"
                                    value={getLocalOrModel("impactedMaPatients", inputs.hcc.impactedMaPatients)}
                                    onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, impactedMaPatients: parseInt(e.target.value) || 0 }))}
                                    className="w-40 font-mono"
                                    data-testid="input-ma-patients"
                                  />
                                  <div className="text-xs text-neutral-500 space-y-1 mt-2">
                                    <p>Common pushback: "Our MA population is different"</p>
                                    <p>What this is: Number of patients in Medicare Advantage plans</p>
                                  </div>
                                </div>

                                {/* Input 2: Benchmark PMPM */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Benchmark PMPM rate
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("pmpmBenchmark", inputs.hcc.pmpmBenchmark)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, pmpmBenchmark: parseFloat(e.target.value) || 0 }))}
                                      className="w-32 font-mono"
                                      data-testid="input-pmpm"
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our capitation rates differ"</p>
                                    <p>What this is: Average per-member-per-month payment rate</p>
                                    <p>Tip: This is county/region-specific, typically $900-$1,400</p>
                                  </div>
                                </div>

                                {/* Real-time preview */}
                                {(localAdjustments.impactedMaPatients !== undefined || localAdjustments.pmpmBenchmark !== undefined) && (() => {
                                  const maPats = getLocalOrModel("impactedMaPatients", inputs.hcc.impactedMaPatients);
                                  const pmpm = getLocalOrModel("pmpmBenchmark", inputs.hcc.pmpmBenchmark);
                                  const totalConditions = maPats * inputs.hcc.avgConditionsPerMember;
                                  const missedConditions = totalConditions * (inputs.hcc.pctConditionsMissed / 100);
                                  const recaptured = missedConditions * (inputs.hcc.pctMissedConditionsRecaptured / 100);
                                  const newConditions = totalConditions * (inputs.hcc.pctNewConditionsIdentified / 100);
                                  const totalImproved = recaptured + newConditions;
                                  const rawRafPoints = totalImproved * inputs.hcc.rafGainPerCondition;
                                  const rawRafChange = maPats > 0 ? rawRafPoints / maPats : 0;
                                  const adjustedRafChange = rawRafChange * (1 - inputs.hcc.rafRealizationHaircut / 100);
                                  const newValue = maPats * adjustedRafChange * pmpm * 12;
                                  return (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-sm font-semibold text-green-800">
                                        New value: {formatCurrency(newValue)}
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        vs. current: {formatCurrency(driverValue)}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? MA population and regional payment rates vary significantly
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-hcc"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("hcc", {
                                    hcc: {
                                      ...inputs.hcc,
                                      impactedMaPatients: getLocalOrModel("impactedMaPatients", inputs.hcc.impactedMaPatients),
                                      pmpmBenchmark: getLocalOrModel("pmpmBenchmark", inputs.hcc.pmpmBenchmark),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-hcc"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* DENIAL REDUCTION */}
                        {driverId === "denials" && (
                          <>
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Baseline Denials</span>
                                  <div className="text-neutral-700">
                                    ${inputs.denials.netCollectibleRevenue.toLocaleString()} revenue × {inputs.denials.baselineDenialRate}% denial rate = <span className="text-[#F03319] font-semibold">{formatCurrency(inputs.denials.netCollectibleRevenue * inputs.denials.baselineDenialRate / 100)} denied annually</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Documentation-Related Denials</span>
                                  <div className="text-neutral-700">
                                    {formatCurrency(inputs.denials.netCollectibleRevenue * inputs.denials.baselineDenialRate / 100)} × {inputs.denials.pctDenialsFromDocumentation}% doc-related = <span className="text-[#F03319] font-semibold">{formatCurrency(inputs.denials.netCollectibleRevenue * inputs.denials.baselineDenialRate / 100 * inputs.denials.pctDenialsFromDocumentation / 100)}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: Abridge Prevention</span>
                                  <div className="text-neutral-700">
                                    {formatCurrency(inputs.denials.netCollectibleRevenue * inputs.denials.baselineDenialRate / 100 * inputs.denials.pctDenialsFromDocumentation / 100)} × {inputs.denials.pctDocDenialsRecovered}% preventable = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: Baseline denial rate */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Baseline denial rate
                                  </label>
                                  <div className="flex items-center gap-4 mb-2">
                                    <Slider
                                      value={[getLocalOrModel("baselineDenialRate", inputs.denials.baselineDenialRate)]}
                                      onValueChange={([val]) => setLocalAdjustments((prev) => ({ ...prev, baselineDenialRate: val }))}
                                      min={3}
                                      max={12}
                                      step={0.5}
                                      className="flex-1"
                                      data-testid="slider-denial-rate"
                                    />
                                    <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                                      {getLocalOrModel("baselineDenialRate", inputs.denials.baselineDenialRate)}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our denial rate is different"</p>
                                    <p>What this is: Percentage of submitted claims initially denied</p>
                                  </div>
                                </div>

                                {/* Input 2: Net collectible revenue */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Net collectible revenue (annual)
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("netCollectibleRevenue", inputs.denials.netCollectibleRevenue)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, netCollectibleRevenue: parseFloat(e.target.value) || 0 }))}
                                      className="w-48 font-mono"
                                      data-testid="input-net-revenue"
                                    />
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our reimbursement is different"</p>
                                    <p>What this is: Total annual net collectible revenue</p>
                                  </div>
                                </div>

                                {/* Real-time preview */}
                                {(localAdjustments.baselineDenialRate !== undefined || localAdjustments.netCollectibleRevenue !== undefined) && (() => {
                                  const revenue = getLocalOrModel("netCollectibleRevenue", inputs.denials.netCollectibleRevenue);
                                  const denialRate = getLocalOrModel("baselineDenialRate", inputs.denials.baselineDenialRate);
                                  const baselineDenied = revenue * (denialRate / 100);
                                  const docDenied = baselineDenied * (inputs.denials.pctDenialsFromDocumentation / 100);
                                  const newValue = docDenied * (inputs.denials.pctDocDenialsRecovered / 100);
                                  return (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-sm font-semibold text-green-800">
                                        New value: {formatCurrency(newValue)}
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        vs. current: {formatCurrency(driverValue)}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? Denial rates vary by specialty and payer mix
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-denials"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("denials", {
                                    denials: {
                                      ...inputs.denials,
                                      baselineDenialRate: getLocalOrModel("baselineDenialRate", inputs.denials.baselineDenialRate),
                                      netCollectibleRevenue: getLocalOrModel("netCollectibleRevenue", inputs.denials.netCollectibleRevenue),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-denials"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* OVERTIME COST AVOIDANCE */}
                        {driverId === "overtime" && (
                          <>
                            {/* Section 1: How We Calculated This */}
                            <div>
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                                How We Calculated This
                              </h3>
                              <div className="space-y-3 font-mono text-sm bg-neutral-50 rounded-lg p-4">
                                <div>
                                  <span className="text-neutral-500">Step 1: Hours Reclaimed</span>
                                  <div className="text-neutral-700">
                                    {inputs.minutesSavedPerEncounter} min × {encountersWithAbridge.toLocaleString()} encounters = <span className="text-[#F03319] font-semibold">{totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hours</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 2: Overtime Reduction</span>
                                  <div className="text-neutral-700">
                                    {totalHoursReclaimed.toLocaleString(undefined, { maximumFractionDigits: 0 })} hours × {inputs.overtime.pctOvertimeReduced}% converted = <span className="text-[#F03319] font-semibold">{(totalHoursReclaimed * inputs.overtime.pctOvertimeReduced / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} OT hours avoided</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Step 3: Cost Savings</span>
                                  <div className="text-neutral-700">
                                    {(totalHoursReclaimed * inputs.overtime.pctOvertimeReduced / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} hours × ${inputs.overtime.blendedOvertimeRate}/hr = <span className="text-[#F03319] font-semibold">{formatCurrency(driverValue)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Adjust For Your Organization */}
                            <div className="border-t border-neutral-100 pt-6">
                              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-6">
                                Adjust For Your Organization
                              </h3>
                              
                              <div className="space-y-8">
                                {/* Input 1: Overtime reduction percentage */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Percent of time converted to OT avoidance
                                  </label>
                                  <div className="flex items-center gap-4 mb-2">
                                    <Slider
                                      value={[getLocalOrModel("pctOvertimeReduced", inputs.overtime.pctOvertimeReduced)]}
                                      onValueChange={([val]) => setLocalAdjustments((prev) => ({ ...prev, pctOvertimeReduced: val }))}
                                      min={5}
                                      max={50}
                                      step={5}
                                      className="flex-1"
                                      data-testid="slider-ot-pct"
                                    />
                                    <span className="text-sm font-mono text-neutral-900 w-12 text-right">
                                      {getLocalOrModel("pctOvertimeReduced", inputs.overtime.pctOvertimeReduced)}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "We don't have much overtime"</p>
                                    <p>What this is: Share of reclaimed time that reduces premium labor</p>
                                  </div>
                                </div>

                                {/* Input 2: Blended overtime rate */}
                                <div>
                                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                                    Blended overtime rate
                                  </label>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-neutral-500">$</span>
                                    <Input
                                      type="number"
                                      value={getLocalOrModel("blendedOvertimeRate", inputs.overtime.blendedOvertimeRate)}
                                      onChange={(e) => setLocalAdjustments((prev) => ({ ...prev, blendedOvertimeRate: parseFloat(e.target.value) || 0 }))}
                                      className="w-32 font-mono"
                                      data-testid="input-ot-rate"
                                    />
                                    <span className="text-neutral-500">/hr</span>
                                  </div>
                                  <div className="text-xs text-neutral-500 space-y-1">
                                    <p>Common pushback: "Our rates are different"</p>
                                    <p>What this is: Average loaded cost of premium labor hours</p>
                                  </div>
                                </div>

                                {/* Real-time preview */}
                                {(localAdjustments.pctOvertimeReduced !== undefined || localAdjustments.blendedOvertimeRate !== undefined) && (() => {
                                  const otPct = getLocalOrModel("pctOvertimeReduced", inputs.overtime.pctOvertimeReduced);
                                  const otRate = getLocalOrModel("blendedOvertimeRate", inputs.overtime.blendedOvertimeRate);
                                  const otHoursAvoided = totalHoursReclaimed * (otPct / 100);
                                  const newValue = otHoursAvoided * otRate;
                                  return (
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-sm font-semibold text-green-800">
                                        New value: {formatCurrency(newValue)}
                                      </p>
                                      <p className="text-xs text-green-600 mt-1">
                                        vs. current: {formatCurrency(driverValue)}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Helper note */}
                              <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 rounded-lg">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-800">
                                  Why adjustable? Overtime patterns vary by organization and specialty
                                </p>
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-3 mt-6">
                                <Button
                                  variant="outline"
                                  onClick={resetLocalAdjustments}
                                  className="gap-2"
                                  data-testid="button-reset-overtime"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Reset to Model Setup
                                </Button>
                                <Button
                                  onClick={() => applyAdjustments("overtime", {
                                    overtime: {
                                      ...inputs.overtime,
                                      pctOvertimeReduced: getLocalOrModel("pctOvertimeReduced", inputs.overtime.pctOvertimeReduced),
                                      blendedOvertimeRate: getLocalOrModel("blendedOvertimeRate", inputs.overtime.blendedOvertimeRate),
                                    },
                                  })}
                                  className="bg-[#F03319] hover:bg-[#D92D16] text-white"
                                  data-testid="button-apply-overtime"
                                >
                                  Apply Changes
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state if no drivers */}
            {enabledDriverIds.length === 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm text-center">
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
            {/* Header */}
            <div>
              <h2 className="text-sm font-bold text-[#F03319] uppercase tracking-wide mb-1">
                Scenario Builder
              </h2>
              <p className="text-neutral-500 text-sm">
                Model what different deployment configurations could look like
              </p>
            </div>

            {/* Comparison View (if showing) */}
            {showComparison && (() => {
              const scenario = scenarios.find((s) => s.id === showComparison);
              if (!scenario) return null;
              
              const providerChange = ((scenario.providers - inputs.numberOfProviders) / inputs.numberOfProviders) * 100;
              const encounterChange = ((scenario.encounters - inputs.annualOutpatientEncounters) / inputs.annualOutpatientEncounters) * 100;
              const benefitChange = ((scenario.totalBenefit - totalAnnualBenefit) / totalAnnualBenefit) * 100;
              
              return (
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
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

            {/* Your Scenarios Section */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-4">
                Your Scenarios
              </h3>

              {/* Baseline Card (always present) */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-neutral-600" />
                  </div>
                  <span className="text-sm font-bold text-neutral-900">Current Model (Baseline)</span>
                  <Badge variant="secondary" className="text-xs">Locked</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                  <span>{inputs.numberOfProviders} providers</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-green-600 font-medium">{formatCurrency(netAnnualGain)} net gain</span>
                  <span className="text-neutral-300">|</span>
                  <span className="font-medium">{roiMultiple.toFixed(1)}x ROI</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBaselineDetails(!showBaselineDetails)}
                  className="text-xs gap-1"
                  data-testid="button-view-baseline"
                >
                  {showBaselineDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  View Details
                </Button>
                
                {/* Baseline Details */}
                {showBaselineDetails && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {enabledDriverIds.map((id) => (
                        <div key={id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-neutral-500">{leverLabels[id]}</span>
                          <span className="text-xs font-mono">{formatCurrency(driverValues[id])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Saved Scenarios */}
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="bg-white rounded-xl p-4 border border-neutral-200 mb-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-sm font-bold text-neutral-900">{scenario.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                    <span>{scenario.providers} providers</span>
                    <span className="text-neutral-300">|</span>
                    <span className="text-green-600 font-medium">{formatCurrency(scenario.netGain)} net gain</span>
                    <span className="text-neutral-300">|</span>
                    <span className="font-medium">{scenario.roiMultiple.toFixed(1)}x ROI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComparison(scenario.id)}
                      className="text-xs"
                      data-testid={`button-compare-${scenario.id}`}
                    >
                      View Comparison
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        initScenarioForm(scenario);
                        setShowScenarioForm(true);
                      }}
                      className="text-xs"
                      data-testid={`button-edit-${scenario.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScenario(scenario.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                      data-testid={`button-delete-${scenario.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {/* Empty state guidance */}
              {scenarios.length === 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    Create Your First Scenario
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Model different deployment configurations to explore:
                  </p>
                  <ul className="text-sm text-blue-600 space-y-1 mb-2">
                    <li>Expanding to more providers</li>
                    <li>Higher utilization as teams mature</li>
                    <li>Different specialty or payer mixes</li>
                  </ul>
                  <p className="text-xs text-blue-500">
                    Use scenarios to explore "what if" questions without changing your baseline model.
                  </p>
                </div>
              )}

              {/* Create New Scenario Button */}
              {!showScenarioForm && scenarios.length < 5 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    initScenarioForm();
                    setShowScenarioForm(true);
                  }}
                  className="w-full gap-2 mt-2"
                  data-testid="button-create-scenario"
                >
                  <Plus className="h-4 w-4" />
                  Create New Scenario
                </Button>
              )}
              
              {scenarios.length >= 5 && (
                <p className="text-sm text-neutral-500 text-center mt-2">
                  Maximum 5 scenarios. Delete one to create another.
                </p>
              )}
            </div>

            {/* Scenario Form */}
            {showScenarioForm && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
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
          </div>
        )}

        {activeTab === "export" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Export Summary
              </h2>
              <p className="text-neutral-500">
                Coming soon - Generate executive PDF reports
              </p>
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
    </div>
  );
}
