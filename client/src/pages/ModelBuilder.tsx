import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import {
  type CareSettingType,
  CARE_SETTING_LABELS,
} from "@/lib/SETTING_CONFIG";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Lightbulb,
  Calculator,
  Building2,
  Heart,
  FileX,
  BarChart3,
  AlertTriangle,
  Check,
  Zap,
} from "lucide-react";

interface ModelBuilderProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
  onComplete: (results: ModelResults) => void;
}

export interface ModelResults {
  providers: number;
  encounters: number;
  utilizationRate: number;
  eligibleEncounters: number;
  driverResults: Record<string, DriverResult>;
  totalBenefit: number;
  investment: number;
  netGain: number;
  roiMultiple: number;
  paybackMonths: number;
  costPerMonth?: number;
  pricingModel?: string;
}

interface DriverResult {
  id: string;
  name: string;
  value: number;
  inputs: Record<string, number | string | boolean>;
}

interface DriverInputs {
  overtime: {
    situation: "minimal" | "moderate" | "significant";
    docPortion: number;
    overtimeRate: number;
    includeLocum: boolean;
    locumHours: number;
    locumRate: number;
  };
  patientAccess: {
    demand: "yes" | "probably" | "not_sure";
    realizationRate: "conservative" | "typical" | "optimistic";
    revenuePerVisit: number;
  };
  retention: {
    turnoverRate: number;
    replacementCost: number;
  };
  levelOfService: {
    underCodingRate: number;
    wrvuFactor: number;
  };
  hcc: {
    riskBasedPct: number;
    captureRate: number;
  };
  denials: {
    denialRate: number;
    avgClaimValue: number;
  };
}

const DRIVER_ICONS: Record<string, typeof Clock> = {
  overtime: Clock,
  patientAccess: Users,
  retention: Heart,
  levelOfService: BarChart3,
  hcc: Building2,
  denials: FileX,
};

const DRIVER_NAMES: Record<string, string> = {
  overtime: "Overtime & Locum Savings",
  patientAccess: "Patient Access",
  retention: "Clinician Retention",
  levelOfService: "Accurate Level of Service",
  hcc: "HCC & Chronic Condition Capture",
  denials: "Documentation-Related Denials",
};

const DRIVER_THEORIES: Record<string, string> = {
  overtime: "When documentation takes less time, providers finish during regular hours instead of staying late or catching up at home. This eliminates expensive overtime pay and reduces the need for locum coverage to handle documentation backlogs.",
  patientAccess: "By reclaiming 2-3 minutes per encounter, providers can see additional patients without extending their day. This unlocks new revenue—but only if there's patient demand to fill those slots.",
  retention: "Documentation burden is a top driver of physician burnout. By reducing the administrative load, Abridge helps prevent burnout-related departures—each costing $250K-500K to replace.",
  levelOfService: "AI-assisted documentation captures clinical reasoning more completely, leading to more accurate E/M coding. Most practices under-code 8-15% of visits due to documentation gaps.",
  hcc: "Complete documentation captures chronic conditions that often go undocumented. For patients in risk-based contracts, this improves RAF scores and associated payments.",
  denials: "Clear, complete documentation reduces claims denied for insufficient clinical rationale. Preventing denials eliminates rework costs and improves cash flow.",
};

export default function ModelBuilder({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
}: ModelBuilderProps) {
  const [providers, setProviders] = useState<number>(50);
  const [encounters, setEncounters] = useState<number>(100000);
  const [utilizationRate, setUtilizationRate] = useState<50 | 65 | 80>(65);
  
  const [pricingModel, setPricingModel] = useState<"per_clinician" | "enterprise">("per_clinician");
  const [costPerMonth, setCostPerMonth] = useState<number>(140);
  const [enterpriseAnnual, setEnterpriseAnnual] = useState<number>(500000);
  const [contractTerm, setContractTerm] = useState<1 | 2 | 3 | number>(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const [implementationFee, setImplementationFee] = useState<number>(25000);
  
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  
  const [driverInputs, setDriverInputs] = useState<DriverInputs>({
    overtime: {
      situation: "moderate",
      docPortion: 45,
      overtimeRate: 150,
      includeLocum: false,
      locumHours: 0,
      locumRate: 200,
    },
    patientAccess: {
      demand: "probably",
      realizationRate: "typical",
      revenuePerVisit: 200,
    },
    retention: {
      turnoverRate: 6,
      replacementCost: 500000,
    },
    levelOfService: {
      underCodingRate: 10,
      wrvuFactor: 45,
    },
    hcc: {
      riskBasedPct: 35,
      captureRate: 70,
    },
    denials: {
      denialRate: 7,
      avgClaimValue: 250,
    },
  });
  
  useEffect(() => {
    setEncounters(providers * 2000);
  }, [providers]);
  
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  
  const activeDrivers = useMemo(() => {
    const driverMap: Record<string, string> = {
      overtime: "overtime",
      patientAccess: "patientAccess",
      workforce: "retention",
      retention: "retention",
      wrvu: "levelOfService",
      edLevelOfService: "levelOfService",
      hcc: "hcc",
      hccCapture: "hcc",
      denials: "denials",
      edDenialReduction: "denials",
      denialReduction: "denials",
    };
    
    const active = new Set<string>();
    selectedLevers.forEach(lever => {
      if (lever.active) {
        const mapped = driverMap[lever.leverId] || lever.leverId;
        if (DRIVER_NAMES[mapped]) {
          active.add(mapped);
        }
      }
    });
    
    if (active.size === 0) {
      return ["overtime", "patientAccess", "levelOfService"];
    }
    
    return Array.from(active);
  }, [selectedLevers]);
  
  const calculateDriverValue = useCallback((driverId: string): number => {
    switch (driverId) {
      case "overtime": {
        const { situation, docPortion, overtimeRate } = driverInputs.overtime;
        const hoursPerWeek = situation === "minimal" ? 1 : situation === "moderate" ? 3.5 : 7;
        const pctWithOT = situation === "minimal" ? 20 : situation === "moderate" ? 50 : 75;
        const baselineOT = providers * (pctWithOT / 100) * hoursPerWeek * 50;
        const docRelatedOT = baselineOT * (docPortion / 100);
        const hoursEliminated = docRelatedOT * 0.7 * (utilizationRate / 100);
        return Math.round(hoursEliminated * overtimeRate);
      }
      case "patientAccess": {
        const { realizationRate, revenuePerVisit } = driverInputs.patientAccess;
        const timeSavedHours = (2.5 * eligibleEncounters) / 60;
        const realizationPct = realizationRate === "conservative" ? 15 : realizationRate === "typical" ? 20 : 30;
        const usableHours = timeSavedHours * (realizationPct / 100);
        const newVisits = usableHours * 2;
        return Math.round(newVisits * revenuePerVisit);
      }
      case "retention": {
        const { turnoverRate, replacementCost } = driverInputs.retention;
        const departures = providers * (turnoverRate / 100);
        const burnoutRelated = departures * 0.45;
        const docDriven = burnoutRelated * 0.30;
        const prevented = docDriven * 0.40 * (utilizationRate / 100);
        return Math.round(prevented * replacementCost);
      }
      case "levelOfService": {
        const { underCodingRate, wrvuFactor } = driverInputs.levelOfService;
        const emEncounters = eligibleEncounters * 0.80;
        const underCoded = emEncounters * (underCodingRate / 100);
        const corrected = underCoded * 0.50;
        return Math.round(corrected * 0.7 * wrvuFactor);
      }
      case "hcc": {
        const { riskBasedPct, captureRate } = driverInputs.hcc;
        if (riskBasedPct < 10) return 0;
        const riskPatients = (encounters / 4) * (riskBasedPct / 100);
        const missedConditions = riskPatients * 2.5 * ((100 - captureRate) / 100);
        const recaptured = missedConditions * 0.15;
        return Math.round(recaptured * 1500);
      }
      case "denials": {
        const { denialRate, avgClaimValue } = driverInputs.denials;
        const totalDenials = encounters * (denialRate / 100);
        const docRelated = totalDenials * 0.35;
        const prevented = docRelated * 0.50 * (utilizationRate / 100);
        return Math.round(prevented * avgClaimValue);
      }
      default:
        return 0;
    }
  }, [providers, encounters, utilizationRate, eligibleEncounters, driverInputs]);
  
  const driverResults = useMemo(() => {
    const results: Record<string, { name: string; value: number; category: "time" | "quality" }> = {};
    activeDrivers.forEach(id => {
      results[id] = {
        name: DRIVER_NAMES[id],
        value: calculateDriverValue(id),
        category: id === "overtime" || id === "patientAccess" || id === "retention" ? "time" : "quality",
      };
    });
    return results;
  }, [activeDrivers, calculateDriverValue]);
  
  const timeSubtotal = useMemo(() => {
    return Object.values(driverResults)
      .filter(d => d.category === "time")
      .reduce((sum, d) => sum + d.value, 0);
  }, [driverResults]);
  
  const qualitySubtotal = useMemo(() => {
    return Object.values(driverResults)
      .filter(d => d.category === "quality")
      .reduce((sum, d) => sum + d.value, 0);
  }, [driverResults]);
  
  const totalBenefit = timeSubtotal + qualitySubtotal;
  
  const annualInvestment = useMemo(() => {
    if (pricingModel === "per_clinician") {
      return providers * costPerMonth * 12;
    }
    return enterpriseAnnual;
  }, [pricingModel, providers, costPerMonth, enterpriseAnnual]);
  
  const totalInvestment = annualInvestment + (includeImplementation ? implementationFee : 0);
  const netGain = totalBenefit - totalInvestment;
  const roiMultiple = totalInvestment > 0 ? totalBenefit / totalInvestment : 0;
  const paybackMonths = totalBenefit > 0 ? Math.round((totalInvestment / totalBenefit) * 12) : 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const handleComplete = () => {
    const getDriverInputs = (driverId: string): Record<string, number | string | boolean> => {
      switch (driverId) {
        case "overtime":
          return {
            situation: driverInputs.overtime.situation,
            docPortion: driverInputs.overtime.docPortion,
            overtimeRate: driverInputs.overtime.overtimeRate,
            includeLocum: driverInputs.overtime.includeLocum,
            locumHours: driverInputs.overtime.locumHours,
            locumRate: driverInputs.overtime.locumRate,
          };
        case "patientAccess":
          return {
            demand: driverInputs.patientAccess.demand,
            realizationRate: driverInputs.patientAccess.realizationRate,
            revenuePerVisit: driverInputs.patientAccess.revenuePerVisit,
          };
        case "retention":
          return {
            turnoverRate: driverInputs.retention.turnoverRate,
            replacementCost: driverInputs.retention.replacementCost,
          };
        case "levelOfService":
          return {
            underCodingRate: driverInputs.levelOfService.underCodingRate,
            wrvuFactor: driverInputs.levelOfService.wrvuFactor,
          };
        case "hcc":
          return {
            riskBasedPct: driverInputs.hcc.riskBasedPct,
            captureRate: driverInputs.hcc.captureRate,
          };
        case "denials":
          return {
            denialRate: driverInputs.denials.denialRate,
            avgClaimValue: driverInputs.denials.avgClaimValue,
          };
        default:
          return {};
      }
    };

    const results: ModelResults = {
      providers,
      encounters,
      utilizationRate,
      eligibleEncounters,
      driverResults: Object.fromEntries(
        Object.entries(driverResults).map(([id, data]) => [
          id,
          { id, name: data.name, value: data.value, inputs: getDriverInputs(id) },
        ])
      ),
      totalBenefit,
      investment: totalInvestment,
      netGain,
      roiMultiple,
      paybackMonths,
      costPerMonth,
      pricingModel,
    };
    onComplete(results);
  };
  
  const renderDriverAccordion = (driverId: string) => {
    const isExpanded = expandedDriver === driverId;
    const Icon = DRIVER_ICONS[driverId] || Calculator;
    const value = driverResults[driverId]?.value || 0;
    
    return (
      <div key={driverId} className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setExpandedDriver(isExpanded ? null : driverId)}
          className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
          data-testid={`accordion-${driverId}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-neutral-600" />
            </div>
            <span className="font-medium text-[#111827]">{DRIVER_NAMES[driverId]}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono font-semibold text-[#E85D3F] text-lg">{formatCurrency(value)}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </div>
        </button>
        
        {isExpanded && (
          <div className="border-t border-neutral-100 p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#111827] mb-1">The Theory</p>
                  <p className="text-sm text-[#6B7280]">{DRIVER_THEORIES[driverId]}</p>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-[#E85D3F]" />
                <span className="text-sm font-medium text-[#111827]">Your Calculation</span>
              </div>
              
              {renderDriverInputs(driverId)}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderDriverInputs = (driverId: string) => {
    switch (driverId) {
      case "overtime":
        return renderOvertimeInputs();
      case "patientAccess":
        return renderPatientAccessInputs();
      case "retention":
        return renderRetentionInputs();
      case "levelOfService":
        return renderLevelOfServiceInputs();
      case "hcc":
        return renderHccInputs();
      case "denials":
        return renderDenialsInputs();
      default:
        return null;
    }
  };
  
  const renderOvertimeInputs = () => {
    const { situation, docPortion, overtimeRate } = driverInputs.overtime;
    const hoursPerWeek = situation === "minimal" ? 1 : situation === "moderate" ? 3.5 : 7;
    const pctWithOT = situation === "minimal" ? 20 : situation === "moderate" ? 50 : 75;
    const baselineOT = providers * (pctWithOT / 100) * hoursPerWeek * 50;
    const docRelatedOT = baselineOT * (docPortion / 100);
    const hoursEliminated = docRelatedOT * 0.7 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your after-hours documentation situation?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["minimal", "moderate", "significant"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, situation: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  situation === opt
                    ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                    : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                }`}
                data-testid={`overtime-situation-${opt}`}
              >
                {opt === "minimal" && "Minimal (<2hrs/wk)"}
                {opt === "moderate" && "Moderate (2-5hrs/wk)"}
                {opt === "significant" && "Significant (>5hrs/wk)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 font-mono">
            {providers} providers × {pctWithOT}% with OT × {hoursPerWeek} hrs × 50 wks = {Math.round(baselineOT).toLocaleString()} OT hrs
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What % of overtime is documentation catch-up?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{docPortion}%</span>
          </div>
          <Slider
            value={[docPortion]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, docPortion: val } }))}
            min={20}
            max={70}
            step={5}
            className="w-full"
            data-testid="overtime-doc-portion-slider"
          />
          <p className="text-xs text-[#6B7280]">Abridge customers typically see 40-55%</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(baselineOT).toLocaleString()} × {docPortion}% = {Math.round(docRelatedOT).toLocaleString()} doc-related OT
          </p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Reduction (auto-calculated):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(docRelatedOT).toLocaleString()} × 70% reduction × {utilizationRate}% adoption = {Math.round(hoursEliminated).toLocaleString()} hours eliminated
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your overtime rate?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={overtimeRate}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, overtimeRate: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="overtime-rate-input"
            />
            <span className="text-sm text-[#6B7280]">/hour</span>
          </div>
          <p className="text-xs text-[#6B7280]">1.5× base rate is typical</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(hoursEliminated * overtimeRate))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(hoursEliminated).toLocaleString()} hrs × ${overtimeRate} = {formatCurrency(Math.round(hoursEliminated * overtimeRate))}
          </p>
        </div>
      </div>
    );
  };
  
  const renderPatientAccessInputs = () => {
    const { demand, realizationRate, revenuePerVisit } = driverInputs.patientAccess;
    const timeSavedHours = (2.5 * eligibleEncounters) / 60;
    const realizationPct = realizationRate === "conservative" ? 15 : realizationRate === "typical" ? 20 : 30;
    const usableHours = timeSavedHours * (realizationPct / 100);
    const newVisits = usableHours * 2;
    
    return (
      <div className="space-y-6">
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Time returned (auto from base inputs):</p>
          <p className="text-xs text-neutral-400 font-mono">
            2.5 min × {eligibleEncounters.toLocaleString()} encounters ÷ 60 = {Math.round(timeSavedHours).toLocaleString()} hours
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Do you have patient demand to fill new slots?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["yes", "probably", "not_sure"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, demand: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  demand === opt
                    ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                    : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                }`}
                data-testid={`patient-access-demand-${opt}`}
              >
                {opt === "yes" && "Yes, waitlists"}
                {opt === "probably" && "Probably yes"}
                {opt === "not_sure" && "Not sure"}
              </button>
            ))}
          </div>
          {demand === "not_sure" && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">We'll use a conservative realization rate</p>
          )}
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What portion of time savings can realistically become visits?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "optimistic"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, realizationRate: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  realizationRate === opt
                    ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                    : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                }`}
                data-testid={`patient-access-realization-${opt}`}
              >
                {opt === "conservative" && "Conservative 15%"}
                {opt === "typical" && "Typical 20%"}
                {opt === "optimistic" && "Optimistic 30%"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B7280]">This accounts for scheduling constraints, room availability, etc.</p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your average net revenue per visit?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={revenuePerVisit}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, revenuePerVisit: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="patient-access-revenue-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Primary care: $150-200 | Specialty: $250-400</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(newVisits * revenuePerVisit))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(usableHours).toLocaleString()} usable hrs × 2 visits/hr × ${revenuePerVisit} = {formatCurrency(Math.round(newVisits * revenuePerVisit))}
          </p>
        </div>
      </div>
    );
  };
  
  const renderRetentionInputs = () => {
    const { turnoverRate, replacementCost } = driverInputs.retention;
    const departures = providers * (turnoverRate / 100);
    const burnoutRelated = departures * 0.45;
    const docDriven = burnoutRelated * 0.30;
    const prevented = docDriven * 0.40 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your current annual turnover rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{turnoverRate}%</span>
          </div>
          <Slider
            value={[turnoverRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, turnoverRate: val } }))}
            min={3}
            max={15}
            step={1}
            className="w-full"
            data-testid="retention-turnover-slider"
          />
          <p className="text-xs text-neutral-400 font-mono">
            {providers} providers × {turnoverRate}% = {departures.toFixed(1)} departures/year
          </p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Burnout portion (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {departures.toFixed(1)} × 45% burnout-related = {burnoutRelated.toFixed(1)} preventable
          </p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Attribution (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {burnoutRelated.toFixed(1)} × 30% documentation-driven = {docDriven.toFixed(1)} attributed
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What does it cost to replace a provider?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={replacementCost}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, replacementCost: Number(e.target.value) || 0 } }))}
              className="w-40 font-mono"
              data-testid="retention-cost-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Include recruiting, onboarding, ramp-up, lost revenue</p>
        </div>
        
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Retention impact typically measurable after 12-18 months
          </p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(prevented * replacementCost))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {prevented.toFixed(2)} departures avoided × ${replacementCost.toLocaleString()} = {formatCurrency(Math.round(prevented * replacementCost))}
          </p>
        </div>
      </div>
    );
  };
  
  const renderLevelOfServiceInputs = () => {
    const { underCodingRate, wrvuFactor } = driverInputs.levelOfService;
    const emEncounters = eligibleEncounters * 0.80;
    const underCoded = emEncounters * (underCodingRate / 100);
    const corrected = underCoded * 0.50;
    
    return (
      <div className="space-y-6">
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">E/M encounters (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {eligibleEncounters.toLocaleString()} eligible × 80% E/M = {Math.round(emEncounters).toLocaleString()} E/M encounters
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your estimated under-coding rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{underCodingRate}%</span>
          </div>
          <Slider
            value={[underCodingRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, underCodingRate: val } }))}
            min={5}
            max={20}
            step={1}
            className="w-full"
            data-testid="los-under-coding-slider"
          />
          <p className="text-xs text-[#6B7280]">Most organizations under-code 8-15% of visits</p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your wRVU conversion factor?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={wrvuFactor}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, wrvuFactor: Number(e.target.value) || 0 } }))}
              className="w-24 font-mono"
              data-testid="los-wrvu-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Check with your finance team—typically $40-55</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(corrected * 0.7 * wrvuFactor))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(underCoded).toLocaleString()} under-coded × 50% corrected × 0.7 wRVU × ${wrvuFactor}
          </p>
        </div>
      </div>
    );
  };
  
  const renderHccInputs = () => {
    const { riskBasedPct, captureRate } = driverInputs.hcc;
    const riskPatients = (encounters / 4) * (riskBasedPct / 100);
    const missedConditions = riskPatients * 2.5 * ((100 - captureRate) / 100);
    const recaptured = missedConditions * 0.15;
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What % of your patients are in risk-based contracts?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{riskBasedPct}%</span>
          </div>
          <Slider
            value={[riskBasedPct]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, riskBasedPct: val } }))}
            min={0}
            max={80}
            step={5}
            className="w-full"
            data-testid="hcc-risk-slider"
          />
          <p className="text-xs text-[#6B7280]">Medicare Advantage, ACO, capitated arrangements</p>
          {riskBasedPct < 10 && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">HCC capture may not be a primary driver for you</p>
          )}
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your current HCC capture rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{captureRate}%</span>
          </div>
          <Slider
            value={[captureRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, captureRate: val } }))}
            min={50}
            max={90}
            step={5}
            className="w-full"
            data-testid="hcc-capture-slider"
          />
          <p className="text-xs text-[#6B7280]">Your quality team or risk adjustment vendor may know this</p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Improvement & value (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(riskPatients).toLocaleString()} risk patients × {(100 - captureRate)}% gap × 15% recaptured × $1,500
          </p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(recaptured * 1500))}
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderDenialsInputs = () => {
    const { denialRate, avgClaimValue } = driverInputs.denials;
    const totalDenials = encounters * (denialRate / 100);
    const docRelated = totalDenials * 0.35;
    const prevented = docRelated * 0.50 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your current claim denial rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{denialRate}%</span>
          </div>
          <Slider
            value={[denialRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, denialRate: val } }))}
            min={3}
            max={15}
            step={1}
            className="w-full"
            data-testid="denials-rate-slider"
          />
          <p className="text-xs text-[#6B7280]">Check with revenue cycle—typically 5-10%</p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Doc-related portion (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(totalDenials).toLocaleString()} denials × 35% doc-related = {Math.round(docRelated).toLocaleString()} doc denials
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your average claim value?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={avgClaimValue}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, avgClaimValue: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="denials-claim-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">For outpatient E/M visits</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(prevented * avgClaimValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(prevented).toLocaleString()} prevented × ${avgClaimValue} = {formatCurrency(Math.round(prevented * avgClaimValue))}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url(${geometricPattern})`,
          backgroundSize: "800px 800px",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
        }}
      />
      
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-[#6B7280]"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-neutral-200" />
            <img src={abridgeLogo} alt="Abridge" className="h-6" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6B7280]">Step 3 of 4</span>
            <span className="text-sm font-medium text-[#111827]">Build Your Model</span>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <div className="flex-1 max-w-[65%] space-y-8">
            <section className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Organization</h2>
                <p className="text-sm text-[#6B7280]">Let's start with the basics</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">How many providers are in scope?</label>
                  <Input
                    type="number"
                    value={providers}
                    onChange={(e) => setProviders(Number(e.target.value) || 0)}
                    placeholder="e.g., 50"
                    className="max-w-xs font-mono"
                    data-testid="input-providers"
                  />
                  <p className="text-xs text-[#6B7280]">This is your starting point. Could be a pilot or full deployment.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Annual encounters for these providers?</label>
                  <Input
                    type="number"
                    value={encounters}
                    onChange={(e) => setEncounters(Number(e.target.value) || 0)}
                    placeholder="e.g., 100,000"
                    className="max-w-xs font-mono"
                    data-testid="input-encounters"
                  />
                  <p className="text-xs text-[#6B7280]">~2,000/provider is typical for primary care, ~1,500 for specialty</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Expected utilization rate?</label>
                  <div className="flex gap-2">
                    {([50, 65, 80] as const).map(rate => (
                      <button
                        key={rate}
                        onClick={() => setUtilizationRate(rate)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          utilizationRate === rate
                            ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                            : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                        }`}
                        data-testid={`utilization-${rate}`}
                      >
                        {rate === 50 && "Early 50%"}
                        {rate === 65 && "Typical 65%"}
                        {rate === 80 && "Aggressive 80%"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280]">% of encounters that will use Abridge</p>
                </div>
                
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <p className="text-sm text-[#111827]">
                    <span className="font-medium">→</span>{" "}
                    <span className="font-mono">{providers.toLocaleString()}</span> providers ×{" "}
                    <span className="font-mono">{encounters.toLocaleString()}</span> encounters ×{" "}
                    <span className="font-mono">{utilizationRate}%</span> ={" "}
                    <span className="font-mono font-semibold text-[#E85D3F]">{eligibleEncounters.toLocaleString()}</span> eligible encounters
                  </p>
                </div>
              </div>
            </section>
            
            <section className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Value Drivers</h2>
                <p className="text-sm text-[#6B7280]">Expand each driver to customize the calculation</p>
              </div>
              
              <div className="space-y-4">
                {activeDrivers.map(driverId => renderDriverAccordion(driverId))}
              </div>
            </section>
            
            <section className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Investment</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Pricing model</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPricingModel("per_clinician")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        pricingModel === "per_clinician"
                          ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                          : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                      }`}
                      data-testid="pricing-per-clinician"
                    >
                      Per clinician/month
                    </button>
                    <button
                      onClick={() => setPricingModel("enterprise")}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        pricingModel === "enterprise"
                          ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                          : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                      }`}
                      data-testid="pricing-enterprise"
                    >
                      Enterprise annual
                    </button>
                  </div>
                </div>
                
                {pricingModel === "per_clinician" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">Cost per clinician</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280]">$</span>
                      <Input
                        type="number"
                        value={costPerMonth}
                        onChange={(e) => setCostPerMonth(Number(e.target.value) || 0)}
                        className="w-24 font-mono"
                        data-testid="input-cost-per-month"
                      />
                      <span className="text-sm text-[#6B7280]">/month</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">Annual enterprise cost</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280]">$</span>
                      <Input
                        type="number"
                        value={enterpriseAnnual}
                        onChange={(e) => setEnterpriseAnnual(Number(e.target.value) || 0)}
                        className="w-40 font-mono"
                        data-testid="input-enterprise-annual"
                      />
                      <span className="text-sm text-[#6B7280]">/year</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Contract term</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(term => (
                      <button
                        key={term}
                        onClick={() => setContractTerm(term as 1 | 2 | 3)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          contractTerm === term
                            ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                            : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                        }`}
                        data-testid={`contract-term-${term}`}
                      >
                        {term} yr{term > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeImplementation}
                    onChange={(e) => setIncludeImplementation(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                    data-testid="checkbox-implementation"
                  />
                  <label className="text-sm text-[#111827]">Add implementation fee</label>
                  {includeImplementation && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6B7280]">$</span>
                      <Input
                        type="number"
                        value={implementationFee}
                        onChange={(e) => setImplementationFee(Number(e.target.value) || 0)}
                        className="w-28 font-mono"
                        data-testid="input-implementation-fee"
                      />
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <p className="text-sm text-[#111827]">
                    {pricingModel === "per_clinician" ? (
                      <>
                        <span className="font-mono">{providers}</span> providers ×{" "}
                        <span className="font-mono">${costPerMonth}</span> × 12 ={" "}
                        <span className="font-mono font-semibold">{formatCurrency(annualInvestment)}</span>/year
                      </>
                    ) : (
                      <span className="font-mono font-semibold">{formatCurrency(enterpriseAnnual)}</span>
                    )}
                    {includeImplementation && (
                      <span className="text-[#6B7280]"> + {formatCurrency(implementationFee)} implementation</span>
                    )}
                  </p>
                </div>
              </div>
            </section>
          </div>
          
          <div className="w-[35%]">
            <div className="sticky top-24 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#111827] mb-6">Live Model</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Your Inputs</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-[#6B7280]">Providers</span>
                    <span className="font-mono text-right text-[#111827]">{providers.toLocaleString()}</span>
                    <span className="text-[#6B7280]">Encounters</span>
                    <span className="font-mono text-right text-[#111827]">{encounters.toLocaleString()}</span>
                    <span className="text-[#6B7280]">Utilization</span>
                    <span className="font-mono text-right text-[#111827]">{utilizationRate}%</span>
                    <span className="text-[#6B7280]">Eligible</span>
                    <span className="font-mono text-right font-medium text-[#E85D3F]">{eligibleEncounters.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <h4 className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Your Value</h4>
                  
                  {timeSubtotal > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <Clock className="w-4 h-4" />
                        <span>Time Saved</span>
                      </div>
                      {Object.entries(driverResults)
                        .filter(([_, d]) => d.category === "time")
                        .map(([id, d]) => (
                          <div key={id} className="flex justify-between text-sm pl-6">
                            <span className="text-[#6B7280] truncate">{d.name}</span>
                            <span className="font-mono text-[#111827]">{formatCurrency(d.value)}</span>
                          </div>
                        ))}
                      <div className="flex justify-between text-sm pl-6 font-medium border-t border-neutral-50 pt-2">
                        <span className="text-[#111827]">Subtotal</span>
                        <span className="font-mono text-[#111827]">{formatCurrency(timeSubtotal)}</span>
                      </div>
                    </div>
                  )}
                  
                  {qualitySubtotal > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <FileX className="w-4 h-4" />
                        <span>Doc Quality</span>
                      </div>
                      {Object.entries(driverResults)
                        .filter(([_, d]) => d.category === "quality")
                        .map(([id, d]) => (
                          <div key={id} className="flex justify-between text-sm pl-6">
                            <span className="text-[#6B7280] truncate">{d.name}</span>
                            <span className="font-mono text-[#111827]">{formatCurrency(d.value)}</span>
                          </div>
                        ))}
                      <div className="flex justify-between text-sm pl-6 font-medium border-t border-neutral-50 pt-2">
                        <span className="text-[#111827]">Subtotal</span>
                        <span className="font-mono text-[#111827]">{formatCurrency(qualitySubtotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-neutral-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#111827]">Total Benefit</span>
                    <span className="font-mono font-semibold text-[#111827]">{formatCurrency(totalBenefit)}/yr</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-[#6B7280]">Investment</span>
                    <span className="font-mono text-[#6B7280]">{formatCurrency(totalInvestment)}/yr</span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-[#E85D3F]/10 to-[#E85D3F]/5 rounded-xl p-4 border border-[#E85D3F]/20">
                  <div className="text-center mb-3">
                    <span className="text-xs text-[#6B7280] uppercase tracking-wider">Net Gain</span>
                    <div className="font-mono font-bold text-2xl text-[#E85D3F]">{formatCurrency(netGain)}/yr</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <div className="font-mono font-semibold text-[#111827]">{roiMultiple.toFixed(1)}x</div>
                      <div className="text-xs text-[#6B7280]">ROI</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-semibold text-[#111827]">{paybackMonths} mo</div>
                      <div className="text-xs text-[#6B7280]">Payback</div>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleComplete}
                  className="w-full bg-[#E85D3F] border-[#E85D3F] text-white"
                  data-testid="button-view-summary"
                >
                  View Full Summary
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
