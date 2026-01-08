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
import {
  ArrowLeft,
  Plus,
  Search,
  TrendingUp,
  FileText,
  Check,
  Users,
  Calendar,
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  seedInputs?: Partial<RoiInputs>;
  onBack: () => void;
}

type TabId = "summary" | "detailed" | "scenarios" | "export";

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
  
  // Track enabled drivers
  const [enabledDrivers, setEnabledDrivers] = useState<Set<LeverId>>(() => {
    const set = new Set<LeverId>();
    selectedLevers.forEach((l) => {
      if (l.active) set.add(l.leverId as LeverId);
    });
    return set;
  });

  // Initialize inputs from seed
  const [inputs] = useState<RoiInputs>(() => {
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

  // Driver values from results
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
      if (enabledDrivers.has(lever.id)) {
        values[lever.id] = lever.value;
      }
    });
    return values;
  }, [results, enabledDrivers]);

  // Total annual benefit from enabled drivers only
  const totalAnnualBenefit = useMemo(() => {
    return Object.entries(driverValues).reduce((sum, [id, value]) => {
      return enabledDrivers.has(id as LeverId) ? sum + value : sum;
    }, 0);
  }, [driverValues, enabledDrivers]);

  // Annual investment
  const annualInvestment = useMemo(() => {
    return inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12;
  }, [inputs.numberOfProviders, inputs.monthlyCostPerProvider]);

  // Net annual gain and ROI
  const netAnnualGain = totalAnnualBenefit - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? totalAnnualBenefit / annualInvestment : 0;

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
  
  // Drivers not yet enabled (for the modal)
  const availableDrivers = allDriverIds.filter((id) => !enabledDrivers.has(id));
  
  // Capacity & Labor drivers
  const capacityLaborIds: LeverId[] = ["patientAccess", "workforce", "overtime"];
  const revenueRiskIds: LeverId[] = ["wrvu", "denials", "hcc"];

  // Handle adding new drivers
  const handleAddDrivers = () => {
    const newDrivers = new Set(enabledDrivers);
    selectedNewDrivers.forEach((id) => newDrivers.add(id));
    setEnabledDrivers(newDrivers);
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
              {enabledDrivers.size > 0 ? (
                <>
                  <div className="h-12 rounded-lg overflow-hidden flex mb-6" data-testid="chart-stacked-bar">
                    {Array.from(enabledDrivers).map((id) => {
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
                    {Array.from(enabledDrivers).map((id) => {
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
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-neutral-900 mb-2">
                Detailed Breakdown
              </h2>
              <p className="text-neutral-500">
                Coming soon - Review each driver's calculations and adjust assumptions
              </p>
            </div>
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
