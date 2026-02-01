import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Pencil,
  Clock,
  TrendingUp,
  Check,
  DollarSign,
  FileText,
  Lightbulb,
  Target,
  Rocket,
  MapPin,
  ArrowRight,
  Users,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Share2,
  Mail,
} from "lucide-react";
import { ExploreProgressBar } from "@/components/ExploreProgressBar";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type CareSettingType, CARE_SETTING_LABELS, QUALITATIVE_CONFIG, SETTING_CONFIG } from "@/lib/SETTING_CONFIG";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { type ModelResults } from "@/pages/ModelBuilder";
import { generateOutpatientROIPDF, generateOutpatientROIPDFBlob } from "@/lib/outpatient-pdf-generator";
import { transformToOutpatientPDFData } from "@/lib/outpatient-pdf-data-transformer";
import { generateEDROIPDF, generateEDROIPDFBlob } from "@/lib/ed-pdf-generator";
import { transformToEDPDFData } from "@/lib/ed-pdf-data-transformer";
import { generateInpatientROIPDF, generateInpatientROIPDFBlob } from "@/lib/inpatient-pdf-generator";
import { transformToInpatientPDFData } from "@/lib/inpatient-pdf-data-transformer";
import { generateNursingROIPDF, generateNursingROIPDFBlob } from "@/lib/nursing-pdf-generator";
import { transformToNursingPDFData } from "@/lib/nursing-pdf-data-transformer";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";
import { ManageModelSheet } from "@/components/ManageModelSheet";
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
  patient_access: { category: "revenue", label: "Patient Access" },
  patientAccess: { category: "revenue", label: "Patient Access" },
  retention: { category: "labor", label: "Provider Retention" },
  workforce: { category: "labor", label: "Clinician Retention" },
  level_of_service: { category: "revenue", label: "Level of Service" },
  levelOfService: { category: "revenue", label: "Level of Service" },
  wrvu: { category: "revenue", label: "Accurate Level of Service" },
  hcc_capture: { category: "revenue", label: "HCC Capture" },
  hcc: { category: "revenue", label: "HCC Risk Capture" },
  denials: { category: "revenue", label: "Denial Prevention" },
  nursingOvertime: { category: "labor", label: "Overtime Reduction" },
  nursingRetention: { category: "labor", label: "Nurse Retention" },
  nursingAgency: { category: "labor", label: "Agency Reduction" },
  nursingHAPI: { category: "revenue", label: "HAPI Prevention" },
  nursingFalls: { category: "revenue", label: "Falls Prevention" },
  nursingSurvey: { category: "labor", label: "Survey & Compliance Readiness" },
  nursingCareCoordination: { category: "labor", label: "Care Coordination" },
  nursingPatientExperience: { category: "labor", label: "Patient Experience (HCAHPS)" },
  edThroughput: { category: "labor", label: "Patient Throughput (LWBS Reduction)" },
  edScribe: { category: "labor", label: "Scribe Cost Reduction" },
  edRetention: { category: "labor", label: "Physician Retention" },
  edLevelOfService: { category: "revenue", label: "Level-of-Service Accuracy" },
  edDenials: { category: "revenue", label: "Documentation-Related Denials" },
  edPatientExperience: { category: "labor", label: "Patient Experience" },
  inpatientRounding: { category: "labor", label: "Rounding Efficiency" },
  inpatientRetention: { category: "labor", label: "Hospitalist Retention" },
  inpatientCCMCC: { category: "revenue", label: "CC/MCC Capture" },
  inpatientCDI: { category: "labor", label: "CDI Query Reduction" },
  inpatientDenials: { category: "revenue", label: "Documentation-Related Denials" },
};

const settingConfig: Record<string, { unitName: string; unitNamePlural: string; encounterName: string }> = {
  outpatient: { unitName: "provider", unitNamePlural: "providers", encounterName: "encounters" },
  ed: { unitName: "ED provider", unitNamePlural: "ED providers", encounterName: "patient visits" },
  inpatient: { unitName: "hospitalist", unitNamePlural: "hospitalists", encounterName: "discharges" },
  nursing: { unitName: "staffed bed", unitNamePlural: "staffed beds", encounterName: "documentation events" },
};

function CustomTooltip({ active, payload, unitName = "beds", encountersPerUnit = 0, volumeUnit = "encounters" }: { active?: boolean; payload?: Array<{ payload: { providers: number; utilization: number; value: number; linearValue: number; actualValue: number; roi: string; milestoneLabel?: string | null; phase?: string; month?: number } }>; unitName?: string; encountersPerUnit?: number; volumeUnit?: string }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const compoundingEffect = data.actualValue - data.linearValue;
    const estimatedVolume = Math.round(data.providers * encountersPerUnit);
    return (
      <div className="bg-[#0F172A] rounded-xl p-5 shadow-2xl border border-white/10 min-w-[200px]">
        <div className="mb-4 pb-3 border-b border-white/10">
          {data.phase && (
            <p className="text-white font-bold text-base">{data.phase}</p>
          )}
          <p className="text-white/50 text-sm">
            {data.month === 0 ? 'Today' : `${data.month} months`}
          </p>
        </div>
        
        <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
          <p className="text-white/70 text-sm">
            {data.providers.toLocaleString()} {unitName}
          </p>
          {encountersPerUnit > 0 && (
            <p className="text-white/70 text-sm">
              ~{estimatedVolume.toLocaleString()} {volumeUnit}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6">
            <span className="text-white/50 text-sm">Projected</span>
            <span className="text-[#EA2C00] font-bold text-lg font-mono">{formatCurrency(data.actualValue)}</span>
          </div>
          {compoundingEffect > 0 && (
            <div className="flex items-center justify-between gap-6">
              <span className="text-white/50 text-sm">Bonus</span>
              <span className="text-[#F07B5F] font-semibold font-mono">+{formatCurrency(compoundingEffect)}</span>
            </div>
          )}
        </div>
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
  onBackToJourney,
}: SummaryCommandCenterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [manageModelSheetOpen, setManageModelSheetOpen] = useState(false);
  const [addedDrivers, setAddedDrivers] = useState<Record<string, { name: string; value: number; inputs: Record<string, any> }>>({});
  const [removedDriverIds, setRemovedDriverIds] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting] || settingConfig.outpatient;
  const isNursingSetting = selectedSettings.includes("nursing");
  
  const initialUnits = isNursingSetting 
    ? (modelResults.nursingStaffedBeds || 200)
    : modelResults.providers;
  const initialEncountersPerUnit = modelResults.encounters / Math.max(initialUnits, 1);
  const initialUtilization = modelResults.utilizationRate;
  
  const [pilotUnits] = useState(initialUnits);
  const [encountersPerUnit] = useState(Math.round(initialEncountersPerUnit));
  const [pilotUtilization] = useState(initialUtilization);
  
  const [fullScaleUnits, setFullScaleUnits] = useState<number | "">(Math.round(initialUnits * 3)); 
  const [fullScaleUtilization, setFullScaleUtilization] = useState<number>(Math.min(initialUtilization + 15, 85));
  
  const safeFullScaleUnits = fullScaleUnits === "" ? pilotUnits + 1 : fullScaleUnits;
  const [selectedPace, setSelectedPace] = useState<"measured" | "steady" | "aggressive">("steady");
  
  const mergedDriverResults = useMemo(() => {
    const merged: Record<string, any> = {};
    Object.entries(modelResults.driverResults).forEach(([id, driver]) => {
      if (!removedDriverIds.has(id)) {
        merged[id] = driver;
      }
    });
    Object.entries(addedDrivers).forEach(([id, driver]) => {
      if (!removedDriverIds.has(id)) {
        merged[id] = {
          id,
          name: driver.name,
          value: driver.value,
          inputs: driver.inputs,
        };
      }
    });
    return merged;
  }, [modelResults.driverResults, addedDrivers, removedDriverIds]);
  
  const addedDriversValue = useMemo(() => {
    return Object.entries(addedDrivers)
      .filter(([id]) => !removedDriverIds.has(id))
      .reduce((sum, [, d]) => sum + d.value, 0);
  }, [addedDrivers, removedDriverIds]);
  
  const removedOriginalDriversValue = useMemo(() => {
    return Object.entries(modelResults.driverResults || {})
      .filter(([id]) => removedDriverIds.has(id))
      .reduce((sum, [, d]) => sum + (d.value || 0), 0);
  }, [modelResults.driverResults, removedDriverIds]);
  
  const totalAnnualValue = modelResults.totalBenefit + addedDriversValue - removedOriginalDriversValue;
  const annualInvestment = modelResults.investment || 0;
  const implementationFee = modelResults.implementationFee || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  const handleAddDriver = useCallback((driver: { id: string; name: string; value: number; inputs: Record<string, any> }) => {
    setAddedDrivers(prev => ({
      ...prev,
      [driver.id]: {
        name: driver.name,
        value: driver.value,
        inputs: driver.inputs,
      },
    }));
    toast({
      title: "Driver Added",
      description: `${driver.name} added: ${formatCurrency(driver.value)} annual value`,
    });
  }, [toast]);

  const handleUpdateDriver = useCallback((driver: { id: string; name: string; value: number; inputs: Record<string, any> }) => {
    setAddedDrivers(prev => ({
      ...prev,
      [driver.id]: {
        name: driver.name,
        value: driver.value,
        inputs: driver.inputs,
      },
    }));
    toast({
      title: "Driver Updated",
      description: `${driver.name} updated: ${formatCurrency(driver.value)} annual value`,
    });
  }, [toast]);

  const handleRemoveDriver = useCallback((driverId: string) => {
    setAddedDrivers(prev => {
      const { [driverId]: removed, ...rest } = prev;
      return rest;
    });
    setRemovedDriverIds(prev => new Set([...Array.from(prev), driverId]));
    toast({
      title: "Driver Removed",
      description: "Driver has been removed from your model",
    });
  }, [toast]);

  const existingDriversForSheet = useMemo(() => {
    return Object.entries(mergedDriverResults).map(([id, driver]) => ({
      id,
      name: driver.name || id,
      value: driver.value || 0,
      inputs: driver.inputs || {},
    }));
  }, [mergedDriverResults]);
  
  const pilotEncounters = pilotUnits * encountersPerUnit * (pilotUtilization / 100);
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  const paceConfig = {
    measured: { months: 36, maturityMultiplier: 1.15, label: "36 months" },
    steady: { months: 24, maturityMultiplier: 1.20, label: "24 months" },
    aggressive: { months: 18, maturityMultiplier: 1.25, label: "18 months" }
  };
  
  const currentPace = paceConfig[selectedPace];
  
  const chartData = useMemo(() => {
    const points: Array<{
      providers: number;
      index: number;
      month: number;
      linearValue: number;
      actualValue: number;
      value: number;
      net: number;
      roi: string;
      utilization: number;
      phase: string;
      isPilot: boolean;
      isFullScale: boolean;
      isMilestone: boolean;
      milestoneLabel: string | null;
    }> = [];
    
    const totalMonths = currentPace.months;
    const milestones = [0, 6, 12, 18, 24, 36].filter(m => m <= totalMonths || m === 0);
    if (!milestones.includes(totalMonths)) {
      milestones.push(totalMonths);
    }
    milestones.sort((a, b) => a - b);
    
    const getPhase = (progress: number): string => {
      if (progress === 0) return 'Today';
      if (progress < 0.3) return 'Early Expansion';
      if (progress < 0.6) return 'Expansion';
      if (progress < 0.9) return 'Scale';
      return 'Full Scale';
    };
    
    const pilotValue = totalAnnualValue;
    const pilotBeds = pilotUnits;
    const pilotUtil = pilotUtilization;
    
    const bedMultiplier = safeFullScaleUnits / pilotBeds;
    const linearFullScale = pilotValue * bedMultiplier;
    const utilizationBoost = fullScaleUtilization / pilotUtil;
    const baseFullScale = linearFullScale * utilizationBoost;
    const fullScaleValue = baseFullScale * currentPace.maturityMultiplier;
    
    milestones.forEach((month, idx) => {
      const progress = month / totalMonths;
      
      const beds = Math.round(pilotBeds + (safeFullScaleUnits - pilotBeds) * progress);
      const utilizationProgress = Math.pow(progress, 0.8);
      const utilization = Math.round(pilotUtil + (fullScaleUtilization - pilotUtil) * utilizationProgress);
      const linearValue = Math.round(pilotValue * (beds / pilotBeds));
      const currentUtilBoost = utilization / pilotUtil;
      const maturityBoost = 1 + ((currentPace.maturityMultiplier - 1) * Math.pow(progress, 1.5));
      const actualValue = Math.round(linearValue * currentUtilBoost * maturityBoost);
      const investment = beds * pricePerUnit * 12;
      const roi = investment > 0 ? (actualValue / investment) : 0;
      
      points.push({
        providers: beds,
        index: idx * (20 / (milestones.length - 1)),
        month,
        linearValue,
        actualValue,
        value: actualValue,
        net: actualValue - investment,
        roi: roi.toFixed(1),
        utilization,
        phase: getPhase(progress),
        isPilot: month === 0,
        isFullScale: month === totalMonths,
        isMilestone: true,
        milestoneLabel: month === 0 ? 'Today' : month === totalMonths ? 'Full Scale' : `${month}mo`
      });
    });
    
    return points;
  }, [pilotUnits, safeFullScaleUnits, pilotUtilization, fullScaleUtilization, pricePerUnit, totalAnnualValue, currentPace]);
  
  const pilot = chartData[0];
  const fullScale = chartData[chartData.length - 1];
  const networkEffect = fullScale.actualValue - fullScale.linearValue;
  
  const valueBreakdown = useMemo(() => {
    const breakdown: { id: string; name: string; value: number; category: "labor" | "revenue" }[] = [];
    
    Object.entries(mergedDriverResults).forEach(([key, result]) => {
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
  }, [mergedDriverResults]);
  
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
  const year1Cost = annualInvestment + implementationFee;
  const year2Cost = annualInvestment;
  const year3Cost = annualInvestment;
  const threeYearCost = year1Cost + year2Cost + year3Cost;
  const threeYearNet = threeYearValue - threeYearCost;

  const handleExportPdf = useCallback(async (exportClientName?: string, exportPreparedBy?: string) => {
    const effectiveClientName = exportClientName ?? clientName;
    const effectivePreparedBy = exportPreparedBy ?? preparedBy;
    const driverIdMap: Record<string, string> = {
      patient_access: 'patientAccess',
      patientAccess: 'patientAccess',
      level_of_service: 'wrvu',
      levelOfService: 'wrvu',
      retention: 'workforce',
      overtime: 'overtime',
      hcc_capture: 'hcc',
      hcc: 'hcc',
      denials: 'denials',
      edThroughput: 'edThroughput',
      edLevelOfService: 'edLevelOfService',
      edDenialReduction: 'edDenials',
      edRetention: 'edRetention',
      edScribe: 'edScribe',
      inpatientRetention: 'inpatientRetention',
      inpatientCCMCC: 'inpatientCCMCC',
      inpatientCDI: 'inpatientCDI',
      inpatientDenials: 'inpatientDenials',
    };

    const driverResults: Record<string, { name: string; value: number; inputs?: Record<string, any> }> = {};
    
    Object.entries(mergedDriverResults).forEach(([key, result]) => {
      if (result && result.value > 0) {
        const normalizedId = driverIdMap[key] || key;
        driverResults[normalizedId] = {
          name: result.name || key,
          value: result.value,
          inputs: result.inputs || {},
        };
      }
    });

    const journeyInputs = {
      pilotProviders: pilotUnits,
      pilotEncounters: pilotUnits * encountersPerUnit,
      pilotUtilization: pilotUtilization,
      pilotValue: totalAnnualValue,
      fullScaleProviders: safeFullScaleUnits,
      fullScaleUtilization: fullScaleUtilization,
      fullScaleValue: fullScale.value,
      scalingPace: selectedPace,
      networkEffect: networkEffect,
    };

    const modelResultsForPDF = {
      totalBenefit: totalAnnualValue,
      investment: annualInvestment,
      implementationFee: 0,
      providers: pilotUnits,
      encounters: pilotUnits * encountersPerUnit,
      utilizationRate: pilotUtilization,
      costPerMonth: pricePerUnit,
      timeSavedPerEncounter: 2.5,
      driverResults,
    };

    if (activeSetting === "ed") {
      const pdfData = transformToEDPDFData(modelResultsForPDF, journeyInputs, undefined, effectiveClientName, effectivePreparedBy);
      await generateEDROIPDF(pdfData);
    } else if (activeSetting === "inpatient") {
      const pdfData = transformToInpatientPDFData(modelResultsForPDF, journeyInputs, undefined, effectiveClientName, effectivePreparedBy);
      await generateInpatientROIPDF(pdfData);
    } else if (activeSetting === "nursing") {
      const nursingJourneyInputs = {
        pilotBeds: pilotUnits,
        pilotEvents: Math.round(pilotUnits * 365 * 8 * (pilotUtilization / 100)),
        pilotUtilization,
        pilotValue: Math.round(totalAnnualValue * (pilotUnits / safeFullScaleUnits) * (pilotUtilization / fullScaleUtilization)),
        fullScaleBeds: safeFullScaleUnits,
        fullScaleUtilization,
        fullScaleValue: fullScale.value,
        scalingPace: selectedPace as "measured" | "steady" | "aggressive",
        networkEffect,
      };
      const nursingModelResults = {
        totalBenefit: totalAnnualValue,
        investment: annualInvestment,
        staffedBeds: safeFullScaleUnits,
        nurseFTEs: Math.round(safeFullScaleUnits * 1.5),
        documentationEvents: safeFullScaleUnits * 365 * 8,
        utilizationRate: fullScaleUtilization,
        costPerMonth: pricePerUnit,
        timeSavedPerEvent: 5,
        driverResults,
      };
      const pdfData = transformToNursingPDFData(nursingModelResults, nursingJourneyInputs, undefined, effectiveClientName, effectivePreparedBy);
      await generateNursingROIPDF(pdfData);
    } else {
      const pdfData = transformToOutpatientPDFData(
        modelResultsForPDF,
        journeyInputs,
        CARE_SETTING_LABELS[activeSetting],
        effectiveClientName,
        effectivePreparedBy
      );
      await generateOutpatientROIPDF(pdfData);
    }
  }, [
    activeSetting,
    mergedDriverResults,
    pilotUnits,
    encountersPerUnit,
    pilotUtilization,
    totalAnnualValue,
    annualInvestment,
    pricePerUnit,
    safeFullScaleUnits,
    fullScaleUtilization,
    fullScale,
    selectedPace,
    networkEffect,
    clientName,
    preparedBy,
  ]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={6}
        totalSteps={6}
        stepName="Your ROI Model"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100 py-3 px-4">
        <ExploreProgressBar currentStep={6} />
      </div>

      {/* Empty State */}
      {totalAnnualValue === 0 && (
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">No Value Drivers Configured</h2>
          <p className="text-slate-500 mb-8 text-lg">
            Return to the previous step to configure your value drivers.
          </p>
          <Button onClick={onBack} className="bg-[#EA2C00]" data-testid="button-return-drivers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      )}

      {totalAnnualValue > 0 && (
        <>
          {/* ========== HERO SECTION ========== */}
          <section className="relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
            
            <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
              {/* Header Badge */}
              <div className="flex justify-center mb-10">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#EA2C00] animate-pulse" />
                  {CARE_SETTING_LABELS[activeSetting]} • {pilotUnits} {config.unitNamePlural}
                </span>
              </div>
              
              {/* Main ROI Display */}
              <div className="text-center mb-16">
                <div className="text-white/40 text-sm uppercase tracking-[0.2em] mb-4">
                  Annual Net Value
                </div>
                <div className="relative inline-block">
                  <div 
                    className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight"
                    style={{ 
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F07B5F 50%, #EA2C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                    data-testid="summary-net-value"
                  >
                    {formatCurrency(netValue)}
                  </div>
                </div>
                <div className="mt-6 text-white/50 text-lg">
                  {formatCurrency(totalAnnualValue)} value − {formatCurrency(annualInvestment)} investment
                </div>
              </div>
              
              {/* Key Metrics Row */}
              {(() => {
                const timeSavedMinutesPerEncounter = modelResults.timeSavedPerEncounter || 3;
                const eligibleEncounters = Math.round(pilotUnits * encountersPerUnit * (pilotUtilization / 100));
                const totalMinutesSaved = eligibleEncounters * timeSavedMinutesPerEncounter;
                const totalHoursSaved = Math.round(totalMinutesSaved / 60);
                const workingDays = 250;
                const minutesPerDay = Math.round(totalMinutesSaved / workingDays / pilotUnits);
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="summary-roi">
                        {roiMultiple.toFixed(1)}×
                      </div>
                      <div className="text-white/40 text-sm uppercase tracking-wider">
                        Return on Investment
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="summary-hours-saved">
                        {totalHoursSaved.toLocaleString()}
                      </div>
                      <div className="text-white/40 text-sm uppercase tracking-wider">
                        Hours Saved Annually
                      </div>
                    </div>
                    
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center">
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2" data-testid="summary-minutes-per-day">
                        {minutesPerDay}
                      </div>
                      <div className="text-white/40 text-sm uppercase tracking-wider">
                        Minutes Saved Per Day
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* ========== VALUE BREAKDOWN ========== */}
          <section className="py-16 md:py-24 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Where Your Value Comes From
                </h2>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                  Your ROI is built on {valueBreakdown.length} distinct value drivers
                </p>
              </div>
              
              {/* Value Bar Visualization */}
              <div className="mb-12">
                <div className="h-4 flex rounded-full overflow-hidden bg-slate-100">
                  {laborPercent > 0 && (
                    <div 
                      className="bg-slate-700 transition-all duration-500"
                      style={{ width: `${laborPercent}%` }}
                    />
                  )}
                  {revenuePercent > 0 && (
                    <div 
                      className="bg-[#EA2C00] transition-all duration-500"
                      style={{ width: `${revenuePercent}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-3">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-slate-700" />
                    Labor & Efficiency ({laborPercent}%)
                  </span>
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#EA2C00]" />
                    Revenue & Quality ({revenuePercent}%)
                  </span>
                </div>
              </div>
              
              {/* Driver Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Labor & Efficiency */}
                <div className="bg-slate-50 rounded-2xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Labor & Efficiency</h3>
                      <p className="text-slate-500">{laborPercent}% of total value</p>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-slate-900 mb-6">
                    {formatCurrency(laborValue)}
                  </div>
                  <div className="space-y-4">
                    {laborDrivers.map((driver) => (
                      <div key={driver.id} className="flex justify-between items-center py-3 border-b border-slate-200 last:border-0">
                        <span className="text-slate-700">{driver.name}</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(driver.value)}</span>
                      </div>
                    ))}
                    {laborDrivers.length === 0 && (
                      <p className="text-slate-400 italic">No labor drivers selected</p>
                    )}
                  </div>
                </div>
                
                {/* Revenue & Quality */}
                <div className="bg-gradient-to-br from-[#FFF8F6] to-[#FFF1ED] rounded-2xl p-8 border border-[#FECACA]/30">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#EA2C00] flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Revenue & Quality</h3>
                      <p className="text-slate-500">{revenuePercent}% of total value</p>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-[#EA2C00] mb-6">
                    {formatCurrency(revenueValue)}
                  </div>
                  <div className="space-y-4">
                    {revenueDrivers.map((driver) => (
                      <div key={driver.id} className="flex justify-between items-center py-3 border-b border-[#FECACA]/30 last:border-0">
                        <span className="text-slate-700">{driver.name}</span>
                        <span className="font-mono font-semibold text-[#EA2C00]">{formatCurrency(driver.value)}</span>
                      </div>
                    ))}
                    {revenueDrivers.length === 0 && (
                      <p className="text-slate-400 italic">No revenue drivers selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========== SCALING JOURNEY ========== */}
          <section className="py-16 md:py-24 px-6 bg-slate-50">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Your Journey to Full Scale
                </h2>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                  Start with a pilot. Prove the value. Scale across your organization.
                </p>
              </div>
              
              {/* Chart */}
              <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 mb-10">
                <div className="h-72 md:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 10, bottom: 50 }}>
                      <defs>
                        <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#EA2C00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      
                      <XAxis 
                        dataKey="month"
                        type="number"
                        domain={[0, currentPace.months]}
                        axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                        tickLine={false}
                        tick={(props: { x: number; y: number; payload: { value: number } }) => {
                          const { x, y, payload } = props;
                          const point = chartData.find(d => d.month === payload.value);
                          if (!point) return <g />;
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text 
                                x={0} 
                                y={16} 
                                textAnchor="middle" 
                                fill={point.isPilot || point.isFullScale ? "#EA2C00" : "#64748B"}
                                fontSize={12}
                                fontWeight={point.isPilot || point.isFullScale ? 700 : 500}
                              >
                                {point.milestoneLabel}
                              </text>
                            </g>
                          );
                        }}
                        ticks={chartData.map(d => d.month)}
                        height={50}
                      />
                    
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94A3B8", fontSize: 11 }}
                        tickFormatter={(v) => formatCompactCurrency(v)}
                        width={60}
                      />
                      
                      <Tooltip content={<CustomTooltip unitName={config.unitNamePlural} encountersPerUnit={encountersPerUnit} volumeUnit={config.encounterName} />} />
                      
                      <Area 
                        type="monotone" 
                        dataKey="actualValue" 
                        stroke="none"
                        fill="url(#valueGradient)"
                      />
                      
                      <Line 
                        type="monotone" 
                        dataKey="linearValue" 
                        stroke="#CBD5E1" 
                        strokeWidth={2}
                        strokeDasharray="8 6"
                        dot={false}
                      />
                      
                      <Line 
                        type="monotone" 
                        dataKey="actualValue" 
                        stroke="#EA2C00" 
                        strokeWidth={3}
                        dot={false}
                      />
                      
                      <ReferenceDot 
                        x={0} 
                        y={pilot.actualValue} 
                        r={8} 
                        fill="#EA2C00" 
                        stroke="white"
                        strokeWidth={3}
                      />
                      
                      <ReferenceDot 
                        x={currentPace.months} 
                        y={fullScale.actualValue} 
                        r={8} 
                        fill="#EA2C00" 
                        stroke="white"
                        strokeWidth={3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-6 mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-[#EA2C00] rounded-full" />
                    <span className="text-sm text-slate-600">Projected value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 border-t-2 border-dashed border-slate-300" />
                    <span className="text-sm text-slate-600">Linear baseline</span>
                  </div>
                </div>
              </div>
              
              {/* Scaling Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {(["measured", "steady", "aggressive"] as const).map((pace) => (
                  <button
                    key={pace}
                    onClick={() => setSelectedPace(pace)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                      selectedPace === pace 
                        ? "border-[#EA2C00] bg-white shadow-lg" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid={`pace-${pace}`}
                  >
                    {pace === "steady" && (
                      <span className="absolute -top-3 right-4 px-3 py-1 bg-[#EA2C00] text-white text-xs font-bold uppercase rounded-full">
                        Recommended
                      </span>
                    )}
                    <div className="font-bold text-slate-900 text-lg capitalize mb-1">{pace}</div>
                    <div className="text-slate-500 text-sm">{paceConfig[pace].months} months to full scale</div>
                  </button>
                ))}
              </div>
              
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                  <div className="text-sm text-slate-500 uppercase tracking-wider mb-3">Today (Pilot)</div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{formatCurrency(pilot.value)}</div>
                  <div className="text-slate-500 mb-4">annual value</div>
                  <span className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                    {pilot.roi}× ROI
                  </span>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-10 h-10 text-slate-300 hidden md:block" />
                  <ChevronDown className="w-8 h-8 text-slate-300 md:hidden" />
                </div>
                
                <div className="bg-gradient-to-br from-[#EA2C00] to-[#F07B5F] rounded-2xl p-8 text-center text-white">
                  <div className="text-sm text-white/70 uppercase tracking-wider mb-3">Full Scale</div>
                  <div className="text-3xl md:text-4xl font-bold mb-2">{formatCurrency(fullScale.value)}</div>
                  <div className="text-white/70 mb-4">annual value</div>
                  <span className="inline-block px-4 py-2 bg-white/20 text-white rounded-full text-sm font-semibold">
                    {fullScale.roi}× ROI
                  </span>
                </div>
              </div>
              
              {/* Compounding Effect */}
              <div className="mt-8 bg-white rounded-2xl p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-[#EA2C00]" />
                  <span className="font-bold text-slate-900">The Compounding Effect</span>
                </div>
                <p className="text-slate-600 mb-6">
                  As you scale, value compounds through increased utilization, retention benefits, and shared learnings.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-[#EA2C00]" />
                    <span className="text-sm text-slate-700">Utilization: {pilotUtilization}% → {fullScaleUtilization}%</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <Rocket className="w-4 h-4 text-[#EA2C00]" />
                    <span className="text-sm text-slate-700">Bonus: +{formatCurrency(networkEffect)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========== INVESTMENT SECTION ========== */}
          <section className="py-16 md:py-24 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Investment Summary
                </h2>
              </div>
              
              <div className="bg-slate-50 rounded-3xl p-8 md:p-12">
                {/* 3-Year Projection Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left pb-4 font-medium text-slate-500"></th>
                        <th className="text-right pb-4 font-medium text-slate-500">Year 1</th>
                        <th className="text-right pb-4 font-medium text-slate-500">Year 2</th>
                        <th className="text-right pb-4 font-medium text-slate-500">Year 3</th>
                        <th className="text-right pb-4 font-bold text-slate-900">3-Year Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-lg">
                      <tr className="border-b border-slate-100">
                        <td className="py-4 text-slate-600">Value Created</td>
                        <td className="py-4 text-right font-mono">{formatCompactCurrency(year1)}</td>
                        <td className="py-4 text-right font-mono">{formatCompactCurrency(year2)}</td>
                        <td className="py-4 text-right font-mono">{formatCompactCurrency(year3)}</td>
                        <td className="py-4 text-right font-mono font-semibold">{formatCompactCurrency(threeYearValue)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-4 text-slate-600">Investment</td>
                        <td className="py-4 text-right font-mono text-slate-500">({formatCompactCurrency(year1Cost)})</td>
                        <td className="py-4 text-right font-mono text-slate-500">({formatCompactCurrency(year2Cost)})</td>
                        <td className="py-4 text-right font-mono text-slate-500">({formatCompactCurrency(year3Cost)})</td>
                        <td className="py-4 text-right font-mono text-slate-500">({formatCompactCurrency(threeYearCost)})</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-slate-900">Net Value</td>
                        <td className="py-4 text-right font-mono font-bold text-[#EA2C00]">{formatCompactCurrency(year1 - year1Cost)}</td>
                        <td className="py-4 text-right font-mono font-bold text-[#EA2C00]">{formatCompactCurrency(year2 - year2Cost)}</td>
                        <td className="py-4 text-right font-mono font-bold text-[#EA2C00]">{formatCompactCurrency(year3 - year3Cost)}</td>
                        <td className="py-4 text-right font-mono font-bold text-[#EA2C00] text-xl">{formatCompactCurrency(threeYearNet)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <p className="text-slate-500 text-sm mt-6">
                  Assumes 10% annual value growth with increased adoption
                </p>
              </div>
            </div>
          </section>

          {/* ========== ACTIONS SECTION ========== */}
          <section className="py-16 md:py-24 px-6 bg-slate-900">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Move Forward?
              </h2>
              <p className="text-slate-400 text-lg mb-10">
                Export your analysis or refine your model
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => setShowExportModal(true)}
                  disabled={isExporting}
                  className="bg-[#EA2C00] text-white px-8"
                  data-testid="button-export-pdf"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {isExporting ? "Exporting..." : "Download PDF"}
                </Button>
                
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setManageModelSheetOpen(true)}
                  className="border-white/20 text-white bg-transparent"
                  data-testid="button-manage-model"
                >
                  <Pencil className="w-5 h-5 mr-2" />
                  Edit Model
                </Button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-slate-500 text-sm">
                  Your model: {CARE_SETTING_LABELS[activeSetting]} • {pilotUnits} {config.unitNamePlural} • ${pricePerUnit}/{config.unitName}/month
                </p>
              </div>
            </div>
          </section>

          {/* ========== ASSUMPTIONS (Collapsible) ========== */}
          <section className="py-8 px-6 bg-white border-t border-slate-100">
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-4"
              >
                <span className="font-semibold text-slate-900">Key Assumptions</span>
                {showDetails ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {showDetails && (
                <div className="pb-6 space-y-3">
                  <div className="flex items-start gap-3 text-slate-600">
                    <Check className="w-4 h-4 text-[#EA2C00] mt-1 flex-shrink-0" />
                    <span>{pilotUnits} {config.unitNamePlural} with {(pilotUnits * encountersPerUnit).toLocaleString()} annual {config.encounterName}</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-600">
                    <Check className="w-4 h-4 text-[#EA2C00] mt-1 flex-shrink-0" />
                    <span>{pilotUtilization}% utilization rate</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-600">
                    <Check className="w-4 h-4 text-[#EA2C00] mt-1 flex-shrink-0" />
                    <span>Investment of {formatCurrency(annualInvestment)} annually at ${pricePerUnit}/{config.unitName}/month</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-600">
                    <Check className="w-4 h-4 text-[#EA2C00] mt-1 flex-shrink-0" />
                    <span>10% annual value growth for multi-year projection</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
      
      {/* Manage Model Sheet */}
      <ManageModelSheet
        open={manageModelSheetOpen}
        onClose={() => setManageModelSheetOpen(false)}
        careSetting={activeSetting}
        existingDrivers={existingDriversForSheet}
        providers={pilotUnits}
        encounters={pilotUnits * encountersPerUnit}
        utilizationRate={pilotUtilization}
        staffedBeds={isNursingSetting ? pilotUnits : undefined}
        nurseFTEs={isNursingSetting ? modelResults.nursingFTEs : undefined}
        onAddDriver={handleAddDriver}
        onUpdateDriver={handleUpdateDriver}
        onRemoveDriver={handleRemoveDriver}
      />

      {/* PDF Export Modal */}
      <PDFExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={async (name, preparer) => {
          setClientName(name);
          setPreparedBy(preparer);
          setIsExporting(true);
          setShowExportModal(false);
          try {
            await handleExportPdf(name, preparer);
            toast({
              title: "PDF Downloaded",
              description: "Your ROI assessment has been saved.",
            });
          } catch (error) {
            toast({
              title: "Export Failed",
              description: "Unable to generate PDF. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsExporting(false);
          }
        }}
        isExporting={isExporting}
      />
    </div>
  );
}
