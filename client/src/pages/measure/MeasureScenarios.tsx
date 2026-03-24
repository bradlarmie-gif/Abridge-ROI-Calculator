import { useState, useMemo } from "react";
import { ArrowRight, TrendingUp, Users, Zap, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type DataSource,
  formatCurrency,
  formatNumber,
  calculateConfirmedValue,
  calculateExpansionResults,
  deriveEngagementContext,
  deriveSettingStage,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; bg: string; text: string }> = {
    analytics: { label: 'Analytics Pull', bg: 'bg-green-100', text: 'text-green-700' },
    benchmark: { label: 'Partner Platform', bg: 'bg-blue-100', text: 'text-blue-700' },
    estimate: { label: 'Team Estimate', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[source] || config.estimate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`} data-testid="badge-data-source">
      {c.label}
    </span>
  );
}

function formatSmartRange(low: number, high: number): string {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt}\u2013${highFmt}`;
}

interface AdoptionSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (val: number) => void;
}

function AdoptionSlider({ label, value, min, max, step, suffix, onChange }: AdoptionSliderProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">{label}</span>
        <span className="text-sm font-bold text-[#1A1A1A]">{formatNumber(value)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[#E8E2DA] rounded-full appearance-none cursor-pointer accent-[#EA2C00] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#EA2C00] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#EA2C00] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        data-testid={`slider-${label.toLowerCase().replace(/\s/g, '-')}`}
      />
      <div className="flex justify-between text-[10px] text-[#AAAAAA] mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isAbridge = source.toLowerCase().includes('abridge');
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${isAbridge ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
      {isAbridge ? 'Abridge' : 'Your Systems'}
    </span>
  );
}

function NextChapterSection({ state }: { state: MeasureState }) {
  const careSetting = state.careSetting || 'outpatient';
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const activeSettings = useMemo(() => {
    if (state.activeCareSettings?.length > 0) return state.activeCareSettings;
    const settings: MeasureCareSetting[] = [];
    const all: MeasureCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    for (const s of all) {
      const d = state.settingData[s];
      if (d) {
        const hasMetricData = Object.entries(d).some(([k, v]) =>
          (k.endsWith('_before') || k.endsWith('_after')) && v !== 0
        );
        if (hasMetricData) settings.push(s);
      }
    }
    if (settings.length === 0) settings.push(careSetting);
    return settings;
  }, [state, careSetting]);

  const settingStages = useMemo(() => activeSettings.map(s => deriveSettingStage(state, s)), [state, activeSettings]);

  const allMetrics = settingStages.flatMap(s => s.nextStageMetrics);
  if (allMetrics.length === 0) return null;

  return (
    <motion.div
      className="bg-[#1A1A1A] rounded-xl p-6 md:p-8 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      data-testid="section-next-chapter"
    >
      <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-2">
        Your Next Chapter
      </p>
      <p className="text-sm text-white/60 mb-6 leading-relaxed">
        These are the metrics that move you to the next stage. Some come from Abridge, some from your own systems.
      </p>

      {settingStages.map(stage => {
        if (stage.nextStageMetrics.length === 0) return null;
        return (
          <div key={stage.setting} className="mb-6 last:mb-0" data-testid={`next-chapter-${stage.setting}`}>
            {activeSettings.length > 1 && (
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/40 mb-3">{stage.settingLabel}</p>
            )}
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/30">Metric</span>
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/30">Domain</span>
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/30">Source</span>
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/30">Expected</span>
              </div>
              {stage.nextStageMetrics.map((m, i) => {
                const readyNow = months >= m.expectedAtMonth;
                return (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-white/5 last:border-b-0 items-center">
                    <span className="text-sm text-white/80">{m.metric}</span>
                    <span className="text-xs text-white/50">{m.domain}</span>
                    <SourceBadge source={m.source} />
                    {readyNow ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                        <Check className="w-3 h-3" /> Ready now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-white/40">
                        <Clock className="w-3 h-3" /> Month {m.expectedAtMonth}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

interface MeasureScenariosProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureScenarios({ state, updateState, onNext, onBack, onHome }: MeasureScenariosProps) {
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const narrative = useMemo(() => generateNarrative('scenarios', state), [state]);

  const careSetting = state.careSetting || 'outpatient';
  const isNursing = careSetting === 'nursing';
  const providerLabel = isNursing ? 'nurses' : 'providers';

  const currentUtilization = state.deployment.utilizationRate;
  const currentProviders = state.deployment.providers;
  const totalProviders = Math.max(state.deployment.totalProviders || currentProviders, currentProviders);

  const [deepenTarget, setDeepenTarget] = useState(Math.min(Math.max(currentUtilization + 20, 60), 100));
  const [expandTarget, setExpandTarget] = useState(totalProviders);

  const deepenResults = useMemo(() =>
    calculateExpansionResults(state, confirmed.low, confirmed.high, confirmed.domains.totalHoursSaved, deepenTarget, currentProviders),
    [state, confirmed, deepenTarget, currentProviders]
  );

  const expandResults = useMemo(() =>
    calculateExpansionResults(state, confirmed.low, confirmed.high, confirmed.domains.totalHoursSaved, currentUtilization, expandTarget),
    [state, confirmed, currentUtilization, expandTarget]
  );

  const combinedResults = useMemo(() =>
    calculateExpansionResults(state, confirmed.low, confirmed.high, confirmed.domains.totalHoursSaved, deepenTarget, expandTarget),
    [state, confirmed, deepenTarget, expandTarget]
  );

  const deepenValueMid = (deepenResults.combinedValueLow + deepenResults.combinedValueHigh) / 2;
  const expandValueMid = (expandResults.expandValueLow + expandResults.expandValueHigh) / 2;
  const currentValueMid = (confirmed.low + confirmed.high) / 2;
  const combinedValueMid = (combinedResults.combinedValueLow + combinedResults.combinedValueHigh) / 2;
  const deepenUplift = deepenValueMid - currentValueMid;
  const expandUplift = expandValueMid - currentValueMid;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={7}
        stepName="Growth Path"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <NarrativePanel narrative={narrative} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Growth Path
          </h1>
          <p className="text-base text-[#888888]">
            See how deepening utilization and expanding to more {providerLabel} changes the picture.
          </p>
        </motion.div>

        <motion.div
          className="mb-6 px-4 py-3 bg-[#FAF8F5] rounded-lg border border-[#E8E2DA] flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          data-testid="confirmed-reference-line"
        >
          <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px]">Current value:</span>
          <span className="text-sm font-bold text-[#EA2C00]">
            {formatSmartRange(confirmed.low, confirmed.high)} / year
          </span>
          <span className="text-xs text-[#999999]">
            {currentProviders} {providerLabel} at {currentUtilization}% adoption
          </span>
          <DataSourceBadge source={state.dataSource} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            data-testid="section-deepen"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#EA2C00]/10 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-[#EA2C00]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A]">Deepen</h2>
                <p className="text-[10px] text-[#999999] uppercase tracking-wider">Increase utilization</p>
              </div>
            </div>

            <AdoptionSlider
              label="Utilization"
              value={deepenTarget}
              min={Math.max(currentUtilization, 10)}
              max={100}
              step={5}
              suffix="%"
              onChange={setDeepenTarget}
            />

            <div className="mt-4 pt-4 border-t border-[#E8E2DA]">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-deepen-value">
                  {formatSmartRange(Math.round(deepenResults.combinedValueLow), Math.round(deepenResults.combinedValueHigh))}
                </p>
                <p className="text-xs text-[#888888] mt-1">projected annual value</p>
              </div>
              {deepenUplift > 0 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(Math.round(deepenUplift))}
                  </span>
                  <span className="text-xs text-[#999999]">additional</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#AAAAAA] mt-3 italic">
              Moving from {currentUtilization}% to {deepenTarget}% adoption across existing {providerLabel}
            </p>
          </motion.div>

          <motion.div
            className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            data-testid="section-expand"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#EA2C00]/10 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-[#EA2C00]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A]">Expand</h2>
                <p className="text-[10px] text-[#999999] uppercase tracking-wider">Add more {providerLabel}</p>
              </div>
            </div>

            <AdoptionSlider
              label={providerLabel.charAt(0).toUpperCase() + providerLabel.slice(1)}
              value={expandTarget}
              min={currentProviders}
              max={Math.max(totalProviders, currentProviders + 10)}
              step={1}
              suffix=""
              onChange={setExpandTarget}
            />

            <div className="mt-4 pt-4 border-t border-[#E8E2DA]">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-expand-value">
                  {formatSmartRange(Math.round(expandResults.expandValueLow), Math.round(expandResults.expandValueHigh))}
                </p>
                <p className="text-xs text-[#888888] mt-1">projected annual value</p>
              </div>
              {expandUplift > 0 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    +{formatCurrency(Math.round(expandUplift))}
                  </span>
                  <span className="text-xs text-[#999999]">additional</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#AAAAAA] mt-3 italic">
              Scaling from {currentProviders} to {expandTarget} {providerLabel} at current adoption
            </p>
          </motion.div>
        </div>

        {(deepenTarget > currentUtilization || expandTarget > currentProviders) && (
          <motion.div
            className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 mb-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            data-testid="section-combined"
          >
            <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-2">Combined Potential</p>
            <p className="text-sm text-[#888888] mb-3">
              {expandTarget} {providerLabel} at {deepenTarget}% adoption
            </p>
            <p className="text-4xl md:text-5xl font-bold text-[#EA2C00]" data-testid="text-combined-value">
              {formatSmartRange(Math.round(combinedResults.combinedValueLow), Math.round(combinedResults.combinedValueHigh))}
            </p>
            <p className="text-xs text-[#999999] mt-2">
              {formatCurrency(Math.round(combinedValueMid - currentValueMid))} more than today{"'"}s confirmed value
            </p>
          </motion.div>
        )}

        <NextChapterSection state={state} />

        <motion.p
          className="text-[11px] text-[#AAAAAA] text-center mb-8 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Projections are modeled estimates based on your deployment data and Abridge methodology.
          They represent proportional scaling of current per-{providerLabel.replace(/s$/, '')} economics{" \u2013 "}not a guarantee.
        </motion.p>

        <motion.div
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            View Executive Summary
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
