import { useState, useMemo, useCallback } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type DataSource,
  type ScenarioInputs,
  type ScenarioResult,
  formatCurrency,
  formatNumber,
  getDefaultScenarios,
  calculateScenario,
  calculateConfirmedValue,
  deriveEngagementContext,
  computeDomainStatus,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; bg: string; text: string }> = {
    analytics: { label: 'Analytics-backed', bg: 'bg-green-100', text: 'text-green-700' },
    benchmark: { label: 'Abridge-verified', bg: 'bg-blue-100', text: 'text-blue-700' },
    estimate: { label: 'Estimated', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[source] || config.estimate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`} data-testid="badge-data-source">
      {c.label}
    </span>
  );
}

interface ScenarioCardProps {
  scenario: ScenarioResult;
  highlighted?: boolean;
  confirmedLow: number;
  confirmedHigh: number;
  providerLabel: string;
  onUpdate: (inputs: ScenarioInputs) => void;
}

function ScenarioCard({ scenario, highlighted, confirmedLow, confirmedHigh, providerLabel, onUpdate }: ScenarioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const labelMap: Record<string, string> = {
    conservative: 'Conservative',
    typical: 'Typical',
    optimistic: 'Optimistic',
    custom: 'Custom',
  };
  const displayLabel = labelMap[scenario.label] || scenario.label;

  return (
    <div
      className={`rounded-xl border-2 p-5 flex-1 min-w-[200px] transition-all ${
        highlighted
          ? 'border-[#EA2C00] bg-white shadow-md scale-[1.02]'
          : 'border-[#E5E5E5] bg-white'
      }`}
      data-testid={`scenario-card-${scenario.label}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <p className={`text-xs font-bold uppercase tracking-[1.5px] ${highlighted ? 'text-[#EA2C00]' : 'text-[#1A1A1A]'}`}>
          {displayLabel}
        </p>
        {highlighted && (
          <span className="text-[9px] font-medium text-[#EA2C00] bg-[#EA2C00]/10 px-1.5 py-0.5 rounded-full">recommended</span>
        )}
        {scenario.isCustomized && (
          <span className="text-[9px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">Custom</span>
        )}
      </div>

      <p className={`text-2xl md:text-3xl font-bold mb-3 ${highlighted ? 'text-[#EA2C00]' : 'text-[#1A1A1A]'}`} data-testid={`scenario-value-${scenario.label}`}>
        {formatCurrency(scenario.annualValue)}
        <span className="text-sm font-normal text-[#999999]"> / year</span>
      </p>

      <div className="space-y-1 mb-3">
        <p className="text-xs text-[#666666]">{formatNumber(scenario.inputs.providers)} {providerLabel}</p>
        <p className="text-xs text-[#666666]">{scenario.inputs.adoptionRate}% adoption</p>
        <p className="text-xs text-[#666666]">{scenario.inputs.attributionRate}% attribution</p>
      </div>

      {scenario.annualValue > 0 && (
        <p className="text-[10px] text-[#999999] mb-3">
          {"≈"} {formatCurrency(scenario.perProviderValue)} per {providerLabel.replace(/s$/, '')} per year
        </p>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-[#999999] hover:text-[#666666] transition-colors"
        data-testid={`button-edit-${scenario.label}`}
      >
        Edit assumptions
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-[#F0F0F0] space-y-3">
              <div>
                <label className="text-[10px] text-[#999999] uppercase tracking-wider block mb-1">Adoption rate</label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={scenario.inputs.adoptionRate}
                  onChange={(e) => onUpdate({ ...scenario.inputs, adoptionRate: Number(e.target.value) })}
                  className="w-full accent-[#EA2C00]"
                  data-testid={`slider-adoption-${scenario.label}`}
                />
                <span className="text-xs text-[#666666]">{scenario.inputs.adoptionRate}%</span>
              </div>
              <div>
                <label className="text-[10px] text-[#999999] uppercase tracking-wider block mb-1">What % do we credit Abridge?</label>
                <input
                  type="range"
                  min={30}
                  max={80}
                  step={1}
                  value={scenario.inputs.attributionRate}
                  onChange={(e) => onUpdate({ ...scenario.inputs, attributionRate: Number(e.target.value) })}
                  className="w-full accent-[#EA2C00]"
                  data-testid={`slider-attribution-${scenario.label}`}
                />
                <span className="text-xs text-[#666666]">{scenario.inputs.attributionRate}%</span>
              </div>
              <div>
                <label className="text-[10px] text-[#999999] uppercase tracking-wider block mb-1">Providers in scope</label>
                <input
                  type="number"
                  min={1}
                  value={scenario.inputs.providers}
                  onChange={(e) => onUpdate({ ...scenario.inputs, providers: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full border border-[#E5E5E5] rounded px-2 py-1 text-sm"
                  data-testid={`input-providers-${scenario.label}`}
                />
              </div>
              <div>
                <label className="text-[10px] text-[#999999] uppercase tracking-wider block mb-1">Annual encounters per provider</label>
                <input
                  type="number"
                  min={1}
                  value={scenario.inputs.encountersPerProvider}
                  onChange={(e) => onUpdate({ ...scenario.inputs, encountersPerProvider: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full border border-[#E5E5E5] rounded px-2 py-1 text-sm"
                  data-testid={`input-encounters-${scenario.label}`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const narrative = useMemo(() => generateNarrative('scenarios', state), [state]);
  const defaults = useMemo(() => getDefaultScenarios(state), [state]);

  const overrides = state.scenarioOverrides;
  const [conservativeInputs, setConservativeInputs] = useState<ScenarioInputs>(overrides?.conservative ?? defaults.conservative);
  const [typicalInputs, setTypicalInputs] = useState<ScenarioInputs>(overrides?.typical ?? defaults.typical);
  const [optimisticInputs, setOptimisticInputs] = useState<ScenarioInputs>(overrides?.optimistic ?? defaults.optimistic);

  const [conservativeCustom, setConservativeCustom] = useState(overrides?.conservativeCustom ?? false);
  const [typicalCustom, setTypicalCustom] = useState(overrides?.typicalCustom ?? false);
  const [optimisticCustom, setOptimisticCustom] = useState(overrides?.optimisticCustom ?? false);

  const conservativeResult = useMemo(() =>
    calculateScenario(state, conservativeInputs, 'conservative', conservativeCustom),
    [state, conservativeInputs, conservativeCustom]
  );
  const typicalResult = useMemo(() =>
    calculateScenario(state, typicalInputs, 'typical', typicalCustom),
    [state, typicalInputs, typicalCustom]
  );
  const optimisticResult = useMemo(() =>
    calculateScenario(state, optimisticInputs, 'optimistic', optimisticCustom),
    [state, optimisticInputs, optimisticCustom]
  );

  const handleUpdate = useCallback((which: 'conservative' | 'typical' | 'optimistic', inputs: ScenarioInputs) => {
    if (which === 'conservative') { setConservativeInputs(inputs); setConservativeCustom(true); }
    else if (which === 'typical') { setTypicalInputs(inputs); setTypicalCustom(true); }
    else { setOptimisticInputs(inputs); setOptimisticCustom(true); }

    updateState({
      scenarioOverrides: {
        ...state.scenarioOverrides,
        [which]: inputs,
        [`${which}Custom`]: true,
      },
    });
  }, [state.scenarioOverrides, updateState]);

  const careSetting = state.careSetting || 'outpatient';
  const isNursing = careSetting === 'nursing';
  const isInpatient = careSetting === 'inpatient';
  const isED = careSetting === 'ed';
  const providerLabel = isNursing ? 'nurses' : 'providers';

  const gapLow = Math.max(0, typicalResult.annualValue - confirmed.high);
  const gapHigh = Math.max(0, typicalResult.annualValue - confirmed.low);

  const gapClosers = useMemo(() => {
    const items: string[] = [];
    if (state.deployment.utilizationRate < 60) {
      items.push(`Deepen adoption (you're at ${state.deployment.utilizationRate}%, target is ${typicalInputs.adoptionRate}%)`);
    }
    const noDataDomains = Object.entries(domainStatus)
      .filter(([, s]) => s === 'no-data')
      .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1));
    noDataDomains.forEach(d => {
      if (items.length < 3) items.push(`Measure ${d}`);
    });
    const totalProviders = state.deployment.totalProviders || state.deployment.providers;
    if (totalProviders > state.deployment.providers && items.length < 3) {
      items.push(`Expand to ${totalProviders - state.deployment.providers} additional ${providerLabel}`);
    }
    if (items.length === 0) {
      items.push(`Deepen adoption to ${typicalInputs.adoptionRate}%`);
    }
    return items.slice(0, 3);
  }, [state, domainStatus, typicalInputs, providerLabel]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={6}
        stepName="What You Could Earn"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <NarrativePanel narrative={narrative} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            What You Could Earn
          </h1>
          <p className="text-base text-[#888888]">
            Based on your data and these assumptions, here is what Abridge could represent for your organization.
          </p>
        </motion.div>

        <motion.div
          className="mb-6 px-4 py-3 bg-[#F5F0EB] rounded-lg border-l-4 border-[#EA2C00] flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          data-testid="confirmed-reference-line"
        >
          <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px]">Your confirmed value:</span>
          <span className="text-sm font-bold text-[#EA2C00]">
            {formatCurrency(confirmed.low)} {"–"} {formatCurrency(confirmed.high)} / year
          </span>
          <DataSourceBadge source={state.dataSource} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-4">Your Scenarios</h2>
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <ScenarioCard
              scenario={conservativeResult}
              confirmedLow={confirmed.low}
              confirmedHigh={confirmed.high}
              providerLabel={providerLabel}
              onUpdate={(inputs) => handleUpdate('conservative', inputs)}
            />
            <ScenarioCard
              scenario={typicalResult}
              highlighted
              confirmedLow={confirmed.low}
              confirmedHigh={confirmed.high}
              providerLabel={providerLabel}
              onUpdate={(inputs) => handleUpdate('typical', inputs)}
            />
            <ScenarioCard
              scenario={optimisticResult}
              confirmedLow={confirmed.low}
              confirmedHigh={confirmed.high}
              providerLabel={providerLabel}
              onUpdate={(inputs) => handleUpdate('optimistic', inputs)}
            />
          </div>
        </motion.div>

        {(gapLow > 0 || gapHigh > 0) && (
          <motion.div
            className="bg-[#F5F0EB] rounded-xl border-l-4 border-[#EA2C00] p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            data-testid="section-gap"
          >
            <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-2">The Gap</p>
            <p className="text-sm text-[#666666] mb-3">
              The difference between your confirmed value and the Typical scenario:
            </p>
            <p className="text-2xl md:text-3xl font-bold text-[#EA2C00] mb-1" data-testid="text-gap-value">
              {formatCurrency(gapLow)} {"–"} {formatCurrency(gapHigh)}
              <span className="text-sm font-normal text-[#999999]"> / year currently uncaptured</span>
            </p>

            {gapClosers.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">This gap closes primarily by:</p>
                <ol className="space-y-1.5">
                  {gapClosers.map((item, i) => (
                    <li key={i} className="text-sm text-[#666666] flex gap-2">
                      <span className="text-xs font-bold text-[#EA2C00] mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        )}

        <motion.p
          className="text-[11px] text-[#AAAAAA] text-center mb-8 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Scenarios are modeled estimates based on your deployment data and Abridge methodology. They represent what organizations at your scale typically see {"–"} not a guarantee. Conservative attribution (50%) is used as the floor in all scenarios.
        </motion.p>

        <motion.div
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            What It{"'"}s Worth
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
