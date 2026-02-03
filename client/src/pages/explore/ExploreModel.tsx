import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, Edit, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface ExploreModelProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  timeValue: number;
  docValue: number;
  annualInvestment: number;
  onEdit: () => void;
  onHome: () => void;
  onBack: () => void;
}

export default function ExploreModel({
  state,
  updateState,
  totalHoursSaved,
  timeValue,
  docValue,
  annualInvestment,
  onEdit,
  onHome,
  onBack,
}: ExploreModelProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const totalValue = timeValue + docValue;
  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  const valuePerProvider = state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0;

  // Calculate patient access and cost reduction separately
  const { timeDriverInputs, docQualityInputs } = state;
  
  const patientAccessValue = useMemo(() => {
    if (!timeDriverInputs.patientAccessEnabled) return 0;
    const hoursTowardCapacity = totalHoursSaved * (timeDriverInputs.capacityPercent / 100);
    const potentialVisits = hoursTowardCapacity * (60 / timeDriverInputs.visitDuration);
    return Math.round(potentialVisits * timeDriverInputs.revenuePerVisit);
  }, [totalHoursSaved, timeDriverInputs]);

  const costReductionValue = timeDriverInputs.costReductionEnabled ? timeDriverInputs.estimatedCostReduction : 0;

  // Doc value breakdown
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
  const hccScenarios: Record<string, number> = { conservative: 10, typical: 15, aggressive: 25 };
  const denialsScenarios: Record<string, number> = { conservative: 25, typical: 50, aggressive: 75 };

  const wrvuValue = useMemo(() => {
    if (!docQualityInputs.wrvuEnabled) return 0;
    const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
    const wrvuLift = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
    const totalWrvus = eligibleEncounters * wrvuLift;
    const grossValue = totalWrvus * docQualityInputs.conversionFactor;
    return Math.round(grossValue * (docQualityInputs.wrvuRealization / 100));
  }, [eligibleEncounters, docQualityInputs]);

  const hccValue = useMemo(() => {
    if (!docQualityInputs.hccEnabled) return 0;
    const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
    const maPatients = state.numberOfProviders * docQualityInputs.panelSize * (docQualityInputs.maPercent / 100);
    const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
    const recaptured = gapPatients * (recapturePercent / 100);
    const hccsRecaptured = recaptured * docQualityInputs.avgHccs;
    const rafValue = hccsRecaptured * docQualityInputs.rafImpact * docQualityInputs.annualPayment;
    return Math.round(rafValue * (docQualityInputs.hccRealization / 100));
  }, [state.numberOfProviders, docQualityInputs]);

  const denialsValue = useMemo(() => {
    if (!docQualityInputs.denialsEnabled) return 0;
    const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
    const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
    const unappealable = totalDenials * (docQualityInputs.unappealableRate / 100);
    const prevented = unappealable * (preventionPercent / 100);
    return Math.round(prevented * docQualityInputs.avgClaimValue * (docQualityInputs.denialsRealization / 100));
  }, [eligibleEncounters, docQualityInputs]);

  const hoursPerProviderPerWeek = state.numberOfProviders > 0 
    ? (totalHoursSaved / state.numberOfProviders / 52).toFixed(1)
    : '0';

  // 3-year projection (10% growth per year)
  const implementationCost = state.includeImplementation ? state.implementationFee : 0;
  const year1Value = netAnnualValue - implementationCost;
  const year2Value = Math.round(netAnnualValue * 1.1);
  const year3Value = Math.round(netAnnualValue * 1.21);
  const threeYearTotal = year1Value + year2Value + year3Value;

  // Expansion opportunity (use fullScaleProviders from state, editable utilization)
  const expandedProviders = state.fullScaleProviders;
  const [expandedUtilization, setExpandedUtilization] = useState(80);
  const expansionMultiplier = (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent);
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
  const expandedRoi = annualInvestment > 0 ? (totalValue * expansionMultiplier) / (annualInvestment * 3) : 0;

  // Scaling pace options
  const [selectedPace, setSelectedPace] = useState<'measured' | 'steady' | 'aggressive'>('steady');
  
  const paceConfig = {
    measured: { months: 36, label: '36mo', maturityMultiplier: 1.05 },
    steady: { months: 24, label: '24mo', maturityMultiplier: 1.10 },
    aggressive: { months: 18, label: '18mo', maturityMultiplier: 1.15 },
  };

  const currentPace = paceConfig[selectedPace];

  // Chart data for growth trajectory
  const chartData = useMemo(() => {
    const points: Array<{
      month: number;
      linearValue: number;
      projectedValue: number;
      providers: number;
      utilization: number;
      milestoneLabel: string;
      isPilot: boolean;
      isFullScale: boolean;
    }> = [];

    const totalMonths = currentPace.months;
    const pilotValue = netAnnualValue;
    const pilotProviders = state.numberOfProviders;
    const pilotUtil = state.utilizationPercent;
    const fullScaleProviders = expandedProviders;
    const fullScaleUtil = expandedUtilization;

    // Create milestone points
    const milestones = [0, 6, 12, 18, 24].filter(m => m <= totalMonths);
    if (!milestones.includes(totalMonths)) {
      milestones.push(totalMonths);
    }
    milestones.sort((a, b) => a - b);

    milestones.forEach((month) => {
      const progress = month / totalMonths;
      
      const providers = Math.round(pilotProviders + (fullScaleProviders - pilotProviders) * progress);
      const utilizationProgress = Math.pow(progress, 0.8);
      const utilization = Math.round(pilotUtil + (fullScaleUtil - pilotUtil) * utilizationProgress);
      
      // Linear value: simple provider scaling
      const linearValue = Math.round(pilotValue * (providers / pilotProviders));
      
      // Projected value: includes utilization boost and maturity gains
      const utilizationBoost = utilization / pilotUtil;
      const maturityBoost = 1 + ((currentPace.maturityMultiplier - 1) * Math.pow(progress, 1.5));
      const projectedValue = Math.round(linearValue * utilizationBoost * maturityBoost);

      points.push({
        month,
        linearValue,
        projectedValue,
        providers,
        utilization,
        milestoneLabel: month === 0 ? 'Today' : month === totalMonths ? 'Full Scale' : `${month}mo`,
        isPilot: month === 0,
        isFullScale: month === totalMonths,
      });
    });

    return points;
  }, [netAnnualValue, state.numberOfProviders, state.utilizationPercent, expandedProviders, expandedUtilization, currentPace]);

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + n.toLocaleString();
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your ROI model has been saved.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const careSettingLabel = state.careSetting === 'outpatient' ? 'Outpatient' :
    state.careSetting === 'ed' ? 'Emergency Department' :
    state.careSetting === 'inpatient' ? 'Inpatient' : 'Nursing';

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={7}
        totalSteps={7}
        stepName="Your Model"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      {/* HERO SECTION - Dark Background */}
      <motion.div
        className="bg-[#1A1A1A] py-12 md:py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 text-center">
          {/* Context Badge */}
          <div className="inline-block bg-[#2A2A2A] rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs text-[#888888]">
              {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers
            </span>
          </div>

          {/* Label */}
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[2px] mb-3">
            Projected Net Value
          </p>

          {/* Hero Number */}
          <p className="text-5xl md:text-7xl font-bold text-[#E85A2C] mb-1" data-testid="text-net-value">
            {formatCurrency(netAnnualValue)}
          </p>
          <p className="text-xl text-[#888888] mb-4">/ year</p>

          {/* Subtext */}
          <p className="text-base text-[#888888] mb-8">
            {formatCurrency(totalValue)} value – {formatCurrency(annualInvestment)} investment
          </p>

          {/* Stat Cards */}
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-roi">
              <p className="text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
              <p className="text-xs text-[#888888]">ROI</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-per-provider">
              <p className="text-2xl font-bold text-white">{formatCurrency(valuePerProvider)}</p>
              <p className="text-xs text-[#888888]">per provider</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-hours-saved">
              <p className="text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
              <p className="text-xs text-[#888888]">hours saved</p>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-sm text-[#666666] mt-6 italic">
            These projections reflect conservative assumptions. See Methodology for details.
          </p>
        </div>
      </motion.div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 md:py-12">
        
        {/* WHERE THE VALUE COMES FROM */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            Where the Value Comes From
          </p>
          <p className="text-center text-base text-[#888888] mb-6">
            Abridge creates value through two mechanisms—each with its own drivers and assumptions.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Time Back Card */}
            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-2">Time Back</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-[#E85A2C] rounded-full" />
                <p className="text-2xl font-bold text-[#E85A2C]">{formatCurrency(timeValue)} / year</p>
              </div>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <p className="text-sm text-[#666666] mb-4">
                Documentation consumes 1-2 hours per clinician daily. Abridge eliminates most of this burden.
              </p>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666666]">• Patient Access</span>
                  <span className="font-semibold text-black">{timeDriverInputs.patientAccessEnabled ? formatCurrency(patientAccessValue) : '—'}</span>
                </div>
                {timeDriverInputs.patientAccessEnabled && (
                  <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.capacityPercent}% to capacity)</p>
                )}
                <div className="flex justify-between">
                  <span className="text-[#666666]">• Cost Reduction</span>
                  <span className="font-semibold text-black">{costReductionValue > 0 ? formatCurrency(costReductionValue) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">• Clinician Wellbeing</span>
                  <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                </div>
                {timeDriverInputs.wellbeingEnabled && (
                  <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                )}
              </div>
            </div>

            {/* Documentation Quality Card */}
            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-2">Documentation Quality</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-[#E85A2C] rounded-full" />
                <p className="text-2xl font-bold text-[#E85A2C]">{formatCurrency(docValue)} / year</p>
              </div>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <p className="text-sm text-[#666666] mb-4">
                When documentation is complete and accurate, downstream revenue follows.
              </p>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#666666]">• wRVU Improvement</span>
                  <span className="font-semibold text-black">{docQualityInputs.wrvuEnabled ? formatCurrency(wrvuValue) : '—'}</span>
                </div>
                {docQualityInputs.wrvuEnabled && (
                  <p className="text-xs text-[#888888] pl-4">({wrvuScenarios[docQualityInputs.wrvuScenario]}% lift)</p>
                )}
                <div className="flex justify-between">
                  <span className="text-[#666666]">• HCC Capture</span>
                  <span className="font-semibold text-black">{docQualityInputs.hccEnabled ? formatCurrency(hccValue) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">• Denial Prevention</span>
                  <span className="font-semibold text-black">{docQualityInputs.denialsEnabled ? formatCurrency(denialsValue) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* THE EXPANSION OPPORTUNITY */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            The Expansion Opportunity
          </p>
          <p className="text-center text-base text-[#888888] mb-6">
            A successful pilot proves value. Strategic expansion multiplies it.
          </p>

          <div className="bg-[#F5F0EB] rounded-xl p-6">
            {/* Today vs Full Scale Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <p className="text-sm font-medium text-[#888888] mb-1">TODAY</p>
                <p className="text-2xl font-bold text-black">{formatNumber(state.numberOfProviders)}</p>
                <p className="text-sm text-[#888888]">providers</p>
                <p className="text-sm text-[#888888]">{state.utilizationPercent}% util</p>
              </div>
              
              <div className="flex-1 px-6 flex items-center justify-center">
                <span className="text-sm text-[#888888]">expansion →</span>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-[#888888] mb-1">FULL SCALE</p>
                <FormattedNumberInput
                  value={state.fullScaleProviders}
                  onChange={(v: number) => updateState({ fullScaleProviders: Math.max(v, state.numberOfProviders) })}
                  className="h-10 w-24 text-center text-2xl font-bold bg-white border border-[#E5E5E5] rounded-lg"
                  data-testid="input-full-scale-providers"
                />
                <p className="text-sm text-[#888888]">providers</p>
                <div className="flex items-center justify-center gap-1">
                  <FormattedNumberInput
                    value={expandedUtilization}
                    onChange={(v: number) => setExpandedUtilization(Math.min(Math.max(v, 1), 100))}
                    className="h-6 w-12 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                    data-testid="input-full-scale-utilization"
                  />
                  <span className="text-sm text-[#888888]">% util</span>
                </div>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-5">
                <p className="text-sm font-medium text-[#888888] mb-2">TODAY'S VALUE</p>
                <p className="text-3xl font-bold text-black mb-1">{formatCurrency(netAnnualValue)}</p>
                <p className="text-sm text-[#888888]">/ year</p>
                <p className="text-base text-[#888888] mt-2">{roi.toFixed(1)}× ROI</p>
              </div>
              <div className="bg-[#E85A2C] rounded-lg p-5">
                <p className="text-sm font-medium text-white/80 mb-2">FULL SCALE VALUE</p>
                <p className="text-3xl font-bold text-white mb-1">{formatCurrency(expandedValue)}</p>
                <p className="text-sm text-white/80">/ year</p>
                <p className="text-base text-white/80 mt-2">{expandedRoi.toFixed(1)}× ROI</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* GROWTH TRAJECTORY */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            Growth Trajectory
          </p>
          <p className="text-center text-base text-[#888888] mb-6">
            Projected value vs. linear scaling as you expand from pilot to full scale.
          </p>

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            {/* Pace Selector */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-[#888888]">Expansion pace:</span>
              <div className="flex gap-1">
                {(['measured', 'steady', 'aggressive'] as const).map((pace) => (
                  <Button
                    key={pace}
                    variant={selectedPace === pace ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPace(pace)}
                    className={`rounded-full ${
                      selectedPace === pace 
                        ? "bg-[#E85A2C] text-white" 
                        : "bg-[#F5F0EB] text-[#888888]"
                    }`}
                    data-testid={`pace-${pace}`}
                  >
                    {paceConfig[pace].months}mo
                  </Button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#E85A2C] rounded-full" />
                <span className="text-[#666666]">Projected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-[#D1D5DB]" />
                <span className="text-[#666666]">Linear</span>
              </div>
            </div>

            {/* Chart - BIGGER */}
            <div className="h-[400px] bg-white rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 10, bottom: 40 }}>
                  <defs>
                    <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E85A2C" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#E85A2C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, currentPace.months]}
                    axisLine={{ stroke: '#E5E5E5', strokeWidth: 1 }}
                    tickLine={false}
                    tick={(props: { x: number; y: number; payload: { value: number } }) => {
                      const { x, y, payload } = props;
                      const point = chartData.find(d => d.month === payload.value);
                      if (!point) return <g />;
                      const anchor = point.isFullScale ? "end" : point.isPilot ? "start" : "middle";
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} 
                            y={16} 
                            textAnchor={anchor} 
                            fill={point.isPilot || point.isFullScale ? "#E85A2C" : "#888888"}
                            fontSize={12}
                            fontWeight={point.isPilot || point.isFullScale ? 700 : 400}
                          >
                            {point.milestoneLabel}
                          </text>
                        </g>
                      );
                    }}
                    ticks={chartData.map(d => d.month)}
                    height={40}
                  />
                
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#888888", fontSize: 12 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={65}
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-black text-base mb-1">{data.milestoneLabel}</p>
                          <p className="text-sm text-[#888888] mb-3">{data.providers} providers · {data.utilization}% util</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-6">
                              <span className="text-[#E85A2C]">Projected:</span>
                              <span className="font-semibold text-[#E85A2C]">{formatCurrency(data.projectedValue)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[#888888]">Linear:</span>
                              <span className="text-[#888888]">{formatCurrency(data.linearValue)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="projectedValue" 
                    stroke="none"
                    fill="url(#projectedGradient)"
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="linearValue" 
                    stroke="#D1D5DB" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="projectedValue" 
                    stroke="#E85A2C" 
                    strokeWidth={3}
                    dot={false}
                  />
                  
                  <ReferenceDot 
                    x={0} 
                    y={chartData[0]?.projectedValue || 0} 
                    r={8} 
                    fill="#E85A2C" 
                    stroke="white"
                    strokeWidth={3}
                  />
                  
                  <ReferenceDot 
                    x={currentPace.months} 
                    y={chartData[chartData.length - 1]?.projectedValue || 0} 
                    r={8} 
                    fill="#E85A2C" 
                    stroke="white"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm text-[#888888] text-center mt-4 italic">
              Projected value includes utilization improvement and workflow maturity gains over linear provider scaling.
            </p>
          </div>
        </motion.div>

        {/* 3-YEAR PROJECTION */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-center text-xl font-bold text-black mb-6">
            3-Year Projection
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 1</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year1Value)}</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 2</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year2Value)}</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 3</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year3Value)}</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-lg p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">3-Year Net</p>
              <p className="text-xl font-bold text-[#E85A2C]">{formatCurrency(threeYearTotal)}</p>
            </div>
          </div>

          <p className="text-sm text-[#888888] text-center mt-4">
            {implementationCost > 0 ? `Year 1 includes ${formatCurrency(implementationCost)} implementation fee. ` : ''}
            Years 2-3 assume 10% value growth from improved utilization.
          </p>
        </motion.div>

        {/* EXPORT SECTION */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-1">Your Analysis</p>
              <p className="text-sm text-[#888888]">
                {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers · ${formatNumber(state.costPerProvider)}/provider/mo
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onEdit}
                className="gap-2 border-black text-black"
                data-testid="button-edit"
              >
                <Edit className="w-4 h-4" />
                Edit Model
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                className="bg-[#E85A2C] text-white gap-2"
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </motion.div>

        {/* METHODOLOGY */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover-elevate text-sm text-[#888888]"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Methodology & Assumptions — understand how we calculated these
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {showMethodology && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg text-sm text-[#666666] space-y-3">
                  <p>
                    <strong className="text-black">Time savings:</strong> {state.minutesSavedPerEncounter} min per encounter × {formatNumber(Math.round(state.annualEncounters * state.utilizationPercent / 100))} eligible encounters.
                  </p>
                  <p>
                    <strong className="text-black">Utilization rate:</strong> {state.utilizationPercent}% of encounters projected to use Abridge.
                  </p>
                  {timeDriverInputs.patientAccessEnabled && (
                    <p>
                      <strong className="text-black">Patient Access:</strong> {timeDriverInputs.capacityPercent}% of reclaimed time toward capacity × ${timeDriverInputs.revenuePerVisit}/visit × {timeDriverInputs.visitDuration} min visits.
                    </p>
                  )}
                  {docQualityInputs.wrvuEnabled && (
                    <p>
                      <strong className="text-black">wRVU:</strong> {wrvuScenarios[docQualityInputs.wrvuScenario]}% improvement × ${docQualityInputs.conversionFactor} conversion factor × {docQualityInputs.wrvuRealization}% realization.
                    </p>
                  )}
                  <p>
                    <strong className="text-black">Growth assumptions:</strong> 10% annual improvement from workflow maturity.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <PDFExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportPDF}
          isExporting={isExporting}
          documentType="ROI model"
        />
      </div>
    </div>
  );
}
