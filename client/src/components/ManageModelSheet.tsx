import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  Heart,
  BarChart3,
  Building2,
  FileX,
  Zap,
  Shield,
  FileText,
  DollarSign,
  CheckCircle,
  Link2,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import { type CareSettingType, SETTING_CONFIG } from "@/lib/SETTING_CONFIG";

interface DriverResult {
  id: string;
  name: string;
  value: number;
  inputs: Record<string, number | string | boolean>;
}

interface ManageModelSheetProps {
  open: boolean;
  onClose: () => void;
  careSetting: CareSettingType;
  existingDrivers: DriverResult[];
  providers: number;
  encounters: number;
  utilizationRate: number;
  staffedBeds?: number;
  nurseFTEs?: number;
  onAddDriver: (driver: DriverResult) => void;
  onUpdateDriver: (driver: DriverResult) => void;
  onRemoveDriver: (driverId: string) => void;
}

const DRIVER_ICONS: Record<string, typeof Clock> = {
  overtime: Clock,
  patientAccess: Users,
  retention: Heart,
  workforce: Heart,
  levelOfService: BarChart3,
  wrvu: BarChart3,
  hcc: Building2,
  denials: FileX,
  edThroughput: Zap,
  edRetention: Heart,
  edLevelOfService: BarChart3,
  edDenials: FileX,
  edPatientExperience: Heart,
  inpatientRetention: Heart,
  inpatientCCMCC: DollarSign,
  inpatientCDI: FileText,
  inpatientDenials: FileX,
  inpatientRounding: Clock,
  nursingOvertime: Clock,
  nursingAgency: Users,
  nursingRetention: Heart,
  nursingHAPI: Shield,
  nursingFalls: Shield,
  nursingSurvey: CheckCircle,
  nursingCareCoordination: Link2,
  nursingPatientExperience: Heart,
};

const DRIVER_NAMES: Record<string, string> = {
  overtime: "Overtime & Locum Savings",
  patientAccess: "Patient Access",
  retention: "Clinician Retention",
  workforce: "Clinician Retention",
  levelOfService: "Accurate Level of Service",
  wrvu: "Accurate Level of Service",
  hcc: "HCC Risk Capture",
  denials: "Denial Prevention",
  edThroughput: "Patient Throughput (LWBS Reduction)",
  edRetention: "Physician Retention",
  edLevelOfService: "Level-of-Service Accuracy",
  edDenials: "Denial Prevention",
  edPatientExperience: "Patient Experience",
  inpatientRetention: "Hospitalist Retention",
  inpatientCCMCC: "CC/MCC Capture (DRG Optimization)",
  inpatientCDI: "CDI Query Reduction",
  inpatientDenials: "Denial Prevention",
  inpatientRounding: "Rounding Efficiency",
  nursingOvertime: "Overtime Reduction",
  nursingAgency: "Agency & Travel Nurse Reduction",
  nursingRetention: "Nurse Retention",
  nursingHAPI: "Pressure Injury Prevention (HAPI)",
  nursingFalls: "Falls Prevention",
  nursingSurvey: "Nurse Satisfaction Survey",
  nursingCareCoordination: "Care Coordination",
  nursingPatientExperience: "Patient Experience",
};

interface DriverInputConfig {
  key: string;
  label: string;
  defaultValue: number | boolean;
  type: "number" | "percent" | "currency" | "boolean";
  min?: number;
  max?: number;
  step?: number;
}

const DRIVER_INPUT_CONFIGS: Record<string, DriverInputConfig[]> = {
  overtime: [
    { key: "otPercentWithOT", label: "% of providers with regular OT", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "otHoursPerWeek", label: "Avg OT hours per week", defaultValue: 5, type: "number", min: 0, max: 40 },
    { key: "otWeeksPerYear", label: "Working weeks per year", defaultValue: 48, type: "number", min: 1, max: 52 },
    { key: "otReductionRate", label: "Doc time reduction (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "otConversionRate", label: "Savings conversion rate (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "physicianHourlyRate", label: "Physician hourly rate ($)", defaultValue: 150, type: "currency", min: 50, max: 500 },
  ],
  patientAccess: [
    { key: "timeSavedPerEncounter", label: "Minutes saved per encounter", defaultValue: 2.5, type: "number", min: 1, max: 10, step: 0.5 },
    { key: "accessAllocation", label: "Time allocated to access (%)", defaultValue: 33, type: "percent", min: 0, max: 100 },
    { key: "conversionRate", label: "Conversion to visits (%)", defaultValue: 40, type: "percent", min: 0, max: 100 },
    { key: "timePerVisit", label: "Minutes per visit", defaultValue: 30, type: "number", min: 10, max: 60 },
    { key: "revenuePerVisit", label: "Revenue per visit ($)", defaultValue: 200, type: "currency", min: 50, max: 500 },
  ],
  retention: [
    { key: "turnoverRate", label: "Annual turnover rate (%)", defaultValue: 6, type: "percent", min: 0, max: 50 },
    { key: "burnoutAttribution", label: "Burnout-related (%)", defaultValue: 45, type: "percent", min: 0, max: 100 },
    { key: "abridgeImpact", label: "Abridge prevention rate (%)", defaultValue: 30, type: "percent", min: 0, max: 100 },
    { key: "replacementCost", label: "Replacement cost ($)", defaultValue: 400000, type: "currency", min: 100000, max: 1000000 },
  ],
  levelOfService: [
    { key: "avgWrvuPerEncounter", label: "Avg wRVU per encounter", defaultValue: 1.5, type: "number", min: 0.5, max: 5, step: 0.1 },
    { key: "wrvuImprovementRate", label: "wRVU improvement rate (%)", defaultValue: 5, type: "percent", min: 0, max: 20 },
    { key: "conversionFactor", label: "Conversion factor ($)", defaultValue: 33, type: "currency", min: 20, max: 50 },
  ],
  hcc: [
    { key: "riskContractPercent", label: "Risk-based encounters (%)", defaultValue: 40, type: "percent", min: 0, max: 100 },
    { key: "conditionsPerVisit", label: "Conditions per visit", defaultValue: 3.5, type: "number", min: 1, max: 10, step: 0.5 },
    { key: "documentationGap", label: "Documentation gap (%)", defaultValue: 15, type: "percent", min: 0, max: 50 },
    { key: "hccEligiblePercent", label: "HCC eligible (%)", defaultValue: 25, type: "percent", min: 0, max: 100 },
    { key: "abridgeCaptureRate", label: "Abridge capture rate (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "avgHccValue", label: "Avg HCC value ($)", defaultValue: 1800, type: "currency", min: 500, max: 5000 },
    { key: "auditFactor", label: "Audit survival rate (%)", defaultValue: 70, type: "percent", min: 0, max: 100 },
  ],
  denials: [
    { key: "denialRate", label: "Denial rate (%)", defaultValue: 8, type: "percent", min: 0, max: 30 },
    { key: "docRelatedPercent", label: "Documentation-related (%)", defaultValue: 35, type: "percent", min: 0, max: 100 },
    { key: "writtenOffPercent", label: "Written off (%)", defaultValue: 25, type: "percent", min: 0, max: 100 },
    { key: "abridgeCaptureRate", label: "Abridge recovery rate (%)", defaultValue: 75, type: "percent", min: 0, max: 100 },
    { key: "avgClaimValue", label: "Avg claim value ($)", defaultValue: 250, type: "currency", min: 50, max: 1000 },
  ],
  edThroughput: [
    { key: "lwbsRate", label: "Current LWBS rate (%)", defaultValue: 4, type: "percent", min: 0, max: 15 },
    { key: "improvementRate", label: "Improvement rate (%)", defaultValue: 25, type: "percent", min: 0, max: 50 },
    { key: "abridgeAttributionPercent", label: "Abridge attribution (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "avgEdVisitRevenue", label: "Avg ED visit revenue ($)", defaultValue: 350, type: "currency", min: 100, max: 800 },
    { key: "includeAdmissions", label: "Include admissions?", defaultValue: true, type: "boolean" },
    { key: "admissionPercent", label: "Admission rate (%)", defaultValue: 20, type: "percent", min: 0, max: 50 },
    { key: "avgAdmissionRevenue", label: "Avg admission revenue ($)", defaultValue: 12000, type: "currency", min: 5000, max: 30000 },
  ],
  edRetention: [
    { key: "turnoverRate", label: "Annual turnover rate (%)", defaultValue: 10, type: "percent", min: 0, max: 50 },
    { key: "burnoutAttribution", label: "Burnout-related (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "abridgeImpact", label: "Abridge prevention rate (%)", defaultValue: 30, type: "percent", min: 0, max: 100 },
    { key: "replacementCost", label: "Replacement cost ($)", defaultValue: 350000, type: "currency", min: 100000, max: 800000 },
  ],
  edLevelOfService: [
    { key: "avgWrvuPerEncounter", label: "Avg wRVU per encounter", defaultValue: 2.5, type: "number", min: 1, max: 5, step: 0.1 },
    { key: "wrvuImprovementRate", label: "wRVU improvement rate (%)", defaultValue: 5, type: "percent", min: 0, max: 20 },
    { key: "conversionFactor", label: "Conversion factor ($)", defaultValue: 33, type: "currency", min: 20, max: 50 },
  ],
  edDenials: [
    { key: "denialRate", label: "Denial rate (%)", defaultValue: 10, type: "percent", min: 0, max: 30 },
    { key: "docRelatedPercent", label: "Documentation-related (%)", defaultValue: 40, type: "percent", min: 0, max: 100 },
    { key: "writtenOffPercent", label: "Written off (%)", defaultValue: 30, type: "percent", min: 0, max: 100 },
    { key: "abridgeCaptureRate", label: "Abridge recovery rate (%)", defaultValue: 70, type: "percent", min: 0, max: 100 },
    { key: "avgClaimValue", label: "Avg claim value ($)", defaultValue: 400, type: "currency", min: 100, max: 1000 },
  ],
  inpatientRetention: [
    { key: "turnoverRate", label: "Annual turnover rate (%)", defaultValue: 15, type: "percent", min: 0, max: 50 },
    { key: "burnoutAttribution", label: "Burnout-related (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "abridgeImpact", label: "Abridge prevention rate (%)", defaultValue: 30, type: "percent", min: 0, max: 100 },
    { key: "replacementCost", label: "Replacement cost ($)", defaultValue: 500000, type: "currency", min: 200000, max: 1000000 },
  ],
  inpatientCCMCC: [
    { key: "gapRate", label: "Documentation gap rate (%)", defaultValue: 40, type: "percent", min: 0, max: 80 },
    { key: "improvementRate", label: "Improvement rate (%)", defaultValue: 15, type: "percent", min: 0, max: 50 },
    { key: "drgWeightIncrease", label: "Avg DRG weight increase", defaultValue: 0.4, type: "number", min: 0.1, max: 1, step: 0.1 },
    { key: "baseDrgPayment", label: "Base DRG payment ($)", defaultValue: 6000, type: "currency", min: 3000, max: 15000 },
    { key: "realizationRate", label: "Realization rate (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
  ],
  inpatientCDI: [
    { key: "queryRate", label: "Query rate (%)", defaultValue: 30, type: "percent", min: 0, max: 60 },
    { key: "reductionRate", label: "Reduction rate (%)", defaultValue: 25, type: "percent", min: 0, max: 50 },
    { key: "costPerQuery", label: "Cost per query ($)", defaultValue: 50, type: "currency", min: 20, max: 150 },
  ],
  inpatientDenials: [
    { key: "denialRate", label: "Denial rate (%)", defaultValue: 5, type: "percent", min: 0, max: 20 },
    { key: "docRelatedPct", label: "Documentation-related (%)", defaultValue: 35, type: "percent", min: 0, max: 100 },
    { key: "writeOffPct", label: "Written off (%)", defaultValue: 25, type: "percent", min: 0, max: 100 },
    { key: "captureRate", label: "Abridge recovery rate (%)", defaultValue: 75, type: "percent", min: 0, max: 100 },
    { key: "avgClaimValue", label: "Avg claim value ($)", defaultValue: 12000, type: "currency", min: 5000, max: 30000 },
  ],
  nursingOvertime: [
    { key: "otHoursPerWeek", label: "OT hours per nurse per week", defaultValue: 2, type: "number", min: 0, max: 20 },
    { key: "weeksPerYear", label: "Working weeks per year", defaultValue: 48, type: "number", min: 1, max: 52 },
    { key: "docRelatedPct", label: "Documentation-related (%)", defaultValue: 60, type: "percent", min: 0, max: 100 },
    { key: "reductionRate", label: "Reduction rate (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "baseHourlyRate", label: "Base hourly rate ($)", defaultValue: 45, type: "currency", min: 25, max: 100 },
  ],
  nursingAgency: [
    { key: "agencyFTEsPerBed", label: "Agency FTEs per bed", defaultValue: 0.15, type: "number", min: 0, max: 0.5, step: 0.01 },
    { key: "staffSalary", label: "Staff RN salary ($)", defaultValue: 75000, type: "currency", min: 50000, max: 150000 },
    { key: "agencyCost", label: "Agency RN cost ($)", defaultValue: 150000, type: "currency", min: 100000, max: 300000 },
    { key: "retentionImpact", label: "Retention impact (%)", defaultValue: 10, type: "percent", min: 0, max: 50 },
  ],
  nursingRetention: [
    { key: "turnoverRate", label: "Annual turnover rate (%)", defaultValue: 18, type: "percent", min: 0, max: 50 },
    { key: "burnoutAttribution", label: "Burnout-related (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "abridgeImpact", label: "Abridge prevention rate (%)", defaultValue: 20, type: "percent", min: 0, max: 100 },
    { key: "replacementCost", label: "Replacement cost ($)", defaultValue: 50000, type: "currency", min: 20000, max: 150000 },
  ],
  nursingHAPI: [
    { key: "annualAdmissions", label: "Annual admissions", defaultValue: 10000, type: "number", min: 1000, max: 100000 },
    { key: "hapiRate", label: "HAPI rate (%)", defaultValue: 2.5, type: "percent", min: 0, max: 10, step: 0.1 },
    { key: "preventionRate", label: "Prevention rate (%)", defaultValue: 10, type: "percent", min: 0, max: 30 },
    { key: "costPerHAPI", label: "Cost per HAPI ($)", defaultValue: 20000, type: "currency", min: 5000, max: 50000 },
  ],
  nursingFalls: [
    { key: "annualAdmissions", label: "Annual admissions", defaultValue: 10000, type: "number", min: 1000, max: 100000 },
    { key: "fallsRate", label: "Falls per 1,000 patient days", defaultValue: 3.5, type: "number", min: 1, max: 10, step: 0.5 },
    { key: "avgLOS", label: "Avg length of stay (days)", defaultValue: 4, type: "number", min: 1, max: 14 },
    { key: "preventionRate", label: "Prevention rate (%)", defaultValue: 8, type: "percent", min: 0, max: 30 },
    { key: "costPerFall", label: "Cost per fall ($)", defaultValue: 6500, type: "currency", min: 2000, max: 20000 },
  ],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ManageModelSheet({
  open,
  onClose,
  careSetting,
  existingDrivers,
  providers,
  encounters,
  utilizationRate,
  staffedBeds = 200,
  nurseFTEs,
  onAddDriver,
  onUpdateDriver,
  onRemoveDriver,
}: ManageModelSheetProps) {
  const [activeTab, setActiveTab] = useState<"current" | "add">("current");
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [driverInputs, setDriverInputs] = useState<Record<string, any>>({});
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editInputs, setEditInputs] = useState<Record<string, any>>({});

  const effectiveNurseFTEs = nurseFTEs || Math.round(staffedBeds * 1.5);
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));

  const existingDriverIds = useMemo(() => 
    existingDrivers.map(d => d.id), 
    [existingDrivers]
  );

  const normalizeDriverId = useCallback((id: string): string => {
    const mappings: Record<string, string> = {
      workforce: "retention",
      wrvu: "levelOfService",
    };
    return mappings[id] || id;
  }, []);

  const availableDrivers = useMemo(() => {
    const settingDrivers = SETTING_CONFIG[careSetting] || [];
    return settingDrivers.filter(d => !d.isNotQuantified);
  }, [careSetting]);

  const notAddedDrivers = useMemo(() => {
    return availableDrivers.filter(d => {
      const normalized = normalizeDriverId(d.id);
      return !existingDriverIds.some(id => normalizeDriverId(id) === normalized);
    });
  }, [availableDrivers, existingDriverIds, normalizeDriverId]);

  const isDriverAdded = useCallback((driverId: string): boolean => {
    const normalized = normalizeDriverId(driverId);
    return existingDriverIds.some(id => normalizeDriverId(id) === normalized);
  }, [existingDriverIds, normalizeDriverId]);

  const getInputConfig = (driverId: string): DriverInputConfig[] => {
    const normalized = normalizeDriverId(driverId);
    return DRIVER_INPUT_CONFIGS[normalized] || [];
  };

  const getDefaultInputs = (driverId: string): Record<string, any> => {
    const config = getInputConfig(driverId);
    const defaults: Record<string, any> = {};
    config.forEach(c => {
      defaults[c.key] = c.defaultValue;
    });
    return defaults;
  };

  const handleDriverClick = (driverId: string) => {
    if (isDriverAdded(driverId)) return;
    
    if (expandedDriverId === driverId) {
      setExpandedDriverId(null);
    } else {
      setExpandedDriverId(driverId);
      if (!driverInputs[driverId]) {
        setDriverInputs(prev => ({
          ...prev,
          [driverId]: getDefaultInputs(driverId),
        }));
      }
    }
  };

  const handleInputChange = (driverId: string, key: string, value: any) => {
    setDriverInputs(prev => ({
      ...prev,
      [driverId]: {
        ...(prev[driverId] || getDefaultInputs(driverId)),
        [key]: value,
      },
    }));
  };

  const handleEditInputChange = (key: string, value: any) => {
    setEditInputs(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const startEditing = (driver: DriverResult) => {
    setEditingDriverId(driver.id);
    setEditInputs(driver.inputs || getDefaultInputs(driver.id));
  };

  const cancelEditing = () => {
    setEditingDriverId(null);
    setEditInputs({});
  };

  const calculateDriverValue = useCallback((driverId: string, inputsToUse?: Record<string, any>): number => {
    const defaults = getDefaultInputs(driverId);
    const stored = driverInputs[driverId] || {};
    const inputs = { ...defaults, ...stored, ...(inputsToUse || {}) };
    const normalized = normalizeDriverId(driverId);

    switch (normalized) {
      case "overtime": {
        const annualOTHours = providers * (inputs.otPercentWithOT / 100) * inputs.otHoursPerWeek * inputs.otWeeksPerYear;
        const otHoursEliminated = annualOTHours * (inputs.otReductionRate / 100);
        const otHoursConvertedToSavings = otHoursEliminated * (inputs.otConversionRate / 100);
        return Math.round(otHoursConvertedToSavings * inputs.physicianHourlyRate);
      }
      case "patientAccess": {
        const minutesReturned = eligibleEncounters * inputs.timeSavedPerEncounter;
        const hoursReturned = minutesReturned / 60;
        const accessHours = hoursReturned * (inputs.accessAllocation / 100);
        const usableHours = accessHours * (inputs.conversionRate / 100);
        const additionalVisits = (usableHours * 60) / inputs.timePerVisit;
        return Math.round(additionalVisits * inputs.revenuePerVisit);
      }
      case "retention": {
        const annualDepartures = providers * (inputs.turnoverRate / 100);
        const preventableDepartures = annualDepartures * (inputs.burnoutAttribution / 100);
        const departuresAvoided = preventableDepartures * (inputs.abridgeImpact / 100);
        return Math.round(departuresAvoided * inputs.replacementCost);
      }
      case "levelOfService": {
        const baselineWrvus = eligibleEncounters * inputs.avgWrvuPerEncounter;
        const wrvuGain = baselineWrvus * (inputs.wrvuImprovementRate / 100);
        return Math.round(wrvuGain * inputs.conversionFactor);
      }
      case "hcc": {
        const riskEncounters = eligibleEncounters * (inputs.riskContractPercent / 100);
        const missedHccsPerEncounter = inputs.conditionsPerVisit * (inputs.documentationGap / 100) * (inputs.hccEligiblePercent / 100);
        const missedHccOpportunities = riskEncounters * missedHccsPerEncounter;
        const hccsCaptured = missedHccOpportunities * (inputs.abridgeCaptureRate / 100);
        return Math.round(hccsCaptured * inputs.avgHccValue * (inputs.auditFactor / 100));
      }
      case "denials": {
        const totalDenials = eligibleEncounters * (inputs.denialRate / 100);
        const docRelatedDenials = totalDenials * (inputs.docRelatedPercent / 100);
        const writtenOffDenials = docRelatedDenials * (inputs.writtenOffPercent / 100);
        const claimsRecovered = writtenOffDenials * (inputs.abridgeCaptureRate / 100);
        return Math.round(claimsRecovered * inputs.avgClaimValue);
      }
      case "edThroughput": {
        const patientsLeaving = encounters * (inputs.lwbsRate / 100);
        const patientsRetained = patientsLeaving * (inputs.improvementRate / 100);
        const patientsAttributed = patientsRetained * (inputs.abridgeAttributionPercent / 100);
        let totalRevenue = patientsAttributed * inputs.avgEdVisitRevenue;
        if (inputs.includeAdmissions) {
          const admissionPatients = patientsAttributed * (inputs.admissionPercent / 100);
          totalRevenue += admissionPatients * inputs.avgAdmissionRevenue;
        }
        return Math.round(totalRevenue);
      }
      case "edRetention": {
        const annualDepartures = providers * (inputs.turnoverRate / 100);
        const preventableDepartures = annualDepartures * (inputs.burnoutAttribution / 100);
        const departuresAvoided = preventableDepartures * (inputs.abridgeImpact / 100);
        return Math.round(departuresAvoided * inputs.replacementCost);
      }
      case "edLevelOfService": {
        const baselineWrvus = encounters * inputs.avgWrvuPerEncounter;
        const wrvuGain = baselineWrvus * (inputs.wrvuImprovementRate / 100);
        return Math.round(wrvuGain * inputs.conversionFactor);
      }
      case "edDenials": {
        const totalDenials = eligibleEncounters * (inputs.denialRate / 100);
        const docRelatedDenials = totalDenials * (inputs.docRelatedPercent / 100);
        const writtenOffDenials = docRelatedDenials * (inputs.writtenOffPercent / 100);
        const claimsRecovered = writtenOffDenials * (inputs.abridgeCaptureRate / 100);
        return Math.round(claimsRecovered * inputs.avgClaimValue);
      }
      case "inpatientRetention": {
        const annualDepartures = providers * (inputs.turnoverRate / 100);
        const preventableDepartures = annualDepartures * (inputs.burnoutAttribution / 100);
        const departuresAvoided = preventableDepartures * (inputs.abridgeImpact / 100);
        return Math.round(departuresAvoided * inputs.replacementCost);
      }
      case "inpatientCCMCC": {
        const opportunities = eligibleEncounters * (inputs.gapRate / 100);
        const admissionsImproved = opportunities * (inputs.improvementRate / 100);
        const grossImpact = admissionsImproved * inputs.drgWeightIncrease * inputs.baseDrgPayment;
        return Math.round(grossImpact * (inputs.realizationRate / 100));
      }
      case "inpatientCDI": {
        const annualQueries = eligibleEncounters * (inputs.queryRate / 100);
        const queriesAvoided = annualQueries * (inputs.reductionRate / 100);
        return Math.round(queriesAvoided * inputs.costPerQuery);
      }
      case "inpatientDenials": {
        const totalDenials = eligibleEncounters * (inputs.denialRate / 100);
        const docDenials = totalDenials * (inputs.docRelatedPct / 100);
        const writtenOff = docDenials * (inputs.writeOffPct / 100);
        const claimsRecovered = writtenOff * (inputs.captureRate / 100);
        return Math.round(claimsRecovered * inputs.avgClaimValue);
      }
      case "nursingOvertime": {
        const totalOTHours = effectiveNurseFTEs * inputs.otHoursPerWeek * inputs.weeksPerYear;
        const docDrivenOT = totalOTHours * (inputs.docRelatedPct / 100);
        const hoursEliminated = docDrivenOT * (inputs.reductionRate / 100) * (utilizationRate / 100);
        const overtimeRate = inputs.baseHourlyRate * 1.5;
        return Math.round(hoursEliminated * overtimeRate);
      }
      case "nursingAgency": {
        const agencyFTEs = staffedBeds * inputs.agencyFTEsPerBed;
        const premium = inputs.agencyCost - inputs.staffSalary;
        const ftesConverted = agencyFTEs * (inputs.retentionImpact / 100);
        return Math.round(ftesConverted * premium);
      }
      case "nursingRetention": {
        const departures = effectiveNurseFTEs * (inputs.turnoverRate / 100);
        const burnoutDepartures = departures * (inputs.burnoutAttribution / 100);
        const departuresAvoided = burnoutDepartures * (inputs.abridgeImpact / 100);
        return Math.round(departuresAvoided * inputs.replacementCost);
      }
      case "nursingHAPI": {
        const currentHAPIs = inputs.annualAdmissions * (inputs.hapiRate / 100);
        const hapisPrevented = currentHAPIs * (inputs.preventionRate / 100);
        return Math.round(hapisPrevented * inputs.costPerHAPI);
      }
      case "nursingFalls": {
        const patientDays = inputs.annualAdmissions * inputs.avgLOS;
        const currentFalls = (patientDays / 1000) * inputs.fallsRate;
        const fallsPrevented = currentFalls * (inputs.preventionRate / 100);
        return Math.round(fallsPrevented * inputs.costPerFall);
      }
      default:
        return 0;
    }
  }, [driverInputs, providers, encounters, eligibleEncounters, utilizationRate, effectiveNurseFTEs, staffedBeds]);

  const handleAddDriver = (driverId: string) => {
    const value = calculateDriverValue(driverId);
    const inputs = driverInputs[driverId] || getDefaultInputs(driverId);
    
    onAddDriver({
      id: driverId,
      name: DRIVER_NAMES[driverId] || driverId,
      value,
      inputs,
    });
    
    setExpandedDriverId(null);
    setActiveTab("current");
  };

  const handleSaveEdit = (driverId: string) => {
    const value = calculateDriverValue(driverId, editInputs);
    onUpdateDriver({
      id: driverId,
      name: DRIVER_NAMES[driverId] || driverId,
      value,
      inputs: editInputs,
    });
    setEditingDriverId(null);
    setEditInputs({});
  };

  const handleRemoveDriver = (driverId: string) => {
    onRemoveDriver(driverId);
  };

  const renderInputField = (
    config: DriverInputConfig,
    value: any,
    onChange: (key: string, value: any) => void,
    prefix: string
  ) => {
    if (config.type === "boolean") {
      return (
        <div key={config.key} className="flex items-center justify-between py-2">
          <Label className="text-sm text-gray-600">{config.label}</Label>
          <Switch
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(config.key, checked)}
            data-testid={`${prefix}-${config.key}`}
          />
        </div>
      );
    }

    return (
      <div key={config.key} className="space-y-1">
        <Label className="text-sm text-gray-600">{config.label}</Label>
        <FormattedNumberInput
          value={typeof value === 'number' ? value : 0}
          onChange={(newVal) => onChange(config.key, newVal)}
          min={config.min}
          max={config.max}
          step={config.step || 1}
          className="h-9"
          data-testid={`${prefix}-${config.key}`}
        />
      </div>
    );
  };

  useEffect(() => {
    if (!open) {
      setExpandedDriverId(null);
      setEditingDriverId(null);
      setEditInputs({});
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg overflow-y-auto"
        data-testid="manage-model-sheet"
      >
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#EA2C00]" />
            Manage Model
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "current" | "add")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="gap-2" data-testid="tab-current-drivers">
              <Pencil className="w-4 h-4" />
              Your Drivers ({existingDrivers.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2" data-testid="tab-add-drivers">
              <Plus className="w-4 h-4" />
              Add More ({notAddedDrivers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4 space-y-3">
            {existingDrivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No drivers added yet.</p>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab("add")}
                  className="text-[#EA2C00] hover:text-[#d12700]"
                >
                  Add your first driver
                </Button>
              </div>
            ) : (
              existingDrivers.map((driver) => {
                const Icon = DRIVER_ICONS[normalizeDriverId(driver.id)] || BarChart3;
                const isEditing = editingDriverId === driver.id;
                const inputConfig = getInputConfig(driver.id);
                const currentInputs = isEditing ? editInputs : (driver.inputs || {});
                const currentValue = isEditing 
                  ? calculateDriverValue(driver.id, editInputs) 
                  : driver.value;

                return (
                  <div
                    key={driver.id}
                    className="border rounded-lg bg-white overflow-hidden"
                    data-testid={`current-driver-${driver.id}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {DRIVER_NAMES[driver.id] || driver.name}
                            </h4>
                            <p className="text-lg font-semibold text-emerald-600">
                              {formatCurrency(currentValue)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditing(driver)}
                                data-testid={`button-edit-${driver.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDriver(driver.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                data-testid={`button-remove-${driver.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(driver.id)}
                                className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-1"
                                data-testid={`button-save-${driver.id}`}
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditing && inputConfig.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {inputConfig.map((config) => 
                            renderInputField(
                              config,
                              currentInputs[config.key] ?? config.defaultValue,
                              handleEditInputChange,
                              `edit-${driver.id}`
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4 space-y-3">
            {notAddedDrivers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All available drivers have been added!</p>
              </div>
            ) : (
              notAddedDrivers.map((driver) => {
                const Icon = DRIVER_ICONS[driver.id] || BarChart3;
                const isExpanded = expandedDriverId === driver.id;
                const inputConfig = getInputConfig(driver.id);
                const currentInputs = driverInputs[driver.id] || getDefaultInputs(driver.id);
                const calculatedValue = calculateDriverValue(driver.id);

                return (
                  <div
                    key={driver.id}
                    className="border rounded-lg bg-white overflow-hidden"
                    data-testid={`add-driver-${driver.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleDriverClick(driver.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-medium text-gray-900">
                            {DRIVER_NAMES[driver.id] || driver.label}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Click to configure
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="py-4 space-y-3">
                          {inputConfig.map((config) =>
                            renderInputField(
                              config,
                              currentInputs[config.key],
                              (key, value) => handleInputChange(driver.id, key, value),
                              `add-${driver.id}`
                            )
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-sm text-gray-500">Estimated Value</p>
                            <p className="text-xl font-bold text-emerald-600">
                              {formatCurrency(calculatedValue)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleAddDriver(driver.id)}
                            className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
                            data-testid={`button-add-${driver.id}`}
                          >
                            <Plus className="w-4 h-4" />
                            Add to Model
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Settings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
