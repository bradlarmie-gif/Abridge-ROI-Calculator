import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Clock,
  TrendingUp,
  Download,
  Copy,
  Check,
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Mail,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { type CareSettingType, CARE_SETTING_LABELS } from "@/lib/SETTING_CONFIG";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { type ModelResults } from "@/pages/ModelBuilder";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

interface SummaryCommandCenterProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  modelResults: ModelResults;
  onBack: () => void;
  onEditModel: () => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

// ============================================================================
// DRIVER CATEGORY MAPPING
// ============================================================================

const DRIVER_CATEGORIES: Record<string, { category: "labor" | "revenue"; label: string }> = {
  overtime: { category: "labor", label: "Overtime Reduction" },
  nursingOvertime: { category: "labor", label: "Overtime Reduction" },
  patient_access: { category: "revenue", label: "Patient Access" },
  retention: { category: "labor", label: "Provider Retention" },
  nursingRetention: { category: "labor", label: "Nurse Retention" },
  nursingAgency: { category: "labor", label: "Agency Reduction" },
  level_of_service: { category: "revenue", label: "Level of Service" },
  hcc_capture: { category: "revenue", label: "HCC Capture" },
  denials: { category: "revenue", label: "Denial Prevention" },
  nursingHAPI: { category: "revenue", label: "HAPI Prevention" },
  nursingSurvey: { category: "labor", label: "Staff Satisfaction" },
  nursingCareCoordination: { category: "labor", label: "Care Coordination" },
  edThroughput: { category: "revenue", label: "Patient Throughput" },
  edScribe: { category: "labor", label: "Scribe Cost Reduction" },
  edRetention: { category: "labor", label: "Physician Retention" },
  edLevelOfService: { category: "revenue", label: "Level-of-Service Accuracy" },
  edDenials: { category: "revenue", label: "Documentation-Related Denials" },
  inpatientRounding: { category: "labor", label: "Rounding Efficiency" },
  inpatientRetention: { category: "labor", label: "Hospitalist Retention" },
  inpatientCCMCC: { category: "revenue", label: "CC/MCC Capture" },
  inpatientCDI: { category: "labor", label: "CDI Query Reduction" },
  inpatientDenials: { category: "revenue", label: "Documentation-Related Denials" },
};

// Setting-specific configuration
const settingConfig: Record<string, { unitName: string; unitNamePlural: string }> = {
  outpatient: { unitName: "provider", unitNamePlural: "providers" },
  ed: { unitName: "provider", unitNamePlural: "providers" },
  inpatient: { unitName: "hospitalist", unitNamePlural: "hospitalists" },
  nursing: { unitName: "staffed bed", unitNamePlural: "staffed beds" },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SummaryCommandCenter({
  selectedSettings,
  selectedLevers,
  modelResults,
  onBack,
  onEditModel,
}: SummaryCommandCenterProps) {
  const [copied, setCopied] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState(0);
  
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting] || settingConfig.outpatient;
  const isNursingSetting = selectedSettings.includes("nursing");
  
  // Get current units (providers or beds)
  const currentUnits = isNursingSetting 
    ? (modelResults.nursingStaffedBeds || 200)
    : modelResults.providers;
  
  // Initialize expanded units on first render
  useMemo(() => {
    if (expandedUnits === 0) {
      setExpandedUnits(currentUnits * 5);
    }
  }, [currentUnits, expandedUnits]);
  
  // Core calculations
  const totalAnnualValue = modelResults.totalBenefit;
  const annualInvestment = modelResults.investment || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  // Value per unit (for scaling)
  const valuePerUnit = currentUnits > 0 ? totalAnnualValue / currentUnits : 0;
  const investmentPerUnit = currentUnits > 0 ? annualInvestment / currentUnits : 0;
  
  // Expanded calculations
  const expandedValue = valuePerUnit * expandedUnits;
  const expandedInvestment = investmentPerUnit * expandedUnits;
  const expandedNet = expandedValue - expandedInvestment;
  const expansionDelta = expandedNet - netValue;
  
  // Parse driver results for breakdown
  const valueBreakdown = useMemo(() => {
    const breakdown: { id: string; name: string; value: number; category: "labor" | "revenue" }[] = [];
    const driverResults = modelResults.driverResults || {};
    
    Object.entries(driverResults).forEach(([key, result]) => {
      if (result && result.value > 0) {
        const meta = DRIVER_CATEGORIES[key];
        breakdown.push({
          id: key,
          name: result.name || meta?.label || key,
          value: result.value,
          category: meta?.category || "revenue"
        });
      }
    });
    
    return breakdown.sort((a, b) => b.value - a.value);
  }, [modelResults.driverResults]);
  
  // Group by category
  const laborDrivers = valueBreakdown.filter(d => d.category === "labor");
  const revenueDrivers = valueBreakdown.filter(d => d.category === "revenue");
  const laborValue = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const revenueValue = revenueDrivers.reduce((sum, d) => sum + d.value, 0);
  const laborPercent = totalAnnualValue > 0 ? Math.round((laborValue / totalAnnualValue) * 100) : 0;
  const revenuePercent = 100 - laborPercent;
  
  // Chart data for scaling
  const scaleData = useMemo(() => {
    const points = [
      { units: currentUnits, value: totalAnnualValue, isCurrent: true, isExpanded: false },
    ];
    
    // Add scale points
    const multipliers = [2, 3, 4, 5, 6, 7, 8];
    multipliers.forEach(m => {
      const u = Math.round(currentUnits * m);
      if (u <= expandedUnits * 1.2) {
        points.push({ 
          units: u, 
          value: valuePerUnit * u, 
          isCurrent: false, 
          isExpanded: u === expandedUnits 
        });
      }
    });
    
    // Add expanded point if not already included
    if (!points.find(p => p.units === expandedUnits)) {
      points.push({ 
        units: expandedUnits, 
        value: expandedValue, 
        isCurrent: false, 
        isExpanded: true 
      });
    }
    
    return points.sort((a, b) => a.units - b.units);
  }, [currentUnits, expandedUnits, totalAnnualValue, valuePerUnit, expandedValue]);
  
  // Multi-year projection (10% growth)
  const yearlyGrowth = 1.10;
  const year1Value = totalAnnualValue;
  const year2Value = totalAnnualValue * yearlyGrowth;
  const year3Value = totalAnnualValue * yearlyGrowth * yearlyGrowth;
  const threeYearNetTotal = (year1Value + year2Value + year3Value) - (annualInvestment * 3);
  
  // Price per unit
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - breadcrumb */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Model Builder</span>
              </button>
              
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-neutral-100 rounded text-[#111827] font-medium">
                  {CARE_SETTING_LABELS[activeSetting]}
                </span>
                <span className="text-neutral-300">│</span>
                <span className="text-[#6B7280]">{currentUnits} {config.unitNamePlural}</span>
                <span className="text-neutral-300">│</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(netValue)} net value</span>
              </div>
            </div>
            
            {/* Right side - actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onEditModel}
                className="gap-2"
                data-testid="button-edit-model"
              >
                <Pencil className="w-4 h-4" />
                Edit Model
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-[#E85D3F] hover:bg-[#D14D32]"
                data-testid="button-export"
              >
                <Share2 className="w-4 h-4" />
                Export & Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* ============ YOUR ROI AT A GLANCE ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center mb-8">
            Your ROI at a Glance
          </h2>
          
          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Net Annual Value */}
            <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
              <div className="font-mono font-bold text-4xl text-emerald-600 mb-2" data-testid="summary-net-value">
                {formatCurrency(netValue)}
              </div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Net Annual Value
              </div>
            </div>
            
            {/* ROI Multiple */}
            <div className="bg-[#111827] rounded-xl p-6 text-center">
              <div className="font-mono font-bold text-4xl text-white mb-2" data-testid="summary-roi">
                {roiMultiple.toFixed(1)}x
              </div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Return on Investment
              </div>
            </div>
            
            {/* Payback Period */}
            <div className="bg-neutral-100 rounded-xl p-6 text-center border border-neutral-200">
              <div className="font-mono font-bold text-4xl text-[#111827] mb-2" data-testid="summary-payback">
                {paybackMonths < 1 ? "<1" : paybackMonths} mo
              </div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Payback Period
              </div>
            </div>
          </div>
          
          {/* Subtext */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#6B7280]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Total Annual Value: <span className="font-semibold text-[#111827]">{formatCurrency(totalAnnualValue)}</span></span>
            </div>
            <span className="text-neutral-300 hidden sm:inline">│</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-neutral-400" />
              <span>Annual Investment: <span className="font-semibold text-[#111827]">{formatCurrency(annualInvestment)}</span></span>
            </div>
          </div>
        </section>

        {/* ============ SCALE YOUR IMPACT ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Scale Your Impact
            </h2>
            <p className="text-sm text-[#6B7280]">See how value grows as you expand</p>
          </div>
          
          {/* Expansion Slider */}
          <div className="mb-8 p-6 bg-neutral-50 rounded-xl">
            <div className="flex justify-between text-sm text-[#6B7280] mb-4">
              <span>Current: <span className="font-semibold text-[#111827]">{currentUnits} {config.unitNamePlural}</span></span>
              <span>Expanded: <span className="font-semibold text-emerald-600">{expandedUnits} {config.unitNamePlural}</span></span>
            </div>
            <Slider
              value={[expandedUnits]}
              onValueChange={([val]) => setExpandedUnits(val)}
              min={currentUnits}
              max={currentUnits * 10}
              step={Math.max(1, Math.round(currentUnits / 10))}
              className="w-full"
              data-testid="expansion-slider"
            />
          </div>
          
          {/* Chart */}
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scaleData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis 
                  dataKey="units" 
                  tickFormatter={(v) => `${v}`}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  labelFormatter={(label) => `${label} ${config.unitNamePlural}`}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "8px 12px"
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {scaleData.map((entry, index) => (
                    <Cell 
                      key={index} 
                      fill={entry.isCurrent ? "#E85D3F" : entry.isExpanded ? "#059669" : "#E5E7EB"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-[#6B7280] uppercase tracking-wider mt-2">
              {config.unitNamePlural.toUpperCase()}
            </div>
          </div>
          
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Current State */}
            <div className="p-6 bg-neutral-50 rounded-xl border-2 border-[#E85D3F]">
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Current State</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">{config.unitNamePlural}</span>
                  <span className="font-mono font-semibold text-[#111827]">{currentUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Annual Value</span>
                  <span className="font-mono font-semibold text-[#111827]">{formatCurrency(totalAnnualValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Investment</span>
                  <span className="font-mono text-[#6B7280]">{formatCurrency(annualInvestment)}</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-[#111827]">Net Value</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(netValue)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expanded State */}
            <div className="p-6 bg-emerald-50 rounded-xl border-2 border-emerald-500">
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">Expanded State</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">{config.unitNamePlural}</span>
                  <span className="font-mono font-semibold text-[#111827]">{expandedUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Annual Value</span>
                  <span className="font-mono font-semibold text-[#111827]">{formatCurrency(expandedValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Investment</span>
                  <span className="font-mono text-[#6B7280]">{formatCurrency(expandedInvestment)}</span>
                </div>
                <div className="border-t border-emerald-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-[#111827]">Net Value</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(expandedNet)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expansion Potential */}
          <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mr-2">Expansion Potential:</span>
            <span className="font-mono font-bold text-2xl text-emerald-600">+{formatCurrency(expansionDelta)}/year</span>
          </div>
        </section>

        {/* ============ VALUE BREAKDOWN ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Value Breakdown
            </h2>
            <p className="text-sm text-[#6B7280]">Where your ROI comes from</p>
          </div>
          
          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Labor & Efficiency */}
            <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold text-[#111827] uppercase">Labor & Efficiency</span>
                </div>
                <span className="font-mono font-bold text-lg text-[#111827]">{formatCurrency(laborValue)}</span>
              </div>
              <p className="text-sm text-[#6B7280] mb-4">{laborPercent}% of total value</p>
              <div className="space-y-3">
                {laborDrivers.map((driver, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-100">
                    <span className="text-sm text-[#111827]">{driver.name}</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(driver.value)}</span>
                  </div>
                ))}
                {laborDrivers.length === 0 && (
                  <p className="text-sm text-[#6B7280] italic">No labor drivers selected</p>
                )}
              </div>
            </div>
            
            {/* Revenue & Quality */}
            <div className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-semibold text-[#111827] uppercase">Revenue & Quality</span>
                </div>
                <span className="font-mono font-bold text-lg text-[#111827]">{formatCurrency(revenueValue)}</span>
              </div>
              <p className="text-sm text-[#6B7280] mb-4">{revenuePercent}% of total value</p>
              <div className="space-y-3">
                {revenueDrivers.map((driver, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg border border-neutral-100">
                    <span className="text-sm text-[#111827]">{driver.name}</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(driver.value)}</span>
                  </div>
                ))}
                {revenueDrivers.length === 0 && (
                  <p className="text-sm text-[#6B7280] italic">No revenue drivers selected</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Visual Bar */}
          <div className="h-8 flex rounded-lg overflow-hidden">
            {laborPercent > 0 && (
              <div 
                className="bg-amber-400 flex items-center justify-center text-xs font-medium text-amber-900"
                style={{ width: `${laborPercent}%` }}
              >
                {laborPercent > 15 && `Labor & Efficiency (${laborPercent}%)`}
              </div>
            )}
            {revenuePercent > 0 && (
              <div 
                className="bg-emerald-400 flex items-center justify-center text-xs font-medium text-emerald-900"
                style={{ width: `${revenuePercent}%` }}
              >
                {revenuePercent > 15 && `Revenue & Quality (${revenuePercent}%)`}
              </div>
            )}
          </div>
        </section>

        {/* ============ INVESTMENT DETAILS ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-6">
            Investment Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Configuration */}
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Your Configuration</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Setting</span>
                  <span className="font-medium text-[#111827]">{CARE_SETTING_LABELS[activeSetting]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] capitalize">{config.unitNamePlural}</span>
                  <span className="font-medium text-[#111827]">{currentUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Price</span>
                  <span className="font-mono text-[#111827]">${pricePerUnit}/{config.unitName}/month</span>
                </div>
                <div className="border-t border-slate-300 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#111827]">Annual Investment</span>
                    <span className="font-mono font-bold text-[#111827]">{formatCurrency(annualInvestment)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Multi-Year Projection */}
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Multi-Year Projection</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#6B7280]">
                      <th className="text-left pb-2"></th>
                      <th className="text-right pb-2">Year 1</th>
                      <th className="text-right pb-2">Year 2</th>
                      <th className="text-right pb-2">Year 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 text-[#6B7280]">Value</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year1Value)}</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year2Value)}</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year3Value)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-[#6B7280]">Cost</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                    </tr>
                    <tr className="border-t border-slate-300">
                      <td className="py-2 font-medium text-[#111827]">Net</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year1Value - annualInvestment)}</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year2Value - annualInvestment)}</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year3Value - annualInvestment)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm font-medium text-[#111827]">3-Year Total Net Value</span>
                <span className="font-mono font-bold text-lg text-emerald-600">{formatCurrency(threeYearNetTotal)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ KEY ASSUMPTIONS ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4">
            Key Assumptions
          </h2>
          <ul className="space-y-2 text-sm text-[#6B7280]">
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>{currentUnits} {config.unitNamePlural} with {formatCurrency(modelResults.encounters * modelResults.utilizationRate / 100)} eligible {isNursingSetting ? "documentation events" : "encounters"}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>{modelResults.utilizationRate}% adoption rate for eligible {isNursingSetting ? "documentation" : "encounters"}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>Investment of {formatCurrency(annualInvestment)} annually</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>Value grows ~10% annually with increased adoption and expansion</span>
            </li>
          </ul>
        </section>

        {/* ============ ACTIONS ============ */}
        <section className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto"
            onClick={onEditModel}
            data-testid="button-add-driver"
          >
            <Plus className="w-4 h-4" />
            Add Another Driver
          </Button>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" data-testid="button-export-pdf">
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" data-testid="button-share-email">
              <Mail className="w-4 h-4" />
              Share via Email
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
