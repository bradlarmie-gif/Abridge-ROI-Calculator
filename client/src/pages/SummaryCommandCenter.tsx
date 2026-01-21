import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Clock,
  TrendingUp,
  Copy,
  Check,
  Users,
  DollarSign,
  BarChart3,
  Plus,
  Mail,
  FileText,
  Lightbulb,
  Target,
  Rocket,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
const settingConfig: Record<string, { unitName: string; unitNamePlural: string; encounterName: string }> = {
  outpatient: { unitName: "provider", unitNamePlural: "providers", encounterName: "encounters" },
  ed: { unitName: "provider", unitNamePlural: "providers", encounterName: "encounters" },
  inpatient: { unitName: "hospitalist", unitNamePlural: "hospitalists", encounterName: "admissions" },
  nursing: { unitName: "staffed bed", unitNamePlural: "staffed beds", encounterName: "documentation events" },
};

// ============================================================================
// STAGE CARD COMPONENT
// ============================================================================

interface StageData {
  stage: "pilot" | "expand" | "fullScale";
  label: string;
  sublabel: string;
  units: number;
  utilization: number;
  encounters: number;
  value: number;
  investment: number;
  net: number;
  roi: string;
}

function StageCard({ 
  data, 
  unitNamePlural, 
  encounterName,
  variant 
}: { 
  data: StageData; 
  unitNamePlural: string; 
  encounterName: string;
  variant: "pilot" | "expand" | "fullScale";
}) {
  const variantStyles = {
    pilot: { 
      border: "border-[#E85D3F]", 
      bg: "bg-orange-50",
      icon: <MapPin className="w-5 h-5 text-[#E85D3F]" />,
      barColor: "bg-[#E85D3F]"
    },
    expand: { 
      border: "border-neutral-300", 
      bg: "bg-neutral-50",
      icon: <TrendingUp className="w-5 h-5 text-neutral-500" />,
      barColor: "bg-neutral-400"
    },
    fullScale: { 
      border: "border-emerald-500", 
      bg: "bg-emerald-50",
      icon: <Rocket className="w-5 h-5 text-emerald-600" />,
      barColor: "bg-emerald-500"
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`p-5 rounded-xl border-2 ${style.border} ${style.bg}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {style.icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">{data.label}</h3>
          <p className="text-xs text-[#6B7280]">{data.sublabel}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="font-mono font-bold text-lg text-[#111827]">{data.units}</div>
          <div className="text-xs text-[#6B7280]">{unitNamePlural}</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-lg text-[#111827]">{data.utilization}%</div>
          <div className="text-xs text-[#6B7280]">utilization</div>
        </div>
        <div className="text-center">
          <div className="font-mono font-bold text-lg text-[#111827]">{data.encounters.toLocaleString()}</div>
          <div className="text-xs text-[#6B7280]">{encounterName}</div>
        </div>
      </div>

      {/* Financials */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Value</span>
          <span className="font-mono text-[#111827]">{formatCurrency(data.value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Investment</span>
          <span className="font-mono text-[#6B7280]">{formatCurrency(data.investment)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-neutral-200">
          <span className="font-medium text-[#111827]">Net</span>
          <span className="font-mono font-bold text-emerald-600">{formatCurrency(data.net)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">ROI</span>
          <span className="font-mono font-semibold text-[#111827]">{data.roi}x</span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`h-1 mt-4 rounded-full ${style.barColor}`} />
    </div>
  );
}

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
  
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting] || settingConfig.outpatient;
  const isNursingSetting = selectedSettings.includes("nursing");
  
  // Get current units (providers or beds)
  const currentUnits = isNursingSetting 
    ? (modelResults.nursingStaffedBeds || 200)
    : modelResults.providers;
  
  // Initialize full scale state
  const [fullScaleUnits, setFullScaleUnits] = useState(Math.round(currentUnits * 7.5));
  const [fullScaleUtilization, setFullScaleUtilization] = useState(75);
  
  // Core pilot calculations
  const totalAnnualValue = modelResults.totalBenefit;
  const annualInvestment = modelResults.investment || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  // Encounters and value per encounter
  const totalEncounters = modelResults.encounters;
  const utilizationRate = modelResults.utilizationRate / 100;
  const pilotEncounters = totalEncounters * utilizationRate;
  const valuePerEncounter = pilotEncounters > 0 ? totalAnnualValue / pilotEncounters : 0;
  const encountersPerUnit = currentUnits > 0 ? totalEncounters / currentUnits : 0;
  
  // Price per unit
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  // ============ PILOT STAGE ============
  const pilot = useMemo((): StageData => ({
    stage: "pilot",
    label: "PILOT",
    sublabel: "You are here",
    units: currentUnits,
    utilization: Math.round(utilizationRate * 100),
    encounters: Math.round(pilotEncounters),
    value: totalAnnualValue,
    investment: annualInvestment,
    net: netValue,
    roi: roiMultiple.toFixed(1)
  }), [currentUnits, utilizationRate, pilotEncounters, totalAnnualValue, annualInvestment, netValue, roiMultiple]);
  
  // ============ EXPAND STAGE (~3x pilot, 65% utilization) ============
  const expand = useMemo((): StageData => {
    const units = Math.round(currentUnits * 3);
    const utilization = 0.65;
    const encounters = units * encountersPerUnit * utilization;
    const value = encounters * valuePerEncounter;
    const investment = units * pricePerUnit * 12;
    return {
      stage: "expand",
      label: "EXPAND",
      sublabel: "Next phase",
      units,
      utilization: 65,
      encounters: Math.round(encounters),
      value: Math.round(value),
      investment: Math.round(investment),
      net: Math.round(value - investment),
      roi: investment > 0 ? (value / investment).toFixed(1) : "0"
    };
  }, [currentUnits, encountersPerUnit, valuePerEncounter, pricePerUnit]);
  
  // ============ FULL SCALE STAGE (user customizable) ============
  const fullScale = useMemo((): StageData => {
    const units = fullScaleUnits;
    const utilization = fullScaleUtilization / 100;
    const encounters = units * encountersPerUnit * utilization;
    const value = encounters * valuePerEncounter;
    const investment = units * pricePerUnit * 12;
    return {
      stage: "fullScale",
      label: "FULL SCALE",
      sublabel: "Your opportunity",
      units,
      utilization: fullScaleUtilization,
      encounters: Math.round(encounters),
      value: Math.round(value),
      investment: Math.round(investment),
      net: Math.round(value - investment),
      roi: investment > 0 ? (value / investment).toFixed(1) : "0"
    };
  }, [fullScaleUnits, fullScaleUtilization, encountersPerUnit, valuePerEncounter, pricePerUnit]);
  
  // Chart data
  const chartData = [
    { name: "Pilot", value: pilot.value, stage: "pilot" },
    { name: "Expand", value: expand.value, stage: "expand" },
    { name: "Full Scale", value: fullScale.value, stage: "fullScale" }
  ];
  
  // Expansion potential
  const expansionPotential = fullScale.net - pilot.net;
  
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
  
  // Multi-year projection (10% growth)
  const year1 = totalAnnualValue;
  const year2 = Math.round(totalAnnualValue * 1.10);
  const year3 = Math.round(totalAnnualValue * 1.21);
  const threeYearValue = year1 + year2 + year3;
  const threeYearCost = annualInvestment * 3;
  const threeYearNet = threeYearValue - threeYearCost;
  
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
                <span className="text-neutral-300">|</span>
                <span className="text-[#6B7280]">{currentUnits} {config.unitNamePlural}</span>
                <span className="text-neutral-300">|</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(netValue)} net value</span>
                <span className="text-neutral-300">|</span>
                <span className="text-emerald-600 font-semibold">{roiMultiple.toFixed(1)}x ROI</span>
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
            <span className="text-neutral-300 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-neutral-400" />
              <span>Annual Investment: <span className="font-semibold text-[#111827]">{formatCurrency(annualInvestment)}</span></span>
            </div>
          </div>
        </section>

        {/* ============ YOUR JOURNEY WITH ABRIDGE ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#111827] mb-1">
              Your Journey with Abridge
            </h2>
            <p className="text-sm text-[#6B7280]">
              Start with a pilot. Prove the value. Scale across your organization.
            </p>
          </div>
          
          {/* Journey Chart */}
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 14, fontWeight: 500 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Annual Value"]}
                  contentStyle={{ 
                    background: "#1e293b", 
                    border: "none", 
                    borderRadius: "8px",
                    color: "white",
                    padding: "8px 12px"
                  }}
                  labelStyle={{ color: "white" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={100}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={index}
                      fill={
                        entry.stage === "pilot" ? "#E85D3F" :
                        entry.stage === "expand" ? "#94a3b8" :
                        "#059669"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stage Labels */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="flex flex-col items-center gap-1">
              <MapPin className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-xs text-[#6B7280]">You are here</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <span className="text-xs text-[#6B7280]">Next phase</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Rocket className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-[#6B7280]">Your opportunity</span>
            </div>
          </div>
          
          {/* Stage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StageCard data={pilot} unitNamePlural={config.unitNamePlural} encounterName={config.encounterName} variant="pilot" />
            <StageCard data={expand} unitNamePlural={config.unitNamePlural} encounterName={config.encounterName} variant="expand" />
            <StageCard data={fullScale} unitNamePlural={config.unitNamePlural} encounterName={config.encounterName} variant="fullScale" />
          </div>
          
          {/* Key Insight */}
          <div className="flex gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl mb-8">
            <div className="p-2 bg-amber-100 rounded-lg h-fit">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111827] mb-1">KEY INSIGHT</h4>
              <p className="text-sm text-[#6B7280] mb-2">
                ROI improves as you scale. Higher utilization + more {config.unitNamePlural} = more value 
                per dollar invested. The pilot proves it works. Expansion captures the full opportunity.
              </p>
              <p className="text-sm font-medium text-[#111827]">
                From pilot to full scale: <span className="text-emerald-600 font-bold">+{formatCurrency(expansionPotential)}</span> additional annual value
              </p>
            </div>
          </div>
          
          {/* Customize Full Scale */}
          <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-[#E85D3F]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Customize Your Full Scale Opportunity
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              {/* Total units slider */}
              <div>
                <label className="block text-sm text-[#6B7280] mb-3">
                  Total {config.unitNamePlural} in your organization
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#6B7280] w-8">{currentUnits}</span>
                  <Slider
                    value={[fullScaleUnits]}
                    onValueChange={([val]) => setFullScaleUnits(val)}
                    min={currentUnits}
                    max={currentUnits * 15}
                    step={Math.max(1, Math.round(currentUnits / 10))}
                    className="flex-1"
                    data-testid="fullscale-units-slider"
                  />
                  <span className="text-xs text-[#6B7280] w-12">{currentUnits * 15}</span>
                </div>
                <div className="mt-2 text-center">
                  <span className="font-mono font-bold text-lg text-[#111827]">{fullScaleUnits}</span>
                  <span className="text-sm text-[#6B7280] ml-2">{config.unitNamePlural}</span>
                </div>
              </div>
              
              {/* Utilization slider */}
              <div>
                <label className="block text-sm text-[#6B7280] mb-3">
                  Expected utilization at full adoption
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#6B7280] w-8">50%</span>
                  <Slider
                    value={[fullScaleUtilization]}
                    onValueChange={([val]) => setFullScaleUtilization(val)}
                    min={50}
                    max={90}
                    step={5}
                    className="flex-1"
                    data-testid="fullscale-utilization-slider"
                  />
                  <span className="text-xs text-[#6B7280] w-8">90%</span>
                </div>
                <div className="mt-2 text-center">
                  <span className="font-mono font-bold text-lg text-[#111827]">{fullScaleUtilization}%</span>
                  <span className="text-sm text-[#6B7280] ml-2">utilization</span>
                </div>
              </div>
            </div>
            
            {/* Full Scale Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
              <div className="text-center">
                <div className="font-mono font-bold text-xl text-[#111827]">{fullScale.encounters.toLocaleString()}</div>
                <div className="text-xs text-[#6B7280]">{config.encounterName}</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-xl text-emerald-600">{formatCurrency(fullScale.value)}</div>
                <div className="text-xs text-[#6B7280]">value</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-xl text-[#111827]">{fullScale.roi}x</div>
                <div className="text-xs text-[#6B7280]">ROI</div>
              </div>
            </div>
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
                      <th className="text-right pb-2">3-Yr Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 text-[#6B7280]">Value</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year1)}</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year2)}</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(year3)}</td>
                      <td className="py-1 text-right font-mono">{formatCompactCurrency(threeYearValue)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-[#6B7280]">Cost</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-1 text-right font-mono text-[#6B7280]">{formatCompactCurrency(threeYearCost)}</td>
                    </tr>
                    <tr className="border-t border-slate-300">
                      <td className="py-2 font-medium text-[#111827]">Net</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year1 - annualInvestment)}</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year2 - annualInvestment)}</td>
                      <td className="py-2 text-right font-mono font-medium text-emerald-600">{formatCompactCurrency(year3 - annualInvestment)}</td>
                      <td className="py-2 text-right font-mono font-bold text-emerald-600">{formatCompactCurrency(threeYearNet)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#6B7280] mt-4">Assumes 10% annual value growth with increased adoption</p>
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
              <span>{currentUnits} {config.unitNamePlural} in pilot with {totalEncounters.toLocaleString()} total {config.encounterName}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>{Math.round(utilizationRate * 100)}% utilization rate = {Math.round(pilotEncounters).toLocaleString()} Abridge-documented {config.encounterName}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>Investment of {formatCurrency(annualInvestment)} annually at ${pricePerUnit}/{config.unitName}/month</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>Value scales linearly with {config.unitNamePlural} and utilization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>10% annual value growth assumed for multi-year projection</span>
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
