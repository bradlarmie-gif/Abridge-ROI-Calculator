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
  // ED-specific drivers
  edThroughput: {
    lwbsRate: number;
    improvementLevel: "conservative" | "typical" | "aggressive";
    revenuePerVisit: number;
    includeAdmissions: boolean;
  };
  edScribe: {
    hasScribes: boolean;
    scribeFTEs: number;
    costPerFTE: number;
    reductionLevel: "partial" | "significant" | "full";
  };
  edRetention: {
    turnoverRate: number;
    replacementCost: number;
  };
  edLevelOfService: {
    underCodingRate: number;
    wrvuDelta: number;
    wrvuConversion: number;
  };
  edDenials: {
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
  // ED drivers
  edThroughput: Zap,
  edScribe: Users,
  edRetention: Heart,
  edLevelOfService: BarChart3,
  edDenials: FileX,
};

const DRIVER_NAMES: Record<string, string> = {
  overtime: "Overtime & Locum Savings",
  patientAccess: "Patient Access",
  retention: "Clinician Retention",
  levelOfService: "Accurate Level of Service",
  hcc: "HCC & Chronic Condition Capture",
  denials: "Documentation-Related Denials",
  // ED drivers
  edThroughput: "Patient Throughput (LWBS Reduction)",
  edScribe: "Scribe Cost Reduction",
  edRetention: "Physician Retention",
  edLevelOfService: "Level-of-Service Accuracy",
  edDenials: "Documentation-Related Denials",
};

const DRIVER_THEORIES: Record<string, string> = {
  overtime: "When documentation takes less time, providers finish during regular hours instead of staying late or catching up at home. This eliminates expensive overtime pay and reduces the need for locum coverage to handle documentation backlogs.",
  patientAccess: "By reclaiming 2-3 minutes per encounter, providers can see additional patients without extending their day. This unlocks new revenue—but only if there's patient demand to fill those slots.",
  retention: "Documentation burden is a top driver of physician burnout. By reducing the administrative load, Abridge helps prevent burnout-related departures—each costing $250K-500K to replace.",
  levelOfService: "AI-assisted documentation captures clinical reasoning more completely, leading to more accurate E/M coding. Most practices under-code 8-15% of visits due to documentation gaps.",
  hcc: "Complete documentation captures chronic conditions that often go undocumented. For patients in risk-based contracts, this improves RAF scores and associated payments.",
  denials: "Clear, complete documentation reduces claims denied for insufficient clinical rationale. Preventing denials eliminates rework costs and improves cash flow.",
  // ED drivers
  edThroughput: "Faster documentation means physicians can move through patients more efficiently, reducing wait times and LWBS (left without being seen) rates. Every patient who stays is revenue captured.",
  edScribe: "Many EDs rely on scribes to keep physicians productive. Abridge can replace or reduce scribe needs, converting labor costs to a technology investment with better scalability.",
  edRetention: "ED physicians face some of the highest burnout rates in medicine. Documentation burden is a major contributor. Reducing this burden helps retain expensive-to-replace ED talent.",
  edLevelOfService: "ED visits are complex and fast-paced. Under-documentation is common, leading to under-coding. AI-assisted documentation captures the full clinical picture for accurate E/M levels.",
  edDenials: "ED claims face intense payer scrutiny. Complete, clear documentation at the point of care reduces denials for insufficient clinical rationale and medical necessity.",
};

export default function ModelBuilder({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
}: ModelBuilderProps) {
  const [providers, setProviders] = useState<number>(50);
  const [encounters, setEncounters] = useState<number>(100000);
  const [utilizationRate, setUtilizationRate] = useState<50 | 55 | 65 | 70 | 80 | 85>(65);
  
  const [pricingModel, setPricingModel] = useState<"per_clinician" | "enterprise">("per_clinician");
  const [costPerMonth, setCostPerMonth] = useState<number>(140);
  const [enterpriseAnnual, setEnterpriseAnnual] = useState<number>(500000);
  const [contractTerm, setContractTerm] = useState<1 | 2 | 3 | number>(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const [implementationFee, setImplementationFee] = useState<number>(25000);
  
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  
  const isEDSetting = selectedSettings.includes("ed");
  
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
    // ED defaults
    edThroughput: {
      lwbsRate: 3.5,
      improvementLevel: "typical",
      revenuePerVisit: 600,
      includeAdmissions: false,
    },
    edScribe: {
      hasScribes: true,
      scribeFTEs: 12.5,
      costPerFTE: 45000,
      reductionLevel: "significant",
    },
    edRetention: {
      turnoverRate: 8,
      replacementCost: 800000,
    },
    edLevelOfService: {
      underCodingRate: 12,
      wrvuDelta: 1.2,
      wrvuConversion: 50,
    },
    edDenials: {
      denialRate: 10,
      avgClaimValue: 650,
    },
  });
  
  useEffect(() => {
    // ED typically has ~1,800 encounters per physician, outpatient ~2,000
    const encountersPerProvider = isEDSetting ? 1800 : 2000;
    setEncounters(providers * encountersPerProvider);
  }, [providers, isEDSetting]);
  
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  
  const activeDrivers = useMemo(() => {
    const driverMap: Record<string, string> = {
      // Outpatient mappings
      overtime: "overtime",
      patientAccess: "patientAccess",
      workforce: "retention",
      retention: "retention",
      wrvu: "levelOfService",
      hcc: "hcc",
      hccCapture: "hcc",
      denials: "denials",
      denialReduction: "denials",
      // ED mappings - keep ED drivers as-is
      edThroughput: "edThroughput",
      edScribe: "edScribe",
      edRetention: "edRetention",
      edLevelOfService: "edLevelOfService",
      edDenials: "edDenials",
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
      if (isEDSetting) {
        return ["edThroughput", "edLevelOfService", "edDenials"];
      }
      return ["overtime", "patientAccess", "levelOfService"];
    }
    
    return Array.from(active);
  }, [selectedLevers, isEDSetting]);
  
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
      // ED Drivers
      case "edThroughput": {
        const { lwbsRate, improvementLevel, revenuePerVisit, includeAdmissions } = driverInputs.edThroughput;
        const patientsLeaving = encounters * (lwbsRate / 100);
        const improvementPct = improvementLevel === "conservative" ? 15 : improvementLevel === "typical" ? 20 : 30;
        const patientsRetained = patientsLeaving * (improvementPct / 100) * (utilizationRate / 100);
        let baseValue = patientsRetained * revenuePerVisit;
        if (includeAdmissions) {
          const admissionRevenue = patientsRetained * 0.15 * 12000;
          baseValue += admissionRevenue;
        }
        return Math.round(baseValue);
      }
      case "edScribe": {
        const { hasScribes, scribeFTEs, costPerFTE, reductionLevel } = driverInputs.edScribe;
        if (!hasScribes) return 0;
        const reductionPct = reductionLevel === "partial" ? 40 : reductionLevel === "significant" ? 60 : 80;
        const ftesEliminated = scribeFTEs * (reductionPct / 100) * (utilizationRate / 100);
        return Math.round(ftesEliminated * costPerFTE);
      }
      case "edRetention": {
        const { turnoverRate, replacementCost } = driverInputs.edRetention;
        const departures = providers * (turnoverRate / 100);
        const burnoutRelated = departures * 0.50; // ED is 50% vs 45% for outpatient
        const docDriven = burnoutRelated * 0.30;
        const prevented = docDriven * 0.40 * (utilizationRate / 100);
        return Math.round(prevented * replacementCost);
      }
      case "edLevelOfService": {
        const { underCodingRate, wrvuDelta, wrvuConversion } = driverInputs.edLevelOfService;
        const emEncounters = eligibleEncounters * 0.90; // ED is 90% vs 80% for outpatient
        const underCoded = emEncounters * (underCodingRate / 100);
        const corrected = underCoded * 0.50;
        return Math.round(corrected * wrvuDelta * wrvuConversion);
      }
      case "edDenials": {
        const { denialRate, avgClaimValue } = driverInputs.edDenials;
        const totalDenials = encounters * (denialRate / 100);
        const docRelated = totalDenials * 0.40; // ED is 40% vs 35% for outpatient
        const prevented = docRelated * 0.45 * (utilizationRate / 100); // ED prevention is 45% vs 50%
        return Math.round(prevented * avgClaimValue);
      }
      default:
        return 0;
    }
  }, [providers, encounters, utilizationRate, eligibleEncounters, driverInputs]);
  
  const driverResults = useMemo(() => {
    const results: Record<string, { name: string; value: number; category: "time" | "quality" }> = {};
    const timeDrivers = ["overtime", "patientAccess", "retention", "edThroughput", "edScribe", "edRetention"];
    activeDrivers.forEach(id => {
      results[id] = {
        name: DRIVER_NAMES[id],
        value: calculateDriverValue(id),
        category: timeDrivers.includes(id) ? "time" : "quality",
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
        // ED drivers
        case "edThroughput":
          return {
            lwbsRate: driverInputs.edThroughput.lwbsRate,
            improvementLevel: driverInputs.edThroughput.improvementLevel,
            revenuePerVisit: driverInputs.edThroughput.revenuePerVisit,
            includeAdmissions: driverInputs.edThroughput.includeAdmissions,
          };
        case "edScribe":
          return {
            hasScribes: driverInputs.edScribe.hasScribes,
            scribeFTEs: driverInputs.edScribe.scribeFTEs,
            costPerFTE: driverInputs.edScribe.costPerFTE,
            reductionLevel: driverInputs.edScribe.reductionLevel,
          };
        case "edRetention":
          return {
            turnoverRate: driverInputs.edRetention.turnoverRate,
            replacementCost: driverInputs.edRetention.replacementCost,
          };
        case "edLevelOfService":
          return {
            underCodingRate: driverInputs.edLevelOfService.underCodingRate,
            wrvuDelta: driverInputs.edLevelOfService.wrvuDelta,
            wrvuConversion: driverInputs.edLevelOfService.wrvuConversion,
          };
        case "edDenials":
          return {
            denialRate: driverInputs.edDenials.denialRate,
            avgClaimValue: driverInputs.edDenials.avgClaimValue,
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
      // ED drivers
      case "edThroughput":
        return renderEdThroughputInputs();
      case "edScribe":
        return renderEdScribeInputs();
      case "edRetention":
        return renderEdRetentionInputs();
      case "edLevelOfService":
        return renderEdLevelOfServiceInputs();
      case "edDenials":
        return renderEdDenialsInputs();
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
  
  // ============================================================================
  // ED DRIVER INPUT RENDERERS
  // ============================================================================
  
  const renderEdThroughputInputs = () => {
    const { lwbsRate, improvementLevel, revenuePerVisit, includeAdmissions } = driverInputs.edThroughput;
    const patientsLeaving = encounters * (lwbsRate / 100);
    const improvementPct = improvementLevel === "conservative" ? 15 : improvementLevel === "typical" ? 20 : 30;
    const patientsRetained = patientsLeaving * (improvementPct / 100) * (utilizationRate / 100);
    let baseValue = patientsRetained * revenuePerVisit;
    if (includeAdmissions) {
      baseValue += patientsRetained * 0.15 * 12000;
    }
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your current LWBS rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{lwbsRate}%</span>
          </div>
          <Slider
            value={[lwbsRate * 10]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, lwbsRate: val / 10 } }))}
            min={10}
            max={80}
            step={5}
            className="w-full"
            data-testid="ed-lwbs-slider"
          />
          <p className="text-xs text-[#6B7280]">National average is 2-4%. High-volume urban EDs can be 5-8%</p>
          <p className="text-xs text-neutral-400 font-mono">
            {encounters.toLocaleString()} visits × {lwbsRate}% LWBS = {Math.round(patientsLeaving).toLocaleString()} patients leaving
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Expected throughput improvement</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "aggressive"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, improvementLevel: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  improvementLevel === opt
                    ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                    : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                }`}
                data-testid={`ed-improvement-${opt}`}
              >
                {opt === "conservative" && "Conservative (15%)"}
                {opt === "typical" && "Typical (20%)"}
                {opt === "aggressive" && "Aggressive (30%)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B7280]">Abridge customers typically see 15-25% LWBS reduction</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(patientsLeaving).toLocaleString()} × {improvementPct}% improvement = {Math.round(patientsRetained).toLocaleString()} patients retained
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Revenue per ED visit</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={revenuePerVisit}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, revenuePerVisit: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="ed-revenue-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Ranges from $450 (low acuity) to $1,200 (high acuity)</p>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAdmissions}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, includeAdmissions: e.target.checked } }))}
              className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
              data-testid="ed-admissions-checkbox"
            />
            <span className="text-sm text-[#111827]">Include downstream admission revenue</span>
          </label>
          {includeAdmissions && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded ml-6">
              Adding admission revenue ({Math.round(patientsRetained).toLocaleString()} × 15% admission rate × $12,000 = {formatCurrency(patientsRetained * 0.15 * 12000)}). This is aggressive.
            </p>
          )}
          <p className="text-xs text-[#6B7280]">Some retained patients would have been admitted (~15%). Conservative model excludes this by default.</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(baseValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(patientsRetained).toLocaleString()} retained × ${revenuePerVisit}{includeAdmissions ? " + admission revenue" : ""}
          </p>
        </div>
      </div>
    );
  };
  
  const renderEdScribeInputs = () => {
    const { hasScribes, scribeFTEs, costPerFTE, reductionLevel } = driverInputs.edScribe;
    const reductionPct = reductionLevel === "partial" ? 40 : reductionLevel === "significant" ? 60 : 80;
    const ftesEliminated = hasScribes ? scribeFTEs * (reductionPct / 100) * (utilizationRate / 100) : 0;
    const savings = ftesEliminated * costPerFTE;
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Do you currently use scribes?</label>
          <div className="grid grid-cols-2 gap-2">
            {([true, false] as const).map(opt => (
              <button
                key={String(opt)}
                onClick={() => setDriverInputs(prev => ({ ...prev, edScribe: { ...prev.edScribe, hasScribes: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  hasScribes === opt
                    ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                    : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                }`}
                data-testid={`ed-scribe-${opt ? "yes" : "no"}`}
              >
                {opt ? "Yes, we use scribes" : "No scribes currently"}
              </button>
            ))}
          </div>
        </div>
        
        {!hasScribes ? (
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-[#6B7280]">Scribe reduction doesn't apply to your ED. This driver will contribute $0 to your model.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <label className="text-sm text-[#111827] font-medium">How many scribe FTEs do you have?</label>
              <Input
                type="number"
                value={scribeFTEs}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, edScribe: { ...prev.edScribe, scribeFTEs: Number(e.target.value) || 0 } }))}
                placeholder="e.g., 12.5"
                className="max-w-xs font-mono"
                data-testid="ed-scribe-ftes-input"
              />
              <p className="text-xs text-[#6B7280]">Typical ratio: 0.3-0.6 scribe FTE per ED physician. For {providers} physicians: {Math.round(providers * 0.3)}-{Math.round(providers * 0.6)} FTEs</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm text-[#111827] font-medium">Cost per scribe FTE (annual)</label>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={costPerFTE}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edScribe: { ...prev.edScribe, costPerFTE: Number(e.target.value) || 0 } }))}
                  className="w-32 font-mono"
                  data-testid="ed-scribe-cost-input"
                />
              </div>
              <p className="text-xs text-[#6B7280]">Includes salary, benefits, overhead. Range: $35K (in-house) to $60K (contracted)</p>
              <p className="text-xs text-neutral-400 font-mono">
                {scribeFTEs} FTEs × ${costPerFTE.toLocaleString()} = {formatCurrency(scribeFTEs * costPerFTE)} current investment
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm text-[#111827] font-medium">Expected reduction level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["partial", "significant", "full"] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDriverInputs(prev => ({ ...prev, edScribe: { ...prev.edScribe, reductionLevel: opt } }))}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      reductionLevel === opt
                        ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                        : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                    }`}
                    data-testid={`ed-scribe-reduction-${opt}`}
                  >
                    {opt === "partial" && "Partial (40%)"}
                    {opt === "significant" && "Significant (60%)"}
                    {opt === "full" && "Full (80%)"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#6B7280]">Most EDs reduce by 50-75% over 12 months</p>
              <p className="text-xs text-neutral-400 font-mono">
                {scribeFTEs} FTEs × {reductionPct}% reduction = {Math.round(ftesEliminated * 10) / 10} FTEs eliminated
              </p>
            </div>
            
            <p className="text-xs text-[#6B7280] bg-neutral-50 p-2 rounded">Some organizations redeploy scribes to other roles rather than eliminating positions</p>
          </>
        )}
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(savings))}
            </span>
          </div>
          {hasScribes && (
            <p className="text-xs text-neutral-400 font-mono mt-1">
              {Math.round(ftesEliminated * 10) / 10} FTEs × ${costPerFTE.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  };
  
  const renderEdRetentionInputs = () => {
    const { turnoverRate, replacementCost } = driverInputs.edRetention;
    const departures = providers * (turnoverRate / 100);
    const burnoutRelated = departures * 0.50;
    const docDriven = burnoutRelated * 0.30;
    const prevented = docDriven * 0.40 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your ED physician turnover rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{turnoverRate}%</span>
          </div>
          <Slider
            value={[turnoverRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, turnoverRate: val } }))}
            min={4}
            max={15}
            step={1}
            className="w-full"
            data-testid="ed-turnover-slider"
          />
          <p className="text-xs text-[#6B7280]">ED turnover is typically higher than other specialties (6-12%)</p>
          <p className="text-xs text-neutral-400 font-mono">
            {providers} physicians × {turnoverRate}% = {Math.round(departures * 10) / 10} departures/year
          </p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Burnout portion (auto-calculated):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(departures * 10) / 10} departures × 50% burnout-related = {Math.round(burnoutRelated * 10) / 10} preventable
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(burnoutRelated * 10) / 10} preventable × 30% doc-driven × 40% attribution × {utilizationRate}% adoption = {Math.round(prevented * 100) / 100} avoided
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">ED physician replacement cost</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={replacementCost}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, replacementCost: Number(e.target.value) || 0 } }))}
              className="w-40 font-mono"
              data-testid="ed-replacement-cost-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">ED physicians cost more to replace: $750K-1.2M. Includes recruiting, signing bonus, coverage gaps</p>
        </div>
        
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Retention impact typically measurable after 12-18 months</p>
          </div>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(prevented * replacementCost))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(prevented * 100) / 100} departures avoided × ${replacementCost.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };
  
  const renderEdLevelOfServiceInputs = () => {
    const { underCodingRate, wrvuDelta, wrvuConversion } = driverInputs.edLevelOfService;
    const emEncounters = eligibleEncounters * 0.90;
    const underCoded = emEncounters * (underCodingRate / 100);
    const corrected = underCoded * 0.50;
    const value = corrected * wrvuDelta * wrvuConversion;
    
    return (
      <div className="space-y-6">
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">E/M encounters (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {eligibleEncounters.toLocaleString()} eligible × 90% E/M = {Math.round(emEncounters).toLocaleString()} E/M encounters
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your estimated under-coding rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{underCodingRate}%</span>
          </div>
          <Slider
            value={[underCodingRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, underCodingRate: val } }))}
            min={5}
            max={20}
            step={1}
            className="w-full"
            data-testid="ed-los-under-coding-slider"
          />
          <p className="text-xs text-[#6B7280]">ED under-coding is typically 10-15% (higher than outpatient due to pace)</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(emEncounters).toLocaleString()} × {underCodingRate}% = {Math.round(underCoded).toLocaleString()} under-coded visits
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">wRVU delta per corrected visit</label>
          <Input
            type="number"
            step="0.1"
            value={wrvuDelta}
            onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, wrvuDelta: Number(e.target.value) || 0 } }))}
            className="w-24 font-mono"
            data-testid="ed-wrvu-delta-input"
          />
          <p className="text-xs text-[#6B7280]">ED wRVU deltas are larger than outpatient (~1.0-1.4)</p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">wRVU conversion factor</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={wrvuConversion}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, wrvuConversion: Number(e.target.value) || 0 } }))}
              className="w-24 font-mono"
              data-testid="ed-wrvu-conversion-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Check with your finance team—typically $45-60 for ED</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(value))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(corrected).toLocaleString()} corrected × {wrvuDelta} wRVU × ${wrvuConversion}
          </p>
        </div>
      </div>
    );
  };
  
  const renderEdDenialsInputs = () => {
    const { denialRate, avgClaimValue } = driverInputs.edDenials;
    const totalDenials = encounters * (denialRate / 100);
    const docRelated = totalDenials * 0.40;
    const prevented = docRelated * 0.45 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What's your current ED claim denial rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{denialRate}%</span>
          </div>
          <Slider
            value={[denialRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, denialRate: val } }))}
            min={5}
            max={15}
            step={1}
            className="w-full"
            data-testid="ed-denials-rate-slider"
          />
          <p className="text-xs text-[#6B7280]">ED denial rates are typically 8-12% (higher than outpatient)</p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Doc-related portion (auto):</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(totalDenials).toLocaleString()} denials × 40% doc-related = {Math.round(docRelated).toLocaleString()} doc denials
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(docRelated).toLocaleString()} × 45% prevention × {utilizationRate}% adoption = {Math.round(prevented).toLocaleString()} prevented
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">What's your average ED claim value?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={avgClaimValue}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, avgClaimValue: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="ed-denials-claim-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">ED claims are higher than outpatient: $500-900 typical</p>
        </div>
        
        <div className="p-4 bg-[#E85D3F]/5 rounded-lg border border-[#E85D3F]/20">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-[#E85D3F] text-xl">
              {formatCurrency(Math.round(prevented * avgClaimValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(prevented).toLocaleString()} prevented × ${avgClaimValue}
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
                  <label className="text-sm font-medium text-[#111827]">
                    {isEDSetting ? "How many ED physicians are in scope?" : "How many providers are in scope?"}
                  </label>
                  <Input
                    type="number"
                    value={providers}
                    onChange={(e) => setProviders(Number(e.target.value) || 0)}
                    placeholder={isEDSetting ? "e.g., 25" : "e.g., 50"}
                    className="max-w-xs font-mono"
                    data-testid="input-providers"
                  />
                  <p className="text-xs text-[#6B7280]">
                    {isEDSetting 
                      ? "Include attendings and mid-levels who will use Abridge" 
                      : "This is your starting point. Could be a pilot or full deployment."}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Annual encounters for these {isEDSetting ? "physicians" : "providers"}?</label>
                  <Input
                    type="number"
                    value={encounters}
                    onChange={(e) => setEncounters(Number(e.target.value) || 0)}
                    placeholder={isEDSetting ? "e.g., 45,000" : "e.g., 100,000"}
                    className="max-w-xs font-mono"
                    data-testid="input-encounters"
                  />
                  <p className="text-xs text-[#6B7280]">
                    {isEDSetting 
                      ? "~1,800/physician is typical for a community ED"
                      : "~2,000/provider is typical for primary care, ~1,500 for specialty"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Expected utilization rate?</label>
                  <p className="text-xs text-[#6B7280] mb-2">
                    {isEDSetting 
                      ? "ED adoption is typically higher than outpatient"
                      : "What percentage of encounters will use Abridge?"}
                  </p>
                  <div className="flex gap-2">
                    {(isEDSetting ? [55, 70, 85] as const : [50, 65, 80] as const).map(rate => (
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
                        {isEDSetting ? (
                          <>
                            {rate === 55 && "Early 55%"}
                            {rate === 70 && "Typical 70%"}
                            {rate === 85 && "Aggressive 85%"}
                          </>
                        ) : (
                          <>
                            {rate === 50 && "Early 50%"}
                            {rate === 65 && "Typical 65%"}
                            {rate === 80 && "Aggressive 80%"}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <p className="text-sm text-[#111827]">
                    <span className="font-medium">→</span>{" "}
                    <span className="font-mono">{providers.toLocaleString()}</span> {isEDSetting ? "physicians" : "providers"} ×{" "}
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
                    <span className="text-[#6B7280]">{isEDSetting ? "ED Physicians" : "Providers"}</span>
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
