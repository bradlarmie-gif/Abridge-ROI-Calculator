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
    subtitle: "DAX, Suki, Nabla, or similar",
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

  const solutionData = selectedSolution ? SOLUTION_DATA[selectedSolution] : null;

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
    if (step < 8) {
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
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={abridgeLogo} alt="Abridge" className="h-6" />
            <span className="text-sm font-medium text-neutral-400 tracking-wide">SWITCH</span>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? "Back to Home" : "Back"}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3 text-center" data-testid="text-step1-title">
              What solution are you using today?
            </h1>
            <p className="text-lg text-neutral-500 text-center mb-12">
              We'll show you what you might be leaving on the table.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(["ambient", "scribes", "manual"] as SolutionType[]).map((solution) => {
                const data = SOLUTION_DATA[solution];
                const isSelected = selectedSolution === solution;
                const Icon = solution === "ambient" ? Mic : solution === "scribes" ? User : Keyboard;
                
                return (
                  <button
                    key={solution}
                    onClick={() => setSelectedSolution(solution)}
                    className={`group relative p-10 rounded-2xl border-2 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[#E85D3F] bg-gradient-to-b from-[#E85D3F]/5 to-[#E85D3F]/10 shadow-xl shadow-[#E85D3F]/10 -translate-y-1"
                        : "border-neutral-200 hover:border-neutral-300 hover:-translate-y-1 hover:shadow-xl bg-white"
                    }`}
                    style={{ minHeight: "200px" }}
                    data-testid={`card-solution-${solution}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
                      isSelected 
                        ? "bg-[#E85D3F]/15 scale-105" 
                        : "bg-neutral-100 group-hover:bg-neutral-200 group-hover:scale-105"
                    }`}>
                      <Icon className={`w-8 h-8 transition-colors ${isSelected ? "text-[#E85D3F]" : "text-neutral-500 group-hover:text-neutral-700"}`} />
                    </div>
                    <h3 className="font-semibold text-xl text-neutral-900 mb-2">{data.name}</h3>
                    <p className="text-base text-neutral-500 leading-relaxed">{data.subtitle}</p>
                    
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-[#E85D3F] rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-12">
              <p className="text-sm font-medium text-neutral-600 mb-4 text-center">Select a care setting:</p>
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

            <div className="mt-12 flex justify-center">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl transition-all disabled:opacity-40"
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
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step2-title">
              Let's start with the basics.
            </h1>
            <p className="text-lg text-neutral-500 mb-12">We'll build your baseline together.</p>

            <div className="bg-neutral-50 rounded-2xl p-8 md:p-10 space-y-8">
              <div className="space-y-6">
                <p className="text-xl text-neutral-700 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-3">
                  <span>You have</span>
                  <span className="inline-flex">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={providers === 0 ? "" : providers.toString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setProviders(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder="50"
                      className="w-20 px-3 py-2 rounded-lg border-2 border-neutral-300 bg-white text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                      data-testid="input-providers"
                    />
                  </span>
                  <span>providers</span>
                </p>

                <p className="text-xl text-neutral-700 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-3">
                  <span>handling roughly</span>
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={annualEncounters === 0 ? "" : annualEncounters.toLocaleString()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setAnnualEncounters(val === "" ? 0 : parseInt(val, 10));
                      }}
                      placeholder="100,000"
                      className="w-32 px-3 py-2 rounded-lg border-2 border-neutral-300 bg-white text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/30 focus:border-[#E85D3F] transition-all"
                      data-testid="input-encounters"
                    />
                    {providers > 0 && annualEncounters === 0 && (
                      <button
                        onClick={() => setAnnualEncounters(providers * 2000)}
                        className="px-3 py-2 bg-[#E85D3F]/10 hover:bg-[#E85D3F]/20 text-[#E85D3F] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        data-testid="button-auto-calculate"
                        title={`Auto-fill: ${providers} providers × 2,000 = ${(providers * 2000).toLocaleString()}`}
                      >
                        Use typical
                      </button>
                    )}
                  </span>
                  <span>encounters/year</span>
                </p>

                {annualEncounters > 0 && providers > 0 && (
                  <div className="flex items-center gap-2 text-base text-neutral-500 pl-1">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
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

              <div className="border-t border-neutral-200 pt-8">
                <p className="text-xl text-neutral-700 mb-6">
                  And your current utilization is:
                </p>
                
                <div className="relative">
                  <div className="mb-4 text-center">
                    <span className="inline-flex items-baseline gap-1 bg-white border-2 border-neutral-200 rounded-xl px-5 py-3 shadow-sm">
                      <span className="text-4xl font-bold text-neutral-900">{utilization}</span>
                      <span className="text-lg text-neutral-400">%</span>
                    </span>
                  </div>
                  
                  <div className="relative rounded-2xl bg-gradient-to-r from-red-100 via-amber-100 via-60% via-emerald-100 to-emerald-200 p-1">
                    <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
                      <Frown className="w-7 h-7 text-red-400/50" />
                      <Meh className="w-7 h-7 text-amber-400/50" />
                      <Smile className="w-7 h-7 text-emerald-400/50" />
                      <PartyPopper className="w-7 h-7 text-emerald-500/50" />
                    </div>
                    
                    <Slider
                      value={[utilization]}
                      onValueChange={(v) => setUtilization(v[0])}
                      min={10}
                      max={90}
                      step={5}
                      className="relative z-10 [&_[role=slider]]:w-12 [&_[role=slider]]:h-12 [&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-neutral-300 [&_[role=slider]]:shadow-lg [&_[role=slider]]:rounded-xl [&_[role=slider]]:cursor-grab [&_[role=slider]]:active:cursor-grabbing [&_[role=slider]]:hover:border-neutral-400 [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-[#E85D3F]/30 [&_.relative]:bg-transparent [&_.relative]:h-14 [&_[class*='bg-primary']]:bg-transparent"
                      data-testid="slider-utilization"
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-neutral-400 mt-2 px-2">
                    <span>10%</span>
                    <span>90%</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <span className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-full text-sm ${status.color} ${status.bgColor}`}>
                      <StatusIcon className="w-5 h-5" /> {status.label}
                    </span>
                    <span className="text-sm text-[#E85D3F] flex items-center gap-1.5 bg-[#E85D3F]/5 px-4 py-2.5 rounded-full">
                      <Sparkles className="w-4 h-4" />
                      Abridge hits {ABRIDGE_BENCHMARKS.utilization}%
                    </span>
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

              <div className="flex justify-between text-xs text-neutral-500 mt-10 px-2">
                <span className="flex items-center gap-1"><Frown className="w-3 h-3" /> &lt;40%</span>
                <span className="flex items-center gap-1"><Meh className="w-3 h-3" /> 40-55%</span>
                <span className="flex items-center gap-1"><Smile className="w-3 h-3" /> 55-65%</span>
                <span className="flex items-center gap-1"><PartyPopper className="w-3 h-3" /> 65%+</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="relative bg-neutral-100 rounded-2xl p-6 border-2 border-neutral-300 overflow-hidden">
                <Mic className="absolute top-4 right-4 w-8 h-8 text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Your Current</p>
                <p className="text-sm text-neutral-500 mb-1">At {utilization}% utilization</p>
                <p className="text-4xl font-bold text-neutral-900 mb-1">{calculations.theirDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">encounters documented/year</p>
              </div>
              
              <div className="relative bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-400 overflow-hidden">
                <div className="absolute top-4 right-4 text-emerald-200 font-bold text-4xl opacity-30">A</div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">With Abridge</p>
                <p className="text-sm text-emerald-700 mb-1">At {ABRIDGE_BENCHMARKS.utilization}% utilization</p>
                <p className="text-4xl font-bold text-emerald-600 mb-1">{calculations.abridgeDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">encounters documented/year</p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full">
                  <ArrowRight className="w-3 h-3 rotate-[-45deg]" />
                  +{Math.round(((calculations.abridgeDocumentedEncounters - calculations.theirDocumentedEncounters) / calculations.theirDocumentedEncounters) * 100)}% more
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                That <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> utilization gap = <strong>{calculations.utilizationGapPercent}%</strong> more encounters being documented.
              </p>
              <p className="text-[#E85D3F] font-medium mt-1">This is where value leaks.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="bg-neutral-100 rounded-2xl p-6">
                <p className="text-sm text-neutral-500 mb-2">At your {timeSavings} min savings</p>
                <p className="text-4xl font-bold text-neutral-900 mb-1">{calculations.theirTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-4">That's your current impact</p>
              </div>
              
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                <p className="text-sm text-emerald-700 mb-2">At Abridge {ABRIDGE_BENCHMARKS.timeSavings} min</p>
                <p className="text-4xl font-bold text-emerald-600 mb-1">{calculations.abridgeTimeSavedHours.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">hours returned/year</p>
                <p className="text-xs text-emerald-600 mt-4 font-medium">
                  That's {calculations.efficiencyGapHours.toLocaleString()} MORE hours
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                The efficiency gap = <strong>{calculations.efficiencyGapPercent}%</strong> more time returned per encounter.
              </p>
              <p className="text-[#E85D3F] font-medium mt-1">Between the two gaps, you're leaving significant value on the table.</p>
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
              Let's understand your current performance
            </h1>
            <p className="text-lg text-neutral-500 mb-6">A few quick metrics to make this accurate for you.</p>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200/50 mb-10">
              <p className="text-blue-900 text-sm">
                <Lightbulb className="w-4 h-4 inline mr-1.5 text-blue-600" />
                We've seen many organizations using {solutionData?.name}. Here's what we typically see - but your reality might be different. Help us understand YOUR current results.
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  What wRVU uplift are you seeing from {solutionData?.name}?
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={!wrvuKnown}
                      onChange={() => {
                        setWrvuKnown(false);
                        setWrvuUplift(solutionData?.typicalWrvuUplift || 3.5);
                      }}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div>
                      <span className="text-sm text-neutral-900">Not sure / Haven't measured</span>
                      <p className="text-xs text-neutral-500 mt-0.5">We'll use industry average: {solutionData?.typicalWrvuUplift || 3.5}%</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={wrvuKnown}
                      onChange={() => setWrvuKnown(true)}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-neutral-900">We've measured it</span>
                      {wrvuKnown && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={wrvuUplift}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setWrvuUplift(val === "" ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                          <span className="text-sm text-neutral-500">% uplift</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  What % of your encounters are being corrected from under-coding?
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={!underCodingKnown}
                      onChange={() => {
                        setUnderCodingKnown(false);
                        setUnderCoding(solutionData?.typicalUnderCoding || 8);
                      }}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div>
                      <span className="text-sm text-neutral-900">Not sure / Haven't measured</span>
                      <p className="text-xs text-neutral-500 mt-0.5">We'll use typical estimate: {solutionData?.typicalUnderCoding || 8}%</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={underCodingKnown}
                      onChange={() => setUnderCodingKnown(true)}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-neutral-900">We track this</span>
                      {underCodingKnown && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={underCoding}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setUnderCoding(val === "" ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                          <span className="text-sm text-neutral-500">%</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  How much has {solutionData?.name} reduced documentation-related denials?
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={!denialKnown}
                      onChange={() => {
                        setDenialKnown(false);
                        setDenialPrevention(solutionData?.typicalDenialPrevention || 30);
                      }}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div>
                      <span className="text-sm text-neutral-900">Not sure / Haven't measured</span>
                      <p className="text-xs text-neutral-500 mt-0.5">We'll use typical estimate: {solutionData?.typicalDenialPrevention || 30}% reduction</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={denialKnown}
                      onChange={() => setDenialKnown(true)}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-neutral-900">We have this data</span>
                      {denialKnown && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={denialPrevention}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setDenialPrevention(val === "" ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                          <span className="text-sm text-neutral-500">% reduction</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-neutral-200">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">
                  Have you seen improvement in HCC/chronic condition capture?
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={!hccKnown}
                      onChange={() => {
                        setHccKnown(false);
                        setHccImprovement(solutionData?.typicalHccImprovement || 10);
                      }}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div>
                      <span className="text-sm text-neutral-900">Not measuring this</span>
                      <p className="text-xs text-neutral-500 mt-0.5">We'll use conservative estimate: {solutionData?.typicalHccImprovement || 10}% improvement</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                    <input
                      type="radio"
                      checked={hccKnown}
                      onChange={() => setHccKnown(true)}
                      className="w-4 h-4 mt-0.5 text-[#E85D3F] focus:ring-[#E85D3F]"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-neutral-900">Yes, we track it</span>
                      {hccKnown && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={hccImprovement}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setHccImprovement(val === "" ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                          />
                          <span className="text-sm text-neutral-500">% improvement</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-5 mt-8 border border-neutral-200">
              <p className="text-sm text-neutral-600">
                <Lightbulb className="w-4 h-4 inline mr-1.5 text-amber-500" />
                It's okay if you don't have all these metrics. Most organizations don't measure this granularly - that's actually part of the problem. We'll use industry benchmarks where needed, but YOUR data makes this analysis more accurate.
              </p>
            </div>

            <div className="mt-12 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step5"
              >
                Continue to drivers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step6-title">
              Where would better performance create value?
            </h1>
            <p className="text-lg text-neutral-500 mb-8">Select 2-4 areas where improvement matters most.</p>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200/50 mb-10">
              <p className="text-sm font-semibold text-blue-900 mb-3">We've established three types of gaps:</p>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <BarChart3 className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong>Adoption Gap:</strong> You're at {utilization}% utilization, Abridge averages {ABRIDGE_BENCHMARKS.utilization}% = {calculations.utilizationGapEncounters.toLocaleString()} more encounters
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong>Efficiency Gap:</strong> You're getting {timeSavings} min/encounter, Abridge gets {ABRIDGE_BENCHMARKS.timeSavings} min = {calculations.efficiencyGapHours.toLocaleString()} more hours
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <strong>Performance Gaps:</strong> wRVU ({wrvuUplift}% vs {ABRIDGE_BENCHMARKS.wrvuUplift}%), Denial prevention ({denialPrevention}% vs {ABRIDGE_BENCHMARKS.denialPrevention}%)
                  </div>
                </div>
              </div>
              <p className="text-sm text-blue-900 mt-4 font-medium">Now let's focus on where these gaps matter most for YOU.</p>
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time Saved Benefits
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DRIVERS.filter(d => d.category === "time").map((driver) => {
                  const Icon = driver.icon;
                  const isSelected = selectedDrivers.includes(driver.id);
                  
                  return (
                    <button
                      key={driver.id}
                      onClick={() => toggleDriver(driver.id)}
                      className={`p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-[#E85D3F] bg-[#E85D3F]/5 shadow-lg"
                          : "border-neutral-200 hover:border-neutral-300 hover:shadow-md bg-white"
                      }`}
                      data-testid={`driver-${driver.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-[#E85D3F]/10" : "bg-neutral-100"
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? "text-[#E85D3F]" : "text-neutral-500"}`} />
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-neutral-900 mb-1">{driver.name}</h3>
                      <p className="text-sm text-neutral-500 mb-2">{driver.description}</p>
                      <p className="text-xs text-neutral-400 mb-3">{driver.context}</p>
                      <p className="text-sm font-semibold text-[#E85D3F]">Typical gap: {driver.typicalGap}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4" /> Documentation Quality Benefits
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DRIVERS.filter(d => d.category === "quality").map((driver) => {
                  const Icon = driver.icon;
                  const isSelected = selectedDrivers.includes(driver.id);
                  
                  return (
                    <button
                      key={driver.id}
                      onClick={() => toggleDriver(driver.id)}
                      className={`p-6 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-[#E85D3F] bg-[#E85D3F]/5 shadow-lg"
                          : "border-neutral-200 hover:border-neutral-300 hover:shadow-md bg-white"
                      }`}
                      data-testid={`driver-${driver.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-[#E85D3F]/10" : "bg-neutral-100"
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? "text-[#E85D3F]" : "text-neutral-500"}`} />
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-neutral-900 mb-1">{driver.name}</h3>
                      <p className="text-sm text-neutral-500 mb-2">{driver.description}</p>
                      <p className="text-xs text-neutral-400 mb-3">{driver.context}</p>
                      <p className="text-sm font-semibold text-[#E85D3F]">Typical gap: {driver.typicalGap}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 -mx-6 px-6 py-5 mt-8 shadow-xl z-10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      {selectedDrivers.slice(0, 4).map((id) => {
                        const driver = DRIVERS.find(d => d.id === id);
                        const Icon = driver?.icon || Users;
                        return (
                          <div key={id} className="w-8 h-8 rounded-full bg-[#E85D3F]/10 border-2 border-white flex items-center justify-center">
                            <Icon className="w-4 h-4 text-[#E85D3F]" />
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-base font-semibold text-neutral-900">
                      {selectedDrivers.length} of 6 selected
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    {selectedDrivers.length < 2 
                      ? "Select at least 2 drivers to continue" 
                      : selectedDrivers.length >= 4 
                        ? "Great selection!" 
                        : "Select 2-4 areas that matter most"}
                  </p>
                </div>
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl disabled:opacity-40 shadow-lg"
                  data-testid="button-continue-step6"
                >
                  Calculate Your Gap
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step7-title">
              Your value gap
            </h1>
            <p className="text-lg text-neutral-500 mb-6">Based on what you selected, here's what you're leaving on the table.</p>

            <div className="bg-neutral-100 rounded-xl p-4 mb-8">
              <p className="text-sm text-neutral-700">
                <strong>You selected:</strong>{" "}
                {selectedDrivers.map((id, i) => (
                  <span key={id}>
                    {i > 0 && " • "}
                    <span className="text-[#E85D3F] font-medium">{DRIVERS.find(d => d.id === id)?.name}</span>
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
                const barPercent = values && values.abridge > 0 ? Math.min((values.their / values.abridge) * 100, 100) : 0;
                
                if (!driver || !values) return null;
                
                return (
                  <div 
                    key={driverId} 
                    className={`border-2 rounded-2xl overflow-hidden bg-white transition-all duration-300 ${
                      isExpanded ? "border-[#E85D3F]/30 shadow-lg" : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <button
                      onClick={() => toggleDriverExpanded(driverId)}
                      className="w-full p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
                      data-testid={`accordion-${driverId}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          isExpanded ? "bg-[#E85D3F]/10" : "bg-neutral-100"
                        }`}>
                          <Icon className={`w-6 h-6 transition-colors ${isExpanded ? "text-[#E85D3F]" : "text-neutral-600"}`} />
                        </div>
                        <span className="font-semibold text-lg text-neutral-900">{driver.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-[#E85D3F]">+{formatCurrency(values.gap)}/year</span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isExpanded ? "bg-[#E85D3F]/10 rotate-180" : "bg-neutral-100"
                        }`}>
                          <ChevronDown className={`w-5 h-5 transition-colors ${isExpanded ? "text-[#E85D3F]" : "text-neutral-400"}`} />
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div 
                        className="px-6 pb-6 border-t border-neutral-100"
                        style={{ animation: "slideDown 0.4s ease-out forwards" }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                          <div className="relative bg-neutral-100 rounded-2xl p-6 border-2 border-neutral-300 overflow-hidden">
                            <Mic className="absolute top-4 right-4 w-6 h-6 text-neutral-300" />
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Your Current</p>
                            <div className="space-y-1.5 text-sm text-neutral-600 font-mono">
                              {values.theirCalc.map((line, i) => (
                                <p key={i} style={{ animation: `fadeIn 0.3s ease-out ${0.1 * i}s both` }}>{line}</p>
                              ))}
                            </div>
                            <div className="mt-5 h-3 bg-neutral-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-neutral-400 rounded-full"
                                style={{ 
                                  width: `${barPercent}%`,
                                  animation: "growWidth 0.6s ease-out 0.3s both"
                                }}
                              />
                            </div>
                            <p className="mt-3 text-2xl font-bold text-neutral-700">{formatCurrency(values.their)}/year</p>
                          </div>
                          
                          <div className="relative bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-400 overflow-hidden">
                            <div className="absolute top-4 right-4 text-emerald-200 font-bold text-3xl opacity-40">A</div>
                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4">With Abridge</p>
                            <div className="space-y-1.5 text-sm text-emerald-800 font-mono">
                              {values.abridgeCalc.map((line, i) => (
                                <p key={i} style={{ animation: `fadeIn 0.3s ease-out ${0.1 * i}s both` }}>{line}</p>
                              ))}
                            </div>
                            <div className="mt-5 h-3 bg-emerald-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ animation: "growWidth 0.6s ease-out 0.3s both", width: "100%" }}
                              />
                            </div>
                            <p className="mt-3 text-2xl font-bold text-emerald-600">{formatCurrency(values.abridge)}/year</p>
                          </div>
                        </div>
                        
                        <div 
                          className="mt-6 text-center py-4 bg-[#E85D3F]/5 rounded-xl border border-[#E85D3F]/20"
                          style={{ animation: "countUp 0.5s ease-out 0.5s both" }}
                        >
                          <p className="text-sm font-medium text-[#E85D3F]/70 uppercase tracking-wide mb-1">Annual Value Gap</p>
                          <p className="text-3xl font-bold text-[#E85D3F]">+{formatCurrency(values.gap)}/year</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-[#E85D3F] shadow-lg">
              <div className="space-y-2 mb-4">
                {selectedDrivers.map((driverId) => {
                  const driver = DRIVERS.find(d => d.id === driverId);
                  const values = calculations.driverValues[driverId];
                  return (
                    <div key={driverId} className="flex justify-between text-sm">
                      <span className="text-neutral-600">{driver?.name}</span>
                      <span className="font-medium text-neutral-900">+{formatCurrency(values?.gap || 0)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-neutral-900">TOTAL ANNUAL GAP</span>
                  <span className="text-3xl font-bold text-[#E85D3F]">
                    <AnimatedNumber value={calculations.totalGap} />
                  </span>
                </div>
                <p className="text-sm text-neutral-500 text-center mt-3">
                  That's <strong className="text-neutral-700">{formatCurrency(calculations.monthlyGap)}</strong> every month you're not capturing with your current solution.
                </p>
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step7"
              >
                What does waiting cost?
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3" data-testid="text-step8-title">
              The cost of waiting
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Every month you delay is value you'll never recapture.</p>

            <div className="bg-white rounded-xl p-6 border border-neutral-200 mb-8">
              <p className="text-sm font-semibold text-neutral-500 mb-4">3-YEAR CUMULATIVE VALUE</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="abridgeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E85D3F" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#E85D3F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} 
                      tick={{ fontSize: 12 }} 
                      stroke="#9CA3AF"
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Abridge Value"]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#6B7280" 
                      strokeWidth={2}
                      fill="transparent"
                      name="Current Solution"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="abridge" 
                      stroke="#E85D3F" 
                      strokeWidth={3}
                      fill="url(#abridgeGradient)"
                      name="With Abridge"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-neutral-400" />
                  Stay with {solutionData?.name}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#E85D3F]" />
                  Switch to Abridge
                </span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50 mb-8 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 inline mr-1.5 text-amber-600" />
              <strong>Realistic ramp-up</strong> based on your selected drivers. 
              {selectedDrivers.some(id => DRIVERS.find(d => d.id === id)?.rampSpeed === "fast") && " Fast drivers (Overtime, Level of Service, Denials) show within 1-3 months."}
              {selectedDrivers.some(id => DRIVERS.find(d => d.id === id)?.rampSpeed === "slow") && " Slow drivers (Retention, HCC) take 12-18 months to fully realize."}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div className="bg-emerald-50 rounded-xl p-6 border-2 border-emerald-300">
                <p className="text-sm font-semibold text-emerald-700 mb-4">IF YOU SWITCH TODAY</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">6 months</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.month6Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 1</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.year1Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 2</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.year2Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 3</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.year3Value)}</span>
                  </div>
                </div>
                <div className="border-t border-emerald-200 mt-4 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-emerald-800">3-year total</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearTotal)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
                <p className="text-sm font-semibold text-red-700 mb-4">IF YOU WAIT 6 MONTHS</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">6 months</span>
                    <span className="font-semibold text-neutral-400">$0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 1</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.waitYear1Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 2</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.waitYear2Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 3</span>
                    <span className="font-semibold text-neutral-900">+{formatCurrency(calculations.waitYear3Value)}</span>
                  </div>
                </div>
                <div className="border-t border-red-200 mt-4 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-red-800">3-year total</span>
                    <span className="text-2xl font-bold text-red-600">{formatCurrency(calculations.waitThreeYearTotal)}</span>
                  </div>
                  <p className="text-red-600 font-bold mt-2">
                    YOU LOSE: {formatCurrency(calculations.costOfWaiting)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 text-center mb-10">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
              <p className="text-amber-900 font-semibold">
                Every month you delay = <span className="text-[#E85D3F]">{formatCurrency(calculations.monthlyGap)}</span> in value you'll never recapture.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="outline"
                className="border-[#E85D3F] text-[#E85D3F] hover:bg-[#E85D3F]/5 px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-save-analysis"
              >
                <Download className="w-4 h-4 mr-2" />
                Save This Analysis
              </Button>
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-10 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-lets-talk"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Let's Talk
              </Button>
            </div>
            
            <p className="text-center text-xs text-neutral-400 mt-6">
              All assumptions and methodology can be adjusted in conversation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
