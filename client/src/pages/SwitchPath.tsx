import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Mic, User, Keyboard, Sparkles, Clock, DollarSign, ChevronDown, ChevronUp, Download, MessageSquare, Frown, Meh, Smile, PartyPopper, Users, Calendar, BadgeDollarSign, Heart, FileCheck, ShieldCheck, Lightbulb, Check, AlertTriangle, Target, BarChart3, Settings } from "lucide-react";
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
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  const [scribeTurnoverRate] = useState<number>(0.35);
  const [scribeReplacementCost] = useState<number>(4000);
  const [scribeManagementOverhead] = useState<number>(20000);
  const weeksPerYear = 50;
  
  // Derived scribe calculations
  const isScribePath = selectedSolution === "scribes";
  const providersWithoutScribes = Math.max(0, providers - providersWithScribes);
  const coveragePercent = providers > 0 ? Math.round((providersWithScribes / providers) * 100) : 0;
  const annualScribeCost = providersWithScribes * scribeHourlyCost * scribeHoursPerWeek * weeksPerYear;
  const abridgeCostPerProvider = 0; // Placeholder - show "Contact for pricing"
  const annualAbridgeCost = providers * abridgeCostPerProvider;
  const directCostSavings = annualScribeCost - annualAbridgeCost;
  const annualTurnoverCost = Math.round(providersWithScribes * scribeTurnoverRate * scribeReplacementCost);
  const managementOverhead = providersWithScribes > 10 ? scribeManagementOverhead : 10000;
  const hiddenCosts = annualTurnoverCost + managementOverhead;
  const encountersPerProvider = providers > 0 ? annualEncounters / providers : 2000;
  const timeSavedNewProvidersHours = Math.round((providersWithoutScribes * encountersPerProvider * 3) / 60);
  const expandedCoverageValue = Math.round(timeSavedNewProvidersHours * 100); // $100/hr value
  const totalScribeValue = directCostSavings + hiddenCosts + expandedCoverageValue;

  const solutionData = selectedSolution ? SOLUTION_DATA[selectedSolution] : null;
  
  // Step 7 is now the combined Summary Dashboard
  useEffect(() => {
    if (step === 7) {
      setGapRevealStage(0);
      setChartAnimationStage(0);
      const revealTimers = [
        setTimeout(() => setGapRevealStage(1), 300),
        setTimeout(() => setGapRevealStage(2), 800),
        setTimeout(() => setGapRevealStage(3), 2800),
        setTimeout(() => setGapRevealStage(4), 3200),
        setTimeout(() => setGapRevealStage(5), 3700),
        setTimeout(() => setGapRevealStage(6), 4200),
      ];
      return () => revealTimers.forEach(clearTimeout);
    }
  }, [step]);

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

  // No pre-selection - let user choose what matters to them

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
    
    type DriverCalc = {
      their: number;
      abridge: number;
      gap: number;
      theirCalc: string[];
      abridgeCalc: string[];
    };
    
    const driverValues: Record<DriverId, DriverCalc> = {
      patient_access: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
      overtime: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
      retention: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
      level_of_service: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
      denials: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
      hcc: { their: 0, abridge: 0, gap: 0, theirCalc: [], abridgeCalc: [] },
    };
    
    const theirUsableHours = Math.round(theirTimeSavedHours * 0.20);
    const abridgeUsableHours = Math.round(abridgeTimeSavedHours * 0.20);
    const theirNewVisits = Math.round(theirUsableHours * 2);
    const abridgeNewVisits = Math.round(abridgeUsableHours * 2);
    const theirPatientAccess = theirNewVisits * revenuePerVisit;
    const abridgePatientAccess = abridgeNewVisits * revenuePerVisit;
    driverValues.patient_access = {
      their: theirPatientAccess,
      abridge: abridgePatientAccess,
      gap: abridgePatientAccess - theirPatientAccess,
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
    };
    
    const theirOvertimeHours = Math.round(theirTimeSavedHours * 0.40);
    const abridgeOvertimeHours = Math.round(abridgeTimeSavedHours * 0.40);
    const theirOvertime = theirOvertimeHours * overtimeRate;
    const abridgeOvertime = abridgeOvertimeHours * overtimeRate;
    driverValues.overtime = {
      their: theirOvertime,
      abridge: abridgeOvertime,
      gap: abridgeOvertime - theirOvertime,
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
    };
    
    const theirRetention = Math.round(providers * turnoverRate * burnoutReduction * 0.5 * providerCost * 0.20);
    const abridgeRetention = Math.round(providers * turnoverRate * burnoutReduction * providerCost * 0.20);
    driverValues.retention = {
      their: theirRetention,
      abridge: abridgeRetention,
      gap: abridgeRetention - theirRetention,
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
    };
    
    const theirEmBillable = Math.round(theirDocumentedEncounters * 0.80);
    const abridgeEmBillable = Math.round(abridgeDocumentedEncounters * 0.80);
    const theirUnderCoded = Math.round(theirEmBillable * (underCoding / 100));
    const abridgeUnderCoded = Math.round(abridgeEmBillable * (ABRIDGE_BENCHMARKS.underCoding / 100));
    const theirWrvuCapture = theirUnderCoded * 0.7 * avgWrvuValue * (wrvuUplift / 100);
    const abridgeWrvuCapture = abridgeUnderCoded * 0.7 * avgWrvuValue * (ABRIDGE_BENCHMARKS.wrvuUplift / 100);
    const theirLos = Math.round(theirWrvuCapture);
    const abridgeLos = Math.round(abridgeWrvuCapture);
    driverValues.level_of_service = {
      their: theirLos,
      abridge: abridgeLos,
      gap: abridgeLos - theirLos,
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
    };
    
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
    driverValues.denials = {
      their: theirDenialValue,
      abridge: abridgeDenialValue,
      gap: abridgeDenialValue - theirDenialValue,
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
    };
    
    const theirHccPop = Math.round(theirDocumentedEncounters * maPopulation);
    const abridgeHccPop = Math.round(abridgeDocumentedEncounters * maPopulation);
    const theirHccValue = Math.round(theirHccPop * (hccImprovement / 100) * avgRafValue);
    const abridgeHccValue = Math.round(abridgeHccPop * (ABRIDGE_BENCHMARKS.hccImprovement / 100) * avgRafValue);
    driverValues.hcc = {
      their: theirHccValue,
      abridge: abridgeHccValue,
      gap: abridgeHccValue - theirHccValue,
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
      case 1: return selectedSolution !== null;
      case 2: return providers > 0 && annualEncounters > 0;
      case 3: return true;
      case 4: return true;
      case 5: return selectedDrivers.length >= 2; // Driver Selection now Step 5
      case 6: return true; // Performance Assumptions now Step 6
      case 7: return true; // Summary Dashboard
      default: return false;
    }
  };

  const handleContinue = () => {
    if (step < 7) {
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

  const chartData = [
    { period: "Today", abridge: 0, current: 0 },
    { period: "3 mo", abridge: Math.round(calculations.totalGap * calculations.ramp.month3 * 0.25), current: 0 },
    { period: "6 mo", abridge: calculations.month6Value, current: 0 },
    { period: "Year 1", abridge: calculations.year1Value, current: 0 },
    { period: "Year 2", abridge: calculations.year1Value + calculations.year2Value, current: 0 },
    { period: "Year 3", abridge: calculations.threeYearTotal, current: 0 },
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
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
                        ? "border-[#E85D3F] bg-gradient-to-r from-[#E85D3F]/5 to-[#E85D3F]/10 shadow-lg"
                        : "border-neutral-200 hover:border-neutral-300 hover:shadow-md bg-white"
                    }`}
                    data-testid={`card-solution-${solution}`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isSelected ? "bg-[#E85D3F]/15" : "bg-neutral-100 group-hover:bg-neutral-200"
                    }`}>
                      <Icon className={`w-7 h-7 transition-colors ${isSelected ? "text-[#E85D3F]" : "text-neutral-500 group-hover:text-neutral-700"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-neutral-900 mb-1">{data.name}</h3>
                      <p className="text-sm text-neutral-500 leading-relaxed">
                        {solution === "ambient" ? "Currently using DAX, Suki, Nabla, or similar" : "In-person or virtual scribes"}
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

            <div className="mt-8 md:mt-12">
              <p className="text-xs md:text-sm font-medium text-neutral-600 mb-3 md:mb-4 text-center">Select a care setting:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {CARE_SETTINGS.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => setting.available && setSelectedSetting(setting.id)}
                    disabled={!setting.available}
                    className={`relative px-5 py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center min-w-[100px] ${
                      selectedSetting === setting.id
                        ? "bg-neutral-900 text-white"
                        : setting.available
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-transparent"
                        : "bg-neutral-50 text-neutral-400 cursor-not-allowed border-2 border-dashed border-neutral-200"
                    }`}
                    title={!setting.available ? "Coming Q2 2025" : undefined}
                    data-testid={`button-setting-${setting.id}`}
                  >
                    <span className="flex items-center gap-1">
                      {selectedSetting === setting.id && <span>●</span>}
                      {setting.label}
                    </span>
                    {!setting.available && (
                      <span className="text-[10px] text-neutral-400 mt-0.5">Coming Soon</span>
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
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 mb-2 md:mb-3" data-testid="text-step2-title">
              Let's start with the basics.
            </h1>
            <p className="text-base md:text-lg text-neutral-500 mb-6 md:mb-12">We'll build your baseline together.</p>

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
                      <div className="bg-[#F3F4F6] rounded-xl p-3 md:p-4 text-center border border-[#E5E7EB]">
                        <p className="text-xs md:text-sm text-[#9CA3AF] mb-0.5 md:mb-1">Abridge Avg</p>
                        <p className="text-xl md:text-2xl font-bold text-[#6B7280]">65%</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 relative">
              <div className="relative bg-[#F3F4F6] rounded-2xl p-6 border border-neutral-200">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Your Current</p>
                <p className="text-sm text-[#9CA3AF] mb-1">At {utilization}% utilization</p>
                <p className="text-4xl font-bold text-[#6B7280] mb-1 tabular-nums">{calculations.theirDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-[#9CA3AF]">encounters documented/year</p>
              </div>
              
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full border-2 border-neutral-300 items-center justify-center shadow-lg">
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
              
              <div className="relative bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200">
                <div className="absolute top-4 right-4 text-emerald-100 font-bold text-4xl">A</div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">With Abridge</p>
                <p className="text-sm text-[#1F2937]/60 mb-1">At {ABRIDGE_BENCHMARKS.utilization}% utilization</p>
                <p className="text-4xl font-bold text-[#1F2937] mb-1 tabular-nums">{calculations.abridgeDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-[#1F2937]/70">encounters documented/year</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-600 text-sm font-semibold px-3 py-1 rounded-full">
                  <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                  +{Math.round(((calculations.abridgeDocumentedEncounters - calculations.theirDocumentedEncounters) / calculations.theirDocumentedEncounters) * 100)}% more
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="bg-emerald-50 rounded-xl px-6 py-4 text-center border border-emerald-200">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{calculations.utilizationGapEncounters.toLocaleString()}</p>
                <p className="text-sm text-emerald-600/80">additional encounters/year</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                That <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> utilization gap = <strong>{calculations.utilizationGapPercent}%</strong> more encounters being documented.
              </p>
              <p className="text-neutral-600 font-medium mt-1">This is where value leaks.</p>
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
                    <strong className="text-neutral-700">{100 - coveragePercent}%</strong> have no documentation help.
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
                  Hours per week per scribe
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
                  Your annual scribe spend: <strong className="text-blue-950 font-semibold">{formatCurrency(annualScribeCost)}</strong>
                </span>
              </p>
              <p className="text-sm text-blue-700 mt-2 ml-9">
                {providersWithScribes} scribes × ${scribeHourlyCost}/hr × {scribeHoursPerWeek} hrs/week × 50 weeks
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
                <span className="text-sm text-[#E85D3F] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Abridge avg: {ABRIDGE_BENCHMARKS.timeSavings} min
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 relative">
              <div className="bg-[#F5F5F5] rounded-2xl p-6 border border-neutral-200">
                <p className="text-sm text-neutral-500 mb-2">At your {timeSavings} min savings</p>
                <p className="text-4xl font-bold text-neutral-700 mb-1 tabular-nums">{calculations.theirTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-3 font-mono">
                  {timeSavings} min × {calculations.theirDocumentedEncounters.toLocaleString()} encounters ÷ 60
                </p>
              </div>
              
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full border-2 border-neutral-300 items-center justify-center shadow-lg">
                <ArrowRight className="w-5 h-5 text-neutral-500" />
              </div>
              
              <div className="bg-[#F5F5F5] rounded-2xl p-6 border border-neutral-200">
                <p className="text-sm text-neutral-500 mb-2">At Abridge {ABRIDGE_BENCHMARKS.timeSavings} min</p>
                <p className="text-4xl font-bold text-emerald-600 mb-1 tabular-nums">{calculations.abridgeTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-3 font-mono">
                  {ABRIDGE_BENCHMARKS.timeSavings} min × {calculations.abridgeDocumentedEncounters.toLocaleString()} encounters ÷ 60
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mb-8">
              <div className="bg-emerald-50 rounded-xl px-6 py-4 text-center border border-emerald-200">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">+{calculations.efficiencyGapHours.toLocaleString()} hours</p>
                <p className="text-sm text-emerald-600/80">That's {calculations.efficiencyGapPercent}% MORE time returned</p>
              </div>
            </div>

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
                <div className="relative h-10 rounded-full overflow-hidden bg-neutral-200">
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
                <div className="relative h-10 rounded-full overflow-hidden bg-emerald-500">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">All {providers} providers covered</span>
                  </div>
                </div>
                <p className="text-center text-sm text-emerald-600 mt-3 font-medium">
                  100% coverage at a fraction of the cost
                </p>
              </div>
            </div>

            <div className="mt-8 bg-amber-50 rounded-xl p-5 border border-amber-200/50">
              <p className="text-amber-900 font-semibold mb-2">The {providersWithoutScribes} providers without scribes are:</p>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Spending extra time on documentation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  Potentially seeing fewer patients
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  More likely to burn out
                </li>
              </ul>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step4-scribe"
              >
                See the cost comparison
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Human Scribes Step 5: Cost Comparison */}
        {step === 5 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step5-scribe-title">
              The cost comparison
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Scribes vs. Abridge — the full picture.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-100 rounded-2xl p-6 border border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">Your Current Scribe Program</p>
                <p className="text-4xl font-bold text-neutral-700 mb-2 tabular-nums">{formatCurrency(annualScribeCost)}</p>
                <p className="text-sm text-neutral-500 mb-4">annual cost</p>
                <div className="border-t border-neutral-200 pt-4 space-y-2">
                  <p className="text-sm text-neutral-600 flex justify-between">
                    <span>Providers covered:</span>
                    <span className="font-semibold">{providersWithScribes} of {providers}</span>
                  </p>
                  <p className="text-sm text-neutral-500">
                    {providersWithScribes} scribes × ${scribeHourlyCost}/hr × {scribeHoursPerWeek} hrs/week × 50 weeks
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-4">With Abridge</p>
                <p className="text-4xl font-bold text-emerald-700 mb-2 tabular-nums">
                  {abridgeCostPerProvider === 0 ? "Contact for pricing" : formatCurrency(annualAbridgeCost)}
                </p>
                <p className="text-sm text-emerald-600/80 mb-4">annual cost</p>
                <div className="border-t border-emerald-200 pt-4 space-y-2">
                  <p className="text-sm text-emerald-700 flex justify-between">
                    <span>Providers covered:</span>
                    <span className="font-semibold">All {providers}</span>
                  </p>
                  <p className="text-sm text-emerald-600/70">
                    Unlimited encounters • No per-hour costs
                  </p>
                </div>
              </div>
            </div>

            {directCostSavings > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 text-center">
                <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">Direct Cost Difference</p>
                <p className="text-4xl font-bold text-emerald-600 mb-2 tabular-nums">{formatCurrency(directCostSavings)}/year</p>
                <p className="text-emerald-700">
                  savings + <strong>{providersWithoutScribes} more providers</strong> covered
                </p>
              </div>
            )}

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step5-scribe"
              >
                See hidden costs
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

            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-neutral-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-2">Turnover & Training</h3>
                    <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm text-neutral-600">Average scribe turnover: <strong>35% annually</strong></p>
                      <p className="text-sm text-neutral-600">Your {providersWithScribes} scribes = <strong>~{Math.round(providersWithScribes * 0.35)} replacements/year</strong></p>
                      <p className="text-sm text-neutral-600">Cost to recruit + train: <strong>$4,000 each</strong></p>
                      <div className="border-t border-neutral-200 pt-3 mt-3">
                        <p className="text-lg font-bold text-amber-700">Annual turnover cost: {formatCurrency(annualTurnoverCost)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-neutral-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-2">Management Overhead</h3>
                    <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm text-neutral-600">Scribe coordinator/manager time</p>
                      <p className="text-sm text-neutral-600">Scheduling, QA, HR issues</p>
                      <div className="border-t border-neutral-200 pt-3 mt-3">
                        <p className="text-lg font-bold text-blue-700">Estimated: {formatCurrency(managementOverhead)}/year</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-neutral-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-neutral-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-2">Coverage Gaps</h3>
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-sm text-neutral-700 font-medium mb-3">Scribes don't cover:</p>
                      <ul className="space-y-1.5 text-sm text-neutral-600">
                        <li>• Night shifts</li>
                        <li>• Weekends</li>
                        <li>• Sick days / PTO</li>
                        <li>• All locations</li>
                      </ul>
                      <div className="border-t border-neutral-200 pt-3 mt-3">
                        <p className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Abridge works 24/7, every location, no exceptions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200 text-center">
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">Total Hidden Costs</p>
              <p className="text-4xl font-bold text-amber-700 tabular-nums">{formatCurrency(hiddenCosts)}/year</p>
              <p className="text-sm text-amber-600 mt-1">(Turnover + Management overhead)</p>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step6-scribe"
              >
                See total value
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 6 && !isScribePath && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step6-title">
              Refine your assumptions
            </h1>
            <p className="text-lg text-neutral-500 mb-6">
              Based on your selected drivers, review these relevant metrics.
            </p>

            <div className="bg-neutral-100 rounded-xl p-4 border border-neutral-200 mb-8 flex items-center gap-3">
              <Check className="w-5 h-5 text-neutral-500 flex-shrink-0" />
              <p className="text-neutral-700 text-sm">
                Pre-filled with {solutionData?.name || "industry"} benchmarks. Expand any row to customize.
              </p>
            </div>

            <div className="space-y-3">
              {/* Show wRVU Uplift if level_of_service or patient_access selected */}
              {(selectedDrivers.includes("level_of_service") || selectedDrivers.includes("patient_access")) && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setWrvuKnown(!wrvuKnown)}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <BadgeDollarSign className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">wRVU Uplift</p>
                      <p className="text-xs text-neutral-500">Revenue productivity improvement</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-700 tabular-nums">{wrvuUplift}%</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${wrvuKnown ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {wrvuKnown && (
                  <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50">
                    <label className="text-xs font-medium text-neutral-600 mb-2 block">Custom value:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={wrvuUplift}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setWrvuUplift(val === "" ? 0 : parseFloat(val) || 0);
                        }}
                        className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                      <span className="text-sm text-neutral-500">% uplift</span>
                      <button
                        onClick={() => {
                          setWrvuUplift(solutionData?.typicalWrvuUplift || 3.5);
                        }}
                        className="ml-auto text-xs text-neutral-500 hover:underline"
                      >
                        Reset to default ({solutionData?.typicalWrvuUplift || 3.5}%)
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Show Under-coding if level_of_service selected */}
              {selectedDrivers.includes("level_of_service") && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setUnderCodingKnown(!underCodingKnown)}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">Under-coding Correction</p>
                      <p className="text-xs text-neutral-500">Encounters corrected from under-coding</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-700 tabular-nums">{underCoding}%</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${underCodingKnown ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {underCodingKnown && (
                  <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50">
                    <label className="text-xs font-medium text-neutral-600 mb-2 block">Custom value:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={underCoding}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setUnderCoding(val === "" ? 0 : parseFloat(val) || 0);
                        }}
                        className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                      <span className="text-sm text-neutral-500">%</span>
                      <button
                        onClick={() => {
                          setUnderCoding(solutionData?.typicalUnderCoding || 8);
                        }}
                        className="ml-auto text-xs text-neutral-500 hover:underline"
                      >
                        Reset to default ({solutionData?.typicalUnderCoding || 8}%)
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Show Denial Prevention if denials selected */}
              {selectedDrivers.includes("denials") && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setDenialKnown(!denialKnown)}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">Denial Prevention</p>
                      <p className="text-xs text-neutral-500">Documentation-related denials reduced</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-700 tabular-nums">{denialPrevention}%</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${denialKnown ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {denialKnown && (
                  <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50">
                    <label className="text-xs font-medium text-neutral-600 mb-2 block">Custom value:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={denialPrevention}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setDenialPrevention(val === "" ? 0 : parseFloat(val) || 0);
                        }}
                        className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                      <span className="text-sm text-neutral-500">% reduction</span>
                      <button
                        onClick={() => {
                          setDenialPrevention(solutionData?.typicalDenialPrevention || 30);
                        }}
                        className="ml-auto text-xs text-neutral-500 hover:underline"
                      >
                        Reset to default ({solutionData?.typicalDenialPrevention || 30}%)
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Show HCC Capture if hcc selected */}
              {selectedDrivers.includes("hcc") && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setHccKnown(!hccKnown)}
                  className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-neutral-900">HCC Capture</p>
                      <p className="text-xs text-neutral-500">Chronic condition documentation improvement</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-neutral-700 tabular-nums">{hccImprovement}%</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${hccKnown ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {hccKnown && (
                  <div className="px-4 pb-4 pt-1 border-t border-neutral-100 bg-neutral-50">
                    <label className="text-xs font-medium text-neutral-600 mb-2 block">Custom value:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hccImprovement}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setHccImprovement(val === "" ? 0 : parseFloat(val) || 0);
                        }}
                        className="w-24 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                      <span className="text-sm text-neutral-500">% improvement</span>
                      <button
                        onClick={() => {
                          setHccImprovement(solutionData?.typicalHccImprovement || 10);
                        }}
                        className="ml-auto text-xs text-neutral-500 hover:underline"
                      >
                        Reset to default ({solutionData?.typicalHccImprovement || 10}%)
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Info message when no drivers have relevant metrics */}
            {!(selectedDrivers.includes("level_of_service") || selectedDrivers.includes("patient_access") || 
               selectedDrivers.includes("denials") || selectedDrivers.includes("hcc")) && (
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200 text-center">
                <p className="text-neutral-600">
                  The drivers you selected (Overtime, Retention) primarily use time-based calculations.
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  No additional performance metrics needed. Click below to see your results.
                </p>
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-neutral-500">
                <Lightbulb className="w-4 h-4 inline mr-1.5 text-amber-500" />
                You can adjust these later if needed.
              </p>
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step6"
              >
                See Your Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 mb-2 md:mb-3" data-testid="text-step5-title">
              What matters most to your organization?
            </h1>
            <p className="text-base md:text-lg text-neutral-500 mb-4 md:mb-6">Most health systems prioritize these. Select what matters to you.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
              {DRIVERS.filter(d => ["patient_access", "denials", "level_of_service"].includes(d.id)).map((driver) => {
                const Icon = driver.icon;
                const isSelected = selectedDrivers.includes(driver.id);
                
                return (
                  <button
                    key={driver.id}
                    onClick={() => toggleDriver(driver.id)}
                    className={`p-4 md:p-5 rounded-xl border-2 text-left transition-all duration-200 relative ${
                      isSelected
                        ? "border-[#E85D3F] bg-[#E85D3F]/5 shadow-md"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                    data-testid={`driver-${driver.id}`}
                  >
                    <span className="absolute -top-2 left-3 bg-neutral-200 text-neutral-600 text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Most common
                    </span>
                    <div className="flex items-center md:items-start md:flex-col gap-3 md:gap-0 mt-1">
                      <div className={`w-10 h-10 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 md:mb-3 ${
                        isSelected ? "bg-[#E85D3F]/10" : "bg-neutral-100"
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-[#E85D3F]" : "text-neutral-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 text-sm md:mb-1">{driver.name}</h3>
                        <p className="text-xs text-neutral-500 line-clamp-1 md:line-clamp-2 md:mb-2">{driver.description}</p>
                        <p className="text-sm font-semibold text-emerald-600 hidden md:block">{driver.typicalGap}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {!showAllDrivers ? (
              <button 
                onClick={() => setShowAllDrivers(true)}
                className="w-full py-2.5 md:py-3 border-2 border-dashed border-neutral-300 rounded-xl text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 mb-6 md:mb-8 text-sm md:text-base"
                data-testid="button-show-more-drivers"
              >
                <ChevronDown className="w-4 h-4" />
                Show 3 more drivers
              </button>
            ) : (
              <div className="mb-6 md:mb-8">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-wide">Additional Drivers</p>
                  <button 
                    onClick={() => setShowAllDrivers(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600"
                  >
                    Hide
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  {DRIVERS.filter(d => !["patient_access", "denials", "level_of_service"].includes(d.id)).map((driver) => {
                    const Icon = driver.icon;
                    const isSelected = selectedDrivers.includes(driver.id);
                    
                    return (
                      <button
                        key={driver.id}
                        onClick={() => toggleDriver(driver.id)}
                        className={`p-4 md:p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-[#E85D3F] bg-[#E85D3F]/5 shadow-md"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                        data-testid={`driver-${driver.id}`}
                      >
                        <div className="flex items-center md:items-start md:flex-col gap-3 md:gap-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 md:mb-3 ${
                            isSelected ? "bg-[#E85D3F]/10" : "bg-neutral-100"
                          }`}>
                            <Icon className={`w-5 h-5 ${isSelected ? "text-[#E85D3F]" : "text-neutral-500"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-neutral-900 text-sm md:mb-1">{driver.name}</h3>
                            <p className="text-xs text-neutral-500 line-clamp-1 md:line-clamp-2 md:mb-2">{driver.description}</p>
                            <p className="text-sm font-semibold text-emerald-600 hidden md:block">{driver.typicalGap}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDrivers.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3 md:p-4 border border-emerald-200 mb-6 md:mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-emerald-700 font-medium">Estimated Annual Gap</p>
                    <p className="text-xs text-emerald-600/70">{selectedDrivers.length} driver{selectedDrivers.length !== 1 ? "s" : ""} selected</p>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(calculations.totalGap)}/year
                  </p>
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 -mx-6 px-4 md:px-6 py-4 md:py-5 mt-6 md:mt-8 shadow-xl z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-semibold text-neutral-900 truncate">
                    {selectedDrivers.length} of 6 selected
                  </p>
                  <p className="text-xs md:text-sm text-neutral-500">
                    {selectedDrivers.length < 2 
                      ? "Select at least 2" 
                      : selectedDrivers.length >= 4 
                        ? "Great selection!" 
                        : "Select 2-4 areas"}
                  </p>
                </div>
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-4 md:px-8 py-2.5 md:py-3 h-auto text-sm md:text-base font-semibold rounded-xl disabled:opacity-40 shadow-lg flex-shrink-0"
                  data-testid="button-continue-step5"
                >
                  <span className="hidden md:inline">Continue</span>
                  <span className="md:hidden">Continue</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Human Scribes Step 7: Summary Dashboard */}
        {step === 7 && isScribePath && (
          <div className="animate-in fade-in duration-300">
            {/* YOUR INPUTS BAR */}
            <div className="bg-neutral-100 rounded-xl p-4 border border-neutral-200 mb-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-600">
                <strong>{providers}</strong> providers • <strong>{providersWithScribes}</strong> with scribes • <strong>${scribeHourlyCost}</strong>/hr • <strong>{scribeHoursPerWeek}</strong> hrs/week
              </p>
              <button
                onClick={() => setStep(3)}
                className="text-sm text-[#E85D3F] hover:underline font-medium"
                data-testid="button-edit-inputs-scribe"
              >
                Edit
              </button>
            </div>

            {/* HERO SECTION */}
            <div className="text-center mb-10">
              <p className="text-lg md:text-xl text-neutral-500 font-medium mb-3">
                By switching from scribes to Abridge, you could capture
              </p>
              <div className="mb-3">
                <span className="text-5xl md:text-7xl font-bold text-emerald-600 tabular-nums tracking-tight">
                  <AnimatedNumber value={totalScribeValue} duration={1800} />
                </span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-neutral-900">
                in annual value.
              </p>
            </div>

            {/* VALUE BREAKDOWN */}
            <div className="space-y-3 mb-8">
              <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider px-1">Value Breakdown</h3>
              
              <div className="bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setExpandedScribeSections(prev => prev.includes("direct_savings") ? prev.filter(d => d !== "direct_savings") : [...prev, "direct_savings"])}
                  className="w-full p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                  data-testid="accordion-direct-savings"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-neutral-900">Direct Cost Savings</p>
                      <p className="text-xs text-neutral-500">Scribe spend eliminated minus Abridge cost</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-600">+{formatCurrency(directCostSavings)}/year</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedScribeSections.includes("direct_savings") ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedScribeSections.includes("direct_savings") && (
                  <div className="px-5 pb-5 border-t border-neutral-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-neutral-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Current Scribe Cost</p>
                        <p className="text-xl font-bold text-neutral-700">{formatCurrency(annualScribeCost)}/year</p>
                        <p className="text-xs text-neutral-500 mt-1 font-mono">
                          {providersWithScribes} × ${scribeHourlyCost}/hr × {scribeHoursPerWeek}hrs × 50wks
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Abridge Cost</p>
                        <p className="text-xl font-bold text-neutral-900">Contact for pricing</p>
                        <p className="text-xs text-emerald-600 mt-1">All {providers} providers covered</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setExpandedScribeSections(prev => prev.includes("expanded_coverage") ? prev.filter(d => d !== "expanded_coverage") : [...prev, "expanded_coverage"])}
                  className="w-full p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                  data-testid="accordion-expanded-coverage"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-neutral-900">Expanded Coverage Value</p>
                      <p className="text-xs text-neutral-500">{providersWithoutScribes} new providers with documentation support</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-600">+{formatCurrency(expandedCoverageValue)}/year</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedScribeSections.includes("expanded_coverage") ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedScribeSections.includes("expanded_coverage") && (
                  <div className="px-5 pb-5 border-t border-neutral-100">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>{providersWithoutScribes}</strong> providers currently have no documentation help.
                      </p>
                      <p className="text-sm text-neutral-600 font-mono">
                        {providersWithoutScribes} providers × {Math.round(encountersPerProvider).toLocaleString()} encounters × 3 min = {timeSavedNewProvidersHours.toLocaleString()} hours
                      </p>
                      <p className="text-sm text-neutral-600 font-mono">
                        {timeSavedNewProvidersHours.toLocaleString()} hours × $100/hr value = {formatCurrency(expandedCoverageValue)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setExpandedScribeSections(prev => prev.includes("hidden_costs") ? prev.filter(d => d !== "hidden_costs") : [...prev, "hidden_costs"])}
                  className="w-full p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                  data-testid="accordion-hidden-costs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-neutral-900">Turnover & Overhead Eliminated</p>
                      <p className="text-xs text-neutral-500">No more recruiting, training, management</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-emerald-600">+{formatCurrency(hiddenCosts)}/year</span>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${expandedScribeSections.includes("hidden_costs") ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedScribeSections.includes("hidden_costs") && (
                  <div className="px-5 pb-5 border-t border-neutral-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Turnover Cost</p>
                        <p className="text-lg font-bold text-neutral-900">{formatCurrency(annualTurnoverCost)}/year</p>
                        <p className="text-xs text-neutral-600 mt-1">
                          {providersWithScribes} × 35% turnover × $4,000
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Management Overhead</p>
                        <p className="text-lg font-bold text-neutral-900">{formatCurrency(managementOverhead)}/year</p>
                        <p className="text-xs text-neutral-600 mt-1">
                          Coordination, scheduling, QA
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TOTAL VALUE */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-400 mb-8">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Direct Cost Savings</span>
                  <span className="font-medium text-emerald-600">+{formatCurrency(directCostSavings)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Expanded Coverage Value</span>
                  <span className="font-medium text-emerald-600">+{formatCurrency(expandedCoverageValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Turnover & Overhead Eliminated</span>
                  <span className="font-medium text-emerald-600">+{formatCurrency(hiddenCosts)}</span>
                </div>
              </div>
              <div className="border-t border-emerald-300 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold text-neutral-900">Total Annual Value</span>
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">{formatCurrency(totalScribeValue)}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                className="px-6 py-2.5 rounded-xl font-medium text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                data-testid="button-copy-link"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                className="px-6 py-2.5 rounded-xl font-medium text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-6 py-2.5 rounded-xl font-medium"
                data-testid="button-edit-inputs-main"
              >
                Edit Inputs
              </Button>
            </div>
          </div>
        )}

        {step === 7 && !isScribePath && (
          <div className="animate-in fade-in duration-300">
            {/* HERO SECTION */}
            <div className="text-center mb-8">
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
                <span className="text-5xl md:text-7xl font-bold text-emerald-600 tabular-nums tracking-tight">
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

            {/* TAB NAVIGATION */}
            <div 
              className="flex justify-center gap-2 mb-8"
              style={{
                opacity: gapRevealStage >= 5 ? 1 : 0,
                transition: "all 0.3s ease-out"
              }}
            >
              <button
                onClick={() => setSummaryTab("drivers")}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  summaryTab === "drivers"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                data-testid="tab-by-driver"
              >
                By Driver
              </button>
              <button
                onClick={() => {
                  setSummaryTab("time");
                  // Trigger chart animation when switching to time tab
                  setChartAnimationStage(0);
                  setTimeout(() => setChartAnimationStage(1), 100);
                  setTimeout(() => setChartAnimationStage(2), 400);
                  setTimeout(() => setChartAnimationStage(3), 1000);
                  setTimeout(() => setChartAnimationStage(4), 1600);
                  setTimeout(() => setChartAnimationStage(5), 2000);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  summaryTab === "time"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                data-testid="tab-over-time"
              >
                Over Time
              </button>
            </div>

            {/* BY DRIVER TAB */}
            {summaryTab === "drivers" && gapRevealStage >= 5 && (
              <div className="space-y-4 mb-8">
                {selectedDrivers.map((driverId) => {
                  const driver = DRIVERS.find(d => d.id === driverId);
                  const values = calculations.driverValues[driverId];
                  const isExpanded = expandedDrivers.includes(driverId);
                  const Icon = driver?.icon || Users;
                  
                  if (!driver || !values) return null;
                  
                  return (
                    <div 
                      key={driverId} 
                      className={`border-2 rounded-2xl overflow-hidden bg-white transition-all duration-300 ${
                        isExpanded ? "border-emerald-300 shadow-lg" : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <button
                        onClick={() => toggleDriverExpanded(driverId)}
                        className="w-full p-5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                        data-testid={`accordion-${driverId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                            isExpanded ? "bg-emerald-100" : "bg-neutral-100"
                          }`}>
                            <Icon className={`w-5 h-5 transition-colors ${isExpanded ? "text-emerald-600" : "text-neutral-600"}`} />
                          </div>
                          <span className="font-semibold text-neutral-900">{driver.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-emerald-600">+{formatCurrency(values.gap)}/year</span>
                          <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-neutral-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-neutral-100 rounded-xl p-4">
                              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Your Current</p>
                              <div className="space-y-1 text-sm text-neutral-600 font-mono">
                                {values.theirCalc.map((line, i) => <p key={i}>{line}</p>)}
                              </div>
                              <p className="mt-3 text-xl font-bold text-neutral-600">{formatCurrency(values.their)}/year</p>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">With Abridge</p>
                              <div className="space-y-1 text-sm text-neutral-700 font-mono">
                                {values.abridgeCalc.map((line, i) => <p key={i}>{line}</p>)}
                              </div>
                              <p className="mt-3 text-xl font-bold text-neutral-900">{formatCurrency(values.abridge)}/year</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Total Summary */}
                <div className="bg-white rounded-xl p-5 border-2 border-emerald-400">
                  <div className="space-y-2 mb-3">
                    {selectedDrivers.map((driverId) => {
                      const driver = DRIVERS.find(d => d.id === driverId);
                      const values = calculations.driverValues[driverId];
                      return (
                        <div key={driverId} className="flex justify-between text-sm">
                          <span className="text-neutral-600">{driver?.name}</span>
                          <span className="font-medium text-emerald-600">+{formatCurrency(values?.gap || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-neutral-200 pt-3">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-neutral-900">TOTAL ANNUAL GAP</span>
                      <span className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.totalGap)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OVER TIME TAB */}
            {summaryTab === "time" && (
              <div className="mb-8">
                <div className="bg-white rounded-2xl p-6 border-2 border-neutral-200 mb-6">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">3-Year Cumulative Value</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="abridgeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#D1D5DB" />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "#6B7280" }} stroke="#D1D5DB" />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), "Cumulative Value"]}
                          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="abridge" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          fill="url(#abridgeGradient)"
                          style={{
                            strokeDasharray: 2000,
                            strokeDashoffset: chartAnimationStage >= 3 ? 0 : 2000,
                            transition: "stroke-dashoffset 2s ease-out",
                            fillOpacity: chartAnimationStage >= 4 ? 1 : 0
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Simple 3-column comparison */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Start Now</p>
                    <p className="text-xl md:text-2xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearTotal)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-xs font-semibold text-red-600 uppercase mb-1">Start in 6mo</p>
                    <p className="text-xl md:text-2xl font-bold text-red-500">{formatCurrency(calculations.waitThreeYearTotal)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Gap</p>
                    <p className="text-xl md:text-2xl font-bold text-amber-600">{formatCurrency(calculations.costOfWaiting)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ASSUMPTIONS FOOTER */}
            <div 
              className="mb-6"
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transition: "all 0.3s ease-out"
              }}
            >
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
              >
                <Lightbulb className="w-4 h-4" />
                <span>{showAssumptions ? "Hide" : "View"} assumptions</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAssumptions ? "rotate-180" : ""}`} />
              </button>
              {showAssumptions && (
                <div className="mt-3 bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs text-neutral-600">
                  <p><strong>Utilization:</strong> {utilization}% current vs {ABRIDGE_BENCHMARKS.utilization}% Abridge</p>
                  <p><strong>Time savings:</strong> {timeSavings} min vs {ABRIDGE_BENCHMARKS.timeSavings} min Abridge</p>
                  <p><strong>wRVU rate:</strong> ~$45/wRVU • <strong>Overtime rate:</strong> ~$100/hr</p>
                </div>
              )}
            </div>

            {/* ACTION BAR */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transition: "all 0.3s ease-out 0.1s"
              }}
            >
              <Button
                variant="outline"
                className="border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-6 py-3 h-auto text-sm font-semibold rounded-xl"
                onClick={() => setStep(3)}
                data-testid="button-edit-model"
              >
                Edit Model
              </Button>
              <Button
                variant="outline"
                className="border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-6 py-3 h-auto text-sm font-semibold rounded-xl"
                data-testid="button-copy-link"
              >
                Copy Link
              </Button>
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-bold rounded-xl shadow-lg"
                data-testid="button-lets-talk"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Let's Talk
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
