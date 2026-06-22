import { useState, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Check,
} from "lucide-react";
import { type CareSettingType, SETTING_CONFIG } from "@/lib/SETTING_CONFIG";

interface DriverResult {
  id: string;
  name: string;
  value: number;
  inputs: Record<string, number | string | boolean>;
}

interface AddDriverSheetProps {
  open: boolean;
  onClose: () => void;
  careSetting: CareSettingType;
  existingDriverIds: string[];
  providers: number;
  encounters: number;
  utilizationRate: number;
  staffedBeds?: number;
  nurseFTEs?: number;
  onAddDriver: (driver: DriverResult) => void;
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
  inpatientRetention: Heart,
  inpatientCCMCC: DollarSign,
  inpatientCDI: FileText,
  inpatientDenials: FileX,
  nursingOvertime: Clock,
  nursingAgency: Users,
  nursingRetention: Heart,
  nursingHAPI: Shield,
  nursingFalls: Shield,
  nursingSurvey: CheckCircle,
  nursingCareCoordination: Link2,
  nursingPatientExperience: Heart,
  edPatientExperience: Heart,
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
  inpatientRetention: "Hospitalist Retention",
  inpatientCCMCC: "CC/MCC Capture (DRG Optimization)",
  inpatientCDI: "CDI Query Reduction",
  inpatientDenials: "Denial Prevention",
  nursingOvertime: "Overtime Reduction",
  nursingAgency: "Agency & Travel Nurse Reduction",
  nursingRetention: "Nurse Retention",
  nursingHAPI: "Pressure Injury Prevention (HAPI)",
  nursingFalls: "Falls Prevention",
  nursingSurvey: "Nurse Satisfaction Survey",
  nursingCareCoordination: "Care Coordination",
  nursingPatientExperience: "Patient Experience",
  edPatientExperience: "Patient Experience",
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
    { key: "timeSavedPerEncounter", label: "Minutes saved per encounter", defaultValue: 3, type: "number", min: 1, max: 10, step: 0.5 },
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
    { key: "abridgeAttributionPercent", label: "Abridge attribution (%)", defaultValue: 33, type: "percent", min: 0, max: 100 },
    { key: "avgEdVisitRevenue", label: "Avg ED visit revenue ($)", defaultValue: 350, type: "currency", min: 100, max: 800 },
    { key: "includeAdmissions", label: "Include admissions?", defaultValue: true, type: "boolean" },
    { key: "admissionPercent", label: "Admission rate (%)", defaultValue: 20, type: "percent", min: 0, max: 50 },
    { key: "avgAdmissionRevenue", label: "Avg admission revenue ($)", defaultValue: 12000, type: "currency", min: 5000, max: 30000 },
  ],
  edRetention: [
    { key: "turnoverRate", label: "Annual turnover rate (%)", defaultValue: 10, type: "percent", min: 0, max: 50 },
    { key: "burnoutAttribution", label: "Burnout-related (%)", defaultValue: 50, type: "percent", min: 0, max: 100 },
    { key: "abridgeImpact", label: "Abridge prevention rate (%)", defaultValue: 30, type: "percent", min: 0, max: 100 },
    { key: "replacementCost", label: "Replacement cost ($)", defaultValue: 400000, type: "currency", min: 100000, max: 800000 },
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

export function AddDriverSheet({
  open,
  onClose,
  careSetting,
  existingDriverIds,
  providers,
  encounters,
  utilizationRate,
  staffedBeds = 200,
  nurseFTEs,
  onAddDriver,
}: AddDriverSheetProps) {
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [driverInputs, setDriverInputs] = useState<Record<string, any>>({});

  const effectiveNurseFTEs = nurseFTEs || Math.round(staffedBeds * 1.5);
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));

  const availableDrivers = useMemo(() => {
    const settingDrivers = SETTING_CONFIG[careSetting] || [];
    return settingDrivers.filter(d => !d.isNotQuantified);
  }, [careSetting]);

  const normalizeDriverId = (id: string): string => {
    const mappings: Record<string, string> = {
      workforce: "retention",
      wrvu: "levelOfService",
    };
    return mappings[id] || id;
  };

  const isDriverAdded = (driverId: string): boolean => {
    const normalized = normalizeDriverId(driverId);
    return existingDriverIds.some(id => normalizeDriverId(id) === normalized);
  };

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

  const calculateDriverValue = useCallback((driverId: string): number => {
    const inputs = driverInputs[driverId] || getDefaultInputs(driverId);
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
    onClose();
  };

  const calculatedValue = expandedDriverId ? calculateDriverValue(expandedDriverId) : 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold text-[#111827]">
            Add Value Driver
          </SheetTitle>
          <p className="text-sm text-[#6B7280]">
            Select a driver to add to your ROI model
          </p>
        </SheetHeader>

        <div className="space-y-3">
          {availableDrivers.map((driver) => {
            const Icon = DRIVER_ICONS[driver.id] || DollarSign;
            const isAdded = isDriverAdded(driver.id);
            const isExpanded = expandedDriverId === driver.id;
            const inputConfig = getInputConfig(driver.id);

            return (
              <div
                key={driver.id}
                className={`rounded-lg border transition-all ${
                  isAdded
                    ? "border-[#E5E7EB] bg-[#F9FAFB] opacity-60"
                    : isExpanded
                    ? "border-[#EA2C00] bg-white shadow-md"
                    : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm cursor-pointer"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleDriverClick(driver.id)}
                  disabled={isAdded}
                  className={`w-full p-4 flex items-center justify-between text-left ${
                    isAdded ? "cursor-not-allowed" : ""
                  }`}
                  data-testid={`driver-${driver.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isAdded 
                        ? "bg-[#E5E7EB]" 
                        : isExpanded 
                        ? "bg-[#FEF3F2]" 
                        : "bg-[#F3F4F6]"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isAdded 
                          ? "text-[#9CA3AF]" 
                          : isExpanded 
                          ? "text-[#EA2C00]" 
                          : "text-[#6B7280]"
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-medium ${
                        isAdded ? "text-[#9CA3AF]" : "text-[#111827]"
                      }`}>
                        {driver.label}
                      </h3>
                      <p className={`text-sm ${
                        isAdded ? "text-[#D1D5DB]" : "text-[#6B7280]"
                      }`}>
                        {driver.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdded ? (
                      <span className="text-xs text-[#9CA3AF] bg-[#E5E7EB] px-2 py-1 rounded">
                        Added
                      </span>
                    ) : isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#6B7280]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#6B7280]" />
                    )}
                  </div>
                </button>

                {isExpanded && inputConfig.length > 0 && (
                  <div className="px-4 pb-4 border-t border-[#E5E7EB] pt-4">
                    <div className="space-y-4">
                      {inputConfig.map((config) => {
                        const currentValue = driverInputs[driver.id]?.[config.key] ?? config.defaultValue;
                        
                        if (config.type === "boolean") {
                          return (
                            <div key={config.key} className="flex items-center justify-between">
                              <Label className="text-sm text-[#374151]">
                                {config.label}
                              </Label>
                              <Switch
                                checked={currentValue as boolean}
                                onCheckedChange={(checked) => 
                                  handleInputChange(driver.id, config.key, checked)
                                }
                                data-testid={`input-${driver.id}-${config.key}`}
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={config.key}>
                            <Label className="text-sm text-[#374151] mb-1.5 block">
                              {config.label}
                            </Label>
                            <NumberField
                              value={currentValue}
                              onValueChange={(v) =>
                                handleInputChange(driver.id, config.key, v)
                              }
                              className="h-10"
                              data-testid={`input-${driver.id}-${config.key}`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-[#6B7280]">Calculated Value</span>
                        <span className="text-xl font-bold text-emerald-600">
                          {formatCurrency(calculatedValue)}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleAddDriver(driver.id)}
                        className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white"
                        data-testid={`button-add-${driver.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Model
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
