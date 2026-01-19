import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Mic, User, Sparkles, TrendingUp, Clock, DollarSign, AlertTriangle, Check, ChevronDown, ChevronUp, Download, MessageSquare, Frown, Meh, Smile, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface SwitchPathProps {
  onBack: () => void;
}

type Competitor = "dax" | "suki" | "ambience" | "nabla" | "scribes" | "other";
type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
type Step = 1 | 2 | 3 | 4 | 5;

const COMPETITOR_DATA: Record<Competitor, {
  name: string;
  icon: "mic" | "user";
  subtitle: string;
  typicalUtilization: [number, number];
  typicalTimeSavings: [number, number];
  typicalCost: [number, number];
}> = {
  dax: {
    name: "DAX (Nuance)",
    icon: "mic",
    subtitle: "Ambient AI",
    typicalUtilization: [45, 55],
    typicalTimeSavings: [1, 2],
    typicalCost: [150, 200],
  },
  suki: {
    name: "Suki",
    icon: "mic",
    subtitle: "Ambient AI",
    typicalUtilization: [40, 50],
    typicalTimeSavings: [1, 1.5],
    typicalCost: [100, 150],
  },
  ambience: {
    name: "Ambience Healthcare",
    icon: "mic",
    subtitle: "Ambient AI",
    typicalUtilization: [50, 60],
    typicalTimeSavings: [1.5, 2],
    typicalCost: [125, 175],
  },
  nabla: {
    name: "Nabla",
    icon: "mic",
    subtitle: "Ambient AI",
    typicalUtilization: [45, 55],
    typicalTimeSavings: [1, 2],
    typicalCost: [100, 150],
  },
  scribes: {
    name: "Human Scribes",
    icon: "user",
    subtitle: "In-person documentation",
    typicalUtilization: [90, 95],
    typicalTimeSavings: [3, 4],
    typicalCost: [3333, 5000],
  },
  other: {
    name: "Other AI Solution",
    icon: "mic",
    subtitle: "Ambient AI",
    typicalUtilization: [45, 55],
    typicalTimeSavings: [1, 2],
    typicalCost: [150, 200],
  },
};

const ABRIDGE_BENCHMARKS = {
  utilization: 65,
  timeSavings: 2.5,
  cost: 160,
};

const CARE_SETTINGS: { id: CareSetting; label: string; available: boolean }[] = [
  { id: "outpatient", label: "Outpatient", available: true },
  { id: "ed", label: "ED", available: true },
  { id: "inpatient", label: "Inpatient", available: false },
  { id: "nursing", label: "Nursing", available: false },
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
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<CareSetting>("outpatient");
  
  const [providers, setProviders] = useState<number>(50);
  const [utilization, setUtilization] = useState<number>(45);
  const [timeSavings, setTimeSavings] = useState<number>(1.5);
  const [timeSavingsKnown, setTimeSavingsKnown] = useState(true);
  const [monthlyCost, setMonthlyCost] = useState<number | null>(null);
  
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set(["patientAccess"]));

  const competitorData = selectedCompetitor ? COMPETITOR_DATA[selectedCompetitor] : null;

  useEffect(() => {
    if (selectedCompetitor && COMPETITOR_DATA[selectedCompetitor]) {
      const data = COMPETITOR_DATA[selectedCompetitor];
      setUtilization(data.typicalUtilization[0]);
      setTimeSavings(data.typicalTimeSavings[0]);
    }
  }, [selectedCompetitor]);

  const calculations = useMemo(() => {
    const encountersPerProvider = 2000;
    
    const theirDocumentedEncounters = Math.round(providers * encountersPerProvider * (utilization / 100));
    const abridgeDocumentedEncounters = Math.round(providers * encountersPerProvider * (ABRIDGE_BENCHMARKS.utilization / 100));
    
    const theirTimeReturned = theirDocumentedEncounters * timeSavings / 60;
    const abridgeTimeReturned = abridgeDocumentedEncounters * ABRIDGE_BENCHMARKS.timeSavings / 60;
    
    const revenuePerVisit = 200;
    const visitDuration = 30;
    const wrvuBaseline = 1.2;
    const wrvuLift = 0.03;
    const wrvuRate = 40;
    const overtimePremium = 75;
    const denialRate = 0.05;
    const docRelatedDenials = 0.30;
    const denialPreventionRate = 0.35;
    
    const calcPatientAccess = (encounters: number, hours: number) => {
      const realizedHours = hours * 0.40;
      const newVisits = (realizedHours * 60) / visitDuration;
      return Math.round(newVisits * revenuePerVisit);
    };
    
    const calcLevelOfService = (encounters: number) => {
      const currentWrvus = encounters * wrvuBaseline;
      const additionalWrvus = currentWrvus * wrvuLift;
      return Math.round(additionalWrvus * wrvuRate);
    };
    
    const calcOvertime = (hours: number) => {
      const afterHoursHours = hours * 0.25;
      const overtimeAvoided = afterHoursHours * 0.50;
      return Math.round(overtimeAvoided * overtimePremium);
    };
    
    const calcDenials = (encounters: number) => {
      const totalRevenue = encounters * revenuePerVisit;
      const deniedRevenue = totalRevenue * denialRate;
      const docDenials = deniedRevenue * docRelatedDenials;
      return Math.round(docDenials * denialPreventionRate);
    };
    
    const theirPatientAccess = calcPatientAccess(theirDocumentedEncounters, theirTimeReturned);
    const abridgePatientAccess = calcPatientAccess(abridgeDocumentedEncounters, abridgeTimeReturned);
    
    const theirLevelOfService = calcLevelOfService(theirDocumentedEncounters);
    const abridgeLevelOfService = calcLevelOfService(abridgeDocumentedEncounters);
    
    const theirOvertime = calcOvertime(theirTimeReturned);
    const abridgeOvertime = calcOvertime(abridgeTimeReturned);
    
    const theirDenials = calcDenials(theirDocumentedEncounters);
    const abridgeDenials = calcDenials(abridgeDocumentedEncounters);
    
    const theirTotal = theirPatientAccess + theirLevelOfService + theirOvertime + theirDenials;
    const abridgeTotal = abridgePatientAccess + abridgeLevelOfService + abridgeOvertime + abridgeDenials;
    const gap = abridgeTotal - theirTotal;
    
    const adoptionGapEncounters = abridgeDocumentedEncounters - theirDocumentedEncounters;
    const efficiencyGapTime = abridgeTimeReturned - theirTimeReturned;
    
    const theirValueSameTime = calcPatientAccess(abridgeDocumentedEncounters, abridgeDocumentedEncounters * timeSavings / 60) +
      calcLevelOfService(abridgeDocumentedEncounters) +
      calcOvertime(abridgeDocumentedEncounters * timeSavings / 60) +
      calcDenials(abridgeDocumentedEncounters);
    const adoptionGapValue = Math.round(theirValueSameTime - theirTotal);
    const efficiencyGapValue = Math.round(gap - adoptionGapValue);
    
    return {
      theirDocumentedEncounters,
      abridgeDocumentedEncounters,
      theirTimeReturned,
      abridgeTimeReturned,
      theirPatientAccess,
      abridgePatientAccess,
      theirLevelOfService,
      abridgeLevelOfService,
      theirOvertime,
      abridgeOvertime,
      theirDenials,
      abridgeDenials,
      theirTotal,
      abridgeTotal,
      gap,
      adoptionGapEncounters,
      efficiencyGapTime,
      adoptionGapValue,
      efficiencyGapValue,
      monthlyGap: gap / 12,
      dailyGap: gap / 365,
      hourlyGap: gap / (365 * 8),
    };
  }, [providers, utilization, timeSavings]);

  const chartData = useMemo(() => {
    const monthlyGap = calculations.gap / 12;
    return [
      { name: "Today", competitor: 0, abridge: 0 },
      { name: "Year 1", competitor: calculations.theirTotal, abridge: calculations.abridgeTotal },
      { name: "Year 2", competitor: calculations.theirTotal * 2, abridge: calculations.abridgeTotal * 2 },
      { name: "Year 3", competitor: calculations.theirTotal * 3, abridge: calculations.abridgeTotal * 3 },
    ];
  }, [calculations]);

  const toggleDriver = (driverId: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  const canContinue = () => {
    if (step === 1) return selectedCompetitor !== null;
    if (step === 2) return providers > 0;
    return true;
  };

  const handleContinue = () => {
    if (step < 5) setStep((step + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
    else onBack();
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={abridgeLogo} alt="Abridge" className="h-6" data-testid="img-logo" />
              <span className="text-sm text-neutral-400 font-medium">SWITCH</span>
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 text-sm font-medium transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? "Back to Home" : "Back"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {step === 1 && (
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4" data-testid="text-step1-title">
              What solution are you using today?
            </h1>
            <p className="text-lg text-neutral-500 mb-12">
              We'll show you what you might be missing.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
              {(Object.entries(COMPETITOR_DATA) as [Competitor, typeof COMPETITOR_DATA[Competitor]][]).map(([id, data]) => (
                <button
                  key={id}
                  onClick={() => setSelectedCompetitor(id)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left hover-elevate ${
                    selectedCompetitor === id
                      ? "border-[#E85D3F] bg-[#FEF2F0]"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                  data-testid={`card-competitor-${id}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    selectedCompetitor === id ? "bg-[#E85D3F]" : "bg-neutral-100"
                  }`}>
                    {data.icon === "mic" ? (
                      <Mic className={`w-5 h-5 ${selectedCompetitor === id ? "text-white" : "text-neutral-600"}`} />
                    ) : (
                      <User className={`w-5 h-5 ${selectedCompetitor === id ? "text-white" : "text-neutral-600"}`} />
                    )}
                  </div>
                  <div className="font-semibold text-neutral-900">{data.name}</div>
                  <div className="text-sm text-neutral-500">{data.subtitle}</div>
                </button>
              ))}
            </div>

            <div className="mb-10">
              <p className="text-sm text-neutral-500 mb-3">Select a care setting:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {CARE_SETTINGS.map((setting) => (
                  <button
                    key={setting.id}
                    onClick={() => setting.available && setSelectedSetting(setting.id)}
                    disabled={!setting.available}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedSetting === setting.id
                        ? "bg-[#E85D3F] text-white"
                        : setting.available
                        ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        : "bg-neutral-50 text-neutral-400 cursor-not-allowed"
                    }`}
                    data-testid={`button-setting-${setting.id}`}
                  >
                    {setting.label}
                    {!setting.available && <span className="ml-1 text-xs">(Soon)</span>}
                  </button>
                ))}
              </div>
            </div>

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
        )}

        {step === 2 && competitorData && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step2-title">
              Tell us about your {competitorData.name} deployment
            </h1>
            <p className="text-lg text-neutral-500 mb-10">
              We'll show you what you might be missing.
            </p>

            <div className="space-y-8">
              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  How many providers are on {competitorData.name}?
                </label>
                <input
                  type="number"
                  value={providers}
                  onChange={(e) => setProviders(parseInt(e.target.value) || 0)}
                  placeholder="e.g., 50"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                  data-testid="input-providers"
                />
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  What's your current utilization?
                </label>
                <p className="text-sm text-neutral-500 mb-4">How often do providers actually use it?</p>
                
                <div className="mb-4">
                  <Slider
                    value={[utilization]}
                    onValueChange={(v) => setUtilization(v[0])}
                    min={10}
                    max={90}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-neutral-500">
                    <span>10%</span>
                    <span className="font-semibold text-neutral-900 text-base">{utilization}%</span>
                    <span>90%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  {utilization < 30 && (
                    <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                      <Frown className="w-4 h-4" /> Low
                    </span>
                  )}
                  {utilization >= 30 && utilization < 45 && (
                    <span className="flex items-center gap-1.5 text-yellow-600 font-medium">
                      <Meh className="w-4 h-4" /> Average
                    </span>
                  )}
                  {utilization >= 45 && utilization < 55 && (
                    <span className="flex items-center gap-1.5 text-green-600 font-medium">
                      <Smile className="w-4 h-4" /> Good
                    </span>
                  )}
                  {utilization >= 55 && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <PartyPopper className="w-4 h-4" /> Great
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-neutral-500 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {competitorData.name} industry average: {competitorData.typicalUtilization[0]}-{competitorData.typicalUtilization[1]}%
                  </p>
                  <p className="text-[#E85D3F] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Abridge average: {ABRIDGE_BENCHMARKS.utilization}%
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-1">
                  What time savings are you seeing?
                </label>
                <p className="text-sm text-neutral-500 mb-4">Per encounter (if you know it)</p>
                
                {timeSavingsKnown ? (
                  <>
                    <Slider
                      value={[timeSavings]}
                      onValueChange={(v) => setTimeSavings(v[0])}
                      min={0.5}
                      max={4}
                      step={0.25}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 text-xs text-neutral-500">
                      <span>0.5 min</span>
                      <span className="font-semibold text-neutral-900 text-base">{timeSavings} min</span>
                      <span>4 min</span>
                    </div>
                  </>
                ) : (
                  <p className="text-neutral-400 italic">Using industry benchmark</p>
                )}

                <label className="flex items-center gap-2 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!timeSavingsKnown}
                    onChange={(e) => {
                      const notSure = e.target.checked;
                      setTimeSavingsKnown(!notSure);
                      if (notSure && competitorData) {
                        const benchmarkMidpoint = (competitorData.typicalTimeSavings[0] + competitorData.typicalTimeSavings[1]) / 2;
                        setTimeSavings(benchmarkMidpoint);
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                  />
                  <span className="text-sm text-neutral-600">Not sure / Haven't measured</span>
                </label>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="text-neutral-500 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    {competitorData.name} customers typically report {competitorData.typicalTimeSavings[0]}-{competitorData.typicalTimeSavings[1]} min
                  </p>
                  <p className="text-[#E85D3F] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Abridge average: {ABRIDGE_BENCHMARKS.timeSavings} min
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50">
                <p className="text-sm text-amber-900">
                  <strong>At {providers} providers with {utilization}% utilization</strong>, you're documenting ~{calculations.theirDocumentedEncounters.toLocaleString()} encounters/year
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
                Show Me the Gap
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && competitorData && (
          <div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-10 md:p-16 text-center mb-12">
              <p className="text-neutral-400 text-lg mb-4">At your current adoption, you're leaving this on the table:</p>
              <div className="text-6xl md:text-8xl font-bold text-white mb-2" data-testid="text-gap-amount">
                <AnimatedNumber value={calculations.gap} />
              </div>
              <p className="text-2xl text-neutral-300 mb-8">per year</p>
              
              <div className="flex items-center justify-center gap-6 md:gap-10 text-neutral-400">
                <div>
                  <div className="text-xl md:text-2xl font-semibold text-white">{formatCurrency(calculations.monthlyGap)}</div>
                  <div className="text-sm">every month</div>
                </div>
                <div className="w-px h-10 bg-neutral-600" />
                <div>
                  <div className="text-xl md:text-2xl font-semibold text-white">{formatCurrency(calculations.dailyGap)}</div>
                  <div className="text-sm">every day</div>
                </div>
                <div className="w-px h-10 bg-neutral-600" />
                <div>
                  <div className="text-xl md:text-2xl font-semibold text-[#E85D3F]">{formatCurrency(calculations.hourlyGap)}</div>
                  <div className="text-sm">every hour your clinic is open</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-12">
              <div className="bg-neutral-50 rounded-2xl p-8 text-center">
                <p className="text-sm text-neutral-500 mb-2">Your Current State</p>
                <p className="text-lg font-semibold text-neutral-900 mb-4">{competitorData.name} at {utilization}%</p>
                <div className="h-4 bg-neutral-300 rounded-full mb-4" style={{ width: `${(calculations.theirTotal / calculations.abridgeTotal) * 100}%`, margin: "0 auto" }} />
                <p className="text-2xl font-bold text-neutral-700">{formatCurrency(calculations.theirTotal)}/year</p>
              </div>

              <div className="text-center py-4">
                <div className="text-4xl font-bold text-[#E85D3F]">+{formatCurrency(calculations.gap)}</div>
                <p className="text-sm text-neutral-500 mt-1">THE GAP</p>
              </div>

              <div className="bg-[#FEF2F0] rounded-2xl p-8 text-center border-2 border-[#E85D3F]/20">
                <p className="text-sm text-[#E85D3F] mb-2">The Opportunity</p>
                <p className="text-lg font-semibold text-neutral-900 mb-4">Abridge at {ABRIDGE_BENCHMARKS.utilization}%</p>
                <div className="h-4 bg-[#E85D3F] rounded-full mb-4 w-full" />
                <p className="text-2xl font-bold text-[#E85D3F]">{formatCurrency(calculations.abridgeTotal)}/year</p>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step3"
              >
                See Where This Comes From
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && competitorData && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step4-title">
              Where the {formatCurrency(calculations.gap)} gap comes from
            </h1>
            <p className="text-lg text-neutral-500 mb-10">It's not magic. It's math.</p>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900">ADOPTION GAP</div>
                </div>
                <div className="space-y-2 text-sm text-neutral-600 mb-4">
                  <p>You're at <strong>{utilization}%</strong></p>
                  <p>Abridge averages <strong>{ABRIDGE_BENCHMARKS.utilization}%</strong></p>
                  <p>That's <strong>{ABRIDGE_BENCHMARKS.utilization - utilization}%</strong> more encounters being documented</p>
                </div>
                <div className="text-xl font-bold text-blue-600">Gap: +{formatCurrency(calculations.adoptionGapValue)}/year</div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-lg font-semibold text-neutral-900">EFFICIENCY GAP</div>
                </div>
                <div className="space-y-2 text-sm text-neutral-600 mb-4">
                  <p>You're getting <strong>{timeSavings} min</strong></p>
                  <p>Abridge averages <strong>{ABRIDGE_BENCHMARKS.timeSavings} min</strong></p>
                  <p>That's <strong>{Math.round(((ABRIDGE_BENCHMARKS.timeSavings - timeSavings) / timeSavings) * 100)}%</strong> more time returned per encounter</p>
                </div>
                <div className="text-xl font-bold text-purple-600">Gap: +{formatCurrency(calculations.efficiencyGapValue)}/year</div>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-neutral-900 mb-6">Value Driver Breakdown</h2>

            <div className="space-y-4 mb-12">
              {[
                { id: "patientAccess", label: "Patient Access", theirs: calculations.theirPatientAccess, abridge: calculations.abridgePatientAccess },
                { id: "levelOfService", label: "Level of Service", theirs: calculations.theirLevelOfService, abridge: calculations.abridgeLevelOfService },
                { id: "overtime", label: "Overtime & Locum", theirs: calculations.theirOvertime, abridge: calculations.abridgeOvertime },
                { id: "denials", label: "Denials", theirs: calculations.theirDenials, abridge: calculations.abridgeDenials },
              ].map((driver) => {
                const gap = driver.abridge - driver.theirs;
                const isExpanded = expandedDrivers.has(driver.id);
                return (
                  <div key={driver.id} className="border border-neutral-200 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleDriver(driver.id)}
                      className="w-full p-6 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
                      data-testid={`button-driver-${driver.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-neutral-900">{driver.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-[#E85D3F]">+{formatCurrency(gap)}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-neutral-400" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-neutral-100 bg-neutral-50/50">
                        <div className="grid md:grid-cols-2 gap-6 pt-6">
                          <div>
                            <p className="text-sm text-neutral-500 mb-3">WITH {competitorData.name.toUpperCase()} ({utilization}%, {timeSavings} min)</p>
                            <div className="h-3 bg-neutral-300 rounded-full mb-3" style={{ width: `${(driver.theirs / driver.abridge) * 100}%` }} />
                            <p className="text-xl font-bold text-neutral-600">{formatCurrency(driver.theirs)}/year</p>
                          </div>
                          <div>
                            <p className="text-sm text-[#E85D3F] mb-3">WITH ABRIDGE ({ABRIDGE_BENCHMARKS.utilization}%, {ABRIDGE_BENCHMARKS.timeSavings} min)</p>
                            <div className="h-3 bg-[#E85D3F] rounded-full mb-3 w-full" />
                            <p className="text-xl font-bold text-[#E85D3F]">{formatCurrency(driver.abridge)}/year</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-neutral-900 rounded-2xl p-6 mb-10">
              <div className="flex items-center justify-between">
                <span className="text-white font-semibold">TOTAL ANNUAL GAP</span>
                <span className="text-3xl font-bold text-[#E85D3F]">+{formatCurrency(calculations.gap)}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleContinue}
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-continue-step4"
              >
                See the Cost of Waiting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && competitorData && (
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2" data-testid="text-step5-title">
              The Cost of Waiting
            </h1>
            <p className="text-lg text-neutral-500 mb-10">Every month you delay is money you'll never get back.</p>

            <div className="bg-neutral-50 rounded-2xl p-6 mb-10">
              <h3 className="text-lg font-semibold text-neutral-900 mb-6">Cumulative Value Over 3 Years</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                    <YAxis 
                      stroke="#6B7280" 
                      fontSize={12}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: "#111827" }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="competitor" 
                      name={`Stay with ${competitorData.name}`}
                      stroke="#9CA3AF" 
                      strokeWidth={3}
                      dot={{ fill: "#9CA3AF", strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="abridge" 
                      name="Switch to Abridge"
                      stroke="#E85D3F" 
                      strokeWidth={3}
                      dot={{ fill: "#E85D3F", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
                <h3 className="font-semibold text-emerald-900 mb-4">IF YOU SWITCH TODAY</h3>
                <div className="space-y-3 text-emerald-800">
                  <div className="flex justify-between">
                    <span>6 months:</span>
                    <span className="font-bold">+{formatCurrency(calculations.gap / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 year:</span>
                    <span className="font-bold">+{formatCurrency(calculations.gap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3 years:</span>
                    <span className="font-bold">+{formatCurrency(calculations.gap * 3)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-200">
                  <div className="text-lg font-bold text-emerald-900">3-year total: +{formatCurrency(calculations.gap * 3)}</div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <h3 className="font-semibold text-red-900 mb-4">IF YOU WAIT 6 MONTHS</h3>
                <div className="space-y-3 text-red-800">
                  <div className="flex justify-between">
                    <span>6 months:</span>
                    <span className="font-bold text-red-600">-{formatCurrency(calculations.gap / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1 year:</span>
                    <span className="font-bold">+{formatCurrency(calculations.gap / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3 years:</span>
                    <span className="font-bold">+{formatCurrency(calculations.gap * 2.5)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <div className="text-lg font-bold text-red-900">3-year total: +{formatCurrency(calculations.gap * 2.5)}</div>
                  <div className="text-sm text-red-600 mt-1">(You lose {formatCurrency(calculations.gap * 0.5)})</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-10 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <p className="text-xl font-bold text-amber-900">
                Every month you delay = {formatCurrency(calculations.monthlyGap)} you'll never recapture.
              </p>
            </div>

            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-12">
              <div className="bg-neutral-100 rounded-2xl p-6 text-center">
                <p className="text-sm text-neutral-500 mb-4">Stay with {competitorData.name}</p>
                <div className="space-y-1 text-neutral-700 mb-4">
                  <p>Year 1: {formatCurrency(calculations.theirTotal)}</p>
                  <p>Year 2: {formatCurrency(calculations.theirTotal)}</p>
                  <p>Year 3: {formatCurrency(calculations.theirTotal)}</p>
                </div>
                <div className="pt-4 border-t border-neutral-200">
                  <p className="text-xl font-bold text-neutral-900">3-Year: {formatCurrency(calculations.theirTotal * 3)}</p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-3xl font-bold text-[#E85D3F]">+{formatCurrency(calculations.gap * 3)}</div>
                <p className="text-sm text-neutral-500 mt-1">The difference</p>
              </div>

              <div className="bg-[#FEF2F0] rounded-2xl p-6 text-center border-2 border-[#E85D3F]/20">
                <p className="text-sm text-[#E85D3F] mb-4">Switch to Abridge</p>
                <div className="space-y-1 text-neutral-700 mb-4">
                  <p>Year 1: {formatCurrency(calculations.abridgeTotal)}</p>
                  <p>Year 2: {formatCurrency(calculations.abridgeTotal)}</p>
                  <p>Year 3: {formatCurrency(calculations.abridgeTotal)}</p>
                </div>
                <div className="pt-4 border-t border-[#E85D3F]/20">
                  <p className="text-xl font-bold text-[#E85D3F]">3-Year: {formatCurrency(calculations.abridgeTotal * 3)}</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-10">
              <p className="text-xl font-bold text-neutral-900">That's the cost of doing nothing.</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                className="px-6 py-3 h-auto text-base font-semibold rounded-xl border-2"
                data-testid="button-save-analysis"
              >
                <Download className="w-4 h-4 mr-2" />
                Save This Analysis
              </Button>
              <Button
                className="bg-[#E85D3F] hover:bg-[#D04D2F] text-white px-8 py-3 h-auto text-base font-semibold rounded-xl"
                data-testid="button-talk"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Let's Talk
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
