import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Pencil,
  Share2,
  Clock,
  TrendingUp,
  Check,
  DollarSign,
  BarChart3,
  Plus,
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
  AlertCircle,
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
  // Outpatient drivers - both underscore and camelCase versions
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
  // Nursing drivers
  nursingOvertime: { category: "labor", label: "Overtime Reduction" },
  nursingRetention: { category: "labor", label: "Nurse Retention" },
  nursingAgency: { category: "labor", label: "Agency Reduction" },
  nursingHAPI: { category: "revenue", label: "HAPI Prevention" },
  nursingFalls: { category: "revenue", label: "Falls Prevention" },
  nursingSurvey: { category: "labor", label: "Survey & Compliance Readiness" },
  nursingCareCoordination: { category: "labor", label: "Care Coordination" },
  nursingPatientExperience: { category: "labor", label: "Patient Experience (HCAHPS)" },
  // ED drivers
  edThroughput: { category: "labor", label: "Patient Throughput (LWBS Reduction)" },
  edScribe: { category: "labor", label: "Scribe Cost Reduction" },
  edRetention: { category: "labor", label: "Physician Retention" },
  edLevelOfService: { category: "revenue", label: "Level-of-Service Accuracy" },
  edDenials: { category: "revenue", label: "Documentation-Related Denials" },
  edPatientExperience: { category: "labor", label: "Patient Experience" },
  // Inpatient drivers
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
      <div className="bg-[#1E293B] rounded-xl p-4 shadow-2xl min-w-[220px]">
        {/* Phase & Time */}
        <div className="mb-3">
          {data.phase && (
            <p className="text-white font-bold text-sm">{data.phase}</p>
          )}
          <p className="text-[#94A3B8] text-xs">
            {data.month === 0 ? 'Today' : `${data.month} months`}
          </p>
        </div>
        
        {/* Scale, Volume & Utilization */}
        <div className="mb-3 pb-3 border-b border-[#334155]">
          <p className="text-[#CBD5E1] text-xs">
            {data.providers.toLocaleString()} {unitName}
          </p>
          {encountersPerUnit > 0 && (
            <p className="text-[#CBD5E1] text-xs">
              ~{estimatedVolume.toLocaleString()} {volumeUnit}
            </p>
          )}
          <p className="text-[#CBD5E1] text-xs">
            {data.utilization}% utilization
          </p>
        </div>
        
        {/* Values */}
        <div className="space-y-2 mb-3 pb-3 border-b border-[#334155]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#64748B] text-xs flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#64748B]"></span>
              Linear Value
            </span>
            <span className="text-[#94A3B8] text-sm font-mono">{formatCurrency(data.linearValue)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400 text-xs flex items-center gap-2">
              <span className="w-4 h-0.5 bg-emerald-500 rounded-full"></span>
              Actual Value
            </span>
            <span className="text-emerald-400 font-semibold text-sm font-mono">{formatCurrency(data.actualValue)}</span>
          </div>
          {compoundingEffect > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-400 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Compounding
              </span>
              <span className="text-amber-400 text-sm font-mono">+{formatCurrency(compoundingEffect)}</span>
            </div>
          )}
        </div>
        
        {/* ROI */}
        <div className="flex items-center justify-between">
          <span className="text-[#64748B] text-xs">ROI</span>
          <span className="text-emerald-400 font-bold text-sm">{data.roi}x</span>
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
  const [assumptionsExpanded, setAssumptionsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [manageModelSheetOpen, setManageModelSheetOpen] = useState(false);
  const [addedDrivers, setAddedDrivers] = useState<Record<string, { name: string; value: number; inputs: Record<string, any> }>>({});
  const { toast } = useToast();
  
  // Check if Web Share API is available (typically mobile devices)
  const canShare = typeof navigator !== 'undefined' && 
                   typeof navigator.share === 'function' &&
                   typeof navigator.canShare === 'function';
  
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
  
  const [fullScaleUnits, setFullScaleUnits] = useState<number | "">(Math.round(initialUnits * 3)); 
  const [fullScaleUtilization, setFullScaleUtilization] = useState<number>(Math.min(initialUtilization + 15, 85));
  
  // Safe getters for calculations (use minimum when empty)
  const safeFullScaleUnits = fullScaleUnits === "" ? pilotUnits + 1 : fullScaleUnits;
  const [selectedPace, setSelectedPace] = useState<"measured" | "steady" | "aggressive">("steady");
  
  // Merge original driver results with any drivers added via the sheet
  const mergedDriverResults = useMemo(() => {
    const merged = { ...modelResults.driverResults };
    Object.entries(addedDrivers).forEach(([id, driver]) => {
      merged[id] = {
        id,
        name: driver.name,
        value: driver.value,
        inputs: driver.inputs,
      };
    });
    return merged;
  }, [modelResults.driverResults, addedDrivers]);
  
  // Calculate additional value from newly added drivers
  const addedDriversValue = useMemo(() => {
    return Object.values(addedDrivers).reduce((sum, d) => sum + d.value, 0);
  }, [addedDrivers]);
  
  const totalAnnualValue = modelResults.totalBenefit + addedDriversValue;
  const annualInvestment = modelResults.investment || 0;
  const implementationFee = modelResults.implementationFee || 0;
  const netValue = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? (totalAnnualValue / annualInvestment) : 0;
  const paybackMonths = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;
  
  // Get list of existing driver IDs (both original and added)
  const existingDriverIds = useMemo(() => {
    const originalIds = Object.keys(modelResults.driverResults || {});
    const addedIds = Object.keys(addedDrivers);
    const allIds = [...originalIds, ...addedIds];
    return Array.from(new Set(allIds));
  }, [modelResults.driverResults, addedDrivers]);
  
  // Handler for adding a new driver from the sheet
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
    toast({
      title: "Driver Removed",
      description: "Driver has been removed from your model",
    });
  }, [toast]);

  // Build array of existing drivers for ManageModelSheet
  const existingDriversForSheet = useMemo(() => {
    return Object.entries(mergedDriverResults).map(([id, driver]) => ({
      id,
      name: driver.name || id,
      value: driver.value || 0,
      inputs: driver.inputs || {},
    }));
  }, [mergedDriverResults]);
  
  const pilotEncounters = pilotUnits * encountersPerUnit * (pilotUtilization / 100);
  const valuePerEncounter = pilotEncounters > 0 ? totalAnnualValue / pilotEncounters : 0;
  
  const pricePerUnit = modelResults.costPerMonth || (isNursingSetting ? 75 : 150);
  
  // Calculate additional metrics for quick stats
  const hoursReturnedAnnually = Math.round((totalAnnualValue / 85) * 0.6); // Estimate: $85/hr average * 60% time savings
  const additionalPatientVisits = Math.round((totalAnnualValue / 200) * 0.3); // Estimate: additional visits from efficiency
  
  // Identify qualitative drivers (not quantified, but selected)
  const QUALITATIVE_DRIVER_IDS = ["nursingSurvey", "nursingCareCoordination", "nursingPatientExperience"];
  const qualitativeDrivers = selectedLevers
    .filter(lever => QUALITATIVE_DRIVER_IDS.includes(lever.leverId))
    .map(lever => lever.leverId);
  
  // Pace configuration
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
      if (progress === 0) return 'Pilot';
      if (progress < 0.3) return 'Early Expansion';
      if (progress < 0.6) return 'Expansion';
      if (progress < 0.9) return 'Scale';
      return 'Full Scale';
    };
    
    // Pilot values
    const pilotValue = totalAnnualValue;
    const pilotBeds = pilotUnits;
    const pilotUtil = pilotUtilization;
    
    // Scale multiplier
    const bedMultiplier = safeFullScaleUnits / pilotBeds;
    const linearFullScale = pilotValue * bedMultiplier;
    const utilizationBoost = fullScaleUtilization / pilotUtil;
    const baseFullScale = linearFullScale * utilizationBoost;
    const fullScaleValue = baseFullScale * currentPace.maturityMultiplier;
    
    milestones.forEach((month, idx) => {
      const progress = month / totalMonths;
      
      // Beds scale linearly over time
      const beds = Math.round(pilotBeds + (safeFullScaleUnits - pilotBeds) * progress);
      
      // Utilization ramps up (slightly curved - faster early gains)
      const utilizationProgress = Math.pow(progress, 0.8);
      const utilization = Math.round(pilotUtil + (fullScaleUtilization - pilotUtil) * utilizationProgress);
      
      // Linear value (just bed scaling)
      const linearValue = Math.round(pilotValue * (beds / pilotBeds));
      
      // Actual value (beds + utilization + maturity)
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
        milestoneLabel: month === 0 ? 'Today' : month === totalMonths ? 'Full Scale' : `${month} mo`
      });
    });
    
    return points;
  }, [pilotUnits, safeFullScaleUnits, pilotUtilization, fullScaleUtilization, pricePerUnit, totalAnnualValue, currentPace]);
  
  const pilot = chartData[0];
  const fullScale = chartData[chartData.length - 1];
  const networkEffect = fullScale.actualValue - fullScale.linearValue;
  const expansionPotential = fullScale.net - pilot.net;
  const valueMultiple = pilot.value > 0 ? (fullScale.value / pilot.value).toFixed(1) : "0";
  
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
  
  // Implementation fee is one-time, only in Year 1
  const year1Cost = annualInvestment + implementationFee;
  const year2Cost = annualInvestment;
  const year3Cost = annualInvestment;
  const threeYearCost = year1Cost + year2Cost + year3Cost;
  const threeYearNet = threeYearValue - threeYearCost;
  

  const handleExportPdf = useCallback(async () => {
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
      const pdfData = transformToEDPDFData(modelResultsForPDF, journeyInputs);
      await generateEDROIPDF(pdfData);
    } else if (activeSetting === "inpatient") {
      const pdfData = transformToInpatientPDFData(modelResultsForPDF, journeyInputs);
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
      const pdfData = transformToNursingPDFData(nursingModelResults, nursingJourneyInputs);
      await generateNursingROIPDF(pdfData);
    } else {
      const pdfData = transformToOutpatientPDFData(
        modelResultsForPDF,
        journeyInputs,
        CARE_SETTING_LABELS[activeSetting]
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
  ]);

  // Helper to generate PDF blob for sharing
  const generatePdfBlob = useCallback(async (): Promise<{ blob: Blob; filename: string }> => {
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
      const pdfData = transformToEDPDFData(modelResultsForPDF, journeyInputs);
      return generateEDROIPDFBlob(pdfData);
    } else if (activeSetting === "inpatient") {
      const pdfData = transformToInpatientPDFData(modelResultsForPDF, journeyInputs);
      return generateInpatientROIPDFBlob(pdfData);
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
      const pdfData = transformToNursingPDFData(nursingModelResults, nursingJourneyInputs);
      return generateNursingROIPDFBlob(pdfData);
    } else {
      const pdfData = transformToOutpatientPDFData(
        modelResultsForPDF,
        journeyInputs,
        CARE_SETTING_LABELS[activeSetting]
      );
      return generateOutpatientROIPDFBlob(pdfData);
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
  ]);

  // Share PDF using native Web Share API (mobile)
  const handleSharePdf = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const { blob, filename } = await generatePdfBlob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${CARE_SETTING_LABELS[activeSetting]} ROI Assessment`,
          text: 'Abridge ROI Assessment - see attached PDF',
          files: [file],
        });
      } else {
        saveAs(blob, filename);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast({
          title: "Share failed",
          description: "Falling back to download...",
          variant: "destructive",
        });
        try {
          const { blob, filename } = await generatePdfBlob();
          saveAs(blob, filename);
        } catch (downloadErr) {
          console.error('Download also failed:', downloadErr);
        }
      }
    } finally {
      setIsExporting(false);
    }
  }, [generatePdfBlob, activeSetting, toast]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
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

      {/* Sticky Context Bar */}
      <div className="sticky top-14 sm:top-16 left-0 right-0 z-40 bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="hidden md:flex items-center gap-2 text-[14px] min-w-0 flex-1">
            <span className="px-2.5 py-1 bg-[#F3F4F6] rounded-md text-[#111827] font-medium flex-shrink-0">
              {CARE_SETTING_LABELS[activeSetting]}
            </span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="text-[#6B7280] flex-shrink-0">{pilotUnits} {config.unitNamePlural}</span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="font-semibold text-emerald-600 flex-shrink-0">{formatCurrency(netValue)} net value</span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="font-semibold text-emerald-600 flex-shrink-0">{roiMultiple.toFixed(1)}x ROI</span>
          </div>
          
          {/* Mobile summary */}
          <div className="flex md:hidden items-center gap-2 text-[13px] min-w-0 flex-1">
            <span className="font-semibold text-emerald-600">{formatCurrency(netValue)}</span>
            <span className="text-[#D1D5DB]">•</span>
            <span className="font-semibold text-emerald-600">{roiMultiple.toFixed(1)}x</span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManageModelSheetOpen(true)}
              className="gap-1.5 border-[#E5E7EB] hover:border-[#EA2C00] hover:text-[#EA2C00]"
              data-testid="button-manage-model"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Model</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12 space-y-6 sm:space-y-8">
        
        {/* Empty State - No Value Drivers Configured */}
        {totalAnnualValue === 0 && (
          <section className="bg-white rounded-2xl border border-[#E5E7EB] p-8 md:p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-[#111827] mb-3">No Value Drivers Configured</h2>
              <p className="text-[#6B7280] mb-6">
                Return to the Value Drivers step to select and configure drivers that apply to your organization.
              </p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white bg-[#EA2C00] hover:bg-[#d12700] transition-colors"
                data-testid="button-return-drivers"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Value Drivers
              </button>
            </div>
          </section>
        )}
        
        {/* ============ HERO ROI SECTION ============ */}
        {totalAnnualValue > 0 && (
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
        )}

        {/* ============ VALUE BREAKDOWN ============ */}
        {totalAnnualValue > 0 && (
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
        )}

        {/* ============ QUALITATIVE BENEFITS SECTION ============ */}
        {qualitativeDrivers.length > 0 && QUALITATIVE_CONFIG[activeSetting].hasQualitativeSection && (
          <>
            {/* FULL SECTION for Nursing */}
            {QUALITATIVE_CONFIG[activeSetting].qualitativeStyle === 'full' && (
              <section 
                className="rounded-2xl p-8"
                style={{
                  background: 'linear-gradient(135deg, #FAFBFC 0%, #F5F7FA 100%)',
                  border: '1px dashed #E2E8F0'
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827] uppercase tracking-wide">The Full Picture</h2>
                  </div>
                </div>
                <p className="text-[15px] text-[#6B7280] mb-8">What else gets better</p>
                
                <p className="text-[15px] text-[#475569] mb-6 leading-relaxed">
                  Your ROI model captures the outcomes we can measure with confidence. But ambient documentation also improves areas that are harder to quantify—and often matter just as much to your organization:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {qualitativeDrivers.includes("nursingPatientExperience") && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center">
                      <div className="text-2xl mb-3">
                        <Users className="w-8 h-8 mx-auto text-[#64748B]" />
                      </div>
                      <h3 className="font-semibold text-[0.875rem] uppercase tracking-[0.05em] text-[#64748B] mb-2">
                        Patient Experience
                      </h3>
                      <p className="text-[0.9rem] text-[#475569] leading-relaxed mb-3">
                        Nurses who aren't typing are nurses who are present
                      </p>
                      <p className="text-[0.8rem] text-[#94A3B8] pt-3 border-t border-[#F1F5F9]">
                        Impacts: HCAHPS nurse communication
                      </p>
                    </div>
                  )}
                  
                  {qualitativeDrivers.includes("nursingSurvey") && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center">
                      <div className="text-2xl mb-3">
                        <CheckCircle className="w-8 h-8 mx-auto text-[#64748B]" />
                      </div>
                      <h3 className="font-semibold text-[0.875rem] uppercase tracking-[0.05em] text-[#64748B] mb-2">
                        Survey Readiness
                      </h3>
                      <p className="text-[0.9rem] text-[#475569] leading-relaxed mb-3">
                        Charts that are always complete and audit-ready
                      </p>
                      <p className="text-[0.8rem] text-[#94A3B8] pt-3 border-t border-[#F1F5F9]">
                        Impacts: Joint Commission, CMS
                      </p>
                    </div>
                  )}
                  
                  {qualitativeDrivers.includes("nursingCareCoordination") && (
                    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 text-center">
                      <div className="text-2xl mb-3">
                        <Globe className="w-8 h-8 mx-auto text-[#64748B]" />
                      </div>
                      <h3 className="font-semibold text-[0.875rem] uppercase tracking-[0.05em] text-[#64748B] mb-2">
                        Care Coordination
                      </h3>
                      <p className="text-[0.9rem] text-[#475569] leading-relaxed mb-3">
                        Handoffs that actually have the full picture
                      </p>
                      <p className="text-[0.8rem] text-[#94A3B8] pt-3 border-t border-[#F1F5F9]">
                        Impacts: Safety, continuity
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">Why we don't quantify these:</p>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        Attribution is complex. Patient experience has many drivers. Survey outcomes depend on timing. We'd rather be conservative with your ROI than inflate it with assumptions we can't defend.
                      </p>
                      <p className="text-sm text-blue-800 leading-relaxed mt-2">
                        That said—these outcomes are real, and they matter to your board, your CNO, and your patients.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* INLINE CALLOUT for ED and Inpatient */}
            {QUALITATIVE_CONFIG[activeSetting].qualitativeStyle === 'inline' && (
              <div 
                className="rounded-xl p-4 mt-4"
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #e2e8f0'
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">&#10024;</span>
                  <span className="text-[13px] font-semibold text-[#64748b] uppercase tracking-[0.03em]">
                    Also improves (not quantified):
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {qualitativeDrivers.map((driverId) => {
                    const driverContent: Record<string, { icon: string; title: string; description: string }> = {
                      edPatientExperience: {
                        icon: '\u{1F60A}',
                        title: 'Patient Experience',
                        description: 'Less waiting room frustration, better communication during high-stress encounters'
                      },
                      inpatientCareCoordination: {
                        icon: '\u{1F517}',
                        title: 'Care Coordination',
                        description: 'Complete documentation enables better handoffs between care teams'
                      },
                      inpatientSurvey: {
                        icon: '\u2713',
                        title: 'Survey Readiness',
                        description: 'Charts that are always complete and audit-ready'
                      }
                    };
                    const driver = driverContent[driverId];
                    if (!driver) return null;
                    return (
                      <div key={driverId} className="flex items-baseline gap-2 text-[14px]">
                        <span className="flex-shrink-0">{driver.icon}</span>
                        <span className="font-semibold text-[#1e293b]">{driver.title}</span>
                        <span className="text-[#64748b]">— {driver.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

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
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(year1Cost)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(year2Cost)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(year3Cost)}</td>
                      <td className="py-2 text-right font-mono text-[#6B7280]">{formatCompactCurrency(threeYearCost)}</td>
                    </tr>
                    <tr className="border-t border-[#E5E7EB]">
                      <td className="py-3 font-semibold text-[#111827]">Net</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year1 - year1Cost)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year2 - year2Cost)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-emerald-600">{formatCompactCurrency(year3 - year3Cost)}</td>
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
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-8 space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-[#1E293B] mb-1">Your Journey with Abridge</h2>
            <p className="text-[15px] text-[#64748B]">
              Start with a pilot. Prove the value. Scale across your organization.
            </p>
          </div>
          
          {/* Journey Chart */}
          <div className="h-80 md:h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="actualValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
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
                    const isEndpoint = point.isPilot || point.isFullScale;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={12} 
                          textAnchor="middle" 
                          fill={isEndpoint ? "#EA2C00" : "#1E293B"}
                          fontSize={11}
                          fontWeight={isEndpoint ? 700 : 500}
                        >
                          {point.milestoneLabel}
                        </text>
                        <text 
                          x={0} 
                          y={26} 
                          textAnchor="middle" 
                          fill="#64748B"
                          fontSize={10}
                        >
                          {point.providers.toLocaleString()} {config.unitNamePlural.toLowerCase()}
                        </text>
                      </g>
                    );
                  }}
                  ticks={chartData.map(d => d.month)}
                  height={55}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={75}
                />
                
                <Tooltip content={<CustomTooltip unitName={config.unitNamePlural} encountersPerUnit={encountersPerUnit} volumeUnit={config.encounterName} />} />
                
                <Area 
                  type="monotone" 
                  dataKey="actualValue" 
                  stroke="none"
                  fill="url(#actualValueGradient)"
                />
                
                <Line 
                  type="monotone" 
                  dataKey="linearValue" 
                  stroke="#64748B" 
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="actualValue" 
                  stroke="#10B981" 
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
                  x={currentPace.months} 
                  y={fullScale.actualValue} 
                  r={10} 
                  fill="#10B981" 
                  stroke="white"
                  strokeWidth={3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />
              <span className="text-sm text-[#64748B]">Pilot (Today)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[#10B981]" />
              <span className="text-sm text-[#64748B]">Actual value (with compounding)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-[#64748B]" />
              <span className="text-sm text-[#64748B]">Linear projection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-sm text-[#64748B]">Full Scale</span>
            </div>
          </div>
          
          {/* Model Your Scenario */}
          <div className="border-t border-[#E2E8F0] pt-8">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-[#EA2C00]" />
              <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider">
                Model Your Scenario
              </h3>
            </div>
            
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* LEFT: Your Starting Point (Locked) */}
              <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#FEF3C7] rounded-lg">
                    <MapPin className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">Your Starting Point</h4>
                    <p className="text-xs text-[#64748B]">From your ROI model</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#64748B]" />
                    <span className="font-medium">{pilotUnits.toLocaleString()}</span>
                    <span>{config.unitNamePlural}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#64748B]" />
                    <span className="font-medium">{(pilotUnits * encountersPerUnit).toLocaleString()}</span>
                    <span>{config.encounterName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#64748B]" />
                    <span className="font-medium">{pilotUtilization}%</span>
                    <span>utilization</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <Check className="w-4 h-4 text-[#64748B]" />
                    <span className="font-medium">{formatCurrency(totalAnnualValue)}</span>
                    <span>/year</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-[#10B981]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Locked from your model</span>
                </div>
              </div>
              
              {/* RIGHT: Your Full Scale Potential (Editable) */}
              <div className="bg-white rounded-xl p-6 border-2 border-[#E2E8F0]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] uppercase tracking-wide">Your Full Scale Potential</h4>
                    <p className="text-xs text-[#64748B]">Where could this go?</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm text-[#475569] mb-2">
                      Total {config.unitNamePlural} in your organization
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={fullScaleUnits}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setFullScaleUnits("");
                          } else {
                            setFullScaleUnits(Number(val));
                          }
                        }}
                        onBlur={() => {
                          if (fullScaleUnits === "" || fullScaleUnits < pilotUnits + 1) {
                            setFullScaleUnits(pilotUnits + 1);
                          }
                        }}
                        min={pilotUnits + 1}
                        className="w-full px-4 py-2.5 pr-24 rounded-lg border border-[#E2E8F0] font-mono text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-all"
                        data-testid="input-fullscale-units"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">{config.unitNamePlural}</span>
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-2">
                      At {encountersPerUnit.toLocaleString()} {config.encounterName}/{config.unitName} = <span className="font-semibold">{(safeFullScaleUnits * encountersPerUnit).toLocaleString()} {config.encounterName}/year</span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-[#475569] mb-2">
                      Target utilization at full scale
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={pilotUtilization}
                        max={95}
                        value={fullScaleUtilization}
                        onChange={(e) => setFullScaleUtilization(Number(e.target.value))}
                        className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                        data-testid="slider-fullscale-utilization"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">{pilotUtilization}%</span>
                        <span className="font-semibold text-[#1E293B]">{fullScaleUtilization}%</span>
                        <span className="text-[#64748B]">95%</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Most organizations reach 75-85% at maturity
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pace Selector */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
                How fast do you want to scale?
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Measured */}
                <button
                  onClick={() => setSelectedPace("measured")}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                    selectedPace === "measured" 
                      ? "border-[#EA2C00] bg-[#FEF7F6]" 
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                  }`}
                  data-testid="pace-measured"
                >
                  <div className="text-sm font-bold text-[#1E293B] mb-1">Measured</div>
                  <div className="text-xs text-[#64748B]">36 months to full scale</div>
                  <div className="text-xs text-[#94A3B8] mt-1">Lower risk, slower ROI</div>
                </button>
                
                {/* Steady (Default) */}
                <button
                  onClick={() => setSelectedPace("steady")}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                    selectedPace === "steady" 
                      ? "border-[#EA2C00] bg-[#FEF7F6]" 
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                  }`}
                  data-testid="pace-steady"
                >
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-[#EA2C00] text-white text-[10px] font-bold uppercase rounded">
                    Recommended
                  </div>
                  <div className="text-sm font-bold text-[#1E293B] mb-1">Steady</div>
                  <div className="text-xs text-[#64748B]">24 months to full scale</div>
                  <div className="text-xs text-[#94A3B8] mt-1">Recommended balance</div>
                </button>
                
                {/* Aggressive */}
                <button
                  onClick={() => setSelectedPace("aggressive")}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                    selectedPace === "aggressive" 
                      ? "border-[#EA2C00] bg-[#FEF7F6]" 
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                  }`}
                  data-testid="pace-aggressive"
                >
                  <div className="text-sm font-bold text-[#1E293B] mb-1">Aggressive</div>
                  <div className="text-xs text-[#64748B]">18 months to full scale</div>
                  <div className="text-xs text-[#94A3B8] mt-1">Fast ROI, higher lift</div>
                </button>
              </div>
            </div>
            
            {/* Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Pilot (Today) */}
              <div className="bg-[#F8FAFC] rounded-xl p-6 text-center border border-[#E2E8F0]">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Pilot (Today)</div>
                <div className="font-mono font-bold text-2xl md:text-3xl text-[#1E293B] mb-1">{formatCurrency(pilot.value)}</div>
                <div className="text-xs text-[#64748B] mb-3">annual value</div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                  {pilot.roi}x ROI
                </div>
              </div>
              
              {/* Arrow (hidden on mobile) */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-[#CBD5E1]" />
              </div>
              <div className="flex md:hidden items-center justify-center py-2">
                <ChevronDown className="w-6 h-6 text-[#CBD5E1]" />
              </div>
              
              {/* Full Scale */}
              <div className="bg-[#F8FAFC] rounded-xl p-6 text-center border border-[#E2E8F0]">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Full Scale</div>
                <div className="font-mono font-bold text-2xl md:text-3xl text-[#10B981] mb-1">{formatCurrency(fullScale.value)}</div>
                <div className="text-xs text-[#64748B] mb-3">annual value</div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                  {fullScale.roi}x ROI
                </div>
              </div>
              
              {/* Compounding Bonus */}
              <div className="md:col-span-3 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-center text-white">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-90">Compounding Bonus</div>
                <div className="font-mono font-bold text-3xl md:text-4xl mb-1">+{formatCurrency(networkEffect)}</div>
                <div className="text-sm opacity-80 mb-1">over {currentPace.months} months</div>
                <div className="text-xs opacity-70">Beyond linear projection</div>
              </div>
            </div>
          </div>
          
          {/* The Compounding Effect Explanation */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider">The Compounding Effect</span>
            </div>
            <p className="text-sm text-[#475569] mb-4">
              The gap between the lines represents value that compounds as you scale — not just more of the same:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <p className="text-sm text-[#475569]">
                  <span className="font-semibold text-[#1E293B]">Utilization:</span> {pilotUtilization}% → {fullScaleUtilization}% as adoption matures
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <p className="text-sm text-[#475569]">
                  <span className="font-semibold text-[#1E293B]">Retention:</span> Benefits materialize after 6-12 months
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Rocket className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <p className="text-sm text-[#475569]">
                  <span className="font-semibold text-[#1E293B]">Efficiency:</span> Shared learnings, optimized workflows
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
            onClick={() => setManageModelSheetOpen(true)}
            data-testid="button-add-driver"
          >
            <Plus className="w-4 h-4" />
            Manage Drivers
          </Button>
          
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {canShare && (
              <Button 
                variant="outline" 
                className="gap-2 flex-1 sm:flex-none border-[#E5E7EB]" 
                onClick={handleSharePdf}
                disabled={isExporting}
                data-testid="button-share-pdf"
              >
                <Share2 className="w-4 h-4" />
                {isExporting ? "Generating..." : "Share"}
              </Button>
            )}
            <Button 
              variant="outline" 
              className="gap-2 flex-1 sm:flex-none border-[#E5E7EB]" 
              onClick={handleExportPdf}
              disabled={isExporting}
              data-testid="button-export-pdf"
            >
              <FileText className="w-4 h-4" />
              {isExporting ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </section>
      </div>
      
      {/* Manage Model Sheet - Edit existing drivers and add new ones */}
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
    </div>
  );
}
