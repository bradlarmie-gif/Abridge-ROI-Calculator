import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Mic, User, Keyboard, Sparkles, Clock, DollarSign, ChevronDown, ChevronUp, Download, MessageSquare, Frown, Meh, Smile, PartyPopper, Users, Calendar, BadgeDollarSign, Heart, FileCheck, ShieldCheck, Lightbulb, Check, AlertTriangle, Target, BarChart3 } from "lucide-react";
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
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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
  { id: "ed", label: "ED", available: true },
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

  const solutionData = selectedSolution ? SOLUTION_DATA[selectedSolution] : null;
  
  useEffect(() => {
    if (step === 7) {
      setGapRevealStage(0);
      const timers = [
        setTimeout(() => setGapRevealStage(1), 300),
        setTimeout(() => setGapRevealStage(2), 800),
        setTimeout(() => setGapRevealStage(3), 2800),
        setTimeout(() => setGapRevealStage(4), 3200),
        setTimeout(() => setGapRevealStage(5), 3700),
        setTimeout(() => setGapRevealStage(6), 4200),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [step]);
  
  useEffect(() => {
    if (step === 9) {
      setChartAnimationStage(0);
      const timers = [
        setTimeout(() => setChartAnimationStage(1), 200),
        setTimeout(() => setChartAnimationStage(2), 800),
        setTimeout(() => setChartAnimationStage(3), 1800),
        setTimeout(() => setChartAnimationStage(4), 2400),
        setTimeout(() => setChartAnimationStage(5), 3000),
      ];
      return () => timers.forEach(clearTimeout);
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
      case 5: return true;
      case 6: return selectedDrivers.length >= 2;
      case 7: return true;
      case 8: return true;
      default: return false;
    }
  };

  const handleContinue = () => {
    if (step < 9) {
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {(["ambient", "scribes", "manual"] as SolutionType[]).map((solution) => {
                const data = SOLUTION_DATA[solution];
                const isSelected = selectedSolution === solution;
                const Icon = solution === "ambient" ? Mic : solution === "scribes" ? User : Keyboard;
                
                return (
                  <button
                    key={solution}
                    onClick={() => setSelectedSolution(solution)}
                    className={`group relative p-5 md:p-10 rounded-2xl border-2 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[#E85D3F] bg-gradient-to-b from-[#E85D3F]/5 to-[#E85D3F]/10 shadow-lg md:shadow-xl shadow-[#E85D3F]/10 md:-translate-y-1"
                        : "border-neutral-200 hover:border-neutral-300 md:hover:-translate-y-1 md:hover:shadow-xl bg-white"
                    }`}
                    data-testid={`card-solution-${solution}`}
                  >
                    <div className="flex md:block items-center gap-4 md:gap-0">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center md:mb-6 transition-all duration-300 flex-shrink-0 ${
                        isSelected 
                          ? "bg-[#E85D3F]/15 md:scale-105" 
                          : "bg-neutral-100 group-hover:bg-neutral-200 md:group-hover:scale-105"
                      }`}>
                        <Icon className={`w-6 h-6 md:w-8 md:h-8 transition-colors ${isSelected ? "text-[#E85D3F]" : "text-neutral-500 group-hover:text-neutral-700"}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base md:text-xl text-neutral-900 mb-1 md:mb-2">{data.name}</h3>
                        <p className="text-sm md:text-base text-neutral-500 leading-relaxed">{data.subtitle}</p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 md:top-4 md:right-4 w-5 h-5 md:w-6 md:h-6 bg-[#E85D3F] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 md:mt-12">
              <p className="text-xs md:text-sm font-medium text-neutral-600 mb-3 md:mb-4 text-center">Select a care setting:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {CARE_SETTINGS.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => setting.available && setSelectedSetting(setting.id)}
                    disabled={!setting.available}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                      selectedSetting === setting.id
                        ? "bg-neutral-900 text-white"
                        : setting.available
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        : "bg-neutral-50 text-neutral-400 cursor-not-allowed opacity-40"
                    }`}
                    title={!setting.available ? "Coming soon" : undefined}
                    data-testid={`button-setting-${setting.id}`}
                  >
                    {selectedSetting === setting.id && <span className="mr-1">●</span>}
                    {setting.label}
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
            </div>

            <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
              <p className="text-lg text-amber-900 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-amber-600" />
                <span>
                  At these numbers, you're documenting <strong className="text-amber-950 font-semibold">{calculations.theirDocumentedEncounters.toLocaleString()}</strong> encounters/year
                </span>
              </p>
            </div>

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

        {step === 3 && (
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

        {step === 4 && (
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

        {step === 5 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step5-title">
              Your current performance assumptions
            </h1>
            <p className="text-lg text-neutral-500 mb-6">Pre-filled with industry benchmarks. Expand to customize any metric.</p>

            <div className="bg-neutral-100 rounded-xl p-4 border border-neutral-200 mb-8 flex items-center gap-3">
              <Check className="w-5 h-5 text-neutral-500 flex-shrink-0" />
              <p className="text-neutral-700 text-sm">
                Based on typical {solutionData?.name} performance, we've pre-filled these assumptions. Expand any row to customize.
              </p>
            </div>

            <div className="space-y-3">
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
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-neutral-500">
                <Lightbulb className="w-4 h-4 inline mr-1.5 text-amber-500" />
                You can adjust these later if needed.
              </p>
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step5"
              >
                Continue with assumptions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-900 mb-2 md:mb-3" data-testid="text-step6-title">
              Where would better performance create value?
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
                  data-testid="button-continue-step6"
                >
                  <span className="hidden md:inline">Calculate Your Gap</span>
                  <span className="md:hidden">Calculate</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step8-title">
              Your value gap breakdown
            </h1>
            <p className="text-lg text-neutral-500 mb-6">Here's exactly where the value comes from.</p>

            <div className="bg-neutral-100 rounded-xl p-4 mb-8">
              <p className="text-sm text-neutral-700">
                <strong>You selected:</strong>{" "}
                {selectedDrivers.map((id, i) => (
                  <span key={id}>
                    {i > 0 && " • "}
                    <span className="text-neutral-900 font-medium">{DRIVERS.find(d => d.id === id)?.name}</span>
                  </span>
                ))}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {selectedDrivers.map((driverId, driverIndex) => {
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
                      className="w-full p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                      data-testid={`accordion-${driverId}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          isExpanded ? "bg-emerald-100" : "bg-neutral-100"
                        }`}>
                          <Icon className={`w-6 h-6 transition-colors ${isExpanded ? "text-emerald-600" : "text-neutral-600"}`} />
                        </div>
                        <span className="font-semibold text-lg text-neutral-900">{driver.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-emerald-600">+{formatCurrency(values.gap)}/year</span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isExpanded ? "bg-emerald-100 rotate-180" : "bg-neutral-100"
                        }`}>
                          <ChevronDown className={`w-5 h-5 transition-colors ${isExpanded ? "text-emerald-600" : "text-neutral-400"}`} />
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div 
                        className="px-6 pb-6 border-t border-neutral-100"
                        style={{ animation: "slideDown 0.4s ease-out forwards" }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                          <div className="relative bg-[#F3F4F6] rounded-2xl p-6 border border-[#E5E7EB] overflow-hidden">
                            <Mic className="absolute top-4 right-4 w-6 h-6 text-[#D1D5DB]" />
                            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-4">Your Current</p>
                            <div className="space-y-1.5 text-sm text-[#6B7280] font-mono">
                              {values.theirCalc.map((line, i) => (
                                <p key={i} style={{ animation: `fadeIn 0.3s ease-out ${0.1 * i}s both` }}>{line}</p>
                              ))}
                            </div>
                            <p className="mt-5 text-2xl font-bold text-[#6B7280]">{formatCurrency(values.their)}/year</p>
                          </div>
                          
                          <div className="relative bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200 overflow-hidden">
                            <div className="absolute top-4 right-4 text-emerald-100 font-bold text-3xl">A</div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">With Abridge</p>
                            <div className="space-y-1.5 text-sm text-[#1F2937] font-mono">
                              {values.abridgeCalc.map((line, i) => (
                                <p key={i} style={{ animation: `fadeIn 0.3s ease-out ${0.1 * i}s both` }}>{line}</p>
                              ))}
                            </div>
                            <p className="mt-5 text-2xl font-bold text-[#1F2937]">{formatCurrency(values.abridge)}/year</p>
                          </div>
                        </div>
                        
                        <div 
                          className="mt-6 text-center py-4 bg-emerald-50 rounded-xl border border-emerald-200"
                          style={{ animation: "countUp 0.5s ease-out 0.5s both" }}
                        >
                          <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide mb-1">Annual Value Gap</p>
                          <p className="text-3xl font-bold text-emerald-600">+{formatCurrency(values.gap)}/year</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-emerald-400 shadow-lg">
              <div className="space-y-2 mb-4">
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
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-neutral-900">TOTAL ANNUAL GAP</span>
                  <span className="text-3xl font-bold text-emerald-600">
                    <AnimatedNumber value={calculations.totalGap} />
                  </span>
                </div>
                <p className="text-sm text-neutral-500 text-center mt-3">
                  That's <strong className="text-emerald-600">{formatCurrency(calculations.monthlyGap)}</strong> every month you're not capturing with your current solution.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 mt-8">
              <p className="text-xs text-neutral-500 flex items-start gap-2">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-neutral-400 flex-shrink-0" />
                <span>
                  <strong>Assumptions:</strong> Utilization ({utilization}% current vs {ABRIDGE_BENCHMARKS.utilization}% Abridge), 
                  Time savings ({timeSavings} min vs {ABRIDGE_BENCHMARKS.timeSavings} min Abridge), 
                  wRVU rate (~$60/wRVU), Overtime rate (~$100/hr). All estimates based on typical performance data.
                </span>
              </p>
            </div>

            <div className="mt-10 flex justify-center">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step8"
              >
                What does waiting cost?
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
            <p 
              className="text-2xl md:text-3xl text-neutral-500 font-medium mb-4"
              style={{
                opacity: gapRevealStage >= 1 ? 1 : 0,
                transform: gapRevealStage >= 1 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.6s ease-out"
              }}
            >
              Based on what you've told us,
            </p>
            <p 
              className="text-2xl md:text-3xl text-neutral-500 font-medium mb-8"
              style={{
                opacity: gapRevealStage >= 1 ? 1 : 0,
                transform: gapRevealStage >= 1 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.6s ease-out 0.2s"
              }}
            >
              you're leaving
            </p>
            
            <div 
              className="mb-6"
              style={{
                opacity: gapRevealStage >= 2 ? 1 : 0,
                transform: gapRevealStage >= 2 ? "scale(1)" : "scale(0.8)",
                transition: "all 0.8s ease-out"
              }}
            >
              <span className="text-6xl md:text-8xl font-bold text-[#E85D3F] tabular-nums tracking-tight">
                {gapRevealStage >= 2 ? <AnimatedNumber value={calculations.totalGap} duration={2000} /> : "$0"}
              </span>
            </div>
            
            <p 
              className="text-2xl md:text-3xl text-neutral-500 font-medium mb-2"
              style={{
                opacity: gapRevealStage >= 3 ? 1 : 0,
                transform: gapRevealStage >= 3 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.5s ease-out"
              }}
            >
              on the table.
            </p>
            
            <p 
              className="text-3xl md:text-4xl font-bold text-neutral-900 mb-12"
              style={{
                opacity: gapRevealStage >= 4 ? 1 : 0,
                transform: gapRevealStage >= 4 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.5s ease-out"
              }}
            >
              Every. Single. Year.
            </p>
            
            <div 
              className="w-48 h-px bg-neutral-300 mb-10"
              style={{
                opacity: gapRevealStage >= 5 ? 1 : 0,
                transform: gapRevealStage >= 5 ? "scaleX(1)" : "scaleX(0)",
                transition: "all 0.5s ease-out"
              }}
            />
            
            <div 
              className="space-y-2 text-lg md:text-xl text-neutral-600 mb-12"
              style={{
                opacity: gapRevealStage >= 5 ? 1 : 0,
                transform: gapRevealStage >= 5 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.5s ease-out"
              }}
            >
              <p>That's <strong className="text-neutral-900">{formatCurrency(calculations.monthlyGap)}</strong> every month</p>
              <p><strong className="text-neutral-900">{formatCurrency(Math.round(calculations.totalGap / 365))}</strong> every day</p>
              <p><strong className="text-neutral-900">{formatCurrency(Math.round(calculations.totalGap / 2080))}</strong> every hour your clinic is open</p>
            </div>
            
            <div
              style={{
                opacity: gapRevealStage >= 6 ? 1 : 0,
                transform: gapRevealStage >= 6 ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.5s ease-out"
              }}
              className="text-center"
            >
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-12 py-4 h-auto text-lg font-bold rounded-xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:-translate-y-1"
                data-testid="button-continue-step7"
              >
                See The Breakdown
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-neutral-400 mt-3">{selectedDrivers.length} key {selectedDrivers.length === 1 ? "area" : "areas"} where value is leaking</p>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-3 tracking-tight leading-tight" data-testid="text-step9-title">
              The cost of waiting
            </h1>
            <p className="text-xl text-neutral-500 mb-10">Every month you delay is value you'll never recapture.</p>

            <div 
              className="bg-white rounded-2xl p-8 border-2 border-neutral-200 mb-8 shadow-sm"
              style={{ 
                opacity: chartAnimationStage >= 1 ? 1 : 0,
                transition: "opacity 0.3s ease-out"
              }}
            >
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-6">3-Year Cumulative Value</p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="abridgeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E85D3F" stopOpacity={0.15}/>
                        <stop offset="100%" stopColor="#E85D3F" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#E5E7EB"
                      style={{
                        opacity: chartAnimationStage >= 1 ? 1 : 0,
                        transition: "opacity 0.2s ease-out"
                      }}
                    />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12, fill: "#6B7280" }} 
                      stroke="#D1D5DB"
                      axisLine={{ strokeWidth: 2 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} 
                      tick={{ fontSize: 12, fill: "#6B7280" }} 
                      stroke="#D1D5DB"
                      axisLine={{ strokeWidth: 2 }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === "current" ? `Stay with ${solutionData?.name}` : "Switch to Abridge"
                      ]}
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: '2px solid #E5E7EB',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#9CA3AF" 
                      strokeWidth={3}
                      fill="transparent"
                      name="current"
                      style={{
                        strokeDasharray: 2000,
                        strokeDashoffset: chartAnimationStage >= 2 ? 0 : 2000,
                        transition: "stroke-dashoffset 1.5s ease-out"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="abridge" 
                      stroke="#10B981" 
                      strokeWidth={4}
                      fill="url(#abridgeGradient)"
                      name="abridge"
                      style={{
                        strokeDasharray: 2000,
                        strokeDashoffset: chartAnimationStage >= 3 ? 0 : 2000,
                        transition: "stroke-dashoffset 1.5s ease-out 0.3s",
                        fillOpacity: chartAnimationStage >= 4 ? 1 : 0
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div 
                className="flex items-center justify-center gap-8 mt-6 text-sm"
                style={{
                  opacity: chartAnimationStage >= 5 ? 1 : 0,
                  transform: chartAnimationStage >= 5 ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.3s ease-out"
                }}
              >
                <span className="flex items-center gap-2 text-neutral-600">
                  <div className="w-4 h-1 rounded-full bg-neutral-400" />
                  Stay with {solutionData?.name}
                </span>
                <span className="flex items-center gap-2 font-semibold text-emerald-600">
                  <div className="w-4 h-1 rounded-full bg-emerald-500" />
                  Switch to Abridge
                </span>
              </div>
            </div>

            <div 
              className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50 mb-8 text-sm text-amber-800"
              style={{
                opacity: chartAnimationStage >= 5 ? 1 : 0,
                transition: "opacity 0.3s ease-out 0.2s"
              }}
            >
              <Lightbulb className="w-4 h-4 inline mr-2 text-amber-600" />
              <strong>Realistic ramp-up</strong> based on your selected drivers. 
              {selectedDrivers.some(id => DRIVERS.find(d => d.id === id)?.rampSpeed === "fast") && " Fast drivers show within 1-3 months."}
              {selectedDrivers.some(id => DRIVERS.find(d => d.id === id)?.rampSpeed === "slow") && " Slow drivers take 12-18 months."}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div 
                className="bg-emerald-50 rounded-2xl p-8 border-[3px] border-emerald-400 shadow-lg relative overflow-hidden"
                style={{
                  opacity: chartAnimationStage >= 5 ? 1 : 0,
                  transform: chartAnimationStage >= 5 ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.4s ease-out"
                }}
              >
                <div className="absolute top-4 right-4 text-emerald-200 text-6xl font-bold opacity-30">A</div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-5">Starting now</p>
                <div className="space-y-3 text-base">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      6 months
                    </span>
                    <span className="font-bold text-emerald-700 text-lg tabular-nums">+{formatCurrency(calculations.month6Value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Year 1
                    </span>
                    <span className="font-bold text-emerald-700 text-lg tabular-nums">+{formatCurrency(calculations.year1Value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Year 2
                    </span>
                    <span className="font-bold text-emerald-700 text-lg tabular-nums">+{formatCurrency(calculations.year2Value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Year 3
                    </span>
                    <span className="font-bold text-emerald-700 text-lg tabular-nums">+{formatCurrency(calculations.year3Value)}</span>
                  </div>
                </div>
                <div className="border-t-2 border-emerald-300 mt-6 pt-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-emerald-800 text-sm uppercase tracking-wide">3-Year Total</span>
                    <span className="text-4xl font-bold text-emerald-600 tabular-nums tracking-tight">{formatCurrency(calculations.threeYearTotal)}</span>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-red-50 rounded-2xl p-8 border-[3px] border-red-300 shadow-lg relative overflow-hidden"
                style={{
                  opacity: chartAnimationStage >= 5 ? 1 : 0,
                  transform: chartAnimationStage >= 5 ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.4s ease-out 0.1s"
                }}
              >
                <div className="absolute top-4 right-4 text-red-200 text-6xl font-bold opacity-30">?</div>
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-5">Starting in 6 months</p>
                <div className="space-y-3 text-base">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-400">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      6 months
                    </span>
                    <span className="font-bold text-neutral-400 text-lg tabular-nums">$0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Year 1
                    </span>
                    <span className="font-bold text-red-600 text-lg tabular-nums">+{formatCurrency(calculations.waitYear1Value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Year 2
                    </span>
                    <span className="font-bold text-red-600 text-lg tabular-nums">+{formatCurrency(calculations.waitYear2Value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-neutral-600">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Year 3
                    </span>
                    <span className="font-bold text-red-600 text-lg tabular-nums">+{formatCurrency(calculations.waitYear3Value)}</span>
                  </div>
                </div>
                <div className="border-t-2 border-red-200 mt-6 pt-6">
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="font-bold text-red-800 text-sm uppercase tracking-wide">3-Year Total</span>
                    <span className="text-4xl font-bold text-red-500 tabular-nums tracking-tight">{formatCurrency(calculations.waitThreeYearTotal)}</span>
                  </div>
                  <div className="bg-[#FEE2E2] rounded-lg p-3 text-center border border-[#FECACA]">
                    <p className="text-sm text-[#991B1B]/70 mb-1">The gap if you wait</p>
                    <p className="text-xl font-bold text-[#991B1B]">
                      {formatCurrency(calculations.costOfWaiting)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="bg-amber-100 rounded-2xl p-6 border-2 border-amber-300 text-center mb-10 shadow-md"
              style={{
                opacity: chartAnimationStage >= 5 ? 1 : 0,
                transform: chartAnimationStage >= 5 ? "scale(1)" : "scale(0.95)",
                transition: "all 0.4s ease-out 0.3s"
              }}
            >
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <p className="text-xl text-amber-900 font-bold">
                Every month you delay = <span className="text-[#E85D3F] text-2xl">{formatCurrency(calculations.monthlyGap)}</span>
              </p>
              <p className="text-amber-700 mt-1">in value you'll never recapture.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="outline"
                className="border-2 border-[#E85D3F] text-[#E85D3F] hover:bg-[#E85D3F]/5 px-8 py-4 h-auto text-base font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                data-testid="button-save-analysis"
              >
                <Download className="w-5 h-5 mr-2" />
                Save This Analysis
              </Button>
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-4 h-auto text-lg font-bold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                data-testid="button-lets-talk"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Let's Talk
              </Button>
            </div>
            
            <p className="text-center text-sm text-neutral-400 mt-8">
              All assumptions and methodology can be adjusted in conversation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
