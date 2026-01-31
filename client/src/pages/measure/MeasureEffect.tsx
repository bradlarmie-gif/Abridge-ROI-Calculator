import { useState, useMemo } from "react";
import { ArrowRight, ChevronDown, ChevronUp, BarChart3, Clock, Users, Lightbulb, TrendingUp, Settings, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { generateShareableUrl } from "@/lib/measureUrlState";
import { 
  type MeasureState, 
  type MonthlyMetricData,
  type EMDistribution,
  calculateMeasureResults, 
  formatNumber, 
  formatPercent,
  formatDelta,
  getEMDistributionArray,
} from "@/lib/measureCalculator";
import { Switch } from "@/components/ui/switch";

interface MeasureEffectProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onViewTrends: () => void;
}

function EMDistributionChart({ 
  data, 
  label,
  variant = 'without',
  editable,
  onUpdate 
}: { 
  data: { level: string; percent: number }[]; 
  label: string;
  variant?: 'without' | 'with';
  editable?: boolean;
  onUpdate?: (levelKey: string, value: number) => void;
}) {
  const maxPercent = Math.max(...data.map(d => d.percent), 1);
  const levelKeys = ['level1', 'level2', 'level3', 'level4', 'level5'];
  
  const isWithAbridge = variant === 'with';
  const barClass = isWithAbridge 
    ? "h-full bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] rounded-full transition-all duration-500"
    : "h-full bg-gradient-to-r from-slate-400 to-slate-300 rounded-full transition-all duration-500";
  
  const headerClass = isWithAbridge
    ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EA2C00]/10 text-[#EA2C00] text-xs font-semibold uppercase tracking-wide mb-4"
    : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wide mb-4";
  
  return (
    <div className="space-y-2">
      <div className={headerClass}>
        {isWithAbridge ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <BarChart3 className="w-3.5 h-3.5" />
        )}
        {label}
      </div>
      {data.map((item, index) => (
        <div key={item.level} className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-600 w-12">{item.level}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={barClass}
              style={{ width: `${(item.percent / maxPercent) * 100}%` }}
            />
          </div>
          {editable && onUpdate ? (
            <Input
              type="number"
              min={0}
              max={100}
              value={item.percent}
              onChange={(e) => onUpdate(levelKeys[index], parseInt(e.target.value) || 0)}
              className="w-14 h-6 text-xs text-center p-1"
              data-testid={`input-em-${label.toLowerCase().replace(/\s+/g, '-')}-${item.level}`}
            />
          ) : (
            <span className="text-xs font-medium text-slate-600 w-8">{item.percent}%</span>
          )}
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
  const [trendDataExpanded, setTrendDataExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const results = useMemo(() => calculateMeasureResults(state), [state]);

  const handleCopyLink = async () => {
    const url = generateShareableUrl(state);
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const updateDeployment = <K extends keyof typeof state.deployment>(key: K, value: number) => {
    updateState({ deployment: { ...state.deployment, [key]: value } });
  };
  
  const updateDocQuality = <K extends keyof typeof state.documentationQuality>(key: K, value: number) => {
    updateState({ documentationQuality: { ...state.documentationQuality, [key]: value } });
  };
  
  const updateTimeEfficiency = <K extends keyof typeof state.timeEfficiency>(key: K, value: number) => {
    updateState({ timeEfficiency: { ...state.timeEfficiency, [key]: value } });
  };
  
  const toggleTrendMode = (enabled: boolean) => {
    updateState({ 
      trendConfig: { 
        ...state.trendConfig, 
        enabled,
        // Initialize arrays with empty values when enabling
        monthlyData: enabled && state.trendConfig.monthlyData.wrvu.length === 0 ? {
          wrvu: Array(state.deployment.monthsOnAbridge).fill(0),
          emLevel: Array(state.deployment.monthsOnAbridge).fill(0),
          timeInNotes: Array(state.deployment.monthsOnAbridge).fill(0),
          sameDayClosure: Array(state.deployment.monthsOnAbridge).fill(0),
        } : state.trendConfig.monthlyData
      } 
    });
    // Auto-expand the section when enabling
    if (enabled) {
      setTrendDataExpanded(true);
    }
  };
  
  const updateMonthlyValue = (metric: keyof MonthlyMetricData, monthIndex: number, value: number) => {
    const currentData = [...(state.trendConfig.monthlyData[metric] || [])];
    // Ensure array is long enough
    while (currentData.length <= monthIndex) {
      currentData.push(0);
    }
    currentData[monthIndex] = value;
    updateState({
      trendConfig: {
        ...state.trendConfig,
        monthlyData: {
          ...state.trendConfig.monthlyData,
          [metric]: currentData,
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={4}
        stepName="The Abridge Effect"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
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
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setConfigExpanded(!configExpanded)}
              className="flex items-center gap-2 hover:bg-slate-50 transition-colors rounded-lg px-2 py-1 -ml-2"
              data-testid="button-toggle-config"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Configure Data</span>
              {configExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs gap-1.5"
              data-testid="button-copy-link"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Copy Shareable Link</span>
                </>
              )}
            </Button>
          </div>
          
          <AnimatePresence>
            {configExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-5 space-y-4 border-t border-slate-100 pt-4">
                  {/* Deployment Section */}
                  <div className="bg-gradient-to-br from-blue-50/80 to-slate-50 rounded-xl p-4 border border-blue-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">Deployment</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Providers</label>
                        <FormattedNumberInput value={state.deployment.providers} onChange={(v) => updateDeployment('providers', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-providers" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Total Encounters</label>
                        <FormattedNumberInput value={state.deployment.totalEncounters} onChange={(v) => updateDeployment('totalEncounters', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-total-encounters" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Abridge Encounters</label>
                        <FormattedNumberInput value={state.deployment.abridgeEncounters} onChange={(v) => updateDeployment('abridgeEncounters', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-abridge-encounters" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Non-Abridge Encounters</label>
                        <FormattedNumberInput value={state.deployment.nonAbridgeEncounters} onChange={(v) => updateDeployment('nonAbridgeEncounters', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-non-abridge-encounters" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Utilization %</label>
                        <FormattedNumberInput value={state.deployment.utilizationRate} onChange={(v) => updateDeployment('utilizationRate', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-utilization" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Months on Abridge</label>
                        <FormattedNumberInput value={state.deployment.monthsOnAbridge} onChange={(v) => updateDeployment('monthsOnAbridge', v)} className="h-10 bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-200" data-testid="input-months" />
                      </div>
                    </div>
                  </div>

                  {/* Documentation Quality Section */}
                  <div className="bg-gradient-to-br from-orange-50/80 to-slate-50 rounded-xl p-4 border border-orange-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-orange-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">Documentation Quality</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">wRVU Without</label>
                        <FormattedNumberInput value={state.documentationQuality.wrvuWithout} onChange={(v) => updateDocQuality('wrvuWithout', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-200" data-testid="input-wrvu-without" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">wRVU With</label>
                        <FormattedNumberInput value={state.documentationQuality.wrvuWith} onChange={(v) => updateDocQuality('wrvuWith', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-200" data-testid="input-wrvu-with" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">E&M Level Without</label>
                        <FormattedNumberInput value={state.documentationQuality.emLevelWithout} onChange={(v) => updateDocQuality('emLevelWithout', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-200" data-testid="input-em-without" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">E&M Level With</label>
                        <FormattedNumberInput value={state.documentationQuality.emLevelWith} onChange={(v) => updateDocQuality('emLevelWith', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-orange-300 focus:ring-orange-200" data-testid="input-em-with" />
                      </div>
                    </div>
                  </div>

                  {/* Time & Efficiency Section */}
                  <div className="bg-gradient-to-br from-emerald-50/80 to-slate-50 rounded-xl p-4 border border-emerald-100/50">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">Time & Efficiency</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Time in Notes Without (min)</label>
                        <FormattedNumberInput value={state.timeEfficiency.timeInNotesWithout} onChange={(v) => updateTimeEfficiency('timeInNotesWithout', v)} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" data-testid="input-time-without" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Time in Notes With (min)</label>
                        <FormattedNumberInput value={state.timeEfficiency.timeInNotesWith} onChange={(v) => updateTimeEfficiency('timeInNotesWith', v)} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" data-testid="input-time-with" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Time to Close Without (hrs)</label>
                        <FormattedNumberInput value={state.timeEfficiency.timeToCloseWithout} onChange={(v) => updateTimeEfficiency('timeToCloseWithout', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Time to Close With (hrs)</label>
                        <FormattedNumberInput value={state.timeEfficiency.timeToCloseWith} onChange={(v) => updateTimeEfficiency('timeToCloseWith', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Same-day Closure Without %</label>
                        <FormattedNumberInput value={state.timeEfficiency.sameDayClosureWithout} onChange={(v) => updateTimeEfficiency('sameDayClosureWithout', v)} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Same-day Closure With %</label>
                        <FormattedNumberInput value={state.timeEfficiency.sameDayClosureWith} onChange={(v) => updateTimeEfficiency('sameDayClosureWith', v)} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Work Outside Without (hrs/day)</label>
                        <FormattedNumberInput value={state.timeEfficiency.workOutsideWithout} onChange={(v) => updateTimeEfficiency('workOutsideWithout', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Work Outside With (hrs/day)</label>
                        <FormattedNumberInput value={state.timeEfficiency.workOutsideWith} onChange={(v) => updateTimeEfficiency('workOutsideWith', v)} step={0.1} className="h-10 bg-white border-slate-200 focus:border-emerald-300 focus:ring-emerald-200" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced: Monthly Trend Data */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setTrendDataExpanded(!trendDataExpanded)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                        data-testid="button-toggle-trend-data"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Advanced: Monthly Trend Data</span>
                        {trendDataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Enable</span>
                        <Switch 
                          checked={state.trendConfig.enabled} 
                          onCheckedChange={toggleTrendMode}
                          data-testid="switch-trend-mode"
                        />
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {trendDataExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="text-xs text-slate-500 mb-4">
                            Enter actual monthly values for more accurate trend charts. Leave blank to use interpolated values based on your before/after data.
                          </p>
                          
                          {!state.trendConfig.enabled ? (
                            <div className="bg-slate-50 rounded-lg p-4 text-center">
                              <p className="text-sm text-slate-500">Enable the toggle above to enter monthly trend data.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* wRVU Monthly Data */}
                              <div className="bg-gradient-to-br from-purple-50/80 to-slate-50 rounded-xl p-4 border border-purple-100/50">
                                <h4 className="text-xs font-semibold text-slate-700 mb-3">wRVU per Encounter (by month)</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                  {Array.from({ length: state.deployment.monthsOnAbridge }).map((_, i) => (
                                    <div key={`wrvu-${i}`} className="space-y-1">
                                      <label className="text-[10px] text-slate-500">Mo {i + 1}</label>
                                      <FormattedNumberInput
                                        value={state.trendConfig.monthlyData.wrvu[i] || 0}
                                        onChange={(v) => updateMonthlyValue('wrvu', i, v)}
                                        step={0.1}
                                        className="h-8 text-xs bg-white"
                                        data-testid={`input-wrvu-month-${i}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* E&M Level Monthly Data */}
                              <div className="bg-gradient-to-br from-amber-50/80 to-slate-50 rounded-xl p-4 border border-amber-100/50">
                                <h4 className="text-xs font-semibold text-slate-700 mb-3">Avg E&M Level (by month)</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                  {Array.from({ length: state.deployment.monthsOnAbridge }).map((_, i) => (
                                    <div key={`em-${i}`} className="space-y-1">
                                      <label className="text-[10px] text-slate-500">Mo {i + 1}</label>
                                      <FormattedNumberInput
                                        value={state.trendConfig.monthlyData.emLevel[i] || 0}
                                        onChange={(v) => updateMonthlyValue('emLevel', i, v)}
                                        step={0.1}
                                        className="h-8 text-xs bg-white"
                                        data-testid={`input-em-month-${i}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Time in Notes Monthly Data */}
                              <div className="bg-gradient-to-br from-cyan-50/80 to-slate-50 rounded-xl p-4 border border-cyan-100/50">
                                <h4 className="text-xs font-semibold text-slate-700 mb-3">Time in Notes - minutes (by month)</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                  {Array.from({ length: state.deployment.monthsOnAbridge }).map((_, i) => (
                                    <div key={`time-${i}`} className="space-y-1">
                                      <label className="text-[10px] text-slate-500">Mo {i + 1}</label>
                                      <FormattedNumberInput
                                        value={state.trendConfig.monthlyData.timeInNotes[i] || 0}
                                        onChange={(v) => updateMonthlyValue('timeInNotes', i, v)}
                                        className="h-8 text-xs bg-white"
                                        data-testid={`input-time-month-${i}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Same-day Closure Monthly Data */}
                              <div className="bg-gradient-to-br from-rose-50/80 to-slate-50 rounded-xl p-4 border border-rose-100/50">
                                <h4 className="text-xs font-semibold text-slate-700 mb-3">Same-day Closure % (by month)</h4>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                  {Array.from({ length: state.deployment.monthsOnAbridge }).map((_, i) => (
                                    <div key={`closure-${i}`} className="space-y-1">
                                      <label className="text-[10px] text-slate-500">Mo {i + 1}</label>
                                      <FormattedNumberInput
                                        value={state.trendConfig.monthlyData.sameDayClosure[i] || 0}
                                        onChange={(v) => updateMonthlyValue('sameDayClosure', i, v)}
                                        className="h-8 text-xs bg-white"
                                        data-testid={`input-closure-month-${i}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
            <div className="w-10 h-10 rounded-xl bg-[#EA2C00]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#EA2C00]" />
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
                <div className="text-2xl text-[#EA2C00]">→</div>
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
              <h3 className="text-sm font-semibold text-slate-700 mb-4">E/M Level Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">
                Enter the percentage of encounters at each E/M level. Click the values to edit.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <EMDistributionChart 
                    data={getEMDistributionArray(state.emDistribution.without)} 
                    label="Without Abridge"
                    variant="without"
                    editable
                    onUpdate={(levelKey, value) => {
                      updateState({
                        emDistribution: {
                          ...state.emDistribution,
                          without: {
                            ...state.emDistribution.without,
                            [levelKey]: value,
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#EA2C00]/5 to-[#F07B5F]/5 border border-[#EA2C00]/20">
                  <EMDistributionChart 
                    data={getEMDistributionArray(state.emDistribution.with)} 
                    label="With Abridge"
                    variant="with"
                    editable
                    onUpdate={(levelKey, value) => {
                      updateState({
                        emDistribution: {
                          ...state.emDistribution,
                          with: {
                            ...state.emDistribution.with,
                            [levelKey]: value,
                          },
                        },
                      });
                    }}
                  />
                </div>
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
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" />
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
          {state.trendConfig.enabled && state.deployment.monthsOnAbridge >= 3 && (
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
            className="flex-1 bg-[#EA2C00] hover:bg-[#d42800] text-white h-12 text-base font-semibold shadow-lg"
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
