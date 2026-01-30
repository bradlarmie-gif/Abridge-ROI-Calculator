import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, BarChart3, Clock, Users, Lightbulb, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatNumber, 
  formatPercent,
  formatDelta,
  EM_DISTRIBUTION_WITHOUT,
  EM_DISTRIBUTION_WITH,
} from "@/lib/measureCalculator";

interface MeasureEffectProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onViewTrends: () => void;
}

function EMDistributionChart({ data, label }: { data: typeof EM_DISTRIBUTION_WITHOUT; label: string }) {
  const maxPercent = Math.max(...data.map(d => d.percent));
  
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">{label}</p>
      {data.map((item) => (
        <div key={item.level} className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600 w-12">{item.level}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(item.percent / maxPercent) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 w-8">{item.percent}%</span>
        </div>
      ))}
    </div>
  );
}

function MetricRow({ 
  label, 
  without, 
  withAbridge, 
  change, 
  changeType = 'percent' 
}: { 
  label: string; 
  without: string; 
  withAbridge: string; 
  change: string;
  changeType?: 'percent' | 'points';
}) {
  return (
    <div className="grid grid-cols-4 gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-sm text-slate-700">{label}</div>
      <div className="text-sm text-slate-500 text-center">{without}</div>
      <div className="text-sm text-slate-700 text-center font-medium">{withAbridge}</div>
      <div className="text-sm text-emerald-600 text-right font-semibold">{change}</div>
    </div>
  );
}

export default function MeasureEffect({ 
  state, 
  updateState, 
  onNext, 
  onBack,
  onViewTrends,
}: MeasureEffectProps) {
  const [configExpanded, setConfigExpanded] = useState(true);
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  
  const updateDeployment = <K extends keyof typeof state.deployment>(key: K, value: number) => {
    updateState({ deployment: { ...state.deployment, [key]: value } });
  };
  
  const updateDocQuality = <K extends keyof typeof state.documentationQuality>(key: K, value: number) => {
    updateState({ documentationQuality: { ...state.documentationQuality, [key]: value } });
  };
  
  const updateTimeEfficiency = <K extends keyof typeof state.timeEfficiency>(key: K, value: number) => {
    updateState({ timeEfficiency: { ...state.timeEfficiency, [key]: value } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 transition-colors text-sm flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-sm text-slate-500">Step 2 of 4</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" data-testid="text-effect-title">
            THE ABRIDGE EFFECT
          </h1>
          <p className="text-lg text-slate-600">
            Same providers. Same patients. Different documentation.
            <br />
            <span className="text-slate-500">Here's what we see.</span>
          </p>
        </motion.div>

        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => setConfigExpanded(!configExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            data-testid="button-toggle-config"
          >
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Settings className="w-4 h-4" /> Configure Data (Demo)</span>
            {configExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {configExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-6 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Deployment</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Providers</label>
                        <Input type="number" value={state.deployment.providers} onChange={(e) => updateDeployment('providers', Number(e.target.value))} className="h-9" data-testid="input-providers" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Total encounters</label>
                        <Input type="number" value={state.deployment.totalEncounters} onChange={(e) => updateDeployment('totalEncounters', Number(e.target.value))} className="h-9" data-testid="input-total-encounters" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Abridge encounters</label>
                        <Input type="number" value={state.deployment.abridgeEncounters} onChange={(e) => updateDeployment('abridgeEncounters', Number(e.target.value))} className="h-9" data-testid="input-abridge-encounters" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Non-Abridge encounters</label>
                        <Input type="number" value={state.deployment.nonAbridgeEncounters} onChange={(e) => updateDeployment('nonAbridgeEncounters', Number(e.target.value))} className="h-9" data-testid="input-non-abridge-encounters" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Utilization %</label>
                        <Input type="number" value={state.deployment.utilizationRate} onChange={(e) => updateDeployment('utilizationRate', Number(e.target.value))} className="h-9" data-testid="input-utilization" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Months on Abridge</label>
                        <Input type="number" value={state.deployment.monthsOnAbridge} onChange={(e) => updateDeployment('monthsOnAbridge', Number(e.target.value))} className="h-9" data-testid="input-months" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documentation Quality</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">wRVU without</label>
                        <Input type="number" step="0.1" value={state.documentationQuality.wrvuWithout} onChange={(e) => updateDocQuality('wrvuWithout', Number(e.target.value))} className="h-9" data-testid="input-wrvu-without" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">wRVU with</label>
                        <Input type="number" step="0.1" value={state.documentationQuality.wrvuWith} onChange={(e) => updateDocQuality('wrvuWith', Number(e.target.value))} className="h-9" data-testid="input-wrvu-with" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">E&M Level without</label>
                        <Input type="number" step="0.1" value={state.documentationQuality.emLevelWithout} onChange={(e) => updateDocQuality('emLevelWithout', Number(e.target.value))} className="h-9" data-testid="input-em-without" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">E&M Level with</label>
                        <Input type="number" step="0.1" value={state.documentationQuality.emLevelWith} onChange={(e) => updateDocQuality('emLevelWith', Number(e.target.value))} className="h-9" data-testid="input-em-with" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Time & Efficiency</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Time in notes without (min)</label>
                        <Input type="number" value={state.timeEfficiency.timeInNotesWithout} onChange={(e) => updateTimeEfficiency('timeInNotesWithout', Number(e.target.value))} className="h-9" data-testid="input-time-without" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Time in notes with (min)</label>
                        <Input type="number" value={state.timeEfficiency.timeInNotesWith} onChange={(e) => updateTimeEfficiency('timeInNotesWith', Number(e.target.value))} className="h-9" data-testid="input-time-with" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Time to close without (hrs)</label>
                        <Input type="number" step="0.1" value={state.timeEfficiency.timeToCloseWithout} onChange={(e) => updateTimeEfficiency('timeToCloseWithout', Number(e.target.value))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Time to close with (hrs)</label>
                        <Input type="number" step="0.1" value={state.timeEfficiency.timeToCloseWith} onChange={(e) => updateTimeEfficiency('timeToCloseWith', Number(e.target.value))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Same-day closure without %</label>
                        <Input type="number" value={state.timeEfficiency.sameDayClosureWithout} onChange={(e) => updateTimeEfficiency('sameDayClosureWithout', Number(e.target.value))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Same-day closure with %</label>
                        <Input type="number" value={state.timeEfficiency.sameDayClosureWith} onChange={(e) => updateTimeEfficiency('sameDayClosureWith', Number(e.target.value))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Work outside without (hrs/day)</label>
                        <Input type="number" step="0.1" value={state.timeEfficiency.workOutsideWithout} onChange={(e) => updateTimeEfficiency('workOutsideWithout', Number(e.target.value))} className="h-9" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Work outside with (hrs/day)</label>
                        <Input type="number" step="0.1" value={state.timeEfficiency.workOutsideWith} onChange={(e) => updateTimeEfficiency('workOutsideWith', Number(e.target.value))} className="h-9" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">DOCUMENTATION QUALITY</h2>
              <p className="text-sm text-slate-500">The complexity you're capturing</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">wRVU per Encounter</h3>
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">{state.documentationQuality.wrvuWithout}</p>
                  <p className="text-xs text-slate-500">Without Abridge</p>
                </div>
                <div className="text-2xl text-indigo-400">→</div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{state.documentationQuality.wrvuWith}</p>
                  <p className="text-xs text-slate-500">With Abridge</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  {formatDelta(results.wrvuDelta)} wRVU ({formatPercent(results.wrvuDeltaPercent, true)})
                </span>
              </div>
              <p className="text-xs text-slate-500 text-center mt-3">
                Your providers capture more complexity when Abridge documents the encounter.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">E&M Level Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <EMDistributionChart data={EM_DISTRIBUTION_WITHOUT} label="Without Abridge" />
                <EMDistributionChart data={EM_DISTRIBUTION_WITH} label="With Abridge" />
              </div>
              <p className="text-xs text-slate-500 text-center mt-4">
                The distribution shifts right. Complexity that was being missed is now captured.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">TIME & EFFICIENCY</h2>
              <p className="text-sm text-slate-500">Where the time goes</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-200 mb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase">Metric</div>
              <div className="text-xs font-semibold text-slate-500 uppercase text-center">Without Abridge</div>
              <div className="text-xs font-semibold text-slate-500 uppercase text-center">With Abridge</div>
              <div className="text-xs font-semibold text-slate-500 uppercase text-right">Change</div>
            </div>
            <MetricRow 
              label="Time in notes" 
              without={`${state.timeEfficiency.timeInNotesWithout} min`}
              withAbridge={`${state.timeEfficiency.timeInNotesWith} min`}
              change={`-${formatPercent(results.timeInNotesDeltaPercent)}`}
            />
            <MetricRow 
              label="Time to close" 
              without={`${state.timeEfficiency.timeToCloseWithout} hrs`}
              withAbridge={`${state.timeEfficiency.timeToCloseWith} hrs`}
              change={`-${formatPercent(results.timeToCloseDeltaPercent)}`}
            />
            <MetricRow 
              label="Same-day closure" 
              without={`${state.timeEfficiency.sameDayClosureWithout}%`}
              withAbridge={`${state.timeEfficiency.sameDayClosureWith}%`}
              change={`+${results.sameDayClosureDelta} pts`}
              changeType="points"
            />
            <MetricRow 
              label="Work outside of work" 
              without={`${state.timeEfficiency.workOutsideWithout} hrs/day`}
              withAbridge={`${state.timeEfficiency.workOutsideWith} hrs/day`}
              change={`-${formatPercent(results.workOutsideDeltaPercent)}`}
            />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4 flex items-center justify-around mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{formatNumber(state.deployment.totalEncounters)}</p>
            <p className="text-xs text-slate-500">encounters</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{state.deployment.providers}</p>
            <p className="text-xs text-slate-500">providers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{state.deployment.utilizationRate}%</p>
            <p className="text-xs text-slate-500">utilization</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{state.deployment.monthsOnAbridge} mo</p>
            <p className="text-xs text-slate-500">on Abridge</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>This is a natural experiment.</strong> Same providers, documenting similar patients, with and without Abridge. The difference is the documentation.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {state.deployment.monthsOnAbridge >= 3 && (
            <Button
              variant="outline"
              onClick={onViewTrends}
              className="flex-1 sm:flex-none h-12 text-base font-medium border-2"
              data-testid="button-view-trends"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Over Time
            </Button>
          )}
          <Button
            onClick={onNext}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white h-12 text-base font-semibold shadow-lg"
            data-testid="button-what-this-means"
          >
            What Does This Mean?
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
