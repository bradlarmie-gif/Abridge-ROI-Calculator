import { Trash2 } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  computeScenarioInvestment,
  computeTCV,
  computePaybackMonths,
  makeDefaultTiers,
  CONTRACT_TERM_OPTIONS,
  ESCALATOR_OPTIONS,
  type PricingScenario,
  type PricingModel,
  type PricingTier,
} from "@/lib/forecastPricing";

const DEAL_MODELS: { label: string; value: PricingModel; rateSuffix: string; rateHint: string; step: number }[] = [
  { value: 'perProvider',   label: 'Per Provider',  rateSuffix: '/provider/mo', rateHint: 'e.g. $1,500',  step: 50  },
  { value: 'perEncounter',  label: 'Per Encounter', rateSuffix: '/encounter',   rateHint: 'e.g. $0.50',   step: 0.01 },
  { value: 'annualLicense', label: 'Flat Annual',   rateSuffix: '/year',        rateHint: 'total ACV',    step: 1000 },
];

interface PricingScenarioCardProps {
  scenario: PricingScenario;
  displayProviders: number;
  displayEncounters: number;
  displayValue: number;
  isBestValue: boolean;
  onUpdate: (updates: Partial<PricingScenario>) => void;
  onRemove: () => void;
}

function getRate(scenario: PricingScenario): number {
  return scenario.tiers[0]?.rate ?? 0;
}

function makeSingleTier(model: PricingModel, currentRate: number): PricingTier[] {
  return [{ id: `tier-${Date.now()}`, thresholdFrom: 0, thresholdTo: null, rate: currentRate }];
}

function PillGroup<T extends string | number>({
  options, value, onChange, className,
}: {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 p-0.5 bg-[#F5F0EB] rounded-lg ${className ?? ''}`}>
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1 px-1.5 rounded-md text-xs font-medium transition-all text-center ${
            opt.value === value
              ? 'bg-white text-black shadow-sm'
              : 'text-[#666666] hover:text-black'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function PricingScenarioCard({
  scenario,
  displayProviders,
  displayEncounters,
  displayValue,
  isBestValue,
  onUpdate,
  onRemove,
}: PricingScenarioCardProps) {
  const scale = scenario.model === 'perProvider' ? displayProviders : displayEncounters;
  const { value: yearOneACV, warning } = computeScenarioInvestment(scenario, scale);
  const termYears = Math.round((scenario.contractTermMonths ?? 12) / 12);
  const tcv = computeTCV(scenario, scale);
  const payback = computePaybackMonths(yearOneACV, displayValue);
  const roi = yearOneACV > 0 ? displayValue / yearOneACV : 0;
  const net = displayValue - yearOneACV;

  const rate = getRate(scenario);
  const activeModel = DEAL_MODELS.find(m => m.value === scenario.model) ?? DEAL_MODELS[0];

  const handleModelChange = (newModel: PricingModel) => {
    onUpdate({ model: newModel, tiers: makeDefaultTiers(newModel) });
  };

  const handleRateChange = (v: number) => {
    onUpdate({ tiers: makeSingleTier(scenario.model, v) });
  };

  const fmtC = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all ${
        isBestValue ? 'border-[#EA2C00] shadow-[0_4px_16px_rgba(234,44,0,0.08)]' : 'border-[#E5E5E5]'
      }`}
      data-testid={`pricing-scenario-${scenario.id}`}
    >
      {/* Label row */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <input
          type="text"
          value={scenario.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="flex-1 min-w-0 text-sm font-bold text-black bg-transparent border-b border-transparent hover:border-[#E5E5E5] focus:border-[#EA2C00] focus:outline-none pb-0.5"
          placeholder="Scenario name"
          data-testid={`input-scenario-label-${scenario.id}`}
        />
        {isBestValue && (
          <span className="text-[9px] font-bold text-[#EA2C00] bg-[#FCE8E2] px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
            ★ Best ROI
          </span>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-[#BBBBBB] hover:text-[#EA2C00] transition-colors"
          data-testid={`remove-scenario-${scenario.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Model selector */}
        <PillGroup
          options={DEAL_MODELS.map(m => ({ label: m.label, value: m.value }))}
          value={scenario.model === 'platformFee' ? 'perEncounter' : scenario.model as PricingModel}
          onChange={handleModelChange}
        />

        {/* Rate input */}
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 bg-[#F5F0EB] rounded-lg h-9 px-3 gap-1">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={rate}
                onChange={handleRateChange}
                step={activeModel.step}
                className="h-7 bg-transparent border-none shadow-none text-sm flex-1 p-0"
                data-testid={`input-rate-${scenario.id}`}
              />
            </div>
            <span className="text-xs text-[#888888] whitespace-nowrap">{activeModel.rateSuffix}</span>
          </div>
          {scenario.model === 'perProvider' && displayProviders > 0 && yearOneACV > 0 && (
            <p className="text-[10px] text-[#AAAAAA] mt-1">
              {displayProviders.toLocaleString()} providers × ${rate.toLocaleString()}/mo × 12 = {fmtC(yearOneACV)} ACV
            </p>
          )}
          {scenario.model === 'perEncounter' && displayEncounters > 0 && yearOneACV > 0 && (
            <p className="text-[10px] text-[#AAAAAA] mt-1">
              {displayEncounters.toLocaleString()} encounters × ${rate} = {fmtC(yearOneACV)} ACV
            </p>
          )}
        </div>

        {/* Term + Escalator */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-1">Contract Term</p>
            <PillGroup
              options={CONTRACT_TERM_OPTIONS.map(o => ({ label: o.label, value: o.months }))}
              value={scenario.contractTermMonths ?? 12}
              onChange={(v) => onUpdate({ contractTermMonths: v })}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-1">Annual Escalator</p>
            <PillGroup
              options={ESCALATOR_OPTIONS.map(o => ({ label: o.label, value: o.pct }))}
              value={scenario.escalatorPct ?? 0}
              onChange={(v) => onUpdate({ escalatorPct: v })}
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-[#1A1A1A] rounded-lg p-3">
          {warning && (
            <p className="text-[10px] text-amber-400 mb-2">⚠ {warning}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-2.5">
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Year 1 ACV</p>
              <p className="text-sm font-bold text-white" data-testid={`text-scenario-investment-${scenario.id}`}>
                {fmtC(yearOneACV)}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">{termYears}-yr TCV</p>
              <p className="text-sm font-bold text-white">{fmtC(tcv)}</p>
            </div>
          </div>
          <div className="h-px bg-white/10 mb-2.5" />
          <div className="grid grid-cols-3 gap-x-2 gap-y-1">
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Payback</p>
              <p className="text-sm font-bold text-white">
                {payback != null ? `${payback} mo` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">ROI</p>
              <p className="text-sm font-bold text-white" data-testid={`text-scenario-roi-${scenario.id}`}>
                {roi > 0 ? `${roi.toFixed(1)}×` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Net / yr</p>
              <p className={`text-sm font-bold ${net >= 0 ? 'text-[#EA2C00]' : 'text-white/60'}`} data-testid={`text-scenario-net-${scenario.id}`}>
                {fmtC(net)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
