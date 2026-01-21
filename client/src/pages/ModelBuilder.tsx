import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
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
  FileText,
  Link2,
  CheckCircle,
  Shield,
} from "lucide-react";

export interface ValueResults {
  providers: number;
  encounters: number;
  utilizationRate: number;
  eligibleEncounters: number;
  driverResults: Record<string, DriverResult>;
  totalBenefit: number;
  nursingStaffedBeds?: number;
  nursingFTEs?: number;
  nursingUnitType?: "med-surg" | "icu" | "mixed";
  nursingDocEventsPerBedPerYear?: number;
}

interface ModelBuilderProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
  onComplete: (results: ValueResults) => void;
  initialResults?: ValueResults | null;
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
  enterpriseAnnual?: number;
  pricingModel?: "per_clinician" | "enterprise";
  // Nursing-specific fields
  nursingStaffedBeds?: number;
  nursingFTEs?: number;
  nursingUnitType?: "med-surg" | "icu" | "mixed";
  nursingDocEventsPerBedPerYear?: number;
  nursingCostPerBedPerMonth?: number;
}

interface DriverResult {
  id: string;
  name: string;
  value: number;
  inputs: Record<string, number | string | boolean>;
}

interface DriverInputs {
  overtime: {
    // Overtime Savings inputs
    otPercentWithOT: number;        // % of providers who regularly work OT
    otHoursPerWeek: number;         // Avg OT hours per week
    otWeeksPerYear: number;         // Working weeks per year
    otReductionRate: number;        // Abridge impact on documentation time (0-1)
    otConversionRate: number;       // % of saved time → actual OT reduction (0-1)
    physicianHourlyRate: number;    // Fully-loaded physician labor cost
    // Locum Avoidance inputs
    includeLocum: boolean;
    locumProviders: number;         // Number of locum providers used
    locumHoursPerWeek: number;      // Hours per locum per week
    locumWeeksPerYear: number;      // Weeks of locum coverage annually
    locumConversionRate: number;    // % of efficiency gain → locum reduction (0-1)
    locumHourlyRate: number;        // Avg locum cost per hour
  };
  patientAccess: {
    // Step 1: Time Returned
    timeSavedPerEncounter: number;     // Minutes saved per encounter (default 2.5)
    // Step 2: Time Allocated to Access
    accessAllocation: number;          // % of saved time → access potential (default 33%)
    // Step 3: Conversion to Visits
    conversionRate: number;            // % of access time → actual visits (default 60%)
    // Step 4: New Visits
    timePerVisit: number;              // Minutes per visit (default 30)
    // Step 5: Revenue Impact
    revenuePerVisit: number;           // Blended reimbursement per visit (default $200)
  };
  retention: {
    turnoverRate: number;          // Annual turnover rate (default 6%)
    burnoutAttribution: number;    // % of departures burnout-related (default 45%)
    abridgeImpact: number;         // % of burnout Abridge can prevent (default 30%)
    replacementCost: number;       // Cost to replace a provider (default $400K)
  };
  levelOfService: {
    avgWrvuPerEncounter: number;
    wrvuImprovementRate: number;
    conversionFactor: number;
  };
  hcc: {
    riskContractPercent: number;
    conditionsPerVisit: number;
    documentationGap: number;
    hccEligiblePercent: number;
    abridgeCaptureRate: number;
    avgHccValue: number;
    auditFactor: number;
  };
  denials: {
    denialRate: number;
    docRelatedPercent: number;
    writtenOffPercent: number;
    abridgeCaptureRate: number;
    avgClaimValue: number;
  };
  // ED-specific drivers
  edThroughput: {
    annualEdVisits: number;
    lwbsRate: number;
    improvementRate: number;
    avgEdVisitRevenue: number;
    includeAdmissions: boolean;
    admissionPercent: number;
    avgAdmissionRevenue: number;
  };
  edScribe: {
    hasScribes: boolean;
    scribeFTEs: number;
    costPerFTE: number;
    reductionLevel: "partial" | "significant" | "full";
  };
  edRetention: {
    edPhysicians: number;
    turnoverRate: number;
    burnoutAttribution: number;
    abridgeImpact: number;
    replacementCost: number;
  };
  edLevelOfService: {
    annualEdVisits: number;
    avgWrvuPerEncounter: number;
    wrvuImprovementRate: number;
    conversionFactor: number;
  };
  edDenials: {
    documentedEncounters: number;
    denialRate: number;
    docRelatedPercent: number;
    writtenOffPercent: number;
    abridgeCaptureRate: number;
    avgClaimValue: number;
  };
  // Inpatient (Hospitalist) drivers
  inpatientRetention: {
    turnoverRate: number;
    replacementCost: number;
  };
  inpatientCCMCC: {
    gapRate: number;           // % of admissions with documentation gaps (default 40%)
    improvementRate: number;   // % of gaps Abridge can capture (default 15%)
    drgWeightIncrease: number; // Avg DRG weight increase (default 0.4)
    baseDrgPayment: number;    // Base DRG payment (default $6,000)
    realizationRate: number;   // % that passes audit (default 50%)
  };
  inpatientCDI: {
    queryRate: number;      // % of admissions that get queried (default 30%)
    reductionRate: number;  // % of queries that can be avoided (default 25%)
    costPerQuery: number;   // Fully loaded cost per query (default $50)
  };
  inpatientDenials: {
    denialRate: number;
    avgClaimValue: number;
  };
  // Nursing-specific drivers
  nursingOvertime: {
    hoursPerWeek: number;
    docPortionPct: number;
    reductionLevel: "conservative" | "typical" | "aggressive";
    baseHourlyRate: number;
  };
  nursingDocTime: {
    docBurden: "light" | "moderate" | "heavy";
    reductionLevel: "conservative" | "typical" | "aggressive";
    realizationFactor: number;
  };
  nursingAgency: {
    agencyUtilization: number;
    staffNurseCost: number;
    agencyNurseCost: number;
    reductionLevel: "conservative" | "typical" | "aggressive";
  };
  nursingRetention: {
    turnoverRate: number;
    burnoutPortion: number;
    docAttribution: number;
    preventionLevel: "conservative" | "typical" | "aggressive";
    replacementCost: number;
  };
  nursingCompleteness: {
    lateDocPct: number;
    incompleteFieldsPct: number;
    operationalValue: number;
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
  // Inpatient drivers
  inpatientRetention: Heart,
  inpatientCCMCC: DollarSign,
  inpatientCDI: FileText,
  inpatientDenials: FileX,
  // Nursing drivers
  nursingOvertime: Clock,
  nursingDocTime: Clock,
  nursingAgency: Users,
  nursingRetention: Heart,
  nursingCompleteness: FileText,
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
  // Inpatient drivers
  inpatientRetention: "Hospitalist Retention",
  inpatientCCMCC: "CC/MCC Capture (DRG Optimization)",
  inpatientCDI: "CDI Query Reduction",
  inpatientDenials: "Documentation-Related Denials",
  // Nursing drivers
  nursingOvertime: "Overtime Reduction",
  nursingDocTime: "Documentation Time Savings",
  nursingAgency: "Agency & Travel Nurse Reduction",
  nursingRetention: "Nurse Retention",
  nursingCompleteness: "Documentation Timeliness & Completeness",
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
  // Inpatient drivers
  inpatientRetention: "Hospitalist medicine has some of the highest turnover in healthcare (15-20% typical). Documentation burden is a primary contributor to burnout and departures.",
  inpatientCCMCC: "Complete documentation of complications and comorbidities drives DRG weight and reimbursement. Many CC/MCC opportunities go uncaptured due to rushed documentation.",
  inpatientCDI: "Better initial documentation means fewer CDI queries. Each avoided query saves time for both the CDI team and the hospitalist—operational efficiency everyone appreciates.",
  inpatientDenials: "Inpatient denials are high-dollar events. Medical necessity and clinical rationale documentation gaps are primary drivers of preventable denials.",
  // Nursing drivers
  nursingOvertime: "Real-time charting eliminates end-of-shift documentation catch-up. This is DIRECT, MEASURABLE savings—track month-over-month in payroll data.",
  nursingDocTime: "Flowsheet auto-population and voice-to-text assessments return hours to bedside care. Time doesn't disappear from payroll but gets redirected to patient care.",
  nursingAgency: "Improved retention and satisfaction reduces reliance on expensive agency nurses who cost 2-3x staff nurses. Agency → staff conversion is real budget savings.",
  nursingRetention: "Documentation burden is the top driver of nursing burnout. By reducing this burden, we help prevent burnout-related departures—each costing $40-60K to replace.",
  nursingCompleteness: "Real-time documentation ensures timely, complete charting for regulatory compliance. While harder to monetize, this reduces audit risk and remediation costs.",
};

export default function ModelBuilder({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
  initialResults,
}: ModelBuilderProps) {
  const isEDSettingInit = selectedSettings.includes("ed");
  const isInpatientSettingInit = selectedSettings.includes("inpatient");
  const isNursingSettingInit = selectedSettings.includes("nursing");
  const defaultProviders = initialResults?.providers ?? (isNursingSettingInit ? 300 : isInpatientSettingInit ? 20 : isEDSettingInit ? 25 : 50);
  const defaultEncounters = initialResults?.encounters ?? (isNursingSettingInit ? 150000 : defaultProviders * (isInpatientSettingInit ? 400 : isEDSettingInit ? 1800 : 2000));
  const defaultUtilization = initialResults?.utilizationRate ?? (isNursingSettingInit ? 60 : isEDSettingInit ? 70 : 65);
  
  const [providers, setProviders] = useState<number>(defaultProviders);
  const [encounters, setEncounters] = useState<number>(defaultEncounters);
  const [utilizationRate, setUtilizationRate] = useState<45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85>(defaultUtilization as 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85);
  
  // Nursing-specific state (initialized from initialResults or defaults)
  const [staffedBeds, setStaffedBeds] = useState<number>(
    initialResults?.nursingStaffedBeds ?? 200
  );
  const [nurseFTEs, setNurseFTEs] = useState<number>(
    initialResults?.nursingFTEs ?? 300
  );
  const [unitType, setUnitType] = useState<"med-surg" | "icu" | "mixed">(
    initialResults?.nursingUnitType ?? "med-surg"
  );
  const [documentationEvents, setDocumentationEvents] = useState<number>(
    (initialResults?.nursingStaffedBeds ?? 200) * (initialResults?.nursingDocEventsPerBedPerYear ?? 750)
  );
  const [costPerBedPerMonth, setCostPerBedPerMonth] = useState<number>(75);
  // Track whether user has manually edited nurse FTEs (to avoid auto-overwriting)
  const [nurseFTEsManuallyEdited, setNurseFTEsManuallyEdited] = useState<boolean>(false);
  
  // Investment-related state (kept for calculations but not used on this page)
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
      // Overtime Savings defaults (from spec)
      otPercentWithOT: 60,           // 60% of providers regularly work OT
      otHoursPerWeek: 4,             // Avg 4 OT hours per week
      otWeeksPerYear: 50,            // 50 working weeks
      otReductionRate: 70,           // 70% Abridge impact on doc time
      otConversionRate: 33,          // 33% of saved time → actual OT reduction
      physicianHourlyRate: 150,      // $150/hour fully-loaded
      // Locum Avoidance defaults
      includeLocum: false,
      locumProviders: 2,             // 2 locum providers
      locumHoursPerWeek: 40,         // 40 hrs/week per locum
      locumWeeksPerYear: 30,         // 30 weeks of coverage
      locumConversionRate: 33,       // 33% reduction rate
      locumHourlyRate: 275,          // $275/hr locum cost
    },
    patientAccess: {
      timeSavedPerEncounter: 2.5,      // 2.5 min saved per encounter
      accessAllocation: 33,            // 33% of saved time → access potential
      conversionRate: 60,              // 60% of access time → actual visits
      timePerVisit: 30,                // 30 min per visit
      revenuePerVisit: 200,            // $200 blended reimbursement
    },
    retention: {
      turnoverRate: 6,               // 6% annual turnover
      burnoutAttribution: 45,        // 45% of departures burnout-related
      abridgeImpact: 30,             // 30% of burnout Abridge can prevent
      replacementCost: 400000,       // $400K replacement cost
    },
    levelOfService: {
      avgWrvuPerEncounter: 1.5,
      wrvuImprovementRate: 5,
      conversionFactor: 33,
    },
    hcc: {
      riskContractPercent: 25,
      conditionsPerVisit: 2.0,
      documentationGap: 20,
      hccEligiblePercent: 35,
      abridgeCaptureRate: 40,
      avgHccValue: 800,
      auditFactor: 60,
    },
    denials: {
      denialRate: 7,
      docRelatedPercent: 35,
      writtenOffPercent: 30,
      abridgeCaptureRate: 75,
      avgClaimValue: 250,
    },
    // ED defaults
    edThroughput: {
      annualEdVisits: 45000,
      lwbsRate: 3.5,
      improvementRate: 20,
      avgEdVisitRevenue: 600,
      includeAdmissions: true,
      admissionPercent: 10,
      avgAdmissionRevenue: 15000,
    },
    edScribe: {
      hasScribes: true,
      scribeFTEs: 12.5,
      costPerFTE: 45000,
      reductionLevel: "significant",
    },
    edRetention: {
      edPhysicians: 25,
      turnoverRate: 8,
      burnoutAttribution: 50,
      abridgeImpact: 30,
      replacementCost: 800000,
    },
    edLevelOfService: {
      annualEdVisits: 45000,
      avgWrvuPerEncounter: 2.5,
      wrvuImprovementRate: 5,
      conversionFactor: 33,
    },
    edDenials: {
      documentedEncounters: 31500,
      denialRate: 10,
      docRelatedPercent: 40,
      writtenOffPercent: 30,
      abridgeCaptureRate: 75,
      avgClaimValue: 650,
    },
    // Inpatient defaults
    inpatientRetention: {
      turnoverRate: 15,
      replacementCost: 750000,
    },
    inpatientCCMCC: {
      gapRate: 40,             // 40% of admissions have documentation gaps
      improvementRate: 15,     // 15% of gaps Abridge can capture
      drgWeightIncrease: 0.4,  // Avg DRG weight increase
      baseDrgPayment: 6000,    // Base DRG payment
      realizationRate: 50,     // 50% passes audit
    },
    inpatientCDI: {
      queryRate: 30,        // 30% of admissions get queried
      reductionRate: 25,    // 25% of queries can be avoided
      costPerQuery: 50,     // $50 fully loaded cost per query
    },
    inpatientDenials: {
      denialRate: 6,
      avgClaimValue: 4500,
    },
    // Nursing defaults
    nursingOvertime: {
      hoursPerWeek: 4,
      docPortionPct: 45,
      reductionLevel: "typical",
      baseHourlyRate: 45,
    },
    nursingDocTime: {
      docBurden: "moderate",
      reductionLevel: "typical",
      realizationFactor: 50,
    },
    nursingAgency: {
      agencyUtilization: 15,
      staffNurseCost: 85000,
      agencyNurseCost: 150000,
      reductionLevel: "typical",
    },
    nursingRetention: {
      turnoverRate: 18,
      burnoutPortion: 55,
      docAttribution: 25,
      preventionLevel: "typical",
      replacementCost: 50000,
    },
    nursingCompleteness: {
      lateDocPct: 20,
      incompleteFieldsPct: 15,
      operationalValue: 50000,
    },
  });
  
  const isInpatientSetting = selectedSettings.includes("inpatient");
  const isNursingSetting = selectedSettings.includes("nursing");
  
  useEffect(() => {
    // Nursing uses documentation events, others use encounters
    if (isNursingSetting) {
      // Nursing: ~500 events/nurse/year or ~750/bed/year
      setDocumentationEvents(nurseFTEs * 500);
    } else {
      // Inpatient uses admissions, ED uses encounters, outpatient uses encounters
      let encountersPerProvider = 2000;
      if (isEDSetting) {
        encountersPerProvider = 1800;
      } else if (isInpatientSetting) {
        encountersPerProvider = 400;
      }
      setEncounters(providers * encountersPerProvider);
    }
  }, [providers, isEDSetting, isInpatientSetting, isNursingSetting, nurseFTEs]);
  
  // Smart default for nurse FTEs based on staffed beds
  useEffect(() => {
    // Only auto-calculate nurse FTEs if user hasn't manually edited them
    if (isNursingSetting && !nurseFTEsManuallyEdited) {
      const ratio = unitType === "icu" ? 2.5 : unitType === "mixed" ? 2.0 : 1.5;
      setNurseFTEs(Math.round(staffedBeds * ratio));
    }
  }, [staffedBeds, unitType, isNursingSetting, nurseFTEsManuallyEdited]);
  
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  // For nursing: eligible documentation events (nursing uses documentationEvents, not encounters)
  const eligibleDocEvents = Math.round(documentationEvents * (utilizationRate / 100));
  
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
      // Inpatient mappings
      inpatientRetention: "inpatientRetention",
      inpatientCCMCC: "inpatientCCMCC",
      inpatientCDI: "inpatientCDI",
      inpatientDenials: "inpatientDenials",
      // Nursing mappings
      nursingOvertime: "nursingOvertime",
      nursingDocTime: "nursingDocTime",
      nursingAgency: "nursingAgency",
      nursingRetention: "nursingRetention",
      nursingCompleteness: "nursingCompleteness",
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
      if (isNursingSetting) {
        return ["nursingOvertime", "nursingDocTime", "nursingRetention"];
      }
      if (isEDSetting) {
        return ["edThroughput", "edLevelOfService", "edDenials"];
      }
      if (isInpatientSetting) {
        return ["inpatientRetention", "inpatientCCMCC", "inpatientDenials"];
      }
      return ["overtime", "patientAccess", "levelOfService"];
    }
    
    return Array.from(active);
  }, [selectedLevers, isEDSetting, isInpatientSetting, isNursingSetting]);
  
  const calculateDriverValue = useCallback((driverId: string): number => {
    switch (driverId) {
      case "overtime": {
        const {
          otPercentWithOT,
          otHoursPerWeek,
          otWeeksPerYear,
          otReductionRate,
          otConversionRate,
          physicianHourlyRate,
          includeLocum,
          locumProviders,
          locumHoursPerWeek,
          locumWeeksPerYear,
          locumConversionRate,
          locumHourlyRate,
        } = driverInputs.overtime;
        
        // OVERTIME SAVINGS (4-step calculation)
        // Step 1: Baseline OT Hours
        const annualOTHours = providers * (otPercentWithOT / 100) * otHoursPerWeek * otWeeksPerYear;
        // Step 2: Documentation Time Eliminated
        const otHoursEliminated = annualOTHours * (otReductionRate / 100);
        // Step 3: Hours Converted to Savings
        const otHoursConvertedToSavings = otHoursEliminated * (otConversionRate / 100);
        // Step 4: Cost Savings
        const annualOTSavings = otHoursConvertedToSavings * physicianHourlyRate;
        
        // LOCUM AVOIDANCE (3-step calculation) - only if enabled
        let annualLocumSavings = 0;
        if (includeLocum) {
          // Step 1: Current Locum Usage
          const annualLocumHours = locumProviders * locumHoursPerWeek * locumWeeksPerYear;
          // Step 2: Locum Hours Avoided
          const locumHoursAvoided = annualLocumHours * (locumConversionRate / 100);
          // Step 3: Cost Savings
          annualLocumSavings = locumHoursAvoided * locumHourlyRate;
        }
        
        return Math.round(annualOTSavings + annualLocumSavings);
      }
      case "patientAccess": {
        const {
          timeSavedPerEncounter,
          accessAllocation,
          conversionRate,
          timePerVisit,
          revenuePerVisit,
        } = driverInputs.patientAccess;
        
        // PATIENT ACCESS (5-step calculation)
        // Step 1: Time Returned
        const minutesReturned = eligibleEncounters * timeSavedPerEncounter;
        const hoursReturned = minutesReturned / 60;
        
        // Step 2: Time Allocated to Access
        const accessHours = hoursReturned * (accessAllocation / 100);
        
        // Step 3: Conversion to Visits
        const usableHours = accessHours * (conversionRate / 100);
        
        // Step 4: New Visits
        const usableMinutes = usableHours * 60;
        const additionalVisits = usableMinutes / timePerVisit;
        
        // Step 5: Revenue Impact
        const annualAccessRevenue = additionalVisits * revenuePerVisit;
        
        return Math.round(annualAccessRevenue);
      }
      case "retention": {
        const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.retention;
        
        // CLINICIAN RETENTION (4-step calculation)
        // Step 1: Baseline Turnover
        const annualDepartures = providers * (turnoverRate / 100);
        
        // Step 2: Burnout-Related Departures
        const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
        
        // Step 3: Abridge Attribution
        const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
        
        // Step 4: Cost Savings
        const annualRetentionSavings = departuresAvoided * replacementCost;
        
        return Math.round(annualRetentionSavings);
      }
      case "levelOfService": {
        const { avgWrvuPerEncounter, wrvuImprovementRate, conversionFactor } = driverInputs.levelOfService;
        // Step 1: Baseline wRVUs
        const baselineWrvus = eligibleEncounters * avgWrvuPerEncounter;
        // Step 2: wRVU Improvement
        const wrvuGain = baselineWrvus * (wrvuImprovementRate / 100);
        // Step 3: Revenue Impact
        return Math.round(wrvuGain * conversionFactor);
      }
      case "hcc": {
        const { riskContractPercent, conditionsPerVisit, documentationGap, hccEligiblePercent, abridgeCaptureRate, avgHccValue, auditFactor } = driverInputs.hcc;
        // Step 1: Risk-Based Encounters
        const riskEncounters = eligibleEncounters * (riskContractPercent / 100);
        // Step 2: Missed HCC Opportunities
        const missedHccsPerEncounter = conditionsPerVisit * (documentationGap / 100) * (hccEligiblePercent / 100);
        const missedHccOpportunities = riskEncounters * missedHccsPerEncounter;
        // Step 3: Abridge Capture
        const hccsCaptured = missedHccOpportunities * (abridgeCaptureRate / 100);
        // Step 4: Revenue Impact
        const annualHccRevenue = hccsCaptured * avgHccValue * (auditFactor / 100);
        return Math.round(annualHccRevenue);
      }
      case "denials": {
        const { denialRate, docRelatedPercent, writtenOffPercent, abridgeCaptureRate, avgClaimValue } = driverInputs.denials;
        // Step 1: Total Denials
        const totalDenials = eligibleEncounters * (denialRate / 100);
        // Step 2: Documentation-Related
        const docRelatedDenials = totalDenials * (docRelatedPercent / 100);
        // Step 3: Written Off
        const writtenOffDenials = docRelatedDenials * (writtenOffPercent / 100);
        // Step 4: Abridge Recovery
        const claimsRecovered = writtenOffDenials * (abridgeCaptureRate / 100);
        // Step 5: Value
        return Math.round(claimsRecovered * avgClaimValue);
      }
      // ED Drivers
      case "edThroughput": {
        const { annualEdVisits, lwbsRate, improvementRate, avgEdVisitRevenue, includeAdmissions, admissionPercent, avgAdmissionRevenue } = driverInputs.edThroughput;
        // Step 1: Current LWBS
        const patientsLeaving = annualEdVisits * (lwbsRate / 100);
        // Step 2: Patients Retained
        const patientsRetained = patientsLeaving * (improvementRate / 100);
        // Step 3: Revenue Mix
        let edVisitPatients, admissionPatients, edVisitRevenue, admissionRevenue;
        if (includeAdmissions) {
          edVisitPatients = patientsRetained * (1 - admissionPercent / 100);
          admissionPatients = patientsRetained * (admissionPercent / 100);
          edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
          admissionRevenue = admissionPatients * avgAdmissionRevenue;
        } else {
          edVisitPatients = patientsRetained;
          admissionPatients = 0;
          edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
          admissionRevenue = 0;
        }
        // Step 4: Total Value
        return Math.round(edVisitRevenue + admissionRevenue);
      }
      case "edScribe": {
        const { hasScribes, scribeFTEs, costPerFTE, reductionLevel } = driverInputs.edScribe;
        if (!hasScribes) return 0;
        const reductionPct = reductionLevel === "partial" ? 40 : reductionLevel === "significant" ? 60 : 80;
        const ftesEliminated = scribeFTEs * (reductionPct / 100) * (utilizationRate / 100);
        return Math.round(ftesEliminated * costPerFTE);
      }
      case "edRetention": {
        const { edPhysicians, turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.edRetention;
        // Step 1: Baseline Turnover
        const annualDepartures = edPhysicians * (turnoverRate / 100);
        // Step 2: Burnout-Related Departures
        const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
        // Step 3: Abridge Attribution
        const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
        // Step 4: Cost Savings
        return Math.round(departuresAvoided * replacementCost);
      }
      case "edLevelOfService": {
        const { annualEdVisits, avgWrvuPerEncounter, wrvuImprovementRate, conversionFactor } = driverInputs.edLevelOfService;
        // Step 1: Baseline wRVUs
        const baselineWrvus = annualEdVisits * avgWrvuPerEncounter;
        // Step 2: wRVU Improvement
        const wrvuGain = baselineWrvus * (wrvuImprovementRate / 100);
        // Step 3: Revenue Impact
        return Math.round(wrvuGain * conversionFactor);
      }
      case "edDenials": {
        const { documentedEncounters, denialRate, docRelatedPercent, writtenOffPercent, abridgeCaptureRate, avgClaimValue } = driverInputs.edDenials;
        // Step 1: Total Denials
        const totalDenials = documentedEncounters * (denialRate / 100);
        // Step 2: Documentation-Related
        const docRelatedDenials = totalDenials * (docRelatedPercent / 100);
        // Step 3: Written Off
        const writtenOffDenials = docRelatedDenials * (writtenOffPercent / 100);
        // Step 4: Abridge Capture
        const claimsRecovered = writtenOffDenials * (abridgeCaptureRate / 100);
        // Step 5: Value
        return Math.round(claimsRecovered * avgClaimValue);
      }
      // Inpatient Drivers
      case "inpatientRetention": {
        const { turnoverRate, replacementCost } = driverInputs.inpatientRetention;
        const departures = providers * (turnoverRate / 100);
        const burnoutRelated = departures * 0.55; // Hospitalists have higher burnout-driven turnover
        const docDriven = burnoutRelated * 0.35;
        const prevented = docDriven * 0.35 * (utilizationRate / 100);
        return Math.round(prevented * replacementCost);
      }
      case "inpatientCCMCC": {
        const { gapRate, improvementRate, drgWeightIncrease, baseDrgPayment, realizationRate } = driverInputs.inpatientCCMCC;
        // Step 1: Admissions with Opportunity
        const opportunities = eligibleEncounters * (gapRate / 100);
        // Step 2: Capture Improvement
        const admissionsImproved = opportunities * (improvementRate / 100);
        // Step 3: DRG Weight Impact (gross)
        const grossImpact = admissionsImproved * drgWeightIncrease * baseDrgPayment;
        // Step 4: Reality Check
        const annualValue = grossImpact * (realizationRate / 100);
        return Math.round(annualValue);
      }
      case "inpatientCDI": {
        const { queryRate, reductionRate, costPerQuery } = driverInputs.inpatientCDI;
        // Step 1: Current Query Volume
        const annualQueries = eligibleEncounters * (queryRate / 100);
        // Step 2: Queries Avoided
        const queriesAvoided = annualQueries * (reductionRate / 100);
        // Step 3: Operational Savings
        const annualSavings = queriesAvoided * costPerQuery;
        return Math.round(annualSavings);
      }
      case "inpatientDenials": {
        const { denialRate, avgClaimValue } = driverInputs.inpatientDenials;
        const totalDenials = encounters * (denialRate / 100);
        const docRelated = totalDenials * 0.45; // Inpatient denials are often documentation-related
        const prevented = docRelated * 0.40 * (utilizationRate / 100);
        return Math.round(prevented * avgClaimValue);
      }
      // Nursing Drivers
      case "nursingOvertime": {
        const { hoursPerWeek, docPortionPct, reductionLevel, baseHourlyRate } = driverInputs.nursingOvertime;
        const overtimeRate = baseHourlyRate * 1.5;
        const totalOTHours = nurseFTEs * hoursPerWeek * 50; // 50 weeks
        const docRelatedOT = totalOTHours * (docPortionPct / 100);
        const reductionPct = reductionLevel === "conservative" ? 45 : reductionLevel === "typical" ? 60 : 75;
        const hoursEliminated = docRelatedOT * (reductionPct / 100) * (utilizationRate / 100);
        return Math.round(hoursEliminated * overtimeRate);
      }
      case "nursingDocTime": {
        const { docBurden, reductionLevel, realizationFactor } = driverInputs.nursingDocTime;
        const hoursPerShift = docBurden === "light" ? 2.0 : docBurden === "moderate" ? 2.5 : 3.5;
        const totalDocHours = nurseFTEs * hoursPerShift * 3 * 50; // 3 shifts/week, 50 weeks
        const reductionPct = reductionLevel === "conservative" ? 25 : reductionLevel === "typical" ? 35 : 45;
        const hoursReturned = totalDocHours * (reductionPct / 100) * (utilizationRate / 100);
        // Use 50% realization factor (time gets redirected, not eliminated from payroll)
        return Math.round(hoursReturned * 45 * (realizationFactor / 100));
      }
      case "nursingAgency": {
        const { agencyUtilization, staffNurseCost, agencyNurseCost, reductionLevel } = driverInputs.nursingAgency;
        const agencyFTEs = nurseFTEs * (agencyUtilization / 100);
        const premium = agencyNurseCost - staffNurseCost;
        const reductionPct = reductionLevel === "conservative" ? 5 : reductionLevel === "typical" ? 10 : 20;
        const ftesConverted = agencyFTEs * (reductionPct / 100) * (utilizationRate / 100);
        return Math.round(ftesConverted * premium);
      }
      case "nursingRetention": {
        const { turnoverRate, burnoutPortion, docAttribution, preventionLevel, replacementCost } = driverInputs.nursingRetention;
        const departures = nurseFTEs * (turnoverRate / 100);
        const burnoutDepartures = departures * (burnoutPortion / 100);
        const docRelated = burnoutDepartures * (docAttribution / 100);
        const preventionPct = preventionLevel === "conservative" ? 30 : preventionLevel === "typical" ? 40 : 55;
        const prevented = docRelated * (preventionPct / 100) * (utilizationRate / 100);
        return Math.round(prevented * replacementCost);
      }
      case "nursingCompleteness": {
        const { operationalValue } = driverInputs.nursingCompleteness;
        // Documentation completeness is hard to monetize directly
        // Apply utilization rate to the operational value estimate
        return Math.round(operationalValue * (utilizationRate / 100));
      }
      default:
        return 0;
    }
  }, [providers, encounters, utilizationRate, eligibleEncounters, eligibleDocEvents, driverInputs, nurseFTEs, documentationEvents]);
  
  const driverResults = useMemo(() => {
    const results: Record<string, { name: string; value: number; category: "time" | "quality" }> = {};
    const timeDrivers = ["overtime", "patientAccess", "retention", "edThroughput", "edScribe", "edRetention", "inpatientRetention", "nursingOvertime", "nursingDocTime", "nursingAgency", "nursingRetention"];
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
    // Nursing uses per-bed pricing
    if (isNursingSetting) {
      return staffedBeds * costPerBedPerMonth * 12;
    }
    if (pricingModel === "per_clinician") {
      return providers * costPerMonth * 12;
    }
    return enterpriseAnnual;
  }, [pricingModel, providers, costPerMonth, enterpriseAnnual, isNursingSetting, staffedBeds, costPerBedPerMonth]);
  
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
            otPercentWithOT: driverInputs.overtime.otPercentWithOT,
            otHoursPerWeek: driverInputs.overtime.otHoursPerWeek,
            otWeeksPerYear: driverInputs.overtime.otWeeksPerYear,
            otReductionRate: driverInputs.overtime.otReductionRate,
            otConversionRate: driverInputs.overtime.otConversionRate,
            physicianHourlyRate: driverInputs.overtime.physicianHourlyRate,
            includeLocum: driverInputs.overtime.includeLocum,
            locumProviders: driverInputs.overtime.locumProviders,
            locumHoursPerWeek: driverInputs.overtime.locumHoursPerWeek,
            locumWeeksPerYear: driverInputs.overtime.locumWeeksPerYear,
            locumConversionRate: driverInputs.overtime.locumConversionRate,
            locumHourlyRate: driverInputs.overtime.locumHourlyRate,
          };
        case "patientAccess":
          return {
            timeSavedPerEncounter: driverInputs.patientAccess.timeSavedPerEncounter,
            accessAllocation: driverInputs.patientAccess.accessAllocation,
            conversionRate: driverInputs.patientAccess.conversionRate,
            timePerVisit: driverInputs.patientAccess.timePerVisit,
            revenuePerVisit: driverInputs.patientAccess.revenuePerVisit,
          };
        case "retention":
          return {
            turnoverRate: driverInputs.retention.turnoverRate,
            burnoutAttribution: driverInputs.retention.burnoutAttribution,
            abridgeImpact: driverInputs.retention.abridgeImpact,
            replacementCost: driverInputs.retention.replacementCost,
          };
        case "levelOfService":
          return {
            avgWrvuPerEncounter: driverInputs.levelOfService.avgWrvuPerEncounter,
            wrvuImprovementRate: driverInputs.levelOfService.wrvuImprovementRate,
            conversionFactor: driverInputs.levelOfService.conversionFactor,
          };
        case "hcc":
          return {
            riskContractPercent: driverInputs.hcc.riskContractPercent,
            conditionsPerVisit: driverInputs.hcc.conditionsPerVisit,
            documentationGap: driverInputs.hcc.documentationGap,
            hccEligiblePercent: driverInputs.hcc.hccEligiblePercent,
            abridgeCaptureRate: driverInputs.hcc.abridgeCaptureRate,
            avgHccValue: driverInputs.hcc.avgHccValue,
            auditFactor: driverInputs.hcc.auditFactor,
          };
        case "denials":
          return {
            denialRate: driverInputs.denials.denialRate,
            docRelatedPercent: driverInputs.denials.docRelatedPercent,
            writtenOffPercent: driverInputs.denials.writtenOffPercent,
            abridgeCaptureRate: driverInputs.denials.abridgeCaptureRate,
            avgClaimValue: driverInputs.denials.avgClaimValue,
          };
        // ED drivers
        case "edThroughput":
          return {
            annualEdVisits: driverInputs.edThroughput.annualEdVisits,
            lwbsRate: driverInputs.edThroughput.lwbsRate,
            improvementRate: driverInputs.edThroughput.improvementRate,
            avgEdVisitRevenue: driverInputs.edThroughput.avgEdVisitRevenue,
            includeAdmissions: driverInputs.edThroughput.includeAdmissions,
            admissionPercent: driverInputs.edThroughput.admissionPercent,
            avgAdmissionRevenue: driverInputs.edThroughput.avgAdmissionRevenue,
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
            edPhysicians: driverInputs.edRetention.edPhysicians,
            turnoverRate: driverInputs.edRetention.turnoverRate,
            burnoutAttribution: driverInputs.edRetention.burnoutAttribution,
            abridgeImpact: driverInputs.edRetention.abridgeImpact,
            replacementCost: driverInputs.edRetention.replacementCost,
          };
        case "edLevelOfService":
          return {
            annualEdVisits: driverInputs.edLevelOfService.annualEdVisits,
            avgWrvuPerEncounter: driverInputs.edLevelOfService.avgWrvuPerEncounter,
            wrvuImprovementRate: driverInputs.edLevelOfService.wrvuImprovementRate,
            conversionFactor: driverInputs.edLevelOfService.conversionFactor,
          };
        case "edDenials":
          return {
            documentedEncounters: driverInputs.edDenials.documentedEncounters,
            denialRate: driverInputs.edDenials.denialRate,
            docRelatedPercent: driverInputs.edDenials.docRelatedPercent,
            writtenOffPercent: driverInputs.edDenials.writtenOffPercent,
            abridgeCaptureRate: driverInputs.edDenials.abridgeCaptureRate,
            avgClaimValue: driverInputs.edDenials.avgClaimValue,
          };
        // Inpatient drivers
        case "inpatientRetention":
          return {
            turnoverRate: driverInputs.inpatientRetention.turnoverRate,
            replacementCost: driverInputs.inpatientRetention.replacementCost,
          };
        case "inpatientCCMCC":
          return {
            gapRate: driverInputs.inpatientCCMCC.gapRate,
            improvementRate: driverInputs.inpatientCCMCC.improvementRate,
            drgWeightIncrease: driverInputs.inpatientCCMCC.drgWeightIncrease,
            baseDrgPayment: driverInputs.inpatientCCMCC.baseDrgPayment,
            realizationRate: driverInputs.inpatientCCMCC.realizationRate,
          };
        case "inpatientCDI":
          return {
            queryRate: driverInputs.inpatientCDI.queryRate,
            reductionRate: driverInputs.inpatientCDI.reductionRate,
            costPerQuery: driverInputs.inpatientCDI.costPerQuery,
          };
        case "inpatientDenials":
          return {
            denialRate: driverInputs.inpatientDenials.denialRate,
            avgClaimValue: driverInputs.inpatientDenials.avgClaimValue,
          };
        default:
          return {};
      }
    };

    const results: ValueResults = {
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
      // Include nursing-specific fields when in nursing mode
      ...(isNursingSetting && {
        nursingStaffedBeds: staffedBeds,
        nursingFTEs: nurseFTEs,
        nursingUnitType: unitType,
        nursingDocEventsPerBedPerYear: 750,
      }),
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
            <span className="font-mono font-semibold text-emerald-600 text-lg">{formatCurrency(value)}</span>
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
      // Inpatient drivers
      case "inpatientRetention":
        return renderInpatientRetentionInputs();
      case "inpatientCCMCC":
        return renderInpatientCCMCCInputs();
      case "inpatientCDI":
        return renderInpatientCDIInputs();
      case "inpatientDenials":
        return renderInpatientDenialsInputs();
      // Nursing drivers
      case "nursingOvertime":
        return renderNursingOvertimeInputs();
      case "nursingDocTime":
        return renderNursingDocTimeInputs();
      case "nursingAgency":
        return renderNursingAgencyInputs();
      case "nursingRetention":
        return renderNursingRetentionInputs();
      case "nursingCompleteness":
        return renderNursingCompletenessInputs();
      default:
        return null;
    }
  };
  
  const renderOvertimeInputs = () => {
    const {
      otPercentWithOT,
      otHoursPerWeek,
      otWeeksPerYear,
      otReductionRate,
      otConversionRate,
      physicianHourlyRate,
      includeLocum,
      locumProviders,
      locumHoursPerWeek,
      locumWeeksPerYear,
      locumConversionRate,
      locumHourlyRate,
    } = driverInputs.overtime;

    // OVERTIME CALCULATIONS
    const annualOTHours = providers * (otPercentWithOT / 100) * otHoursPerWeek * otWeeksPerYear;
    const otHoursEliminated = annualOTHours * (otReductionRate / 100);
    const otHoursConvertedToSavings = otHoursEliminated * (otConversionRate / 100);
    const annualOTSavings = otHoursConvertedToSavings * physicianHourlyRate;

    // LOCUM CALCULATIONS
    const annualLocumHours = locumProviders * locumHoursPerWeek * locumWeeksPerYear;
    const locumHoursAvoided = annualLocumHours * (locumConversionRate / 100);
    const annualLocumSavings = locumHoursAvoided * locumHourlyRate;

    const totalSavings = annualOTSavings + (includeLocum ? annualLocumSavings : 0);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* OVERTIME SAVINGS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Overtime Savings</h4>
            <span className="font-mono font-bold text-emerald-600">{formatCurrency(Math.round(annualOTSavings))}</span>
          </div>

          {/* Step 1: Baseline Overtime Hours */}
          <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline Overtime Hours</p>
            <p className="text-xs text-[#6B7280]">How much overtime exists today?</p>
            
            <div className="grid grid-cols-5 gap-2 items-center text-center">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Providers</label>
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">{providers}</div>
              </div>
              <div className="text-neutral-400">×</div>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">% with OT</label>
                <Input
                  type="number"
                  value={otPercentWithOT}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, otPercentWithOT: Number(e.target.value) || 0 } }))}
                  className="w-full text-center font-mono text-sm h-8"
                  data-testid="ot-percent-input"
                />
              </div>
              <div className="text-neutral-400">×</div>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Hrs/Week</label>
                <Input
                  type="number"
                  value={otHoursPerWeek}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, otHoursPerWeek: Number(e.target.value) || 0 } }))}
                  className="w-full text-center font-mono text-sm h-8"
                  data-testid="ot-hours-per-week-input"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">×</span>
                <div>
                  <label className="text-xs text-[#6B7280] block mb-1">Weeks/Year</label>
                  <Input
                    type="number"
                    value={otWeeksPerYear}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, otWeeksPerYear: Number(e.target.value) || 0 } }))}
                    className="w-20 text-center font-mono text-sm h-8"
                    data-testid="ot-weeks-per-year-input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">=</span>
                <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                  {Math.round(annualOTHours).toLocaleString()} hrs
                </div>
              </div>
            </div>
          </div>

          <StepDivider />

          {/* Step 2: Documentation Time Eliminated */}
          <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation Time Eliminated</p>
            <p className="text-xs text-[#6B7280]">How much can Abridge reduce?</p>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                  {Math.round(annualOTHours).toLocaleString()} hrs
                </div>
                <span className="text-neutral-400">×</span>
                <div>
                  <Input
                    type="number"
                    value={otReductionRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, otReductionRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="ot-reduction-rate-input"
                  />
                </div>
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">=</span>
                <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                  {Math.round(otHoursEliminated).toLocaleString()} hrs
                </div>
              </div>
            </div>
          </div>

          <StepDivider />

          {/* Step 3: Hours Converted to Savings */}
          <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Hours Converted to Savings</p>
            <p className="text-xs text-[#6B7280]">What portion becomes actual OT reduction?</p>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                  {Math.round(otHoursEliminated).toLocaleString()} hrs
                </div>
                <span className="text-neutral-400">×</span>
                <div>
                  <Input
                    type="number"
                    value={otConversionRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, otConversionRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="ot-conversion-rate-input"
                  />
                </div>
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">=</span>
                <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                  {Math.round(otHoursConvertedToSavings).toLocaleString()} hrs
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
              The remaining {100 - otConversionRate}% goes to quality of life and seeing more patients
            </p>
          </div>

          <StepDivider />

          {/* Step 4: Cost Savings */}
          <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
            <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                  {Math.round(otHoursConvertedToSavings).toLocaleString()} hrs
                </div>
                <span className="text-neutral-400">×</span>
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={physicianHourlyRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, physicianHourlyRate: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ot-physician-rate-input"
                />
                <span className="text-xs text-[#6B7280]">/hr</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">=</span>
                <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                  {formatCurrency(Math.round(annualOTSavings))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOCUM AVOIDANCE SECTION */}
        <div className="border-t-2 border-neutral-200 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLocum}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, includeLocum: e.target.checked } }))}
                  className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                  data-testid="include-locum-checkbox"
                />
                <span className="text-sm font-semibold text-[#111827] uppercase tracking-wide">Locum Avoidance</span>
              </label>
            </div>
            <span className={`font-mono font-bold ${includeLocum ? 'text-emerald-600' : 'text-neutral-400'}`}>
              {includeLocum ? formatCurrency(Math.round(annualLocumSavings)) : '$0'}
            </span>
          </div>

          {includeLocum && (
            <>
              {/* Step 1: Current Locum Usage */}
              <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Locum Usage</p>
                <p className="text-xs text-[#6B7280]">How many locum hours are you using today?</p>
                
                <div className="grid grid-cols-5 gap-2 items-center text-center">
                  <div>
                    <label className="text-xs text-[#6B7280] block mb-1">Locum Providers</label>
                    <Input
                      type="number"
                      value={locumProviders}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumProviders: Number(e.target.value) || 0 } }))}
                      className="w-full text-center font-mono text-sm h-8"
                      data-testid="locum-providers-input"
                    />
                  </div>
                  <div className="text-neutral-400">×</div>
                  <div>
                    <label className="text-xs text-[#6B7280] block mb-1">Hrs/Week</label>
                    <Input
                      type="number"
                      value={locumHoursPerWeek}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumHoursPerWeek: Number(e.target.value) || 0 } }))}
                      className="w-full text-center font-mono text-sm h-8"
                      data-testid="locum-hours-per-week-input"
                    />
                  </div>
                  <div className="text-neutral-400">×</div>
                  <div>
                    <label className="text-xs text-[#6B7280] block mb-1">Weeks/Yr</label>
                    <Input
                      type="number"
                      value={locumWeeksPerYear}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumWeeksPerYear: Number(e.target.value) || 0 } }))}
                      className="w-full text-center font-mono text-sm h-8"
                      data-testid="locum-weeks-per-year-input"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">=</span>
                    <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                      {Math.round(annualLocumHours).toLocaleString()} hrs
                    </div>
                  </div>
                </div>
              </div>

              <StepDivider />

              {/* Step 2: Locum Hours Avoided */}
              <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Locum Hours Avoided</p>
                <p className="text-xs text-[#6B7280]">What portion can improved efficiency reduce?</p>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                      {Math.round(annualLocumHours).toLocaleString()} hrs
                    </div>
                    <span className="text-neutral-400">×</span>
                    <Input
                      type="number"
                      value={locumConversionRate}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumConversionRate: Number(e.target.value) || 0 } }))}
                      className="w-16 text-center font-mono text-sm h-8"
                      data-testid="locum-conversion-rate-input"
                    />
                    <span className="text-xs text-[#6B7280]">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">=</span>
                    <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                      {Math.round(locumHoursAvoided).toLocaleString()} hrs
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
                  We conservatively assume 1/3 of locum usage is tied to documentation-driven capacity constraints
                </p>
              </div>

              <StepDivider />

              {/* Step 3: Cost Savings */}
              <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Cost Savings</p>
                <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                      {Math.round(locumHoursAvoided).toLocaleString()} hrs
                    </div>
                    <span className="text-neutral-400">×</span>
                    <span className="text-sm text-[#6B7280]">$</span>
                    <Input
                      type="number"
                      value={locumHourlyRate}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumHourlyRate: Number(e.target.value) || 0 } }))}
                      className="w-20 text-center font-mono text-sm h-8"
                      data-testid="locum-hourly-rate-input"
                    />
                    <span className="text-xs text-[#6B7280]">/hr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">=</span>
                    <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                      {formatCurrency(Math.round(annualLocumSavings))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
                  National avg locum rate. Specialists may run $350-500/hr.
                </p>
              </div>
            </>
          )}
        </div>

        {/* COMBINED TOTAL */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-3">
          <p className="text-sm font-semibold text-[#111827]">Total Overtime & Locum Savings</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B7280]">Overtime Savings:</span>
              <span className="font-mono text-emerald-600">{formatCurrency(Math.round(annualOTSavings))}</span>
            </div>
            {includeLocum && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Locum Avoidance:</span>
                <span className="font-mono text-emerald-600">{formatCurrency(Math.round(annualLocumSavings))}</span>
              </div>
            )}
            <div className="border-t border-emerald-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-medium text-[#111827]">Total Annual Savings:</span>
                <span className="font-mono font-bold text-emerald-600 text-xl">
                  {formatCurrency(Math.round(totalSavings))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderPatientAccessInputs = () => {
    const {
      timeSavedPerEncounter,
      accessAllocation,
      conversionRate,
      timePerVisit,
      revenuePerVisit,
    } = driverInputs.patientAccess;

    // PATIENT ACCESS CALCULATIONS (5-step)
    // Step 1: Time Returned
    const minutesReturned = eligibleEncounters * timeSavedPerEncounter;
    const hoursReturned = minutesReturned / 60;
    
    // Step 2: Time Allocated to Access
    const accessHours = hoursReturned * (accessAllocation / 100);
    
    // Step 3: Conversion to Visits
    const usableHours = accessHours * (conversionRate / 100);
    
    // Step 4: New Visits
    const usableMinutes = usableHours * 60;
    const additionalVisits = usableMinutes / timePerVisit;
    
    // Step 5: Revenue Impact
    const annualAccessRevenue = additionalVisits * revenuePerVisit;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            When clinicians spend less time on documentation, they have capacity to see additional patients. 
            Not all saved time converts to visits—scheduling, room availability, and demand limit realization—but 
            even a modest portion creates meaningful revenue.
          </p>
        </div>

        {/* Step 1: Time Returned */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Time Returned</p>
          <p className="text-xs text-[#6B7280]">How much time does Abridge give back?</p>
          
          <div className="grid grid-cols-5 gap-2 items-center text-center">
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Encounters</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {eligibleEncounters.toLocaleString()}
              </div>
            </div>
            <div className="text-neutral-400">×</div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Utilization</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {utilizationRate}%
              </div>
            </div>
            <div className="text-neutral-400">×</div>
            <div>
              <label className="text-xs text-[#6B7280] block mb-1">Time Saved</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={timeSavedPerEncounter}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, timeSavedPerEncounter: Number(e.target.value) || 0 } }))}
                  className="w-full text-center font-mono text-sm h-8"
                  data-testid="pa-time-saved-input"
                />
                <span className="text-xs text-[#6B7280]">min</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(hoursReturned).toLocaleString()} hrs
              </div>
            </div>
          </div>
        </div>

        <StepDivider />

        {/* Step 2: Time Allocated to Access */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Time Allocated to Access</p>
          <p className="text-xs text-[#6B7280]">What portion of saved time goes toward seeing more patients?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(hoursReturned).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">×</span>
              <Input
                type="number"
                value={accessAllocation}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, accessAllocation: Number(e.target.value) || 0 } }))}
                className="w-16 text-center font-mono text-sm h-8"
                data-testid="pa-access-allocation-input"
              />
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(accessHours).toLocaleString()} hrs
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
            We assume saved time splits three ways: 1/3 quality of life, 1/3 access, 1/3 cost reduction
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Conversion to Visits */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Conversion to Visits</p>
          <p className="text-xs text-[#6B7280]">How much actually converts to patient visits?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(accessHours).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">×</span>
              <Input
                type="number"
                value={conversionRate}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, conversionRate: Number(e.target.value) || 0 } }))}
                className="w-16 text-center font-mono text-sm h-8"
                data-testid="pa-conversion-rate-input"
              />
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(usableHours).toLocaleString()} hrs
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Conversion depends on patient demand, room availability, and scheduling capacity. 60% is conservative.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: New Visits */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: New Visits</p>
          <p className="text-xs text-[#6B7280]">How many additional visits is that?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(usableHours).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">÷</span>
              <Input
                type="number"
                value={timePerVisit}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, timePerVisit: Number(e.target.value) || 1 } }))}
                className="w-16 text-center font-mono text-sm h-8"
                data-testid="pa-time-per-visit-input"
              />
              <span className="text-xs text-[#6B7280]">min/visit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(additionalVisits).toLocaleString()} visits
              </div>
            </div>
          </div>
        </div>

        <StepDivider />

        {/* Step 5: Revenue Impact */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 5: Revenue Impact</p>
          <p className="text-xs text-[#6B7280]">What's the revenue value?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(additionalVisits).toLocaleString()} visits
              </div>
              <span className="text-neutral-400">×</span>
              <span className="text-sm text-[#6B7280]">$</span>
              <Input
                type="number"
                value={revenuePerVisit}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, revenuePerVisit: Number(e.target.value) || 0 } }))}
                className="w-20 text-center font-mono text-sm h-8"
                data-testid="pa-revenue-per-visit-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                {formatCurrency(Math.round(annualAccessRevenue))}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-neutral-100 rounded-lg border border-neutral-200 space-y-2">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Benchmark: Revenue per Visit</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Primary Care</span>
              <span className="font-mono text-[#111827]">$100 - $150</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Specialty</span>
              <span className="font-mono text-[#111827]">$175 - $300</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Procedural</span>
              <span className="font-mono text-[#111827]">$300 - $600+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Your input</span>
              <span className="font-mono text-[#E85D3F] font-medium">${revenuePerVisit} (blended)</span>
            </div>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Patient Access Revenue</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualAccessRevenue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(additionalVisits).toLocaleString()} additional visits × ${revenuePerVisit}/visit
          </p>
        </div>
      </div>
    );
  };
  
  const renderRetentionInputs = () => {
    const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.retention;

    // CLINICIAN RETENTION CALCULATIONS (4-step)
    // Step 1: Baseline Turnover
    const annualDepartures = providers * (turnoverRate / 100);
    
    // Step 2: Burnout-Related Departures
    const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
    
    // Step 3: Abridge Attribution
    const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
    
    // Step 4: Cost Savings
    const annualRetentionSavings = departuresAvoided * replacementCost;

    // Dynamic framing calculations
    const yearsToRetainOne = departuresAvoided > 0 ? 1 / departuresAvoided : 999;
    const monthsToRetainOne = yearsToRetainOne * 12;

    // Dynamic "What This Means" framing
    const getRetentionFraming = () => {
      if (departuresAvoided >= 2.0) {
        return {
          headline: `Retain ~${departuresAvoided.toFixed(1)} additional physicians per year`,
          detail: `At this scale, retention impact is highly predictable. You're avoiding ${formatCurrency(Math.round(annualRetentionSavings))} in annual replacement costs.`,
          timeframe: "Measurable within 12 months"
        };
      } else if (departuresAvoided >= 1.0) {
        return {
          headline: `Retain ~1 additional physician per year`,
          detail: `Every ${Math.round(12 / departuresAvoided)} months, expect to retain a physician you would have otherwise lost to burnout.`,
          timeframe: "Measurable within 12-18 months"
        };
      } else if (departuresAvoided >= 0.5) {
        return {
          headline: `Retain 1 additional physician every ~${Math.round(monthsToRetainOne)} months`,
          detail: `Over ${yearsToRetainOne.toFixed(1)} years, expect to retain 1 physician, saving ${formatCurrency(replacementCost)}.`,
          timeframe: "Measurable within 18-24 months"
        };
      } else if (departuresAvoided >= 0.2) {
        const years = Math.round(yearsToRetainOne);
        return {
          headline: `Over ~${years} years, retain 1 additional physician`,
          detail: `Total savings of ${formatCurrency(replacementCost)} realized over ${years}-year period. Annualized: ${formatCurrency(Math.round(annualRetentionSavings))}/year.`,
          timeframe: "Long-term investment metric"
        };
      } else {
        const years = Math.round(yearsToRetainOne);
        return {
          headline: `Long-term retention probability`,
          detail: `Over ~${years} years, expect to retain 1 additional physician, saving ${formatCurrency(replacementCost)}. At this scale, think of retention as a long-term investment.`,
          timeframe: "5+ year investment horizon"
        };
      }
    };

    const framing = getRetentionFraming();
    const isSmallProviderCount = providers < 50;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            Documentation burden is the #1 driver of physician burnout. Reducing this burden improves 
            satisfaction and retention. Replacing a physician costs $400K-$800K+ when you factor in 
            recruiting, lost revenue during vacancy, and onboarding.
          </p>
        </div>

        {/* Small Provider Warning */}
        {isSmallProviderCount && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Small Provider Count
            </p>
            <p className="text-xs text-amber-700">
              With fewer than 50 providers, retention savings are probabilistic over multi-year periods. 
              Consider this a long-term investment metric rather than a near-term ROI driver.
            </p>
          </div>
        )}

        {/* Step 1: Baseline Turnover */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline Turnover</p>
          <p className="text-xs text-[#6B7280]">What's the current turnover situation?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Providers</label>
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5">
                  {providers}
                </div>
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Turnover Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={turnoverRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, turnoverRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="ret-turnover-rate-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {annualDepartures.toFixed(1)} departures/year
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            National average: 6-8%. Some specialties see 10%+.
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Burnout-Related Departures */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Burnout-Related Departures</p>
          <p className="text-xs text-[#6B7280]">How much is burnout-driven?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {annualDepartures.toFixed(1)} departures
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={burnoutAttribution}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, burnoutAttribution: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ret-burnout-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {preventableDepartures.toFixed(2)} preventable
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Research indicates 40-50% of physician departures cite burnout as a primary factor.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Attribution */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Attribution</p>
          <p className="text-xs text-[#6B7280]">What can Abridge prevent?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {preventableDepartures.toFixed(2)} preventable
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={abridgeImpact}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, abridgeImpact: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ret-abridge-impact-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {departuresAvoided.toFixed(2)}/year avoided
              </div>
            </div>
          </div>

          {/* Why 30%? Explanation Box */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Why 30%? The Rule of Thirds</p>
            <div className="text-xs text-slate-600 space-y-1">
              <p>Documentation burden = ~50% of burnout drivers</p>
              <p>Abridge reduces documentation burden by 70%</p>
              <p className="font-mono text-slate-700 pt-1">50% × 70% = 35% theoretical impact</p>
              <p className="text-slate-500 pt-1">Rounded to 30% for conservatism. We only claim credit for what we can directly impact.</p>
            </div>
          </div>
        </div>

        <StepDivider />

        {/* Step 4: Cost Savings */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
          <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {departuresAvoided.toFixed(2)} avoided
              </div>
              <span className="text-neutral-400">×</span>
              <span className="text-sm text-[#6B7280]">$</span>
              <Input
                type="number"
                value={replacementCost}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, replacementCost: Number(e.target.value) || 0 } }))}
                className="w-28 text-center font-mono text-sm h-8"
                data-testid="ret-replacement-cost-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                {formatCurrency(Math.round(annualRetentionSavings))}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic "What This Means" Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800">What This Means</p>
          <p className="text-sm font-medium text-[#111827]">{framing.headline}</p>
          <p className="text-xs text-slate-600">{framing.detail}</p>
          <div className="flex items-center gap-2 pt-2">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">{framing.timeframe}</span>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Retention Savings</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualRetentionSavings))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {departuresAvoided.toFixed(2)} departures avoided × ${replacementCost.toLocaleString()} replacement cost
          </p>
        </div>
      </div>
    );
  };
  
  const renderLevelOfServiceInputs = () => {
    const { avgWrvuPerEncounter, wrvuImprovementRate, conversionFactor } = driverInputs.levelOfService;

    // ACCURATE LEVEL OF SERVICE CALCULATIONS (3-step)
    // Step 1: Baseline wRVUs
    const baselineWrvus = eligibleEncounters * avgWrvuPerEncounter;
    
    // Step 2: wRVU Improvement
    const wrvuGain = baselineWrvus * (wrvuImprovementRate / 100);
    
    // Step 3: Revenue Impact
    const annualAlosRevenue = wrvuGain * conversionFactor;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            Physicians under time pressure document less than the full clinical picture. 
            AI-assisted documentation captures the complexity that supports accurate coding—not 
            upcoding, just getting credit for work already done.
          </p>
        </div>

        {/* Step 1: Baseline wRVUs */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline wRVUs</p>
          <p className="text-xs text-[#6B7280]">What's your current productivity?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Eligible Encounters</label>
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5">
                  {eligibleEncounters.toLocaleString()}
                </div>
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Avg wRVU/Encounter</label>
                <Input
                  type="number"
                  value={avgWrvuPerEncounter}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, avgWrvuPerEncounter: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  step="0.1"
                  data-testid="los-wrvu-per-encounter-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {baselineWrvus.toLocaleString()} wRVUs
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Don't know your wRVUs? We estimate using 1.5 wRVU per encounter (typical outpatient blend).
          </p>
        </div>

        <StepDivider />

        {/* Step 2: wRVU Improvement */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: wRVU Improvement</p>
          <p className="text-xs text-[#6B7280]">How much does Abridge improve capture?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {baselineWrvus.toLocaleString()} wRVUs
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={wrvuImprovementRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, wrvuImprovementRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="los-improvement-rate-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {wrvuGain.toLocaleString()} wRVU gain
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            On average, Abridge improves wRVU capture by 5% through more complete documentation of clinical complexity.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Revenue Impact */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Revenue Impact</p>
          <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {wrvuGain.toLocaleString()} wRVUs
              </div>
              <span className="text-neutral-400">×</span>
              <span className="text-sm text-[#6B7280]">$</span>
              <Input
                type="number"
                value={conversionFactor}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, conversionFactor: Number(e.target.value) || 0 } }))}
                className="w-20 text-center font-mono text-sm h-8"
                data-testid="los-conversion-factor-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                {formatCurrency(Math.round(annualAlosRevenue))}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Conversion Factor
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Medicare (2024)</span>
              <span className="font-mono text-slate-700">$33</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Commercial (typical)</span>
              <span className="font-mono text-slate-700">$45 - $65</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 mt-2">
            We anchor to Medicare for conservatism. If your payer mix is commercial-heavy, 
            actual results may be 30-50% higher.
          </p>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Revenue</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualAlosRevenue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {wrvuGain.toLocaleString()} wRVU gain × ${conversionFactor} conversion factor
          </p>
        </div>
      </div>
    );
  };
  
  const renderHccInputs = () => {
    const { riskContractPercent, conditionsPerVisit, documentationGap, hccEligiblePercent, abridgeCaptureRate, avgHccValue, auditFactor } = driverInputs.hcc;

    // HCC & CHRONIC CONDITION CAPTURE CALCULATIONS (4-step)
    // Step 1: Risk-Based Encounters
    const riskEncounters = eligibleEncounters * (riskContractPercent / 100);
    
    // Step 2: Missed HCC Opportunities
    const missedHccsPerEncounter = conditionsPerVisit * (documentationGap / 100) * (hccEligiblePercent / 100);
    const missedHccOpportunities = riskEncounters * missedHccsPerEncounter;
    
    // Step 3: Abridge Capture
    const hccsCaptured = missedHccOpportunities * (abridgeCaptureRate / 100);
    
    // Step 4: Revenue Impact
    const annualHccRevenue = hccsCaptured * avgHccValue * (auditFactor / 100);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            Risk adjustment relies on complete documentation of chronic conditions. Physicians 
            discuss multiple conditions per visit, but time pressure means not all make it to 
            the note. Abridge captures what's said, recovering HCC opportunities that would 
            otherwise be missed.
          </p>
        </div>

        {/* Step 1: Risk-Based Encounters */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Risk-Based Encounters</p>
          <p className="text-xs text-[#6B7280]">How many encounters are in risk contracts?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Eligible Encounters</label>
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5">
                  {eligibleEncounters.toLocaleString()}
                </div>
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Risk Contract %</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={riskContractPercent}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, riskContractPercent: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="hcc-risk-contract-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(riskEncounters).toLocaleString()} risk encounters
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Varies by organization: 10-25% (traditional), 25-50% (progressive), 50%+ (MA-focused)
          </p>
          {riskContractPercent < 10 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
              <p className="text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                HCC capture may not be a primary driver with low risk contract volume
              </p>
            </div>
          )}
        </div>

        <StepDivider />

        {/* Step 2: Missed HCC Opportunities */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Missed HCC Opportunities</p>
          <p className="text-xs text-[#6B7280]">How many HCC-eligible conditions are discussed but not documented?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(riskEncounters).toLocaleString()} risk enc.
              </div>
              <span className="text-neutral-400">×</span>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {missedHccsPerEncounter.toFixed(2)} missed/visit
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(missedHccOpportunities).toLocaleString()} HCC opportunities
              </div>
            </div>
          </div>

          {/* How We Calculate Missed HCCs/Visit */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">How We Calculate {missedHccsPerEncounter.toFixed(2)} Missed HCCs/Visit</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">Conditions discussed per visit:</span>
                <Input
                  type="number"
                  value={conditionsPerVisit}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, conditionsPerVisit: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-7"
                  step="0.5"
                  data-testid="hcc-conditions-input"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">× Documentation gap:</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={documentationGap}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, documentationGap: Number(e.target.value) || 0 } }))}
                    className="w-14 text-center font-mono text-sm h-7"
                    data-testid="hcc-doc-gap-input"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">× HCC-eligible portion:</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={hccEligiblePercent}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, hccEligiblePercent: Number(e.target.value) || 0 } }))}
                    className="w-14 text-center font-mono text-sm h-7"
                    data-testid="hcc-eligible-input"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">= Missed HCCs per encounter:</span>
                <span className="font-mono text-sm font-medium text-slate-800">{missedHccsPerEncounter.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              Not every condition discussed is documented, and not every undocumented condition is HCC-eligible.
            </p>
          </div>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Capture */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Capture</p>
          <p className="text-xs text-[#6B7280]">How many can Abridge recover?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(missedHccOpportunities).toLocaleString()} opportunities
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={abridgeCaptureRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, abridgeCaptureRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="hcc-capture-rate-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(hccsCaptured).toLocaleString()} HCCs captured
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge captures conditions mentioned in conversation. We use 40% because the condition 
            must be assessed or addressed in the visit—not just mentioned in passing.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: Revenue Impact */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Revenue Impact</p>
          <p className="text-xs text-[#6B7280]">What's the risk-adjusted value?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(hccsCaptured).toLocaleString()} HCCs
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={avgHccValue}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, avgHccValue: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="hcc-value-input"
                />
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={auditFactor}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, auditFactor: Number(e.target.value) || 0 } }))}
                  className="w-14 text-center font-mono text-sm h-8"
                  data-testid="hcc-audit-factor-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                {formatCurrency(Math.round(annualHccRevenue))}
              </div>
            </div>
          </div>
        </div>

        {/* Why 60% Audit Factor */}
        <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Why {auditFactor}% Audit Factor?</p>
          <p className="text-xs text-slate-600">
            We apply a {100 - auditFactor}% haircut to account for:
          </p>
          <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
            <li>Risk Adjustment Data Validation (RADV) audits</li>
            <li>Conditions that don't survive payer review</li>
            <li>Retrospective adjustments</li>
          </ul>
          <p className="text-xs text-slate-500 pt-1">This is revenue you can actually count on.</p>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Average HCC Value
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Low-complexity HCC</span>
              <span className="font-mono text-slate-700">$400 - $600</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Medium-complexity HCC</span>
              <span className="font-mono text-slate-700">$700 - $1,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">High-complexity HCC</span>
              <span className="font-mono text-slate-700">$1,200 - $2,500+</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600">Blended Average</span>
              <span className="font-mono text-slate-700">~$800</span>
            </div>
          </div>
        </div>

        {/* Variability Warning */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Varies significantly based on payer mix and current capture rates. Organizations with 
              mature risk programs may see lower opportunity; those just starting may see more.
            </span>
          </p>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualHccRevenue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(hccsCaptured).toLocaleString()} HCCs × ${avgHccValue} × {auditFactor}% audit factor
          </p>
        </div>
      </div>
    );
  };
  
  const renderDenialsInputs = () => {
    const { denialRate, docRelatedPercent, writtenOffPercent, abridgeCaptureRate, avgClaimValue } = driverInputs.denials;

    // DOCUMENTATION-RELATED DENIALS CALCULATIONS (5-step)
    // Step 1: Total Denials
    const totalDenials = eligibleEncounters * (denialRate / 100);
    
    // Step 2: Documentation-Related
    const docRelatedDenials = totalDenials * (docRelatedPercent / 100);
    
    // Step 3: Written Off
    const writtenOffDenials = docRelatedDenials * (writtenOffPercent / 100);
    
    // Step 4: Abridge Recovery
    const claimsRecovered = writtenOffDenials * (abridgeCaptureRate / 100);
    
    // Step 5: Value
    const annualDenialSavings = claimsRecovered * avgClaimValue;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            Most denials are recoverable—you appeal, you win, it just costs time. But a portion 
            of documentation-related denials are written off without appeal, either because the 
            MDM can't support it or the rework cost exceeds the claim value. Abridge captures 
            the clinical reasoning that saves these.
          </p>
        </div>

        {/* Step 1: Total Denials */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Total Denials</p>
          <p className="text-xs text-[#6B7280]">How many claims are denied today?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Eligible Encounters</label>
                <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5">
                  {eligibleEncounters.toLocaleString()}
                </div>
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Denial Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={denialRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, denialRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="denials-rate-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(totalDenials).toLocaleString()} denials
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Industry average: 5-10%. Some organizations see 12%+.
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Documentation-Related */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Related</p>
          <p className="text-xs text-[#6B7280]">How many are caused by documentation gaps?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(totalDenials).toLocaleString()} denials
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={docRelatedPercent}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, docRelatedPercent: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="denials-doc-related-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(docRelatedDenials).toLocaleString()} doc denials
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            30-40% of denials stem from documentation gaps: missing clinical info, insufficient MDM, incomplete notes.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Written Off */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Written Off</p>
          <p className="text-xs text-[#6B7280]">How many are lost without appeal?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(docRelatedDenials).toLocaleString()} doc denials
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={writtenOffPercent}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, writtenOffPercent: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="denials-written-off-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(writtenOffDenials).toLocaleString()} written off
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            These claims are abandoned—either the documentation can't support an appeal, or the rework cost exceeds the claim value. This is revenue lost forever.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: Abridge Recovery */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Abridge Recovery</p>
          <p className="text-xs text-[#6B7280]">How many can Abridge save?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(writtenOffDenials).toLocaleString()} written off
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={abridgeCaptureRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, abridgeCaptureRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="denials-capture-rate-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(claimsRecovered).toLocaleString()} recovered
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge captures the MDM and clinical reasoning that physicians think but don't document. 
            This either prevents the denial upfront or makes it winnable on appeal.
          </p>
        </div>

        <StepDivider />

        {/* Step 5: Value */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 5: Value</p>
          <p className="text-xs text-[#6B7280]">What's the dollar impact?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(claimsRecovered).toLocaleString()} claims
              </div>
              <span className="text-neutral-400">×</span>
              <span className="text-sm text-[#6B7280]">$</span>
              <Input
                type="number"
                value={avgClaimValue}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, avgClaimValue: Number(e.target.value) || 0 } }))}
                className="w-20 text-center font-mono text-sm h-8"
                data-testid="denials-claim-value-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-1.5 font-mono text-sm font-bold text-emerald-600">
                {formatCurrency(Math.round(annualDenialSavings))}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Average Claim Value
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Primary Care E/M</span>
              <span className="font-mono text-slate-700">$125 - $175</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Specialty E/M</span>
              <span className="font-mono text-slate-700">$200 - $350</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Blended Outpatient</span>
              <span className="font-mono text-slate-700">~$250</span>
            </div>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualDenialSavings))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(claimsRecovered).toLocaleString()} claims recovered × ${avgClaimValue} avg claim value
          </p>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // ED DRIVER INPUT RENDERERS
  // ============================================================================
  
  const renderEdThroughputInputs = () => {
    const { annualEdVisits, lwbsRate, improvementRate, avgEdVisitRevenue, includeAdmissions, admissionPercent, avgAdmissionRevenue } = driverInputs.edThroughput;

    // ED PATIENT THROUGHPUT (LWBS) CALCULATIONS (4-step)
    // Step 1: Current LWBS
    const patientsLeaving = annualEdVisits * (lwbsRate / 100);
    
    // Step 2: Patients Retained
    const patientsRetained = patientsLeaving * (improvementRate / 100);
    
    // Step 3: Revenue Mix
    let edVisitPatients, admissionPatients, edVisitRevenue, admissionRevenue;
    if (includeAdmissions) {
      edVisitPatients = patientsRetained * (1 - admissionPercent / 100);
      admissionPatients = patientsRetained * (admissionPercent / 100);
      edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
      admissionRevenue = admissionPatients * avgAdmissionRevenue;
    } else {
      edVisitPatients = patientsRetained;
      admissionPatients = 0;
      edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
      admissionRevenue = 0;
    }
    
    // Step 4: Total Value
    const totalLwbsRevenue = edVisitRevenue + admissionRevenue;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            When patients leave without being seen, you lose that revenue entirely. Faster documentation 
            means faster throughput, shorter wait times, and fewer walkouts. Some retained patients 
            are simple ED visits—but some would have been admitted.
          </p>
        </div>

        {/* Step 1: Current LWBS */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current LWBS</p>
          <p className="text-xs text-[#6B7280]">How many patients are you losing?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Annual ED Visits</label>
                <Input
                  type="number"
                  value={annualEdVisits}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, annualEdVisits: Number(e.target.value) || 0 } }))}
                  className="w-28 text-center font-mono text-sm h-8"
                  data-testid="ed-annual-visits-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">LWBS Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={lwbsRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, lwbsRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    step="0.5"
                    data-testid="ed-lwbs-rate-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(patientsLeaving).toLocaleString()} patients leaving
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            National LWBS average: 3-4%. High-volume EDs may see 5-8%.
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Patients Retained */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Patients Retained</p>
          <p className="text-xs text-[#6B7280]">How much can faster throughput help?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(patientsLeaving).toLocaleString()} leaving
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={improvementRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, improvementRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-improvement-rate-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(patientsRetained).toLocaleString()} patients retained
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Faster documentation = faster throughput = shorter waits. 20% LWBS reduction is conservative for high-LWBS EDs.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Revenue Recaptured */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-4">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Revenue Recaptured</p>
          <p className="text-xs text-[#6B7280]">What would those patients have generated?</p>
          
          {/* ED Visits Section */}
          <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#111827]">ED Visits</span>
              <span className="font-mono text-sm font-semibold text-emerald-600">
                {formatCurrency(Math.round(edVisitRevenue))}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(edVisitPatients).toLocaleString()} patients ({includeAdmissions ? 100 - admissionPercent : 100}%)
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={avgEdVisitRevenue}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, avgEdVisitRevenue: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ed-visit-revenue-input"
                />
              </div>
            </div>
          </div>

          {/* Admissions Section with Toggle */}
          <div className={`p-3 rounded-lg border space-y-3 transition-all ${
            includeAdmissions 
              ? "bg-white border-neutral-200" 
              : "bg-neutral-100 border-neutral-200"
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#111827]">Admissions</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAdmissions}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, includeAdmissions: e.target.checked } }))}
                    className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                    data-testid="ed-admissions-toggle"
                  />
                  <span className="text-xs text-[#6B7280]">{includeAdmissions ? "ON" : "OFF"}</span>
                </label>
              </div>
              <span className={`font-mono text-sm font-semibold ${includeAdmissions ? "text-emerald-600" : "text-neutral-400"}`}>
                {formatCurrency(Math.round(admissionRevenue))}
              </span>
            </div>
            
            {includeAdmissions ? (
              <>
                <p className="text-xs text-[#6B7280]">Include admission revenue for retained patients</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={admissionPercent}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, admissionPercent: Number(e.target.value) || 0 } }))}
                      className="w-14 text-center font-mono text-sm h-8"
                      data-testid="ed-admission-percent-input"
                    />
                    <span className="text-xs text-[#6B7280]">%</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">of {Math.round(patientsRetained).toLocaleString()} =</span>
                  <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5">
                    {Math.round(admissionPatients).toLocaleString()} patients
                  </div>
                  <span className="text-neutral-400">×</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[#6B7280]">$</span>
                    <Input
                      type="number"
                      value={avgAdmissionRevenue}
                      onChange={(e) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, avgAdmissionRevenue: Number(e.target.value) || 0 } }))}
                      className="w-24 text-center font-mono text-sm h-8"
                      data-testid="ed-admission-revenue-input"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                  LWBS patients skew lower acuity, so admission rate (10%) is below typical ED average (15-20%). Adjust if needed.
                </p>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <p className="text-xs text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Turn OFF if your hospital is at bed capacity and cannot accept additional admissions.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500 bg-neutral-200 px-2 py-1 rounded">
                Admission revenue excluded. Enable if your hospital has bed capacity to accept additional admissions.
              </p>
            )}
          </div>
        </div>

        <StepDivider />

        {/* Step 4: Total Value */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Total Value</p>
          
          <div className="p-3 bg-white rounded-lg border border-neutral-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#6B7280]">ED Visit Revenue:</span>
              <span className="font-mono text-emerald-600">{formatCurrency(Math.round(edVisitRevenue))}</span>
            </div>
            {includeAdmissions && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6B7280]">Admission Revenue:</span>
                <span className="font-mono text-emerald-600">{formatCurrency(Math.round(admissionRevenue))}</span>
              </div>
            )}
            <div className="border-t border-neutral-200 pt-2 flex justify-between items-center">
              <span className="font-medium text-[#111827]">Total Annual Value:</span>
              <span className="font-mono font-bold text-emerald-600 text-lg">
                {formatCurrency(Math.round(totalLwbsRevenue))}
              </span>
            </div>
          </div>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Revenue Ranges
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Average ED Visit</span>
              <span className="font-mono text-slate-700">$400 - $1,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Average Admission</span>
              <span className="font-mono text-slate-700">$10,000 - $25,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">LWBS Admission Rate</span>
              <span className="font-mono text-slate-700">5% - 15%</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600">Your inputs</span>
              <span className="font-mono text-slate-700">
                ${avgEdVisitRevenue} ED / ${avgAdmissionRevenue.toLocaleString()} Adm / {admissionPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(totalLwbsRevenue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(patientsRetained).toLocaleString()} retained × (${avgEdVisitRevenue} ED{includeAdmissions ? ` + ${admissionPercent}% admissions @ $${avgAdmissionRevenue.toLocaleString()}` : ""})
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
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
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
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
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
    const { edPhysicians, turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.edRetention;

    // ED PHYSICIAN RETENTION CALCULATIONS (4-step)
    // Step 1: Baseline Turnover
    const annualDepartures = edPhysicians * (turnoverRate / 100);
    
    // Step 2: Burnout-Related Departures
    const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
    
    // Step 3: Abridge Attribution
    const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
    
    // Step 4: Cost Savings
    const annualRetentionSavings = departuresAvoided * replacementCost;

    // Dynamic framing calculations
    const yearsToRetainOne = departuresAvoided > 0 ? 1 / departuresAvoided : 999;
    const monthsToRetainOne = yearsToRetainOne * 12;

    // Dynamic "What This Means" framing
    const getRetentionFraming = () => {
      if (departuresAvoided >= 2.0) {
        return {
          headline: `Retain ~${departuresAvoided.toFixed(1)} additional ED physicians per year`,
          detail: `At this scale, retention impact is highly predictable. You're avoiding ${formatCurrency(Math.round(annualRetentionSavings))} in annual replacement costs.`,
          timeframe: "Measurable within 12 months"
        };
      } else if (departuresAvoided >= 1.0) {
        return {
          headline: `Retain ~1 additional ED physician per year`,
          detail: `Every ${Math.round(12 / departuresAvoided)} months, expect to retain an ED physician you would have otherwise lost to burnout.`,
          timeframe: "Measurable within 12-18 months"
        };
      } else if (departuresAvoided >= 0.5) {
        return {
          headline: `Retain 1 additional ED physician every ~${Math.round(monthsToRetainOne)} months`,
          detail: `Over ${yearsToRetainOne.toFixed(1)} years, expect to retain 1 ED physician, saving ${formatCurrency(replacementCost)}.`,
          timeframe: "Measurable within 18-24 months"
        };
      } else if (departuresAvoided >= 0.2) {
        const years = Math.round(yearsToRetainOne);
        return {
          headline: `Over ~${years} years, retain 1 additional ED physician`,
          detail: `Total savings of ${formatCurrency(replacementCost)} realized over ${years}-year period. Annualized: ${formatCurrency(Math.round(annualRetentionSavings))}/year.`,
          timeframe: "Long-term investment metric"
        };
      } else {
        const years = Math.round(yearsToRetainOne);
        return {
          headline: `Long-term retention probability`,
          detail: `Over ~${years} years, expect to retain 1 additional ED physician, saving ${formatCurrency(replacementCost)}. At this scale, think of retention as a long-term investment.`,
          timeframe: "5+ year investment horizon"
        };
      }
    };

    const framing = getRetentionFraming();
    const isSmallGroup = edPhysicians < 20;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            ED physicians face extreme burnout—over 65% report symptoms. Documentation burden extends shifts 
            and destroys work-life balance. Reducing this burden improves retention. Replacing an ED physician 
            costs $750K-$1.2M when you factor in recruiting, signing bonuses, and coverage gaps.
          </p>
        </div>

        {/* Small Group Warning */}
        {isSmallGroup && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Small ED Group
            </p>
            <p className="text-xs text-amber-700">
              With fewer than 20 ED physicians, retention savings are probabilistic over multi-year periods. 
              Consider this a long-term investment metric rather than a near-term ROI driver.
            </p>
          </div>
        )}

        {/* Step 1: Baseline Turnover */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline Turnover</p>
          <p className="text-xs text-[#6B7280]">What's the current turnover situation?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">ED Physicians</label>
                <Input
                  type="number"
                  value={edPhysicians}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, edPhysicians: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ed-ret-physicians-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Turnover Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={turnoverRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, turnoverRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="ed-ret-turnover-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {annualDepartures.toFixed(1)} departures/year
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            ED turnover averages 8-12%. High-stress EDs see higher.
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Burnout-Related Departures */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Burnout-Related Departures</p>
          <p className="text-xs text-[#6B7280]">How much is burnout-driven?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {annualDepartures.toFixed(1)} departures
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={burnoutAttribution}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, burnoutAttribution: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-ret-burnout-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {preventableDepartures.toFixed(2)} preventable
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            50% of ED departures cite burnout as primary factor. ED has the highest burnout rate of any specialty.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Attribution */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Attribution</p>
          <p className="text-xs text-[#6B7280]">What can Abridge prevent?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {preventableDepartures.toFixed(2)} preventable
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={abridgeImpact}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, abridgeImpact: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-ret-abridge-impact-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {departuresAvoided.toFixed(2)}/year avoided
              </div>
            </div>
          </div>

          {/* Why 30%? Explanation Box */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Why 30%?
            </p>
            <p className="text-xs text-slate-600">
              ED burnout has multiple drivers—pace, acuity, shifts, high-stakes decisions. Documentation is ONE major factor. 
              We conservatively estimate Abridge impacts 30% of burnout-related turnover by eliminating after-shift charting 
              and reducing documentation burden during surges.
            </p>
          </div>
        </div>

        <StepDivider />

        {/* Step 4: Cost Savings */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
          <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {departuresAvoided.toFixed(2)} avoided
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={replacementCost}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, replacementCost: Number(e.target.value) || 0 } }))}
                  className="w-28 text-center font-mono text-sm h-8"
                  data-testid="ed-ret-replacement-cost-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-semibold text-emerald-600">
                {formatCurrency(Math.round(annualRetentionSavings))}
              </div>
            </div>
          </div>
        </div>

        {/* What This Means Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            What This Means
          </p>
          <p className="text-sm font-medium text-slate-700">{framing.headline}</p>
          <p className="text-xs text-slate-600">{framing.detail}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {framing.timeframe}
          </p>
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: ED Physician Replacement Cost
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Recruiting + signing bonus</span>
              <span className="font-mono text-slate-700">$100K - $175K</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Lost revenue (vacancy)</span>
              <span className="font-mono text-slate-700">$500K - $1M+</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Onboarding</span>
              <span className="font-mono text-slate-700">$50K - $100K</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600 font-medium">Total</span>
              <span className="font-mono text-slate-700 font-medium">$750K - $1.2M</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600">Your input</span>
              <span className="font-mono text-slate-700">${replacementCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Timeline Warning */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700 flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            Retention impact typically measurable after 12-18 months
          </p>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualRetentionSavings))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {departuresAvoided.toFixed(2)} departures avoided × ${replacementCost.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };
  
  const renderEdLevelOfServiceInputs = () => {
    const { annualEdVisits, avgWrvuPerEncounter, wrvuImprovementRate, conversionFactor } = driverInputs.edLevelOfService;

    // ED ACCURATE LEVEL OF SERVICE CALCULATIONS (3-step)
    // Step 1: Baseline wRVUs
    const baselineWrvus = annualEdVisits * avgWrvuPerEncounter;
    
    // Step 2: wRVU Improvement
    const wrvuGain = baselineWrvus * (wrvuImprovementRate / 100);
    
    // Step 3: Revenue Impact
    const annualRevenue = wrvuGain * conversionFactor;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            ED physicians under time pressure document less than the full clinical picture—especially during 
            high-volume surges. AI-assisted documentation captures the complexity that supports accurate coding.
          </p>
        </div>

        {/* Step 1: Baseline wRVUs */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline wRVUs</p>
          <p className="text-xs text-[#6B7280]">What's your current productivity?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Annual ED Visits</label>
                <Input
                  type="number"
                  value={annualEdVisits}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, annualEdVisits: Number(e.target.value) || 0 } }))}
                  className="w-28 text-center font-mono text-sm h-8"
                  data-testid="ed-los-visits-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Avg wRVU/Encounter</label>
                <Input
                  type="number"
                  step="0.1"
                  value={avgWrvuPerEncounter}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, avgWrvuPerEncounter: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ed-los-wrvu-per-enc-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {baselineWrvus.toLocaleString()} wRVUs
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Don't know your wRVUs? We estimate using 2.5 wRVU per encounter (typical ED blend across acuity levels).
          </p>

          {/* Benchmark Box */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Benchmark: ED wRVU per Encounter
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Low acuity mix (urgent care-like)</span>
                <span className="font-mono text-slate-700">1.5 - 2.0</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Typical community ED</span>
                <span className="font-mono text-slate-700">2.0 - 2.5</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">High acuity / trauma center</span>
                <span className="font-mono text-slate-700">2.5 - 3.5</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-600">Your input</span>
                <span className="font-mono text-slate-700">{avgWrvuPerEncounter}</span>
              </div>
            </div>
          </div>
        </div>

        <StepDivider />

        {/* Step 2: wRVU Improvement */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: wRVU Improvement</p>
          <p className="text-xs text-[#6B7280]">How much does Abridge improve capture?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {baselineWrvus.toLocaleString()} wRVUs
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={wrvuImprovementRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, wrvuImprovementRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-los-improvement-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {wrvuGain.toLocaleString()} wRVU gain
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            On average, Abridge improves wRVU capture by 5% through more complete documentation of clinical 
            complexity—especially during high-volume periods when documentation typically suffers.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Revenue Impact */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Revenue Impact</p>
          <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {wrvuGain.toLocaleString()} wRVUs
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={conversionFactor}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, conversionFactor: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ed-los-conversion-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-semibold text-emerald-600">
                {formatCurrency(Math.round(annualRevenue))}
              </div>
            </div>
          </div>

          {/* Conversion Factor Benchmark */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Benchmark: Conversion Factor
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Medicare (2024)</span>
                <span className="font-mono text-slate-700">$33</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Commercial (typical)</span>
                <span className="font-mono text-slate-700">$45 - $65</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-600">Your input</span>
                <span className="font-mono text-slate-700">${conversionFactor} (Medicare baseline)</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              We anchor to Medicare for conservatism. If your payer mix is commercial-heavy, actual results may be 30-50% higher.
            </p>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualRevenue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {wrvuGain.toLocaleString()} wRVU gain × ${conversionFactor}/wRVU
          </p>
        </div>
      </div>
    );
  };
  
  const renderEdDenialsInputs = () => {
    const { documentedEncounters, denialRate, docRelatedPercent, writtenOffPercent, abridgeCaptureRate, avgClaimValue } = driverInputs.edDenials;

    // ED DOCUMENTATION-RELATED DENIALS (5-step)
    // Step 1: Total Denials
    const totalDenials = documentedEncounters * (denialRate / 100);
    
    // Step 2: Documentation-Related
    const docRelatedDenials = totalDenials * (docRelatedPercent / 100);
    
    // Step 3: Written Off
    const writtenOffDenials = docRelatedDenials * (writtenOffPercent / 100);
    
    // Step 4: Abridge Capture
    const claimsRecovered = writtenOffDenials * (abridgeCaptureRate / 100);
    
    // Step 5: Value
    const annualValue = claimsRecovered * avgClaimValue;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
          <p className="text-sm font-semibold text-blue-800">The Theory</p>
          <p className="text-xs text-blue-700">
            ED claims face intense payer scrutiny. Medical necessity, level of service, and procedure 
            documentation are common denial triggers. Most denials are recoverable with rework—but some 
            are written off entirely. Abridge captures the clinical detail that saves these claims.
          </p>
        </div>

        {/* Step 1: Total Denials */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Total Denials</p>
          <p className="text-xs text-[#6B7280]">How many claims are denied?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Documented Encounters</label>
                <Input
                  type="number"
                  value={documentedEncounters}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, documentedEncounters: Number(e.target.value) || 0 } }))}
                  className="w-28 text-center font-mono text-sm h-8"
                  data-testid="ed-denials-encounters-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Denial Rate</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={denialRate}
                    onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, denialRate: Number(e.target.value) || 0 } }))}
                    className="w-16 text-center font-mono text-sm h-8"
                    data-testid="ed-denials-rate-input"
                  />
                  <span className="text-xs text-[#6B7280]">%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {totalDenials.toLocaleString()} denials
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            ED denial rates average 8-12%. Higher scrutiny than outpatient due to medical necessity reviews.
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Documentation-Related */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Related</p>
          <p className="text-xs text-[#6B7280]">How many are caused by documentation gaps?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {totalDenials.toLocaleString()} denials
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={docRelatedPercent}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, docRelatedPercent: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-denials-doc-related-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {docRelatedDenials.toLocaleString()} doc denials
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            40% of ED denials stem from documentation gaps: medical necessity not supported, level of service 
            documentation insufficient, procedure documentation incomplete.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Written Off */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Written Off</p>
          <p className="text-xs text-[#6B7280]">How many are lost without appeal?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {docRelatedDenials.toLocaleString()} doc denials
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={writtenOffPercent}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, writtenOffPercent: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-denials-writeoff-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {writtenOffDenials.toLocaleString()} written off
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            These claims are abandoned—either the documentation can't support an appeal, or the rework cost 
            exceeds the claim value. This is revenue lost forever.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: Abridge Capture */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Abridge Recovery</p>
          <p className="text-xs text-[#6B7280]">How many can Abridge save?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {writtenOffDenials.toLocaleString()} written off
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={abridgeCaptureRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, abridgeCaptureRate: Number(e.target.value) || 0 } }))}
                  className="w-16 text-center font-mono text-sm h-8"
                  data-testid="ed-denials-capture-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(claimsRecovered).toLocaleString()} recovered
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge captures the MDM, medical necessity, and clinical reasoning that ED physicians think 
            but don't document—especially during high-volume surges.
          </p>
        </div>

        <StepDivider />

        {/* Step 5: Value */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 5: Value Recovered</p>
          <p className="text-xs text-[#6B7280]">What's the revenue impact?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(claimsRecovered).toLocaleString()} recovered
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={avgClaimValue}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, avgClaimValue: Number(e.target.value) || 0 } }))}
                  className="w-20 text-center font-mono text-sm h-8"
                  data-testid="ed-denials-claim-value-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-semibold text-emerald-600">
                {formatCurrency(Math.round(annualValue))}
              </div>
            </div>
          </div>

          {/* Benchmark Box */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              Benchmark: ED Claim Value
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Low acuity ED visit</span>
                <span className="font-mono text-slate-700">$300 - $500</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Medium acuity ED visit</span>
                <span className="font-mono text-slate-700">$500 - $800</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">High acuity ED visit</span>
                <span className="font-mono text-slate-700">$800 - $1,500+</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Blended average</span>
                <span className="font-mono text-slate-700">~$650</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-600">Your input</span>
                <span className="font-mono text-slate-700">${avgClaimValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(claimsRecovered).toLocaleString()} claims recovered × ${avgClaimValue}
          </p>
        </div>
      </div>
    );
  };
  
  // Inpatient render functions
  const renderInpatientRetentionInputs = () => {
    const { turnoverRate, replacementCost } = driverInputs.inpatientRetention;
    const departures = providers * (turnoverRate / 100);
    const burnoutRelated = departures * 0.55;
    const docDriven = burnoutRelated * 0.35;
    const prevented = docDriven * 0.35 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Current annual hospitalist turnover rate</label>
            <span className="font-mono text-sm text-[#E85D3F]">{turnoverRate}%</span>
          </div>
          <Slider
            value={[turnoverRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, turnoverRate: val } }))}
            min={8}
            max={25}
            step={1}
            className="w-full"
            data-testid="inpatient-retention-turnover-slider"
          />
          <p className="text-xs text-[#6B7280]">Hospitalist turnover is typically 15-20% (among highest in medicine)</p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Calculation breakdown:</p>
          <p className="text-xs text-neutral-400 font-mono">
            {providers} hospitalists × {turnoverRate}% = {departures.toFixed(1)} departures
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            {departures.toFixed(1)} × 55% burnout-related × 35% doc-driven = {docDriven.toFixed(2)} doc-related
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            {docDriven.toFixed(2)} × 35% prevention × {utilizationRate}% adoption = {prevented.toFixed(2)} prevented
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Hospitalist replacement cost</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={replacementCost}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, replacementCost: Number(e.target.value) || 0 } }))}
              className="w-40 font-mono"
              data-testid="inpatient-retention-cost-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Hospitalist replacement costs $600K-900K including recruiting, onboarding, and lost productivity</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(prevented * replacementCost))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {prevented.toFixed(2)} prevented × ${replacementCost.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };
  
  const renderInpatientCCMCCInputs = () => {
    const { gapRate, improvementRate, drgWeightIncrease, baseDrgPayment, realizationRate } = driverInputs.inpatientCCMCC;
    
    // Step 1: Admissions with Opportunity
    const opportunities = eligibleEncounters * (gapRate / 100);
    // Step 2: Capture Improvement
    const admissionsImproved = opportunities * (improvementRate / 100);
    // Step 3: DRG Weight Impact (gross)
    const grossImpact = admissionsImproved * drgWeightIncrease * baseDrgPayment;
    // Step 4: Reality Check
    const annualValue = grossImpact * (realizationRate / 100);
    
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                DRG reimbursement depends on documented comorbidities. Conditions discussed at bedside but not captured in notes mean missed CC/MCC assignments and lower DRG weights. Abridge ensures what's discussed gets documented.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Admissions with Opportunity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Admissions with Opportunity</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many admissions have documentation gaps?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Documented Admissions</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{eligibleEncounters.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Gap Rate</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={gapRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, gapRate: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-ccmcc-gap-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(opportunities).toLocaleString()} opportunities</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Studies show 30-50% of admissions have undocumented CC/MCC opportunities. We use 40% as a moderate estimate.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Capture Improvement */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Capture Improvement</span>
          </div>
          <p className="text-sm text-[#6B7280]">How much can Abridge help?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Opportunities</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(opportunities).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Improvement Rate</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={improvementRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, improvementRate: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-ccmcc-improvement-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(admissionsImproved).toLocaleString()} admissions improved</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Not every gap is capturable. 15% accounts for cases where Abridge documentation directly enables CC/MCC capture that wouldn't have happened otherwise.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: DRG Weight Impact */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: DRG Weight Impact</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the revenue impact?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Admissions Improved</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(admissionsImproved).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">DRG Weight Increase</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={drgWeightIncrease}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, drgWeightIncrease: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  step="0.1"
                  data-testid="inpatient-ccmcc-drg-weight-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Base DRG Payment</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={baseDrgPayment}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, baseDrgPayment: Number(e.target.value) || 0 } }))}
                  className="w-20 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-ccmcc-base-drg-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{formatCurrency(Math.round(grossImpact))} gross</span>
          </div>
          
          {/* Benchmark: What Drives 0.4 DRG Weight? */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs font-semibold text-[#6B7280]">Benchmark: What Drives 0.4 DRG Weight?</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>Acute respiratory failure</span><span className="font-mono">+0.3 to +0.5</span></div>
              <div className="flex justify-between"><span>Sepsis / Severe sepsis</span><span className="font-mono">+0.4 to +0.6</span></div>
              <div className="flex justify-between"><span>Malnutrition</span><span className="font-mono">+0.2 to +0.4</span></div>
              <div className="flex justify-between"><span>Acute encephalopathy</span><span className="font-mono">+0.3 to +0.5</span></div>
              <div className="flex justify-between"><span>Acute kidney injury</span><span className="font-mono">+0.1 to +0.3</span></div>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              0.4 is a blended average for MCC captures.
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 4: Reality Check */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Reality Check</span>
          </div>
          <p className="text-sm text-[#6B7280]">What passes audit?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Gross Impact</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{formatCurrency(Math.round(grossImpact))}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Realization Rate</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={realizationRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, realizationRate: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-ccmcc-realization-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-emerald-600">{formatCurrency(Math.round(annualValue))}</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            50% haircut accounts for RAC/PEPPER audits, coder discretion, and cases where documentation doesn't change final code.
          </p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="inpatient-ccmcc-result">
              {formatCurrency(Math.round(annualValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(admissionsImproved).toLocaleString()} admissions × {drgWeightIncrease} weight × ${baseDrgPayment.toLocaleString()} × {realizationRate}% realization
          </p>
        </div>
        
        {/* CDI Team Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Work with your CDI team to validate capture rates for your specific case mix.
          </p>
        </div>
      </div>
    );
  };
  
  const renderInpatientCDIInputs = () => {
    const { queryRate, reductionRate, costPerQuery } = driverInputs.inpatientCDI;
    
    // Step 1: Current Query Volume
    const annualQueries = eligibleEncounters * (queryRate / 100);
    // Step 2: Queries Avoided
    const queriesAvoided = annualQueries * (reductionRate / 100);
    // Step 3: Operational Savings
    const annualSavings = queriesAvoided * costPerQuery;
    
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                CDI teams spend enormous effort querying physicians for clarification. Better initial documentation reduces query volume — saving CDI time and reducing physician interruptions.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Query Volume */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Query Volume</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many queries happen today?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Admissions</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{eligibleEncounters.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Query Rate</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={queryRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, queryRate: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-cdi-query-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
          </div>
          
          <div className="text-center py-2">
            <span className="text-sm text-[#6B7280]">Queries/Year: </span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(annualQueries).toLocaleString()}</span>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              CDI query rates typically range 20-40% of admissions. 30% is average for most health systems.
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Queries Avoided */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Queries Avoided</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many can better documentation prevent?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Queries</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(annualQueries).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Reduction Rate</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <Input
                  type="number"
                  value={reductionRate}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, reductionRate: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-cdi-reduction-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
          </div>
          
          <div className="text-center py-2">
            <span className="text-sm text-[#6B7280]">Queries Avoided: </span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(queriesAvoided).toLocaleString()}</span>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              When initial documentation is complete, CDI doesn't need to query for clarification. 25% is conservative — many queries are simply asking physicians to document what they already discussed with the patient.
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: Operational Savings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Operational Savings</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the efficiency value?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Queries Avoided</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(queriesAvoided).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Cost per Query</span>
              <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-neutral-200">
                <span className="text-sm text-[#6B7280]">$</span>
                <Input
                  type="number"
                  value={costPerQuery}
                  onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, costPerQuery: Number(e.target.value) || 0 } }))}
                  className="w-16 font-mono text-sm border-0 p-0 h-auto focus-visible:ring-0"
                  data-testid="inpatient-cdi-cost-input"
                />
              </div>
            </div>
          </div>
          
          {/* What's in the $50 per query callout */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#6B7280]">WHAT'S IN THE $50 PER QUERY?</span>
            </div>
            <div className="space-y-2 text-xs text-[#6B7280]">
              <p className="font-medium">CDI Specialist time</p>
              <ul className="ml-3 space-y-0.5">
                <li>• Research & review: 10-15 min</li>
                <li>• Writing query: 5-10 min</li>
                <li>• Follow-up & tracking: 5-10 min</li>
              </ul>
              <p className="font-medium mt-2">Physician time</p>
              <ul className="ml-3 space-y-0.5">
                <li>• Reading & responding: 5-10 min</li>
                <li>• Context switching cost</li>
              </ul>
              <p className="mt-2 text-neutral-400 italic">
                Fully loaded cost: $50-$100 per query. We use $50 as a conservative estimate.
              </p>
            </div>
          </div>
          
          {/* Additional Benefits callout */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-blue-800">ADDITIONAL BENEFIT (Not Quantified)</span>
            </div>
            <div className="space-y-1 text-xs text-blue-800 ml-6">
              <p>Fewer queries also means:</p>
              <ul className="space-y-0.5">
                <li>• Faster DRG finalization → faster billing cycles</li>
                <li>• Reduced physician administrative burden</li>
                <li>• CDI team can focus on complex cases</li>
                <li>• Better physician-CDI relationships</li>
              </ul>
            </div>
          </div>
          
          {/* Benchmark callout */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#6B7280]">BENCHMARK: Query Rates</span>
            </div>
            <div className="space-y-1 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>Low query rate (mature CDI)</span><span className="font-mono">15-25%</span></div>
              <div className="flex justify-between"><span>Average</span><span className="font-mono">25-35%</span></div>
              <div className="flex justify-between"><span>High query rate</span><span className="font-mono">35-45%</span></div>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Your input: <span className="font-mono font-medium">{queryRate}%</span>
            </p>
          </div>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Savings</span>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="inpatient-cdi-result">
              {formatCurrency(Math.round(annualSavings))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(queriesAvoided).toLocaleString()} queries avoided × ${costPerQuery}
          </p>
        </div>
      </div>
    );
  };
  
  const renderInpatientDenialsInputs = () => {
    const { denialRate, avgClaimValue } = driverInputs.inpatientDenials;
    const totalDenials = encounters * (denialRate / 100);
    const docRelated = totalDenials * 0.45;
    const prevented = docRelated * 0.40 * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Current inpatient denial rate</label>
            <span className="font-mono text-sm text-[#E85D3F]">{denialRate}%</span>
          </div>
          <Slider
            value={[denialRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, denialRate: val } }))}
            min={3}
            max={12}
            step={1}
            className="w-full"
            data-testid="inpatient-denials-rate-slider"
          />
          <p className="text-xs text-[#6B7280]">Inpatient denial rates are typically 5-8%</p>
        </div>
        
        <div className="space-y-2 p-3 bg-neutral-50 rounded-lg">
          <p className="text-xs text-[#6B7280]">Doc-related portion:</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(totalDenials).toLocaleString()} denials × 45% doc-related = {Math.round(docRelated).toLocaleString()} doc denials
          </p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(docRelated).toLocaleString()} × 40% prevention × {utilizationRate}% adoption = {Math.round(prevented).toLocaleString()} prevented
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Average inpatient claim value</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={avgClaimValue}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, avgClaimValue: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="inpatient-denials-claim-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Inpatient claims are high-value: $3,500-6,000 typical</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(prevented * avgClaimValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(prevented).toLocaleString()} prevented × ${avgClaimValue.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };
  
  // Nursing Driver Render Functions
  const renderNursingOvertimeInputs = () => {
    const { hoursPerWeek, docPortionPct, reductionLevel, baseHourlyRate } = driverInputs.nursingOvertime;
    const overtimeRate = baseHourlyRate * 1.5;
    const totalOTHours = nurseFTEs * hoursPerWeek * 50;
    const docRelatedOT = totalOTHours * (docPortionPct / 100);
    const reductionPct = reductionLevel === "conservative" ? 45 : reductionLevel === "typical" ? 60 : 75;
    const hoursEliminated = docRelatedOT * (reductionPct / 100) * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Average OT hours per nurse per week?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{hoursPerWeek} hrs</span>
          </div>
          <Slider
            value={[hoursPerWeek]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, hoursPerWeek: val } }))}
            min={1}
            max={8}
            step={0.5}
            className="w-full"
            data-testid="nursing-overtime-hours-slider"
          />
          <p className="text-xs text-[#6B7280]">Nursing OT is typically 3-6 hours/week</p>
          <p className="text-xs text-neutral-400 font-mono">
            {nurseFTEs} nurses × {hoursPerWeek} hrs × 50 wks = {totalOTHours.toLocaleString()} OT hrs
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What portion is documentation catch-up?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{docPortionPct}%</span>
          </div>
          <Slider
            value={[docPortionPct]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, docPortionPct: val } }))}
            min={20}
            max={60}
            step={5}
            className="w-full"
            data-testid="nursing-overtime-doc-portion-slider"
          />
          <p className="text-xs text-[#6B7280]">Nurses report 40-50% of OT is charting</p>
          <p className="text-xs text-neutral-400 font-mono">
            {totalOTHours.toLocaleString()} × {docPortionPct}% = {Math.round(docRelatedOT).toLocaleString()} doc-related OT
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Expected reduction?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "aggressive"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, reductionLevel: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  reductionLevel === opt
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                data-testid={`nursing-overtime-reduction-${opt}`}
              >
                {opt === "conservative" && "Conservative 45%"}
                {opt === "typical" && "Typical 60%"}
                {opt === "aggressive" && "Aggressive 75%"}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Base hourly wage</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={baseHourlyRate}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, baseHourlyRate: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="nursing-overtime-hourly-input"
            />
            <span className="text-sm text-[#6B7280]">/hour → ${Math.round(overtimeRate)}/OT hour</span>
          </div>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(hoursEliminated * overtimeRate))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(hoursEliminated).toLocaleString()} hrs × ${Math.round(overtimeRate)}/hr
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingDocTimeInputs = () => {
    const { docBurden, reductionLevel, realizationFactor } = driverInputs.nursingDocTime;
    const hoursPerShift = docBurden === "light" ? 2.0 : docBurden === "moderate" ? 2.5 : 3.5;
    const totalDocHours = nurseFTEs * hoursPerShift * 3 * 50;
    const reductionPct = reductionLevel === "conservative" ? 25 : reductionLevel === "typical" ? 35 : 45;
    const hoursReturned = totalDocHours * (reductionPct / 100) * (utilizationRate / 100);
    const dollarValue = Math.round(hoursReturned * 45 * (realizationFactor / 100));
    
    return (
      <div className="space-y-6">
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800 flex items-start gap-2">
            <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>This driver is harder to monetize. Time returned goes to patient care, not payroll reduction.</span>
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Documentation burden level?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "moderate", "heavy"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, nursingDocTime: { ...prev.nursingDocTime, docBurden: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  docBurden === opt
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                data-testid={`nursing-doc-time-burden-${opt}`}
              >
                {opt === "light" && "Light (~2 hrs/shift)"}
                {opt === "moderate" && "Moderate (~2.5 hrs)"}
                {opt === "heavy" && "Heavy (~3.5 hrs)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 font-mono">
            {nurseFTEs} nurses × {hoursPerShift} hrs × 3 shifts/wk × 50 wks = {totalDocHours.toLocaleString()} doc hours
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Expected time reduction?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "aggressive"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, nursingDocTime: { ...prev.nursingDocTime, reductionLevel: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  reductionLevel === opt
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                data-testid={`nursing-doc-time-reduction-${opt}`}
              >
                {opt === "conservative" && "25%"}
                {opt === "typical" && "35%"}
                {opt === "aggressive" && "45%"}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Realization factor</label>
            <span className="font-mono text-sm text-[#E85D3F]">{realizationFactor}%</span>
          </div>
          <Slider
            value={[realizationFactor]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingDocTime: { ...prev.nursingDocTime, realizationFactor: val } }))}
            min={25}
            max={75}
            step={5}
            className="w-full"
            data-testid="nursing-doc-time-realization-slider"
          />
          <p className="text-xs text-[#6B7280]">What portion of time savings can be valued? (~50% is typical)</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result (Soft Value)</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(dollarValue)}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(hoursReturned).toLocaleString()} hrs × $45 × {realizationFactor}%
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingAgencyInputs = () => {
    const { agencyUtilization, staffNurseCost, agencyNurseCost, reductionLevel } = driverInputs.nursingAgency;
    const agencyFTEs = nurseFTEs * (agencyUtilization / 100);
    const premium = agencyNurseCost - staffNurseCost;
    const reductionPct = reductionLevel === "conservative" ? 5 : reductionLevel === "typical" ? 10 : 20;
    const ftesConverted = agencyFTEs * (reductionPct / 100) * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">What % of your workforce is agency/traveler?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{agencyUtilization}%</span>
          </div>
          <Slider
            value={[agencyUtilization]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, agencyUtilization: val } }))}
            min={5}
            max={35}
            step={5}
            className="w-full"
            data-testid="nursing-agency-util-slider"
          />
          <p className="text-xs text-[#6B7280]">National average is ~15%. Some facilities hit 25%+</p>
          <p className="text-xs text-neutral-400 font-mono">
            {nurseFTEs} × {agencyUtilization}% = {Math.round(agencyFTEs).toLocaleString()} agency FTEs
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-[#111827] font-medium">Staff nurse cost</label>
            <div className="flex items-center gap-2">
              <span className="text-[#6B7280]">$</span>
              <Input
                type="number"
                value={staffNurseCost}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, staffNurseCost: Number(e.target.value) || 0 } }))}
                className="w-28 font-mono"
                data-testid="nursing-agency-staff-cost-input"
              />
              <span className="text-xs text-[#6B7280]">/year</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#111827] font-medium">Agency nurse cost</label>
            <div className="flex items-center gap-2">
              <span className="text-[#6B7280]">$</span>
              <Input
                type="number"
                value={agencyNurseCost}
                onChange={(e) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, agencyNurseCost: Number(e.target.value) || 0 } }))}
                className="w-28 font-mono"
                data-testid="nursing-agency-agency-cost-input"
              />
              <span className="text-xs text-[#6B7280]">/year</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-neutral-400 font-mono">
          Premium: ${premium.toLocaleString()}/FTE
        </p>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">How much agency reduction is realistic?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "aggressive"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, reductionLevel: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  reductionLevel === opt
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                data-testid={`nursing-agency-reduction-${opt}`}
              >
                {opt === "conservative" && "5%"}
                {opt === "typical" && "10%"}
                {opt === "aggressive" && "20%"}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6B7280]">Documentation burden is one factor driving agency use. Conservative is realistic.</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(ftesConverted * premium))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {ftesConverted.toFixed(1)} FTEs converted × ${premium.toLocaleString()} premium
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingRetentionInputs = () => {
    const { turnoverRate, burnoutPortion, docAttribution, preventionLevel, replacementCost } = driverInputs.nursingRetention;
    const departures = nurseFTEs * (turnoverRate / 100);
    const burnoutDepartures = departures * (burnoutPortion / 100);
    const docRelated = burnoutDepartures * (docAttribution / 100);
    const preventionPct = preventionLevel === "conservative" ? 30 : preventionLevel === "typical" ? 40 : 55;
    const prevented = docRelated * (preventionPct / 100) * (utilizationRate / 100);
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Annual nursing turnover rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{turnoverRate}%</span>
          </div>
          <Slider
            value={[turnoverRate]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, turnoverRate: val } }))}
            min={10}
            max={30}
            step={2}
            className="w-full"
            data-testid="nursing-retention-turnover-slider"
          />
          <p className="text-xs text-[#6B7280]">National average is 18-22%</p>
          <p className="text-xs text-neutral-400 font-mono">
            {nurseFTEs} × {turnoverRate}% = {Math.round(departures).toLocaleString()} annual departures
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Burnout-driven departures?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{burnoutPortion}%</span>
          </div>
          <Slider
            value={[burnoutPortion]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, burnoutPortion: val } }))}
            min={40}
            max={70}
            step={5}
            className="w-full"
            data-testid="nursing-retention-burnout-slider"
          />
          <p className="text-xs text-[#6B7280]">~55% of departures are burnout-related</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Documentation attribution?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{docAttribution}%</span>
          </div>
          <Slider
            value={[docAttribution]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, docAttribution: val } }))}
            min={15}
            max={40}
            step={5}
            className="w-full"
            data-testid="nursing-retention-doc-attribution-slider"
          />
          <p className="text-xs text-[#6B7280]">Documentation burden is the #1 driver of nursing burnout</p>
          <p className="text-xs text-neutral-400 font-mono">
            {Math.round(departures).toLocaleString()} × {burnoutPortion}% × {docAttribution}% = {Math.round(docRelated).toLocaleString()} doc-driven departures
          </p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Prevention level?</label>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "typical", "aggressive"] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, preventionLevel: opt } }))}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  preventionLevel === opt
                    ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                    : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                data-testid={`nursing-retention-prevention-${opt}`}
              >
                {opt === "conservative" && "30%"}
                {opt === "typical" && "40%"}
                {opt === "aggressive" && "55%"}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Replacement cost per nurse?</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={replacementCost}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, replacementCost: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="nursing-retention-cost-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">$40K-$60K is typical (recruiting, training, onboarding)</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(prevented * replacementCost))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {prevented.toFixed(1)} prevented × ${replacementCost.toLocaleString()}
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingCompletenessInputs = () => {
    const { lateDocPct, incompleteFieldsPct, operationalValue } = driverInputs.nursingCompleteness;
    
    return (
      <div className="space-y-6">
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800 flex items-start gap-2">
            <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Documentation completeness reduces audit risk and improves regulatory compliance. The value is real but harder to quantify.</span>
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Late documentation rate?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{lateDocPct}%</span>
          </div>
          <Slider
            value={[lateDocPct]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingCompleteness: { ...prev.nursingCompleteness, lateDocPct: val } }))}
            min={10}
            max={40}
            step={5}
            className="w-full"
            data-testid="nursing-completeness-late-slider"
          />
          <p className="text-xs text-[#6B7280]">What % of documentation is completed after shift end?</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm text-[#111827] font-medium">Incomplete/missing fields?</label>
            <span className="font-mono text-sm text-[#E85D3F]">{incompleteFieldsPct}%</span>
          </div>
          <Slider
            value={[incompleteFieldsPct]}
            onValueChange={([val]) => setDriverInputs(prev => ({ ...prev, nursingCompleteness: { ...prev.nursingCompleteness, incompleteFieldsPct: val } }))}
            min={5}
            max={30}
            step={5}
            className="w-full"
            data-testid="nursing-completeness-incomplete-slider"
          />
          <p className="text-xs text-[#6B7280]">What % of required fields are often incomplete?</p>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm text-[#111827] font-medium">Estimated annual operational value</label>
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280]">$</span>
            <Input
              type="number"
              value={operationalValue}
              onChange={(e) => setDriverInputs(prev => ({ ...prev, nursingCompleteness: { ...prev.nursingCompleteness, operationalValue: Number(e.target.value) || 0 } }))}
              className="w-32 font-mono"
              data-testid="nursing-completeness-value-input"
            />
          </div>
          <p className="text-xs text-[#6B7280]">Includes avoided audit findings, reduced remediation, compliance benefits</p>
        </div>
        
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Result (Compliance Value)</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(operationalValue * (utilizationRate / 100)))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            ${operationalValue.toLocaleString()} × {utilizationRate}% adoption
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
            <span className="text-sm text-[#6B7280]">Step 3 of 5</span>
            <span className="text-sm font-medium text-[#111827]">Your Value</span>
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
              
              {isNursingSetting ? (
                /* Nursing-specific organization inputs */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">
                      How many staffed beds are in scope?
                    </label>
                    <Input
                      type="number"
                      value={staffedBeds}
                      onChange={(e) => setStaffedBeds(Number(e.target.value) || 0)}
                      placeholder="e.g., 200"
                      className="max-w-xs font-mono"
                      data-testid="input-staffed-beds"
                    />
                    <p className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> This is your billing unit for Abridge Nursing
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">
                      How many nurse FTEs support these beds?
                    </label>
                    <Input
                      type="number"
                      value={nurseFTEs}
                      onChange={(e) => {
                        setNurseFTEs(Number(e.target.value) || 0);
                        setNurseFTEsManuallyEdited(true); // User has manually edited, stop auto-calc
                      }}
                      placeholder="e.g., 300"
                      className="max-w-xs font-mono"
                      data-testid="input-nurse-ftes"
                    />
                    <p className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> ~1.5 FTEs per bed is typical for med-surg. Higher for ICU (~2.5-3.0)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">What type of unit(s)?</label>
                    <p className="text-xs text-[#6B7280] mb-2">
                      Unit type affects documentation burden and staffing ratios
                    </p>
                    <div className="flex gap-2">
                      {(["med-surg", "icu", "mixed"] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setUnitType(type)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            unitType === type
                              ? "border-[#E85D3F] bg-[#E85D3F]/5 text-[#E85D3F]"
                              : "border-neutral-200 text-[#6B7280] hover:border-neutral-300"
                          }`}
                          data-testid={`unit-type-${type}`}
                        >
                          {type === "med-surg" && "Med-Surg"}
                          {type === "icu" && "ICU/Critical Care"}
                          {type === "mixed" && "Mixed"}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">Expected utilization rate?</label>
                    <p className="text-xs text-[#6B7280] mb-2">
                      Nursing adoption can be slower than provider adoption
                    </p>
                    <div className="flex gap-2">
                      {([45, 60, 75] as const).map(rate => (
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
                          {rate === 45 && "Early 45%"}
                          {rate === 60 && "Typical 60%"}
                          {rate === 75 && "Aggressive 75%"}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                    <p className="text-sm text-[#111827]">
                      <span className="font-medium">→</span>{" "}
                      <span className="font-mono">{staffedBeds.toLocaleString()}</span> beds │{" "}
                      <span className="font-mono">{nurseFTEs.toLocaleString()}</span> nurses │ {unitType === "med-surg" ? "Med-Surg" : unitType === "icu" ? "ICU" : "Mixed"}
                    </p>
                    <p className="text-sm text-[#111827] mt-1">
                      <span className="font-mono">{documentationEvents.toLocaleString()}</span> events ×{" "}
                      <span className="font-mono">{utilizationRate}%</span> ={" "}
                      <span className="font-mono font-semibold text-[#E85D3F]">{Math.round(documentationEvents * (utilizationRate / 100)).toLocaleString()}</span> Abridge-documented events/year
                    </p>
                  </div>
                  
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Abridge Nursing is priced per staffed bed, not per nurse.</strong>
                        <br />
                        This means your ROI scales as utilization increases.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                /* Standard provider/encounter inputs */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">
                      {isInpatientSetting ? "How many hospitalists are in scope?" : isEDSetting ? "How many ED physicians are in scope?" : "How many providers are in scope?"}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={providers === 0 ? "" : providers.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setProviders(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder={isInpatientSetting ? "e.g., 20" : isEDSetting ? "e.g., 25" : "e.g., 50"}
                      className="max-w-xs font-mono"
                      data-testid="input-providers"
                    />
                    <p className="text-xs text-[#6B7280]">
                      {isInpatientSetting
                        ? "Include all hospitalists who will use Abridge for documentation"
                        : isEDSetting 
                          ? "Include attendings and mid-levels who will use Abridge" 
                          : "This is your starting point. Could be a pilot or full deployment."}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">
                      {isInpatientSetting 
                        ? `Annual admissions for these hospitalists?` 
                        : `Annual encounters for these ${isEDSetting ? "physicians" : "providers"}?`}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={encounters === 0 ? "" : encounters.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEncounters(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder={isInpatientSetting ? "e.g., 8,000" : isEDSetting ? "e.g., 45,000" : "e.g., 100,000"}
                      className="max-w-xs font-mono"
                      data-testid="input-encounters"
                    />
                    <p className="text-xs text-[#6B7280]">
                      {isInpatientSetting
                        ? "~400/hospitalist is typical for a hospitalist program"
                        : isEDSetting 
                          ? "~1,800/physician is typical for a community ED"
                          : "~2,000/provider is typical for primary care, ~1,500 for specialty"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#111827]">Expected utilization rate?</label>
                    <p className="text-xs text-[#6B7280] mb-2">
                      {isEDSetting 
                        ? "ED adoption is typically higher than outpatient"
                        : isInpatientSetting 
                          ? "What percentage of admissions will use Abridge?"
                          : "What percentage of encounters will use Abridge?"}
                    </p>
                    <div className="flex gap-2">
                      {(isEDSetting ? [55, 70, 85] as const : isInpatientSetting ? [50, 65, 80] as const : [50, 65, 80] as const).map(rate => (
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
                          {isInpatientSetting ? (
                            <>
                              {rate === 50 && "Conservative 50%"}
                              {rate === 65 && "Typical 65%"}
                              {rate === 80 && "Aggressive 80%"}
                            </>
                          ) : isEDSetting ? (
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
                  
                  <div className="mt-8 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-emerald-800">Your Multiplier</span>
                    </div>
                    <div className="font-mono text-3xl font-bold text-emerald-700 mb-1">
                      {eligibleEncounters.toLocaleString()}
                    </div>
                    <p className="text-sm text-emerald-700">
                      eligible {isInpatientSetting ? "admissions" : "encounters"} per year
                    </p>
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Everything below builds from this number
                    </p>
                  </div>
                </div>
              )}
            </section>
            
            <section className="bg-white rounded-2xl border border-neutral-200 p-8">
              {/* Inpatient ED Connection Callout - appears at TOP before drivers */}
              {isInpatientSetting && (
                <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6" data-testid="inpatient-ed-connection-callout">
                  {/* Left accent bar (inset, not a border) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-l-xl" />
                  
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Link2 className="w-6 h-6 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Connected Value</h3>
                      <p className="text-sm text-slate-500">ED + Inpatient compounds your results</p>
                    </div>
                  </div>
                  
                  {/* Theory */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    When both ED and Inpatient use Abridge, the value compounds. The admission documentation 
                    that starts in ED flows directly into inpatient coding, CDI workflows, and denial defense.
                  </p>
                  
                  {/* Impact List */}
                  <div className="space-y-3 mb-5">
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-teal-100">
                      <BarChart3 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">DRG Capture</p>
                        <p className="text-xs text-slate-500">CCs/MCCs documented in ED carry forward — your case mix starts stronger from admission.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-teal-100">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">CDI Efficiency</p>
                        <p className="text-xs text-slate-500">When the ED note is complete, CDI teams query less and focus on complex cases.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-teal-100">
                      <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Denial Prevention</p>
                        <p className="text-xs text-slate-500">Medical necessity documented at admission is your first line of defense against payer audits.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amplification Note */}
                  <div className="flex items-start gap-3 bg-teal-500/10 rounded-lg p-4">
                    <Lightbulb className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-teal-800">
                      <span className="font-semibold">If you're also using Abridge in ED</span>, the documentation 
                      quality benefits below are amplified — you're building on a stronger foundation.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Value Drivers</h2>
                <p className="text-sm text-[#6B7280]">Expand each driver to customize the calculation</p>
              </div>
              
              <div className="space-y-4">
                {activeDrivers.map(driverId => renderDriverAccordion(driverId))}
              </div>
              
              {/* ED Downstream Value Callout - appears after ED drivers */}
              {isEDSetting && (
                <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6" data-testid="ed-downstream-callout">
                  {/* Left accent bar (inset, not a border) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                  
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Link2 className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Downstream Value</h3>
                      <p className="text-sm text-slate-500">The ED admission note is just the beginning</p>
                    </div>
                  </div>
                  
                  {/* Theory */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    When an ED physician decides to admit a patient, their documentation becomes the foundation 
                    for inpatient revenue. The conditions they capture, the medical necessity they establish, 
                    and the clinical reasoning they document all determine what happens downstream.
                  </p>
                  
                  {/* Impact List */}
                  <div className="space-y-3 mb-5">
                    <h4 className="text-sm font-semibold text-slate-700">Better ED documentation directly impacts:</h4>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <BarChart3 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">DRG & CMI Capture</p>
                        <p className="text-xs text-slate-500">CCs and MCCs documented in ED carry forward to inpatient coding. What's captured here determines your case mix.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Medical Necessity</p>
                        <p className="text-xs text-slate-500">The admission decision is documented in ED. This is your first line of defense against status denials and downgrades.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">CDI Efficiency</p>
                        <p className="text-xs text-slate-500">When the ED note is complete, CDI teams spend less time querying physicians and more time on complex cases.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Denial Prevention</p>
                        <p className="text-xs text-slate-500">Payer audits start with the admission note. Complete documentation from day one means stronger appeals.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Inpatient Info Banner */}
                  <div className="flex items-center gap-3 bg-indigo-500 rounded-lg p-4">
                    <Building2 className="w-5 h-5 text-white flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm">
                        These benefits are quantified in the <span className="font-semibold">Inpatient Setting</span>.
                      </p>
                      <p className="text-white/80 text-xs mt-1">
                        If your organization admits patients from the ED, the value compounds when both settings use Abridge.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
            
          </div>
          
          <div className="w-[35%]">
            <div className="sticky top-24 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#111827] mb-4">Live Model</h3>
              
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-[#6B7280] mb-2">Your Value</div>
                
                <div className="space-y-2">
                  {activeDrivers.map(driverId => (
                    <div key={driverId} className="flex justify-between items-center py-1">
                      <span className="text-sm text-[#111827]">{DRIVER_NAMES[driverId]}</span>
                      <span className="font-mono text-sm text-emerald-600">{formatCurrency(driverResults[driverId]?.value || 0)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[#111827]">Total Value</span>
                    <span className="font-mono font-bold text-lg text-emerald-600">{formatCurrency(totalBenefit)}/yr</span>
                  </div>
                </div>
                
                <p className="text-xs text-[#6B7280] text-center py-2">Investment calculated in next step</p>
                
                <Button
                  onClick={handleComplete}
                  className="w-full h-12 bg-[#E85D3F] hover:bg-[#D14D32] border-[#E85D3F] text-white text-base font-semibold"
                  data-testid="button-continue-investment"
                >
                  Continue to Investment
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
