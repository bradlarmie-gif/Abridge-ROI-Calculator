import { useMemo } from "react";
import { 
  ArrowLeft, Download, Share2, Sparkles, DollarSign, 
  Clock, Heart, TrendingUp, CheckCircle, ExternalLink, Trophy, Zap 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";
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
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function SummaryCard({ value, label, sublabel, icon: Icon, iconBg, iconColor }: SummaryCardProps) {
  return (
    <motion.div 
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 md:p-6 text-center flex-1 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mx-auto mb-3 shadow-sm`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <p className="text-2xl md:text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </motion.div>
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
    if (perProvider >= 20000) return { text: "Exceptional results", icon: Trophy, color: "text-amber-500" };
    if (perProvider >= 15000) return { text: "Strong performance", icon: Zap, color: "text-emerald-500" };
    if (perProvider >= 10000) return { text: "Solid foundation", icon: TrendingUp, color: "text-blue-500" };
    return { text: "Building momentum", icon: TrendingUp, color: "text-slate-500" };
  };

  const performance = getPerformanceLabel(results.totalValue, state.deployment.providers);
  const PerformanceIcon = performance.icon;

  const handleExportPDF = () => {
    alert('PDF export functionality coming soon!');
  };

  const handleShare = () => {
    alert('Share functionality coming soon!');
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#EA2C00]/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <img src={geometricPattern} alt="" className="w-full h-full object-cover" />
      </div>
      
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
        <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-10"
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm text-white/90 shadow-lg mb-6"
              variants={fadeInUp}
            >
              <Sparkles className="w-4 h-4 text-[#EA2C00]" />
              <span className="font-semibold">Your Value Story</span>
            </motion.div>
            
            <motion.p 
              className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-2 tracking-tight"
              variants={fadeInUp}
              data-testid="text-total-value"
            >
              {formatCurrency(results.totalValue)}
            </motion.p>
            
            <motion.p 
              className="text-xl md:text-2xl text-slate-300 mb-6"
              variants={fadeInUp}
            >
              in Documented Value
            </motion.p>
            
            <motion.div 
              className="flex items-center justify-center gap-2 text-white/70 mb-8"
              variants={fadeInUp}
            >
              <PerformanceIcon className={`w-5 h-5 ${performance.color}`} />
              <span className="font-medium">{performance.text}</span>
            </motion.div>
            
            <motion.p 
              className="text-sm text-slate-400 mb-8 font-mono"
              variants={fadeInUp}
            >
              {state.deployment.providers} providers · {state.deployment.monthsOnAbridge} months · {state.deployment.utilizationRate}% utilization
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center"
              variants={fadeInUp}
            >
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-6"
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm px-6"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </motion.div>
          </motion.div>

          {/* Summary Cards - White Section */}
          <div className="bg-gradient-to-b from-slate-100 to-white rounded-t-3xl -mx-4 md:-mx-6 px-4 md:px-6 pt-8 pb-8">
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <SummaryCard 
                value={formatCurrency(results.totalValue)} 
                label="Total Value"
                icon={DollarSign}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
              />
              <SummaryCard 
                value={formatCurrency(results.valuePerProvider)} 
                label="Per Provider"
                icon={TrendingUp}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <SummaryCard 
                value={formatHours(results.timeAllocation.totalHoursSaved)} 
                label="Time Protected"
                icon={Clock}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
              />
            </motion.div>

            {/* Detailed Results */}
            <motion.div 
              className="space-y-6 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* Financial Value */}
              {results.metricResults.filter(r => r.metric.category === 'financial').length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900">Core Financial Value</h2>
                          <p className="text-sm text-slate-500">The bottom line</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-emerald-600">
                        {formatCurrency(results.totalFinancialValue)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {results.metricResults
                      .filter(r => r.metric.category === 'financial')
                      .map(result => (
                        <div key={result.metric.key} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{result.metric.name}</p>
                            <p className="text-sm text-slate-500">{result.label}</p>
                            {result.isStrong && (
                              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Exceeding typical range
                              </p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-slate-900 ml-4">
                            {formatCurrency(result.dollarValue)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Time Reallocated */}
              {hasOpEfficiency && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="font-bold text-slate-900">Time Reallocated</h2>
                          <p className="text-sm text-slate-500">Where the hours went</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-blue-600">
                        {formatCurrency(results.timeAllocation.hardSavings.dollarValue)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <p className="text-sm text-slate-500 mb-4">Based on your allocation:</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {state.timeAllocation.hardSavings}% → Hard savings (OT reduction)
                          </span>
                        </div>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(results.timeAllocation.hardSavings.dollarValue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {state.timeAllocation.capacityUnlocked}% → Capacity ({formatNumber(results.timeAllocation.capacityUnlocked.additionalVisits)} visits)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {state.timeAllocation.qualityOfLife}% → Quality of life ({results.timeAllocation.qualityOfLife.hoursPerProviderPerWeek.toFixed(1)} hrs/wk)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quality Indicators */}
              {results.qualityIndicators.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shadow-sm">
                        <Heart className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">Quality Indicators</h2>
                        <p className="text-sm text-slate-500">The human signals</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {results.qualityIndicators.map(result => (
                      <div key={result.metric.key} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{result.metric.name}</p>
                          {result.isStrong && (
                            <p className="text-xs text-purple-600 flex items-center gap-1 mt-1 font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Exceeding expectations
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-purple-600 ml-4">{result.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What This Means */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900 text-lg mb-2">What This Means</h3>
                    <p className="text-emerald-800 leading-relaxed">
                      You're in a strong position. The value you're seeing is real and measurable. 
                      Your providers are happier, your documentation is better, and you have the proof to show for it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Expansion CTA */}
              {onExpand && (
                <div className="text-center pt-4">
                  <p className="text-slate-500 mb-4">Curious what this looks like at scale?</p>
                  <Button
                    variant="outline"
                    onClick={onExpand}
                    className="text-[#EA2C00] border-[#EA2C00] border-2 hover:bg-orange-50 px-6 font-semibold"
                    data-testid="button-model-expansion"
                  >
                    Model expansion potential
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Back Button */}
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="h-12 text-base font-medium border-2 hover:bg-slate-50"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Allocate
                </Button>
              </div>
            </motion.div>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
