import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Mic, User, Keyboard, Sparkles, Clock, DollarSign, ChevronDown, ChevronUp, Download, MessageSquare, Frown, Meh, Smile, PartyPopper, Users, Calendar, BadgeDollarSign, Heart, FileCheck, ShieldCheck, Lightbulb, Check, AlertTriangle, Target, BarChart3, Settings, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

const spectrumStyles = `
@keyframes scaleX {
  from { transform: scaleX(0) translateY(-50%); }
  to { transform: scaleX(1) translateY(-50%); }
}
@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-100%); }
  to { opacity: 1; transform: translateX(-50%); }
}
@keyframes slideInFromRight {
  from { opacity: 0; transform: translateX(0%); }
  to { opacity: 1; transform: translateX(-50%); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes growWidth {
  from { width: 0%; }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; max-height: 0; transform: translateY(-10px); }
  to { opacity: 1; max-height: 1000px; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
@keyframes drawLine {
  from { stroke-dashoffset: 2000; }
  to { stroke-dashoffset: 0; }
}
@keyframes fillArea {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes liftButton {
  from { transform: translateY(0); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
  to { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
}
@keyframes successPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
@keyframes countNumber {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

interface SwitchPathProps {
  onBack: () => void;
}

type SolutionType = "ambient" | "scribes" | "manual";
type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type DriverId = "patient_access" | "overtime" | "retention" | "level_of_service" | "denials" | "hcc";

type RampSpeed = "fast" | "medium" | "slow";

const SOLUTION_DATA: Record<SolutionType, {
  name: string;
  subtitle: string;
  typicalUtilization: number;
  typicalTimeSavings: number;
  typicalWrvuUplift: number;
  typicalUnderCoding: number;
  typicalDenialPrevention: number;
  typicalHccImprovement: number;
}> = {
  ambient: {
    name: "Ambient AI",
    subtitle: "Another ambient AI solution",
    typicalUtilization: 50,
    typicalTimeSavings: 1.5,
    typicalWrvuUplift: 3.5,
    typicalUnderCoding: 8,
    typicalDenialPrevention: 30,
    typicalHccImprovement: 10,
  },
  scribes: {
    name: "Human Scribes",
    subtitle: "In-person or virtual scribes",
    typicalUtilization: 90,
    typicalTimeSavings: 3.5,
    typicalWrvuUplift: 4,
    typicalUnderCoding: 10,
    typicalDenialPrevention: 35,
    typicalHccImprovement: 12,
  },
  manual: {
    name: "No Solution Yet",
    subtitle: "Providers type everything",
    typicalUtilization: 0,
    typicalTimeSavings: 0,
    typicalWrvuUplift: 0,
    typicalUnderCoding: 0,
    typicalDenialPrevention: 0,
    typicalHccImprovement: 0,
  },
};

const ABRIDGE_BENCHMARKS = {
  utilization: 65,
  timeSavings: 3.0,
  wrvuUplift: 6,
  underCoding: 12,
  denialPrevention: 45,
  hccImprovement: 15,
};

const CARE_SETTINGS: { id: CareSetting; label: string; available: boolean }[] = [
  { id: "outpatient", label: "Outpatient", available: true },
  { id: "ed", label: "ED", available: false },
  { id: "inpatient", label: "Inpatient", available: false },
  { id: "nursing", label: "Nursing", available: false },
];

const DRIVERS: {
  id: DriverId;
  name: string;
  description: string;
  context: string;
  icon: typeof Users;
  category: "time" | "quality";
  typicalGap: string;
  rampSpeed: RampSpeed;
}[] = [
  {
    id: "patient_access",
    name: "Patient Access",
    description: "Convert extra capacity into seeing more patients",
    context: "Requires patient demand + scheduling flexibility",
    icon: Users,
    category: "time",
    typicalGap: "$60-120K",
    rampSpeed: "medium",
  },
  {
    id: "overtime",
    name: "Overtime & Locum Savings",
    description: "Reduce premium labor costs",
    context: "Quick win - shows in payroll within 30 days",
    icon: Clock,
    category: "time",
    typicalGap: "$40-90K",
    rampSpeed: "fast",
  },
  {
    id: "retention",
    name: "Clinician Retention",
    description: "Better work-life balance = less turnover",
    context: "Long-term impact (12-18 months)",
    icon: Heart,
    category: "time",
    typicalGap: "$80-160K",
    rampSpeed: "slow",
  },
  {
    id: "level_of_service",
    name: "Level of Service Accuracy",
    description: "Better documentation = proper E/M coding",
    context: "Universal - applies to every encounter",
    icon: BarChart3,
    category: "quality",
    typicalGap: "$70-140K",
    rampSpeed: "fast",
  },
  {
    id: "denials",
    name: "Documentation-Related Denials",
    description: "Better notes = fewer claim rejections",
    context: "Revenue cycle impact within 3-6 months",
    icon: ShieldCheck,
    category: "quality",
    typicalGap: "$50-110K",
    rampSpeed: "fast",
  },
  {
    id: "hcc",
    name: "HCC & Chronic Condition Capture",
    description: "Capture discussed conditions = RAF improvement",
    context: "Only relevant with MA/risk-based contracts",
    icon: Target,
    category: "quality",
    typicalGap: "$100-300K",
    rampSpeed: "slow",
  },
];

function formatCurrency(value: number): string {
  return "$" + Math.round(value).toLocaleString();
}

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * easeOut));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{formatCurrency(displayValue)}</span>;
}

export default function SwitchPath({ onBack }: SwitchPathProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSolution, setSelectedSolution] = useState<SolutionType | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<CareSetting>("outpatient");
  
  const [providers, setProviders] = useState<number>(0);
  const [annualEncounters, setAnnualEncounters] = useState<number>(0);
  const [utilization, setUtilization] = useState<number>(50);
  const [timeSavings, setTimeSavings] = useState<number>(1.5);
  const [timeSavingsKnown, setTimeSavingsKnown] = useState(true);
  
  const [wrvuKnown, setWrvuKnown] = useState(false);
  const [wrvuUplift, setWrvuUplift] = useState<number>(3.5);
  const [underCodingKnown, setUnderCodingKnown] = useState(false);
  const [underCoding, setUnderCoding] = useState<number>(8);
  const [denialKnown, setDenialKnown] = useState(false);
  const [denialPrevention, setDenialPrevention] = useState<number>(30);
  const [hccKnown, setHccKnown] = useState(false);
  const [hccImprovement, setHccImprovement] = useState<number>(10);
  
  const [selectedDrivers, setSelectedDrivers] = useState<DriverId[]>([]);
  const [expandedDrivers, setExpandedDrivers] = useState<DriverId[]>([]);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [chartAnimationStage, setChartAnimationStage] = useState(0);
  const [gapRevealStage, setGapRevealStage] = useState(0);
  
  // New state for Summary Dashboard
  const [summaryTab, setSummaryTab] = useState<"drivers" | "time">("drivers");
  const [showInputsBar, setShowInputsBar] = useState(false);
  const [showUtilizationModal, setShowUtilizationModal] = useState(false);
  const [showTimeSavingsModal, setShowTimeSavingsModal] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  
  // Human Scribes Path State
  const [providersWithScribes, setProvidersWithScribes] = useState<number>(0);
  const [scribeHourlyCost, setScribeHourlyCost] = useState<number>(0);
  const [scribeHoursPerWeek, setScribeHoursPerWeek] = useState<number>(0);
  
  // Scribe summary accordion state (separate from driver accordions)
  const [expandedScribeSections, setExpandedScribeSections] = useState<string[]>([]);
  const [scribeTurnoverRate, setScribeTurnoverRate] = useState<number>(35);
  const [managementHoursPerWeek, setManagementHoursPerWeek] = useState<number>(5);
  const [hasScribeManagement, setHasScribeManagement] = useState<boolean>(true);
  const [scribeReplacementCost] = useState<number>(4000);
  const [scribeManagementOverhead] = useState<number>(20000);
  const weeksPerYear = 50;
  
  // Scribe value drivers (for "What scribes can't do" screen)
  type ScribeDriverId = "coding" | "denials" | "hcc";
  const [selectedScribeDrivers, setSelectedScribeDrivers] = useState<ScribeDriverId[]>([]);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const ABRIDGE_UTILIZATION = 0.65; // 65% average utilization benchmark
  const REALIZATION_FACTOR = 0.50; // 50% conservative realization
  
  // Derived scribe calculations
  const isScribePath = selectedSolution === "scribes";
  const providersWithoutScribes = Math.max(0, providers - providersWithScribes);
  const coveragePercent = providers > 0 ? Math.round((providersWithScribes / providers) * 100) : 0;
  const annualScribeCost = providersWithScribes * scribeHourlyCost * scribeHoursPerWeek * weeksPerYear;
  const annualTurnoverCost = Math.round(providersWithScribes * (scribeTurnoverRate / 100) * scribeReplacementCost);
  const managementOverhead = hasScribeManagement ? (managementHoursPerWeek * 50 * 50) : 0; // $50/hr × hours × 50 weeks
  const hiddenCosts = annualTurnoverCost + managementOverhead;
  const totalCurrentCost = annualScribeCost + hiddenCosts;
  const encountersPerProvider = providers > 0 ? annualEncounters / providers : 2000;
  
  // Abridge value calculations (with 65% utilization)
  const activeProviders = Math.round(providers * ABRIDGE_UTILIZATION);
  const encountersWithAbridge = activeProviders * encountersPerProvider;
  
  // Time savings and coverage calculations
  const timeSavedNewProvidersHours = Math.round((providersWithoutScribes * encountersPerProvider * 3) / 60);
  const expandedCoverageValue = Math.round(timeSavedNewProvidersHours * 100); // $100/hr value
  const directCostSavings = annualScribeCost; // Cost that could be redirected
  
  // Additional value driver calculations (with realization factor)
  const codingValue = selectedScribeDrivers.includes("coding") 
    ? Math.round(encountersWithAbridge * 0.035 * 45 * REALIZATION_FACTOR) // 3.5% wRVU uplift × $45/wRVU
    : 0;
  const denialsValue = selectedScribeDrivers.includes("denials")
    ? Math.round(encountersWithAbridge * 0.05 * 50 * 0.30 * REALIZATION_FACTOR) // 5% denial rate × $50/claim × 30% reduction
    : 0;
  const hccValue = selectedScribeDrivers.includes("hcc")
    ? Math.round(encountersWithAbridge * 0.12 * 25 * REALIZATION_FACTOR) // 12% improved capture × $25 value
    : 0;
  const additionalValue = codingValue + denialsValue + hccValue;
  const additionalValuePreRealization = selectedScribeDrivers.length > 0 
    ? Math.round(additionalValue / REALIZATION_FACTOR)
    : 0;
  
  // Total scribe value (must come after additionalValue)
  const totalScribeValue = annualScribeCost + hiddenCosts + expandedCoverageValue + additionalValue;

  const solutionData = selectedSolution ? SOLUTION_DATA[selectedSolution] : null;
  
  // Summary Dashboard animations - Step 5 for Ambient AI, Step 7 for Human Scribes
  const isSummaryStep = (step === 5 && !isScribePath) || (step === 7 && isScribePath);
  useEffect(() => {
    if (isSummaryStep) {
      setGapRevealStage(0);
      setChartAnimationStage(0);
      const revealTimers = [
        setTimeout(() => setGapRevealStage(1), 300),
        setTimeout(() => setGapRevealStage(2), 800),
        setTimeout(() => setGapRevealStage(3), 2800),
        setTimeout(() => setGapRevealStage(4), 3200),
        setTimeout(() => setGapRevealStage(5), 3700),
        setTimeout(() => setGapRevealStage(6), 4200),
        // Chart animation stages for Over Time tab
        setTimeout(() => setChartAnimationStage(1), 500),
        setTimeout(() => setChartAnimationStage(2), 1000),
        setTimeout(() => setChartAnimationStage(3), 1500),
        setTimeout(() => setChartAnimationStage(4), 2500),
      ];
      return () => revealTimers.forEach(clearTimeout);
    }
  }, [step, isSummaryStep]);

  useEffect(() => {
    if (selectedSolution) {
      const data = SOLUTION_DATA[selectedSolution];
      setTimeSavings(data.typicalTimeSavings);
      setUtilization(data.typicalUtilization);
      setWrvuUplift(data.typicalWrvuUplift);
      setUnderCoding(data.typicalUnderCoding);
      setDenialPrevention(data.typicalDenialPrevention);
      setHccImprovement(data.typicalHccImprovement);
    }
  }, [selectedSolution]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Pre-select top 3 drivers for Ambient AI path when entering step 5
  useEffect(() => {
    if (step === 5 && !isScribePath && selectedDrivers.length === 0) {
      setSelectedDrivers(["patient_access", "level_of_service", "denials"]);
    }
  }, [step, isScribePath]);

  const getRampMultipliers = (drivers: DriverId[]) => {
    const rampSpeeds = drivers.map(id => DRIVERS.find(d => d.id === id)?.rampSpeed || "medium");
    const fastCount = rampSpeeds.filter(s => s === "fast").length;
    const slowCount = rampSpeeds.filter(s => s === "slow").length;
    
    if (fastCount > slowCount) {
      return { month3: 0.50, month6: 0.75, year1: 0.95, year2: 1.0, year3: 1.0 };
    } else if (slowCount > fastCount) {
      return { month3: 0.15, month6: 0.30, year1: 0.60, year2: 0.90, year3: 1.0 };
    } else {
      return { month3: 0.35, month6: 0.60, year1: 0.85, year2: 1.0, year3: 1.0 };
    }
  };

  const calculations = useMemo(() => {
    const theirUtil = utilization / 100;
    const abridgeUtil = ABRIDGE_BENCHMARKS.utilization / 100;
    
    const theirDocumentedEncounters = Math.round(annualEncounters * theirUtil);
    const abridgeDocumentedEncounters = Math.round(annualEncounters * abridgeUtil);
    const utilizationGapEncounters = abridgeDocumentedEncounters - theirDocumentedEncounters;
    const utilizationGapPercent = theirDocumentedEncounters > 0 ? Math.round((utilizationGapEncounters / theirDocumentedEncounters) * 100) : 0;
    
    const theirTimeSavedMinutes = theirDocumentedEncounters * timeSavings;
    const abridgeTimeSavedMinutes = abridgeDocumentedEncounters * ABRIDGE_BENCHMARKS.timeSavings;
    const theirTimeSavedHours = Math.round(theirTimeSavedMinutes / 60);
    const abridgeTimeSavedHours = Math.round(abridgeTimeSavedMinutes / 60);
    const efficiencyGapHours = abridgeTimeSavedHours - theirTimeSavedHours;
    const efficiencyGapPercent = theirTimeSavedMinutes > 0 ? Math.round(((abridgeTimeSavedMinutes - theirTimeSavedMinutes) / theirTimeSavedMinutes) * 100) : 0;
    
    const revenuePerVisit = 200;
    const overtimeRate = 100;
    const providerCost = 350000;
    const turnoverRate = 0.08;
    const burnoutReduction = 0.25;
    const avgClaimValue = 250;
    const avgWrvuValue = 45;
    const maPopulation = 0.30;
    const avgRafValue = 1200;
    
    type CalcStep = {
      label: string;
      value: string;
      isResult?: boolean;
    };
    
    type DriverCalc = {
      their: number;
      abridge: number;
      gap: number;
      theirCalc: string[];
      abridgeCalc: string[];
      // New transparent math structure
      gapBreakdown: {
        fromEfficiency?: {
          steps: CalcStep[];
          subtotal: number;
        };
        fromUtilization?: {
          steps: CalcStep[];
          subtotal: number;
        };
        direct?: {
          steps: CalcStep[];
          subtotal: number;
        };
        total: number;
        assumptions: string[];
      };
    };
    
    const createEmptyGapBreakdown = () => ({ total: 0, assumptions: [] as string[] });
    const driverValues: Record<DriverId, DriverCalc> = {
      patient_access: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
      overtime: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
      retention: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
      level_of_service: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
      denials: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
      hcc: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [], gapBreakdown: createEmptyGapBreakdown() },
    };
    
    const theirUsableHours = Math.round(theirTimeSavedHours * 0.20);
    const abridgeUsableHours = Math.round(abridgeTimeSavedHours * 0.20);
    const theirNewVisits = Math.round(theirUsableHours * 2);
    const abridgeNewVisits = Math.round(abridgeUsableHours * 2);
    const theirPatientAccess = theirNewVisits * revenuePerVisit;
    const abridgePatientAccess = abridgeNewVisits * revenuePerVisit;
    
    // Calculate efficiency gap contribution to patient access
    const efficiencyGapHoursForAccess = efficiencyGapHours;
    const efficiencyUsableHours = Math.round(efficiencyGapHoursForAccess * 0.20);
    const efficiencyNewVisits = Math.round(efficiencyUsableHours * 2);
    const efficiencyPatientAccessValue = efficiencyNewVisits * revenuePerVisit;
    
    // Calculate utilization gap contribution to patient access
    const utilizationNewEncounters = utilizationGapEncounters;
    const utilizationRealization = 0.20;
    const utilizationPatientAccessValue = Math.round(utilizationNewEncounters * utilizationRealization * revenuePerVisit);
    
    const patientAccessGap = abridgePatientAccess - theirPatientAccess;
    
    driverValues.patient_access = {
      their: theirPatientAccess,
      abridge: abridgePatientAccess,
      gap: patientAccessGap,
      theirCalc: [
        `${theirTimeSavedHours.toLocaleString()} hours returned`,
        `${theirUsableHours.toLocaleString()} usable (20% realization)`,
        `${theirNewVisits.toLocaleString()} new visits possible`,
        `${theirNewVisits.toLocaleString()} x $${revenuePerVisit} = ${formatCurrency(theirPatientAccess)}/year`,
      ],
      abridgeCalc: [
        `${abridgeTimeSavedHours.toLocaleString()} hours returned`,
        `${abridgeUsableHours.toLocaleString()} usable (20% realization)`,
        `${abridgeNewVisits.toLocaleString()} new visits possible`,
        `${abridgeNewVisits.toLocaleString()} x $${revenuePerVisit} = ${formatCurrency(abridgePatientAccess)}/year`,
      ],
      gapBreakdown: {
        fromEfficiency: {
          steps: [
            { label: `+${efficiencyGapHoursForAccess.toLocaleString()} hours returned`, value: '' },
            { label: `× 20% time-to-visit conversion`, value: '' },
            { label: `× $${revenuePerVisit} per visit`, value: '' },
            { label: `= ${formatCurrency(efficiencyPatientAccessValue)}/year`, value: formatCurrency(efficiencyPatientAccessValue), isResult: true },
          ],
          subtotal: efficiencyPatientAccessValue,
        },
        fromUtilization: {
          steps: [
            { label: `+${utilizationNewEncounters.toLocaleString()} more encounters documented`, value: '' },
            { label: `× 20% realization rate`, value: '' },
            { label: `× $${revenuePerVisit} per visit`, value: '' },
            { label: `= ${formatCurrency(utilizationPatientAccessValue)}/year`, value: formatCurrency(utilizationPatientAccessValue), isResult: true },
          ],
          subtotal: utilizationPatientAccessValue,
        },
        total: patientAccessGap,
        assumptions: [`20% realization rate`, `$${revenuePerVisit}/visit`],
      },
    };
    
    // Overtime calculations
    const theirOvertimeHours = Math.round(theirTimeSavedHours * 0.40);
    const abridgeOvertimeHours = Math.round(abridgeTimeSavedHours * 0.40);
    const theirOvertime = theirOvertimeHours * overtimeRate;
    const abridgeOvertime = abridgeOvertimeHours * overtimeRate;
    const overtimeGap = abridgeOvertime - theirOvertime;
    const efficiencyOvertimeValue = Math.round(efficiencyGapHours * 0.40 * overtimeRate);
    
    driverValues.overtime = {
      their: theirOvertime,
      abridge: abridgeOvertime,
      gap: overtimeGap,
      theirCalc: [
        `${theirTimeSavedHours.toLocaleString()} hours returned`,
        `${theirOvertimeHours.toLocaleString()} OT hours reduced (40%)`,
        `${theirOvertimeHours.toLocaleString()} x $${overtimeRate} = ${formatCurrency(theirOvertime)}/year`,
      ],
      abridgeCalc: [
        `${abridgeTimeSavedHours.toLocaleString()} hours returned`,
        `${abridgeOvertimeHours.toLocaleString()} OT hours reduced (40%)`,
        `${abridgeOvertimeHours.toLocaleString()} x $${overtimeRate} = ${formatCurrency(abridgeOvertime)}/year`,
      ],
      gapBreakdown: {
        fromEfficiency: {
          steps: [
            { label: `+${efficiencyGapHours.toLocaleString()} hours returned`, value: '' },
            { label: `× 40% converts to OT reduction`, value: '' },
            { label: `× $${overtimeRate}/hour OT rate`, value: '' },
            { label: `= ${formatCurrency(efficiencyOvertimeValue)}/year`, value: formatCurrency(efficiencyOvertimeValue), isResult: true },
          ],
          subtotal: efficiencyOvertimeValue,
        },
        total: overtimeGap,
        assumptions: [`40% OT conversion`, `$${overtimeRate}/hr OT rate`],
      },
    };
    
    // Retention calculations
    const theirRetention = Math.round(providers * turnoverRate * burnoutReduction * 0.5 * providerCost * 0.20);
    const abridgeRetention = Math.round(providers * turnoverRate * burnoutReduction * providerCost * 0.20);
    const retentionGap = abridgeRetention - theirRetention;
    const effectivenessGap = 0.50; // Abridge 100% vs current 50%
    
    driverValues.retention = {
      their: theirRetention,
      abridge: abridgeRetention,
      gap: retentionGap,
      theirCalc: [
        `${providers} providers x ${(turnoverRate * 100).toFixed(0)}% turnover`,
        `${burnoutReduction * 100}% burnout reduction x 50% effectiveness`,
        `x $${(providerCost / 1000)}K replacement x 20%`,
        `= ${formatCurrency(theirRetention)}/year`,
      ],
      abridgeCalc: [
        `${providers} providers x ${(turnoverRate * 100).toFixed(0)}% turnover`,
        `${burnoutReduction * 100}% burnout reduction x 100% effectiveness`,
        `x $${(providerCost / 1000)}K replacement x 20%`,
        `= ${formatCurrency(abridgeRetention)}/year`,
      ],
      gapBreakdown: {
        direct: {
          steps: [
            { label: `${providers} providers × ${(turnoverRate * 100).toFixed(0)}% turnover rate`, value: '' },
            { label: `× ${burnoutReduction * 100}% burnout reduction`, value: '' },
            { label: `× ${(effectivenessGap * 100).toFixed(0)}% higher effectiveness with Abridge`, value: '' },
            { label: `× $${(providerCost / 1000).toFixed(0)}K replacement cost × 20%`, value: '' },
            { label: `= ${formatCurrency(retentionGap)}/year`, value: formatCurrency(retentionGap), isResult: true },
          ],
          subtotal: retentionGap,
        },
        total: retentionGap,
        assumptions: [`8% turnover rate`, `$${(providerCost / 1000).toFixed(0)}K replacement cost`, `20% realization`],
      },
    };
    
    // Level of Service calculations
    const theirEmBillable = Math.round(theirDocumentedEncounters * 0.80);
    const abridgeEmBillable = Math.round(abridgeDocumentedEncounters * 0.80);
    const theirUnderCoded = Math.round(theirEmBillable * (underCoding / 100));
    const abridgeUnderCoded = Math.round(abridgeEmBillable * (ABRIDGE_BENCHMARKS.underCoding / 100));
    const theirWrvuCapture = theirUnderCoded * 0.7 * avgWrvuValue * (wrvuUplift / 100);
    const abridgeWrvuCapture = abridgeUnderCoded * 0.7 * avgWrvuValue * (ABRIDGE_BENCHMARKS.wrvuUplift / 100);
    const theirLos = Math.round(theirWrvuCapture);
    const abridgeLos = Math.round(abridgeWrvuCapture);
    const losGap = abridgeLos - theirLos;
    
    // Calculate utilization contribution to LOS
    const utilizationEmEncounters = Math.round(utilizationGapEncounters * 0.80);
    const utilizationUnderCoded = Math.round(utilizationEmEncounters * (ABRIDGE_BENCHMARKS.underCoding / 100));
    const utilizationLosValue = Math.round(utilizationUnderCoded * 0.7 * avgWrvuValue * (ABRIDGE_BENCHMARKS.wrvuUplift / 100));
    
    // Calculate rate improvement contribution
    const rateImprovementLos = losGap - utilizationLosValue;
    
    driverValues.level_of_service = {
      their: theirLos,
      abridge: abridgeLos,
      gap: losGap,
      theirCalc: [
        `${theirEmBillable.toLocaleString()} E/M encounters (80%)`,
        `${theirUnderCoded.toLocaleString()} under-coded (${underCoding}%)`,
        `x 0.7 wRVU x $${avgWrvuValue} x ${wrvuUplift}% uplift`,
        `= ${formatCurrency(theirLos)}/year`,
      ],
      abridgeCalc: [
        `${abridgeEmBillable.toLocaleString()} E/M encounters (80%)`,
        `${abridgeUnderCoded.toLocaleString()} under-coded (${ABRIDGE_BENCHMARKS.underCoding}%)`,
        `x 0.7 wRVU x $${avgWrvuValue} x ${ABRIDGE_BENCHMARKS.wrvuUplift}% uplift`,
        `= ${formatCurrency(abridgeLos)}/year`,
      ],
      gapBreakdown: {
        fromUtilization: {
          steps: [
            { label: `+${utilizationGapEncounters.toLocaleString()} more encounters`, value: '' },
            { label: `× 80% E/M billable`, value: '' },
            { label: `× ${ABRIDGE_BENCHMARKS.underCoding}% under-coded × 0.7 wRVU × $${avgWrvuValue}`, value: '' },
            { label: `= ${formatCurrency(utilizationLosValue)}/year`, value: formatCurrency(utilizationLosValue), isResult: true },
          ],
          subtotal: utilizationLosValue,
        },
        direct: rateImprovementLos > 0 ? {
          steps: [
            { label: `Better documentation quality`, value: '' },
            { label: `${ABRIDGE_BENCHMARKS.underCoding}% under-coding captured vs ${underCoding}%`, value: '' },
            { label: `${ABRIDGE_BENCHMARKS.wrvuUplift}% wRVU uplift vs ${wrvuUplift}%`, value: '' },
            { label: `= ${formatCurrency(rateImprovementLos)}/year`, value: formatCurrency(rateImprovementLos), isResult: true },
          ],
          subtotal: rateImprovementLos,
        } : undefined,
        total: losGap,
        assumptions: [`${ABRIDGE_BENCHMARKS.underCoding}% under-coded`, `$${avgWrvuValue}/wRVU`],
      },
    };
    
    // Denials calculations
    const denialRate = 0.07;
    const docRelatedRate = 0.35;
    const theirDenials = Math.round(theirDocumentedEncounters * denialRate);
    const theirDocDenials = Math.round(theirDenials * docRelatedRate);
    const theirPrevented = Math.round(theirDocDenials * (denialPrevention / 100));
    const theirDenialValue = theirPrevented * avgClaimValue;
    const abridgeDenials = Math.round(abridgeDocumentedEncounters * denialRate);
    const abridgeDocDenials = Math.round(abridgeDenials * docRelatedRate);
    const abridgePrevented = Math.round(abridgeDocDenials * (ABRIDGE_BENCHMARKS.denialPrevention / 100));
    const abridgeDenialValue = abridgePrevented * avgClaimValue;
    const denialsGap = abridgeDenialValue - theirDenialValue;
    
    // Calculate utilization contribution to denials
    const utilizationDenials = Math.round(utilizationGapEncounters * denialRate);
    const utilizationDocDenials = Math.round(utilizationDenials * docRelatedRate);
    const utilizationPrevented = Math.round(utilizationDocDenials * (ABRIDGE_BENCHMARKS.denialPrevention / 100));
    const utilizationDenialsValue = utilizationPrevented * avgClaimValue;
    
    // Calculate rate improvement contribution
    const rateImprovementDenials = denialsGap - utilizationDenialsValue;
    
    driverValues.denials = {
      their: theirDenialValue,
      abridge: abridgeDenialValue,
      gap: denialsGap,
      theirCalc: [
        `${theirDocumentedEncounters.toLocaleString()} encounters x 7% denial rate`,
        `${theirDocDenials.toLocaleString()} doc-related (35%)`,
        `${theirPrevented.toLocaleString()} prevented (${denialPrevention}%)`,
        `x $${avgClaimValue} = ${formatCurrency(theirDenialValue)}/year`,
      ],
      abridgeCalc: [
        `${abridgeDocumentedEncounters.toLocaleString()} encounters x 7% denial rate`,
        `${abridgeDocDenials.toLocaleString()} doc-related (35%)`,
        `${abridgePrevented.toLocaleString()} prevented (${ABRIDGE_BENCHMARKS.denialPrevention}%)`,
        `x $${avgClaimValue} = ${formatCurrency(abridgeDenialValue)}/year`,
      ],
      gapBreakdown: {
        fromUtilization: utilizationDenialsValue > 0 ? {
          steps: [
            { label: `+${utilizationGapEncounters.toLocaleString()} more encounters documented`, value: '' },
            { label: `× 7% denial rate × 35% doc-related`, value: '' },
            { label: `× ${ABRIDGE_BENCHMARKS.denialPrevention}% prevention × $${avgClaimValue}/claim`, value: '' },
            { label: `= ${formatCurrency(utilizationDenialsValue)}/year`, value: formatCurrency(utilizationDenialsValue), isResult: true },
          ],
          subtotal: utilizationDenialsValue,
        } : undefined,
        direct: rateImprovementDenials > 0 ? {
          steps: [
            { label: `Better documentation quality`, value: '' },
            { label: `${ABRIDGE_BENCHMARKS.denialPrevention}% denial prevention vs ${denialPrevention}%`, value: '' },
            { label: `Complete notes → fewer denials → savings`, value: '' },
            { label: `= ${formatCurrency(rateImprovementDenials)}/year`, value: formatCurrency(rateImprovementDenials), isResult: true },
          ],
          subtotal: rateImprovementDenials,
        } : undefined,
        total: denialsGap,
        assumptions: [`7% denial rate`, `35% doc-related`, `$${avgClaimValue}/claim`],
      },
    };
    
    // HCC calculations
    const theirHccPop = Math.round(theirDocumentedEncounters * maPopulation);
    const abridgeHccPop = Math.round(abridgeDocumentedEncounters * maPopulation);
    const theirHccValue = Math.round(theirHccPop * (hccImprovement / 100) * avgRafValue);
    const abridgeHccValue = Math.round(abridgeHccPop * (ABRIDGE_BENCHMARKS.hccImprovement / 100) * avgRafValue);
    const hccGap = abridgeHccValue - theirHccValue;
    
    // Calculate utilization contribution to HCC
    const utilizationHccPop = Math.round(utilizationGapEncounters * maPopulation);
    const utilizationHccValue = Math.round(utilizationHccPop * (ABRIDGE_BENCHMARKS.hccImprovement / 100) * avgRafValue);
    
    // Calculate rate improvement contribution
    const rateImprovementHcc = hccGap - utilizationHccValue;
    
    driverValues.hcc = {
      their: theirHccValue,
      abridge: abridgeHccValue,
      gap: hccGap,
      theirCalc: [
        `${theirHccPop.toLocaleString()} MA encounters (30%)`,
        `${hccImprovement}% HCC improvement`,
        `x $${avgRafValue.toLocaleString()} RAF value`,
        `= ${formatCurrency(theirHccValue)}/year`,
      ],
      abridgeCalc: [
        `${abridgeHccPop.toLocaleString()} MA encounters (30%)`,
        `${ABRIDGE_BENCHMARKS.hccImprovement}% HCC improvement`,
        `x $${avgRafValue.toLocaleString()} RAF value`,
        `= ${formatCurrency(abridgeHccValue)}/year`,
      ],
      gapBreakdown: {
        fromUtilization: utilizationHccValue > 0 ? {
          steps: [
            { label: `+${utilizationGapEncounters.toLocaleString()} more encounters`, value: '' },
            { label: `× 30% MA population`, value: '' },
            { label: `× ${ABRIDGE_BENCHMARKS.hccImprovement}% HCC improvement × $${avgRafValue.toLocaleString()} RAF`, value: '' },
            { label: `= ${formatCurrency(utilizationHccValue)}/year`, value: formatCurrency(utilizationHccValue), isResult: true },
          ],
          subtotal: utilizationHccValue,
        } : undefined,
        direct: rateImprovementHcc > 0 ? {
          steps: [
            { label: `Better HCC capture rate`, value: '' },
            { label: `${ABRIDGE_BENCHMARKS.hccImprovement}% improvement vs ${hccImprovement}%`, value: '' },
            { label: `Complete notes → better coding → RAF value`, value: '' },
            { label: `= ${formatCurrency(rateImprovementHcc)}/year`, value: formatCurrency(rateImprovementHcc), isResult: true },
          ],
          subtotal: rateImprovementHcc,
        } : undefined,
        total: hccGap,
        assumptions: [`30% MA population`, `$${avgRafValue.toLocaleString()} RAF value`],
      },
    };
    
    let totalGap = 0;
    selectedDrivers.forEach((driverId: DriverId) => {
      totalGap += driverValues[driverId].gap;
    });
    
    const ramp = getRampMultipliers(selectedDrivers);
    
    const month6Value = Math.round(totalGap * ramp.month6 * 0.5);
    const year1Value = Math.round(totalGap * ramp.year1);
    const year2Value = Math.round(totalGap * ramp.year2);
    const year3Value = Math.round(totalGap * ramp.year3);
    const threeYearTotal = year1Value + year2Value + year3Value;
    
    const waitMonth6Value = 0;
    const waitYear1Value = Math.round(totalGap * ramp.month6 * 0.5);
    const waitYear2Value = Math.round(totalGap * ramp.year1);
    const waitYear3Value = Math.round(totalGap * ramp.year2);
    const waitThreeYearTotal = waitYear1Value + waitYear2Value + waitYear3Value;
    const costOfWaiting = threeYearTotal - waitThreeYearTotal;
    
    return {
      theirDocumentedEncounters,
      abridgeDocumentedEncounters,
      utilizationGapEncounters,
      utilizationGapPercent,
      theirTimeSavedHours,
      abridgeTimeSavedHours,
      efficiencyGapHours,
      efficiencyGapPercent,
      driverValues,
      totalGap,
      monthlyGap: Math.round(totalGap / 12),
      ramp,
      month6Value,
      year1Value,
      year2Value,
      year3Value,
      threeYearTotal,
      waitMonth6Value,
      waitYear1Value,
      waitYear2Value,
      waitYear3Value,
      waitThreeYearTotal,
      costOfWaiting,
    };
  }, [providers, annualEncounters, utilization, timeSavings, wrvuUplift, underCoding, denialPrevention, hccImprovement, selectedDrivers]);

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return selectedSolution !== null && selectedSetting !== null;
      case 2: return providers > 0 && annualEncounters > 0;
      case 3: return true;
      case 4: return true;
      case 5: return isScribePath ? true : true; // Ambient AI: Summary, Scribe: Scribe Details
      case 6: return isScribePath ? true : true; // Scribe: Value Breakdown
      case 7: return true; // Scribe: Summary Dashboard
      default: return false;
    }
  };

  const handleContinue = () => {
    const maxStep = isScribePath ? 7 : 5; // Ambient AI is now 5 steps
    if (step < maxStep) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      onBack();
    }
  };

  const toggleDriver = (driverId: DriverId) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId);
      } else {
        return [...prev, driverId];
      }
    });
  };

  const toggleDriverExpanded = (driverId: DriverId) => {
    setExpandedDrivers(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId);
      } else {
        return [...prev, driverId];
      }
    });
  };

  // Chart data with both Abridge and "Stay with current" lines
  // Current solution shows minimal value growth (5% of Abridge value as baseline inefficiency)
  const chartData = [
    { period: "Today", abridge: 0, current: 0, milestone: null },
    { period: "3 mo", abridge: Math.round(calculations.totalGap * calculations.ramp.month3 * 0.25), current: Math.round(calculations.totalGap * 0.02), milestone: "Quick wins" },
    { period: "6 mo", abridge: calculations.month6Value, current: Math.round(calculations.totalGap * 0.04), milestone: null },
    { period: "Year 1", abridge: calculations.year1Value, current: Math.round(calculations.totalGap * 0.06), milestone: "Full ramp" },
    { period: "Year 2", abridge: calculations.year1Value + calculations.year2Value, current: Math.round(calculations.totalGap * 0.08), milestone: null },
    { period: "Year 3", abridge: calculations.threeYearTotal, current: Math.round(calculations.totalGap * 0.10), milestone: null },
  ];

  const getUtilizationStatus = (util: number) => {
    if (util < 40) return { label: "Low", icon: Frown, color: "text-red-500", bgColor: "bg-red-50" };
    if (util < 55) return { label: "Average", icon: Meh, color: "text-amber-500", bgColor: "bg-amber-50" };
    if (util < 65) return { label: "Good", icon: Smile, color: "text-emerald-500", bgColor: "bg-emerald-50" };
    return { label: "Great", icon: PartyPopper, color: "text-emerald-600", bgColor: "bg-emerald-50" };
  };

  const status = getUtilizationStatus(utilization);
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-white">
      <style>{spectrumStyles}</style>
      <header className="border-b border-neutral-100 bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            <span className="text-xs md:text-sm font-medium text-neutral-400 tracking-wide">SWITCH</span>
          </div>
          
          <div className="flex items-center gap-1 md:gap-1.5">
            {(isScribePath ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5]).map((s) => (
              <div
                key={s}
                className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full transition-all ${
                  s === step
                    ? "w-4 md:w-6 bg-[#E85D3F]"
                    : s < step
                    ? "bg-[#E85D3F]/40"
                    : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden md:inline">{step === 1 ? "Back to Home" : "Back"}</span>
            <span className="md:hidden">Back</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12">
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 mb-2 md:mb-3 text-center" data-testid="text-step1-title">
              What solution are you using today?
            </h1>
            <p className="text-base md:text-lg text-neutral-500 text-center mb-6 md:mb-12">
              We'll show you what you might be leaving on the table.
            </p>
            
            <div className="flex flex-col gap-4 max-w-xl mx-auto">
              {(["ambient", "scribes"] as SolutionType[]).map((solution) => {
                const data = SOLUTION_DATA[solution];
                const isSelected = selectedSolution === solution;
                const Icon = solution === "ambient" ? Mic : User;
                
                return (
                  <button
                    key={solution}
                    onClick={() => setSelectedSolution(solution)}
                    className={`group relative flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[#E85D3F] bg-[#E85D3F]/5 shadow-lg"
                        : "border-neutral-200 hover:border-neutral-300 hover:shadow-md bg-white"
                    }`}
                    data-testid={`card-solution-${solution}`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isSelected ? "bg-neutral-900/10" : "bg-neutral-100 group-hover:bg-neutral-200"
                    }`}>
                      <Icon className={`w-7 h-7 transition-colors ${isSelected ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-700"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-neutral-900 mb-1">{data.name}</h3>
                      <p className="text-sm text-neutral-500 leading-relaxed">
                        {solution === "ambient" ? "Currently using DAX, Ambience Healthcare, or similar" : "In-person or virtual scribes"}
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 md:mt-8">
              <p className="text-xs md:text-sm font-medium text-neutral-600 mb-3 md:mb-4 text-center">Select a care setting:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {CARE_SETTINGS.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => setting.available && setSelectedSetting(setting.id)}
                    disabled={!setting.available}
                    className={`relative px-5 py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center min-w-[100px] min-h-[60px] ${
                      selectedSetting === setting.id
                        ? "bg-neutral-900 text-white"
                        : setting.available
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-transparent"
                        : "bg-neutral-50 text-neutral-400 cursor-not-allowed border-2 border-dashed border-neutral-200"
                    }`}
                    title={!setting.available ? "Coming Q2 2025" : undefined}
                    data-testid={`button-setting-${setting.id}`}
                  >
                    <span>{setting.label}</span>
                    {!setting.available && (
                      <span className="text-[11px] text-neutral-400 mt-0.5">Coming Soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 md:mt-12 flex justify-center">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 md:px-10 py-2.5 md:py-3 h-auto text-sm md:text-base font-semibold rounded-xl transition-all disabled:opacity-40 w-full md:w-auto"
                data-testid="button-continue-step1"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 mb-2 md:mb-3 text-center" data-testid="text-step2-title">
              Let's start with the basics.
            </h1>
            <p className="text-base md:text-lg text-neutral-500 mb-6 md:mb-12 text-center">We'll build your baseline together.</p>

            <div className="bg-neutral-50 rounded-2xl p-5 md:p-10 space-y-6 md:space-y-8">
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-x-2">
                  <span className="text-base md:text-xl text-neutral-700">You have</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={providers === 0 ? "" : providers.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setProviders(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder="50"
                      className="w-20 px-3 py-2 rounded-lg border-2 border-neutral-300 bg-white text-lg md:text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                      data-testid="input-providers"
                    />
                    <span className="text-base md:text-xl text-neutral-700">providers</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-x-2">
                  <span className="text-base md:text-xl text-neutral-700">handling roughly</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={annualEncounters === 0 ? "" : annualEncounters.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAnnualEncounters(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder="100,000"
                      className="w-28 md:w-32 px-3 py-2 rounded-lg border-2 border-neutral-300 bg-white text-lg md:text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                      data-testid="input-encounters"
                    />
                    <span className="text-base md:text-xl text-neutral-700">encounters/year</span>
                    {providers > 0 && annualEncounters === 0 && (
                      <button
                        onClick={() => setAnnualEncounters(providers * 2000)}
                        className="px-3 py-2 bg-[#E85D3F]/10 hover:bg-[#E85D3F]/20 text-[#E85D3F] text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        data-testid="button-auto-calculate"
                        title={`Auto-fill: ${providers} providers × 2,000 = ${(providers * 2000).toLocaleString()}`}
                      >
                        Use typical
                      </button>
                    )}
                  </div>
                </div>

                {annualEncounters > 0 && providers > 0 && (
                  <div className="flex items-center gap-2 text-sm md:text-base text-neutral-500 pl-1">
                    <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-amber-500 flex-shrink-0" />
                    <span>
                      That's ~{Math.round(annualEncounters / providers).toLocaleString()} per provider
                      <span className="text-neutral-400">
                        {Math.round(annualEncounters / providers) >= 1500 && Math.round(annualEncounters / providers) <= 2500 
                          ? " (typical)" 
                          : Math.round(annualEncounters / providers) > 2500
                            ? " (high volume)"
                            : " (lower volume)"}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {!isScribePath && (
                <div className="border-t border-neutral-200 pt-6 md:pt-8">
                  <p className="text-base md:text-xl text-neutral-700 mb-4 md:mb-6">
                    And your current utilization is:
                  </p>
                  
                  <div className="relative">
                    <div className="mb-3 md:mb-4 text-center">
                      <span className="inline-flex items-baseline gap-1 bg-white border-2 border-neutral-200 rounded-xl px-4 md:px-5 py-2.5 md:py-3 shadow-sm">
                        <span className="text-3xl md:text-4xl font-bold text-neutral-900">{utilization}</span>
                        <span className="text-base md:text-lg text-neutral-400">%</span>
                      </span>
                    </div>
                    
                    <div className="relative">
                      <div className="relative rounded-full bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-400 h-3">
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-neutral-400"
                          style={{ left: `${((45 - 10) / 80) * 100}%` }}
                          title="Industry Average: 45%"
                        />
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-6 bg-neutral-600"
                          style={{ left: `${((65 - 10) / 80) * 100}%` }}
                          title="Abridge Average: 65%"
                        />
                      </div>
                      
                      <Slider
                        value={[utilization]}
                        onValueChange={(v) => setUtilization(v[0])}
                        min={10}
                        max={90}
                        step={5}
                        className="absolute inset-0 [&_[role=slider]]:w-10 [&_[role=slider]]:h-10 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-neutral-400 [&_[role=slider]]:shadow-lg [&_[role=slider]]:rounded-full [&_[role=slider]]:cursor-grab [&_[role=slider]]:active:cursor-grabbing [&_[role=slider]]:hover:border-[#E85D3F] [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-[#E85D3F]/30 [&_.relative]:bg-transparent [&_.relative]:h-3 [&_[class*='bg-primary']]:bg-transparent"
                        data-testid="slider-utilization"
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-neutral-400 mt-4 px-2">
                      <span>10%</span>
                      <span>90%</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
                      <div className="bg-[#F3F4F6] rounded-xl p-3 md:p-4 text-center border border-[#E5E7EB]">
                        <p className="text-xs md:text-sm text-[#9CA3AF] mb-0.5 md:mb-1">Industry Avg</p>
                        <p className="text-xl md:text-2xl font-bold text-[#6B7280]">45%</p>
                      </div>
                      <div className="bg-[#FEF7F6] rounded-xl p-3 md:p-4 text-center border border-[#E85D3F]/20">
                        <p className="text-xs md:text-sm text-[#E85D3F]/70 mb-0.5 md:mb-1">Abridge Avg</p>
                        <p className="text-xl md:text-2xl font-bold text-[#D04D2F]">65%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isScribePath && (
              <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
                <p className="text-lg text-amber-900 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                  <span>
                    At these numbers, you're documenting <strong className="text-amber-950 font-semibold">{calculations.theirDocumentedEncounters.toLocaleString()}</strong> encounters/year
                  </span>
                </p>
              </div>
            )}

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step2"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && !isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step3-title">
              What does "Great" utilization mean?
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Let's compare where you are to where top performers are.</p>

            <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
              {(() => {
                const youPos = Math.min(Math.max((utilization - 10) / 80 * 100, 2), 98);
                const abridgePos = (ABRIDGE_BENCHMARKS.utilization - 10) / 80 * 100;
                const tooClose = Math.abs(youPos - abridgePos) < 25;
                const youIsLeft = youPos < abridgePos;
                const gapWidth = Math.abs(abridgePos - youPos);
                
                return (
                  <div className="relative h-32 mb-4">
                    <div 
                      className="absolute inset-x-0 top-1/2 h-4 bg-gradient-to-r from-red-200 via-amber-200 via-emerald-200 to-emerald-400 rounded-full -translate-y-1/2 origin-left"
                      style={{ animation: "scaleX 0.6s ease-out forwards" }}
                    />
                    
                    <div 
                      className="absolute flex flex-col items-center"
                      style={{ 
                        left: `${youPos}%`, 
                        top: tooClose && youIsLeft ? "-4px" : tooClose ? "8px" : "0", 
                        transform: "translateX(-50%)",
                        animation: "slideInFromLeft 0.5s ease-out 0.2s both"
                      }}
                    >
                      <span className="text-xs font-bold text-neutral-700 bg-white px-3 py-1.5 rounded-lg border-2 border-neutral-400 shadow-md whitespace-nowrap">
                        YOU ({utilization}%)
                      </span>
                      <div className="w-0.5 h-5 bg-neutral-600" />
                      <div className="w-5 h-5 rounded-full bg-neutral-700 border-2 border-white shadow-lg" />
                    </div>
                    
                    <div 
                      className="absolute flex flex-col items-center"
                      style={{ 
                        left: `${abridgePos}%`, 
                        top: tooClose && !youIsLeft ? "-4px" : tooClose ? "8px" : "0", 
                        transform: "translateX(-50%)",
                        animation: "slideInFromRight 0.5s ease-out 0.4s both"
                      }}
                    >
                      <span className="text-xs font-bold text-[#E85D3F] bg-[#E85D3F]/10 px-3 py-1.5 rounded-lg border-2 border-[#E85D3F] shadow-md whitespace-nowrap">
                        ABRIDGE ({ABRIDGE_BENCHMARKS.utilization}%)
                      </span>
                      <div className="w-0.5 h-5 bg-[#E85D3F]" />
                      <div className="w-5 h-5 rounded-full bg-[#E85D3F] border-2 border-white shadow-lg" />
                    </div>

                    {utilization < ABRIDGE_BENCHMARKS.utilization && (
                      <>
                        <div 
                          className="absolute top-1/2 -translate-y-1/2"
                          style={{ 
                            left: `${youPos}%`,
                            width: `${gapWidth}%`,
                            animation: "fadeIn 0.4s ease-out 0.6s both"
                          }}
                        >
                          <div className="h-6 border-2 border-[#E85D3F] border-t-0 rounded-b-lg" />
                          <div 
                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                            style={{ animation: "pulse 2s ease-in-out infinite" }}
                          >
                            <span className="text-sm font-bold text-[#E85D3F] bg-[#E85D3F]/10 px-3 py-1 rounded-full border border-[#E85D3F]/30">
                              +{ABRIDGE_BENCHMARKS.utilization - utilization}% gap
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-between text-xs text-neutral-400 mt-10 px-2">
                <span>10%</span>
                <span>45% Industry</span>
                <span>65% Abridge</span>
                <span>90%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-0 relative">
              <div className="relative bg-[#F3F4F6] rounded-2xl p-6 border border-neutral-200">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Your Current</p>
                <p className="text-sm text-[#9CA3AF] mb-1">At {utilization}% utilization</p>
                <p className="text-4xl font-bold text-[#6B7280] mb-1 tabular-nums">{calculations.theirDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-[#9CA3AF]">encounters documented/year</p>
              </div>
              
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full border-2 border-neutral-300 items-center justify-center shadow-lg">
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
              
              <div className="relative bg-[#FEF7F7] rounded-2xl p-6 border-2 border-[#E85D3F]/20">
                <div className="absolute top-4 right-4 text-[#E85D3F]/10 font-bold text-4xl">A</div>
                <p className="text-xs font-semibold text-[#E85D3F]/80 uppercase tracking-wide mb-2">With Abridge</p>
                <p className="text-sm text-[#1F2937]/60 mb-1">At {ABRIDGE_BENCHMARKS.utilization}% utilization</p>
                <p className="text-4xl font-bold text-[#1F2937] mb-1 tabular-nums">{calculations.abridgeDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-[#1F2937]/70">encounters documented/year</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-600 text-sm font-semibold px-3 py-1 rounded-full">
                  <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                  +{Math.round(((calculations.abridgeDocumentedEncounters - calculations.theirDocumentedEncounters) / calculations.theirDocumentedEncounters) * 100)}% more
                </div>
              </div>
            </div>
            
            {/* Connector bracket to result box */}
            <div className="flex justify-center py-2">
              <div className="w-px h-4 bg-emerald-300" />
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="bg-emerald-50 rounded-xl px-6 py-4 text-center border-2 border-emerald-300 shadow-sm">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{calculations.utilizationGapEncounters.toLocaleString()}</p>
                <p className="text-sm text-emerald-600/80">additional encounters/year</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                That <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> utilization gap = <strong>{calculations.utilizationGapPercent}%</strong> more encounters being documented.
              </p>
              <p className="text-amber-900 font-semibold mt-2 text-lg">This is where value leaks.</p>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step3"
              >
                Next: See the efficiency gap
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 3: Your Scribe Program */}
        {step === 3 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step3-scribe-title">
              Tell us about your scribe program
            </h1>
            <p className="text-lg text-neutral-500 mb-10">We'll calculate the full cost comparison.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 md:p-8 space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-neutral-900">
                  How many providers currently have scribes?
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={providersWithScribes.toString()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      const num = val === "" ? 0 : Math.min(parseInt(val, 10), providers);
                      setProvidersWithScribes(num);
                    }}
                    className="w-24 px-4 py-3 rounded-xl border-2 border-neutral-300 bg-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                    data-testid="input-providers-with-scribes"
                  />
                  <span className="text-lg text-neutral-600">of {providers} providers</span>
                </div>
                <Slider
                  value={[providersWithScribes]}
                  onValueChange={(v) => setProvidersWithScribes(v[0])}
                  min={0}
                  max={providers}
                  step={1}
                  className="mt-4"
                  data-testid="slider-providers-with-scribes"
                />
                <div className="mt-4 bg-white rounded-xl p-4 border border-neutral-200">
                  <p className="text-neutral-700">
                    That's <strong className="text-neutral-900">{coveragePercent}%</strong> of your providers with scribe support.
                  </p>
                  <p className="text-neutral-500 mt-1">
                    <strong className="text-neutral-700">{100 - coveragePercent}%</strong> are self documenting.
                  </p>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-6 space-y-2">
                <label className="block text-sm font-semibold text-neutral-900">
                  Average hourly cost per scribe
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-neutral-400">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={scribeHourlyCost.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setScribeHourlyCost(val === "" ? 0 : parseInt(val, 10));
                      }}
                      className="w-28 pl-8 pr-4 py-3 rounded-xl border-2 border-neutral-300 bg-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                      data-testid="input-scribe-hourly-cost"
                    />
                  </div>
                  <span className="text-lg text-neutral-600">/hour</span>
                  <span className="text-sm text-neutral-400">(typical range: $18-40)</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-6 space-y-2">
                <label className="block text-sm font-semibold text-neutral-900">
                  Hours each scribe works per week
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={scribeHoursPerWeek.toString()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setScribeHoursPerWeek(val === "" ? 0 : parseInt(val, 10));
                    }}
                    className="w-24 px-4 py-3 rounded-xl border-2 border-neutral-300 bg-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                    data-testid="input-scribe-hours"
                  />
                  <span className="text-lg text-neutral-600">hours/week</span>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
              <p className="text-lg text-blue-900 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" />
                <span>
                  Your annual scribe spend: <strong className="text-2xl text-blue-950 font-bold">{formatCurrency(annualScribeCost)}</strong>
                </span>
              </p>
              <p className="text-sm text-blue-700 mt-2 ml-9">
                {providersWithScribes} scribes × ${scribeHourlyCost}/hr × {scribeHoursPerWeek} hrs/week × 50 weeks
              </p>
              <p className="text-xs text-blue-600/70 mt-1 ml-9">
                Assumes 1 dedicated scribe per covered provider
              </p>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={providersWithScribes === 0 || scribeHourlyCost === 0}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl disabled:opacity-40"
                data-testid="button-continue-step3-scribe"
              >
                See the coverage gap
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && !isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step4-title">
              The efficiency gap
            </h1>
            <p className="text-lg text-neutral-500 mb-10">It's not just how often it's used - it's how much time it returns.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 mb-8">
              {/* Context about time savings */}
              <div className="mb-6 pb-6 border-b border-neutral-200">
                <p className="text-neutral-700 mb-2">
                  Most ambient AI solutions return <strong>1-2 minutes</strong> per encounter.
                </p>
                <p className="text-neutral-700 mb-3">
                  Abridge averages <strong className="text-[#E85D3F]">3 minutes</strong> based on deeper workflow integration.
                </p>
                <p className="text-sm text-neutral-500 font-medium">Where does your current solution land?</p>
              </div>
              
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                How much time does {solutionData?.name || "your solution"} save per encounter?
              </label>
              <p className="text-sm text-neutral-500 mb-5">Your best estimate - we'll use benchmarks if unsure</p>
              
              {timeSavingsKnown ? (
                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                  <div className="text-center mb-3">
                    <span className="text-3xl font-bold text-neutral-900">{timeSavings} min</span>
                  </div>
                  <Slider
                    value={[timeSavings]}
                    onValueChange={(v) => setTimeSavings(v[0])}
                    min={0.5}
                    max={5}
                    step={0.25}
                    className="w-full"
                    data-testid="slider-time-savings"
                  />
                  <div className="flex justify-between mt-2 text-xs text-neutral-400">
                    <span>0.5 min</span>
                    <span>5 min</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                  <p className="text-neutral-500 text-center">Using benchmark: <strong>{solutionData?.typicalTimeSavings || 1.5} min</strong></p>
                </div>
              )}

              <label className="flex items-center gap-2.5 mt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!timeSavingsKnown}
                  onChange={(e) => {
                    const notSure = e.target.checked;
                    setTimeSavingsKnown(!notSure);
                    if (notSure && solutionData) {
                      setTimeSavings(solutionData.typicalTimeSavings);
                    }
                  }}
                  className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                  data-testid="checkbox-not-sure"
                />
                <span className="text-sm text-neutral-600">Not sure / Haven't measured</span>
              </label>

              <div className="mt-5 pt-5 border-t border-neutral-200 flex items-center justify-between">
                <span className="text-sm text-neutral-600">You're getting: <strong>{timeSavings} min/encounter</strong></span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#E85D3F] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Abridge avg: {ABRIDGE_BENCHMARKS.timeSavings} min
                  </span>
                  <button 
                    onClick={() => setShowBenchmarkModal(true)}
                    className="text-xs text-neutral-500 hover:text-[#E85D3F] underline underline-offset-2"
                    data-testid="button-see-benchmark"
                  >
                    See benchmark data
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-0 relative">
              <div className="bg-[#F3F4F6] rounded-2xl p-6 border border-neutral-200">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Your Current</p>
                <p className="text-sm text-[#9CA3AF] mb-1">At {timeSavings} min savings</p>
                <p className="text-4xl font-bold text-[#6B7280] mb-1 tabular-nums">{calculations.theirTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-[#9CA3AF]">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-3 font-mono">
                  {timeSavings} min × {calculations.theirDocumentedEncounters.toLocaleString()} ÷ 60
                </p>
              </div>
              
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full border-2 border-neutral-300 items-center justify-center shadow-lg">
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
              
              <div className="bg-[#FEF7F7] rounded-2xl p-6 border-2 border-[#E85D3F]/20">
                <p className="text-xs font-semibold text-[#E85D3F]/80 uppercase tracking-wide mb-2">With Abridge</p>
                <p className="text-sm text-[#1F2937]/60 mb-1">At {ABRIDGE_BENCHMARKS.timeSavings} min savings</p>
                <p className="text-4xl font-bold text-[#1F2937] mb-1 tabular-nums">{calculations.abridgeTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-[#1F2937]/70">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-3 font-mono">
                  {ABRIDGE_BENCHMARKS.timeSavings} min × {calculations.abridgeDocumentedEncounters.toLocaleString()} ÷ 60
                </p>
              </div>
            </div>
            
            {/* Connector to result box */}
            <div className="flex justify-center py-2">
              <div className="w-px h-4 bg-emerald-300" />
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-50 rounded-xl px-6 py-4 text-center border-2 border-emerald-300 shadow-sm">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{calculations.efficiencyGapHours.toLocaleString()} hours</p>
                <p className="text-sm text-emerald-600/80">That's {calculations.efficiencyGapPercent}% MORE time returned</p>
              </div>
            </div>
            
            {/* "So what" context for hours */}
            <div className="text-center mb-8">
              <p className="text-neutral-600">
                That's <strong className="text-neutral-800">~{Math.round(calculations.efficiencyGapHours / 52)} hours/week</strong> your providers get back
                <span className="text-neutral-400 mx-2">|</span>
                Equivalent to <strong className="text-neutral-800">{(calculations.efficiencyGapHours / 2080).toFixed(1)} FTE</strong> of documentation time
              </p>
            </div>

            {/* Benchmark Modal */}
            {showBenchmarkModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBenchmarkModal(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-neutral-900">Abridge Time Savings Benchmarks</h3>
                    <button onClick={() => setShowBenchmarkModal(false)} className="text-neutral-400 hover:text-neutral-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-neutral-600 mb-4">
                    Based on time studies across <strong>200+ deployments</strong>
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                      <span className="text-neutral-700">Outpatient</span>
                      <span className="font-semibold text-neutral-900">2.5-4 min</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                      <span className="text-neutral-700">Specialty</span>
                      <span className="font-semibold text-neutral-900">2-3.5 min</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                      <span className="text-neutral-700">ED</span>
                      <span className="font-semibold text-neutral-900">3-5 min</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg">
                    We use <strong>3 min</strong> as a conservative cross-setting average.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step4"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 4: Coverage Gap */}
        {step === 4 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step4-scribe-title">
              The coverage gap
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Scribes can only scale so far.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 md:p-8 space-y-8">
              <div>
                <p className="text-sm font-semibold text-neutral-600 uppercase tracking-wide mb-4">Your Current Coverage</p>
                <div className="relative h-12 rounded-full overflow-hidden bg-neutral-200">
                  <div 
                    className="absolute inset-y-0 left-0 bg-neutral-500 flex items-center justify-end pr-3"
                    style={{ width: `${coveragePercent}%` }}
                  >
                    {coveragePercent > 15 && (
                      <span className="text-xs font-bold text-white">{providersWithScribes} with scribes</span>
                    )}
                  </div>
                  <div 
                    className="absolute inset-y-0 right-0 bg-neutral-300 flex items-center justify-start pl-3"
                    style={{ width: `${100 - coveragePercent}%` }}
                  >
                    {100 - coveragePercent > 15 && (
                      <span className="text-xs font-semibold text-neutral-600">{providersWithoutScribes} without scribes</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-neutral-600"><strong className="text-neutral-900">{coveragePercent}%</strong> covered</span>
                  <span className="text-neutral-500"><strong className="text-neutral-700">{100 - coveragePercent}%</strong> self documenting</span>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-4">With Abridge</p>
                <div className="relative h-12 rounded-full overflow-hidden bg-emerald-500">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">All {providers} providers have access to Abridge</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-center text-sm text-emerald-600 font-medium">
                    Average utilization: {Math.round(ABRIDGE_UTILIZATION * 100)}% based on Abridge partner benchmarks
                  </p>
                  <p className="text-center text-xs text-neutral-400">
                    No per-provider cost barrier to scale
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-neutral-100 rounded-xl p-5 border border-neutral-200">
              <p className="text-neutral-800 font-semibold mb-2">The {providersWithoutScribes} self-documenting providers are:</p>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                  Self-documenting after hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                  Less time available for patient care
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full" />
                  Higher administrative burden
                </li>
              </ul>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step4-scribe"
              >
                See your current spend
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 5: What You're Spending Today */}
        {step === 5 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step5-scribe-title">
              What you're spending today
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Let's put your scribe investment in context.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 md:p-8 border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Your Current Scribe Program</p>
              <p className="text-4xl font-bold text-neutral-800 mb-2 tabular-nums">{formatCurrency(annualScribeCost)}/year</p>
              <p className="text-sm text-neutral-500 mb-2 font-mono">
                {providersWithScribes} scribes × ${scribeHourlyCost}/hr × {scribeHoursPerWeek} hrs × 50 weeks
              </p>
              <p className="text-sm text-neutral-500 mb-6">Covering {providersWithScribes} of {providers} providers ({coveragePercent}%)</p>
              
              <div className="border-t border-neutral-200 pt-6">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Breaking It Down</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                    <p className="text-2xl font-bold text-neutral-800 tabular-nums">{formatCurrency(Math.round(annualScribeCost / 12))}</p>
                    <p className="text-xs text-neutral-500 mt-1">per month</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                    <p className="text-2xl font-bold text-neutral-800 tabular-nums">{formatCurrency(Math.round(annualScribeCost / providersWithScribes))}</p>
                    <p className="text-xs text-neutral-500 mt-1">per covered provider/year</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                    <p className="text-2xl font-bold text-neutral-400">$0</p>
                    <p className="text-xs text-neutral-500 mt-1">for the other {providersWithoutScribes} providers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                Abridge pricing varies by deployment. Your Sales Director can provide specifics.
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                For now, let's look at the full cost of your scribe program — including the costs that don't show up in the budget.
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step5-scribe"
              >
                See the hidden costs
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 6: Hidden Costs */}
        {step === 6 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step6-scribe-title">
              The costs you don't see
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Scribes come with operational overhead.</p>

            {/* Section 1: Quantified Costs */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Quantified Costs</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Turnover & Training Card */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Turnover & Training</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-600">Annual turnover rate:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={scribeTurnoverRate}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setScribeTurnoverRate(val === "" ? 0 : Math.min(parseInt(val, 10), 100));
                        }}
                        className="w-14 px-2 py-1 rounded-lg border-2 border-neutral-300 bg-white text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F]"
                        data-testid="input-turnover-rate"
                      />
                      <span className="text-sm text-neutral-600">%</span>
                      <span className="text-xs text-neutral-400">(typical: 30-40%)</span>
                    </div>
                    
                    <div className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600 space-y-1">
                      <p>Your {providersWithScribes} scribes × {scribeTurnoverRate}% = <strong>~{Math.round(providersWithScribes * (scribeTurnoverRate / 100))} replacements/year</strong></p>
                      <p>× $4,000 to recruit + train</p>
                    </div>
                    
                    <div className="pt-2 border-t border-neutral-100">
                      <p className="text-lg font-bold text-amber-700 tabular-nums">Annual cost: {formatCurrency(annualTurnoverCost)}</p>
                    </div>
                  </div>
                </div>

                {/* Management Overhead Card */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Management Overhead</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hasScribeManagement}
                        onChange={(e) => setHasScribeManagement(!e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
                        data-testid="checkbox-no-management"
                      />
                      <span className="text-sm text-neutral-600">We don't have dedicated scribe management</span>
                    </label>
                    
                    {hasScribeManagement ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-600">Hours/week managing scribes:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={managementHoursPerWeek}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setManagementHoursPerWeek(val === "" ? 0 : parseInt(val, 10));
                            }}
                            className="w-14 px-2 py-1 rounded-lg border-2 border-neutral-300 bg-white text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F]"
                            data-testid="input-management-hours"
                          />
                          <span className="text-sm text-neutral-600">hrs</span>
                        </div>
                        
                        <div className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600">
                          <p>{managementHoursPerWeek} hrs × $50/hr × 50 weeks</p>
                        </div>
                        
                        <div className="pt-2 border-t border-neutral-100">
                          <p className="text-lg font-bold text-blue-700 tabular-nums">Annual cost: {formatCurrency(managementOverhead)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="pt-2 border-t border-neutral-100">
                        <p className="text-lg font-bold text-neutral-400 tabular-nums">Annual cost: $0</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Subtotal */}
            <div className="bg-neutral-100 rounded-xl p-4 mb-8">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-neutral-700">Total quantified hidden costs:</p>
                <p className="text-2xl font-bold text-neutral-800 tabular-nums">{formatCurrency(hiddenCosts)}/year</p>
              </div>
            </div>

            {/* Section 2: Also Consider */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Also Consider</p>
              
              <div className="border-l-2 border-neutral-200 pl-4 py-2">
                <p className="text-sm text-neutral-600 mb-2">
                  <strong className="text-neutral-700">Coverage Gaps</strong> — Scribes don't cover nights, weekends, sick days, or all locations.
                </p>
                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Abridge works 24/7, every location, no exceptions.
                </p>
                <p className="text-xs text-neutral-400 mt-2 italic">Not quantified in total above</p>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={() => setStep(7)}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step6-scribe"
              >
                Calculate my value
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 7: Summary Dashboard */}
        {step === 7 && isScribePath && (() => {
          const monthlySpend = Math.round(totalCurrentCost / 12);
          const dailySpend = Math.round(totalCurrentCost / 260); // ~260 business days
          const hourlySpend = Math.round(totalCurrentCost / (260 * 8)); // 8 hours per day
          const uncoveredProviders = providers - providersWithScribes;
          const uncoveredPercent = providers > 0 ? Math.round((uncoveredProviders / providers) * 100) : 0;
          
          return (
          <div className="animate-in fade-in duration-300">
            {/* SECTION 1: THE HOOK */}
            <div className="text-center mb-10">
              <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">The real question</p>
              <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-4" data-testid="text-step8-scribe-title">
                What would you do with {formatCurrency(totalCurrentCost)}/year?
              </h1>
              <div className="w-16 h-1 bg-neutral-200 mx-auto mb-4"></div>
              <p className="text-lg text-neutral-600 max-w-xl mx-auto">
                That's what you're spending on a scribe program that covers {providersWithScribes} of {providers} providers.
              </p>
            </div>

            {/* SECTION 2: YOUR CURRENT INVESTMENT */}
            <div className="bg-neutral-50 rounded-2xl p-6 mb-5 border border-neutral-200">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">Your Current Investment</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Scribe program:</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">{formatCurrency(annualScribeCost)}/year</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Hidden costs (turnover, mgmt):</span>
                  <span className="font-semibold text-neutral-700 tabular-nums">{formatCurrency(hiddenCosts)}/year</span>
                </div>
                <div className="border-t border-neutral-200 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-neutral-900">Total:</span>
                    <span className="text-xl font-bold text-neutral-900 tabular-nums">{formatCurrency(totalCurrentCost)}/year</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-600">
                  <strong>Coverage:</strong> {providersWithScribes} of {providers} providers ({coveragePercent}%)
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  The other {uncoveredProviders} providers are self-documenting.
                </p>
              </div>
            </div>

            {/* SECTION 3: WITH ABRIDGE */}
            <div className="bg-emerald-50 rounded-2xl p-6 mb-5 border border-emerald-200">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">With Abridge</h3>
              <div className="space-y-2 text-sm text-emerald-800">
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  All {providers} providers get access
                </p>
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  No turnover. No training. No management overhead.
                </p>
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  24/7 coverage — nights, weekends, every location.
                </p>
              </div>
              <p className="text-sm text-emerald-700 mt-4 pt-3 border-t border-emerald-200">
                Your Sales Director can provide deployment-specific pricing.
              </p>
            </div>

            {/* SECTION 4: THE DECISION */}
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-6 text-white mb-5">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">The Decision</h3>
              <p className="text-neutral-300 leading-relaxed mb-5">
                You're not just choosing a documentation tool. You're deciding whether to keep investing <strong className="text-white">{formatCurrency(totalCurrentCost)}/year</strong> in a program that leaves <strong className="text-white">{uncoveredPercent}%</strong> of your providers without support.
              </p>
              
              <div className="border-t border-neutral-700 pt-5">
                <div className="grid grid-cols-3 gap-4 text-center mb-5">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{formatCurrency(monthlySpend)}</p>
                    <p className="text-xs text-neutral-400 mt-1">/month</p>
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{formatCurrency(dailySpend)}</p>
                    <p className="text-xs text-neutral-400 mt-1">/day</p>
                  </div>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-white tabular-nums">{formatCurrency(hourlySpend)}</p>
                    <p className="text-xs text-neutral-400 mt-1">/hour your clinic is open</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 text-center italic">
                  Every month you wait is another month of that investment going toward partial coverage.
                </p>
              </div>
            </div>

            {/* SECTION 5: ACTIONS */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-talk-to-abridge"
              >
                Talk to Abridge
              </Button>
              <Button
                variant="outline"
                className="px-6 py-3 h-auto text-base font-semibold rounded-xl border-2"
                data-testid="button-save-analysis"
              >
                Save Analysis
              </Button>
              <Button
                variant="outline"
                className="px-6 py-3 h-auto text-base font-semibold rounded-xl border-2"
                data-testid="button-share"
              >
                Share
              </Button>
            </div>

            {/* Assumptions footnote */}
            <div className="text-center">
              <p className="text-xs text-neutral-400">
                Assumptions: {providersWithScribes} scribes, ${scribeHourlyCost}/hr, {scribeHoursPerWeek} hrs/week, {scribeTurnoverRate}% turnover
              </p>
              <button 
                onClick={() => setStep(5)}
                className="text-xs text-neutral-500 hover:text-neutral-700 underline mt-1"
                data-testid="button-view-edit-assumptions"
              >
                View/edit assumptions
              </button>
            </div>
          </div>
          );
        })()}

        {/* AMBIENT AI SUMMARY DASHBOARD - Step 5 */}
        {step === 5 && !isScribePath && (
          <div className="animate-in fade-in duration-300">
            {/* SECTION 1: THE HEADLINE */}
            <div className="text-center mb-6">
              <p 
                className="text-lg md:text-xl text-neutral-500 font-medium mb-2"
                style={{
                  opacity: gapRevealStage >= 1 ? 1 : 0,
                  transform: gapRevealStage >= 1 ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.5s ease-out"
                }}
              >
                Based on what you've told us, you're leaving
              </p>
              <div 
                className="mb-2"
                style={{
                  opacity: gapRevealStage >= 2 ? 1 : 0,
                  transform: gapRevealStage >= 2 ? "scale(1)" : "scale(0.9)",
                  transition: "all 0.6s ease-out"
                }}
              >
                <span className="text-5xl md:text-7xl font-bold text-[#E85D3F] tabular-nums tracking-tight">
                  {gapRevealStage >= 2 ? <AnimatedNumber value={calculations.totalGap} duration={1800} /> : "$0"}
                </span>
              </div>
              <p 
                className="text-xl md:text-2xl font-bold text-neutral-900"
                style={{
                  opacity: gapRevealStage >= 3 ? 1 : 0,
                  transition: "all 0.4s ease-out"
                }}
              >
                on the table. Every. Single. Year.
              </p>
              <div 
                className="flex items-center justify-center gap-4 mt-4 text-sm text-neutral-500"
                style={{
                  opacity: gapRevealStage >= 4 ? 1 : 0,
                  transition: "all 0.4s ease-out"
                }}
              >
                <span>{formatCurrency(calculations.monthlyGap)}/month</span>
                <span className="text-neutral-300">•</span>
                <span>{formatCurrency(Math.round(calculations.totalGap / 365))}/day</span>
                <span className="text-neutral-300">•</span>
                <span>{formatCurrency(Math.round(calculations.totalGap / 2080))}/hour</span>
              </div>
            </div>

            {/* SECTION 2: THE GAPS WE IDENTIFIED */}
            <div 
              className="bg-neutral-50 rounded-xl p-5 mb-6 border border-neutral-200"
              style={{
                opacity: gapRevealStage >= 4 ? 1 : 0,
                transition: "all 0.4s ease-out"
              }}
            >
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">The Gaps We Identified</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Utilization:</span>
                  <span className="text-sm">
                    <span className="text-neutral-500">{utilization}%</span>
                    <span className="text-neutral-400 mx-2">→</span>
                    <span className="font-semibold text-neutral-900">{ABRIDGE_BENCHMARKS.utilization}%</span>
                    <span className="text-emerald-600 ml-2 font-medium">= +{calculations.utilizationGapEncounters.toLocaleString()} encounters</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Efficiency:</span>
                  <span className="text-sm">
                    <span className="text-neutral-500">{timeSavings} min</span>
                    <span className="text-neutral-400 mx-2">→</span>
                    <span className="font-semibold text-neutral-900">{ABRIDGE_BENCHMARKS.timeSavings} min</span>
                    <span className="text-emerald-600 ml-2 font-medium">= +{calculations.efficiencyGapHours.toLocaleString()} hours</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 3: TABBED VIEW - Value Breakdown / Over Time */}
            <div 
              className="mb-6"
              style={{
                opacity: gapRevealStage >= 5 ? 1 : 0,
                transition: "all 0.4s ease-out"
              }}
            >
              {/* Tab buttons */}
              <div className="flex items-center gap-1 mb-4 bg-neutral-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setSummaryTab("drivers")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    summaryTab === "drivers"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  data-testid="tab-value-breakdown"
                >
                  Value Breakdown
                </button>
                <button
                  onClick={() => setSummaryTab("time")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    summaryTab === "time"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  data-testid="tab-over-time"
                >
                  Over Time
                </button>
              </div>

              {/* Value Breakdown Tab Content */}
              {summaryTab === "drivers" && (
              <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Where That Value Shows Up</p>
              </div>

              {/* Driver rows - collapsed */}
              <div className="space-y-2">
                {selectedDrivers.map((driverId) => {
                  const driver = DRIVERS.find(d => d.id === driverId);
                  const values = calculations.driverValues[driverId];
                  const isExpanded = expandedDrivers.includes(driverId);
                  const Icon = driver?.icon || Users;
                  
                  if (!driver || !values) return null;
                  
                  return (
                    <div 
                      key={driverId} 
                      className={`rounded-xl overflow-hidden bg-white transition-all duration-300 ${
                        isExpanded ? "border-2 border-emerald-300 shadow-md" : "border border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <button
                        onClick={() => toggleDriverExpanded(driverId)}
                        className="w-full p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                        data-testid={`accordion-${driverId}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-neutral-500" />
                          <span className="font-medium text-neutral-900">{driver.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-emerald-600">+{formatCurrency(values.gap)}/yr</span>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-neutral-100">
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-4 mb-3">How We Calculated This:</p>
                          
                          <div className="space-y-3">
                            {/* From Efficiency Gap */}
                            {values.gapBreakdown.fromEfficiency && (
                              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                                <p className="text-xs font-medium text-neutral-600 mb-2">From your efficiency gap:</p>
                                <div className="space-y-0.5 text-sm text-neutral-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                  {values.gapBreakdown.fromEfficiency.steps.map((step, i) => (
                                    <p key={i} className={step.isResult ? "font-semibold text-emerald-700 pt-1" : "text-neutral-600"}>
                                      {step.label}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* From Utilization Gap */}
                            {values.gapBreakdown.fromUtilization && (
                              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                                <p className="text-xs font-medium text-neutral-600 mb-2">From your utilization gap:</p>
                                <div className="space-y-0.5 text-sm text-neutral-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                  {values.gapBreakdown.fromUtilization.steps.map((step, i) => (
                                    <p key={i} className={step.isResult ? "font-semibold text-emerald-700 pt-1" : "text-neutral-600"}>
                                      {step.label}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Direct / Quality Improvement */}
                            {values.gapBreakdown.direct && (
                              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                                <p className="text-xs font-medium text-neutral-600 mb-2">From documentation quality:</p>
                                <div className="space-y-0.5 text-sm text-neutral-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                  {values.gapBreakdown.direct.steps.map((step, i) => (
                                    <p key={i} className={step.isResult ? "font-semibold text-emerald-700 pt-1" : "text-neutral-600"}>
                                      {step.label}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Total line */}
                            <div className="border-t border-neutral-300 pt-3 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-neutral-700">Total:</span>
                                <span className="text-lg font-bold text-emerald-600">{formatCurrency(values.gap)}/year</span>
                              </div>
                            </div>
                            
                            {/* Assumptions */}
                            {values.gapBreakdown.assumptions.length > 0 && (
                              <p className="text-xs text-neutral-500 pt-1">
                                <span className="font-medium">Assumptions:</span>{" "}
                                {values.gapBreakdown.assumptions.join(", ")}
                              </p>
                            )}
                            
                            {/* Remove driver link */}
                            <div className="border-t border-neutral-200 pt-3 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDriver(driverId);
                                  setExpandedDrivers(prev => prev.filter(id => id !== driverId));
                                }}
                                className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                                data-testid={`remove-driver-${driverId}`}
                              >
                                Remove this driver
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Total Summary - Compact */}
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-neutral-600">TOTAL ANNUAL GAP</span>
                    <span className="text-xl font-bold text-[#E85D3F]">{formatCurrency(calculations.totalGap)}/year</span>
                  </div>
                </div>
                
                {/* Add More Drivers Section */}
                {DRIVERS.filter(d => !selectedDrivers.includes(d.id)).length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowAllDrivers(!showAllDrivers)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50/50 transition-colors"
                      data-testid="button-add-more-drivers"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-neutral-500" />
                        <span className="text-sm font-medium text-neutral-600">Add more drivers</span>
                        <span className="text-xs text-neutral-400">
                          ({DRIVERS.filter(d => !selectedDrivers.includes(d.id)).length} available)
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showAllDrivers ? "rotate-180" : ""}`} />
                    </button>
                    
                    {showAllDrivers && (
                      <div className="mt-3 space-y-2">
                        {DRIVERS.filter(d => !selectedDrivers.includes(d.id)).map((driver) => {
                          const Icon = driver.icon;
                          const values = calculations.driverValues[driver.id];
                          return (
                            <div
                              key={driver.id}
                              className="bg-white rounded-lg p-4 border border-neutral-200 hover:border-neutral-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-neutral-100">
                                    <Icon className="w-4 h-4 text-neutral-500" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-neutral-900">{driver.name}</p>
                                    <p className="text-sm text-neutral-600 mt-0.5">{driver.description}</p>
                                    <p className="text-xs text-neutral-400 mt-1">{driver.context}</p>
                                    <p className="text-sm font-medium text-emerald-600 mt-2">
                                      Potential: {values ? `+${formatCurrency(values.gap)}/year` : driver.typicalGap + "/year"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    toggleDriver(driver.id);
                                    setExpandedDrivers(prev => [...prev, driver.id]);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
                                  data-testid={`add-driver-${driver.id}`}
                                >
                                  + Add this driver
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
              )}

              {/* OVER TIME TAB */}
              {summaryTab === "time" && (
              <div className="mb-8">
                <div className="bg-white rounded-xl p-5 border border-neutral-200 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">3-Year Cumulative Value</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-emerald-500 rounded" />
                        <span className="text-neutral-600">Switch to Abridge</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-neutral-400 rounded" />
                        <span className="text-neutral-600">Stay with current</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="abridgeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                          </linearGradient>
                          <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E85D3F" stopOpacity={0.08}/>
                            <stop offset="95%" stopColor="#E85D3F" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#D1D5DB" axisLine={false} />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#D1D5DB" axisLine={false} />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const abridgeVal = payload.find(p => p.dataKey === 'abridge')?.value as number || 0;
                              const currentVal = payload.find(p => p.dataKey === 'current')?.value as number || 0;
                              const gap = abridgeVal - currentVal;
                              const milestone = chartData.find(d => d.period === label)?.milestone;
                              return (
                                <div className="bg-white rounded-lg shadow-lg border border-neutral-200 p-3 min-w-[160px]">
                                  <p className="text-xs font-semibold text-neutral-900 mb-2">{label}</p>
                                  {milestone && <p className="text-xs text-emerald-600 font-medium mb-2">{milestone}</p>}
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-emerald-600">Abridge:</span>
                                      <span className="font-semibold">{formatCurrency(abridgeVal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-neutral-500">Current:</span>
                                      <span className="font-semibold text-neutral-600">{formatCurrency(currentVal)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-neutral-100">
                                      <span className="text-[#E85D3F] font-medium">Gap:</span>
                                      <span className="font-bold text-[#E85D3F]">+{formatCurrency(gap)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Current solution line (gray, near-flat) */}
                        <Area 
                          type="monotone" 
                          dataKey="current" 
                          stroke="#9CA3AF" 
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fill="none"
                          style={{
                            opacity: chartAnimationStage >= 3 ? 1 : 0,
                            transition: "opacity 0.5s ease-out"
                          }}
                        />
                        {/* Abridge value line (emerald, growing) */}
                        <Area 
                          type="monotone" 
                          dataKey="abridge" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          fill="url(#abridgeGradient)"
                          style={{
                            strokeDasharray: 2000,
                            strokeDashoffset: chartAnimationStage >= 3 ? 0 : 2000,
                            transition: "stroke-dashoffset 2.5s ease-out",
                            fillOpacity: chartAnimationStage >= 4 ? 1 : 0
                          }}
                        />
                        {/* Milestone annotations */}
                        <ReferenceLine x="3 mo" stroke="transparent" label={{ value: "Quick wins", position: "top", fill: "#10B981", fontSize: 10, fontWeight: 500, dy: -5 }} />
                        <ReferenceLine x="Year 1" stroke="transparent" label={{ value: "Full ramp", position: "top", fill: "#10B981", fontSize: 10, fontWeight: 500, dy: -5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ramp-up context */}
                <div className="px-1 mb-4">
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    <span className="font-medium text-neutral-600">Value builds as utilization increases:</span>{" "}
                    Months 1-3: efficiency gains start immediately. Months 3-6: utilization climbs toward 65%. Year 1+: full value from all drivers.
                  </p>
                </div>

                {/* Improved narrative comparison block */}
                <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
                  {/* Switch Today row */}
                  <div className="p-4 border-b border-neutral-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Switch Today</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500 mb-0.5">3-year value</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearTotal)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Wait 6 Months row */}
                  <div className="p-4 border-b border-neutral-200 bg-neutral-100/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Wait 6 Months</p>
                        <p className="text-xs text-neutral-500 mt-0.5">First 6 months of value is lost forever</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500 mb-0.5">3-year value</p>
                        <p className="text-xl font-bold text-neutral-500">{formatCurrency(calculations.waitThreeYearTotal)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Cost of Waiting row */}
                  <div className="p-4 bg-[#E85D3F]/5">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-[#E85D3F] uppercase tracking-wide">Cost of Waiting</p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          That's <span className="font-semibold">{formatCurrency(Math.round(calculations.costOfWaiting / 6))}/month</span> you can never recapture.
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-[#E85D3F]">{formatCurrency(calculations.costOfWaiting)}</p>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* THE DECISION SECTION */}
            <div 
              className="bg-neutral-900 rounded-xl p-6 mb-6 text-white"
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transition: "all 0.4s ease-out"
              }}
            >
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">The Decision</p>
              <p className="text-base text-neutral-300 mb-4">
                You already invested in ambient AI. The question is whether you're getting full value.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                  <span className="text-neutral-300">Your utilization: <span className="font-semibold text-white">{utilization}%</span> <span className="text-neutral-500">(Abridge avg: {ABRIDGE_BENCHMARKS.utilization}%)</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                  <span className="text-neutral-300">Your time savings: <span className="font-semibold text-white">{timeSavings} min</span> <span className="text-neutral-500">(Abridge avg: {ABRIDGE_BENCHMARKS.timeSavings} min)</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-300">Annual gap: <span className="font-bold text-emerald-400">{formatCurrency(calculations.totalGap)}</span></span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-700">
                <p className="text-sm text-neutral-400">
                  Every month you stay at current state costs <span className="font-semibold text-[#E85D3F]">~{formatCurrency(calculations.monthlyGap)}</span> in value you could be capturing.
                </p>
              </div>
            </div>

            {/* ASSUMPTIONS - Subtle toggle */}
            <div 
              className="mb-8"
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transition: "all 0.3s ease-out"
              }}
            >
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showAssumptions ? "Hide" : "View"} assumptions</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAssumptions ? "rotate-180" : ""}`} />
              </button>
              {showAssumptions && (
                <div className="mt-2 bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-xs text-neutral-500">
                  <p>Utilization: {utilization}% → {ABRIDGE_BENCHMARKS.utilization}% • Time: {timeSavings} → {ABRIDGE_BENCHMARKS.timeSavings} min • wRVU: $45 • OT: $100/hr</p>
                </div>
              )}
            </div>

            {/* ACTION BAR - Improved hierarchy */}
            <div 
              className="flex flex-col items-center gap-4"
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transition: "all 0.3s ease-out 0.1s"
              }}
            >
              {/* Primary CTA */}
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-4 h-auto text-lg font-bold rounded-xl shadow-lg"
                data-testid="button-lets-talk"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Let's Talk
              </Button>
              
              {/* Secondary actions */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="border border-neutral-300 text-neutral-600 hover:bg-neutral-50 px-5 py-2 h-auto text-sm font-medium rounded-lg"
                  data-testid="button-copy-link"
                >
                  Copy Link
                </Button>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-neutral-500 hover:text-neutral-700 underline"
                  data-testid="button-edit-model"
                >
                  Edit model
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
