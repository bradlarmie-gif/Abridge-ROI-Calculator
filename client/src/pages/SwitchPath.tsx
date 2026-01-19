import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Mic, User, Keyboard, Sparkles, Clock, DollarSign, ChevronDown, ChevronUp, Download, MessageSquare, Frown, Meh, Smile, PartyPopper, Users, Calendar, BadgeDollarSign, Heart, FileCheck, ShieldCheck, Lightbulb, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface SwitchPathProps {
  onBack: () => void;
}

type SolutionType = "ambient" | "scribes" | "manual";
type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type DriverId = "patient_access" | "overtime" | "retention" | "level_of_service" | "denials" | "hcc";

const SOLUTION_DATA: Record<SolutionType, {
  name: string;
  subtitle: string;
  description: string;
  typicalUtilization: number;
  typicalTimeSavings: number;
}> = {
  ambient: {
    name: "Ambient AI",
    subtitle: "(DAX, Suki, Nabla, others)",
    description: "AI-powered ambient documentation",
    typicalUtilization: 50,
    typicalTimeSavings: 1.5,
  },
  scribes: {
    name: "Human Scribes",
    subtitle: "(In-person or virtual)",
    description: "Medical scribe services",
    typicalUtilization: 90,
    typicalTimeSavings: 3.5,
  },
  manual: {
    name: "Manual Documentation",
    subtitle: "(No scribes or AI)",
    description: "Provider types everything",
    typicalUtilization: 0,
    typicalTimeSavings: 0,
  },
};

const ABRIDGE_BENCHMARKS = {
  utilization: 65,
  timeSavings: 2.5,
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
  subtitle: string;
  context: string;
  icon: typeof Users;
  category: "time" | "quality";
}[] = [
  {
    id: "patient_access",
    name: "Patient Access",
    subtitle: "Convert time into seeing more patients",
    context: "Requires: Patient demand + scheduling capacity",
    icon: Users,
    category: "time",
  },
  {
    id: "overtime",
    name: "Overtime & Locum Savings",
    subtitle: "Reduce premium labor costs",
    context: "Easiest to measure - shows up in payroll",
    icon: Clock,
    category: "time",
  },
  {
    id: "retention",
    name: "Clinician Retention",
    subtitle: "Better work-life balance = less turnover",
    context: "Long-term impact (12+ months)",
    icon: Heart,
    category: "time",
  },
  {
    id: "level_of_service",
    name: "Level of Service Accuracy",
    subtitle: "More complete documentation = proper E/M coding",
    context: "Universal - applies to everyone",
    icon: FileCheck,
    category: "quality",
  },
  {
    id: "denials",
    name: "Documentation-Related Denials",
    subtitle: "Better notes = fewer claim rejections",
    context: "Revenue cycle teams care about this",
    icon: ShieldCheck,
    category: "quality",
  },
  {
    id: "hcc",
    name: "HCC & Chronic Condition Capture",
    subtitle: "Capture conditions discussed = RAF improvement",
    context: "Only relevant if you have MA/risk contracts",
    icon: BadgeDollarSign,
    category: "quality",
  },
];

function formatCurrency(value: number): string {
  return "$" + Math.round(value).toLocaleString();
}

function AnimatedNumber({ value, duration = 2000 }: { value: number; duration?: number }) {
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
  
  const [providers, setProviders] = useState<number>(50);
  const [annualEncounters, setAnnualEncounters] = useState<number>(100000);
  const [utilization, setUtilization] = useState<number>(50);
  const [timeSavings, setTimeSavings] = useState<number>(1.5);
  const [timeSavingsKnown, setTimeSavingsKnown] = useState(true);
  const [selectedDrivers, setSelectedDrivers] = useState<DriverId[]>([]);
  const [expandedDrivers, setExpandedDrivers] = useState<DriverId[]>([]);

  const solutionData = selectedSolution ? SOLUTION_DATA[selectedSolution] : null;

  useEffect(() => {
    if (selectedSolution) {
      setTimeSavings(SOLUTION_DATA[selectedSolution].typicalTimeSavings);
      setUtilization(SOLUTION_DATA[selectedSolution].typicalUtilization);
    }
  }, [selectedSolution]);

  const calculations = useMemo(() => {
    const theirUtil = utilization / 100;
    const abridgeUtil = ABRIDGE_BENCHMARKS.utilization / 100;
    
    const theirDocumentedEncounters = Math.round(annualEncounters * theirUtil);
    const abridgeDocumentedEncounters = Math.round(annualEncounters * abridgeUtil);
    const utilizationGapEncounters = abridgeDocumentedEncounters - theirDocumentedEncounters;
    const utilizationGapPercent = Math.round((utilizationGapEncounters / theirDocumentedEncounters) * 100);
    
    const theirTimeSaved = theirDocumentedEncounters * timeSavings;
    const abridgeTimeSaved = abridgeDocumentedEncounters * ABRIDGE_BENCHMARKS.timeSavings;
    const efficiencyGapMinutes = abridgeTimeSaved - theirTimeSaved;
    const efficiencyGapHours = Math.round(efficiencyGapMinutes / 60);
    const efficiencyGapPercent = Math.round((efficiencyGapMinutes / theirTimeSaved) * 100);
    
    const driverValues: Record<DriverId, { their: number; abridge: number; gap: number }> = {
      patient_access: { their: 0, abridge: 0, gap: 0 },
      overtime: { their: 0, abridge: 0, gap: 0 },
      retention: { their: 0, abridge: 0, gap: 0 },
      level_of_service: { their: 0, abridge: 0, gap: 0 },
      denials: { their: 0, abridge: 0, gap: 0 },
      hcc: { their: 0, abridge: 0, gap: 0 },
    };
    
    const additionalHoursFromAbridge = efficiencyGapHours;
    const additionalEncountersFromAbridge = utilizationGapEncounters;
    
    const revenuePerVisit = 180;
    const overtimeRate = 100;
    const providerCost = 350000;
    const turnoverRate = 0.08;
    const burnoutReduction = 0.25;
    const avgLevelOfServiceLift = 0.03;
    const denialRate = 0.04;
    const denialReductionRate = 0.30;
    const avgClaimValue = 200;
    const hccLiftPercent = 0.02;
    const maPopulation = 0.30;
    const avgRafValue = 1200;
    
    const patientAccessGain = Math.round(additionalEncountersFromAbridge * 0.25 * revenuePerVisit);
    driverValues.patient_access = {
      their: 0,
      abridge: patientAccessGain,
      gap: patientAccessGain,
    };
    
    const overtimeReduction = Math.round(additionalHoursFromAbridge * 0.40 * overtimeRate);
    driverValues.overtime = {
      their: 0,
      abridge: overtimeReduction,
      gap: overtimeReduction,
    };
    
    const retentionValue = Math.round(providers * turnoverRate * burnoutReduction * providerCost * 0.20);
    driverValues.retention = {
      their: 0,
      abridge: retentionValue,
      gap: retentionValue,
    };
    
    const losValue = Math.round(abridgeDocumentedEncounters * avgLevelOfServiceLift * revenuePerVisit);
    driverValues.level_of_service = {
      their: 0,
      abridge: losValue,
      gap: losValue,
    };
    
    const currentDenials = theirDocumentedEncounters * denialRate * avgClaimValue;
    const denialReduction = Math.round(currentDenials * denialReductionRate);
    driverValues.denials = {
      their: 0,
      abridge: denialReduction,
      gap: denialReduction,
    };
    
    const hccValue = Math.round(abridgeDocumentedEncounters * maPopulation * hccLiftPercent * avgRafValue);
    driverValues.hcc = {
      their: 0,
      abridge: hccValue,
      gap: hccValue,
    };
    
    let totalGap = 0;
    selectedDrivers.forEach((driverId: DriverId) => {
      totalGap += driverValues[driverId].gap;
    });
    
    const year1Value = Math.round(totalGap * 0.75);
    const year2Value = totalGap;
    const year3Value = totalGap;
    const threeYearTotal = year1Value + year2Value + year3Value;
    
    const waitYear1Value = Math.round(totalGap * 0.50);
    const waitYear2Value = totalGap;
    const waitYear3Value = totalGap;
    const waitThreeYearTotal = waitYear1Value + waitYear2Value + waitYear3Value;
    const costOfWaiting = threeYearTotal - waitThreeYearTotal;
    
    return {
      theirDocumentedEncounters,
      abridgeDocumentedEncounters,
      utilizationGapEncounters,
      utilizationGapPercent,
      theirTimeSaved,
      abridgeTimeSaved,
      efficiencyGapMinutes,
      efficiencyGapHours,
      efficiencyGapPercent,
      driverValues,
      totalGap,
      monthlyGap: Math.round(totalGap / 12),
      year1Value,
      year2Value,
      year3Value,
      threeYearTotal,
      waitYear1Value,
      waitYear2Value,
      waitYear3Value,
      waitThreeYearTotal,
      costOfWaiting,
    };
  }, [providers, annualEncounters, utilization, timeSavings, selectedDrivers]);

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return selectedSolution !== null;
      case 2:
        return providers > 0 && annualEncounters > 0;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return selectedDrivers.length >= 2;
      case 6:
        return true;
      case 7:
        return true;
      default:
        return false;
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
    { period: "Today", current: 0, abridge: 0 },
    { period: "6 mo", current: 0, abridge: Math.round(calculations.totalGap * 0.5) },
    { period: "Year 1", current: 0, abridge: calculations.year1Value },
    { period: "Year 2", current: 0, abridge: calculations.year1Value + calculations.year2Value },
    { period: "Year 3", current: 0, abridge: calculations.threeYearTotal },
  ];

  const getUtilizationStatus = (util: number) => {
    if (util < 40) return { label: "Low", icon: Frown, color: "text-red-500" };
    if (util < 55) return { label: "Average", icon: Meh, color: "text-amber-500" };
    if (util < 65) return { label: "Good", icon: Smile, color: "text-emerald-500" };
    return { label: "Great", icon: PartyPopper, color: "text-emerald-600" };
  };

  const status = getUtilizationStatus(utilization);
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-100 bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={abridgeLogo} alt="Abridge" className="h-6" />
            <span className="text-sm font-medium text-neutral-400">SWITCH</span>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back{step === 1 ? " to Home" : ""}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 text-center" data-testid="text-step1-title">
              What solution are you using today?
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
              {(["ambient", "scribes", "manual"] as SolutionType[]).map((solution) => {
                const data = SOLUTION_DATA[solution];
                const isSelected = selectedSolution === solution;
                
                return (
                  <button
                    key={solution}
                    onClick={() => setSelectedSolution(solution)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#E85D3F] bg-red-50/30"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                    data-testid={`card-solution-${solution}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
                      {solution === "ambient" && <Mic className="w-6 h-6 text-neutral-600" />}
                      {solution === "scribes" && <User className="w-6 h-6 text-neutral-600" />}
                      {solution === "manual" && <Keyboard className="w-6 h-6 text-neutral-600" />}
                    </div>
                    <h3 className="font-semibold text-neutral-900">{data.name}</h3>
                    <p className="text-sm text-neutral-500">{data.subtitle}</p>
                    <p className="text-sm text-neutral-400 mt-2">{data.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-10">
              <p className="text-sm font-medium text-neutral-600 mb-3">Select a care setting:</p>
              <div className="flex flex-wrap gap-2">
                {CARE_SETTINGS.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => setting.available && setSelectedSetting(setting.id)}
                    disabled={!setting.available}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedSetting === setting.id
                        ? "bg-neutral-900 text-white"
                        : setting.available
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        : "bg-neutral-50 text-neutral-400 cursor-not-allowed"
                    }`}
                    title={!setting.available ? "Coming soon" : undefined}
                    data-testid={`button-setting-${setting.id}`}
                  >
                    {setting.label}
                    {!setting.available && <span className="ml-1 text-xs">*</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2">* Coming soon</p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step1"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step2-title">
              Tell us about your current situation
            </h1>
            <p className="text-lg text-neutral-500 mb-10">We'll help you understand where you stand.</p>

            <div className="space-y-8">
              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-4">
                  How many providers?
                </label>
                <input
                  type="number"
                  value={providers}
                  onChange={(e) => setProviders(Math.max(1, parseInt(e.target.value) || 0))}
                  placeholder="50"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                  data-testid="input-providers"
                />
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  Annual outpatient encounters (total)?
                </label>
                <p className="text-sm text-neutral-500 mb-4">
                  <Lightbulb className="w-4 h-4 inline mr-1 text-amber-500" />
                  ~2,000 per provider is typical
                </p>
                <input
                  type="number"
                  value={annualEncounters}
                  onChange={(e) => setAnnualEncounters(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="100,000"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                  data-testid="input-encounters"
                />
                <button
                  onClick={() => setAnnualEncounters(providers * 2000)}
                  className="mt-2 text-sm text-[#E85D3F] hover:underline"
                  data-testid="button-auto-calculate"
                >
                  Auto-calculate: {providers} providers x 2,000 = {(providers * 2000).toLocaleString()}
                </button>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  What's your current utilization?
                </label>
                <p className="text-sm text-neutral-500 mb-4">
                  How often do providers actually use your {selectedSolution === "manual" ? "documentation process" : "ambient solution"}?
                </p>
                
                <Slider
                  value={[utilization]}
                  onValueChange={(v) => setUtilization(v[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="slider-utilization"
                />
                <div className="flex justify-between mt-2 text-xs text-neutral-500">
                  <span>0%</span>
                  <span className="font-semibold text-neutral-900 text-lg">{utilization}%</span>
                  <span>100%</span>
                </div>
                
                <div className="mt-4">
                  <span className={`flex items-center gap-1.5 font-medium ${status.color}`}>
                    <StatusIcon className="w-4 h-4" /> {status.label}
                  </span>
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-[#E85D3F] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Abridge average: {ABRIDGE_BENCHMARKS.utilization}% (Great)
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50">
                <p className="text-sm text-amber-900">
                  At these numbers, you're documenting ~<strong>{calculations.theirDocumentedEncounters.toLocaleString()}</strong> encounters/year
                </p>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step2"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step3-title">
              What does "Great" utilization mean?
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Let's compare where you are to where top performers are.</p>

            <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
              <div className="relative h-16 mb-8">
                <div className="absolute inset-x-0 top-1/2 h-2 bg-gradient-to-r from-red-200 via-amber-200 via-emerald-200 to-emerald-300 rounded-full" />
                
                <div className="absolute flex flex-col items-center" style={{ left: `${Math.min(Math.max(utilization, 5), 95)}%`, top: "0", transform: "translateX(-50%)" }}>
                  <span className="text-xs font-bold text-neutral-600 bg-white px-2 py-1 rounded border border-neutral-200 shadow-sm">YOU</span>
                  <div className="w-0.5 h-4 bg-neutral-400" />
                  <div className="w-3 h-3 rounded-full bg-neutral-700 border-2 border-white shadow" />
                </div>
                
                <div className="absolute flex flex-col items-center" style={{ left: "65%", top: "0", transform: "translateX(-50%)" }}>
                  <span className="text-xs font-bold text-[#E85D3F] bg-red-50 px-2 py-1 rounded border border-[#E85D3F]/30 shadow-sm">ABRIDGE</span>
                  <div className="w-0.5 h-4 bg-[#E85D3F]" />
                  <div className="w-3 h-3 rounded-full bg-[#E85D3F] border-2 border-white shadow" />
                </div>
              </div>

              <div className="flex justify-between text-xs text-neutral-500 mt-4">
                <span className="flex items-center gap-1"><Frown className="w-3 h-3" /> Low (&lt;40%)</span>
                <span className="flex items-center gap-1"><Meh className="w-3 h-3" /> Average (40-55%)</span>
                <span className="flex items-center gap-1"><Smile className="w-3 h-3" /> Good (55-65%)</span>
                <span className="flex items-center gap-1"><PartyPopper className="w-3 h-3" /> Great (65%+)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-100 rounded-2xl p-6">
                <p className="text-sm text-neutral-500 mb-2">At your {utilization}% utilization</p>
                <p className="text-3xl font-bold text-neutral-900">{calculations.theirDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-neutral-500 mt-1">encounters documented/year</p>
                <p className="text-xs text-neutral-400 mt-3">That's your current reach</p>
              </div>
              
              <div className="bg-[#E85D3F]/5 rounded-2xl p-6 border border-[#E85D3F]/20">
                <p className="text-sm text-[#E85D3F] mb-2">At Abridge {ABRIDGE_BENCHMARKS.utilization}%</p>
                <p className="text-3xl font-bold text-[#E85D3F]">{calculations.abridgeDocumentedEncounters.toLocaleString()}</p>
                <p className="text-sm text-neutral-500 mt-1">encounters documented/year</p>
                <p className="text-xs text-[#E85D3F] mt-3 font-medium">
                  That's {calculations.utilizationGapEncounters.toLocaleString()} MORE encounters
                </p>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                That <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> utilization gap = <strong>{calculations.utilizationGapPercent}%</strong> more encounters being documented.
                <br />
                <span className="text-amber-700">This is where value leaks.</span>
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step3"
              >
                Next: See the other gap
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step4-title">
              The second gap: Time efficiency
            </h1>
            <p className="text-lg text-neutral-500 mb-10">It's not just how often it's used - it's how much time it saves.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 mb-8">
              <label className="block text-sm font-semibold text-neutral-900 mb-4">
                How much time does your solution save per encounter?
              </label>
              
              {timeSavingsKnown ? (
                <>
                  <Slider
                    value={[timeSavings]}
                    onValueChange={(v) => setTimeSavings(v[0])}
                    min={0.5}
                    max={5}
                    step={0.25}
                    className="w-full"
                    data-testid="slider-time-savings"
                  />
                  <div className="flex justify-between mt-2 text-xs text-neutral-500">
                    <span>0.5 min</span>
                    <span className="font-semibold text-neutral-900 text-lg">{timeSavings} min</span>
                    <span>5 min</span>
                  </div>
                </>
              ) : (
                <p className="text-neutral-400 italic">Using benchmark: {solutionData?.typicalTimeSavings || 1.5} min</p>
              )}

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
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

              <div className="mt-4 space-y-1 text-sm">
                <p className="text-neutral-500">You're getting: <strong>{timeSavings} min/encounter</strong></p>
                <p className="text-[#E85D3F] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Abridge average: {ABRIDGE_BENCHMARKS.timeSavings} min/encounter
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-100 rounded-2xl p-6">
                <p className="text-sm text-neutral-500 mb-2">At your {timeSavings} min savings</p>
                <p className="text-3xl font-bold text-neutral-900">{Math.round(calculations.theirTimeSaved / 60).toLocaleString()}</p>
                <p className="text-sm text-neutral-500 mt-1">hours returned/year</p>
                <p className="text-xs text-neutral-400 mt-3">That's your current impact</p>
              </div>
              
              <div className="bg-[#E85D3F]/5 rounded-2xl p-6 border border-[#E85D3F]/20">
                <p className="text-sm text-[#E85D3F] mb-2">At Abridge {ABRIDGE_BENCHMARKS.timeSavings} min</p>
                <p className="text-3xl font-bold text-[#E85D3F]">{Math.round(calculations.abridgeTimeSaved / 60).toLocaleString()}</p>
                <p className="text-sm text-neutral-500 mt-1">hours returned/year</p>
                <p className="text-xs text-[#E85D3F] mt-3 font-medium">
                  That's {calculations.efficiencyGapHours.toLocaleString()} MORE hours returned
                </p>
              </div>
            </div>

            <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50 text-center">
              <p className="text-amber-900">
                The efficiency gap = <strong>{calculations.efficiencyGapPercent}%</strong> more time returned per encounter.
                <br />
                <span className="text-amber-700">Between the two gaps, you're leaving significant value on the table.</span>
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step4"
              >
                Show me the impact
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step5-title">
              Where would this extra capacity create value for you?
            </h1>
            <p className="text-lg text-neutral-500 mb-6">Select the outcomes that matter most to your organization.</p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-8">
              <p className="text-sm text-neutral-700">
                <strong>We've established:</strong>
              </p>
              <ul className="text-sm text-neutral-600 mt-2 space-y-1">
                <li>• <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> utilization gap = <strong>{calculations.utilizationGapEncounters.toLocaleString()}</strong> more encounters documented</li>
                <li>• <strong>{calculations.efficiencyGapPercent}%</strong> efficiency gap = <strong>{calculations.efficiencyGapHours.toLocaleString()}</strong> more hours returned</li>
              </ul>
              <p className="text-sm text-neutral-500 mt-3 italic">Now let's focus on what this means for YOU.</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-3">
                  <Clock className="w-4 h-4" /> TIME SAVED BENEFITS
                </h3>
                <p className="text-xs text-neutral-500 mb-4">(From those {calculations.efficiencyGapHours.toLocaleString()} extra hours returned)</p>
                
                <div className="space-y-3">
                  {DRIVERS.filter(d => d.category === "time").map((driver) => {
                    const Icon = driver.icon;
                    const isSelected = selectedDrivers.includes(driver.id);
                    
                    return (
                      <button
                        key={driver.id}
                        onClick={() => toggleDriver(driver.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-[#E85D3F] bg-red-50/30"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                        data-testid={`driver-${driver.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-neutral-500" />
                              <span className="font-semibold text-neutral-900">{driver.name}</span>
                            </div>
                            <p className="text-sm text-neutral-600 mt-1">{driver.subtitle}</p>
                            <p className="text-xs text-neutral-400 mt-1">{driver.context}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-700 mb-3">
                  <FileCheck className="w-4 h-4" /> DOCUMENTATION QUALITY BENEFITS
                </h3>
                <p className="text-xs text-neutral-500 mb-4">(From those {calculations.utilizationGapEncounters.toLocaleString()} more complete encounters)</p>
                
                <div className="space-y-3">
                  {DRIVERS.filter(d => d.category === "quality").map((driver) => {
                    const Icon = driver.icon;
                    const isSelected = selectedDrivers.includes(driver.id);
                    
                    return (
                      <button
                        key={driver.id}
                        onClick={() => toggleDriver(driver.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-[#E85D3F] bg-red-50/30"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                        data-testid={`driver-${driver.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? "border-[#E85D3F] bg-[#E85D3F]" : "border-neutral-300"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-neutral-500" />
                              <span className="font-semibold text-neutral-900">{driver.name}</span>
                            </div>
                            <p className="text-sm text-neutral-600 mt-1">{driver.subtitle}</p>
                            <p className="text-xs text-neutral-400 mt-1">{driver.context}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-sm text-neutral-500 mt-6 text-center">
              Select 2-6 drivers that align with your current priorities.
            </p>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step5"
              >
                Calculate the gap
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step6-title">
              Your value gap
            </h1>
            <p className="text-lg text-neutral-500 mb-6">Based on what you selected, here's what you're leaving on the table.</p>

            <div className="bg-neutral-50 rounded-xl p-4 mb-8">
              <p className="text-sm text-neutral-700">
                <strong>You selected:</strong>{" "}
                {selectedDrivers.map((id, i) => (
                  <span key={id}>
                    {i > 0 && " • "}
                    <span className="text-[#E85D3F]">{DRIVERS.find(d => d.id === id)?.name}</span>
                  </span>
                ))}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {selectedDrivers.map((driverId) => {
                const driver = DRIVERS.find(d => d.id === driverId);
                const values = calculations.driverValues[driverId];
                const isExpanded = expandedDrivers.includes(driverId);
                const Icon = driver?.icon || Users;
                
                if (!driver || !values) return null;
                
                return (
                  <div key={driverId} className="border border-neutral-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleDriverExpanded(driverId)}
                      className="w-full p-4 flex items-center justify-between bg-white hover:bg-neutral-50"
                      data-testid={`expand-driver-${driverId}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-neutral-500" />
                        <span className="font-semibold text-neutral-900">{driver.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#E85D3F]">+{formatCurrency(values.gap)}/year</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 border-t border-neutral-100 bg-neutral-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-neutral-100 rounded-xl">
                            <p className="text-xs text-neutral-500 mb-1">YOUR CURRENT {driver.name.toUpperCase()}</p>
                            <p className="text-2xl font-bold text-neutral-900">{formatCurrency(values.their)}</p>
                            <div className="mt-2 h-2 bg-neutral-300 rounded-full" />
                          </div>
                          <div className="p-4 bg-[#E85D3F]/5 rounded-xl border border-[#E85D3F]/20">
                            <p className="text-xs text-[#E85D3F] mb-1">WITH ABRIDGE</p>
                            <p className="text-2xl font-bold text-[#E85D3F]">{formatCurrency(values.abridge)}</p>
                            <div className="mt-2 h-2 bg-[#E85D3F] rounded-full" />
                          </div>
                        </div>
                        <p className="text-center mt-4 font-medium text-neutral-700">
                          Gap: <span className="text-[#E85D3F]">+{formatCurrency(values.gap)}/year</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <div className="space-y-2 text-sm mb-4">
                {selectedDrivers.map((driverId) => {
                  const driver = DRIVERS.find(d => d.id === driverId);
                  const values = calculations.driverValues[driverId];
                  if (!driver || !values) return null;
                  return (
                    <div key={driverId} className="flex justify-between text-neutral-600">
                      <span>{driver.name}</span>
                      <span>+{formatCurrency(values.gap)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
                <span className="text-lg font-bold text-neutral-900">TOTAL ANNUAL GAP</span>
                <span className="text-2xl font-bold text-[#E85D3F]">{formatCurrency(calculations.totalGap)}</span>
              </div>
              <p className="text-center mt-4 text-neutral-600">
                That's <strong>{formatCurrency(calculations.monthlyGap)}</strong> every month you're not capturing.
              </p>
            </div>

            <div className="mt-10 flex justify-end">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step6"
              >
                What does waiting cost?
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step7-title">
              The cost of waiting
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Every month you delay is value you'll never recapture.</p>

            <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-8">
              <h3 className="text-sm font-semibold text-neutral-700 mb-4">3-Year Cumulative Value</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="current" 
                      name={`Stay with ${solutionData?.name || "Current"}`}
                      stroke="#9ca3af" 
                      strokeWidth={2}
                      dot={{ fill: "#9ca3af" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="abridge" 
                      name="Switch to Abridge"
                      stroke="#E85D3F" 
                      strokeWidth={3}
                      dot={{ fill: "#E85D3F" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-neutral-500 mt-4 text-center italic">
                Year 1 includes 6-month ramp to full adoption
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                <h4 className="font-semibold text-emerald-900 mb-4">IF YOU SWITCH TODAY</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">6 months</span>
                    <span className="font-medium text-emerald-700">+{formatCurrency(Math.round(calculations.totalGap * 0.5))}</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-4">50% of annual during ramp</p>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 1</span>
                    <span className="font-medium text-emerald-700">+{formatCurrency(calculations.year1Value)}</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-4">includes 6mo ramp</p>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 2</span>
                    <span className="font-medium text-emerald-700">+{formatCurrency(calculations.year2Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 3</span>
                    <span className="font-medium text-emerald-700">+{formatCurrency(calculations.year3Value)}</span>
                  </div>
                </div>
                <div className="border-t border-emerald-300 mt-4 pt-4">
                  <div className="flex justify-between font-bold">
                    <span className="text-emerald-900">3-year total</span>
                    <span className="text-emerald-700">{formatCurrency(calculations.threeYearTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-100 rounded-2xl p-6">
                <h4 className="font-semibold text-neutral-700 mb-4">IF YOU WAIT 6 MONTHS</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">6 months</span>
                    <span className="font-medium text-neutral-500">$0</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-4">still on current solution</p>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 1</span>
                    <span className="font-medium text-neutral-700">+{formatCurrency(calculations.waitYear1Value)}</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-4">only 6mo at full value</p>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 2</span>
                    <span className="font-medium text-neutral-700">+{formatCurrency(calculations.waitYear2Value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Year 3</span>
                    <span className="font-medium text-neutral-700">+{formatCurrency(calculations.waitYear3Value)}</span>
                  </div>
                </div>
                <div className="border-t border-neutral-300 mt-4 pt-4">
                  <div className="flex justify-between font-bold">
                    <span className="text-neutral-700">3-year total</span>
                    <span className="text-neutral-700">{formatCurrency(calculations.waitThreeYearTotal)}</span>
                  </div>
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    You lose: {formatCurrency(calculations.costOfWaiting)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center mb-8">
              <p className="text-amber-900 font-medium">
                Every month you delay = <strong>{formatCurrency(calculations.monthlyGap)}</strong> in value you'll never recapture.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="px-6 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-save-analysis"
              >
                <Download className="w-4 h-4 mr-2" />
                Save This Analysis
              </Button>
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-lets-talk"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Let's Talk
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
