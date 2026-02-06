import { useMemo, useState } from "react";
import { ArrowLeft, Download, Calendar, BarChart3, Clock, DollarSign, Smile, ChevronRight, ChevronDown, Info, Lightbulb, ArrowUpDown, Loader2, Heart, Users, Coffee, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { 
  calculateSwitchGap, 
  formatCurrency, 
  ABRIDGE_BENCHMARKS, 
  VALUE_ASSUMPTIONS,
  type SwitchInputs 
} from "@/lib/switchGapCalculator";
import { generateAmbientPDF } from "@/components/switch/AmbientPDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";

interface SwitchFullAnalysisProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchFullAnalysis({
  inputs,
  setInputs,
  onBack,
  onBackToJourney,
}: SwitchFullAnalysisProps) {
  // Helper to update individual input values
  const updateInput = (key: keyof SwitchInputs, value: number) => {
    setInputs({ ...inputs, [key]: value });
  };
  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const solutionLabel = inputs.solution === "ambient-ai" ? "Ambient AI" : "Human Scribes";
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateAmbientPDF({ inputs, calculations, clientName, preparedBy });
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Value Realization Assessment has been saved.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const graphData = useMemo(() => {
    const points = [
      { month: "Today", current: 0, abridge: 0 },
      { month: "6 mo", current: calculations.yourAnnualValue / 2, abridge: calculations.abridgeAnnualValue * 0.4 },
      { month: "Year 1", current: calculations.yourAnnualValue, abridge: calculations.abridgeAnnualValue * 0.9 },
      { month: "Year 2", current: calculations.yourAnnualValue * 2, abridge: calculations.abridgeAnnualValue * 1.9 },
      { month: "Year 3", current: calculations.yourAnnualValue * 3, abridge: calculations.abridgeAnnualValue * 2.9 },
    ];
    return points;
  }, [calculations]);

  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={2} 
        totalSteps={2}
        stepName="Gap Analysis"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
              The Full Picture
            </h1>
            <p className="text-sm md:text-base text-[#6B7280]">
              {inputs.providers || 75} providers · {(inputs.annualEncounters || 150000).toLocaleString()} encounters · {solutionLabel}
            </p>
          </div>
          <Button 
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
            data-testid="button-export-pdf"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>

        {/* Hero Card: Annual Gap - The Primary Metric */}
        <div className="mb-4 md:mb-6" data-testid="card-annual-gap">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-center text-white relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative">
              <div className="text-xs md:text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                Potential Annual Opportunity
              </div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 tracking-tight">
                {formatCurrency(calculations.annualGap)}
              </div>
              <div className="text-sm md:text-base text-slate-400">
                per year — based on your current inputs
              </div>
              
              {/* Monthly breakdown */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  Approximately <span className="text-white font-semibold">{formatCurrency(calculations.monthlyGap)}/month</span> in potential value
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
          {/* Realization Score */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5" data-testid="card-realization-score">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] md:text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
                  What You're Getting
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#111827]">{calculations.realizationScore}%</div>
                <div className="text-xs text-[#6B7280] mt-0.5">of the value you paid for</div>
              </div>
              <div className="w-16 h-16 md:w-20 md:h-20 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="40" fill="none" 
                    stroke={calculations.realizationScore >= 70 ? "#10B981" : calculations.realizationScore >= 40 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${calculations.realizationScore * 2.51} 251`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#111827]">{calculations.realizationScore}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Year Gap */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5" data-testid="card-3year-gap">
            <div className="text-[10px] md:text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              3-Year Cost of Status Quo
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[#111827]">{formatCurrency(calculations.threeYearGap)}</div>
                <div className="text-xs text-[#6B7280] mt-0.5">if nothing changes</div>
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-[10px] text-[#6B7280]">Year 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-[10px] text-[#6B7280]">Year 2</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                  <span className="text-[10px] text-[#6B7280]">Year 3</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How the Gap Breaks Down - MOVED BEFORE GRAPH for better sales flow */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[#111827]">Where the Value Is Leaking</h2>
              <p className="text-sm text-[#6B7280] mt-1">Click any value to adjust assumptions — you'll see the math update in real time</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Editable</span>
            </div>
          </div>

          <div className="space-y-6">
            {(calculations.utilizationGapValue > 0 || inputs.utilization < ABRIDGE_BENCHMARKS.utilization) && (
              <EditableUtilizationCard 
                utilization={inputs.utilization}
                encounters={inputs.annualEncounters || 150000}
                gapEncounters={calculations.encounterGap}
                gapValue={calculations.utilizationGapValue}
                onUtilizationChange={(v) => updateInput("utilization", v)}
              />
            )}

            {(calculations.efficiencyGapValue > 0 || inputs.timeSavedPerEncounter < ABRIDGE_BENCHMARKS.timeSavedAvg) && (
              <EditableEfficiencyCard 
                efficiency={inputs.timeSavedPerEncounter}
                encountersAtBenchmark={encountersAtBenchmark}
                gapHours={calculations.efficiencyGapHours}
                gapValue={calculations.efficiencyGapValue}
                onEfficiencyChange={(v) => updateInput("timeSavedPerEncounter", v)}
              />
            )}

            {(calculations.wrvuGapValue > 0 || inputs.wrvuLift < ABRIDGE_BENCHMARKS.wrvuLift) && (
              <EditableQualityCard 
                wrvuLift={inputs.wrvuLift}
                encountersAtBenchmark={encountersAtBenchmark}
                gapValue={calculations.wrvuGapValue}
                onWrvuChange={(v) => updateInput("wrvuLift", v)}
              />
            )}
          </div>

          {/* Summary bar */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-[#6B7280]">
              Total opportunity from all dimensions:
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(calculations.annualGap)}/year
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">Two Paths, Two Outcomes</h2>
          <p className="text-sm md:text-base text-[#6B7280] mb-4 md:mb-6">
            The gray line is where you're headed. The green line is what's possible. The gap is the cost of the status quo.
          </p>

          <div className="h-56 sm:h-64 md:h-80 mb-4 md:mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[300px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={graphData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === "abridge" ? "Abridge potential" : "Current trajectory"
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff" }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  {/* Layer 1: Fill under Abridge line with soft gradient */}
                  <Area 
                    type="monotone" 
                    dataKey="abridge" 
                    stroke="none"
                    fill="url(#gapGradient)"
                    fillOpacity={1}
                    legendType="none"
                  />
                  {/* Layer 2: Fill under Current line with white to "cut out" the bottom */}
                  <Area 
                    type="monotone" 
                    dataKey="current" 
                    stroke="none"
                    fill="#ffffff"
                    fillOpacity={1}
                    legendType="none"
                  />
                  {/* Abridge benchmark line (top) */}
                  <Line 
                    type="monotone" 
                    dataKey="abridge" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: "#10B981", strokeWidth: 2, r: 5 }}
                    name="Abridge potential"
                    activeDot={{ r: 7, stroke: "#10B981", strokeWidth: 2, fill: "#fff" }}
                  />
                  {/* Current trajectory line (bottom) */}
                  <Line 
                    type="monotone" 
                    dataKey="current" 
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ fill: "#94a3b8", strokeWidth: 2, r: 4 }}
                    name="Current trajectory"
                    activeDot={{ r: 6, stroke: "#94a3b8", strokeWidth: 2, fill: "#fff" }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconType="line"
                    wrapperStyle={{ paddingTop: 12, fontSize: 10 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Gap callout - visual key + 3-year total */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-emerald-50 to-slate-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-3 md:w-8 md:h-4 rounded bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-emerald-200" />
              <span className="text-xs md:text-sm text-[#6B7280]">Shaded area = additional potential</span>
            </div>
            <span className="hidden md:block text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-lg md:text-2xl font-bold text-emerald-700">{formatCurrency(calculations.threeYearGap)}</span>
              <span className="text-xs md:text-sm text-[#6B7280]">over 3 years</span>
            </div>
          </div>
        </section>

        {/* NEW: Human Angle Section - What This Means Day-to-Day */}
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg md:text-xl font-bold text-[#111827]">What This Means Day-to-Day</h2>
          </div>
          
          <p className="text-sm md:text-base text-slate-700 mb-5">
            The numbers tell one story. But here's what we're hearing from providers who've made the switch:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-900 text-sm">Less Pajama Time</span>
              </div>
              <p className="text-xs text-slate-600">
                Providers tell us they're finishing notes before leaving the office. That's time back with family — not charting at 10pm.
              </p>
            </div>
            
            <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-900 text-sm">More Face Time</span>
              </div>
              <p className="text-xs text-slate-600">
                When documentation happens in real-time, providers can actually look at patients during visits instead of screens.
              </p>
            </div>
            
            <div className="bg-white/80 rounded-lg p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Smile className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-900 text-sm">Reduced Burnout</span>
              </div>
              <p className="text-xs text-slate-600">
                Documentation burden is the #1 driver of physician burnout. When that weight lifts, we see satisfaction scores climb.
              </p>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mt-4 italic">
            These outcomes are harder to quantify — but they're often what matters most to the providers living it.
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">Timing Comparison</h2>
          <p className="text-sm md:text-base text-[#6B7280] mb-4 md:mb-6">How timing affects the total opportunity over three years</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="border-2 border-emerald-500 bg-emerald-50/50 rounded-xl p-4 md:p-6 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 md:px-3 py-0.5 md:py-1 bg-emerald-500 text-white text-[10px] md:text-xs font-semibold rounded-full">
                FULL POTENTIAL
              </div>
              <div className="text-xs md:text-sm font-medium text-[#6B7280] mb-2">Start now</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearGap)}</div>
              <div className="text-xs md:text-sm text-emerald-700 font-medium mt-1">full 3-year value</div>
            </div>

            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 md:p-6 text-center">
              <div className="text-xs md:text-sm font-medium text-[#6B7280] mb-2">Start in 6 months</div>
              <div className="text-2xl md:text-3xl font-bold text-amber-600">-{formatCurrency(calculations.wait6MonthsLoss)}</div>
              <div className="text-xs md:text-sm text-amber-700 font-medium mt-1">opportunity cost</div>
              <div className="text-[10px] md:text-xs text-[#9CA3AF] mt-2">{formatCurrency(calculations.wait6MonthsValue)} remaining</div>
            </div>

            <div className="border border-red-200 bg-red-50/50 rounded-xl p-4 md:p-6 text-center">
              <div className="text-xs md:text-sm font-medium text-[#6B7280] mb-2">Start in 12 months</div>
              <div className="text-2xl md:text-3xl font-bold text-red-500">-{formatCurrency(calculations.wait12MonthsLoss)}</div>
              <div className="text-xs md:text-sm text-red-600 font-medium mt-1">opportunity cost</div>
              <div className="text-[10px] md:text-xs text-[#9CA3AF] mt-2">{formatCurrency(calculations.wait12MonthsValue)} remaining</div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Clock className="w-5 h-5 md:w-6 md:h-6 text-slate-500 flex-shrink-0" />
            <span className="text-sm md:text-base text-[#111827]">
              Each month represents approximately <strong className="text-amber-600">{formatCurrency(calculations.monthlyGap)}</strong> in potential value
            </span>
          </div>
        </section>

        <section className="bg-slate-50 rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold text-[#111827] mb-3 md:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            Methodology
          </h3>

          <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-[#6B7280]">
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Utilization benchmark: {ABRIDGE_BENCHMARKS.utilization}%</strong> — Abridge average across deployments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Efficiency benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min/encounter</strong> — Abridge average time saved</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Quality benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU lift</strong> — Abridge average revenue improvement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Satisfaction benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</strong> — Abridge average provider recommendation rate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Utilization gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}%</strong> conversion (conservative)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Efficiency gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</strong> conversion (conservative)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Quality gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</strong> attribution</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-slate-500 italic">
            All calculations use conservative assumptions. Actual results may be higher or lower based on your specific implementation and context.
          </p>
        </section>

              </main>

      <PDFExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPDF}
        isExporting={isExporting}
      />
    </div>
  );
}

function CalcStep({ number, label, math, note, isResult = false }: {
  number: string | number;
  label: string;
  math: React.ReactNode;
  note?: string;
  isResult?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isResult ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
        isResult ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {number}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#6B7280]">{label}</span>
        <span className={`font-mono ${isResult ? 'text-base font-semibold' : 'text-sm'} text-[#111827]`}>
          {math}
        </span>
        {note && <span className="text-xs text-slate-400 italic">{note}</span>}
      </div>
    </div>
  );
}

function UtilizationGapCard({ utilization, encounters, gapEncounters, gapValue }: {
  utilization: number;
  encounters: number;
  gapEncounters: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.utilization;
  const gapPP = benchmark - utilization;
  const potentialTimeSavedMinutes = gapEncounters * ABRIDGE_BENCHMARKS.timeSavedAvg;
  const potentialHours = Math.round(potentialTimeSavedMinutes / 60);

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Utilization Gap</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-7 md:h-8 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-1.5 md:px-2"
          style={{ width: `${(utilization / benchmark) * 100}%` }}
        >
          <span className="text-xs md:text-sm font-semibold text-white truncate">You: {utilization}%</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(utilization / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (utilization / benchmark) * 100)}%`
          }}
        >
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-1.5 md:px-2">
          <span className="text-xs md:text-sm font-semibold text-[#EA2C00]">Abridge: {benchmark}%</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-slate-50 p-1.5 md:p-2 rounded mb-2 break-words">
        +{gapEncounters.toLocaleString()} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min/enc = {potentialHours.toLocaleString()} hrs → ${gapValue.toLocaleString()}
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-utilization"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your utilization gap"
            math={<>{benchmark}% - {utilization}% = <strong className="text-emerald-600">{gapPP}pp</strong></>}
            note="pp = percentage points"
          />
          <CalcStep 
            number={2}
            label="Encounters not getting ambient documentation"
            math={<>{encounters.toLocaleString()} total × {gapPP}% = <strong className="text-emerald-600">{gapEncounters.toLocaleString()} encounters</strong></>}
          />
          <CalcStep 
            number={3}
            label="Potential time savings if documented at Abridge efficiency"
            math={<>{gapEncounters.toLocaleString()} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = <strong className="text-emerald-600">{potentialHours.toLocaleString()} hours</strong></>}
            note={`Using Abridge benchmark of ${ABRIDGE_BENCHMARKS.timeSavedAvg} min saved per encounter`}
          />
          <CalcStep 
            number={4}
            label="Value conversion (conservative)"
            math={<>{potentialHours.toLocaleString()} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = <strong className="text-emerald-600">${gapValue.toLocaleString()}</strong></>}
            note={`${VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion rate — not all saved time converts to value`}
          />
          <CalcStep 
            number="✓"
            label="Annual utilization gap"
            math={<strong className="text-emerald-600">${gapValue.toLocaleString()}</strong>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function EfficiencyGapCard({ efficiency, encountersAtBenchmark, gapHours, gapValue }: {
  efficiency: number;
  encountersAtBenchmark: number;
  gapHours: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.timeSavedAvg;
  const gapMin = benchmark - efficiency;

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Efficiency Gap</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-7 md:h-8 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-1.5 md:px-2"
          style={{ width: `${(efficiency / benchmark) * 100}%` }}
        >
          <span className="text-xs md:text-sm font-semibold text-white truncate">You: {efficiency} min</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(efficiency / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (efficiency / benchmark) * 100)}%`
          }}
        >
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-1.5 md:px-2">
          <span className="text-xs md:text-sm font-semibold text-[#EA2C00]">Abridge: {benchmark} min</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-slate-50 p-1.5 md:p-2 rounded mb-2 break-words">
        +{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-efficiency"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your efficiency gap"
            math={<>{benchmark} min - {efficiency} min = <strong className="text-emerald-600">{gapMin.toFixed(1)} min/encounter</strong></>}
          />
          <CalcStep 
            number={2}
            label="Encounters at Abridge utilization"
            math={<strong className="text-emerald-600">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
            note="Using 75% utilization benchmark"
          />
          <CalcStep 
            number={3}
            label="Total time gap"
            math={<>{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 = <strong className="text-emerald-600">{gapHours.toLocaleString()} hours/year</strong></>}
          />
          <CalcStep 
            number={4}
            label="Value conversion"
            math={<>{gapHours.toLocaleString()} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = <strong className="text-emerald-600">${gapValue.toLocaleString()}</strong></>}
            note={`${VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion rate — not all saved time converts to value`}
          />
          <CalcStep 
            number="✓"
            label="Annual efficiency gap"
            math={<strong className="text-emerald-600">${gapValue.toLocaleString()}</strong>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function QualityGapCard({ wrvuLift, encountersAtBenchmark, gapValue }: {
  wrvuLift: number;
  encountersAtBenchmark: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.wrvuLift;
  const gapPercent = benchmark - wrvuLift;

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Quality Gap</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-7 md:h-8 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-1.5 md:px-2"
          style={{ width: `${(wrvuLift / benchmark) * 100}%` }}
        >
          <span className="text-xs md:text-sm font-semibold text-white truncate">You: +{wrvuLift}%</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(wrvuLift / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (wrvuLift / benchmark) * 100)}%`
          }}
        >
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-1.5 md:px-2">
          <span className="text-xs md:text-sm font-semibold text-[#EA2C00]">Abridge: +{benchmark}%</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-slate-50 p-1.5 md:p-2 rounded mb-2 break-words">
        +{wrvuLift}% → +{benchmark}% = +{gapPercent.toFixed(1)}% gap × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-quality"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your wRVU lift gap"
            math={<>+{benchmark}% - +{wrvuLift}% = <strong className="text-emerald-600">+{gapPercent.toFixed(1)}% gap</strong></>}
          />
          <CalcStep 
            number={2}
            label="Value per wRVU"
            math={<strong className="text-emerald-600">${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU</strong>}
            note="Medicare blended conversion factor"
          />
          <CalcStep 
            number={3}
            label="Encounters at Abridge utilization"
            math={<strong className="text-emerald-600">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
          />
          <CalcStep 
            number={4}
            label="Attribution rate"
            math={<strong className="text-emerald-600">{VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</strong>}
            note="Conservative — other factors affect wRVU"
          />
          <CalcStep 
            number="✓"
            label="Annual quality gap"
            math={<>{gapPercent.toFixed(1)}% × ${VALUE_ASSUMPTIONS.wrvuDollarValue} × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = <strong className="text-emerald-600">${gapValue.toLocaleString()}</strong></>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EDITABLE GAP CARDS - Allow inline editing for sales conversations
// ============================================================================

function EditableUtilizationCard({ utilization, encounters, gapEncounters, gapValue, onUtilizationChange }: {
  utilization: number;
  encounters: number;
  gapEncounters: number;
  gapValue: number;
  onUtilizationChange: (value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(utilization));
  const benchmark = ABRIDGE_BENCHMARKS.utilization;
  const gapPP = benchmark - utilization;
  const potentialTimeSavedMinutes = gapEncounters * ABRIDGE_BENCHMARKS.timeSavedAvg;
  const potentialHours = Math.round(potentialTimeSavedMinutes / 60);

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onUtilizationChange(Math.min(90, Math.max(0, parsed)));
    }
    setIsEditing(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6 bg-gradient-to-r from-white to-blue-50/30">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Utilization Opportunity</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600 transition-all duration-300">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      {/* Editable value bar */}
      <div className="relative h-10 md:h-12 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-blue-500 flex items-center px-2 md:px-3 transition-all duration-300"
          style={{ width: `${Math.min(100, (utilization / benchmark) * 100)}%` }}
        >
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-12 px-1 py-0.5 text-sm font-semibold rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
                data-testid="input-utilization-edit"
              />
              <span className="text-xs text-white">%</span>
              <button onClick={handleSave} className="ml-1 p-0.5 bg-white/20 rounded hover:bg-white/30" data-testid="button-utilization-save">
                <Check className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setEditValue(String(utilization)); setIsEditing(true); }}
              className="flex items-center gap-1 text-white hover:text-blue-100 transition-colors"
              data-testid="button-utilization-edit"
            >
              <span className="text-sm md:text-base font-semibold">You: {utilization}%</span>
              <Pencil className="w-3 h-3 opacity-70" />
            </button>
          )}
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2 md:px-3">
          <span className="text-sm md:text-base font-semibold text-[#EA2C00]">Abridge: {benchmark}%</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-white/80 p-1.5 md:p-2 rounded mb-2 break-words">
        +{gapEncounters.toLocaleString()} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min/enc = {potentialHours.toLocaleString()} hrs → {formatCurrency(gapValue)}
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-utilization-edit"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'Show calculation'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your utilization gap"
            math={<>{benchmark}% - {utilization}% = <strong className="text-emerald-600">{gapPP}pp</strong></>}
            note="pp = percentage points"
          />
          <CalcStep 
            number={2}
            label="Encounters not getting ambient documentation"
            math={<>{encounters.toLocaleString()} total × {gapPP}% = <strong className="text-emerald-600">{gapEncounters.toLocaleString()} encounters</strong></>}
          />
          <CalcStep 
            number={3}
            label="Potential time savings if documented at Abridge efficiency"
            math={<>{gapEncounters.toLocaleString()} enc × {ABRIDGE_BENCHMARKS.timeSavedAvg} min = <strong className="text-emerald-600">{potentialHours.toLocaleString()} hours</strong></>}
          />
          <CalcStep 
            number={4}
            label="Value conversion (conservative)"
            math={<>{potentialHours.toLocaleString()} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% = <strong className="text-emerald-600">{formatCurrency(gapValue)}</strong></>}
          />
          <CalcStep 
            number="✓"
            label="Annual utilization opportunity"
            math={<strong className="text-emerald-600">{formatCurrency(gapValue)}</strong>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function EditableEfficiencyCard({ efficiency, encountersAtBenchmark, gapHours, gapValue, onEfficiencyChange }: {
  efficiency: number;
  encountersAtBenchmark: number;
  gapHours: number;
  gapValue: number;
  onEfficiencyChange: (value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(efficiency));
  const benchmark = ABRIDGE_BENCHMARKS.timeSavedAvg;
  const gapMin = benchmark - efficiency;

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      onEfficiencyChange(Math.min(5, Math.max(0, parsed)));
    }
    setIsEditing(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6 bg-gradient-to-r from-white to-purple-50/30">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Efficiency Opportunity</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600 transition-all duration-300">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      {/* Editable value bar */}
      <div className="relative h-10 md:h-12 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-purple-500 flex items-center px-2 md:px-3 transition-all duration-300"
          style={{ width: `${Math.min(100, (efficiency / benchmark) * 100)}%` }}
        >
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-12 px-1 py-0.5 text-sm font-semibold rounded border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-400"
                autoFocus
                data-testid="input-efficiency-edit"
              />
              <span className="text-xs text-white">min</span>
              <button onClick={handleSave} className="ml-1 p-0.5 bg-white/20 rounded hover:bg-white/30" data-testid="button-efficiency-save">
                <Check className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setEditValue(String(efficiency)); setIsEditing(true); }}
              className="flex items-center gap-1 text-white hover:text-purple-100 transition-colors"
              data-testid="button-efficiency-edit"
            >
              <span className="text-sm md:text-base font-semibold">You: {efficiency} min</span>
              <Pencil className="w-3 h-3 opacity-70" />
            </button>
          )}
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2 md:px-3">
          <span className="text-sm md:text-base font-semibold text-[#EA2C00]">Abridge: {benchmark} min</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-white/80 p-1.5 md:p-2 rounded mb-2 break-words">
        +{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc = {gapHours.toLocaleString()} hrs → {formatCurrency(gapValue)}
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-efficiency-edit"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'Show calculation'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your efficiency gap"
            math={<>{benchmark} min - {efficiency} min = <strong className="text-emerald-600">{gapMin.toFixed(1)} min/encounter</strong></>}
          />
          <CalcStep 
            number={2}
            label="Encounters at Abridge utilization"
            math={<strong className="text-emerald-600">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
          />
          <CalcStep 
            number={3}
            label="Total time gap"
            math={<>{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 = <strong className="text-emerald-600">{gapHours.toLocaleString()} hours/year</strong></>}
          />
          <CalcStep 
            number={4}
            label="Value conversion"
            math={<>{gapHours.toLocaleString()} hrs × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = <strong className="text-emerald-600">{formatCurrency(gapValue)}</strong></>}
          />
          <CalcStep 
            number="✓"
            label="Annual efficiency opportunity"
            math={<strong className="text-emerald-600">{formatCurrency(gapValue)}</strong>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function EditableQualityCard({ wrvuLift, encountersAtBenchmark, gapValue, onWrvuChange }: {
  wrvuLift: number;
  encountersAtBenchmark: number;
  gapValue: number;
  onWrvuChange: (value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(wrvuLift));
  const benchmark = ABRIDGE_BENCHMARKS.wrvuLift;
  const gapPercent = benchmark - wrvuLift;

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      onWrvuChange(Math.min(8, Math.max(0, parsed)));
    }
    setIsEditing(false);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 md:p-6 bg-gradient-to-r from-white to-emerald-50/30">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold text-[#111827] text-sm md:text-base">Quality Opportunity</span>
        </div>
        <span className="text-lg md:text-xl font-bold text-emerald-600 transition-all duration-300">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      {/* Editable value bar */}
      <div className="relative h-10 md:h-12 bg-slate-100 rounded-lg overflow-hidden mb-2 md:mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-emerald-500 flex items-center px-2 md:px-3 transition-all duration-300"
          style={{ width: `${Math.min(100, (wrvuLift / benchmark) * 100)}%` }}
        >
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-12 px-1 py-0.5 text-sm font-semibold rounded border border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                autoFocus
                data-testid="input-quality-edit"
              />
              <span className="text-xs text-white">%</span>
              <button onClick={handleSave} className="ml-1 p-0.5 bg-white/20 rounded hover:bg-white/30" data-testid="button-quality-save">
                <Check className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setEditValue(String(wrvuLift)); setIsEditing(true); }}
              className="flex items-center gap-1 text-white hover:text-emerald-100 transition-colors"
              data-testid="button-quality-edit"
            >
              <span className="text-sm md:text-base font-semibold">You: +{wrvuLift}%</span>
              <Pencil className="w-3 h-3 opacity-70" />
            </button>
          )}
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2 md:px-3">
          <span className="text-sm md:text-base font-semibold text-[#EA2C00]">Abridge: +{benchmark}%</span>
        </div>
      </div>
      
      <div className="text-[10px] md:text-xs text-[#6B7280] font-mono bg-white/80 p-1.5 md:p-2 rounded mb-2 break-words">
        +{gapPercent.toFixed(1)}% gap × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = {formatCurrency(gapValue)}
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-quality-edit"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'Show calculation'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your wRVU lift gap"
            math={<>+{benchmark}% - +{wrvuLift}% = <strong className="text-emerald-600">+{gapPercent.toFixed(1)}% gap</strong></>}
          />
          <CalcStep 
            number={2}
            label="Value per wRVU"
            math={<strong className="text-emerald-600">${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU</strong>}
            note="Medicare blended conversion factor"
          />
          <CalcStep 
            number={3}
            label="Encounters at Abridge utilization"
            math={<strong className="text-emerald-600">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
          />
          <CalcStep 
            number={4}
            label="Attribution rate"
            math={<strong className="text-emerald-600">{VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</strong>}
            note="Conservative — other factors affect wRVU"
          />
          <CalcStep 
            number="✓"
            label="Annual quality opportunity"
            math={<>{gapPercent.toFixed(1)}% × ${VALUE_ASSUMPTIONS.wrvuDollarValue} × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = <strong className="text-emerald-600">{formatCurrency(gapValue)}</strong></>}
            isResult
          />
        </div>
      )}
    </div>
  );
}
