import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableNumberInput } from "@/components/ui/editable-number-input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Slider } from "@/components/ui/slider";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ExploreProgressBar } from "@/components/ExploreProgressBar";
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
  Info,
  Pencil,
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

interface BaselineInfo {
  providers: number;
  encounters: number;
  utilizationRate: number;
  eligibleEncounters: number;
  nursingStaffedBeds?: number;
  nursingFTEs?: number;
  nursingUnitType?: "med-surg" | "icu" | "mixed";
  nursingDocEventsPerBedPerYear?: number;
  nursingOccupancyRate?: number;
}

interface ModelBuilderProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
  onComplete: (results: ValueResults) => void;
  initialResults?: ValueResults | null;
  initialBaseline?: BaselineInfo | null;
  onBackToJourney?: () => void;
}

export interface ModelResults {
  providers: number;
  encounters: number;
  utilizationRate: number;
  eligibleEncounters: number;
  driverResults: Record<string, DriverResult>;
  totalBenefit: number;
  investment: number;
  implementationFee?: number;
  netGain: number;
  roiMultiple: number;
  paybackMonths: number;
  costPerMonth?: number;
  enterpriseAnnual?: number;
  pricingModel?: "per_clinician" | "enterprise";
  contractYears?: number;
  timeSavedPerEncounter?: number;
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
    // Locum Cost Avoidance inputs
    locumProviders: number;              // Number of locum providers used
    locumHoursPerWeek: number;           // Hours per locum per week
    locumWeeksPerYear: number;           // Weeks of locum coverage annually
    docDrivenPercent: number;            // % of locum usage driven by documentation inefficiency
    abridgeReductionRate: number;        // % of documentation-driven hours Abridge can reduce
    locumHourlyRate: number;             // Avg locum cost per hour (including agency fees)
  };
  patientAccess: {
    // Step 1: Time Returned
    timeSavedPerEncounter: number;     // Minutes saved per encounter (default 3)
    // Step 2: Time Allocated to Access
    accessAllocation: number;          // % of saved time → access potential (default 33%)
    // Step 3: Conversion to Visits
    conversionRate: number;            // % of access time → actual visits (default 40%)
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
    abridgeAttributionPercent: number;
    avgEdVisitRevenue: number;
    includeAdmissions: boolean;
    admissionPercent: number;
    avgAdmissionRevenue: number;
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
    turnoverRate: number;        // % annual turnover (default 15%)
    burnoutAttribution: number;  // % of turnover that's burnout-related (default 50%)
    abridgeImpact: number;       // % of burnout turnover Abridge can prevent (default 30%)
    replacementCost: number;     // Cost to replace a hospitalist (default $500,000)
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
    denialRate: number;      // % of admissions denied (default 5%)
    docRelatedPct: number;   // % of denials that are doc-related (default 35%)
    writeOffPct: number;     // % of doc denials written off (default 25%)
    captureRate: number;     // % of write-offs Abridge can recover (default 75%)
    avgClaimValue: number;   // Average inpatient claim value (default $12,000)
  };
  // Nursing-specific drivers
  nursingOvertime: {
    otHoursPerWeek: number;
    weeksPerYear: number;
    docRelatedPct: number;
    reductionRate: number;
    baseHourlyRate: number;
  };
  nursingHAPI: {
    annualAdmissions: number;  // Total annual admissions (10,000)
    hapiRate: number;          // % of admissions with HAPI (2.5%)
    preventionRate: number;    // % of HAPIs documentation can prevent (10%)
    costPerHAPI: number;       // Cost per HAPI ($20,000)
  };
  nursingFalls: {
    annualAdmissions: number;  // Total annual admissions (10,000)
    fallsRate: number;         // Falls per 1,000 patient days (3.5)
    avgLOS: number;            // Average length of stay in days (4)
    preventionRate: number;    // % of falls documentation can prevent (8%)
    costPerFall: number;       // Average cost per fall ($6,500)
  };
  nursingAgency: {
    agencyFTEsPerBed: number;  // e.g., 0.15 = 15% agency utilization
    staffSalary: number;       // Staff RN fully loaded ($75K)
    agencyCost: number;        // Agency RN fully loaded ($150K)
    retentionImpact: number;   // % reduction in agency need (10%)
  };
  nursingRetention: {
    turnoverRate: number;        // Annual nursing turnover rate (18%)
    burnoutAttribution: number;  // % of turnover that's burnout-related (50%)
    abridgeImpact: number;       // % of burnout turnover Abridge can prevent (20%)
    replacementCost: number;     // Cost to replace a nurse ($50,000)
  };
  nursingSurvey: {
    enabled: boolean;  // Not quantified - qualitative value
  };
  nursingCareCoordination: {
    enabled: boolean;  // Not quantified - qualitative value
  };
  nursingPatientExperience: {
    enabled: boolean;  // Not quantified - qualitative value
  };
  edPatientExperience: {
    enabled: boolean;  // Not quantified - qualitative value
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
  overtime: "Locum Cost Avoidance",
  patientAccess: "Patient Access",
  retention: "Clinician Retention",
  levelOfService: "Accurate Level of Service",
  hcc: "HCC & Chronic Condition Capture",
  denials: "Documentation-Related Denials",
  // ED drivers
  edThroughput: "Patient Throughput (LWBS Reduction)",
  edRetention: "Physician Retention",
  edLevelOfService: "Level-of-Service Accuracy",
  edDenials: "Documentation-Related Denials",
  // Inpatient drivers
  inpatientRetention: "Hospitalist Retention",
  inpatientCCMCC: "DRG Accuracy",
  inpatientCDI: "CDI Query Reduction",
  inpatientDenials: "Documentation-Related Denials",
  // Nursing drivers
  nursingOvertime: "Overtime Reduction",
  nursingAgency: "Agency & Travel Nurse Reduction",
  nursingRetention: "Nurse Retention",
  nursingHAPI: "HAPI Prevention",
  nursingFalls: "Falls Prevention",
  nursingSurvey: "Survey & Compliance Readiness",
  nursingCareCoordination: "Care Coordination",
  nursingPatientExperience: "Patient Experience (HCAHPS)",
  edPatientExperience: "Patient Experience",
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
  nursingAgency: "Improved retention and satisfaction reduces reliance on expensive agency nurses who cost 2-3x staff nurses. Agency → staff conversion is real budget savings.",
  nursingRetention: "Documentation burden is the top driver of nursing burnout. By reducing this burden, we help prevent burnout-related departures—each costing $40-60K to replace.",
  nursingHAPI: "Better documentation supports timely skin assessments and turning protocols. While the causal link is indirect, improved documentation correlates with reduced pressure injury rates.",
  nursingFalls: "Falls happen when risk assessments are missed or interventions are delayed. Real-time documentation ensures fall risk scores, mobility assessments, and environmental factors are captured as they're observed — enabling earlier intervention. We show this as POTENTIAL value because the causal link is indirect.",
  nursingSurvey: "Real-time documentation supports audit confidence and survey readiness. This is qualitative value that strengthens the overall ROI narrative.",
  nursingCareCoordination: "Complete, timely documentation improves handoffs between shifts and departments. This is qualitative value that improves patient outcomes.",
  nursingPatientExperience: "Patients notice when nurses are fully present versus distracted by documentation. Ambient charting improves how patients perceive nurse communication—a key HCAHPS domain.",
  edPatientExperience: "ED encounters are high-stress moments. When physicians are present and engaged rather than focused on documentation, patients feel heard and communication improves—directly impacting satisfaction scores.",
};

export default function ModelBuilder({
  selectedSettings,
  selectedLevers,
  onBack,
  onComplete,
  initialResults,
  initialBaseline,
  onBackToJourney,
}: ModelBuilderProps) {
  const isEDSettingInit = selectedSettings.includes("ed");
  const isInpatientSettingInit = selectedSettings.includes("inpatient");
  const isNursingSettingInit = selectedSettings.includes("nursing");
  
  // Use baseline info from the previous step, falling back to initialResults or defaults
  const defaultProviders = initialBaseline?.providers ?? initialResults?.providers ?? (isNursingSettingInit ? 300 : isInpatientSettingInit ? 20 : isEDSettingInit ? 25 : 50);
  const defaultEncounters = initialBaseline?.encounters ?? initialResults?.encounters ?? (isNursingSettingInit ? 150000 : defaultProviders * (isInpatientSettingInit ? 400 : isEDSettingInit ? 1800 : 2000));
  const defaultUtilization = initialBaseline?.utilizationRate ?? initialResults?.utilizationRate ?? (isNursingSettingInit ? 60 : isEDSettingInit ? 70 : 65);
  
  // These are now read-only from baseline - we don't show the inputs here
  const providers = defaultProviders;
  const encounters = defaultEncounters;
  const utilizationRate = defaultUtilization as 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85;
  
  // Nursing-specific values (from baseline or defaults)
  const staffedBeds = initialBaseline?.nursingStaffedBeds ?? initialResults?.nursingStaffedBeds ?? 200;
  const nurseFTEs = initialBaseline?.nursingFTEs ?? initialResults?.nursingFTEs ?? 300;
  const unitType = initialBaseline?.nursingUnitType ?? initialResults?.nursingUnitType ?? "med-surg";
  const nursingOccupancyRate = initialBaseline?.nursingOccupancyRate ?? 85;
  const eventsPerPatientDay = initialBaseline?.nursingDocEventsPerBedPerYear ?? 3;
  // Calculate patient days for formula display
  const patientDaysPerYear = Math.round(staffedBeds * (nursingOccupancyRate / 100) * 365);
  const documentationEventsPerFTE = 500;
  const documentationEvents = nurseFTEs * documentationEventsPerFTE;
  const [costPerBedPerMonth, setCostPerBedPerMonth] = useState<number>(75);
  
  // Investment-related state (kept for calculations but not used on this page)
  const [pricingModel, setPricingModel] = useState<"per_clinician" | "enterprise">("per_clinician");
  const [costPerMonth, setCostPerMonth] = useState<number>(140);
  const [enterpriseAnnual, setEnterpriseAnnual] = useState<number>(500000);
  const [contractTerm, setContractTerm] = useState<1 | 2 | 3 | number>(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const [implementationFee, setImplementationFee] = useState<number>(25000);
  
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [reviewedDrivers, setReviewedDrivers] = useState<Set<string>>(new Set());
  const [showFirstDriverGlow, setShowFirstDriverGlow] = useState(true);
  
  // Stop the glow animation after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowFirstDriverGlow(false), 2500);
    return () => clearTimeout(timer);
  }, []);
  
  const isEDSetting = selectedSettings.includes("ed");
  
  const [driverInputs, setDriverInputs] = useState<DriverInputs>({
    overtime: {
      // Locum Cost Avoidance defaults
      locumProviders: 2,             // 2 locum providers
      locumHoursPerWeek: 40,         // 40 hrs/week per locum
      locumWeeksPerYear: 30,         // 30 weeks of coverage
      docDrivenPercent: 33,          // 33% of locum usage is documentation-driven
      abridgeReductionRate: 50,      // 50% of documentation-driven hours can be reduced
      locumHourlyRate: 275,          // $275/hr locum cost (including agency fees)
    },
    patientAccess: {
      timeSavedPerEncounter: 3,      // 3 min saved per encounter
      accessAllocation: 25,            // 25% of saved time → access potential
      conversionRate: 40,              // 40% of access time → actual visits
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
      riskContractPercent: 15,
      conditionsPerVisit: 2.0,
      documentationGap: 20,
      hccEligiblePercent: 35,
      abridgeCaptureRate: 40,
      avgHccValue: 800,
      auditFactor: 25,
    },
    denials: {
      denialRate: 6,
      docRelatedPercent: 35,
      writtenOffPercent: 35,
      abridgeCaptureRate: 50,
      avgClaimValue: 250,
    },
    // ED defaults
    edThroughput: {
      annualEdVisits: 45000,
      lwbsRate: 3.5,
      improvementRate: 10,
      abridgeAttributionPercent: 33,
      avgEdVisitRevenue: 600,
      includeAdmissions: true,
      admissionPercent: 12,
      avgAdmissionRevenue: 15000,
    },
    edRetention: {
      edPhysicians: 25,
      turnoverRate: 12,
      burnoutAttribution: 50,
      abridgeImpact: 10,
      replacementCost: 800000,
    },
    edLevelOfService: {
      annualEdVisits: 45000,
      avgWrvuPerEncounter: 2.5,
      wrvuImprovementRate: 3,
      conversionFactor: 33,
    },
    edDenials: {
      documentedEncounters: 31500,
      denialRate: 10,
      docRelatedPercent: 10,
      writtenOffPercent: 30,
      abridgeCaptureRate: 50,
      avgClaimValue: 650,
    },
    // Inpatient defaults
    inpatientRetention: {
      turnoverRate: 15,          // 15% annual turnover
      burnoutAttribution: 50,    // 50% burnout-related
      abridgeImpact: 30,         // 30% Abridge can prevent
      replacementCost: 500000,   // $500K replacement cost
    },
    inpatientCCMCC: {
      gapRate: 25,             // 25% of admissions at risk of downcoding
      improvementRate: 25,     // 25% of at-risk admissions Abridge can protect
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
      denialRate: 5,          // 5% of admissions denied
      docRelatedPct: 35,      // 35% are doc-related
      writeOffPct: 25,        // 25% written off
      captureRate: 75,        // 75% Abridge can recover
      avgClaimValue: 12000,   // $12,000 average claim
    },
    // Nursing defaults
    nursingOvertime: {
      otHoursPerWeek: 4,
      weeksPerYear: 50,
      docRelatedPct: 33,
      reductionRate: 50,
      baseHourlyRate: 45,
    },
    nursingHAPI: {
      annualAdmissions: 10000,   // 10,000 annual admissions
      hapiRate: 2.5,             // 2.5% HAPI rate
      preventionRate: 5,         // 5% documentation-preventable
      costPerHAPI: 20000,        // $20,000 cost per HAPI
    },
    nursingFalls: {
      annualAdmissions: 10000,   // 10,000 annual admissions
      fallsRate: 3.5,            // 3.5 falls per 1,000 patient days
      avgLOS: 4,                 // 4 day average length of stay
      preventionRate: 5,         // 5% documentation-preventable
      costPerFall: 6500,         // $6,500 average cost per fall
    },
    nursingAgency: {
      agencyFTEsPerBed: 0.15,    // 15% agency utilization
      staffSalary: 75000,        // $75K staff RN fully loaded
      agencyCost: 150000,        // $150K agency RN fully loaded
      retentionImpact: 10,       // 10% reduction in agency need
    },
    nursingRetention: {
      turnoverRate: 18,          // 18% annual turnover
      burnoutAttribution: 50,    // 50% of turnover is burnout-related
      abridgeImpact: 15,         // 15% of burnout turnover prevented
      replacementCost: 50000,    // $50K replacement cost
    },
    nursingSurvey: {
      enabled: false,  // Not quantified - qualitative value
    },
    nursingCareCoordination: {
      enabled: false,  // Not quantified - qualitative value
    },
    nursingPatientExperience: {
      enabled: false,  // Not quantified - qualitative value
    },
    edPatientExperience: {
      enabled: false,  // Not quantified - qualitative value
    },
  });
  
  const isInpatientSetting = selectedSettings.includes("inpatient");
  const isNursingSetting = selectedSettings.includes("nursing");
  
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  
  // Sync ED driver inputs with eligibleEncounters when encounters or utilization changes
  useEffect(() => {
    if (selectedSettings.includes("ed")) {
      setDriverInputs(prev => ({
        ...prev,
        edThroughput: { ...prev.edThroughput, annualEdVisits: eligibleEncounters },
        edLevelOfService: { ...prev.edLevelOfService, annualEdVisits: eligibleEncounters },
        edDenials: { ...prev.edDenials, documentedEncounters: eligibleEncounters },
      }));
    }
  }, [eligibleEncounters, selectedSettings]);
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
      edRetention: "edRetention",
      edLevelOfService: "edLevelOfService",
      edDenials: "edDenials",
      edPatientExperience: "edPatientExperience",
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
        return ["nursingOvertime", "nursingAgency", "nursingRetention"];
      }
      if (isEDSetting) {
        return ["edThroughput", "edLevelOfService", "edDenials"];
      }
      if (isInpatientSetting) {
        return ["inpatientRetention", "inpatientCCMCC", "inpatientCDI"];
      }
      return ["overtime", "patientAccess", "levelOfService"];
    }
    
    return Array.from(active);
  }, [selectedLevers, isEDSetting, isInpatientSetting, isNursingSetting]);
  
  const calculateDriverValue = useCallback((driverId: string): number => {
    switch (driverId) {
      case "overtime": {
        const {
          locumProviders,
          locumHoursPerWeek,
          locumWeeksPerYear,
          docDrivenPercent,
          abridgeReductionRate,
          locumHourlyRate,
        } = driverInputs.overtime;
        
        // LOCUM COST AVOIDANCE (4-step calculation)
        // Step 1: Current Locum Usage
        const annualLocumHours = locumProviders * locumHoursPerWeek * locumWeeksPerYear;
        // Step 2: Documentation-Driven Usage
        const docDrivenHours = annualLocumHours * (docDrivenPercent / 100);
        // Step 3: Abridge Reduction
        const hoursReduced = docDrivenHours * (abridgeReductionRate / 100);
        // Step 4: Cost Savings
        const annualLocumSavings = hoursReduced * locumHourlyRate;
        
        return Math.round(annualLocumSavings);
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
        const { annualEdVisits, lwbsRate, improvementRate, abridgeAttributionPercent, avgEdVisitRevenue, includeAdmissions, admissionPercent, avgAdmissionRevenue } = driverInputs.edThroughput;
        // Step 1: Current LWBS
        const patientsLeaving = annualEdVisits * (lwbsRate / 100);
        // Step 2: Patients Retained
        const patientsRetained = patientsLeaving * (improvementRate / 100);
        // Step 2.5: Attributed to Abridge
        const patientsAttributedToAbridge = patientsRetained * (abridgeAttributionPercent / 100);
        // Step 3: Revenue Mix (using attributed patients)
        let edVisitPatients, admissionPatients, edVisitRevenue, admissionRevenue;
        if (includeAdmissions) {
          edVisitPatients = patientsAttributedToAbridge * (1 - admissionPercent / 100);
          admissionPatients = patientsAttributedToAbridge * (admissionPercent / 100);
          edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
          admissionRevenue = admissionPatients * avgAdmissionRevenue;
        } else {
          edVisitPatients = patientsAttributedToAbridge;
          admissionPatients = 0;
          edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
          admissionRevenue = 0;
        }
        // Step 4: Total Value
        return Math.round(edVisitRevenue + admissionRevenue);
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
        const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.inpatientRetention;
        // Step 1: Baseline Turnover
        const annualDepartures = providers * (turnoverRate / 100);
        // Step 2: Burnout-Related
        const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
        // Step 3: Abridge Attribution
        const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
        // Step 4: Cost Savings
        const annualValue = departuresAvoided * replacementCost;
        return Math.round(annualValue);
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
        const { denialRate, docRelatedPct, writeOffPct, captureRate, avgClaimValue } = driverInputs.inpatientDenials;
        // Step 1: Total Denials
        const totalDenials = eligibleEncounters * (denialRate / 100);
        // Step 2: Documentation-Related
        const docDenials = totalDenials * (docRelatedPct / 100);
        // Step 3: Written Off
        const writtenOff = docDenials * (writeOffPct / 100);
        // Step 4: Abridge Recovery
        const claimsRecovered = writtenOff * (captureRate / 100);
        // Step 5: Value Recovered
        const annualValue = claimsRecovered * avgClaimValue;
        return Math.round(annualValue);
      }
      // Nursing Drivers
      case "nursingOvertime": {
        const { otHoursPerWeek, weeksPerYear, docRelatedPct, reductionRate, baseHourlyRate } = driverInputs.nursingOvertime;
        // Step 1: Current overtime = Nurses × Hours/Week × Weeks/Year
        const totalOTHours = nurseFTEs * otHoursPerWeek * weeksPerYear;
        // Step 2: Documentation-driven OT = Total OT × Doc-Related %
        const docDrivenOT = totalOTHours * (docRelatedPct / 100);
        // Step 3: Hours eliminated = Doc-Driven OT × Reduction Rate × Adoption
        const hoursEliminated = docDrivenOT * (reductionRate / 100) * (utilizationRate / 100);
        // Step 4: Cost savings = Hours × OT Rate (1.5×)
        const overtimeRate = baseHourlyRate * 1.5;
        return Math.round(hoursEliminated * overtimeRate);
      }
      case "nursingHAPI": {
        const { annualAdmissions, hapiRate, preventionRate, costPerHAPI } = driverInputs.nursingHAPI;
        // Step 1: Current HAPI volume = Annual Admissions × HAPI Rate
        const currentHAPIs = annualAdmissions * (hapiRate / 100);
        // Step 2: Documentation-preventable = Current HAPIs × Prevention Rate
        const hapisPrevented = currentHAPIs * (preventionRate / 100);
        // Step 3: Cost avoidance = HAPIs Prevented × Cost per HAPI
        return Math.round(hapisPrevented * costPerHAPI);
      }
      case "nursingFalls": {
        const { annualAdmissions, fallsRate, avgLOS, preventionRate, costPerFall } = driverInputs.nursingFalls;
        // Step 1: Calculate patient days (admissions × avg length of stay)
        const patientDays = annualAdmissions * avgLOS;
        // Step 2: Current falls volume = (Patient Days / 1000) × Falls Rate per 1000 patient days
        const currentFalls = (patientDays / 1000) * fallsRate;
        // Step 3: Documentation-preventable = Current Falls × Prevention Rate
        const fallsPrevented = currentFalls * (preventionRate / 100);
        // Step 4: Cost avoidance = Falls Prevented × Cost per Fall
        return Math.round(fallsPrevented * costPerFall);
      }
      case "nursingAgency": {
        const { agencyFTEsPerBed, staffSalary, agencyCost, retentionImpact } = driverInputs.nursingAgency;
        // Step 1: Current agency utilization = Staffed Beds × Agency FTEs per Bed
        const agencyFTEs = staffedBeds * agencyFTEsPerBed;
        // Step 2: Agency premium = Agency Cost - Staff Salary
        const premium = agencyCost - staffSalary;
        // Step 3: Retention-driven reduction = Agency FTEs × Retention Impact %
        const ftesConverted = agencyFTEs * (retentionImpact / 100);
        // Step 4: Cost savings = FTEs Converted × Premium
        return Math.round(ftesConverted * premium);
      }
      case "nursingRetention": {
        const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.nursingRetention;
        // Step 1: Baseline turnover = Nurse FTEs × Turnover Rate
        const departures = nurseFTEs * (turnoverRate / 100);
        // Step 2: Burnout-related = Departures × Burnout Attribution
        const burnoutDepartures = departures * (burnoutAttribution / 100);
        // Step 3: Abridge attribution = Burnout departures × Abridge Impact
        const departuresAvoided = burnoutDepartures * (abridgeImpact / 100);
        // Step 4: Cost savings = Departures Avoided × Replacement Cost
        return Math.round(departuresAvoided * replacementCost);
      }
      case "nursingSurvey":
      case "nursingCareCoordination":
      case "nursingPatientExperience":
      case "edPatientExperience": {
        // Not quantified - qualitative value only
        return 0;
      }
      default:
        return 0;
    }
  }, [providers, encounters, utilizationRate, eligibleEncounters, eligibleDocEvents, driverInputs, nurseFTEs, documentationEvents]);
  
  const driverResults = useMemo(() => {
    const results: Record<string, { name: string; value: number; category: "time" | "quality" }> = {};
    const timeDrivers = ["overtime", "patientAccess", "retention", "edThroughput", "edRetention", "inpatientRetention", "nursingOvertime", "nursingAgency", "nursingRetention"];
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
        case "overtime": {
          const locumProvs = driverInputs.overtime.locumProviders;
          const hrsPerWk = driverInputs.overtime.locumHoursPerWeek;
          const wksPerYr = driverInputs.overtime.locumWeeksPerYear;
          const docDrivenPct = driverInputs.overtime.docDrivenPercent;
          const abridgeRedRate = driverInputs.overtime.abridgeReductionRate;
          const hrlyRate = driverInputs.overtime.locumHourlyRate;
          const annualLocumHours = locumProvs * hrsPerWk * wksPerYr;
          const docDrivenHours = annualLocumHours * (docDrivenPct / 100);
          const hoursReduced = docDrivenHours * (abridgeRedRate / 100);
          return {
            locumProviders: locumProvs,
            locumHoursPerWeek: hrsPerWk,
            locumWeeksPerYear: wksPerYr,
            annualLocumHours: Math.round(annualLocumHours),
            docDrivenPercent: docDrivenPct,
            docDrivenHours: Math.round(docDrivenHours),
            abridgeReductionRate: abridgeRedRate,
            hoursReduced: Math.round(hoursReduced),
            locumHourlyRate: hrlyRate,
          };
        }
        case "patientAccess": {
          const timeSaved = driverInputs.patientAccess.timeSavedPerEncounter;
          const accessAlloc = driverInputs.patientAccess.accessAllocation;
          const convRate = driverInputs.patientAccess.conversionRate;
          const visitDuration = driverInputs.patientAccess.timePerVisit;
          const revPerVisit = driverInputs.patientAccess.revenuePerVisit;
          const minutesReturned = eligibleEncounters * timeSaved;
          const hrsReturned = minutesReturned / 60;
          const accessHrs = hrsReturned * (accessAlloc / 100);
          const usableHrs = accessHrs * (convRate / 100);
          const usableMins = usableHrs * 60;
          const addlVisits = usableMins / visitDuration;
          return {
            encounters: encounters,
            eligibleEncounters: eligibleEncounters,
            utilization: utilizationRate,
            timeSavedPerEncounter: timeSaved,
            hoursReturned: Math.round(hrsReturned),
            timeToAccessPct: accessAlloc,
            accessHours: Math.round(accessHrs),
            conversionRate: convRate,
            convertedHours: Math.round(usableHrs),
            visitDuration: visitDuration,
            additionalVisits: Math.round(addlVisits),
            revenuePerVisit: revPerVisit,
          };
        }
        case "retention": {
          const turnover = driverInputs.retention.turnoverRate;
          const burnout = driverInputs.retention.burnoutAttribution;
          const impact = driverInputs.retention.abridgeImpact;
          const replCost = driverInputs.retention.replacementCost;
          const annualDepartures = providers * (turnover / 100);
          const preventableDepartures = annualDepartures * (burnout / 100);
          const departuresAvoided = preventableDepartures * (impact / 100);
          return {
            providers: providers,
            turnoverRate: turnover,
            annualDepartures: annualDepartures,
            burnoutAttribution: burnout,
            burnoutDepartures: preventableDepartures,
            abridgeImpact: impact,
            departuresAvoided: departuresAvoided,
            replacementCost: replCost,
          };
        }
        case "levelOfService": {
          const wrvuPerEnc = driverInputs.levelOfService.avgWrvuPerEncounter;
          const improvementRate = driverInputs.levelOfService.wrvuImprovementRate;
          const convFactor = driverInputs.levelOfService.conversionFactor;
          const baselineWrvus = eligibleEncounters * wrvuPerEnc;
          const wrvuGain = baselineWrvus * (improvementRate / 100);
          return {
            eligibleEncounters: eligibleEncounters,
            avgWrvuPerEncounter: wrvuPerEnc,
            baselineWrvus: Math.round(baselineWrvus),
            wrvuImprovementRate: improvementRate,
            wrvuGain: Math.round(wrvuGain),
            conversionFactor: convFactor,
          };
        }
        case "hcc": {
          const riskPct = driverInputs.hcc.riskContractPercent;
          const condPerVisit = driverInputs.hcc.conditionsPerVisit;
          const docGap = driverInputs.hcc.documentationGap;
          const hccEligible = driverInputs.hcc.hccEligiblePercent;
          const captureRate = driverInputs.hcc.abridgeCaptureRate;
          const hccValue = driverInputs.hcc.avgHccValue;
          const auditFact = driverInputs.hcc.auditFactor;
          const riskEncounters = eligibleEncounters * (riskPct / 100);
          const missedHccsPerEnc = condPerVisit * (docGap / 100) * (hccEligible / 100);
          const missedHccOpp = riskEncounters * missedHccsPerEnc;
          const hccsCaptured = missedHccOpp * (captureRate / 100);
          return {
            eligibleEncounters: eligibleEncounters,
            riskContractPercent: riskPct,
            riskEncounters: Math.round(riskEncounters),
            conditionsPerVisit: condPerVisit,
            documentationGap: docGap,
            hccEligiblePercent: hccEligible,
            missedHccsPerEncounter: missedHccsPerEnc,
            missedHccOpportunities: Math.round(missedHccOpp),
            abridgeCaptureRate: captureRate,
            hccsCaptured: Math.round(hccsCaptured),
            avgHccValue: hccValue,
            auditFactor: auditFact,
          };
        }
        case "denials": {
          const denialRt = driverInputs.denials.denialRate;
          const docRelPct = driverInputs.denials.docRelatedPercent;
          const writeOffPct = driverInputs.denials.writtenOffPercent;
          const captRate = driverInputs.denials.abridgeCaptureRate;
          const claimVal = driverInputs.denials.avgClaimValue;
          const totalDenials = eligibleEncounters * (denialRt / 100);
          const docRelatedDenials = totalDenials * (docRelPct / 100);
          const writtenOffDenials = docRelatedDenials * (writeOffPct / 100);
          const claimsRecovered = writtenOffDenials * (captRate / 100);
          return {
            eligibleEncounters: eligibleEncounters,
            denialRate: denialRt,
            totalDenials: Math.round(totalDenials),
            docRelatedPercent: docRelPct,
            docRelatedDenials: Math.round(docRelatedDenials),
            writtenOffPercent: writeOffPct,
            writtenOffDenials: Math.round(writtenOffDenials),
            abridgeCaptureRate: captRate,
            claimsRecovered: Math.round(claimsRecovered),
            avgClaimValue: claimVal,
          };
        }
        // ED drivers
        case "edThroughput":
          return {
            annualEdVisits: driverInputs.edThroughput.annualEdVisits,
            lwbsRate: driverInputs.edThroughput.lwbsRate,
            improvementRate: driverInputs.edThroughput.improvementRate,
            abridgeAttributionPercent: driverInputs.edThroughput.abridgeAttributionPercent,
            avgEdVisitRevenue: driverInputs.edThroughput.avgEdVisitRevenue,
            includeAdmissions: driverInputs.edThroughput.includeAdmissions,
            admissionPercent: driverInputs.edThroughput.admissionPercent,
            avgAdmissionRevenue: driverInputs.edThroughput.avgAdmissionRevenue,
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
            burnoutAttribution: driverInputs.inpatientRetention.burnoutAttribution,
            abridgeImpact: driverInputs.inpatientRetention.abridgeImpact,
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
            docRelatedPct: driverInputs.inpatientDenials.docRelatedPct,
            writeOffPct: driverInputs.inpatientDenials.writeOffPct,
            captureRate: driverInputs.inpatientDenials.captureRate,
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
  
  const renderDriverAccordion = (driverId: string, index: number = 0) => {
    const isExpanded = expandedDriver === driverId;
    const isReviewed = reviewedDrivers.has(driverId);
    const Icon = DRIVER_ICONS[driverId] || Calculator;
    const value = driverResults[driverId]?.value || 0;
    const isFirstDriver = index === 0;
    const shouldGlow = isFirstDriver && showFirstDriverGlow && !isExpanded && !isReviewed;
    
    return (
      <div 
        key={driverId}
        id={`driver-accordion-${driverId}`}
        className={`border rounded-xl overflow-visible bg-white transition-all duration-200 cursor-pointer group ${
          isExpanded 
            ? 'border-[#EA2C00] shadow-md' 
            : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md hover:-translate-y-0.5'
        } ${shouldGlow ? 'animate-[subtle-glow_2s_ease-in-out]' : ''}`}
        style={shouldGlow ? {
          animation: 'subtle-glow 2s ease-in-out'
        } : undefined}
      >
        <button
          onClick={(e) => {
            const wasExpanded = isExpanded;
            setExpandedDriver(isExpanded ? null : driverId);
            if (!isReviewed) {
              setReviewedDrivers(prev => new Set(Array.from(prev).concat(driverId)));
            }
            // Scroll to top of card when expanding
            if (!wasExpanded) {
              setTimeout(() => {
                const element = document.getElementById(`driver-accordion-${driverId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 50);
            }
          }}
          className="w-full flex items-center justify-between p-4 transition-colors"
          data-testid={`accordion-${driverId}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              isExpanded ? 'bg-[rgba(234,44,0,0.1)]' : 'bg-neutral-100 group-hover:bg-neutral-200'
            }`}>
              <Icon className={`w-5 h-5 ${isExpanded ? 'text-[#EA2C00]' : 'text-neutral-600'}`} />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-[#111827]">{DRIVER_NAMES[driverId]}</span>
              {isReviewed && !isExpanded && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Customized
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isExpanded && !isReviewed && (
              <span className="text-xs text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                Click to customize
              </span>
            )}
            <span className="font-mono font-semibold text-emerald-600 text-lg">{formatCurrency(value)}</span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              isExpanded ? 'bg-[#EA2C00]' : 'bg-neutral-100 group-hover:bg-neutral-200'
            }`}>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-white" />
              ) : (
                <ChevronDown className={`w-4 h-4 ${!isReviewed ? 'text-[#EA2C00] animate-bounce' : 'text-neutral-500'}`} style={!isReviewed ? { animationDuration: '2s' } : undefined} />
              )}
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="border-t border-neutral-100 p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-[#EA2C00]" />
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
      case "nursingHAPI":
        return renderNursingHAPIInputs();
      case "nursingFalls":
        return renderNursingFallsInputs();
      case "nursingAgency":
        return renderNursingAgencyInputs();
      case "nursingRetention":
        return renderNursingRetentionInputs();
      case "nursingSurvey":
        return renderNursingSurveyInputs();
      case "nursingCareCoordination":
        return renderNursingCareCoordinationInputs();
      case "nursingPatientExperience":
        return renderNursingPatientExperienceInputs();
      case "edPatientExperience":
        return renderEDPatientExperienceInputs();
      default:
        return null;
    }
  };
  
  const renderOvertimeInputs = () => {
    const {
      locumProviders,
      locumHoursPerWeek,
      locumWeeksPerYear,
      docDrivenPercent,
      abridgeReductionRate,
      locumHourlyRate,
    } = driverInputs.overtime;

    // LOCUM COST AVOIDANCE CALCULATIONS (4-step)
    // Step 1: Current Locum Usage
    const annualLocumHours = locumProviders * locumHoursPerWeek * locumWeeksPerYear;
    
    // Step 2: Documentation-Driven Usage
    const docDrivenHours = annualLocumHours * (docDrivenPercent / 100);
    
    // Step 3: Abridge Reduction
    const hoursReduced = docDrivenHours * (abridgeReductionRate / 100);
    
    // Step 4: Cost Savings
    const annualLocumSavings = hoursReduced * locumHourlyRate;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Locum coverage is expensive—typically $200-300/hr plus agency fees. Organizations use locums 
                to fill gaps when permanent staff can't keep up with patient demand. When documentation 
                efficiency improves, your permanent providers have more capacity, reducing the need for locum coverage.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Locum Usage */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Locum Usage</p>
          <p className="text-xs text-[#6B7280]">How many locum hours are you using today to meet patient demand?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Locum Providers</label>
              <EditableNumberInput
                value={locumProviders}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumProviders: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="locum-providers-input"
              />
            </div>
            <span className="text-neutral-400 pb-1 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Hrs/Week</label>
              <EditableNumberInput
                value={locumHoursPerWeek}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumHoursPerWeek: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="locum-hours-per-week-input"
              />
            </div>
            <span className="text-neutral-400 pb-1 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Weeks/Yr</label>
              <EditableNumberInput
                value={locumWeeksPerYear}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumWeeksPerYear: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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

        {/* Step 2: Documentation-Driven Usage */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Driven Usage</p>
          <p className="text-xs text-[#6B7280]">How much locum usage is driven by documentation inefficiency?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(annualLocumHours).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">×</span>
              <EditableNumberInput
                value={docDrivenPercent}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, docDrivenPercent: val } }))}
                className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="locum-doc-driven-input"
              />
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(docDrivenHours).toLocaleString()} hrs
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Not all locum usage is reducible—some covers PTO, leave, or true demand spikes. We conservatively 
            estimate 1/3 of locum hours exist because permanent staff lose capacity to documentation burden.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Reduction */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Reduction</p>
          <p className="text-xs text-[#6B7280]">How much can Abridge reduce?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(docDrivenHours).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">×</span>
              <EditableNumberInput
                value={abridgeReductionRate}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, abridgeReductionRate: val } }))}
                className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="locum-reduction-rate-input"
              />
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(hoursReduced).toLocaleString()} hrs reduced
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge returns documentation time to providers, increasing their effective capacity. 
            We estimate 50% of documentation-driven locum hours can be eliminated.
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
                {Math.round(hoursReduced).toLocaleString()} hrs
              </div>
              <span className="text-neutral-400">×</span>
              <span className="text-sm text-[#6B7280]">$</span>
              <EditableNumberInput
                value={locumHourlyRate}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, overtime: { ...prev.overtime, locumHourlyRate: val } }))}
                className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
        </div>

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Locum Rates
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Primary Care Locum</span>
              <span className="font-mono text-slate-700">$150 - $200/hr</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Specialty Locum</span>
              <span className="font-mono text-slate-700">$250 - $350/hr</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Blended Average</span>
              <span className="font-mono text-slate-700">~$275/hr</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Locum rates include agency fees and premium pay. Rates vary by specialty and market.
          </p>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Locum Cost Avoidance</span>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(Math.round(annualLocumSavings))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(hoursReduced).toLocaleString()} locum hours avoided × ${locumHourlyRate}/hr
          </p>
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                When clinicians spend less time on documentation, they have capacity to see additional patients. 
                Not all saved time converts to visits—scheduling, room availability, and demand limit realization—but 
                even a modest portion creates meaningful revenue.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Time Returned */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Time Returned</p>
          <p className="text-xs text-[#6B7280]">How much time does Abridge give back?</p>
          
          <div className="flex items-end gap-3 flex-wrap">
            <div className="text-center">
              <label className="text-xs text-[#6B7280] block mb-1">Encounters</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5 min-w-[70px]">
                {eligibleEncounters.toLocaleString()}
              </div>
            </div>
            <div className="text-neutral-400 pb-2">×</div>
            <div className="text-center">
              <label className="text-xs text-[#6B7280] block mb-1">Utilization</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-3 py-1.5 min-w-[50px]">
                {utilizationRate}%
              </div>
            </div>
            <div className="text-neutral-400 pb-2">×</div>
            <div className="text-center">
              <label className="text-xs text-[#6B7280] block mb-1">Time Saved</label>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={timeSavedPerEncounter}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, timeSavedPerEncounter: val } }))}
                  step="0.1"
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="pa-time-saved-input"
                />
                <span className="text-xs text-[#6B7280]">min</span>
              </div>
            </div>
            <div className="text-neutral-400 pb-2">=</div>
            <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
              {Math.round(hoursReturned).toLocaleString()} hrs
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
              <EditableNumberInput
                value={accessAllocation}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, accessAllocation: val } }))}
                className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            We assume saved time splits: 1/2 quality of life, 1/4 access, 1/4 cost reduction
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
              <EditableNumberInput
                value={conversionRate}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, conversionRate: val } }))}
                className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            Conversion depends on patient demand, room availability, and scheduling capacity. 60% is conservative. Practices with high patient demand and scheduling backlog may see 70-80% conversion.
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
                className="w-16 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Adjust based on specialty. Primary care averages 20-30 min/visit, specialty may be 30-45 min.
          </p>
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
              <FormattedNumberInput
                value={revenuePerVisit}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, patientAccess: { ...prev.patientAccess, revenuePerVisit: val } }))}
                className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
              <span className="font-mono text-[#EA2C00] font-medium">${revenuePerVisit} (blended)</span>
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Documentation burden is the #1 driver of physician burnout. Reducing this burden improves 
                satisfaction and retention. Replacing a physician costs $400K-$800K+ when you factor in 
                recruiting, lost revenue during vacancy, and onboarding.
              </p>
            </div>
          </div>
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
                  <EditableNumberInput
                    value={turnoverRate}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, turnoverRate: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
                <EditableNumberInput
                  value={burnoutAttribution}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, burnoutAttribution: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ret-burnout-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {preventableDepartures.toFixed(2)} burnout-related
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
                <EditableNumberInput
                  value={abridgeImpact}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, abridgeImpact: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
              <FormattedNumberInput
                value={replacementCost}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, retention: { ...prev.retention, replacementCost: val } }))}
                className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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

        {/* Benchmark Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Benchmark: Physician Replacement Cost
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Recruiting + signing bonus</span>
              <span className="font-mono text-slate-700">$50K - $100K</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Lost revenue (vacancy)</span>
              <span className="font-mono text-slate-700">$250K - $500K</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Onboarding</span>
              <span className="font-mono text-slate-700">$30K - $75K</span>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-700 font-medium">Total</span>
              <span className="font-mono text-slate-700 font-medium">$400K - $800K</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">Your input</span>
              <span className="font-mono text-[#EA2C00] font-medium">{formatCurrency(replacementCost)}</span>
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
          <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
            Retention impact measurable after 12-18 months. Earlier indicators include improved satisfaction scores and reduced burnout reports.
          </p>
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Physicians under time pressure document less than the full clinical picture. 
                AI-assisted documentation captures the complexity that supports accurate coding—not 
                upcoding, just getting credit for work already done.
              </p>
            </div>
          </div>
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
                <EditableNumberInput
                  value={avgWrvuPerEncounter}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, avgWrvuPerEncounter: val } }))}
                  className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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

          {/* Benchmark Box */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 mt-3">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Benchmark: wRVU per Encounter
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Primary Care</span>
                <span className="font-mono text-slate-700">1.2 - 1.5</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Specialty</span>
                <span className="font-mono text-slate-700">1.5 - 2.5</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Procedural</span>
                <span className="font-mono text-slate-700">2.5 - 4.0+</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Your input</span>
                <span className="font-mono text-[#EA2C00] font-medium">{avgWrvuPerEncounter}</span>
              </div>
            </div>
          </div>
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
                <EditableNumberInput
                  value={wrvuImprovementRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, wrvuImprovementRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            Abridge improves wRVU capture by 5% through more complete documentation of clinical complexity. Complete HPI, ROS, and medical decision-making supports appropriate E&M level coding (e.g., 99214 vs 99213)—not upcoding, just accurate coding for work already performed.
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
              <EditableNumberInput
                value={conversionFactor}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, levelOfService: { ...prev.levelOfService, conversionFactor: val } }))}
                className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Risk adjustment relies on complete documentation of chronic conditions. Physicians 
                discuss multiple conditions per visit, but time pressure means not all make it to 
                the note. Abridge captures what's said, recovering HCC opportunities that would 
                otherwise be missed.
              </p>
            </div>
          </div>
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
                  <EditableNumberInput
                    value={riskContractPercent}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, riskContractPercent: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
                <EditableNumberInput
                  value={conditionsPerVisit}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, conditionsPerVisit: val } }))}
                  className="w-16 text-center text-sm h-7"
                  step="0.5"
                  data-testid="hcc-conditions-input"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">× Documentation gap:</span>
                <div className="flex items-center gap-1">
                  <EditableNumberInput
                    value={documentationGap}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, documentationGap: val } }))}
                    className="w-14 text-center text-sm h-7"
                    data-testid="hcc-doc-gap-input"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600">× HCC-eligible portion:</span>
                <div className="flex items-center gap-1">
                  <EditableNumberInput
                    value={hccEligiblePercent}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, hccEligiblePercent: val } }))}
                    className="w-14 text-center text-sm h-7"
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
              Not every condition discussed is documented, and not every undocumented condition is HCC-eligible. This means roughly 1 in 7 risk encounters has a missed HCC opportunity.
            </p>
          </div>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Capture */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Capture</p>
          <p className="text-xs text-[#6B7280]">How many can Abridge capture?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(missedHccOpportunities).toLocaleString()} opportunities
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeCaptureRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, abridgeCaptureRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
                <FormattedNumberInput
                  value={avgHccValue}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, avgHccValue: val } }))}
                  className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="hcc-value-input"
                />
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={auditFactor}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, hcc: { ...prev.hcc, auditFactor: val } }))}
                  className="w-14 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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

        {/* Why 25% Audit Factor */}
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
          <p className="text-xs text-slate-500 mt-2">
            HCC value represents the annual risk adjustment payment associated with each captured condition.
          </p>
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                Most denials are recoverable—you appeal, you win, it just costs time. But a portion 
                of documentation-related denials are written off without appeal, either because the 
                documentation lacks the specificity to support medical necessity or the rework cost 
                exceeds the claim value. Abridge captures the clinical detail and reasoning that saves these.
              </p>
            </div>
          </div>
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
                  <EditableNumberInput
                    value={denialRate}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, denialRate: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            Outpatient denial rates average 5-8%. Lower than ED but still significant volume.
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
                <EditableNumberInput
                  value={docRelatedPercent}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, docRelatedPercent: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            30-40% of outpatient denials stem from documentation gaps: insufficient detail to support medical necessity, level of service not justified, or diagnosis specificity lacking.
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
                <EditableNumberInput
                  value={writtenOffPercent}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, writtenOffPercent: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            These claims are abandoned—either the documentation can't support an appeal, or the claim value doesn't justify the rework cost. Smaller outpatient claims are written off more frequently than higher-value ED claims.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: Abridge Prevention */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Abridge Prevention</p>
          <p className="text-xs text-[#6B7280]">How many can Abridge prevent?</p>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(writtenOffDenials).toLocaleString()} written off
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeCaptureRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, abridgeCaptureRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="denials-capture-rate-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(claimsRecovered).toLocaleString()} prevented
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge captures the clinical reasoning, diagnostic specificity, and medical decision-making that supports medical necessity and level of service. We estimate Abridge prevents 50% of documentation-related write-offs by ensuring complete documentation at the point of care.
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
              <FormattedNumberInput
                value={avgClaimValue}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, denials: { ...prev.denials, avgClaimValue: val } }))}
                className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            {Math.round(claimsRecovered).toLocaleString()} claims preserved × ${avgClaimValue} avg claim value
          </p>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // ED DRIVER INPUT RENDERERS
  // ============================================================================
  
  const renderEdThroughputInputs = () => {
    const { annualEdVisits, lwbsRate, improvementRate, abridgeAttributionPercent, avgEdVisitRevenue, includeAdmissions, admissionPercent, avgAdmissionRevenue } = driverInputs.edThroughput;

    // ED PATIENT THROUGHPUT (LWBS) CALCULATIONS (5-step)
    // Step 1: Current LWBS
    const patientsLeaving = annualEdVisits * (lwbsRate / 100);
    
    // Step 2: Patients Retained
    const patientsRetained = patientsLeaving * (improvementRate / 100);
    
    // Step 2.5: Attributed to Abridge
    const patientsAttributedToAbridge = patientsRetained * (abridgeAttributionPercent / 100);
    
    // Step 3: Revenue Mix (using attributed patients)
    let edVisitPatients, admissionPatients, edVisitRevenue, admissionRevenue;
    if (includeAdmissions) {
      edVisitPatients = patientsAttributedToAbridge * (1 - admissionPercent / 100);
      admissionPatients = patientsAttributedToAbridge * (admissionPercent / 100);
      edVisitRevenue = edVisitPatients * avgEdVisitRevenue;
      admissionRevenue = admissionPatients * avgAdmissionRevenue;
    } else {
      edVisitPatients = patientsAttributedToAbridge;
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                When patients leave without being seen, you lose that revenue entirely. Faster documentation 
                means faster throughput, shorter wait times, and fewer walkouts. Some retained patients 
                are simple ED visits—but some would have been admitted.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current LWBS */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current LWBS</p>
          <p className="text-xs text-[#6B7280]">How many patients are you losing?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Modeled ED Visits</label>
                <FormattedNumberInput
                  value={annualEdVisits}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, annualEdVisits: val } }))}
                  className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-annual-visits-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">LWBS Rate</label>
                <div className="flex items-center gap-1">
                  <EditableNumberInput
                    value={lwbsRate}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, lwbsRate: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
          <p className="text-xs text-[#6B7280]">How many could be retained with faster throughput?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(patientsLeaving).toLocaleString()} leaving
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={improvementRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, improvementRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            Faster documentation = faster throughput = shorter waits. 10% LWBS reduction is conservative for high-LWBS EDs.
          </p>
        </div>

        <StepDivider />

        {/* Step 2.5: Attributed to Abridge */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2.5: Attributed to Abridge</p>
          <p className="text-xs text-[#6B7280]">What % of retention is due to Abridge's impact?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(patientsRetained).toLocaleString()} patients retained
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeAttributionPercent}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, abridgeAttributionPercent: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  min={20}
                  max={50}
                  data-testid="ed-abridge-attribution-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(patientsAttributedToAbridge).toLocaleString()} patients attributed to Abridge
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge specifically impacts ED throughput through faster documentation (3 min/encounter), reduced after-visit work, and improved handoffs. Industry data suggests ambient AI accounts for 30-40% of measurable throughput improvements when combined with other ED optimization efforts.
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
                <FormattedNumberInput
                  value={avgEdVisitRevenue}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, avgEdVisitRevenue: val } }))}
                  className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
                    className="w-4 h-4 rounded border-neutral-300 text-[#EA2C00] focus:ring-[#EA2C00]"
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
                <p className="text-xs text-[#6B7280]">Include admission revenue for attributed patients</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <EditableNumberInput
                      value={admissionPercent}
                      onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, admissionPercent: val } }))}
                      className="w-14 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                      data-testid="ed-admission-percent-input"
                    />
                    <span className="text-xs text-[#6B7280]">%</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">of {Math.round(patientsAttributedToAbridge).toLocaleString()} =</span>
                  <div className="font-mono text-sm bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5">
                    {Math.round(admissionPatients).toLocaleString()} patients
                  </div>
                  <span className="text-neutral-400">×</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[#6B7280]">$</span>
                    <FormattedNumberInput
                      value={avgAdmissionRevenue}
                      onChange={(val) => setDriverInputs(prev => ({ ...prev, edThroughput: { ...prev.edThroughput, avgAdmissionRevenue: val } }))}
                      className="w-24 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                      data-testid="ed-admission-revenue-input"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                  LWBS patients skew lower acuity, so admission rate (12%) is below typical ED average (15-20%). Varies by hospital acuity. Adjust if needed.
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                ED physicians face extreme burnout—over 65% report symptoms. Documentation burden extends shifts 
                and destroys work-life balance. Reducing this burden improves retention. Replacing an ED physician 
                costs $750K-$1.2M when you factor in recruiting, signing bonuses, and coverage gaps.
              </p>
            </div>
          </div>
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
                <EditableNumberInput
                  value={edPhysicians}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, edPhysicians: val } }))}
                  className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-ret-physicians-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Turnover Rate</label>
                <div className="flex items-center gap-1">
                  <EditableNumberInput
                    value={turnoverRate}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, turnoverRate: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            ED turnover averages 10-15%. High-stress EDs often see 15-20%+
          </p>
        </div>

        <StepDivider />

        {/* Step 2: Burnout-Related Departures */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Burnout-Related Departures</p>
          <p className="text-xs text-[#6B7280]">How many departures are burnout-related?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {annualDepartures.toFixed(1)} departures
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={burnoutAttribution}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, burnoutAttribution: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-ret-burnout-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {preventableDepartures.toFixed(2)} burnout-related
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            50% of ED departures cite burnout as a primary factor. Documentation burden is consistently ranked as a top-3 contributor to ED burnout, alongside acuity, pace, and staffing.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Attribution */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Attribution</p>
          <p className="text-xs text-[#6B7280]">What portion of burnout can Abridge address?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {preventableDepartures.toFixed(2)} burnout-related
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeImpact}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, abridgeImpact: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-ret-abridge-impact-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {departuresAvoided.toFixed(2)} annual turnover risk reduced
              </div>
            </div>
          </div>

          {/* Why 10%? Explanation Box */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 mt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Why 10%?
            </p>
            <p className="text-xs text-slate-600">
              ED burnout has multiple drivers—pace, acuity, shifts, high-stakes decisions. Documentation burden is ONE major addressable factor. 
              We conservatively estimate Abridge impacts 10% of burnout-related turnover by eliminating after-shift charting 
              and reducing documentation stress. In Abridge user surveys, ED physicians report significantly reduced administrative burden and improved work-life balance.
            </p>
          </div>
        </div>

        <StepDivider />

        {/* Step 4: Annual Cost Avoidance */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Annual Cost Avoidance</p>
          <p className="text-xs text-[#6B7280]">What's the annual value of reduced turnover risk?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {departuresAvoided.toFixed(2)} avoided
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <FormattedNumberInput
                  value={replacementCost}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edRetention: { ...prev.edRetention, replacementCost: val } }))}
                  className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-ret-replacement-cost-input"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-semibold text-emerald-600">
                {formatCurrency(Math.round(annualRetentionSavings))} Annual Value
              </div>
            </div>
          </div>
        </div>

        {/* Understanding Turnover Risk Reduction Box */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Understanding Turnover Risk Reduction
          </p>
          <p className="text-xs text-slate-600">
            Reducing turnover by {departuresAvoided.toFixed(2)} physicians/year means you're lowering your annual probability of costly departures. 
            Even fractional retention creates real savings through reduced recruiting, signing bonuses, locum coverage, and lost productivity. 
            Over 5-7 years, this compounds to retaining 1+ additional physician.
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            5+ year investment horizon
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
            Retention impact measurable after 12-18 months. Earlier indicators include reduced burnout scores and improved documentation satisfaction.
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
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                ED physicians under time pressure document less than the full clinical picture—especially during 
                high-volume surges. AI-assisted documentation captures the complexity that supports accurate coding.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Baseline wRVUs */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline wRVUs</p>
          <p className="text-xs text-[#6B7280]">What's your current productivity?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Modeled ED Visits</label>
                <FormattedNumberInput
                  value={annualEdVisits}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, annualEdVisits: val } }))}
                  className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-los-visits-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Avg wRVU/Encounter</label>
                <EditableNumberInput
                  step="0.1"
                  value={avgWrvuPerEncounter}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, avgWrvuPerEncounter: val } }))}
                  className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
                <EditableNumberInput
                  value={wrvuImprovementRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, wrvuImprovementRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            Abridge improves wRVU capture by 3% through more complete documentation of clinical complexity. 
            Specifically, Abridge captures critical E&M elements—detailed HPI, comprehensive review of systems, 
            and medical decision-making complexity—that support appropriate level coding. When documentation fully 
            reflects the work performed, visits can be accurately coded at the appropriate E&M level (e.g., 99284 vs 99283) 
            rather than conservatively downcoded due to incomplete notes. This isn't upcoding—it's accurate coding based on the clinical picture.
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
                <EditableNumberInput
                  value={conversionFactor}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edLevelOfService: { ...prev.edLevelOfService, conversionFactor: val } }))}
                  className="w-20 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
    const { documentedEncounters, denialRate, docRelatedPercent, abridgeCaptureRate, avgClaimValue } = driverInputs.edDenials;

    // ED DOCUMENTATION-RELATED DENIALS (4-step)
    // Step 1: Total Denials
    const totalDenials = documentedEncounters * (denialRate / 100);
    
    // Step 2: Unrecoverable Due to Documentation (10% of total denials)
    const unrecoverableDenials = totalDenials * (docRelatedPercent / 100);
    
    // Step 3: Abridge Prevention (50% of unrecoverable)
    const claimsPrevented = unrecoverableDenials * (abridgeCaptureRate / 100);
    
    // Step 4: Value Preserved
    const annualValue = claimsPrevented * avgClaimValue;

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );

    return (
      <div className="space-y-6">
        {/* Theory Box */}
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-800">The Theory</p>
              <p className="text-sm text-blue-700 leading-relaxed">
                ED claims face intense payer scrutiny. When denials happen, most can be recovered through 
                appeals and rework—but some are written off entirely because the clinical reasoning was 
                never documented. Abridge captures the context that prevents these unrecoverable write-offs.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Total Denials */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Total Denials</p>
          <p className="text-xs text-[#6B7280]">How many claims are denied?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Documented Encounters</label>
                <FormattedNumberInput
                  value={documentedEncounters}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, documentedEncounters: val } }))}
                  className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-denials-encounters-input"
                />
              </div>
              <span className="text-neutral-400 pt-5">×</span>
              <div>
                <label className="text-xs text-[#6B7280] block mb-1">Denial Rate</label>
                <div className="flex items-center gap-1">
                  <EditableNumberInput
                    value={denialRate}
                    onChange={(val) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, denialRate: val } }))}
                    className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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

        {/* Step 2: Unrecoverable Due to Documentation */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Unrecoverable Due to Documentation</p>
          <p className="text-xs text-[#6B7280]">How many are written off due to missing documentation?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {totalDenials.toLocaleString()} denials
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={docRelatedPercent}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, docRelatedPercent: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-denials-doc-related-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {unrecoverableDenials.toLocaleString()} unrecoverable
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Roughly 10% of ED denials are written off because the clinical reasoning was never documented 
            and can't be reconstructed after the fact. These aren't appeal failures—they're documentation 
            that never existed.
          </p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Prevention */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Prevention</p>
          <p className="text-xs text-[#6B7280]">What % can Abridge prevent?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {unrecoverableDenials.toLocaleString()} unrecoverable
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeCaptureRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, abridgeCaptureRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="ed-denials-capture-input"
                />
                <span className="text-xs text-[#6B7280]">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">=</span>
              <div className="bg-white border border-neutral-200 rounded px-3 py-1.5 font-mono text-sm font-medium">
                {Math.round(claimsPrevented).toLocaleString()} prevented
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded mt-2">
            Abridge captures the clinical reasoning, medical necessity, and decision-making that ED physicians 
            think but don't document under time pressure. We conservatively estimate Abridge prevents 50% of 
            unrecoverable documentation denials by capturing this context at the point of care—before it's lost.
          </p>
        </div>

        <StepDivider />

        {/* Step 4: Value Preserved */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Value Preserved</p>
          <p className="text-xs text-[#6B7280]">What's the revenue impact?</p>
          
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5">
                {Math.round(claimsPrevented).toLocaleString()} prevented
              </div>
              <span className="text-neutral-400">×</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <FormattedNumberInput
                  value={avgClaimValue}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, edDenials: { ...prev.edDenials, avgClaimValue: val } }))}
                  className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
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
            {Math.round(claimsPrevented).toLocaleString()} claims preserved × ${avgClaimValue}
          </p>
        </div>
      </div>
    );
  };
  
  // Inpatient render functions
  const renderInpatientRetentionInputs = () => {
    const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.inpatientRetention;
    
    // Step 1: Baseline Turnover
    const annualDepartures = providers * (turnoverRate / 100);
    // Step 2: Burnout-Related
    const preventableDepartures = annualDepartures * (burnoutAttribution / 100);
    // Step 3: Abridge Attribution
    const departuresAvoided = preventableDepartures * (abridgeImpact / 100);
    // Step 4: Cost Savings
    const annualValue = departuresAvoided * replacementCost;
    // Years to retain one hospitalist
    const yearsToRetainOne = departuresAvoided > 0 ? 1 / departuresAvoided : 0;
    
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Hospitalists spend 2+ hours per day on documentation — much of it after rounds or at home. This drives burnout and turnover. Replacing a hospitalist costs $400-600K when you factor in recruiting, lost revenue, and onboarding.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Baseline Turnover */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline Turnover</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the current turnover situation?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Hospitalists</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{providers}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Turnover Rate</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={turnoverRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, turnoverRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-retention-turnover-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{annualDepartures.toFixed(1)} departures/year</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Hospitalist turnover averages 15-20%. Higher than most specialties due to workload and schedule demands.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Burnout-Related */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Burnout-Related</span>
          </div>
          <p className="text-sm text-[#6B7280]">How much is burnout-driven?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Annual Departures</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{annualDepartures.toFixed(1)}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Burnout Attribution</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={burnoutAttribution}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, burnoutAttribution: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-retention-burnout-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{preventableDepartures.toFixed(1)} burnout-related</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            ~50% of hospitalist departures cite burnout as a primary factor. Documentation burden is consistently the top complaint.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: Abridge Attribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Attribution</span>
          </div>
          <p className="text-sm text-[#6B7280]">What can Abridge prevent?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Preventable</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{preventableDepartures.toFixed(1)}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Abridge Impact</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={abridgeImpact}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, abridgeImpact: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-retention-impact-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{departuresAvoided.toFixed(2)} departures avoided</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Documentation is a major burnout driver, but not the only one. We conservatively estimate Abridge impacts 30% of burnout-related turnover.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 4: Cost Savings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Departures Avoided</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{departuresAvoided.toFixed(2)}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Replacement Cost</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <FormattedNumberInput
                  value={replacementCost}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientRetention: { ...prev.inpatientRetention, replacementCost: val } }))}
                  className="w-28 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-retention-cost-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-emerald-600">{formatCurrency(Math.round(annualValue))}</span>
          </div>
          
          {/* Benchmark: Hospitalist Replacement Cost */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs font-semibold text-[#6B7280]">Benchmark: Hospitalist Replacement Cost</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>Recruiting + signing bonus</span><span className="font-mono">$75K - $150K</span></div>
              <div className="flex justify-between"><span>Lost revenue during vacancy</span><span className="font-mono">$250K - $400K</span></div>
              <div className="flex justify-between"><span>Onboarding & ramp-up</span><span className="font-mono">$50K - $75K</span></div>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Total: $400K - $600K
            </p>
          </div>
          
          {/* What This Means */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-800">What This Means</span>
            </div>
            <div className="text-xs text-blue-800">
              <p>Over ~{yearsToRetainOne.toFixed(1)} years, expect to retain 1 additional hospitalist you would have otherwise lost to burnout.</p>
              <p className="mt-2">
                <span className="font-medium">Total savings: </span>{formatCurrency(replacementCost)}
              </p>
              <p>
                <span className="font-medium">Annualized: </span>{formatCurrency(Math.round(annualValue))}/year
              </p>
            </div>
          </div>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="inpatient-retention-result">
              {formatCurrency(Math.round(annualValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {departuresAvoided.toFixed(2)} departures avoided × ${replacementCost.toLocaleString()} replacement cost
          </p>
        </div>
        
        {/* Timeline Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Retention impact typically measurable after 12-18 months. Earlier indicators include improved satisfaction scores and reduced burnout reports.
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
                Incomplete documentation costs you twice. First, at coding—when conditions discussed at bedside aren't captured, DRGs are assigned lower than clinically appropriate. Second, after submission—when payers deny claims because medical necessity, level of care, or status criteria weren't documented. Both stem from the same root cause: documentation gaps. Abridge captures the clinical reasoning that prevents both.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Admissions at Risk of Downcoding */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Admissions at Risk of Downcoding</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many admissions are at risk of downcoding?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Documented Admissions</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{eligibleEncounters.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">At-Risk Rate</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={gapRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, gapRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-ccmcc-gap-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(opportunities).toLocaleString()} admissions at risk</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            20-30% of admissions have documentation gaps that affect final DRG assignment—conditions discussed but not documented, clinical complexity not fully captured. We use 25% as a moderate estimate.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Abridge Protection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Abridge Protection</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many can Abridge protect?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">At Risk</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(opportunities).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Protection Rate</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={improvementRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, improvementRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-ccmcc-improvement-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(admissionsImproved).toLocaleString()} admissions protected</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Abridge captures clinical discussions that would otherwise be lost. We estimate 25% of at-risk admissions are protected through more complete initial documentation—the complexity was discussed, now it's documented.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: Revenue Protected */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Revenue Protected</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the value of prevented downcoding?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Admissions Protected</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(admissionsImproved).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">DRG Weight Increase</span>
              <EditableNumberInput
                value={drgWeightIncrease}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, drgWeightIncrease: val } }))}
                className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                step="0.1"
                data-testid="inpatient-ccmcc-drg-weight-input"
              />
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Base DRG Payment</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <EditableNumberInput
                  value={baseDrgPayment}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, baseDrgPayment: val } }))}
                  className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-ccmcc-base-drg-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{formatCurrency(Math.round(grossImpact))} protected (gross)</span>
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
              0.4 represents the average DRG weight difference when documentation gaps cause downcoding. Higher acuity facilities may see 0.5-0.6.
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
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={realizationRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCCMCC: { ...prev.inpatientCCMCC, realizationRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-ccmcc-realization-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-emerald-600">{formatCurrency(Math.round(annualValue))} net</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            50% haircut accounts for RAC/PEPPER audits, coder discretion, cases where documentation doesn't change final code, and retrospective adjustments. This is revenue you can actually count on.
          </p>
        </div>

        {/* What This Includes */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">What This Includes</p>
          <p className="text-sm text-blue-800 mb-3">
            This calculation captures two types of revenue protection:
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-blue-900">DRG Accuracy</p>
              <p className="text-sm text-blue-800">
                Conditions discussed but not documented lead to lower DRG assignments. Abridge captures clinical complexity upfront, ensuring accurate coding the first time.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">Denial Prevention</p>
              <p className="text-sm text-blue-800">
                Documentation gaps also cause post-submission denials—medical necessity not supported, level of care not justified, IP vs Obs status unclear. The same documentation that improves DRG accuracy also reduces denial write-offs.
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-800 mt-3">
            We combine these into a single value to avoid double-counting. Both stem from the same Abridge capability: capturing what's discussed at bedside.
          </p>
        </div>

        {/* Benchmark: Documentation-Driven Revenue Leakage */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: Documentation-Driven Revenue Leakage</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">DRG downcoding</span>
              <span className="font-mono text-[#111827]">2-4% of inpatient revenue</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Denial write-offs</span>
              <span className="font-mono text-[#111827]">1-2% of inpatient revenue</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
              <span className="text-[#6B7280] font-medium">Combined opportunity</span>
              <span className="font-mono text-[#111827] font-medium">3-6% of inpatient revenue</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-3">
            This calculator conservatively estimates Abridge captures 15-25% of this leakage.
          </p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Revenue Protected (DRG Accuracy + Denial Prevention)</span>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="inpatient-ccmcc-result">
              {formatCurrency(Math.round(annualValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Includes DRG accuracy improvement and denial prevention from complete documentation
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
                Many CDI queries are simply asking physicians to document what they already discussed with the patient. When Abridge captures these conversations automatically, the query becomes unnecessary — freeing CDI to focus on complex cases.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Query Volume */}
        <div className="space-y-3">
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
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={queryRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, queryRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-cdi-query-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(annualQueries).toLocaleString()} queries/year</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            CDI query rates typically range 20-40% of admissions. 30% is average for most health systems.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Queries Avoided */}
        <div className="space-y-3">
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
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={reductionRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, reductionRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-cdi-reduction-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(queriesAvoided).toLocaleString()} queries avoided</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            When initial documentation is complete, CDI doesn't need to query. 25% is conservative—many queries ask for info that was discussed but not documented. Common examples: severity of illness indicators, clinical indicators for conditions like malnutrition or encephalopathy, and specificity on diagnoses already discussed at bedside.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: Operational Savings */}
        <div className="space-y-3">
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
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <EditableNumberInput
                  value={costPerQuery}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientCDI: { ...prev.inpatientCDI, costPerQuery: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-cdi-cost-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-emerald-600">{formatCurrency(Math.round(annualSavings))}</span>
          </div>
          
          {/* Benchmark: Cost per Query */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs font-semibold text-[#6B7280]">Benchmark: Cost per Query</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>CDI Specialist time (research, write, follow-up)</span><span className="font-mono">20-30 min</span></div>
              <div className="flex justify-between"><span>Physician time (read, respond)</span><span className="font-mono">5-10 min</span></div>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Fully loaded cost: $50-$100 per query. We use $50 conservatively.
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
            {Math.round(queriesAvoided).toLocaleString()} queries avoided × ${costPerQuery} per query
          </p>
        </div>
        
        {/* Complementary Note */}
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-xs text-[#6B7280]">
            Query reduction and DRG accuracy are complementary. Fewer queries means faster, more accurate coding—and the documentation that avoids queries is the same documentation that supports accurate DRG assignment.
          </p>
        </div>
        
        {/* Additional Benefit Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Additional benefit: Faster DRG finalization → faster billing cycles.
          </p>
        </div>
      </div>
    );
  };
  
  const renderInpatientDenialsInputs = () => {
    const { denialRate, docRelatedPct, writeOffPct, captureRate, avgClaimValue } = driverInputs.inpatientDenials;
    
    // Step 1: Total Denials
    const totalDenials = eligibleEncounters * (denialRate / 100);
    // Step 2: Documentation-Related
    const docDenials = totalDenials * (docRelatedPct / 100);
    // Step 3: Written Off
    const writtenOff = docDenials * (writeOffPct / 100);
    // Step 4: Abridge Recovery
    const claimsRecovered = writtenOff * (captureRate / 100);
    // Step 5: Value Recovered
    const annualValue = claimsRecovered * avgClaimValue;
    
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Most inpatient denials are appealed due to high stakes — but some are lost forever when documentation can't support the claim. Medical necessity wasn't captured. Status criteria weren't documented. Abridge captures the clinical reasoning that makes the difference.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Total Denials */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Total Denials</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many claims are denied?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Admissions</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{eligibleEncounters.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Denial Rate</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={denialRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, denialRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-denials-rate-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(totalDenials).toLocaleString()} annual denials</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Inpatient denial rates typically range 5-10%. Varies by payer mix and case complexity.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 2: Documentation-Related */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Related</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many are caused by documentation gaps?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Total Denials</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(totalDenials).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Doc-Related %</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={docRelatedPct}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, docRelatedPct: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-denials-doc-related-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(docDenials).toLocaleString()} doc denials</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            35-40% of inpatient denials stem from documentation gaps: medical necessity, level of care, status (IP vs Obs).
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 3: Written Off */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Written Off</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many are lost without successful appeal?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Doc Denials</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(docDenials).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Write-Off %</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={writeOffPct}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, writeOffPct: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-denials-writeoff-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(writtenOff).toLocaleString()} claims written off</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Due to high claim values, most are appealed. But ~25% are ultimately written off — documentation can't support the appeal. These claims are lost forever.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 4: Abridge Recovery */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Abridge Recovery</span>
          </div>
          <p className="text-sm text-[#6B7280]">How many can Abridge save?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Written Off</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(writtenOff).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Capture Rate</span>
              <div className="flex items-center gap-1">
                <EditableNumberInput
                  value={captureRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, captureRate: val } }))}
                  className="w-16 text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-denials-capture-input"
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-[#111827]">{Math.round(claimsRecovered).toLocaleString()} claims recovered</span>
          </div>
          
          <p className="text-xs text-[#6B7280]">
            Abridge captures the clinical reasoning and medical necessity that physicians discuss but don't document — preventing denials or winning appeals.
          </p>
        </div>

        <div className="border-t border-dashed border-neutral-300" />

        {/* Step 5: Value Recovered */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 5: Value Recovered</span>
          </div>
          <p className="text-sm text-[#6B7280]">What's the revenue impact?</p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Claims Recovered</span>
              <div className="px-4 py-2 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-mono text-sm font-medium text-[#111827]">{Math.round(claimsRecovered).toLocaleString()}</span>
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">×</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#6B7280] mb-1">Avg Claim Value</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#6B7280]">$</span>
                <FormattedNumberInput
                  value={avgClaimValue}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, inpatientDenials: { ...prev.inpatientDenials, avgClaimValue: val } }))}
                  className="w-20 text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="inpatient-denials-claim-input"
                />
              </div>
            </div>
            <span className="text-lg text-[#6B7280]">=</span>
            <span className="font-mono font-semibold text-emerald-600">{formatCurrency(Math.round(annualValue))}</span>
          </div>
          
          {/* Benchmark: Inpatient Claim Value */}
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#6B7280]" />
              <span className="text-xs font-semibold text-[#6B7280]">Benchmark: Inpatient Claim Value</span>
            </div>
            <div className="space-y-1.5 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>Low complexity admission</span><span className="font-mono">$6,000 - $10,000</span></div>
              <div className="flex justify-between"><span>Medium complexity</span><span className="font-mono">$10,000 - $18,000</span></div>
              <div className="flex justify-between"><span>High complexity / ICU</span><span className="font-mono">$20,000 - $50,000+</span></div>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              Blended average: ~$12,000
            </p>
          </div>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Annual Value</span>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="inpatient-denials-result">
              {formatCurrency(Math.round(annualValue))}
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            {Math.round(claimsRecovered).toLocaleString()} claims recovered × ${avgClaimValue.toLocaleString()} avg claim
          </p>
        </div>
        
        {/* Revenue Cycle Note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Denial patterns vary by payer. Work with your revenue cycle team to validate rates for your specific payer mix.
          </p>
        </div>
      </div>
    );
  };
  
  // Nursing Driver Render Functions
  const renderNursingOvertimeInputs = () => {
    const { otHoursPerWeek, weeksPerYear, docRelatedPct, reductionRate, baseHourlyRate } = driverInputs.nursingOvertime;
    
    // Step 1: Current overtime = Nurses × Hours/Week × Weeks/Year
    const totalOTHours = nurseFTEs * otHoursPerWeek * weeksPerYear;
    // Step 2: Documentation-driven OT = Total OT × Doc-Related %
    const docDrivenOT = totalOTHours * (docRelatedPct / 100);
    // Step 3: Hours eliminated = Doc-Driven OT × Reduction Rate × Adoption
    const hoursEliminated = docDrivenOT * (reductionRate / 100) * (utilizationRate / 100);
    // Step 4: Cost savings = Hours × OT Rate (1.5×)
    const overtimeRate = baseHourlyRate * 1.5;
    const annualSavings = Math.round(hoursEliminated * overtimeRate);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );
    
    return (
      <div className="space-y-4">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Nurses often stay late completing documentation. By reducing charting time, nurses can finish their shifts on time—eliminating overtime hours that cost 1.5× regular pay. This creates immediate, measurable labor cost savings.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Overtime */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Overtime</p>
          <p className="text-xs text-[#6B7280]">How much OT exists today?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[60px]">
              <label className="text-xs text-[#6B7280] block mb-1">Nurse FTEs</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{nurseFTEs}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">OT Hrs/Week</label>
              <EditableNumberInput
                value={otHoursPerWeek}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, otHoursPerWeek: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="nursing-ot-hours-week-input"
              />
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Weeks/Year</label>
              <EditableNumberInput
                value={weeksPerYear}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, weeksPerYear: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="nursing-ot-weeks-year-input"
              />
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual OT</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {totalOTHours.toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Nursing OT averages 3-5 hours per nurse per week. Higher on understaffed units.</p>
        </div>

        <StepDivider />

        {/* Step 2: Documentation-Driven OT */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Driven OT</p>
          <p className="text-xs text-[#6B7280]">How much is charting catch-up?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Total OT Hrs</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{totalOTHours.toLocaleString()}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Doc-Related %</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={docRelatedPct}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, docRelatedPct: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-ot-doc-pct-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Doc-Driven OT</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(docDrivenOT).toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Not all OT is documentation. ~33% is end-of-shift charting catch-up that real-time ambient documentation can address.</p>
        </div>

        <StepDivider />

        {/* Step 3: Hours Eliminated */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Hours Eliminated</p>
          <p className="text-xs text-[#6B7280]">How much can real-time documentation prevent?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Doc-Driven OT</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(docDrivenOT).toLocaleString()}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Reduction %</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={reductionRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, reductionRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-ot-reduction-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[60px]">
              <label className="text-xs text-[#6B7280] block mb-1">Adoption</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{utilizationRate}%</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Hrs Eliminated</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(hoursEliminated).toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">{reductionRate}% reduction × {utilizationRate}% adoption = {Math.round((reductionRate / 100) * utilizationRate)}% of doc-driven OT eliminated.</p>
        </div>

        <StepDivider />

        {/* Step 4: Cost Savings */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
          <p className="text-xs text-[#6B7280]">What's the budget impact?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Hrs Eliminated</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(hoursEliminated).toLocaleString()}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">OT Rate</label>
              <div className="flex items-center">
                <span className="mr-1 text-[#6B7280]">$</span>
                <EditableNumberInput
                  value={baseHourlyRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingOvertime: { ...prev.nursingOvertime, baseHourlyRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-ot-hourly-input"
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">×1.5 = ${overtimeRate.toFixed(2)}</p>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual Savings</label>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {formatCurrency(annualSavings)}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: Nursing OT Rate</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Base RN hourly rate</span>
              <span className="font-mono text-[#111827]">$40 - $50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">OT rate (1.5×)</span>
              <span className="font-mono text-[#111827]">$60 - $75</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">We use ${overtimeRate.toFixed(2)} (1.5× of ${baseHourlyRate} base)</p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#111827]">Annual Savings</span>
              <p className="text-xs text-neutral-500 mt-0.5">{Math.round(hoursEliminated).toLocaleString()} OT hours eliminated × ${overtimeRate.toFixed(2)}/hr</p>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(annualSavings)}
            </span>
          </div>
        </div>

        {/* Direct measurable note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This is DIRECT, MEASURABLE savings. Track it month-over-month in payroll data.
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingHAPIInputs = () => {
    const { annualAdmissions, hapiRate, preventionRate, costPerHAPI } = driverInputs.nursingHAPI;
    
    // Step 1: Current HAPI volume = Annual Admissions × HAPI Rate
    const currentHAPIs = annualAdmissions * (hapiRate / 100);
    // Step 2: Documentation-preventable = Current HAPIs × Prevention Rate
    const hapisPrevented = currentHAPIs * (preventionRate / 100);
    // Step 3: Cost avoidance = HAPIs Prevented × Cost per HAPI
    const potentialValue = Math.round(hapisPrevented * costPerHAPI);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );
    
    return (
      <div className="space-y-4">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                HAPIs happen when assessments are missed or interventions are delayed. Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured as they're observed — enabling earlier intervention. We show this as POTENTIAL value because the causal link is indirect.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current HAPI Volume */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current HAPI Volume</p>
          <p className="text-xs text-[#6B7280]">How many HAPIs occur today?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual Admissions</label>
              <FormattedNumberInput
                value={annualAdmissions}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingHAPI: { ...prev.nursingHAPI, annualAdmissions: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="nursing-hapi-admissions-input"
              />
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">HAPI Rate</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={hapiRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingHAPI: { ...prev.nursingHAPI, hapiRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  step="0.1"
                  data-testid="nursing-hapi-rate-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">HAPIs/Year</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(currentHAPIs)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">National HAPI rates range 2-5% of admissions. Higher in ICU and long-stay populations.</p>
        </div>

        <StepDivider />

        {/* Step 2: Documentation-Preventable */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Preventable</p>
          <p className="text-xs text-[#6B7280]">How many could better documentation help prevent?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Current HAPIs</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(currentHAPIs)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevention Rate</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={preventionRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingHAPI: { ...prev.nursingHAPI, preventionRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-hapi-prevention-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevented</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(hapisPrevented)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Not all HAPIs are documentation-preventable. 5% is conservative — represents cases where real-time assessment documentation would have triggered earlier intervention.</p>
        </div>

        <StepDivider />

        {/* Step 3: Cost Avoidance */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Cost Avoidance</p>
          <p className="text-xs text-[#6B7280]">What's the value?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevented</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(hapisPrevented)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Cost per HAPI</label>
              <div className="flex items-center justify-center">
                <span className="mr-1 text-[#6B7280] text-xs">$</span>
                <FormattedNumberInput
                  value={costPerHAPI}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingHAPI: { ...prev.nursingHAPI, costPerHAPI: val } }))}
                  className="w-full text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-hapi-cost-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-[#6B7280] block mb-1">Potential Value</label>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {formatCurrency(potentialValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: HAPI Cost</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Stage 2 pressure injury</span>
              <span className="font-mono text-[#111827]">$10K - $15K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Stage 3 pressure injury</span>
              <span className="font-mono text-[#111827]">$20K - $30K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Stage 4 pressure injury</span>
              <span className="font-mono text-[#111827]">$30K - $50K+</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-3">CMS does NOT reimburse for hospital-acquired pressure injuries. This is pure cost to the hospital.</p>
          <p className="text-xs text-[#6B7280] mt-1">We use ${costPerHAPI.toLocaleString()} as blended average.</p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#111827]">Potential Value</span>
              <p className="text-xs text-neutral-500 mt-0.5">{Math.round(hapisPrevented)} HAPIs prevented × ${costPerHAPI.toLocaleString()} cost per HAPI</p>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="nursing-hapi-result">
              {formatCurrency(potentialValue)}
            </span>
          </div>
        </div>

        {/* Why This Is "Potential" Value */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Why This Is "Potential" Value</p>
              <p className="text-sm text-amber-800 leading-relaxed mb-2">
                HAPIs are prevented through clinical care — turning, positioning, nutrition, skin care. Documentation SUPPORTS this but doesn't REPLACE it.
              </p>
              <p className="text-sm text-amber-800 leading-relaxed mb-2">
                We show this separately because:
              </p>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-1 mb-2">
                <li>The causal link is indirect</li>
                <li>Clinical practice matters more than documentation</li>
                <li>We want to be intellectually honest</li>
              </ul>
              <p className="text-sm text-amber-800 leading-relaxed">
                That said — when assessments are documented in real-time, interventions happen faster. This value is REAL, just harder to attribute directly to Abridge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderNursingFallsInputs = () => {
    const { annualAdmissions, fallsRate, avgLOS, preventionRate, costPerFall } = driverInputs.nursingFalls;
    
    // Step 1: Calculate patient days (admissions × avg length of stay)
    const patientDays = annualAdmissions * avgLOS;
    // Step 2: Current falls volume = (Patient Days / 1000) × Falls Rate per 1000 patient days
    const currentFalls = (patientDays / 1000) * fallsRate;
    // Step 3: Documentation-preventable = Current Falls × Prevention Rate
    const fallsPrevented = currentFalls * (preventionRate / 100);
    // Step 4: Cost avoidance = Falls Prevented × Cost per Fall
    const potentialValue = Math.round(fallsPrevented * costPerFall);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );
    
    return (
      <div className="space-y-4">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Falls happen when risk assessments are missed or interventions are delayed. Real-time documentation ensures fall risk scores, mobility assessments, and environmental factors are captured as they're observed — enabling earlier intervention. We show this as POTENTIAL value because the causal link is indirect.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Falls Volume */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Falls Volume</p>
          <p className="text-xs text-[#6B7280]">How many falls occur today?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual Admissions</label>
              <FormattedNumberInput
                value={annualAdmissions}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingFalls: { ...prev.nursingFalls, annualAdmissions: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                data-testid="nursing-falls-admissions-input"
              />
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Falls Rate</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={fallsRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingFalls: { ...prev.nursingFalls, fallsRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  step="0.1"
                  data-testid="nursing-falls-rate-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Falls/Year</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(currentFalls)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">
            Falls rate is per 1,000 patient days. Calculated as: {annualAdmissions.toLocaleString()} admissions × {avgLOS} day avg LOS = {patientDays.toLocaleString()} patient days.
          </p>
          <p className="text-xs text-[#6B7280]">National falls rates range 2.5-5 per 1,000 patient days. Higher in acute care and geriatric populations.</p>
        </div>

        <StepDivider />

        {/* Step 2: Documentation-Preventable */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Documentation-Preventable</p>
          <p className="text-xs text-[#6B7280]">How many could better documentation help prevent?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Current Falls</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(currentFalls)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevention Rate</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={preventionRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingFalls: { ...prev.nursingFalls, preventionRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-falls-prevention-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevented</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(fallsPrevented)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Not all falls are documentation-preventable. 5% is conservative — represents cases where real-time risk assessment would have triggered earlier intervention.</p>
        </div>

        <StepDivider />

        {/* Step 3: Cost Avoidance */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Cost Avoidance</p>
          <p className="text-xs text-[#6B7280]">What's the value?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Prevented</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(fallsPrevented)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Cost per Fall</label>
              <div className="flex items-center justify-center">
                <span className="mr-1 text-[#6B7280] text-xs">$</span>
                <FormattedNumberInput
                  value={costPerFall}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingFalls: { ...prev.nursingFalls, costPerFall: val } }))}
                  className="w-full text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-falls-cost-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-[#6B7280] block mb-1">Potential Value</label>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {formatCurrency(potentialValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: Cost Per Fall</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-[#6B7280]">No injury fall</span>
              <span className="font-mono text-[#111827]">$3K - $5K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Minor injury</span>
              <span className="font-mono text-[#111827]">$5K - $8K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Major injury (fracture)</span>
              <span className="font-mono text-[#111827]">$15K - $30K</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-3">CMS does NOT reimburse for hospital-acquired fall injuries. This is pure cost avoidance.</p>
          <p className="text-xs text-[#6B7280] mt-1">We use ${costPerFall.toLocaleString()} as blended average across injury severities.</p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#111827]">Potential Value</span>
              <p className="text-xs text-neutral-500 mt-0.5">{Math.round(fallsPrevented)} falls prevented × ${costPerFall.toLocaleString()} cost per fall</p>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-xl" data-testid="nursing-falls-result">
              {formatCurrency(potentialValue)}
            </span>
          </div>
        </div>

        {/* Why This Is "Potential" Value */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Why This Is "Potential" Value</p>
              <p className="text-sm text-amber-800 leading-relaxed mb-2">
                Falls are prevented through clinical care — mobility assistance, environmental modifications, medication reviews. Documentation SUPPORTS this but doesn't REPLACE it.
              </p>
              <p className="text-sm text-amber-800 leading-relaxed mb-2">
                We show this separately because:
              </p>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-1 mb-2">
                <li>The causal link is indirect</li>
                <li>Clinical practice matters more than documentation</li>
                <li>We want to be intellectually honest</li>
              </ul>
              <p className="text-sm text-amber-800 leading-relaxed">
                That said — when risk assessments are documented in real-time, interventions happen faster. This value is REAL, just harder to attribute directly to Abridge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderNursingAgencyInputs = () => {
    const { agencyFTEsPerBed, staffSalary, agencyCost, retentionImpact } = driverInputs.nursingAgency;
    
    // Step 1: Current agency utilization = Staffed Beds × Agency FTEs per Bed
    const agencyFTEs = staffedBeds * agencyFTEsPerBed;
    // Step 2: Agency premium = Agency Cost - Staff Salary
    const premium = agencyCost - staffSalary;
    // Step 3: Retention-driven reduction = Agency FTEs × Retention Impact %
    const ftesConverted = agencyFTEs * (retentionImpact / 100);
    // Step 4: Cost savings = FTEs Converted × Premium
    const annualSavings = Math.round(ftesConverted * premium);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );
    
    return (
      <div className="space-y-4">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                When staff nurses leave due to burnout, hospitals must fill gaps with expensive agency and travel nurses at 2× the cost. By improving retention through reduced documentation burden, we convert costly agency positions back to staff positions—saving the premium difference.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Current Agency Utilization */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Current Agency Utilization</p>
          <p className="text-xs text-[#6B7280]">How much agency are you using?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Staffed Beds</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{staffedBeds}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Agency FTEs/Bed</label>
              <EditableNumberInput
                value={agencyFTEsPerBed}
                onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, agencyFTEsPerBed: val } }))}
                className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                step="0.01"
                data-testid="nursing-agency-ftes-per-bed-input"
              />
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Agency FTEs</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {agencyFTEs.toFixed(1)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Many hospitals run 10-20% of nursing as agency/travelers. 0.15 FTEs per bed = 15% agency utilization.</p>
        </div>

        <StepDivider />

        {/* Step 2: Agency Premium */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Agency Premium</p>
          <p className="text-xs text-[#6B7280]">What's the cost difference?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Staff Salary</label>
              <div className="flex items-center justify-center">
                <span className="mr-1 text-[#6B7280] text-xs">$</span>
                <FormattedNumberInput
                  value={staffSalary}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, staffSalary: val } }))}
                  className="w-full text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-agency-staff-salary-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">vs</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Agency Cost</label>
              <div className="flex items-center justify-center">
                <span className="mr-1 text-[#6B7280] text-xs">$</span>
                <FormattedNumberInput
                  value={agencyCost}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, agencyCost: val } }))}
                  className="w-full text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-agency-cost-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Premium</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                ${premium.toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Agency nurses cost ~2× staff nurses when fully loaded (agency fees, housing, travel, benefits).</p>
        </div>

        <StepDivider />

        {/* Step 3: Retention-Driven Reduction */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Retention-Driven Reduction</p>
          <p className="text-xs text-[#6B7280]">How much can better retention reduce agency need?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Agency FTEs</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{agencyFTEs.toFixed(1)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Retention Impact</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={retentionImpact}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingAgency: { ...prev.nursingAgency, retentionImpact: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-agency-retention-impact-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">FTEs Converted</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {ftesConverted.toFixed(1)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">When staff nurses stay instead of burning out, agency need decreases. 10% is conservative — driven by documentation burden reduction improving retention.</p>
        </div>

        <StepDivider />

        {/* Step 4: Cost Savings */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
          <p className="text-xs text-[#6B7280]">What's the budget impact?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">FTEs Converted</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{ftesConverted.toFixed(1)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Premium/FTE</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">${premium.toLocaleString()}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual Savings</label>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {formatCurrency(annualSavings)}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: Agency vs Staff Cost</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Staff RN (fully loaded)</span>
              <span className="font-mono text-[#111827]">$70K - $90K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Agency RN (fully loaded)</span>
              <span className="font-mono text-[#111827]">$140K - $200K</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">We use ${premium.toLocaleString()} premium (conservative)</p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#111827]">Annual Savings</span>
              <p className="text-xs text-neutral-500 mt-0.5">{ftesConverted.toFixed(1)} agency FTEs converted × ${premium.toLocaleString()} premium</p>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(annualSavings)}
            </span>
          </div>
        </div>

        {/* Indirect benefit note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            This is an indirect benefit — the logic chain is: better retention → less agency need → budget savings.
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingRetentionInputs = () => {
    const { turnoverRate, burnoutAttribution, abridgeImpact, replacementCost } = driverInputs.nursingRetention;
    
    // Step 1: Baseline turnover = Nurse FTEs × Turnover Rate
    const departures = nurseFTEs * (turnoverRate / 100);
    // Step 2: Burnout-related = Departures × Burnout Attribution
    const burnoutDepartures = departures * (burnoutAttribution / 100);
    // Step 3: Abridge attribution = Burnout departures × Abridge Impact
    const departuresAvoided = burnoutDepartures * (abridgeImpact / 100);
    // Step 4: Cost savings = Departures Avoided × Replacement Cost
    const annualValue = Math.round(departuresAvoided * replacementCost);

    const StepDivider = () => (
      <div className="border-t border-dashed border-neutral-200 my-4" />
    );
    
    return (
      <div className="space-y-4">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Documentation burden is the #1 driver of nursing burnout. Nurses spend 25-35% of their shift on charting instead of patient care. By reducing this burden, we help prevent burnout-related departures—each costing $40-60K to replace when factoring in recruitment, onboarding, and lost productivity.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Baseline Turnover */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 1: Baseline Turnover</p>
          <p className="text-xs text-[#6B7280]">What's the current turnover situation?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Nurse FTEs</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{nurseFTEs}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Turnover Rate</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={turnoverRate}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, turnoverRate: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-retention-turnover-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Departures/Yr</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(departures)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Nursing turnover averages 18-25%. Higher than most roles due to burnout, schedules, and workload.</p>
        </div>

        <StepDivider />

        {/* Step 2: Burnout-Related */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 2: Burnout-Related</p>
          <p className="text-xs text-[#6B7280]">How much is burnout-driven?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Departures</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(departures)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Burnout %</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={burnoutAttribution}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, burnoutAttribution: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-retention-burnout-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[80px]">
              <label className="text-xs text-[#6B7280] block mb-1">Preventable</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {Math.round(burnoutDepartures)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">~50% of nursing turnover is burnout-related. Documentation burden is consistently a top complaint in exit interviews.</p>
        </div>

        <StepDivider />

        {/* Step 3: Abridge Attribution */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 3: Abridge Attribution</p>
          <p className="text-xs text-[#6B7280]">What can Abridge prevent?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Preventable</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{Math.round(burnoutDepartures)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Abridge Impact</label>
              <div className="flex items-center">
                <EditableNumberInput
                  value={abridgeImpact}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, abridgeImpact: val } }))}
                  className="w-full text-center text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-retention-impact-input"
                />
                <span className="ml-1 text-[#6B7280]">%</span>
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Avoided</label>
              <div className="font-mono text-sm font-semibold text-[#111827] bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {departuresAvoided.toFixed(1)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Documentation is ONE burnout driver for nurses (others: ratios, acuity, schedules). We use 15% — lower than physicians because nursing burnout is more multifactorial.</p>
        </div>

        <StepDivider />

        {/* Step 4: Cost Savings */}
        <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Step 4: Cost Savings</p>
          <p className="text-xs text-[#6B7280]">What's the dollar value?</p>
          
          <div className="flex flex-wrap items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-[70px]">
              <label className="text-xs text-[#6B7280] block mb-1">Avoided</label>
              <div className="font-mono text-sm bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">{departuresAvoided.toFixed(1)}</div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">×</span>
            <div className="flex-1 min-w-[100px]">
              <label className="text-xs text-[#6B7280] block mb-1">Replacement Cost</label>
              <div className="flex items-center justify-center">
                <span className="mr-1 text-[#6B7280] text-xs">$</span>
                <FormattedNumberInput
                  value={replacementCost}
                  onChange={(val) => setDriverInputs(prev => ({ ...prev, nursingRetention: { ...prev.nursingRetention, replacementCost: val } }))}
                  className="w-full text-center font-mono text-sm h-8 bg-white border-b-2 border-b-[#EA2C00]/80 border-t-0 border-x-0 rounded-none hover:border-b-[#EA2C00]/95 focus:border-b-[#EA2C00] transition-all"
                  data-testid="nursing-retention-cost-input"
                />
              </div>
            </div>
            <span className="text-neutral-400 pb-2 hidden sm:block">=</span>
            <div className="flex-1 min-w-[90px]">
              <label className="text-xs text-[#6B7280] block mb-1">Annual Value</label>
              <div className="font-mono text-sm font-bold text-emerald-600 bg-white border border-neutral-200 rounded px-2 py-1.5 text-center">
                {formatCurrency(annualValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Benchmark callout */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Benchmark: Nurse Replacement Cost</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Recruiting & hiring</span>
              <span className="font-mono text-[#111827]">$5K - $15K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Onboarding & training</span>
              <span className="font-mono text-[#111827]">$15K - $25K</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#6B7280]">Lost productivity</span>
              <span className="font-mono text-[#111827]">$15K - $25K</span>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">Total: $40K - $60K. We use ${replacementCost.toLocaleString()} (mid-range)</p>
        </div>

        {/* What This Means callout */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">What This Means</p>
          <p className="text-sm text-blue-800">
            Annually, expect to retain ~{Math.round(departuresAvoided)} additional nurses you would have otherwise lost to burnout.
          </p>
        </div>

        {/* Final Result */}
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-[#111827]">Annual Value</span>
              <p className="text-xs text-neutral-500 mt-0.5">{departuresAvoided.toFixed(1)} departures avoided × ${replacementCost.toLocaleString()} replacement cost</p>
            </div>
            <span className="font-mono font-bold text-emerald-600 text-xl">
              {formatCurrency(annualValue)}
            </span>
          </div>
        </div>

        {/* Timeline note */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Retention impact typically measurable after 12+ months.
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingSurveyInputs = () => {
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Real-time documentation supports audit confidence and survey readiness. Complete, timely charting reduces the risk of regulatory findings and supports accreditation.
              </p>
            </div>
          </div>
        </div>
        
        {/* Not Quantified Notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Info className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800">
            <p className="font-medium mb-1">Not Quantified</p>
            <p>This driver adds to the narrative value of Abridge but is not included in the ROI total. The value is qualitative—reducing audit risk, improving survey readiness, and supporting regulatory compliance.</p>
          </div>
        </div>
        
        {/* Value Examples */}
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280]">Qualitative Value Examples</span>
          </div>
          <ul className="space-y-2 text-xs text-[#6B7280]">
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Reduced survey deficiency risk</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Faster remediation during audits</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Improved documentation quality scores</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Reduced staff time preparing for surveys</span>
            </li>
          </ul>
        </div>
        
        {/* Final Result */}
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Qualitative Value</span>
            <span className="font-mono font-medium text-slate-600 text-sm">
              Not Quantified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Adds to narrative, not included in ROI total
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingCareCoordinationInputs = () => {
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Complete, timely documentation improves handoffs between shifts and departments. Better handoffs reduce miscommunication, improve patient safety, and support care continuity.
              </p>
            </div>
          </div>
        </div>
        
        {/* Not Quantified Notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Info className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800">
            <p className="font-medium mb-1">Not Quantified</p>
            <p>This driver adds to the narrative value of Abridge but is not included in the ROI total. The value is qualitative—improving care coordination and patient outcomes through better documentation.</p>
          </div>
        </div>
        
        {/* Value Examples */}
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280]">Qualitative Value Examples</span>
          </div>
          <ul className="space-y-2 text-xs text-[#6B7280]">
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Improved shift-to-shift handoff quality</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Better interdepartmental communication</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Reduced documentation-related miscommunication events</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Faster access to complete patient information</span>
            </li>
          </ul>
        </div>
        
        {/* Final Result */}
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Qualitative Value</span>
            <span className="font-mono font-medium text-slate-600 text-sm">
              Not Quantified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Adds to narrative, not included in ROI total
          </p>
        </div>
      </div>
    );
  };
  
  const renderNursingPatientExperienceInputs = () => {
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Patients notice when nurses are fully present versus distracted by documentation. Ambient charting eliminates the divided attention that comes from typing during patient interactions—improving how patients perceive nurse communication, a key HCAHPS domain tied to VBP reimbursement.
              </p>
            </div>
          </div>
        </div>
        
        {/* Not Quantified Notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Info className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800">
            <p className="font-medium mb-1">Not Quantified</p>
            <p>This driver adds to the narrative value of Abridge but is not included in the ROI total. The value is qualitative—improving patient perception of nurse attentiveness and communication quality.</p>
          </div>
        </div>
        
        {/* Value Examples */}
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280]">Qualitative Value Examples</span>
          </div>
          <ul className="space-y-2 text-xs text-[#6B7280]">
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Improved "nurse listened carefully" scores</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Better "nurse explained things" ratings</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>More meaningful bedside interactions</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Reduced perception of rushed care</span>
            </li>
          </ul>
        </div>
        
        {/* Final Result */}
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Qualitative Value</span>
            <span className="font-mono font-medium text-slate-600 text-sm">
              Not Quantified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Adds to narrative, not included in ROI total
          </p>
        </div>
      </div>
    );
  };
  
  const renderEDPatientExperienceInputs = () => {
    return (
      <div className="space-y-6">
        {/* The Theory */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">The Theory</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                ED encounters are high-stress moments for patients. When physicians are fully present and engaged rather than focused on documentation, patients feel heard and communication improves—directly impacting satisfaction scores and reducing complaints.
              </p>
            </div>
          </div>
        </div>
        
        {/* Not Quantified Notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Info className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800">
            <p className="font-medium mb-1">Not Quantified</p>
            <p>This driver adds to the narrative value of Abridge but is not included in the ROI total. The value is qualitative—improving patient perception of physician attentiveness during high-stress ED encounters.</p>
          </div>
        </div>
        
        {/* Value Examples */}
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280]">Qualitative Value Examples</span>
          </div>
          <ul className="space-y-2 text-xs text-[#6B7280]">
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Less waiting room frustration when physicians are more present</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Better communication during high-stress encounters</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Improved "doctor explained things" ratings</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Reduced patient complaints about feeling rushed</span>
            </li>
          </ul>
        </div>
        
        {/* Final Result */}
        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#111827]">Qualitative Value</span>
            <span className="font-mono font-medium text-slate-600 text-sm">
              Not Quantified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Adds to narrative, not included in ROI total
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={6}
        stepName="Value Drivers"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />
      
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100 py-3 px-4">
        <div className="max-w-md mx-auto">
          <ExploreProgressBar currentStep={4} />
        </div>
      </div>
      
      <div className="py-8 sm:py-12 pb-16">
        {/* Centered Page Header */}
        <div className="text-center max-w-[800px] mx-auto px-6 mb-12">
          <div className="inline-block text-[13px] font-semibold text-[#EA2C00] uppercase tracking-[0.1em] bg-[rgba(234,44,0,0.08)] px-3 py-1.5 rounded-md mb-6">
            Step 4 of 6
          </div>
          <h1 className="text-4xl md:text-[48px] font-bold text-[#111827] leading-[1.1] tracking-[-0.02em] mb-4">
            Your Value Drivers
          </h1>
          <p className="text-[17px] leading-relaxed text-[#6B7280]">
            Customize the calculation for each priority you selected. We've pre-filled industry benchmarks—adjust them to match your reality.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Live Model Sidebar - hidden on mobile, shown on desktop right column */}
            <div className="w-full lg:w-[380px] lg:order-2 lg:flex-shrink-0">
              <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#111827]">Live Model</h3>
                    <p className="text-xs text-[#6B7280]">Updates as you customize</p>
                  </div>
                </div>
                
                {/* Compact Baseline Reference */}
                <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your Baseline</span>
                    <button
                      onClick={onBack}
                      className="text-xs font-medium text-[#EA2C00] hover:text-[#d12700] transition-colors flex items-center gap-1"
                      data-testid="sidebar-edit-baseline"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-800">
                    {(isNursingSetting ? eligibleDocEvents : eligibleEncounters).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isNursingSetting 
                      ? "documentation events/year" 
                      : isInpatientSetting 
                        ? "eligible admissions/year" 
                        : "eligible encounters/year"
                    }
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {isNursingSetting 
                      ? `${staffedBeds} beds · ${nursingOccupancyRate}% occ · ${eventsPerPatientDay} events/day`
                      : `${providers} ${isInpatientSetting ? "hospitalists" : isEDSetting ? "physicians" : "providers"} · ${encounters.toLocaleString()} ${isInpatientSetting ? "adm" : "enc"} · ${utilizationRate}%`
                    }
                  </p>
                </div>
                
                <div className="space-y-1 mb-4">
                  {activeDrivers.map((driverId, idx) => {
                    const isReviewed = expandedDriver === driverId || reviewedDrivers.has(driverId);
                    return (
                      <div 
                        key={driverId} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg transition-colors ${
                          expandedDriver === driverId ? 'bg-[rgba(234,44,0,0.05)]' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isReviewed && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className={`text-sm ${isReviewed ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
                            {DRIVER_NAMES[driverId]}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-semibold text-emerald-600">
                          {formatCurrency(driverResults[driverId]?.value || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-neutral-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-[#111827]">Total Annual Value</span>
                    <span className="font-mono font-bold text-xl text-emerald-600">{formatCurrency(totalBenefit)}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">per year</p>
                </div>
                
                <div className="bg-neutral-50 rounded-lg p-3 mb-6">
                  <p className="text-xs text-[#6B7280] text-center">
                    Investment calculated in next step
                  </p>
                </div>
                
                <div className="hidden lg:block">
                <button
                  onClick={handleComplete}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-[15px] bg-[#EA2C00] text-white hover:bg-[#d12700] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  data-testid="button-continue-investment"
                >
                  Continue to Investment
                  <ArrowRight className="w-5 h-5" />
                </button>
                </div>
              </div>
            </div>
            
            {/* Main Content - appears second in DOM but first visually on desktop */}
            <div className="flex-1 space-y-6 lg:order-1">
              <section className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
              {/* Inpatient ED Connection Callout - appears at TOP before drivers */}
              {isInpatientSetting && (
                <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6" data-testid="inpatient-ed-connection-callout">
                  {/* Left accent bar (inset, not a border) */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl" />
                  
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Link2 className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-0.5" />
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
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <BarChart3 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">DRG Capture</p>
                        <p className="text-xs text-slate-500">CCs/MCCs documented in ED carry forward — your case mix starts stronger from admission.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">CDI Efficiency</p>
                        <p className="text-xs text-slate-500">When the ED note is complete, CDI teams query less and focus on complex cases.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Denial Prevention</p>
                        <p className="text-xs text-slate-500">Medical necessity documented at admission is your first line of defense against payer audits.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amplification Note */}
                  <div className="flex items-start gap-3 bg-indigo-500/10 rounded-lg p-4">
                    <Lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800">
                      <span className="font-semibold">If you're also using Abridge in ED</span>, the documentation 
                      quality benefits below are amplified — you're building on a stronger foundation.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Instructional Callout */}
              <div className="flex items-start gap-3 bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] border-l-4 border-[#3B82F6] rounded-lg p-4 mb-6">
                <Lightbulb className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#1E40AF] leading-relaxed">
                    <span className="font-semibold">Click on each driver below</span> to expand and customize the assumptions. 
                    Your total value updates automatically as you make changes.
                  </p>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[#111827] mb-1">Your Value Drivers</h2>
                  <p className="text-sm text-[#6B7280]">Expand each driver to customize the calculation</p>
                </div>
                <div className={`text-sm flex items-center gap-2 ${reviewedDrivers.size === activeDrivers.length ? 'text-emerald-600 font-semibold' : 'text-[#6B7280]'}`}>
                  {reviewedDrivers.size === activeDrivers.length ? (
                    <>
                      <Check className="w-4 h-4" />
                      All drivers reviewed
                    </>
                  ) : (
                    <>
                      <span className="font-mono">{reviewedDrivers.size}</span> of <span className="font-mono">{activeDrivers.length}</span> customized
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {activeDrivers.map((driverId, index) => renderDriverAccordion(driverId, index))}
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
            
            {/* Live Model Sidebar - Mobile/Tablet version at bottom of page */}
            <div className="lg:hidden w-full">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#111827]">Live Model</h3>
                    <p className="text-xs text-[#6B7280]">Updates as you customize</p>
                  </div>
                </div>
                
                {/* Compact Baseline Reference - Mobile */}
                <div className="mb-5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your Baseline</span>
                    <button
                      onClick={onBack}
                      className="text-xs font-medium text-[#EA2C00] hover:text-[#d12700] transition-colors flex items-center gap-1"
                      data-testid="mobile-sidebar-edit-baseline"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-800">
                    {(isNursingSetting ? eligibleDocEvents : eligibleEncounters).toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isNursingSetting 
                      ? "documentation events/year" 
                      : isInpatientSetting 
                        ? "eligible admissions/year" 
                        : "eligible encounters/year"
                    }
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {isNursingSetting 
                      ? `${staffedBeds} beds · ${nursingOccupancyRate}% occ · ${eventsPerPatientDay} events/day`
                      : `${providers} ${isInpatientSetting ? "hospitalists" : isEDSetting ? "physicians" : "providers"} · ${encounters.toLocaleString()} ${isInpatientSetting ? "adm" : "enc"} · ${utilizationRate}%`
                    }
                  </p>
                </div>
                
                <div className="space-y-1 mb-4">
                  {activeDrivers.map((driverId, idx) => {
                    const isReviewed = expandedDriver === driverId || reviewedDrivers.has(driverId);
                    return (
                      <div 
                        key={driverId} 
                        className={`flex justify-between items-center py-2.5 px-3 rounded-lg transition-colors ${
                          expandedDriver === driverId ? 'bg-[rgba(234,44,0,0.05)]' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isReviewed && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className={`text-sm ${isReviewed ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
                            {DRIVER_NAMES[driverId]}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-semibold text-emerald-600">
                          {formatCurrency(driverResults[driverId]?.value || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t border-neutral-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-[#111827]">Total Annual Value</span>
                    <span className="font-mono font-bold text-xl text-emerald-600">{formatCurrency(totalBenefit)}</span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">per year</p>
                </div>
                
                <div className="bg-neutral-50 rounded-lg p-3 mb-6">
                  <p className="text-xs text-[#6B7280] text-center">
                    Investment calculated in next step
                  </p>
                </div>
                
                <button
                  onClick={handleComplete}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-[15px] bg-[#EA2C00] text-white hover:bg-[#d12700] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  data-testid="button-continue-investment-mobile"
                >
                  Continue to Investment
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
