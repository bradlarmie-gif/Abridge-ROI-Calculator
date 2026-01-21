import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Clock,
  TrendingUp,
  Copy,
  Check,
  DollarSign,
  BarChart3,
  Plus,
  Mail,
  FileText,
  Lightbulb,
  Target,
  Rocket,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { type CareSettingType, CARE_SETTING_LABELS } from "@/lib/SETTING_CONFIG";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { type ModelResults } from "@/pages/ModelBuilder";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
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
  onBackToJourney?: () => void;
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
// CUSTOM TOOLTIP COMPONENT
// ============================================================================

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { providers: number; utilization: number; value: number; roi: string } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1e293b] rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold text-sm mb-1">{data.providers} providers</p>
        <p className="text-neutral-300 text-xs mb-1">{data.utilization}% utilization</p>
        <p className="text-emerald-400 font-semibold text-sm">{formatCurrency(data.value)} value</p>
        <p className="text-neutral-300 text-xs">{data.roi}x ROI</p>
      </div>
    );
  }
  return null;
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
  onBackToJourney,
}: SummaryCommandCenterProps) {
  const [copied, setCopied] = useState(false);
  
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting] || settingConfig.outpatient;
  const isNursingSetting = selectedSettings.includes("nursing");
  
  // Get initial values from model
  const initialUnits = isNursingSetting 
    ? (modelResults.nursingStaffedBeds || 200)
    : modelResults.providers;
  const initialEncountersPerUnit = modelResults.encounters / Math.max(initialUnits, 1);
  const initialUtilization = modelResults.utilizationRate;
  
  // ============ EDITABLE STATE ============
  
  // Pilot (current)
  const [pilotUnits, setPilotUnits] = useState(initialUnits);
  const [encountersPerUnit, setEncountersPerUnit] = useState(Math.round(initialEncountersPerUnit));
  const [pilotUtilization, setPilotUtilization] = useState(initialUtilization);
  
  // Full Scale (opportunity)
  const [fullScaleUnits, setFullScaleUnits] = useState(initialUnits * 4);
  const [fullScaleUtilization, setFullScaleUtilization] = useState(75);
  
  // Core pilot calculations
  const totalAnnualValue = modelResults.totalBenefit;
  const annualInvestment = modelResults.investment || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  // Value per encounter calculation
  const pilotEncounters = pilotUnits * encountersPerUnit * (pilotUtilization / 100);
  const valuePerEncounter = pilotEncounters > 0 ? totalAnnualValue / pilotEncounters : 0;
  
  // Price per unit
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  // ============ CHART DATA GENERATION ============
  
  const chartData = useMemo(() => {
    const points = [];
    const steps = 20; // Smooth curve with 20 points
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // Units scale linearly
      const units = Math.round(
        pilotUnits + (fullScaleUnits - pilotUnits) * progress
      );
      
      // Utilization increases with adoption
      const utilization = (
        pilotUtilization + (fullScaleUtilization - pilotUtilization) * progress
      ) / 100;
      
      // Calculate value
      const encounters = units * encountersPerUnit * utilization;
      const value = encounters * valuePerEncounter;
      const investment = units * pricePerUnit * 12;
      const net = value - investment;
      const roi = investment > 0 ? (value / investment) : 0;
      
      points.push({
        providers: units,
        value: Math.round(value),
        net: Math.round(net),
        roi: roi.toFixed(1),
        utilization: Math.round(utilization * 100),
        isPilot: i === 0,
        isFullScale: i === steps
      });
    }
    
    return points;
  }, [pilotUnits, fullScaleUnits, pilotUtilization, fullScaleUtilization, encountersPerUnit, valuePerEncounter, pricePerUnit]);
  
  // Summary calculations
  const pilot = chartData[0];
  const fullScale = chartData[chartData.length - 1];
  const expansionPotential = fullScale.net - pilot.net;
  const valueMultiple = pilot.value > 0 ? (fullScale.value / pilot.value).toFixed(1) : "0";
  
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
      <GlobalHeader pageName="Explore Summary" currentStep={6} totalSteps={6} onLogoClick={onBackToJourney} />

      <div className="max-w-6xl mx-auto px-6 pt-[96px] pb-8 space-y-8">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-500 flex items-center gap-1 -ml-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-neutral-100 rounded text-[#111827] font-medium">
                {CARE_SETTING_LABELS[activeSetting]}
              </span>
              <span className="text-neutral-300">|</span>
              <span className="text-[#6B7280]">{pilotUnits} {config.unitNamePlural}</span>
              <span className="text-neutral-300">|</span>
              <span className="text-emerald-600 font-semibold">{formatCurrency(netValue)} net value</span>
              <span className="text-neutral-300">|</span>
              <span className="text-emerald-600 font-semibold">{roiMultiple.toFixed(1)}x ROI</span>
            </div>
          </div>
          
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
              className="gap-2 bg-[#EA2C00] hover:bg-[#d12700]"
              data-testid="button-export"
            >
              <Share2 className="w-4 h-4" />
              Export & Share
            </Button>
          </div>
        </div>
        
        {/* ============ YOUR ROI AT A GLANCE ============ */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center mb-8">
            Your ROI at a Glance
          </h2>
          
          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
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
            <h2 className="text-xl font-semibold text-[#111827] mb-1">
              Your Journey with Abridge
            </h2>
            <p className="text-sm text-[#6B7280]">
              Start with a pilot. Prove the value. Scale across your organization.
            </p>
          </div>
          
          {/* Area Chart */}
          <div className="h-96 mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#EA2C00" stopOpacity={1} />
                    <stop offset="50%" stopColor="#94a3b8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="providers" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  label={{ 
                    value: config.unitNamePlural.toUpperCase(), 
                    position: "bottom", 
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 500,
                    offset: -10
                  }}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={70}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="url(#valueGradient)"
                  strokeWidth={3}
                  fill="url(#areaFill)"
                />
                
                {/* Pilot marker */}
                <ReferenceDot 
                  x={pilot.providers} 
                  y={pilot.value} 
                  r={10} 
                  fill="#EA2C00" 
                  stroke="white"
                  strokeWidth={3}
                />
                
                {/* Full Scale marker */}
                <ReferenceDot 
                  x={fullScale.providers} 
                  y={fullScale.value} 
                  r={10} 
                  fill="#059669" 
                  stroke="white"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Annotations */}
          <div className="flex justify-between px-20 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />
              <span className="text-sm font-medium text-[#6B7280]">You are here</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-[#6B7280]">Your opportunity</span>
            </div>
          </div>
          
          {/* Model Your Scenario Panel */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-[#EA2C00]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Model Your Scenario
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-stretch gap-6 mb-8">
              {/* Pilot (Current) Column */}
              <div className="flex-1 bg-white rounded-xl border-2 border-orange-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Your Pilot</h4>
                    <p className="text-xs text-[#6B7280]">Current state</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1 capitalize">{config.unitNamePlural}</label>
                    <input 
                      type="number" 
                      value={pilotUnits}
                      onChange={(e) => setPilotUnits(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={500}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                      data-testid="input-pilot-units"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">{config.encounterName} per {config.unitName}</label>
                    <input 
                      type="number" 
                      value={encountersPerUnit}
                      onChange={(e) => setEncountersPerUnit(Math.max(100, Number(e.target.value)))}
                      min={100}
                      max={5000}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                      data-testid="input-encounters-per-unit"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Current utilization</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={pilotUtilization}
                        onChange={(e) => setPilotUtilization(Math.min(90, Math.max(10, Number(e.target.value))))}
                        min={10}
                        max={90}
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                        data-testid="input-pilot-utilization"
                      />
                      <span className="text-[#6B7280] font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Divider with Arrow */}
              <div className="hidden md:flex flex-col items-center justify-center py-4">
                <div className="w-px h-full bg-neutral-200" />
                <div className="p-2 bg-white border border-neutral-200 rounded-full my-2">
                  <ArrowRight className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="w-px h-full bg-neutral-200" />
              </div>
              
              {/* Full Scale (Opportunity) Column */}
              <div className="flex-1 bg-white rounded-xl border-2 border-emerald-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Rocket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Your Opportunity</h4>
                    <p className="text-xs text-[#6B7280]">Full scale potential</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Total {config.unitNamePlural} in organization</label>
                    <input 
                      type="number" 
                      value={fullScaleUnits}
                      onChange={(e) => setFullScaleUnits(Math.max(pilotUnits, Number(e.target.value)))}
                      min={pilotUnits}
                      max={1000}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      data-testid="input-fullscale-units"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Target utilization at full adoption</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={fullScaleUtilization}
                        onChange={(e) => setFullScaleUtilization(Math.min(95, Math.max(50, Number(e.target.value))))}
                        min={50}
                        max={95}
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        data-testid="input-fullscale-utilization"
                      />
                      <span className="text-[#6B7280] font-medium">%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Utilization typically increases as adoption matures. Most organizations reach 70-80% at full scale.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Results Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pilot (Today) */}
              <div className="bg-white rounded-xl border border-orange-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Pilot (Today)</div>
                <div className="font-mono font-bold text-2xl text-[#111827] mb-1">{formatCurrency(pilot.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{pilot.roi}x ROI</div>
              </div>
              
              {/* Full Scale */}
              <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Full Scale</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">{formatCurrency(fullScale.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{fullScale.roi}x ROI</div>
              </div>
              
              {/* Expansion Potential */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-300 p-5 text-center">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Expansion Potential</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">+{formatCurrency(expansionPotential)}</div>
                <div className="text-xs text-emerald-700 mb-2">additional per year</div>
                <div className="text-sm font-semibold text-emerald-800">{valueMultiple}x more value</div>
              </div>
            </div>
          </div>
          
          {/* Key Insight */}
          <div className="flex gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="p-2 bg-amber-100 rounded-lg h-fit">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#111827] mb-1">KEY INSIGHT</h4>
              <p className="text-sm text-[#6B7280]">
                ROI improves as you scale. Higher utilization + more {config.unitNamePlural} = more value 
                per dollar invested. The pilot proves it works. Expansion captures the full opportunity.
              </p>
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
                  <span className="font-medium text-[#111827]">{pilotUnits}</span>
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
              <span>{pilotUnits} {config.unitNamePlural} in pilot with {(pilotUnits * encountersPerUnit).toLocaleString()} total {config.encounterName}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#111827]">•</span>
              <span>{pilotUtilization}% utilization rate = {Math.round(pilotEncounters).toLocaleString()} Abridge-documented {config.encounterName}</span>
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
