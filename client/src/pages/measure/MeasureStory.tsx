import { useMemo, useState } from "react";
import { ArrowLeft, Download, Share2, BarChart3, Clock, Heart, Sparkles, ChevronDown, ChevronUp, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
  formatPercent,
} from "@/lib/measureCalculator";

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
}

function ValueCard({ 
  icon, 
  iconBg, 
  title, 
  value, 
  children 
}: { 
  icon: React.ReactNode; 
  iconBg: string; 
  title: string; 
  value: string; 
  children: React.ReactNode;
}) {
  return (
    <motion.div 
      className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <span className="text-xl font-bold text-slate-900">{value}</span>
      </div>
      <div className="p-5 space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

function SubCard({ 
  title, 
  value, 
  subtitle, 
  badge 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  badge?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <span className="font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-sm text-slate-500">{subtitle}</p>
      {badge && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MeasureStory({ state, onBack, onHome }: MeasureStoryProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  const handleExport = () => {
    alert('PDF export coming soon. This will generate a professional summary of your value story.');
  };

  const handleShare = () => {
    const summary = `Abridge Value Story: ${formatCurrency(results.totalValue)} in ${state.deployment.monthsOnAbridge} months with ${state.deployment.providers} providers.`;
    navigator.clipboard.writeText(summary);
    alert('Summary copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-900 transition-colors text-sm flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-sm text-slate-500">Step 4 of 4</div>
        </div>

        <motion.div 
          className="bg-white rounded-2xl border-2 border-[#EA2C00]/20 p-8 md:p-10 mb-8 text-center relative overflow-hidden shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#EA2C00]/5 via-transparent to-[#F07B5F]/5" />
          <div className="relative z-10">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EA2C00]/10 border border-[#EA2C00]/20 rounded-full text-sm text-[#EA2C00] mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold tracking-wide">YOUR VALUE STORY</span>
            </motion.div>

            <motion.p 
              className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] bg-clip-text text-transparent mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              data-testid="text-total-value"
            >
              {formatCurrency(results.totalValue)}
            </motion.p>
            <motion.p 
              className="text-xl text-slate-700 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Total Value Created
            </motion.p>

            <motion.p 
              className="text-sm text-slate-500 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {state.deployment.providers} providers · {state.deployment.monthsOnAbridge} months · {state.deployment.utilizationRate}% utilization
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={handleExport}
                variant="outline"
                className="h-11 px-6"
                data-testid="button-export"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="h-11 px-6"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <div className="space-y-6">
        <motion.h2 
          className="text-lg font-bold text-slate-900 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          THE ABRIDGE EFFECT
        </motion.h2>

        <ValueCard
          icon={<BarChart3 className="w-5 h-5 text-[#EA2C00]" />}
          iconBg="bg-[#EA2C00]/10"
          title="DOCUMENTATION QUALITY"
          value={formatCurrency(results.documentationQualityTotal)}
        >
          <p className="text-sm text-slate-600 mb-4">Your providers capture more when Abridge documents.</p>
          
          <SubCard
            title="wRVU Lift"
            value={formatCurrency(results.wrvuValue)}
            subtitle={`+${results.wrvuDelta.toFixed(1)} wRVU/encounter (+${formatPercent(results.wrvuDeltaPercent)})`}
            badge="Exceeding typical (3-9% lift)"
          />
          
          <SubCard
            title="E&M Level Shift"
            value={formatCurrency(results.emValue)}
            subtitle={`+${results.emLevelDelta.toFixed(1)} average level`}
            badge="Complexity captured, not created"
          />
        </ValueCard>

        <ValueCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          title="TIME REALLOCATED"
          value={formatCurrency(results.timeReallocatedTotal)}
        >
          <p className="text-sm text-slate-600 mb-4">
            {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed. Here's where they went:
          </p>
          
          <SubCard
            title={`Hard Savings (${state.allocation.hardSavingsPercent}%)`}
            value={formatCurrency(results.hardSavingsValue)}
            subtitle={`${formatNumber(Math.round(results.hardSavingsHours))} hours of overtime avoided`}
          />
          
          <SubCard
            title={`Capacity Unlocked (${state.allocation.capacityPercent}%)`}
            value={formatCurrency(results.capacityValue)}
            subtitle={`${formatNumber(Math.round(results.capacityVisits))} additional patient visits`}
          />
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-semibold text-slate-800">Quality of Life ({state.allocation.qualityOfLifePercent}%)</h4>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              {formatNumber(Math.round(results.qualityHours))} hours returned to your providers
            </p>
            <p className="text-sm text-slate-500">
              ≈ {results.qualityHoursPerWeek.toFixed(1)} hours/week back per provider
            </p>
            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800">
              <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>This is retention value. Providers who go home on time are providers who stay.</span>
            </div>
          </div>
        </ValueCard>

        <ValueCard
          icon={<Heart className="w-5 h-5 text-rose-600" />}
          iconBg="bg-rose-100"
          title="PROVIDER EXPERIENCE"
          value=""
        >
          <p className="text-sm text-slate-600 mb-4">The signals that predict retention and satisfaction.</p>
          
          <div className="bg-slate-50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-slate-200">
              <div className="bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Same-day closure</p>
                <p className="text-sm font-semibold text-slate-700">
                  {state.timeEfficiency.sameDayClosureWithout}% → {state.timeEfficiency.sameDayClosureWith}%
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">+{results.sameDayClosureDelta} pts <Sparkles className="w-3 h-3" /></span>
              </div>
              <div className="bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Work outside of work</p>
                <p className="text-sm font-semibold text-slate-700">
                  {state.timeEfficiency.workOutsideWithout} → {state.timeEfficiency.workOutsideWith} hrs
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">-{formatPercent(results.workOutsideDeltaPercent)} <Sparkles className="w-3 h-3" /></span>
              </div>
              <div className="bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Utilization</p>
                <p className="text-sm font-semibold text-slate-700">{state.deployment.utilizationRate}%</p>
                <span className="text-xs text-amber-600 font-medium">Strong</span>
              </div>
            </div>
          </div>
        </ValueCard>

        <motion.div 
          className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-bold text-slate-900 mb-3">WHAT THIS MEANS</h3>
          <p className="text-slate-700 leading-relaxed">
            In <strong>{state.deployment.monthsOnAbridge} months</strong>, your providers documented{' '}
            <strong>{formatNumber(state.deployment.abridgeEncounters)}</strong> encounters with Abridge. The result:
          </p>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span>Documentation that captures the complexity you manage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>{formatNumber(Math.round(results.totalHoursSaved))}</strong> hours returned to your providers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 mt-1">•</span>
              <span><strong>{formatCurrency(results.totalValue)}</strong> in measurable value</span>
            </li>
          </ul>
          <p className="mt-4 text-slate-700 font-medium">
            This is what you built. This is why it matters.
          </p>
        </motion.div>

        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => setMethodologyExpanded(!methodologyExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            data-testid="button-methodology"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">METHODOLOGY</span>
            </div>
            {methodologyExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {methodologyExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 text-sm text-slate-600 space-y-2 border-t border-slate-100 pt-4">
                  <p>
                    <strong>Documentation Quality:</strong> Comparison of Abridge vs non-Abridge encounters for the same providers. wRVU and E&M values use Medicare conversion factor (${state.calibration.conversionFactor}) with 50% attribution to isolate Abridge impact.
                  </p>
                  <p>
                    <strong>Time Savings:</strong> Calculated from time-in-notes differential × encounter volume × utilization rate. Allocation based on your organization's assessment.
                  </p>
                  <p>
                    <strong>Provider Experience:</strong> Metrics comparing Abridge vs non-Abridge workflow patterns.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="pt-4 pb-8">
          <Button
            variant="outline"
            onClick={onHome}
            className="w-full h-12 text-base font-medium border-2"
            data-testid="button-home"
          >
            Return to Home
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
