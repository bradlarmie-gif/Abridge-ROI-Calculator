import { useState, useMemo, useCallback } from "react";
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
  Users,
  CheckCircle,
  Download,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { type CareSettingType, CARE_SETTING_LABELS } from "@/lib/SETTING_CONFIG";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { type ModelResults } from "@/pages/ModelBuilder";
import { generatePremiumPDF, type PremiumPDFData } from "@/lib/html-pdf-generator";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface SummaryCommandCenterProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  modelResults: ModelResults;
  onBack: () => void;
  onEditModel: () => void;
  onBackToJourney?: () => void;
}

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
  edThroughput: { category: "labor", label: "Patient Throughput (LWBS Reduction)" },
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

const settingConfig: Record<string, { unitName: string; unitNamePlural: string; encounterName: string }> = {
  outpatient: { unitName: "provider", unitNamePlural: "providers", encounterName: "encounters" },
  ed: { unitName: "provider", unitNamePlural: "providers", encounterName: "encounters" },
  inpatient: { unitName: "hospitalist", unitNamePlural: "hospitalists", encounterName: "admissions" },
  nursing: { unitName: "staffed bed", unitNamePlural: "staffed beds", encounterName: "documentation events" },
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { providers: number; utilization: number; value: number; linearValue: number; actualValue: number; roi: string; milestoneLabel?: string | null; adoptionRate?: number; month?: number } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const networkBonus = data.actualValue - data.linearValue;
    return (
      <div className="bg-[#1e293b] rounded-lg p-3 shadow-xl min-w-[200px]">
        {data.milestoneLabel && (
          <p className="text-white font-bold text-sm mb-1">{data.milestoneLabel}</p>
        )}
        <p className="text-neutral-300 text-xs mb-2">
          {data.providers} {data.providers === 1 ? 'provider' : 'providers'} · {data.utilization}% utilization
        </p>
        {data.adoptionRate && (
          <p className="text-neutral-400 text-xs mb-3">{data.adoptionRate}% adoption rate</p>
        )}
        
        <div className="space-y-1.5 border-t border-neutral-600 pt-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-blue-400 text-xs flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-400 opacity-60" style={{ backgroundImage: 'linear-gradient(90deg, #3b82f6 60%, transparent 40%)' }}></span>
              Linear
            </span>
            <span className="text-blue-300 font-medium text-sm">{formatCurrency(data.linearValue)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-emerald-400 text-xs flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full"></span>
              Actual
            </span>
            <span className="text-emerald-400 font-semibold text-sm">{formatCurrency(data.actualValue)}</span>
          </div>
          {networkBonus > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-neutral-700">
              <span className="text-neutral-400 text-xs">Compounding bonus</span>
              <span className="text-emerald-300 text-xs">+{formatCurrency(networkBonus)}</span>
            </div>
          )}
        </div>
        
        <p className="text-neutral-400 text-xs mt-2 pt-2 border-t border-neutral-600">{data.roi}x ROI</p>
      </div>
    );
  }
  return null;
}

export default function SummaryCommandCenter({
  selectedSettings,
  selectedLevers,
  modelResults,
  onBack,
  onEditModel,
  onBackToJourney,
}: SummaryCommandCenterProps) {
  const [copied, setCopied] = useState(false);
  const [assumptionsExpanded, setAssumptionsExpanded] = useState(false);
  
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting] || settingConfig.outpatient;
  const isNursingSetting = selectedSettings.includes("nursing");
  
  const initialUnits = isNursingSetting 
    ? (modelResults.nursingStaffedBeds || 200)
    : modelResults.providers;
  const initialEncountersPerUnit = modelResults.encounters / Math.max(initialUnits, 1);
  const initialUtilization = modelResults.utilizationRate;
  
  const [pilotUnits, setPilotUnits] = useState(initialUnits);
  const [encountersPerUnit, setEncountersPerUnit] = useState(Math.round(initialEncountersPerUnit));
  const [pilotUtilization, setPilotUtilization] = useState(initialUtilization);
  
  const [fullScaleUnits, setFullScaleUnits] = useState<number | "">(""); 
  const [fullScaleUtilization, setFullScaleUtilization] = useState<number | "">("");
  
  const totalAnnualValue = modelResults.totalBenefit;
  const annualInvestment = modelResults.investment || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  const pilotEncounters = pilotUnits * encountersPerUnit * (pilotUtilization / 100);
  const valuePerEncounter = pilotEncounters > 0 ? totalAnnualValue / pilotEncounters : 0;
  
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  // Calculate additional metrics for quick stats
  const hoursReturnedAnnually = Math.round((totalAnnualValue / 85) * 0.6); // Estimate: $85/hr average * 60% time savings
  const additionalPatientVisits = Math.round((totalAnnualValue / 200) * 0.3); // Estimate: additional visits from efficiency
  
  // Check if valid full scale data is entered
  const hasValidFullScale = typeof fullScaleUnits === "number" && fullScaleUnits > pilotUnits && 
    typeof fullScaleUtilization === "number" && fullScaleUtilization >= 50 && fullScaleUtilization <= 95;
  
  const chartData = useMemo(() => {
    const points = [];
    const steps = 20;
    
    const targetUnits = typeof fullScaleUnits === "number" ? fullScaleUnits : pilotUnits;
    const targetUtilization = typeof fullScaleUtilization === "number" ? fullScaleUtilization : pilotUtilization;
    
    // S-curve milestone definitions (realistic 24-month rollout)
    const milestones = [
      { index: 0, label: "Today", month: 0, growthPct: 0, adoptionRate: 1.0, utilizationBonus: 0 },
      { index: 5, label: "6 months", month: 6, growthPct: 0.15, adoptionRate: 0.85, utilizationBonus: 3 },
      { index: 10, label: "1 year", month: 12, growthPct: 0.40, adoptionRate: 0.90, utilizationBonus: 6 },
      { index: 15, label: "18 months", month: 18, growthPct: 0.70, adoptionRate: 0.93, utilizationBonus: 9 },
      { index: 20, label: "Full Scale", month: 24, growthPct: 1.0, adoptionRate: 0.95, utilizationBonus: targetUtilization - pilotUtilization }
    ];
    
    // Linear value calculation (simple per-unit scaling)
    const pilotEncountersCalc = pilotUnits * encountersPerUnit * (pilotUtilization / 100);
    const pilotValueCalc = pilotEncountersCalc * valuePerEncounter;
    const valuePerUnit = pilotUnits > 0 ? pilotValueCalc / pilotUnits : 0;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // Find surrounding milestones for interpolation
      let prevMilestone = milestones[0];
      let nextMilestone = milestones[milestones.length - 1];
      for (let m = 0; m < milestones.length - 1; m++) {
        if (i >= milestones[m].index && i <= milestones[m + 1].index) {
          prevMilestone = milestones[m];
          nextMilestone = milestones[m + 1];
          break;
        }
      }
      
      // S-curve interpolation between milestones (ease-in-out)
      const segmentProgress = (i - prevMilestone.index) / (nextMilestone.index - prevMilestone.index);
      const eased = segmentProgress < 0.5
        ? 4 * segmentProgress * segmentProgress * segmentProgress
        : 1 - Math.pow(-2 * segmentProgress + 2, 3) / 2;
      
      // Interpolate growth percentage
      const growthPct = prevMilestone.growthPct + (nextMilestone.growthPct - prevMilestone.growthPct) * eased;
      const adoptionRate = prevMilestone.adoptionRate + (nextMilestone.adoptionRate - prevMilestone.adoptionRate) * eased;
      const utilizationBonus = prevMilestone.utilizationBonus + (nextMilestone.utilizationBonus - prevMilestone.utilizationBonus) * eased;
      
      // Calculate providers at this point
      const units = Math.round(pilotUnits + (targetUnits - pilotUnits) * growthPct);
      
      // Linear projection (simple scaling without compounding)
      const linearValue = Math.round(valuePerUnit * units);
      
      // Actual utilization at this point
      const actualUtilization = (pilotUtilization + utilizationBonus) / 100;
      
      // Efficiency compounds as team learns (up to 15% over full rollout)
      const efficiencyMultiplier = 1 + (progress * 0.15);
      
      // Calculate actual value with adoption rate and efficiency
      const encounters = units * encountersPerUnit * actualUtilization * adoptionRate;
      const baseValue = encounters * valuePerEncounter;
      const actualValue = Math.round(baseValue * efficiencyMultiplier);
      
      const investment = units * pricePerUnit * 12;
      const net = actualValue - investment;
      const roi = investment > 0 ? (actualValue / investment) : 0;
      
      const milestone = milestones.find(m => m.index === i);
      const isMilestone = !!milestone;
      
      points.push({
        providers: units,
        index: i,
        month: milestone?.month || Math.round((i / steps) * 24),
        linearValue,
        actualValue,
        value: actualValue,
        net: Math.round(net),
        roi: roi.toFixed(1),
        utilization: Math.round(actualUtilization * 100),
        adoptionRate: Math.round(adoptionRate * 100),
        isPilot: i === 0,
        isFullScale: i === steps,
        isMilestone,
        milestoneLabel: milestone?.label || null
      });
    }
    
    return points;
  }, [pilotUnits, fullScaleUnits, pilotUtilization, fullScaleUtilization, encountersPerUnit, valuePerEncounter, pricePerUnit]);
  
  const pilot = chartData[0];
  const fullScale = chartData[chartData.length - 1];
  const networkEffect = fullScale.actualValue - fullScale.linearValue;
  const expansionPotential = fullScale.net - pilot.net;
  const valueMultiple = pilot.value > 0 ? (fullScale.value / pilot.value).toFixed(1) : "0";
  
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
  
  const laborDrivers = valueBreakdown.filter(d => d.category === "labor");
  const revenueDrivers = valueBreakdown.filter(d => d.category === "revenue");
  const laborValue = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const revenueValue = revenueDrivers.reduce((sum, d) => sum + d.value, 0);
  const laborPercent = totalAnnualValue > 0 ? Math.round((laborValue / totalAnnualValue) * 100) : 0;
  const revenuePercent = 100 - laborPercent;
  
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

  const handleExportPdf = useCallback(async () => {
    const pdfData: PremiumPDFData = {
      setting: CARE_SETTING_LABELS[activeSetting],
      unitName: config.unitName,
      unitNamePlural: config.unitNamePlural,
      providers: pilotUnits,
      encounters: pilotUnits * encountersPerUnit,
      utilization: pilotUtilization,
      totalValue: totalAnnualValue,
      investment: annualInvestment,
      netGain: netValue,
      roi: roiMultiple,
      costPerProvider: pricePerUnit,
      hoursReturned: hoursReturnedAnnually,
      additionalVisits: additionalPatientVisits,
      timeSaved: 2.5,
      laborDrivers: laborDrivers.map((d) => ({
        name: d.name,
        value: d.value,
        description: 'Reduces administrative burden and improves efficiency',
      })),
      revenueDrivers: revenueDrivers.map((d) => ({
        name: d.name,
        value: d.value,
        description: 'Improves revenue capture and quality outcomes',
      })),
      laborTotal: laborValue,
      revenueTotal: revenueValue,
      laborPct: laborPercent,
      revenuePct: revenuePercent,
      year1,
      year2,
      year3,
      threeYearValue,
      threeYearCost,
      threeYearNet,
      fullScaleProviders: typeof fullScaleUnits === "number" ? fullScaleUnits : pilotUnits,
      fullScaleUtil: typeof fullScaleUtilization === "number" ? fullScaleUtilization : pilotUtilization,
      fullScaleValue: hasValidFullScale ? fullScale.value : 0,
      fullScaleROI: hasValidFullScale && typeof fullScaleUnits === "number" && annualInvestment > 0 ? fullScale.value / (fullScaleUnits * pricePerUnit * 12) : 0,
      networkEffect,
    };

    await generatePremiumPDF(pdfData);
  }, [
    activeSetting,
    config,
    pilotUnits,
    encountersPerUnit,
    pilotUtilization,
    totalAnnualValue,
    annualInvestment,
    netValue,
    roiMultiple,
    pricePerUnit,
    hoursReturnedAnnually,
    additionalPatientVisits,
    laborDrivers,
    revenueDrivers,
    laborValue,
    revenueValue,
    laborPercent,
    revenuePercent,
    year1,
    year2,
    year3,
    threeYearValue,
    threeYearCost,
    threeYearNet,
    fullScaleUnits,
    fullScaleUtilization,
    fullScale,
    networkEffect,
  ]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <GlobalHeader pageName="Your ROI Model" currentStep={6} totalSteps={6} onLogoClick={onBackToJourney} />

      {/* Sticky Header Bar */}
      <div className="fixed top-[72px] left-0 right-0 z-40 bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6B7280] hover:text-[#EA2C00] transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <div className="hidden md:flex items-center gap-2 text-[14px] ml-4">
              <span className="px-2.5 py-1 bg-[#F3F4F6] rounded-md text-[#111827] font-medium">
                {CARE_SETTING_LABELS[activeSetting]}
              </span>
              <span className="text-[#D1D5DB]">•</span>
              <span className="text-[#6B7280]">{pilotUnits} {config.unitNamePlural}</span>
              <span className="text-[#D1D5DB]">•</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(netValue)} net value</span>
              <span className="text-[#D1D5DB]">•</span>
              <span className="font-semibold text-emerald-600">{roiMultiple.toFixed(1)}x ROI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditModel}
              className="gap-2 border-[#E5E7EB] hover:border-[#EA2C00] hover:text-[#EA2C00]"
              data-testid="button-edit-model"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Model</span>
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-[#EA2C00] hover:bg-[#d12700] text-white"
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export & Share</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-[144px] pb-12 space-y-8">
        
        {/* ============ HERO ROI SECTION ============ */}
        <section className="bg-gradient-to-br from-[#111827] to-[#1e293b] rounded-2xl p-8 md:p-10 text-white">
          <div className="text-center mb-8">
            <span className="text-[13px] font-semibold text-white/60 uppercase tracking-[0.15em]">Your ROI at a Glance</span>
          </div>
          
          {/* Hero Split - Net Gain | ROI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 mb-10">
            {/* Net Annual Gain */}
            <div className="text-center md:border-r md:border-white/20 md:pr-8">
              <div className="text-sm text-white/60 mb-2">Net Annual Gain</div>
              <div className="font-mono text-5xl md:text-6xl font-bold text-emerald-400 mb-2" data-testid="summary-net-value">
                +{formatCurrency(netValue)}
              </div>
              <div className="text-sm text-white/50">
                {formatCurrency(totalAnnualValue)} value − {formatCurrency(annualInvestment)} investment
              </div>
            </div>
            
            {/* ROI Multiplier */}
            <div className="text-center md:pl-8">
              <div className="text-sm text-white/60 mb-2">Return on Investment</div>
              <div className="font-mono text-5xl md:text-6xl font-bold text-white mb-2" data-testid="summary-roi">
                {roiMultiple.toFixed(1)}×
              </div>
              <div className="text-sm text-white/50">
                Every $1 invested returns ${roiMultiple.toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10">
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Clock className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-white">{hoursReturnedAnnually.toLocaleString()} hrs</div>
                <div className="text-xs text-white/50">Time returned annually</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Users className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-white">{additionalPatientVisits.toLocaleString()}</div>
                <div className="text-xs text-white/50">Additional patient visits</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-white">{pilotUtilization}%</div>
                <div className="text-xs text-white/50">Expected utilization</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ VALUE BREAKDOWN ============ */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#F3F4F6] rounded-lg">
              <Globe className="w-5 h-5 text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827] uppercase tracking-wide">Value Breakdown</h2>
              <p className="text-[14px] text-[#6B7280]">Where your ROI comes from</p>
            </div>
          </div>
          
          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Labor & Efficiency */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Labor & Efficiency</h3>
                  <p className="text-[13px] text-[#6B7280]">{laborPercent}% of total value</p>
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-[#111827] mb-4">{formatCurrency(laborValue)}</div>
              <div className="space-y-2">
                {laborDrivers.map((driver, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                    <span className="text-[14px] text-[#111827]">{driver.name}</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(driver.value)}</span>
                  </div>
                ))}
                {laborDrivers.length === 0 && (
                  <p className="text-[14px] text-[#6B7280] italic">No labor drivers selected</p>
                )}
              </div>
            </div>
            
            {/* Revenue & Quality */}
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Revenue & Quality</h3>
                  <p className="text-[13px] text-[#6B7280]">{revenuePercent}% of total value</p>
                </div>
              </div>
              <div className="font-mono text-3xl font-bold text-[#111827] mb-4">{formatCurrency(revenueValue)}</div>
              <div className="space-y-2">
                {revenueDrivers.map((driver, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-emerald-100 last:border-0">
                    <span className="text-[14px] text-[#111827]">{driver.name}</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(driver.value)}</span>
                  </div>
                ))}
                {revenueDrivers.length === 0 && (
                  <p className="text-[14px] text-[#6B7280] italic">No revenue drivers selected</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Stacked Bar */}
          <div className="h-10 flex rounded-xl overflow-hidden">
            {laborPercent > 0 && (
              <div 
                className="bg-blue-500 flex items-center justify-center text-sm font-semibold text-white transition-all"
                style={{ width: `${laborPercent}%` }}
              >
                {laborPercent > 20 && `Labor & Efficiency (${laborPercent}%)`}
              </div>
            )}
            {revenuePercent > 0 && (
              <div 
                className="bg-emerald-500 flex items-center justify-center text-sm font-semibold text-white transition-all"
                style={{ width: `${revenuePercent}%` }}
              >
                {revenuePercent > 20 && `Revenue & Quality (${revenuePercent}%)`}
              </div>
            )}
          </div>
        </section>

        {/* ============ INVESTMENT DETAILS ============ */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#F3F4F6] rounded-lg">
              <DollarSign className="w-5 h-5 text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827] uppercase tracking-wide">Investment Details</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Configuration */}
            <div className="p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111827] mb-5">Your Configuration</h3>
              <div className="space-y-3 text-[15px]">
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
                <div className="border-t border-[#E5E7EB] pt-4 mt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#111827]">Annual Investment</span>
                    <span className="font-mono font-bold text-[#111827]">{formatCurrency(annualInvestment)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Multi-Year Projection */}
            <div className="p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#111827] mb-5">Multi-Year Projection</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="text-[#6B7280]">
                      <th className="text-left pb-3"></th>
                      <th className="text-right pb-3 font-medium">Year 1</th>
                      <th className="text-right pb-3 font-medium">Year 2</th>
                      <th className="text-right pb-3 font-medium">Year 3</th>
                      <th className="text-right pb-3 font-semibold text-[#111827]">3-Yr Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 text-[#6B7280]">Value</td>
                      <td className="py-2 text-right font-mono">{formatCompactCurrency(year1)}</td>
                      <td className="py-2 text-right font-mono">{formatCompactCurrency(year2)}</td>
                      <td className="py-2 text-right font-mono">{formatCompactCurrency(year3)}</td>
                      <td className="py-2 text-right font-mono font-semibold">{formatCompactCurrency(threeYearValue)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-[#6B7280]">Cost</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(annualInvestment)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(threeYearCost)}</td>
                    </tr>
                    <tr className="border-t border-[#E5E7EB]">
                      <td className="py-3 font-semibold text-[#111827]">Net</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year1 - annualInvestment)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year2 - annualInvestment)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year3 - annualInvestment)}</td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600">{formatCompactCurrency(threeYearNet)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-[#9CA3AF] mt-4">Assumes 10% annual value growth with increased adoption</p>
            </div>
          </div>
        </section>

        {/* ============ YOUR JOURNEY WITH ABRIDGE ============ */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Journey with Abridge</h2>
            <p className="text-[15px] text-[#6B7280]">
              Start with a pilot. Prove the value. Scale across your organization.
            </p>
          </div>
          
          {/* Chart */}
          <div className="h-96 mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                <defs>
                  <linearGradient id="networkEffectGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="index"
                  type="number"
                  domain={[0, 20]}
                  ticks={[0, 5, 10, 15, 20]}
                  axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  tickLine={false}
                  tick={(props: { x: number; y: number; payload: { value: number } }) => {
                    const { x, y, payload } = props;
                    const point = chartData.find(d => d.index === payload.value);
                    if (!point?.isMilestone) return <g />;
                    const isEndpoint = point.isPilot || point.isFullScale;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={8} 
                          textAnchor="middle" 
                          fill={isEndpoint ? "#EA2C00" : "#111827"}
                          fontSize={11}
                          fontWeight={isEndpoint ? 700 : 600}
                        >
                          {point.milestoneLabel}
                        </text>
                        <text 
                          x={0} 
                          y={22} 
                          textAnchor="middle" 
                          fill="#6B7280"
                          fontSize={10}
                          fontWeight={400}
                        >
                          {point.providers} {config.unitNamePlural.toLowerCase()}
                        </text>
                      </g>
                    );
                  }}
                  height={50}
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
                  dataKey="actualValue" 
                  stroke="none"
                  fill="url(#networkEffectGradient)"
                />
                
                <Line 
                  type="linear" 
                  dataKey="linearValue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="actualValue" 
                  stroke="#059669" 
                  strokeWidth={3}
                  dot={false}
                />
                
                <ReferenceDot 
                  x={0} 
                  y={pilot.actualValue} 
                  r={10} 
                  fill="#EA2C00" 
                  stroke="white"
                  strokeWidth={3}
                />
                
                <ReferenceDot 
                  x={20} 
                  y={fullScale.actualValue} 
                  r={10} 
                  fill="#059669" 
                  stroke="white"
                  strokeWidth={3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />
              <span className="text-sm font-medium text-[#6B7280]">Pilot (Today)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-emerald-500" />
              <span className="text-sm font-medium text-[#6B7280]">Actual value (with compounding)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-500" />
              <span className="text-sm font-medium text-[#6B7280]">Linear projection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-[#6B7280]">Full Scale</span>
            </div>
          </div>
          
          {/* Model Your Scenario Panel */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-[#EA2C00]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Model Your Scenario
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-stretch gap-6 mb-8">
              {/* Pilot Column */}
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
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
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
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
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
                        className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                        data-testid="input-pilot-utilization"
                      />
                      <span className="text-[#6B7280] font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <div className="hidden md:flex flex-col items-center justify-center py-4">
                <div className="w-px h-full bg-[#E5E7EB]" />
                <div className="p-2 bg-white border border-[#E5E7EB] rounded-full my-2">
                  <ArrowRight className="w-5 h-5 text-[#9CA3AF]" />
                </div>
                <div className="w-px h-full bg-[#E5E7EB]" />
              </div>
              
              {/* Full Scale Column */}
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
                      placeholder="e.g., 150"
                      onChange={(e) => setFullScaleUnits(e.target.value === "" ? "" : Number(e.target.value))}
                      onBlur={(e) => {
                        if (e.target.value !== "" && Number(e.target.value) < pilotUnits + 1) {
                          setFullScaleUnits(pilotUnits + 1);
                        }
                      }}
                      min={pilotUnits + 1}
                      max={1000}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      data-testid="input-fullscale-units"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Target utilization at full adoption</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={fullScaleUtilization}
                        placeholder="e.g., 75"
                        onChange={(e) => setFullScaleUtilization(e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={(e) => {
                          if (e.target.value !== "") {
                            const val = Number(e.target.value);
                            if (val < 50) setFullScaleUtilization(50);
                            else if (val > 95) setFullScaleUtilization(95);
                          }
                        }}
                        min={50}
                        max={95}
                        className="flex-1 px-3 py-2 rounded-lg border border-[#E5E7EB] font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              <div className="bg-white rounded-xl border border-orange-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Pilot (Today)</div>
                <div className="font-mono font-bold text-2xl text-[#111827] mb-1">{formatCurrency(pilot.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{pilot.roi}x ROI</div>
              </div>
              
              <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Full Scale</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">{formatCurrency(fullScale.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{fullScale.roi}x ROI</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-500 p-5 text-center">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Network Effect</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">+{formatCurrency(networkEffect)}</div>
                <div className="text-xs text-emerald-700 mb-2">compounding value</div>
                <div className="text-sm font-semibold text-emerald-800">Beyond linear projection</div>
              </div>
            </div>
          </div>
          
          {/* The Compounding Effect */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">The Compounding Effect</span>
            </div>
            <p className="text-sm text-emerald-800 mb-4 leading-relaxed">
              The gap between the lines represents value that compounds as you scale — not just more of the same:
            </p>
            <div className="space-y-0">
              <div className="flex items-center gap-3 py-3 border-b border-emerald-200">
                <TrendingUp className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">Utilization:</span> {pilotUtilization}% → {typeof fullScaleUtilization === "number" ? fullScaleUtilization : "—"}% as adoption matures
                </p>
              </div>
              <div className="flex items-center gap-3 py-3 border-b border-emerald-200">
                <Target className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">Retention:</span> Benefits materialize after 6-12 months
                </p>
              </div>
              <div className="flex items-center gap-3 py-3">
                <Rocket className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">Efficiency:</span> Shared learnings, optimized workflows
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ KEY ASSUMPTIONS (Collapsible) ============ */}
        <section className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <button
            onClick={() => setAssumptionsExpanded(!assumptionsExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-[#F9FAFB] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F3F4F6] rounded-lg">
                <FileText className="w-5 h-5 text-[#6B7280]" />
              </div>
              <h2 className="text-lg font-semibold text-[#111827]">Key Assumptions</h2>
            </div>
            {assumptionsExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#6B7280]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6B7280]" />
            )}
          </button>
          
          {assumptionsExpanded && (
            <div className="px-6 pb-6">
              <ul className="space-y-3 text-[15px] text-[#6B7280]">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{pilotUnits} {config.unitNamePlural} in pilot with {(pilotUnits * encountersPerUnit).toLocaleString()} total {config.encounterName}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{pilotUtilization}% utilization rate = {Math.round(pilotEncounters).toLocaleString()} Abridge-documented {config.encounterName}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Investment of {formatCurrency(annualInvestment)} annually at ${pricePerUnit}/{config.unitName}/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Value scales linearly with {config.unitNamePlural} and utilization</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>10% annual value growth assumed for multi-year projection</span>
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* ============ ACTIONS ============ */}
        <section className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4">
          <Button
            variant="outline"
            className="gap-2 w-full sm:w-auto border-[#E5E7EB] hover:border-[#EA2C00] hover:text-[#EA2C00]"
            onClick={onEditModel}
            data-testid="button-add-driver"
          >
            <Plus className="w-4 h-4" />
            Add Another Driver
          </Button>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="gap-2 flex-1 sm:flex-none border-[#E5E7EB]" 
              onClick={handleExportPdf}
              data-testid="button-export-pdf"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none border-[#E5E7EB]" data-testid="button-share-email">
              <Mail className="w-4 h-4" />
              Share via Email
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 flex-1 sm:flex-none border-[#E5E7EB]"
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
