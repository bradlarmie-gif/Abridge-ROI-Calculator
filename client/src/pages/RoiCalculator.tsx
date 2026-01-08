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
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
            <div className="text-center py-16">
              <TrendingUp className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Scenario Builder
              </h2>
              <p className="text-neutral-500">
                Coming soon - Model expansion scenarios and compare outcomes
              </p>
            </div>
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
