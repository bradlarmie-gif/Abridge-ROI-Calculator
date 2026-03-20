import { useState, useMemo, useCallback } from "react";
import { ArrowRight, TrendingUp, Users, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type DataSource,
  formatCurrency,
  formatNumber,
  calculateConfirmedValue,
  calculateExpansionResults,
  deriveEngagementContext,
  deriveSettingStage,
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

  const settingStage = useMemo(() => deriveSettingStage(state, careSetting), [state, careSetting]);

  const deepenValueMid = (deepenResults.combinedValueLow + deepenResults.combinedValueHigh) / 2;
  const expandValueMid = (expandResults.expandValueLow + expandResults.expandValueHigh) / 2;
  const currentValueMid = (confirmed.low + confirmed.high) / 2;
  const combinedValueMid = (combinedResults.combinedValueLow + combinedResults.combinedValueHigh) / 2;
  const deepenUplift = deepenValueMid - currentValueMid;
  const expandUplift = expandValueMid - currentValueMid;

  const stageColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    unmeasured: { bg: 'bg-[#FAFAFA]', border: 'border-[#E5E5E5]', text: 'text-[#999999]', dot: 'bg-[#CCCCCC]' },
    signaling: { bg: 'bg-[#FFF8F0]', border: 'border-[#F5DFC8]', text: 'text-[#C4762C]', dot: 'bg-[#EA8C00]' },
    validated: { bg: 'bg-[#F0F7FF]', border: 'border-[#C8DCF5]', text: 'text-[#2C6EC4]', dot: 'bg-[#2C6EC4]' },
    strategic: { bg: 'bg-[#F0FFF5]', border: 'border-[#C8F5D5]', text: 'text-[#2CA55D]', dot: 'bg-[#2CA55D]' },
  };
  const stageStyle = stageColors[settingStage.maturityStage] || stageColors.signaling;
  const stageOrder = ['Unmeasured', 'Signaling', 'Validated', 'Strategic'];
  const currentStageIdx = stageOrder.findIndex(s => s === settingStage.maturityLabel);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={8}
        stepName="Driving Adoption"
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
            What Driving Adoption Could Mean
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
              max={Math.max(totalProviders * 2, currentProviders + 50)}
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

        <motion.div
          className={`${stageStyle.bg} rounded-xl border ${stageStyle.border} p-6 mb-8`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          data-testid="section-next-stage"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <ChevronRight className={`w-5 h-5 ${stageStyle.text}`} />
            <h2 className={`text-sm font-bold ${stageStyle.text}`}>What{"'"}s Ahead</h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {stageOrder.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                  i === currentStageIdx
                    ? `${stageStyle.dot} bg-opacity-100`
                    : i < currentStageIdx
                    ? 'bg-[#E5E5E5]'
                    : 'bg-transparent border border-[#E5E5E5]'
                }`}>
                  <span className={`text-[10px] font-semibold ${
                    i === currentStageIdx ? 'text-white' : i < currentStageIdx ? 'text-[#999999]' : 'text-[#CCCCCC]'
                  }`}>
                    {stage}
                  </span>
                </div>
                {i < stageOrder.length - 1 && <div className="w-4 h-px bg-[#E5E5E5]" />}
              </div>
            ))}
          </div>

          <p className="text-sm text-[#666666] mb-3">
            You{"'"}re currently at <span className={`font-semibold ${stageStyle.text}`}>{settingStage.maturityLabel}</span> maturity.
            {settingStage.maturityNext !== settingStage.maturityLabel && (
              <> Reaching <span className="font-semibold text-[#1A1A1A]">{settingStage.maturityNext}</span> means stronger defensible claims and deeper organizational insight.</>
            )}
          </p>

          {settingStage.nextStageMetrics.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">To reach {settingStage.maturityNext}:</p>
              <div className="space-y-2">
                {settingStage.nextStageMetrics.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${stageStyle.dot}`} />
                    <span className="text-sm text-[#666666]">{metric.label || metric.metric}</span>
                    {metric.source && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        metric.source === 'abridge' ? 'bg-[#EA2C00]/10 text-[#EA2C00]' : 'bg-[#F0F0F0] text-[#999999]'
                      }`}>
                        {metric.source === 'abridge' ? 'Abridge' : 'Your Systems'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

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
            Your Growth Path
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
