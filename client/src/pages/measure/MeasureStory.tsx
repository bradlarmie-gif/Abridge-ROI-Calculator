import { useMemo } from "react";
import { 
  ArrowRight, ArrowLeft, Download, Share2, Sparkles, DollarSign, 
  Clock, Heart, TrendingUp, Users, CheckCircle, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { 
  type MeasureState,
  calculateMeasureResults,
  formatCurrency,
  formatNumber,
  formatHours,
  hasOperationalEfficiencyMetrics,
  MEASURE_CONSTANTS,
} from "@/lib/measureCalculator";

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
  onExpand?: () => void;
}

interface SummaryCardProps {
  value: string;
  label: string;
  sublabel?: string;
}

function SummaryCard({ value, label, sublabel }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 text-center flex-1">
      <p className="text-2xl md:text-3xl font-bold text-[#111827]">{value}</p>
      <p className="text-sm font-medium text-[#6B7280] mt-1">{label}</p>
      {sublabel && <p className="text-xs text-[#9CA3AF]">{sublabel}</p>}
    </div>
  );
}

export default function MeasureStory({ 
  state, 
  onBack,
  onHome,
  onExpand 
}: MeasureStoryProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const hasOpEfficiency = hasOperationalEfficiencyMetrics(state.selectedMetrics);

  const getPerformanceLabel = (totalValue: number, providers: number) => {
    const perProvider = providers > 0 ? totalValue / providers : 0;
    if (perProvider >= 20000) return { text: "Exceptional results", emoji: "exceptional" };
    if (perProvider >= 15000) return { text: "Strong performance", emoji: "strong" };
    if (perProvider >= 10000) return { text: "Solid foundation", emoji: "solid" };
    return { text: "Building momentum", emoji: "building" };
  };

  const performance = getPerformanceLabel(results.totalValue, state.deployment.providers);

  const handleExportPDF = () => {
    alert('PDF export functionality coming soon!');
  };

  const handleShare = () => {
    alert('Share functionality coming soon!');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="measure"
        currentStep={5} 
        totalSteps={5}
        stepName="Your Story"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey="measure-story">
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-10 mb-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(234,44,0,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 text-[#EA2C00] mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">Your Value Story</span>
              </div>
              
              <p className="text-5xl md:text-6xl lg:text-7xl font-bold mb-2" data-testid="text-total-value">
                {formatCurrency(results.totalValue)}
              </p>
              <p className="text-xl md:text-2xl text-slate-300 mb-4">in Value Created</p>
              
              <p className="text-sm text-slate-400 mb-6">
                {state.deployment.providers} providers · {state.deployment.monthsOnAbridge} months · {state.deployment.utilizationRate}% utilization
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-export-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <SummaryCard 
              value={formatCurrency(results.totalValue)} 
              label="Total Value" 
            />
            <SummaryCard 
              value={formatCurrency(results.valuePerProvider)} 
              label="Per Provider" 
            />
            <SummaryCard 
              value={formatHours(results.timeAllocation.totalHoursSaved)} 
              label="Time Saved" 
            />
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Core Financial Value
                <span className="ml-auto text-xl font-bold text-emerald-600">
                  {formatCurrency(results.totalFinancialValue)}
                </span>
              </h2>
              
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {results.metricResults
                  .filter(r => r.metric.category === 'financial')
                  .map(result => (
                    <div key={result.metric.key} className="p-4 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#111827]">{result.metric.name}</p>
                        <p className="text-sm text-[#6B7280]">{result.label}</p>
                        {result.isStrong && (
                          <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3" />
                            Exceeding typical range
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-[#111827]">
                        {formatCurrency(result.dollarValue)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {hasOpEfficiency && (
              <div>
                <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Time Reallocated
                  <span className="ml-auto text-xl font-bold text-blue-600">
                    {formatCurrency(results.timeAllocation.hardSavings.dollarValue)}
                  </span>
                </h2>
                
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-[#6B7280] mb-3">Based on your allocation:</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                        {state.timeAllocation.hardSavings}% → Hard savings (OT reduction)
                      </span>
                      <span className="font-medium">
                        {formatCurrency(results.timeAllocation.hardSavings.dollarValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2" />
                        {state.timeAllocation.capacityUnlocked}% → Capacity ({formatNumber(results.timeAllocation.capacityUnlocked.additionalVisits)} additional visits)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2" />
                        {state.timeAllocation.qualityOfLife}% → Quality of life ({results.timeAllocation.qualityOfLife.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {results.qualityIndicators.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Quality Indicators
                </h2>
                
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {results.qualityIndicators.map(result => (
                    <div key={result.metric.key} className="p-4 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#111827]">{result.metric.name}</p>
                        {result.isStrong && (
                          <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3" />
                            Exceeding expectations
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-purple-600">{result.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mt-8">
            <h3 className="font-bold text-emerald-900 mb-2">What This Means</h3>
            <p className="text-emerald-800">
              You're in a strong position. The value you're seeing is real and measurable. Your providers are happier, your documentation is better, and you have the proof to show for it.
            </p>
          </div>

          {onExpand && (
            <div className="mt-8 text-center">
              <p className="text-[#6B7280] mb-3">Curious what this looks like at scale?</p>
              <Button
                variant="outline"
                onClick={onExpand}
                className="text-[#EA2C00] border-[#EA2C00] hover:bg-orange-50"
                data-testid="button-model-expansion"
              >
                Model expansion potential
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              onClick={onBack}
              className="h-12 text-base font-medium"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Allocate
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
