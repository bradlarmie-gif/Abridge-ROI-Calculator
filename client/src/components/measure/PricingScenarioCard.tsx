import { Plus, Trash2 } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  computeScenarioInvestment,
  makeDefaultTiers,
  PRICING_MODEL_LABELS,
  PRICING_MODEL_RATE_SUFFIX,
  type PricingScenario,
  type PricingModel,
  type PricingTier,
} from "@/lib/forecastPricing";

interface PricingScenarioCardProps {
  scenario: PricingScenario;
  displayProviders: number;
  displayEncounters: number;
  displayValue: number;
  isBestValue: boolean;
  onUpdate: (updates: Partial<PricingScenario>) => void;
  onRemove: () => void;
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
  const scale = scenario.model === 'perProvider' ? displayProviders
              : scenario.model === 'perEncounter' || scenario.model === 'platformFee' ? displayEncounters
              : 0;
  const { value: investment, tier: appliedTier, warning } = computeScenarioInvestment(scenario, scale);
  const net = displayValue - investment;
  const roi = investment > 0 ? displayValue / investment : 0;

  const updateTier = (tierId: string, updates: Partial<PricingTier>) => {
    onUpdate({
      tiers: scenario.tiers.map(t => t.id === tierId ? { ...t, ...updates } : t),
    });
  };

  const addTier = () => {
    const lastTier = scenario.tiers[scenario.tiers.length - 1];
    // When the last tier is unlimited, derive the new starting threshold from
    // its lower bound (so capping it produces a valid range) rather than
    // falling back to 1, which would silently invert the prior tier.
    const newFrom = lastTier
      ? (lastTier.thresholdTo ?? lastTier.thresholdFrom + 100)
      : 1;
    const newTier: PricingTier = {
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      thresholdFrom: newFrom,
      thresholdTo: null,
      rate: 0,
    };
    const updatedExisting = scenario.tiers.map((t, idx) =>
      idx === scenario.tiers.length - 1 && t.thresholdTo === null
        ? { ...t, thresholdTo: newFrom }
        : t,
    );
    onUpdate({ tiers: [...updatedExisting, newTier] });
  };

  const removeTier = (tierId: string) => {
    onUpdate({ tiers: scenario.tiers.filter(t => t.id !== tierId) });
  };

  const handleModelChange = (newModel: PricingModel) => {
    onUpdate({ model: newModel, tiers: makeDefaultTiers(newModel) });
  };

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();
  const isAnnualLicense = scenario.model === 'annualLicense';

  return (
    <div
      className={`bg-white rounded-lg p-5 border-2 transition-all ${
        isBestValue ? 'border-[#EA2C00] shadow-[0_4px_16px_rgba(234,44,0,0.1)]' : 'border-[#E5E5E5]'
      }`}
      data-testid={`pricing-scenario-${scenario.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={scenario.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full text-base font-bold text-black bg-transparent border-b border-transparent hover:border-[#E5E5E5] focus:border-[#EA2C00] focus:outline-none pb-1"
            placeholder="Scenario name"
            data-testid={`input-scenario-label-${scenario.id}`}
          />
          {isBestValue && (
            <span
              className="inline-block mt-1 text-[10px] font-semibold text-[#EA2C00] bg-[#FCE8E2] px-2 py-0.5 rounded uppercase tracking-wide"
              data-testid={`badge-best-value-${scenario.id}`}
            >
              ★ Best Value
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-[#888888] hover:text-[#EA2C00] hover:bg-[#FCE8E2] rounded transition-colors"
          data-testid={`remove-scenario-${scenario.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 bg-[#F5F0EB] rounded-lg mb-4">
        {(['perProvider', 'perEncounter', 'annualLicense', 'platformFee'] as PricingModel[]).map(m => (
          <button
            key={m}
            onClick={() => handleModelChange(m)}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              scenario.model === m ? 'bg-white text-black shadow-sm' : 'text-[#666666] hover:text-black'
            }`}
            data-testid={`pricing-model-${scenario.id}-${m}`}
          >
            {PRICING_MODEL_LABELS[m]}
          </button>
        ))}
      </div>

      {scenario.model === 'platformFee' && (
        <div className="mb-3">
          <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1 block">Annual Base Fee</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={scenario.baseFee ?? 0}
                onChange={(v: number) => onUpdate({ baseFee: v })}
                className="h-8 bg-white text-sm pl-6"
                data-testid={`input-base-fee-${scenario.id}`}
              />
            </div>
            <span className="text-[10px] text-[#888888] whitespace-nowrap">/year flat</span>
          </div>
          <p className="text-[10px] text-[#AAAAAA] mt-1">Plus per-encounter rate below</p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-wide">
            {isAnnualLicense ? 'Annual fee' : scenario.model === 'platformFee' ? 'Per-encounter rate' : 'Tier structure (stepped)'}
          </p>
          {!isAnnualLicense && (
            <button
              onClick={addTier}
              className="text-xs font-medium text-[#EA2C00] hover:text-[#EA2C00]/80 flex items-center gap-1"
              data-testid={`button-add-tier-${scenario.id}`}
            >
              <Plus className="w-3 h-3" /> Add tier
            </button>
          )}
        </div>

        {!isAnnualLicense && (
          <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-medium text-[#888888] uppercase tracking-wide">
            <span className="col-span-3">From</span>
            <span className="col-span-3">To</span>
            <span className="col-span-5">Rate</span>
            <span className="col-span-1"></span>
          </div>
        )}

        {scenario.tiers.map((tier) => {
          const isApplied = appliedTier?.id === tier.id;
          return (
            <div
              key={tier.id}
              className={`grid grid-cols-12 gap-2 items-center p-2 rounded-md ${
                isApplied ? 'bg-[#FCE8E2] border border-[#EA2C00]/30' : 'bg-[#F5F0EB]'
              }`}
              data-testid={`tier-row-${scenario.id}-${tier.id}`}
            >
              {!isAnnualLicense ? (
                <>
                  <div className="col-span-3">
                    <FormattedNumberInput
                      value={tier.thresholdFrom}
                      onChange={(v: number) => updateTier(tier.id, { thresholdFrom: v })}
                      className="h-8 bg-white text-sm"
                      data-testid={`input-tier-from-${tier.id}`}
                    />
                  </div>
                  <div className="col-span-3">
                    {tier.thresholdTo === null ? (
                      <button
                        onClick={() => updateTier(tier.id, { thresholdTo: tier.thresholdFrom + 100 })}
                        className="h-8 w-full text-sm text-[#888888] italic bg-white border border-[#E5E5E5] rounded px-2 hover:border-[#D1D5DB]"
                        data-testid={`button-tier-unlimited-${tier.id}`}
                      >
                        ∞ unlimited
                      </button>
                    ) : (
                      <FormattedNumberInput
                        value={tier.thresholdTo}
                        onChange={(v: number) => updateTier(tier.id, { thresholdTo: v })}
                        className="h-8 bg-white text-sm"
                        data-testid={`input-tier-to-${tier.id}`}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="col-span-6 text-sm text-[#888888] italic px-2">Flat rate</div>
              )}
              <div className="col-span-5">
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-sm text-[#888888]">$</span>
                  <FormattedNumberInput
                    value={tier.rate}
                    onChange={(v: number) => updateTier(tier.id, { rate: v })}
                    className="h-8 bg-white text-sm pl-6 pr-1"
                    step={scenario.model === 'perEncounter' ? 0.01 : 1}
                    data-testid={`input-tier-rate-${tier.id}`}
                  />
                  <span className="ml-1 text-[10px] text-[#888888] whitespace-nowrap">{PRICING_MODEL_RATE_SUFFIX[scenario.model]}</span>
                </div>
              </div>
              <div className="col-span-1 flex justify-end">
                {scenario.tiers.length > 1 && (
                  <button
                    onClick={() => removeTier(tier.id)}
                    className="p-1 text-[#888888] hover:text-[#EA2C00]"
                    data-testid={`remove-tier-${tier.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1A1A1A] rounded-lg p-4">
        {warning && (
          <div className="mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800" data-testid={`warning-scenario-${scenario.id}`}>
            ⚠ {warning}
          </div>
        )}
        {!isAnnualLicense && appliedTier && (
          <p className="text-[10px] text-white/50 mb-2" data-testid={`text-tier-applied-${scenario.id}`}>
            At {formatNumber(scale)} {scenario.model === 'perProvider' ? 'providers' : 'encounters'} → tier {appliedTier.thresholdFrom.toLocaleString()}–{appliedTier.thresholdTo === null ? '∞' : appliedTier.thresholdTo.toLocaleString()} applies @ ${appliedTier.rate.toLocaleString()}{PRICING_MODEL_RATE_SUFFIX[scenario.model]}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Investment</p>
            <p className="text-base font-bold text-white" data-testid={`text-scenario-investment-${scenario.id}`}>{formatCurrency(investment)}</p>
            <p className="text-[10px] text-white/40">/year</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">Net</p>
            <p className={`text-base font-bold ${net >= 0 ? 'text-[#EA2C00]' : 'text-white/70'}`} data-testid={`text-scenario-net-${scenario.id}`}>
              {formatCurrency(net)}
            </p>
            <p className="text-[10px] text-white/40">/year</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide mb-0.5">ROI</p>
            <p className="text-base font-bold text-white" data-testid={`text-scenario-roi-${scenario.id}`}>{roi.toFixed(1)}×</p>
            <p className="text-[10px] text-white/40">value/cost</p>
          </div>
        </div>
      </div>
    </div>
  );
}
